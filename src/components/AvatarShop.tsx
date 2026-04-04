import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import * as Tabs from '@radix-ui/react-tabs';
import { Save, Sparkles, Shirt, Scissors, Footprints, Crown, Lock, ShoppingBag } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { updateUserProfile } from '../services/authService';
import { purchaseAvatarItem, resetAvatarPurchasesForTesting } from '../services/gamificationService';
import { Tooltip, TooltipTrigger, TooltipContent } from './ui/tooltip';
import CompositeAvatar, { AvatarLayers } from './CompositeAvatar';
import { MOCK_INVENTORY, AvatarCategory } from '../data/avatarData';
import { StudentProfile } from '../types/models';

interface AvatarShopProps {
  onSaveProfile?: (layers: AvatarLayers) => void;
  onNavigateToModules?: () => void;
}

const AvatarShop: React.FC<AvatarShopProps> = ({ onSaveProfile, onNavigateToModules }) => {
  const { userProfile, refreshProfile } = useAuth();

  const [equipped, setEquipped] = useState<AvatarLayers>({
    top: userProfile?.avatarLayers?.top || 'top_pink',
    bottom: userProfile?.avatarLayers?.bottom || '',
    shoes: userProfile?.avatarLayers?.shoes || '',
    accessory: userProfile?.avatarLayers?.accessory || '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [ownedItems, setOwnedItems] = useState<string[]>([]);
  const [currentXP, setCurrentXP] = useState(0);
  const [purchasingItemId, setPurchasingItemId] = useState<string | null>(null);
  const [avatarSpeech, setAvatarSpeech] = useState<string | null>(null);

  const equipExpressions = ['Wow!', 'Cute!', 'I love it!', 'Perfect!', 'So cool!', 'Awesome!'];
  const encouragementPhrases = [
    'Gain more XP to buy me more clothes!',
    'Help me get stylish!',
    'Let\'s earn some XP to unlock more!',
    'I\'d love to try on more outfits!',
    'Keep learning to unlock new looks!',
  ];

  useEffect(() => {
    if (userProfile && userProfile.role === 'student') {
      const studentProfile = userProfile as StudentProfile;
      setOwnedItems(studentProfile.ownedAvatarItems || []);
      setCurrentXP(studentProfile.currentXP || 0);
    }
  }, [userProfile]);

  useEffect(() => {
    if (!avatarSpeech) {
      const timer = setInterval(() => {
        if (Math.random() > 0.6) {
          setAvatarSpeech(encouragementPhrases[Math.floor(Math.random() * encouragementPhrases.length)]);
        }
      }, 4000);
      return () => clearInterval(timer);
    }
  }, [avatarSpeech, encouragementPhrases]);

  useEffect(() => {
    if (avatarSpeech) {
      const timer = setTimeout(() => {
        setAvatarSpeech(null);
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [avatarSpeech]);

  const handleEquip = (category: keyof AvatarLayers, id: string) => {
    const item = MOCK_INVENTORY.find(i => i.id === id);
    if (item && item.price && item.price > 0 && !ownedItems.includes(id)) {
      toast.error('This item is locked. Purchase it first!');
      return;
    }

    setEquipped(prev => ({
      ...prev,
      [category]: prev[category] === id ? '' : id
    }));

    // Show positive expression on equip
    setAvatarSpeech(equipExpressions[Math.floor(Math.random() * equipExpressions.length)]);
  };

  const handlePurchaseItem = async (e: React.MouseEvent, itemId: string, price: number) => {
    e.stopPropagation();
    
    if (!userProfile?.uid) {
      toast.error('You must be logged in to purchase items');
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
        if (result.currentXP !== undefined) {
          setCurrentXP(result.currentXP);
        }
        await refreshProfile();
      } else {
        toast.error(result.message || 'Failed to purchase item');
      }
    } catch (err) {
      console.error('Purchase error:', err);
      toast.error('Error purchasing item');
    } finally {
      setPurchasingItemId(null);
    }
  };

  const handleResetForTesting = async () => {
    if (!userProfile?.uid) return;
    
    // Disable reset logic if we're currently processing one
    if (purchasingItemId === 'resetting') return;
    
    setPurchasingItemId('resetting');
    try {
      const result = await resetAvatarPurchasesForTesting(userProfile.uid);
      if (result.success) {
        setOwnedItems([]);
        const resetEquipped = {
          top: 'top_pink',
          bottom: '',
          shoes: '',
          accessory: ''
        };
        setEquipped(resetEquipped);
        setCurrentXP(result.newXP);
        toast.success('Purchases reset and XP boosted to 5000! (Test Mode)');
        await refreshProfile();
      } else {
        toast.error('Failed to reset purchases');
      }
    } catch (err) {
      console.error('Reset error:', err);
      toast.error('Error resetting purchases');
    } finally {
      setPurchasingItemId(null);
    }
  };

  const handleSave = async () => {
    if (!userProfile?.uid) return;
    setIsSaving(true);
    try {
      await updateUserProfile(userProfile.uid, { avatarLayers: equipped });
      if (onSaveProfile) {
        onSaveProfile(equipped);
      }
      toast.success('Avatar saved successfully');
      await refreshProfile();
      setIsSaving(false);
    } catch (err) {
      console.error(err);
      setIsSaving(false);
    }
  };

  const categories: { id: keyof AvatarLayers; label: string; icon: React.ReactNode }[] = [
    { id: 'top', label: 'Tops', icon: <Shirt size={16} /> },
    { id: 'bottom', label: 'Bottoms', icon: <Scissors size={16} className="rotate-90" /> },
    { id: 'shoes', label: 'Shoes', icon: <Footprints size={16} /> },
    { id: 'accessory', label: 'Accessories', icon: <Crown size={16} /> },
  ];

  return (
    <div className="h-full w-full flex items-center justify-center p-4 sm:p-6 lg:p-8 overflow-hidden">
      <div className="relative w-full max-w-[1200px] h-[85vh] min-h-[600px] max-h-[850px] rounded-[2rem] p-8 lg:p-12 bg-gradient-to-br from-white via-sky-50/30 to-white border border-slate-200/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col xl:flex-row gap-12">
        
        <div className="absolute inset-0 overflow-hidden rounded-[2rem] pointer-events-none">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-sky-400/30 to-transparent" />
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-100/40 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-100/30 rounded-full blur-3xl" />
        </div>

        <div className="flex flex-col h-full relative z-10 w-full xl:w-7/12 mx-auto xl:mx-0">
          <div className="mb-8 flex flex-col sm:flex-row items-start justify-between gap-6 shrink-0">
            <div className="pr-4">
              <h1 className="text-4xl md:text-5xl font-display font-black text-[#0a1628] tracking-tight flex flex-wrap items-center gap-3">
                <span className="whitespace-nowrap">Avatar Studio</span> <Sparkles className="text-blue-500 fill-blue-500" size={32} />
              </h1>
              <p className="text-slate-500 font-medium text-lg mt-2">Design your perfect learning companion.</p>
            </div>
            <div className="flex items-center gap-4 sm:ml-auto">
              {/* Test Reset Button */}
              <button
                onClick={handleResetForTesting}
                disabled={purchasingItemId === 'resetting'}
                className="hidden sm:flex self-stretch items-center bg-slate-100 hover:bg-red-50 text-slate-500 hover:text-red-500 px-3 py-2 rounded-2xl font-bold text-xs transition-colors border border-slate-200"
              >
                Reset (Test)
              </button>

              <div className="bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl px-4 py-3 shadow-lg flex items-center gap-2 h-fit">
                <ShoppingBag className="text-white" size={20} />
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={onNavigateToModules}
                      className="cursor-pointer hover:opacity-90 transition-opacity active:scale-95"
                    >
                      <p className="text-white text-xs font-bold uppercase tracking-wider">XP Balance</p>
                      <p className="text-white text-2xl font-black">{currentXP}</p>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="bg-slate-900 text-white border border-slate-700">
                    Review more lessons to earn more XP!
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
          </div>

          <Tabs.Root defaultValue="top" className="flex flex-col flex-1 min-h-0">
            <Tabs.List className="flex flex-nowrap shrink-0 justify-start space-x-2 sm:space-x-4 mb-4 sm:mb-8 bg-white shadow-sm p-1.5 rounded-full border border-slate-100 w-fit overflow-x-auto max-w-full scrollbar-hide">
              {categories.map((cat) => (
                <Tabs.Trigger
                  key={cat.id}
                  value={cat.id}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-full font-bold text-sm text-slate-500 hover:bg-slate-50 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-sky-500 data-[state=active]:text-white transition-all shadow-sm outline-none whitespace-nowrap"
                >
                  {cat.icon}
                  {cat.label}
                </Tabs.Trigger>
              ))}
            </Tabs.List>

            <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 pb-6 scrollbar-hide px-2 -mx-2">
              {categories.map(cat => {
                const categoryItems = MOCK_INVENTORY.filter(item => item.category === cat.id);
                
                return (
                  <Tabs.Content key={cat.id} value={cat.id} className="outline-none pt-2 h-full">
                    {categoryItems.length === 0 ? (
                      <div className="w-full h-full min-h-[250px] flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-[2rem] bg-slate-50/50 p-8 text-center">
                        <Crown size={48} className="text-slate-300 mb-4 opacity-50" />
                        <h3 className="font-bold text-xl text-slate-500 mb-2">Accessories coming soon</h3>
                        <p className="text-slate-400 text-sm max-w-xs">We're crafting some awesome gear for your avatar! Check back later.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 lg:grid-cols-3 gap-8">
                        {categoryItems.map(item => {
                          const isEquipped = equipped[cat.id as keyof typeof equipped] === item.id;
                      const isOwned = ownedItems.includes(item.id);
                      const isLocked = Boolean(item.price && item.price > 0 && !isOwned);

                      return (
                        <div key={item.id} className="flex flex-col gap-2">
                          <button
                            onClick={() => !isLocked && handleEquip(cat.id, item.id)}
                            disabled={isLocked}
                            className={`relative w-full aspect-square rounded-[1.5rem] border-[3px] transition-all flex flex-col items-center justify-center group ${
                              isEquipped && !isLocked
                                ? 'bg-white border-blue-500 shadow-md scale-[1.02] z-10'
                                : isLocked
                                ? 'bg-slate-50 border-slate-200 opacity-50 cursor-not-allowed'
                                : 'bg-white border-slate-100 hover:border-sky-300 hover:shadow-lg hover:scale-[1.02] hover:z-10'
                            }`}
                          >
                            {isEquipped && !isLocked && (
                              <div className="absolute top-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-gradient-to-r from-blue-500 to-sky-400 text-white text-[9px] font-black rounded-full flex items-center gap-1 z-10 whitespace-nowrap">
                                Equipped <Sparkles size={9} className="fill-white" />
                              </div>
                            )}
                            
                            {isLocked && (
                              <div className="absolute inset-0 bg-black/20 z-20 flex items-center justify-center rounded-[1.3rem]">
                                <Lock className="text-white" size={24} />
                              </div>
                            )}

                            <img 
                              src={item.thumbnail} 
                              alt={item.name} 
                              className={`w-4/5 h-4/5 object-contain transition-transform ${!isLocked && 'group-hover:scale-110'}`}
                              style={{ filter: isLocked ? 'grayscale(70%)' : 'none' }}
                            />
                          </button>
                          
                          <p className="text-xs font-bold text-slate-700 text-center line-clamp-2">{item.name}</p>
                          
                          {isLocked && (
                            <motion.button
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              onClick={(e) => handlePurchaseItem(e, item.id, item.price || 0)}
                              disabled={purchasingItemId === item.id}
                              className="w-full py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-[10px] font-bold flex items-center justify-center gap-1.5 rounded-lg shadow-md transition-all disabled:opacity-70"
                            >
                              {purchasingItemId === item.id ? (
                                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}>
                                  <ShoppingBag size={11} />
                                </motion.div>
                              ) : (
                                <>
                                  <ShoppingBag size={11} />
                                  {item.price} XP
                                </>
                              )}
                            </motion.button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
                </Tabs.Content>
              );
            })}
            </div>
          </Tabs.Root>
        </div>

        <div className="flex flex-col gap-6 relative z-10 w-full xl:w-[450px] shrink-0 xl:self-center">
          <div className="bg-[#0f1422] rounded-[3rem] overflow-hidden relative shadow-[0_20px_50px_rgba(15,20,34,0.3)] h-[400px] xl:h-[480px] w-full flex items-center justify-center mx-auto border-8 border-slate-800">
            
            <div
              className="absolute top-[-10%] left-0 right-0 h-[110%] pointer-events-none mix-blend-screen opacity-70"
              style={{
                background: 'linear-gradient(to bottom, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.05) 60%, transparent 100%)',
                clipPath: 'polygon(15% 0, 85% 0, 65% 100%, 35% 100%)'
              }}
            />

            <div className="absolute bottom-12 left-1/2 -translate-x-1/2 w-[220px] h-[25px] bg-sky-500/20 blur-xl rounded-full" />
            
            <motion.div
              animate={{ y: [-8, 8, -8] }}
              transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
              className="relative w-full h-[80%] z-10 flex justify-center items-center"
            >
              <CompositeAvatar layers={equipped} className="w-full h-full absolute inset-0 z-20" />

              {/* Speech Balloon */}
              <AnimatePresence>
                {avatarSpeech && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.8 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.8 }}
                    transition={{ duration: 0.3 }}
                    className="absolute -top-24 left-1/2 -translate-x-1/2 z-30 bg-white text-slate-800 px-4 py-2 rounded-full shadow-lg border-2 border-sky-300 whitespace-nowrap font-bold text-sm max-w-xs text-center"
                  >
                    {avatarSpeech}
                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-white" />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full max-w-[450px] mx-auto h-[64px] bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold text-lg flex items-center justify-center gap-3 transition-colors shadow-md disabled:opacity-70 disabled:cursor-not-allowed active:scale-[0.98]"
          >
            {isSaving ? (
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
                <Save size={24} className="opacity-50" />
              </motion.div>
            ) : null}
            {isSaving ? 'Saving...' : 'Save Profile Avatar'}
          </button>
        </div>

      </div>
    </div>
  );
};

export default AvatarShop;
