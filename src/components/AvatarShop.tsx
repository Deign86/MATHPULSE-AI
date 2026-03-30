import React, { useState } from 'react';
import { motion } from 'motion/react';
import * as Tabs from '@radix-ui/react-tabs';
import { Save, Sparkles, Shirt, Scissors, Footprints, Crown } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { updateUserProfile } from '../services/authService';
import CompositeAvatar, { AvatarLayers } from './CompositeAvatar';
import { MOCK_INVENTORY, AvatarCategory } from '../data/avatarData';

interface AvatarShopProps {
  onSaveProfile?: (layers: AvatarLayers) => void;
}

const AvatarShop: React.FC<AvatarShopProps> = ({ onSaveProfile }) => {
  const { userProfile } = useAuth();

  const [equipped, setEquipped] = useState<AvatarLayers>({
    top: userProfile?.avatarLayers?.top || 'top_pink',
    bottom: userProfile?.avatarLayers?.bottom || '',
    shoes: userProfile?.avatarLayers?.shoes || '',
    accessory: userProfile?.avatarLayers?.accessory || '',
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleEquip = (category: keyof AvatarLayers, id: string) => {
    setEquipped(prev => ({
      ...prev,
      [category]: prev[category] === id ? '' : id
    }));
  };

  const handleSave = async () => {
    if (!userProfile?.uid) return;
    setIsSaving(true);
    try {
      await updateUserProfile(userProfile.uid, { avatarLayers: equipped });
      if (onSaveProfile) {
        onSaveProfile(equipped);
      }
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
    <div className="h-full w-full flex items-center justify-center p-4 sm:p-6 lg:p-8 overflow-y-auto">
      <div className="relative w-full max-w-[1200px] min-h-[600px] rounded-[2rem] p-8 lg:p-12 bg-gradient-to-br from-white via-sky-50/30 to-white border border-slate-200/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] grid grid-cols-1 xl:grid-cols-[1fr_450px] gap-12 items-center">
        
        {/* Decorative backdrop elements */}
        <div className="absolute inset-0 overflow-hidden rounded-[2rem] pointer-events-none">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-sky-400/30 to-transparent" />
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-100/40 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-100/30 rounded-full blur-3xl" />
        </div>

        {/* LEFT: Shop Inventory & Tabs */}
        <div className="flex flex-col justify-center h-full relative z-10 w-full max-w-xl mx-auto xl:mx-0">
          <div className="mb-8">
            <h1 className="text-4xl md:text-5xl font-display font-black text-[#0a1628] tracking-tight flex items-center gap-3">
              Avatar Studio <Sparkles className="text-blue-500 fill-blue-500" size={32} />
            </h1>
            <p className="text-slate-500 font-medium text-lg mt-2">Design your perfect learning companion.</p>
          </div>

          <Tabs.Root defaultValue="top" className="flex flex-col flex-1 h-[400px]">
            <Tabs.List className="flex flex-nowrap justify-start space-x-2 sm:space-x-4 mb-8 bg-white shadow-sm p-1.5 rounded-full border border-slate-100 w-fit overflow-x-auto max-w-full scrollbar-hide">
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

            <div className="flex-1 overflow-y-auto pb-6 scrollbar-hide pr-2">
              {categories.map(cat => (
                <Tabs.Content key={cat.id} value={cat.id} className="outline-none">
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
                    {MOCK_INVENTORY.filter(item => item.category === cat.id).map(item => {
                      const isEquipped = equipped[cat.id as keyof typeof equipped] === item.id;
                      
                      const baseClasses = 'relative aspect-square rounded-[1.5rem] bg-white border-[3px] transition-all p-4 flex flex-col items-center justify-center group overflow-hidden';
                      const equippedClasses = isEquipped 
                        ? ' border-transparent shadow-[0_0_0_3px_#3b82f6] shadow-blue-200/50 scale-[1.02]' 
                        : ' border-slate-100 hover:border-sky-300 hover:shadow-[0_0_20px_rgba(56,189,248,0.15)]';
                        
                      return (
                        <button
                          key={item.id}
                          onClick={() => handleEquip(cat.id, item.id)}
                          className={baseClasses + equippedClasses}
                        >
                          {isEquipped && (
                            <div className="absolute top-3 inset-x-0 mx-auto w-fit px-3 py-1 bg-gradient-to-r from-blue-500 to-sky-400 text-white text-[10px] font-black tracking-wider uppercase rounded-full shadow-sm flex items-center gap-1 z-10 transition-transform">
                              Equipped <Sparkles size={10} className="fill-white" />
                            </div>
                          )}
                          <div className="relative w-full h-full flex flex-col items-center justify-center z-0">
                            <img 
                              src={item.thumbnail} 
                              alt={item.name} 
                              className="w-[90%] h-[90%] object-contain pointer-events-none drop-shadow-sm transition-transform duration-300 group-hover:rotate-[8deg] group-hover:scale-110"
                              style={{ filter: !isEquipped ? 'grayscale(0%)' : 'none' }}
                            />
                          </div>
                          <p className="absolute bottom-3 text-sm font-bold text-slate-700">{item.name}</p>
                        </button>
                      );
                    })}
                  </div>
                </Tabs.Content>
              ))}
            </div>
          </Tabs.Root>
        </div>

        {/* RIGHT: Avatar Preview Area */}
        <div className="flex flex-col gap-6 relative z-10 h-full justify-center">
          <div className="bg-[#0f1422] rounded-[3rem] overflow-hidden relative shadow-[0_20px_50px_rgba(15,20,34,0.3)] h-[400px] xl:h-[480px] flex items-center justify-center w-full max-w-[450px] mx-auto border-8 border-slate-800">
            
            {/* V-Shape Spotlight */}
            <div
              className="absolute top-[-10%] left-0 right-0 h-[110%] pointer-events-none mix-blend-screen opacity-70"
              style={{
                background: 'linear-gradient(to bottom, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.05) 60%, transparent 100%)',
                clipPath: 'polygon(15% 0, 85% 0, 65% 100%, 35% 100%)'
              }}
            />

            {/* Glowing Floor Platform */}
            <div className="absolute bottom-12 left-1/2 -translate-x-1/2 w-[220px] h-[25px] bg-sky-500/20 blur-xl rounded-full" />
            
            {/* Breathing Avatar Group */}
            <motion.div
              animate={{ y: [-8, 8, -8] }}
              transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
              className="relative w-full h-[80%] z-10 flex justify-center items-center"
            >
              <CompositeAvatar layers={equipped} className="w-full h-full absolute inset-0 z-20" />
            </motion.div>
          </div>

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full max-w-[450px] mx-auto h-[64px] bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold text-lg flex items-center justify-center gap-3 transition-colors shadow-md disabled:opacity-70 disabled:cursor-not-allowed group active:scale-[0.98]"
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
