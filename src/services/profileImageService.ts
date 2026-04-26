import { updateProfile, type User as FirebaseUser } from 'firebase/auth';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { auth, storage } from '../lib/firebase';
import { updateUserProfile } from './authService';

export const PROFILE_PICTURE_ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const;
export const PROFILE_PICTURE_MAX_BYTES = 2 * 1024 * 1024;
export const PROFILE_PICTURE_OUTPUT_SIZE = 256;

export interface ProfilePictureUploadOptions {
  file: File;
  uid?: string;
  currentUser?: FirebaseUser | null;
  syncFirestore?: boolean;
}

export interface FileValidationTarget {
  name: string;
  size: number;
  type: string;
}

export const sanitizeProfilePictureFileName = (name: string): string => {
  const normalizedName = name.normalize('NFKD').toLowerCase();
  const lastDotIndex = normalizedName.lastIndexOf('.');
  const baseName = lastDotIndex > 0 ? normalizedName.slice(0, lastDotIndex) : normalizedName;
  const extension = lastDotIndex > 0 ? normalizedName.slice(lastDotIndex).replace(/[^.a-z0-9]/g, '') : '';

  const safeBaseName = baseName
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  return `${safeBaseName || 'profile-picture'}${extension}`;
};

export const buildProfilePictureStoragePath = (uid: string, fileName: string, timestamp = Date.now()): string => {
  return `profile-pictures/${uid}/${timestamp}-${sanitizeProfilePictureFileName(fileName)}`;
};

export const validateProfilePictureFile = (file: FileValidationTarget): string | null => {
  if (!PROFILE_PICTURE_ALLOWED_TYPES.includes(file.type as (typeof PROFILE_PICTURE_ALLOWED_TYPES)[number])) {
    return 'Only PNG, JPEG, and WebP images are allowed.';
  }

  if (file.size > PROFILE_PICTURE_MAX_BYTES) {
    return 'Profile pictures must be 2MB or smaller.';
  }

  if (!file.name.trim()) {
    return 'Please choose a valid image file.';
  }

  return null;
};

const loadImageFromFile = (file: File): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Unable to read the selected image. Please try another file.'));
    };

    image.src = objectUrl;
  });
};

const canvasToBlob = (canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Failed to prepare the image for upload.'));
        return;
      }

      resolve(blob);
    }, type, quality);
  });
};

export const resizeProfilePictureToBlob = async (file: File, size = PROFILE_PICTURE_OUTPUT_SIZE): Promise<Blob> => {
  const image = await loadImageFromFile(file);
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Your browser cannot process image uploads right now.');
  }

  const sourceWidth = image.naturalWidth || image.width;
  const sourceHeight = image.naturalHeight || image.height;
  const sourceSize = Math.min(sourceWidth, sourceHeight);
  const sourceX = Math.max(0, (sourceWidth - sourceSize) / 2);
  const sourceY = Math.max(0, (sourceHeight - sourceSize) / 2);

  context.clearRect(0, 0, size, size);
  context.drawImage(image, sourceX, sourceY, sourceSize, sourceSize, 0, 0, size, size);

  try {
    return await canvasToBlob(canvas, 'image/webp', 0.9);
  } catch {
    return await canvasToBlob(canvas, 'image/jpeg', 0.9);
  }
};

export const uploadProfilePicture = async ({
  file,
  uid,
  currentUser = auth.currentUser,
  syncFirestore = true,
}: ProfilePictureUploadOptions): Promise<string> => {
  const validationError = validateProfilePictureFile(file);
  if (validationError) {
    throw new Error(validationError);
  }

  const activeUser = currentUser ?? auth.currentUser;
  if (!activeUser) {
    throw new Error('You need to be signed in to change your profile picture.');
  }

  const profileUid = uid || activeUser.uid;
  if (!profileUid) {
    throw new Error('Unable to determine which profile should be updated.');
  }

  if (activeUser.uid !== profileUid) {
    throw new Error('The signed-in user does not match the profile being edited.');
  }

  const optimizedBlob = await resizeProfilePictureToBlob(file, PROFILE_PICTURE_OUTPUT_SIZE);
  const storagePath = buildProfilePictureStoragePath(profileUid, file.name);
  const storageRef = ref(storage, storagePath);

  const uploadResult = await uploadBytes(storageRef, optimizedBlob, {
    contentType: optimizedBlob.type || 'image/webp',
    cacheControl: 'public, max-age=31536000, immutable',
  });

  const downloadURL = await getDownloadURL(uploadResult.ref);
  await updateProfile(activeUser, { photoURL: downloadURL });

  if (syncFirestore) {
    await updateUserProfile(profileUid, { photo: downloadURL });
  }

  return downloadURL;
};
