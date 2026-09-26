import React, { useRef, useState } from 'react';
import { Shield, RotateCw, CheckCircle2, Building, Award, Camera } from 'lucide-react';
import { motion } from 'motion/react';
import type { ProfileData } from '../SettingsPage';

export interface AdminIDCardProps {
  profileData: ProfileData;
  onPhotoUploaded?: (photoURL: string) => void;
  className?: string;
}

interface PhotoCellProps {
  photoURL?: string;
  displayName?: string;
  onPhotoUploaded?: (photoURL: string) => void;
}

const AdminPhotoCell: React.FC<PhotoCellProps> = ({ photoURL, displayName, onPhotoUploaded }) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const initials = (displayName || 'A').trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (result !== null && !(result instanceof ArrayBuffer)) {
        onPhotoUploaded?.(result);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  return (
    <div className="relative shrink-0 flex flex-col items-center justify-start z-10" onClick={(e) => e.stopPropagation()}>
      <div className="relative group/photo">
        <div className="p-1 rounded-2xl bg-gradient-to-tr from-indigo-500 via-sky-400 to-indigo-600 shadow-lg shadow-indigo-950/20">
          <button
            type="button"
            className="block w-[84px] h-[100px] sm:w-[94px] sm:h-[110px] rounded-xl overflow-hidden bg-slate-900 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-indigo-400 cursor-pointer"
            aria-label="Change administrator profile photo"
            onClick={(e) => {
              e.stopPropagation();
              inputRef.current?.click();
            }}
          >
            {photoURL ? (
              <img
                src={photoURL}
                alt={`${displayName ?? 'Administrator'} photo`}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="flex items-center justify-center w-full h-full text-2xl font-black text-indigo-300 font-display select-none">
                {initials}
              </span>
            )}
          </button>
        </div>
        <span
          className="absolute -bottom-1.5 inset-x-0 mx-auto w-max px-2 py-0.5 rounded-full text-[8.5px] font-bold bg-indigo-600 text-white shadow-xs flex items-center gap-1 tracking-wider cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            inputRef.current?.click();
          }}
        >
          <Camera size={9} />
          <span>EDIT</span>
        </span>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleChange}
        />
      </div>
    </div>
  );
};

export const AdminIDCard: React.FC<AdminIDCardProps> = ({ profileData, onPhotoUploaded, className = '' }) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const cardRef = useRef<HTMLDivElement | null>(null);

  const adminIdDisplay = profileData.lrn || (profileData.uid ? `ADM-${profileData.uid.slice(0, 6).toUpperCase()}` : 'ADM-2025-001');
  const adminName = (profileData.name || 'Administrator').replace(/System Administrator/gi, 'Administrator');
  const positionTitle = profileData.position || 'Curriculum Administrator';
  const divisionOffice = profileData.school || profileData.department || 'Senior High School Mathematics';


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
        aria-label="Executive Administrator ID Card. Click to flip."
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsFlipped((prev) => !prev);
          }
        }}
      >
        {/* ===================== FRONT FACE ===================== */}
        <div className="relative w-full rounded-3xl p-5 sm:p-6 overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white border border-indigo-500/30 shadow-2xl [backface-visibility:hidden]">
          {/* Subtle Accent Glows */}
          <div className="absolute -top-20 -right-20 w-52 h-52 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 -left-20 w-52 h-52 bg-sky-500/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-sky-400 to-indigo-600 pointer-events-none" />

          {/* Top Pass Header */}
          <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-3 mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-indigo-600/30 border border-indigo-400/40 flex items-center justify-center text-indigo-300 shadow-inner">
                <Shield size={16} />
              </div>
              <div>
                <p className="font-display font-black text-xs text-white tracking-wider leading-none">
                  MATHPULSE AI
                </p>
                <p className="text-[9px] font-medium text-slate-400 uppercase tracking-widest mt-0.5">
                  Executive Pass
                </p>
              </div>
            </div>

            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-[9px] font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              <span>ACTIVE</span>
            </span>
          </div>

          {/* Identity Block */}
          <div className="flex items-start gap-4 mb-4">
            <AdminPhotoCell
              photoURL={profileData.photo}
              displayName={adminName}
              onPhotoUploaded={onPhotoUploaded}
            />

            <div className="flex-1 min-w-0">
              <span className="inline-block px-2 py-0.5 rounded-md bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-[9px] font-bold uppercase tracking-wider mb-1">
                Administrator
              </span>
              <h3 className="font-display font-black text-base sm:text-lg text-white leading-tight truncate">
                {adminName}
              </h3>
              <p className="text-xs text-slate-300 font-medium truncate mt-0.5">
                {positionTitle}
              </p>
              <p className="text-[10px] text-slate-400 truncate mt-1 flex items-center gap-1">
                <Building size={11} className="shrink-0 text-indigo-400" />
                <span className="truncate">{divisionOffice}</span>
              </p>
            </div>
          </div>

          {/* Admin ID Display & Security Strip */}
          <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-2">
            <div>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                Admin ID
              </p>
              <p className="font-mono text-xs sm:text-sm font-black text-sky-300 tracking-wider">
                {adminIdDisplay}
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
              Verified Access Level
            </span>
            <span className="flex items-center gap-1 text-indigo-300 font-medium">
              <RotateCw size={10} />
              Flip for Governance Pass
            </span>
          </div>
        </div>

        {/* ===================== BACK FACE ===================== */}
        <div className="absolute inset-0 w-full h-full rounded-3xl p-5 sm:p-6 overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white border border-indigo-500/30 shadow-2xl [transform:rotateY(180deg)] [backface-visibility:hidden] flex flex-col justify-between">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-sky-400 via-indigo-500 to-violet-500 pointer-events-none" />

          {/* Back Top Header */}
          <div className="flex items-center justify-between pb-2 border-b border-white/10">
            <div className="flex items-center gap-1.5">
              <Award size={15} className="text-indigo-400" />
              <span className="font-display font-black text-xs text-white tracking-wider">
                GOVERNANCE PASS
              </span>
            </div>
            <span className="font-mono text-[10px] font-bold text-indigo-300">
              {adminIdDisplay}
            </span>
          </div>

          {/* Governance Pass Centerpiece */}
          <div className="my-auto py-2 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-500/20 via-sky-500/20 to-violet-500/20 border border-indigo-400/30 flex items-center justify-center shadow-inner">
              <Shield size={28} className="text-sky-300 drop-shadow" />
            </div>
            <span className="mt-2.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 text-[10px] font-bold tracking-wider uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Verified Administrator
            </span>
            <p className="text-[10px] text-slate-300 font-medium mt-1.5 max-w-[240px]">
              Institutional credential active for Senior High School STEM curriculum management.
            </p>
          </div>

          {/* Back Footer */}
          <div className="pt-2 border-t border-white/10 text-[9px] text-slate-400 space-y-1">
            <p className="leading-tight">
              Authorized for Senior High School mathematics curricula and platform operations.
            </p>
            <div className="flex items-center justify-between text-indigo-300 font-medium pt-1">
              <span>MathPulse Governance</span>
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

export default AdminIDCard;
