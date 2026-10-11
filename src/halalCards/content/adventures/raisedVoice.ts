import type { Adventure, Condition } from '../../types.ts';
import { slot } from '../images.ts';

/**
 * The Raised Voice — two people from very different homes have their first
 * real argument. Hidden states: safety, understanding, repair.
 */
export const raisedVoice: Adventure = {
  id: 'adv-raised-voice',
  kind: 'adventure',
  title: 'The Raised Voice',
  tagline: 'In his home, shouting meant nothing. In hers, it meant everything.',
  description:
    'Adnan grew up in a loud, loving house where everyone shouted and nobody held a grudge. Huda grew up in a quiet house where a raised voice meant something was badly wrong. Their first real argument goes badly. Play both of them through a slammed door, an apology that doesn’t land, and a conversation about the homes they came from.',
  minutes: 13,
  themes: ['Conflict', 'Communication breakdowns', 'Family of origin'],
  cover: slot('concept-anger-cover', 'cover', 'A kitchen with a single broken plate on the floor, a husband and wife on opposite sides of the room, one with hands raised apologetically.', 'A couple on opposite sides of a kitchen after an argument.'),
  roles: {
    A: { name: 'Adnan', gender: 'male', sketch: 'Warm, loud, quick to anger and quick to forget.' },
    B: { name: 'Huda', gender: 'female', sketch: 'Calm, careful; goes very still when voices rise.' },
  },
  variables: {
    safety: { label: 'Feeling safe', initial: 0, readings: ['Huda feels unsafe in conflict.', 'Conflict feels manageable.', 'Both feel safe to disagree.'] },
    understanding: { label: 'Understanding', initial: 0, readings: ['They read each other wrong.', 'They are starting to understand each other.', 'They understand where each other comes from.'] },
    repair: { label: 'Repair', initial: 0, readings: ['Hurts are left unrepaired.', 'Some repair happens.', 'They repair well and quickly.'] },
  },
  start: 'argument',
  scenes: {
    argument: {
      id: 'argument',
      title: 'The argument',
      image: slot('adv-anger-argument', 'scene', 'A man in a kitchen raising his voice and gesturing broadly, his wife standing very still by the counter, arms close to her body, a broken plate on the floor between them.', 'Adnan raising his voice as Huda goes still.'),
      passages: [{ text: 'It starts about the car keys and turns into everything. Adnan’s voice gets louder. A plate slips and smashes. Huda goes completely silent.' }],
      decision: {
        mode: 'role',
        actor: 'A',
        prompt: 'You are Adnan. What do you do?',
        choices: [
          { id: 'stop', label: 'Stop mid-sentence. “I’m shouting. I’m sorry. Let me calm down.”', effects: { vars: { safety: 2, repair: 1 } }, next: 'after', beat: 'Adnan stopped himself mid-shout and apologised.' },
          { id: 'continue', label: 'Keep going — he’s not done, and he’s not angry with her, really.', effects: { vars: { safety: -2 } }, next: 'after', beat: 'Adnan kept shouting.' },
          { id: 'slam', label: 'Storm out and slam the door.', effects: { vars: { safety: -1, repair: -1 }, flags: ['slammed'] }, next: 'after', beat: 'Adnan stormed out and slammed the door.' },
        ],
      },
    },
    after: {
      id: 'after',
      title: 'Afterwards',
      image: slot('adv-anger-after', 'scene', 'A woman sitting alone on the edge of a bed in a dim room, knees drawn up, shaking slightly, a door ajar with light from the hallway.', 'Huda alone on the edge of the bed after the argument.'),
      passages: [
        { text: 'Huda is shaking. For her, a raised voice has only ever meant something was terribly wrong.' },
        { text: 'The slammed door is still echoing.', when: { flag: 'slammed' } },
      ],
      decision: {
        mode: 'role',
        actor: 'B',
        prompt: 'You are Huda. What do you do?',
        choices: [
          { id: 'tell', label: 'Later, tell Adnan: “When you shout, I feel scared — even if you don’t mean it.”', effects: { vars: { understanding: 2 }, flags: ['named_fear'] }, next: 'apology', beat: 'Huda told Adnan that shouting scared her.' },
          { id: 'freeze', label: 'Say nothing. Be very careful around him for days.', effects: { vars: { safety: -1 }, flags: ['froze'] }, next: 'apology', beat: 'Huda went quiet and careful for days.' },
          { id: 'mother', label: 'Call her mother and stay there for the night.', effects: { vars: { repair: -1 }, flags: ['left_night'] }, next: 'apology', beat: 'Huda went to her mother’s for the night.' },
        ],
      },
    },
    apology: {
      id: 'apology',
      title: 'The apology',
      turningPoint: true,
      image: slot('adv-anger-apology', 'turning_point', 'A man offering a bunch of flowers awkwardly to his wife in a hallway, she looks at the flowers but not at him, unconvinced.', 'Adnan offering flowers that don’t quite land.'),
      passages: [
        { text: 'Adnan comes to apologise. In his family, you apologise, hug, and it’s over.' },
        { text: 'She is at her mother’s. He has to go and knock on her parents’ door.', when: { flag: 'left_night' } },
      ],
      decision: {
        mode: 'private',
        prompt: 'What happens when he apologises?',
        choices: [],
        byRole: {
          A: [
            { id: 'quick', label: '“Sorry about earlier — we’re good, yeah?” and a hug.', effects: { vars: { repair: -1 } }, next: 'homes', beat: 'Adnan apologised quickly and went for a hug.' },
            { id: 'ask', label: '“I’m sorry. Can you tell me what it was like for you?”', effects: { vars: { understanding: 2, repair: 1 } }, next: 'homes', beat: 'Adnan apologised and asked what it had been like for her.' },
            { id: 'explain', label: 'Explain that shouting is normal in his family; she shouldn’t take it personally.', effects: { vars: { safety: -1 } }, next: 'homes', beat: 'Adnan explained that shouting was normal in his family.' },
          ],
          B: [
            { id: 'accept', label: 'Accept it to make it stop.', effects: { flags: ['accepted_fast'] }, next: 'homes', beat: 'Huda accepted the apology to make it stop.' },
            { id: 'explain', label: 'Explain what a raised voice meant in her house.', effects: { vars: { understanding: 2 } }, next: 'homes', beat: 'Huda explained what a raised voice meant in her home.' },
            { id: 'not_ready', label: '“I’m not ready yet.”', effects: { vars: { repair: -1 } }, next: 'homes', beat: 'Huda said she was not ready yet.' },
          ],
        },
        combos: [
          { pair: ['ask', 'explain'], next: 'homes', beat: 'He asked; she explained. For the first time he understood why she had gone so still.', effects: { vars: { understanding: 2, safety: 1 } } },
          { pair: ['quick', 'accept'], next: 'homes', beat: 'A quick sorry, a quick hug. Nothing was understood.', effects: { flags: ['papered_over'] } },
          { pair: ['explain', 'not_ready'], next: 'homes', beat: 'He explained his family; she said she wasn’t ready. Each felt unheard.', effects: { vars: { repair: -1, understanding: -1 } } },
        ],
        diverge: 'homes',
      },
    },
    homes: {
      id: 'homes',
      title: 'The homes we came from',
      image: slot('adv-anger-homes', 'scene', 'A couple sitting on a sofa looking at an old photo album together, pointing at pictures of their childhood homes and families, soft lamp light.', 'Adnan and Huda looking at childhood photos together.'),
      passages: [{ text: 'A week later, they talk about the homes they each grew up in — the loud one and the quiet one.' }],
      lessons: [{ id: 'rv-l-joint', tag: 'Joint decision', text: 'Choose together. If you differ, talk it through and choose again.' }],
      decision: {
        mode: 'joint',
        prompt: 'Together: what will you agree for arguments?',
        choices: [
          { id: 'signal', label: 'A signal: either says “pause”, and they take twenty minutes apart, then come back.', effects: { vars: { safety: 2, repair: 1 }, flags: ['signal'] }, next: 'second', beat: 'They agreed a pause signal and a twenty-minute break.' },
          { id: 'volume', label: 'No raised voices, ever — whatever the topic.', effects: { vars: { safety: 2 }, flags: ['volume_rule'] }, next: 'second', beat: 'They agreed no raised voices, ever.' },
          { id: 'nothing', label: 'Nothing formal — they’ll just try harder.', next: 'second', beat: 'They agreed to just try harder.' },
        ],
      },
    },
    second: {
      id: 'second',
      title: 'The second argument',
      turningPoint: true,
      image: slot('adv-anger-second', 'turning_point', 'A couple in a living room mid-disagreement, the husband catching himself with one hand raised in a pause gesture, the wife watching, the tension easing.', 'Adnan catching himself mid-argument.'),
      passages: [
        { text: 'A month later, another argument — about his sister staying for two weeks. Adnan feels his voice starting to rise.' },
        { text: 'They have a signal now.', when: { flag: 'signal' } },
      ],
      decision: {
        mode: 'role',
        actor: 'A',
        prompt: 'You are Adnan. What do you do?',
        choices: [
          { id: 'pause', label: '“Pause.” Walk to the kitchen, make tea, come back in twenty minutes.', effects: { vars: { safety: 2, repair: 1 } }, next: 'huda_turn', beat: 'Adnan called a pause and came back calmer.' },
          { id: 'lower', label: 'Notice, and deliberately lower his voice.', effects: { vars: { safety: 1 } }, next: 'huda_turn', beat: 'Adnan noticed and lowered his voice.' },
          { id: 'shout', label: 'It happens again.', effects: { vars: { safety: -2 }, flags: ['again'] }, next: 'huda_turn', beat: 'Adnan shouted again.' },
        ],
      },
    },
    huda_turn: {
      id: 'huda_turn',
      title: 'Huda’s side',
      image: slot('adv-anger-huda', 'scene', 'A woman speaking calmly but firmly to her husband across a kitchen table, her hands flat on the table, his face attentive.', 'Huda speaking firmly across the table.'),
      passages: [
        { text: 'Huda has her own part to play: in her home, people went silent for days instead of shouting.' },
        { text: 'He shouted again. She has gone quiet for three days.', when: { flag: 'again' } },
      ],
      decision: {
        mode: 'role',
        actor: 'B',
        prompt: 'You are Huda. What do you do?',
        choices: [
          { id: 'speak', label: 'Say what she needs instead of going silent.', effects: { vars: { understanding: 1, repair: 1 } }, next: { routes: endingRoutes() }, beat: 'Huda said what she needed instead of going silent.' },
          { id: 'silent', label: 'Go silent — it’s how her family handled it.', effects: { vars: { repair: -1 } }, next: { routes: endingRoutes() }, beat: 'Huda went silent, the way her family always had.' },
          { id: 'help', label: 'Suggest they see a counsellor together.', effects: { vars: { understanding: 1 }, flags: ['counsellor'] }, next: { routes: endingRoutes() }, beat: 'Huda suggested seeing a counsellor together.' },
        ],
      },
    },
  },
  endings: {
    fight_fair: {
      id: 'fight_fair', title: 'Fighting fair', mood: 'renewed',
      image: slot('adv-anger-end-fair', 'outcome', 'A couple in a kitchen, one holding up a hand in a gentle “pause” gesture, the other smiling and nodding, two mugs of tea being made.', 'Adnan and Huda calling a pause with a smile.'),
      whatHappened: '“Pause” has become a family word. Arguments still happen; nobody is frightened by them.',
      pattern: { name: 'A shared way to fight', explanation: 'They built a signal that worked for both their histories.' },
      couldHaveChanged: 'Little — though talking about their childhood homes before the wedding would have helped.',
      takeaway: 'Every couple fights. Couples who last agree how.',
      epilogues: [{ text: 'Adnan’s loud family have started using “pause” too.', when: { var: 'repair', gte: 4 } }],
      guide: [{ id: 'rv-e-pause', text: 'Either of us can say “pause”; we take twenty minutes and come back.' }],
    },
    understood: {
      id: 'understood', title: 'Understood', mood: 'tender',
      image: slot('adv-anger-end-understood', 'outcome', 'A husband and wife sitting close on a sofa, he listening intently as she speaks, his hand over hers, a photo album open on the table.', 'Adnan listening closely to Huda.'),
      whatHappened: 'The night he asked “what was it like for you?” changed how Adnan argues.',
      pattern: { name: 'Understanding the history', explanation: 'Seeing the other’s reaction as their history, not an attack, changed everything.' },
      couldHaveChanged: 'Nothing much.',
      takeaway: 'Behind every strong reaction is a home someone grew up in.',
      guide: [{ id: 'rv-e-history', text: 'When one of us reacts strongly, we ask about where it comes from.' }],
    },
    eggshells: {
      id: 'eggshells', title: 'Walking on eggshells', mood: 'strained',
      image: slot('adv-anger-end-eggshells', 'outcome', 'A woman carefully placing a cup down without a sound in a kitchen, glancing at her husband reading in the next room, tense posture.', 'Huda moving carefully around Adnan.'),
      whatHappened: 'Adnan rarely shouts now. Huda still braces whenever he sighs.',
      pattern: { name: 'Fear without repair', explanation: 'The shouting stopped; the fear was never talked through.' },
      couldHaveChanged: 'An apology that asked how she felt, not just one that said sorry.',
      takeaway: 'Stopping the behaviour is not the same as healing the hurt.',
      guide: [{ id: 'rv-e-heal', text: 'After we hurt each other, we talk about it until it is healed.' }],
    },
    repeating: {
      id: 'repeating', title: 'It happens again', mood: 'strained',
      image: slot('adv-anger-end-repeat', 'outcome', 'A couple on opposite ends of a long sofa not speaking, a closed door and a broken mug in the background, cold evening light.', 'Adnan and Huda not speaking on opposite ends of the sofa.'),
      whatHappened: 'The loud arguments and the long silences keep alternating. Each makes the other worse.',
      pattern: { name: 'Shout and freeze', explanation: 'His shouting triggered her silence; her silence fed his frustration.' },
      couldHaveChanged: 'A pause signal — and both naming their pattern.',
      takeaway: 'His loud and her quiet are two halves of one pattern. Change it together.',
      guide: [{ id: 'rv-e-pattern', text: 'We name our conflict pattern out loud and work on it together.' }],
    },
    counsel: {
      id: 'counsel', title: 'Asking for help', mood: 'steady',
      image: slot('adv-anger-end-counsel', 'outcome', 'A couple sitting together on a sofa in a calm counsellor’s office, the counsellor in a chair opposite, the couple holding hands.', 'Adnan and Huda with a counsellor.'),
      whatHappened: 'They start seeing a Muslim counsellor together. It is the best decision of their first year.',
      pattern: { name: 'Seeking help early', explanation: 'They treated a pattern as something to learn about, not something shameful.' },
      couldHaveChanged: 'Nothing — asking for help was strength.',
      takeaway: 'Getting help early is a sign of how much you care.',
      guide: [{ id: 'rv-e-help', text: 'We are not too proud to get help with our marriage.' }],
    },
    papered: {
      id: 'papered', title: 'Papered over', mood: 'fragile',
      image: slot('adv-anger-end-papered', 'outcome', 'A couple smiling for a selfie at a family event, a small crack drawn into the photo frame they hold.', 'Adnan and Huda smiling in a photo with a cracked frame.'),
      whatHappened: 'A quick sorry and a hug every time. It feels fine until the next one.',
      pattern: { name: 'Repair without understanding', explanation: 'Fast apologies skipped the part where they understood each other.' },
      couldHaveChanged: 'Asking “what was it like for you?”',
      takeaway: 'A quick sorry ends the fight. Understanding ends the pattern.',
      guide: [{ id: 'rv-e-understand', text: 'Our apologies include asking how the other felt.' }],
    },
    learning: {
      id: 'learning', title: 'Learning each other', mood: 'steady',
      image: slot('adv-anger-end-learning', 'outcome', 'A couple washing dishes together in a kitchen, talking calmly, one smiling at the other, an ordinary evening.', 'Adnan and Huda washing dishes together.'),
      whatHappened: 'Some arguments go better than others. They are learning each other’s signals.',
      pattern: { name: 'Two histories meeting', explanation: 'Different homes meant different rules; they are writing new ones.' },
      couldHaveChanged: 'An agreed signal would speed things up.',
      takeaway: 'You both bring a family’s rules into marriage. Write your own together.',
      epilogues: [{ text: 'Huda still goes quiet sometimes; Adnan has learned to notice.', when: { var: 'understanding', gte: 3 } }],
      guide: [{ id: 'rv-e-rules', text: 'We write our own rules for disagreeing, not our parents’.' }],
    },
    quiet_rule: {
      id: 'quiet_rule', title: 'A quiet house', mood: 'bittersweet',
      image: slot('adv-anger-end-quiet', 'outcome', 'A very tidy calm living room, a couple reading on separate chairs in silence, peaceful but a little distant.', 'Adnan and Huda reading in a quiet living room.'),
      whatHappened: 'No raised voices, ever. It’s peaceful. Sometimes Adnan feels he can’t be himself at home.',
      pattern: { name: 'One side’s rules', explanation: 'The rule protected Huda but asked Adnan to hide something real.' },
      couldHaveChanged: 'A rule that worked for both of them, like a pause signal.',
      takeaway: 'A good rule protects both people, not just one.',
      guide: [{ id: 'rv-e-both', text: 'Our rules for conflict have to work for both of us.' }],
    },
  },
};

function endingRoutes(): { when?: Condition; to: string }[] {
  return [
    { when: { flag: 'counsellor' }, to: 'end:counsel' },
    { when: { all: [{ flag: 'again' }, { var: 'repair', lte: 0 }] }, to: 'end:repeating' },
    { when: { all: [{ flag: 'froze' }, { var: 'understanding', lte: 1 }] }, to: 'end:eggshells' },
    { when: { flag: 'papered_over' }, to: 'end:papered' },
    { when: { all: [{ flag: 'signal' }, { var: 'safety', gte: 4 }] }, to: 'end:fight_fair' },
    { when: { flag: 'volume_rule' }, to: 'end:quiet_rule' },
    { when: { var: 'understanding', gte: 4 }, to: 'end:understood' },
    { to: 'end:learning' },
  ];
}
