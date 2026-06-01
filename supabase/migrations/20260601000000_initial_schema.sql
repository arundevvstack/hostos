-- Enable necessary extensions
create extension if not exists "vector" with schema extensions;
create extension if not exists "uuid-ossp" with schema extensions;

-- Table: public.users
create table if not exists public.users (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null,
  full_name text,
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Table: public.hosts
create table if not exists public.hosts (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  name text not null,
  avatar text,
  description text,
  expertise_areas text[],
  personality_traits text[],
  interview_style text,
  tone_of_voice text,
  system_prompt text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Table: public.knowledge_documents
create table if not exists public.knowledge_documents (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  file_name text not null,
  file_type text not null,
  file_url text not null,
  storage_path text not null,
  upload_status text default 'pending' check (upload_status in ('pending', 'processing', 'completed', 'failed')),
  processing_status text default 'pending' check (processing_status in ('pending', 'processing', 'completed', 'failed')),
  content text,
  embedding vector(1536), -- Assuming OpenAI embeddings (text-embedding-ada-002 or text-embedding-3-small)
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Table: public.host_knowledge_links
create table if not exists public.host_knowledge_links (
  host_id uuid references public.hosts(id) on delete cascade,
  document_id uuid references public.knowledge_documents(id) on delete cascade,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (host_id, document_id)
);

-- Table: public.guests
create table if not exists public.guests (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  name text not null,
  bio text,
  company text,
  website text,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Table: public.episodes
create table if not exists public.episodes (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  title text not null,
  host_id uuid references public.hosts(id) on delete set null,
  guest_id uuid references public.guests(id) on delete set null,
  topic text,
  status text default 'Draft' check (status in ('Draft', 'Scheduled', 'Recording', 'Completed')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Table: public.conversations
create table if not exists public.conversations (
  id uuid default uuid_generate_v4() primary key,
  episode_id uuid references public.episodes(id) on delete cascade not null,
  user_id uuid references public.users(id) on delete cascade not null,
  role text not null check (role in ('host', 'guest', 'system')),
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Table: public.summaries
create table if not exists public.summaries (
  id uuid default uuid_generate_v4() primary key,
  episode_id uuid references public.episodes(id) on delete cascade unique not null,
  user_id uuid references public.users(id) on delete cascade not null,
  summary text,
  key_takeaways text[],
  action_items text[],
  suggested_titles text[],
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Function: Trigger to update 'updated_at' column
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Apply Triggers
create trigger update_users_updated_at before update on public.users for each row execute procedure update_updated_at_column();
create trigger update_hosts_updated_at before update on public.hosts for each row execute procedure update_updated_at_column();
create trigger update_knowledge_documents_updated_at before update on public.knowledge_documents for each row execute procedure update_updated_at_column();
create trigger update_guests_updated_at before update on public.guests for each row execute procedure update_updated_at_column();
create trigger update_episodes_updated_at before update on public.episodes for each row execute procedure update_updated_at_column();
create trigger update_summaries_updated_at before update on public.summaries for each row execute procedure update_updated_at_column();

-- Row Level Security (RLS)
alter table public.users enable row level security;
alter table public.hosts enable row level security;
alter table public.knowledge_documents enable row level security;
alter table public.host_knowledge_links enable row level security;
alter table public.guests enable row level security;
alter table public.episodes enable row level security;
alter table public.conversations enable row level security;
alter table public.summaries enable row level security;

-- Policies for public.users
create policy "Users can view their own profile." on public.users for select using (auth.uid() = id);
create policy "Users can update their own profile." on public.users for update using (auth.uid() = id);

-- Policies for public.hosts
create policy "Users can view their own hosts." on public.hosts for select using (auth.uid() = user_id);
create policy "Users can insert their own hosts." on public.hosts for insert with check (auth.uid() = user_id);
create policy "Users can update their own hosts." on public.hosts for update using (auth.uid() = user_id);
create policy "Users can delete their own hosts." on public.hosts for delete using (auth.uid() = user_id);

-- Policies for public.knowledge_documents
create policy "Users can view their own documents." on public.knowledge_documents for select using (auth.uid() = user_id);
create policy "Users can insert their own documents." on public.knowledge_documents for insert with check (auth.uid() = user_id);
create policy "Users can update their own documents." on public.knowledge_documents for update using (auth.uid() = user_id);
create policy "Users can delete their own documents." on public.knowledge_documents for delete using (auth.uid() = user_id);

-- Policies for public.host_knowledge_links
create policy "Users can view links for their hosts." on public.host_knowledge_links for select using (exists (select 1 from public.hosts where id = host_knowledge_links.host_id and user_id = auth.uid()));
create policy "Users can insert links for their hosts." on public.host_knowledge_links for insert with check (exists (select 1 from public.hosts where id = host_knowledge_links.host_id and user_id = auth.uid()));
create policy "Users can delete links for their hosts." on public.host_knowledge_links for delete using (exists (select 1 from public.hosts where id = host_knowledge_links.host_id and user_id = auth.uid()));

-- Policies for public.guests
create policy "Users can view their own guests." on public.guests for select using (auth.uid() = user_id);
create policy "Users can insert their own guests." on public.guests for insert with check (auth.uid() = user_id);
create policy "Users can update their own guests." on public.guests for update using (auth.uid() = user_id);
create policy "Users can delete their own guests." on public.guests for delete using (auth.uid() = user_id);

-- Policies for public.episodes
create policy "Users can view their own episodes." on public.episodes for select using (auth.uid() = user_id);
create policy "Users can insert their own episodes." on public.episodes for insert with check (auth.uid() = user_id);
create policy "Users can update their own episodes." on public.episodes for update using (auth.uid() = user_id);
create policy "Users can delete their own episodes." on public.episodes for delete using (auth.uid() = user_id);

-- Policies for public.conversations
create policy "Users can view conversations for their episodes." on public.conversations for select using (auth.uid() = user_id);
create policy "Users can insert conversations for their episodes." on public.conversations for insert with check (auth.uid() = user_id);
create policy "Users can update conversations for their episodes." on public.conversations for update using (auth.uid() = user_id);
create policy "Users can delete conversations for their episodes." on public.conversations for delete using (auth.uid() = user_id);

-- Policies for public.summaries
create policy "Users can view their own summaries." on public.summaries for select using (auth.uid() = user_id);
create policy "Users can insert their own summaries." on public.summaries for insert with check (auth.uid() = user_id);
create policy "Users can update their own summaries." on public.summaries for update using (auth.uid() = user_id);
create policy "Users can delete their own summaries." on public.summaries for delete using (auth.uid() = user_id);

-- Automatically create a user profile when a user signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, full_name, avatar_url)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Setup Storage for Knowledge Documents
insert into storage.buckets (id, name, public) values ('knowledge-documents', 'knowledge-documents', false) on conflict do nothing;

create policy "Users can view their own storage objects"
  on storage.objects for select
  using ( bucket_id = 'knowledge-documents' and auth.uid() = owner );

create policy "Users can insert their own storage objects"
  on storage.objects for insert
  with check ( bucket_id = 'knowledge-documents' and auth.uid() = owner );

create policy "Users can update their own storage objects"
  on storage.objects for update
  using ( bucket_id = 'knowledge-documents' and auth.uid() = owner );

create policy "Users can delete their own storage objects"
  on storage.objects for delete
  using ( bucket_id = 'knowledge-documents' and auth.uid() = owner );
