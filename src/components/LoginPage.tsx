import React, { useState, useRef, useEffect } from 'react';
import { Eye, EyeOff, ArrowRight, Sparkles, Brain, TrendingUp, Users, Lock, Mail, Award, GraduationCap, ShieldCheck, BookOpen, Zap } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { motion, AnimatePresence } from 'motion/react';
import { signInWithEmail, signInWithGoogle, signUpWithEmail, setPendingAuthRole } from '../services/authService';
import { UserRole } from '../types/models';
import shaderBgVideo from '../assets/shader-bg.mp4';

const getFriendlyErrorMessage = (err: unknown, defaultMessage: string): string => {
  const errorMessage = err instanceof Error ? err.message : defaultMessage;
  
  if (errorMessage.includes('auth/invalid-credential') || errorMessage.includes('auth/wrong-password') || errorMessage.includes('auth/user-not-found')) {
    return 'Invalid email or password. Please check your credentials and try again.';
  }
  if (errorMessage.includes('auth/email-already-in-use')) {
    return 'This email is already registered. Please sign in instead.';
  }
  if (errorMessage.includes('auth/weak-password')) {
    return 'Password is too weak. It should be at least 6 characters.';
  }
  if (errorMessage.includes('auth/too-many-requests')) {
    return 'Access to this account has been temporarily disabled due to many failed login attempts. You can immediately restore it by resetting your password or you can try again later.';
  }
  if (errorMessage.includes('auth/network-request-failed')) {
    return 'Network error. Please check your internet connection and try again.';
  }
  
  // If it's a generic Firebase error, hide it behind the default message
  if (errorMessage.includes('Firebase:') || errorMessage.includes('auth/')) {
    return defaultMessage;
  }
  
  return errorMessage;
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
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [videoDuration, setVideoDuration] = useState(16);
  const primaryVideoRef = useRef<HTMLVideoElement>(null);
  const secondaryVideoRef = useRef<HTMLVideoElement>(null);

  const syncSecondaryOffset = (duration: number) => {
    if (!Number.isFinite(duration) || duration <= 0 || !secondaryVideoRef.current) {
      return;
    }

    try {
      secondaryVideoRef.current.currentTime = duration / 2;
    } catch {
      // Ignore offset sync failures; native loop still works as fallback.
    }
  };

  useEffect(() => {
    // Ensure both background videos try to play on mount.
    primaryVideoRef.current?.play().catch(() => {});
    secondaryVideoRef.current?.play().catch(() => {});
  }, []);

  const handlePrimaryMetadata = () => {
    const duration = primaryVideoRef.current?.duration;
    if (duration && Number.isFinite(duration) && duration > 0) {
      setVideoDuration(duration);
      syncSecondaryOffset(duration);
    }
  };

  const handleSecondaryMetadata = () => {
    syncSecondaryOffset(videoDuration);
  };

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
      setError(getFriendlyErrorMessage(err, 'Demo sign-in failed'));
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
      setError(getFriendlyErrorMessage(err, 'Authentication failed'));
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
      setError(getFriendlyErrorMessage(err, 'Google sign-in failed'));
      setLoading(false);
    }
  };

  return (
    <div className="h-screen w-full flex items-center justify-center px-6 overflow-hidden relative" style={{ background: 'linear-gradient(135deg, #f0f9ff 0%, #f8fafc 30%, #fff1f2 60%, #f0f9ff 100%)' }}>
      {/* ─── Video Background ─── */}
      <motion.video
        ref={primaryVideoRef}
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        onCanPlay={() => setVideoLoaded(true)}
        onLoadedMetadata={handlePrimaryMetadata}
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${videoLoaded ? 'opacity-20' : 'opacity-0'}`}
        animate={videoLoaded ? { opacity: [0.18, 0.42, 0.18] } : undefined}
        transition={{
          duration: videoDuration,
          repeat: Infinity,
          ease: 'linear',
        }}
        src={shaderBgVideo}
      />

      <motion.video
        ref={secondaryVideoRef}
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        onCanPlay={() => setVideoLoaded(true)}
        onLoadedMetadata={handleSecondaryMetadata}
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${videoLoaded ? 'opacity-35' : 'opacity-0'}`}
        animate={videoLoaded ? { opacity: [0.42, 0.18, 0.42] } : undefined}
        transition={{
          duration: videoDuration,
          repeat: Infinity,
          ease: 'linear',
        }}
        src={shaderBgVideo}
      />

      {/* Light frosted overlay — lets video breathe through */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
            background: 'radial-gradient(ellipse at 30% 50%, rgba(240,249,255,0.2) 0%, rgba(248,250,252,0.5) 50%, rgba(255,241,242,0.4) 80%, rgba(248,250,252,0.85) 100%)',
          }}
        />

        {/* Decorative gradient orbs for depth - enhanced with neon MathPulse colors */}
        <div className="absolute top-[10%] left-[-10%] w-[60%] h-[60%] rounded-full blur-[140px] pointer-events-none mix-blend-multiply" style={{ background: 'radial-gradient(circle, rgba(168,85,247,0.3) 0%, transparent 70%)' }} />
        <div className="absolute bottom-[-10%] right-[-10%] w-[70%] h-[70%] rounded-full blur-[160px] pointer-events-none mix-blend-multiply" style={{ background: 'radial-gradient(circle, rgba(236,72,153,0.25) 0%, transparent 70%)' }} />
        <div className="absolute top-[40%] left-[40%] w-[40%] h-[40%] rounded-full blur-[120px] pointer-events-none mix-blend-screen" style={{ background: 'radial-gradient(circle, rgba(56,189,248,0.2) 0%, transparent 70%)' }} />
        
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
                {error && (
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
                      minLength={6}
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
                    onClick={() => { setIsSignUp(!isSignUp); setError(null); }}
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