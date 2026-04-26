import React, { useEffect, useMemo, useRef, useState } from 'react';
import Cropper from 'react-easy-crop';
import type { Area } from 'react-easy-crop';
import { Camera, Check, ImagePlus, Minus, Move, Plus, Upload, X } from 'lucide-react';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Button } from './ui/button';
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

  let blob: Blob;
  try {
    blob = await canvasToBlob(canvas, 'image/webp', 0.92);
  } catch {
    blob = await canvasToBlob(canvas, 'image/jpeg', 0.92);
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
    return `${allowedTypes} up to ${formatBytes(PROFILE_PICTURE_MAX_BYTES)}. The image will be cropped to a square avatar.`;
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

    try {
      const preparedFile = selectedPreview && croppedAreaPixels
        ? await buildCroppedProfileFile(selectedPreview, croppedAreaPixels, selectedFile)
        : selectedFile;

      const resolvedUid = uid || currentUser?.uid;
      const nextPhotoUrl = await uploadProfilePicture({
        file: preparedFile,
        uid: resolvedUid,
        currentUser,
        syncFirestore,
      });

      onUploaded?.(nextPhotoUrl);
      await refreshProfile();
      toast.success('Profile picture updated.');
      clearSelection();
    } catch (uploadError) {
      const message = uploadError instanceof Error ? uploadError.message : 'Failed to update your profile picture.';
      setError(message);
      toast.error(message);
    } finally {
      setIsUploading(false);
    }
  };

  const triggerFilePicker = () => {
    fileInputRef.current?.click();
  };

  return (
    <section className={`rounded-2xl border border-slate-200 bg-white p-4 shadow-sm ${className}`}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Avatar className="size-20 ring-4 ring-sky-100 shadow-sm">
              <AvatarImage src={activePreview} alt={`${displayName || 'User'} profile picture`} />
              <AvatarFallback className="bg-gradient-to-br from-sky-600 to-cyan-500 text-lg font-semibold text-white">
                {getInitials(displayName)}
              </AvatarFallback>
            </Avatar>

            {selectedFile ? (
              <span className="absolute -right-1 -top-1 inline-flex items-center justify-center rounded-full bg-emerald-500 p-1 text-white shadow-md">
                <Check size={12} />
              </span>
            ) : (
              <span className="absolute -right-1 -top-1 inline-flex items-center justify-center rounded-full bg-slate-900 p-1 text-white shadow-md">
                <Camera size={12} />
              </span>
            )}
          </div>

          <div className="space-y-1">
            <p className="text-sm font-semibold text-slate-900">Profile picture</p>
            <p className="text-sm text-slate-500">Preview, crop, and upload a new avatar.</p>
            <p className="text-xs text-slate-400">{helperText}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="sr-only"
            aria-label="Choose profile picture"
          />

          <Button type="button" variant="outline" onClick={triggerFilePicker} className="gap-2">
            <ImagePlus size={16} />
            Choose image
          </Button>

          <Button type="button" onClick={handleUpload} disabled={!selectedFile || isUploading} className="gap-2">
            {isUploading ? (
              <>
                <Upload size={16} className="animate-pulse" />
                Uploading...
              </>
            ) : (
              <>
                <Upload size={16} />
                Save picture
              </>
            )}
          </Button>

          {selectedFile ? (
            <Button type="button" variant="ghost" onClick={clearSelection} disabled={isUploading} className="gap-2">
              <X size={16} />
              Clear
            </Button>
          ) : null}
        </div>
      </div>

      {selectedPreview ? (
        <div className="mt-4 space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="relative h-64 w-full overflow-hidden rounded-xl border border-slate-300 bg-slate-900 sm:h-72">
            <Cropper
              image={selectedPreview}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape="rect"
              showGrid
              objectFit="cover"
              restrictPosition={false}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={(_, nextCroppedAreaPixels) => setCroppedAreaPixels(nextCroppedAreaPixels)}
            />
          </div>

          <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-3 sm:flex-row sm:items-center">
            <div className="inline-flex items-center gap-2 text-sm text-slate-700">
              <Move size={14} className="text-slate-500" />
              Drag to reposition
            </div>

            <div className="flex flex-1 items-center gap-2">
              <Minus size={14} className="text-slate-500" />
              <Slider
                value={[zoom]}
                min={1}
                max={3}
                step={0.05}
                onValueChange={(values) => setZoom(values[0] || 1)}
                aria-label="Profile picture zoom"
                className="flex-1"
              />
              <Plus size={14} className="text-slate-500" />
            </div>
          </div>
        </div>
      ) : null}

      {selectedFile ? (
        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          <span className="font-medium text-slate-900">Selected file:</span> {selectedFile.name} · {formatBytes(selectedFile.size)}
        </div>
      ) : null}

      {error ? (
        <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700" role="alert" aria-live="polite">
          {error}
        </div>
      ) : null}
    </section>
  );
};

export default ProfilePictureUploader;
