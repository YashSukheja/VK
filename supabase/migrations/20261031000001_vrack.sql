-- Vrack Clothing: new features.

-- Per-item measurements, e.g. {"unit":"in","chest":40,"length":28}.
-- Only the ones that fit the item are filled in.
alter table public.products
  add column measurements jsonb check (measurements is null or jsonb_typeof(measurements) = 'object');

-- Marks the plain phone photo of an item, shown next to the studio-style one.
alter table public.product_images
  add column is_real boolean not null default false;
