import React, { useState } from 'react';
import { Eye, EyeOff, ArrowRight, Sparkles, Brain, TrendingUp, Users, Lock, Mail, Award, Zap, Target, Star, ChevronDown, ChevronUp } from 'lucide-react';
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
      gradient: 'from-teal-500 to-emerald-600',
      bgGradient: 'from-teal-50 to-emerald-50',
      iconBg: 'bg-teal-100',
      iconColor: 'text-teal-600',
      glowColor: 'shadow-teal-200'
    },
    {
      type: 'teacher' as const,
      email: 'demo-teacher@mathpulse.ai',
      password: 'Demo@123456',
      name: 'Prof. Anderson',
      label: 'Teacher Portal',
      description: 'Monitor and guide your students',
      icon: Users,
      gradient: 'from-blue-500 to-indigo-600',
      bgGradient: 'from-blue-50 to-indigo-50',
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      glowColor: 'shadow-blue-200'
    },
    {
      type: 'admin' as const,
      email: 'demo-admin@mathpulse.ai',
      password: 'Demo@123456',
      name: 'Administrator',
      label: 'Admin Portal',
      description: 'Manage system and analytics',
      icon: TrendingUp,
      gradient: 'from-purple-500 to-pink-600',
      bgGradient: 'from-purple-50 to-pink-50',
      iconBg: 'bg-purple-100',
      iconColor: 'text-purple-600',
      glowColor: 'shadow-purple-200'
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

  // Floating shapes for background animation
  const floatingShapes = [
    { color: 'bg-indigo-200', size: 'w-32 h-32', delay: 0, duration: 20, x: '10%', y: '15%' },
    { color: 'bg-teal-200', size: 'w-24 h-24', delay: 2, duration: 18, x: '85%', y: '10%' },
    { color: 'bg-purple-200', size: 'w-28 h-28', delay: 1, duration: 22, x: '75%', y: '70%' },
    { color: 'bg-orange-200', size: 'w-20 h-20', delay: 3, duration: 16, x: '15%', y: '75%' },
    { color: 'bg-blue-200', size: 'w-36 h-36', delay: 1.5, duration: 24, x: '50%', y: '85%' },
  ];

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-blue-200 via-cyan-50 to-indigo-100 flex items-center justify-center p-6 overflow-hidden relative">
      {/* Animated gradient orbs for depth - More subtle */}
      <motion.div
        className="absolute top-0 left-0 w-[500px] h-[500px] bg-blue-300 rounded-full mix-blend-multiply filter blur-3xl opacity-40"
        animate={{
          x: [0, 100, 0],
          y: [0, 50, 0],
          scale: [1, 1.1, 1],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
      <motion.div
        className="absolute top-0 right-0 w-[500px] h-[500px] bg-cyan-200 rounded-full mix-blend-multiply filter blur-3xl opacity-50"
        animate={{
          x: [0, -50, 0],
          y: [0, 100, 0],
          scale: [1, 1.2, 1],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
      <motion.div
        className="absolute bottom-0 left-1/2 w-[400px] h-[400px] bg-indigo-300 rounded-full mix-blend-multiply filter blur-3xl opacity-35"
        animate={{
          x: [0, -100, 0],
          y: [0, -50, 0],
          scale: [1, 1.15, 1],
        }}
        transition={{
          duration: 22,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />

      <div className="relative z-10 w-full max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          {/* Left Side - Branding */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="flex flex-col justify-center space-y-8"
          >
            {/* Logo */}
            <motion.div 
              className="flex items-center gap-3"
              whileHover={{ scale: 1.02 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <motion.div 
                className="w-16 h-16 bg-white/40 backdrop-blur-lg rounded-2xl flex items-center justify-center shadow-xl border border-white/50 relative overflow-hidden"
                animate={{
                  boxShadow: [
                    "0 10px 40px rgba(59, 130, 246, 0.2)",
                    "0 15px 50px rgba(59, 130, 246, 0.3)",
                    "0 10px 40px rgba(59, 130, 246, 0.2)",
                  ]
                }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                {/* Brain with Pulse Effect */}
                <svg width="36" height="36" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                  {/* Brain outline */}
                  <path d="M24 8C19 8 15 11 14 15C12 15 10 17 10 20C10 22 11 24 13 25C12 27 12 29 13 31C14 33 16 35 19 35C20 37 22 40 26 40C30 40 32 37 33 35C36 35 38 33 39 31C40 29 40 27 39 25C41 24 42 22 42 20C42 17 40 15 38 15C37 11 33 8 28 8C26.5 8 25 8.5 24 9C23 8.5 21.5 8 20 8C19 8 24 8 24 8Z" 
                    fill="#3b82f6" 
                    fillOpacity="0.9"
                  />
                  {/* Brain detail lines */}
                  <path d="M20 15C19 17 18 19 18 21M28 15C29 17 30 19 30 21M24 25C24 27 23 29 22 30M26 30C27 29 28 27 28 25" 
                    stroke="#1e40af" 
                    strokeWidth="1.5" 
                    strokeLinecap="round"
                  />
                  {/* Pulsating waves */}
                  <motion.g
                    animate={{
                      opacity: [0, 1, 0],
                      scale: [0.8, 1.2, 1.4],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeOut"
                    }}
                  >
                    <circle cx="24" cy="24" r="14" stroke="#3b82f6" strokeWidth="2" fill="none" opacity="0.6"/>
                  </motion.g>
                  <motion.g
                    animate={{
                      opacity: [0, 1, 0],
                      scale: [0.8, 1.2, 1.4],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeOut",
                      delay: 0.4
                    }}
                  >
                    <circle cx="24" cy="24" r="14" stroke="#3b82f6" strokeWidth="2" fill="none" opacity="0.4"/>
                  </motion.g>
                  <motion.g
                    animate={{
                      opacity: [0, 1, 0],
                      scale: [0.8, 1.2, 1.4],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeOut",
                      delay: 0.8
                    }}
                  >
                    <circle cx="24" cy="24" r="14" stroke="#3b82f6" strokeWidth="2" fill="none" opacity="0.2"/>
                  </motion.g>
                </svg>
              </motion.div>
              <div>
                <h1 className="text-3xl font-black tracking-tight text-blue-600 drop-shadow-sm">MathPulse AI</h1>
                <motion.div 
                  className="flex items-center gap-1.5 mt-0.5"
                  animate={{ opacity: [0.7, 1, 0.7] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Sparkles size={14} className="text-blue-500" />
                  <span className="text-xs text-slate-600 font-semibold">Powered by Machine Learning</span>
                </motion.div>
              </div>
            </motion.div>

            {/* Hero Text */}
            <motion.div 
              className="space-y-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.8 }}
            >
              <h2 className="text-5xl font-black leading-tight text-slate-900">
                Transform Your<br />
                <span className="text-blue-600">Math Journey</span>
              </h2>
              <p className="text-base text-slate-600 leading-relaxed max-w-md font-medium">
                AI-powered predictive system designed to identify at-risk students and provide personalized learning recommendations.
              </p>
            </motion.div>

            {/* Glassmorphic Feature Cards */}
            <div className="grid grid-cols-3 gap-4">
              {[
                { icon: Brain, label: 'AI Predictions', desc: 'Smart detection' },
                { icon: TrendingUp, label: 'Analytics', desc: 'Real-time data' },
                { icon: Award, label: 'Gamified', desc: 'Learn & earn' }
              ].map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <motion.div
                    key={index}
                    className="bg-white/40 backdrop-blur-md border border-white/60 rounded-2xl p-4 shadow-lg hover:bg-white/60 transition-all cursor-pointer"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 + index * 0.1 }}
                    whileHover={{ scale: 1.05, y: -5 }}
                  >
                    <motion.div 
                      className="w-10 h-10 bg-blue-100 backdrop-blur-sm rounded-xl flex items-center justify-center mb-3 border border-blue-200"
                      whileHover={{ rotate: 360 }}
                      transition={{ duration: 0.6 }}
                    >
                      <Icon size={20} className="text-blue-600" />
                    </motion.div>
                    <h3 className="text-sm font-bold text-slate-900 mb-1">{feature.label}</h3>
                    <p className="text-xs text-slate-600 font-medium">{feature.desc}</p>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>

          {/* Right Side - Login Form with Glassmorphism */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative flex justify-center lg:justify-end"
          >
            <motion.div 
              className="bg-white/95 backdrop-blur-2xl border border-white/50 rounded-3xl p-8 shadow-2xl w-full max-w-md"
              whileHover={{ boxShadow: "0 25px 70px rgba(59, 130, 246, 0.15)" }}
            >
              {/* Form Header */}
              <div className="text-center mb-6">
                <motion.h3 
                  className="text-2xl font-extrabold text-slate-900 mb-2"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                >
                  Welcome Back!
                </motion.h3>
                <motion.p 
                  className="text-sm text-slate-500 font-medium"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  Sign in to continue your learning journey
                </motion.p>
              </div>

              {/* Login Form */}
              <form onSubmit={handleSubmit} className="space-y-5 mb-6">
                {/* Error Display */}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm"
                  >
                    {error}
                  </motion.div>
                )}

                {/* Name Field (Sign Up Only) */}
                {isSignUp && (
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 }}
                  >
                    <label className="block text-xs font-bold text-slate-700 mb-2">
                      Full Name
                    </label>
                    <div className="relative">
                      <Users size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                      <Input
                        type="text"
                        placeholder="Your Name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full pl-12 pr-4 py-6 rounded-2xl bg-slate-50/80 backdrop-blur-sm border-slate-200/50 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-sm transition-all hover:bg-white/90"
                        required
                      />
                    </div>
                  </motion.div>
                )}

                {/* Email Field */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 }}
                >
                  <label className="block text-xs font-bold text-slate-700 mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <Input
                      type="email"
                      placeholder="your.email@school.edu"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-12 pr-4 py-6 rounded-2xl bg-slate-50/80 backdrop-blur-sm border-slate-200/50 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-sm transition-all hover:bg-white/90"
                      required
                    />
                  </div>
                </motion.div>

                {/* Password Field */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.7 }}
                >
                  <label className="block text-xs font-bold text-slate-700 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-12 pr-12 py-6 rounded-2xl bg-slate-50/80 backdrop-blur-sm border-slate-200/50 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-sm transition-all hover:bg-white/90"
                      required
                      minLength={6}
                    />
                    <motion.button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </motion.button>
                  </div>
                </motion.div>

                {/* Sign In/Up Button */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 }}
                >
                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-bold py-6 rounded-2xl shadow-lg hover:shadow-2xl transition-all text-sm group relative overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <motion.span
                      className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/30 to-white/0"
                      animate={{
                        x: ['-100%', '100%']
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        repeatDelay: 1
                      }}
                    />
                    <span className="relative flex items-center justify-center gap-2">
                      {loading ? 'Please wait...' : isSignUp ? 'Create Account' : 'Sign In'}
                      <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                    </span>
                  </Button>
                </motion.div>

                {/* Toggle Sign Up/Sign In */}
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setIsSignUp(!isSignUp);
                      setError(null);
                    }}
                    className="text-sm text-slate-600 hover:text-blue-600 font-medium transition-colors"
                  >
                    {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Create one"}
                  </button>
                </div>
              </form>

              {/* Collapsible Quick Access Section */}
              <div>
                {/* Toggle Button */}
                <motion.button
                  onClick={() => setShowQuickAccess(!showQuickAccess)}
                  className="w-full flex items-center justify-between px-4 py-3 mb-3 bg-slate-50/50 hover:bg-slate-100/50 border border-slate-200 rounded-2xl transition-all group"
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                >
                  <span className="text-sm font-bold text-slate-700">Quick Access Demo Accounts</span>
                  <motion.div
                    animate={{ rotate: showQuickAccess ? 180 : 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <ChevronDown size={20} className="text-slate-500" />
                  </motion.div>
                </motion.button>

                {/* Demo Account Cards - Collapsible */}
                <AnimatePresence>
                  {showQuickAccess && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="space-y-3 overflow-hidden"
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
                            whileHover={{ scale: 1.02, x: 3 }}
                            whileTap={{ scale: 0.98 }}
                            disabled={loading}
                            className="w-full bg-slate-50/50 backdrop-blur-sm hover:bg-white/70 border border-slate-200/50 hover:border-slate-300 rounded-2xl p-4 text-left transition-all group shadow-sm hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <div className="flex items-center gap-3">
                              <motion.div 
                                className={`w-12 h-12 ${account.iconBg} backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/50 transition-transform`}
                                whileHover={{ scale: 1.15, rotate: 5 }}
                              >
                                <Icon size={22} className={account.iconColor} />
                              </motion.div>
                              <div className="flex-1">
                                <h4 className="text-sm font-bold text-slate-800 mb-0.5">{account.label}</h4>
                                <p className="text-xs text-slate-500 font-medium">{account.description}</p>
                              </div>
                              <motion.div
                                animate={{
                                  x: hoveredCard === account.type ? 5 : 0,
                                  opacity: hoveredCard === account.type ? 1 : 0
                                }}
                                transition={{ duration: 0.2 }}
                              >
                                <ArrowRight 
                                  size={18} 
                                  className={account.iconColor} 
                                />
                              </motion.div>
                            </div>
                          </motion.button>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Footer Note */}
              <motion.p 
                className="text-xs text-slate-400 text-center mt-6 font-medium"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.2 }}
              >
                🔒 Demo accounts for testing purposes
              </motion.p>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;