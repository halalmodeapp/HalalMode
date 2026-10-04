-- Ethnicity: from 15 broad groups to the broad groups plus 110 specific
-- ethnicities and origins under them, so members can describe themselves
-- rather than fit a box. The broad ids from migration 0171 stay valid; one new
-- group (north_caucasian) is added.
--
-- public.ethnicity_region maps any id to its broad group, and is the single
-- list of valid ids (the app's list, src/data/ethnicities.ts, is generated
-- from the same source). A Premium filter on a broad group now also includes
-- members who chose something under it.

create or replace function public.ethnicity_region(p_id text)
returns text
language sql
immutable
set search_path to 'public'
as $function$
  select region from (values
    ('egyptian', 'arab'),
    ('moroccan', 'arab'),
    ('algerian', 'arab'),
    ('tunisian', 'arab'),
    ('libyan', 'arab'),
    ('sudanese', 'arab'),
    ('mauritanian', 'arab'),
    ('saudi', 'arab'),
    ('emirati', 'arab'),
    ('kuwaiti', 'arab'),
    ('qatari', 'arab'),
    ('bahraini', 'arab'),
    ('omani', 'arab'),
    ('yemeni', 'arab'),
    ('iraqi', 'arab'),
    ('syrian', 'arab'),
    ('lebanese', 'arab'),
    ('jordanian', 'arab'),
    ('palestinian', 'arab'),
    ('kabyle', 'amazigh'),
    ('riffian', 'amazigh'),
    ('shilha', 'amazigh'),
    ('tuareg', 'amazigh'),
    ('pakistani', 'south_asian'),
    ('indian', 'south_asian'),
    ('bangladeshi', 'south_asian'),
    ('sri_lankan', 'south_asian'),
    ('maldivian', 'south_asian'),
    ('nepali', 'south_asian'),
    ('punjabi', 'south_asian'),
    ('sindhi', 'south_asian'),
    ('pashtun', 'south_asian'),
    ('baloch', 'south_asian'),
    ('kashmiri', 'south_asian'),
    ('gujarati', 'south_asian'),
    ('iranian', 'persian'),
    ('tajik', 'persian'),
    ('hazara', 'persian'),
    ('afghan', 'central_asian'),
    ('uzbek', 'central_asian'),
    ('kazakh', 'central_asian'),
    ('kyrgyz', 'central_asian'),
    ('turkmen', 'central_asian'),
    ('uyghur', 'central_asian'),
    ('tatar', 'central_asian'),
    ('turkish_cypriot', 'turkish'),
    ('azerbaijani', 'turkish'),
    ('chechen', 'north_caucasian'),
    ('circassian', 'north_caucasian'),
    ('dagestani', 'north_caucasian'),
    ('ingush', 'north_caucasian'),
    ('malay', 'southeast_asian'),
    ('indonesian', 'southeast_asian'),
    ('javanese', 'southeast_asian'),
    ('sundanese', 'southeast_asian'),
    ('minangkabau', 'southeast_asian'),
    ('bruneian', 'southeast_asian'),
    ('moro_filipino', 'southeast_asian'),
    ('cham', 'southeast_asian'),
    ('rohingya', 'southeast_asian'),
    ('thai_malay', 'southeast_asian'),
    ('cape_malay', 'southeast_asian'),
    ('hui', 'east_asian'),
    ('chinese', 'east_asian'),
    ('japanese', 'east_asian'),
    ('korean', 'east_asian'),
    ('somali', 'black_african'),
    ('ethiopian', 'black_african'),
    ('oromo', 'black_african'),
    ('eritrean', 'black_african'),
    ('djiboutian', 'black_african'),
    ('nigerian', 'black_african'),
    ('hausa', 'black_african'),
    ('fulani', 'black_african'),
    ('yoruba', 'black_african'),
    ('senegalese', 'black_african'),
    ('gambian', 'black_african'),
    ('malian', 'black_african'),
    ('guinean', 'black_african'),
    ('sierra_leonean', 'black_african'),
    ('ghanaian', 'black_african'),
    ('ivorian', 'black_african'),
    ('burkinabe', 'black_african'),
    ('nigerien', 'black_african'),
    ('chadian', 'black_african'),
    ('cameroonian', 'black_african'),
    ('kenyan', 'black_african'),
    ('tanzanian', 'black_african'),
    ('swahili', 'black_african'),
    ('ugandan', 'black_african'),
    ('comorian', 'black_african'),
    ('south_african', 'black_african'),
    ('african_american', 'african_caribbean'),
    ('black_british', 'african_caribbean'),
    ('indo_caribbean', 'african_caribbean'),
    ('bosniak', 'white'),
    ('albanian', 'white'),
    ('pomak', 'white'),
    ('british', 'white'),
    ('irish', 'white'),
    ('western_european', 'white'),
    ('southern_european', 'white'),
    ('eastern_european', 'white'),
    ('white_american', 'white'),
    ('mexican', 'hispanic_latino'),
    ('puerto_rican', 'hispanic_latino'),
    ('dominican', 'hispanic_latino'),
    ('colombian', 'hispanic_latino'),
    ('brazilian', 'hispanic_latino'),
    ('argentine', 'hispanic_latino'),
    ('arab', 'arab'),
    ('amazigh', 'amazigh'),
    ('south_asian', 'south_asian'),
    ('persian', 'persian'),
    ('central_asian', 'central_asian'),
    ('turkish', 'turkish'),
    ('kurdish', 'kurdish'),
    ('north_caucasian', 'north_caucasian'),
    ('southeast_asian', 'southeast_asian'),
    ('east_asian', 'east_asian'),
    ('black_african', 'black_african'),
    ('african_caribbean', 'african_caribbean'),
    ('white', 'white'),
    ('hispanic_latino', 'hispanic_latino'),
    ('mixed', 'mixed'),
    ('other', 'other')
  ) as m(id, region)
  where m.id = p_id;
$function$;

alter table public.profiles drop constraint if exists profiles_ethnicity_check;
alter table public.profiles add constraint profiles_ethnicity_check
  check (ethnicity is null or ethnicity = 'prefer_not_to_say' or public.ethnicity_region(ethnicity) is not null);

do $$
declare
  v_def text;
  v_anchor constant text := 'or c.ethnicity = any(pp.preferred_ethnicities))';
begin
  select pg_get_functiondef('halal_mode_private.premium_filters_allow'::regproc) into v_def;
  if position(v_anchor in v_def) = 0 then
    raise exception 'premium_filters_allow: ethnicity anchor not found';
  end if;
  if position('ethnicity_region' in v_def) = 0 then
    v_def := replace(v_def, v_anchor,
      'or c.ethnicity = any(pp.preferred_ethnicities)' || E'\n          '
      || 'or public.ethnicity_region(c.ethnicity) = any(pp.preferred_ethnicities))');
    execute v_def;
  end if;
end;
$$;
