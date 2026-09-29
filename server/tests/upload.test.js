import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { cleanPhoto } from '../src/modules/media/media.service.js';

describe('photo cleaning', () => {
  it('writes an upright JPEG without EXIF metadata', async () => {
    const source = await sharp({
      create: { width: 20, height: 10, channels: 3, background: '#336699' }
    })
      .withMetadata({ exif: { IFD0: { Artist: 'Test photographer' } } })
      .png()
      .toBuffer();

    const result = await cleanPhoto({ buffer: source });
    const metadata = await sharp(result.buffer).metadata();

    expect(result.contentType).toBe('image/jpeg');
    expect(metadata.format).toBe('jpeg');
    expect(metadata.exif).toBeUndefined();
  });

  it.each([
    [Buffer.alloc(0)],
    [Buffer.from('not a photo')]
  ])('refuses an invalid image', async (buffer) => {
    await expect(cleanPhoto({ buffer })).rejects.toMatchObject({
      status: 415,
      code: 'INVALID_PHOTO'
    });
  });
});
