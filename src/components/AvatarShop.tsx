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
        <div className="w-full min-h-[180px] flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-900/50 p-5 text-center">
          <Crown size={32} className="text-slate-300 dark:text-slate-700 mb-2 opacity-60" />
          <h3 className="font-bold text-xs sm:text-sm text-slate-600 dark:text-slate-300 mb-0.5">{label} coming soon</h3>
          <p className="text-slate-400 text-[11px] max-w-xs">We're crafting awesome gear for your avatar!</p>
        </div>
      );
    }
    return (
      <div className="grid grid-cols-3 xl:grid-cols-3 gap-1.5 sm:gap-2.5 xl:gap-3.5 pb-2">
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

          return (
            <div
              key={item.id}
              className={`flex flex-col justify-between p-1.5 sm:p-2.5 rounded-xl sm:rounded-2xl border transition-all ${
                isEquipped && !isLocked
                  ? 'bg-blue-50/70 dark:bg-blue-950/20 border-blue-400 dark:border-blue-600 shadow-sm ring-1 ring-blue-400/30'
                  : 'bg-white dark:bg-slate-800/80 border-slate-200/80 dark:border-slate-700/60 hover:border-sky-300 dark:hover:border-sky-600'
              }`}
            >
              {/* Item Thumbnail Frame */}
              <button
                type="button"
                onClick={() => {
                  if (isLocked) return;
                  handleEquip(cat, item.id);
                }}
                disabled={isLocked}
                className={`relative w-full aspect-square rounded-lg sm:rounded-xl transition-all flex items-center justify-center group overflow-hidden ${
                  isPreviewing
                    ? 'bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30'
                    : isEquipped && !isLocked
                      ? 'bg-white dark:bg-slate-800'
                      : isLocked && !isExclusive
                        ? 'bg-slate-100 dark:bg-slate-900/60 opacity-60 cursor-not-allowed'
                        : canPreview
                          ? 'bg-slate-50 dark:bg-slate-800/40 opacity-75 cursor-default'
                          : 'bg-slate-50/80 dark:bg-slate-900/40 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {/* Status Badges */}
                {isPreviewing && (
                  <div className="absolute top-1 left-1/2 -translate-x-1/2 px-1.5 py-0.2 bg-gradient-to-r from-amber-500 to-orange-400 text-white text-[8px] font-black rounded-full flex items-center gap-0.5 z-10 whitespace-nowrap shadow-sm">
                    Preview <Star size={7} className="fill-white" />
                  </div>
                )}
                {isEquipped && !isLocked && !isPreviewing && (
                  <div className="absolute top-1 left-1/2 -translate-x-1/2 px-1.5 py-0.2 bg-gradient-to-r from-blue-600 to-sky-500 text-white text-[8px] font-black rounded-full flex items-center gap-0.5 z-10 whitespace-nowrap shadow-sm">
                    Equipped <Sparkles size={7} className="fill-white" />
                  </div>
                )}
                {isLocked && !isExclusive && (
                  <div className="absolute inset-0 bg-black/25 dark:bg-black/40 z-20 flex items-center justify-center rounded-lg sm:rounded-xl backdrop-blur-[0.5px]">
                    <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-black/50 flex items-center justify-center text-white shadow-md">
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

              {/* Title & Action */}
              <div className="mt-1 flex flex-col gap-0.5 sm:gap-1">
                <p className="text-[10px] sm:text-xs font-bold text-slate-700 dark:text-slate-200 text-center truncate px-0.5">
                  {item.name}
                </p>

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
                        ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                        : 'bg-amber-50 hover:bg-amber-100 text-amber-600 border-amber-300 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800 cursor-pointer'
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
                        ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                        : 'bg-amber-50 hover:bg-amber-100 text-amber-600 border-amber-300 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800 cursor-pointer'
                    }`}
                  >
                    <Star size={10} /> Preview Set
                  </button>
                )}
              </div>
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
      className={`relative w-full bg-[#0a0f1d] overflow-hidden flex flex-col justify-between border-4 border-slate-800 shadow-[0_20px_50px_rgba(15,20,34,0.3)] ${
        isDesktop
          ? 'h-[380px] xl:h-[430px] rounded-[2rem]'
          : 'h-[36vh] min-h-[240px] max-h-[300px] border-b border-t-0 border-x-0'
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
          DESKTOP & LAPTOP VIEW (xl screens and wider)
          Faithful to original desktop structure, with the new Cyber-Podium & Spotlight
         ══════════════════════════════════════════════════════════════ */}
      <div className="hidden xl:flex h-full w-full items-center justify-center p-4 lg:p-6 overflow-hidden">
        <div className="relative w-full max-w-6xl h-[80vh] max-h-[740px] rounded-[2rem] p-6 lg:p-7 bg-gradient-to-br from-white via-sky-50/30 to-white border border-slate-200/80 shadow-[0_8px_30px_rgb(0,0,0,0.05)] flex flex-row gap-8 overflow-hidden">
          {/* Subtle ambient blur accents */}
          <div className="absolute inset-0 overflow-hidden rounded-[2rem] pointer-events-none">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-sky-400/40 to-transparent" />
            <div className="absolute -top-36 -right-36 w-88 h-88 bg-blue-100/40 rounded-full blur-3xl" />
            <div className="absolute -bottom-36 -left-36 w-88 h-88 bg-purple-100/30 rounded-full blur-3xl" />
          </div>

          {/* Left Column: Item Grid & Controls */}
          <div className="flex flex-col h-full min-h-0 relative z-10 flex-1 max-w-[620px]">
            {/* Header: Name left, XP & Reset right */}
            <div className="mb-4 flex items-center justify-between shrink-0">
              <div>
                <h2 className="text-2xl font-display font-bold text-[#0a1628] tracking-tight truncate">
                  {studentDisplayName}
                </h2>
                <p className="text-sm text-slate-400 font-medium">Customize your avatar's look here!</p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {isDevMode && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={handleResetForTesting}
                        disabled={purchasingItemId === 'resetting'}
                        className="flex items-center justify-center bg-slate-100 hover:bg-red-50 text-slate-500 hover:text-red-500 p-2 rounded-lg transition-colors border border-slate-200 cursor-pointer"
                      >
                        <RotateCcw size={14} />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="bg-slate-900 text-white border border-slate-700">
                      Reset (Test)
                    </TooltipContent>
                  </Tooltip>
                )}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={onNavigateToModules}
                      className="bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg px-2.5 py-1 shadow-sm flex items-center gap-1.5 cursor-pointer hover:opacity-90 active:scale-95 transition-all"
                    >
                      <ShoppingBag className="text-white shrink-0" size={13} />
                      <span className="text-white text-sm font-black">{currentXP} XP</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="bg-slate-900 text-white border border-slate-700">
                    Earn more XP from lessons!
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>

            <Tabs.Root
              value={activeCategory}
              onValueChange={v => setActiveCategory(memberOf(TAB_CATEGORIES, v, 'top'))}
              className="flex flex-col flex-1 min-h-0"
            >
              {/* Category Pill Bar */}
              <Tabs.List className="flex flex-nowrap shrink-0 justify-start space-x-1.5 mb-3.5 bg-white shadow-sm p-1 rounded-full border border-slate-100 w-fit overflow-x-auto max-w-full scrollbar-hide">
                {categories.map(cat => (
                  <Tabs.Trigger
                    key={cat.id}
                    value={cat.id}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full font-bold text-[13px] transition-all outline-none whitespace-nowrap cursor-pointer ${
                      cat.id === 'exclusive'
                        ? 'data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-500 data-[state=active]:text-white [&_svg]:data-[state=active]:text-white text-amber-600'
                        : 'data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-sky-500 data-[state=active]:text-white text-slate-500'
                    }`}
                  >
                    {cat.icon}
                    {cat.label}
                  </Tabs.Trigger>
                ))}
              </Tabs.List>

              {/* Scrollable Item Grid */}
              <div className="flex-1 overflow-y-auto min-h-0 pb-4 scrollbar-hide px-2 -mx-2">
                {categories.map(cat => (
                  <Tabs.Content key={cat.id} value={cat.id} className="outline-none h-full">
                    {renderItemGrid(cat.id)}
                  </Tabs.Content>
                ))}
              </div>
            </Tabs.Root>
          </div>

          {/* Right Column: Avatar Preview with Cyber-Podium & Save Button */}
          <div className="flex flex-col gap-3 relative z-10 w-[350px] shrink-0 self-center">
            {renderAvatarShowcase(true)}

            {/* Desktop Save Button */}
            <div className="h-[48px]">
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving || !hasUnsavedChanges || isPreviewActive}
                className={`w-full h-full rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  hasUnsavedChanges
                    ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-500 text-white shadow-lg shadow-blue-500/30 hover:brightness-105 active:scale-[0.98]'
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                }`}
              >
                {isSaving ? (
                  <>
                    <div className="animate-spin-slow">
                      <Save size={16} />
                    </div>
                    <span>Saving...</span>
                  </>
                ) : hasUnsavedChanges ? (
                  <>
                    <Save size={16} />
                    <span>Save Profile Avatar</span>
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    <span>Save Profile Avatar</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          MOBILE & TABLET VIEW (< xl screens)
          Split-screen layout with compact items and active-tab-label-expand
         ══════════════════════════════════════════════════════════════ */}
      <div className="xl:hidden h-full w-full flex flex-col overflow-hidden bg-slate-950">
        {/* Top Pinned Avatar Stage */}
        {renderAvatarShowcase(false)}

        {/* Bottom Wardrobe Drawer */}
        <div className="flex-1 min-h-0 bg-white dark:bg-slate-900 rounded-t-[1.75rem] border-t border-slate-200/90 dark:border-slate-800 shadow-[0_-8px_30px_rgba(0,0,0,0.15)] flex flex-col relative z-20 overflow-hidden">
          {/* Tactile Drag Handle */}
          <div className="w-full pt-2 pb-1 flex justify-center shrink-0">
            <div className="w-10 h-1 bg-slate-300 dark:bg-slate-700 rounded-full" />
          </div>

          <Tabs.Root
            value={activeCategory}
            onValueChange={v => setActiveCategory(memberOf(TAB_CATEGORIES, v, 'top'))}
            className="flex-1 min-h-0 flex flex-col"
          >
            {/* Sticky Category Bar: Active tab expands its label dynamically! */}
            <div className="px-2.5 sm:px-4 py-1.5 shrink-0 border-b border-slate-100 dark:border-slate-800/80 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md z-10">
              <Tabs.List className="flex items-center gap-1 sm:gap-2 overflow-x-auto scrollbar-hide py-1">
                {categories.map(cat => {
                  const isActive = activeCategory === cat.id;
                  return (
                    <Tabs.Trigger
                      key={cat.id}
                      value={cat.id}
                      className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs transition-all outline-none whitespace-nowrap min-h-[36px] cursor-pointer ${
                        isActive
                          ? cat.id === 'exclusive'
                            ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-sm shadow-amber-500/30 scale-[1.02]'
                            : 'bg-gradient-to-r from-blue-600 to-sky-500 text-white shadow-sm shadow-blue-500/30 scale-[1.02]'
                          : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
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

            {/* Scrollable Compact Items Grid */}
            <div className="flex-1 overflow-y-auto min-h-0 px-2.5 sm:px-4 py-2 scrollbar-hide">
              {categories.map(cat => (
                <Tabs.Content key={cat.id} value={cat.id} className="outline-none h-full">
                  {renderItemGrid(cat.id)}
                </Tabs.Content>
              ))}
            </div>
          </Tabs.Root>

          {/* Sticky Bottom Save Action Bar */}
          <div className="p-2.5 sm:p-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-100 dark:border-slate-800 shrink-0">
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving || !hasUnsavedChanges || isPreviewActive}
              className={`w-full h-11 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                hasUnsavedChanges
                  ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-500 text-white shadow-md shadow-blue-500/30 hover:brightness-105 active:scale-[0.99]'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed'
              }`}
            >
              {isSaving ? (
                <>
                  <div className="animate-spin-slow">
                    <Save size={15} />
                  </div>
                  <span>Saving Avatar...</span>
                </>
              ) : hasUnsavedChanges ? (
                <>
                  <Sparkles size={15} className="fill-white" />
                  <span>Save Changes to Avatar</span>
                </>
              ) : (
                <>
                  <Save size={15} />
                  <span>Avatar Saved</span>
                </>
              )}
            </button>
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
