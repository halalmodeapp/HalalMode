-- Hiding someone also hides you from them, in today's set as well as later
-- ones (later ones were already covered by the matcher and pair retirement).

create or replace function public.get_current_round()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, halal_mode_private as $$
declare
  r_city text;
  r rounds%rowtype;
  cards jsonb;
begin
  if auth.uid() is null
     or not halal_mode_private.member_has_current_legal_consents(auth.uid())
     or not profile_is_ready_for_matching(auth.uid()) then
    return null;
  end if;

  select * into r
  from rounds
  -- opens_at is a gate, not a sort key. It was only ever used for ordering,
  -- so a round was visible the instant it was written — which is fine when
  -- every round opens at the same global moment and wrong the moment they
  -- open at each member's own dawn.
  where user_id = auth.uid() and submitted_at is null
    and opens_at <= now() and expires_at > now()
  order by opens_at desc limit 1;
  if r is null then return null; end if;

  select coalesce(jsonb_agg(card order by card->>'id'), '[]'::jsonb) into cards
  from (
    select jsonb_build_object(
      'id', i.id, 'roundId', i.round_id, 'agreements', i.agreements,
      'profile', safe_member_profile(p)
    ) as card
    from introductions i
    join profiles p on p.id = i.subject_id
    where i.round_id = r.id
      and i.viewer_id = auth.uid()
      and not exists (
        select 1
        from blocks b
        where (b.blocker_id = auth.uid() and b.blocked_id = i.subject_id)
           or (b.blocker_id = i.subject_id and b.blocked_id = auth.uid())
      )
      -- "I don't want to see them" works both ways at once: neither appears in
      -- the other's current set, not just in future ones.
      and not exists (
        select 1
        from halal_mode_private.member_hides h
        where (h.hider_id = auth.uid() and h.hidden_id = i.subject_id)
           or (h.hider_id = i.subject_id and h.hidden_id = auth.uid())
      )
  ) cards_q;

  -- The member's own city, so the app can say when their set resets in words
  -- that mean something where they are — "resets at Fajr in Tokyo" rather than
  -- a time that is somebody else's dawn.
  select city into r_city from profiles where id = auth.uid();

  return jsonb_build_object(
    'id', r.id, 'opensAt', r.opens_at, 'expiresAt', r.expires_at,
    'tier', r.tier, 'submitted', false, 'introductions', cards,
    'city', r_city
  );
end;
$$;


