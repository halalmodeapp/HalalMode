import type { Adventure, Condition } from '../../types.ts';
import { slot } from '../images.ts';

/**
 * Read at 11:42 — a work trip, an unanswered message, a liked photo, and the
 * anxious–avoidant loop. Hidden states: trust, closeness, loop.
 */
export const readAt1142: Adventure = {
  id: 'adv-read-at-1142',
  kind: 'adventure',
  title: 'Read at 11:42',
  tagline: 'One message. Five hours of silence. A liked photo.',
  description:
    'Yusuf is away for a week on a work trip. Maryam’s message shows “read” — and no reply. Play both sides of a week where a bad day, a phone and two different ways of coping can draw a couple closer or start a loop neither can stop.',
  minutes: 15,
  themes: ['Communication breakdowns', 'Feeling ignored', 'Social media', 'Jealousy', 'Anxious/avoidant loop'],
  cover: slot('adv-1142-cover', 'cover', 'A phone lying on a bedside table showing a single unanswered message with a tiny “read 11:42” label, a hijab folded beside it, morning light.', 'A phone on a bedside table showing an unanswered message.'),
  roles: {
    A: { name: 'Yusuf', gender: 'male', sketch: 'Goes quiet when he is stressed. Thinks of it as protecting her from his mood.' },
    B: { name: 'Maryam', gender: 'female', sketch: 'Feels distance quickly. Reaches out when she senses it.' },
  },
  variables: {
    trust: { label: 'Trust', initial: 0, readings: ['Trust has taken a knock.', 'Trust is holding.', 'Trust has grown.'] },
    closeness: { label: 'Closeness', initial: 0, readings: ['They feel distant.', 'They feel connected enough.', 'They feel close.'] },
    loop: { label: 'The loop', initial: 0, readings: ['The pursue–withdraw loop has quietened.', 'The loop flickers now and then.', 'The pursue–withdraw loop is running them.'] },
  },
  start: 'the_message',
  scenes: {
    the_message: {
      id: 'the_message',
      title: 'Read, 11:42',
      image: slot('adv-1142-message', 'scene', 'A young woman at her office desk glancing at her phone, the screen showing a message marked read with no reply, a half-finished coffee.', 'Maryam glancing at an unanswered message at work.'),
      passages: [
        { text: 'Eight months married. Yusuf is in Manchester for a week of client meetings. At 11:40 Maryam sends: “How did the big presentation go? 🤍”' },
        { text: 'Read, 11:42. Then nothing. One hour. Three hours. Five.' },
      ],
      decision: {
        mode: 'role',
        actor: 'B',
        prompt: 'You are Maryam. What do you do?',
        choices: [
          {
            id: 'double',
            label: 'Send another: “??? Is everything okay?”',
            effects: { vars: { loop: 1 }, flags: ['double_text'] },
            next: 'yusuf_meeting',
            beat: 'Maryam sent a second, more anxious message.',
          },
          {
            id: 'wait',
            label: 'Assume he is busy and get on with her day.',
            effects: { vars: { trust: 1 } },
            next: 'yusuf_meeting',
            beat: 'Maryam assumed he was busy and got on with her day.',
          },
          {
            id: 'check',
            label: 'Open Instagram to see if he has been online.',
            effects: { vars: { loop: 1 }, flags: ['checked_insta'] },
            next: 'the_like',
            beat: 'Maryam went looking for signs of him online.',
            lesson: { id: 'm-l-search', tag: 'Notice this', text: 'Searching for evidence when anxious tends to find some — whether or not it means anything.' },
          },
        ],
      },
    },

    the_like: {
      id: 'the_like',
      title: 'The like',
      image: slot('adv-1142-like', 'scene', 'Close-up of a young woman in a hijab lit by a phone screen showing a social media photo of a smiling graduate in a gown, her expression a mix of hurt and suspicion.', 'Maryam looking at a liked photo on her phone.'),
      passages: [
        { text: 'There it is. Forty minutes ago, Yusuf liked a photo — a former colleague’s graduation picture. She is smiling in her gown.' },
        { text: 'He has time for that, but not for her?' },
      ],
      decision: {
        mode: 'role',
        actor: 'B',
        prompt: 'You are Maryam. What now?',
        choices: [
          {
            id: 'screenshot',
            label: 'Send him the screenshot: “So you DO have time.”',
            effects: { vars: { trust: -2, loop: 1 }, flags: ['accused'] },
            next: 'yusuf_meeting',
            beat: 'Maryam sent Yusuf a screenshot of the like with an accusation.',
          },
          {
            id: 'later',
            label: 'Put the phone face down. Ask him calmly when they speak.',
            effects: { flags: ['will_ask'] },
            next: 'yusuf_meeting',
            beat: 'Maryam decided to ask about it calmly later.',
            lesson: { id: 'm-l-later', tag: 'Self-soothing', text: 'Waiting until you are calm isn’t avoiding. It’s choosing a better moment.' },
          },
          {
            id: 'post',
            label: 'Post a story: a quote about “people who make time for you”.',
            effects: { vars: { trust: -1, loop: 1 }, flags: ['passive_post'] },
            next: 'yusuf_meeting',
            beat: 'Maryam posted a pointed quote instead of saying anything directly.',
            lesson: { id: 'm-l-indirect', tag: 'Notice this', text: 'Indirect messages invite guessing. He may miss it entirely, or feel publicly shamed.' },
          },
        ],
      },
    },

    yusuf_meeting: {
      id: 'yusuf_meeting',
      title: 'Meanwhile, in Manchester',
      image: slot('adv-1142-yusuf', 'scene', 'A young man sitting alone in a corporate stairwell, tie loosened, staring at his phone without typing, grey city light.', 'Yusuf alone in a stairwell, staring at his phone.'),
      passages: [
        { text: 'The presentation went badly. His manager picked it apart in front of the client. Yusuf has spent the afternoon in a stairwell, replaying it.' },
        { text: 'He read Maryam’s message at 11:42 and could not face writing “it went terribly”.' },
        { text: 'Now there is a second message: “??? Is everything okay?”', when: { flag: 'double_text' } },
        { text: 'And a screenshot of the like. He scrolled past that photo half asleep this morning.', when: { flag: 'accused' } },
        { text: 'A friend messages him: “Is Maryam okay? Saw her story.”', when: { flag: 'passive_post' } },
      ],
      decision: {
        mode: 'role',
        actor: 'A',
        prompt: 'You are Yusuf. What do you do?',
        choices: [
          {
            id: 'curt',
            label: 'Reply: “Busy. Talk later.”',
            effects: { vars: { loop: 1 }, flags: ['curt'] },
            next: 'evening_call',
            beat: 'Yusuf replied “Busy. Talk later.”',
          },
          {
            id: 'call',
            label: 'Call her for two minutes: “Rough day. I’ll call properly tonight at nine.”',
            effects: { vars: { trust: 2 }, flags: ['gave_return'] },
            next: 'evening_call',
            beat: 'Yusuf called briefly and told her when he would call properly.',
            lesson: { id: 'm-l-return', tag: 'Rule 3', text: 'Space with a return time is completely different from disappearing.' },
          },
          {
            id: 'silent',
            label: 'Don’t reply until he feels better.',
            effects: { vars: { loop: 2 }, flags: ['silent'] },
            next: 'silent_evening',
            beat: 'Yusuf stayed silent until he felt better.',
            lesson: { id: 'm-l-protect', tag: 'Notice this', text: 'He thinks silence protects her from his mood. To her, it feels like being shut out.' },
          },
        ],
      },
    },

    silent_evening: {
      id: 'silent_evening',
      title: 'Nine o’clock, ten, eleven',
      turningPoint: true,
      image: slot('adv-1142-night', 'turning_point', 'Split scene at night: a man in a hotel room lying awake with his phone face down; a woman at home sitting up in bed holding her phone, both lit by screen glow.', 'Yusuf and Maryam awake in separate cities.'),
      passages: [
        { text: 'No call. In a hotel room, Yusuf lies on the bed with his phone face down. At home, Maryam sits up in bed with hers face up.' },
      ],
      lessons: [{ id: 'm-l-private', tag: 'Private choice', text: 'Each of you decides what your character does tonight, without knowing what the other is doing.' }],
      decision: {
        mode: 'private',
        prompt: 'Tonight, what do you do?',
        choices: [],
        byRole: {
          A: [
            { id: 'explain', label: 'Write a long, honest message about the day.', effects: { vars: { trust: 1, loop: -1 } }, next: 'evening_call', beat: 'Yusuf wrote a long, honest message about his day.' },
            { id: 'sorry', label: 'Send “Sorry, bad day. Night x” and sleep.', next: 'evening_call', beat: 'Yusuf sent a short goodnight.' },
            { id: 'nothing', label: 'Stay silent until morning.', effects: { vars: { loop: 1 } }, next: 'the_loop', beat: 'Yusuf stayed silent until morning.' },
          ],
          B: [
            { id: 'ring', label: 'Call him. And again. And again.', effects: { vars: { loop: 2 } }, next: 'the_loop', beat: 'Maryam called again and again.' },
            { id: 'one', label: 'One message: “I’m worried. Just let me know you’re okay.”', effects: { vars: { trust: 1 } }, next: 'evening_call', beat: 'Maryam sent one calm message saying she was worried.' },
            { id: 'freeze', label: 'Go silent too. Two can play this.', effects: { vars: { loop: 1, closeness: -1 } }, next: 'cold_war', beat: 'Maryam went silent too.' },
          ],
        },
        combos: [
          { pair: ['nothing', 'ring'], next: 'the_loop', beat: 'Yusuf stayed silent while Maryam called again and again — each move feeding the other.', effects: { vars: { loop: 1 } } },
          { pair: ['nothing', 'freeze'], next: 'cold_war', beat: 'Both of them went silent.' },
          { pair: ['sorry', 'ring'], next: 'the_loop', beat: 'Yusuf’s short goodnight crossed with Maryam’s calls; he muted his phone.' },
          { pair: ['explain', 'one'], next: 'morning_after', beat: 'Their messages crossed — his honest one, her calm one. Both felt understood.', effects: { vars: { closeness: 2 } } },
          { pair: ['explain', 'freeze'], next: 'evening_call', beat: 'Yusuf wrote honestly; Maryam, who had gone silent, read it at midnight and softened.' },
          { pair: ['nothing', 'one'], next: 'morning_after', beat: 'Maryam’s single calm message was waiting when Yusuf woke.' },
        ],
        diverge: 'evening_call',
      },
    },

    the_loop: {
      id: 'the_loop',
      title: 'The loop',
      image: slot('adv-1142-loop', 'scene', 'A hotel bed with a phone buzzing beside a man who presses his palms to his eyes, the screen showing many missed calls, a circular gold line looping around the scene.', 'Yusuf overwhelmed by missed calls.'),
      turningPoint: true,
      passages: [
        { text: 'The phone keeps buzzing. Every missed call makes Yusuf feel more crowded. Every unanswered call makes Maryam more frightened. Finally he picks up, sharp: “What?”' },
      ],
      lessons: [{ id: 'm-l-loop', tag: 'Rule 3', text: 'An anxious/avoidant loop is forming here. She is asking “are we okay?”; he is asking “can I breathe?”' }],
      decision: {
        mode: 'role',
        actor: 'A',
        prompt: 'You are Yusuf. What do you say?',
        choices: [
          { id: 'space', label: '“Can you just give me some space?!” — and hang up.', effects: { vars: { trust: -2, loop: 1 } }, next: 'cold_war', beat: 'Yusuf demanded space and hung up.' },
          {
            id: 'name',
            label: '“I think we’re in a loop. I’m drained, not angry with you. Can we talk at nine tomorrow?”',
            effects: { vars: { trust: 2, loop: -2 }, flags: ['named_loop'] },
            next: 'morning_after',
            beat: 'Yusuf named the loop and gave a time to talk.',
            lesson: { id: 'm-l-named', tag: 'Breaking the loop', text: 'Naming the pattern makes it the shared problem — instead of each other.' },
          },
          { id: 'pretend', label: '“Sorry, I’m fine. Everything’s fine.”', effects: { flags: ['pretended'], vars: { closeness: -1 } }, next: 'return_home', beat: 'Yusuf insisted everything was fine.' },
        ],
      },
    },

    evening_call: {
      id: 'evening_call',
      title: 'The call',
      image: slot('adv-1142-call', 'scene', 'A young woman on her sofa with her phone to her ear, listening with soft eyes, a cup of tea on her knee, a city window at night behind her.', 'Maryam listening to Yusuf on the phone.'),
      passages: [
        { text: 'They are finally on the phone. Yusuf tells her about the presentation, the manager, the stairwell.' },
        { text: '“Busy. Talk later.” still stings a little.', when: { flag: 'curt' } },
        { text: 'The liked photo is sitting in the back of Maryam’s mind.', when: { flag: 'checked_insta' } },
      ],
      decision: {
        mode: 'role',
        actor: 'B',
        prompt: 'You are Maryam. What do you do?',
        choices: [
          { id: 'like', label: 'Bring up the liked photo.', when: { flag: 'checked_insta' }, next: 'the_like_talk', beat: 'Maryam brought up the liked photo.' },
          { id: 'listen', label: 'Just listen to his day.', effects: { vars: { closeness: 2 } }, next: 'return_home', beat: 'Maryam simply listened to his day.' },
          { id: 'feel', label: 'Listen — then tell him calmly how the silence felt.', effects: { vars: { trust: 1, closeness: 1 }, flags: ['said_feeling'] }, next: 'return_home', beat: 'Maryam listened, then calmly told him how the silence felt.' },
        ],
      },
    },

    the_like_talk: {
      id: 'the_like_talk',
      title: 'About that photo',
      image: slot('adv-1142-liketalk', 'scene', 'Split view of a couple on a phone call, the man in a hotel room rubbing his neck, the woman at home holding her phone carefully, both serious.', 'Yusuf and Maryam on a difficult phone call.'),
      passages: [{ text: '“Can I ask about something? I saw you liked her photo today, when you weren’t replying to me.”', when: { notFlag: 'accused' } }, { text: 'The screenshot is still there in the chat between them.', when: { flag: 'accused' } }],
      decision: {
        mode: 'role',
        actor: 'A',
        prompt: 'You are Yusuf. How do you respond?',
        choices: [
          { id: 'defensive', label: '“You’re checking up on me now?”', effects: { vars: { trust: -1 }, flags: ['defensive'] }, next: 'jealousy_fork', beat: 'Yusuf got defensive about being checked up on.' },
          {
            id: 'open',
            label: '“I scrolled past it half asleep. But if it bothers you, let’s agree what we’re both comfortable with online.”',
            effects: { vars: { trust: 2 }, flags: ['sm_agreement'] },
            next: 'return_home',
            beat: 'Yusuf explained and offered to agree online boundaries together.',
            lesson: { id: 'm-l-open', tag: 'Rule 2', text: 'He answered the worry underneath, not just the facts.' },
          },
          { id: 'laugh', label: 'Laugh: “It’s just a like, Maryam.”', effects: { vars: { closeness: -1, loop: 1 } }, next: 'jealousy_fork', beat: 'Yusuf laughed it off.', lesson: { id: 'm-l-laugh', tag: 'Notice this', text: 'This response may make your partner feel dismissed. The like was never really the point.' } },
        ],
      },
    },

    jealousy_fork: {
      id: 'jealousy_fork',
      title: 'What’s underneath',
      image: slot('adv-1142-jealousy', 'scene', 'A young woman sitting alone on a kitchen floor against a cupboard, phone face down beside her, looking up thoughtfully, evening light through blinds.', 'Maryam alone on the kitchen floor, thinking.'),
      passages: [{ text: 'Silence on the line. Maryam can feel the conversation slipping.' }],
      decision: {
        mode: 'role',
        actor: 'B',
        prompt: 'You are Maryam. What do you do?',
        choices: [
          { id: 'monitor', label: 'Drop it — and quietly keep an eye on his activity.', effects: { vars: { loop: 2 }, flags: ['monitoring'] }, next: 'return_home', beat: 'Maryam dropped it out loud and kept watching his activity.' },
          { id: 'under', label: '“It wasn’t really the photo. I felt invisible today, and then I saw that.”', effects: { vars: { trust: 1, closeness: 2 } }, next: 'return_home', beat: 'Maryam said what was underneath: she had felt invisible.', lesson: { id: 'm-l-under', tag: 'Underneath', text: 'Jealousy is often loneliness wearing armour.' } },
          { id: 'passwords', label: '“If there’s nothing to hide, give me your passwords.”', effects: { vars: { trust: -2 }, flags: ['passwords'] }, next: 'return_home', beat: 'Maryam asked for his passwords.' },
        ],
      },
    },

    cold_war: {
      id: 'cold_war',
      title: 'Short texts',
      image: slot('adv-1142-coldwar', 'scene', 'Two phone screens side by side showing short replies like ok and a thumbs up, one held by a man in an office, one by a woman on a bus, grey tones.', 'Short, cold text messages on two phones.'),
      passages: [{ text: 'Three days of “ok”, “fine” and “👍”. He flies home on Friday.' }],
      decision: {
        mode: 'joint',
        prompt: 'Together: how will you break the silence when he lands?',
        choices: [
          { id: 'talk', label: 'Talk properly the night he gets home.', effects: { vars: { closeness: 1 } }, next: 'return_home', beat: 'They agreed to talk properly the night he got home.' },
          { id: 'bury', label: 'Pretend it never happened.', effects: { flags: ['buried'], vars: { loop: 1 } }, next: 'return_home', beat: 'They agreed, silently, to pretend it never happened.' },
          { id: 'elder', label: 'Ask a trusted elder to help them talk.', effects: { vars: { trust: 1 }, flags: ['elder'] }, next: 'the_talk', beat: 'They asked a trusted elder to help them talk.' },
        ],
      },
    },

    morning_after: {
      id: 'morning_after',
      title: 'Nine o’clock',
      image: slot('adv-1142-morning', 'scene', 'Early morning after Fajr, a young woman by a window with the sunrise, smiling slightly during a phone call, a prayer mat folded on a chair.', 'Maryam on a morning call after Fajr.'),
      passages: [{ text: 'At nine, exactly when he said, Yusuf calls.', when: { flag: 'named_loop' } }, { text: 'In the morning, the first thing either of them does is reach for the phone — to call, not to check.' }],
      decision: {
        mode: 'role',
        actor: 'B',
        prompt: 'You are Maryam. What do you say?',
        choices: [
          { id: 'both', label: '“I chased you last night. I get scared when you go quiet. I want to understand it.”', effects: { vars: { closeness: 2, loop: -1 }, flags: ['both_named'] }, next: 'return_home', beat: 'Maryam named her own part in the loop.' },
          { id: 'accept', label: 'Accept his apology and move on.', effects: { vars: { closeness: 1 } }, next: 'return_home', beat: 'Maryam accepted the apology and moved on.' },
        ],
      },
    },

    return_home: {
      id: 'return_home',
      title: 'Friday night',
      turningPoint: true,
      image: slot('adv-1142-home', 'turning_point', 'A man arriving home with a suitcase at night, his wife at the open door, both hesitating on the threshold, warm hallway light.', 'Yusuf arriving home with a suitcase as Maryam opens the door.'),
      passages: [
        { text: 'Friday. Yusuf comes through the door with his suitcase. They hug — a little carefully.' },
        { text: 'He said everything was fine. Neither of them believes it.', when: { flag: 'pretended' } },
        { text: 'Maryam knows exactly how long he was online last night.', when: { flag: 'monitoring' } },
      ],
      decision: {
        mode: 'private',
        prompt: 'What do you want to do tonight?',
        choices: [
          { id: 'honest', label: 'Have the honest conversation.', next: 'the_talk', beat: 'One of them wanted the honest conversation.' },
          { id: 'enjoy', label: 'Just enjoy being together. Talk another day.', next: 'sweet_unsaid', beat: 'One of them wanted to simply enjoy being together.' },
          { id: 'everything', label: 'Bring up everything that went wrong this week.', effects: { vars: { loop: 1 } }, next: 'the_fight', beat: 'One of them wanted to go through everything that went wrong.' },
        ],
        combos: [
          { pair: ['honest', 'honest'], next: 'the_talk', beat: 'Both of them wanted the honest conversation.', effects: { vars: { closeness: 1 } } },
          { pair: ['enjoy', 'enjoy'], next: 'sweet_unsaid', beat: 'Both of them chose a gentle evening over a hard talk.' },
          { pair: ['honest', 'enjoy'], next: 'the_talk', beat: 'One wanted to talk; the other agreed, a little reluctantly.' },
          { pair: ['everything', 'everything'], next: 'the_fight', beat: 'Both arrived ready with a list.', effects: { vars: { trust: -1 } } },
        ],
        diverge: 'the_fight',
      },
    },

    the_fight: {
      id: 'the_fight',
      title: 'The list',
      image: slot('adv-1142-fight', 'scene', 'A living room with a suitcase still by the door, a husband and wife standing apart mid-argument, both gesturing, a coat half off, harsh overhead light.', 'Yusuf and Maryam arguing by his suitcase.'),
      passages: [{ text: 'It starts with “And another thing…” and gets louder from there.' }],
      decision: {
        mode: 'role',
        actor: 'A',
        prompt: 'You are Yusuf. What do you do?',
        choices: [
          { id: 'leave', label: 'Grab his keys: “I need air.” No time given.', effects: { vars: { loop: 2, trust: -1 } }, next: { routes: endingRoutes() }, beat: 'Yusuf left the house without saying when he would be back.' },
          { id: 'stay', label: 'Sit down: “Go on. I want to hear it.”', effects: { vars: { trust: 1 } }, next: 'the_talk', beat: 'Yusuf sat down and listened.' },
          { id: 'fire', label: 'Fire back: “What about your forty missed calls?”', effects: { vars: { trust: -1, closeness: -1 } }, next: { routes: endingRoutes() }, beat: 'Yusuf fired back with her missed calls.' },
        ],
      },
    },

    sweet_unsaid: {
      id: 'sweet_unsaid',
      title: 'A lovely weekend',
      image: slot('adv-1142-weekend', 'scene', 'A couple walking in a park in autumn holding takeaway cups and laughing, leaves falling, a hint of something unspoken in the wife\'s glance.', 'Yusuf and Maryam enjoying a weekend walk.'),
      passages: [{ text: 'Takeaway, a long walk, laughing at old photos. On Sunday night he mentions another trip next month.' }],
      decision: {
        mode: 'role',
        actor: 'B',
        prompt: 'You are Maryam. What do you do?',
        choices: [
          { id: 'raise', label: '“Before you go — can we talk about last week?”', next: 'the_talk', beat: 'Maryam raised last week before the next trip.' },
          { id: 'let', label: 'Let it go. It was just a bad week.', effects: { vars: { loop: 1 }, flags: ['buried'] }, next: { routes: endingRoutes() }, beat: 'Maryam let it go as just a bad week.' },
        ],
      },
    },

    the_talk: {
      id: 'the_talk',
      title: 'The talk',
      image: slot('adv-1142-talk', 'scene', 'A couple sitting cross-legged on a living-room floor facing each other, two mugs, a notebook between them, lamp light.', 'Yusuf and Maryam talking on the floor with a notebook between them.'),
      passages: [
        { text: 'They sit on the floor with two mugs and, at Maryam’s suggestion, a notebook.' },
        { text: 'The elder’s advice is still in their ears: “Don’t try to win. Try to understand.”', when: { flag: 'elder' } },
      ],
      decision: {
        mode: 'joint',
        prompt: 'Together: what is the one agreement you will write down?',
        choices: [
          { id: 'reply', label: 'When busy, send one line: “Busy — will call at [time].”', effects: { flags: ['rule_reply'], vars: { trust: 1 } }, next: { routes: endingRoutes() }, beat: 'They agreed on a one-line reply rule.' },
          { id: 'space', label: 'Say when you need space — and when you’ll be back.', effects: { flags: ['rule_space'], vars: { loop: -2, trust: 1 } }, next: { routes: endingRoutes() }, beat: 'They agreed to say when they need space and when they’ll return.' },
          { id: 'social', label: 'Agree together what feels respectful online.', effects: { flags: ['rule_sm'], vars: { trust: 1 } }, next: { routes: endingRoutes() }, beat: 'They agreed together what feels respectful online.' },
        ],
      },
    },
  },
  endings: {
    return_time: {
      id: 'return_time',
      title: '“Back at nine”',
      mood: 'renewed',
      image: slot('adv-1142-end-return', 'outcome', 'A phone screen showing a simple message “Busy day — back at 9 🤍” with a woman smiling at it while making tea.', 'Maryam smiling at a message saying “back at 9”.'),
      whatHappened: 'Next trip, Yusuf has another bad day. He sends: “Rough one. Need an hour. Back at nine.” At nine, he calls. Maryam barely notices the hour.',
      pattern: { name: 'The anxious/avoidant loop, broken', explanation: 'He learned to take space with a return time; she learned to trust the space.' },
      couldHaveChanged: 'Not much now — but the first silence could have been one two-minute call.',
      takeaway: 'Space is safe when it comes with a return.',
      epilogues: [{ text: 'They still laugh about “read at 11:42”.', when: { var: 'closeness', gte: 3 } }],
      guide: [
        { id: 'm-e-space', text: 'Tell each other when you need space and when you’ll return.' },
        { id: 'm-e-loop', text: 'Either of us can say “we’re in the loop” and we pause.' },
      ],
    },
    open_phones: {
      id: 'open_phones',
      title: 'Nothing to guess',
      mood: 'steady',
      image: slot('adv-1142-end-phones', 'outcome', 'Two phones lying side by side on a sofa cushion, screens dark, a couple’s hands nearby holding mugs.', 'Two phones side by side, ignored, as the couple share tea.'),
      whatHappened: 'They agree what feels respectful online. The like stops mattering — because neither of them has to guess anymore.',
      pattern: { name: 'Jealousy as unspoken insecurity', explanation: 'The photo was never the problem. Feeling unseen was.' },
      couldHaveChanged: 'Maryam asking about the photo calmly, rather than searching first.',
      takeaway: 'Agree your boundaries before you need them.',
      guide: [{ id: 'm-e-online', text: 'We agree together what feels respectful online.' }],
    },
    one_line: {
      id: 'one_line',
      title: 'One line',
      mood: 'tender',
      image: slot('adv-1142-end-oneline', 'outcome', 'A man in a meeting room glancing down and quickly typing a short message under the table, smiling slightly.', 'Yusuf quickly sending a one-line message from a meeting.'),
      whatHappened: 'The one-line rule works. Not perfectly — Yusuf forgets twice — but the silence never stretches to five hours again.',
      pattern: { name: 'Small habit, big safety', explanation: 'A tiny, concrete agreement prevented the gap where anxiety grows.' },
      couldHaveChanged: 'Talking about why Yusuf goes quiet, not just what to do about it.',
      takeaway: 'The smallest agreements are the ones you actually keep.',
      epilogues: [{ text: 'The loop still flickers when he is stressed.', when: { var: 'loop', gte: 2 } }],
      guide: [{ id: 'm-e-oneline', text: 'When busy, send one line saying when you’ll be back.' }],
    },
    loop_wins: {
      id: 'loop_wins',
      title: 'The loop wins',
      mood: 'strained',
      image: slot('adv-1142-end-loop', 'outcome', 'A circular staircase seen from above, a man walking up and a woman following, never meeting, muted colours.', 'Two figures on a circular staircase, never meeting.'),
      whatHappened: 'Each trip, the same pattern: his silence, her calls, his retreat, her panic. They love each other and keep hurting each other the same way.',
      pattern: { name: 'Pursue–withdraw', explanation: 'Each one’s coping move triggered the other’s, again and again.' },
      couldHaveChanged: 'Either of them naming the pattern out loud, once, instead of fighting inside it.',
      takeaway: 'You can’t fix a loop by doing your half harder.',
      guide: [{ id: 'm-e-name', text: 'When we notice the loop, we name it and pause — together.' }],
    },
    surveillance: {
      id: 'surveillance',
      title: 'The passwords',
      mood: 'strained',
      image: slot('adv-1142-end-pass', 'outcome', 'A phone lying between a couple at a dinner table like a third guest, both looking at it rather than each other.', 'A phone lying between Yusuf and Maryam at dinner.'),
      whatHappened: 'Yusuf hands over his passwords. Maryam finds nothing. Somehow they both feel worse.',
      pattern: { name: 'Control in place of trust', explanation: 'Checking soothes anxiety for an hour and erodes trust for months.' },
      couldHaveChanged: 'Saying the feeling underneath — “I felt invisible” — instead of asking for proof.',
      takeaway: 'Access is not the same as trust.',
      guide: [{ id: 'm-e-trust', text: 'We talk about what we feel instead of checking each other’s phones.' }],
    },
    next_trip: {
      id: 'next_trip',
      title: 'Next month',
      mood: 'fragile',
      image: slot('adv-1142-end-next', 'outcome', 'A packed suitcase standing by a front door at dawn, a woman watching it from the stairs.', 'A packed suitcase by the door at dawn.'),
      whatHappened: 'The weekend was lovely and nothing was said. Next month he travels again — and the week goes exactly the same way.',
      pattern: { name: 'Avoiding repair', explanation: 'Peace was kept by not talking, so nothing changed.' },
      couldHaveChanged: 'One honest conversation before the next trip.',
      takeaway: 'What isn’t talked about tends to repeat.',
      guide: [{ id: 'm-e-before', text: 'We talk about a hard week before the next one starts.' }],
    },
    closer: {
      id: 'closer',
      title: 'Closer than before',
      mood: 'tender',
      image: slot('adv-1142-end-closer', 'outcome', 'A couple asleep on a sofa after a long talk, a blanket over them, two empty mugs, morning light starting.', 'Yusuf and Maryam asleep on the sofa after talking.'),
      whatHappened: 'The bad week becomes the week they understood each other: why he goes quiet, why she reaches out.',
      pattern: { name: 'Understanding the other’s coping', explanation: 'Seeing the other’s reaction as fear rather than rejection changed everything.' },
      couldHaveChanged: 'Writing down one agreement would help it last.',
      takeaway: 'Behind most reactions is a fear. Ask about the fear.',
      guide: [{ id: 'm-e-fear', text: 'When the other reacts strongly, we ask what they were afraid of.' }],
    },
    quiet_distance: {
      id: 'quiet_distance',
      title: 'Quiet distance',
      mood: 'fragile',
      image: slot('adv-1142-end-distance', 'outcome', 'A couple in the same room each absorbed in their own phone, lit by separate screens, an empty space on the sofa between them.', 'Yusuf and Maryam on their phones, a gap between them.'),
      whatHappened: 'Nothing explodes. They just stop expecting much from each other’s replies.',
      pattern: { name: 'Disengagement', explanation: 'When reaching out keeps failing, people stop reaching.' },
      couldHaveChanged: 'Any one moment of turning toward: one call, one honest message, one question asked kindly.',
      takeaway: 'Distance rarely arrives in one day. Neither does closeness.',
      guide: [{ id: 'm-e-toward', text: 'We turn toward each other’s small bids for attention.' }],
    },
    learning_curve: {
      id: 'learning_curve',
      title: 'A learning curve',
      mood: 'steady',
      image: slot('adv-1142-end-learning', 'outcome', 'A couple walking along a canal path at dusk, talking, one gesturing as if explaining something, the other listening.', 'Yusuf and Maryam walking by a canal, talking.'),
      whatHappened: 'Not their finest week, not their worst. They each learned one thing about how the other copes.',
      pattern: { name: 'Different stress styles', explanation: 'He withdraws to cope; she reaches out. Neither is wrong — they just need a bridge.' },
      couldHaveChanged: 'A clear agreement about what to do next time one of them goes quiet.',
      takeaway: 'Know how each of you behaves under stress — before the stress arrives.',
      epilogues: [{ text: 'The liked photo is never mentioned again — for better or worse.', when: { flag: 'checked_insta' } }],
      guide: [{ id: 'm-e-styles', text: 'We know how each of us copes with stress and plan for it.' }],
    },
  },
};

function endingRoutes(): { when?: Condition; to: string }[] {
  return [
    { when: { flag: 'passwords' }, to: 'end:surveillance' },
    { when: { all: [{ var: 'loop', gte: 4 }, { var: 'trust', lte: 0 }] }, to: 'end:loop_wins' },
    { when: { all: [{ flag: 'buried' }, { var: 'loop', gte: 2 }] }, to: 'end:next_trip' },
    { when: { all: [{ flag: 'rule_space' }, { var: 'trust', gte: 2 }] }, to: 'end:return_time' },
    { when: { all: [{ flag: 'rule_sm' }, { var: 'trust', gte: 1 }] }, to: 'end:open_phones' },
    { when: { flag: 'rule_reply' }, to: 'end:one_line' },
    { when: { var: 'closeness', gte: 3 }, to: 'end:closer' },
    { when: { var: 'trust', lte: -2 }, to: 'end:quiet_distance' },
    { to: 'end:learning_curve' },
  ];
}
