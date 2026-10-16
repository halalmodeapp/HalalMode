-- Relationship rows are served through consent-checked RPCs. Remove the
-- broad table grants so member sessions cannot bypass those gates directly.
revoke select on table
  public.rounds,
  public.introductions,
  public.connections,
  public.question_picks
from public, anon, authenticated;

-- The trusted connection-summary worker still reads relationship metadata.
grant select on table
  public.rounds,
  public.introductions,
  public.connections,
  public.question_picks
to service_role;
