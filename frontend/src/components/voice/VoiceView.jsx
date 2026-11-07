import React, { useEffect, useState } from "react";
import { Keyboard, Mic, MoreHorizontal, Trash2 } from "lucide-react";
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

const HIGHLIGHT_TOKEN_RE =
  /^(?:[₹$]\d+(?:\.\d+)?|\d+(?:\.\d+)?%?|#?[A-Z0-9]*\d{3,}|biryani|hyderabadi|paneer|masala|light|dark|added|removed|cleared|confirmed|paypal)$/i;

/** Condense long AI paragraphs into a crisp <=12-word 1–2 line caption for the Voice screen */
function condenseForVoiceCaption(rawText) {
  if (!rawText) return "";
  const cleaned = String(rawText)
    .replace(/\$(\d+(?:\.\d+)?)/g, (_, n) => {
      const val = Number(n);
      return `₹${Number.isInteger(val) ? val : val.toFixed(2)}`;
    })
    .replace(/\s*\([^)]*\)/g, "")
    .replace(/\s+/g, " ")
    .trim();
  const firstSentence = cleaned.split(/(?<=[.!?])\s+/)[0] || cleaned;
  const words = firstSentence.split(/\s+/).filter(Boolean);
  if (words.length <= 12) return firstSentence;
  return `${words.slice(0, 12).join(" ")}...`;
}

/** Compact 1–2 Line Kinetic Caption: Subtle 14.5px typography that auto-fades 3s after speech */
function KineticWords({ text, status, faded }) {
  if (!text) return null;
  const condensed = status === "listening" ? text : condenseForVoiceCaption(text);
  const words = condensed.split(/\s+/).filter(Boolean);
  return (
    <div
      role="status"
      aria-live="polite"
      className={`kinetic-words-container ${faded ? "voice-caption-faded" : ""}`}
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
            style={{ animationDelay: `${Math.min(idx * 22, 240)}ms` }}
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
  hint = "Tap orb to speak",
  replyText,
  activeTaskType = "idle",
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

  // Auto-fade the AI caption 3 seconds after speech finishes so text never crowds the screen
  const [captionFaded, setCaptionFaded] = useState(false);
  useEffect(() => {
    setCaptionFaded(false);
    if (
      (status === "idle" || status === "paused") &&
      replyText &&
      !showLiveTranscript
    ) {
      const fadeTimer = setTimeout(() => {
        setCaptionFaded(true);
      }, 3000);
      return () => clearTimeout(fadeTimer);
    }
  }, [status, replyText, showLiveTranscript]);

  // Determine the full-screen dynamic aurora & edge-light palette from task + voice state
  const glowPalette =
    activeTaskType && activeTaskType !== "idle"
      ? activeTaskType
      : status === "working"
        ? "thinking"
        : status === "listening" && hasTranscript
          ? "speaking-input"
          : status;

  const handleToggle = () => {
    if (busy && voice.status !== "speaking") return;
    setCaptionFaded(false);
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
      {/* Unified Full-Screen Living Aurora Backdrop & 4-Edge Perimeter Shader */}
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

      {/* Unified Spatial Stage: Live Cards Float Directly Above the Orb */}
      <div className="voice-live-stage">
        <div className="assistant-live-cards">{children}</div>
      </div>

      {/* Bottom Compact Caption & Living 3D Internal-Plasma Orb */}
      <div className="voice-bottom flex flex-col items-center justify-end z-10 px-5 pb-6">
        <div className="mb-3.5 w-full text-center flex flex-col items-center min-h-[38px] justify-center">
          <KineticWords
            text={displayText}
            status={status}
            faded={captionFaded}
          />
        </div>

        <VoiceOrb
          status={status}
          micLevel={micLevel}
          onClick={handleToggle}
          onKeyDown={handleKeyDown}
          label={label}
          disabled={busy && voice.status !== "speaking"}
        />

        {voice.status === "unavailable" && (
          <p className="mt-2.5 text-xs text-slate-400 dark:text-slate-500 text-center">
            Voice is unavailable. Use the keyboard icon above.
          </p>
        )}
      </div>
    </div>
  );
}

export default VoiceView;
