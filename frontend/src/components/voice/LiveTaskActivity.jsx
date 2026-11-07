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
      className="assistant-task-activity-container px-4 pt-2.5 pb-1"
    >
      <div
        className={`assistant-task-pill flex-col items-stretch p-3 rounded-2xl border transition-all duration-300 shadow-sm ${
          isSuccess
            ? "border-emerald-500/30 bg-card/85 dark:bg-white/[0.08] backdrop-blur-xl"
            : isError
            ? "border-rose-500/30 bg-card/85 dark:bg-white/[0.08] backdrop-blur-xl"
            : "border-border/50 bg-card/85 dark:bg-white/[0.08] backdrop-blur-xl"
        }`}
      >
        {/* Top Slim Progress Bar */}
        <div className="w-full h-1 bg-black/5 dark:bg-white/10 rounded-full overflow-hidden mb-2.5">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              isSuccess
                ? "w-full bg-emerald-500"
                : isError
                ? "w-full bg-rose-500"
                : "w-3/5 bg-foreground/40 dark:bg-white/50 animate-pulse"
            }`}
          />
        </div>

        {/* Task Icon & Label */}
        <div className="flex items-center gap-2.5">
          {isProcessing && (
            <Loader2 className="size-4 animate-spin text-primary shrink-0" />
          )}
          {isSuccess && (
            <div className="size-4.5 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-sm">
              <Check className="size-3 text-white stroke-[3]" />
            </div>
          )}
          {isError && (
            <div className="size-4.5 rounded-full bg-rose-500 text-white flex items-center justify-center shrink-0 shadow-sm">
              <AlertCircle className="size-3 text-white stroke-[3]" />
            </div>
          )}
          <span className="truncate text-xs sm:text-sm font-medium text-foreground tracking-tight">
            {task.label}
          </span>
        </div>
      </div>
    </div>
  );
}

export default LiveTaskActivity;
