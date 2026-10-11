import type { Adventure, Condition } from '../../types.ts';
import { slot } from '../images.ts';

/**
 * The Brother — a sibling in debt, a large loan, and whose money it is.
 * Hidden states: partnership, family, trust.
 */
export const theBrother: Adventure = {
  id: 'adv-the-brother',
  kind: 'adventure',
  title: 'The Brother',
  tagline: 'Her brother is drowning in debt. She wants to help. He has doubts.',
  description:
    'Naila’s younger brother Faisal is in serious debt and asks to borrow £8,000 — most of their savings. Naila wants to help; Hamid is not sure it will. Play both of them through the request, the loan (or not), the second request, and a family that thinks Hamid is heartless.',
  minutes: 13,
  themes: ['Family pressure', 'Money', 'Boundaries'],
  cover: slot('concept-brother-cover', 'cover', 'A young man sitting with his head down on his sister’s sofa, the sister holding an envelope, her husband standing in the kitchen doorway.', 'A brother asking his sister for help as her husband watches.'),
  roles: {
    A: { name: 'Hamid', gender: 'male', sketch: 'Careful with money; likes Faisal but has seen this before.' },
    B: { name: 'Naila', gender: 'female', sketch: 'Fiercely loyal to her family; the money is partly hers.' },
  },
  variables: {
    partnership: { label: 'Partnership', initial: 0, readings: ['They are on opposite sides.', 'They are working it out.', 'They are deciding as one.'] },
    family: { label: 'Family ties', initial: 0, readings: ['The family is fractured.', 'The family is strained but intact.', 'The family is closer.'] },
    trust: { label: 'Trust about money', initial: 0, readings: ['Money has become secret.', 'Money is discussed.', 'Money is fully shared and trusted.'] },
  },
  start: 'request',
  scenes: {
    request: {
      id: 'request',
      title: 'The request',
      image: slot('adv-brother-request', 'scene', 'A young man on a sofa with his head in his hands, his sister kneeling beside him with a hand on his shoulder, her husband standing in a kitchen doorway holding a tea towel.', 'Faisal asking Naila for help.'),
      passages: [{ text: 'Faisal sits on their sofa and finally says it: he owes £8,000, the calls won’t stop, and he’s ashamed to ask.' }],
      decision: {
        mode: 'role',
        actor: 'B',
        prompt: 'You are Naila. What do you say to your brother?',
        choices: [
          { id: 'discuss', label: '“Let me talk to Hamid tonight. We’ll decide together.”', effects: { vars: { partnership: 2 } }, next: 'hamid_view', beat: 'Naila told her brother she would decide with Hamid.' },
          { id: 'promise', label: '“Of course. We’ll sort it.”', effects: { vars: { partnership: -1, family: 1 }, flags: ['promised'] }, next: 'hamid_view', beat: 'Naila promised her brother the money on the spot.', lesson: { id: 'tb-l-promise', tag: 'Notice this', text: 'Promising shared money before asking your spouse makes them the villain if they hesitate.' } },
          { id: 'questions', label: 'Ask what the debt is for, and whether he has a plan.', effects: { vars: { trust: 1 } }, next: 'hamid_view', beat: 'Naila asked her brother what the debt was for and whether he had a plan.' },
        ],
      },
    },
    hamid_view: {
      id: 'hamid_view',
      title: 'Hamid’s doubts',
      image: slot('adv-brother-doubts', 'scene', 'A couple sitting at a kitchen table at night, the husband speaking carefully with open palms, the wife with arms crossed, worried and defensive.', 'Hamid sharing his doubts with Naila.'),
      passages: [
        { text: 'That night, alone, Hamid shares his worry: Faisal borrowed from cousins last year and never paid it back.' },
        { text: 'Naila has already told Faisal yes.', when: { flag: 'promised' } },
      ],
      decision: {
        mode: 'role',
        actor: 'A',
        prompt: 'You are Hamid. How do you say it?',
        choices: [
          { id: 'gentle', label: '“I want to help him too. I just want to make sure it actually helps.”', effects: { vars: { partnership: 1 } }, next: 'decide', beat: 'Hamid said he wanted to help in a way that actually helped.' },
          { id: 'flat', label: '“Absolutely not. He’ll waste it.”', effects: { vars: { partnership: -2, family: -1 } }, next: 'decide', beat: 'Hamid flatly refused.' },
          { id: 'quiet', label: 'Say nothing and let Naila decide — it’s her brother.', effects: { vars: { trust: -1 }, flags: ['abdicated'] }, next: 'decide', beat: 'Hamid stayed quiet and left it to Naila.' },
        ],
      },
    },
    decide: {
      id: 'decide',
      title: 'Deciding',
      turningPoint: true,
      image: slot('adv-brother-decide', 'turning_point', 'A couple sitting on a bed with a laptop showing a savings account, a notebook with two options written, both thinking hard.', 'Naila and Hamid deciding over their savings.'),
      passages: [{ text: '£8,000 is most of their house deposit.' }],
      lessons: [{ id: 'tb-l-joint', tag: 'Joint decision', text: 'Choose together; a mismatch means talk, then choose again.' }],
      decision: {
        mode: 'joint',
        prompt: 'Together: what do you offer Faisal?',
        choices: [
          { id: 'conditions', label: 'A loan with conditions: a debt advisor, a written repayment plan.', effects: { vars: { partnership: 2, trust: 1 }, flags: ['conditions'] }, next: 'family_reacts', beat: 'They offered a loan with conditions and a debt advisor.' },
          { id: 'gift', label: 'A smaller gift they can afford to lose, plus help finding advice.', effects: { vars: { partnership: 1, family: 1 }, flags: ['gift'] }, next: 'family_reacts', beat: 'They gave a smaller gift and help finding advice.' },
          { id: 'full', label: 'The full £8,000, no conditions.', effects: { vars: { family: 2 }, flags: ['full'] }, next: 'family_reacts', beat: 'They gave the full amount with no conditions.' },
          { id: 'no', label: 'No money — but they’ll help him find free debt advice.', effects: { vars: { family: -1 }, flags: ['said_no'] }, next: 'family_reacts', beat: 'They declined to lend but offered to help with advice.' },
        ],
      },
    },
    family_reacts: {
      id: 'family_reacts',
      title: 'The family hears',
      image: slot('adv-brother-family', 'scene', 'An older mother on a video call on a phone held by her daughter, the mother looking upset and pleading, the daughter torn.', 'Naila’s mother pleading on a video call.'),
      passages: [
        { text: 'Naila’s mother calls.' },
        { text: '“Your husband is heartless. Family helps family.”', when: { any: [{ flag: 'said_no' }, { flag: 'conditions' }] } },
        { text: '“Thank you, my daughter. You saved him.”', when: { any: [{ flag: 'full' }, { flag: 'gift' }] } },
      ],
      decision: {
        mode: 'role',
        actor: 'B',
        prompt: 'You are Naila. What do you say to your mother?',
        choices: [
          { id: 'united', label: '“Hamid and I decided this together, Mum.”', effects: { vars: { partnership: 2 } }, next: 'second_ask', beat: 'Naila told her mother it was a joint decision.' },
          { id: 'blame', label: '“It was Hamid’s idea, not mine.”', effects: { vars: { partnership: -2 }, flags: ['blamed_hamid'] }, next: 'second_ask', beat: 'Naila told her mother it was Hamid’s idea.', lesson: { id: 'tb-l-blame', tag: 'Notice this', text: 'Making your spouse the scapegoat with your family protects you today and costs you both for years.' } },
        ],
      },
    },
    second_ask: {
      id: 'second_ask',
      title: 'Six months later',
      turningPoint: true,
      image: slot('adv-brother-again', 'turning_point', 'A woman reading a message on her phone in a supermarket aisle, a worried expression, her trolley half full.', 'Naila reading another message from her brother.'),
      passages: [
        { text: 'Six months later, a message from Faisal: “Sis, I hate to ask again…”' },
        { text: 'He is paying back the loan, slowly, through the advisor.', when: { flag: 'conditions' } },
        { text: 'The £8,000 is gone. The debt is not.', when: { flag: 'full' } },
      ],
      decision: {
        mode: 'private',
        prompt: 'What do you want to do?',
        choices: [],
        byRole: {
          A: [
            { id: 'together', label: 'Talk with Naila before anyone replies.', effects: { vars: { partnership: 1 } }, next: 'reply', beat: 'Hamid wanted to talk with Naila before replying.' },
            { id: 'line', label: 'Draw a line: no more money.', effects: { vars: { family: -1 } }, next: 'reply', beat: 'Hamid wanted to draw a firm line.' },
          ],
          B: [
            { id: 'secret', label: 'Send him a little from her own account, quietly.', effects: { vars: { trust: -2 }, flags: ['secret_money'] }, next: 'reply', beat: 'Naila sent her brother money secretly.' },
            { id: 'together', label: 'Show Hamid the message.', effects: { vars: { trust: 1, partnership: 1 } }, next: 'reply', beat: 'Naila showed Hamid the message.' },
          ],
        },
        combos: [
          { pair: ['together', 'together'], next: 'reply', beat: 'Both reached for the other before replying to Faisal.', effects: { vars: { partnership: 2 } } },
          { pair: ['line', 'secret'], next: 'reply', beat: 'He drew a line; she quietly stepped over it.', effects: { vars: { trust: -1 } } },
        ],
        diverge: 'reply',
      },
    },
    reply: {
      id: 'reply',
      title: 'The reply',
      image: slot('adv-brother-reply', 'scene', 'A couple sitting side by side on a sofa typing a message together on one phone, calm and united.', 'Naila and Hamid replying to Faisal together.'),
      passages: [
        { text: 'Time to answer Faisal.' },
        { text: 'Hamid saw the transfer on the statement.', when: { flag: 'secret_money' } },
      ],
      decision: {
        mode: 'role',
        actor: 'A',
        prompt: 'You are Hamid. What do you do?',
        choices: [
          { id: 'offer_time', label: 'Offer Faisal their time instead: sit with him and go through his budget.', effects: { vars: { family: 2, partnership: 1 } }, next: { routes: endingRoutes() }, beat: 'Hamid offered to sit with Faisal and go through his budget.' },
          { id: 'refuse', label: 'A kind but firm no.', effects: { vars: { family: -1 } }, next: { routes: endingRoutes() }, beat: 'Hamid sent a kind but firm no.' },
        ],
      },
    },
  },
  endings: {
    real_help: {
      id: 'real_help', title: 'Real help', mood: 'renewed',
      image: slot('adv-brother-end-help', 'outcome', 'A young man and his brother-in-law sitting at a table with a laptop and paperwork, the younger man smiling with relief, the sister bringing tea.', 'Faisal and Hamid going through his budget together.'),
      whatHappened: 'Faisal is debt-free in eighteen months. He says the budget nights with Hamid saved him more than the money.',
      pattern: { name: 'Help that helps', explanation: 'Conditions and time gave Faisal a way out, not just a bailout.' },
      couldHaveChanged: 'Little.',
      takeaway: 'Sometimes the most loving help comes with conditions.',
      epilogues: [{ text: 'Naila’s mother apologises to Hamid at Eid.', when: { var: 'family', gte: 3 } }],
      guide: [{ id: 'tb-e-help', text: 'We help family together, in ways that actually help.' }],
    },
    united: {
      id: 'united', title: 'United front', mood: 'tender',
      image: slot('adv-brother-end-united', 'outcome', 'A husband and wife standing together at a family gathering, her arm through his, facing relatives calmly.', 'Naila and Hamid standing together at a family gathering.'),
      whatHappened: 'The family was angry for a while. Naila never once let them blame Hamid.',
      pattern: { name: 'Partnership first', explanation: 'Standing together turned a family conflict into a test they passed.' },
      couldHaveChanged: 'A softer answer to the family might have kept more warmth.',
      takeaway: 'Disagree in private; stand together in public.',
      guide: [{ id: 'tb-e-united', text: 'We never let family blame one of us for a decision we made together.' }],
    },
    bottomless: {
      id: 'bottomless', title: 'A bottomless well', mood: 'strained',
      image: slot('adv-brother-end-well', 'outcome', 'A couple at a kitchen table looking at an empty savings jar, bills spread out, tired and quiet.', 'Naila and Hamid looking at an empty savings jar.'),
      whatHappened: 'The deposit is gone. Faisal still owes money. The requests keep coming.',
      pattern: { name: 'Rescue without change', explanation: 'Money without conditions solved the symptom and fed the cause.' },
      couldHaveChanged: 'A debt advisor and a written plan before any money moved.',
      takeaway: 'Rescuing someone who is drowning often means teaching them to swim.',
      guide: [{ id: 'tb-e-rescue', text: 'Large loans to family come with a plan and our joint agreement.' }],
    },
    secret: {
      id: 'secret', title: 'The secret transfer', mood: 'fragile',
      image: slot('adv-brother-end-secret', 'outcome', 'A man holding a bank statement with one line highlighted, looking at his wife across a room, hurt.', 'Hamid holding a bank statement, hurt.'),
      whatHappened: 'The amount was small. The secret was not. It takes Hamid a long time to stop checking statements.',
      pattern: { name: 'Financial secrecy', explanation: 'Hidden money broke more trust than any loan could cost.' },
      couldHaveChanged: 'Showing Hamid the message.',
      takeaway: 'Hidden money is a hidden wound.',
      guide: [{ id: 'tb-e-secret', text: 'No secret money between us — ever.' }],
    },
    scapegoat: {
      id: 'scapegoat', title: 'The villain', mood: 'strained',
      image: slot('adv-brother-end-scapegoat', 'outcome', 'A man sitting alone at the edge of a family gathering while relatives talk among themselves, glancing at him coldly.', 'Hamid sitting alone at a family gathering.'),
      whatHappened: 'Her family treats Hamid like an outsider. He no longer goes to family dinners.',
      pattern: { name: 'Scapegoating a spouse', explanation: 'Blaming him protected her standing and isolated him.' },
      couldHaveChanged: '“We decided this together, Mum.”',
      takeaway: 'Your family will follow your lead on how to treat your spouse.',
      guide: [{ id: 'tb-e-lead', text: 'We show our families how to treat each other.' }],
    },
    generous: {
      id: 'generous', title: 'Generosity, with limits', mood: 'steady',
      image: slot('adv-brother-end-generous', 'outcome', 'A sister handing her brother an envelope at a doorway, both smiling, her husband beside her with a hand on her back.', 'Naila giving Faisal an envelope at the door.'),
      whatHappened: 'The gift helped a little. The advice helped more. The deposit is intact.',
      pattern: { name: 'Giving what you can afford to lose', explanation: 'A gift with no strings, sized to what they could lose, kept everyone safe.' },
      couldHaveChanged: 'Nothing much.',
      takeaway: 'Give to family what you can afford to lose, not what you cannot.',
      guide: [{ id: 'tb-e-gift', text: 'We give to family what we can afford to lose.' }],
    },
    cold_family: {
      id: 'cold_family', title: 'A colder family', mood: 'bittersweet',
      image: slot('adv-brother-end-cold', 'outcome', 'A woman looking at a family group chat on her phone with no new messages, sitting alone on a bench in a park in autumn.', 'Naila looking at a quiet family chat.'),
      whatHappened: 'They protected their future, and their family went quiet for a year.',
      pattern: { name: 'Boundaries with a cost', explanation: 'The right boundary, delivered without warmth, cost them closeness.' },
      couldHaveChanged: 'Offering time and advice alongside the no.',
      takeaway: 'A no lands better with a yes to something else.',
      guide: [{ id: 'tb-e-yes', text: 'When we say no to family, we offer something else too.' }],
    },
    working_out: {
      id: 'working_out', title: 'Still working it out', mood: 'steady',
      image: slot('adv-brother-end-working', 'outcome', 'A couple walking home from a family dinner at night, talking seriously but gently, streetlights.', 'Naila and Hamid walking home from a family dinner.'),
      whatHappened: 'Faisal is still struggling. They are still working out how much is theirs to fix.',
      pattern: { name: 'An unfinished boundary', explanation: 'They have not yet agreed what “helping family” means for them.' },
      couldHaveChanged: 'Agreeing their limits before the first request.',
      takeaway: 'Agree your family-money limits before someone asks.',
      epilogues: [{ text: 'Money conversations still feel tense between them.', when: { var: 'trust', lte: 0 } }],
      guide: [{ id: 'tb-e-limits', text: 'We agree our limits for family money in advance.' }],
    },
  },
};

function endingRoutes(): { when?: Condition; to: string }[] {
  return [
    { when: { flag: 'secret_money' }, to: 'end:secret' },
    { when: { flag: 'blamed_hamid' }, to: 'end:scapegoat' },
    { when: { flag: 'full' }, to: 'end:bottomless' },
    { when: { all: [{ flag: 'conditions' }, { var: 'family', gte: 1 }] }, to: 'end:real_help' },
    { when: { flag: 'gift' }, to: 'end:generous' },
    { when: { var: 'partnership', gte: 4 }, to: 'end:united' },
    { when: { var: 'family', lte: -2 }, to: 'end:cold_family' },
    { to: 'end:working_out' },
  ];
}
