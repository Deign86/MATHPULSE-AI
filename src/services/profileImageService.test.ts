import { describe, expect, it, vi, beforeEach } from 'vitest';
import * as firebaseAuth from 'firebase/auth';

// Spy on the Firebase SDK instead of mocking the app's lib/firebase module.
// SAFETY: stub Auth; exercised paths only read currentUser (null here).
vi.spyOn(firebaseAuth, 'getAuth').mockImplementation(
  () => ({ currentUser: null }) as ReturnType<typeof firebaseAuth.getAuth>,
);

const profileImageService = await import('../profileImageService');

describe('profileImageService', () => {
  it('accepts supported image files within the size limit', () => {
    expect(
      profileImageService.validateProfilePictureFile({
        name: 'avatar.png',
        size: profileImageService.PROFILE_PICTURE_MAX_BYTES,
        type: 'image/png',
      }),
    ).toBeNull();
  });

  it('rejects unsupported file types', () => {
    expect(
      profileImageService.validateProfilePictureFile({
        name: 'avatar.gif',
        size: 1000,
        type: 'image/gif',
      }),
    ).toBe('Only PNG, JPEG, and WebP images are allowed.');
  });

  it('rejects files above the maximum size', () => {
    expect(
      profileImageService.validateProfilePictureFile({
        name: 'avatar.webp',
        size: profileImageService.PROFILE_PICTURE_MAX_BYTES + 1,
        type: 'image/webp',
      }),
    ).toBe('Profile pictures must be 2MB or smaller.');
  });

  it('sanitizes file names for storage', () => {
    expect(profileImageService.sanitizeProfilePictureFileName('My Portrait (Final).JPG')).toBe('my-portrait-final.jpg');
  });

  it('builds the expected storage path', () => {
    expect(profileImageService.buildProfilePictureStoragePath('uid-123', 'My Portrait.JPG', 123456789)).toBe(
      'profile-pictures/uid-123/123456789-my-portrait.jpg',
    );
  });
});
