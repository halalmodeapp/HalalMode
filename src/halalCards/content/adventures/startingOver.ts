import type { Adventure, Condition } from '../../types.ts';
import { slot } from '../images.ts';

/**
 * Starting Over at Thirty-Four, one spouse's calling, the other's income,
 * and what "supporting each other" costs in practice. Hidden states:
 * partnership, strain (money pressure), fulfilment.
 */
export const startingOver: Adventure = {
  id: 'adv-starting-over',
  kind: 'adventure',
  title: 'Starting Over at Thirty-Four',
  tagline: 'He wants to study the deen full-time. She would carry the bills for four years.',
  description:
    'Musa wants to leave a secure job to study Islamic sciences full-time. It would mean Khadija carrying the household income for four years. Play both of them through a resignation letter, her parents’ reaction and a surprise that changes the maths, and find out what “supporting each other” really means.',
  minutes: 14,
  themes: ['Careers', 'Money', 'Marriage roles', 'Family'],
  cover: slot('concept-career-cover', 'cover', 'A man at a desk covered in classical Arabic texts at night, his wife in the doorway in work clothes holding car keys.', 'A husband studying Arabic texts as his wife returns from work.'),
  roles: {
    A: { name: 'Musa', gender: 'male', sketch: 'An engineer with a long-held dream of studying the deen properly.' },
    B: { name: 'Khadija', gender: 'female', sketch: 'A senior nurse; proud of him, quietly worried about everything else.' },
  },
  variables: {
    partnership: { label: 'Partnership', initial: 0, readings: ['They are making separate plans.', 'They are mostly planning together.', 'They are deciding as one team.'] },
    strain: { label: 'Money strain', initial: 0, concerning: true, readings: ['Money feels manageable.', 'Money is tight but talked about.', 'Money pressure is crushing them.'] },
    fulfilment: { label: 'Musa’s calling', initial: 0, readings: ['Musa feels he gave up his calling.', 'Musa is partly following it.', 'Musa is living his calling.'] },
  },
  start: 'letter',
  scenes: {
    letter: {
      id: 'letter',
      title: 'The letter',
      image: slot('adv-career-letter', 'scene', 'A man at a desk at night reading a printed resignation letter, a stack of Arabic books beside him, a cup of tea, thoughtful.', 'Musa reading his resignation letter at night.'),
      passages: [{ text: 'Musa has written his resignation letter. It has been sitting in his drafts for a week. He has not told Khadija it exists.' }],
      decision: {
        mode: 'role',
        actor: 'A',
        prompt: 'You are Musa. What do you do?',
        choices: [
          { id: 'show', label: 'Show Khadija the letter and ask what she thinks before sending anything.', effects: { vars: { partnership: 2 } }, next: 'her_reaction', beat: 'Musa showed Khadija the letter before sending it.' },
          { id: 'send', label: 'Send it, he’s waited long enough.', effects: { vars: { partnership: -2, fulfilment: 1 }, flags: ['sent_alone'] }, next: 'her_reaction', beat: 'Musa sent his resignation without telling Khadija.', lesson: { id: 'so-l-alone', tag: 'Notice this', text: 'A decision that moves your spouse’s life is not yours to make alone.' } },
          { id: 'hint', label: 'Drop hints about “dreams” at dinner.', effects: { flags: ['hinted'] }, next: 'her_reaction', beat: 'Musa dropped hints about his dream at dinner.' },
        ],
      },
    },
    her_reaction: {
      id: 'her_reaction',
      title: 'Khadija’s reaction',
      image: slot('adv-career-reaction', 'scene', 'A woman in nurse scrubs sitting at a dining table holding a printed letter, her husband standing beside her, her face showing mixed pride and worry.', 'Khadija reading the letter at the table.'),
      passages: [
        { text: 'Khadija reads it slowly.' },
        { text: 'It’s already been sent.', when: { flag: 'sent_alone' } },
      ],
      decision: {
        mode: 'role',
        actor: 'B',
        prompt: 'You are Khadija. What do you say?',
        choices: [
          { id: 'proud', label: '“I’m proud of you. Let’s work out whether we can do this.”', effects: { vars: { partnership: 1, fulfilment: 1 } }, next: 'numbers', beat: 'Khadija said she was proud and wanted to work out if it was possible.' },
          { id: 'scared', label: '“I’m scared. Four years is a long time on one salary.”', effects: { vars: { partnership: 1 }, flags: ['honest_fear'] }, next: 'numbers', beat: 'Khadija said honestly that she was scared.' },
          { id: 'angry', label: '“You decided this without me?”', effects: { vars: { partnership: -1 } }, next: 'numbers', beat: 'Khadija was angry that he decided without her.' },
        ],
      },
    },
    numbers: {
      id: 'numbers',
      title: 'The spreadsheet',
      image: slot('adv-career-numbers', 'scene', 'A couple at a kitchen table with a laptop showing a simple budget chart, a calculator and a pile of bills, both leaning in seriously.', 'Musa and Khadija going through a budget.'),
      passages: [{ text: 'They sit down with the numbers. It’s possible, just, if nothing goes wrong.' }],
      decision: {
        mode: 'private',
        prompt: 'What matters most to you here? Answer for yourself.',
        choices: [],
        byRole: {
          A: [
            { id: 'calling', label: 'This is my calling. I’ll regret it forever if I don’t.', effects: { vars: { fulfilment: 1 } }, next: 'parents', beat: 'Musa said this was his calling.' },
            { id: 'part_time', label: 'I could study part-time and keep some work.', effects: { vars: { strain: -1, partnership: 1 }, flags: ['offered_part_time'] }, next: 'parents', beat: 'Musa offered to study part-time and keep some work.' },
            { id: 'wait', label: 'Maybe it should wait a few years.', effects: { vars: { fulfilment: -1 } }, next: 'parents', beat: 'Musa wondered if it should wait.' },
          ],
          B: [
            { id: 'support', label: 'I want to support him, with a safety net.', effects: { vars: { partnership: 1 } }, next: 'parents', beat: 'Khadija wanted to support him with a safety net.' },
            { id: 'children', label: 'I want children soon. How does this fit?', effects: { flags: ['children_question'] }, next: 'parents', beat: 'Khadija asked how children would fit.' },
            { id: 'carry', label: 'I’ll carry it, whatever it costs me.', effects: { vars: { strain: 1 }, flags: ['carrying'] }, next: 'parents', beat: 'Khadija decided to carry it whatever it cost her.' },
          ],
        },
        combos: [
          { pair: ['part_time', 'support'], next: 'parents', beat: 'Musa offered part-time study; Khadija offered support with a safety net. A plan began to appear.', effects: { vars: { partnership: 2 } } },
          { pair: ['calling', 'carry'], next: 'parents', beat: 'He spoke of his calling; she quietly decided to carry everything.', effects: { vars: { strain: 1 } } },
          { pair: ['calling', 'children'], next: 'parents', beat: 'His calling met her hope for children. They had never talked about both at once.', effects: { vars: { partnership: 1 } } },
        ],
        diverge: 'parents',
      },
    },
    parents: {
      id: 'parents',
      title: 'Her parents hear',
      image: slot('adv-career-parents', 'scene', 'An older couple sitting on a sofa in their living room, the father frowning with arms folded, the mother looking concerned, their daughter sitting opposite them.', 'Khadija’s parents reacting to the news.'),
      passages: [{ text: 'Khadija’s father is blunt: “A man provides. What is he thinking?”' }],
      decision: {
        mode: 'role',
        actor: 'B',
        prompt: 'You are Khadija. What do you say to your father?',
        choices: [
          { id: 'defend', label: '“We decided together. I believe in him.”', effects: { vars: { partnership: 2 } }, next: 'surprise', beat: 'Khadija defended their decision to her father.' },
          { id: 'agree', label: 'Say nothing, part of her agrees with him.', effects: { vars: { partnership: -1 }, flags: ['doubting'] }, next: 'surprise', beat: 'Khadija stayed quiet, half agreeing with her father.' },
        ],
      },
    },
    surprise: {
      id: 'surprise',
      title: 'Two lines',
      turningPoint: true,
      image: slot('adv-career-surprise', 'turning_point', 'A woman sitting on the edge of a bath holding a pregnancy test, a mix of shock and joy on her face, morning light.', 'Khadija looking at a pregnancy test.'),
      passages: [{ text: 'Six weeks before term starts, Khadija is pregnant.' }],
      decision: {
        mode: 'joint',
        prompt: 'Together: what now?',
        choices: [
          { id: 'delay', label: 'Delay the studies a year and save.', effects: { vars: { strain: -1, fulfilment: -1 }, flags: ['delayed'] }, next: 'first_year', beat: 'They delayed the studies a year to save.' },
          { id: 'part_time', label: 'Musa studies part-time and keeps three days of work.', effects: { vars: { strain: -1, partnership: 1 }, flags: ['part_time'] }, next: 'first_year', beat: 'They chose part-time study with three days of work.' },
          { id: 'go', label: 'Go ahead as planned, they’ll find a way.', effects: { vars: { strain: 2, fulfilment: 2 }, flags: ['full_time'] }, next: 'first_year', beat: 'They went ahead with full-time study regardless.' },
        ],
      },
    },
    first_year: {
      id: 'first_year',
      title: 'The first year',
      image: slot('adv-career-year', 'scene', 'A man studying at a small desk while holding a sleeping baby in one arm, a woman in scrubs leaving for a night shift, waving from the door.', 'Musa studying with the baby as Khadija leaves for a shift.'),
      passages: [
        { text: 'A year in. The baby is three months old.' },
        { text: 'Khadija is working nights again. She hasn’t said how tired she is.', when: { flag: 'carrying' } },
      ],
      decision: {
        mode: 'role',
        actor: 'A',
        prompt: 'You are Musa. What do you do?',
        choices: [
          { id: 'ask', label: 'Ask Khadija honestly how she’s coping, and mean it.', effects: { vars: { partnership: 1, strain: -1 } }, next: 'breaking_point', beat: 'Musa asked Khadija honestly how she was coping.' },
          { id: 'study', label: 'Bury himself in study, it’s what they sacrificed for.', effects: { vars: { fulfilment: 1, strain: 1 } }, next: 'breaking_point', beat: 'Musa buried himself in study.' },
        ],
      },
    },
    breaking_point: {
      id: 'breaking_point',
      title: 'A hard night',
      turningPoint: true,
      image: slot('adv-career-breaking', 'turning_point', 'A woman sitting on a kitchen floor at night in scrubs, head against a cupboard, exhausted, her husband rushing in from the doorway.', 'Khadija exhausted on the kitchen floor.'),
      passages: [{ text: 'A night when the car breaks down, the rent is due and the baby won’t settle.' }],
      decision: {
        mode: 'private',
        prompt: 'What do you do tonight?',
        choices: [
          { id: 'talk', label: 'Sit down and talk honestly about whether this is working.', effects: { vars: { partnership: 1 } }, next: 'review', beat: 'One of them asked to talk honestly about whether it was working.' },
          { id: 'push', label: 'Push through, it’s only one bad night.', effects: { vars: { strain: 1 } }, next: 'review', beat: 'One of them decided to push through.' },
          { id: 'blame', label: 'Say what has been building up.', effects: { vars: { partnership: -1, strain: 1 } }, next: 'review', beat: 'One of them said what had been building up.' },
        ],
        combos: [
          { pair: ['talk', 'talk'], next: 'review', beat: 'Both of them, at the same moment, said: “Can we talk?”', effects: { vars: { partnership: 2 } } },
          { pair: ['blame', 'blame'], next: 'review', beat: 'Everything came out at once, from both sides.', effects: { vars: { partnership: -1 } } },
        ],
        diverge: 'review',
      },
    },
    review: {
      id: 'review',
      title: 'The review',
      image: slot('adv-career-review', 'scene', 'A couple sitting on a sofa with a notebook and a sleeping baby in a bassinet nearby, reviewing a plan together calmly, morning light.', 'Musa and Khadija reviewing their plan.'),
      passages: [{ text: 'They sit down to decide what the next three years look like.' }],
      decision: {
        mode: 'joint',
        prompt: 'Together: what’s the plan from here?',
        choices: [
          { id: 'continue', label: 'Continue, with clear help: family childcare two days, a budget they review monthly.', effects: { vars: { partnership: 1, strain: -1 }, flags: ['reviewed'] }, next: { routes: endingRoutes() }, beat: 'They continued with family help and a monthly budget review.' },
          { id: 'pause', label: 'Musa pauses his studies and returns to work for a while.', effects: { vars: { fulfilment: -2, strain: -2 }, flags: ['paused'] }, next: { routes: endingRoutes() }, beat: 'Musa paused his studies and went back to work.' },
          { id: 'push', label: 'Push on exactly as before.', effects: { vars: { strain: 1 } }, next: { routes: endingRoutes() }, beat: 'They pushed on exactly as before.' },
        ],
      },
    },
  },
  endings: {
    shared_sacrifice: {
      id: 'shared_sacrifice', title: 'A shared sacrifice', mood: 'renewed',
      image: slot('adv-career-end-shared', 'outcome', 'A man in a graduation gown holding a scroll beside his wife and toddler, family members around them smiling, a mosque courtyard in the background.', 'Musa graduating with Khadija and their child beside him.'),
      whatHappened: 'Four years later, Musa graduates. Khadija is in the front row with their toddler. Both of them feel it was their degree.',
      pattern: { name: 'Shared ownership of a dream', explanation: 'Because they decided and adjusted together, the cost and the reward were both shared.' },
      couldHaveChanged: 'Little, though showing her the letter first saved them most of the pain.',
      takeaway: 'Support your spouse’s calling with a plan, not just with faith.',
      epilogues: [{ text: 'Khadija’s father gives the first speech at the celebration.', when: { var: 'partnership', gte: 5 } }],
      guide: [{ id: 'so-e-plan', text: 'We support each other’s dreams with a shared plan and regular reviews.' }],
    },
    burnout: {
      id: 'burnout', title: 'Running on empty', mood: 'strained',
      image: slot('adv-career-end-burnout', 'outcome', 'A woman asleep sitting upright on a hospital break-room chair still in scrubs, a phone showing missed calls in her hand.', 'Khadija asleep in a hospital break room.'),
      whatHappened: 'Musa is thriving in his studies. Khadija is running on empty, and has stopped saying so.',
      pattern: { name: 'One carries, one flies', explanation: 'One spouse’s dream was funded by the other’s silent exhaustion.' },
      couldHaveChanged: 'Asking how she was coping, and adjusting when the answer was hard.',
      takeaway: 'A calling that costs your spouse their health needs a new plan.',
      guide: [{ id: 'so-e-cost', text: 'We check what our plans cost each other, honestly, every month.' }],
    },
    part_time: {
      id: 'part_time', title: 'The slow road', mood: 'steady',
      image: slot('adv-career-end-slow', 'outcome', 'A man on a train with a laptop and an Arabic textbook open, commuting between work and study, looking content.', 'Musa studying on his commute.'),
      whatHappened: 'Part-time takes seven years instead of four. Nobody is exhausted, and nobody resents it.',
      pattern: { name: 'Creative compromise', explanation: 'Neither all-in nor giving up: a slower path everyone could live with.' },
      couldHaveChanged: 'Nothing, this was a good choice.',
      takeaway: 'The slower road is still a road.',
      guide: [{ id: 'so-e-slow', text: 'When both options cost too much, we look for a slower third way.' }],
    },
    deferred: {
      id: 'deferred', title: 'A dream deferred', mood: 'bittersweet',
      image: slot('adv-career-end-deferred', 'outcome', 'A man in an office looking out of the window at a mosque minaret in the distance, an Arabic book on his desk beside a laptop.', 'Musa at work, looking towards a distant minaret.'),
      whatHappened: 'Musa went back to engineering. He reads at night. He tells himself it is “for now”.',
      pattern: { name: 'Sacrifice for stability', explanation: 'The family is secure; part of Musa is waiting.' },
      couldHaveChanged: 'A part-time path might have kept the dream alive.',
      takeaway: 'Deferring a dream is fine; forgetting it is not. Set a date to revisit.',
      epilogues: [{ text: 'Khadija has started saving a little each month for his return to study.', when: { var: 'partnership', gte: 3 } }],
      guide: [{ id: 'so-e-revisit', text: 'When one of us defers a dream, we set a date to revisit it.' }],
    },
    alone_decided: {
      id: 'alone_decided', title: 'Decided alone', mood: 'fragile',
      image: slot('adv-career-end-alone', 'outcome', 'A woman paying bills on a laptop at a kitchen table at night alone, her husband studying in another room behind a half-closed door.', 'Khadija paying bills alone at night.'),
      whatHappened: 'The studies go on. Khadija never quite forgets that the letter was sent before she saw it.',
      pattern: { name: 'Unilateral decision', explanation: 'A shared life was changed by one person’s choice.' },
      couldHaveChanged: 'Showing her the letter first.',
      takeaway: 'Ask before you leap, especially when your spouse will catch you.',
      guide: [{ id: 'so-e-ask', text: 'We never make a life-changing decision without the other.' }],
    },
    father_was_right: {
      id: 'father_was_right', title: '“A man provides”', mood: 'strained',
      image: slot('adv-career-end-father', 'outcome', 'A tense family dinner, an older man speaking sternly, a young husband looking down at his plate, his wife looking between them unhappily.', 'A tense family dinner with Khadija’s father.'),
      whatHappened: 'Her father’s words hang over every money conversation. Khadija half-believes them now.',
      pattern: { name: 'Outside doubt, inside', explanation: 'Unspoken agreement with a critic eroded the shared decision.' },
      couldHaveChanged: 'Khadija telling Musa about her doubts directly instead of letting them grow.',
      takeaway: 'Bring doubts to your spouse before they become someone else’s argument.',
      guide: [{ id: 'so-e-doubt', text: 'We bring our doubts to each other first.' }],
    },
    partners: {
      id: 'partners', title: 'Partners', mood: 'tender',
      image: slot('adv-career-end-partners', 'outcome', 'A couple sitting together at a kitchen table late at night, one studying, one doing paperwork, sharing a pot of tea, comfortable together.', 'Musa studying and Khadija working, side by side.'),
      whatHappened: 'Money is tight and nights are long. But every hard month is discussed, and every adjustment made together.',
      pattern: { name: 'Honest partnership', explanation: 'They kept talking when it was hard, so hard never became hidden.' },
      couldHaveChanged: 'More help sooner would ease the load.',
      takeaway: 'Hard is survivable. Hidden is not.',
      guide: [{ id: 'so-e-talk', text: 'We talk about hard months as soon as they start.' }],
    },
    managing: {
      id: 'managing', title: 'Managing', mood: 'steady',
      image: slot('adv-career-end-managing', 'outcome', 'A family in a small living room on a weekend, a toddler playing on the rug, the father reading, the mother folding laundry, calm and ordinary.', 'An ordinary weekend at home for the family.'),
      whatHappened: 'They are managing, some months better than others.',
      pattern: { name: 'Getting by', explanation: 'The plan works, mostly, but has never been properly reviewed.' },
      couldHaveChanged: 'A regular review of how it is going for both of them.',
      takeaway: 'Review big plans regularly, not only when they break.',
      epilogues: [{ text: 'Money stress sits in the background of most evenings.', when: { var: 'strain', gte: 2 } }],
      guide: [{ id: 'so-e-review', text: 'We review big plans together every few months.' }],
    },
  },
};

function endingRoutes(): { when?: Condition; to: string }[] {
  return [
    { when: { all: [{ flag: 'sent_alone' }, { var: 'partnership', lte: 0 }] }, to: 'end:alone_decided' },
    { when: { flag: 'doubting' }, to: 'end:father_was_right' },
    { when: { var: 'strain', gte: 4 }, to: 'end:burnout' },
    { when: { flag: 'paused' }, to: 'end:deferred' },
    { when: { flag: 'delayed' }, to: 'end:deferred' },
    { when: { all: [{ var: 'partnership', gte: 5 }, { var: 'fulfilment', gte: 1 }] }, to: 'end:shared_sacrifice' },
    { when: { flag: 'part_time' }, to: 'end:part_time' },
    { when: { var: 'partnership', gte: 3 }, to: 'end:partners' },
    { to: 'end:managing' },
  ];
}
