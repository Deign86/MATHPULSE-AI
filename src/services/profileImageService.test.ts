import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('../lib/firebase', () => ({
  auth: { currentUser: null },
  storage: {},
  db: {},
  cloudFunctions: {},
  default: { options: { projectId: 'test-project' } },
}));

import {
  PROFILE_PICTURE_MAX_BYTES,
  buildProfilePictureStoragePath,
  sanitizeProfilePictureFileName,
  validateProfilePictureFile,
} from './profileImageService';

describe('profileImageService', () => {
  it('accepts supported image files within the size limit', () => {
    expect(
      validateProfilePictureFile({
        name: 'avatar.png',
        size: PROFILE_PICTURE_MAX_BYTES,
        type: 'image/png',
      }),
    ).toBeNull();
  });

  it('rejects unsupported file types', () => {
    expect(
      validateProfilePictureFile({
        name: 'avatar.gif',
        size: 1000,
        type: 'image/gif',
      }),
    ).toBe('Only PNG, JPEG, and WebP images are allowed.');
  });

  it('rejects files above the maximum size', () => {
    expect(
      validateProfilePictureFile({
        name: 'avatar.webp',
        size: PROFILE_PICTURE_MAX_BYTES + 1,
        type: 'image/webp',
      }),
    ).toBe('Profile pictures must be 2MB or smaller.');
  });

  it('sanitizes file names for storage', () => {
    expect(sanitizeProfilePictureFileName('My Portrait (Final).JPG')).toBe('my-portrait-final.jpg');
  });

  it('builds the expected storage path', () => {
    expect(buildProfilePictureStoragePath('uid-123', 'My Portrait.JPG', 123456789)).toBe(
      'profile-pictures/uid-123/123456789-my-portrait.jpg',
    );
  });
});
