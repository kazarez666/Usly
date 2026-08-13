-- Usly v22: unlimited custom current feelings. The stored value is what the user says in first person (e.g. "злюсь"). The UI converts common Russian first-person forms for the partner ("Партнёр злится").
alter table public.couple_feelings drop constraint if exists couple_feelings_mood_check;
alter table public.couple_feelings add constraint couple_feelings_mood_length check (char_length(trim(mood)) between 1 and 60);

-- Keep exactly one current feeling per partner.
alter table public.couple_feelings enable row level security;

NOTIFY pgrst, 'reload schema';
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'couple_desires'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.couple_desires;
  END IF;
END
$$;
ALTER TABLE public.couple_desires REPLICA IDENTITY FULL;
