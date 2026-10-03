import { useEffect, useRef } from "react";
import { animate } from "framer-motion";

// Match main's viewport reveal timing while keeping prerendered/no-JS content visible.
export default function Reveal({
  as: Element = "div",
  delay = 0,
  distance = 26,
  direction = "up",
  scale = 1,
  once = true,
  children,
  ...props
}) {
  const ref = useRef(null);
  useEffect(() => {
    const element = ref.current;
    if (!element || !("IntersectionObserver" in window)) return;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    let animation;
    let revealed = false;
    const observer = new IntersectionObserver(
      ([entry]) => {
        element.dataset.inView = String(entry.isIntersecting);
        if (!entry.isIntersecting || preference.matches || (once && revealed))
          return;
        const from =
          direction === "left"
            ? `translateX(-${distance}px)`
            : direction === "right"
              ? `translateX(${distance}px)`
              : `translateY(${distance}px)`;
        animation?.cancel();
        animation = animate(
          element,
          {
            opacity: [0, 1],
            transform: [`${from} scale(${scale})`, "translate(0, 0) scale(1)"],
          },
          {
            duration: 0.55,
            delay,
            ease: [0.22, 0.61, 0.36, 1],
          },
        );
        revealed = true;
      },
      { threshold: 0.2, rootMargin: "0px 0px -12% 0px" },
    );
    const onPreference = () => {
      if (preference.matches) {
        animation?.cancel();
        element.style.removeProperty("opacity");
        element.style.removeProperty("transform");
      }
    };
    preference.addEventListener("change", onPreference);
    observer.observe(element);
    return () => {
      observer.disconnect();
      animation?.cancel();
      preference.removeEventListener("change", onPreference);
    };
  }, [delay, distance, direction, scale, once]);
  return (
    <Element ref={ref} data-reveal="" {...props}>
      {children}
    </Element>
  );
}
