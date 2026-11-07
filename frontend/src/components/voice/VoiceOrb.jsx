import React from "react";
import { Mic, MicOff, Sparkles, Volume2 } from "lucide-react";

/**
 * VoiceOrb: A 3D Luminous Spherical Orb with specular reflections,
 * iridescent inner core, ambient aura, and real-time audio volume responsiveness.
 *
 * States:
 * - listening: Electric cyan & emerald radiant pulse
 * - working: Rotating violet & indigo nebula pulse
 * - speaking: Radiant amber & coral gold glow
 * - idle: Calm translucent obsidian & emerald sphere
 */
export function VoiceOrb({
  status = "idle",
  micLevel = 0,
  onClick,
  onKeyDown,
  label = "Voice interaction",
  disabled = false,
  className = "",
}) {
  const isListening = status === "listening";
  const isWorking = status === "working";
  const isSpeaking = status === "speaking";

  // Clamp & smooth mic level for visual scaling (1.0 to ~1.35x max scale)
  const clampedLevel = Math.min(1, Math.max(0, micLevel));
  const scale = 1 + clampedLevel * 0.28;
  const auraOpacity = 0.45 + clampedLevel * 0.55;

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label={label}
      aria-disabled={disabled ? "true" : undefined}
      onClick={disabled ? undefined : onClick}
      onKeyDown={disabled ? undefined : onKeyDown}
      className={`voice-orb-container group relative flex flex-col items-center justify-center select-none cursor-pointer outline-none ${className}`}
      style={{
        "--orb-level": clampedLevel.toFixed(3),
        "--orb-scale": scale.toFixed(3),
      }}
    >
      {/* Outer Ambient Radial Aura Glow */}
      <div
        className="voice-orb-aura absolute rounded-full pointer-events-none transition-all duration-300 ease-out"
        data-state={status}
        style={{
          width: "160px",
          height: "160px",
          transform: `scale(${scale * 1.25})`,
          opacity: auraOpacity,
        }}
      />

      {/* Outer Sonic Waveform / Breathing Rings (active while listening or speaking) */}
      {(isListening || isSpeaking) && (
        <>
          <div
            className="voice-orb-ring ring-1 absolute rounded-full pointer-events-none animate-ping"
            style={{
              width: "115px",
              height: "115px",
              animationDuration: isListening ? "2.4s" : "1.8s",
            }}
          />
          <div
            className="voice-orb-ring ring-2 absolute rounded-full pointer-events-none animate-pulse"
            style={{
              width: "135px",
              height: "135px",
              animationDuration: "3s",
            }}
          />
        </>
      )}

      {/* Main 3D Spherical Core */}
      <div
        className="voice-orb-sphere relative flex items-center justify-center rounded-full overflow-hidden transition-transform duration-100 ease-out"
        data-state={status}
        style={{
          width: "92px",
          height: "92px",
          transform: `scale(${scale})`,
        }}
      >
        {/* Layer 1: Base Radial Iridescent Nebula */}
        <div className="voice-orb-nebula absolute inset-0 rounded-full" />

        {/* Layer 1b: Liquid Crystal Swirling Ribbons */}
        <div className="voice-orb-ribbon absolute inset-0 rounded-full pointer-events-none" />

        {/* Layer 2: Rotating Core Dynamics (working / speaking) */}
        {isWorking && (
          <div className="voice-orb-swirl absolute inset-0 rounded-full animate-spin" style={{ animationDuration: "5s" }} />
        )}

        {/* Layer 3: Inner Glass Edge Shadow (Depth) */}
        <div className="voice-orb-inner-shadow absolute inset-0 rounded-full" />

        {/* Layer 4: Top-Left Primary Specular Glass Highlight */}
        <div className="voice-orb-specular absolute top-1.5 left-2.5 rounded-full pointer-events-none" />

        {/* Layer 5: Secondary Rim Specular Glow */}
        <div className="voice-orb-rim absolute inset-0 rounded-full pointer-events-none" />

        {/* Layer 6: Center State Glyph / Micro Waveform */}
        <div className="voice-orb-center relative z-10 flex items-center justify-center text-white/90 drop-shadow-md">
          {isWorking ? (
            <Sparkles className="size-5 animate-spin" style={{ animationDuration: "3s" }} />
          ) : isSpeaking ? (
            <Volume2 className="size-5 animate-pulse" />
          ) : isListening ? (
            <Mic className="size-5 transition-transform group-hover:scale-110" />
          ) : (
            <MicOff className="size-5 opacity-70" />
          )}
        </div>
      </div>
    </div>
  );
}

export default VoiceOrb;
