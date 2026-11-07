import React, { useEffect, useState } from "react";
import { Check, Loader2, AlertCircle } from "lucide-react";

/**
 * LiveTaskActivity
 * Ultra-minimalist, high-performance task activity pill positioned at the
 * top of the AI Assistant. Communicates real-time agentic execution states
 * (processing, success, error) and exits with a subtle smooth transition.
 */
export function LiveTaskActivity({ task, onDismiss }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!task) {
      setVisible(false);
      return;
    }

    setVisible(true);

    if (task.state === "success") {
      const timer = setTimeout(() => {
        setVisible(false);
        onDismiss?.();
      }, 1500);
      return () => clearTimeout(timer);
    }

    if (task.state === "error") {
      const timer = setTimeout(() => {
        setVisible(false);
        onDismiss?.();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [task, onDismiss]);

  if (!task || !visible) return null;

  const isSuccess = task.state === "success";
  const isError = task.state === "error";
  const isProcessing = task.state === "processing" || !task.state;

  return (
    <div
      role="status"
      aria-live="polite"
      className="assistant-task-activity-container"
    >
      <div
        className={`assistant-task-pill ${
          isSuccess
            ? "is-success"
            : isError
            ? "is-error"
            : "is-processing"
        }`}
      >
        {isProcessing && (
          <Loader2 className="size-3.5 animate-spin text-primary shrink-0" />
        )}
        {isSuccess && (
          <Check className="size-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 stroke-[2.5]" />
        )}
        {isError && (
          <AlertCircle className="size-3.5 text-rose-500 shrink-0 stroke-[2.5]" />
        )}
        <span className="truncate">{task.label}</span>
      </div>
    </div>
  );
}

export default LiveTaskActivity;
