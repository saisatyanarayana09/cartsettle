import React from "react";
import { Keyboard, Mic, MoreHorizontal, Trash2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMicLevel } from "./useMicLevel";
import { VoiceOrb } from "./VoiceOrb";
import { playOrbWakeChime } from "./soundFx";
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
  working: "Synthesizing...",
  speaking: "Speaking",
  paused: "Tap orb to speak",
  idle: "Tap orb to speak",
};

const HIGHLIGHT_TOKEN_RE =
  /^(?:[₹$]\d+(?:\.\d+)?|\d+(?:\.\d+)?%?|#?[A-Z0-9]*\d{3,}|biryani|hyderabadi|paneer|masala|light|dark|added|confirmed|delivered|preparing|saved)$/i;

/** Kinetic Floating Words: Displays spoken/reply words with staggered blur-to-focus motion graphics */
function KineticWords({ text, status }) {
  if (!text) return null;
  const words = text.split(/\s+/).filter(Boolean);
  return (
    <div
      role="status"
      aria-live="polite"
      className="kinetic-words-container"
      data-state={status}
    >
      {words.map((word, idx) => {
        const cleanToken = word.replace(/[.,!?:;()]/g, "");
        const isHighlighted = HIGHLIGHT_TOKEN_RE.test(cleanToken);
        return (
          <span
            key={`${idx}-${word}`}
            className={
              isHighlighted ? "kinetic-word kinetic-word-highlight" : "kinetic-word"
            }
            style={{ animationDelay: `${Math.min(idx * 28, 340)}ms` }}
          >
            {word}
          </span>
        );
      })}
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
  activeTaskType = "idle",
  quickPrompts = [],
  onSelectPrompt,
}) {
  const status = busy && voice.status !== "speaking" ? "working" : voice.status;
  const hasTranscript = Boolean(voice.transcript && voice.transcript.trim());
  const baseMicLevel = useMicLevel(status === "listening" || status === "speaking");
  const transcriptBoost =
    status === "listening" && hasTranscript
      ? Math.min(0.35, ((voice.transcript.trim().length % 10) + 2) * 0.032)
      : 0;
  const micLevel = Math.min(1, baseMicLevel + transcriptBoost);

  const label =
    voice.status === "listening"
      ? hasTranscript
        ? "Send spoken message"
        : "Pause microphone"
      : voice.status === "speaking"
        ? "Stop speaking"
        : "Start microphone";

  const showLiveTranscript =
    hasTranscript && (status === "listening" || status === "working");
  const displayText = showLiveTranscript
    ? voice.transcript
    : replyText || voice.transcript || hint;

  // Determine the full-screen dynamic aurora & edge-light palette from task + voice state
  const glowPalette =
    activeTaskType && activeTaskType !== "idle"
      ? activeTaskType
      : status === "working"
        ? "thinking"
        : status === "listening" && hasTranscript
          ? "speaking-input"
          : status;

  const formattedTotal = Number.isInteger(Number(cartTotal))
    ? Number(cartTotal).toString()
    : Number(cartTotal || 0).toFixed(2);

  const handleToggle = () => {
    if (busy && voice.status !== "speaking") return;
    playOrbWakeChime();
    voice.toggle();
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleToggle();
    }
  };

  return (
    <div
      className="voice-stage"
      data-glow={glowPalette}
      data-state={status}
      style={{
        "--voice-level": micLevel.toFixed(3),
        "--text-energy": Math.min(1, (displayText?.length || 0) / 48).toFixed(2),
      }}
    >
      {/* Full-Screen Living Aurora Backdrop & 4-Edge Perimeter Shader */}
      <div
        className="voice-fullscreen-aurora"
        data-glow={glowPalette}
        data-state={status}
        aria-hidden="true"
      />
      <div
        className="voice-fullscreen-edge-glow"
        data-glow={glowPalette}
        data-state={status}
        aria-hidden="true"
      />

      {/* Top Self-Cleaning Ephemeral Live Card Stage */}
      <div className="voice-live-stage">
        <div className="assistant-live-cards">{children}</div>
      </div>

      {/* Center-Bottom Floating Kinetic Typography & Sculptural 3D Orb */}
      <div className="voice-bottom flex flex-col items-center justify-end z-10 px-5 pb-7">
        {/* Floating Headline Typography */}
        <div className="mb-5 w-full text-center flex flex-col items-center">
          <KineticWords text={displayText} status={status} />

          {cartCount > 0 ? (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onViewCart?.();
              }}
              aria-label={`View cart, ${cartCount} ${cartCount === 1 ? "item" : "items"}, total ${Number(cartTotal || 0).toFixed(2)}`}
              className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 dark:bg-emerald-400/10 border border-emerald-500/20 text-[12.5px] font-semibold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 transition-all cursor-pointer"
            >
              <span>{cartCount} {cartCount === 1 ? "item" : "items"}</span>
              <span className="opacity-50">·</span>
              <span>₹{formattedTotal} in cart</span>
            </button>
          ) : STATUS_TEXT[status] ? (
            <p className="mt-2 text-xs font-medium text-slate-400 dark:text-slate-500 tracking-wide">
              {STATUS_TEXT[status]}
            </p>
          ) : null}

          {/* Quick Demo Voice Chips when stage is clean */}
          {Array.isArray(quickPrompts) && quickPrompts.length > 0 && !showLiveTranscript && (
            <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5 max-w-[340px]">
              {quickPrompts.slice(0, 3).map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => onSelectPrompt?.(chip)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-900/5 dark:bg-white/5 hover:bg-emerald-500/15 dark:hover:bg-emerald-400/15 text-slate-600 dark:text-slate-300 hover:text-emerald-700 dark:hover:text-emerald-300 border border-slate-200/70 dark:border-white/10 transition-all cursor-pointer"
                >
                  <Sparkles className="size-2.5 text-emerald-500 shrink-0" />
                  <span className="truncate max-w-[145px]">{chip}</span>
                </button>
              ))}
            </div>
          )}
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
