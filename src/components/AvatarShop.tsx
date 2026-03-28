import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';
import { Button } from './ui/button';
import { Save, Shirt, Scissors, Footprints, Crown, Sparkles } from 'lucide-react';
import { cn } from './ui/utils';

// --- Types & Mock Data ---
type ItemCategory = 'Tops' | 'Bottoms' | 'Shoes' | 'Accessories';

interface ShopItem {
  id: string;
  name: string;
  src: string;
  thumbnail?: string; // Optional custom thumbnail for the shop grid
  category: ItemCategory;
}

// NOTE: Horns are no longer in the inventory since they are non-detachable base parts
const INVENTORY: ShopItem[] = [
  { id: 'uniform_blue', name: 'Blue Uniform', src: '/avatar/uniform_blue.png', thumbnail: '/avatar/uniform_blue_thumbnail.png', category: 'Tops' },
  { id: 'uniform_pink', name: 'Pink Uniform', src: '/avatar/uniform_pink.png', thumbnail: '/avatar/uniform_pink_thumbnail.png', category: 'Tops' },
  { id: 'pants_black', name: 'Black Pants', src: '/avatar/pants_black.png', thumbnail: '/avatar/pants_black_thumbnail.png', category: 'Bottoms' },
  { id: 'shoes_black', name: 'Black Shoes', src: '/avatar/shoes_black.png', thumbnail: '/avatar/shoes_black_thumbnail.png', category: 'Shoes' },
];

interface AvatarState {
  tops: string | null;
  bottoms: string | null;
  shoes: string | null;
  accessories: string | null; // Accessories can still be equipped if future items are added
}

const AvatarShop: React.FC = () => {
  const [equipped, setEquipped] = useState<AvatarState>({
    tops: 'uniform_blue',
    bottoms: 'pants_black',
    shoes: 'shoes_black',
    accessories: null, 
  });

  const handleEquip = (item: ShopItem) => {
    setEquipped((prev) => ({
      ...prev,
      [item.category.toLowerCase()]: prev[item.category.toLowerCase() as keyof AvatarState] === item.id ? null : item.id,
    }));
  };

  const handleSave = () => {
    console.log("Saving Avatar Config:", JSON.stringify(equipped, null, 2));
  };

  const categories = ['Tops', 'Bottoms', 'Shoes', 'Accessories'];

  // Helper function to specifically position the thumbnail within the card
  // This compensates for the fact that all piece assets match a full 512x512 canvas.
  const getThumbnailStyle = (category: string) => {
    switch (category) {
      case 'Tops':
        // Tops sit in the middle/upper half
        return "object-center scale-[1.7] translate-y-2";
      case 'Bottoms':
        // Bottoms sit very low, so scale up heavily and translate down
        return "object-bottom scale-[2.2] translate-y-8";
      case 'Shoes':
        // Shoes sit at the absolute bottom
        return "object-bottom scale-[3.2] translate-y-12";
      default:
        return "object-center scale-[1.5]";
    }
  };

  return (
    <div className="relative min-h-full h-full w-full flex items-center justify-center p-4 lg:p-8 bg-transparent overflow-hidden">
      
      {/* Dynamic Background from LoginPage */}
      <div className="absolute inset-0 pointer-events-none"
        style={{
            background: 'radial-gradient(ellipse at 30% 50%, rgba(240,249,255,0.2) 0%, rgba(248,250,252,0.5) 50%, rgba(255,241,242,0.4) 80%, rgba(248,250,252,0.85) 100%)',
        }}
      />
      <div className="absolute top-[10%] left-[-10%] w-[60%] h-[60%] rounded-full blur-[140px] pointer-events-none mix-blend-multiply" style={{ background: 'radial-gradient(circle, rgba(168,85,247,0.3) 0%, transparent 70%)' }} />
      <div className="absolute bottom-[-10%] right-[-10%] w-[70%] h-[70%] rounded-full blur-[160px] pointer-events-none mix-blend-multiply" style={{ background: 'radial-gradient(circle, rgba(236,72,153,0.25) 0%, transparent 70%)' }} />
      <div className="absolute top-[40%] left-[40%] w-[40%] h-[40%] rounded-full blur-[120px] pointer-events-none mix-blend-screen" style={{ background: 'radial-gradient(circle, rgba(56,189,248,0.2) 0%, transparent 70%)' }} />
      
      <div className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(15,23,42,0.4) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />

      {/* Main App Container */}
      <div className="relative z-10 w-full max-w-[1400px] h-[calc(100vh-2rem)] lg:h-[800px] flex flex-col-reverse lg:flex-row bg-white/90 backdrop-blur-xl rounded-[2.5rem] shadow-2xl border border-white/50 overflow-hidden divide-y-reverse lg:divide-y-0 lg:divide-x divide-slate-100/60 ring-1 ring-slate-900/5">
        
        {/* LEFT COLUMN: Inventory & Shop */}
<div className="flex-1 lg:w-[55%] flex flex-col p-6 lg:p-12 space-y-8 bg-white/40 overflow-y-auto min-h-0">
            <div className="flex flex-col space-y-2">
              <h1 className="text-4xl lg:text-5xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-purple-600 via-pink-500 to-sky-500 flex items-center gap-3 drop-shadow-sm">
                Avatar Studio ✨
              </h1>
              <p className="text-slate-600 text-base font-medium lg:text-lg">Design your perfect learning companion.</p>
          </div>

          <Tabs defaultValue="Tops" className="w-full flex-1 flex flex-col">
            {/* Horizontal scrolling tabs with fixed height to prevent vertical squash/scroll */}
              <TabsList className="flex flex-nowrap shrink-0 justify-start gap-3 bg-white/60 backdrop-blur-xl p-3 border-2 border-white/80 rounded-3xl mb-10 overflow-x-auto overflow-y-hidden whitespace-nowrap scrollbar-hide min-w-full shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                <TabsTrigger value="Tops" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-500 data-[state=active]:text-white data-[state=inactive]:hover:bg-purple-50 data-[state=inactive]:text-slate-500 data-[state=active]:shadow-md rounded-2xl py-3.5 px-5 font-bold transition-all flex-1 min-w-[120px] whitespace-nowrap shrink-0"><Shirt className="w-5 h-5 mr-2" /> Tops</TabsTrigger>
                <TabsTrigger value="Bottoms" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-500 data-[state=active]:text-white data-[state=inactive]:hover:bg-purple-50 data-[state=inactive]:text-slate-500 data-[state=active]:shadow-md rounded-2xl py-3.5 px-5 font-bold transition-all flex-1 min-w-[120px] whitespace-nowrap shrink-0"><Scissors className="w-5 h-5 mr-2" /> Bottoms</TabsTrigger>
                <TabsTrigger value="Shoes" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-500 data-[state=active]:text-white data-[state=inactive]:hover:bg-purple-50 data-[state=inactive]:text-slate-500 data-[state=active]:shadow-md rounded-2xl py-3.5 px-5 font-bold transition-all flex-1 min-w-[120px] whitespace-nowrap shrink-0"><Footprints className="w-5 h-5 mr-2" /> Shoes</TabsTrigger>
                <TabsTrigger value="Accessories" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-500 data-[state=active]:text-white data-[state=inactive]:hover:bg-purple-50 data-[state=inactive]:text-slate-500 data-[state=active]:shadow-md rounded-2xl py-3.5 px-5 font-bold transition-all flex-1 min-w-[120px] whitespace-nowrap shrink-0"><Crown className="w-5 h-5 mr-2" /> Accs</TabsTrigger>
              </TabsList>

            {categories.map((cat) => (
              <TabsContent key={cat} value={cat} className="flex-1 focus-visible:outline-none focus-visible:ring-0">
                
                {cat === 'Accessories' ? (
                  // Custom empty state for Accessories
                  <div className="h-48 md:h-64 flex flex-col items-center justify-center text-slate-400 font-medium bg-white/50 backdrop-blur-sm rounded-[2rem] border-4 border-dashed border-slate-200/60 gap-4 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-100/30 to-pink-100/30 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <motion.div 
                      className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center shadow-[0_10px_30px_-10px_rgba(0,0,0,0.1)] rotate-3 group-hover:rotate-12 transition-transform duration-300"
                      animate={{ y: [0, -10, 0] }}
                      transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                    >
                      <Sparkles className="w-10 h-10 text-purple-400 drop-shadow-sm" />
                    </motion.div>
                    <p className="text-xl font-bold text-slate-500 group-hover:text-purple-500 transition-colors">Accessories dropping soon! 🎁</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-5 lg:gap-6 pb-8 lg:pb-0 h-full content-start">
                    {INVENTORY.filter(item => item.category === cat).map((item) => {
                      const isEquipped = equipped[cat.toLowerCase() as keyof AvatarState] === item.id;
                      
                      return (
                        <motion.div
                          key={item.id}
                          whileHover={{ scale: 1.05, y: -4, rotate: (Math.random() * 2 - 1) }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleEquip(item)}
                          className={cn(
                            "relative cursor-pointer rounded-[2rem] transition-all overflow-hidden flex flex-col items-center p-5 aspect-square bg-white border-4 justify-end group",
                            isEquipped
                              ? "border-pink-500 shadow-[0_15px_35px_-5px_rgba(236,72,153,0.4)]"
                              : "border-slate-100 hover:border-sky-300 hover:shadow-[0_15px_35px_-5px_rgba(56,189,248,0.3)] shadow-sm"
                          )}
                        >
                          <div className={cn("absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-tr from-transparent via-white/50 to-white/10", isEquipped && "opacity-100 bg-gradient-to-t from-pink-50/50 to-transparent")} />
                          
                          <div className="absolute inset-0 top-4 bottom-[20%] flex items-center justify-center pointer-events-none mix-blend-multiply overflow-hidden z-10 transition-transform duration-300 group-hover:scale-110">
                            <img
                              src={item.thumbnail || item.src}
                              alt={item.name}
                              className={cn(
                                "w-full h-full object-contain drop-shadow-xl transition-all duration-300",
                                !item.thumbnail && getThumbnailStyle(item.category)
                              )}
                            />
                          </div>
                          <span className={cn("text-sm lg:text-base font-black z-20 bg-white/90 backdrop-blur-md px-4 py-1.5 rounded-xl mt-auto text-center w-full transition-colors", isEquipped ? "text-pink-600" : "text-slate-700")}>
                            {item.name}
                          </span>
                          {isEquipped && (
                            <div className="absolute top-4 right-4 bg-gradient-to-r from-pink-500 to-purple-500 text-white text-[10px] uppercase font-black px-3 py-1.5 rounded-full z-20 shadow-lg transform rotate-3">
                              Equipped ✨
                            </div>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </div>

        {/* RIGHT COLUMN: Live Preview */}
        <div className="flex-1 lg:w-[45%] flex flex-col items-center justify-center p-8 lg:p-12 relative bg-transparent overflow-hidden">

          {/* Epic ambient glow behind the avatar box */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-purple-300/50 via-sky-300/30 to-pink-300/40 blur-[100px] rounded-full pointer-events-none" />

          <div className="relative z-10 flex flex-col items-center gap-12 w-full max-w-[480px]">

            {/* Paper Doll Presentation Circle */}
            <div className="relative w-[340px] h-[340px] sm:w-[440px] sm:h-[440px] rounded-[3rem] bg-[#0A1128] border-[6px] border-[#1E293B] shadow-[0_30px_60px_rgba(15,23,42,0.4),inset_0_0_120px_rgba(0,0,0,0.9)] flex items-end justify-center pt-10 overflow-hidden transform-gpu shrink-0 ring-1 ring-white/10">

              {/* V-Shape Spotlight from Above - Not included in the avatar animation */}
              <div 
                className="absolute top-[-10%] left-0 right-0 h-[110%] pointer-events-none mix-blend-screen"
                style={{
                  background: 'linear-gradient(to bottom, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.05) 60%, transparent 100%)',
                  clipPath: 'polygon(15% 0, 85% 0, 65% 100%, 35% 100%)'
                }}
              />

              {/* Subtle floor illumination where the avatar stands */}
              <div className="absolute bottom-5 left-1/2 -translate-x-1/2 w-[60%] h-8 bg-sky-300/30 blur-[15px] rounded-[100%] pointer-events-none" />

              {/* Secondary soft backglow for atmospheric depth */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-gradient-to-br from-sky-500/20 to-indigo-500/20 blur-[70px] rounded-full pointer-events-none" />

              <motion.div
                className="relative w-full h-[120%] pb-6"
                animate={{ y: [-5, 5, -5] }}
                transition={{ repeat: Infinity, duration: 3.5, ease: "easeInOut" }}
              >
                {/* Base Body */}
                <img src="/avatar/avatar_body.png" className="absolute inset-0 w-full h-full object-contain z-10" alt="Base Avatar" />
                
                {/* Pants */}
                {equipped.bottoms && (
                  <img src={`/avatar/${equipped.bottoms}.png`} className="absolute inset-0 w-full h-full object-contain z-20" alt="Pants" />
                )}

                {/* Shoes */}
                {equipped.shoes && (
                  <img src={`/avatar/${equipped.shoes}.png`} className="absolute inset-0 w-full h-full object-contain z-30" alt="Shoes" />
                )}
                
                {/* Tops */}
                {equipped.tops && (
                  <img src={`/avatar/${equipped.tops}.png`} className="absolute inset-0 w-full h-full object-contain z-40" alt="Top" />
                )}

                {/* 
                  Horns are now considered a base piece of the avatar, rendered statically atop everything.
                  The pivot is set slightly lower to prevent detaching from the base root.
                  Swinging restored to be visible but slightly less intense than original (-1.5 to 1.5).
                */}
                <motion.img 
                  src="/avatar/left_horn.png" 
                  className="absolute inset-0 w-full h-full object-contain z-50 origin-[50%_45%]"
                    animate={{ rotate: [-8, 8, -8] }}
                    transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                    alt="Left Horn"
                  />
                  <motion.img
                    src="/avatar/right_horn.png"
                    className="absolute inset-0 w-full h-full object-contain z-50 origin-[50%_45%]"
                    animate={{ rotate: [8, -8, 8] }}
                    transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                    alt="Right Horn"
                  />

                {/* Extra dynamic shadows rendered over the composition */}
                <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-slate-900/40 via-transparent to-transparent z-[60]" />
              </motion.div>
            </div>

            <Button 
              size="lg"
                className="relative w-full bg-blue-600 hover:bg-blue-500 text-white font-black h-[72px] rounded-2xl shadow-[0_10px_30px_-10px_rgba(37,99,235,0.6)] text-lg sm:text-xl transition-all hover:-translate-y-1 active:scale-95 group overflow-hidden border border-blue-500"
                onClick={handleSave}
              >
                <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
                <span className="relative z-10 flex items-center justify-center gap-2">
                  Save Profile Avatar
                </span>
            </Button>

          </div>
        </div>
      </div>
    </div>
  );
};

export default AvatarShop;
