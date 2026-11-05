import { useEffect, useSyncExternalStore } from "react";

// React Aria (~80 KB brotli) only powers widgets far below the fold or behind
// a click, so it loads on approach or intent instead of with the first paint.
let loaded = null;
let pending = null;
const listeners = new Set();

export function loadAriaControls() {
  pending ??= import("./AriaControls.jsx").then(
    (module) => {
      loaded = module;
      listeners.forEach((listener) => listener());
      return module;
    },
    (error) => {
      // Let a later trigger retry; the native stand-ins keep working meanwhile.
      pending = null;
      throw error;
    },
  );
  return pending;
}

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// Null on the server, during hydration, and until the chunk arrives, so the
// prerendered HTML and the first client render always match.
export function useAriaControls() {
  return useSyncExternalStore(
    subscribe,
    () => loaded,
    () => null,
  );
}

const preload = () => loadAriaControls().catch(() => {});

// Starts loading once the element comes within `margin` of the viewport, or
// when the visitor points at or focuses inside it, whichever happens first.
export function usePreloadAriaControls(ref, margin = "1200px 0px") {
  useEffect(() => {
    const element = ref.current;
    if (!element || loaded) return undefined;
    const events = ["pointerover", "focusin", "touchstart"];
    events.forEach((name) =>
      element.addEventListener(name, preload, { once: true, passive: true }),
    );
    let observer;
    if ("IntersectionObserver" in window) {
      observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((entry) => entry.isIntersecting)) {
            observer.disconnect();
            preload();
          }
        },
        { rootMargin: margin },
      );
      observer.observe(element);
    }
    return () => {
      observer?.disconnect();
      events.forEach((name) => element.removeEventListener(name, preload));
    };
  }, [ref, margin]);
}
