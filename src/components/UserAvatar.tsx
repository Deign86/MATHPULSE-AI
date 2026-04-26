import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { cn } from './ui/utils';

interface UserAvatarProps {
  src?: string;
  name?: string;
  className?: string;
  fallbackClassName?: string;
  /** Extra classes applied to the AvatarImage (e.g. object-fit overrides). */
  imageClassName?: string;
}

/**
 * Extracts up to two initials from a display name.
 * Returns "U" as a default when no name is provided.
 */
const getInitials = (value?: string): string => {
  const trimmed = (value || '').trim();
  if (!trimmed) return 'U';

  return trimmed
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
};

/**
 * Reusable avatar component that displays the user's profile picture
 * with a graceful initials fallback when the photo is missing or fails to load.
 *
 * Built on top of the shadcn/ui `Avatar` primitive (Radix).
 */
const UserAvatar: React.FC<UserAvatarProps> = ({
  src,
  name,
  className,
  fallbackClassName,
  imageClassName,
}) => {
  const initials = getInitials(name);

  return (
    <Avatar className={cn('shrink-0', className)}>
      {src && (
        <AvatarImage
          src={src}
          alt={name || 'User'}
          className={cn('object-cover', imageClassName)}
        />
      )}
      <AvatarFallback
        className={cn(
          'bg-gradient-to-br from-violet-500 to-indigo-600 text-white font-display font-bold text-xs select-none',
          fallbackClassName,
        )}
      >
        {initials}
      </AvatarFallback>
    </Avatar>
  );
};

export default UserAvatar;
