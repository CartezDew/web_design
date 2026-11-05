import { useEffect, useRef } from "react";
import { stagger, useAnimate, useInView } from "framer-motion";
import { motionEnabled } from "../motion";

const ease = [0.22, 0.61, 0.36, 1];
const inViewMargin = "0px 0px -5% 0px";

function markEntered(element, key) {
  if (element) element.dataset[key] = "";
}

// The hero copy animates in pure CSS (Hero.css) so it never waits on hydration.
// This hook only sequences the illustration, which sits below the fold on phones.
export default function useHeroEntrance() {
  const [scope, animate] = useAnimate();
  const visual = useRef(null);
  const visualPlayed = useRef(false);
  const visualInView = useInView(visual, { once: true, margin: inViewMargin });

  // On phones the illustration enters later, so its sequence waits until it is visible.
  useEffect(() => {
    if (!visualInView || visualPlayed.current) return;
    visualPlayed.current = true;
    if (!motionEnabled()) {
      markEntered(visual.current, "visualEntered");
      return;
    }
    const controls = animate([
      [
        ".hero-card",
        {
          opacity: [0, 1],
          transform: [
            "perspective(900px) translateY(30px) rotateX(8deg) rotate(-3deg) scale(0.94)",
            "perspective(900px) translateY(0) rotateX(0deg) rotate(1.5deg) scale(1)",
          ],
        },
        { at: 0.1, duration: 1.05, ease },
      ],
      [
        ".hero-visual .mock-line",
        { scaleX: [0.2, 1], opacity: [0, 1] },
        { at: 0.65, delay: stagger(0.1), duration: 0.55, ease },
      ],
      [
        ".floating-note--top",
        {
          opacity: [0, 1],
          transform: [
            "translateY(16px) rotate(1deg) scale(0.92)",
            "translateY(0) rotate(1deg) scale(1)",
          ],
        },
        { at: 0.65, duration: 0.6, ease },
      ],
      [
        ".floating-note--side",
        {
          opacity: [0, 1],
          transform: [
            "translateY(-50%) translateY(16px) rotate(-1deg) scale(0.92)",
            "translateY(-50%) translateY(0px) rotate(-1deg) scale(1)",
          ],
        },
        { at: 0.83, duration: 0.6, ease },
      ],
      [
        ".floating-note--bottom",
        {
          opacity: [0, 1],
          transform: [
            "translateY(16px) rotate(-1deg) scale(0.92)",
            "translateY(0) rotate(-1deg) scale(1)",
          ],
        },
        { at: 1.01, duration: 0.6, ease },
      ],
    ]);
    controls.then(() => markEntered(visual.current, "visualEntered"));
    return () => {
      controls.complete();
      markEntered(visual.current, "visualEntered");
    };
  }, [visualInView, animate]);

  return [scope, visual];
}
