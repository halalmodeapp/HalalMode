-- Set-based round generation (statements moved to 0140).
--
-- Production applied this version after 0139 (see DECISIONS.md, "The backend
-- moved from Seoul to London"). Its statements now live at the top of
-- 0140_know_when_it_breaks.sql so a fresh replay runs them in that same
-- position; by filename this file sorts after every numbered migration, where
-- they would no longer apply. The version stays so `supabase migration list`
-- matches the remote. Here it only confirms that section ran.

do $$
begin
  if not (to_regclass('halal_mode_private.matching_run_candidate_shortlists') is not null) then
    raise exception '20260813090200_set_based_round_generation.sql: matching_run_candidate_shortlists is missing; 0140 should have created it';
  end if;
end;
$$;
