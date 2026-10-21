-- VK's Store: colour options
-- Each colour stays its own product (own photos, price and stock per size).
-- Colours of the same item share a group_id, so the shop shows them together.

alter table public.products
  add column colour text check (colour is null or length(colour) between 1 and 30),
  add column group_id uuid;

create index products_group on public.products (group_id) where group_id is not null;

-- Bookings keep the colour in the item name, e.g. "Oxford Shirt (Navy)".
create function public.booking_item_colour()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_colour text;
begin
  select colour into v_colour from public.products where id = new.product_id;
  if v_colour is not null and new.product_name not like '%(' || v_colour || ')' then
    new.product_name := new.product_name || ' (' || v_colour || ')';
  end if;
  return new;
end;
$$;

create trigger booking_items_colour before insert on public.booking_items
  for each row execute function public.booking_item_colour();

revoke execute on function public.booking_item_colour() from public, anon, authenticated;
