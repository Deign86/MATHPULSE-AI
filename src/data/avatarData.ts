export type AvatarCategory = 'top' | 'bottom' | 'shoes' | 'accessory';

export interface ShopItem {
  id: string;
  name: string;
  category: AvatarCategory;
  src: string;
  thumbnail: string;
  price?: number;
  isReward?: boolean;
  isExclusive?: boolean;
  /** For set items: applies multiple layers at once */
  setLayers?: { top?: string; bottom?: string; shoes?: string; accessory?: string };
}

export const MOCK_INVENTORY: ShopItem[] = [
  // --- Tops ---
  { id: 'top_blue', name: 'Blue Uniform', category: 'top', src: '/avatar/uniform_blue.png', thumbnail: '/avatar/uniform_blue_thumbnail.png', price: 0 },
  { id: 'top_pink', name: 'Pink Uniform', category: 'top', src: '/avatar/uniform_pink.png', thumbnail: '/avatar/uniform_pink_thumbnail.png', price: 200 },
  { id: 'top_brown_vest', name: 'Brown Vest', category: 'top', src: '/avatar/brown_vest.png', thumbnail: '/avatar/brown_vest_thumbnail.png', price: 150 },

  // --- Bottoms ---
  { id: 'bot_black', name: 'Black Pants', category: 'bottom', src: '/avatar/pants_black.png', thumbnail: '/avatar/pants_black_thumbnail.png', price: 0 },

  // --- Shoes ---
  { id: 'shoe_black', name: 'Black Shoes', category: 'shoes', src: '/avatar/shoes_black.png', thumbnail: '/avatar/shoes_black_thumbnail.png', price: 0 },
  { id: 'shoe_slippers', name: 'Slippers', category: 'shoes', src: '/avatar/slippers.png', thumbnail: '/avatar/slippers_thumbnail.png', price: 100 },

  // --- Accessories ---
  { id: 'acc_leaf_clip', name: 'Leaf Clip', category: 'accessory', src: '/avatar/leaf_clip.png', thumbnail: '/avatar/leaf_clip_thumbnail.png', price: 0 },
  { id: 'acc_blue_cap', name: 'Blue Cap', category: 'accessory', src: '/avatar/blue_cap.png', thumbnail: '/avatar/blue_cap_thumbnail.png', price: 300 },
  { id: 'acc_red_cap', name: 'Red Cap', category: 'accessory', src: '/avatar/red_cap.png', thumbnail: '/avatar/red_cap_thumbnail.png', price: 250 },
  { id: 'acc_traffic_cone', name: 'Traffic Cone', category: 'accessory', src: '/avatar/traffic_cone.png', thumbnail: '/avatar/traffic_cone_thumbnail.png', price: 500 },

  // --- Exclusive Rewards ---
  { id: 'acc_crown', name: 'Gold Crown', category: 'accessory', src: '/avatar/crown.png', thumbnail: '/avatar/crown_thumbnail.png', isReward: true, isExclusive: true },
  {
    id: 'exc_naruto_set',
    name: 'Naruto Set',
    category: 'top',
    src: '/avatar/naruto_top.png',
    thumbnail: '/avatar/exclusive_naruto_set_thumbnail.png',
    isReward: true,
    isExclusive: true,
    setLayers: { top: 'exc_naruto_top', bottom: 'exc_naruto_pants', shoes: 'exc_naruto_shoes', accessory: 'exc_forehead_protector' },
  },

  // --- Hidden layer items (used by Naruto Set, not shown individually) ---
  { id: 'exc_naruto_top', name: 'Naruto Top', category: 'top', src: '/avatar/naruto_top.png', thumbnail: '/avatar/exclusive_naruto_set_thumbnail.png', isReward: true, isExclusive: true },
  { id: 'exc_naruto_pants', name: 'Naruto Pants', category: 'bottom', src: '/avatar/naruto_pants.png', thumbnail: '/avatar/exclusive_naruto_set_thumbnail.png', isReward: true, isExclusive: true },
  { id: 'exc_naruto_shoes', name: 'Naruto Shoes', category: 'shoes', src: '/avatar/naruto_shoes.png', thumbnail: '/avatar/exclusive_naruto_set_thumbnail.png', isReward: true, isExclusive: true },
  { id: 'exc_forehead_protector', name: 'Forehead Protector', category: 'accessory', src: '/avatar/forehead_protector.png', thumbnail: '/avatar/exclusive_naruto_set_thumbnail.png', isReward: true, isExclusive: true },
];

/** Items shown in the Exclusive tab (excludes hidden layer pieces) */
export const EXCLUSIVE_DISPLAY_ITEMS = MOCK_INVENTORY.filter(i => i.isExclusive && i.id !== 'exc_naruto_top' && i.id !== 'exc_naruto_pants' && i.id !== 'exc_naruto_shoes' && i.id !== 'exc_forehead_protector');

export const getAvatarSrc = (id: string | undefined): string | undefined => {
  if (!id) return undefined;
  return MOCK_INVENTORY.find(item => item.id === id)?.src;
};