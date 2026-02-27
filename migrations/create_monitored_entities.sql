-- Create monitored_entities table
create table if not exists monitored_entities (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  aliases text[] default '{}',
  description text,
  type text default 'person', -- person, organization, place, other
  user_id uuid references auth.users(id) not null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Enable RLS
alter table monitored_entities enable row level security;

-- Policies
create policy "Users can view their own monitored entities"
  on monitored_entities for select
  using (auth.uid() = user_id);

create policy "Users can insert their own monitored entities"
  on monitored_entities for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own monitored entities"
  on monitored_entities for update
  using (auth.uid() = user_id);

create policy "Users can delete their own monitored entities"
  on monitored_entities for delete
  using (auth.uid() = user_id);

-- Create index for faster lookups if needed (though list is usually small)
create index monitored_entities_user_id_idx on monitored_entities(user_id);
