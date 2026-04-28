import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Eye, EyeOff, ArrowRight, Sparkles, Brain, TrendingUp, Users, Lock, Mail, Award, GraduationCap, ShieldCheck, BookOpen, Zap } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { motion, AnimatePresence } from 'motion/react';
import { signInWithEmail, signInWithGoogle, signUpWithEmail, setPendingAuthRole, type AuthServiceError } from '../services/authService';
import { UserRole } from '../types/models';
import shaderBgVideo from '../assets/shader-bg.mp4';

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

const extractAuthErrorDetails = (err: unknown): { code: string; message: string } => {
  const authError = typeof err === 'object' && err !== null ? (err as Partial<AuthServiceError>) : null;
  const message = err instanceof Error ? err.message : '';

  if (authError?.code && typeof authError.code === 'string') {
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

const getFriendlyErrorMessage = (err: unknown, defaultMessage: string): string => {
  const { code, message } = extractAuthErrorDetails(err);
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

const LoginPage: React.FC = () => {
  const GRADE_OPTIONS = ['Grade 11', 'Grade 12'];
  const SECTION_OPTIONS: Record<string, string[]> = {
    'Grade 11': ['STEM A', 'STEM B', 'ABM A', 'HUMSS A'],
    'Grade 12': ['STEM A', 'STEM B', 'ABM A', 'HUMSS A'],
  };
  const DEPARTMENT_OPTIONS: Record<'teacher', string[]> = {
    teacher: ['Mathematics', 'Science', 'English', 'Technology', 'Humanities'],
  };

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>('student');
  const [selectedGrade, setSelectedGrade] = useState('Grade 11');
  const [selectedSection, setSelectedSection] = useState(SECTION_OPTIONS['Grade 11'][0]);
  const [selectedDepartment, setSelectedDepartment] = useState('Mathematics');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPrimaryVideoReady, setIsPrimaryVideoReady] = useState(false);
  const [isSecondaryVideoReady, setIsSecondaryVideoReady] = useState(false);
  const [videoDuration, setVideoDuration] = useState(16);
  const [activeVideoLayer, setActiveVideoLayer] = useState<'primary' | 'secondary'>('primary');
  const [loopBlendProgress, setLoopBlendProgress] = useState(0);
  const primaryVideoRef = useRef<HTMLVideoElement>(null);
  const secondaryVideoRef = useRef<HTMLVideoElement>(null);
  const videoLoaded = isPrimaryVideoReady && isSecondaryVideoReady;
  const activeVideoLayerRef = useRef<'primary' | 'secondary'>('primary');
  const loopBlendProgressRef = useRef(0);
  const blendStartedRef = useRef(false);

  const LOOP_BLEND_WINDOW_SECONDS = 1.1;
  const TARGET_VIDEO_OPACITY = 0.34;

  const setLoopBlendProgressSafely = (value: number) => {
    const clamped = Math.max(0, Math.min(1, value));
    if (Math.abs(loopBlendProgressRef.current - clamped) < 0.02) {
      return;
    }

    loopBlendProgressRef.current = clamped;
    setLoopBlendProgress(clamped);
  };

  const syncDetectedDuration = (duration: number) => {
    if (!Number.isFinite(duration) || duration <= 0) {
      return;
    }

    if (Math.abs(videoDuration - duration) > 0.05) {
      setVideoDuration(duration);
    }
  };
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
    return normalizedError.includes('password requirements not met')
      || normalizedError.includes('password does not meet');
  }, [error, isSignUp]);

  const handlePrimaryMetadata = () => {
    const duration = primaryVideoRef.current?.duration;
    if (duration && Number.isFinite(duration) && duration > 0) {
      syncDetectedDuration(duration);
    }
  };

  const handleSecondaryMetadata = () => {
    const duration = secondaryVideoRef.current?.duration;
    if (duration && Number.isFinite(duration) && duration > 0) {
      syncDetectedDuration(duration);
    }
  };

  useEffect(() => {
    if (!videoLoaded) {
      return;
    }

    const primaryVideo = primaryVideoRef.current;
    const secondaryVideo = secondaryVideoRef.current;
    if (!primaryVideo || !secondaryVideo) {
      return;
    }

    let disposed = false;
    let frameHandle = 0;

    activeVideoLayerRef.current = 'primary';
    setActiveVideoLayer('primary');
    blendStartedRef.current = false;
    loopBlendProgressRef.current = 0;
    setLoopBlendProgress(0);

    primaryVideo.loop = false;
    secondaryVideo.loop = false;
    primaryVideo.currentTime = 0;
    secondaryVideo.currentTime = 0;
    secondaryVideo.pause();
    primaryVideo.play().catch(() => {});

    const tick = () => {
      if (disposed) {
        return;
      }

      const leadVideo = activeVideoLayerRef.current === 'primary' ? primaryVideo : secondaryVideo;
      const trailVideo = activeVideoLayerRef.current === 'primary' ? secondaryVideo : primaryVideo;
      const effectiveDuration =
        Number.isFinite(leadVideo.duration) && leadVideo.duration > 0 ? leadVideo.duration : videoDuration;
      const remaining = Math.max(effectiveDuration - leadVideo.currentTime, 0);
      const shouldBlend = remaining <= LOOP_BLEND_WINDOW_SECONDS;

      if (shouldBlend) {
        if (!blendStartedRef.current) {
          blendStartedRef.current = true;
          trailVideo.currentTime = 0;
          trailVideo.play().catch(() => {});
        }

        const blendProgress = 1 - remaining / LOOP_BLEND_WINDOW_SECONDS;
        setLoopBlendProgressSafely(blendProgress);

        if (remaining <= 0.03 || leadVideo.ended) {
          leadVideo.pause();
          leadVideo.currentTime = 0;

          const nextLead = activeVideoLayerRef.current === 'primary' ? 'secondary' : 'primary';
          activeVideoLayerRef.current = nextLead;
          setActiveVideoLayer(nextLead);

          blendStartedRef.current = false;
          loopBlendProgressRef.current = 0;
          setLoopBlendProgress(0);
        }
      } else {
        setLoopBlendProgressSafely(0);
      }

      frameHandle = window.requestAnimationFrame(tick);
    };

    frameHandle = window.requestAnimationFrame(tick);

    return () => {
      disposed = true;
      if (frameHandle) {
        window.cancelAnimationFrame(frameHandle);
      }
    };
  }, [videoDuration, videoLoaded]);

  const leadOpacity = videoLoaded ? TARGET_VIDEO_OPACITY * (1 - loopBlendProgress) : 0;
  const trailOpacity = videoLoaded ? TARGET_VIDEO_OPACITY * loopBlendProgress : 0;
  const primaryOpacity = activeVideoLayer === 'primary' ? leadOpacity : trailOpacity;
  const secondaryOpacity = activeVideoLayer === 'secondary' ? leadOpacity : trailOpacity;

  useEffect(() => {
    if (selectedRole === 'teacher' && !DEPARTMENT_OPTIONS.teacher.includes(selectedDepartment)) {
      setSelectedDepartment(DEPARTMENT_OPTIONS.teacher[0]);
    }
  }, [selectedDepartment, selectedRole]);

  useEffect(() => {
    const gradeSections = SECTION_OPTIONS[selectedGrade] || [];
    if (gradeSections.length > 0 && !gradeSections.includes(selectedSection)) {
      setSelectedSection(gradeSections[0]);
    }
  }, [selectedGrade, selectedSection]);

  const demoAccounts = [
    { label: 'Student', role: 'student' as UserRole, email: 'teststudent@school.edu', password: 'TestPass123!', icon: GraduationCap, color: 'sky' },
    { label: 'Teacher', role: 'teacher' as UserRole, email: 'testteacher@school.edu', password: 'TestPass123!', icon: BookOpen, color: 'emerald' },
    { label: 'Admin', role: 'admin' as UserRole, email: 'testadmin@school.edu', password: 'TestPass123!', icon: ShieldCheck, color: 'rose' },
  ];

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    
    try {
      if (isSignUp) {
        // Sign up new user
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

        if (selectedRole !== 'student' && !selectedDepartment) {
          setError('Please select a department');
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

        setPendingAuthRole(selectedRole);
        await signUpWithEmail(
          email,
          password,
          name,
          selectedRole,
          selectedRole === 'student'
            ? { grade: selectedGrade, section: selectedSection }
            : { department: selectedDepartment }
        );
      } else {
        // Sign in existing user
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
    <div className="h-screen w-full flex items-center justify-center px-6 overflow-hidden relative login-bg">
      {/* ─── Video Background ─── */}
      <video
        ref={primaryVideoRef}
        autoPlay
        muted
        playsInline
        preload="auto"
        onCanPlay={() => setIsPrimaryVideoReady(true)}
        onLoadedMetadata={handlePrimaryMetadata}
        className="absolute inset-0 w-full h-full object-cover transition-opacity duration-150 e-opacity"
        style={{ ['--o' as any]: primaryOpacity }}
        src={shaderBgVideo}
      />

      <video
        ref={secondaryVideoRef}
        autoPlay
        muted
        playsInline
        preload="auto"
        onCanPlay={() => setIsSecondaryVideoReady(true)}
        onLoadedMetadata={handleSecondaryMetadata}
        className="absolute inset-0 w-full h-full object-cover transition-opacity duration-150 e-opacity"
        style={{ ['--o' as any]: secondaryOpacity }}
        src={shaderBgVideo}
      />

      {/* Light frosted overlay — lets video breathe through */}
      <div className="absolute inset-0 pointer-events-none login-frost-overlay" />

        {/* Decorative gradient orbs for depth - enhanced with neon MathPulse colors */}
        <div className="absolute top-[10%] left-[-10%] w-[60%] h-[60%] rounded-full blur-[140px] pointer-events-none mix-blend-multiply login-orb-purple" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[70%] h-[70%] rounded-full blur-[160px] pointer-events-none mix-blend-multiply login-orb-pink" />
        <div className="absolute top-[40%] left-[40%] w-[40%] h-[40%] rounded-full blur-[120px] pointer-events-none mix-blend-screen login-orb-blue" />
        
      <div className="relative z-10 w-full max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          {/* Left Side — Branding */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col justify-center space-y-8"
          >
            {/* Logo */}
            <motion.div className="flex items-center gap-2.5">
              <motion.div className="relative flex items-center justify-center drop-shadow-md">
                <img 
                  src="/mathpulse_logo.png" 
                  alt="MathPulse AI Logo" 
                  className="w-16 h-16 object-contain flex-shrink-0"
                />
              </motion.div>
              <div>
                  <h1 className="text-3xl font-display font-black tracking-tight text-slate-900 bg-clip-text text-transparent bg-gradient-to-r from-purple-600 via-pink-600 to-sky-500">
                    MathPulse
                  </h1>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Sparkles size={12} className="text-rose-500" />
                  <span className="text-xs text-slate-500 font-body font-medium tracking-wide">Powered by Machine Learning</span>
                </div>
              </div>
            </motion.div>

            {/* Hero Text */}
            <motion.div
              className="space-y-5"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.8 }}
            >
              <h2 className="text-4xl lg:text-5xl xl:text-[3.4rem] font-display font-extrabold leading-[1.1] tracking-tight text-slate-900">
                Transform Your<br />
                <span className="bg-gradient-to-r from-sky-600 via-cyan-500 to-sky-500 bg-clip-text text-transparent">Math Journey</span>
              </h2>
              <p className="text-base text-slate-500 leading-relaxed max-w-md font-body">
                AI-powered predictive system designed to identify at-risk students and provide personalized learning recommendations.
              </p>
            </motion.div>

            {/* Feature Cards — Frosted glass on light */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { icon: Brain, label: 'AI Predictions', desc: 'Smart detection', color: 'sky' },
                { icon: TrendingUp, label: 'Analytics', desc: 'Real-time data', color: 'rose' },
                { icon: Award, label: 'Gamified', desc: 'Learn & earn', color: 'emerald' }
              ].map((feature, index) => {
                const Icon = feature.icon;
                const borderMap: Record<string, string> = {
                  sky: 'border-sky-200/60 hover:border-sky-300',
                  rose: 'border-rose-200/60 hover:border-rose-300',
                  emerald: 'border-emerald-200/60 hover:border-emerald-300',
                };
                const iconColorMap: Record<string, string> = {
                  sky: 'text-sky-600',
                  rose: 'text-rose-500',
                  emerald: 'text-emerald-600',
                };
                const glowMap: Record<string, string> = {
                  sky: 'bg-sky-100',
                  rose: 'bg-rose-100',
                  emerald: 'bg-emerald-100',
                };
                return (
                  <motion.div
                    key={index}
                    className={`bg-white/80 backdrop-blur-xl border ${borderMap[feature.color]} rounded-xl p-4 transition-all cursor-pointer group shadow-md shadow-slate-900/[0.04]`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 + index * 0.1 }}
                    whileHover={{ scale: 1.03, y: -4 }}
                  >
                    <div className={`w-9 h-9 rounded-lg ${glowMap[feature.color]} flex items-center justify-center mb-3`}>
                      <Icon size={18} className={iconColorMap[feature.color]} />
                    </div>
                    <h3 className="text-sm font-display font-semibold text-slate-800 mb-0.5">{feature.label}</h3>
                    <p className="text-xs text-slate-400 font-body">{feature.desc}</p>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>

          {/* Right Side — Login Form */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
            className="relative flex justify-center lg:justify-end"
          >
<div className="bg-white/85 backdrop-blur-2xl border border-slate-200/60 rounded-3xl p-7 w-full max-w-md relative overflow-hidden shadow-[0_20px_60px_-15px_rgba(168,85,247,0.15)]">
                {/* Top accent glow line */}
                <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-purple-500 via-pink-500 to-sky-500" />
                {/* Subtle inner glow */}
                <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-80 h-80 bg-gradient-to-br from-purple-400/20 to-pink-400/20 rounded-full blur-[60px] pointer-events-none" />

              {/* Form Header */}
              <div className="text-center mb-6 relative">
                <motion.h3
                  className="text-2xl font-display font-bold text-slate-900 mb-2"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                >
                  {isSignUp ? 'Create Account' : 'Welcome Back'}
                </motion.h3>
                <motion.p
                  className="text-sm text-slate-500 font-body"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  {isSignUp ? 'Begin your learning journey' : 'Sign in to continue learning'}
                </motion.p>
              </div>

              {/* Login Form */}
              <form onSubmit={handleSubmit} className="space-y-4 mb-5 relative">
                {error && !isPasswordRequirementError && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-rose-50 border border-rose-200 text-rose-600 px-4 py-3 rounded-lg text-sm font-body"
                  >
                    {error}
                  </motion.div>
                )}

                {/* Name Field (Sign Up Only) */}
                {isSignUp && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <label className="block text-xs font-body font-semibold text-slate-500 mb-2 uppercase tracking-wider">
                      Full Name
                    </label>
                    <div className="relative">
                      <Users size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                      <Input
                        type="text"
                        placeholder="Your Name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 rounded-lg bg-slate-100/70 border-slate-200/80 text-slate-900 placeholder:text-slate-400 focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20 focus:bg-white text-sm font-body transition-all"
                        required
                      />
                    </div>
                  </motion.div>
                )}

                {isSignUp && (
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.45 }}
                  >
                    <label className="block text-xs font-body font-semibold text-slate-500 mb-2 uppercase tracking-wider">
                      Account Type
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {([
                        { role: 'student', label: 'Student' },
                        { role: 'teacher', label: 'Teacher' },
                      ] as { role: UserRole; label: string }[]).map((roleOption) => {
                        const isActive = selectedRole === roleOption.role;
                        return (
                          <button
                            key={roleOption.role}
                            type="button"
                            onClick={() => setSelectedRole(roleOption.role)}
                            className={`rounded-lg border px-3 py-2 text-xs font-body font-semibold transition-all ${isActive ? 'border-sky-400 bg-sky-50 text-sky-700' : 'border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-300'}`}
                          >
                            {roleOption.label}
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}

                {isSignUp && selectedRole === 'student' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <label className="block text-xs font-body font-semibold text-slate-500 mb-2 uppercase tracking-wider">
                      Grade Level
                    </label>
                    <div className="relative">
                      <GraduationCap size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                      <select
                        value={selectedGrade}
                        onChange={(e) => setSelectedGrade(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 rounded-lg bg-slate-100/70 border border-slate-200/80 text-slate-900 focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20 focus:bg-white text-sm font-body transition-all appearance-none"
                        required
                      >
                        {GRADE_OPTIONS.map((grade) => (
                          <option key={grade} value={grade}>{grade}</option>
                        ))}
                      </select>
                    </div>
                  </motion.div>
                )}

                {isSignUp && selectedRole === 'student' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <label className="block text-xs font-body font-semibold text-slate-500 mb-2 uppercase tracking-wider">
                      Section
                    </label>
                    <div className="relative">
                      <Users size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                      <select
                        value={selectedSection}
                        onChange={(e) => setSelectedSection(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 rounded-lg bg-slate-100/70 border border-slate-200/80 text-slate-900 focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20 focus:bg-white text-sm font-body transition-all appearance-none"
                        required
                      >
                        {(SECTION_OPTIONS[selectedGrade] || []).map((section) => (
                          <option key={section} value={section}>{section}</option>
                        ))}
                      </select>
                    </div>
                  </motion.div>
                )}

                {isSignUp && selectedRole !== 'student' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <label className="block text-xs font-body font-semibold text-slate-500 mb-2 uppercase tracking-wider">
                      Department
                    </label>
                    <div className="relative">
                      <BookOpen size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                      <select
                        value={selectedDepartment}
                        onChange={(e) => setSelectedDepartment(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 rounded-lg bg-slate-100/70 border border-slate-200/80 text-slate-900 focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20 focus:bg-white text-sm font-body transition-all appearance-none"
                        required
                      >
                        {DEPARTMENT_OPTIONS.teacher.map((department) => (
                          <option key={department} value={department}>{department}</option>
                        ))}
                      </select>
                    </div>
                  </motion.div>
                )}

                {/* Email Field */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  <label className="block text-xs font-body font-semibold text-slate-500 mb-2 uppercase tracking-wider">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <Input
                      type="email"
                      placeholder="your.email@school.edu"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 rounded-lg bg-slate-100/70 border-slate-200/80 text-slate-900 placeholder:text-slate-400 focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20 focus:bg-white text-sm font-body transition-all"
                      required
                    />
                  </div>
                </motion.div>

                {/* Password Field */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 }}
                >
                  <label className="block text-xs font-body font-semibold text-slate-500 mb-2 uppercase tracking-wider">
                    Password
                  </label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-11 pr-11 py-3 rounded-lg bg-slate-100/70 border-slate-200/80 text-slate-900 placeholder:text-slate-400 focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20 focus:bg-white text-sm font-body transition-all"
                      required
                      minLength={isSignUp ? 8 : 6}
                    />
                    <motion.button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                      whileTap={{ scale: 0.9 }}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </motion.button>
                  </div>
                  {isSignUp && (
                    <div className="mt-2 rounded-lg border border-sky-100/80 bg-sky-50/70 px-3 py-2">
                      <p className="text-[11px] font-body font-semibold uppercase tracking-wider text-slate-600">
                        Password requirements
                      </p>
                      <ul className="mt-2 space-y-1">
                        {passwordRuleStates.map((rule) => (
                          <li
                            key={rule.id}
                            className={`flex items-center gap-2 text-[11px] font-body ${rule.met ? 'text-emerald-700' : 'text-slate-500'}`}
                          >
                            <span
                              className={`inline-block h-1.5 w-1.5 rounded-full ${rule.met ? 'bg-emerald-500' : 'bg-slate-300'}`}
                            />
                            <span>{rule.label}</span>
                          </li>
                        ))}
                      </ul>

                      {isPasswordRequirementError && (
                        <p className="mt-2 text-[11px] font-body font-semibold text-rose-600">
                          Password does not meet signup requirements.
                        </p>
                      )}
                    </div>
                  )}
                </motion.div>

                {/* Submit Button */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 }}
                >
                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-500 hover:to-pink-400 text-white font-body font-semibold py-3 rounded-xl shadow-lg shadow-purple-600/25 hover:shadow-pink-500/35 hover:scale-[1.02] transition-all text-sm group relative overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <motion.span
                      className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/15 to-white/0"
                      animate={{ x: ['-100%', '100%'] }}
                      transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
                    />
                    <span className="relative flex items-center justify-center gap-2">
                      {loading ? 'Please wait...' : isSignUp ? 'Create Account' : 'Sign In'}
                      <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                    </span>
                  </Button>
                </motion.div>

                {/* Toggle Sign In / Sign Up */}
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setIsSignUp(!isSignUp);
                      setError(null);
                    }}
                    className="text-sm text-slate-400 hover:text-sky-500 font-body font-medium transition-colors"
                  >
                    {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Create one"}
                  </button>
                </div>
              </form>

              {/* Demo Accounts Quick Access */}
              {!isSignUp && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.85 }}
                  className="mb-4 relative"
                >
                  <div className="relative flex items-center gap-3 mb-4">
                    <div className="flex-1 h-px bg-slate-200" />
                    <span className="text-[10px] font-body font-semibold text-slate-400 uppercase tracking-widest">Quick Demo Access</span>
                    <div className="flex-1 h-px bg-slate-200" />
                  </div>
                  <div className="flex flex-col gap-2">
                    {demoAccounts.map((account) => {
                      const Icon = account.icon;
                      const iconBgMap: Record<string, string> = {
                        sky: 'bg-sky-100',
                        emerald: 'bg-emerald-100',
                        rose: 'bg-rose-100',
                      };
                      const iconClrMap: Record<string, string> = {
                        sky: 'text-sky-600',
                        emerald: 'text-emerald-600',
                        rose: 'text-rose-500',
                      };
                      return (
                        <motion.button
                          key={account.label}
                          type="button"
                          onClick={() => fillDemoAccount(account.email, account.password, account.role)}
                          className="group flex items-center gap-3 w-full px-4 py-2.5 rounded-lg bg-slate-50/80 border border-slate-200/70 hover:border-sky-300 hover:bg-sky-50/80 hover:shadow-sm transition-all text-left"
                          whileHover={{ scale: 1.01 }}
                          whileTap={{ scale: 0.99 }}
                        >
                          <div className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 ${iconBgMap[account.color]}`}>
                            <Icon size={15} className={iconClrMap[account.color]} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-body font-semibold text-slate-700 group-hover:text-sky-600 transition-colors">{account.label} Account</p>
                            <p className="text-[10px] text-slate-400 font-body truncate">{account.email}</p>
                          </div>
                          <ArrowRight size={14} className="text-slate-300 group-hover:text-sky-500 group-hover:translate-x-0.5 transition-all shrink-0" />
                        </motion.button>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {/* Footer */}
              <motion.p
                className="text-xs text-slate-400 text-center mt-4 font-body relative"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
              >
                <Lock size={10} className="inline mr-1 -mt-0.5" /> Your data is encrypted and secure
              </motion.p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
