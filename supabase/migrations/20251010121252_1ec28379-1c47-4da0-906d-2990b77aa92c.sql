-- Create public storage bucket for chat attachments if missing
insert into storage.buckets (id, name, public)
values ('chat-attachments', 'chat-attachments', true)
on conflict (id) do nothing;

-- Public read policy for chat attachments
do $$
begin
  if not exists (
    select 1 from pg_policies p
    where p.schemaname = 'storage' and p.tablename = 'objects' and p.policyname = 'Public read for chat attachments'
  ) then
    create policy "Public read for chat attachments"
    on storage.objects for select
    to public
    using (bucket_id = 'chat-attachments');
  end if;
end$$;

-- Authenticated users can upload to their own folder in chat-attachments
do $$
begin
  if not exists (
    select 1 from pg_policies p
    where p.schemaname = 'storage' and p.tablename = 'objects' and p.policyname = 'Authenticated can upload chat attachments'
  ) then
    create policy "Authenticated can upload chat attachments"
    on storage.objects for insert
    to authenticated
    with check (
      bucket_id = 'chat-attachments' and auth.uid()::text = (storage.foldername(name))[1]
    );
  end if;
end$$;