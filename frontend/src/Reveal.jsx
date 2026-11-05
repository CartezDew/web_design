import { useEffect, useRef } from "react";
import { motionEnabled } from "./motion";

const DURATION = 800;
const EASING = "cubic-bezier(0.16, 1, 0.3, 1)";
const STAGGER = 0.09;
const MAX_STAGGER = 0.45;
// "deal" reveals (cards falling into place) hand the motion to CSS and stagger
// further, so a whole stack entering together still lands one card at a time.
const DEAL_STAGGER = 0.08;
const DEAL_MAX_STAGGER = 0.96;

const settings = new WeakMap();
let observer;

function play(element, index) {
  const { delay, distance, direction, scale, effect } = settings.get(element);
  if (effect === "deal") {
    const wait = Math.min(index * DEAL_STAGGER, DEAL_MAX_STAGGER);
    element.style.setProperty("--reveal-delay", `${(delay + wait) * 1000}ms`);
    element.dataset.revealed = "";
    return;
  }
  const wait = Math.min(index * STAGGER, MAX_STAGGER);
  const motion = window.matchMedia("(max-width: 760px)").matches
    ? "up"
    : direction;
  const offset =
    motion === "left"
      ? `${-distance}px 0`
      : motion === "right"
        ? `${distance}px 0`
        : `0 ${distance}px`;
  element.dataset.revealed = "";
  element.animate?.(
    [
      { opacity: 0, translate: offset, scale: String(scale) },
      { opacity: 1, translate: "0 0", scale: "1" },
    ],
    {
      duration: DURATION,
      delay: (delay + wait) * 1000,
      easing: EASING,
      fill: "backwards",
    },
  );
}

// One observer for every reveal so elements entering in the same frame can be staggered together.
function getObserver() {
  observer ??= new IntersectionObserver(
    (entries) => {
      entries
        .filter((entry) => entry.isIntersecting)
        .sort(
          (a, b) =>
            a.boundingClientRect.top - b.boundingClientRect.top ||
            a.boundingClientRect.left - b.boundingClientRect.left,
        )
        .forEach((entry, index) => {
          observer.unobserve(entry.target);
          play(entry.target, index);
        });
    },
    { rootMargin: "0px 0px -5% 0px", threshold: 0 },
  );
  return observer;
}

export default function Reveal({
  as: Element = "div",
  delay = 0,
  distance = 28,
  direction = "up",
  scale = 1,
  effect = "rise",
  children,
  ...props
}) {
  const ref = useRef(null);
  useEffect(() => {
    const element = ref.current;
    if (!element || "revealed" in element.dataset || !motionEnabled()) return;
    settings.set(element, { delay, distance, direction, scale, effect });
    const io = getObserver();
    io.observe(element);
    return () => io.unobserve(element);
  }, [delay, distance, direction, scale, effect]);
  return (
    <Element
      ref={ref}
      data-reveal=""
      data-reveal-effect={effect === "rise" ? undefined : effect}
      {...props}
    >
      {children}
    </Element>
  );
}
