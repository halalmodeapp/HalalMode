-- Turn on push notifications.
--
-- Everything behind this flag has been built and unused for months: consent,
-- device registration, the outbox, the three triggers that fill it, the sender
-- that drains it, and the cron that runs the sender. The only reason the
-- setting reads "coming later" is that this row says false.
--
-- Not the matching flag, which stays where it is. This one governs whether a
-- member may be asked for notification permission and have their device
-- registered — nothing is delivered to anybody who has not said yes on their
-- own phone, twice: once to the operating system and once to us.
--
-- 100 percent rather than a slow rollout, because a partial rollout of a
-- notification system tests nothing: a tester whose phone happens to fall
-- outside the percentage would report that notifications do not work, and be
-- right.

update halal_mode_private.release_flags
set enabled = true,
    rollout_percentage = 100,
    updated_at = now()
where key = 'push_notifications';

do $$
begin
  assert exists (
    select 1 from halal_mode_private.release_flags
    where key = 'push_notifications' and enabled and rollout_percentage = 100
  ), 'push notifications must be on for everybody';

  -- The matcher stays off. Asserted here rather than assumed, because this is
  -- the migration that proves flags in this table can be flipped.
  assert not exists (
    select 1 from halal_mode_private.release_flags
    where key = 'controlled_beta' and enabled
  ), 'this migration must not have enabled anything else';
end;
$$;
