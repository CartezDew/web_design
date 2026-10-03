import { useEffect, useRef } from "react";
export default function Reveal({
  as: Element = "div",
  delay = 0,
  children,
  ...props
}) {
  const ref = useRef(null);
  useEffect(() => {
    if (
      !ref.current ||
      !("IntersectionObserver" in window) ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.animate?.(
              [
                { opacity: 0, transform: "translateY(22px)" },
                { opacity: 1, transform: "translateY(0)" },
              ],
              {
                duration: 600,
                delay: delay * 1000,
                easing: "cubic-bezier(.22,.61,.36,1)",
                fill: "backwards",
              },
            );
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 },
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [delay]);
  return (
    <Element ref={ref} {...props}>
      {children}
    </Element>
  );
}
