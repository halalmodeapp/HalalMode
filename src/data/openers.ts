/**
 * Gentle first lines, shown faintly in an empty conversation so nobody stares
 * at a blank screen. They are suggestions only: nothing is sent or filled in.
 */
export const CONVERSATION_OPENERS: { en: string; ar: string }[] = [
  { en: 'Assalamu alaikum! Which of your answers would you most like to talk about?', ar: 'السلام عليكم! أي إجابة من إجاباتك تحب أن نتحدث عنها أولًا؟' },
  { en: 'One of your answers made me smile. Can I ask you more about it?', ar: 'إحدى إجاباتك جعلتني أبتسم. هل أسألك عنها أكثر؟' },
  { en: 'What does a good weekend look like for you?', ar: 'كيف يبدو يوم العطلة المثالي بالنسبة لك؟' },
  { en: 'How did you find the questions? Was there one that made you think hard?', ar: 'كيف وجدت الأسئلة؟ هل كان هناك سؤال جعلك تفكر طويلًا؟' },
  { en: 'What is something your family would say about you?', ar: 'ماذا قد تقول عائلتك عنك؟' },
  { en: 'What are you hoping to find in a marriage that you have not seen yet?', ar: 'ما الذي تأمل أن تجده في الزواج ولم تره بعد؟' },
  { en: 'Where in the world do you feel most at home?', ar: 'في أي مكان في العالم تشعر أنك في بيتك؟' },
  { en: 'What does a normal day look like for you at the moment?', ar: 'كيف يبدو يومك العادي هذه الأيام؟' },
  { en: 'Is there a part of your faith you are working on right now?', ar: 'هل هناك جانب من دينك تعمل عليه هذه الفترة؟' },
  { en: 'What is the best piece of advice you have been given about marriage?', ar: 'ما أفضل نصيحة سمعتها عن الزواج؟' },
  { en: 'How involved would you like our families to be from here?', ar: 'إلى أي حد تحب أن تشارك عائلتانا من الآن؟' },
  { en: 'What made you decide you were ready to look for someone?', ar: 'ما الذي جعلك تشعر أنك مستعد للبحث عن شريك؟' },
  { en: 'What is something you are looking forward to this year?', ar: 'ما الشيء الذي تتطلع إليه هذا العام؟' },
  { en: 'Which of our answers do you think we should talk through first?', ar: 'أي إجاباتنا تظن أن علينا مناقشتها أولًا؟' },
  { en: 'How do you usually unwind after a long week?', ar: 'كيف تستريح عادة بعد أسبوع طويل؟' },
  { en: 'What is a small thing that makes a home feel like home to you?', ar: 'ما الشيء الصغير الذي يجعل البيت بيتًا بالنسبة لك؟' },
  { en: 'Who is someone you really look up to, and why?', ar: 'من الشخص الذي تقدّره كثيرًا، ولماذا؟' },
  { en: 'What are you most grateful for at the moment?', ar: 'ما أكثر ما تشعر بالامتنان له هذه الأيام؟' },
  { en: 'How do you like to handle a disagreement?', ar: 'كيف تحب أن تتعامل مع الخلاف؟' },
  { en: 'Would you be open to a short call with a family member present, when we are both ready?', ar: 'هل تقبل مكالمة قصيرة بحضور أحد أفراد العائلة عندما نكون مستعدين؟' },
];

/** The openers in a random order, so each conversation starts somewhere new. */
export function shuffledOpeners(): { en: string; ar: string }[] {
  const list = [...CONVERSATION_OPENERS];
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j]!, list[i]!];
  }
  return list;
}
