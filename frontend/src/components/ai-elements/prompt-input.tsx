import * as React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const PromptCtx = React.createContext<{ submit: () => void }>({ submit: () => {} });

export const PromptInput = ({
  onSubmit,
  className,
  children,
  ...props
}: Omit<React.FormHTMLAttributes<HTMLFormElement>, "onSubmit"> & {
  onSubmit?: (payload: { text: string }) => void;
}) => {
  const formRef = React.useRef<HTMLFormElement | null>(null);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const textarea = formRef.current?.querySelector("textarea");
    const text = textarea?.value || "";
    onSubmit?.({ text });
  };

  return (
    <PromptCtx.Provider value={{ submit: () => handleSubmit() }}>
      <form
        ref={formRef}
        onSubmit={handleSubmit}
        className={cn("w-full", className)}
        {...props}
      >
        <div
          data-slot="input-group"
          className="flex flex-col rounded-lg border border-border bg-muted transition-colors focus-within:border-primary"
        >
          {children}
        </div>
      </form>
    </PromptCtx.Provider>
  );
};

export const PromptInputTextarea = ({
  className,
  onKeyDown,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => {
  const { submit } = React.useContext(PromptCtx);
  return (
    <textarea
      rows={1}
      onKeyDown={(e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          submit();
        }
        onKeyDown?.(e);
      }}
      className={cn(
        "w-full resize-none bg-transparent px-3 py-2.5 text-sm outline-none placeholder:text-muted-foreground disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
};

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

export const PromptInputSubmit = ({
  status,
  className,
  children,
  ...props
}: React.ComponentProps<typeof Button> & { status?: string }) => (
  <Button type="submit" size="icon-sm" className={className} {...props}>
    {children}
  </Button>
);
