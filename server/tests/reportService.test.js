import { describe, expect, it } from 'vitest';
import { createReportService } from '../src/modules/tickets/report.service.js';

describe('report storage cleanup', () => {
  it('removes an uploaded photo when the database transaction fails', async () => {
    const removedPaths = [];
    const db = {
      query: async (query) => {
        if (query.includes('FROM categories')) {
          return { rows: [{ id: 1, code: 'FOOTPATH_ENCROACHMENT', name: 'Footpath Encroachment' }] };
        }
        if (query.includes('FROM wards')) {
          return { rows: [{ id: 1, name: 'Sample Ward A' }] };
        }
        if (query.includes('FROM staff')) {
          return { rows: [{ id: '00000000-0000-4000-8000-000000000001' }] };
        }
        if (query.includes('nextval')) {
          return { rows: [{ id: 99 }] };
        }
        throw new Error('Unexpected query');
      },
      withTransaction: async () => {
        throw new Error('database write failed');
      }
    };
    const mediaService = {
      clean: async () => ({ buffer: Buffer.from('clean'), contentType: 'image/jpeg', sizeBytes: 5 }),
      uploadOriginal: async () => ({
        storagePath: 'tickets/99/clean.jpg',
        contentType: 'image/jpeg',
        sizeBytes: 5
      }),
      remove: async (path) => removedPaths.push(path)
    };
    const reportService = createReportService({
      db,
      mediaService,
      geocoder: { reverse: async () => ({ street: null, area: null }) }
    });

    await expect(reportService.create({
      categoryCode: 'FOOTPATH_ENCROACHMENT',
      description: 'Test report',
      lat: 12.972,
      lng: 77.593,
      file: { buffer: Buffer.from('source') }
    })).rejects.toThrow('database write failed');

    expect(removedPaths).toEqual(['tickets/99/clean.jpg']);
  });
});
