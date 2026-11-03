import * as React from "react";
import { cn } from "@/lib/utils";

interface DropdownContextValue {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const DropdownContext = React.createContext<DropdownContextValue>({
  open: false,
  setOpen: () => {},
});

export function DropdownMenu({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <DropdownContext.Provider value={{ open, setOpen }}>
      <div ref={containerRef} className="relative inline-flex">
        {children}
      </div>
    </DropdownContext.Provider>
  );
}

export function DropdownMenuTrigger({
  asChild,
  children,
  ...props
}: {
  asChild?: boolean;
  children: React.ReactElement<any>;
  [key: string]: any;
}) {
  const { open, setOpen } = React.useContext(DropdownContext);
  const handleClick = (event: React.MouseEvent) => {
    children.props?.onClick?.(event);
    setOpen((prev) => !prev);
  };
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      ...props,
      "aria-expanded": open,
      "data-state": open ? "open" : "closed",
      onClick: handleClick,
    });
  }
  return (
    <button
      type="button"
      aria-expanded={open}
      data-state={open ? "open" : "closed"}
      onClick={handleClick}
      {...props}
    >
      {children}
    </button>
  );
}

export function DropdownMenuContent({
  align = "end",
  className = "",
  children,
  ...props
}: {
  align?: "start" | "center" | "end";
  className?: string;
  children: React.ReactNode;
  [key: string]: any;
}) {
  const { open } = React.useContext(DropdownContext);
  if (!open) return null;
  const alignClass = align === "start" ? "left-0" : align === "center" ? "left-1/2 -translate-x-1/2" : "right-0";
  return (
    <div
      role="menu"
      className={cn(
        "absolute top-full mt-1 min-w-[10rem] overflow-hidden rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md z-50",
        alignClass,
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function DropdownMenuItem({
  disabled = false,
  onSelect,
  onClick,
  className = "",
  children,
  ...props
}: {
  disabled?: boolean;
  onSelect?: (event: any) => void;
  onClick?: (event: any) => void;
  className?: string;
  children: React.ReactNode;
  [key: string]: any;
}) {
  const { setOpen } = React.useContext(DropdownContext);
  const handleSelect = (event: React.MouseEvent) => {
    if (disabled) return;
    onClick?.(event);
    onSelect?.(event);
    setOpen(false);
  };
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={handleSelect}
      className={cn(
        "relative flex w-full cursor-pointer select-none items-center gap-2 rounded-sm px-2.5 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
