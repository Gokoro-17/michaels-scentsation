import { useEffect, useState, type RefObject } from 'react';

export type HeaderScrollState = {
  lastY: number;
  anchorY: number;
  direction: 'up' | 'down' | null;
  hidden: boolean;
};

export function initialHeaderScroll(y = 0): HeaderScrollState {
  return { lastY: y, anchorY: y, direction: null, hidden: false };
}

export function nextHeaderScroll(
  state: HeaderScrollState,
  scrollY: number,
  pinned = false,
  topThreshold = 88,
): HeaderScrollState {
  const y = Math.max(0, scrollY);
  if (pinned || y <= topThreshold) return initialHeaderScroll(y);
  if (y === state.lastY) return state;

  const direction = y > state.lastY ? 'down' : 'up';
  let anchorY = direction === state.direction ? state.anchorY : state.lastY;
  let hidden = state.hidden;
  const threshold = direction === 'down' ? 12 : 8;
  if (Math.abs(y - anchorY) >= threshold) {
    hidden = direction === 'down';
    anchorY = y;
  }
  return { lastY: y, anchorY, direction, hidden };
}

export function useAutoHideHeader(
  header: RefObject<HTMLElement | null>,
  pinned: boolean,
  routeKey: string,
) {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const element = header.current;
    let frame = 0;
    let keyboardMode = false;
    const position = () =>
      Math.min(
        Math.max(0, window.scrollY),
        Math.max(0, document.documentElement.scrollHeight - window.innerHeight),
      );
    let state = initialHeaderScroll(position());
    setHidden(false);

    const reveal = () => {
      state = initialHeaderScroll(position());
      setHidden(false);
    };
    const update = () => {
      frame = 0;
      const interacting =
        pinned ||
        !!element?.querySelector('details[open]') ||
        (keyboardMode && !!element?.contains(document.activeElement));
      state = nextHeaderScroll(
        state,
        position(),
        interacting,
        element?.offsetHeight || 88,
      );
      setHidden(state.hidden);
    };
    const scroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    const keyboard = () => {
      keyboardMode = true;
    };
    const pointer = () => {
      keyboardMode = false;
    };

    window.addEventListener('scroll', scroll, { passive: true });
    window.addEventListener('resize', reveal);
    window.addEventListener('keydown', keyboard);
    window.addEventListener('pointerdown', pointer, { passive: true });
    element?.addEventListener('focusin', reveal);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('scroll', scroll);
      window.removeEventListener('resize', reveal);
      window.removeEventListener('keydown', keyboard);
      window.removeEventListener('pointerdown', pointer);
      element?.removeEventListener('focusin', reveal);
    };
  }, [header, pinned, routeKey]);

  return hidden;
}
