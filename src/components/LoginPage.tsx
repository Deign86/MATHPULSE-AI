import React, { useState, useMemo, useEffect } from 'react';
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
} from 'lucide-react';
import { motion } from 'motion/react';
import {
  signInWithEmail,
  signInWithGoogle,
  signUpWithEmail,
  setPendingAuthRole,
  type AuthServiceError,
} from '../services/authService';
import { UserRole } from '../types/models';
import { recordGet } from '../utils/memberOf';
import { InteractiveRobotBackground } from './login/InteractiveRobotBackground';

export function isObjectVal<T>(value: T): value is T & object {
  return typeof value === 'object';
}
export function isString<T>(value: T): value is T & string {
  return typeof value === 'string';
}

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

export const LoginPage: React.FC = () => {
  const GRADE_OPTIONS = ['Grade 11'];
  const SECTION_OPTIONS = {
    'Grade 11': ['Academic', 'Tech-Pro'],
  };

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>('student');
  const [selectedGrade, setSelectedGrade] = useState('Grade 11');
  const [selectedSection, setSelectedSection] = useState(SECTION_OPTIONS['Grade 11'][0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  useEffect(() => {
    const gradeSections = recordGet(SECTION_OPTIONS, selectedGrade) ?? [];
    if (gradeSections.length > 0 && !gradeSections.includes(selectedSection)) {
      setSelectedSection(gradeSections[0]);
    }
  }, [selectedGrade, selectedSection]);

  const demoAccounts = [
    {
      label: 'Student',
      role: 'student' as UserRole,
      email: 'teststudent@school.edu',
      password: 'TestPass123!',
      icon: GraduationCap,
      color: 'sky',
    },
    {
      label: 'Teacher',
      role: 'teacher' as UserRole,
      email: 'testteacher@school.edu',
      password: 'TestPass123!',
      icon: BookOpen,
      color: 'emerald',
    },
    {
      label: 'Admin',
      role: 'admin' as UserRole,
      email: 'testadmin@school.edu',
      password: 'TestPass123!',
      icon: ShieldCheck,
      color: 'rose',
    },
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
    <div className="relative min-h-screen w-full overflow-x-hidden bg-[#3a236a] text-slate-900 flex items-center justify-center p-4 sm:p-6 lg:p-12 selection:bg-purple-500 selection:text-white">
      {/* ─── Full-Bleed Mascot Video Background with 3D Cursor Tracking ─── */}
      <InteractiveRobotBackground />

      {/* ─── Main Content Layout ─── */}
      <div className="relative z-10 w-full max-w-7xl mx-auto flex items-center justify-end pointer-events-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="bg-white/90 backdrop-blur-2xl border border-white/80 rounded-3xl p-6 sm:p-8 w-full max-w-md relative overflow-hidden shadow-[0_25px_70px_-15px_rgba(58,35,106,0.35)] max-h-[90vh] overflow-y-auto"
        >
          {/* Top accent glow line */}
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-purple-500 via-pink-500 to-sky-500" />
          {/* Subtle inner glow */}
          <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-80 h-80 bg-gradient-to-br from-purple-400/20 to-pink-400/20 rounded-full blur-[60px] pointer-events-none" />

          {/* Card Header with Logo */}
          <div className="text-center mb-5 relative">
            <div className="flex items-center justify-center gap-2 mb-2">
              <img
                src="/mathpulse_final_logo.png"
                alt="MathPulse AI"
                className="w-8 h-8 object-contain"
              />
              <span className="text-lg font-display font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-purple-600 via-pink-600 to-sky-500">
                MathPulse
              </span>
            </div>
            <motion.h3
              className="text-2xl font-display font-bold text-slate-900 mb-1"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              {isSignUp ? 'Create Account' : 'Welcome Back'}
            </motion.h3>
            <motion.p
              className="text-sm text-slate-500 font-body"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              {isSignUp ? 'Begin your learning journey' : 'Sign in to continue learning'}
            </motion.p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5 mb-4 relative">
            {error && !isPasswordRequirementError && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-rose-50 border border-rose-200 text-rose-600 px-4 py-3 rounded-xl text-xs font-body flex items-start gap-2"
              >
                <AlertCircle size={15} className="text-rose-500 shrink-0 mt-0.5" />
                <span>{error}</span>
              </motion.div>
            )}

            {/* Name Field (Sign Up Only) */}
            {isSignUp && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-1.5 text-left"
              >
                <label className="block text-xs font-body font-semibold text-slate-500 uppercase tracking-wider">
                  Full Name
                </label>
                <div className="relative">
                  <Users size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Your Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-slate-100/80 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20 focus:bg-white text-sm font-body transition-all"
                    required
                  />
                </div>
              </motion.div>
            )}

            {/* Account Type Selection (Sign Up only) */}
            {isSignUp && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-1.5 text-left"
              >
                <label className="block text-xs font-body font-semibold text-slate-500 uppercase tracking-wider">
                  Account Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {ACCOUNT_TYPE_OPTIONS.map((roleOption) => {
                    const isActive = selectedRole === roleOption.role;
                    return (
                      <button
                        key={roleOption.role}
                        type="button"
                        onClick={() => setSelectedRole(roleOption.role)}
                        className={`rounded-xl border px-3 py-2 text-xs font-body font-semibold transition-all ${
                          isActive
                            ? 'border-sky-400 bg-sky-50 text-sky-700 ring-1 ring-sky-300'
                            : 'border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-300'
                        }`}
                      >
                        {roleOption.label}
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* Section dropdown for student */}
            {isSignUp && selectedRole === 'student' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="grid grid-cols-2 gap-2 text-left"
              >
                <div>
                  <label className="block text-xs font-body font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                    Grade Level
                  </label>
                  <select
                    value={selectedGrade}
                    onChange={(e) => setSelectedGrade(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-100/80 border border-slate-200 text-slate-900 text-xs font-body focus:border-sky-400"
                  >
                    {GRADE_OPTIONS.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-body font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                    Section
                  </label>
                  <select
                    value={selectedSection}
                    onChange={(e) => setSelectedSection(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-100/80 border border-slate-200 text-slate-900 text-xs font-body focus:border-sky-400"
                  >
                    {(recordGet(SECTION_OPTIONS, selectedGrade) ?? []).map((sec) => (
                      <option key={sec} value={sec}>
                        {sec}
                      </option>
                    ))}
                  </select>
                </div>
              </motion.div>
            )}

            {/* Email Field */}
            <div className="space-y-1.5 text-left">
              <label className="block text-xs font-body font-semibold text-slate-500 uppercase tracking-wider">
                Email Address
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  placeholder="your.email@school.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-slate-100/80 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20 focus:bg-white text-sm font-body transition-all"
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5 text-left">
              <label className="block text-xs font-body font-semibold text-slate-500 uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-11 py-2.5 rounded-xl bg-slate-100/80 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20 focus:bg-white text-sm font-body transition-all"
                  required
                  minLength={isSignUp ? 8 : 6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-2"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <Eye size={16} /> : <EyeOff size={16} />}
                </button>
              </div>

              {/* Password Requirements Checklist (Sign Up only) */}
              {isSignUp && password.length > 0 && !passwordMeetsSignupRequirements && (
                <div className="mt-2 rounded-xl border border-sky-100 bg-sky-50/80 p-2.5">
                  <p className="text-[10px] font-body font-semibold uppercase tracking-wider text-slate-600 mb-1">
                    Password requirements
                  </p>
                  <ul className="space-y-1">
                    {passwordRuleStates.map((rule) => (
                      <li
                        key={rule.id}
                        className={`flex items-center gap-1.5 text-[11px] font-body ${
                          rule.met ? 'text-emerald-700' : 'text-slate-500'
                        }`}
                      >
                        <span
                          className={`inline-block h-1.5 w-1.5 rounded-full ${
                            rule.met ? 'bg-emerald-500' : 'bg-slate-300'
                          }`}
                        />
                        <span>{rule.label}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-500 hover:to-pink-400 text-white font-body font-semibold py-2.5 min-h-[44px] rounded-xl shadow-lg shadow-purple-600/25 hover:shadow-pink-500/35 hover:scale-[1.01] active:scale-[0.99] transition-all text-sm group relative overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                {loading ? 'Please wait...' : isSignUp ? 'Create Account' : 'Sign In'}
                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </span>
            </button>

            {/* Google Sign-in */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-xl bg-slate-50 hover:bg-slate-100/80 border border-slate-200 text-slate-700 text-xs font-body font-medium transition-all disabled:opacity-50 min-h-[40px]"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
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

            {/* Toggle Sign In / Sign Up */}
            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setError(null);
                }}
                className="text-xs text-slate-500 hover:text-purple-600 font-body font-medium transition-colors py-1.5 px-3 rounded-lg hover:bg-slate-100/50"
              >
                {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Create one"}
              </button>
            </div>
          </form>

          {/* Demo Accounts Quick Access */}
          {!isSignUp && (
            <div className="mt-4 pt-3 border-t border-slate-100 relative">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-body font-semibold text-slate-400 uppercase tracking-widest">
                  Quick Demo Access
                </span>
                <span className="text-[10px] text-purple-600 font-mono font-semibold">1-CLICK</span>
              </div>
              <div className="flex flex-col gap-1.5">
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
                      className="group flex items-center gap-2.5 w-full px-3 py-2 rounded-xl bg-slate-50/90 border border-slate-200/80 hover:border-purple-300 hover:bg-purple-50/70 transition-all text-left"
                    >
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                          recordGet(iconBgMap, account.color) ?? ''
                        }`}
                      >
                        <Icon size={14} className={recordGet(iconClrMap, account.color) ?? ''} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-body font-semibold text-slate-700 group-hover:text-purple-700 transition-colors">
                          {account.label} Account
                        </p>
                        <p className="text-[10px] text-slate-400 font-body truncate">{account.email}</p>
                      </div>
                      <ArrowRight
                        size={13}
                        className="text-slate-300 group-hover:text-purple-600 group-hover:translate-x-0.5 transition-all shrink-0"
                      />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Security Footer */}
          <p className="text-[11px] text-slate-400 text-center mt-3 font-body flex items-center justify-center gap-1">
            <Lock size={11} className="text-slate-400" />
            <span>Your data is encrypted and secure</span>
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default LoginPage;
