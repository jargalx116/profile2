-- ============================================================
-- ACCMarket — Supabase PostgreSQL Schema
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ── Profiles ──────────────────────────────────────────────────
create table public.profiles (
  id              uuid references auth.users on delete cascade primary key,
  username        text unique not null,
  avatar_url      text,
  banner_url      text,
  bio             text,
  contact         text,
  verified        boolean default false,
  is_admin        boolean default false,
  rating          numeric(3,2) default 0,
  review_count    int default 0,
  listing_count   int default 0,
  joined_at       timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Profiles are viewable by everyone"
  on public.profiles for select using (true);

create policy "Users can update their own profile"
  on public.profiles for update using (auth.uid() = id);

create policy "Users can insert their own profile"
  on public.profiles for insert with check (auth.uid() = id);

-- ── Listings ───────────────────────────────────────────────────
create table public.listings (
  id            uuid default uuid_generate_v4() primary key,
  seller_id     uuid references public.profiles(id) on delete cascade not null,
  title         text not null,
  description   text,
  game          text not null,  -- pubg_mobile | pubg_pc | cod_mobile | genshin | valorant | other
  price         numeric not null check (price > 0),
  level         int,
  bind_type     text,           -- facebook | google | twitter | apple | none
  images        text[],         -- array of public URLs
  status        text default 'pending' check (status in ('pending','active','sold','rejected')),
  reject_reason text,
  view_count    int default 0,
  hot           boolean default false,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

alter table public.listings enable row level security;

create policy "Active listings visible to all"
  on public.listings for select
  using (status = 'active' or seller_id = auth.uid() or
         exists(select 1 from public.profiles where id = auth.uid() and is_admin = true));

create policy "Sellers can insert their own listings"
  on public.listings for insert
  with check (auth.uid() = seller_id);

create policy "Sellers can update their own listings"
  on public.listings for update
  using (auth.uid() = seller_id or
         exists(select 1 from public.profiles where id = auth.uid() and is_admin = true));

create policy "Admin can delete listings"
  on public.listings for delete
  using (auth.uid() = seller_id or
         exists(select 1 from public.profiles where id = auth.uid() and is_admin = true));

-- ── Reviews ────────────────────────────────────────────────────
create table public.reviews (
  id           uuid default uuid_generate_v4() primary key,
  seller_id    uuid references public.profiles(id) on delete cascade not null,
  reviewer_id  uuid references public.profiles(id) on delete cascade not null,
  listing_id   uuid references public.listings(id) on delete set null,
  rating       int not null check (rating between 1 and 5),
  text         text not null,
  created_at   timestamptz default now(),
  unique(seller_id, reviewer_id, listing_id)
);

alter table public.reviews enable row level security;

create policy "Reviews are public"
  on public.reviews for select using (true);

create policy "Logged in users can leave reviews"
  on public.reviews for insert
  with check (auth.uid() = reviewer_id);

-- ── Wishlist ───────────────────────────────────────────────────
create table public.wishlist (
  id          uuid default uuid_generate_v4() primary key,
  user_id     uuid references public.profiles(id) on delete cascade not null,
  listing_id  uuid references public.listings(id) on delete cascade not null,
  created_at  timestamptz default now(),
  unique(user_id, listing_id)
);

alter table public.wishlist enable row level security;

create policy "Users can view their own wishlist"
  on public.wishlist for select using (auth.uid() = user_id);

create policy "Users can manage their own wishlist"
  on public.wishlist for all using (auth.uid() = user_id);

-- ── Functions ──────────────────────────────────────────────────

-- Increment view count (prevents client-side manipulation)
create or replace function increment_views(listing_id uuid)
returns void as $$
  update public.listings set view_count = view_count + 1 where id = listing_id;
$$ language sql security definer;

-- Auto-update seller rating when review is added
create or replace function update_seller_rating()
returns trigger as $$
begin
  update public.profiles
  set
    rating = (select avg(rating) from public.reviews where seller_id = new.seller_id),
    review_count = (select count(*) from public.reviews where seller_id = new.seller_id)
  where id = new.seller_id;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_review_added
  after insert or update or delete on public.reviews
  for each row execute procedure update_seller_rating();

-- Auto-update listing_count
create or replace function update_listing_count()
returns trigger as $$
begin
  update public.profiles
  set listing_count = (
    select count(*) from public.listings
    where seller_id = coalesce(new.seller_id, old.seller_id)
    and status = 'active'
  )
  where id = coalesce(new.seller_id, old.seller_id);
  return coalesce(new, old);
end;
$$ language plpgsql security definer;

create trigger on_listing_changed
  after insert or update or delete on public.listings
  for each row execute procedure update_listing_count();

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── Storage Buckets ─────────────────────────────────────────────
-- Run in Supabase Dashboard → Storage:
-- 1. Create bucket: "listing-images"  (public: true)
-- 2. Create bucket: "avatars"         (public: true)
-- 3. Create bucket: "banners"         (public: true)

-- Storage policies (add via Dashboard → Storage → Policies):
-- listing-images: INSERT for authenticated users
-- listing-images: SELECT for everyone
-- avatars: INSERT/UPDATE for owner (auth.uid()::text = (storage.foldername(name))[1])
