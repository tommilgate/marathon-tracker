-- Users table (just a name, no password)
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  username text unique not null,
  created_at timestamptz default now()
);

-- Per-user material tracker data
create table if not exists tracker_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  material_id text not null,
  need int not null default 0,
  have int not null default 0,
  updated_at timestamptz default now(),
  unique(user_id, material_id)
);

-- Allow public read/write (no auth required, username is the key)
alter table users enable row level security;
alter table tracker_entries enable row level security;

create policy "anyone can read users" on users for select using (true);
create policy "anyone can insert users" on users for insert with check (true);

create policy "anyone can read entries" on tracker_entries for select using (true);
create policy "anyone can insert entries" on tracker_entries for insert with check (true);
create policy "anyone can update entries" on tracker_entries for update using (true);
create policy "anyone can delete entries" on tracker_entries for delete using (true);
