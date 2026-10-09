import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Eye,
  EyeOff,
  ArrowRight,
  Lock,
  Mail,
  Users,
  GraduationCap,
  BookOpen,
  ShieldCheck,
  AlertCircle,
  Sparkles,
  Swords,
  Trophy,
} from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import {
  signInWithEmail,
  signInWithGoogle,
  signUpWithEmail,
  resetPassword,
  setPendingAuthRole,
  type AuthServiceError,
} from '../services/authService';
import { UserRole } from '../types/models';
import { recordGet } from '../utils/memberOf';
import { z } from 'zod';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { InteractiveRobotBackground, ROBOT_SCALE, ROBOT_SHIFT } from './login/InteractiveRobotBackground';

export function isObjectVal<T>(value: T): value is T & object {
  return typeof value === 'object';
}
export function isString<T>(value: T): value is T & string {
  return typeof value === 'string';
}

const schoolSectionOptionSchema = z.object({
  name: z.string(),
  type: z.string().optional(),
  grade: z.string().optional(),
});

const FALLBACK_SECTION_OPTIONS = ['Aumaury', 'Edison', 'Einstein', 'Mpai'];
const FALLBACK_TRACK_OPTIONS = ['Academic', 'TechPro'];

interface PasswordRule {
  id: string;
  label: string;
  test: (value: string) => boolean;
}

const SIGNUP_PASSWORD_RULES: PasswordRule[] = [
  {
    id: 'length',
    label: 'At least 8 characters',
    test: (value) => value.length >= 8,
  },
  {
    id: 'upper-lower',
    label: 'Contains uppercase and lowercase letters',
    test: (value) => /[A-Z]/.test(value) && /[a-z]/.test(value),
  },
  {
    id: 'number',
    label: 'Contains at least one number',
    test: (value) => /\d/.test(value),
  },
  {
    id: 'special',
    label: 'Contains at least one special character',
    test: (value) => /[^A-Za-z0-9]/.test(value),
  },
];

const SIGNUP_PASSWORD_HELP_TEXT =
  'Use at least 8 characters with uppercase, lowercase, number, and special character.';

interface AuthErrorDetails {
  code: string;
  message: string;
}

const ACCOUNT_TYPE_OPTIONS: { role: UserRole; label: string }[] = [
  { role: 'student', label: 'Student' },
  { role: 'teacher', label: 'Teacher' },
];

const extractAuthErrorDetails = (cause: unknown): AuthErrorDetails => {
  // SAFETY: isObjectVal verifies cause is an object before reading optional error properties.
  const authError = isObjectVal(cause) && cause !== null ? (cause as Partial<AuthServiceError>) : null;
  const message = cause instanceof Error ? cause.message : '';

  if (authError?.code && isString(authError.code)) {
    return { code: authError.code.toLowerCase(), message };
  }

  const codeMatch = message.match(/auth\/[a-z-]+/i);
  return {
    code: codeMatch ? codeMatch[0].toLowerCase() : '',
    message,
  };
};

const cleanFirebaseMessage = (message: string): string => {
  return message
    .replace(/^Firebase:\s*/i, '')
    .replace(/\s*\(auth\/[a-z-]+\)\.?/i, '')
    .trim();
};

const getFriendlyErrorMessage = (cause: unknown, defaultMessage: string): string => {
  const { code, message } = extractAuthErrorDetails(cause);
  const cleanedMessage = cleanFirebaseMessage(message);

  if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
    return 'Invalid email or password. Please check your credentials and try again.';
  }
  if (code === 'auth/email-already-in-use') {
    return 'This email is already registered. Please sign in instead.';
  }
  if (code === 'auth/weak-password' || code === 'auth/password-does-not-meet-requirements') {
    if (cleanedMessage) {
      return `Password does not meet signup requirements. ${cleanedMessage}`;
    }
    return `Password does not meet signup requirements. ${SIGNUP_PASSWORD_HELP_TEXT}`;
  }
  if (code === 'auth/too-many-requests') {
    return 'Access to this account has been temporarily disabled due to many failed login attempts. You can immediately restore it by resetting your password or you can try again later.';
  }
  if (code === 'auth/network-request-failed') {
    return 'Network error. Please check your internet connection and try again.';
  }

  if (code.startsWith('auth/')) {
    return cleanedMessage || defaultMessage;
  }

  if (message.includes('Firebase:') || message.includes('auth/')) {
    return defaultMessage;
  }

  return message || defaultMessage;
};

const getFriendlyResetErrorMessage = (cause: unknown): string => {
  const { code, message } = extractAuthErrorDetails(cause);
  const cleanedMessage = cleanFirebaseMessage(message);

  if (code === 'auth/invalid-email') {
    return 'Please enter a valid email address.';
  }
  if (code === 'auth/too-many-requests') {
    return 'Too many reset attempts. Please try again later.';
  }
  if (code === 'auth/network-request-failed') {
    return 'Network error. Please check your internet connection and try again.';
  }

  if (code.startsWith('auth/')) {
    return cleanedMessage || 'Failed to send reset email. Please try again.';
  }

  return message || 'Failed to send reset email. Please try again.';
};

const HERO_HEADLINE = 'Math gets easier with a buddy.';
const HERO_SUBTEXT = 'Learn with your AI tutor, battle classmates, and keep your streak alive every day.';

// Rendered width of the object-cover background video (16:9 source). The video layer is scaled
// by ROBOT_SCALE from the bottom-left and shifted by ROBOT_SHIFT; these map a point in the source
// frame (fractions of width/height) to viewport coordinates so desktop text tracks the robot.
const VIDEO_WIDTH = 'max(100vw, 177.78dvh)';
const frameX = (fx: number) =>
  `calc(${ROBOT_SHIFT} + ${ROBOT_SCALE} * ((100vw - ${VIDEO_WIDTH}) * 0.28 + ${VIDEO_WIDTH} * ${fx}))`;
const frameY = (fy: number) =>
  `calc(100dvh - ${ROBOT_SCALE} * (100dvh - ((100dvh - ${VIDEO_WIDTH} * 0.5625) / 2 + ${VIDEO_WIDTH} * 0.5625 * ${fy})))`;

// Bubble's bottom-center sits just above the pulse line over the robot's head.
const DESKTOP_BUBBLE_POSITION = { left: frameX(0.26), top: frameY(0.08) };
// Headline column ends 2rem before the robot's left headphone (~14% of the frame).
const DESKTOP_HEADLINE_WIDTH = { width: `min(36rem, calc(${frameX(0.14)} - 4.5rem))` };

const MATH_GLYPHS = [
  { glyph: 'π', className: 'left-[5%] top-[28%] text-4xl -rotate-12', delay: 0 },
  { glyph: '√x', className: 'right-[5%] top-[30%] text-3xl rotate-6', delay: 0.6 },
  { glyph: '∑', className: 'left-[4%] top-[48%] text-5xl rotate-6', delay: 1.2 },
  { glyph: 'x²', className: 'right-[5%] top-[52%] text-3xl -rotate-6', delay: 0.3 },
  { glyph: '÷', className: 'left-[20%] top-[36%] text-2xl', delay: 0.9 },
  { glyph: '∞', className: 'right-[20%] top-[40%] text-2xl', delay: 1.5 },
  { glyph: '%', className: 'left-[5%] top-[3%] text-2xl rotate-12', delay: 1.8 },
  { glyph: '+', className: 'right-[6%] top-[4%] text-3xl', delay: 2.1 },
];

const SPARKLES = [
  { className: 'left-[3%] top-[20%] w-3', delay: 0 },
  { className: 'right-[3%] top-[21%] w-3.5', delay: 0.8 },
  { className: 'left-[10%] top-[32%] w-2.5', delay: 1.6 },
  { className: 'right-[9%] top-[40%] w-3', delay: 2.4 },
];

// Desktop (xl+) positions keep to the free space: left edge, the gap between robot and card, and the far right.
// Desktop (xl+) positions keep to the free space: above/below the headline, between robot and card, far right.
const DESKTOP_MATH_GLYPHS = [
  { glyph: 'π', className: 'left-[5%] top-[10%] text-6xl -rotate-12', delay: 0 },
  { glyph: '∞', className: 'left-[24%] top-[7%] text-4xl', delay: 1.5 },
  { glyph: '∑', className: 'left-[4%] top-[78%] text-7xl rotate-6', delay: 1.2 },
  { glyph: '÷', className: 'left-[22%] top-[86%] text-3xl', delay: 0.9 },
  { glyph: '+', className: 'left-[56%] top-[38%] text-3xl', delay: 2.1 },
  { glyph: '√x', className: 'left-[55%] top-[58%] text-5xl rotate-6', delay: 0.6 },
  { glyph: 'x²', className: 'left-[57%] top-[78%] text-4xl -rotate-6', delay: 0.3 },
  { glyph: '%', className: 'right-[2%] top-[48%] text-3xl rotate-12', delay: 1.8 },
];

const DESKTOP_SPARKLES = [
  { className: 'left-[30%] top-[18%] w-4', delay: 0 },
  { className: 'left-[58%] top-[22%] w-3', delay: 0.8 },
  { className: 'left-[14%] top-[72%] w-3', delay: 1.6 },
  { className: 'left-[31%] top-[90%] w-3.5', delay: 2.4 },
  { className: 'right-[3%] top-[16%] w-4', delay: 1.2 },
];

interface FloatingMathProps {
  glyphs: { glyph: string; className: string; delay: number }[];
  sparkles: { className: string; delay: number }[];
}

const FloatingMath: React.FC<FloatingMathProps> = ({ glyphs, sparkles }) => {
  const reduceMotion = useReducedMotion();
  return (
    <>
      {glyphs.map(({ glyph, className, delay }) => (
        <motion.span
          key={glyph}
          className={`absolute font-display font-black text-white/20 select-none ${className}`}
          animate={reduceMotion ? undefined : { y: [0, -8, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay }}
        >
          {glyph}
        </motion.span>
      ))}
      {sparkles.map(({ className, delay }) => (
        <motion.svg
          key={className}
          viewBox="0 0 24 24"
          className={`absolute aspect-square text-amber-300 ${className}`}
          animate={reduceMotion ? undefined : { opacity: [0.3, 1, 0.3], scale: [0.8, 1.1, 0.8] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut', delay }}
        >
          <path d="M12 0 C13 8 16 11 24 12 C16 13 13 16 12 24 C11 16 8 13 0 12 C8 11 11 8 12 0Z" fill="currentColor" />
        </motion.svg>
      ))}
    </>
  );
};

const FEATURE_HIGHLIGHTS = [
  { icon: Sparkles, label: 'AI Tutor', detail: 'Step-by-step help' },
  { icon: Swords, label: 'Quiz Battle', detail: 'Face your classmates' },
  { icon: Trophy, label: 'Earn XP', detail: 'Unlock avatar gear' },
];

// Matches Tailwind `lg`: the cursor-tracking video only mounts here so phones skip the download.
const DESKTOP_QUERY = '(min-width: 1024px)';
const matchesDesktop = () => window.matchMedia?.(DESKTOP_QUERY).matches ?? false;

export const LoginPage: React.FC = () => {
  const GRADE_OPTIONS = ['Grade 11'];

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  // Issue #159: revealed passwords auto-hide after 10s so plaintext does not
  // linger indefinitely on shared screens.
  const showPasswordTimerRef = useRef<number | null>(null);
  const hidePassword = () => {
    if (showPasswordTimerRef.current !== null) {
      window.clearTimeout(showPasswordTimerRef.current);
      showPasswordTimerRef.current = null;
    }
    setShowPassword(false);
  };
  const toggleShowPassword = () => {
    if (showPassword) {
      hidePassword();
      return;
    }
    setShowPassword(true);
    if (showPasswordTimerRef.current !== null) {
      window.clearTimeout(showPasswordTimerRef.current);
    }
    showPasswordTimerRef.current = window.setTimeout(() => {
      setShowPassword(false);
      showPasswordTimerRef.current = null;
    }, 10000);
  };
  useEffect(() => {
    return () => {
      if (showPasswordTimerRef.current !== null) {
        window.clearTimeout(showPasswordTimerRef.current);
      }
    };
  }, []);
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>('student');
  const [selectedGrade, setSelectedGrade] = useState('Grade 11');
  const [selectedSection, setSelectedSection] = useState('');
  const [selectedTrack, setSelectedTrack] = useState('');
  const [sectionOptions, setSectionOptions] = useState<string[]>(FALLBACK_SECTION_OPTIONS);
  const [trackOptions, setTrackOptions] = useState<string[]>(FALLBACK_TRACK_OPTIONS);
  const [registrationOptionsLoading, setRegistrationOptionsLoading] = useState(true);
  const [registrationOptionsError, setRegistrationOptionsError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState(false);
  const resetEmailRef = useRef<HTMLInputElement | null>(null);
  const reduceMotion = useReducedMotion();
  const mascotGreeting = isResettingPassword
    ? "No worries! Let's get you back in."
    : isSignUp
      ? "Hi! I'm your math buddy. Let's level up together!"
      : 'Welcome back! Your streak is waiting.';
  const [isDesktop, setIsDesktop] = useState(matchesDesktop);

  useEffect(() => {
    const desktopQuery = window.matchMedia?.(DESKTOP_QUERY);
    if (!desktopQuery) return;
    const onChange = () => setIsDesktop(desktopQuery.matches);
    desktopQuery.addEventListener('change', onChange);
    return () => desktopQuery.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    let active = true;
    void Promise.resolve()
      .then(() => getDocs(collection(db, 'schoolSections')))
      .then((snapshot) => {
        if (!active) return;
        const sections: string[] = [];
        const tracks: string[] = [];
        snapshot.forEach((option) => {
          const parsedOption = schoolSectionOptionSchema.safeParse(option.data());
          if (!parsedOption.success) return;
          const { name, type, grade } = parsedOption.data;
          if (type === 'section' && grade === 'Grade 11') sections.push(name);
          if (type === 'track') tracks.push(name);
        });
        setSectionOptions(
          sections.length > 0
            ? sections.sort((left, right) => left.localeCompare(right))
            : FALLBACK_SECTION_OPTIONS,
        );
        setTrackOptions(
          tracks.length > 0
            ? tracks.sort((left, right) => left.localeCompare(right))
            : FALLBACK_TRACK_OPTIONS,
        );
      })
      .catch(() => {
        if (active) {
          setSectionOptions(FALLBACK_SECTION_OPTIONS);
          setTrackOptions(FALLBACK_TRACK_OPTIONS);
          setRegistrationOptionsError('Registration options could not be loaded. Default options are available.');
        }
      })
      .finally(() => {
        if (active) setRegistrationOptionsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (isResettingPassword) resetEmailRef.current?.focus();
  }, [isResettingPassword]);

  const passwordRuleStates = useMemo(
    () =>
      SIGNUP_PASSWORD_RULES.map((rule) => ({
        ...rule,
        met: rule.test(password),
      })),
    [password]
  );

  const passwordMeetsSignupRequirements = useMemo(
    () => passwordRuleStates.every((rule) => rule.met),
    [passwordRuleStates]
  );

  const isPasswordRequirementError = useMemo(() => {
    if (!isSignUp || !error) {
      return false;
    }
    const normalizedError = error.toLowerCase();
    return (
      normalizedError.includes('password requirements not met') ||
      normalizedError.includes('password does not meet')
    );
  }, [error, isSignUp]);

  // Demo 1-click accounts are dev-only and env-injected (issue #156).
  // The section renders only when explicitly enabled in a dev build, so
  // production bundles never contain credential material of any kind.
  const demoLoginEnabled =
    import.meta.env.DEV === true && import.meta.env.VITE_ENABLE_DEMO_LOGIN === 'true';

  interface DemoAccount {
    label: string;
    role: UserRole;
    email: string;
    password: string;
    icon: typeof GraduationCap;
    color: string;
  }

  const configuredDemos: DemoAccount[] = [
    {
      label: 'Student',
      role: 'student',
      email: import.meta.env.VITE_DEMO_STUDENT_EMAIL ?? '',
      password: import.meta.env.VITE_DEMO_STUDENT_PASSWORD ?? '',
      icon: GraduationCap,
      color: 'sky',
    },
    {
      label: 'Teacher',
      role: 'teacher',
      email: import.meta.env.VITE_DEMO_TEACHER_EMAIL ?? '',
      password: import.meta.env.VITE_DEMO_TEACHER_PASSWORD ?? '',
      icon: BookOpen,
      color: 'emerald',
    },
    {
      label: 'Admin',
      role: 'admin',
      email: import.meta.env.VITE_DEMO_ADMIN_EMAIL ?? '',
      password: import.meta.env.VITE_DEMO_ADMIN_PASSWORD ?? '',
      icon: ShieldCheck,
      color: 'rose',
    },
  ];

  const demoAccounts: DemoAccount[] = demoLoginEnabled
    ? configuredDemos.filter((account) => account.email !== '' && account.password !== '')
    : [];

  const fillDemoAccount = async (demoEmail: string, demoPassword: string, role: UserRole) => {
    setError(null);
    setLoading(true);
    setEmail(demoEmail);
    setPassword(demoPassword);
    setSelectedRole(role);
    setIsSignUp(false);

    try {
      setPendingAuthRole(role);
      await signInWithEmail(demoEmail, demoPassword);
    } catch (err: unknown) {
      setError(getFriendlyErrorMessage(err, 'Demo sign-in failed. Please try again.'));
      setLoading(false);
    }
  };

  const handlePasswordReset = async (): Promise<void> => {
    const targetEmail = email.trim();
    if (!targetEmail) {
      setResetError('Please enter your email address.');
      return;
    }

    setResetError(null);
    setResetSuccess(false);
    setResetLoading(true);
    try {
      await resetPassword(targetEmail);
      setResetSuccess(true);
    } catch (err: unknown) {
      const { code } = extractAuthErrorDetails(err);
      if (code === 'auth/user-not-found') {
        setResetError(null);
        setResetSuccess(true);
        return;
      }
      setResetError(getFriendlyResetErrorMessage(err));
    } finally {
      setResetLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isResettingPassword) {
      await handlePasswordReset();
      return;
    }
    setError(null);
    setLoading(true);

    try {
      if (isSignUp) {
        if (!name.trim()) {
          setError('Please enter your name');
          setLoading(false);
          return;
        }

        if (selectedRole === 'student' && !selectedGrade) {
          setError('Please select a grade level');
          setLoading(false);
          return;
        }

        if (selectedRole === 'student' && (!selectedSection || !selectedTrack)) {
          setError('Please select both a section and track');
          setLoading(false);
          return;
        }

        if (selectedRole === 'admin') {
          setError('Admin account creation is restricted. Please contact an existing administrator.');
          setLoading(false);
          return;
        }

        if (!passwordMeetsSignupRequirements) {
          setError(`Password does not meet signup requirements. ${SIGNUP_PASSWORD_HELP_TEXT}`);
          setLoading(false);
          return;
        }

        if (confirmPassword !== password) {
          setError('Passwords do not match. Please re-enter your password.');
          setLoading(false);
          return;
        }

        setPendingAuthRole(selectedRole);
        await signUpWithEmail(
          email,
          password,
          name,
          selectedRole,
          selectedRole === 'student'
            ? { grade: selectedGrade, section: selectedSection, track: selectedTrack }
            : { department: 'Mathematics' }
        );
      } else {
        await signInWithEmail(email, password);
      }
    } catch (err: unknown) {
      const fallbackMessage = isSignUp
        ? `Sign-up failed. ${SIGNUP_PASSWORD_HELP_TEXT}`
        : 'Sign-in failed. Please check your credentials and try again.';
      setError(getFriendlyErrorMessage(err, fallbackMessage));
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);

    try {
      if (isSignUp) {
        if (selectedRole === 'admin') {
          setError('Admin account creation is restricted. Please contact an existing administrator.');
          setLoading(false);
          return;
        }
        setPendingAuthRole(selectedRole);
      }
      await signInWithGoogle(isSignUp ? selectedRole : undefined);
    } catch (err: unknown) {
      const { code } = extractAuthErrorDetails(err);
      if (code === 'auth/redirect-in-progress') {
        return;
      }
      setError(
        getFriendlyErrorMessage(
          err,
          isSignUp ? 'Google sign-up failed. Please try again.' : 'Google sign-in failed. Please try again.'
        )
      );
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-dvh w-full overflow-x-hidden bg-[#3a236a] text-slate-900 flex flex-col sm:justify-center sm:py-8 lg:flex-row lg:items-center lg:p-10 lg:[@media(max-height:799px)]:py-4 selection:bg-purple-500 selection:text-white">
      {/* ─── Desktop: Full-Bleed Mascot Video Background with Cursor Tracking ─── */}
      {isDesktop && <InteractiveRobotBackground />}

      {/* ─── Mobile/Tablet: mascot peeks over the top edge of the sheet ─── */}
      <div
        className="lg:hidden relative flex-1 sm:flex-none flex flex-col items-center justify-end pt-[max(0.75rem,env(safe-area-inset-top))] -mb-20 sm:-mb-24"
      >
        {/* Decorative backdrop: graph-paper grid, glow, orbit ring, floating math symbols, sparkles */}
        <div aria-hidden="true" className="absolute inset-0 -bottom-24 overflow-hidden pointer-events-none">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.07)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.07)_1px,transparent_1px)] bg-[size:28px_28px] [mask-image:radial-gradient(ellipse_at_50%_55%,black_30%,transparent_75%)]" />
          <div className="absolute left-1/2 bottom-[8%] -translate-x-1/2 w-[min(26rem,60dvh)] aspect-square rounded-full bg-[radial-gradient(circle,rgba(192,132,252,0.45),transparent_65%)]" />
          <motion.div
            className="absolute left-1/2 bottom-[2%] -ml-[min(11rem,24dvh)] w-[min(22rem,48dvh)] aspect-square rounded-full border-2 border-dashed border-white/15"
            animate={reduceMotion ? undefined : { rotate: 360 }}
            transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
          >
            <span className="absolute -top-1.5 left-1/2 -ml-1.5 h-3 w-3 rounded-full bg-pink-400 shadow-[0_0_12px_rgba(244,114,182,0.9)]" />
            <span className="absolute top-1/2 -right-1 h-2 w-2 rounded-full bg-sky-300 shadow-[0_0_10px_rgba(125,211,252,0.9)]" />
          </motion.div>
          <FloatingMath glyphs={MATH_GLYPHS} sparkles={SPARKLES} />
        </div>

        {!isSignUp && (
          <div className="relative px-6 pt-4 pb-3 text-center max-w-sm">
            <h2 className="text-2xl sm:text-3xl font-display font-black leading-tight text-white">{HERO_HEADLINE}</h2>
            <p className="mt-1.5 text-[13px] sm:text-sm font-body text-white/75">{HERO_SUBTEXT}</p>
          </div>
        )}
        <motion.p
          key={mascotGreeting}
          aria-hidden="true"
          initial={reduceMotion ? false : { opacity: 0, y: 6, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="relative mt-auto mx-6 max-w-[17rem] rounded-2xl bg-white px-4 py-2 text-center text-[13px] sm:text-sm font-display font-bold leading-snug text-[#3a236a] shadow-[0_8px_24px_-8px_rgba(20,10,50,0.6)]"
        >
          {mascotGreeting}
          <span className="absolute left-1/2 -bottom-1.5 h-3 w-3 -translate-x-1/2 rotate-45 bg-white" />
        </motion.p>
        <motion.img
          src="/avatar/avatar_icon.png"
          alt=""
          width={512}
          height={512}
          className="relative w-[min(17rem,36dvh)] sm:w-72 aspect-square -mt-3 object-contain drop-shadow-[0_12px_24px_rgba(20,10,50,0.45)]"
          animate={reduceMotion ? undefined : { y: [0, -6, 0] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      {/* ─── Desktop decor (xl+): graph-paper grid + floating math symbols over the video's empty areas ─── */}
      <div aria-hidden="true" className="hidden xl:block fixed inset-0 z-[1] overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_at_55%_50%,black_20%,transparent_70%)]" />
        <FloatingMath glyphs={DESKTOP_MATH_GLYPHS} sparkles={DESKTOP_SPARKLES} />
      </div>

      {/* ─── Desktop: headline on the left, vertically centered, beside the shifted robot ─── */}
      <div
        style={DESKTOP_HEADLINE_WIDTH}
        className="hidden lg:block @container absolute z-10 left-10 top-1/2 -translate-y-1/2 pointer-events-none"
      >
        {/* Sized to the column (cqw) so the headline fills the space left of the robot at any width */}
        <h2 className="text-[clamp(2.25rem,17.5cqw,7.5rem)] font-display font-black leading-[1.08] text-white drop-shadow-[0_2px_12px_rgba(20,10,50,0.5)]">{HERO_HEADLINE}</h2>
        <p className="mt-4 text-[clamp(1rem,4cqw,1.75rem)] font-body leading-relaxed text-white/80">{HERO_SUBTEXT}</p>
      </div>

      {/* ─── Desktop: speech bubble pinned beside the robot's head (xl+; the wider sign-up card would cover it) ─── */}
      {!isSignUp && (
        <motion.p
          key={mascotGreeting}
          aria-hidden="true"
          style={DESKTOP_BUBBLE_POSITION}
          initial={reduceMotion ? false : { opacity: 0, x: -8, scale: 0.96 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          transition={{ duration: 0.3, ease: 'easeOut', delay: 0.2 }}
          className="hidden xl:block absolute z-10 -translate-x-1/2 -translate-y-full w-max max-w-[16rem] 2xl:max-w-[18rem] text-center rounded-2xl bg-white px-5 py-3 text-base 2xl:text-lg font-display font-bold leading-snug text-[#3a236a] shadow-[0_12px_32px_-10px_rgba(20,10,50,0.6)] pointer-events-none"
        >
          {mascotGreeting}
          <span className="absolute left-1/2 -bottom-1.5 h-3 w-3 -translate-x-1/2 rotate-45 bg-white" />
        </motion.p>
      )}

      {/* ─── Main Content Layout ─── */}
      <div className="relative z-10 w-full max-w-7xl mx-auto flex flex-col lg:items-end lg:justify-center pointer-events-auto">
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className={`bg-white/95 backdrop-blur-2xl border border-white/80 rounded-t-[28px] sm:rounded-3xl px-4 pt-5 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-6 lg:p-7 w-full mx-auto lg:mx-0 ${
            isSignUp ? 'sm:max-w-xl lg:max-w-2xl' : 'sm:max-w-md'
          } relative overflow-hidden shadow-[0_-12px_40px_-12px_rgba(20,10,50,0.45)] lg:shadow-[0_25px_70px_-15px_rgba(58,35,106,0.35)] transition-[max-width] duration-300 lg:max-h-[96dvh] lg:overflow-y-auto`}
        >
          {/* Top accent glow line */}
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-purple-500 via-pink-500 to-sky-500" />
          {/* Subtle inner glow */}
          <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-80 h-80 bg-gradient-to-br from-purple-400/20 to-pink-400/20 rounded-full blur-[60px] pointer-events-none" />

          {/* Card Header with Logo */}
          <div className="text-center mb-2.5 sm:mb-4 relative">
            <div className="flex items-center justify-center gap-1.5 sm:gap-2 mb-0.5 sm:mb-1.5">
              <img
                src="/mathpulse_final_logo.png"
                alt="MathPulse AI"
                className="w-5 h-5 sm:w-7 sm:h-7 object-contain"
              />
              <span className="text-sm sm:text-base font-display font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-purple-600 via-pink-600 to-sky-500">
                MathPulse
              </span>
            </div>
            <motion.h3
              className="text-lg sm:text-2xl font-display font-bold text-slate-900 leading-tight mb-0.5"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.15 }}
            >
              {isResettingPassword ? 'Reset password' : isSignUp ? 'Create Account' : 'Welcome Back'}
            </motion.h3>
            <motion.p
              className="text-[11px] sm:text-xs text-slate-500 font-body"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              {isResettingPassword ? 'We will email you a link to set a new password.' : isSignUp ? 'Join your class and start leveling up in math.' : 'Pick up right where you left off.'}
            </motion.p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-2 sm:space-y-3 mb-2 sm:mb-3 relative">
            {error && !isPasswordRequirementError && !isResettingPassword && (
              <motion.div
                role="alert"
                aria-live="assertive"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-rose-50 border border-rose-200 text-rose-600 px-3 py-2 rounded-xl text-[11px] sm:text-xs font-body flex items-start gap-1.5"
              >
                <AlertCircle size={14} className="text-rose-500 shrink-0 mt-0.5" />
                <span>{error}</span>
              </motion.div>
            )}

            {/* Sign Up Fields: Grouped Side-by-Side */}
            {isSignUp ? (
              <>
                {/* Row 1: Full Name & Account Type */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 text-left">
                  <div className="space-y-0.5 sm:space-y-1">
                    <label htmlFor="login-name" className="block text-[10px] sm:text-xs font-body font-semibold text-slate-500 uppercase tracking-wider">
                      Full Name
                    </label>
                    <div className="relative">
                      <Users size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        id="login-name"
                        type="text"
                        placeholder="Juan Dela Cruz"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full pl-8 sm:pl-9 pr-3 py-1.5 sm:py-2 rounded-lg sm:rounded-xl bg-slate-100/80 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20 focus:bg-white text-xs sm:text-sm font-body transition-all"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-0.5 sm:space-y-1">
                    <label id="login-role-label" className="block text-[10px] sm:text-xs font-body font-semibold text-slate-500 uppercase tracking-wider">
                      Account Type
                    </label>
                    <div className="grid grid-cols-2 gap-1.5" role="radiogroup" aria-labelledby="login-role-label">
                      {ACCOUNT_TYPE_OPTIONS.map((roleOption) => {
                        const isActive = selectedRole === roleOption.role;
                        return (
                          <button
                            key={roleOption.role}
                            type="button"
                            role="radio"
                            aria-checked={isActive}
                            onClick={() => setSelectedRole(roleOption.role)}
                            className={`h-[32px] sm:h-[36px] rounded-lg sm:rounded-xl border px-2 py-1 text-[11px] sm:text-xs font-body font-semibold transition-all flex items-center justify-center gap-1.5 ${
                              isActive
                                ? 'border-sky-400 bg-sky-50 text-sky-700 ring-1 ring-sky-300'
                                : 'border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-300'
                            }`}
                          >
                            {roleOption.role === 'student' ? <GraduationCap size={13} /> : <BookOpen size={13} />}
                            <span>{roleOption.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Row 2 (Student only): Grade, Section, and Track */}
                {selectedRole === 'student' && (
                  <motion.div
                    initial={reduceMotion ? false : { opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="grid grid-cols-2 gap-2 sm:gap-3 text-left"
                  >
                    <div className="space-y-0.5 sm:space-y-1">
                      <label htmlFor="login-grade" className="block text-[10px] sm:text-xs font-body font-semibold text-slate-500 uppercase tracking-wider">
                        Grade Level
                      </label>
                      <select
                        id="login-grade"
                        value={selectedGrade}
                        onChange={(e) => setSelectedGrade(e.target.value)}
                        className="w-full px-2.5 py-1.5 sm:py-2 rounded-lg sm:rounded-xl bg-slate-100/80 border border-slate-200 text-slate-900 text-xs sm:text-sm font-body focus:border-sky-400"
                      >
                        {GRADE_OPTIONS.map((g) => (
                          <option key={g} value={g}>
                            {g}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-0.5 sm:space-y-1">
                      <label htmlFor="login-section" className="block text-[10px] sm:text-xs font-body font-semibold text-slate-500 uppercase tracking-wider">
                        Section
                      </label>
                      <select
                        id="login-section"
                        value={selectedSection}
                        onChange={(e) => setSelectedSection(e.target.value)}
                        required
                        className="w-full px-2.5 py-1.5 sm:py-2 rounded-lg sm:rounded-xl bg-slate-100/80 border border-slate-200 text-slate-900 text-xs sm:text-sm font-body focus:border-sky-400"
                      >
                        <option value="">Select a section</option>
                        {sectionOptions.map((sec) => (
                          <option key={sec} value={sec}>
                            {sec}
                          </option>
                        ))}
                      </select>
                      {registrationOptionsLoading && <p role="status">Loading sections...</p>}
                    </div>
                    <div className="space-y-0.5 sm:space-y-1">
                      <label htmlFor="login-track" className="block text-[10px] sm:text-xs font-body font-semibold text-slate-500 uppercase tracking-wider">
                        Track
                      </label>
                      <select
                        id="login-track"
                        value={selectedTrack}
                        onChange={(e) => setSelectedTrack(e.target.value)}
                        required
                        className="w-full px-2.5 py-1.5 sm:py-2 rounded-lg sm:rounded-xl bg-slate-100/80 border border-slate-200 text-slate-900 text-xs sm:text-sm font-body focus:border-sky-400"
                      >
                        <option value="">Select a track</option>
                        {trackOptions.map((track) => (
                          <option key={track} value={track}>
                            {track}
                          </option>
                        ))}
                      </select>
                      {registrationOptionsLoading && <p role="status">Loading tracks...</p>}
                    </div>
                    {registrationOptionsError && (
                      <p role="alert" className="col-span-2 text-rose-600">{registrationOptionsError}</p>
                    )}
                  </motion.div>
                )}

                {/* Row 3: Email Address */}
                <div className="space-y-0.5 sm:space-y-1 text-left">
                  <label htmlFor="login-email" className="block text-[10px] sm:text-xs font-body font-semibold text-slate-500 uppercase tracking-wider">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      id="login-email"
                      type="email"
                      placeholder="your.email@school.edu"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-8 sm:pl-9 pr-3 py-1.5 sm:py-2 rounded-lg sm:rounded-xl bg-slate-100/80 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20 focus:bg-white text-xs sm:text-sm font-body transition-all"
                      required
                    />
                  </div>
                </div>

                {/* Row 4: Password & Confirm Password (Side-by-Side on all viewports) */}
                <div className="grid grid-cols-2 gap-2 sm:gap-3 text-left">
                  <div className="space-y-0.5 sm:space-y-1">
                    <label htmlFor="login-password" className="block text-[10px] sm:text-xs font-body font-semibold text-slate-500 uppercase tracking-wider truncate">
                      Password
                    </label>
                    <div className="relative">
                      <Lock size={14} className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        id="login-password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="password-input w-full pl-7 sm:pl-9 pr-7 sm:pr-8 py-1.5 sm:py-2 rounded-lg sm:rounded-xl bg-slate-100/80 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20 focus:bg-white text-xs sm:text-sm font-body transition-all"
                        required
                        minLength={8}
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        onClick={toggleShowPassword}
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <Eye size={13} /> : <EyeOff size={13} />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-0.5 sm:space-y-1">
                    <label htmlFor="login-confirm-password" className="block text-[10px] sm:text-xs font-body font-semibold text-slate-500 uppercase tracking-wider truncate">
                      Confirm
                    </label>
                    <div className="relative">
                      <Lock size={14} className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        id="login-confirm-password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="password-input w-full pl-7 sm:pl-9 pr-3 py-1.5 sm:py-2 rounded-lg sm:rounded-xl bg-slate-100/80 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20 focus:bg-white text-xs sm:text-sm font-body transition-all"
                        required
                        minLength={8}
                        autoComplete="new-password"
                      />
                    </div>
                  </div>
                </div>

                {confirmPassword.length > 0 && confirmPassword !== password && (
                  <p className="text-[10px] sm:text-[11px] font-body text-rose-600 text-left" role="alert">
                    Passwords do not match.
                  </p>
                )}

                {/* Password Requirements Checklist (Compact 2x2 Grid) */}
                {password.length > 0 && !passwordMeetsSignupRequirements && (
                  <div className="rounded-lg sm:rounded-xl border border-sky-100 bg-sky-50/80 dark:bg-sky-950/30 p-2 text-left">
                    <p className="text-[9px] sm:text-[10px] font-body font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-0.5">
                      Password requirements
                    </p>
                    <ul aria-label="Password requirements" className="grid grid-cols-2 gap-x-2 gap-y-0.5">
                      {passwordRuleStates.map((rule) => (
                        <li
                          key={rule.id}
                          className={`flex items-center gap-1 text-[10px] sm:text-[11px] font-body ${
                            rule.met ? 'text-emerald-700 dark:text-emerald-400 font-medium' : 'text-slate-500'
                          }`}
                        >
                          <span
                            className={`inline-block h-1.5 w-1.5 rounded-full shrink-0 ${
                              rule.met ? 'bg-emerald-500' : 'bg-slate-300'
                            }`}
                          />
                          <span className="truncate">{rule.label}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Submit Button (Full Width) */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-1 bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-500 hover:to-pink-400 text-white font-body font-semibold py-2 sm:py-2.5 min-h-[38px] sm:min-h-[42px] rounded-lg sm:rounded-xl shadow-md shadow-purple-600/20 hover:shadow-pink-500/30 hover:scale-[1.01] active:scale-[0.99] transition-all text-xs sm:text-sm group relative overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <span className="relative z-10 flex items-center justify-center gap-1.5">
                    {loading ? 'Creating...' : 'Create Account'}
                    <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
                  </span>
                </button>

                {/* Google Sign-up (Below Submit) */}
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-1.5 sm:py-2 px-3 rounded-lg sm:rounded-xl bg-slate-50 hover:bg-slate-100/80 border border-slate-200 text-slate-700 text-xs font-body font-medium transition-all disabled:opacity-50 min-h-[36px] sm:min-h-[40px]"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Sign up with Google</span>
                </button>
              </>
            ) : isResettingPassword ? (
              <>
                <p className="text-[11px] sm:text-xs text-slate-500 font-body text-center">Enter your account email and we will send you a reset link.</p>
                <div className="space-y-0.5 sm:space-y-1 text-left">
                  <label htmlFor="login-reset-email" className="block text-[10px] sm:text-xs font-body font-semibold text-slate-500 uppercase tracking-wider">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      ref={resetEmailRef}
                      id="login-reset-email"
                      type="email"
                      placeholder="your.email@school.edu"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-8 sm:pl-9 pr-3 py-1.5 sm:py-2 rounded-lg sm:rounded-xl bg-slate-100/80 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20 focus:bg-white text-xs sm:text-sm font-body transition-all"
                      required
                    />
                  </div>
                </div>
                {resetError && (
                  <p role="alert" className="bg-rose-50 border border-rose-200 text-rose-600 px-3 py-2 rounded-xl text-[11px] sm:text-xs font-body">
                    {resetError}
                  </p>
                )}
                {resetSuccess && (
                  <div role="status" className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-3 py-2 rounded-xl text-[11px] sm:text-xs font-body">If an account exists for this email, a password reset link has been sent. Please check your inbox.</div>
                )}
                <button
                  type="submit"
                  disabled={resetLoading}
                  className="w-full mt-1 bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-500 hover:to-pink-400 text-white font-body font-semibold py-2 sm:py-2.5 min-h-[38px] sm:min-h-[42px] rounded-lg sm:rounded-xl shadow-md shadow-purple-600/20 hover:shadow-pink-500/30 hover:scale-[1.01] active:scale-[0.99] transition-all text-xs sm:text-sm group relative overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {resetLoading ? 'Sending...' : 'Send reset link'}
                </button>
                <div className="text-center pt-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      setIsResettingPassword(false);
                      setResetError(null);
                      setResetSuccess(false);
                    }}
                    className="text-[11px] sm:text-xs font-body py-1 px-2.5 rounded-lg hover:bg-purple-50/50 transition-all text-slate-500 group"
                  >
                    Back to sign in
                  </button>
                </div>
              </>
            ) : (
              /* Sign In Fields: Clean Compact Layout */
              <>
                {/* Email Field */}
                <div className="space-y-0.5 sm:space-y-1 text-left">
                  <label htmlFor="login-email" className="block text-[10px] sm:text-xs font-body font-semibold text-slate-500 uppercase tracking-wider">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      id="login-email"
                      type="email"
                      placeholder="your.email@school.edu"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-8 sm:pl-9 pr-3 py-1.5 sm:py-2 rounded-lg sm:rounded-xl bg-slate-100/80 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20 focus:bg-white text-xs sm:text-sm font-body transition-all"
                      required
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div className="space-y-0.5 sm:space-y-1 text-left">
                  <label htmlFor="login-password" className="block text-[10px] sm:text-xs font-body font-semibold text-slate-500 uppercase tracking-wider">
                    Password
                  </label>
                  <div className="relative">
                    <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="password-input w-full pl-8 sm:pl-9 pr-8 py-1.5 sm:py-2 rounded-lg sm:rounded-xl bg-slate-100/80 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20 focus:bg-white text-xs sm:text-sm font-body transition-all"
                      required
                    />
                    <button
                      type="button"
                      onClick={toggleShowPassword}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <Eye size={13} /> : <EyeOff size={13} />}
                    </button>
                  </div>
                </div>

                <div className="flex justify-end"><button type="button" onClick={() => { setIsResettingPassword(true); setResetError(null); setResetSuccess(false); setError(null); }} className="text-[11px] sm:text-xs font-body font-semibold text-purple-600 hover:text-pink-600 transition-colors">Forgot password?</button></div>

                {/* Sign In Button (Full Width) */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-1 bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-500 hover:to-pink-400 text-white font-body font-semibold py-2 sm:py-2.5 min-h-[38px] sm:min-h-[42px] rounded-lg sm:rounded-xl shadow-md shadow-purple-600/20 hover:shadow-pink-500/30 hover:scale-[1.01] active:scale-[0.99] transition-all text-xs sm:text-sm group relative overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <span className="relative z-10 flex items-center justify-center gap-1.5">
                    {loading ? 'Please wait...' : 'Sign In'}
                    <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
                  </span>
                </button>

                {/* Google Sign-in (Below Sign In) */}
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-1.5 sm:py-2 px-3 rounded-lg sm:rounded-xl bg-slate-50 hover:bg-slate-100/80 border border-slate-200 text-slate-700 text-xs font-body font-medium transition-all disabled:opacity-50 min-h-[36px] sm:min-h-[40px]"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Continue with Google</span>
                </button>
              </>
            )}

            {/* Toggle Sign In / Sign Up */}
            <div className="text-center pt-0.5">
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setIsResettingPassword(false);
                  setError(null);
                  setConfirmPassword('');
                  hidePassword();
                }}
                className="text-[11px] sm:text-xs font-body py-1 px-2.5 rounded-lg hover:bg-purple-50/50 transition-all text-slate-500 group"
              >
                {isSignUp ? (
                  <span>
                    Already have an account?{' '}
                    <span className="text-purple-600 font-bold group-hover:text-pink-600 transition-colors">
                      Sign in
                    </span>
                  </span>
                ) : (
                  <span>
                    Don&apos;t have an account?{' '}
                    <span className="text-purple-600 font-bold group-hover:text-pink-600 transition-colors">
                      Create one
                    </span>
                  </span>
                )}
              </button>
            </div>
          </form>

          {/* Demo Accounts Quick Access (dev-only, env-gated) */}
          {!isSignUp && demoAccounts.length > 0 && (
            <div className="mt-2 pt-2 border-t border-slate-100 relative">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[9px] sm:text-[10px] font-body font-semibold text-slate-400 uppercase tracking-widest">
                  Quick Demo Access
                </span>
                <span className="text-[9px] sm:text-[10px] text-purple-600 font-mono font-semibold">1-CLICK</span>
              </div>
              <div className="flex flex-col gap-1">
                {demoAccounts.map((account) => {
                  const Icon = account.icon;
                  const iconBgMap = {
                    sky: 'bg-sky-100',
                    emerald: 'bg-emerald-100',
                    rose: 'bg-rose-100',
                  };
                  const iconClrMap = {
                    sky: 'text-sky-600',
                    emerald: 'text-emerald-600',
                    rose: 'text-rose-500',
                  };
                  return (
                    <button
                      key={account.label}
                      type="button"
                      onClick={() => fillDemoAccount(account.email, account.password, account.role)}
                      className="group flex items-center gap-2 w-full px-2.5 py-1.5 rounded-lg sm:rounded-xl bg-slate-50/90 border border-slate-200/80 hover:border-purple-300 hover:bg-purple-50/70 transition-all text-left"
                    >
                      <div
                        className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${
                          recordGet(iconBgMap, account.color) ?? ''
                        }`}
                      >
                        <Icon size={12} className={recordGet(iconClrMap, account.color) ?? ''} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] sm:text-xs font-body font-semibold text-slate-700 group-hover:text-purple-700 transition-colors">
                          {account.label} Account
                        </p>
                        <p className="text-[9px] sm:text-[10px] text-slate-400 font-body truncate">{account.email}</p>
                      </div>
                      <ArrowRight
                        size={12}
                        className="text-slate-300 group-hover:text-purple-600 group-hover:translate-x-0.5 transition-all shrink-0"
                      />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Feature highlights */}
          <ul className="grid grid-cols-3 gap-1.5 sm:gap-2 mt-2.5 sm:mt-3">
            {FEATURE_HIGHLIGHTS.map(({ icon: Icon, label, detail }) => (
              <li key={label} className="flex flex-col items-center text-center rounded-lg sm:rounded-xl bg-purple-50/80 border border-purple-100 px-1 py-1.5 sm:py-2">
                <Icon size={14} className="text-purple-600 mb-0.5" aria-hidden="true" />
                <span className="text-[10px] sm:text-[11px] font-body font-bold text-slate-700 leading-tight">{label}</span>
                <span className="text-[9px] sm:text-[10px] font-body text-slate-500 leading-tight">{detail}</span>
              </li>
            ))}
          </ul>

          {/* Security Footer */}
          <p className="text-[9px] sm:text-[10px] text-slate-400 text-center mt-1.5 font-body flex items-center justify-center gap-1">
            <Lock size={10} className="text-slate-400 shrink-0" />
            <span>Sign-in protected by TLS; data encrypted in transit and at rest</span>
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default LoginPage;
