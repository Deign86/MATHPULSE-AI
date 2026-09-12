/**
 * View contracts shared by the battle presentation components.
 *
 * These components previously accepted `any`, which discarded the typed
 * QuizBattleLiveMatchState contract at the component boundary and let the UI
 * read fields the service never sends. Each view type below names exactly the
 * fields its component consumes, so the page keeps the full model while the
 * children stay narrow.
 */
import type { AvatarLayers } from '../CompositeAvatar';
import type { QuizBattleLiveMatchState } from '../../services/quizBattleService';

/** Topic title lookup needs only the subject label and its module ids/titles. */
export interface BattleSubjectView {
  title: string;
  modules?: Array<{ id: string; title: string }>;
}

/** Header shows the current topic. */
export type BattleHeaderMatchView = Pick<QuizBattleLiveMatchState, 'topicId'>;

/** Footer shows both scores and the opponent identity. */
export type BattleFooterMatchView = Pick<
  QuizBattleLiveMatchState,
  'scoreFor' | 'scoreAgainst' | 'mode' | 'opponentName'
>;

/** Active content drives the round, question and option-reveal rendering. */
export type BattleActiveMatchView = Pick<
  QuizBattleLiveMatchState,
  'mode' | 'currentRound' | 'totalRounds' | 'currentQuestion'
>;

/** Floating momentum toast raised when the round changes the score gap. */
export interface BattleFloatingMomentum {
  id: number;
  label: string;
  tone: 'positive' | 'negative' | 'neutral';
}

/** Player identity rendered on the left of the battle footer. */
export interface BattlePlayerView {
  name?: string | null;
  level?: number | null;
  photo?: string | null;
  avatarLayers?: AvatarLayers | null;
}
