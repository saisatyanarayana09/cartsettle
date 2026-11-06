import { Keyboard, Mic, MoreHorizontal, ShoppingBag, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMicLevel } from "./useMicLevel";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/** Single icon that flips between voice and typing. */
export function ModeSwitch({ mode, onChange }) {
  const toChat = mode === "voice";
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={toChat ? "Type instead" : "Talk instead"}
      title={toChat ? "Type instead" : "Talk instead"}
      onClick={() => onChange(toChat ? "chat" : "voice")}
    >
      {toChat ? <Keyboard /> : <Mic />}
    </Button>
  );
}

export function PanelMenu({ onClear, disabled }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="More options">
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="z-[110]">
        <DropdownMenuItem disabled={disabled} onSelect={onClear}>
          <Trash2 />
          Clear conversation
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const STATUS_TEXT = {
  listening: "Listening",
  working: "Thinking",
  speaking: "Speaking",
};

export function VoiceView({
  voice,
  children,
  busy,
  hint = "What can I help with?",
  replyText,
  lastUserText,
  cartCount = 0,
  cartTotal = 0,
  onViewCart,
}) {
  const status = busy && voice.status !== "speaking" ? "working" : voice.status;
  const hasTranscript = Boolean(voice.transcript && voice.transcript.trim());
  const micLevel = useMicLevel(status === "listening");
  const label =
    voice.status === "listening"
      ? hasTranscript
        ? "Send spoken message"
        : "Pause microphone"
      : voice.status === "speaking"
        ? "Stop speaking"
        : "Start microphone";

  return (
    <div className="voice-stage" style={{ "--voice-level": micLevel.toFixed(3) }}>
      <div className="voice-glow" data-state={status} aria-hidden="true" />
      <div className="voice-live-stage">
        {lastUserText && <p className="assistant-request">{lastUserText}</p>}
        <div className="assistant-live-cards">{children}</div>
      </div>
      <div
        className="voice-bottom voice-tapzone"
        role="button"
        tabIndex={0}
        aria-label={label}
        aria-disabled={busy && voice.status !== "speaking" ? "true" : undefined}
        data-state={status}
        onClick={() => {
          if (busy && voice.status !== "speaking") return;
          voice.toggle();
        }}
        onKeyDown={(event) => {
          if (event.target !== event.currentTarget) return;
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            if (busy && voice.status !== "speaking") return;
            voice.toggle();
          }
        }}
      >
        <p className="voice-state">{STATUS_TEXT[status] || "Ready"}</p>
        <p role="status" aria-live="polite" className="voice-transcript">
          {voice.transcript || replyText || hint}
        </p>
        {cartCount > 0 && (
          <button
            type="button"
            className="assistant-cartpill"
            onClick={(event) => {
              event.stopPropagation();
              onViewCart?.();
            }}
            aria-label={`View cart, ${cartCount} ${cartCount === 1 ? "item" : "items"}, total ${cartTotal.toFixed(2)}`}
          >
            <ShoppingBag className="size-3.5" />
            {cartCount} {cartCount === 1 ? "item" : "items"} · ${cartTotal.toFixed(2)}
          </button>
        )}
        {voice.status === "unavailable" && <p className="text-xs text-muted-foreground text-center">Voice is unavailable. Use the keyboard.</p>}
      </div>
    </div>
  );
}
