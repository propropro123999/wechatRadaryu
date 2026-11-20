export const WORD_IMAGE_PREFIX = 'word-images/';
export const WORD_IMAGE_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
export const MAX_WORD_IMAGE_BYTES = 3 * 1024 * 1024;

export function imageType(buffer) {
    if (buffer.length < 12) return null;
    if (buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return { mime: 'image/png', extension: 'png' };
    if (buffer.subarray(0, 3).equals(Buffer.from([255, 216, 255]))) return { mime: 'image/jpeg', extension: 'jpg' };
    if (/^GIF8[79]a$/.test(buffer.toString('latin1', 0, 6))) return { mime: 'image/gif', extension: 'gif' };
    if (buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') return { mime: 'image/webp', extension: 'webp' };
    return null;
}

export function isWordImagePath(pathname) {
    return typeof pathname === 'string' && /^word-images\/(?:production|preview|development)\/[0-9a-f-]{36}\.(?:png|jpg|gif|webp)$/.test(pathname);
}
