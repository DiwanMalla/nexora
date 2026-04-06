-- Private chat attachments (v1): metadata + extracted text; files in Storage bucket `attachments`.

create table if not exists public.attachments (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references public.profiles(id) on delete cascade,
  conversation_id uuid references public.conversations(id) on delete set null,
  message_id uuid references public.messages(id) on delete set null,
  storage_path text not null,
  original_name text not null,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 10485760),
  status text not null default 'uploaded' check (
    status in ('uploaded', 'processing', 'ready', 'error')
  ),
  extracted_text text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists ix_attachments_user on public.attachments (user_id);
create index if not exists ix_attachments_conversation on public.attachments (conversation_id);
create index if not exists ix_attachments_message on public.attachments (message_id);

alter table public.attachments enable row level security;

create policy "Users read own attachments"
  on public.attachments for select to authenticated
  using (user_id = (select auth.jwt()->>'sub'));

create policy "Users insert own attachments"
  on public.attachments for insert to authenticated
  with check (user_id = (select auth.jwt()->>'sub'));

create policy "Users update own attachments"
  on public.attachments for update to authenticated
  using (user_id = (select auth.jwt()->>'sub'))
  with check (user_id = (select auth.jwt()->>'sub'));

create policy "Users delete own attachments"
  on public.attachments for delete to authenticated
  using (user_id = (select auth.jwt()->>'sub'));

-- Private bucket (server uploads via service role; optional direct reads restricted by path)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'attachments',
  'attachments',
  false,
  10485760,
  array[
    'application/pdf',
    'text/plain',
    'text/markdown',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
