import React from 'react';
import {
  ArrowRight,
  Clock3,
  Eye,
  PencilLine,
  Sparkles,
  Swords,
  type LucideIcon,
} from 'lucide-react';
import ChatMarkdown from '../ChatMarkdown';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '../ui/card';
import { cn } from '../ui/utils';

export const MICRO_LESSON_PHASES = [
  'Activation',
  'Demonstration',
  'Application',
  'Integration',
] as const;

export type MicroLessonPhase = (typeof MICRO_LESSON_PHASES)[number];

export interface MicroLessonCardProps {
  phase: MicroLessonPhase;
  title: string;
  body: string;
  katex?: string;
  minutes?: number;
}

interface PhaseVisual {
  icon: LucideIcon;
  border: string;
  iconSurface: string;
  phaseText: string;
  rail: string;
}

const phaseVisuals = {
  Activation: {
    icon: Sparkles,
    border: 'border-summer-sky/30 dark:border-summer-sky/40',
    iconSurface: 'bg-summer-sky/15 text-summer-sky dark:bg-summer-sky/20 dark:text-summer-sky',
    phaseText: 'text-summer-sky dark:text-summer-sky',
    rail: 'bg-summer-sky',
  },
  Demonstration: {
    icon: Eye,
    border: 'border-texas-rose/35 dark:border-texas-rose/45',
    iconSurface: 'bg-texas-rose/15 text-texas-rose dark:bg-texas-rose/20 dark:text-texas-rose',
    phaseText: 'text-texas-rose dark:text-texas-rose',
    rail: 'bg-texas-rose',
  },
  Application: {
    icon: PencilLine,
    border: 'border-pastel-green/35 dark:border-pastel-green/45',
    iconSurface: 'bg-pastel-green/15 text-pastel-green dark:bg-pastel-green/20 dark:text-pastel-green',
    phaseText: 'text-pastel-green dark:text-pastel-green',
    rail: 'bg-pastel-green',
  },
  Integration: {
    icon: Swords,
    border: 'border-amethyst/35 dark:border-amethyst/45',
    iconSurface: 'bg-amethyst/15 text-amethyst dark:bg-amethyst/20 dark:text-amethyst',
    phaseText: 'text-amethyst dark:text-amethyst',
    rail: 'bg-amethyst',
  },
} satisfies Record<MicroLessonPhase, PhaseVisual>;

function dispatchBattleNavigation(event: React.MouseEvent<HTMLAnchorElement>) {
  event.preventDefault();
  window.dispatchEvent(new CustomEvent('mathpulse:navigate', { detail: { tab: 'Quiz Battle' } }));
}

export const MicroLessonCard: React.FC<MicroLessonCardProps> = ({
  phase,
  title,
  body,
  katex,
  minutes = 3,
}) => {
  const visual = phaseVisuals[phase];
  const PhaseIcon = visual.icon;

  return (
    <Card
      role="article"
      className={cn(
        'relative isolate overflow-hidden rounded-3xl border-2 bg-card shadow-xl shadow-foreground/5 dark:shadow-black/25',
        visual.border,
      )}
    >
      <div aria-hidden="true" className={cn('absolute inset-y-0 left-0 w-1.5', visual.rail)} />

      <CardHeader className="gap-5 px-5 pb-0 pt-5 sm:px-8 sm:pt-8">
        <div className="flex items-start gap-4">
          <div
            className={cn(
              'flex size-12 shrink-0 items-center justify-center rounded-2xl border border-current/20 sm:size-14',
              visual.iconSurface,
            )}
          >
            <PhaseIcon aria-hidden="true" className="size-6 sm:size-7" strokeWidth={2.25} />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className={cn(
                  'rounded-full px-2.5 py-1 text-[0.68rem] font-extrabold uppercase tracking-[0.16em]',
                  visual.phaseText,
                )}
              >
                {phase}
              </Badge>
              <span className="inline-flex items-center gap-1.5 text-xs font-bold tabular-nums text-muted-foreground">
                <Clock3 aria-hidden="true" className="size-3.5" />
                {minutes} min quest
              </span>
            </div>
            <CardTitle className="mt-3 text-balance font-display text-2xl font-extrabold leading-tight text-foreground sm:text-3xl">
              {title}
            </CardTitle>
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-5 pb-5 pt-5 sm:px-8 sm:pb-8 sm:pt-6">
        <div className="rounded-2xl border border-border bg-muted/35 p-4 text-base leading-7 text-foreground dark:bg-background/45 sm:p-5">
          <ChatMarkdown>{body}</ChatMarkdown>
          {katex ? (
            <div className="mt-5 overflow-x-auto rounded-xl border border-border bg-card px-4 py-3 text-center dark:bg-card/80">
              <ChatMarkdown>{`$$${katex}$$`}</ChatMarkdown>
            </div>
          ) : null}
        </div>
      </CardContent>

      {phase === 'Integration' ? (
        <CardFooter className="px-5 pb-5 pt-0 sm:px-8 sm:pb-8">
          <Button
            asChild
            size="lg"
            className="min-h-11 w-full rounded-2xl bg-primary px-5 font-extrabold shadow-lg shadow-primary/20 transition-transform hover:bg-primary/90 active:scale-[0.98] motion-reduce:transition-none"
          >
            <a href="/battle" onClick={dispatchBattleNavigation}>
              <Swords aria-hidden="true" className="size-5" />
              Enter Quiz Battle
              <ArrowRight aria-hidden="true" className="size-5" />
            </a>
          </Button>
        </CardFooter>
      ) : null}
    </Card>
  );
};

export default MicroLessonCard;
