// Runs in <head> before first paint so reveal targets start hidden instead of flashing.
// If the app hasn't hydrated after 2.5s, the failsafe drops the class so the prerendered
// content shows; confirmMotion turns motion back on if the app arrives late.
export const motionBootScript = `(function(){var d=document.documentElement;if(!("IntersectionObserver" in window)||matchMedia("(prefers-reduced-motion: reduce)").matches)return;d.classList.add("motion");window.__motionFailsafe=setTimeout(function(){d.classList.remove("motion");window.__motionFailsafeFired=true},2500)})();`;

// Called from a layout effect in root.jsx, so it runs before any Reveal's (passive)
// effect checks motionEnabled(). A slow load (a phone on a weak connection, or the
// unbundled dev server) used to trip the failsafe and leave every scroll reveal off
// for the whole visit.
export function confirmMotion() {
  clearTimeout(window.__motionFailsafe);
  const root = document.documentElement;
  if (
    !window.__motionFailsafeFired ||
    root.classList.contains("motion") ||
    !("IntersectionObserver" in window) ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  )
    return;
  // Whatever is already on screen or scrolled past stays put; only content still
  // below the fold hides again and reveals as it scrolls in.
  for (const element of document.querySelectorAll(
    "[data-reveal]:not([data-revealed])",
  )) {
    if (element.getBoundingClientRect().top < window.innerHeight)
      element.dataset.revealed = "";
  }
  // The hero copy has already been read; don't replay its entrance.
  root.dataset.motionLate = "";
  root.classList.add("motion");
}

export function motionEnabled() {
  return (
    typeof document !== "undefined" &&
    document.documentElement.classList.contains("motion") &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}
