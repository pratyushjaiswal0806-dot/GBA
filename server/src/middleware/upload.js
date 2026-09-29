import multer from 'multer';
import { ApiError } from '../utils/ApiError.js';

const bytesPerMegabyte = 1024 * 1024;

export function createPhotoUpload({ maxUploadMb }) {
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: maxUploadMb * bytesPerMegabyte, files: 1 }
  }).single('photo');

  return (request, response, next) => {
    upload(request, response, (error) => {
      if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
        next(new ApiError(413, 'PHOTO_TOO_LARGE', `Photo must be ${maxUploadMb} MB or smaller.`));
        return;
      }

      if (error instanceof multer.MulterError) {
        next(new ApiError(400, 'INVALID_UPLOAD', 'Submit one photo using the photo field.'));
        return;
      }

      next(error);
    });
  };
}
