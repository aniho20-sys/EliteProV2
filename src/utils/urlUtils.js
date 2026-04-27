export const isSafeUrl = (url) => /^https?:\/\//i.test(url?.trim() || '');
export const isYouTube = (url) => /youtu\.?be/i.test(url);
