import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';

import { DiscussButton, FinishActions } from '@/components/halalCards/Actions';
import { ChoiceOption, Pill, PlayCard, RevealTile, Waiting } from '@/components/halalCards/CardParts';
import { GuideSuggestions } from '@/components/halalCards/GuideSaveButton';
import { Illustration, OverlayText } from '@/components/halalCards/Illustration';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { useCardsCopy } from '@/halalCards/copy';
import {
  answerComplete,
  knowMeSubject,
  personalise,
  quizKey,
  quizNeeds,
  revealCard,
  scoreQuiz,
} from '@/halalCards/engine/quiz';
import { answersBySeat, bothAnswered, otherSeat } from '@/halalCards/engine/seats';
import { advanceCursor } from '@/halalCards/engine/session';
import { guessesKey, initialSeenCursor, promptRepeatsTitle, quizSummaryKey, showFormatEyebrow, viewCursor } from '@/halalCards/present';
import type { Quiz, QuizAnswer, QuizCard, QuizState, Seat } from '@/halalCards/types';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { alpha, color, font, space } from '@/theme/tokens';
import type { PlayProps } from './types';

export function QuizPlay(props: PlayProps<Quiz>) {
  const { session, activity, partnerName, onAdvance, busy } = props;
  const copy = useCardsCopy();
  const state = session.state as QuizState;
  const [seen, setSeen] = useState(() => initialSeenCursor(activity, session));
  const { index, catchingUp } = viewCursor(seen, state.cursor);
  const card = activity.cards[index];

  if (!card) return <QuizResults {...props} />;

  // My own Next moves my mark with the cursor; someone else's leaves it behind,
  // so I still see the reveal they skipped past.
  const next = () => {
    if (catchingUp) {
      setSeen(index + 1);
      return;
    }
    setSeen(state.cursor + 1);
    onAdvance(advanceCursor(activity, state));
  };

  return (
    <View style={styles.stack}>
      {catchingUp ? <Pill label={copy('catchUp', { name: partnerName })} tone="gold" /> : null}
      <QuizCardView key={card.id} {...props} card={card} index={index} reviewing={catchingUp} onNext={next} busy={busy && !catchingUp} />
    </View>
  );
}

function answerLabel(_quiz: Quiz, _card: QuizCard, options: string[], answer: QuizAnswer | undefined): string {
  const value = answer?.self ?? answer?.guess;
  return value === undefined ? '—' : options[value] ?? '—';
}

function QuizResults({ session, activity, partnerName, connectionId, onReplay }: PlayProps<Quiz>) {
  const copy = useCardsCopy();
  const me = session.mySeat;
  const them = otherSeat(me);
  const answered = activity.cards.map((item) => {
    const answers = answersBySeat<QuizAnswer>(session, quizKey(item));
    return bothAnswered(answers) ? answers : undefined;
  });
  const score = scoreQuiz(activity, answered);
  const summary = quizSummaryKey(score);
  const guesses = guessesKey(score);
  const optionsOf = (item: QuizCard) => (activity.format === 'more_likely' ? [copy('me'), copy('myPartner')] : item.options);
  const line = (item: QuizCard, cardIndex: number) => {
    const answers = answered[cardIndex];
    if (!answers) return '';
    const options = optionsOf(item);
    return `${copy('you')}: ${answerLabel(activity, item, options, answers[me])} · ${partnerName}: ${answerLabel(activity, item, options, answers[them])}`;
  };
  const heading = (item: QuizCard, cardIndex: number) =>
    promptRepeatsTitle(activity, item.prompt) ? item.options.join(' / ') || `${cardIndex + 1}.` : item.prompt;
  const differences = activity.cards
    .map((item, cardIndex) => ({ item, cardIndex }))
    .filter(({ cardIndex }) => {
      const answers = answered[cardIndex];
      return answers && revealCard(activity, cardIndex, answers).agreed === false;
    });

  return (
    <PlayCard tone="gold" dealKey="done">
      <Illustration image={activity.cover} aspectRatio={16 / 10}>
        <OverlayText kind="eyebrow">{activity.title}</OverlayText>
        <OverlayText kind="titleLarge">{copy('quizDone')}</OverlayText>
      </Illustration>
      {summary ? <Text variant="quote">{copy(summary)}</Text> : null}
      {guesses ? <Text variant="body">{copy(guesses)}</Text> : null}
      {differences.length ? (
        <View style={styles.block}>
          <Text variant="micro">{copy('worthTalking')}</Text>
          {differences.map(({ item, cardIndex }) => (
            <View key={item.id} style={styles.row}>
              <Text variant="label">{heading(item, cardIndex)}</Text>
              <Text variant="bodySmall">{line(item, cardIndex)}</Text>
            </View>
          ))}
        </View>
      ) : null}
      <View style={styles.block}>
        <Text variant="micro">{copy('allAnswers')}</Text>
        {activity.cards.map((item, cardIndex) =>
          answered[cardIndex] ? (
            <View key={item.id} style={styles.row}>
              <Text variant="label">{heading(item, cardIndex)}</Text>
              <Text variant="bodySmall">{line(item, cardIndex)}</Text>
            </View>
          ) : null
        )}
      </View>
      <GuideSuggestions connectionId={connectionId} suggestions={activity.guide ?? []} source={activity.title} partnerName={partnerName} />
      <FinishActions connectionId={connectionId} kind="quiz" onReplay={onReplay} />
    </PlayCard>
  );
}

function QuizCardView({
  session,
  activity,
  turn,
  partnerName,
  connectionId,
  onAnswer,
  card,
  index,
  onNext,
  busy,
  reviewing,
}: PlayProps<Quiz> & { card: QuizCard; index: number; onNext: () => void; reviewing: boolean }) {
  const copy = useCardsCopy();
  const me = session.mySeat;
  const needs = quizNeeds(activity, index, me);
  const [draft, setDraft] = useState<QuizAnswer>({});
  const key = quizKey(card);
  const options = activity.format === 'more_likely' ? [copy('me'), copy('myPartner')] : card.options;
  const answers = answersBySeat<QuizAnswer>(session, key);
  const repeats = promptRepeatsTitle(activity, card.prompt);
  const formatLabel = copy(`format.${activity.format}`);
  const counter = `${index + 1} / ${activity.cards.length}`;
  const header =
    activity.format === 'know_me'
      ? knowMeSubject(index) === me
        ? copy('youAnswerTheyGuess', { name: partnerName })
        : copy('theyAnswerYouGuess', { name: partnerName })
      : repeats
        ? `${activity.title.replace(/\?$/, '')}… · ${counter}`
        : counter;
  const answering = turn?.kind === 'answer' && !reviewing;
  const both = bothAnswered(answers) ? answers : null;
  const revealed = !!both && (reviewing || turn?.kind === 'reveal' || session.status === 'completed');
  const agreed = both ? revealCard(activity, index, both).agreed : null;
  const title = repeats ? activity.title : card.prompt;

  return (
    <View style={styles.stack}>
      <PlayCard dealKey={card.id}>
        {index === 0 ? (
          <Illustration image={activity.cover} aspectRatio={16 / 10}>
            {showFormatEyebrow(activity, formatLabel) ? <OverlayText kind="eyebrow">{formatLabel}</OverlayText> : null}
            <OverlayText kind="title">{activity.title}</OverlayText>
          </Illustration>
        ) : null}
        <Text variant="microAccent">{header}</Text>
        {answering ? (
          <>
            {needs.self ? (
              <View style={styles.block}>
                {needs.guess ? <Text variant="micro">{copy('aboutYou')}</Text> : null}
                {repeats ? null : <Text variant="displaySmall">{card.prompt}</Text>}
                <View style={styles.choices}>
                  {options.map((option, optionIndex) => (
                    <ChoiceOption
                      key={option}
                      index={optionIndex}
                      label={option}
                      selected={draft.self === optionIndex}
                      onPress={() => setDraft((current) => ({ ...current, self: optionIndex }))}
                    />
                  ))}
                </View>
              </View>
            ) : null}
            {needs.guess ? (
              <View style={styles.block}>
                {needs.self ? <Text variant="micro">{copy('yourGuess', { name: partnerName })}</Text> : null}
                <Text variant="displaySmall">{personalise(card.guessPrompt ?? card.prompt, partnerName)}</Text>
                <View style={styles.choices}>
                  {options.map((option, optionIndex) => (
                    <ChoiceOption
                      key={option}
                      index={optionIndex}
                      label={option}
                      selected={draft.guess === optionIndex}
                      onPress={() => setDraft((current) => ({ ...current, guess: optionIndex }))}
                    />
                  ))}
                </View>
              </View>
            ) : null}
            <Text variant="caption" center>{copy('privateNote')}</Text>
            <Button label={copy('lockIn')} disabled={!answerComplete(needs, draft)} loading={busy} onPress={() => onAnswer(key, draft)} />
          </>
        ) : repeats ? null : (
          <Text variant="displaySmall">
            {activity.format === 'know_me' && knowMeSubject(index) !== me ? personalise(card.guessPrompt ?? card.prompt, partnerName) : card.prompt}
          </Text>
        )}
        {turn?.kind === 'waiting' && !reviewing ? <Waiting label={copy('waitingFor', { name: partnerName })} /> : null}
      </PlayCard>

      {revealed && both ? (
        <PlayCard tone="gold" dealKey={`${card.id}-reveal`}>
          <Reveal quiz={activity} card={card} index={index} answers={both} me={me} partnerName={partnerName} options={options} />
          {card.talk ? <Text variant="quote">{card.talk}</Text> : null}
          {activity.format !== 'know_me' && activity.format !== 'more_likely' ? (
            <DiscussButton
              connectionId={connectionId}
              text={
                agreed
                  ? copy('discuss.same', { title, mine: answerLabel(activity, card, options, both[me]) })
                  : copy('discuss.differ', {
                      title,
                      mine: answerLabel(activity, card, options, both[me]),
                      theirs: answerLabel(activity, card, options, both[otherSeat(me)]),
                    })
              }
            />
          ) : null}
          <Button label={index === activity.cards.length - 1 ? copy('finish') : copy('next')} onPress={onNext} loading={busy} />
        </PlayCard>
      ) : null}
    </View>
  );
}

function Reveal({
  quiz,
  card,
  index,
  answers,
  me,
  partnerName,
  options,
}: {
  quiz: Quiz;
  card: QuizCard;
  index: number;
  answers: Record<Seat, QuizAnswer>;
  me: Seat;
  partnerName: string;
  options: string[];
}) {
  const copy = useCardsCopy();
  const reducedMotion = useReducedMotion();
  const reveal = revealCard(quiz, index, answers);
  const them = otherSeat(me);
  const nameOf = (seat: Seat) => (seat === me ? copy('you') : partnerName);
  const option = (value: number | undefined) => (value === undefined ? '—' : options[value] ?? '—');
  const verdict = (agreed: boolean | null, distance?: number) =>
    agreed === null ? null : agreed ? copy('samePage') : distance === 1 ? copy('close') : distance ? copy('apart', { count: distance }) : copy('different');

  const banner = (label: string | null, gold: boolean) =>
    label ? (
      <Animated.View entering={reducedMotion ? undefined : ZoomIn.delay(600).springify()}>
        <Pill label={label} tone={gold ? 'gold' : 'quiet'} />
      </Animated.View>
    ) : null;

  switch (quiz.format) {
    case 'know_me': {
      const subject = knowMeSubject(index);
      const guesser = otherSeat(subject);
      const right = reveal.guessedRight[guesser];
      return (
        <View style={styles.tiles}>
          <RevealTile index={0} who={`${nameOf(subject)} · ${copy('said')}`} answer={option(answers[subject].self)} />
          <RevealTile
            index={1}
            who={`${nameOf(guesser)} · ${copy('guessed')}`}
            answer={option(answers[guesser].guess)}
            badge={right ? `✓ ${copy('guessedRight')}` : copy('guessedWrong')}
          />
        </View>
      );
    }
    case 'guess_my_answer':
      return (
        <View style={styles.block}>
          {banner(verdict(reveal.agreed), !!reveal.agreed)}
          <View style={styles.tiles}>
            {[me, them].map((seat, tileIndex) => (
              <RevealTile
                key={seat}
                index={tileIndex}
                who={nameOf(seat)}
                answer={option(answers[seat].self)}
                detail={`${nameOf(otherSeat(seat))} ${copy('guessed')}: ${option(answers[otherSeat(seat)].guess)}`}
                badge={reveal.guessedRight[otherSeat(seat)] ? `✓ ${copy('guessedRight')}` : copy('guessedWrong')}
              />
            ))}
          </View>
        </View>
      );
    case 'more_likely':
      return (
        <View style={styles.block}>
          {banner(reveal.agreed ? copy('agreeWho') : copy('disagreeWho'), !!reveal.agreed)}
          <View style={styles.tiles}>
            {[me, them].map((seat, tileIndex) => (
              <RevealTile
                key={seat}
                index={tileIndex}
                who={`${nameOf(seat)} · ${copy('pointedAt')}`}
                answer={reveal.pointed ? nameOf(reveal.pointed[seat]) : '—'}
              />
            ))}
          </View>
        </View>
      );
    case 'scale':
      return (
        <View style={styles.block}>
          {banner(verdict(reveal.agreed, reveal.distance), !!reveal.agreed)}
          <View style={styles.scale}>
            {card.options.map((label, optionIndex) => {
              const mine = answers[me].self === optionIndex;
              const theirs = answers[them].self === optionIndex;
              return (
                <View key={label} style={styles.scaleStop}>
                  <View style={[styles.scaleDot, (mine || theirs) && styles.scaleDotOn, mine && theirs && styles.scaleDotBoth]} />
                  <Text style={[styles.scaleLabel, (mine || theirs) && styles.scaleLabelOn]} numberOfLines={3}>{label}</Text>
                  {mine || theirs ? (
                    <Text style={styles.scaleWho}>{[mine ? copy('you') : null, theirs ? partnerName : null].filter(Boolean).join(' & ')}</Text>
                  ) : null}
                </View>
              );
            })}
          </View>
        </View>
      );
    default:
      return (
        <View style={styles.block}>
          {banner(verdict(reveal.agreed), !!reveal.agreed)}
          <View style={styles.tiles}>
            {[me, them].map((seat, tileIndex) => (
              <RevealTile key={seat} index={tileIndex} who={nameOf(seat)} answer={option(answers[seat].self)} />
            ))}
          </View>
        </View>
      );
  }
}

const styles = StyleSheet.create({
  stack: { gap: space.lg },
  row: { gap: 2, paddingVertical: space.xs, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: alpha.line },
  block: { gap: space.md },
  choices: { gap: space.sm },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  scale: { flexDirection: 'row', gap: 4, borderTopWidth: 1, borderTopColor: alpha.line, paddingTop: space.md },
  scaleStop: { flex: 1, alignItems: 'center', gap: 6 },
  scaleDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: alpha.lineStrong, marginTop: -19 },
  scaleDotOn: { backgroundColor: color.goldGlow, width: 16, height: 16, borderRadius: 8, marginTop: -21 },
  scaleDotBoth: { backgroundColor: color.ink },
  scaleLabel: { fontFamily: font.body, fontSize: 10.5, lineHeight: 14, color: color.faint, textAlign: 'center' },
  scaleLabelOn: { color: color.ink, fontFamily: font.bodySemi },
  scaleWho: { fontFamily: font.bodySemi, fontSize: 10, color: color.gold, textAlign: 'center' },
});
