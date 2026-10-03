import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Dialog, Heading, Modal, ModalOverlay } from "react-aria-components";
import { X } from "lucide-react";
import "./IntakeModal.css";

const MotionOverlay = motion.create(ModalOverlay);
const MotionModal = motion.create(Modal);

export default function IntakeModal({
  open,
  onClose,
  returnFocusRef,
  children,
}) {
  const reduceMotion = useReducedMotion();
  const transition = {
    duration: reduceMotion ? 0 : 0.2,
    ease: [0.22, 0.61, 0.36, 1],
  };
  return (
    <AnimatePresence
      onExitComplete={() =>
        // React Aria restores its focus scope when the exiting overlay unmounts.
        // Restore the explicit trigger after that cleanup has completed.
        requestAnimationFrame(() =>
          requestAnimationFrame(() =>
            returnFocusRef?.current?.focus({ preventScroll: true }),
          ),
        )
      }
    >
      {open && (
        <MotionOverlay
          isOpen
          isDismissable
          onOpenChange={(isOpen) => {
            if (!isOpen) onClose();
          }}
          className="intake-modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={transition}
        >
          <MotionModal
            className="intake-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={transition}
          >
            <Dialog className="intake-modal-dialog">
              <header className="intake-modal-header">
                <div>
                  <p>Project intake</p>
                  <Heading slot="title">Tell me what you’re building.</Heading>
                  <span>
                    Share what you know. We’ll work through the rest together.
                  </span>
                </div>
                <button
                  type="button"
                  className="intake-modal-close"
                  aria-label="Close project intake"
                  onClick={onClose}
                >
                  <X size={20} />
                </button>
              </header>
              {children}
            </Dialog>
          </MotionModal>
        </MotionOverlay>
      )}
    </AnimatePresence>
  );
}
