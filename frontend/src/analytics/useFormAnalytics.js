import { useRef } from "react";
import { track } from "./client";

export function useFormAnalytics(formType, stepId) {
  const started = useRef(false);
  const start = () => {
    if (started.current) return;
    if (track("form_start", { form_type: formType, step_id: stepId })) {
      started.current = true;
      track("form_step_view", { form_type: formType, step_id: stepId });
    }
  };
  return { start };
}
