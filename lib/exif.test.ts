import { describe, expect, test } from 'bun:test';
import { sanitizeExif } from './exif';

describe('sanitizeExif', () => {
  test('strips serial numbers, owner, and copyright tags', () => {
    const { exif } = sanitizeExif({
      Make: 'FUJIFILM',
      Model: 'X-T5',
      BodySerialNumber: 'SECRET-BODY-123',
      LensSerialNumber: 'SECRET-LENS-456',
      InternalSerialNumber: 'X',
      Artist: 'Kyle',
      CameraOwnerName: 'Kyle',
      Copyright: '(c) Kyle',
    });

    expect(exif.Make).toBe('FUJIFILM');
    expect(exif.Model).toBe('X-T5');
    expect(exif.BodySerialNumber).toBeUndefined();
    expect(exif.LensSerialNumber).toBeUndefined();
    expect(exif.InternalSerialNumber).toBeUndefined();
    expect(exif.Artist).toBeUndefined();
    expect(exif.CameraOwnerName).toBeUndefined();
    expect(exif.Copyright).toBeUndefined();
  });

  test('drops any key containing "serial" case-insensitively', () => {
    const { exif } = sanitizeExif({ SomeSerialThing: 'x', serialFoo: 'y', Keep: 'z' });
    expect(exif.SomeSerialThing).toBeUndefined();
    expect(exif.serialFoo).toBeUndefined();
    expect(exif.Keep).toBe('z');
  });

  test('drops binary blobs (embedded thumbnails, maker notes)', () => {
    const { exif } = sanitizeExif({ thumbnail: new Uint8Array([1, 2, 3]), FNumber: 2.8 });
    expect(exif.thumbnail).toBeUndefined();
    expect(exif.FNumber).toBe(2.8);
  });

  test('derives takenAt from DateTimeOriginal and normalizes to JSON', () => {
    const date = new Date('2024-06-15T18:32:10.000Z');
    const { exif, takenAt } = sanitizeExif({ DateTimeOriginal: date, ISO: 400 });
    expect(takenAt?.getTime()).toBe(date.getTime());
    // Dates inside the JSONB blob are flattened to ISO strings.
    expect(exif.DateTimeOriginal).toBe(date.toISOString());
    expect(exif.ISO).toBe(400);
  });

  test('falls back to CreateDate when DateTimeOriginal is absent', () => {
    const date = new Date('2023-01-02T03:04:05.000Z');
    const { takenAt } = sanitizeExif({ CreateDate: date });
    expect(takenAt?.getTime()).toBe(date.getTime());
  });

  test('takenAt is null when there is no usable date', () => {
    expect(sanitizeExif({}).takenAt).toBeNull();
    expect(sanitizeExif({ DateTimeOriginal: 'not-a-date' }).takenAt).toBeNull();
  });
});
