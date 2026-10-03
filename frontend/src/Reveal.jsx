import { useEffect, useRef } from "react";
import { motionEnabled } from "./motion";

const DURATION = 800;
const EASING = "cubic-bezier(0.16, 1, 0.3, 1)";
const STAGGER = 0.09;
const MAX_STAGGER = 0.45;

const settings = new WeakMap();
let observer;

function play(element, wait) {
  const { delay, distance, direction, scale } = settings.get(element);
  const offset =
    direction === "left"
      ? `${-distance}px 0`
      : direction === "right"
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
          play(entry.target, Math.min(index * STAGGER, MAX_STAGGER));
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
  children,
  ...props
}) {
  const ref = useRef(null);
  useEffect(() => {
    const element = ref.current;
    if (!element || "revealed" in element.dataset || !motionEnabled()) return;
    settings.set(element, { delay, distance, direction, scale });
    const io = getObserver();
    io.observe(element);
    return () => io.unobserve(element);
  }, [delay, distance, direction, scale]);
  return (
    <Element ref={ref} data-reveal="" {...props}>
      {children}
    </Element>
  );
}
