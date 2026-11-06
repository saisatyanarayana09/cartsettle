import { Keyboard, Mic, MoreHorizontal, Trash2 } from "lucide-react";
import { useId } from "react";
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
  hint = "What can I help with?",
  replyText,
  lastUserText,
}) {
  const gradientId = useId().replace(/:/g, "");
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
    <div className="voice-stage">
      <div className="voice-live-stage">
        {lastUserText && <p className="assistant-request">{lastUserText}</p>}
        <div className="assistant-live-cards">{children}</div>
      </div>
      <div className="voice-bottom">
        <p className="voice-state">{STATUS_TEXT[status] || "Ready"}</p>
        <p role="status" aria-live="polite" className="voice-transcript">
          {voice.transcript || replyText || hint}
        </p>
        <Button variant="ghost" aria-label={label} onClick={voice.toggle}
          disabled={busy && voice.status !== "speaking"} data-state={status} className="voice-fluid">
          <svg viewBox="0 0 440 180" preserveAspectRatio="none" aria-hidden="true" className="voice-membrane">
            <defs>
              <linearGradient id={`${gradientId}-navy`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" className="voice-stop-light" /><stop offset=".24" className="voice-stop-navy" /><stop offset=".85" className="voice-stop-clear" />
              </linearGradient>
              <linearGradient id={`${gradientId}-amber`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" className="voice-stop-amber" /><stop offset=".3" className="voice-stop-navy" /><stop offset="1" className="voice-stop-clear" />
              </linearGradient>
            </defs>
            <path fill={`url(#${gradientId}-amber)`} className="voice-fold voice-fold-back" d="M-30 150 C50 145 72 32 146 56 S237 172 305 97 S390 28 470 117 L470 200 L-30 200Z" />
            <path fill={`url(#${gradientId}-navy)`} className="voice-fold voice-fold-front" d="M-30 150 C50 172 91 83 161 109 S253 24 309 63 S390 154 470 108 L470 200 L-30 200Z" />
            <path className="voice-crest" d="M-30 150 C50 172 91 83 161 109 S253 24 309 63 S390 154 470 108" />
          </svg>
        </Button>
        {voice.status === "unavailable" && <p className="text-xs text-muted-foreground text-center">Voice is unavailable. Use the keyboard.</p>}
      </div>
    </div>
  );
}
