-- The rank index was meant to give one first choice per set, but it was keyed
-- on the member alone. A member who had ever kept anyone already held rank 1,
-- so sending interest from any later set failed with a duplicate-key error.
--
-- Ranks come from the order of a single submitted array, so they cannot tie
-- within a set; the index protected nothing that the submission does not.
drop index if exists public.introduction_selections_rank_idx;
