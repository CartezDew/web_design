import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import "./MobileCTA.css";

// Phone-only sticky CTA. Appears once the hero leaves view and steps aside while the
// booking or intake form is on screen, so it never covers the thing it points to.
const watched = ["top", "book", "start-a-project", "contact"];

export default function MobileCTA({ onPlan }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!("IntersectionObserver" in window)) return;
    const onScreen = new Set();
    const io = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) onScreen.add(entry.target.id);
        else onScreen.delete(entry.target.id);
      }
      setVisible(onScreen.size === 0);
    });
    for (const id of watched) {
      const element = document.getElementById(id);
      if (element) io.observe(element);
    }
    return () => io.disconnect();
  }, []);
  return (
    <div className="mobile-cta" data-visible={visible || undefined}>
      <Link
        className="button button--red"
        to="/#start-a-project"
        aria-haspopup="dialog"
        tabIndex={visible ? 0 : -1}
        aria-hidden={!visible || undefined}
        data-analytics-id="cta_mobile_plan"
        onClick={(event) => {
          if (onPlan) {
            event.preventDefault();
            onPlan(event.currentTarget);
          }
        }}
      >
        Plan your website <ArrowRight size={18} />
      </Link>
    </div>
  );
}
