import React, { useState } from 'react';
import { CircleHelp, Compass } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';

interface FirstUseGuidePromptProps {
  /** A new account's one-time offer is showing; the owner closes it on either answer. */
  open: boolean;
  onPlay: () => void;
  onSkip: () => void;
}

/** Offers a new account the full guide once, and on Skip says where to find it later. */
export function FirstUseGuidePrompt({ open, onPlay, onSkip }: FirstUseGuidePromptProps) {
  const [showLaterHelp, setShowLaterHelp] = useState(false);
  const skip = () => {
    setShowLaterHelp(true);
    onSkip();
  };
  return (
    <>
      <AlertDialog open={open}>
        {/* No trigger to return focus to: the guide card or the follow-up dialog takes it. */}
        <AlertDialogContent className="rounded-2xl sm:max-w-sm" onEscapeKeyDown={skip} onCloseAutoFocus={event => event.preventDefault()}>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center justify-center gap-2 font-display sm:justify-start">
              <Compass size={20} className="shrink-0 text-purple-600 dark:text-purple-300" aria-hidden="true" />
              Play the tutorial now?
            </AlertDialogTitle>
            <AlertDialogDescription>
              A tutorial is available to introduce you to MathPulse AI. You can stop it at any time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="pointer-coarse:h-11" onClick={skip}>Skip</AlertDialogCancel>
            <AlertDialogAction className="bg-purple-700 text-white hover:bg-purple-800 pointer-coarse:h-11" onClick={onPlay}>
              Play tutorial
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showLaterHelp} onOpenChange={setShowLaterHelp}>
        <AlertDialogContent
          className="rounded-2xl sm:max-w-sm"
          onCloseAutoFocus={event => {
            // The offer's Skip button is gone; land on the ? button this dialog points to.
            const helpButton = document.querySelector<HTMLElement>('[aria-label="Guide for this page"]');
            if (!helpButton) return;
            event.preventDefault();
            helpButton.focus();
          }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center justify-center gap-2 font-display sm:justify-start">
              <CircleHelp size={20} className="shrink-0 text-purple-600 dark:text-purple-300" aria-hidden="true" />
              You can play it later
            </AlertDialogTitle>
            <AlertDialogDescription>
              Tap the ? button at the top of the screen, or open Settings, to play the tutorial any time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction className="bg-purple-700 text-white hover:bg-purple-800 pointer-coarse:h-11">Got it</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
