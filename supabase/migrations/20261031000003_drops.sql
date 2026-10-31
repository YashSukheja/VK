-- Vrack Clothing: drops. A drop is a set of pieces that go live together at a
-- set time. Before then, shoppers see only the countdown, never the pieces.

create table public.drops (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) between 1 and 60),
  starts_at timestamptz not null,
  created_at timestamptz not null default now()
);

alter table public.products
  add column drop_id uuid references public.drops (id) on delete set null;

create index products_drop on public.products (drop_id) where drop_id is not null;

alter table public.drops enable row level security;
create policy "anyone reads drops" on public.drops
  for select to anon, authenticated using (true);
create policy "admin writes drops" on public.drops
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
grant select on public.drops to anon, authenticated;
grant insert, update, delete on public.drops to authenticated;

-- Pieces in a drop stay hidden from shoppers until the drop starts.
drop policy "read visible products" on public.products;
create policy "read visible products" on public.products
  for select to anon, authenticated
  using (
    (is_visible
      and exists (select 1 from public.categories c where c.id = category_id and c.is_visible)
      and (drop_id is null or exists (select 1 from public.drops d where d.id = drop_id and d.starts_at <= now())))
    or public.is_admin()
  );

-- Bookings can't include a piece before its drop starts (place_booking skips row rules).
create function public.booking_item_released()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1 from public.products p join public.drops d on d.id = p.drop_id
    where p.id = new.product_id and d.starts_at > now()
  ) then
    raise exception 'An item in your cart is no longer available' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger booking_items_released before insert on public.booking_items
  for each row execute function public.booking_item_released();

revoke execute on function public.booking_item_released() from public, anon, authenticated;

-- The next drops for the home page, and ones that started in the last 3 days,
-- with how many pieces each has (without showing the pieces).
create function public.upcoming_drops()
returns table (id uuid, name text, starts_at timestamptz, pieces int)
language sql
stable
security definer
set search_path = ''
as $$
  select d.id, d.name, d.starts_at,
         (select count(*)::int from public.products p where p.drop_id = d.id and p.is_visible)
  from public.drops d
  where d.starts_at > now() - interval '3 days'
  order by d.starts_at
  limit 5;
$$;

grant execute on function public.upcoming_drops() to anon, authenticated;

-- "Remind me": customers who want a nudge when a drop starts. The admin sees
-- the list and messages them, like back-in-stock requests.
create table public.drop_reminders (
  drop_id uuid not null references public.drops (id) on delete cascade,
  customer_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  notified_at timestamptz,
  primary key (drop_id, customer_id)
);

alter table public.drop_reminders enable row level security;
create policy "customers see their own reminders, admin sees all" on public.drop_reminders
  for select to authenticated using (customer_id = auth.uid() or public.is_admin());
create policy "customers ask for upcoming drops" on public.drop_reminders
  for insert to authenticated with check (
    customer_id = auth.uid()
    and exists (select 1 from public.profiles where id = auth.uid() and role = 'customer')
    and exists (select 1 from public.drops d where d.id = drop_id and d.starts_at > now())
  );
create policy "customers cancel their own, admin any" on public.drop_reminders
  for delete to authenticated using (customer_id = auth.uid() or public.is_admin());
create policy "admin marks reminders as sent" on public.drop_reminders
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
revoke all on public.drop_reminders from anon;
grant select, insert, delete on public.drop_reminders to authenticated;
grant update (notified_at) on public.drop_reminders to authenticated;
