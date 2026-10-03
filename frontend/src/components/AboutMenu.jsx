import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronDown, UserRound, LogIn } from "lucide-react";
import "./AboutMenu.css";

export default function AboutMenu({ onNavigate, navigationOpen }) {
  const [open, setOpen] = useState(false);
  const container = useRef(null);
  const trigger = useRef(null);
  const location = useLocation();
  const reduceMotion = useReducedMotion();
  useEffect(() => setOpen(false), [location.key, navigationOpen]);
  useEffect(() => {
    if (!open) return;
    const outside = (event) => {
      if (!container.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open]);
  const close = () => {
    setOpen(false);
    onNavigate();
  };
  return (
    <div
      className="about-menu"
      ref={container}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          event.preventDefault();
          event.stopPropagation();
          setOpen(false);
          trigger.current?.focus();
        }
      }}
    >
      <button
        ref={trigger}
        type="button"
        className="about-menu-trigger"
        aria-expanded={open}
        aria-controls="about-navigation"
        onClick={() => setOpen((value) => !value)}
      >
        About <ChevronDown size={14} aria-hidden="true" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            id="about-navigation"
            className="about-menu-links"
            initial={{ opacity: 0, y: reduceMotion ? 0 : -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: reduceMotion ? 0 : -4 }}
            transition={{ duration: reduceMotion ? 0 : 0.16 }}
          >
            <Link to="/#about" onClick={close}>
              <UserRound size={16} aria-hidden="true" /> About me
            </Link>
            <Link to="/sign-in" onClick={close}>
              <LogIn size={16} aria-hidden="true" /> Client sign in
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
