import * as React from "react";
import { CheckCircleIcon, ChevronDownIcon, WrenchIcon, XCircleIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const ToolOpenCtx = React.createContext<{ open: boolean; setOpen: React.Dispatch<React.SetStateAction<boolean>> }>({
  open: false,
  setOpen: () => {},
});

export const Tool = ({
  defaultOpen = false,
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { defaultOpen?: boolean }) => {
  const [open, setOpen] = React.useState(defaultOpen);
  return (
    <ToolOpenCtx.Provider value={{ open, setOpen }}>
      <div
        data-state={open ? "open" : "closed"}
        className={cn("group not-prose mb-4 w-full rounded-md border border-border", className)}
        {...props}
      >
        {children}
      </div>
    </ToolOpenCtx.Provider>
  );
};

export const ToolHeader = ({
  className,
  title,
  toolName,
  state = "output-available",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  title?: string;
  type?: string;
  toolName?: string;
  state?: string;
}) => {
  const { open, setOpen } = React.useContext(ToolOpenCtx);
  const isError = state === "output-error";
  return (
    <button
      type="button"
      onClick={() => setOpen((o) => !o)}
      className={cn("flex w-full items-center justify-between gap-4 p-3 text-left cursor-pointer", className)}
      {...props}
    >
      <div className="flex items-center gap-2">
        <WrenchIcon className="size-4 text-muted-foreground" />
        <span className="font-medium text-sm">{title ?? toolName}</span>
        <span
          data-slot="badge"
          className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground"
        >
          {isError ? (
            <XCircleIcon className="size-3.5 text-destructive" />
          ) : (
            <CheckCircleIcon className="size-3.5 text-primary" />
          )}
          {isError ? "Error" : "Completed"}
        </span>
      </div>
      <ChevronDownIcon
        className={cn("size-4 text-muted-foreground transition-transform", open && "rotate-180")}
      />
    </button>
  );
};

export const ToolContent = ({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => {
  const { open } = React.useContext(ToolOpenCtx);
  if (!open) return null;
  return (
    <div className={cn("space-y-4 border-t border-border p-4 text-popover-foreground", className)} {...props}>
      {children}
    </div>
  );
};

export const ToolInput = ({ input, className }: { input: unknown; className?: string }) => (
  <div className={cn("space-y-1.5 overflow-hidden", className)}>
    <h4 className="font-medium text-muted-foreground text-xs uppercase tracking-wide">Parameters</h4>
    <pre className="rounded-md bg-muted/60 p-2.5 text-xs overflow-x-auto">
      {JSON.stringify(input, null, 2)}
    </pre>
  </div>
);

export const ToolOutput = ({
  output,
  errorText,
  className,
}: {
  output: unknown;
  errorText?: string;
  className?: string;
}) => {
  if (!output && !errorText) return null;
  return (
    <div className={cn("space-y-1.5", className)}>
      <h4 className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
        {errorText ? "Error" : "Result"}
      </h4>
      <pre className="rounded-md bg-muted/60 p-2.5 text-xs overflow-x-auto whitespace-pre-wrap">
        {errorText || (typeof output === "string" ? output : JSON.stringify(output, null, 2))}
      </pre>
    </div>
  );
};
