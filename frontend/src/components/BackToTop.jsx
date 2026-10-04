import { useEffect, useState } from "react";
import {
  AnimatePresence,
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
} from "framer-motion";
import { ArrowUp } from "lucide-react";
import "./BackToTop.css";

export default function BackToTop() {
  const [pastThreshold, setPastThreshold] = useState(false);
  const [footerInView, setFooterInView] = useState(false);
  const reduceMotion = useReducedMotion();
  const { scrollY } = useScroll();
  useMotionValueEvent(scrollY, "change", (y) => setPastThreshold(y > 500));
  useEffect(() => {
    const footer = document.querySelector(".site-footer");
    if (!footer || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      ([entry]) => setFooterInView(entry.isIntersecting),
      { rootMargin: "0px 0px -12% 0px", threshold: 0 },
    );
    observer.observe(footer);
    return () => observer.disconnect();
  }, []);
  const visible = pastThreshold && !footerInView;
  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          type="button"
          className="back-to-top"
          aria-label="Back to top"
          title="Back to top"
          initial={{ opacity: 0, y: reduceMotion ? 0 : 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: reduceMotion ? 0 : 6 }}
          transition={{
            duration: reduceMotion ? 0 : 0.28,
            ease: [0.22, 0.61, 0.36, 1],
          }}
          onClick={() =>
            window.scrollTo({
              top: 0,
              behavior: reduceMotion ? "instant" : "smooth",
            })
          }
        >
          <ArrowUp size={17} aria-hidden="true" />
        </motion.button>
      )}
    </AnimatePresence>
  );
}
