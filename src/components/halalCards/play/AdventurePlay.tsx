import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { DiscussButton, FinishActions } from '@/components/halalCards/Actions';
import { ChoiceOption, LessonChip, Pill, PlayCard, Waiting } from '@/components/halalCards/CardParts';
import { GuideSuggestions } from '@/components/halalCards/GuideSaveButton';
import { Illustration, OverlayText } from '@/components/halalCards/Illustration';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { useCardsCopy } from '@/halalCards/copy';
import {
  canLetStoryDecide,
  choicesFor,
  currentEnding,
  currentScene,
  endingEpilogues,
  findChoice,
  findLesson,
  letStoryDecide,
  resolveRoleChoice,
  roleOfSeat,
  sceneLessons,
  scenePassages,
  variableReadings,
} from '@/halalCards/engine/adventure';
import { answersBySeat } from '@/halalCards/engine/seats';
import type { Adventure, AdventureState, Seat, StoryEnding, StoryReveal } from '@/halalCards/types';
import { alpha, color, font, space } from '@/theme/tokens';
import type { PlayProps } from './types';

/** A darker, earthier mark for states where more is worse (resentment, the loop). */
const CONCERN = '#D08A63';

export function AdventurePlay(props: PlayProps<Adventure>) {
  const { session, activity, partnerName, solo } = props;
  const copy = useCardsCopy();
  const state = session.state as AdventureState;
  // Each phone keeps its own note of which reveals it has read, and works
  // through any newer ones in order, so a player who was away sees every move
  // made meanwhile. Opening a session shows only the latest, as a reminder.
  const reveals = state.reveals ?? [];
  const [seenSeq, setSeenSeq] = useState(() => Math.max(0, (reveals[reveals.length - 1]?.seq ?? 0) - 1));
  const myRole = activity.roles[roleOfSeat(state, session.mySeat)];

  const roleNameOf = (seat: Seat) => activity.roles[roleOfSeat(state, seat)].name;
  // Alone, you are both characters, so moves are named by character.
  const nameOf = (seat: Seat) => (solo ? roleNameOf(seat) : seat === session.mySeat ? copy('you') : partnerName);

  const reveal = reveals.find((item) => item.seq > seenSeq);

  return (
    <View style={styles.stack}>
      <View style={styles.roleBar}>
        <Pill label={copy('role', { name: myRole.name })} tone="ink" />
      </View>
      {solo && !reveal && !state.endingId ? (
        <Text variant="caption" center>{copy('soloBoth', { a: activity.roles.A.name, b: activity.roles.B.name })}</Text>
      ) : null}
      {reveal ? (
        <RevealCard
          activity={activity}
          state={state}
          reveal={reveal}
          mySeat={session.mySeat}
          nameOf={nameOf}
          roleNameOf={roleNameOf}
          connectionId={props.connectionId}
          solo={solo}
          onContinue={() => setSeenSeq(reveal.seq)}
        />
      ) : state.endingId ? (
        <EndingView {...props} state={state} />
      ) : (
        <SceneView
          key={`${state.step}:${state.attempt}:${session.mySeat}`}
          {...props}
          state={state}
          nameOf={nameOf}
          roleNameOf={roleNameOf}
        />
      )}
    </View>
  );
}

function RevealCard({
  activity,
  state,
  reveal,
  mySeat,
  nameOf,
  roleNameOf,
  connectionId,
  solo,
  onContinue,
}: {
  activity: Adventure;
  state: AdventureState;
  reveal: StoryReveal;
  mySeat: Seat;
  nameOf: (seat: Seat) => string;
  roleNameOf: (seat: Seat) => string;
  connectionId: string;
  solo?: boolean;
  onContinue: () => void;
}) {
  const copy = useCardsCopy();
  const scene = activity.scenes[reveal.sceneId];
  if (!scene) return null;
  const lessons = reveal.lessonIds.map((id) => findLesson(activity, id)).filter((lesson) => !!lesson);
  const seats = (['host', 'guest'] as Seat[]).filter((seat) => reveal.picks[seat]);
  const beat = reveal.beats[0];

  return (
    <PlayCard tone="gold" dealKey={`reveal-${reveal.seq}`}>
      {scene.image ? (
        <Illustration image={scene.image} aspectRatio={16 / 10}>
          <OverlayText kind="eyebrow">{activity.title}</OverlayText>
          <OverlayText kind="title">{scene.title}</OverlayText>
        </Illustration>
      ) : (
        <Text variant="microAccent">{scene.title}</Text>
      )}
      {/* A move made while this player was away: show what it answered. */}
      {!solo && reveal.picks[mySeat] === undefined ? (
        <View style={styles.missed}>
          {scenePassages(scene, state).map((passage) => (
            <Text key={passage} variant="bodySmall">{passage}</Text>
          ))}
          <Text variant="label">{scene.decision.prompt}</Text>
        </View>
      ) : null}
      <View style={styles.picks}>
        {seats.map((seat) => {
          const choice = findChoice(scene.decision, reveal.picks[seat] as string);
          return (
            <View key={seat} style={styles.pick}>
              <Text variant="micro">{solo ? `${roleNameOf(seat)} ${copy('chose')}` : `${nameOf(seat)} · ${roleNameOf(seat)} ${copy('chose')}`}</Text>
              <Text style={styles.pickText}>{choice?.label}</Text>
            </View>
          );
        })}
      </View>
      {reveal.mismatch ? (
        <Text variant="quote">{copy('mismatch')}</Text>
      ) : (
        reveal.beats.map((item) => (
          <Text key={item} variant="body" style={styles.beat}>{item}</Text>
        ))
      )}
      {lessons.map((lesson, index) => (
        <LessonChip key={lesson.id} tag={lesson.tag} text={lesson.text} delay={300 + index * 150} />
      ))}
      {!solo && beat && !reveal.mismatch ? (
        <DiscussButton connectionId={connectionId} text={copy('discuss.story', { title: activity.title, beat })} />
      ) : null}
      <Button label={copy('continue')} onPress={onContinue} />
    </PlayCard>
  );
}

function SceneView({
  session,
  activity,
  turn,
  partnerName,
  onAnswer,
  onAdvance,
  busy,
  solo,
  state,
  roleNameOf,
}: PlayProps<Adventure> & { state: AdventureState; nameOf: (seat: Seat) => string; roleNameOf: (seat: Seat) => string }) {
  const copy = useCardsCopy();
  const [selected, setSelected] = useState<string | null>(null);
  const scene = currentScene(activity, state);
  if (!scene) return null;
  const { decision } = scene;
  const me = session.mySeat;
  const options = choicesFor(decision, state, me);
  const actorSeat = decision.mode === 'role' ? state.roles[decision.actor ?? 'A'] : undefined;
  const watching = turn?.kind === 'watch';
  const myPick = turn && 'key' in turn ? answersBySeat<string>(session, turn.key)[me] : undefined;
  const escape = canLetStoryDecide(activity, state);
  // In a solo preview the second sealed choice is made as the other character.
  const secondPass = solo && decision.mode === 'private' && !!turn && 'key' in turn && !!session.answers[turn.key]?.theirReady;

  const confirm = () => {
    if (!selected || !turn) return;
    if (turn.kind === 'decide') onAdvance(resolveRoleChoice(activity, state, me, selected));
    else if (turn.kind === 'answer') onAnswer(turn.key, selected);
  };

  return (
    <View style={styles.stack}>
      <PlayCard dealKey={scene.id}>
        {scene.image ? (
          <Illustration image={scene.image} aspectRatio={scene.turningPoint ? 4 / 5 : 16 / 10}>
            <OverlayText kind="eyebrow">
              {scene.turningPoint ? `✦ ${copy('turningPoint')} · ${activity.title}` : activity.title}
            </OverlayText>
            <OverlayText kind={scene.turningPoint ? 'titleLarge' : 'title'}>{scene.title}</OverlayText>
          </Illustration>
        ) : (
          <>
            <View style={styles.sceneHead}>
              <Text variant="microAccent">{activity.title}</Text>
              {scene.turningPoint ? <Pill label={copy('turningPoint')} tone="gold" /> : null}
            </View>
            <Text variant="display">{scene.title}</Text>
          </>
        )}
        {scenePassages(scene, state).map((passage) => (
          <Text key={passage} variant="body" style={styles.passage}>{passage}</Text>
        ))}
        {sceneLessons(scene, state).map((lesson, index) => (
          <LessonChip key={lesson.id} tag={lesson.tag} text={lesson.text} delay={200 + index * 120} />
        ))}
      </PlayCard>

      <PlayCard dealKey={`${scene.id}-decision`}>
        {secondPass ? <Pill label={copy('soloThem', { role: roleNameOf(me) })} tone="gold" /> : null}
        <Text variant="micro">
          {decision.mode === 'role'
            ? watching && actorSeat
              ? copy('theirMove', { role: roleNameOf(actorSeat), name: partnerName })
              : copy('yourMove', { role: roleNameOf(me) })
            : decision.mode === 'joint'
              ? copy('jointNote')
              : copy('privateChoice')}
        </Text>
        <Text variant="displaySmall">{decision.prompt}</Text>

        {turn?.kind === 'waiting' ? (
          <>
            <ChoiceOption
              index={Math.max(0, options.findIndex((item) => item.id === myPick))}
              label={options.find((item) => item.id === myPick)?.label ?? ''}
              selected
              disabled
            />
            <Waiting label={copy('waitingFor', { name: partnerName })} />
          </>
        ) : turn?.kind === 'resolve' ? (
          <Waiting label={copy('revealing')} />
        ) : (
          <>
            <View style={styles.choices}>
              {(watching && actorSeat ? choicesFor(decision, state, actorSeat) : options).map((choice, index) => (
                <ChoiceOption
                  key={choice.id}
                  index={index}
                  label={choice.label}
                  selected={selected === choice.id}
                  dimmed={watching}
                  onPress={() => setSelected(choice.id)}
                />
              ))}
            </View>
            {watching ? (
              <Waiting label={copy('theirTurn', { name: partnerName })} />
            ) : (
              <>
                {decision.mode !== 'role' && !solo ? <Text variant="caption" center>{copy('privateNote')}</Text> : null}
                <Button
                  label={decision.mode === 'role' ? copy('choose') : copy('lockIn')}
                  disabled={!selected}
                  loading={busy}
                  onPress={confirm}
                />
              </>
            )}
          </>
        )}

        {escape && turn?.kind !== 'resolve' ? (
          <View style={styles.escape}>
            <Text variant="bodySmall">{copy('letStoryDecideNote')}</Text>
            <Button label={copy('letStoryDecide')} variant="secondary" onPress={() => onAdvance(letStoryDecide(activity, state))} />
          </View>
        ) : null}
      </PlayCard>
    </View>
  );
}

function EndingView({ activity, partnerName, connectionId, state, solo, onReplay }: PlayProps<Adventure> & { state: AdventureState }) {
  const copy = useCardsCopy();
  const ending = currentEnding(activity, state) as StoryEnding | undefined;
  if (!ending) return null;
  const beats = state.history.flatMap((entry) => entry.beats);
  const readings = variableReadings(activity, state);

  return (
    <View style={styles.stack}>
      <PlayCard dealKey={`ending-${ending.id}`}>
        <Illustration image={ending.image} aspectRatio={4 / 5}>
          <OverlayText kind="eyebrow">
            {`${copy(`mood.${ending.mood}`)} · ${copy('endingReached', { total: Object.keys(activity.endings).length })}`}
          </OverlayText>
          <OverlayText kind="titleLarge">{ending.title}</OverlayText>
        </Illustration>
        <Text variant="micro">{copy('whatHappened')}</Text>
        <Text variant="quote">{ending.whatHappened}</Text>
        {endingEpilogues(ending, state).map((line) => (
          <Text key={line} variant="body" style={styles.passage}>{line}</Text>
        ))}
      </PlayCard>

      <PlayCard dealKey={`path-${ending.id}`}>
        <Text variant="micro">{copy('howYouGotHere')}</Text>
        {beats.map((beat, index) => (
          <View key={`${index}-${beat}`} style={styles.beatRow}>
            <Text style={styles.beatIndex}>{index + 1}</Text>
            <Text variant="body" style={styles.beatText}>{beat}</Text>
          </View>
        ))}
      </PlayCard>

      <PlayCard tone="dark" dealKey={`pattern-${ending.id}`}>
        <Text variant="microAccent">{copy('pattern')}</Text>
        <Text variant="displaySmall">{ending.pattern.name}</Text>
        <Text variant="body">{ending.pattern.explanation}</Text>
        <View style={styles.readings}>
          <Text variant="micro">{copy('hiddenStates')}</Text>
          {readings.map((reading) => (
            <View key={reading.name} style={styles.reading}>
              <View style={styles.meter}>
                {[0, 1, 2].map((level) => (
                  <View
                    key={level}
                    style={[
                      styles.meterDot,
                      level <= reading.level && (reading.concerning ? styles.meterDotConcern : styles.meterDotOn),
                    ]}
                  />
                ))}
              </View>
              <View style={styles.flex}>
                <Text variant="label">{reading.label}</Text>
                <Text variant="bodySmall">{reading.reading}</Text>
              </View>
            </View>
          ))}
        </View>
      </PlayCard>

      <PlayCard dealKey={`lesson-${ending.id}`}>
        <Text variant="micro">{copy('couldHaveChanged')}</Text>
        <Text variant="body">{ending.couldHaveChanged}</Text>
        <LessonChip tag={copy('takeaway')} text={ending.takeaway} />
        {solo ? (
          <Text variant="body">{copy('soloDoneBody', { name: partnerName })}</Text>
        ) : (
          <GuideSuggestions connectionId={connectionId} suggestions={ending.guide ?? []} source={activity.title} partnerName={partnerName} />
        )}
      </PlayCard>

      <Text variant="caption" center>{copy('replayHint')}</Text>
      <FinishActions connectionId={connectionId} kind="adventure" onReplay={onReplay} solo={solo} />
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: space.lg },
  flex: { flex: 1, gap: 2 },
  roleBar: { flexDirection: 'row', justifyContent: 'center' },
  sceneHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm, flexWrap: 'wrap' },
  passage: { fontSize: 14.5, lineHeight: 24 },
  choices: { gap: space.sm },
  escape: { gap: space.sm, paddingTop: space.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: alpha.line },
  picks: { gap: space.md },
  missed: { gap: space.sm, paddingBottom: space.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: alpha.line },
  pick: { gap: 4, paddingBottom: space.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: alpha.line },
  pickText: { fontFamily: font.display, fontSize: 17, lineHeight: 23, color: color.ink },
  beat: { fontStyle: 'italic' },
  beatRow: { flexDirection: 'row', gap: space.md, alignItems: 'flex-start' },
  beatIndex: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: color.sand,
    textAlign: 'center',
    lineHeight: 22,
    fontFamily: font.bodySemi,
    fontSize: 10.5,
    color: color.gold,
    overflow: 'hidden',
  },
  beatText: { flex: 1 },
  readings: { gap: space.md, marginTop: space.sm },
  reading: { flexDirection: 'row', gap: space.md, alignItems: 'center' },
  meter: { flexDirection: 'row', gap: 4 },
  meterDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: 'rgba(252,252,251,0.18)' },
  meterDotOn: { backgroundColor: color.goldOnDark },
  meterDotConcern: { backgroundColor: CONCERN },
});
