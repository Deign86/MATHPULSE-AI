import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, Copy, Loader2, RefreshCw, ShieldAlert, UserPlus, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from './ui/button';
import {
  createStudentAccountFromRoster,
  type CreateStudentFromRosterResult,
} from '../services/studentService';

export interface CreateStudentAccountSeed {
  /** managedStudent doc id (for local list reconciliation after success). */
  rosterId: string;
  name: string;
  lrn?: string;
  email?: string;
  grade?: string;
  section?: string;
  classSectionId?: string;
}

export interface CreateStudentAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  seed: CreateStudentAccountSeed | null;
  adviserTeacherId: string;
  adviserTeacherName?: string;
  schoolYear?: string;
  /**
   * Called once the backend has provisioned the student. The dashboard
   * uses this to flip `hasRegisteredAccount` on the local roster row.
   */
  onCreated?: (result: CreateStudentFromRosterResult & { rosterId: string }) => void;
}

const PASSWORD_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
const DEFAULT_EMAIL_DOMAIN = 'school.mathpulse.local';

function generateTemporaryPassword(length = 10): string {
  const cryptoRef =
    typeof globalThis !== 'undefined' && typeof globalThis.crypto !== 'undefined'
      ? globalThis.crypto
      : undefined;

  if (cryptoRef && typeof cryptoRef.getRandomValues === 'function') {
    const buffer = new Uint32Array(length);
    cryptoRef.getRandomValues(buffer);
    let output = '';
    for (let index = 0; index < length; index += 1) {
      output += PASSWORD_ALPHABET[buffer[index] % PASSWORD_ALPHABET.length];
    }
    return output;
  }

  let fallback = '';
  for (let index = 0; index < length; index += 1) {
    fallback += PASSWORD_ALPHABET[Math.floor(Math.random() * PASSWORD_ALPHABET.length)];
  }
  return fallback;
}

function buildAutoEmail(seed: CreateStudentAccountSeed | null): string {
  if (!seed) return '';
  const lrn = (seed.lrn || '').replace(/[^A-Za-z0-9]/g, '');
  if (lrn) return `${lrn}@${DEFAULT_EMAIL_DOMAIN}`;
  const slug = (seed.name || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.+|\.+$/g, '');
  if (!slug) return '';
  return `${slug}@${DEFAULT_EMAIL_DOMAIN}`;
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export const CreateStudentAccountModal: React.FC<CreateStudentAccountModalProps> = ({
  isOpen,
  onClose,
  seed,
  adviserTeacherId,
  adviserTeacherName,
  schoolYear,
  onCreated,
}) => {
  const [email, setEmail] = useState('');
  const [temporaryPassword, setTemporaryPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [createdResult, setCreatedResult] = useState<CreateStudentFromRosterResult | null>(null);
  const [copiedPassword, setCopiedPassword] = useState(false);

  // Reset state whenever a new seed is opened.
  useEffect(() => {
    if (!isOpen) return;
    setSubmitError(null);
    setCopiedPassword(false);
    setIsSubmitting(false);
    setCreatedResult(null);
    setEmail((seed?.email || buildAutoEmail(seed)).trim());
    setTemporaryPassword(generateTemporaryPassword());
  }, [isOpen, seed]);

  const seedSummary = useMemo(() => {
    if (!seed) return null;
    return [seed.grade, seed.section].filter(Boolean).join(' · ') || 'Unassigned section';
  }, [seed]);

  const handleRegeneratePassword = () => {
    setTemporaryPassword(generateTemporaryPassword());
    setCopiedPassword(false);
  };

  const handleCopyPassword = async () => {
    try {
      const targetPassword = createdResult?.temporaryPassword || temporaryPassword;
      if (!targetPassword) return;
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(targetPassword);
      }
      setCopiedPassword(true);
      toast.success('Temporary password copied. Share it with the student now — it will not be shown again.');
      window.setTimeout(() => setCopiedPassword(false), 2500);
    } catch (error) {
      console.warn('Clipboard write failed:', error);
      toast.error('Unable to copy password. Please copy it manually.');
    }
  };

  const handleSubmit = async () => {
    if (!seed) return;
    const trimmedEmail = email.trim();
    if (!isValidEmail(trimmedEmail)) {
      setSubmitError('Enter a valid email address before creating the account.');
      return;
    }
    if (!temporaryPassword || temporaryPassword.length < 8) {
      setSubmitError('Temporary password must be at least 8 characters.');
      return;
    }
    if (!adviserTeacherId) {
      setSubmitError('Missing teacher context. Please refresh and try again.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const result = await createStudentAccountFromRoster({
        name: seed.name,
        lrn: seed.lrn,
        email: trimmedEmail,
        grade: seed.grade,
        section: seed.section,
        classSectionId: seed.classSectionId,
        adviserTeacherId,
        adviserTeacherName,
        schoolYear,
        temporaryPassword,
      });
      setCreatedResult(result);
      onCreated?.({ ...result, rosterId: seed.rosterId });
      toast.success(`Account created for ${seed.name}.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create account.';
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const visiblePassword = createdResult?.temporaryPassword || temporaryPassword;

  return (
    <AnimatePresence>
      {isOpen && seed && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => {
            if (!isSubmitting) onClose();
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            onClick={(event) => event.stopPropagation()}
            className="bg-[#f7f9fc] rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-[#dde3eb]"
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-student-account-modal-title"
          >
            <div className="flex items-start justify-between px-6 pt-6">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                  <UserPlus size={22} />
                </div>
                <div>
                  <h2
                    id="create-student-account-modal-title"
                    className="text-[16px] font-bold text-[#0a1628]"
                  >
                    {createdResult ? 'Account Created' : 'Create Student Account'}
                  </h2>
                  <p className="text-[12px] text-[#5a6578] mt-0.5">
                    {createdResult
                      ? 'Share these credentials with the student. The password will not be shown again.'
                      : `Provision a system account for ${seed.name}.`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!isSubmitting) onClose();
                }}
                className="p-1.5 rounded-lg hover:bg-[#dde3eb] transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4 text-[#5a6578]" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div className="bg-white border border-[#e2e8f0] rounded-2xl p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[#64748b]">Roster Row</p>
                <p className="text-[14px] font-semibold text-[#0a1628] mt-1">{seed.name}</p>
                <p className="text-[12px] text-[#475569] mt-0.5">
                  {seed.lrn ? `LRN ${seed.lrn} · ` : ''}
                  {seedSummary}
                </p>
              </div>

              {!createdResult && (
                <>
                  <label className="block">
                    <span className="text-[12px] font-semibold text-[#0a1628]">Email address</span>
                    <input
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      disabled={isSubmitting}
                      className="mt-1 w-full rounded-xl border border-[#dde3eb] bg-white px-3 py-2 text-[13px] text-[#0a1628] focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                      placeholder="student@school.example"
                      autoComplete="off"
                      spellCheck={false}
                    />
                    <span className="text-[11px] text-[#64748b] mt-1 block">
                      Auto-generated from LRN if available. The student will sign in with this address.
                    </span>
                  </label>

                  <div>
                    <span className="text-[12px] font-semibold text-[#0a1628] block">Temporary password</span>
                    <div className="mt-1 flex items-center gap-2">
                      <input
                        type="text"
                        value={temporaryPassword}
                        readOnly
                        className="flex-1 rounded-xl border border-[#dde3eb] bg-white px-3 py-2 text-[13px] font-mono tracking-wide text-[#0a1628] focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleRegeneratePassword}
                        disabled={isSubmitting}
                        className="p-2 rounded-xl border border-[#dde3eb] bg-white hover:bg-[#f1f5f9] transition-colors disabled:opacity-60"
                        aria-label="Regenerate temporary password"
                      >
                        <RefreshCw className="w-4 h-4 text-[#475569]" />
                      </button>
                      <button
                        type="button"
                        onClick={handleCopyPassword}
                        className="p-2 rounded-xl border border-[#dde3eb] bg-white hover:bg-[#f1f5f9] transition-colors"
                        aria-label="Copy temporary password"
                      >
                        {copiedPassword ? (
                          <Check className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <Copy className="w-4 h-4 text-[#475569]" />
                        )}
                      </button>
                    </div>
                    <span className="text-[11px] text-[#64748b] mt-1 block">
                      The student should change this on first sign-in. Share it once — it will not be persisted.
                    </span>
                  </div>

                  {submitError && (
                    <div className="flex items-start gap-2 rounded-xl bg-rose-50 border border-rose-200 px-3 py-2 text-[12px] text-rose-700">
                      <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0" />
                      <span>{submitError}</span>
                    </div>
                  )}
                </>
              )}

              {createdResult && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 space-y-2">
                  <p className="text-[12px] font-semibold text-emerald-800">Credentials</p>
                  <div className="flex items-center justify-between gap-3 rounded-xl bg-white border border-emerald-100 px-3 py-2">
                    <span className="text-[12px] text-[#475569]">Email</span>
                    <span className="text-[13px] font-semibold text-[#0a1628]">{createdResult.email}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3 rounded-xl bg-white border border-emerald-100 px-3 py-2">
                    <span className="text-[12px] text-[#475569]">Temporary password</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-semibold font-mono text-[#0a1628]">
                        {visiblePassword}
                      </span>
                      <button
                        type="button"
                        onClick={handleCopyPassword}
                        className="p-1.5 rounded-lg border border-emerald-200 bg-white hover:bg-emerald-100 transition-colors"
                        aria-label="Copy temporary password"
                      >
                        {copiedPassword ? (
                          <Check className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <Copy className="w-4 h-4 text-emerald-700" />
                        )}
                      </button>
                    </div>
                  </div>
                  <p className="text-[11px] text-emerald-800">
                    This password is not stored anywhere. If you close this dialog without copying, you will need
                    to reset it from the admin tools.
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 px-6 pb-6">
              {createdResult ? (
                <Button
                  type="button"
                  onClick={onClose}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-[13px] font-semibold rounded-xl px-5 py-2"
                >
                  Done
                </Button>
              ) : (
                <>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={onClose}
                    disabled={isSubmitting}
                    className="text-[13px] font-semibold text-[#475569] rounded-xl px-4 py-2 hover:bg-[#dde3eb]"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-[13px] font-semibold rounded-xl px-5 py-2 disabled:opacity-60"
                  >
                    {isSubmitting ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Creating…
                      </span>
                    ) : (
                      'Create account'
                    )}
                  </Button>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CreateStudentAccountModal;
