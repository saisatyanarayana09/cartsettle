import * as React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const PromptCtx = React.createContext<{ submit: (text?: string) => void }>({ submit: () => {} });

export const PromptInput = ({
  onSubmit,
  className,
  children,
  ...props
}: Omit<React.FormHTMLAttributes<HTMLFormElement>, "onSubmit"> & {
  onSubmit?: (payload: { text: string }) => void;
}) => {
  const formRef = React.useRef<HTMLFormElement | null>(null);

  const handleSubmit = (e?: React.FormEvent, overrideText?: string) => {
    e?.preventDefault();
    if (typeof overrideText === "string" && overrideText.trim()) {
      onSubmit?.({ text: overrideText });
      return;
    }
    const field = formRef.current?.querySelector("textarea, input") as HTMLTextAreaElement | HTMLInputElement | null;
    const text = field?.value || "";
    onSubmit?.({ text });
  };

  return (
    <PromptCtx.Provider value={{ submit: (t?: string) => handleSubmit(undefined, t) }}>
      <form
        ref={formRef}
        onSubmit={handleSubmit}
        className={cn("w-full", className)}
        {...props}
      >
        <div
          data-slot="input-group"
          className="flex flex-col rounded-xl border border-border bg-muted/50 dark:bg-slate-900/50 transition-colors focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500/20"
        >
          {children}
        </div>
      </form>
    </PromptCtx.Provider>
  );
};

export const PromptInputTextarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, onKeyDown, ...props }, ref) => {
  const { submit } = React.useContext(PromptCtx);
  return (
    <textarea
      ref={ref}
      rows={1}
      onKeyDown={(e) => {
        if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
          e.preventDefault();
          submit();
        }
        onKeyDown?.(e);
      }}
      className={cn(
        "w-full resize-none bg-transparent px-3.5 py-2.5 text-sm outline-none placeholder:text-muted-foreground disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
});
PromptInputTextarea.displayName = "PromptInputTextarea";

export const PromptInputFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex items-center justify-between gap-2 px-2 pb-2", className)} {...props} />
);

export const PromptInputButton = ({
  tooltip,
  className,
  ...props
}: React.ComponentProps<typeof Button> & { tooltip?: string }) => (
  <Button type="button" variant="ghost" size="icon-sm" title={tooltip} className={className} {...props} />
);

export const PromptInputSubmit = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<typeof Button> & { status?: string }
>(({ status, className, children, ...props }, ref) => (
  <Button ref={ref} type="submit" size="icon-sm" className={className} {...props}>
    {children}
  </Button>
));
PromptInputSubmit.displayName = "PromptInputSubmit";

