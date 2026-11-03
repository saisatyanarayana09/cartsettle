import * as React from "react";
import { ArrowDownIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ScrollCtx = React.createContext<{
  scrollRef: React.RefObject<HTMLDivElement | null>;
  isAtBottom: boolean;
  scrollToBottom: () => void;
}>({
  scrollRef: { current: null },
  isAtBottom: true,
  scrollToBottom: () => {},
});

export const Conversation = ({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { initial?: string; resize?: string }) => {
  const scrollRef = React.useRef<HTMLDivElement | null>(null);
  const [isAtBottom, setIsAtBottom] = React.useState(true);

  const scrollToBottom = React.useCallback(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
      setIsAtBottom(true);
    }
  }, []);

  return (
    <ScrollCtx.Provider value={{ scrollRef, isAtBottom, scrollToBottom }}>
      <div
        ref={scrollRef}
        role="log"
        onScroll={(e) => {
          const el = e.currentTarget;
          setIsAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight < 48);
        }}
        className={cn("relative flex-1 overflow-y-auto", className)}
        {...props}
      >
        {children}
      </div>
    </ScrollCtx.Provider>
  );
};

export const ConversationContent = ({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => {
  const { scrollToBottom } = React.useContext(ScrollCtx);
  React.useEffect(() => {
    scrollToBottom();
  }, [children, scrollToBottom]);

  return (
    <div className={cn("flex flex-col gap-8 p-4", className)} {...props}>
      {children}
    </div>
  );
};

export const ConversationScrollButton = ({
  className,
  ...props
}: React.ComponentProps<typeof Button>) => {
  const { isAtBottom, scrollToBottom } = React.useContext(ScrollCtx);
  if (isAtBottom) return null;
  return (
    <Button
      className={cn(
        "absolute bottom-4 left-[50%] translate-x-[-50%] rounded-full dark:bg-background dark:hover:bg-muted",
        className
      )}
      onClick={scrollToBottom}
      size="icon"
      type="button"
      variant="outline"
      {...props}
    >
      <ArrowDownIcon className="size-4" />
    </Button>
  );
};
