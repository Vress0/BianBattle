-- Run this in the Supabase SQL editor to create the battle_invites table

CREATE TABLE IF NOT EXISTS public.battle_invites (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inviter_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mode           text NOT NULL,
  topic          text NOT NULL,
  inviter_side   text NOT NULL,
  receiver_side  text NOT NULL,
  status         text NOT NULL DEFAULT 'pending',
  match_id       uuid REFERENCES public.matches(id) ON DELETE SET NULL,
  expires_at     timestamptz NOT NULL DEFAULT now() + interval '10 minutes',
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT bi_no_self       CHECK (inviter_id <> receiver_id),
  CONSTRAINT bi_mode          CHECK (mode IN ('debate', 'banter')),
  CONSTRAINT bi_inviter_side  CHECK (inviter_side IN ('pro', 'con')),
  CONSTRAINT bi_receiver_side CHECK (receiver_side IN ('pro', 'con')),
  CONSTRAINT bi_sides_differ  CHECK (inviter_side <> receiver_side),
  CONSTRAINT bi_status        CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled', 'expired')),
  CONSTRAINT bi_topic_length  CHECK (char_length(topic) BETWEEN 1 AND 120)
);

CREATE INDEX IF NOT EXISTS idx_bi_receiver_pending
  ON public.battle_invites (receiver_id) WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_bi_inviter_pending
  ON public.battle_invites (inviter_id) WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_bi_expires
  ON public.battle_invites (expires_at) WHERE status = 'pending';

ALTER TABLE public.battle_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bi_select_own"
  ON public.battle_invites FOR SELECT TO authenticated
  USING (auth.uid() = inviter_id OR auth.uid() = receiver_id);

CREATE POLICY "bi_insert_own"
  ON public.battle_invites FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = inviter_id);

GRANT ALL ON public.battle_invites TO service_role;
GRANT SELECT, INSERT ON public.battle_invites TO authenticated;

-- Enable Realtime so the inviter can auto-navigate when invite is accepted
-- (3-second polling fallback works even without Realtime)
ALTER TABLE public.battle_invites REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname   = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename  = 'battle_invites'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.battle_invites;
  END IF;
END $$;
