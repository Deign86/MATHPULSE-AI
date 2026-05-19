import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import * as Tabs from '@radix-ui/react-tabs';
import { Save, Sparkles, Shirt, Scissors, Footprints, Crown, Lock, ShoppingBag, RotateCcw, Star, AlertTriangle, X } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { updateUserProfile } from '../services/authService';
import { purchaseAvatarItem, resetAvatarPurchasesForTesting } from '../services/gamificationService';
import { useFeatureAccess } from '../hooks/useFeatureAccess';
import { Tooltip, TooltipTrigger, TooltipContent } from './ui/tooltip';
import CompositeAvatar, { AvatarLayers } from './CompositeAvatar';
import { MOCK_INVENTORY, EXCLUSIVE_DISPLAY_ITEMS } from '../data/avatarData';
import { StudentProfile } from '../types/models';

const shopAnimations = `
  @keyframes avatar-float { 0%, 100% { transform: translateY(-8px); } 50% { transform: translateY(8px); } }
  @keyframes spin-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  .animate-avatar-float { animation: avatar-float 4s ease-in-out infinite; }
  .animate-spin-slow { animation: spin-slow 1s linear infinite; }
`;

interface AvatarShopProps {
  onSaveProfile?: (layers: AvatarLayers) => void;
  onNavigateToModules?: () => void;
  /** Called by parent to check if there are unsaved changes before navigating away */
  unsavedChangesRef?: React.MutableRefObject<boolean>;
  /** Called when user confirms navigation away (save or discard) */
  onConfirmLeave?: () => void;
  pendingNavigation?: string | null;
  onCancelNavigation?: () => void;
}

const EQUIP_EXPRESSIONS = ['Wow!', 'Cute!', 'I love it!', 'Perfect!', 'So cool!', 'Awesome!'];
const ENCOURAGEMENT_PHRASES = ['Gain more XP to buy me more clothes!', 'Help me get stylish!', "Let's earn some XP to unlock more!", "I'd love to try on more outfits!", 'Keep learning to unlock new looks!'];
const DEFAULT_TOP_ITEM_ID = 'top_blue';
const AVATAR_INVENTORY_CACHE_KEY = 'mathpulse:avatar-inventory:v2';
const AVATAR_INVENTORY_CACHE_TTL_MS = 10 * 60 * 1000;
const AVATAR_SAVE_TIMEOUT_MS = 20_000;

type AvatarInventoryItem = (typeof MOCK_INVENTORY)[number];
type TabCategory = 'top' | 'bottom' | 'shoes' | 'accessory' | 'exclusive';

const AvatarShop: React.FC<AvatarShopProps> = ({ onSaveProfile, onNavigateToModules, unsavedChangesRef, onConfirmLeave, pendingNavigation, onCancelNavigation }) => {
  const { userProfile, refreshProfile, currentUser } = useAuth();
  const { cosmeticShop: shopAccess, loading: featureAccessLoading } = useFeatureAccess(currentUser?.uid || null);
  const isDevMode = import.meta.env.DEV;

  const [equipped, setEquipped] = useState<AvatarLayers>({ top: userProfile?.avatarLayers?.top ?? DEFAULT_TOP_ITEM_ID, bottom: userProfile?.avatarLayers?.bottom || '', shoes: userProfile?.avatarLayers?.shoes || '', accessory: userProfile?.avatarLayers?.accessory || '' });
  const [savedEquipped, setSavedEquipped] = useState<AvatarLayers>({ top: userProfile?.avatarLayers?.top ?? DEFAULT_TOP_ITEM_ID, bottom: userProfile?.avatarLayers?.bottom || '', shoes: userProfile?.avatarLayers?.shoes || '', accessory: userProfile?.avatarLayers?.accessory || '' });
  const [isSaving, setIsSaving] = useState(false);
  const [ownedItems, setOwnedItems] = useState<string[]>([]);
  const [currentXP, setCurrentXP] = useState(0);
  const [purchasingItemId, setPurchasingItemId] = useState<string | null>(null);
  const [avatarSpeech, setAvatarSpeech] = useState<string | null>(null);
  const inventoryItems = MOCK_INVENTORY;
  const [activeCategory, setActiveCategory] = useState<TabCategory>('top');
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [isPreviewActive, setIsPreviewActive] = useState(false);
  const isPreviewActiveRef = useRef(false);
  const [previewCountdown, setPreviewCountdown] = useState(0);
  const previewTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const preEquipRef = useRef<AvatarLayers>({ top: '', bottom: '', shoes: '', accessory: '' });

  const userProfileRef = useRef(userProfile);
  userProfileRef.current = userProfile;
  const saveGuardRef = useRef(false);
  const pendingSaveRef = useRef<{ layers: AvatarLayers; options: { showSuccessToast?: boolean; showSavingState?: boolean } } | null>(null);

  const hasUnsavedChanges = useMemo(() => equipped.top !== savedEquipped.top || equipped.bottom !== savedEquipped.bottom || equipped.shoes !== savedEquipped.shoes || equipped.accessory !== savedEquipped.accessory, [equipped, savedEquipped]);

  const hasExclusivePreview = useMemo(() => {
    const ids = [equipped.top, equipped.bottom, equipped.shoes, equipped.accessory].filter(Boolean);
    return ids.some(id => { const item = inventoryItems.find(i => i.id === id); return (item?.isExclusive || item?.isReward) && !ownedItems.includes(id!); });
  }, [equipped, inventoryItems, ownedItems]);

  // Expose unsaved state to parent
  useEffect(() => { if (unsavedChangesRef) unsavedChangesRef.current = hasUnsavedChanges; }, [hasUnsavedChanges, unsavedChangesRef]);

  // Show leave modal when parent requests navigation while unsaved
  useEffect(() => { if (pendingNavigation && hasUnsavedChanges) setShowLeaveModal(true); }, [pendingNavigation, hasUnsavedChanges]);
  useEffect(() => { if (userProfile && userProfile.role === 'student') { const sp = userProfile as StudentProfile; setOwnedItems(sp.ownedAvatarItems || []); setCurrentXP(sp.currentXP || 0); } }, [userProfile]);
  useEffect(() => { const initial: AvatarLayers = { top: userProfile?.avatarLayers?.top ?? DEFAULT_TOP_ITEM_ID, bottom: userProfile?.avatarLayers?.bottom || '', shoes: userProfile?.avatarLayers?.shoes || '', accessory: userProfile?.avatarLayers?.accessory || '' }; setEquipped(initial); setSavedEquipped(initial); }, [userProfile?.uid]);
  useEffect(() => { if (!avatarSpeech) { const timer = setInterval(() => { if (Math.random() > 0.6) setAvatarSpeech(ENCOURAGEMENT_PHRASES[Math.floor(Math.random() * ENCOURAGEMENT_PHRASES.length)]); }, 5000); return () => clearInterval(timer); } }, [avatarSpeech]);
  useEffect(() => { if (avatarSpeech) { const timer = setTimeout(() => setAvatarSpeech(null), 3500); return () => clearTimeout(timer); } }, [avatarSpeech]);

  const handlePreview = (category: keyof AvatarLayers, id: string) => {
    const item = inventoryItems.find(i => i.id === id);
    if (!item) return;
    // Cancel any existing preview timeout
    if (previewTimeoutRef.current) { clearTimeout(previewTimeoutRef.current); previewTimeoutRef.current = null; }
    // Store current equipped state (including unsaved edits) as restore target
    const restoreTarget = { ...equipped };
    preEquipRef.current = restoreTarget;
    setIsPreviewActive(true); isPreviewActiveRef.current = true;

    // Apply preview layers on top of current saved state
    if (item.setLayers) {
      const next: AvatarLayers = { ...restoreTarget };
      if (item.setLayers.top) next.top = item.setLayers.top;
      if (item.setLayers.bottom) next.bottom = item.setLayers.bottom;
      if (item.setLayers.shoes) next.shoes = item.setLayers.shoes;
      if (item.setLayers.accessory) next.accessory = item.setLayers.accessory;
      setEquipped(next);
    } else {
      setEquipped({ ...restoreTarget, [category]: id });
    }
    setAvatarSpeech('Preview only!');

    // Visual countdown 3, 2, 1
    setPreviewCountdown(3);
    const cdi = setInterval(() => { setPreviewCountdown(p => { if (p <= 1) { clearInterval(cdi); return 0; } return p - 1; }); }, 1000);
    // Auto-revert after 3 seconds
    previewTimeoutRef.current = setTimeout(() => {
      clearInterval(cdi);
      setEquipped(restoreTarget);
      setPreviewCountdown(0);
      setIsPreviewActive(false); isPreviewActiveRef.current = false;
      setAvatarSpeech(null);
      previewTimeoutRef.current = null;
    }, 3000);
  };


  const handleEquip = useCallback((category: keyof AvatarLayers, id: string) => {
    const item = inventoryItems.find(i => i.id === id);
    if (!item) return;
    const isOwned = ownedItems.includes(id);
    const isLocked = Boolean(((item.price && item.price > 0) || item.isReward) && !isOwned);

    // If it's a set item, equip all layers
    // If previewing, cancel preview first
    if (isPreviewActive && previewTimeoutRef.current) {
      clearTimeout(previewTimeoutRef.current);
      setIsPreviewActive(false); isPreviewActiveRef.current = false;
      setEquipped(preEquipRef.current);
    }

    if (item.setLayers) {
      const nextEquipped: AvatarLayers = { ...equipped };
      if (item.setLayers.top) nextEquipped.top = item.setLayers.top;
      if (item.setLayers.bottom) nextEquipped.bottom = item.setLayers.bottom;
      if (item.setLayers.shoes) nextEquipped.shoes = item.setLayers.shoes;
      if (item.setLayers.accessory) nextEquipped.accessory = item.setLayers.accessory;
      setEquipped(nextEquipped);
      setAvatarSpeech(item.isExclusive && !isOwned ? 'Preview only!' : 'Full set equipped!');
      return;
    }

    if (isLocked && !item.isExclusive) { toast.error('This item is locked. Earn or purchase it first!'); return; }
    // If any set pieces are currently equipped, clear them all (set behaves as one unit)
    let base = { ...equipped };
    const setItems = inventoryItems.filter(i => i.setLayers);
    const allSetPieceIds = new Set(setItems.flatMap(s => Object.values(s.setLayers || {})));
    if (allSetPieceIds.has(base.top || '') || allSetPieceIds.has(base.bottom || '') || allSetPieceIds.has(base.shoes || '') || allSetPieceIds.has(base.accessory || '')) {
      if (allSetPieceIds.has(base.top || '')) base.top = savedEquipped.top;
      if (allSetPieceIds.has(base.bottom || '')) base.bottom = savedEquipped.bottom;
      if (allSetPieceIds.has(base.shoes || '')) base.shoes = savedEquipped.shoes;
      if (allSetPieceIds.has(base.accessory || '')) base.accessory = savedEquipped.accessory;
    }
    const nextEquipped: AvatarLayers = { ...base, [category]: base[category] === id ? '' : id };
    setEquipped(nextEquipped);
    if (item.isExclusive && !isOwned) { setAvatarSpeech('Preview only!'); } else { setAvatarSpeech(EQUIP_EXPRESSIONS[Math.floor(Math.random() * EQUIP_EXPRESSIONS.length)]); }
  }, [equipped, inventoryItems, ownedItems, isPreviewActive]);

  const handlePurchaseItem = async (e: React.MouseEvent, itemId: string, price: number) => {
    e.stopPropagation();
    if (!userProfile?.uid) { toast.error('You must be logged in'); return; }
    if (ownedItems.includes(itemId)) { toast.info('You already own this item'); return; }
    setPurchasingItemId(itemId);
    try { const result = await purchaseAvatarItem(userProfile.uid, itemId, price); if (result.success) { toast.success(result.message || 'Item purchased!'); setOwnedItems(prev => [...prev, itemId]); if (result.currentXP !== undefined) setCurrentXP(result.currentXP); await refreshProfile(); } else { toast.error(result.message || 'Failed to purchase'); } } catch (err) { console.error(err); toast.error('Error purchasing item'); } finally { setPurchasingItemId(null); }
  };

  const handleResetForTesting = async () => {
    if (!isDevMode || !userProfile?.uid || purchasingItemId === 'resetting') return;
    setPurchasingItemId('resetting');
    try { const result = await resetAvatarPurchasesForTesting(userProfile.uid); if (result.success) { setOwnedItems([]); const r: AvatarLayers = { top: '', bottom: '', shoes: '', accessory: '' }; setEquipped(r); setSavedEquipped(r); if (onSaveProfile) onSaveProfile(r); setCurrentXP(result.newXP); toast.success(`Reset! XP: ${result.newXP}`); await refreshProfile(); } else { toast.error('Failed to reset'); } } catch (err) { console.error(err); toast.error('Error resetting'); } finally { setPurchasingItemId(null); }
  };

  const normalizeAvatarLayers = (layers: AvatarLayers): AvatarLayers => ({ top: typeof layers.top === 'string' ? layers.top : '', bottom: typeof layers.bottom === 'string' ? layers.bottom : '', shoes: typeof layers.shoes === 'string' ? layers.shoes : '', accessory: typeof layers.accessory === 'string' ? layers.accessory : '' });
  const withTimeout = <T,>(promise: Promise<T>, ms: number, label: string): Promise<T> => { let tid: ReturnType<typeof setTimeout> | undefined; const tp = new Promise<never>((_, rej) => { tid = setTimeout(() => rej(new Error(`${label} timed out`)), ms); }); return Promise.race([promise, tp]).finally(() => { if (tid) clearTimeout(tid); }); };

  const persistAvatarLayers = async (layers: AvatarLayers, options: { showSuccessToast?: boolean; showSavingState?: boolean } = {}) => {
    const cu = userProfileRef.current; if (!cu?.uid) return;
    const { showSuccessToast = true, showSavingState = true } = options;
    if (saveGuardRef.current) { pendingSaveRef.current = { layers: normalizeAvatarLayers(layers), options }; if (showSavingState) setIsSaving(true); return; }
    saveGuardRef.current = true; if (showSavingState) setIsSaving(true);
    try { const norm = normalizeAvatarLayers(layers); await withTimeout(updateUserProfile(cu.uid, { avatarLayers: norm }), AVATAR_SAVE_TIMEOUT_MS, 'Avatar save'); if (onSaveProfile) onSaveProfile(norm); setSavedEquipped(norm); if (showSuccessToast) toast.success('Avatar saved!'); }
    catch (err) { console.error(err); if (showSuccessToast) toast.error(err instanceof Error && err.message.includes('timed out') ? 'Save timed out.' : 'Failed to save'); }
    finally { const q = pendingSaveRef.current; pendingSaveRef.current = null; saveGuardRef.current = false; if (q) { void persistAvatarLayers(q.layers, q.options); return; } if (showSavingState || isSaving) setIsSaving(false); }
  };

  const handleSave = async () => {
    if (isPreviewActive) return;
    if (hasExclusivePreview) { toast.error('You need to purchase this item first to save it.'); return; }
    await persistAvatarLayers(equipped, { showSuccessToast: true, showSavingState: true });
  };

  const handleSaveAndLeave = async () => { setShowLeaveModal(false); if (!hasExclusivePreview) { await persistAvatarLayers(equipped, { showSuccessToast: true, showSavingState: true }); } if (onConfirmLeave) onConfirmLeave(); };
  const handleDiscardAndLeave = () => { setShowLeaveModal(false); setEquipped(savedEquipped); if (onConfirmLeave) onConfirmLeave(); };

  const categories: { id: TabCategory; label: string; icon: React.ReactNode }[] = [
    { id: 'top', label: 'Tops', icon: <Shirt size={16} /> },
    { id: 'bottom', label: 'Bottoms', icon: <Scissors size={16} className="rotate-90" /> },
    { id: 'shoes', label: 'Shoes', icon: <Footprints size={16} /> },
    { id: 'accessory', label: 'Accessories', icon: <Crown size={16} /> },
    { id: 'exclusive', label: 'Exclusive', icon: <Star size={16} className={activeCategory === 'exclusive' ? 'text-white fill-white' : 'text-amber-500 fill-amber-500'} /> },
  ];
  if (featureAccessLoading) return (<div className="flex flex-col justify-center items-center h-[500px] gap-3"><div className="animate-spin"><Save size={24} className="opacity-50" /></div><p className="text-sm text-slate-400 font-medium">Loading...</p></div>);
  if (!shopAccess) return (<div className="flex flex-col justify-center items-center h-[500px] gap-4"><div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center"><Lock className="w-7 h-7 text-slate-400" /></div><div className="text-center"><p className="text-sm font-semibold text-slate-700 mb-1">Avatar Shop Locked</p><p className="text-xs text-slate-400">This feature is temporarily unavailable.</p></div></div>);

  const getItemsForTab = (tabId: TabCategory) => {
    if (tabId === 'exclusive') return EXCLUSIVE_DISPLAY_ITEMS;
    return inventoryItems.filter(i => i.category === tabId && !i.isExclusive);
  };

  const renderItemGrid = (tabId: TabCategory) => {
    const items = getItemsForTab(tabId);
    if (items.length === 0) {
      const label = tabId === 'exclusive' ? 'Exclusive items' : categories.find(c => c.id === tabId)?.label || 'Items';
      return (<div className="w-full min-h-[200px] flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50 p-6 text-center"><Crown size={40} className="text-slate-300 mb-3 opacity-50" /><h3 className="font-bold text-lg text-slate-500 mb-1">{label} coming soon</h3><p className="text-slate-400 text-sm max-w-xs">We're crafting some awesome gear for your avatar!</p></div>);
    }
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-1">
        {items.map(item => {
          const cat = item.category;
          const isEquipped = item.setLayers ? Object.entries(item.setLayers).every(([layer, id]) => !id || equipped[layer as keyof AvatarLayers] === id) : equipped[cat] === item.id;
          const isOwned = ownedItems.includes(item.id);
          const isExclusive = Boolean(item.isExclusive);
          const isLocked = Boolean(((item.price && item.price > 0) || item.isReward) && !isOwned);
          const canPreview = isExclusive && !isOwned;
          const isPreviewing = isEquipped && canPreview;

          return (
            <div key={item.id} className="flex flex-col gap-1">
              <button
                onClick={() => { if (isLocked) return; handleEquip(cat, item.id); }}
                disabled={isLocked}
                className={`relative w-full aspect-square rounded-xl border-2 transition-all flex items-center justify-center group ${
                  isPreviewing ? 'bg-gradient-to-br from-amber-50 to-orange-50 border-amber-400 shadow-md scale-[1.02] z-10'
                  : isEquipped && !isLocked ? 'bg-white border-blue-500 shadow-md scale-[1.02] z-10'
                  : isLocked && !isExclusive ? 'bg-slate-50 border-slate-200 opacity-50 cursor-not-allowed'
                  : canPreview ? 'bg-slate-50 border-slate-200 opacity-60 cursor-default'
                  : 'bg-white border-slate-100 hover:border-sky-300 hover:shadow-md hover:scale-[1.02]'
                }`}
              >
                {isPreviewing && (<div className="absolute top-1 left-1/2 -translate-x-1/2 px-1.5 py-0.5 bg-gradient-to-r from-amber-500 to-orange-400 text-white text-[8px] font-black rounded-full flex items-center gap-0.5 z-10 whitespace-nowrap">Preview <Star size={8} className="fill-white" /></div>)}
                {isEquipped && !isLocked && !isPreviewing && (<div className="absolute top-1 left-1/2 -translate-x-1/2 px-1.5 py-0.5 bg-gradient-to-r from-blue-500 to-sky-400 text-white text-[8px] font-black rounded-full flex items-center gap-0.5 z-10 whitespace-nowrap">Equipped <Sparkles size={8} className="fill-white" /></div>)}
                {isLocked && !isExclusive && (<div className="absolute inset-0 bg-black/20 z-20 flex items-center justify-center rounded-[10px]"><Lock className="text-white" size={20} /></div>)}
                <img src={item.thumbnail} alt={item.name} className={`w-[80%] h-[80%] object-contain transition-transform ${(isLocked && !isExclusive) ? '' : 'group-hover:scale-110'}`} />
              </button>
              <p className="text-xs font-bold text-slate-700 text-center line-clamp-2">{item.name}</p>
              {isLocked && !isExclusive && !item.isReward && (<motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={(e) => handlePurchaseItem(e, item.id, item.price || 0)} disabled={purchasingItemId === item.id} className="w-full py-0.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-[9px] font-bold flex items-center justify-center gap-1 rounded shadow-sm transition-all disabled:opacity-70">{purchasingItemId === item.id ? (<motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}><ShoppingBag size={10} /></motion.div>) : (<><ShoppingBag size={10} /> {item.price} XP</>)}</motion.button>)}
              {canPreview && !item.setLayers && (<button onClick={() => handlePreview(cat, item.id)} disabled={isPreviewActive} className={`w-full py-1 text-[11px] font-bold flex items-center justify-center gap-1 rounded-lg border transition-colors ${isPreviewActive ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed' : 'bg-amber-50 hover:bg-amber-100 text-amber-600 border-amber-200 cursor-pointer'}`}><Star size={11} /> Preview</button>)}
              {canPreview && item.setLayers && (<button onClick={() => handlePreview(cat, item.id)} disabled={isPreviewActive} className={`w-full py-1 text-[11px] font-bold flex items-center justify-center gap-1 rounded-lg border transition-colors ${isPreviewActive ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed' : 'bg-amber-50 hover:bg-amber-100 text-amber-600 border-amber-200 cursor-pointer'}`}><Star size={11} /> Preview Set</button>)}
            </div>
          );
        })}
      </div>
    );
  };
  return (
    <>
      <style>{shopAnimations}</style>
      <div className="h-full w-full flex items-start xl:items-center justify-center p-4 sm:p-5 lg:p-6 overflow-y-auto xl:overflow-hidden">
        <div className="relative w-full max-w-6xl min-h-[480px] xl:h-[78vh] xl:max-h-[720px] rounded-[2rem] p-5 lg:p-6 bg-gradient-to-br from-white via-sky-50/30 to-white border border-slate-200/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col xl:flex-row gap-5 xl:gap-8 overflow-visible">

          <div className="absolute inset-0 overflow-hidden rounded-[2rem] pointer-events-none">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-sky-400/30 to-transparent" />
            <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-100/40 rounded-full blur-3xl" />
            <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-100/30 rounded-full blur-3xl" />
          </div>

          {/* Left: Item Grid */}
          <div className="flex flex-col xl:h-full min-h-0 relative z-10 w-full xl:flex-1 max-w-[600px]">
            {/* Header: Name left, XP right */}
            <div className="mb-3 flex items-center justify-between shrink-0">
              <div><h2 className="text-2xl font-display font-bold text-[#0a1628] tracking-tight truncate">{userProfile?.name || 'Student'}</h2><p className="text-sm text-slate-400 font-medium">Customize your avatar's look here!</p></div>
              <div className="flex items-center gap-2 shrink-0">
                {isDevMode && (
                  <Tooltip><TooltipTrigger asChild><button onClick={handleResetForTesting} disabled={purchasingItemId === 'resetting'} className="flex items-center justify-center bg-slate-100 hover:bg-red-50 text-slate-500 hover:text-red-500 p-2 rounded-lg transition-colors border border-slate-200"><RotateCcw size={14} /></button></TooltipTrigger><TooltipContent side="bottom" className="bg-slate-900 text-white border border-slate-700">Reset (Test)</TooltipContent></Tooltip>
                )}
                <Tooltip><TooltipTrigger asChild><button onClick={onNavigateToModules} className="bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg px-2.5 py-1 shadow-sm flex items-center gap-1.5 cursor-pointer hover:opacity-90 active:scale-95 transition-all"><ShoppingBag className="text-white shrink-0" size={13} /><span className="text-white text-sm font-black">{currentXP} XP</span></button></TooltipTrigger><TooltipContent side="bottom" className="bg-slate-900 text-white border border-slate-700">Earn more XP from lessons!</TooltipContent></Tooltip>
              </div>
            </div>

            <Tabs.Root value={activeCategory} onValueChange={(v) => setActiveCategory(v as TabCategory)} className="flex flex-col flex-1 min-h-0">
              <Tabs.List className="flex flex-nowrap shrink-0 justify-start space-x-1 mb-3 bg-white shadow-sm p-1 rounded-full border border-slate-100 w-fit overflow-x-auto max-w-full scrollbar-hide">
                {categories.map((cat) => (
                  <Tabs.Trigger key={cat.id} value={cat.id} className={`flex items-center gap-1 px-3 py-1.5 rounded-full font-bold text-[13px] hover:bg-slate-50 transition-all outline-none whitespace-nowrap ${cat.id === 'exclusive' ? 'data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-500 data-[state=active]:text-white [&_svg]:data-[state=active]:text-white text-amber-600' : 'data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-sky-500 data-[state=active]:text-white text-slate-500'}`}>
                    {cat.icon}{cat.label}
                  </Tabs.Trigger>
                ))}
              </Tabs.List>

              <div className="flex-1 overflow-y-auto min-h-0 pb-4 scrollbar-hide px-3 -mx-3">
                {categories.map(cat => (
                  <Tabs.Content key={cat.id} value={cat.id} className="outline-none h-full">
                    {renderItemGrid(cat.id)}
                  </Tabs.Content>
                ))}
              </div>
            </Tabs.Root>
          </div>

          {/* Right: Avatar Preview */}
          <div className="flex flex-col gap-3 relative z-10 w-full xl:w-[340px] min-w-[280px] shrink-0 xl:self-center mx-auto xl:mx-0">
            <div className="bg-[#0f1422] rounded-[2rem] relative shadow-[0_20px_50px_rgba(15,20,34,0.2)] h-[340px] xl:h-[400px] w-full flex items-center justify-center border-4 border-slate-800">
              <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-[200px] h-[20px] bg-sky-500/20 blur-xl rounded-full" />
              <div className="relative w-full h-[80%] z-10 flex justify-center items-center animate-avatar-float">
                <CompositeAvatar layers={equipped} className="w-full h-full absolute inset-0 z-20" />
                <AnimatePresence>
                  {avatarSpeech && (
                    <motion.div initial={{ opacity: 0, y: -10, scale: 0.8 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.8 }} transition={{ duration: 0.3 }} className="absolute -top-12 left-1/2 -translate-x-1/2 z-30 bg-white text-slate-800 px-3 py-1.5 rounded-full shadow-lg border-2 border-sky-300 whitespace-nowrap font-bold text-xs max-w-[200px] text-center">
                      {avatarSpeech}
                      <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[5px] border-r-[5px] border-t-[5px] border-l-transparent border-r-transparent border-t-white" />
                    </motion.div>
                  )}
                </AnimatePresence>
                {isPreviewActive && previewCountdown > 0 && (
                  <motion.div key={previewCountdown} initial={{ scale: 1.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 bg-amber-500 text-white w-10 h-10 rounded-full flex items-center justify-center font-black text-xl shadow-lg border-2 border-amber-300">
                    {previewCountdown}
                  </motion.div>
                )}
              </div>
            </div>

            {/* Save Button - fixed height area */}
            <div className="h-[48px]">
              <button onClick={handleSave} disabled={isSaving || !hasUnsavedChanges || isPreviewActive} className="w-full h-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors shadow-md disabled:shadow-none active:scale-[0.98]">
                {isSaving ? (<><div className="animate-spin-slow"><Save size={16} /></div> Saving...</>) : hasUnsavedChanges ? (<><Save size={16} /> Save Profile Avatar</>) : (<><Save size={16} /> Save Profile Avatar</>)}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Unsaved Changes Modal */}
      <AnimatePresence>
        {showLeaveModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white rounded-2xl p-6 w-full max-w-[340px] shadow-2xl border border-slate-200 flex flex-col items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center"><AlertTriangle className="text-amber-600" size={24} /></div>
              <button onClick={() => { setShowLeaveModal(false); if (onCancelNavigation) onCancelNavigation(); }} className="absolute top-3 right-3 text-slate-400 hover:text-slate-600"><X size={18} /></button>
              <h3 className="text-lg font-bold text-slate-900 text-center">You've unsaved changes on Avatar Studio</h3>
              <div className="w-full flex flex-col gap-2">
                <button onClick={handleSaveAndLeave} className="w-full py-3 bg-white border-2 border-slate-200 text-slate-900 font-bold rounded-xl hover:bg-slate-50 transition-colors">Save and continue</button>
                <button onClick={handleDiscardAndLeave} className="w-full py-3 bg-slate-100 text-slate-500 font-bold rounded-xl hover:bg-slate-200 transition-colors">Exit anyway</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default AvatarShop;
