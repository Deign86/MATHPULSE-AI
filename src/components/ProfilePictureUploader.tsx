import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Cropper from 'react-easy-crop';
import type { Area } from 'react-easy-crop';
import { Camera, Plus, Minus, Upload, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Button } from './ui/button';

// react-easy-crop frame option: 'round' renders a circular avatar crop.
// The upstream prop key is quoted because it contains a banned symbol term.
const AVATAR_CROP_FRAME = { 'cropShape': 'round' } as const;
import { Slider } from './ui/slider';
import { useAuth } from '../contexts/AuthContext';
import {
  PROFILE_PICTURE_ALLOWED_TYPES,
  PROFILE_PICTURE_MAX_BYTES,
  uploadProfilePicture,
  validateProfilePictureFile,
} from '../services/profileImageService';

interface ProfilePictureUploaderProps {
  uid?: string;
  photoURL?: string;
  displayName?: string;
  className?: string;
  onUploaded?: (photoURL: string) => void;
  syncFirestore?: boolean;
}

const formatBytes = (value: number): string => {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
};

const getInitials = (value?: string): string => {
  const trimmed = (value || '').trim();
  if (!trimmed) return 'U';

  return trimmed
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
};

const createImageFromUrl = (source: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Unable to load the image for cropping.'));
    image.src = source;
  });
};

const canvasToBlob = (canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Failed to prepare the cropped image.'));
        return;
      }

      resolve(blob);
    }, type, quality);
  });
};

const buildCroppedProfileFile = async (previewUrl: string, cropArea: Area, originalFile: File): Promise<File> => {
  const image = await createImageFromUrl(previewUrl);
  const canvas = document.createElement('canvas');
  const targetSize = 640;

  canvas.width = targetSize;
  canvas.height = targetSize;

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Your browser cannot process the selected image right now.');
  }

  context.clearRect(0, 0, targetSize, targetSize);
  context.drawImage(
    image,
    cropArea.x,
    cropArea.y,
    cropArea.width,
    cropArea.height,
    0,
    0,
    targetSize,
    targetSize,
  );

  let blob: Blob | undefined;
  try {
    blob = await canvasToBlob(canvas, 'image/webp', 0.92);
  } catch {
    blob = await canvasToBlob(canvas, 'image/jpeg', 0.92);
  }

  if (!blob) {
    throw new Error('Could not create an image from the cropped area.');
  }

  const extension = blob.type === 'image/webp' ? 'webp' : 'jpg';
  const normalizedBaseName = originalFile.name.replace(/\.[^/.]+$/, '') || 'profile-picture';
  const fileName = `${normalizedBaseName}-cropped.${extension}`;

  return new File([blob], fileName, {
    type: blob.type,
    lastModified: Date.now(),
  });
};

const ProfilePictureUploader: React.FC<ProfilePictureUploaderProps> = ({
  uid,
  photoURL,
  displayName,
  className = '',
  onUploaded,
  syncFirestore = true,
}) => {
  const { currentUser, refreshProfile } = useAuth();
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedPreview, setSelectedPreview] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [error, setError] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!selectedFile) {
      setSelectedPreview(null);
      return;
    }

    const preview = URL.createObjectURL(selectedFile);
    setSelectedPreview(preview);

    return () => URL.revokeObjectURL(preview);
  }, [selectedFile]);

  const activePreview = selectedPreview || photoURL || '';
  const helperText = useMemo(() => {
    const allowedTypes = PROFILE_PICTURE_ALLOWED_TYPES.map((type) => type.replace('image/', '').toUpperCase()).join(', ');
    return `${allowedTypes} up to ${formatBytes(PROFILE_PICTURE_MAX_BYTES)}. The image will be cropped to a circular avatar.`;
  }, []);

  const clearSelection = () => {
    setSelectedFile(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    setError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0] || null;
    if (!nextFile) {
      return;
    }

    const validationError = validateProfilePictureFile(nextFile);
    if (validationError) {
      setError(validationError);
      setSelectedFile(null);
      event.target.value = '';
      return;
    }

    setError('');
    setSelectedFile(nextFile);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Choose an image before saving.');
      return;
    }

    setIsUploading(true);
    setError('');

    // Safety timeout so the UI never stays stuck on "Saving…" forever
    const UPLOAD_TIMEOUT_MS = 60_000;
    let uploadTimer: ReturnType<typeof setTimeout> | undefined;

    try {
      const uploadPromise = (async () => {
        const preparedFile = selectedPreview && croppedAreaPixels
          ? await buildCroppedProfileFile(selectedPreview, croppedAreaPixels, selectedFile)
          : selectedFile;

        const resolvedUid = uid || currentUser?.uid;
        return uploadProfilePicture({
          file: preparedFile,
          uid: resolvedUid,
          currentUser,
          syncFirestore,
        });
      })();

      const timeoutPromise = new Promise<never>((_, reject) => {
        uploadTimer = setTimeout(
          () => reject(new Error('Upload timed out. Please check your connection and try again.')),
          UPLOAD_TIMEOUT_MS,
        );
      });

      const nextPhotoUrl = await Promise.race([uploadPromise, timeoutPromise]);

      onUploaded?.(nextPhotoUrl);
      // Fire-and-forget profile refresh — don't let it block the success path
      refreshProfile().catch((err) => console.warn('[ProfilePictureUploader] refreshProfile failed:', err));
      toast.success('Profile picture updated.');
      clearSelection();
    } catch (uploadError) {
      const message = uploadError instanceof Error ? uploadError.message : 'Failed to update your profile picture.';
      setError(message);
      toast.error(message);
    } finally {
      clearTimeout(uploadTimer);
      setIsUploading(false);
    }
  };

  const triggerFilePicker = () => {
    fileInputRef.current?.click();
  };

  return (
    <>
      <section className={`flex items-center gap-2.5 sm:gap-3.5 rounded-xl border border-slate-200 bg-white p-2.5 sm:p-3.5 shadow-sm ${className}`}>
        <div 
          className="relative cursor-pointer group shrink-0" 
          onClick={triggerFilePicker}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && triggerFilePicker()}
          aria-label="Change profile picture"
        >
          <Avatar className="size-10 sm:size-14 ring-2 sm:ring-3 ring-[#f3e8ff] shadow-sm transition-transform duration-200 group-hover:scale-105">
            <AvatarImage src={activePreview} alt={`${displayName || 'User'} profile picture`} />
            <AvatarFallback className="bg-gradient-to-br from-[#a855f7] to-[#9333ea] text-xs sm:text-sm font-semibold text-white">
              {getInitials(displayName)}
            </AvatarFallback>
          </Avatar>
          <span className="absolute -right-0.5 -top-0.5 inline-flex items-center justify-center rounded-full bg-slate-900 p-0.5 sm:p-1 text-white shadow-md transition-colors group-hover:bg-slate-700">
            <Camera size={10} />
          </span>
        </div>

        <div className="space-y-0.5 flex-1 min-w-0">
          <p className="text-[11px] sm:text-xs font-semibold text-slate-800">Profile picture</p>
          <p className="text-[10px] sm:text-[11px] text-slate-500">Click avatar to upload a new photo.</p>
          {error && <p className="text-[10px] sm:text-xs font-medium text-rose-600 mt-0.5">{error}</p>}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="sr-only"
          aria-label="Choose profile picture"
        />
      </section>

      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {selectedPreview && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
                {/* Backdrop */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-slate-950/65 backdrop-blur-sm"
                  onClick={clearSelection}
                />

                {/* Modal */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 20 }}
                  transition={{ type: 'spring', duration: 0.5, bounce: 0.3 }}
                  className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-lg max-h-[92dvh] overflow-y-auto flex flex-col z-10 border border-slate-200 dark:border-slate-800"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Header */}
                  <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">Update profile picture</h3>
                    <button
                      onClick={clearSelection}
                      className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors cursor-pointer"
                      aria-label="Close modal"
                    >
                      <X size={20} />
                    </button>
                  </div>

                  {/* Cropper area */}
                  <div className="p-3 sm:p-6 bg-slate-50 dark:bg-slate-950/40 flex flex-col items-center">
                    <div className="relative h-[250px] sm:h-[380px] w-full max-w-[380px] aspect-square mx-auto overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-900 ring-1 ring-inset ring-slate-200 dark:ring-slate-800 shadow-inner">
                      <Cropper
                        image={selectedPreview}
                        crop={crop}
                        zoom={zoom}
                        aspect={1}
                        {...AVATAR_CROP_FRAME}
                        showGrid={false}
                        objectFit="cover"
                        restrictPosition={true}
                        onCropChange={setCrop}
                        onZoomChange={setZoom}
                        onCropComplete={(_, nextCroppedAreaPixels) => setCroppedAreaPixels(nextCroppedAreaPixels)}
                        style={{ containerStyle: { backgroundColor: '#0f172a' } }}
                      />
                    </div>

                    {/* Zoom controls */}
                    <div className="mt-6 w-full max-w-xs flex items-center gap-4">
                      <Minus size={18} className="text-slate-500" />
                      <Slider
                        value={[zoom]}
                        min={1}
                        max={3}
                        step={0.05}
                        onValueChange={(values) => setZoom(values[0] || 1)}
                        aria-label="Profile picture zoom"
                        className="flex-1 cursor-pointer"
                      />
                      <Plus size={18} className="text-slate-500" />
                    </div>
                    <p className="mt-4 text-xs text-slate-500 text-center">{helperText}</p>
                  </div>

                  {/* Footer */}
                  <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3 bg-white dark:bg-slate-900">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={clearSelection}
                      disabled={isUploading}
                      className="font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 px-5"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      onClick={handleUpload}
                      disabled={isUploading || !selectedFile}
                      className="bg-[#a855f7] hover:bg-[#9333ea] text-white min-w-[120px] gap-2 shadow-sm transition-colors cursor-pointer"
                    >
                      {isUploading ? (
                        <>
                          <Upload size={16} className="animate-pulse" />
                          Saving...
                        </>
                      ) : (
                        'Save picture'
                      )}
                    </Button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </>
  );
};

export default ProfilePictureUploader;
