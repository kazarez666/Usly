-- Usly: одно актуальное чувство на каждого партнёра.
-- ВАЖНО: этот скрипт удаляет старую таблицу couple_feelings, если она была создана
-- по предыдущей версии. История чувств нам больше не нужна.

DROP TABLE IF EXISTS public.couple_feelings CASCADE;

CREATE TABLE public.couple_feelings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id uuid NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mood text NOT NULL CHECK (mood IN ('love', 'happy', 'calm', 'sad', 'angry', 'miss')),
  note text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (couple_id, user_id)
);

CREATE INDEX couple_feelings_couple_idx
  ON public.couple_feelings(couple_id);

ALTER TABLE public.couple_feelings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "feelings_select_for_members"
ON public.couple_feelings
FOR SELECT
TO authenticated
USING (public.is_couple_member(couple_id));

CREATE POLICY "feelings_insert_own"
ON public.couple_feelings
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND public.is_couple_member(couple_id)
);

CREATE POLICY "feelings_update_own"
ON public.couple_feelings
FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid()
  AND public.is_couple_member(couple_id)
)
WITH CHECK (
  user_id = auth.uid()
  AND public.is_couple_member(couple_id)
);

CREATE POLICY "feelings_delete_own"
ON public.couple_feelings
FOR DELETE
TO authenticated
USING (
  user_id = auth.uid()
  AND public.is_couple_member(couple_id)
);

grant select, insert, update, delete on public.couple_feelings to authenticated;

-- Включаем таблицу в Supabase Realtime, если её там ещё нет.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'couple_feelings'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.couple_feelings;
  END IF;
END
$$;

ALTER TABLE public.couple_feelings REPLICA IDENTITY FULL;

NOTIFY pgrst, 'reload schema';
