import React, { useState } from 'react';
import { Eye, EyeOff, ArrowRight, Sparkles, Brain, TrendingUp, Users, Lock, Mail, Award, ChevronDown } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { motion, AnimatePresence } from 'motion/react';
import { signInWithEmail, signInWithGoogle, signUpWithEmail } from '../services/authService';
import { UserRole } from '../types/models';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [showQuickAccess, setShowQuickAccess] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>('student');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const demoAccounts = [
    {
      type: 'student' as const,
      email: 'demo-student@mathpulse.ai',
      password: 'Demo@123456',
      name: 'Alex Johnson',
      label: 'Student Portal',
      description: 'Access your personalized learning journey',
      icon: Brain,
      iconBg: 'bg-violet-500/10',
      iconColor: 'text-violet-400',
    },
    {
      type: 'teacher' as const,
      email: 'demo-teacher@mathpulse.ai',
      password: 'Demo@123456',
      name: 'Prof. Anderson',
      label: 'Teacher Portal',
      description: 'Monitor and guide your students',
      icon: Users,
      iconBg: 'bg-amber-500/10',
      iconColor: 'text-amber-400',
    },
    {
      type: 'admin' as const,
      email: 'demo-admin@mathpulse.ai',
      password: 'Demo@123456',
      name: 'Administrator',
      label: 'Admin Portal',
      description: 'Manage system and analytics',
      icon: TrendingUp,
      iconBg: 'bg-emerald-500/10',
      iconColor: 'text-emerald-400',
    }
  ];

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
        await signUpWithEmail(email, password, name, selectedRole);
      } else {
        // Sign in existing user
        await signInWithEmail(email, password);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    
    try {
      await signInWithGoogle(selectedRole);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Google sign-in failed');
      setLoading(false);
    }
  };

  const handleQuickLogin = async (type: 'student' | 'teacher' | 'admin', demoEmail: string, demoPassword: string) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setError(null);
    setLoading(true);
    
    try {
      // Try to sign in first (signInWithEmail now auto-creates profile if missing)
      await signInWithEmail(demoEmail, demoPassword);
    } catch (err: unknown) {
      // If sign in fails because account doesn't exist at all, create it
      const errMsg = err instanceof Error ? err.message : '';
      if (errMsg.includes('user-not-found') || errMsg.includes('invalid-credential')) {
        try {
          const demoAccount = demoAccounts.find(acc => acc.type === type);
          if (demoAccount) {
            await signUpWithEmail(demoEmail, demoPassword, demoAccount.name, type);
          }
        } catch (signUpErr: unknown) {
          // If sign-up fails because email already in use, try signing in again
          const signUpMsg = signUpErr instanceof Error ? signUpErr.message : '';
          if (signUpMsg.includes('email-already-in-use')) {
            try {
              await signInWithEmail(demoEmail, demoPassword);
            } catch (finalErr: unknown) {
              setError(finalErr instanceof Error ? finalErr.message : 'Authentication failed');
              setLoading(false);
            }
          } else {
            setError(signUpMsg || 'Demo account creation failed');
            setLoading(false);
          }
        }
      } else {
        setError(errMsg || 'Authentication failed');
        setLoading(false);
      }
    }
  };

  // Mathematical symbols for floating background decoration
  const mathSymbols = ['∫', 'π', '∑', 'Δ', '∞', 'φ', '√', 'λ', 'θ', '∂'];

  return (
    <div className="min-h-screen w-full bg-[#0a0a0f] flex items-center justify-center p-6 overflow-hidden relative">
      {/* Dot grid background pattern */}
      <div className="absolute inset-0 bg-dot-pattern opacity-40" />
      
      {/* Gradient ambient orbs */}
      <motion.div
        className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full opacity-20"
        style={{ background: 'radial-gradient(circle, rgba(124, 58, 237, 0.4) 0%, transparent 70%)' }}
        animate={{ scale: [1, 1.15, 1], x: [0, 40, 0], y: [0, 30, 0] }}
        transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute bottom-[-15%] right-[-10%] w-[500px] h-[500px] rounded-full opacity-15"
        style={{ background: 'radial-gradient(circle, rgba(245, 158, 11, 0.4) 0%, transparent 70%)' }}
        animate={{ scale: [1, 1.2, 1], x: [0, -50, 0], y: [0, -30, 0] }}
        transition={{ duration: 25, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Floating math symbols */}
      {mathSymbols.map((symbol, i) => (
        <motion.span
          key={i}
          className="absolute text-violet-500/10 font-display select-none pointer-events-none"
          style={{
            fontSize: `${20 + Math.random() * 40}px`,
            left: `${5 + (i * 9.5)}%`,
            top: `${10 + (i * 8)}%`,
          }}
          animate={{
            y: [0, -30, 0],
            opacity: [0.05, 0.15, 0.05],
            rotate: [0, 10, 0],
          }}
          transition={{
            duration: 8 + i * 2,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: i * 0.5,
          }}
        >
          {symbol}
        </motion.span>
      ))}

      {/* Geometric accent lines */}
      <div className="absolute top-0 left-1/4 w-px h-full bg-gradient-to-b from-transparent via-violet-500/10 to-transparent" />
      <div className="absolute top-0 right-1/3 w-px h-full bg-gradient-to-b from-transparent via-amber-500/5 to-transparent" />

      <div className="relative z-10 w-full max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Side — Branding */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col justify-center space-y-10"
          >
            {/* Logo */}
            <motion.div className="flex items-center gap-4">
              <motion.div
                className="w-14 h-14 rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center relative"
                animate={{ boxShadow: ['0 0 20px rgba(124,58,237,0.3)', '0 0 40px rgba(124,58,237,0.5)', '0 0 20px rgba(124,58,237,0.3)'] }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                <span className="text-white font-display font-extrabold text-2xl">M</span>
                <motion.div
                  className="absolute inset-0 rounded-xl border-2 border-violet-400/30"
                  animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              </motion.div>
              <div>
                <h1 className="text-2xl font-display font-extrabold tracking-tight text-white">MathPulse<span className="text-violet-400">AI</span></h1>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Sparkles size={12} className="text-amber-400" />
                  <span className="text-xs text-zinc-500 font-body font-medium tracking-wide">Powered by Machine Learning</span>
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
              <h2 className="text-5xl xl:text-6xl font-display font-extrabold leading-[1.1] tracking-tight text-white">
                Transform Your<br />
                <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-amber-400 bg-clip-text text-transparent">Math Journey</span>
              </h2>
              <p className="text-base text-zinc-400 leading-relaxed max-w-md font-body">
                AI-powered predictive system designed to identify at-risk students and provide personalized learning recommendations.
              </p>
            </motion.div>

            {/* Feature Cards — Geometric style */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { icon: Brain, label: 'AI Predictions', desc: 'Smart detection', color: 'violet' },
                { icon: TrendingUp, label: 'Analytics', desc: 'Real-time data', color: 'amber' },
                { icon: Award, label: 'Gamified', desc: 'Learn & earn', color: 'emerald' }
              ].map((feature, index) => {
                const Icon = feature.icon;
                const colorMap: Record<string, string> = {
                  violet: 'border-violet-500/20 hover:border-violet-500/40',
                  amber: 'border-amber-500/20 hover:border-amber-500/40',
                  emerald: 'border-emerald-500/20 hover:border-emerald-500/40',
                };
                const iconColorMap: Record<string, string> = {
                  violet: 'text-violet-400',
                  amber: 'text-amber-400',
                  emerald: 'text-emerald-400',
                };
                return (
                  <motion.div
                    key={index}
                    className={`bg-white/[0.03] backdrop-blur-sm border ${colorMap[feature.color]} rounded-xl p-4 transition-all cursor-pointer group`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 + index * 0.1 }}
                    whileHover={{ scale: 1.03, y: -4 }}
                  >
                    <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center mb-3">
                      <Icon size={18} className={iconColorMap[feature.color]} />
                    </div>
                    <h3 className="text-sm font-display font-semibold text-zinc-200 mb-0.5">{feature.label}</h3>
                    <p className="text-xs text-zinc-500 font-body">{feature.desc}</p>
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
            <div className="bg-[#16151f]/90 backdrop-blur-2xl border border-white/[0.06] rounded-2xl p-8 w-full max-w-md card-elevated-lg relative overflow-hidden">
              {/* Subtle top accent line */}
              <div className="absolute top-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-violet-500/40 to-transparent" />

              {/* Form Header */}
              <div className="text-center mb-8">
                <motion.h3
                  className="text-2xl font-display font-bold text-white mb-2"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                >
                  {isSignUp ? 'Create Account' : 'Welcome Back'}
                </motion.h3>
                <motion.p
                  className="text-sm text-zinc-500 font-body"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  {isSignUp ? 'Begin your learning journey' : 'Sign in to continue learning'}
                </motion.p>
              </div>

              {/* Login Form */}
              <form onSubmit={handleSubmit} className="space-y-5 mb-6">
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-rose-500/10 border border-rose-500/20 text-rose-400 px-4 py-3 rounded-lg text-sm font-body"
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
                    <label className="block text-xs font-body font-semibold text-zinc-400 mb-2 uppercase tracking-wider">
                      Full Name
                    </label>
                    <div className="relative">
                      <Users size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" />
                      <Input
                        type="text"
                        placeholder="Your Name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 rounded-lg bg-white/[0.04] border-white/[0.08] text-white placeholder:text-zinc-600 focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 text-sm font-body transition-all"
                        required
                      />
                    </div>
                  </motion.div>
                )}

                {/* Email Field */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  <label className="block text-xs font-body font-semibold text-zinc-400 mb-2 uppercase tracking-wider">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" />
                    <Input
                      type="email"
                      placeholder="your.email@school.edu"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 rounded-lg bg-white/[0.04] border-white/[0.08] text-white placeholder:text-zinc-600 focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 text-sm font-body transition-all"
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
                  <label className="block text-xs font-body font-semibold text-zinc-400 mb-2 uppercase tracking-wider">
                    Password
                  </label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" />
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-11 pr-11 py-3 rounded-lg bg-white/[0.04] border-white/[0.08] text-white placeholder:text-zinc-600 focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 text-sm font-body transition-all"
                      required
                      minLength={6}
                    />
                    <motion.button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-300 transition-colors"
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
                    className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-body font-semibold py-3 rounded-lg shadow-lg shadow-violet-500/20 hover:shadow-violet-500/30 transition-all text-sm group relative overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <motion.span
                      className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0"
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
                    className="text-sm text-zinc-500 hover:text-violet-400 font-body font-medium transition-colors"
                  >
                    {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Create one"}
                  </button>
                </div>
              </form>

              {/* Quick Access Demo Accounts */}
              <div>
                <motion.button
                  onClick={() => setShowQuickAccess(!showQuickAccess)}
                  className="w-full flex items-center justify-between px-4 py-3 mb-3 bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] rounded-lg transition-all group"
                  whileTap={{ scale: 0.99 }}
                >
                  <span className="text-sm font-body font-semibold text-zinc-400">Quick Access Demo</span>
                  <motion.div animate={{ rotate: showQuickAccess ? 180 : 0 }} transition={{ duration: 0.3 }}>
                    <ChevronDown size={18} className="text-zinc-600" />
                  </motion.div>
                </motion.button>

                <AnimatePresence>
                  {showQuickAccess && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="space-y-2 overflow-hidden"
                    >
                      {demoAccounts.map((account, index) => {
                        const Icon = account.icon;
                        return (
                          <motion.button
                            key={account.type}
                            onClick={() => handleQuickLogin(account.type, account.email, account.password)}
                            onHoverStart={() => setHoveredCard(account.type)}
                            onHoverEnd={() => setHoveredCard(null)}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ delay: index * 0.05 }}
                            whileHover={{ scale: 1.01, x: 3 }}
                            whileTap={{ scale: 0.98 }}
                            disabled={loading}
                            className="w-full bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] hover:border-white/[0.1] rounded-lg p-3.5 text-left transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 ${account.iconBg} rounded-lg flex items-center justify-center`}>
                                <Icon size={18} className={account.iconColor} />
                              </div>
                              <div className="flex-1">
                                <h4 className="text-sm font-body font-semibold text-zinc-200">{account.label}</h4>
                                <p className="text-xs text-zinc-600 font-body">{account.description}</p>
                              </div>
                              <motion.div
                                animate={{ x: hoveredCard === account.type ? 4 : 0, opacity: hoveredCard === account.type ? 1 : 0 }}
                                transition={{ duration: 0.2 }}
                              >
                                <ArrowRight size={16} className={account.iconColor} />
                              </motion.div>
                            </div>
                          </motion.button>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Footer */}
              <motion.p
                className="text-xs text-zinc-600 text-center mt-6 font-body"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
              >
                <Lock size={10} className="inline mr-1 -mt-0.5" /> Demo accounts for testing purposes
              </motion.p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;