import { text } from '../i18n/en.js';

const maximumImageWidth = 1600;
const minimumImageDimension = 640;
const targetPhotoBytes = 1_000_000;
const compressionQualities = [0.82, 0.72, 0.62, 0.52, 0.42];
const configuredMaxUploadMb = Number(import.meta.env.VITE_MAX_UPLOAD_MB || '5');
const maximumUploadBytes = (Number.isFinite(configuredMaxUploadMb) && configuredMaxUploadMb > 0
  ? configuredMaxUploadMb
  : 5) * 1024 * 1024;

export class ImageUploadError extends Error {
  constructor(message, code) {
    super(message);
    this.name = 'ImageUploadError';
    this.code = code;
  }
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new ImageUploadError(text.upload.invalidPhoto, 'INVALID_PHOTO'));
    };
    image.src = objectUrl;
  });
}

function canvasBlob(canvas, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new ImageUploadError(text.upload.prepareFailed, 'PREPARE_FAILED'));
        return;
      }

      resolve(blob);
    }, 'image/jpeg', quality);
  });
}

function drawImage(canvas, context, image, width, height) {
  canvas.width = width;
  canvas.height = height;
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);
}

export async function prepareImageForUpload(file) {
  if (!file || file.size > maximumUploadBytes) {
    throw new ImageUploadError(text.upload.photoTooLarge, 'PHOTO_TOO_LARGE');
  }

  let image;

  try {
    image = await loadImage(file);
  } catch (error) {
    if (error instanceof ImageUploadError && error.code === 'INVALID_PHOTO') {
      return file;
    }

    throw error;
  }
  const scale = Math.min(1, maximumImageWidth / Math.max(image.naturalWidth, image.naturalHeight));
  let width = Math.max(1, Math.round(image.naturalWidth * scale));
  let height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  if (!context) {
    throw new ImageUploadError(text.upload.prepareFailed, 'PREPARE_FAILED');
  }

  let blob;

  for (let resizeAttempt = 0; resizeAttempt < 6; resizeAttempt += 1) {
    drawImage(canvas, context, image, width, height);

    for (const quality of compressionQualities) {
      blob = await canvasBlob(canvas, quality);

      if (blob.size <= targetPhotoBytes || quality === compressionQualities[compressionQualities.length - 1]) {
        break;
      }
    }

    if (blob.size <= targetPhotoBytes || Math.max(width, height) <= minimumImageDimension) {
      break;
    }

    const resizeScale = 0.75;
    width = Math.max(1, Math.round(width * resizeScale));
    height = Math.max(1, Math.round(height * resizeScale));
  }

  const baseName = file.name.replace(/\.[^.]+$/, '') || 'photo';
  return new File([blob], `${baseName}.jpg`, {
    type: 'image/jpeg',
    lastModified: file.lastModified
  });
}
