# Halal Mode: launch and growth assessment

Assessment date: 6 October 2026. Source snapshot: `bb73fc7`, with existing uncommitted website edits. This is a readiness assessment and operating plan, not a production security certification or jurisdiction-specific legal opinion.

## Decision

Halal Mode has enough implemented product scope to concentrate on launching a small, free, invitation-only cohort. A broad public launch or paid acquisition campaign is not yet supported by the evidence available in this assessment. The shortest route is to finish operational readiness, prove the native journey, and recruit a dense pool in one market. More matching features, languages and visual polish are lower priority.

Success depends on three things working together: trusted introductions, enough mutually eligible active members, and an operator who can handle safety and reliability. Automation can reduce routine work; it cannot remove your responsibility for these three things.

Your incorporation country, nationality/residency eligibility, target launch country, available hours, budget, existing company and actual member numbers remain unknown. Saudi considerations below are conditional, not an assumption based on your timezone. Timelines and numerical targets are planning hypotheses, not forecasts or industry benchmarks.

## Evidence and confidence

Reviewed source, current product decisions, launch/quality/provider/deletion documentation, the prior red-team report, feature flags, website waitlist, legal copy, analytics, CI configuration and AI-summary code. No production changes, outreach, purchases or registrations were made.

| Area | Evidence | Assessment |
| --- | --- | --- |
| Core product | Auth, onboarding, introductions, reciprocal interest, questions, recap, chat, media, blocking/reporting and account controls exist | Substantial implementation; native and live release proof still needed |
| Current product contract | October decisions use three question picks each and 3/10 interest limits | README's five-question and 1/3-keep descriptions are stale |
| Build configuration | Expo 57 / React Native 0.86 in package.json; actual EAS UUID in app.json | Old Expo 54 and placeholder-EAS warnings are stale; UUID does not prove successful builds |
| Safety fixes | Migrations 0165 onward address earlier findings; decisions record fixes | Do not repeat all October 3 findings as still-open vulnerabilities; require deployed regression evidence |
| Release flags | Dangerous capabilities default off; remote mapping exists | Defaults do not establish live flag state |
| Notifications/deletion | Sending and deletion workers exist | Deployment, scheduler execution, receipts and completed erasure need live proof |
| Paid membership | No store billing SDK in package.json; purchase flag defaults off | Paid launch is not established; free beta avoids this dependency |
| Analytics | `setAnalyticsSink` exists but has no caller in app/src | Product-event calls have no connected destination |
| Crash reporting | Recovery boundary describes a future observability client | No established production crash-monitoring integration found in reviewed source |
| Backend access | Connected Supabase account lists only `HalalModeOLD`; current source points to another project | Current migrations, settings, logs, backups and member counts not verified |
| CI | Workflow exists; `gh run list` returned an empty list | No current passing candidate CI run retrieved; do not interpret as proof of failure or success |
| Website | Waitlist implementation reads email/city/age; local edits already present | Live URL was inaccessible through the research tool; not proof the site is down |
| Business | No verified registration, banking, tax, contracts, revenue or support staffing evidence | Unknown, not automatically absent |

Local verification results are recorded at the end of this report. Source presence, historical reports and passing unit tests do not prove production readiness.

## Launch scope to freeze

Keep: adult marriage intent, completed profiles, a bounded daily set, mutual interest, questions and recap, text chat, block/report/hide, pause/delete, basic notifications when proven, clear safety information and support.

Defer: live calling, chat voice notes, a new ID-verification integration unless required by risk/legal assessment, more languages, new ranking research, complex referral rewards, paid boosts, lifetime plans and a custom enterprise support system. Do not present an identity badge without verification evidence. Never seed real-member pools with sample people.

An optional AI recap can remain disabled until data handling and reliability are established; the source already has a non-AI fallback. Do not let this delay the underlying conversation journey.

Choose the first platform from actual recruited members' devices. A one-platform engineering pilot can save work, but if it excludes too many compatible people, include both platforms before the real-member cohort. Do not choose Android solely because its developer registration is cheaper.

## Before inviting real members: seven gates

| Priority | Work | Evidence that closes the gate | Suggested effort, excluding outside delays |
| --- | --- | --- | --- |
| 1 | Define one launch market and operator | Country/city, adult audience, supported languages, legal operator, beta capacity and weekly time budget recorded | Half a day plus eligibility/legal review |
| 2 | Reconcile source and deployment | Candidate SHA; correct project access; migration history; flags; function versions; clean candidate CI including isolated DB tests | 1–3 days if healthy |
| 3 | Prove actual native journey | Two controlled real accounts complete onboarding → real round → mutual interest → answers → recap → chat → report/block → deletion on target devices | 3–7 days plus fixes |
| 4 | Make privacy statements accurate | Reviewed data map, operator identity, retention schedule, supplier terms, consent, public documents and deletion process | 2–5 days of preparation plus external review |
| 5 | Make safety actionable | A report alerts you, evidence is access-controlled, you can restrict an account, record a decision and handle an appeal; backup cover exists | 2–4 days |
| 6 | Make failures visible/recoverable | Scrubbed errors, failed-job alerts, authenticated email, deletion receipts, backup/restore drill and rollback procedure | 2–4 days |
| 7 | Recruit a viable cohort | Enough active mutually eligible people; onboarding and empty-set experience understood; support capacity available | Ongoing, usually the uncertainty that dominates |

These estimates overlap and cannot be added into a guaranteed launch date. A 4–6 week planning window is reasonable only if there are no major native defects or legal/account delays.

### Technical acceptance details

- Test cold and warm magic links, expired/reused links, logout/login with another account, denied location/photo permissions and onboarding resumption.
- Run the declared compact/tall Android and small/large iPhone matrix for platforms offered, English/Arabic cold restart, large text and screen-reader checks. Test every language advertised as supported, or narrow advertised support.
- Exercise slow/offline networks, duplicate taps, message retry without duplication, reconnect, media expiry, blocked-member access and old-client behavior after schema changes.
- Prove the actual local-Fajr schedule, timezone/travel behavior and a missed-job alert. The old Madinah-only documentation is not a sufficient specification.
- Test the deletion worker through auth, profile, media, related records and documented exceptions. Retained reports need a justified expiry/access policy. A database backup alone does not establish that media can be restored.
- Verify current RLS/storage/RPC grants, rate limits, upload limits, auth email delivery and production secrets using the current project. Audit all Edge Functions; the visible workflow typechecks only generate-round.
- Put bounds/timeouts and a spending kill switch on external AI calls. The recap already caches per connection/language, but the reviewed fetch has no explicit timeout. User answers remain sensitive even when names are replaced with Person A/B.
- Connect a minimal analytics destination. Use an event-specific allowlist: the existing generic string/number sanitizer does not actually prevent sensitive text being passed in an otherwise valid property.
- Record one release checklist against one SHA/build/backend version; update stale documents so future AI work does not implement old rules.

## Business, company and legal work

Use the simplest lawful operating structure for your residence, ownership eligibility and first market. Do not form a foreign company merely because an online guide calls it cheap: banking, annual filings and local obligations can exceed the initial fee.

Prepare one folder containing operator registration/licences, address/contact, bank and accounting records, app-store/hosting ownership, domain records, supplier agreements and intellectual-property records. Put MFA and recovery codes on essential accounts; identify a trusted continuity contact without sharing unrestricted credentials.

Get a fixed-scope local professional review answering these exact questions:

1. May this operator lawfully provide this marriage-introduction service to this market, and does its particular activity require a licence or approval?
2. Which structure fits your eligibility and liability exposure, and what recurring filings/taxes apply?
3. What basis and consent are required for religion, ethnicity, relationship answers, location, photos and matching/profiling? Is an impact assessment, officer or registration required?
4. Are the database, email, push and AI provider locations/transfers acceptable, with which agreements and disclosures?
5. What are the consumer, subscription, refunds, data-rights, incident and child-safety duties and deadlines?

For Saudi operations, review PDPL sensitive-data processing and overseas transfers, the appropriate commercial activity, e-commerce applicability and tax/e-invoicing obligations. Religious beliefs and ethnic origin are within the law's sensitive-data definition. Do not assume all overseas hosting is prohibited or automatically permitted. [Official PDPL](https://misa.gov.sa/app/uploads/2025/08/PersonalDataProtectionLaw.pdf), [transfer regulation](https://sdaia.gov.sa/Documents/RegulationonPersonalDataEN.pdf), [e-commerce authentication](https://my.gov.sa/en/services/352435), [ZATCA registration](https://zatca.gov.sa/en/eServices/Pages/eservices-001.aspx).

Company and bank ownership should align with your store and provider accounts. Apple organization enrollment requires a legal entity and generally D-U-N-S verification; account choice affects the displayed seller name. Begin this early if using a company. [Apple enrollment](https://developer.apple.com/programs/enroll/).

Check brand/trademark conflicts in your intended market before spending heavily on acquisition. Keep proof of commercial rights for photos, fonts, icons and contractor work. A domain or company name alone does not establish trademark clearance. Ask for a cyber/professional-liability quote once the activity and entity are known; price it against your exposure, not as a substitute for controls.

### Specific document corrections

- `src/data/legalDocuments.ts:153` says the AI supplier may not retain answers. Anthropic's published standard API policy allows retention, subject to agreements and exceptions. Verify your actual model/workspace/contract; amend the promise or disable the feature until resolved. [Provider retention policy](https://privacy.claude.com/en/articles/7996866-how-long-do-you-store-my-organization-s-data).
- The privacy notice refers to trained staff; make the description accurate for a solo operator and any authorized cover.
- Replace vague recovery-period language with the actual reviewed deletion timetable. Operations currently document 30 days; reconcile wording that says messages disappear on closure.
- Add the actual legal controller/operator identity, contact, relevant rights/complaints route, material data categories, matching purposes, supplier/transfer information and explicit retention rules as required for the chosen market.
- Review the religious/ethnicity/heritage/profile disclosures against the latest October features, not just old photo/name examples.
- The website waitlist has no visible privacy-document link in the reviewed form/footer and says data is never shared. Link a suitable notice and describe necessary processor access accurately. Invitation consent is not permission for unrelated promotional campaigns.
- Publicly accessible safety/community standards, support and account-deletion information must be functional. An in-app screen alone may not satisfy store website requirements.

Spend professional-review money on these concrete questions and source-backed documents; AI can prepare the brief and drafts, while you obtain actual legal conclusions.

## Trust, support and operational workload

For beta, use one business mailbox with support/privacy/safety aliases, labels and saved replies. A separate paid helpdesk is unnecessary until volume creates a problem. Build only a small authenticated operator surface for reports, account restrictions, appeals, deletion queue and system health. Prefer audited server-authorized actions over manually editing raw production tables.

Publish realistic support hours. As an initial operating target, review ordinary tickets within one business day; urgent safety reports need immediate alerting and a real escalation/coverage arrangement. Do not promise 24/7 live support you cannot supply. If you cannot maintain coverage, cap invitations and arrange trained backup before expanding.

Keep a short playbook for harassment, suspected underage accounts, impersonation/scams, photo abuse, threats, billing and data requests. Include evidence minimization, access logging, who can restrict accounts, appeal review, and legally required reporting routes. Never route suspected illegal imagery into a general-purpose AI tool.

Have appropriate content filtering and human review, including new/changed profile photos and bios. Manual pre-publication review can work for a very small cohort; it needs an actual queue and enforcement, not just an intention. Automated classifiers can flag concerns, but human review resolves ambiguous context and consequential sanctions.

Apple expects UGC filtering, reporting, blocking and reachable support. Google requires published child-safety standards and a designated contact for covered social/dating apps even if they are adults-only. [Apple rules](https://developer.apple.com/app-store/review/guidelines/), [Google child-safety standards](https://support.google.com/googleplay/android-developer/answer/14747720?hl=en).

## Minimum automation, using the existing stack

| Trigger | Automatic work | Human responsibility |
| --- | --- | --- |
| Code change | Typecheck, lint, unit/DB contracts, all function checks, build artifact | Review changes and release evidence |
| Failed scheduler/delivery/deletion job | Bounded retry, deduplicated alert with job ID and safe metadata | Investigate unresolved failure; decide rollback |
| Safety report | Immediate acknowledgement, protected case, severity alert | Evidence assessment, restrictions, appeal and escalation |
| Ordinary help request | Rule-based tagging, relevant FAQ, AI draft from approved material | Approve sensitive or uncertain replies |
| New eligible waitlist cohort | Prepare capped invitation batch; respect suppression/unsubscribe | Approve capacity and audience; avoid revealing member mix |
| Daily operations | Aggregate dashboard: rounds, failures, safety backlog, email delivery and spending | Check exceptions once or twice daily |
| Weekly growth review | Funnel counts and AI summary of aggregate trends | Choose one product/acquisition experiment |
| Provider spending threshold | Alert at 50/80/100% of budget; shut off optional AI at hard cap | Approve extra spend; preserve core service |

Use existing scheduled workers, database queries and CI before adding an automation platform or self-hosted workflow server. Retries must be idempotent and bounded; a silent cron failure needs an outside heartbeat check. Suppress identifiers, content and sensitive metadata in alerts.

AI is useful for code/test drafts, approved-answer support drafts, translation first passes, campaign scripts and analysis of aggregate metrics. Avoid autonomous bans, legal decisions, refunds, crisis replies, fabricated testimonials or religious verdicts. Do not upload private member conversations into your ordinary coding/chat account to get help.

## Marketing and growth: solve pool quality first

Positioning hypothesis: **“A few thoughtful introductions each day, for Muslims serious about marriage.”** Explain reciprocity, private interest and questions before chat with real screenshots and an honest demo. Do not promise marriage, guaranteed compatibility, verified identities or religious certification you do not have.

Start with one city/region and a coherent audience you can reach personally. Interview 10–15 prospective members across the matching pool about trust, privacy, willingness to complete the profile, frustrations, device choice and willingness to pay. Include people who decline the concept. This is research, not evidence of product-market fit.

Recruit through two or three relevant community partners, small creators or existing networks, with permission. Founder-led conversations and demonstrations are more informative initially than broad ads. Prepare outreach drafts; do not mass-message private groups or purchase lists. Avoid public exposure of who has joined.

The current waitlist captures city and age range but does not give enough information to establish reciprocal pool balance. Add only the minimum, consented information needed to invite compatible cohorts, potentially in a follow-up opt-in form. Invitations should be based on readiness and compatible capacity, so revise the existing strict join-order promise if you adopt this recommendation.

A first operational cohort of roughly 50–100 active, completed profiles is a planning target, not a sufficient condition. Fifty people scattered across many countries or non-overlapping preferences can be worse than a smaller viable local group. Preview eligibility privately; never weaken must-have preferences without permission or expose individual scarcity data.

Initial acquisition routine:

- One founder-recorded short demo each week; AI drafts three cutdowns/captions, you check them.
- One useful piece about the actual marriage-search process or product privacy, without making unqualified religious/legal claims.
- Several personal partner conversations weekly; track qualified signups per source.
- One honest progress email only to people who consented to that purpose.
- Ask members who received value whether they want to share an invitation. Do not reward matching attention or require sharing private outcomes.

Measure visitor → consented waitlist → invited → completed/approved profile → nonempty round → mutual interest → completed answers → two-way conversation → voluntary outcome feedback. Track failure reasons at each step. Exclude sample/test accounts in the data layer.

Your primary early outcome should be **members reaching a useful two-way conversation**, supported by safety and waiting-time measures. Downloads, total waitlist and time spent swiping are poor substitutes. Members leaving after a successful outcome is different from leaving because the app failed them.

Provisional expansion gates, evaluated over several weekly cohorts rather than one tiny sample:

- Zero unresolved critical privacy/safety defects; urgent reports handled within your published process.
- No silent failed round cycles; auth, messaging and deletion work reliably.
- At least 80% of eligible active members receive a nonempty appropriate set during the week; examine underserved segments privately.
- At least 25% of activated members reach a two-way conversation within 14 days, as a testable starting hypothesis.
- Support fits the available hours, and interviews confirm the conversation was worth having.

If these fail, diagnose the cause: thin pool, overly restrictive preferences, onboarding friction, one-sided participation, unanswered questions or trust. More paid traffic is only useful if it fixes a measured pool shortage. Broaden one dimension at a time: cohort size, then nearby geography, then another market.

## Revenue and sustainable cost

Run the first small cohort free and label the beta clearly. Interview members about Premium before implementing payments. Once value is established, offer one transparent monthly plan with store billing, server-verified entitlements, restore, expiry, refunds and cancellation behavior. Avoid selling an annual promise before retention and supply are known. Do not assume external checkout is allowed for all app storefronts; review the relevant store/payment rules for your market at implementation time.

Use actual net receipts and cost data:

`monthly contribution = paying members × net receipt per payer − variable costs across ALL members − fixed operating costs`

`acquisition cost per activated member = campaign spending ÷ completed eligible profiles attributed to campaign`

Hypothetical illustration only: at $8 net per payer and $150 total monthly cash costs, 19 payers cover those costs. At a hypothetical 5% paid share, that corresponds to about 380 active members. This excludes founder pay and assumes the $150 still covers that usage; neither price nor conversion is validated. Measure cumulative contribution before assigning lifetime value.

| Item | Lean beta monthly planning allowance, USD | Basis |
| --- | --- | --- |
| Database/backend | $25 baseline | Supabase Pro starting price; extra projects, compute and usage add cost |
| Existing static site | $0 incremental target | Confirm current hosting plan/quota; avoid a migration just to save pennies |
| Business mailbox + transactional email | $5–20 | Budget allowance, not a supplier quote |
| AI summaries/operations API | $0–10 | Cap or disable optional recap; existing coding subscription separate |
| Monitoring/basic support tools | $0–10 | Begin with existing/free quotas, verify limits |
| Additional build/staging/backup needs | $0–30 | Variable; choose from actual release/recovery requirements |
| Domain + Apple fee monthly equivalent | About $10 | Domain allowance plus $99/year Apple membership |
| Contingency | $15–35 | Unplanned usage/support costs |
| Total | About $55–140 | Planning range, not guaranteed capacity or an all-in business budget |

Supabase lists Pro from $25/month. Apple membership is $99/year and Google Play registration $25 once, subject to regional pricing/payment details. [Supabase pricing](https://supabase.com/pricing), [Apple enrollment](https://developer.apple.com/programs/enroll/), [Play registration](https://support.google.com/googleplay/android-developer/answer/6112435?hl=en).

Exclude from that range: company formation/renewals, legal/accounting, taxes, devices, paid moderation, insurance, acquisition and your time. Obtain local quotes before setting an all-in launch budget. If available cash cannot cover mandatory legal/safety obligations, continue opt-in demand validation before opening member interactions.

Avoid paid ads initially. After useful-conversation results are repeatable, a separately capped $50–100 channel test can measure acquisition. Stop if it generates the wrong geography/pool, uncompleted profiles or a support burden. Do not scale from cheap clicks alone.

## Store submission and staged schedule

Apple explicitly treats dating as an established category and expects meaningful differentiation. Explain the actual reciprocal daily set, private interest and question journey in reviewer notes; this supports the case but cannot guarantee acceptance. Give reviewers access without requiring them to wait for dawn or encounter real private members, using clearly isolated review fixtures. [Apple review rules](https://developer.apple.com/app-store/review/guidelines/).

Prepare accurate screenshots, description, age/content rating, privacy labels/Data safety disclosures, support/terms/privacy/deletion URLs, permission explanations and functioning reviewer access. Check actual developer-account requirements early. New personal Google Play accounts subject to its testing rule need at least 12 continuously opted-in testers for 14 days before applying for production access; elapsed testing alone does not guarantee approval. [Google testing requirements](https://support.google.com/googleplay/android-developer/answer/14151465?hl=en-en).

| Phase | Focus | Exit condition |
| --- | --- | --- |
| Week 1 | Market/operator decision, current project access, fixed-scope legal brief, native build, early interviews | Unknowns assigned; core native defects identified |
| Week 2 | Privacy corrections, safety workflow, monitoring, email, recovery, isolated DB/native regression | Seven beta gates satisfied; otherwise remain here |
| Weeks 3–4 | Small controlled cohort; daily support; interviews and funnel measurement; applicable store testing | Reliable experience and evidence of useful conversations |
| Weeks 5–6 | Submit/complete store review; invite next compatible cohort; validate pricing | Expansion gates met; payment proof if charging |
| Following month | One measured acquisition channel and one bottleneck experiment at a time | Sustainable contribution and manageable operations |

Plan approximately 30–60 minutes of daily operational review in the small beta, plus scheduled interviews/content and engineering work. This is a capacity target, not a promise; serious incidents can consume much more. When support consistently exceeds the time budget, cap intake or buy limited trained coverage before adding more users.

## Immediate next actions

1. Decide business country, first city/audience, cash limit and available weekly hours.
2. Restore read-only access to the current backend and obtain the candidate CI/build evidence.
3. Run the two-account native journey; fix failures before adding features.
4. Correct the AI-retention/operator/deletion/waitlist disclosures and commission targeted local review.
5. Demonstrate report-to-action, deletion completion, alert delivery and recovery.
6. Connect privacy-minimal funnel and reliability measurements.
7. Recruit the first compatible cohort through interviews and a few trusted channels.

The main investment now is operational proof and access to the right members. The existing architecture does not need a rewrite to begin this work.

## Verification performed in this assessment

- TypeScript check completed as part of `npm run verify:client`.
- Independent SQL syntax gate passed: 179 migrations, 46 database test files, 71 SQL-language bodies, zero reported problems. This is parsing, not execution of database contracts.
- `npm run verify:client` did not pass: TypeScript completed, then lint reported 168 errors and 48 warnings across `site/hearts.js`, `site/logo-effect.js` and `site/stage.js`. Most reported errors are `no-var`; this is a release-gate failure, not evidence of 168 runtime defects. Review authored versus generated files and apply appropriate lint scope/rules without blindly excluding maintained website code. Existing website edits were not changed by this assessment.
- Independent `npm test` passed all 265 tests, zero failures/skips. This independent run was necessary because the combined gate stopped at lint.
- Logs are retained locally as `assessment-verification.log` and `assessment-unit-tests.log` (ignored by Git). No clean install, Android export or isolated database execution was performed in this assessment.
- Native builds/devices, live current-project configuration, store console, mailbox, company records, actual costs and customer traction were not certified.
