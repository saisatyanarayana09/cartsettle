import { Keyboard, Mic, MoreHorizontal, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  hint = "Tap the orb and start talking",
  replyText,
}) {
  const status = busy && voice.status !== "speaking" ? "working" : voice.status;
  const label =
    voice.status === "listening"
      ? "Pause microphone"
      : voice.status === "speaking"
        ? "Stop speaking"
        : "Start microphone";
  return (
    <div className="voice-stage min-h-0 flex-1 overflow-y-auto px-5">
      <div className="flex min-h-[42dvh] flex-col items-center justify-center gap-6 py-6">
        <button
          type="button"
          aria-label={label}
          onClick={voice.toggle}
          disabled={busy && voice.status !== "working" && voice.status !== "speaking"}
          data-state={status}
          className="voice-orb"
        >
          <span className="voice-orb-ring" />
          <span className="voice-orb-ring voice-orb-ring-2" />
          <span className="voice-orb-core">
            <span className="voice-orb-bars" aria-hidden="true">
              <i />
              <i />
              <i />
              <i />
              <i />
            </span>
          </span>
        </button>
        <div className="w-full space-y-2 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            {STATUS_TEXT[status] || "Ready"}
          </p>
          <p
            role="status"
            aria-live="polite"
            className="mx-auto min-h-12 max-w-sm text-lg font-semibold leading-snug text-foreground"
          >
            {voice.transcript ||
              replyText ||
              (status === "listening"
                ? "Go ahead"
                : status === "idle" || status === "paused"
                  ? hint
                  : "")}
          </p>
        </div>
      </div>
      <div className="space-y-3 pb-8">{children}</div>
    </div>
  );
}
