import type { Adventure, Condition } from '../../types.ts';
import { slot } from '../images.ts';

/**
 * Three in the Morning — a new baby, two exhausted parents, and the quiet
 * arithmetic of who does more. Hidden states: team, resentment, support.
 */
export const threeInTheMorning: Adventure = {
  id: 'adv-three-in-the-morning',
  kind: 'adventure',
  title: 'Three in the Morning',
  tagline: 'A six-week-old, two tired parents, and opinions from both grandmothers.',
  description:
    'Ibrahim and Ruqayya have a six-week-old daughter and have not slept properly since. Each quietly believes they do more. Play both of them through the nights, the visits and the first evening alone — and see whether exhaustion makes them a team or a tally.',
  minutes: 14,
  themes: ['Children', 'Marriage roles', 'Family help', 'Exhaustion'],
  cover: slot('concept-baby-cover', 'cover', 'A kitchen at 3am, a father warming a bottle and a mother asleep at the table with her head on her arms, a baby monitor glowing.', 'Exhausted new parents in the kitchen at 3am.'),
  roles: {
    A: { name: 'Ibrahim', gender: 'male', sketch: 'Back at work after two weeks; feels useless at night.' },
    B: { name: 'Ruqayya', gender: 'female', sketch: 'Feeding every two hours; feels invisible by day.' },
  },
  variables: {
    team: { label: 'Teamwork', initial: 0, readings: ['They are keeping score.', 'They are coping side by side.', 'They are a real team.'] },
    resentment: { label: 'Unspoken resentment', initial: 0, concerning: true, readings: ['Little is left unsaid.', 'Some tallies are being kept.', 'A lot is being counted in silence.'] },
    support: { label: 'Family support', initial: 0, readings: ['Family help has become pressure.', 'Family help is mixed.', 'Family help genuinely helps.'] },
  },
  start: 'cry',
  scenes: {
    cry: {
      id: 'cry',
      title: '3:07 a.m.',
      image: slot('adv-baby-cry', 'scene', 'A dark bedroom lit by a baby monitor glow, a mother sitting up with a crying baby, a father half-awake reaching for his phone alarm, both exhausted.', 'Ruqayya sitting up with the crying baby at night.'),
      passages: [
        { text: 'The baby is crying again. It is the fourth time tonight. Ibrahim has work at eight.' },
      ],
      decision: {
        mode: 'role',
        actor: 'A',
        prompt: 'You are Ibrahim. What do you do?',
        choices: [
          { id: 'get_up', label: 'Get up, change her, and bring her to Ruqayya to feed.', effects: { vars: { team: 1 } }, next: 'breakfast', beat: 'Ibrahim got up at three to change the baby.' },
          { id: 'pretend', label: 'Pretend to be asleep. Ruqayya’s up anyway.', effects: { vars: { resentment: 1 }, flags: ['pretended_sleep'] }, next: 'breakfast', beat: 'Ibrahim pretended to be asleep.', lesson: { id: 'tm-l-pretend', tag: 'Notice this', text: 'She almost certainly noticed. What she noticed is now a story she tells herself.' } },
          { id: 'offer', label: 'Whisper: “Shall I take the next one?”', effects: { vars: { team: 1 }, flags: ['offered'] }, next: 'breakfast', beat: 'Ibrahim offered to take the next waking.' },
        ],
      },
    },
    breakfast: {
      id: 'breakfast',
      title: 'Morning',
      image: slot('adv-baby-morning', 'scene', 'A kitchen in the morning, a husband in work clothes grabbing a coffee by the door, his wife in pyjamas on a sofa with a baby asleep on her chest, both looking at each other tiredly.', 'Ibrahim leaving for work as Ruqayya holds the baby.'),
      passages: [
        { text: 'Ibrahim is grabbing his keys. Ruqayya has not showered in two days.' },
        { text: 'She heard him pretending to sleep.', when: { flag: 'pretended_sleep' } },
      ],
      decision: {
        mode: 'role',
        actor: 'B',
        prompt: 'You are Ruqayya. What do you say?',
        choices: [
          { id: 'ask', label: '“Can you take her for an hour when you’re home? I need a shower and a nap.”', effects: { vars: { team: 1 } }, next: 'grandma', beat: 'Ruqayya asked plainly for an hour to herself.' },
          { id: 'jab', label: '“Must be nice, going to work and talking to adults.”', effects: { vars: { resentment: 1, team: -1 } }, next: 'grandma', beat: 'Ruqayya made a pointed remark about Ibrahim going to work.' },
          { id: 'silent', label: 'Say nothing. Cope.', effects: { vars: { resentment: 2 }, flags: ['coping'] }, next: 'grandma', beat: 'Ruqayya said nothing and coped alone.' },
        ],
      },
    },
    grandma: {
      id: 'grandma',
      title: 'The grandmothers',
      image: slot('adv-baby-grandma', 'scene', 'A living room with two grandmothers, one holding the baby and one gesturing advice, a young mother sitting between them looking overwhelmed, a bag of homemade food on the table.', 'Two grandmothers giving advice to Ruqayya.'),
      passages: [{ text: 'Both grandmothers arrive with food and opinions. Ibrahim’s mother says the baby is “too hot”. Ruqayya’s mother says she should be feeding differently.' }],
      decision: {
        mode: 'role',
        actor: 'A',
        prompt: 'You are Ibrahim. What do you do?',
        choices: [
          { id: 'shield', label: '“Ruqayya knows her best. Shall I make everyone tea?”', effects: { vars: { team: 2, support: -1 } }, next: 'evening', beat: 'Ibrahim backed Ruqayya in front of both grandmothers.' },
          { id: 'roles', label: 'Give the grandmothers jobs: cooking and laundry, not advice.', effects: { vars: { support: 2, team: 1 }, flags: ['jobs'] }, next: 'evening', beat: 'Ibrahim gave the grandmothers practical jobs instead of advice.' },
          { id: 'agree', label: 'Agree with his mother — she raised five children.', effects: { vars: { resentment: 1, team: -1 } }, next: 'evening', beat: 'Ibrahim agreed with his mother’s advice in front of Ruqayya.' },
        ],
      },
    },
    evening: {
      id: 'evening',
      title: 'The evening',
      turningPoint: true,
      image: slot('adv-baby-evening', 'turning_point', 'A husband and wife on opposite ends of a sofa in the evening, a baby asleep in a bassinet between them, both staring at their phones, a tense silence.', 'Ibrahim and Ruqayya on the sofa, the baby asleep between them.'),
      passages: [
        { text: 'The baby sleeps. Both of them are too tired to talk, and too wound up not to.' },
        { text: 'Weeks of silence are sitting on Ruqayya’s chest.', when: { flag: 'coping' } },
      ],
      decision: {
        mode: 'private',
        prompt: 'What do you do tonight?',
        choices: [],
        byRole: {
          A: [
            { id: 'list', label: 'Mention everything he has done this week.', effects: { vars: { resentment: 1 } }, next: 'night_plan', beat: 'Ibrahim listed what he had done that week.' },
            { id: 'ask', label: '“How are you, really?”', effects: { vars: { team: 1 } }, next: 'night_plan', beat: 'Ibrahim asked Ruqayya how she really was.' },
            { id: 'phone', label: 'Scroll his phone and decompress.', effects: { vars: { team: -1 } }, next: 'night_plan', beat: 'Ibrahim scrolled his phone to decompress.' },
          ],
          B: [
            { id: 'cry', label: 'Admit she is not okay.', effects: { vars: { team: 1 }, flags: ['admitted'] }, next: 'night_plan', beat: 'Ruqayya admitted she was not okay.' },
            { id: 'tally', label: 'Point out how many nights she has done alone.', effects: { vars: { resentment: 1 } }, next: 'night_plan', beat: 'Ruqayya pointed out how many nights she had done alone.' },
            { id: 'sleep', label: 'Go to bed without a word.', effects: { vars: { resentment: 1 } }, next: 'night_plan', beat: 'Ruqayya went to bed without a word.' },
          ],
        },
        combos: [
          { pair: ['ask', 'cry'], next: 'night_plan', beat: 'Ibrahim asked how she really was, and Ruqayya finally said: not okay. He held her while she cried.', effects: { vars: { team: 2, resentment: -2 } } },
          { pair: ['list', 'tally'], next: 'scorecard', beat: 'He listed his week; she listed her nights. It became a competition nobody could win.', effects: { vars: { resentment: 2, team: -1 } } },
          { pair: ['phone', 'sleep'], next: 'scorecard', beat: 'He scrolled; she went to bed. Another evening passed without a word.', effects: { vars: { resentment: 1 } } },
        ],
        diverge: 'night_plan',
      },
    },
    scorecard: {
      id: 'scorecard',
      title: 'The scorecard',
      image: slot('adv-baby-scorecard', 'scene', 'A notepad on a kitchen counter with two columns of tally marks, a baby bottle beside it, an empty room in early morning light.', 'A notepad of tally marks on the kitchen counter.'),
      passages: [{ text: 'A week later, they are keeping count — out loud. Nights, nappies, hours.' }],
      decision: {
        mode: 'role',
        actor: 'B',
        prompt: 'You are Ruqayya. What do you do?',
        choices: [
          { id: 'stop', label: '“We’re on the same side. Can we stop counting?”', effects: { vars: { team: 2, resentment: -1 } }, next: 'night_plan', beat: 'Ruqayya asked them to stop keeping count.' },
          { id: 'mother', label: 'Move in with her mother for a week.', effects: { vars: { support: 1, team: -2 }, flags: ['moved_out'] }, next: 'night_plan', beat: 'Ruqayya went to stay with her mother for a week.' },
        ],
      },
    },
    night_plan: {
      id: 'night_plan',
      title: 'A plan for the nights',
      image: slot('adv-baby-plan', 'scene', 'A couple sitting on a bed with a notebook, sketching a simple night schedule, a baby monitor on the bedside table, soft lamp light.', 'Ibrahim and Ruqayya planning the nights in a notebook.'),
      passages: [
        { text: 'They sit down with a notebook and try to plan the nights.' },
        { text: 'Ruqayya is back from her mother’s. It is awkward, but they are talking.', when: { flag: 'moved_out' } },
      ],
      lessons: [{ id: 'tm-l-joint', tag: 'Joint decision', text: 'You both need to choose the same plan.' }],
      decision: {
        mode: 'joint',
        prompt: 'Together: how will the nights work?',
        choices: [
          { id: 'shifts', label: 'Shifts: he takes 10–2, she takes 2–6, with expressed milk.', effects: { vars: { team: 2 }, flags: ['shifts'] }, next: 'first_evening', beat: 'They split the nights into shifts.' },
          { id: 'weekend', label: 'He takes every weekend night, so she gets two full sleeps.', effects: { vars: { team: 1 }, flags: ['weekends'] }, next: 'first_evening', beat: 'Ibrahim took every weekend night.' },
          { id: 'help', label: 'Ask a grandmother to stay over twice a week.', effects: { vars: { support: 2 }, flags: ['help_nights'] }, next: 'first_evening', beat: 'They asked a grandmother to stay over twice a week.' },
        ],
      },
    },
    first_evening: {
      id: 'first_evening',
      title: 'The first evening alone',
      turningPoint: true,
      image: slot('adv-baby-out', 'turning_point', 'A young couple at a small restaurant table by a window in the evening, both glancing at a phone showing a baby monitor app, half-smiling.', 'Ibrahim and Ruqayya on their first evening out.'),
      passages: [{ text: 'Eight weeks in. A grandmother has the baby. They are at a restaurant, alone, for the first time since the birth.' }],
      decision: {
        mode: 'private',
        prompt: 'What do you want from tonight?',
        choices: [
          { id: 'us', label: 'To talk about us — not the baby.', effects: { vars: { team: 1 } }, next: 'month', beat: 'One of them wanted to talk about the two of them.' },
          { id: 'baby', label: 'To check the monitor and go home early.', next: 'month', beat: 'One of them wanted to check in and go home early.' },
          { id: 'air', label: 'To finally say the hard things.', effects: { vars: { resentment: -1 } }, next: 'month', beat: 'One of them wanted to finally say the hard things.' },
        ],
        combos: [
          { pair: ['us', 'us'], next: 'month', beat: 'Both wanted to talk about the two of them — and laughed like they used to.', effects: { vars: { team: 2 } } },
          { pair: ['baby', 'air'], next: 'month', beat: 'One wanted to go home early; the other had finally gathered the courage to talk. It came out in the car.', effects: { vars: { resentment: 1 } } },
        ],
        diverge: 'month',
      },
    },
    month: {
      id: 'month',
      title: 'Three months',
      image: slot('adv-baby-month', 'scene', 'A father lying on a rug playing with a smiling baby while the mother sits nearby with tea, watching them, afternoon light.', 'Ibrahim playing with the baby as Ruqayya watches.'),
      passages: [{ text: 'Three months. The baby smiles now. The question is what kind of parents — and spouses — they have become.' }],
      decision: {
        mode: 'role',
        actor: 'A',
        prompt: 'You are Ibrahim. What do you say to Ruqayya?',
        choices: [
          { id: 'thank', label: '“I don’t know how you did those first weeks. Thank you.”', effects: { vars: { team: 1, resentment: -1 } }, next: { routes: endingRoutes() }, beat: 'Ibrahim thanked Ruqayya for those first weeks.' },
          { id: 'nothing', label: 'Nothing — the worst is over.', effects: { vars: { resentment: 1 } }, next: { routes: endingRoutes() }, beat: 'Ibrahim decided the worst was over and said nothing.' },
        ],
      },
    },
  },
  endings: {
    team: {
      id: 'team', title: 'A real team', mood: 'renewed',
      image: slot('adv-baby-end-team', 'outcome', 'A couple pushing a pram together through a park on a sunny day, both laughing, the baby visible.', 'Ibrahim and Ruqayya pushing the pram through a park.'),
      whatHappened: 'The nights are still hard. But they are hard together.',
      pattern: { name: 'Shared load', explanation: 'They turned exhaustion into a joint problem instead of a contest.' },
      couldHaveChanged: 'Nothing big; asking “how are you really?” sooner.',
      takeaway: 'In the newborn months, ask how your spouse is before you say what you did.',
      epilogues: [{ text: 'Their shifts system becomes family legend.', when: { flag: 'shifts' } }],
      guide: [{ id: 'tm-e-team', text: 'We are on the same side, especially when we are exhausted.' }],
    },
    tally: {
      id: 'tally', title: 'Keeping score', mood: 'strained',
      image: slot('adv-baby-end-tally', 'outcome', 'A husband and wife passing a baby between them in a hallway without looking at each other, cold body language.', 'Ibrahim and Ruqayya passing the baby without eye contact.'),
      whatHappened: 'They parent efficiently and talk about little else. The tally never really stopped.',
      pattern: { name: 'Competitive exhaustion', explanation: 'Each kept proof of doing more, so neither felt seen.' },
      couldHaveChanged: 'Saying “I’m not okay” instead of “I did more”.',
      takeaway: 'Nobody wins a tally. Both lose the marriage behind it.',
      guide: [{ id: 'tm-e-count', text: 'We do not keep score; we say what we need.' }],
    },
    village: {
      id: 'village', title: 'It takes a village', mood: 'tender',
      image: slot('adv-baby-end-village', 'outcome', 'A grandmother rocking a baby in an armchair while a young couple sleep on a sofa beside her, peaceful.', 'A grandmother rocking the baby while the couple sleep.'),
      whatHappened: 'With grandmothers doing jobs instead of giving advice, everyone sleeps a little more.',
      pattern: { name: 'Help with boundaries', explanation: 'Family help works when it serves the couple’s plan.' },
      couldHaveChanged: 'Setting those roles from week one.',
      takeaway: 'Ask family for help with tasks, not decisions.',
      guide: [{ id: 'tm-e-help', text: 'We welcome family help for tasks; decisions stay ours.' }],
    },
    seen: {
      id: 'seen', title: 'Finally seen', mood: 'tender',
      image: slot('adv-baby-end-seen', 'outcome', 'A husband hugging his wife from behind in a kitchen while she holds the baby, her eyes closed in relief.', 'Ibrahim hugging Ruqayya as she holds the baby.'),
      whatHappened: 'The night she admitted she was not okay, something changed. She stopped carrying it alone.',
      pattern: { name: 'Vulnerability over coping', explanation: 'Saying “I’m not okay” opened the door that coping kept shut.' },
      couldHaveChanged: 'Saying it a month earlier.',
      takeaway: 'Coping in silence is not strength; it is distance.',
      epilogues: [{ text: 'They still use the shifts they planned that week.', when: { flag: 'shifts' } }],
      guide: [{ id: 'tm-e-okay', text: 'We tell each other when we are not okay.' }],
    },
    apart_home: {
      id: 'apart_home', title: 'Two homes for a week', mood: 'fragile',
      image: slot('adv-baby-end-apart', 'outcome', 'A man standing alone in a quiet nursery holding a small baby sock, an empty crib beside him.', 'Ibrahim alone in the empty nursery.'),
      whatHappened: 'She comes back after a week. They are polite. Something has to be rebuilt.',
      pattern: { name: 'Escape over repair', explanation: 'Leaving relieved the pressure without fixing what caused it.' },
      couldHaveChanged: 'One honest night-plan conversation before she left.',
      takeaway: 'Space can help — if you agree why you are taking it and when you will talk.',
      guide: [{ id: 'tm-e-space', text: 'If we need space, we say why and when we will talk.' }],
    },
    weekends: {
      id: 'weekends', title: 'Saturday mornings', mood: 'steady',
      image: slot('adv-baby-end-weekend', 'outcome', 'A father feeding a baby a bottle in a kitchen at sunrise, wearing a hoodie, smiling down at her, quiet house.', 'Ibrahim feeding the baby at sunrise.'),
      whatHappened: 'Ibrahim’s weekend nights become his time with his daughter — and Ruqayya’s two full sleeps a week.',
      pattern: { name: 'Clear ownership', explanation: 'A simple, owned task stopped the vague sense of unfairness.' },
      couldHaveChanged: 'Talking about the weekdays too.',
      takeaway: 'A clear job each beats a vague promise to “help”.',
      epilogues: [{ text: 'A grandmother still drops by with food every Friday.', when: { var: 'support', gte: 2 } }],
      guide: [{ id: 'tm-e-own', text: 'We each own clear jobs rather than “helping” each other.' }],
    },
    unspoken: {
      id: 'unspoken', title: 'Survived, unsaid', mood: 'bittersweet',
      image: slot('adv-baby-end-unsaid', 'outcome', 'A couple at a baby’s first birthday party, smiling for a photo, the mother’s smile not quite reaching her eyes.', 'Ibrahim and Ruqayya smiling for a photo at the first birthday.'),
      whatHappened: 'They got through the first year. Ruqayya still thinks about the nights she did alone.',
      pattern: { name: 'Resentment stored', explanation: 'What was never said stayed, quietly, after the hard months ended.' },
      couldHaveChanged: 'Ibrahim saying thank you, and Ruqayya saying what it cost.',
      takeaway: 'Name what the hard season cost each of you, even after it ends.',
      guide: [{ id: 'tm-e-thank', text: 'We thank each other out loud for the hard seasons.' }],
    },
    getting_by: {
      id: 'getting_by', title: 'Getting by', mood: 'steady',
      image: slot('adv-baby-end-by', 'outcome', 'A tired but calm couple sitting on stairs at home sharing a single bowl of noodles late at night, baby monitor between them.', 'Ibrahim and Ruqayya sharing late-night noodles on the stairs.'),
      whatHappened: 'Some good nights, some bad. They are still learning how to be parents and spouses at once.',
      pattern: { name: 'A season of adjustment', explanation: 'Every couple is clumsy in the newborn months; what matters is noticing.' },
      couldHaveChanged: 'A clearer plan for the nights.',
      takeaway: 'Plan the nights before you are too tired to plan anything.',
      epilogues: [{ text: 'Some tallies are still being kept quietly.', when: { var: 'resentment', gte: 2 } }],
      guide: [{ id: 'tm-e-plan', text: 'We plan hard seasons together before they start.' }],
    },
  },
};

function endingRoutes(): { when?: Condition; to: string }[] {
  return [
    { when: { flag: 'moved_out' }, to: 'end:apart_home' },
    { when: { var: 'resentment', gte: 4 }, to: 'end:tally' },
    { when: { all: [{ var: 'team', gte: 5 }, { var: 'resentment', lte: 0 }] }, to: 'end:team' },
    { when: { all: [{ flag: 'admitted' }, { var: 'team', gte: 3 }] }, to: 'end:seen' },
    { when: { all: [{ var: 'support', gte: 2 }, { any: [{ flag: 'jobs' }, { flag: 'help_nights' }] }] }, to: 'end:village' },
    { when: { flag: 'weekends' }, to: 'end:weekends' },
    { when: { var: 'resentment', gte: 2 }, to: 'end:unspoken' },
    { to: 'end:getting_by' },
  ];
}
