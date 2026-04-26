import { updateProfile, type User as FirebaseUser } from 'firebase/auth';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { auth, storage } from '../lib/firebase';
import app from '../lib/firebase';

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

    // Guard against the image load hanging forever (e.g. invalid blob from canvas)
    const timeout = setTimeout(() => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Image loading timed out. Please try a different file.'));
    }, 15_000);

    image.onload = () => {
      clearTimeout(timeout);
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };

    image.onerror = () => {
      clearTimeout(timeout);
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Unable to read the selected image. Please try another file.'));
    };

    image.crossOrigin = 'anonymous';
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

/**
 * Race a promise against a timeout. Rejects with a clear message if the
 * operation does not settle within `ms` milliseconds.
 */
const withTimeout = <T>(promise: Promise<T>, ms: number, label: string): Promise<T> => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${Math.round(ms / 1000)}s`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
};

/**
 * Write profile photo URL directly to Firestore via REST API, completely
 * bypassing the Firestore SDK's persistent IndexedDB cache which hangs
 * indefinitely under the `persistentMultipleTabManager` configuration.
 */
const syncPhotoToFirestoreREST = async (
  activeUser: FirebaseUser,
  profileUid: string,
  photoURL: string,
): Promise<void> => {
  const projectId = app.options.projectId;
  if (!projectId) {
    throw new Error('Firebase project ID is not configured.');
  }

  const idToken = await activeUser.getIdToken();
  const endpoint =
    `https://firestore.googleapis.com/v1/projects/${projectId}` +
    `/databases/(default)/documents/users/${profileUid}` +
    `?updateMask.fieldPaths=photo&updateMask.fieldPaths=updatedAt`;

  const response = await fetch(endpoint, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${idToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      fields: {
        photo: { stringValue: photoURL },
        updatedAt: { timestampValue: new Date().toISOString() },
      },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    throw new Error(`Firestore REST update failed (${response.status}): ${errorBody}`);
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

  console.log('[PROFILE UPLOAD] Starting image optimisation…');
  const optimizedBlob = await withTimeout(
    resizeProfilePictureToBlob(file, PROFILE_PICTURE_OUTPUT_SIZE),
    20_000,
    'Image processing',
  );
  console.log('[PROFILE UPLOAD] Image optimised, uploading to Storage…');

  const storagePath = buildProfilePictureStoragePath(profileUid, file.name);
  const storageRef = ref(storage, storagePath);

  const uploadResult = await withTimeout(
    uploadBytes(storageRef, optimizedBlob, {
      contentType: optimizedBlob.type || 'image/webp',
      cacheControl: 'public, max-age=31536000, immutable',
    }),
    30_000,
    'Storage upload',
  );

  const downloadURL = await withTimeout(
    getDownloadURL(uploadResult.ref),
    10_000,
    'Download URL retrieval',
  );
  console.log('[PROFILE UPLOAD] Download URL obtained:', downloadURL);

  // Update Firebase Auth profile (non-blocking timeout guard)
  try {
    await withTimeout(
      updateProfile(activeUser, { photoURL: downloadURL }),
      10_000,
      'Auth profile update',
    );
    console.log('[PROFILE UPLOAD] Auth profile updated.');
  } catch (authErr) {
    // Auth profile update is best-effort – the URL is already in Storage.
    console.warn('[PROFILE UPLOAD] Auth profile update failed (non-fatal):', authErr);
  }

  // Sync to Firestore via REST API — bypasses the SDK's persistent IndexedDB
  // cache that causes updateDoc to hang indefinitely.
  if (syncFirestore) {
    try {
      console.log(`[PROFILE UPLOAD] Syncing to Firestore (REST) users/${profileUid}`);
      await withTimeout(
        syncPhotoToFirestoreREST(activeUser, profileUid, downloadURL),
        10_000,
        'Firestore profile sync',
      );
      console.log('[PROFILE UPLOAD] Firestore REST sync successful!');
    } catch (e) {
      console.error('[PROFILE UPLOAD] Firestore REST sync failed:', e);
      console.warn(
        '[PROFILE UPLOAD] Photo was uploaded but the database record may be stale. It will refresh on next login.',
      );
    }
  }

  return downloadURL;
};
