import type { Adventure, Condition } from '../../types.ts';
import { slot } from '../images.ts';

/**
 * Fajr Alarm, different levels of practice under one roof, and the line
 * between encouraging and judging. Hidden states: closeness, judgement, faith.
 */
export const fajrAlarm: Adventure = {
  id: 'adv-fajr-alarm',
  kind: 'adventure',
  title: 'Fajr Alarm',
  tagline: 'One prays every prayer at the masjid. One is just trying to keep up.',
  description:
    'Zaid has found his way back to the masjid and prays every prayer there. Amal prays too, but Fajr after night shifts is a struggle, and lately she feels watched in her own home. Play both of them through a season where encouragement and judgement look very alike.',
  minutes: 14,
  themes: ['Different levels of practice', 'Feeling judged', 'Ramadan'],
  cover: slot('concept-practice-cover', 'cover', 'A dim bedroom before dawn, a man rolling out a prayer mat while his wife sleeps, an alarm clock glowing 5:02.', 'A man unrolling a prayer mat before dawn as his wife sleeps.'),
  roles: {
    A: { name: 'Zaid', gender: 'male', sketch: 'Newly devoted, full of energy, wants to share it.' },
    B: { name: 'Amal', gender: 'female', sketch: 'A nurse on night shifts; prays, but Fajr is her hardest prayer.' },
  },
  variables: {
    closeness: { label: 'Closeness', initial: 0, readings: ['They feel watched rather than seen.', 'They are getting along.', 'They feel deeply on each other’s side.'] },
    judgement: { label: 'Judgement in the home', initial: 0, concerning: true, readings: ['Their home feels free of judgement.', 'Some pressure hangs in the air.', 'Worship has become a scorecard.'] },
    faith: { label: 'Shared faith', initial: 0, readings: ['Worship has become something they do apart.', 'They each keep their own practice.', 'Faith has become something they share.'] },
  },
  start: 'alarm',
  scenes: {
    alarm: {
      id: 'alarm',
      title: '5:02 a.m.',
      image: slot('adv-fajr-alarm-alarm', 'scene', 'A man in a dark bedroom silencing a glowing alarm clock, prayer mat over his arm, glancing at his wife asleep under the covers after a night shift, her nurse’s lanyard on the bedside table.', 'Zaid silencing the alarm while Amal sleeps.'),
      passages: [
        { text: 'Zaid’s alarm goes off for Fajr. For the last three months he has not missed a single prayer at the masjid, and he has never felt closer to Allah.' },
        { text: 'Amal got home from a twelve-hour night shift at one. She is fast asleep.' },
      ],
      decision: {
        mode: 'role',
        actor: 'A',
        prompt: 'You are Zaid. What do you do?',
        choices: [
          { id: 'wake', label: 'Wake her gently, it’s Fajr.', effects: { vars: { judgement: 1 }, flags: ['woke_her'] }, next: 'morning', beat: 'Zaid woke Amal for Fajr after her night shift.', lesson: { id: 'fa-l-wake', tag: 'Notice this', text: 'Encouragement that ignores how someone is doing can feel like supervision.' } },
          { id: 'ask', label: 'Let her sleep, and ask later how she’d like Fajr to work.', effects: { vars: { closeness: 1 } }, next: 'morning', beat: 'Zaid let Amal sleep and resolved to ask her how she wanted Fajr to work.' },
          { id: 'leave', label: 'Pray alone, and quietly hope she’ll join one day.', effects: { flags: ['silent_hope'] }, next: 'morning', beat: 'Zaid prayed alone and kept his hopes to himself.' },
        ],
      },
    },
    morning: {
      id: 'morning',
      title: 'Breakfast',
      image: slot('adv-fajr-alarm-morning', 'scene', 'A couple at a small kitchen table in late morning light, the wife in a cardigan holding a mug with tired eyes, the husband buttering toast and speaking earnestly.', 'Zaid and Amal talking over a late breakfast.'),
      passages: [
        { text: 'Late morning. Amal pads into the kitchen.' },
        { text: '“You woke me at five,” she says, before he can say good morning.', when: { flag: 'woke_her' } },
        { text: 'Zaid mentions, lightly, that he’d love them to pray Fajr together one day.', when: { notFlag: 'woke_her' } },
      ],
      decision: {
        mode: 'role',
        actor: 'B',
        prompt: 'You are Amal. What do you say?',
        choices: [
          { id: 'explain', label: 'Tell him honestly how hard Fajr is after nights, and that she does pray it, late.', effects: { vars: { closeness: 1 }, flags: ['honest'] }, next: 'friend_visit', beat: 'Amal told Zaid honestly how hard Fajr was after night shifts.' },
          { id: 'snap', label: '“I’m not a child, Zaid.”', effects: { vars: { judgement: 1, closeness: -1 } }, next: 'friend_visit', beat: 'Amal snapped that she was not a child.' },
          { id: 'pretend', label: 'Promise to try, then hit snooze every morning.', effects: { flags: ['pretending'] }, next: 'friend_visit', beat: 'Amal promised to try and quietly kept snoozing.', lesson: { id: 'fa-l-pretend', tag: 'Pattern forming', text: 'Agreeing to keep the peace postpones the conversation, and adds guilt to it.' } },
        ],
      },
    },
    friend_visit: {
      id: 'friend_visit',
      title: 'A friend at the door',
      image: slot('adv-fajr-alarm-friend', 'scene', 'Two bearded men in a living room doorway after prayer, one in a thobe gesturing casually, the host smiling uncomfortably, a woman visible in the kitchen behind them pausing mid-step.', 'Zaid’s friend making a remark in the doorway.'),
      passages: [
        { text: 'After Maghrib, Zaid’s friend from the masjid drops by. At the door he smiles: “We never see Sister Amal at Fajr, akhi. Bring her along!”' },
      ],
      decision: {
        mode: 'role',
        actor: 'A',
        prompt: 'You are Zaid. What do you say?',
        choices: [
          { id: 'defend', label: '“That’s between Amal and Allah, brother.”', effects: { vars: { closeness: 2 }, flags: ['defended'] }, next: 'overheard', beat: 'Zaid told his friend Amal’s worship was between her and Allah.' },
          { id: 'laugh', label: 'Laugh awkwardly and change the subject.', effects: { vars: { judgement: 1 } }, next: 'overheard', beat: 'Zaid laughed it off without answering.' },
          { id: 'agree', label: '“I’m working on her, insha’Allah.”', effects: { vars: { judgement: 2 }, flags: ['working_on_her'] }, next: 'overheard', beat: 'Zaid told his friend he was “working on” Amal.', lesson: { id: 'fa-l-project', tag: 'Notice this', text: 'Talking about a spouse as a project, even kindly, turns partnership into supervision.' } },
        ],
      },
    },
    overheard: {
      id: 'overheard',
      title: 'Overheard',
      turningPoint: true,
      image: slot('adv-fajr-alarm-overheard', 'turning_point', 'A woman standing still in a kitchen holding a dish towel, listening toward the hallway where two men are talking, her expression hurt and thoughtful.', 'Amal overhearing the conversation in the hall.'),
      passages: [
        { text: 'Amal heard every word from the kitchen.' },
        { text: '“That’s between Amal and Allah.” Something in her chest unclenches.', when: { flag: 'defended' } },
        { text: '“Working on her.” She puts the dish down very carefully.', when: { flag: 'working_on_her' } },
      ],
      decision: {
        mode: 'role',
        actor: 'B',
        prompt: 'You are Amal. What do you do?',
        choices: [
          { id: 'talk', label: 'After the guest leaves, sit Zaid down and talk properly.', effects: { vars: { closeness: 1 } }, next: 'talk', beat: 'Amal sat Zaid down for a proper conversation.' },
          { id: 'withdraw', label: 'Say nothing. Pray in her room, alone, from now on.', effects: { vars: { faith: -1, closeness: -1 } }, next: 'distance', beat: 'Amal withdrew and began praying alone, out of sight.' },
          { id: 'perform', label: 'Start going to Fajr, mostly so nobody can say anything.', effects: { flags: ['performing'], vars: { judgement: 1 } }, next: 'distance', beat: 'Amal began going to Fajr mainly to stop the comments.', lesson: { id: 'fa-l-perform', tag: 'Notice this', text: 'Worship done for an audience can quietly empty it of meaning.' } },
        ],
      },
    },
    talk: {
      id: 'talk',
      title: 'The kitchen table',
      image: slot('adv-fajr-alarm-talk', 'scene', 'A husband and wife sitting across a small kitchen table at night, two cups of tea, his hands open, her arms relaxed, a calm honest conversation.', 'Zaid and Amal talking at the kitchen table.'),
      passages: [{ text: 'They sit with two cups of tea. For once, nobody is trying to win.' }],
      lessons: [{ id: 'fa-l-joint', tag: 'Joint decision', text: 'Choose together. If you pick differently, talk it through and choose again.' }],
      decision: {
        mode: 'joint',
        prompt: 'Together: how will worship work in your home?',
        choices: [
          { id: 'together', label: 'Pray together when we can, never as pressure.', effects: { vars: { closeness: 1, faith: 1 }, flags: ['no_pressure'] }, next: 'ramadan', beat: 'They agreed to pray together when they could, without pressure.' },
          { id: 'consent', label: 'Zaid wakes her only on days she asks.', effects: { vars: { closeness: 1, judgement: -1 }, flags: ['consent_wake'] }, next: 'ramadan', beat: 'They agreed Zaid would wake Amal only when she asked.' },
          { id: 'own', label: 'Each keeps their own practice, privately.', effects: { vars: { faith: -1 } }, next: 'ramadan', beat: 'They agreed to keep worship private to each of them.' },
        ],
      },
    },
    distance: {
      id: 'distance',
      title: 'Separate rooms, separate mats',
      image: slot('adv-fajr-alarm-distance', 'scene', 'Two prayer mats in two different rooms of the same flat, seen through an open doorway, a man praying in one, a woman praying in the other, soft lamplight.', 'Zaid and Amal praying in separate rooms.'),
      passages: [{ text: 'A week of politeness. Two prayer mats, two rooms.' }],
      decision: {
        mode: 'private',
        prompt: 'What do you do this week?',
        choices: [
          { id: 'dua', label: 'Make du’a for the other, quietly.', effects: { vars: { faith: 1 } }, next: 'ramadan', beat: 'One of them made quiet du’a for the other.' },
          { id: 'raise', label: 'Bring it up again, gently.', effects: { vars: { closeness: 1 } }, next: 'talk', beat: 'One of them raised it again.' },
          { id: 'leave', label: 'Leave it alone.', effects: { vars: { judgement: 1 } }, next: 'ramadan', beat: 'One of them left it alone.' },
        ],
        combos: [
          { pair: ['raise', 'raise'], next: 'talk', beat: 'Both of them raised it on the same evening.' },
          { pair: ['leave', 'leave'], next: 'end:parallel', beat: 'Both of them left it alone.' },
          { pair: ['dua', 'dua'], next: 'ramadan', beat: 'Without knowing, both made du’a for the other all week.', effects: { vars: { closeness: 1 } } },
        ],
        diverge: 'ramadan',
      },
    },
    ramadan: {
      id: 'ramadan',
      title: 'Ramadan arrives',
      turningPoint: true,
      image: slot('adv-fajr-alarm-ramadan', 'turning_point', 'A couple preparing suhoor in a small kitchen before dawn, one pouring water, one setting dates on a plate, a crescent moon outside the window.', 'Zaid and Amal preparing suhoor before dawn.'),
      passages: [
        { text: 'Ramadan begins. Suhoor at four, and Amal is on nights for the first week.' },
        { text: 'Amal has been going to Fajr every day. She has never felt further from it.', when: { flag: 'performing' } },
      ],
      decision: {
        mode: 'private',
        prompt: 'What do you hope this Ramadan looks like?',
        choices: [],
        byRole: {
          A: [
            { id: 'ask', label: 'Ask Amal what she wants from Ramadan.', effects: { vars: { closeness: 1 } }, next: 'quiet_night', beat: 'Zaid asked Amal what she wanted from Ramadan.' },
            { id: 'plan', label: 'Plan a suhoor-and-Fajr routine for both of them.', effects: { vars: { judgement: 1 } }, next: 'quiet_night', beat: 'Zaid planned a routine for both of them.' },
            { id: 'masjid', label: 'Spend every night at the masjid.', effects: { vars: { faith: 1, closeness: -1 } }, next: 'lonely', beat: 'Zaid spent every night at the masjid.' },
          ],
          B: [
            { id: 'goal', label: 'Suggest a small shared goal, a juz together each week.', effects: { vars: { faith: 1, closeness: 1 } }, next: 'quiet_night', beat: 'Amal suggested reading a juz together each week.' },
            { id: 'join', label: 'Join him for suhoor and Fajr when she can.', effects: { vars: { faith: 1 } }, next: 'quiet_night', beat: 'Amal joined him for suhoor and Fajr when she could.' },
            { id: 'own', label: 'Keep her own Ramadan, in her own time.', next: 'lonely', beat: 'Amal kept her own Ramadan, in her own time.' },
          ],
        },
        combos: [
          { pair: ['ask', 'goal'], next: 'quiet_night', beat: 'Zaid asked what she wanted; Amal had an answer ready, a juz together each week.', effects: { vars: { closeness: 1, faith: 1 } } },
          { pair: ['masjid', 'own'], next: 'lonely', beat: 'Zaid spent his nights at the masjid; Amal spent hers alone.', effects: { vars: { closeness: -1 } } },
          { pair: ['plan', 'own'], next: 'lonely', beat: 'Zaid’s carefully planned routine met Amal’s wish for her own time.', effects: { vars: { judgement: 1 } } },
        ],
        diverge: 'quiet_night',
      },
    },
    lonely: {
      id: 'lonely',
      title: 'Iftar for one',
      image: slot('adv-fajr-alarm-lonely', 'scene', 'A woman breaking her fast alone at a kitchen counter with a single date and glass of water, phone showing a message, the room quiet.', 'Amal breaking her fast alone.'),
      passages: [{ text: 'Amal breaks her fast alone again. Zaid will eat at the masjid.' }],
      decision: {
        mode: 'role',
        actor: 'B',
        prompt: 'You are Amal. What do you do?',
        choices: [
          { id: 'miss', label: 'Message him: “I miss you at iftar.”', effects: { vars: { closeness: 1 } }, next: 'last_night', beat: 'Amal told Zaid she missed him at iftar.' },
          { id: 'own', label: 'Build her own quiet Ramadan without him.', effects: { vars: { closeness: -1 } }, next: 'last_night', beat: 'Amal built a quiet Ramadan without him.' },
        ],
      },
    },
    quiet_night: {
      id: 'quiet_night',
      title: 'The twenty-seventh night',
      image: slot('adv-fajr-alarm-qadr', 'scene', 'A husband and wife praying side by side in their living room late at night, lamps low, a Qur’an on a stand between them, serene.', 'Zaid and Amal praying together at night.'),
      passages: [{ text: 'The twenty-seventh night. Amal is off work.' }],
      decision: {
        mode: 'role',
        actor: 'A',
        prompt: 'You are Zaid. What do you do?',
        choices: [
          { id: 'home', label: 'Stay home and pray beside her.', effects: { vars: { closeness: 1, faith: 1 } }, next: 'last_night', beat: 'Zaid stayed home on the twenty-seventh night to pray beside Amal.' },
          { id: 'thank', label: 'Go to the masjid, but first thank her for her patience with him.', effects: { vars: { closeness: 1, judgement: -1 } }, next: 'last_night', beat: 'Zaid thanked Amal for her patience before going to the masjid.' },
        ],
      },
    },
    last_night: {
      id: 'last_night',
      title: 'After Eid',
      image: slot('adv-fajr-alarm-after', 'scene', 'A couple on a balcony in the morning after Eid, sharing tea and sweets, talking reflectively, festive lights still up.', 'Zaid and Amal reflecting after Eid.'),
      passages: [{ text: 'Eid is over. The question is what stays.' }],
      decision: {
        mode: 'joint',
        prompt: 'Together: what do you keep from this season?',
        choices: [
          { id: 'one', label: 'One prayer together every day.', effects: { flags: ['kept_one'], vars: { faith: 1 } }, next: { routes: endingRoutes() }, beat: 'They kept one prayer together every day.' },
          { id: 'ask', label: 'A rule: encouragement only when asked.', effects: { flags: ['rule_ask'], vars: { judgement: -1 } }, next: { routes: endingRoutes() }, beat: 'They agreed encouragement would come only when asked.' },
          { id: 'none', label: 'Nothing formal, just goodwill.', next: { routes: endingRoutes() }, beat: 'They kept nothing formal, just goodwill.' },
        ],
      },
    },
  },
  endings: {
    growing: {
      id: 'growing', title: 'Growing together', mood: 'renewed',
      image: slot('adv-fajr-alarm-end-growing', 'outcome', 'A husband and wife walking home from the masjid together at dawn, sky pink, sharing a quiet laugh.', 'Zaid and Amal walking home from Fajr together.'),
      whatHappened: 'Fajr is still hard after nights. But now, some mornings, Amal wakes Zaid.',
      pattern: { name: 'Invitation over pressure', explanation: 'Faith grew once it stopped being measured.' },
      couldHaveChanged: 'Asking first, from the very first morning.',
      takeaway: 'You cannot drag someone closer to Allah. You can walk beside them.',
      epilogues: [{ text: 'They finish the Qur’an together by the next Ramadan.', when: { flag: 'kept_one' } }],
      guide: [{ id: 'fa-e-walk', text: 'We invite each other to worship; we never keep score.' }],
    },
    kindness: {
      id: 'kindness', title: 'Only when asked', mood: 'steady',
      image: slot('adv-fajr-alarm-end-kindness', 'outcome', 'A woman setting her own alarm on a phone with a small smile while her husband reads nearby, morning light.', 'Amal setting her own alarm.'),
      whatHappened: 'Zaid stops waking her. Six weeks later, Amal asks him to, on her days off.',
      pattern: { name: 'Respecting autonomy', explanation: 'Making encouragement opt-in removed the shame from it.' },
      couldHaveChanged: 'Agreeing this before the friend’s comment would have spared a hard week.',
      takeaway: 'Encouragement lands when it is welcome.',
      guide: [{ id: 'fa-e-ask', text: 'Reminders about worship only when asked for.' }],
    },
    performance: {
      id: 'performance', title: 'Praying for an audience', mood: 'fragile',
      image: slot('adv-fajr-alarm-end-performance', 'outcome', 'A woman standing at the back of a women’s section of a masjid at dawn, present but distant, looking at her phone screen dimly.', 'Amal at Fajr, present but far away.'),
      whatHappened: 'Amal never misses Fajr now. She has never felt emptier in it.',
      pattern: { name: 'Compliance without conviction', explanation: 'Pressure produced the behaviour and drained the meaning.' },
      couldHaveChanged: 'Amal saying how the comment felt, and Zaid listening, instead of performing to end it.',
      takeaway: 'Outward practice without inner peace is worth talking about, not hiding.',
      guide: [{ id: 'fa-e-heart', text: 'We talk about how worship feels, not just whether it happened.' }],
    },
    judged: {
      id: 'judged', title: 'A scorecard home', mood: 'strained',
      image: slot('adv-fajr-alarm-end-judged', 'outcome', 'A tense couple at a dinner table, the husband glancing at the clock on the wall, the wife looking away, a prayer timetable stuck on the fridge.', 'Zaid glancing at the clock while Amal looks away.'),
      whatHappened: 'Every prayer has become a test Amal is either passing or failing in Zaid’s eyes.',
      pattern: { name: 'Religious policing', explanation: 'Zeal without gentleness turned a shared faith into supervision.' },
      couldHaveChanged: 'Zaid defending her privacy in front of his friend, and asking rather than waking.',
      takeaway: 'Gentleness is part of the deen, not an exception to it.',
      guide: [{ id: 'fa-e-gentle', text: 'We correct each other privately, gently, and rarely.' }],
    },
    parallel: {
      id: 'parallel', title: 'Parallel prayer mats', mood: 'bittersweet',
      image: slot('adv-fajr-alarm-end-parallel', 'outcome', 'Two prayer mats rolled up separately on two different shelves in the same hallway.', 'Two prayer mats on separate shelves.'),
      whatHappened: 'They both pray. They just never do it together, and never talk about it.',
      pattern: { name: 'Avoidance', explanation: 'Silence kept the peace and lost the shared part of their faith.' },
      couldHaveChanged: 'Either of them raising it again, it did not matter who.',
      takeaway: 'Faith kept private by default can become faith kept apart.',
      guide: [{ id: 'fa-e-share', text: 'We share something of our worship, even something small.' }],
    },
    defended: {
      id: 'defended', title: 'He took her side', mood: 'tender',
      image: slot('adv-fajr-alarm-end-defended', 'outcome', 'A wife resting her head on her husband’s shoulder on a sofa, both relaxed, a prayer mat folded beside them.', 'Amal resting on Zaid’s shoulder.'),
      whatHappened: 'Years later, Amal still remembers the night he said “That’s between Amal and Allah.”',
      pattern: { name: 'Loyalty in public', explanation: 'Protecting a spouse in front of others built more trust than any conversation.' },
      couldHaveChanged: 'Little, though speaking about Fajr earlier would have helped.',
      takeaway: 'Defend your spouse in public; discuss in private.',
      epilogues: [{ text: 'His friend apologises to Amal at Eid.', when: { var: 'closeness', gte: 4 } }],
      guide: [{ id: 'fa-e-public', text: 'We never criticise each other’s deen in front of others.' }],
    },
    one_prayer: {
      id: 'one_prayer', title: 'One prayer a day', mood: 'steady',
      image: slot('adv-fajr-alarm-end-one', 'outcome', 'A couple praying Isha together in a small living room, side by side, evening lamp light.', 'Zaid and Amal praying Isha together.'),
      whatHappened: 'Fajr stays hard. Isha becomes theirs, every night, together.',
      pattern: { name: 'Finding shared ground', explanation: 'Instead of fighting over the hardest prayer, they found an easier one to share.' },
      couldHaveChanged: 'Starting there from the beginning.',
      takeaway: 'Start where it is easy to meet.',
      guide: [{ id: 'fa-e-one', text: 'We pray at least one prayer together each day.' }],
    },
    own_pace: {
      id: 'own_pace', title: 'At their own pace', mood: 'steady',
      image: slot('adv-fajr-alarm-end-pace', 'outcome', 'A couple walking slowly through a park at sunset, at slightly different paces but close together.', 'Zaid and Amal walking at their own pace.'),
      whatHappened: 'Not resolved, not broken. Two people at different places, learning not to measure each other.',
      pattern: { name: 'Different spiritual seasons', explanation: 'Spouses rarely grow at the same speed; the question is how they treat the gap.' },
      couldHaveChanged: 'A clear agreement about encouragement.',
      takeaway: 'Your spouse’s journey is theirs. Your patience is yours.',
      epilogues: [{ text: 'Some unspoken pressure still hangs over the alarm clock.', when: { var: 'judgement', gte: 2 } }],
      guide: [{ id: 'fa-e-pace', text: 'We give each other room to grow at our own pace.' }],
    },
  },
};

function endingRoutes(): { when?: Condition; to: string }[] {
  return [
    { when: { var: 'judgement', gte: 3 }, to: 'end:judged' },
    { when: { flag: 'performing' }, to: 'end:performance' },
    { when: { all: [{ var: 'closeness', gte: 3 }, { var: 'faith', gte: 2 }] }, to: 'end:growing' },
    { when: { all: [{ flag: 'defended' }, { var: 'closeness', gte: 2 }] }, to: 'end:defended' },
    { when: { any: [{ flag: 'rule_ask' }, { flag: 'consent_wake' }] }, to: 'end:kindness' },
    { when: { flag: 'kept_one' }, to: 'end:one_prayer' },
    { to: 'end:own_pace' },
  ];
}
