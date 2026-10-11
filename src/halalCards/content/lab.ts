import type { LabLesson } from '../types.ts';
import { slot } from './images.ts';

/**
 * Relationship Lab. Each lesson is a workshop, not an article: a run of
 * scenarios where both answer in private, see what their choice would set in
 * motion, then meet the idea behind it and talk.
 *
 * Writing a new lesson: keep every card under about sixty words, make the
 * wrong answers tempting (they should be what people really do), and let the
 * consequence teach rather than a verdict.
 */

export const ruleZero: LabLesson = {
  id: 'lab-rule-zero',
  kind: 'lab',
  rule: 'zero',
  ruleLabel: 'Rule Zero',
  soloPreview: true,
  title: 'Pick well',
  tagline: 'Look past the spark to the person you would build a life with.',
  description:
    'Most marriages that struggle were decided long before the first argument — at the choosing. ' +
    'Work through four situations together and notice what each of you weighs, and what you overlook.',
  minutes: 12,
  cover: slot(
    'lab-zero-cover',
    'cover',
    'Two cups of tea on a small café table, one book about marriage between them, late afternoon light through a window, a chaperone’s coat on a nearby chair.',
    'Two cups of tea on a café table in late afternoon light.'
  ),
  steps: [
    {
      type: 'intro',
      id: 'z-intro',
      title: 'Attraction starts it. Character carries it.',
      body:
        'Feeling drawn to someone matters — it is part of a good match. But it fades and returns in waves, while character, deen, ' +
        'values and how someone handles stress show up every single day. This lesson is about seeing both clearly.',
    },
    {
      type: 'scenario',
      id: 'z-charm',
      title: 'The charming one',
      body:
        'Imran is funny, confident and easy to talk to. In three meetings he has been late twice, spoke sharply to a waiter, and changed the subject whenever prayer came up.',
      prompt: 'What do you make of it?',
      image: slot(
        'lab-zero-charm',
        'scene',
        'A young man laughing confidently at a café table while a waiter stands awkwardly to one side, a woman across from him watching thoughtfully.',
        'A charming man laughing while a waiter looks uncomfortable.'
      ),
      choices: [
        {
          id: 'chemistry',
          label: 'The chemistry is rare — the rest will settle once we are married.',
          consequence:
            'Two years in, the lateness is constant and the sharpness is now aimed at you when he is stressed. Chemistry did not change him; it made the early signs easy to forgive.',
          tone: 'harms',
        },
        {
          id: 'ask',
          label: 'Ask him directly about the waiter and about prayer, and watch how he answers.',
          consequence:
            'He could laugh it off, get defensive, or reflect honestly. Whichever he does, you now know how he responds to a gentle challenge — which is how he will respond in marriage.',
          tone: 'helps',
        },
        {
          id: 'family',
          label: 'Let my family meet him and see what they notice.',
          consequence:
            'Your uncle notices the same edge you did. Others who care about you can see what attraction blurs — though their view helps most alongside your own questions, not instead of them.',
          tone: 'mixed',
        },
        {
          id: 'walk',
          label: 'End it now — those are red flags.',
          consequence:
            'You may be right. You may also have ended something over a bad week without asking a single question. Clear standards are good; deciding without understanding can cost you a good person.',
          tone: 'mixed',
        },
      ],
    },
    {
      type: 'scenario',
      id: 'z-list',
      title: 'The list',
      image: slot('lab-zero-list', 'scene', 'A young woman in a soft hijab sitting at a window seat with a handwritten list in her lap, crossing one line out with a pencil, thoughtful half-smile.', 'A young woman revising a handwritten list.'),
      body:
        'Sana has a list: tall, a doctor or engineer, from her community, lives in London. Hamza meets none of these. He is steady, kind, prays on time, and talks openly about wanting a calm home.',
      prompt: 'What should Sana do?',
      choices: [
        {
          id: 'hold',
          label: 'Hold to the list. She knows what she wants.',
          consequence:
            'She waits three more years for someone who ticks every box — and finds the boxes said little about whether they could live together kindly.',
          tone: 'harms',
        },
        {
          id: 'sort',
          label: 'Split the list into must-haves and nice-to-haves, then look again.',
          consequence:
            'Deen, kindness and wanting the same kind of home move to the top. Height and job title move down. Hamza suddenly looks like a serious possibility.',
          tone: 'helps',
        },
        {
          id: 'settle',
          label: 'Forget the list — any good Muslim will do.',
          consequence:
            'Abandoning every preference can lead to resentment later. Some things on her list — like where she lives — might genuinely matter. Sorting is better than discarding.',
          tone: 'mixed',
        },
      ],
    },
    {
      type: 'scenario',
      id: 'z-money',
      title: 'The question nobody asks',
      image: slot('lab-zero-money', 'scene', 'A young couple and a chaperoning older sister at a café table, a small notebook open between the couple showing simple sums, both leaning in, relaxed and honest.', 'A couple looking at a notebook of sums together.'),
      body:
        'Yusuf and Mariam are getting on wonderfully. Neither has asked about debt, spending, supporting parents, or who works after children arrive. It feels unromantic to bring it up.',
      prompt: 'When should these come up?',
      choices: [
        {
          id: 'after',
          label: 'After the nikah. Talking money now would spoil it.',
          consequence:
            'Three months in, Mariam learns Yusuf sends half his salary to his parents and has a car loan. Nothing about it is wrong — but finding out now feels like being misled.',
          tone: 'harms',
        },
        {
          id: 'now',
          label: 'Now, kindly and plainly, before anyone is too attached.',
          consequence:
            'It is awkward for ten minutes. Then they learn they both expect to support parents, and agree on how. It becomes the conversation that made them trust each other.',
          tone: 'helps',
        },
        {
          id: 'families',
          label: 'Let the families sort it out.',
          consequence:
            'The families agree a mahr and a wedding budget. Day-to-day money — habits, debts, priorities — never gets discussed, and that is where the arguments come from.',
          tone: 'mixed',
        },
      ],
    },
    {
      type: 'scenario',
      id: 'z-stress',
      title: 'The bad day',
      image: slot('lab-zero-stress', 'scene', 'A delayed train platform at dusk, a tired young man in a jacket apologising to a station guard while a young woman and her brother watch from a bench with suitcases.', 'A tired young man apologising to a guard on a train platform.'),
      body:
        'On a long delayed train journey with a chaperone, you see the person you are considering at the end of their patience: tired, hungry, plans ruined.',
      prompt: 'What are you watching for?',
      choices: [
        {
          id: 'perfect',
          label: 'That they stay perfectly calm. Anything else is a warning.',
          consequence:
            'Nobody stays perfectly calm. Expecting it means anyone real will disappoint you — the question is how someone is when they are not at their best.',
          tone: 'mixed',
        },
        {
          id: 'how',
          label: 'How they treat people when frustrated, and whether they recover.',
          consequence:
            'They grumble, then apologise to the guard they snapped at and make a joke of it. That repair is exactly what you will need in a marriage.',
          tone: 'helps',
        },
        {
          id: 'ignore',
          label: 'Nothing — everyone is different on a bad day.',
          consequence:
            'Bad days are where marriage actually happens. Treating them as not counting means missing the most honest information you will get before the nikah.',
          tone: 'harms',
        },
      ],
    },
    {
      type: 'insight',
      id: 'z-insight',
      title: 'What to actually look at',
      body: 'Attraction is a reason to keep talking. These decide whether a marriage holds:',
      points: [
        'Deen you can share, not just a label you both use',
        'Character under pressure — how they treat people who can do nothing for them',
        'Emotional maturity: can they apologise, listen, and repair',
        'Values and expectations: roles, money, children, family, where you live',
        'Whether your families can become one family',
      ],
    },
    {
      type: 'discussion',
      id: 'z-talk',
      prompt: 'Name one thing each of you would never compromise on — and one thing you used to think mattered but no longer do.',
      followUps: [
        'What did you each notice the other weigh differently in the scenarios?',
        'Which question are you most nervous to ask each other?',
      ],
      guide: [
        { id: 'z-g1', text: 'Ask the unromantic questions early: money, family, children, roles.' },
        { id: 'z-g2', text: 'Judge character by bad days, not good ones.' },
      ],
    },
  ],
};

export const ruleOne: LabLesson = {
  id: 'lab-rule-one',
  kind: 'lab',
  rule: 'one',
  ruleLabel: 'Rule 1',
  title: 'Sweat the small stuff',
  tagline: 'Small things left unsaid become big things that cannot be.',
  description:
    'Resentment rarely starts big. It grows from a dish left out, a comment at dinner, a plan changed without asking. ' +
    'Practise catching small things while they are still small.',
  minutes: 10,
  cover: slot(
    'lab-one-cover',
    'cover',
    'A single unwashed mug beside a kitchen sink, a shadow of a person walking past it, soft morning light.',
    'A single mug left beside a kitchen sink.'
  ),
  steps: [
    {
      type: 'intro',
      id: 'o-intro',
      title: 'The pebble and the wall',
      body:
        'Each small irritation you swallow is a pebble. One is nothing. A hundred quietly become a wall — and one day a tiny thing gets a huge reaction, and neither of you understands why.',
    },
    {
      type: 'scenario',
      id: 'o-phone',
      title: 'Dinner and the phone',
      body:
        'Six months married. Most evenings, Adam scrolls his phone through dinner. Layla minds, but it seems petty to say anything — he works hard.',
      prompt: 'What should Layla do?',
      image: slot(
        'lab-one-phone',
        'scene',
        'A couple at a dinner table, the husband looking down at his phone, the wife looking at her plate, a candle between them.',
        'A husband on his phone at dinner while his wife looks away.'
      ),
      choices: [
        {
          id: 'swallow',
          label: 'Let it go. It is not worth an argument.',
          consequence:
            'Months later he checks his phone while she tells him about her day, and she explodes. He is baffled — she never said anything. To her, it has been happening for half a year.',
          tone: 'harms',
        },
        {
          id: 'hint',
          label: 'Make a pointed joke about him marrying his phone.',
          consequence:
            'He laughs and does not change. Hints let you feel you said something while leaving him free to miss it — and a joke with an edge often lands as criticism.',
          tone: 'mixed',
        },
        {
          id: 'say',
          label: '"I miss you at dinner. Could we keep phones away while we eat?"',
          consequence:
            'He had not noticed. He agrees, slips sometimes, and she reminds him gently. A small thing stayed a small thing.',
          tone: 'helps',
        },
      ],
    },
    {
      type: 'scenario',
      id: 'o-mother',
      title: 'A comment at his mother’s',
      image: slot('lab-one-mother', 'scene', 'A crowded family dining room at a mother-in-law\'s house, an older woman laughing and pointing at a dish, a young wife smiling politely but stiffly, the husband oblivious mid-conversation.', 'A young wife smiling stiffly at a family dinner.'),
      body:
        'At his mother’s house, she jokes that Layla’s cooking “still needs practice”. Everyone laughs. Layla smiles. Adam does not notice anything wrong.',
      prompt: 'Later, at home, what should Layla do?',
      choices: [
        {
          id: 'fine',
          label: 'Say nothing. It was a joke, and it is his mother.',
          consequence:
            'The jokes continue every visit. Layla starts dreading Fridays, then finding reasons not to go. Adam thinks she does not like his family, and resents that.',
          tone: 'harms',
        },
        {
          id: 'attack',
          label: '"Your mother humiliated me and you just sat there."',
          consequence:
            'Adam defends his mother on instinct. Now they are arguing about loyalty, not about one comment — and the actual hurt never gets heard.',
          tone: 'harms',
        },
        {
          id: 'soft',
          label: '"The cooking comment stung a bit. Can I tell you why?"',
          consequence:
            'Adam had heard it as nothing. Hearing it calmly, he can see it. Next time he says, “Layla’s biryani is the best I’ve had,” and his mother takes the hint.',
          tone: 'helps',
        },
      ],
    },
    {
      type: 'scenario',
      id: 'o-receiver',
      title: 'Now you are the one hearing it',
      image: slot('lab-one-receiver', 'scene', 'A married couple on a sofa, the wife speaking quietly and the husband turning to face her with an open, listening expression, a weekend planner on the coffee table.', 'A husband turning to listen as his wife speaks.'),
      body:
        'Your spouse says, quietly: “It bothers me that you always decide our weekend plans without asking.” You did not know. It feels like criticism out of nowhere.',
      prompt: 'What do you say?',
      choices: [
        {
          id: 'defend',
          label: '"I only do it because you never suggest anything."',
          consequence:
            'True or not, they learn that raising small things leads to a counter-attack. Next time, they will stay quiet — and the pebbles start piling up.',
          tone: 'harms',
        },
        {
          id: 'thanks',
          label: '"Thank you for telling me. What would you like instead?"',
          consequence:
            'They relax. You agree to plan Saturdays together. Because it was easy to say, they will keep telling you small things — which is how you never get big ones.',
          tone: 'helps',
        },
        {
          id: 'sulk',
          label: '"Fine. You plan everything, then."',
          consequence:
            'It sounds like agreement but lands as punishment. They got the change and lost the warmth. Small things become harder to raise next time.',
          tone: 'harms',
        },
      ],
    },
    {
      type: 'insight',
      id: 'o-insight',
      title: 'Why small things are the big things',
      body:
        'Raising something small is only half of it. The other half is making it safe to hear. Couples who do well keep the bar for raising things low, and the reaction to hearing them gentle.',
      points: [
        'Say it within a day or two, while it is still small',
        'Describe what happened and how it felt — not what kind of person they are',
        'Ask for something specific',
        'When you are told something, thank them first and explain later',
      ],
    },
    {
      type: 'discussion',
      id: 'o-talk',
      prompt: 'What is a small thing that would bother each of you if it kept happening? Say it now, while it is still hypothetical.',
      followUps: ['How would you each like to be told when something is bothering the other?'],
      guide: [
        { id: 'o-g1', text: 'Bring up small problems early, while they are still small.' },
        { id: 'o-g2', text: 'When one of us raises something, the other says thank you first.' },
      ],
    },
  ],
};

export const ruleTwo: LabLesson = {
  id: 'lab-rule-two',
  kind: 'lab',
  rule: 'two',
  ruleLabel: 'Rule 2',
  title: 'Listen before you defend',
  tagline: 'Understand first. Explain second.',
  description:
    'When someone you love is upset with you, everything in you wants to explain. ' +
    'Practise the harder thing: asking, acknowledging and validating before you defend.',
  minutes: 11,
  cover: slot(
    'lab-two-cover',
    'cover',
    'Two people sitting on a sofa, one speaking with open hands, the other leaning in to listen, a warm lamp between them.',
    'One person speaking while the other leans in to listen.'
  ),
  steps: [
    {
      type: 'intro',
      id: 't-intro',
      title: 'Two conversations at once',
      body:
        'When one person is hurt and the other starts explaining, two conversations happen at once and neither is heard. Listening first is not losing. It is how the conversation becomes one.',
    },
    {
      type: 'scenario',
      id: 't-late',
      title: 'Late again',
      body:
        'Zainab: “You said you’d be home for iftar. I broke my fast alone, again.” Omar was stuck in a meeting he could not leave.',
      prompt: 'What should Omar say first?',
      image: slot(
        'lab-two-late',
        'scene',
        'A woman sitting alone at an iftar table with dates and water at dusk, one place setting untouched, a man arriving at the door with his coat still on.',
        'A woman alone at an iftar table as her husband arrives late.'
      ),
      choices: [
        {
          id: 'explain',
          label: '"The meeting overran — there was nothing I could do."',
          consequence:
            'Completely true, and she feels unheard. She was not asking whether it was his fault; she was telling him she felt alone. Now she has to argue to be understood.',
          tone: 'harms',
        },
        {
          id: 'ack',
          label: '"You broke your fast on your own. That must have felt lonely."',
          consequence:
            'Her shoulders drop. A minute later she asks what happened, and he tells her about the meeting. The same explanation lands completely differently after she has been heard.',
          tone: 'helps',
        },
        {
          id: 'sorry',
          label: '"Sorry, sorry. It won’t happen again."',
          consequence:
            'It ends the conversation fast, which can feel like being brushed off. An apology without understanding often sounds like wanting it to stop.',
          tone: 'mixed',
        },
      ],
    },
    {
      type: 'scenario',
      id: 't-unfair',
      title: 'When it feels unfair',
      image: slot('lab-two-unfair', 'scene', 'A husband and wife at a kitchen counter, he gesturing in frustration, she pausing mid-reply with a curious, gentle expression, a family photo on the fridge behind them.', 'A wife pausing to listen as her husband talks in frustration.'),
      body:
        'Ibrahim: “You always take your sister’s side.” Aisha thinks this is simply not true — she sided with him last week.',
      prompt: 'What should Aisha do?',
      choices: [
        {
          id: 'correct',
          label: 'Point out last week. “Always” is unfair.',
          consequence:
            'She wins the point about the word and loses the conversation. He walks away believing she cannot even hear him.',
          tone: 'harms',
        },
        {
          id: 'curious',
          label: '"What happened that made it feel that way?"',
          consequence:
            'It was one moment at dinner when she laughed at her sister’s joke about him. That is much easier to talk about than “always”.',
          tone: 'helps',
        },
        {
          id: 'agree',
          label: '"You’re right, I always do. I’m sorry."',
          consequence:
            'Agreeing to something you do not believe builds quiet resentment, and he does not learn what really hurt either. Validation is not surrender.',
          tone: 'mixed',
        },
      ],
    },
    {
      type: 'scenario',
      id: 't-validate',
      title: 'Validation without agreement',
      image: slot('lab-two-validate', 'scene', 'A young couple in a quiet room, one sitting on the edge of a sofa looking hurt, the other kneeling beside them with a hand open, speaking softly.', 'One spouse kneeling to comfort the other.'),
      body:
        'Your spouse is upset you told your parents about a disagreement between you. You believe asking your parents for advice was reasonable.',
      prompt: 'Which response validates without giving up your view?',
      choices: [
        {
          id: 'yes',
          label: '"I get why that felt like a betrayal — it was between us. Can I tell you why I did it?"',
          consequence:
            'They feel understood, then genuinely listen to your reasons. You might still disagree, but now you are deciding together what stays private.',
          tone: 'helps',
        },
        {
          id: 'but',
          label: '"I understand, but they are my parents and I needed advice."',
          consequence:
            'The “but” erases everything before it. They hear only the defence.',
          tone: 'harms',
        },
        {
          id: 'over',
          label: '"You’re overreacting — it’s not a big deal."',
          consequence:
            'Telling someone how big their feelings should be is the fastest way to make them bigger.',
          tone: 'harms',
        },
      ],
    },
    {
      type: 'insight',
      id: 't-insight',
      title: 'Listen, ask, acknowledge — then explain',
      body: 'Validation means “your feelings make sense”, not “you are right”. You can say it and still disagree.',
      points: [
        'Listen to the end without preparing your answer',
        'Ask one question to understand more',
        'Say back what you heard, in your own words',
        'Acknowledge the feeling: “That makes sense”',
        'Only then explain your side — briefly',
      ],
    },
    {
      type: 'discussion',
      id: 't-talk',
      prompt: 'When you are upset, what do you most need to hear first? And what is the one response that makes it worse?',
      followUps: ['Which of the tempting answers above sounded most like you?'],
      guide: [
        { id: 't-g1', text: 'Listen and acknowledge before explaining or defending.' },
        { id: 't-g2', text: 'Validation does not mean agreement — we can say both.' },
      ],
    },
  ],
};

export const ruleThree: LabLesson = {
  id: 'lab-rule-three',
  kind: 'lab',
  rule: 'three',
  ruleLabel: 'Rule 3',
  title: 'The anxious–avoidant loop',
  tagline: 'One reaches out, the other pulls back — and both feel more alone.',
  description:
    'When one person feels disconnected they may pursue; when the other feels pressured they may withdraw. Each move makes the other’s worse. ' +
    'Learn to see the loop, and to step out of it together.',
  minutes: 13,
  cover: slot(
    'lab-three-cover',
    'cover',
    'Two figures on either side of a circular path, one reaching forward and one turning away, a soft gold line looping between them.',
    'Two figures on a looping path, one reaching, one turning away.'
  ),
  steps: [
    {
      type: 'intro',
      id: 'h-intro',
      title: 'Neither of you is the problem. The loop is.',
      body:
        'Some people, when they feel distance, move closer: more messages, more questions. Some, when they feel pressure, move away: quieter, busier, needing space. Neither is wrong. Together they can lock into a loop.',
    },
    {
      type: 'scenario',
      id: 'h-quiet',
      title: 'He has gone quiet',
      body:
        'Bilal had a hard week and has been quiet for two days — short replies, early nights. Safiya wonders if she has done something wrong.',
      prompt: 'If you were Safiya, what would you do?',
      image: slot(
        'lab-three-quiet',
        'scene',
        'A woman holding her phone looking at an unanswered message, while in the next room a man sits alone on the edge of a bed with his head in his hands.',
        'A woman looking at her phone while her husband sits alone in another room.'
      ),
      choices: [
        {
          id: 'chase',
          label: 'Keep asking what is wrong until he tells me.',
          consequence:
            'Each question feels to Bilal like pressure to perform being okay. He gets quieter. His quietness makes Safiya more frightened, so she asks more. The loop has begun.',
          tone: 'harms',
        },
        {
          id: 'mirror',
          label: 'Go quiet too — if he wants space, he can have it.',
          consequence:
            'Now both are withdrawn and each reads the other’s silence as rejection. Days pass and nobody knows how to restart.',
          tone: 'harms',
        },
        {
          id: 'name',
          label: '"You seem drained. I’m here when you want to talk — no rush."',
          consequence:
            'There is nothing to defend against. That evening Bilal sits beside her and, slowly, tells her about work.',
          tone: 'helps',
        },
      ],
    },
    {
      type: 'scenario',
      id: 'h-space',
      title: 'Now you are Bilal',
      image: slot('lab-three-space', 'scene', 'A young man in a dim study with headphones around his neck and a laptop closed, looking overwhelmed, a door ajar with warm light and his wife\'s silhouette beyond it.', 'A tired husband in a dim study, his wife\'s shadow at the door.'),
      body:
        'You are overwhelmed and need quiet. Safiya has asked three times today if you are okay. You feel crowded.',
      prompt: 'What do you do?',
      choices: [
        {
          id: 'shut',
          label: 'Say "I’m fine" and go to another room.',
          consequence:
            '“Fine” with a closed door tells her something is wrong and that she is shut out. Her anxiety spikes. The loop tightens.',
          tone: 'harms',
        },
        {
          id: 'snap',
          label: '"Please stop asking me that!"',
          consequence:
            'She hears that her care is a burden. She may stop asking — and start silently keeping score.',
          tone: 'harms',
        },
        {
          id: 'return',
          label: '"Work has wiped me out. I need tonight to recharge — can we talk properly tomorrow after Fajr?"',
          consequence:
            'Space with a return time is completely different from disappearing. She knows what is happening and when you will come back. She can rest too.',
          tone: 'helps',
        },
      ],
    },
    {
      type: 'scenario',
      id: 'h-loop',
      title: 'Spotting it mid-argument',
      image: slot('lab-three-loop', 'scene', 'A narrow hallway in a home, a wife following her husband with an outstretched hand while he turns toward a doorway with his palm raised, both mid-step, a soft gold light between them.', 'A wife following her husband down a hallway as he turns away.'),
      body:
        'You are both in it: one following the other from room to room wanting to resolve it now; the other saying “I can’t do this right now.”',
      prompt: 'What breaks the loop?',
      choices: [
        {
          id: 'win',
          label: 'Whoever is right should keep going until it is settled.',
          consequence:
            'Pushing a withdrawn person rarely settles anything. It usually ends in a worse thing said, or a slammed door.',
          tone: 'harms',
        },
        {
          id: 'pause',
          label: 'One says, "We’re in the loop. Let’s pause for thirty minutes and come back."',
          consequence:
            'Naming the pattern makes it the shared problem instead of each other. Thirty minutes later, both are calmer and actually listening.',
          tone: 'helps',
        },
        {
          id: 'leave',
          label: 'One leaves the house to cool off without saying for how long.',
          consequence:
            'Cooling off helps; vanishing does not. For the one left behind, the open-ended absence is the hardest part.',
          tone: 'mixed',
        },
      ],
    },
    {
      type: 'insight',
      id: 'h-insight',
      title: 'How the loop breaks',
      body:
        'The one who pursues is asking “are we okay?”. The one who withdraws is asking “can I breathe?”. Each can answer the other’s question:',
      points: [
        'Pursuer: reach out once, warmly, and trust the space',
        'Withdrawer: take space, but say why and when you will return',
        'Either one can name it: “I think we are in the loop”',
        'Come back when you said you would — every time',
      ],
    },
    {
      type: 'discussion',
      id: 'h-talk',
      prompt: 'When things feel tense, do you tend to move closer or pull away? What would help you most from the other in that moment?',
      followUps: ['Agree on a word or phrase either of you can use to say “we are in the loop”.'],
      guide: [
        { id: 'h-g1', text: 'Don’t disappear during conflict.' },
        { id: 'h-g2', text: 'Tell each other when you need space and when you will return.' },
        { id: 'h-g3', text: 'Either of us can say “we’re in the loop” and we pause for thirty minutes.' },
      ],
    },
  ],
};

export const LAB_LESSONS: LabLesson[] = [ruleZero, ruleOne, ruleTwo, ruleThree];
