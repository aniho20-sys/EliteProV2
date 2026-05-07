export const isSafeUrl = (url) => /^https?:\/\//i.test(url?.trim() || '');
export const isYouTube = (url) => /youtu\.?be/i.test(url);
export const getYouTubeId = (url) => {
  const m = url?.match(/(?:youtu\.be\/|[?&]v=|embed\/|shorts\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
};
