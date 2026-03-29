export type AvatarCategory = 'top' | 'bottom' | 'shoes' | 'accessory';

export interface ShopItem {
  id: string;
  name: string;
  category: AvatarCategory;
  src: string;
  thumbnail: string;
}

export const MOCK_INVENTORY: ShopItem[] = [
  { id: 'top_blue', name: 'Blue Uniform', category: 'top', src: '/avatar/uniform_blue.png', thumbnail: '/avatar/uniform_blue_thumbnail.png' },
  { id: 'top_pink', name: 'Pink Uniform', category: 'top', src: '/avatar/uniform_pink.png', thumbnail: '/avatar/uniform_pink_thumbnail.png' },
  { id: 'bot_black', name: 'Black Pants', category: 'bottom', src: '/avatar/pants_black.png', thumbnail: '/avatar/pants_black_thumbnail.png' },
  { id: 'shoe_black', name: 'Black Shoes', category: 'shoes', src: '/avatar/shoes_black.png', thumbnail: '/avatar/shoes_black_thumbnail.png' },
];

export const getAvatarSrc = (id: string | undefined): string | undefined => {
  if (!id) return undefined;
  return MOCK_INVENTORY.find(item => item.id === id)?.src;
};

