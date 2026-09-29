import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { ApiError } from '../../utils/ApiError.js';

const maximumImageWidth = 1600;
const jpegQuality = 80;

function unsupportedPhotoError() {
  return new ApiError(415, 'INVALID_PHOTO', 'Photo must be a real JPG or PNG image.');
}

export async function cleanPhoto(file) {
  if (!file?.buffer?.length) {
    throw unsupportedPhotoError();
  }

  try {
    const source = sharp(file.buffer, { failOn: 'error' });
    const metadata = await source.metadata();

    if (!['jpeg', 'png'].includes(metadata.format)) {
      throw unsupportedPhotoError();
    }

    const buffer = await source
      .rotate()
      .resize({ width: maximumImageWidth, withoutEnlargement: true })
      .jpeg({ quality: jpegQuality })
      .toBuffer();

    if (!buffer.length) {
      throw unsupportedPhotoError();
    }

    return { buffer, contentType: 'image/jpeg', sizeBytes: buffer.length };
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    throw unsupportedPhotoError();
  }
}

export function createMediaService({ storage, bucket, signedUrlSeconds }) {
  async function uploadOriginal({ ticketId, photo }) {
    const storagePath = `tickets/${ticketId}/${randomUUID()}.jpg`;
    const { error } = await storage
      .from(bucket)
      .upload(storagePath, photo.buffer, { contentType: photo.contentType, upsert: false });

    if (error) {
      throw new Error('Could not store the cleaned photo.');
    }

    return { ...photo, storagePath };
  }

  async function remove(storagePath) {
    if (!storagePath) {
      return;
    }

    await storage.from(bucket).remove([storagePath]);
  }

  async function createSignedUrl(storagePath) {
    const { data, error } = await storage
      .from(bucket)
      .createSignedUrl(storagePath, signedUrlSeconds);

    if (error || !data?.signedUrl) {
      throw new Error('Could not create a photo link.');
    }

    return data.signedUrl;
  }

  return { clean: cleanPhoto, uploadOriginal, remove, createSignedUrl };
}
