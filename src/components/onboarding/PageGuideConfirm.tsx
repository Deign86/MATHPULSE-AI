import React, { useRef } from 'react';
import { Compass } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../ui/alert-dialog';

interface PageGuideConfirmProps {
  /** The header ? button; it opens the confirmation and gets focus back after Skip. */
  children: React.ReactElement;
  /** The current page's guide label, e.g. "Modules"; null when the page has no guide of its own. */
  guide: string | null;
  /** Role name for the full guide offered instead, e.g. "student". */
  audience: string;
  onPlay: () => void;
}

/** Asks before the header ? button plays a guide, so an accidental tap costs nothing. */
export function PageGuideConfirm({ children, guide, audience, onPlay }: PageGuideConfirmProps) {
  // Playing hands focus to the guide card instead of back to the ? button.
  const playing = useRef(false);
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
      <AlertDialogContent
        className="rounded-2xl sm:max-w-sm"
        onCloseAutoFocus={event => {
          if (playing.current) event.preventDefault();
          playing.current = false;
        }}
      >
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center justify-center gap-2 font-display sm:justify-start">
            <Compass size={20} className="shrink-0 text-purple-600 dark:text-purple-300" aria-hidden="true" />
            {guide ? `Play the ${guide} guide?` : `Play the full ${audience} guide?`}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {guide ? 'A short walkthrough of what you can do on this page.' : 'A walkthrough of every main page.'} You can stop it at any time.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="pointer-coarse:h-11">Skip</AlertDialogCancel>
          <AlertDialogAction
            className="bg-purple-700 text-white hover:bg-purple-800 pointer-coarse:h-11"
            onClick={() => {
              playing.current = true;
              onPlay();
            }}
          >
            Play guide
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
