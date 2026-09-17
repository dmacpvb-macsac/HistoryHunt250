alter table public.campaigns
  add column if not exists event_welcome_title text,
  add column if not exists event_welcome_message text,
  add column if not exists event_welcome_note text;

comment on column public.campaigns.event_welcome_title is
  'Optional heading displayed above the game list on an Event Hub.';

comment on column public.campaigns.event_welcome_message is
  'Optional plain-text Event Hub welcome copy. Blank lines create paragraphs.';

comment on column public.campaigns.event_welcome_note is
  'Optional short note displayed beneath the Event Hub welcome message.';
