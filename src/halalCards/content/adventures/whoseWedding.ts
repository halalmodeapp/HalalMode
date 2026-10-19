import type { Adventure, Condition } from '../../types.ts';
import { slot } from '../images.ts';

/**
 * Whose Wedding Is It?, a couple who want a small nikah, two mothers who
 * want five hundred guests. Hidden states: partnership, family, debt.
 */
export const whoseWedding: Adventure = {
  id: 'adv-whose-wedding',
  kind: 'adventure',
  title: 'Whose Wedding Is It?',
  tagline: 'They want a small nikah. Both mothers want five hundred guests.',
  description:
    'Adam and Mariam want a small, simple nikah and to put their savings toward a home. Both mothers are planning a wedding for five hundred. Play both of them through a deposit paid without asking, a disagreement between the two of you, and an elder who offers to help, and find out whose day it turns into.',
  minutes: 13,
  themes: ['Wedding', 'Family pressure', 'Money', 'Engagement'],
  cover: slot('concept-wedding-cover', 'cover', 'A young couple sitting on the floor surrounded by wedding planning lists and fabric samples, both mothers looming in the background on phones.', 'An engaged couple buried in wedding plans as both mothers talk on phones.'),
  roles: {
    A: { name: 'Adam', gender: 'male', sketch: 'Easygoing; hates conflict with his mother.' },
    B: { name: 'Mariam', gender: 'female', sketch: 'Organised; dreams of a small nikah and a home of their own.' },
  },
  variables: {
    partnership: { label: 'Partnership', initial: 0, readings: ['They are pulled apart by their families.', 'They are mostly united.', 'They are planning as one.'] },
    family: { label: 'Family goodwill', initial: 0, readings: ['The families are bruised.', 'The families are cordial.', 'The families are delighted.'] },
    debt: { label: 'Wedding debt', initial: 0, concerning: true, readings: ['The wedding is affordable.', 'The wedding is stretching them.', 'The wedding has put them in debt.'] },
  },
  start: 'deposit',
  scenes: {
    deposit: {
      id: 'deposit',
      title: 'The deposit',
      image: slot('adv-wedding-deposit', 'scene', 'A young woman looking at her phone in shock showing a booking confirmation for a large wedding hall, her fiancé leaning over her shoulder looking guilty.', 'Mariam seeing a hall booking confirmation.'),
      passages: [{ text: 'Adam’s mother has paid a deposit on a 500-seat hall. Mariam finds out from the hall’s confirmation email, which lists Adam as the contact.' }],
      decision: {
        mode: 'role',
        actor: 'A',
        prompt: 'You are Adam. Mariam is looking at you. What do you say?',
        choices: [
          { id: 'own', label: '“I knew she was looking, and I didn’t stop her. I’m sorry. Let’s decide together.”', effects: { vars: { partnership: 2 } }, next: 'mothers', beat: 'Adam admitted he knew and asked to decide together.' },
          { id: 'excuse', label: '“She did it herself, you know what she’s like.”', effects: { vars: { partnership: -1 } }, next: 'mothers', beat: 'Adam blamed his mother entirely.' },
          { id: 'defend', label: '“She just wants it to be special for us.”', effects: { vars: { partnership: -1, family: 1 } }, next: 'mothers', beat: 'Adam defended his mother’s booking.' },
        ],
      },
    },
    mothers: {
      id: 'mothers',
      title: 'Two mothers, one guest list',
      image: slot('adv-wedding-mothers', 'scene', 'Two mothers on a split video call on a laptop, each holding up a long handwritten guest list, the couple watching from the sofa looking overwhelmed.', 'Both mothers holding up long guest lists on a call.'),
      passages: [{ text: 'Mariam’s mother, not to be outdone, has started a guest list of her own. It’s at 280 and climbing.' }],
      decision: {
        mode: 'role',
        actor: 'B',
        prompt: 'You are Mariam. What do you do?',
        choices: [
          { id: 'talk_adam', label: 'Ask Adam to sit down and agree, just the two of you, what you actually want.', effects: { vars: { partnership: 1 } }, next: 'us', beat: 'Mariam asked Adam to agree what they wanted, just the two of them.' },
          { id: 'mother', label: 'Ask her own mother to back off.', effects: { vars: { family: -1 } }, next: 'us', beat: 'Mariam asked her own mother to back off.' },
          { id: 'give_up', label: 'Let them get on with it. It’s easier.', effects: { vars: { debt: 1 }, flags: ['gave_up'] }, next: 'us', beat: 'Mariam let the mothers take over.' },
        ],
      },
    },
    us: {
      id: 'us',
      title: 'What do we want?',
      turningPoint: true,
      image: slot('adv-wedding-us', 'turning_point', 'An engaged couple sitting on the floor of a living room among scattered wedding lists, each writing on their own small card privately, back to back.', 'Adam and Mariam writing privately, back to back.'),
      passages: [{ text: 'Back to back, each writes down what they actually want the wedding to be.' }],
      decision: {
        mode: 'private',
        prompt: 'What do you really want?',
        choices: [],
        byRole: {
          A: [
            { id: 'small', label: 'Small, simple, and money toward a home.', effects: { vars: { partnership: 1 } }, next: 'elder', beat: 'Adam wrote: small, simple, money toward a home.' },
            { id: 'please_mum', label: 'Whatever keeps Mum happy.', effects: { vars: { family: 1, debt: 1 } }, next: 'elder', beat: 'Adam wrote: whatever keeps his mother happy.' },
            { id: 'middle', label: 'A small nikah, then a bigger celebration later.', effects: { flags: ['two_events'] }, next: 'elder', beat: 'Adam wrote: a small nikah, a bigger celebration later.' },
          ],
          B: [
            { id: 'small', label: 'Small, simple, and money toward a home.', effects: { vars: { partnership: 1 } }, next: 'elder', beat: 'Mariam wrote: small, simple, money toward a home.' },
            { id: 'meaningful', label: 'Meaningful, the guest count matters less than who’s there.', effects: { vars: { partnership: 1 } }, next: 'elder', beat: 'Mariam wrote: meaningful, whoever’s there.' },
            { id: 'give_in', label: 'I don’t mind any more.', effects: { vars: { debt: 1 } }, next: 'elder', beat: 'Mariam wrote: I don’t mind any more.' },
          ],
        },
        combos: [
          { pair: ['small', 'small'], next: 'elder', beat: 'They turned their cards over. They had written the same words.', effects: { vars: { partnership: 2 }, flags: ['same_dream'] } },
          { pair: ['please_mum', 'small'], next: 'elder', beat: 'Mariam wrote “small”; Adam wrote “whatever keeps Mum happy”. A long silence.', effects: { vars: { partnership: -2 } } },
          { pair: ['please_mum', 'give_in'], next: 'elder', beat: 'Neither of them wrote down what they wanted.', effects: { vars: { debt: 1 } } },
        ],
        diverge: 'elder',
      },
    },
    elder: {
      id: 'elder',
      title: 'An elder offers',
      image: slot('adv-wedding-elder', 'scene', 'An elderly man with a white beard sitting in a masjid office with a young engaged couple, listening kindly, cups of tea on a low table.', 'An elder listening to Adam and Mariam.'),
      passages: [{ text: 'Mariam’s grandfather, respected by both families, offers to help. “Tell me what you two want, and I will speak to your mothers.”' }],
      decision: {
        mode: 'joint',
        prompt: 'Together: what do you ask him to say?',
        choices: [
          { id: 'small_nikah', label: 'A small nikah at the masjid, a modest walimah, savings to a home.', effects: { vars: { partnership: 1, debt: -1 }, flags: ['small_plan'] }, next: 'mothers_hear', beat: 'They asked for a small nikah and modest walimah.' },
          { id: 'two', label: 'A small nikah now; a bigger family celebration in a year.', effects: { vars: { family: 1 }, flags: ['two_plan'] }, next: 'mothers_hear', beat: 'They asked for a small nikah now and a celebration later.' },
          { id: 'big', label: 'Let the mothers have the big wedding, but split the cost three ways.', effects: { vars: { family: 2, debt: 1 }, flags: ['big_plan'] }, next: 'mothers_hear', beat: 'They agreed to the big wedding with costs shared.' },
        ],
      },
    },
    mothers_hear: {
      id: 'mothers_hear',
      title: 'The mothers hear',
      turningPoint: true,
      image: slot('adv-wedding-hear', 'turning_point', 'Two mothers sitting side by side on a sofa listening to an elderly man speak, one with hands folded, one dabbing her eyes, the couple standing nearby.', 'Both mothers listening to the grandfather.'),
      passages: [
        { text: 'The grandfather speaks to both mothers. Adam’s mother is quiet. Then she turns to Adam: “Is this what you want?”' },
      ],
      decision: {
        mode: 'role',
        actor: 'A',
        prompt: 'You are Adam. What do you say to your mother?',
        choices: [
          { id: 'yes', label: '“Yes, Mum. It’s what we both want. Will you help us make it beautiful?”', effects: { vars: { partnership: 2, family: 1 } }, next: 'costs', beat: 'Adam told his mother it was what they both wanted and asked for her help.' },
          { id: 'waver', label: '“Well… whatever you think is best.”', effects: { vars: { partnership: -2 }, flags: ['wavered'] }, next: 'costs', beat: 'Adam wavered in front of his mother.', lesson: { id: 'ww-l-waver', tag: 'Notice this', text: 'Agreeing as a couple and then wavering in front of a parent undoes the agreement.' } },
        ],
      },
    },
    costs: {
      id: 'costs',
      title: 'The costs',
      image: slot('adv-wedding-costs', 'scene', 'An engaged couple at a café table with a notebook of costs and a calculator, the woman pointing at a total, the man rubbing his forehead.', 'Adam and Mariam going over wedding costs.'),
      passages: [
        { text: 'The quotes come in.' },
        { text: 'The 500-seat hall alone would take most of their home savings.', when: { any: [{ flag: 'big_plan' }, { flag: 'wavered' }] } },
      ],
      decision: {
        mode: 'role',
        actor: 'B',
        prompt: 'You are Mariam. What do you do?',
        choices: [
          { id: 'cap', label: 'Set a firm budget and tell both families: this is the limit.', effects: { vars: { debt: -1, family: -1 } }, next: { routes: endingRoutes() }, beat: 'Mariam set a firm budget and told both families.' },
          { id: 'loan', label: 'Take a loan to cover the gap. It’s once in a lifetime.', effects: { vars: { debt: 2 }, flags: ['loan'] }, next: { routes: endingRoutes() }, beat: 'They took a loan to cover the wedding.' },
          { id: 'trim', label: 'Trim what they can and accept the rest.', next: { routes: endingRoutes() }, beat: 'They trimmed what they could and accepted the rest.' },
        ],
      },
    },
  },
  endings: {
    their_day: {
      id: 'their_day', title: 'Their day', mood: 'renewed',
      image: slot('adv-wedding-end-theirs', 'outcome', 'A small nikah in a bright masjid hall, a bride and groom sitting with an imam, around thirty family members smiling, simple flowers.', 'A small nikah with close family.'),
      whatHappened: 'Thirty people, a masjid, a garden walimah, and a deposit on a flat the week after.',
      pattern: { name: 'United as a couple', explanation: 'They agreed first, then spoke to their families with one voice.' },
      couldHaveChanged: 'Agreeing before the hall was ever booked.',
      takeaway: 'Decide together first; then tell your families together.',
      epilogues: [{ text: 'Adam’s mother says it was the most beautiful wedding she has been to.', when: { var: 'family', gte: 2 } }],
      guide: [{ id: 'ww-e-first', text: 'We agree between ourselves before we answer our families.' }],
    },
    two_days: {
      id: 'two_days', title: 'Two celebrations', mood: 'tender',
      image: slot('adv-wedding-end-two', 'outcome', 'A couple a year after their wedding at a lively family party in a garden, fairy lights, both families mixing, the couple laughing.', 'A family celebration a year after the nikah.'),
      whatHappened: 'A quiet nikah now; a joyful family party a year later, paid for without debt.',
      pattern: { name: 'Creative compromise', explanation: 'Splitting the day gave everyone what mattered most to them.' },
      couldHaveChanged: 'Little.',
      takeaway: 'When you can’t agree on one thing, consider two.',
      guide: [{ id: 'ww-e-two', text: 'When we are stuck, we look for a way both sides get what matters most.' }],
    },
    big_day: {
      id: 'big_day', title: 'Five hundred guests', mood: 'steady',
      image: slot('adv-wedding-end-big', 'outcome', 'A huge wedding hall full of guests at round tables, a bride and groom on a small stage looking tired but smiling, bright lights.', 'A huge wedding hall full of guests.'),
      whatHappened: 'It is the wedding their mothers dreamed of. It is lovely. They are exhausted.',
      pattern: { name: 'Honouring family', explanation: 'They chose family joy over their own preference, and shared the cost fairly.' },
      couldHaveChanged: 'Nothing wrong with it, as long as it was a real choice.',
      takeaway: 'Giving your families their day is a gift, if you choose it together.',
      epilogues: [{ text: 'The shared costs mean nobody starts married in debt.', when: { var: 'debt', lte: 1 } }],
      guide: [{ id: 'ww-e-choose', text: 'If we give family what they want, it is a choice we make together.' }],
    },
    debt: {
      id: 'debt', title: 'The wedding loan', mood: 'strained',
      image: slot('adv-wedding-end-debt', 'outcome', 'A young married couple at a kitchen table months later looking at a loan statement, wedding photo on the fridge behind them.', 'Adam and Mariam looking at a loan statement.'),
      whatHappened: 'The wedding was beautiful. The loan will take four years to pay off. The flat will wait.',
      pattern: { name: 'Starting in debt', explanation: 'One day was paid for with years of their shared future.' },
      couldHaveChanged: 'A firm budget, set together, before the quotes came in.',
      takeaway: 'Don’t borrow your future to impress a crowd.',
      guide: [{ id: 'ww-e-debt', text: 'We do not take on debt for celebrations.' }],
    },
    wavered: {
      id: 'wavered', title: '“Whatever you think”', mood: 'fragile',
      image: slot('adv-wedding-end-wavered', 'outcome', 'A bride at a large wedding standing slightly apart looking at her new husband speaking with his mother, a hint of hurt in her face.', 'Mariam watching Adam with his mother at the wedding.'),
      whatHappened: 'The wedding happened his mother’s way. Mariam remembers the moment Adam said “whatever you think”.',
      pattern: { name: 'Wavering under pressure', explanation: 'A couple’s agreement collapsed the moment it was tested by a parent.' },
      couldHaveChanged: '“Yes, Mum. It’s what we both want.”',
      takeaway: 'Your spouse is watching whose side you stand on, even at the wedding.',
      guide: [{ id: 'ww-e-stand', text: 'Once we agree, we stand by it in front of family.' }],
    },
    handed_over: {
      id: 'handed_over', title: 'Handed over', mood: 'bittersweet',
      image: slot('adv-wedding-end-handed', 'outcome', 'Two mothers directing caterers and decorators in a hall while a young couple sit quietly at the side holding hands.', 'The mothers running the hall while the couple sit aside.'),
      whatHappened: 'They let the mothers plan everything. It was a lovely party. It didn’t feel like theirs.',
      pattern: { name: 'Giving up your voice', explanation: 'Avoiding conflict meant their own wishes were never spoken.' },
      couldHaveChanged: 'Writing down, and saying, what they each wanted.',
      takeaway: 'Avoiding a conversation is also a decision.',
      guide: [{ id: 'ww-e-voice', text: 'We say what we want, even when it is easier not to.' }],
    },
    tense_families: {
      id: 'tense_families', title: 'A tense start', mood: 'strained',
      image: slot('adv-wedding-end-tense', 'outcome', 'Two families seated on opposite sides of a small wedding room, stiff and formal, the couple in the middle looking uneasy.', 'Two families sitting stiffly apart at the wedding.'),
      whatHappened: 'The small wedding went ahead. Both mothers felt shut out, and said so for a year.',
      pattern: { name: 'Boundaries without warmth', explanation: 'The right decision was delivered in a way that left the mothers feeling dismissed.' },
      couldHaveChanged: 'Inviting the mothers to help make the small day beautiful.',
      takeaway: 'Include family in how, even when you decide what.',
      guide: [{ id: 'ww-e-include', text: 'We include family in how we celebrate, even when we decide what.' }],
    },
    good_enough: {
      id: 'good_enough', title: 'Good enough', mood: 'steady',
      image: slot('adv-wedding-end-enough', 'outcome', 'A medium-sized wedding in a community hall, simple decorations, guests chatting, the couple sharing a relieved smile.', 'A medium-sized wedding in a community hall.'),
      whatHappened: 'A medium wedding, a medium budget, medium frustration. Married, and that is what matters.',
      pattern: { name: 'Muddling through', explanation: 'Nobody got exactly what they wanted, and the marriage started intact.' },
      couldHaveChanged: 'A clearer plan earlier would have spared the stress.',
      takeaway: 'The wedding lasts a day; how you made it together lasts longer.',
      guide: [{ id: 'ww-e-day', text: 'We remember that the marriage matters more than the wedding.' }],
    },
  },
};

function endingRoutes(): { when?: Condition; to: string }[] {
  return [
    { when: { flag: 'loan' }, to: 'end:debt' },
    { when: { flag: 'wavered' }, to: 'end:wavered' },
    { when: { all: [{ flag: 'gave_up' }, { var: 'partnership', lte: 1 }] }, to: 'end:handed_over' },
    { when: { flag: 'two_plan' }, to: 'end:two_days' },
    { when: { flag: 'big_plan' }, to: 'end:big_day' },
    { when: { all: [{ flag: 'small_plan' }, { var: 'family', gte: 1 }] }, to: 'end:their_day' },
    { when: { var: 'family', lte: -1 }, to: 'end:tense_families' },
    { to: 'end:good_enough' },
  ];
}
