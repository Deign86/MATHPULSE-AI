import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import * as Tabs from '@radix-ui/react-tabs';
import { Save, Sparkles, Shirt, Scissors, Footprints, Crown, Lock, ShoppingBag, RotateCcw, Star, AlertTriangle, X, Dices, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { updateUserProfile } from '../services/authService';
import { purchaseAvatarItem, resetAvatarPurchasesForTesting } from '../services/gamificationService';
import { useFeatureAccess } from '../hooks/useFeatureAccess';
import { Tooltip, TooltipTrigger, TooltipContent } from './ui/tooltip';
import CompositeAvatar, { AvatarLayers } from './CompositeAvatar';
import { MOCK_INVENTORY, EXCLUSIVE_DISPLAY_ITEMS } from '../data/avatarData';
import { StudentProfile } from '../types/models';
import { memberOf } from '../utils/memberOf';

export function isString<T>(value: T): value is T & string {
  return typeof value === 'string';
}

const shopAnimations = `
  @keyframes avatar-float { 0%, 100% { transform: translateY(-6px); } 50% { transform: translateY(6px); } }
  @keyframes spin-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  @keyframes math-drift-1 { 0%, 100% { transform: translateY(0px) rotate(0deg); opacity: 0.16; } 50% { transform: translateY(-10px) rotate(6deg); opacity: 0.38; } }
  @keyframes math-drift-2 { 0%, 100% { transform: translateY(0px) rotate(0deg); opacity: 0.14; } 50% { transform: translateY(-13px) rotate(-8deg); opacity: 0.35; } }
  @keyframes beam-pulse { 0%, 100% { opacity: 0.85; } 50% { opacity: 1; } }
  .animate-avatar-float { animation: avatar-float 3.5s ease-in-out infinite; }
  .animate-spin-slow { animation: spin-slow 1s linear infinite; }
  .animate-math-1 { animation: math-drift-1 5s ease-in-out infinite; }
  .animate-math-2 { animation: math-drift-2 6.5s ease-in-out infinite; }
  .animate-beam-pulse { animation: beam-pulse 4s ease-in-out infinite; }
`;

interface AvatarShopProps {
  onSaveProfile?: (layers: AvatarLayers) => void;
  onNavigateToModules?: () => void;
  unsavedChangesRef?: React.MutableRefObject<boolean>;
  onConfirmLeave?: () => void;
  pendingNavigation?: string | null;
  onCancelNavigation?: () => void;
}

const EQUIP_EXPRESSIONS = ['Looking sharp!', 'Cool outfit!', 'I love this!', 'Fresh look!', 'Math ready!', 'Awesome!'];
const ENCOURAGEMENT_PHRASES = [
  'Gain more XP to unlock new gear!',
  'Looking stylish today!',
  "Let's solve some equations!",
  'Try on some fresh outfits!',
  'Level up to get legendary items!',
];
const DEFAULT_TOP_ITEM_ID = 'top_blue';
const AVATAR_SAVE_TIMEOUT_MS = 20_000;

type TabCategory = 'top' | 'bottom' | 'shoes' | 'accessory' | 'exclusive';

// SAFETY: these literals are the TabCategory members; memberOf narrows untyped tab callbacks onto the union.
const TAB_CATEGORIES = ['top', 'bottom', 'shoes', 'accessory', 'exclusive'] as const;

interface MathGlyphItem {
  symbol: string;
  top: string;
  left?: string;
  right?: string;
  size: string;
  animClass: string;
  delay: string;
}

const FLOATING_GLYPHS: MathGlyphItem[] = [
  { symbol: 'π', top: '12%', left: '8%', size: 'text-xl font-serif', animClass: 'animate-math-1', delay: '0s' },
  { symbol: '∑', top: '20%', right: '10%', size: 'text-2xl font-mono font-bold', animClass: 'animate-math-2', delay: '1s' },
  { symbol: '∫', top: '56%', left: '7%', size: 'text-2xl font-serif', animClass: 'animate-math-2', delay: '2s' },
  { symbol: '√x', top: '64%', right: '9%', size: 'text-sm font-mono font-bold', animClass: 'animate-math-1', delay: '0.8s' },
  { symbol: '∞', top: '32%', left: '16%', size: 'text-lg font-bold', animClass: 'animate-math-1', delay: '1.5s' },
  { symbol: 'Δ', top: '36%', right: '17%', size: 'text-base font-bold', animClass: 'animate-math-2', delay: '2.5s' },
  { symbol: 'f(x)', top: '10%', right: '28%', size: 'text-xs font-mono font-bold', animClass: 'animate-math-1', delay: '3s' },
];

const AvatarShop: React.FC<AvatarShopProps> = ({
  onSaveProfile,
  onNavigateToModules,
  unsavedChangesRef,
  onConfirmLeave,
  pendingNavigation,
  onCancelNavigation,
}) => {
  const { userProfile, refreshProfile, currentUser } = useAuth();
  const { cosmeticShop: shopAccess, loading: featureAccessLoading } = useFeatureAccess(currentUser?.uid || null);
  const isDevMode = import.meta.env.DEV;

  const [equipped, setEquipped] = useState<AvatarLayers>({
    top: userProfile?.avatarLayers?.top ?? DEFAULT_TOP_ITEM_ID,
    bottom: userProfile?.avatarLayers?.bottom || '',
    shoes: userProfile?.avatarLayers?.shoes || '',
    accessory: userProfile?.avatarLayers?.accessory || '',
  });
  const [savedEquipped, setSavedEquipped] = useState<AvatarLayers>({
    top: userProfile?.avatarLayers?.top ?? DEFAULT_TOP_ITEM_ID,
    bottom: userProfile?.avatarLayers?.bottom || '',
    shoes: userProfile?.avatarLayers?.shoes || '',
    accessory: userProfile?.avatarLayers?.accessory || '',
  });
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

  const hasUnsavedChanges = useMemo(
    () =>
      equipped.top !== savedEquipped.top ||
      equipped.bottom !== savedEquipped.bottom ||
      equipped.shoes !== savedEquipped.shoes ||
      equipped.accessory !== savedEquipped.accessory,
    [equipped, savedEquipped]
  );

  const hasExclusivePreview = useMemo(() => {
    const ids = [equipped.top, equipped.bottom, equipped.shoes, equipped.accessory].filter(Boolean);
    return ids.some(id => {
      const item = inventoryItems.find(i => i.id === id);
      return (item?.isExclusive || item?.isReward) && !ownedItems.includes(id!);
    });
  }, [equipped, inventoryItems, ownedItems]);

  // Expose unsaved state to parent
  useEffect(() => {
    if (unsavedChangesRef) unsavedChangesRef.current = hasUnsavedChanges;
  }, [hasUnsavedChanges, unsavedChangesRef]);

  // Show leave modal when parent requests navigation while unsaved
  useEffect(() => {
    if (pendingNavigation && hasUnsavedChanges) setShowLeaveModal(true);
  }, [pendingNavigation, hasUnsavedChanges]);

  useEffect(() => {
    if (userProfile && userProfile.role === 'student') {
      // SAFETY: the role check above proves this profile carries the student avatar/XP fields.
      const studentProfile = userProfile as StudentProfile;
      setOwnedItems(studentProfile.ownedAvatarItems || []);
      setCurrentXP(studentProfile.currentXP || 0);
    }
  }, [userProfile]);

  useEffect(() => {
    const initial: AvatarLayers = {
      top: userProfile?.avatarLayers?.top ?? DEFAULT_TOP_ITEM_ID,
      bottom: userProfile?.avatarLayers?.bottom || '',
      shoes: userProfile?.avatarLayers?.shoes || '',
      accessory: userProfile?.avatarLayers?.accessory || '',
    };
    setEquipped(initial);
    setSavedEquipped(initial);
  }, [userProfile?.uid]);

  useEffect(() => {
    if (!avatarSpeech) {
      const timer = setInterval(() => {
        if (Math.random() > 0.6) setAvatarSpeech(ENCOURAGEMENT_PHRASES[Math.floor(Math.random() * ENCOURAGEMENT_PHRASES.length)]);
      }, 6000);
      return () => clearInterval(timer);
    }
  }, [avatarSpeech]);

  useEffect(() => {
    if (avatarSpeech) {
      const timer = setTimeout(() => setAvatarSpeech(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [avatarSpeech]);

  const handlePreview = (category: keyof AvatarLayers, id: string) => {
    const item = inventoryItems.find(i => i.id === id);
    if (!item) return;
    if (previewTimeoutRef.current) {
      clearTimeout(previewTimeoutRef.current);
      previewTimeoutRef.current = null;
    }
    const restoreTarget = { ...equipped };
    preEquipRef.current = restoreTarget;
    setIsPreviewActive(true);
    isPreviewActiveRef.current = true;

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

    setPreviewCountdown(3);
    const cdi = setInterval(() => {
      setPreviewCountdown(p => {
        if (p <= 1) {
          clearInterval(cdi);
          return 0;
        }
        return p - 1;
      });
    }, 1000);

    previewTimeoutRef.current = setTimeout(() => {
      clearInterval(cdi);
      setEquipped(restoreTarget);
      setPreviewCountdown(0);
      setIsPreviewActive(false);
      isPreviewActiveRef.current = false;
      setAvatarSpeech(null);
      previewTimeoutRef.current = null;
    }, 3000);
  };

  const handleEquip = useCallback(
    (category: keyof AvatarLayers, id: string) => {
      const item = inventoryItems.find(i => i.id === id);
      if (!item) return;
      const isOwned = ownedItems.includes(id);
      const isLocked = Boolean(((item.price && item.price > 0) || item.isReward) && !isOwned);

      if (isPreviewActive && previewTimeoutRef.current) {
        clearTimeout(previewTimeoutRef.current);
        setIsPreviewActive(false);
        isPreviewActiveRef.current = false;
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

      if (isLocked && !item.isExclusive) {
        toast.error('This item is locked. Earn or purchase it first!');
        return;
      }

      let base = { ...equipped };
      const setItems = inventoryItems.filter(i => i.setLayers);
      const allSetPieceIds = new Set(setItems.flatMap(s => Object.values(s.setLayers || {})));
      if (
        allSetPieceIds.has(base.top || '') ||
        allSetPieceIds.has(base.bottom || '') ||
        allSetPieceIds.has(base.shoes || '') ||
        allSetPieceIds.has(base.accessory || '')
      ) {
        if (allSetPieceIds.has(base.top || '')) base.top = savedEquipped.top;
        if (allSetPieceIds.has(base.bottom || '')) base.bottom = savedEquipped.bottom;
        if (allSetPieceIds.has(base.shoes || '')) base.shoes = savedEquipped.shoes;
        if (allSetPieceIds.has(base.accessory || '')) base.accessory = savedEquipped.accessory;
      }
      const nextEquipped: AvatarLayers = { ...base, [category]: base[category] === id ? '' : id };
      setEquipped(nextEquipped);
      if (item.isExclusive && !isOwned) {
        setAvatarSpeech('Preview only!');
      } else {
        setAvatarSpeech(EQUIP_EXPRESSIONS[Math.floor(Math.random() * EQUIP_EXPRESSIONS.length)]);
      }
    },
    [equipped, inventoryItems, ownedItems, isPreviewActive, savedEquipped]
  );

  const handleRandomize = useCallback(() => {
    const availableTops = inventoryItems.filter(i => i.category === 'top' && !i.isExclusive && (ownedItems.includes(i.id) || !i.price));
    const availableBottoms = inventoryItems.filter(i => i.category === 'bottom' && !i.isExclusive && (ownedItems.includes(i.id) || !i.price));
    const availableShoes = inventoryItems.filter(i => i.category === 'shoes' && !i.isExclusive && (ownedItems.includes(i.id) || !i.price));
    const availableAccessories = inventoryItems.filter(i => i.category === 'accessory' && !i.isExclusive && (ownedItems.includes(i.id) || !i.price));

    const pickRandom = (items: typeof inventoryItems) => (items.length > 0 ? items[Math.floor(Math.random() * items.length)].id : '');

    const next: AvatarLayers = {
      top: pickRandom(availableTops) || DEFAULT_TOP_ITEM_ID,
      bottom: pickRandom(availableBottoms),
      shoes: pickRandom(availableShoes),
      accessory: Math.random() > 0.35 ? pickRandom(availableAccessories) : '',
    };
    setEquipped(next);
    setAvatarSpeech('Surprise look! ✨');
  }, [inventoryItems, ownedItems]);

  const handlePurchaseItem = async (e: React.MouseEvent, itemId: string, price: number) => {
    e.stopPropagation();
    if (!userProfile?.uid) {
      toast.error('You must be logged in');
      return;
    }
    if (ownedItems.includes(itemId)) {
      toast.info('You already own this item');
      return;
    }
    setPurchasingItemId(itemId);
    try {
      const result = await purchaseAvatarItem(userProfile.uid, itemId, price);
      if (result.success) {
        toast.success(result.message || 'Item purchased!');
        setOwnedItems(prev => [...prev, itemId]);
        if (result.currentXP !== undefined) setCurrentXP(result.currentXP);
        await refreshProfile();
      } else {
        toast.error(result.message || 'Failed to purchase');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error purchasing item');
    } finally {
      setPurchasingItemId(null);
    }
  };

  const handleResetForTesting = async () => {
    if (!isDevMode || !userProfile?.uid || purchasingItemId === 'resetting') return;
    setPurchasingItemId('resetting');
    try {
      const result = await resetAvatarPurchasesForTesting(userProfile.uid);
      if (result.success) {
        setOwnedItems([]);
        const r: AvatarLayers = { top: '', bottom: '', shoes: '', accessory: '' };
        setEquipped(r);
        setSavedEquipped(r);
        if (onSaveProfile) onSaveProfile(r);
        setCurrentXP(result.newXP);
        toast.success(`Reset! XP: ${result.newXP}`);
        await refreshProfile();
      } else {
        toast.error('Failed to reset');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error resetting');
    } finally {
      setPurchasingItemId(null);
    }
  };

  const normalizeAvatarLayers = (layers: AvatarLayers): AvatarLayers => ({
    top: isString(layers.top) ? layers.top : '',
    bottom: isString(layers.bottom) ? layers.bottom : '',
    shoes: isString(layers.shoes) ? layers.shoes : '',
    accessory: isString(layers.accessory) ? layers.accessory : '',
  });

  const withTimeout = <T,>(promise: Promise<T>, ms: number, label: string): Promise<T> => {
    let tid: ReturnType<typeof setTimeout> | undefined;
    const tp = new Promise<never>((_, rej) => {
      tid = setTimeout(() => rej(new Error(`${label} timed out`)), ms);
    });
    return Promise.race([promise, tp]).finally(() => {
      if (tid) clearTimeout(tid);
    });
  };

  const persistAvatarLayers = async (
    layers: AvatarLayers,
    options: { showSuccessToast?: boolean; showSavingState?: boolean } = {}
  ) => {
    const cu = userProfileRef.current;
    if (!cu?.uid) return;
    const { showSuccessToast = true, showSavingState = true } = options;
    if (saveGuardRef.current) {
      pendingSaveRef.current = { layers: normalizeAvatarLayers(layers), options };
      if (showSavingState) setIsSaving(true);
      return;
    }
    saveGuardRef.current = true;
    if (showSavingState) setIsSaving(true);
    try {
      const norm = normalizeAvatarLayers(layers);
      await withTimeout(updateUserProfile(cu.uid, { avatarLayers: norm }), AVATAR_SAVE_TIMEOUT_MS, 'Avatar save');
      if (onSaveProfile) onSaveProfile(norm);
      setSavedEquipped(norm);
      if (showSuccessToast) toast.success('Avatar saved!');
    } catch (err) {
      console.error(err);
      if (showSuccessToast) {
        toast.error(err instanceof Error && err.message.includes('timed out') ? 'Save timed out.' : 'Failed to save');
      }
    } finally {
      const q = pendingSaveRef.current;
      pendingSaveRef.current = null;
      saveGuardRef.current = false;
      if (q) {
        void persistAvatarLayers(q.layers, q.options);
        return;
      }
      if (showSavingState || isSaving) setIsSaving(false);
    }
  };

  const handleSave = async () => {
    if (isPreviewActive) return;
    if (hasExclusivePreview) {
      toast.error('You need to purchase this item first to save it.');
      return;
    }
    await persistAvatarLayers(equipped, { showSuccessToast: true, showSavingState: true });
  };

  const handleSaveAndLeave = async () => {
    setShowLeaveModal(false);
    if (!hasExclusivePreview) {
      await persistAvatarLayers(equipped, { showSuccessToast: true, showSavingState: true });
    }
    if (onConfirmLeave) onConfirmLeave();
  };

  const handleReset = () => {
    setEquipped(savedEquipped);
    toast.info('Reverted to saved avatar.');
  };

  const handleDiscardAndLeave = () => {
    setShowLeaveModal(false);
    setEquipped(savedEquipped);
    if (onConfirmLeave) onConfirmLeave();
  };

  const categories: { id: TabCategory; label: string; icon: React.ReactNode }[] = [
    { id: 'top', label: 'Tops', icon: <Shirt size={16} /> },
    { id: 'bottom', label: 'Bottoms', icon: <Scissors size={16} className="rotate-90" /> },
    { id: 'shoes', label: 'Shoes', icon: <Footprints size={16} /> },
    { id: 'accessory', label: 'Accessories', icon: <Crown size={16} /> },
    {
      id: 'exclusive',
      label: 'Exclusive',
      icon: (
        <Star
          size={16}
          className={activeCategory === 'exclusive' ? 'text-white fill-white' : 'text-amber-500 fill-amber-500'}
        />
      ),
    },
  ];

  if (featureAccessLoading) {
    return (
      <div className="flex flex-col justify-center items-center h-full min-h-[360px] gap-3">
        <div className="animate-spin text-blue-500">
          <Save size={24} className="opacity-50" />
        </div>
        <p className="text-sm text-slate-400 font-medium">Loading Avatar Studio...</p>
      </div>
    );
  }

  if (!shopAccess) {
    return (
      <div className="flex flex-col justify-center items-center h-full min-h-[360px] gap-4 p-4 text-center">
        <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shadow-inner">
          <Lock className="w-7 h-7 text-slate-400" />
        </div>
        <div>
          <p className="text-base font-bold text-slate-700 dark:text-slate-200 mb-1">Avatar Studio Locked</p>
          <p className="text-xs text-slate-400 max-w-xs">This feature is temporarily unavailable.</p>
        </div>
      </div>
    );
  }

  const getItemsForTab = (tabId: TabCategory) => {
    if (tabId === 'exclusive') return EXCLUSIVE_DISPLAY_ITEMS;
    return inventoryItems.filter(i => i.category === tabId && !i.isExclusive);
  };

  const renderItemGrid = (tabId: TabCategory) => {
    const items = getItemsForTab(tabId);
    if (items.length === 0) {
      const label = tabId === 'exclusive' ? 'Exclusive items' : categories.find(c => c.id === tabId)?.label || 'Items';
      return (
        <div className="w-full min-h-[180px] flex flex-col items-center justify-center border-2 border-dashed border-[#d9cab4] rounded-2xl bg-[#faf6f0]/80 p-5 text-center shadow-sm">
          <Crown size={32} className="text-amber-500/70 mb-2 opacity-80" />
          <h3 className="font-bold text-xs sm:text-sm text-amber-950 mb-0.5">{label} coming soon</h3>
          <p className="text-amber-800/60 text-[11px] max-w-xs">We&apos;re crafting awesome gear for your wooden wardrobe!</p>
        </div>
      );
    }
    return (
      <div className="grid grid-cols-3 md:grid-cols-2 lg:grid-cols-3 gap-1.5 sm:gap-2 lg:gap-3 pb-2">
        {items.map(item => {
          const cat = item.category;
          // SAFETY: Object.entries on setLayers yields string keys corresponding to AvatarLayers layer names.
          const isEquipped = item.setLayers
            ? Object.entries(item.setLayers).every(([layer, id]) => !id || equipped[layer as keyof AvatarLayers] === id)
            : equipped[cat] === item.id;
          const isOwned = ownedItems.includes(item.id);
          const isExclusive = Boolean(item.isExclusive);
          const isLocked = Boolean(((item.price && item.price > 0) || item.isReward) && !isOwned);
          const canPreview = isExclusive && !isOwned;
          const isPreviewing = isEquipped && canPreview;

          const hasActionButton = Boolean((isLocked && !isExclusive && !item.isReward) || canPreview);

          return (
            <div
              key={item.id}
              className={`flex flex-col h-full p-2 sm:p-2.5 rounded-2xl border transition-all relative overflow-hidden group shadow-sm ${
                isEquipped && !isLocked
                  ? 'bg-gradient-to-b from-[#fbf4ea] via-white to-[#f5ebd9] border-2 border-amber-500 shadow-[0_4px_16px_rgba(245,158,11,0.22)] ring-2 ring-amber-400/40'
                  : 'bg-gradient-to-b from-white via-[#fcfaf7] to-[#f4ece0] border-2 border-[#e3d5c1] hover:border-amber-400/80 hover:shadow-md shadow-[0_2px_8px_rgba(180,150,110,0.08)]'
              }`}
            >
              {/* Shelf Top Warm Downlight Glow */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-amber-300/30 to-transparent pointer-events-none" />

              {/* Item Thumbnail Frame / Wooden Cubby Pedestal */}
              <button
                type="button"
                onClick={() => {
                  if (isLocked) return;
                  handleEquip(cat, item.id);
                }}
                disabled={isLocked}
                className={`relative w-full aspect-square rounded-xl transition-all flex items-center justify-center group overflow-hidden ${
                  isPreviewing
                    ? 'bg-gradient-to-b from-amber-200/40 to-orange-200/20 border border-amber-400/60 shadow-inner'
                    : isEquipped && !isLocked
                      ? 'bg-gradient-to-b from-amber-100/50 to-orange-100/30 border border-amber-400/50 shadow-inner'
                      : isLocked && !isExclusive
                        ? 'bg-amber-900/5 opacity-60 cursor-not-allowed border border-amber-900/10'
                        : canPreview
                          ? 'bg-white/70 opacity-90 cursor-default border border-[#e3d5c1]'
                          : 'bg-[#f5eee3] hover:bg-[#ece2d3] border border-[#ded0bc]'
                }`}
              >
                {/* Status Badges */}
                {isPreviewing && (
                  <div className="absolute top-1 left-1/2 -translate-x-1/2 px-1.5 py-0.2 bg-gradient-to-r from-amber-500 to-orange-400 text-white text-[8px] font-black rounded-full flex items-center gap-0.5 z-10 whitespace-nowrap shadow-sm">
                    Preview <Star size={7} className="fill-white" />
                  </div>
                )}
                {isEquipped && !isLocked && !isPreviewing && (
                  <div className="absolute top-1 left-1/2 -translate-x-1/2 px-1.5 py-0.2 bg-gradient-to-r from-amber-600 to-orange-500 text-white text-[8px] font-black rounded-full flex items-center gap-0.5 z-10 whitespace-nowrap shadow-sm">
                    Equipped <Sparkles size={7} className="fill-white" />
                  </div>
                )}
                {isLocked && !isExclusive && (
                  <div className="absolute inset-0 bg-amber-950/20 z-20 flex items-center justify-center rounded-lg sm:rounded-xl backdrop-blur-[0.5px]">
                    <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-amber-950/60 flex items-center justify-center text-amber-200 shadow-md">
                      <Lock size={13} />
                    </div>
                  </div>
                )}

                <img
                  src={item.thumbnail}
                  alt={item.name}
                  className={`w-[85%] h-[85%] object-contain transition-transform duration-200 ${
                    isLocked && !isExclusive ? 'grayscale-[40%]' : 'group-hover:scale-105'
                  }`}
                />
              </button>

              {/* Title — Crisp high-contrast espresso text directly under thumbnail */}
              <p className="mt-1.5 text-[10px] sm:text-xs font-bold text-amber-950 tracking-wide text-center truncate px-0.5">
                {item.name}
              </p>

              {/* Action Area — Pushed to bottom cleanly when an action button exists */}
              {hasActionButton && (
                <div className="mt-auto pt-1 flex flex-col gap-0.5 sm:gap-1">
                  {isLocked && !isExclusive && !item.isReward && (
                    <button
                      type="button"
                      onClick={e => handlePurchaseItem(e, item.id, item.price || 0)}
                      disabled={purchasingItemId === item.id}
                      className="w-full py-1 sm:py-1.5 px-1 min-h-[28px] sm:min-h-[34px] bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-[10px] sm:text-[11px] font-black flex items-center justify-center gap-0.5 sm:gap-1 rounded-md sm:rounded-lg shadow-sm shadow-orange-500/20 active:scale-95 transition-all disabled:opacity-70 cursor-pointer"
                    >
                      {purchasingItemId === item.id ? (
                        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}>
                          <ShoppingBag size={11} />
                        </motion.div>
                      ) : (
                        <>
                          <Zap size={10} className="fill-white" /> {item.price} XP
                        </>
                      )}
                    </button>
                  )}

                  {canPreview && !item.setLayers && (
                    <button
                      type="button"
                      onClick={() => handlePreview(cat, item.id)}
                      disabled={isPreviewActive}
                      className={`w-full py-1 sm:py-1.5 px-1 min-h-[28px] sm:min-h-[34px] text-[10px] sm:text-[11px] font-bold flex items-center justify-center gap-0.5 sm:gap-1 rounded-md sm:rounded-lg border transition-all active:scale-95 ${
                        isPreviewActive
                          ? 'bg-slate-200 text-slate-400 border-slate-300 cursor-not-allowed'
                          : 'bg-amber-100/80 hover:bg-amber-200/80 text-amber-900 border-amber-300 cursor-pointer shadow-sm'
                      }`}
                    >
                      <Star size={10} /> Preview
                    </button>
                  )}

                  {canPreview && item.setLayers && (
                    <button
                      type="button"
                      onClick={() => handlePreview(cat, item.id)}
                      disabled={isPreviewActive}
                      className={`w-full py-1 sm:py-1.5 px-1 min-h-[28px] sm:min-h-[34px] text-[10px] sm:text-[11px] font-bold flex items-center justify-center gap-0.5 sm:gap-1 rounded-md sm:rounded-lg border transition-all active:scale-95 ${
                        isPreviewActive
                          ? 'bg-slate-200 text-slate-400 border-slate-300 cursor-not-allowed'
                          : 'bg-amber-100/80 hover:bg-amber-200/80 text-amber-900 border-amber-300 cursor-pointer shadow-sm'
                      }`}
                    >
                      <Star size={10} /> Preview Set
                    </button>
                  )}
                </div>
              )}

              {/* Shelf Base Trim / Wooden Oak Ledge */}
              <div className="w-full h-1.5 mt-1.5 rounded-full bg-gradient-to-r from-[#d9cbb6] via-[#eee3d1] to-[#d9cbb6] shadow-sm shrink-0" />
            </div>
          );
        })}
      </div>
    );
  };

  const studentDisplayName = userProfile?.name || 'Student';

  // Shared 3D Quantum Cyber Podium & Spotlight Box
  const renderAvatarShowcase = (isDesktop: boolean) => (
    <div
      className={`relative w-full bg-[#0a0f1d] overflow-hidden flex flex-col justify-between ${
        isDesktop
          ? 'h-full flex-1'
          : 'h-[36vh] min-h-[240px] max-h-[300px] border-b border-sky-950/40'
      }`}
    >
      {/* Background Math Grid Texture */}
      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] opacity-40 pointer-events-none" />

      {/* Floating Math Glyphs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden select-none z-0">
        {FLOATING_GLYPHS.map((glyph, i) => (
          <span
            key={i}
            className={`absolute text-sky-400/25 ${glyph.size} ${glyph.animClass}`}
            style={{
              top: glyph.top,
              left: glyph.left,
              right: glyph.right,
              animationDelay: glyph.delay,
            }}
          >
            {glyph.symbol}
          </span>
        ))}
      </div>

      {/* Volumetric Overhead Spotlight Beam */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[76%] max-w-[320px] h-full pointer-events-none z-0 animate-beam-pulse"
        style={{
          clipPath: 'polygon(30% 0%, 70% 0%, 94% 100%, 6% 100%)',
          background:
            'linear-gradient(to bottom, rgba(56, 189, 248, 0.28) 0%, rgba(59, 130, 246, 0.12) 48%, rgba(10, 15, 29, 0) 100%)',
        }}
      />
      {/* Core Spotlight Beam Highlight */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[44%] max-w-[170px] h-[85%] pointer-events-none z-0 blur-[2px]"
        style={{
          clipPath: 'polygon(38% 0%, 62% 0%, 82% 100%, 18% 100%)',
          background:
            'linear-gradient(to bottom, rgba(255, 255, 255, 0.32) 0%, rgba(186, 230, 253, 0.1) 45%, transparent 100%)',
        }}
      />

      {/* Stage Header Controls */}
      <div className="relative z-30 px-3.5 pt-2.5 flex items-center justify-between shrink-0">
        {!isDesktop ? (
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-sky-500/20 border border-sky-400/30 flex items-center justify-center text-sky-300 shadow-sm shrink-0">
              <Sparkles size={14} className="animate-pulse" />
            </div>
            <div className="min-w-0">
              <h2 className="text-xs sm:text-sm font-bold text-white tracking-tight truncate drop-shadow-sm">
                {studentDisplayName}'s Avatar
              </h2>
              <p className="text-[10px] text-sky-300/70 font-medium leading-none">Avatar Studio</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] font-bold text-sky-300/80 uppercase tracking-wider">Live Preview</span>
          </div>
        )}

        <div className="flex items-center gap-1.5 shrink-0">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={handleRandomize}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-sky-200 hover:text-white border border-white/10 backdrop-blur-sm transition-all active:scale-95 cursor-pointer"
                aria-label="Surprise Outfit"
              >
                <Dices size={15} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="bg-slate-900 text-white border border-slate-700 text-xs">
              Surprise Outfit
            </TooltipContent>
          </Tooltip>

          {!isDesktop && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={onNavigateToModules}
                  className="bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 text-white px-2.5 py-1 rounded-lg text-xs font-black flex items-center gap-1 shadow-md shadow-orange-500/25 active:scale-95 transition-all cursor-pointer"
                >
                  <Zap size={11} className="fill-white" />
                  <span>{currentXP} XP</span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="bg-slate-900 text-white border border-slate-700 text-xs">
                Earn more XP from lessons!
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>

      {/* Avatar Center Stage */}
      <div className="flex-1 relative flex items-center justify-center z-20 min-h-0">
        {/* 3D Cyber Podium Platform */}
        <div className="absolute bottom-1.5 sm:bottom-2 left-1/2 -translate-x-1/2 w-[200px] sm:w-[230px] flex flex-col items-center pointer-events-none z-10">
          {/* Ambient Floor Glow */}
          <div className="absolute -bottom-2 w-[220px] h-[30px] bg-sky-400/25 blur-xl rounded-full" />

          {/* Platform Disc Top */}
          <div className="w-full h-[30px] rounded-[100%] bg-gradient-to-b from-[#2a3859] via-[#1e2942] to-[#121a2d] border-2 border-sky-400/80 shadow-[0_0_22px_rgba(56,189,248,0.5)] flex items-center justify-center relative z-20">
            <div className="w-[84%] h-[18px] rounded-[100%] border border-sky-300/40 bg-sky-500/15" />
          </div>

          {/* Platform Cylinder Base Depth */}
          <div className="w-[98%] h-[16px] -mt-[14px] bg-gradient-to-b from-[#1b253b] via-[#111827] to-[#0a0f1d] rounded-b-[100%] border-x-2 border-b-2 border-sky-500/30 shadow-lg relative z-10" />
        </div>

        {/* Floating Avatar */}
        <div className="relative w-full h-[88%] flex justify-center items-center animate-avatar-float z-20 mb-2">
          <CompositeAvatar layers={equipped} className="w-full h-full absolute inset-0 z-20" />

          <AnimatePresence>
            {avatarSpeech && (
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.85 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.85 }}
                transition={{ duration: 0.25 }}
                className="absolute -top-7 left-1/2 -translate-x-1/2 z-30 bg-white text-slate-800 px-3 py-1 rounded-full shadow-xl border-2 border-sky-300 whitespace-nowrap font-black text-[11px] max-w-[200px] text-center"
              >
                {avatarSpeech}
                <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[5px] border-r-[5px] border-t-[5px] border-l-transparent border-r-transparent border-t-white" />
              </motion.div>
            )}
          </AnimatePresence>

          {isPreviewActive && previewCountdown > 0 && (
            <motion.div
              key={previewCountdown}
              initial={{ scale: 1.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 bg-amber-500 text-white w-9 h-9 rounded-full flex items-center justify-center font-black text-lg shadow-lg border-2 border-amber-300"
            >
              {previewCountdown}
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      <style>{shopAnimations}</style>


      {/* ══════════════════════════════════════════════════════════════
          TABLET, LAPTOP & DESKTOP VIEW (md screens and wider, >= 768px)
          Seamless full-screen dark studio with side-by-side layout:
          Left Smart Wardrobe Closet + Right Live Cyber-Podium Showcase
         ══════════════════════════════════════════════════════════════ */}
      <div className="hidden md:flex h-full w-full bg-[#0a0f1d] overflow-hidden relative select-none">
        {/* Ambient Background Math Grid Texture */}
        <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] opacity-40 pointer-events-none z-0" />

        {/* Floating Math Glyphs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden select-none z-0">
          {FLOATING_GLYPHS.map((glyph, i) => (
            <span
              key={i}
              className={`absolute text-sky-400/20 ${glyph.size} ${glyph.animClass}`}
              style={{
                top: glyph.top,
                left: glyph.left,
                right: glyph.right,
                animationDelay: glyph.delay,
              }}
            >
              {glyph.symbol}
            </span>
          ))}
        </div>

        {/* Outer Flex Container: Left panel (wardrobe) + Right panel (avatar stage) */}
        <div className="relative z-10 w-full h-full flex items-center justify-between p-3 sm:p-4 md:p-4 lg:p-6 xl:p-8 pb-24 md:pb-24 lg:pb-6 xl:pb-8 gap-3 sm:gap-4 md:gap-4 lg:gap-6 xl:gap-8 overflow-hidden">
          {/* Left Column: Warm Scandinavian Light Oak Wooden Closet & Bookshelf Container */}
          <div className="w-[360px] md:w-[380px] lg:w-[460px] xl:w-[520px] 2xl:w-[580px] h-full max-h-[840px] rounded-[2.25rem] bg-gradient-to-b from-[#fcf9f4] via-[#f7f2ea] to-[#eee4d6] border-2 border-[#d9cab4] shadow-[0_25px_60px_rgba(0,0,0,0.5),inset_0_1px_2px_rgba(255,255,255,0.9),inset_0_-2px_4px_rgba(180,155,130,0.25)] flex flex-col overflow-hidden shrink-0 relative">
            {/* Closet Interior Ceiling Canopy & Ambient Warm LED Strip Light */}
            <div className="w-full relative shrink-0">
              <div className="h-1.5 w-full bg-gradient-to-r from-amber-400/20 via-amber-300/85 to-amber-400/20 shadow-[0_0_14px_rgba(245,158,11,0.45)]" />
              <div className="absolute top-1.5 inset-x-0 h-4 bg-gradient-to-b from-amber-300/10 to-transparent pointer-events-none" />
            </div>

            {/* Closet Crown Header: Polished Wooden Nameplate & Status */}
            <div className="px-3.5 py-3 sm:px-5 sm:py-3.5 flex items-center justify-between border-b border-[#dfd2be] bg-[#fbf7f0]/90 backdrop-blur-md shrink-0">
              <div className="min-w-0 pr-1.5 flex-1">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-gradient-to-br from-amber-400/25 to-orange-400/15 border border-amber-500/40 flex items-center justify-center text-amber-800 shadow-sm shrink-0">
                    <Shirt size={15} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <h2 className="text-sm sm:text-base font-display font-black text-amber-950 tracking-tight truncate">
                        {studentDisplayName}&apos;s Closet
                      </h2>
                      <span className="hidden xl:inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-black tracking-wider uppercase bg-amber-100 border border-amber-300 text-amber-800 shrink-0">
                        Wardrobe
                      </span>
                    </div>
                    <p className="text-[10px] sm:text-[11px] text-amber-800/70 font-semibold truncate">Handcrafted Wooden Shelves</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                {isDevMode && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={handleResetForTesting}
                        disabled={purchasingItemId === 'resetting'}
                        className="flex items-center justify-center bg-[#f2e9dc] hover:bg-red-50 text-amber-800 hover:text-red-600 p-2 rounded-xl transition-colors border border-[#d9cab4] cursor-pointer"
                        title="Reset (Dev)"
                      >
                        <RotateCcw size={14} />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="bg-amber-950 text-white border border-amber-800 text-xs">
                      Reset (Test)
                    </TooltipContent>
                  </Tooltip>
                )}

                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={handleRandomize}
                      className="p-2 rounded-xl bg-[#f2e9dc] hover:bg-[#ebe0cf] text-amber-900 border border-[#d9cab4] transition-all active:scale-95 cursor-pointer shadow-sm"
                      aria-label="Surprise Outfit"
                    >
                      <Dices size={16} />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="bg-amber-950 text-white border border-amber-800 text-xs">
                    Surprise Outfit
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={onNavigateToModules}
                      className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md shadow-orange-500/25 active:scale-95 transition-all cursor-pointer"
                    >
                      <Zap className="fill-white" size={13} />
                      <span>{currentXP} XP</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="bg-amber-950 text-white border border-amber-800 text-xs">
                    Earn more XP from lessons!
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>

            {/* Closet Hanging Rod & Category Hangers */}
            <Tabs.Root
              value={activeCategory}
              onValueChange={v => setActiveCategory(memberOf(TAB_CATEGORIES, v, 'top'))}
              className="flex flex-col flex-1 min-h-0"
            >
              {/* Closet Hanging Rail & Hanger Tabs */}
              <div className="px-4 pt-2.5 pb-2 border-b border-[#dfd2be] bg-[#f8f3eb]/95 shrink-0 relative">
                {/* Polished Brass Hanging Rail with brackets */}
                <div className="relative mb-2 flex items-center">
                  {/* Left Wall Bracket */}
                  <div className="w-2.5 h-3.5 rounded-l bg-gradient-to-r from-amber-500 to-amber-700 border border-amber-600/50 shadow-sm shrink-0" />
                  {/* Brass Hanging Rail */}
                  <div className="flex-1 h-2 bg-gradient-to-b from-[#f2ddb3] via-[#fff7e8] to-[#dfba78] shadow-[0_2px_4px_rgba(160,120,70,0.25)] relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/80 to-transparent opacity-90" />
                  </div>
                  {/* Right Wall Bracket */}
                  <div className="w-2.5 h-3.5 rounded-r bg-gradient-to-l from-amber-500 to-amber-700 border border-amber-600/50 shadow-sm shrink-0" />
                </div>

                {/* Hanger-style Tabs */}
                <Tabs.List className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide py-0.5">
                  {categories.map(cat => {
                    const isActive = activeCategory === cat.id;
                    return (
                      <Tabs.Trigger
                        key={cat.id}
                        value={cat.id}
                        className={`relative flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all outline-none whitespace-nowrap min-h-[34px] cursor-pointer ${
                          isActive
                            ? cat.id === 'exclusive'
                              ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/30 scale-[1.02] border border-amber-400 ring-1 ring-amber-400/40'
                              : 'bg-gradient-to-r from-amber-600 via-amber-700 to-orange-600 text-white shadow-md shadow-amber-600/30 scale-[1.02] border border-amber-500 ring-1 ring-amber-500/40'
                            : 'text-amber-900/80 hover:text-amber-950 hover:bg-[#ede3d4] border border-transparent'
                        }`}
                      >
                        {cat.icon}
                        <span>{cat.label}</span>
                      </Tabs.Trigger>
                    );
                  })}
                </Tabs.List>
              </div>

              {/* Scrollable Wooden Closet Shelves with textured oak backing */}
              <div className="flex-1 overflow-y-auto min-h-0 p-4 scrollbar-hide bg-[#f6efe5] bg-[radial-gradient(#dfceb7_1.5px,transparent_1.5px)] [background-size:18px_18px] relative shadow-inner">
                {/* Subtle interior vertical divider/shadow */}
                <div className="absolute inset-y-0 left-0 w-3 bg-gradient-to-r from-amber-950/5 to-transparent pointer-events-none" />
                <div className="absolute inset-y-0 right-0 w-3 bg-gradient-to-l from-amber-950/5 to-transparent pointer-events-none" />
                {categories.map(cat => (
                  <Tabs.Content key={cat.id} value={cat.id} className="outline-none h-full">
                    {renderItemGrid(cat.id)}
                  </Tabs.Content>
                ))}
              </div>
            </Tabs.Root>

            {/* Wooden Closet Bottom Drawer / Action Bar */}
            <div className="p-4 bg-gradient-to-b from-[#f4ece0] to-[#e8decb] border-t-2 border-[#d9cab4] shadow-[0_-4px_16px_rgba(0,0,0,0.06)] shrink-0 relative">
              {/* Polished Brass Drawer Pull Bar Trim */}
              <div className="w-full flex justify-center mb-2.5">
                <div className="w-16 h-1.5 rounded-full bg-gradient-to-r from-amber-400 via-amber-200 to-amber-400 shadow-[0_1px_3px_rgba(180,120,50,0.35)]" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={handleReset}
                  disabled={!hasUnsavedChanges || isSaving}
                  className="h-11 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 border border-[#d9cab4] bg-[#faf6f0] text-amber-950 hover:bg-[#f0e6d6] transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] shadow-sm"
                  title="Revert all unsaved changes"
                >
                  <RotateCcw size={15} />
                  <span>RESET AVATAR</span>
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving || !hasUnsavedChanges || isPreviewActive}
                  className={`h-11 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] ${
                    hasUnsavedChanges && !isPreviewActive
                      ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-500 text-white shadow-lg shadow-blue-500/30 hover:brightness-105 border border-blue-400/30'
                      : 'bg-[#e2d6c3] text-amber-950/40 border border-[#d4c5af]'
                  }`}
                >
                  {isSaving ? (
                    <>
                      <div className="animate-spin-slow">
                        <Save size={15} />
                      </div>
                      <span>SAVING...</span>
                    </>
                  ) : (
                    <>
                      <Save size={15} />
                      <span>SAVE CHANGES</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Full-Stage Cyber-Podium Live Avatar Showcase */}
          <div className="flex-1 h-full max-h-[820px] relative flex flex-col justify-between rounded-3xl overflow-hidden border border-sky-500/20 bg-[#0a0f1d]/60 backdrop-blur-sm shadow-2xl">
            {/* Top Right Live Preview Indicator */}
            <div className="p-5 flex items-center justify-between z-30 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]" />
                <span className="text-xs font-bold text-sky-300/90 uppercase tracking-wider">Live Hologram Stage</span>
              </div>
            </div>

            {/* Volumetric Spotlight Beams */}
            <div
              className="absolute top-0 left-1/2 -translate-x-1/2 w-[80%] max-w-[460px] h-full pointer-events-none z-0 animate-beam-pulse"
              style={{
                clipPath: 'polygon(30% 0%, 70% 0%, 94% 100%, 6% 100%)',
                background:
                  'linear-gradient(to bottom, rgba(56, 189, 248, 0.32) 0%, rgba(59, 130, 246, 0.14) 48%, rgba(10, 15, 29, 0) 100%)',
              }}
            />
            <div
              className="absolute top-0 left-1/2 -translate-x-1/2 w-[50%] max-w-[240px] h-[85%] pointer-events-none z-0 blur-[2px]"
              style={{
                clipPath: 'polygon(38% 0%, 62% 0%, 82% 100%, 18% 100%)',
                background:
                  'linear-gradient(to bottom, rgba(255, 255, 255, 0.36) 0%, rgba(186, 230, 253, 0.12) 45%, transparent 100%)',
              }}
            />

            {/* Avatar Center Stage */}
            <div className="flex-1 relative flex items-center justify-center z-20 min-h-0">
              {/* 3D Cyber Podium Platform */}
              <div className="absolute bottom-4 md:bottom-6 left-1/2 -translate-x-1/2 w-[220px] md:w-[250px] lg:w-[280px] 2xl:w-[320px] flex flex-col items-center pointer-events-none z-10">
                {/* Ambient Floor Glow */}
                <div className="absolute -bottom-3 w-[240px] md:w-[270px] lg:w-[300px] h-[40px] bg-sky-400/30 blur-2xl rounded-full" />

                {/* Platform Disc Top */}
                <div className="w-full h-[32px] md:h-[36px] lg:h-[40px] rounded-[100%] bg-gradient-to-b from-[#2a3859] via-[#1e2942] to-[#121a2d] border-2 border-sky-400/80 shadow-[0_0_30px_rgba(56,189,248,0.5)] flex items-center justify-center relative z-20">
                  <div className="w-[84%] h-[20px] md:h-[22px] lg:h-[24px] rounded-[100%] border border-sky-300/40 bg-sky-500/20" />
                </div>

                {/* Platform Cylinder Base Depth */}
                <div className="w-[98%] h-[16px] md:h-[18px] lg:h-[20px] -mt-[14px] md:-mt-[16px] lg:-mt-[18px] bg-gradient-to-b from-[#1b253b] via-[#111827] to-[#0a0f1d] rounded-b-[100%] border-x-2 border-b-2 border-sky-500/30 shadow-lg relative z-10" />
              </div>

              {/* Floating Avatar */}
              <div className="relative w-full h-[85%] max-h-[500px] flex justify-center items-center animate-avatar-float z-20 mb-6 md:mb-10">
                <CompositeAvatar layers={equipped} className="w-full h-full absolute inset-0 z-20 scale-[1.05] md:scale-[1.14] lg:scale-[1.2] 2xl:scale-[1.3] origin-center" />

                <AnimatePresence>
                  {avatarSpeech && (
                    <motion.div
                      initial={{ opacity: 0, y: -10, scale: 0.85 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.85 }}
                      transition={{ duration: 0.25 }}
                      className="absolute -top-10 left-1/2 -translate-x-1/2 z-30 bg-white text-slate-800 px-4 py-1.5 rounded-full shadow-xl border-2 border-sky-300 whitespace-nowrap font-black text-xs max-w-[240px] text-center"
                    >
                      {avatarSpeech}
                      <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-l-transparent border-r-transparent border-t-white" />
                    </motion.div>
                  )}
                </AnimatePresence>

                {isPreviewActive && previewCountdown > 0 && (
                  <motion.div
                    key={previewCountdown}
                    initial={{ scale: 1.4, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 bg-amber-500 text-white w-10 h-10 rounded-full flex items-center justify-center font-black text-lg shadow-lg border-2 border-amber-300"
                  >
                    {previewCountdown}
                  </motion.div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          MOBILE VIEW (< md screens, < 768px)
          Compact top dark stage with bottom slide-out wardrobe chest drawer
         ══════════════════════════════════════════════════════════════ */}
      <div className="md:hidden h-full w-full flex flex-col overflow-hidden bg-[#0a0f1d] p-0">
        {/* Top Pinned Avatar Stage */}
        {renderAvatarShowcase(false)}

        {/* Bottom Wardrobe Closet Chest Drawer */}
        <div className="flex-1 min-h-0 bg-gradient-to-b from-[#fcf9f4] via-[#f7f2ea] to-[#eee4d6] rounded-t-[2rem] border-t-2 border-[#d9cab4] shadow-[0_-12px_40px_rgba(0,0,0,0.3)] flex flex-col relative z-20 overflow-hidden">
          {/* Polished Brass Closet Drawer Pull Bar */}
          <div className="w-full pt-2.5 pb-1 flex justify-center shrink-0">
            <div className="w-14 h-1.5 bg-gradient-to-r from-amber-400 via-amber-200 to-amber-400 rounded-full shadow-[0_1px_3px_rgba(180,120,50,0.35)]" />
          </div>

          {/* Ambient warm light strip beneath handle */}
          <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-amber-400/40 to-transparent mb-1" />

          <Tabs.Root
            value={activeCategory}
            onValueChange={v => setActiveCategory(memberOf(TAB_CATEGORIES, v, 'top'))}
            className="flex-1 min-h-0 flex flex-col"
          >
            {/* Sticky Category Bar: Brass hanging rail and hanger tabs */}
            <div className="px-2.5 sm:px-4 pt-1 pb-1.5 shrink-0 border-b border-[#dfd2be] bg-[#f8f3eb]/95 backdrop-blur-md z-10">
              {/* Mini brass hanging rail */}
              <div className="flex items-center mb-1.5">
                <div className="w-2 h-2.5 rounded-l bg-amber-600 shrink-0" />
                <div className="flex-1 h-1.5 bg-gradient-to-b from-[#f2ddb3] via-[#fff7e8] to-[#dfba78] shadow-sm" />
                <div className="w-2 h-2.5 rounded-r bg-amber-600 shrink-0" />
              </div>

              <Tabs.List className="flex items-center gap-1 sm:gap-2 overflow-x-auto scrollbar-hide py-0.5">
                {categories.map(cat => {
                  const isActive = activeCategory === cat.id;
                  return (
                    <Tabs.Trigger
                      key={cat.id}
                      value={cat.id}
                      className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs transition-all outline-none whitespace-nowrap min-h-[34px] cursor-pointer ${
                        isActive
                          ? cat.id === 'exclusive'
                            ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-sm shadow-amber-500/30 scale-[1.02] border border-amber-400'
                            : 'bg-gradient-to-r from-amber-600 via-amber-700 to-orange-600 text-white shadow-sm shadow-amber-600/30 scale-[1.02] border border-amber-500'
                          : 'text-amber-900/80 hover:text-amber-950 hover:bg-[#ede3d4]'
                      }`}
                    >
                      {cat.icon}
                      {/* Active tab expands label on mobile; on sm+ always visible */}
                      <span className={isActive ? 'inline' : 'hidden sm:inline'}>
                        {cat.label}
                      </span>
                    </Tabs.Trigger>
                  );
                })}
              </Tabs.List>
            </div>

            {/* Scrollable Wooden Closet Shelves with textured oak backing */}
            <div className="flex-1 overflow-y-auto min-h-0 px-2.5 sm:px-4 py-2 scrollbar-hide bg-[#f6efe5] bg-[radial-gradient(#dfceb7_1.5px,transparent_1.5px)] [background-size:18px_18px]">
              {categories.map(cat => (
                <Tabs.Content key={cat.id} value={cat.id} className="outline-none h-full">
                  {renderItemGrid(cat.id)}
                </Tabs.Content>
              ))}
            </div>
          </Tabs.Root>

          {/* Sticky Bottom Wooden Action Bar — Elevated above mobile bottom navigation bar */}
          <div className="pt-2.5 px-3 pb-20 sm:pb-24 lg:pb-3.5 bg-gradient-to-b from-[#f4ece0] to-[#e8decb] border-t-2 border-[#d9cab4] shrink-0">
            <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
              <button
                type="button"
                onClick={handleReset}
                disabled={!hasUnsavedChanges || isSaving}
                className="h-11 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 border border-[#d9cab4] bg-[#faf6f0] text-amber-950 hover:bg-[#f0e6d6] transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] shadow-sm"
                title="Revert all unsaved changes"
              >
                <RotateCcw size={14} />
                <span>RESET AVATAR</span>
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving || !hasUnsavedChanges || isPreviewActive}
                className={`h-11 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] ${
                  hasUnsavedChanges && !isPreviewActive
                    ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-500 text-white shadow-md shadow-blue-500/25 hover:brightness-105 border border-blue-400/30'
                    : 'bg-[#e2d6c3] text-amber-950/40 border border-[#d4c5af]'
                }`}
              >
                {isSaving ? (
                  <>
                    <div className="animate-spin-slow">
                      <Save size={15} />
                    </div>
                    <span>SAVING...</span>
                  </>
                ) : (
                  <>
                    <Save size={15} />
                    <span>SAVE CHANGES</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Unsaved Changes Confirmation Modal */}
      <AnimatePresence>
        {showLeaveModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-[340px] shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col items-center gap-4 relative"
            >
              <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-950/40 flex items-center justify-center text-amber-600 dark:text-amber-400">
                <AlertTriangle size={24} />
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowLeaveModal(false);
                  if (onCancelNavigation) onCancelNavigation();
                }}
                className="absolute top-3 right-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X size={18} />
              </button>
              <h3 className="text-base font-bold text-slate-900 dark:text-white text-center leading-snug">
                You have unsaved changes in Avatar Studio
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 text-center -mt-2">
                Would you like to save your new outfit before leaving?
              </p>
              <div className="w-full flex flex-col gap-2">
                <button
                  type="button"
                  onClick={handleSaveAndLeave}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-md transition-colors cursor-pointer text-xs"
                >
                  Save and continue
                </button>
                <button
                  type="button"
                  onClick={handleDiscardAndLeave}
                  className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold rounded-xl transition-colors cursor-pointer text-xs"
                >
                  Exit anyway
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default AvatarShop;
