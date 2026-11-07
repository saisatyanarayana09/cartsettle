import React from "react";
import { Keyboard, Mic, MoreHorizontal, Trash2 } from "lucide-react";
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
  listening: "Listening...",
  working: "Processing...",
  speaking: "Speaking",
};

/** Kinetic Floating Words: Displays spoken/reply words with smooth motion transitions */
function KineticWords({ text }) {
  if (!text) return null;
  const words = text.split(/\s+/).filter(Boolean);
  return (
    <div role="status" aria-live="polite" className="kinetic-words-container">
      {words.map((word, idx) => (
        <span
          key={`${idx}-${word}`}
          className="kinetic-word"
          style={{ animationDelay: `${Math.min(idx * 30, 360)}ms` }}
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
  hint = "How can I help you?",
  replyText,
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
  const formattedTotal = Number.isInteger(Number(cartTotal))
    ? Number(cartTotal).toString()
    : Number(cartTotal || 0).toFixed(2);

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
      {/* Top Compact Live Card Stage (Never clips or overflows) */}
      <div className="voice-live-stage">
        <div className="assistant-live-cards">{children}</div>
      </div>

      {/* Center-Bottom Floating Kinetic Typography & Sculptural 3D Orb */}
      <div className="voice-bottom flex flex-col items-center justify-end z-10 px-6 pb-8">
        {/* Floating Headline Typography */}
        <div className="mb-6 w-full text-center flex flex-col items-center">
          <KineticWords text={displayText} />

          {cartCount > 0 ? (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onViewCart?.();
              }}
              aria-label={`View cart, ${cartCount} ${cartCount === 1 ? "item" : "items"}, total ${Number(cartTotal || 0).toFixed(2)}`}
              className="mt-2 text-[13px] font-medium text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer"
            >
              ₹{formattedTotal} total in cart
            </button>
          ) : STATUS_TEXT[status] ? (
            <p className="mt-2 text-xs font-medium text-slate-400 dark:text-slate-500">
              {STATUS_TEXT[status]}
            </p>
          ) : null}
        </div>

        {/* Sculptural 3D Emerald & Glass Ribbon Orb */}
        <VoiceOrb
          status={status}
          micLevel={micLevel}
          onClick={handleToggle}
          onKeyDown={handleKeyDown}
          label={label}
          disabled={busy && voice.status !== "speaking"}
        />

        {voice.status === "unavailable" && (
          <p className="mt-3 text-xs text-slate-400 dark:text-slate-500 text-center">
            Voice is unavailable. Use the keyboard icon above.
          </p>
        )}
      </div>
    </div>
  );
}

export default VoiceView;
