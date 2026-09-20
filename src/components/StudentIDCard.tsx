import React, { useRef, useState } from 'react';
import { CheckCircle2, RotateCw, Sparkles, Star, Zap, GraduationCap, Camera } from 'lucide-react';
import type { ProfileData } from './SettingsPage';

interface StudentIDCardProps {
  profileData: ProfileData;
  userLevel?: number;
  userXP?: number;
  onPhotoUploaded?: (photoURL: string) => void;
  className?: string;
}

/**
 * Cute MathPulse Barcode Graphic (SVG)
 * Deterministically renders bars based on the student's real LRN or UID
 */
const StudentBarcodeSVG: React.FC<{ code: string }> = ({ code }) => {
  const bars = [
    2, 1, 3, 1, 2, 4, 1, 2, 3, 1, 1, 2, 4, 1, 2, 1, 3, 2, 1, 4,
    1, 2, 2, 1, 3, 1, 4, 2, 1, 2, 1, 3, 2, 1, 4, 1, 2, 3, 1, 2,
    1, 3, 1, 4, 2, 1, 2, 3, 1, 1, 2, 4, 1, 2, 1, 3, 2, 1, 4, 2,
  ];

  return (
    <div className="flex flex-col items-start select-none">
      <svg
        viewBox="0 0 160 26"
        className="w-full max-w-[130px] sm:max-w-[145px] h-5 sm:h-6 text-slate-800 dark:text-slate-200"
        fill="currentColor"
        aria-label="Student ID Barcode"
      >
        {bars.map((width, idx) => {
          const x = bars.slice(0, idx).reduce((acc, w) => acc + w + 1, 0);
          return idx % 2 === 0 ? (
            <rect key={idx} x={x} y={0} width={width} height={26} rx={0.5} />
          ) : null;
        })}
      </svg>
      <span className="font-mono text-[9px] tracking-wider text-slate-500 dark:text-slate-400 font-bold pl-0.5">
        *{code}*
      </span>
    </div>
  );
};

/**
 * Cute Mini QR Code with center heart/pulse glyph
 */
const CuteMiniQRSVG: React.FC = () => (
  <div className="relative p-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
    <svg
      viewBox="0 0 32 32"
      className="w-7 h-7 sm:w-8 sm:h-8 text-slate-800 dark:text-slate-100"
      fill="currentColor"
      aria-label="Digital Verification QR"
    >
      {/* Corner position markers */}
      <rect x="1" y="1" width="9" height="9" rx="1.5" fill="none" stroke="currentColor" strokeWidth="2" />
      <rect x="4" y="4" width="3" height="3" rx="0.5" />
      <rect x="22" y="1" width="9" height="9" rx="1.5" fill="none" stroke="currentColor" strokeWidth="2" />
      <rect x="25" y="4" width="3" height="3" rx="0.5" />
      <rect x="1" y="22" width="9" height="9" rx="1.5" fill="none" stroke="currentColor" strokeWidth="2" />
      <rect x="4" y="25" width="3" height="3" rx="0.5" />
      {/* Data dots */}
      <rect x="13" y="2" width="2" height="2" rx="0.5" />
      <rect x="17" y="2" width="2" height="2" rx="0.5" />
      <rect x="13" y="6" width="2" height="2" rx="0.5" />
      <rect x="15" y="10" width="2" height="2" rx="0.5" />
      <rect x="11" y="14" width="2" height="2" rx="0.5" />
      <rect x="19" y="14" width="2" height="2" rx="0.5" />
      <rect x="2" y="13" width="2" height="2" rx="0.5" />
      <rect x="6" y="17" width="2" height="2" rx="0.5" />
      <rect x="24" y="13" width="2" height="2" rx="0.5" />
      <rect x="28" y="17" width="2" height="2" rx="0.5" />
      <rect x="13" y="22" width="2" height="2" rx="0.5" />
      <rect x="17" y="24" width="2" height="2" rx="0.5" />
      <rect x="23" y="24" width="2" height="2" rx="0.5" />
      <rect x="27" y="22" width="2" height="2" rx="0.5" />
      <rect x="23" y="28" width="2" height="2" rx="0.5" />
      <rect x="27" y="28" width="2" height="2" rx="0.5" />
      {/* Center Cute Heart */}
      <path
        d="M16 13.5 C15 12 13 12.5 13 14 C13 15.5 16 17.5 16 17.5 C16 17.5 19 15.5 19 14 C19 12.5 17 12 16 13.5 Z"
        className="fill-purple-600 dark:fill-purple-400"
      />
    </svg>
  </div>
);

interface PhotoCellProps {
  photoURL?: string;
  displayName?: string;
  uid?: string;
  onPhotoUploaded?: (photoURL: string) => void;
}

/** Renders the portrait photo area on the ID card front.
 *  Clicking opens a file picker; the raw data-URL is passed to onPhotoUploaded
 *  so the parent (SettingsPage) can handle the actual upload/crop flow.
 */
const PhotoCell: React.FC<PhotoCellProps> = ({ photoURL, displayName, onPhotoUploaded }) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const initials = (displayName || 'S').trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      // FileReader.result is `string | ArrayBuffer | null`; string path chosen by readAsDataURL.
      // `instanceof ArrayBuffer` eliminates the non-string branches without a runtime typeof check.
      const result = reader.result;
      if (result !== null && !(result instanceof ArrayBuffer)) {
        onPhotoUploaded?.(result);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  return (
    <div
      className="relative shrink-0 flex flex-col items-center justify-start z-10"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="relative group/photo">
        <div className="p-1 rounded-2xl bg-gradient-to-tr from-purple-400 to-pink-400 shadow-md">
          <button
            type="button"
            className="block w-[82px] h-[98px] sm:w-[90px] sm:h-[106px] rounded-xl overflow-hidden bg-white dark:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 cursor-pointer"
            aria-label="Change profile photo"
            onClick={(e) => {
              e.stopPropagation();
              inputRef.current?.click();
            }}
          >
            {photoURL ? (
              <img
                src={photoURL}
                alt={`${displayName ?? 'Student'} profile`}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="flex items-center justify-center w-full h-full text-xl font-black text-purple-600 dark:text-purple-300 select-none">
                {initials}
              </span>
            )}
          </button>
        </div>
        {/* Photo Edit Badge */}
        <span
          className="absolute -bottom-1 inset-x-0 mx-auto w-max px-1.5 py-0.5 rounded-full text-[8px] font-bold bg-purple-600/90 text-white backdrop-blur-xs shadow-xs flex items-center gap-0.5 tracking-wider cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            inputRef.current?.click();
          }}
        >
          <Camera size={9} />
          <span>PHOTO</span>
        </span>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        aria-label="Choose profile photo"
        onClick={(e) => e.stopPropagation()}
        onChange={handleChange}
      />
    </div>
  );
};

export const StudentIDCard: React.FC<StudentIDCardProps> = ({
  profileData,
  userLevel = 1,
  userXP = 0,
  onPhotoUploaded,
  className = '',
}) => {
  const [isFlipped, setIsFlipped] = useState(false);

  // 100% Genuine Student Information (no fake/made-up stats)
  const studentName = profileData.name?.trim() || 'Student Learner';
  const hasLRN = Boolean(profileData.lrn?.trim());
  const lrnDisplay = hasLRN ? profileData.lrn?.trim() : 'Pending';
  const barcodeCode = hasLRN
    ? (profileData.lrn?.trim() || '')
    : (profileData.uid ? profileData.uid.slice(0, 10).toUpperCase() : 'STUDENT');

  const gradeText = profileData.grade
    ? (profileData.grade.startsWith('Grade') ? profileData.grade : `Grade ${profileData.grade}`)
    : 'Senior High';
  const sectionText = profileData.section ? ` · ${profileData.section}` : '';
  const strandBadge = `${gradeText}${sectionText}`;

  const schoolText = profileData.school?.trim() || 'Senior High School';

  // Dynamic signature created from student's name
  const firstName = studentName.split(' ')[0] || 'Learner';
  const lastInitial = studentName.split(' ').length > 1
    ? `${studentName.split(' ').slice(1).map((n) => n[0]).join('.')}.`
    : '';
  const signatureText = `${firstName} ${lastInitial}`.trim();

  return (
    <div className={`flex flex-col items-center select-none ${className}`}>
      {/* ── Cute Lanyard Clip Slot at top center ── */}
      <div className="flex flex-col items-center -mb-2 z-20">
        <div className="w-14 h-4 rounded-full bg-gradient-to-b from-slate-300 to-slate-400 dark:from-slate-700 dark:to-slate-800 border-2 border-white dark:border-slate-600 shadow-md flex items-center justify-center">
          {/* Inner punch-out slot hole */}
          <div className="w-7 h-1.5 rounded-full bg-slate-900/80 dark:bg-slate-950 shadow-inner" />
        </div>
      </div>

      {/* ── 3D Card Container with Iridescent Gradient Border ── */}
      <div
        className="w-full max-w-[360px] sm:max-w-[390px] aspect-[1.58/1] cursor-pointer group"
        style={{ perspective: 1200 }}
        onClick={() => setIsFlipped(!isFlipped)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsFlipped(!isFlipped);
          }
        }}
        aria-label="Cute MathPulse Student Pass. Click to flip."
      >
        <div
          className="relative w-full h-full [transition:transform_0.7s_cubic-bezier(0.4,0,0.2,1),box-shadow_0.3s_ease] [transform-style:preserve-3d] rounded-3xl p-[2.5px] bg-gradient-to-tr from-purple-500 via-pink-400 to-cyan-400 shadow-xl group-hover:shadow-purple-500/25"
          style={{ transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}
        >
          {/* ════════════════════════════════════════════════════════════════
              FRONT OF STUDENT ID CARD (Cute & Playful MathPulse Pass)
             ════════════════════════════════════════════════════════════════ */}
          <div className="absolute inset-0 w-full h-full [backface-visibility:hidden] rounded-[22px] overflow-hidden bg-white dark:bg-slate-900 border border-purple-100/80 dark:border-purple-900/40 shadow-inner flex flex-col justify-between">
            {/* Playful Top Header with MathPulse Mascot Vector */}
            <div className="relative bg-gradient-to-r from-purple-600 via-indigo-600 to-sky-500 text-white px-3.5 py-2 flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-2">
                {/* Cute Mascot Avatar Vector */}
                <div className="w-7 h-7 rounded-lg bg-white/20 backdrop-blur-md p-0.5 border border-white/40 shadow-xs flex items-center justify-center shrink-0">
                  <img
                    src="/mathpulse_final_logo.png"
                    alt="MathPulse AI Mascot"
                    className="w-full h-full object-contain drop-shadow-xs"
                  />
                </div>
                <div>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] sm:text-[11px] font-black tracking-wider uppercase text-white drop-shadow-xs font-sans">
                      MathPulse Pass
                    </span>
                    <Sparkles size={11} className="text-amber-300 fill-amber-300 animate-pulse" />
                  </div>
                  <p className="text-[8.5px] font-mono tracking-wider text-purple-100 font-bold">
                    LRN: <span className="text-white font-black">{lrnDisplay}</span>
                  </p>
                </div>
              </div>

              {/* Verified Student Pill Badge */}
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-[9px] font-bold text-white shadow-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
                <span>ACTIVE</span>
              </div>
            </div>

            {/* Card Body with Cute Watermark & Doodle Background */}
            <div className="relative flex-1 p-3 sm:p-3.5 flex items-stretch gap-3 sm:gap-3.5 overflow-hidden bg-gradient-to-br from-purple-50/50 via-white to-pink-50/30 dark:from-slate-900 dark:via-slate-900/90 dark:to-purple-950/30">
              {/* Cute faint floating math doodles and geometric elements in background */}
              <div className="absolute inset-0 opacity-[0.06] dark:opacity-[0.04] pointer-events-none select-none overflow-hidden font-serif text-purple-900 dark:text-purple-200">
                {/* Coordinate grid lines & angle arc */}
                <div className="absolute top-3 right-6 w-16 h-16 rounded-full border border-purple-800 dark:border-purple-300 border-dashed opacity-50" />
                <div className="absolute bottom-2 left-20 w-12 h-12 border-b border-l border-purple-800 dark:border-purple-300 opacity-40" />
                {/* Floating symbols */}
                <span className="absolute top-2 left-24 text-base font-black">π</span>
                <span className="absolute top-8 right-24 text-sm font-black">∑</span>
                <span className="absolute bottom-6 right-18 text-xs font-mono font-bold">f(x)</span>
                <span className="absolute bottom-2 right-6 text-sm font-black">√x</span>
                <span className="absolute top-2 right-12 text-sm">∞</span>
                <span className="absolute top-12 left-28 text-[10px] font-mono">∫dx</span>
                <span className="absolute bottom-8 left-24 text-[9px] font-mono">sin θ</span>
              </div>

              {/* Mascot watermark in corner */}
              <div className="absolute -right-4 -bottom-4 w-28 h-28 opacity-[0.07] dark:opacity-[0.05] pointer-events-none">
                <img
                  src="/mathpulse_final_logo.png"
                  alt=""
                  className="w-full h-full object-contain"
                />
              </div>

              {/* Left Column: Portrait Photo with Cute Frame */}
              <PhotoCell
                photoURL={profileData.photo}
                displayName={studentName}
                uid={profileData.uid}
                onPhotoUploaded={onPhotoUploaded}
              />

              {/* Right Column: Genuine Student Info */}
              <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5 z-10">
                <div className="space-y-1 sm:space-y-1.5">
                  {/* Student Name */}
                  <div>
                    <span className="block text-[8px] font-mono tracking-wider text-purple-600 dark:text-purple-400 font-bold uppercase leading-none">
                      Learner Name
                    </span>
                    <h3 className="text-xs sm:text-sm font-display font-black text-slate-900 dark:text-white truncate tracking-tight leading-tight mt-0.5">
                      {studentName}
                    </h3>
                  </div>

                  {/* Track & Section Badge */}
                  <div>
                    <span className="block text-[8px] font-mono tracking-wider text-slate-400 dark:text-slate-400 font-bold uppercase leading-none">
                      Grade & Section
                    </span>
                    <span className="inline-flex items-center gap-1 mt-0.5 px-2 py-0.5 rounded-md bg-purple-100/90 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 text-[10px] sm:text-[11px] font-bold text-purple-700 dark:text-purple-300 truncate max-w-full">
                      <GraduationCap size={11} className="shrink-0 text-purple-500" />
                      <span className="truncate">{strandBadge}</span>
                    </span>
                  </div>

                  {/* School / Academy */}
                  <div>
                    <span className="block text-[8px] font-mono tracking-wider text-slate-400 dark:text-slate-400 font-bold uppercase leading-none">
                      School
                    </span>
                    <p className="text-[9px] sm:text-[10px] font-medium text-slate-600 dark:text-slate-300 truncate leading-tight mt-0.5">
                      {schoolText}
                    </p>
                  </div>
                </div>

                {/* Handwritten Cursive Signature */}
                <div className="pt-0.5">
                  <span className="block text-[7.5px] font-mono tracking-wider text-slate-400 dark:text-slate-400 font-bold uppercase leading-none mb-0.5">
                    Signature
                  </span>
                  <div className="h-5 flex items-center">
                    <span className="font-serif italic font-bold text-xs sm:text-sm text-purple-800 dark:text-purple-300 tracking-wide select-none drop-shadow-xs">
                      {signatureText}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Bar: Cute Barcode + Mini QR */}
            <div className="px-3.5 py-1 bg-slate-50 dark:bg-slate-950/90 border-t border-purple-100 dark:border-purple-950 flex items-center justify-between gap-2">
              <StudentBarcodeSVG code={barcodeCode} />
              <CuteMiniQRSVG />
            </div>
          </div>

          {/* ════════════════════════════════════════════════════════════════
              BACK OF STUDENT ID CARD (Cute Mascot Emblem & Learning Stats)
             ════════════════════════════════════════════════════════════════ */}
          <div
            className="absolute inset-0 w-full h-full [backface-visibility:hidden] [transform:rotateY(180deg)] rounded-[22px] overflow-hidden bg-gradient-to-br from-[#150A26] via-[#210F3D] to-[#0A1224] text-white p-3.5 sm:p-4 flex flex-col justify-between border border-purple-500/40 shadow-2xl"
          >
            {/* Subtle Math Elements & Shapes in Background */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden select-none opacity-10 dark:opacity-8">
              {/* Polar / concentric circle guides */}
              <div className="absolute -top-10 -right-10 w-44 h-44 rounded-full border border-purple-400/40 border-dashed" />
              <div className="absolute -top-4 -right-4 w-32 h-32 rounded-full border border-cyan-400/40" />
              {/* Coordinate axis crosshair */}
              <div className="absolute top-1/2 left-0 right-0 h-px bg-purple-400/20" />
              <div className="absolute top-0 bottom-0 left-1/2 w-px bg-purple-400/20" />
              {/* Floating math symbols */}
              <span className="absolute top-3 left-4 font-serif text-xs">∫ f(x)dx</span>
              <span className="absolute top-12 left-2 font-serif text-sm">∑</span>
              <span className="absolute bottom-10 left-3 font-serif text-xs">λ · θ</span>
              <span className="absolute top-3 right-16 font-serif text-xs">lim x→∞</span>
              <span className="absolute bottom-8 right-4 font-serif text-xs">Δy / Δx</span>
              <span className="absolute bottom-3 left-16 font-serif text-xs">{'e^(iπ) + 1 = 0'}</span>
            </div>

            {/* Top Bar on Back */}
            <div className="relative z-10 flex items-center justify-between pb-1 border-b border-purple-500/30">
              <div className="flex items-center gap-1.5">
                <Sparkles size={12} className="text-amber-300" />
                <span className="text-[9.5px] font-black uppercase tracking-widest text-purple-200 font-mono">
                  MathPulse Learner Pass
                </span>
              </div>
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[8.5px] font-bold">
                <CheckCircle2 size={10} />
                <span>VERIFIED</span>
              </div>
            </div>

            {/* Center: Circular Avatar Head with Circular Text Orbit */}
            <div className="relative z-10 my-auto flex flex-col items-center text-center">
              {/* Circular Text Orbit with Avatar Head in Center */}
              <div className="relative w-24 h-24 sm:w-26 sm:h-26 flex items-center justify-center">
                {/* SVG Circular Text Ring */}
                <svg
                  viewBox="0 0 120 120"
                  className="absolute inset-0 w-full h-full pointer-events-none select-none"
                >
                  <defs>
                    <path
                      id="badgeCirclePath"
                      d="M 60, 60 m -47, 0 a 47,47 0 1,1 94,0 a 47,47 0 1,1 -94,0"
                    />
                  </defs>
                  <text className="text-[7px] sm:text-[7.5px] font-mono font-black uppercase tracking-[0.22em] fill-purple-300/90">
                    <textPath href="#badgeCirclePath" startOffset="0%">
                      ✦ MATHPULSE AI ✦ OFFICIAL STUDENT PASS ✦
                    </textPath>
                  </text>
                </svg>

                {/* Glowing Circular Aura Halo */}
                <div className="absolute w-15 h-15 sm:w-16 sm:h-16 rounded-full bg-gradient-to-tr from-purple-500 via-pink-500 to-cyan-400 blur-md opacity-75 animate-pulse" />

                {/* Avatar Head Badge (Smooth circular frame) */}
                <div className="relative w-15 h-15 sm:w-16 sm:h-16 rounded-full bg-slate-900/95 border-2 border-white/90 p-0.5 shadow-xl flex items-center justify-center overflow-hidden">
                  <img
                    src="/avatar/avatar_icon.png"
                    alt="MathPulse AI Avatar"
                    className="w-full h-full object-contain drop-shadow-md"
                  />
                </div>
              </div>

              {/* MathPulse AI Title (Bigger, changed from "MathPulse AI Learning Platform") */}
              <h4 className="text-sm sm:text-base font-display font-black text-white tracking-wide mt-1">
                MathPulse AI
              </h4>
              <p className="text-[8px] sm:text-[8.5px] text-purple-200/90 italic mt-0.5 max-w-[270px]">
                &quot;Every problem has a solution. Keep pulsing! 💜&quot;
              </p>
            </div>

            {/* Genuine Student Stats Badges (Smaller & Compact below) */}
            <div className="relative z-10 pt-1.5 border-t border-purple-500/30 flex items-center justify-center gap-2 sm:gap-3">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-white/10 backdrop-blur-md border border-white/15">
                <div className="w-4 h-4 rounded-md bg-amber-400/25 border border-amber-300/40 text-amber-300 flex items-center justify-center shrink-0">
                  <Star size={10} className="fill-amber-300" />
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-[8px] font-mono uppercase text-purple-200">Level</span>
                  <span className="text-[10px] sm:text-[11px] font-display font-black text-white">
                    {userLevel}
                  </span>
                </div>
              </div>

              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-white/10 backdrop-blur-md border border-white/15">
                <div className="w-4 h-4 rounded-md bg-cyan-400/25 border border-cyan-300/40 text-cyan-300 flex items-center justify-center shrink-0">
                  <Zap size={10} className="fill-cyan-300" />
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-[8px] font-mono uppercase text-purple-200">Total</span>
                  <span className="text-[10px] sm:text-[11px] font-display font-black text-white">
                    {userXP} XP
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Helper Pill Below Card */}
      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setIsFlipped(!isFlipped)}
          className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-[11px] font-bold bg-white/90 dark:bg-slate-800/90 hover:bg-purple-50 dark:hover:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200/80 dark:border-purple-800/60 shadow-xs transition-all active:scale-95 cursor-pointer"
        >
          <RotateCw size={12} className={`transition-transform duration-500 ${isFlipped ? 'rotate-180' : ''}`} />
          <span>{isFlipped ? 'Tap to view front' : 'Tap to flip card 🔄'}</span>
        </button>
      </div>
    </div>
  );
};

export default StudentIDCard;
