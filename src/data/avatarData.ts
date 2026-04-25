export type AvatarCategory = 'top' | 'bottom' | 'shoes' | 'accessory';

export interface ShopItem {
  id: string;
  name: string;
  category: AvatarCategory;
  src: string;
  thumbnail: string;
  price?: number; // XP cost, 0 or undefined means free/earned
}

export const MOCK_INVENTORY: ShopItem[] = [
  { id: 'top_blue', name: 'Blue Uniform', category: 'top', src: '/avatar/uniform_blue.png', thumbnail: '/avatar/uniform_blue_thumbnail.png', price: 0 },
  { id: 'top_pink', name: 'Pink Uniform', category: 'top', src: '/avatar/uniform_pink.png', thumbnail: '/avatar/uniform_pink_thumbnail.png', price: 200 },
  { id: 'bot_black', name: 'Black Pants', category: 'bottom', src: '/avatar/pants_black.png', thumbnail: '/avatar/pants_black_thumbnail.png', price: 0 },
  { id: 'shoe_black', name: 'Black Shoes', category: 'shoes', src: '/avatar/shoes_black.png', thumbnail: '/avatar/shoes_black_thumbnail.png', price: 0 },
  { id: 'acc_leaf_clip', name: 'Leaf Clip', category: 'accessory', src: '/avatar/leaf_clip.png', thumbnail: '/avatar/leaf_clip_thumbnail.png', price: 0 },

  { id: 'acc_red_cap', name: 'Red Cap', category: 'accessory', src: '/avatar/red_cap.png', thumbnail: '/avatar/red_cap_thumbnail.png', price: 250 },
  { id: 'acc_traffic_cone', name: 'Traffic Cone', category: 'accessory', src: '/avatar/traffic_cone.png', thumbnail: '/avatar/traffic_cone_thumbnail.png', price: 500 },

];

export const getAvatarSrc = (id: string | undefined): string | undefined => {
  if (!id) return undefined;
  return MOCK_INVENTORY.find(item => item.id === id)?.src;
};

