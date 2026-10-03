// Runs in <head> before first paint so reveal targets start hidden instead of flashing.
// If the app never hydrates, the failsafe drops the class and the prerendered content shows.
export const motionBootScript = `(function(){var d=document.documentElement;if(!("IntersectionObserver" in window)||matchMedia("(prefers-reduced-motion: reduce)").matches)return;d.classList.add("motion");window.__motionFailsafe=setTimeout(function(){d.classList.remove("motion")},2500)})();`;

export function confirmMotion() {
  clearTimeout(window.__motionFailsafe);
}

export function motionEnabled() {
  return (
    typeof document !== "undefined" &&
    document.documentElement.classList.contains("motion") &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}
