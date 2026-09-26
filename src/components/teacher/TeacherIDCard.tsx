import React, { useRef, useState } from 'react';
import { RotateCw, CheckCircle2, Building, Award, Camera, GraduationCap, BookOpen } from 'lucide-react';
import { motion } from 'motion/react';
import { QRCodeSVG } from 'qrcode.react';
import type { ProfileData } from '../SettingsPage';

export interface TeacherIDCardProps {
  profileData: ProfileData;
  onPhotoUploaded?: (photoURL: string) => void;
  className?: string;
}

interface PhotoCellProps {
  photoURL?: string;
  displayName?: string;
  onPhotoUploaded?: (photoURL: string) => void;
}

const TeacherPhotoCell: React.FC<PhotoCellProps> = ({ photoURL, displayName, onPhotoUploaded }) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const initials = (displayName || 'T').trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('');

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (result !== null && !(result instanceof ArrayBuffer)) {
        onPhotoUploaded?.(result);
      }
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  return (
    <div className="relative shrink-0 flex flex-col items-center justify-start z-10" onClick={(event) => event.stopPropagation()}>
      <div className="relative group/photo">
        <div className="p-1 rounded-2xl bg-gradient-to-tr from-violet-600 via-fuchsia-500 to-indigo-600 shadow-lg shadow-violet-950/20">
          <button
            type="button"
            className="block w-[84px] h-[100px] sm:w-[94px] sm:h-[110px] rounded-xl overflow-hidden bg-slate-900 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-violet-400 cursor-pointer"
            aria-label="Change faculty profile photo"
            onClick={(event) => {
              event.stopPropagation();
              inputRef.current?.click();
            }}
          >
            {photoURL ? (
              <img
                src={photoURL}
                alt={displayName || 'Faculty Member'}
                className="w-full h-full object-cover group-hover/photo:scale-105 transition-transform duration-300"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-violet-900 to-indigo-950 text-white font-black text-xl sm:text-2xl select-none">
                <span>{initials}</span>
                <span className="text-[9px] font-medium text-violet-300 tracking-widest mt-1">FACULTY</span>
              </div>
            )}
            <div className="absolute inset-1 rounded-xl bg-black/50 opacity-0 group-hover/photo:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 text-white">
              <Camera size={18} />
              <span className="text-[9px] font-bold uppercase tracking-wider">Change</span>
            </div>
          </button>
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleChange}
      />
    </div>
  );
};

export const TeacherIDCard: React.FC<TeacherIDCardProps> = ({
  profileData,
  onPhotoUploaded,
  className = '',
}) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const cardRef = useRef<HTMLDivElement | null>(null);

  const teacherIdDisplay = profileData.lrn || (profileData.uid ? `TCH-${profileData.uid.slice(0, 6).toUpperCase()}` : 'TCH-2025-001');
  const teacherName = profileData.name || 'Mathematics Educator';
  const positionTitle = profileData.position || 'Senior High School Mathematics Faculty';
  const subjectSpecialization = profileData.subject || 'General Mathematics & Pre-Calculus';
  const departmentName = profileData.department || 'Senior High School STEM Department';

  const verificationUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/verify/teacher?id=${encodeURIComponent(teacherIdDisplay)}`
    : `https://mathpulse.ai/verify/teacher?id=${encodeURIComponent(teacherIdDisplay)}`;

  return (
    <div
      ref={cardRef}
      className={`relative w-full max-w-[360px] sm:max-w-[390px] xl:max-w-[410px] [perspective:1200px] select-none ${className}`}
    >
      <motion.div
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
        className="relative w-full [transform-style:preserve-3d] cursor-pointer"
        onClick={() => setIsFlipped((prev) => !prev)}
        role="button"
        tabIndex={0}
        aria-label="Faculty ID Card. Click to flip."
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            setIsFlipped((prev) => !prev);
          }
        }}
      >
        {/* ===================== FRONT FACE ===================== */}
        <div className="relative w-full rounded-3xl p-5 sm:p-6 overflow-hidden bg-gradient-to-br from-slate-900 via-violet-950 to-slate-900 text-white border border-violet-500/30 shadow-2xl [backface-visibility:hidden]">
          {/* Accent Glows */}
          <div className="absolute -top-20 -right-20 w-52 h-52 bg-violet-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 -left-20 w-52 h-52 bg-fuchsia-500/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-500 via-fuchsia-400 to-indigo-500 pointer-events-none" />

          {/* Top Pass Header */}
          <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-3 mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-violet-600/30 border border-violet-400/40 flex items-center justify-center text-violet-300 shadow-inner">
                <GraduationCap size={16} />
              </div>
              <div>
                <p className="font-display font-black text-xs text-white tracking-wider leading-none">
                  MATHPULSE AI
                </p>
                <p className="text-[9px] font-medium text-slate-400 uppercase tracking-widest mt-0.5">
                  Faculty Credential
                </p>
              </div>
            </div>

            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-[9px] font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              <span>ACTIVE FACULTY</span>
            </span>
          </div>

          {/* Identity Block */}
          <div className="flex items-start gap-4 mb-4">
            <TeacherPhotoCell
              photoURL={profileData.photo}
              displayName={teacherName}
              onPhotoUploaded={onPhotoUploaded}
            />

            <div className="flex-1 min-w-0">
              <span className="inline-block px-2 py-0.5 rounded-md bg-violet-500/20 border border-violet-400/30 text-violet-300 text-[9px] font-bold uppercase tracking-wider mb-1">
                STEM Educator
              </span>
              <h3 className="font-display font-black text-base sm:text-lg text-white leading-tight truncate">
                {teacherName}
              </h3>
              <p className="text-xs text-slate-300 font-medium truncate mt-0.5">
                {positionTitle}
              </p>
              <p className="text-[10px] text-violet-200 truncate mt-1 flex items-center gap-1">
                <BookOpen size={11} className="shrink-0 text-violet-400" />
                <span className="truncate">{subjectSpecialization}</span>
              </p>
              <p className="text-[10px] text-slate-400 truncate mt-0.5 flex items-center gap-1">
                <Building size={11} className="shrink-0 text-slate-400" />
                <span className="truncate">{departmentName}</span>
              </p>
            </div>
          </div>

          {/* Teacher ID Display & Accreditation */}
          <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-2">
            <div>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                Faculty ID
              </p>
              <p className="font-mono text-xs sm:text-sm font-black text-violet-300 tracking-wider">
                {teacherIdDisplay}
              </p>
            </div>

            <div className="text-right">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                Accreditation
              </p>
              <p className="text-[10px] font-bold text-slate-200">
                DepEd SSHS STEM
              </p>
            </div>
          </div>

          {/* Flip Hint */}
          <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between text-[9px] text-slate-400">
            <span className="flex items-center gap-1 text-slate-400">
              <CheckCircle2 size={11} className="text-emerald-400" />
              Verified Teaching Clearance
            </span>
            <span className="flex items-center gap-1 text-violet-300 font-medium">
              <RotateCw size={10} />
              Flip for QR Pass
            </span>
          </div>
        </div>

        {/* ===================== BACK FACE ===================== */}
        <div className="absolute inset-0 w-full h-full rounded-3xl p-5 sm:p-6 overflow-hidden bg-gradient-to-br from-slate-900 via-violet-950 to-slate-900 text-white border border-violet-500/30 shadow-2xl [transform:rotateY(180deg)] [backface-visibility:hidden] flex flex-col justify-between">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-fuchsia-400 via-violet-500 to-indigo-500 pointer-events-none" />

          {/* Back Top Header */}
          <div className="flex items-center justify-between pb-2 border-b border-white/10">
            <div className="flex items-center gap-1.5">
              <Award size={15} className="text-violet-400" />
              <span className="font-display font-black text-xs text-white tracking-wider">
                EDUCATOR PASS
              </span>
            </div>
            <span className="font-mono text-[10px] font-bold text-violet-300">
              {teacherIdDisplay}
            </span>
          </div>

          {/* QR Verification Centerpiece */}
          <div className="my-auto py-2 flex flex-col items-center justify-center text-center">
            <div className="p-2.5 rounded-2xl bg-white shadow-xl shadow-violet-950/40 border-2 border-violet-200">
              <QRCodeSVG
                value={verificationUrl}
                size={110}
                level="M"
                includeMargin={false}
              />
            </div>
            <p className="text-[10px] text-slate-300 font-medium mt-2">
              Scan for educator credential authentication
            </p>
          </div>

          {/* Back Footer */}
          <div className="pt-2 border-t border-white/10 text-[9px] text-slate-400 space-y-1">
            <p className="leading-tight">
              Authorized for Senior High School mathematics instruction, class analytics, and intervention.
            </p>
            <div className="flex items-center justify-between text-violet-300 font-medium pt-1">
              <span>MathPulse Faculty Pass</span>
              <span className="flex items-center gap-1">
                <RotateCw size={10} />
                Flip back
              </span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default TeacherIDCard;
