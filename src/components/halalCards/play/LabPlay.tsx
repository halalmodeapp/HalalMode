import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { DiscussButton, FinishActions } from '@/components/halalCards/Actions';
import { ChoiceOption, Pill, PlayCard, Points, RevealTile, Waiting } from '@/components/halalCards/CardParts';
import { GuideSuggestions } from '@/components/halalCards/GuideSaveButton';
import { Illustration, OverlayText } from '@/components/halalCards/Illustration';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { useCardsCopy } from '@/halalCards/copy';
import { labAgreement, labKey } from '@/halalCards/engine/lab';
import { answersBySeat, otherSeat } from '@/halalCards/engine/seats';
import { advanceCursor } from '@/halalCards/engine/session';
import { initialSeenCursor, viewCursor } from '@/halalCards/present';
import type { LabLesson, LabState, LabStep } from '@/halalCards/types';
import { color, radius, space } from '@/theme/tokens';
import { SurfaceToneProvider } from '@/theme/tone';
import type { PlayProps } from './types';

const AGREEMENT = {
  same: 'sameChoice',
  both_help: 'bothHelp',
  split: 'split',
  both_struggle: 'bothStruggle',
} as const;

export function LabPlay(props: PlayProps<LabLesson>) {
  const { session, activity, partnerName, connectionId, onAdvance, busy, solo, onReplay } = props;
  const copy = useCardsCopy();
  const state = session.state as LabState;
  const [seen, setSeen] = useState(() => initialSeenCursor(activity, session));
  const { index, catchingUp } = viewCursor(seen, state.cursor);
  const step = activity.steps[index];

  // My own Next moves my mark with the cursor, so I am never "caught up" on a
  // card I just left. Someone else's Next leaves my mark behind.
  const next = () => {
    if (catchingUp) {
      setSeen(index + 1);
      return;
    }
    setSeen(state.cursor + 1);
    onAdvance(advanceCursor(activity, state));
  };

  if (!step) {
    const insights = activity.steps.flatMap((item) => (item.type === 'insight' ? item.points ?? [] : []));
    const suggestions = activity.steps.flatMap((item) => (item.type === 'discussion' ? item.guide ?? [] : []));
    return (
      <PlayCard tone="gold" dealKey="done">
        <Illustration image={activity.cover} aspectRatio={16 / 10}>
          <OverlayText kind="eyebrow">{`${activity.ruleLabel} · ${activity.title}`}</OverlayText>
          <OverlayText kind="titleLarge">{solo ? copy('soloDone') : copy('lessonDone')}</OverlayText>
        </Illustration>
        <Text variant="micro">{copy('lessonDoneBody')}</Text>
        <Points items={insights} />
        {solo ? (
          <Text variant="body">{copy('soloDoneBody', { name: partnerName })}</Text>
        ) : (
          <GuideSuggestions connectionId={connectionId} suggestions={suggestions} source={activity.title} partnerName={partnerName} />
        )}
        <FinishActions connectionId={connectionId} kind="lab" onReplay={onReplay} solo={solo} />
      </PlayCard>
    );
  }

  const isLast = index === activity.steps.length - 1;
  const scenarioNumber = activity.steps.slice(0, index + 1).filter((item) => item.type === 'scenario').length;
  const banner = catchingUp ? <Pill label={copy('catchUp', { name: partnerName })} tone="gold" /> : null;

  switch (step.type) {
    case 'intro':
    case 'insight':
      return (
        <View style={styles.stack}>
          {banner}
          <PlayCard tone={step.type === 'insight' ? 'gold' : 'light'} dealKey={step.id}>
            {step.type === 'intro' ? (
              <Illustration image={activity.cover} aspectRatio={4 / 5}>
                <OverlayText kind="eyebrow">{`${activity.ruleLabel} · ${activity.title}`}</OverlayText>
                <OverlayText kind="titleLarge">{step.title}</OverlayText>
              </Illustration>
            ) : (
              <>
                <Text variant="microAccent">{copy('insight')}</Text>
                <Text variant="display">{step.title}</Text>
              </>
            )}
            <Text variant="body">{step.body}</Text>
            {step.type === 'insight' && step.points ? <Points items={step.points} /> : null}
            <Button label={copy('next')} onPress={next} loading={busy && !catchingUp} />
          </PlayCard>
        </View>
      );

    case 'discussion':
      return (
        <View style={styles.stack}>
          {banner}
          <PlayCard tone="dark" dealKey={step.id}>
            <Text variant="microAccent">{copy('talk')}</Text>
            <Text variant="display">{step.prompt}</Text>
            {step.followUps?.length ? (
              <View style={styles.points}>
                <Text variant="micro">{copy('followUps')}</Text>
                {step.followUps.map((followUp) => (
                  <Text key={followUp} variant="body">• {followUp}</Text>
                ))}
              </View>
            ) : null}
            {step.guide?.length && !solo ? (
              <SurfaceToneProvider tone="light">
                <View style={styles.guide}>
                  <GuideSuggestions connectionId={connectionId} suggestions={step.guide} source={activity.title} partnerName={partnerName} />
                </View>
              </SurfaceToneProvider>
            ) : null}
            {!solo ? <DiscussButton connectionId={connectionId} text={`Halal Cards · ${activity.title}: ${step.prompt}`} /> : null}
            <Button label={isLast ? copy('finish') : copy('next')} variant="onDark" onPress={next} loading={busy && !catchingUp} />
          </PlayCard>
        </View>
      );

    case 'scenario':
      return (
        <View style={styles.stack}>
          {banner}
          <Scenario key={step.id} {...props} step={step} number={scenarioNumber} reviewing={catchingUp} onNext={next} />
        </View>
      );
  }
}

function Scenario({
  step,
  number,
  activity,
  session,
  turn,
  partnerName,
  connectionId,
  onAnswer,
  onNext,
  busy,
  solo,
  reviewing,
}: PlayProps<LabLesson> & {
  step: Extract<LabStep, { type: 'scenario' }>;
  number: number;
  reviewing: boolean;
  onNext: () => void;
}) {
  const copy = useCardsCopy();
  const [selected, setSelected] = useState<string | null>(null);
  const key = labKey(step);
  const picks = answersBySeat<string>(session, key);
  const mine = picks[session.mySeat];
  const theirs = picks[otherSeat(session.mySeat)];
  const choice = (id: string | undefined) => step.choices.find((item) => item.id === id);
  const revealed = !!mine && !!theirs && (reviewing || turn?.kind === 'reveal' || session.status === 'completed');
  const agreement =
    mine && theirs
      ? AGREEMENT[labAgreement(activity, step.id, session.mySeat === 'host' ? { host: mine, guest: theirs } : { host: theirs, guest: mine })]
      : null;

  return (
    <View style={styles.stack}>
      <PlayCard dealKey={step.id}>
        {step.image ? (
          <Illustration image={step.image} aspectRatio={16 / 10}>
            <OverlayText kind="eyebrow">{`${activity.ruleLabel} · ${number}`}</OverlayText>
            <OverlayText kind="title">{step.title}</OverlayText>
          </Illustration>
        ) : (
          <Text variant="displaySmall">{step.title}</Text>
        )}
        <Text variant="body">{step.body}</Text>
        <Text variant="quote">{step.prompt}</Text>

        {turn?.kind === 'answer' && !reviewing ? (
          <>
            <View style={styles.choices}>
              {step.choices.map((item, index) => (
                <ChoiceOption key={item.id} index={index} label={item.label} selected={selected === item.id} onPress={() => setSelected(item.id)} />
              ))}
            </View>
            {!solo ? <Text variant="caption" center>{copy('privateNote')}</Text> : null}
            <Button label={copy('lockIn')} disabled={!selected} loading={busy} onPress={() => selected && onAnswer(key, selected)} />
          </>
        ) : null}

        {turn?.kind === 'waiting' && !reviewing ? (
          <>
            <ChoiceOption index={step.choices.findIndex((item) => item.id === mine)} label={choice(mine)?.label ?? ''} selected disabled />
            <Waiting label={copy('waitingFor', { name: partnerName })} />
          </>
        ) : null}
      </PlayCard>

      {revealed && solo ? (
        <PlayCard tone="gold" dealKey={`${step.id}-solo`}>
          <RevealTile who={copy('you')} answer={choice(mine)?.label ?? ''} detail={choice(mine)?.consequence} badge={copy(`tone.${choice(mine)?.tone ?? 'mixed'}`)} />
          <Text variant="micro">{copy('soloOtherPaths')}</Text>
          {step.choices
            .filter((item) => item.id !== mine)
            .map((item) => (
              <View key={item.id} style={styles.otherPath}>
                <Text variant="label">{item.label}</Text>
                <Text variant="bodySmall">{item.consequence}</Text>
              </View>
            ))}
          <Button label={copy('next')} onPress={onNext} loading={busy && !reviewing} />
        </PlayCard>
      ) : null}

      {revealed && !solo ? (
        <PlayCard tone="gold" dealKey={`${step.id}-reveal`}>
          {agreement ? <Text variant="microAccent">{copy(agreement)}</Text> : null}
          <View style={styles.tiles}>
            {[
              { who: copy('you'), id: mine, own: true },
              { who: partnerName, id: theirs, own: false },
            ].map((item, index) => {
              const picked = choice(item.id);
              return picked ? (
                <RevealTile
                  key={item.who}
                  index={index}
                  who={item.who}
                  answer={picked.label}
                  detail={picked.consequence}
                  // A gentle read on your own choice only — never a grade on theirs.
                  badge={item.own ? copy(`tone.${picked.tone}`) : undefined}
                />
              ) : null;
            })}
          </View>
          <Text variant="caption">{copy('toneNote')}</Text>
          <DiscussButton
            connectionId={connectionId}
            text={
              mine === theirs
                ? copy('discuss.same', { title: step.title, mine: choice(mine)?.label ?? '' })
                : copy('discuss.differ', { title: step.title, mine: choice(mine)?.label ?? '', theirs: choice(theirs)?.label ?? '' })
            }
          />
          <Button label={copy('next')} onPress={onNext} loading={busy && !reviewing} />
        </PlayCard>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: space.lg },
  points: { gap: space.sm },
  guide: { backgroundColor: color.surface, borderRadius: radius.lg, padding: space.lg },
  choices: { gap: space.sm },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  otherPath: { gap: 2, paddingVertical: space.xs },
});
