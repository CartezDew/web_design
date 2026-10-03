import { useEffect, useRef } from "react";
import { stagger, useAnimate, useInView } from "framer-motion";
import { motionEnabled } from "../motion";

const ease = [0.22, 0.61, 0.36, 1];
const inViewMargin = "0px 0px -5% 0px";

function markEntered(element, key) {
  if (element) element.dataset[key] = "";
}

export default function useHeroEntrance() {
  const [scope, animate] = useAnimate();
  const visual = useRef(null);
  const copyPlayed = useRef(false);
  const visualPlayed = useRef(false);
  const copyInView = useInView(scope, { once: true, margin: inViewMargin });
  const visualInView = useInView(visual, { once: true, margin: inViewMargin });

  // Hero.css keeps these parts hidden until the sequence finishes; the sequence's own
  // inline styles take over while it plays.
  useEffect(() => {
    if (!copyInView || copyPlayed.current) return;
    copyPlayed.current = true;
    if (!motionEnabled()) {
      markEntered(scope.current, "copyEntered");
      return;
    }
    const controls = animate([
      [
        ".hero-eyebrow",
        { opacity: [0, 1], y: [12, 0] },
        { at: 0, duration: 0.45, ease },
      ],
      [
        ".hero-headline-word",
        { opacity: [0, 1], y: [24, 0], filter: ["blur(5px)", "blur(0px)"] },
        { at: 0.12, delay: stagger(0.075), duration: 0.6, ease },
      ],
      [
        ".hero-growth-word",
        { opacity: [0, 1, 1, 1], scale: [0.3, 0.6, 1.12, 1] },
        { at: 0.55, duration: 1.25, times: [0, 0.26, 0.78, 1], ease },
      ],
      [
        ".hero-intro",
        { opacity: [0, 1], y: [15, 0] },
        { at: 0.65, duration: 0.55, ease },
      ],
      [
        ".hero-actions > *",
        { opacity: [0, 1], y: [12, 0] },
        { at: 0.82, delay: stagger(0.09), duration: 0.5, ease },
      ],
      [".trust-row", { opacity: [0, 1] }, { at: 1.05, duration: 0.5 }],
    ]);
    controls.then(() => markEntered(scope.current, "copyEntered"));
    return () => {
      controls.complete();
      markEntered(scope.current, "copyEntered");
    };
  }, [copyInView, animate, scope]);

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
            "perspective(900px) translateY(30px) rotateX(8deg) rotate(-4deg) scale(0.94)",
            "perspective(900px) translateY(0) rotateX(0deg) rotate(2deg) scale(1)",
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
            "translateY(16px) rotate(2deg) scale(0.92)",
            "translateY(0) rotate(2deg) scale(1)",
          ],
        },
        { at: 0.65, duration: 0.6, ease },
      ],
      [
        ".floating-note--side",
        {
          opacity: [0, 1],
          transform: [
            "translateY(-50%) translateY(16px) rotate(-2deg) scale(0.92)",
            "translateY(-50%) translateY(0px) rotate(-2deg) scale(1)",
          ],
        },
        { at: 0.83, duration: 0.6, ease },
      ],
      [
        ".floating-note--bottom",
        {
          opacity: [0, 1],
          transform: [
            "translateY(16px) rotate(-2deg) scale(0.92)",
            "translateY(0) rotate(-2deg) scale(1)",
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
