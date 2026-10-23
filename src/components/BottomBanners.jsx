import { useEffect, useRef } from 'react';

// The banners that sit above the bottom navigation — "Add to Home Screen" and "Turn on
// notifications" — stacked in one place instead of each pinned to the same spot, where the
// second covered the first one's close button. The stack's height is published as
// --bottom-banners-h so the page leaves that much room under its last button: a new user
// could not reach "Save" at the foot of the workout log, or "Delete account" in Profile,
// until both banners were dismissed (audit 2026-10-23, E2).
export default function BottomBanners({ children }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    const root = document.documentElement;
    const publish = () => root.style.setProperty('--bottom-banners-h', `${el ? el.offsetHeight : 0}px`);
    publish();
    if (typeof ResizeObserver === 'undefined' || !el) return () => root.style.removeProperty('--bottom-banners-h');
    const observer = new ResizeObserver(publish);
    observer.observe(el);
    return () => { observer.disconnect(); root.style.removeProperty('--bottom-banners-h'); };
  }, []);

  return <div className="bottom-banners" ref={ref}>{children}</div>;
}
