import React from "react";
import { Keyboard, Mic, MoreHorizontal, ShoppingBag, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMicLevel } from "./useMicLevel";
import { VoiceOrb } from "./VoiceOrb";
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

/** Kinetic Floating Words: Displays spoken words with blur-to-clear transitions */
function KineticWords({ text }) {
  if (!text) return null;
  const words = text.split(/\s+/).filter(Boolean);
  return (
    <div role="status" aria-live="polite" className="kinetic-words-container">
      {words.map((word, idx) => (
        <span
          key={`${word}-${idx}`}
          className="kinetic-word"
          style={{ animationDelay: `${Math.min(idx * 35, 450)}ms` }}
        >
          {word}
        </span>
      ))}
    </div>
  );
}

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

  const displayText = voice.transcript || replyText || hint;

  const handleToggle = () => {
    if (busy && voice.status !== "speaking") return;
    voice.toggle();
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleToggle();
    }
  };

  return (
    <div className="voice-stage" style={{ "--voice-level": micLevel.toFixed(3) }}>
      {/* Background ambient glow band */}
      <div className="voice-glow" data-state={status} aria-hidden="true" />

      {/* Upward Dynamic Live Stage directly above the orb */}
      <div className="voice-live-stage">
        {lastUserText && <p className="assistant-request">{lastUserText}</p>}
        <div className="assistant-live-cards">{children}</div>
      </div>

      {/* Bottom Area: Docked Cart Pill + Kinetic Spoken Words + 3D Luminous Orb */}
      <div className="voice-bottom flex flex-col items-center justify-end z-10 px-4 pb-4">
        {/* Docked Cart Summary Pill above the orb */}
        {cartCount > 0 && (
          <button
            type="button"
            className="assistant-cartpill mb-2"
            onClick={(event) => {
              event.stopPropagation();
              onViewCart?.();
            }}
            aria-label={`View cart, ${cartCount} ${cartCount === 1 ? "item" : "items"}, total ${cartTotal.toFixed(2)}`}
          >
            <ShoppingBag className="size-3.5 text-emerald-500" />
            <span>{cartCount} {cartCount === 1 ? "item" : "items"} · ${cartTotal.toFixed(2)}</span>
          </button>
        )}

        {/* State Label */}
        <p className="voice-state text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80 mb-1">
          {STATUS_TEXT[status] || "Ready"}
        </p>

        {/* Kinetic Floating Words */}
        <div className="mb-2 w-full text-center">
          <KineticWords text={displayText} />
        </div>

        {/* 3D Luminous Spherical Orb */}
        <VoiceOrb
          status={status}
          micLevel={micLevel}
          onClick={handleToggle}
          onKeyDown={handleKeyDown}
          label={label}
          disabled={busy && voice.status !== "speaking"}
        />

        {voice.status === "unavailable" && (
          <p className="mt-2 text-xs text-muted-foreground text-center">
            Voice is unavailable. Use the keyboard.
          </p>
        )}
      </div>
    </div>
  );
}

export default VoiceView;
