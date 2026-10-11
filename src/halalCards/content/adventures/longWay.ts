import type { Adventure, Condition } from '../../types.ts';
import { slot } from '../images.ts';

/**
 * A Long Way from the Masjid — a move to a small town with no Muslim
 * community, where one of them thrives and one feels lost. Hidden states:
 * belonging, closeness, faith.
 */
export const longWay: Adventure = {
  id: 'adv-long-way',
  kind: 'adventure',
  title: 'A Long Way from the Masjid',
  tagline: 'A new job, a small town, no masjid. One of them thrives; one feels lost.',
  description:
    'Yusuf takes a job in a small coastal town. No masjid, no halal butcher, no Muslim friends. He loves the quiet; Hafsa feels like she has lost her whole world. Play both of them through a first lonely Eid, a front-room prayer that grows, and an offer to move back.',
  minutes: 13,
  themes: ['Relocation', 'Loneliness', 'Community', 'Faith'],
  cover: slot('concept-town-cover', 'cover', 'A couple standing outside a cottage in a quiet countryside town, one looking around with excitement, the other with uncertainty, a compass in hand.', 'A couple outside a countryside cottage, one excited, one uncertain.'),
  roles: {
    A: { name: 'Yusuf', gender: 'male', sketch: 'Loves his new job and the slower pace; busy all day.' },
    B: { name: 'Hafsa', gender: 'female', sketch: 'Left her family, her halaqa and her friends behind; works remotely, alone.' },
  },
  variables: {
    belonging: { label: 'Belonging', initial: 0, readings: ['Hafsa feels like a stranger here.', 'The town is becoming bearable.', 'This place is starting to feel like home.'] },
    closeness: { label: 'Closeness', initial: 0, readings: ['They are living different lives.', 'They are getting by together.', 'The move has brought them closer.'] },
    faith: { label: 'Faith life', initial: 0, readings: ['Their faith feels thin out here.', 'Their faith is holding.', 'Their faith has deepened.'] },
  },
  start: 'arrival',
  scenes: {
    arrival: {
      id: 'arrival',
      title: 'Three weeks in',
      image: slot('adv-town-arrival', 'scene', 'A woman in a hijab standing at the window of a small cottage looking out at a quiet grey high street, a laptop open on a table behind her, alone.', 'Hafsa alone at the window of the cottage.'),
      passages: [{ text: 'Three weeks in. Yusuf comes home buzzing about his team. Hafsa has not spoken to another person all day.' }],
      decision: {
        mode: 'role',
        actor: 'A',
        prompt: 'You are Yusuf. How do you greet her?',
        choices: [
          { id: 'ask', label: 'Ask about her day first — really ask.', effects: { vars: { closeness: 1 } }, next: 'her_day', beat: 'Yusuf asked about Hafsa’s day before telling her about his.' },
          { id: 'share', label: 'Tell her all about his great day.', effects: { vars: { belonging: -1 } }, next: 'her_day', beat: 'Yusuf told Hafsa all about his great day.' },
          { id: 'cheer', label: '“You’ll love it once you settle in!”', effects: { vars: { closeness: -1 } }, next: 'her_day', beat: 'Yusuf told her she’d love it once she settled in.', lesson: { id: 'lw-l-cheer', tag: 'Rule 2', text: 'Reassurance before understanding can feel like being told your feelings are wrong.' } },
        ],
      },
    },
    her_day: {
      id: 'her_day',
      title: 'The truth',
      image: slot('adv-town-truth', 'scene', 'A couple sitting at a small kitchen table in a cottage in the evening, the wife speaking quietly with tears, the husband listening with his hand on hers.', 'Hafsa telling Yusuf how lonely she is.'),
      passages: [{ text: 'Hafsa decides whether to say how she really feels.' }],
      decision: {
        mode: 'role',
        actor: 'B',
        prompt: 'You are Hafsa. What do you say?',
        choices: [
          { id: 'honest', label: '“I’m really lonely here. I need us to do something about it.”', effects: { vars: { closeness: 1 }, flags: ['said_lonely'] }, next: 'eid', beat: 'Hafsa told Yusuf honestly that she was lonely.' },
          { id: 'fine', label: '“It’s fine. Just an adjustment.”', effects: { vars: { belonging: -1 }, flags: ['hid_it'] }, next: 'eid', beat: 'Hafsa said it was just an adjustment.' },
          { id: 'regret', label: '“I wish we’d never moved.”', effects: { vars: { closeness: -1 } }, next: 'eid', beat: 'Hafsa said she wished they had never moved.' },
        ],
      },
    },
    eid: {
      id: 'eid',
      title: 'The first Eid alone',
      turningPoint: true,
      image: slot('adv-town-eid', 'turning_point', 'A couple in Eid clothes in a small cottage living room praying Eid prayer on two mats with no one else, a phone propped up showing family on a video call.', 'Yusuf and Hafsa praying Eid alone, family on a video call.'),
      passages: [
        { text: 'Eid morning. The nearest masjid is ninety minutes away. Their families are on a video call, eating together.' },
        { text: 'Hafsa has been saying it’s fine for weeks. It is not fine.', when: { flag: 'hid_it' } },
      ],
      decision: {
        mode: 'private',
        prompt: 'What do you want to do today?',
        choices: [],
        byRole: {
          A: [
            { id: 'drive', label: 'Drive ninety minutes to the city masjid for Eid prayer.', effects: { vars: { faith: 1, belonging: 1 } }, next: 'front_room', beat: 'Yusuf wanted to drive to the city masjid for Eid.' },
            { id: 'home', label: 'Make Eid special at home, just the two of them.', effects: { vars: { closeness: 1 } }, next: 'front_room', beat: 'Yusuf wanted to make Eid special at home.' },
            { id: 'work', label: 'Pop into work for a couple of hours — it’s a busy week.', effects: { vars: { closeness: -2 } }, next: 'front_room', beat: 'Yusuf went into work for a few hours on Eid.' },
          ],
          B: [
            { id: 'drive', label: 'Drive to the city masjid, whatever it takes.', effects: { vars: { faith: 1 } }, next: 'front_room', beat: 'Hafsa wanted to drive to the city masjid.' },
            { id: 'invite', label: 'Invite the one friendly neighbour round for Eid sweets.', effects: { vars: { belonging: 2 }, flags: ['neighbour'] }, next: 'front_room', beat: 'Hafsa invited their friendly neighbour for Eid sweets.' },
            { id: 'cry', label: 'Spend the morning on the video call, crying.', effects: { vars: { belonging: -1 } }, next: 'front_room', beat: 'Hafsa spent the morning on the call with family, crying.' },
          ],
        },
        combos: [
          { pair: ['drive', 'drive'], next: 'front_room', beat: 'Both wanted the city masjid. In the car park after Eid prayer they met three other families from towns nearby.', effects: { vars: { belonging: 2, faith: 1 }, flags: ['met_families'] } },
          { pair: ['work', 'cry'], next: 'front_room', beat: 'He went to work; she cried on the call. The loneliest Eid of their lives.', effects: { vars: { closeness: -1 } } },
          { pair: ['home', 'invite'], next: 'front_room', beat: 'He made the house festive; she invited the neighbour. Their first guest.', effects: { vars: { closeness: 1, belonging: 1 } } },
        ],
        diverge: 'front_room',
      },
    },
    front_room: {
      id: 'front_room',
      title: 'The front room',
      image: slot('adv-town-front-room', 'scene', 'A small cottage front room with a few people praying in rows on mismatched mats, a couple hosting, shoes by the door, warm light.', 'A small group praying in the couple’s front room.'),
      passages: [
        { text: 'Hafsa has an idea: a weekly gathering in their front room for the handful of Muslims within an hour’s drive.' },
        { text: 'The families they met at the city masjid would come.', when: { flag: 'met_families' } },
      ],
      decision: {
        mode: 'joint',
        prompt: 'Together: do you start it?',
        choices: [
          { id: 'start', label: 'Start it — Friday evenings, food and a short talk.', effects: { vars: { belonging: 2, faith: 1 }, flags: ['started_circle'] }, next: 'offer', beat: 'They started a Friday-evening gathering at home.' },
          { id: 'online', label: 'Join an online halaqa instead.', effects: { vars: { faith: 1 } }, next: 'offer', beat: 'They joined an online halaqa.' },
          { id: 'not_yet', label: 'Not yet — they’re too tired.', effects: { vars: { belonging: -1 } }, next: 'offer', beat: 'They decided they were too tired to start anything yet.' },
        ],
      },
    },
    offer: {
      id: 'offer',
      title: 'An offer to move back',
      turningPoint: true,
      image: slot('adv-town-offer', 'turning_point', 'A man reading an email on a laptop at a kitchen table showing a job offer, his wife reading over his shoulder, both thoughtful, a coastal view outside the window.', 'Yusuf reading a job offer back in the city.'),
      passages: [
        { text: 'A year in, Yusuf is offered a role back in the city, near both families.' },
        { text: 'The Friday gathering now has fourteen regulars. Hafsa is the one who organises it.', when: { flag: 'started_circle' } },
      ],
      decision: {
        mode: 'private',
        prompt: 'What do you want?',
        choices: [
          { id: 'stay', label: 'Stay. This is becoming home.', effects: { vars: { belonging: 1 } }, next: 'decide', beat: 'One of them wanted to stay.' },
          { id: 'go', label: 'Go back. Family and community matter more.', effects: { flags: ['wants_home'] }, next: 'decide', beat: 'One of them wanted to go back.' },
          { id: 'unsure', label: 'Unsure — talk it through.', effects: { vars: { closeness: 1 } }, next: 'decide', beat: 'One of them was unsure and wanted to talk.' },
        ],
        combos: [
          { pair: ['stay', 'stay'], next: 'decide', beat: 'To their own surprise, both wanted to stay.', effects: { vars: { closeness: 1 } } },
          { pair: ['go', 'go'], next: 'decide', beat: 'Both quietly wanted to go home.', effects: { vars: { closeness: 1 } } },
          { pair: ['stay', 'go'], next: 'decide', beat: 'One wanted to stay; the other wanted to go home. A real decision now.' },
        ],
        diverge: 'decide',
      },
    },
    decide: {
      id: 'decide',
      title: 'Deciding',
      image: slot('adv-town-decide', 'scene', 'A couple sitting on a sea wall at sunset, talking seriously but gently, coats on, the town behind them.', 'Yusuf and Hafsa deciding on the sea wall.'),
      passages: [{ text: 'They sit on the sea wall and decide.' }],
      decision: {
        mode: 'joint',
        prompt: 'Together: stay or go?',
        choices: [
          { id: 'stay', label: 'Stay — and keep building what they started.', effects: { vars: { belonging: 1 }, flags: ['stayed'] }, next: { routes: endingRoutes() }, beat: 'They chose to stay.' },
          { id: 'go', label: 'Move back to the city, near family.', effects: { flags: ['moved_back'] }, next: { routes: endingRoutes() }, beat: 'They chose to move back to the city.' },
        ],
      },
    },
  },
  endings: {
    built_community: {
      id: 'built_community', title: 'They built it', mood: 'renewed',
      image: slot('adv-town-end-built', 'outcome', 'A small rented community hall with a handmade sign shape, families praying together, children playing at the back, the couple greeting people at the door.', 'A small community gathering the couple built.'),
      whatHappened: 'Three years on, the Friday gathering has a rented hall. Hafsa runs the women’s circle. She calls the town home.',
      pattern: { name: 'Building what you lack', explanation: 'Instead of waiting for belonging, they created it together.' },
      couldHaveChanged: 'Nothing — though saying “I’m lonely” on day one sped everything up.',
      takeaway: 'If you can’t find the community you need, you may be meant to start it.',
      epilogues: [{ text: 'Their old neighbour comes to every Eid now.', when: { flag: 'neighbour' } }],
      guide: [{ id: 'lw-e-build', text: 'Wherever we live, we build a community around our home.' }],
    },
    home_again: {
      id: 'home_again', title: 'Home, changed', mood: 'tender',
      image: slot('adv-town-end-home', 'outcome', 'A couple arriving at a busy family home with boxes, relatives rushing out to hug them, a city street behind.', 'Yusuf and Hafsa arriving home to their families.'),
      whatHappened: 'They move back. They are closer than when they left — they learned to rely on each other out there.',
      pattern: { name: 'A season that strengthened them', explanation: 'Isolation, faced together, deepened the marriage.' },
      couldHaveChanged: 'Little.',
      takeaway: 'A hard season faced together is never wasted.',
      guide: [{ id: 'lw-e-season', text: 'We face hard seasons as a team, wherever we are.' }],
    },
    lonely_stay: {
      id: 'lonely_stay', title: 'Staying for him', mood: 'fragile',
      image: slot('adv-town-end-lonely', 'outcome', 'A woman alone on a beach in winter wrapped in a coat, looking out to sea, the small town distant behind her.', 'Hafsa alone on a winter beach.'),
      whatHappened: 'They stayed because Yusuf loved it. Hafsa is still lonely, and has stopped mentioning it.',
      pattern: { name: 'One thrives, one shrinks', explanation: 'The move suited one spouse and quietly diminished the other.' },
      couldHaveChanged: 'Taking her loneliness as seriously as his job.',
      takeaway: 'A move is right only if it is right for both of you.',
      guide: [{ id: 'lw-e-both', text: 'Where we live has to work for both of us.' }],
    },
    two_lives: {
      id: 'two_lives', title: 'Two different lives', mood: 'strained',
      image: slot('adv-town-end-two', 'outcome', 'A husband leaving for work early in the morning while his wife sits on a video call with family at the kitchen table, not looking up.', 'Yusuf leaving as Hafsa stays on a family video call.'),
      whatHappened: 'Yusuf’s life is the job and the coast. Hafsa’s life is the video calls home. They share a house.',
      pattern: { name: 'Parallel lives', explanation: 'Each coped alone, and the coping drew them apart.' },
      couldHaveChanged: 'Starting something together — the gathering, a routine, anything shared.',
      takeaway: 'In a new place, build at least one thing together.',
      guide: [{ id: 'lw-e-together', text: 'In a new place, we build at least one thing together.' }],
    },
    deeper_faith: {
      id: 'deeper_faith', title: 'A quieter faith', mood: 'tender',
      image: slot('adv-town-end-faith', 'outcome', 'A couple praying Fajr together at dawn in a cottage with a window overlooking the sea, peaceful.', 'Yusuf and Hafsa praying Fajr by the sea.'),
      whatHappened: 'No masjid, no community — and their own faith, practised together at home, has never been stronger.',
      pattern: { name: 'Faith at home', explanation: 'Without outside structure, they made worship their own shared habit.' },
      couldHaveChanged: 'Some community would still help.',
      takeaway: 'The home can be a masjid too.',
      guide: [{ id: 'lw-e-home', text: 'We keep worship alive at home, together.' }],
    },
    regret: {
      id: 'regret', title: 'Moving back, unhealed', mood: 'bittersweet',
      image: slot('adv-town-end-regret', 'outcome', 'A couple in a city car with boxes stacked in the back, both looking out of different windows, silent.', 'Yusuf and Hafsa driving back to the city in silence.'),
      whatHappened: 'They move back. Yusuf misses the coast; Hafsa never quite forgives the year.',
      pattern: { name: 'Unprocessed hurt', explanation: 'The loneliness was escaped, never talked through.' },
      couldHaveChanged: 'Talking about what the year cost each of them.',
      takeaway: 'Leaving a hard place does not heal what happened there. Talking does.',
      guide: [{ id: 'lw-e-talk', text: 'After a hard season, we talk about what it cost each of us.' }],
    },
    getting_there: {
      id: 'getting_there', title: 'Getting there', mood: 'steady',
      image: slot('adv-town-end-there', 'outcome', 'A couple walking along a seaside path with a dog belonging to a neighbour, chatting with an older local woman, small-town life.', 'Yusuf and Hafsa chatting with a neighbour on the seafront.'),
      whatHappened: 'Not home yet, but not a stranger’s town any more either.',
      pattern: { name: 'Slow belonging', explanation: 'Belonging grows slowly, and they kept at it.' },
      couldHaveChanged: 'Starting a gathering sooner.',
      takeaway: 'Belonging is built a little each week.',
      epilogues: [{ text: 'The online halaqa has become a lifeline for Hafsa.', when: { var: 'faith', gte: 2 } }],
      guide: [{ id: 'lw-e-week', text: 'We do one thing each week to belong where we live.' }],
    },
    honest_return: {
      id: 'honest_return', title: 'An honest return', mood: 'steady',
      image: slot('adv-town-end-honest', 'outcome', 'A couple unpacking in a small city flat, laughing as they hang a framed photo of the sea on the wall.', 'Yusuf and Hafsa hanging a photo of the sea in their city flat.'),
      whatHappened: 'They decide together to go back. The sea photo goes on the wall of their new flat.',
      pattern: { name: 'A joint decision', explanation: 'They weighed both their needs and chose together.' },
      couldHaveChanged: 'Nothing much.',
      takeaway: 'Changing your mind together is not failure.',
      guide: [{ id: 'lw-e-change', text: 'We can change our minds, as long as we decide together.' }],
    },
  },
};

function endingRoutes(): { when?: Condition; to: string }[] {
  return [
    { when: { var: 'closeness', lte: -2 }, to: 'end:two_lives' },
    { when: { all: [{ flag: 'stayed' }, { flag: 'started_circle' }, { var: 'belonging', gte: 4 }] }, to: 'end:built_community' },
    { when: { all: [{ flag: 'stayed' }, { var: 'belonging', lte: 1 }] }, to: 'end:lonely_stay' },
    { when: { all: [{ flag: 'stayed' }, { var: 'faith', gte: 3 }] }, to: 'end:deeper_faith' },
    { when: { flag: 'stayed' }, to: 'end:getting_there' },
    { when: { all: [{ flag: 'moved_back' }, { var: 'closeness', gte: 2 }] }, to: 'end:home_again' },
    { when: { all: [{ flag: 'moved_back' }, { var: 'closeness', lte: 0 }] }, to: 'end:regret' },
    { to: 'end:honest_return' },
  ];
}
