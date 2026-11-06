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
  lastUserText,
}) {
  const status = busy && voice.status !== "speaking" ? "working" : voice.status;
  const hasTranscript = Boolean(voice.transcript && voice.transcript.trim());
  const label =
    voice.status === "listening"
      ? hasTranscript
        ? "Send spoken message"
        : "Pause microphone"
      : voice.status === "speaking"
        ? "Stop speaking"
        : "Start microphone";

  return (
    <div className="voice-stage flex min-h-0 flex-1 flex-col justify-between overflow-hidden px-4 pt-3 pb-3">
      {/* Upward Live Action Stage (Spoken Prompt + Live Action Cards float ABOVE the Bottom Orb) */}
      <div className="flex min-h-0 flex-1 flex-col justify-end overflow-y-auto pb-3">
        <div className="w-full space-y-3 my-auto">
          {(voice.transcript || lastUserText) && (
            <div className="flex items-center justify-end">
              <div className="max-w-[85%] rounded-2xl rounded-br-sm border border-border/70 bg-secondary/70 px-3.5 py-2 text-xs font-semibold text-foreground shadow-2xs backdrop-blur-md">
                {voice.transcript || lastUserText}
              </div>
            </div>
          )}

          {/* Live Action Cards & Compact Product Mini-Cards */}
          <div className="space-y-2.5">{children}</div>
        </div>
      </div>

      {/* Bottom-Docked 3D Liquid-Glass Luminous Orb & Live Status */}
      <div className="shrink-0 pt-1">
        <div className="mb-2 w-full space-y-1 text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-600 dark:text-cyan-400">
            {STATUS_TEXT[status] || "Ready"}
          </p>
          <p
            role="status"
            aria-live="polite"
            className="mx-auto min-h-6 max-w-sm text-sm font-semibold leading-snug text-foreground line-clamp-2"
          >
            {voice.transcript ||
              replyText ||
              (status === "listening"
                ? "Listening..."
                : status === "idle" || status === "paused"
                  ? hint
                  : "")}
          </p>
        </div>

        <div className="voice-orb-dock mx-auto flex w-full max-w-[320px] flex-col items-center justify-center py-2.5">
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
              <span className="voice-orb-wave" aria-hidden="true" />
              <span className="voice-orb-wave voice-orb-wave-2" aria-hidden="true" />
              <span className="voice-orb-glint" aria-hidden="true" />
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
