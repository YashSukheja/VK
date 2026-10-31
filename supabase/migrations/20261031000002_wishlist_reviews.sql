-- Vrack Clothing: wishlist and reviews.

-- ---------------------------------------------------------------------------
-- Wishlist: the hearts a customer taps. Private to each customer.
-- ---------------------------------------------------------------------------
create table public.wishlist (
  customer_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (customer_id, product_id)
);

alter table public.wishlist enable row level security;
create policy "customers see their own hearts" on public.wishlist
  for select to authenticated using (customer_id = auth.uid());
create policy "customers add their own hearts" on public.wishlist
  for insert to authenticated with check (
    customer_id = auth.uid()
    and (select count(*) from public.wishlist w where w.customer_id = auth.uid()) < 100
  );
create policy "customers remove their own hearts" on public.wishlist
  for delete to authenticated using (customer_id = auth.uid());
grant select, insert, delete on public.wishlist to authenticated;

-- ---------------------------------------------------------------------------
-- Reviews: only customers with a Completed booking for the item, one each.
-- The admin can reply or hide one. 1 or 2 stars pings the admin's phone.
-- ---------------------------------------------------------------------------
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  customer_id uuid references public.profiles (id) on delete set null,
  customer_name text not null,
  rating int not null check (rating between 1 and 5),
  comment text not null default '' check (length(comment) <= 500),
  reply text check (reply is null or length(reply) between 1 and 500),
  replied_at timestamptz,
  is_hidden boolean not null default false,
  created_at timestamptz not null default now(),
  unique (product_id, customer_id)
);

create index reviews_product on public.reviews (product_id, created_at desc);

alter table public.reviews enable row level security;
create policy "anyone reads shown reviews; authors and admin read all" on public.reviews
  for select to anon, authenticated
  using (not is_hidden or customer_id = auth.uid() or public.is_admin());
create policy "admin replies and hides" on public.reviews
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "authors and admin delete" on public.reviews
  for delete to authenticated using (customer_id = auth.uid() or public.is_admin());

-- Shoppers never see who wrote a review beyond the name shown.
revoke all on public.reviews from anon;
grant select (id, product_id, customer_name, rating, comment, reply, replied_at, is_hidden, created_at)
  on public.reviews to anon;
grant select on public.reviews to authenticated;
grant update (reply, replied_at, is_hidden) on public.reviews to authenticated;
grant delete on public.reviews to authenticated;

-- Writes or changes the caller's review of an item they have collected.
create function public.submit_review(p_product_id uuid, p_rating int, p_comment text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text;
  v_product text;
  v_comment text := btrim(coalesce(p_comment, ''));
begin
  select username into v_name from public.profiles where id = auth.uid() and role = 'customer';
  if v_name is null then
    raise exception 'Log in with a customer account first' using errcode = '42501';
  end if;
  if not exists (
    select 1
    from public.booking_items bi
    join public.bookings b on b.id = bi.booking_id
    where bi.product_id = p_product_id and b.customer_id = auth.uid() and b.status = 'completed'
  ) then
    raise exception 'You can review a piece once you have collected it' using errcode = '42501';
  end if;
  if p_rating is null or p_rating not between 1 and 5 then
    raise exception 'Pick 1 to 5 stars' using errcode = '22023';
  end if;
  if length(v_comment) > 500 then
    raise exception 'Keep the comment under 500 letters' using errcode = '22023';
  end if;

  insert into public.reviews (product_id, customer_id, customer_name, rating, comment)
  values (p_product_id, auth.uid(), v_name, p_rating, v_comment)
  on conflict (product_id, customer_id)
  do update set rating = excluded.rating, comment = excluded.comment, created_at = now();

  if p_rating <= 2 then
    select name into v_product from public.products where id = p_product_id;
    perform public.send_phone_alert(
      p_rating || ' star review',
      coalesce(v_product, 'A piece') || ' got ' || p_rating || ' star' || case when p_rating = 1 then '' else 's' end
        || '. Open the admin to reply.'
    );
  end if;
end;
$$;

revoke execute on function public.submit_review(uuid, int, text) from public, anon;
grant execute on function public.submit_review(uuid, int, text) to authenticated;
