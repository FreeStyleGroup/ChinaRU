/** Форматы изображений оформления (баннер, логотип, обложки разделов). */
export type WebImageMime = 'image/jpeg' | 'image/png' | 'image/webp';

/**
 * Тип изображения по сигнатуре содержимого, а не по заявленному браузером
 * Content-Type: заголовок multipart подставляет клиент, и под «image/png» можно
 * прислать что угодно. Файл раздаётся с типом, определённым здесь. null — не
 * JPEG, не PNG и не WebP.
 */
export function detectImageMime(buf: Buffer): WebImageMime | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return 'image/jpeg';
  }
  if (
    buf.length >= 8 &&
    buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return 'image/png';
  }
  if (
    buf.length >= 12 &&
    buf.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buf.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return 'image/webp';
  }
  return null;
}
