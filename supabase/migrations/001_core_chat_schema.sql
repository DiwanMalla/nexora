-- Core chat schema (Phase 1)
-- Clerk + Supabase third-party auth integration (RLS via auth.jwt()->>'sub')

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id text primary key,
  email text,
  display_name text,
  avatar_url text,
  preferred_model text default 'openai/gpt-4o-mini',
  tier text not null default 'free' check (tier in ('free', 'pro', 'teams', 'api')),
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  subscription_status text default 'inactive' check (
    subscription_status in ('active', 'inactive', 'past_due', 'canceled')
  ),
  daily_message_count integer not null default 0,
  daily_agent_count integer not null default 0,
  last_usage_reset_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references public.profiles(id) on delete cascade,
  title text not null default 'New conversation',
  model text,
  agent_type text,
  is_comparison boolean not null default false,
  pinned boolean not null default false,
  archived boolean not null default false,
  last_message_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id text not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system', 'tool')),
  content text not null,
  model text,
  citations jsonb,
  execution_blocks jsonb,
  token_usage jsonb,
  metadata jsonb,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;

create index if not exists ix_profiles_stripe_customer
  on public.profiles (stripe_customer_id)
  where stripe_customer_id is not null;

create index if not exists ix_conversations_user
  on public.conversations (user_id);

create index if not exists ix_conversations_user_updated
  on public.conversations (user_id, updated_at desc);

create index if not exists ix_messages_conversation
  on public.messages (conversation_id);

create index if not exists ix_messages_user
  on public.messages (user_id);

create index if not exists ix_messages_conversation_created
  on public.messages (conversation_id, created_at asc);

create or replace function public.handle_updated_at()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function public.handle_updated_at();

drop trigger if exists set_conversations_updated_at on public.conversations;
create trigger set_conversations_updated_at
  before update on public.conversations
  for each row execute function public.handle_updated_at();

-- Profiles policies
create policy "Users read own profile"
  on public.profiles for select to authenticated
  using (id = (select auth.jwt()->>'sub'));

create policy "Users update own profile"
  on public.profiles for update to authenticated
  using (id = (select auth.jwt()->>'sub'))
  with check (id = (select auth.jwt()->>'sub'));

-- Conversations policies
create policy "Users read own conversations"
  on public.conversations for select to authenticated
  using (user_id = (select auth.jwt()->>'sub'));

create policy "Users insert own conversations"
  on public.conversations for insert to authenticated
  with check (user_id = (select auth.jwt()->>'sub'));

create policy "Users update own conversations"
  on public.conversations for update to authenticated
  using (user_id = (select auth.jwt()->>'sub'))
  with check (user_id = (select auth.jwt()->>'sub'));

create policy "Users delete own conversations"
  on public.conversations for delete to authenticated
  using (user_id = (select auth.jwt()->>'sub'));

-- Messages policies
create policy "Users read own messages"
  on public.messages for select to authenticated
  using (user_id = (select auth.jwt()->>'sub'));

create policy "Users insert own messages"
  on public.messages for insert to authenticated
  with check (user_id = (select auth.jwt()->>'sub'));
