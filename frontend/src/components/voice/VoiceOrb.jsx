import React, { useEffect, useState } from "react";

/**
 * VoiceOrb: True Multi-Layer 3D Crystal Sphere with Internal Liquid Plasma & Ribbon Transitions.
 * The outer 3D glass sphere and studio specular highlight remain stationary in 3D space
 * while internal plasma ribbons, acoustic waves, and refracted light flow and morph inside the orb,
 * performing an occasional sculptural rotation on state transitions or tap impulses.
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
  const clampedLevel = Math.min(1, Math.max(0, micLevel));
  const scale = 1 + clampedLevel * 0.14;
  const [impulseSpin, setImpulseSpin] = useState(false);

  // Trigger a single smooth sculptural rotation transition when status changes to working or speaking
  useEffect(() => {
    if (status === "working" || status === "speaking" || status === "listening") {
      setImpulseSpin(true);
      const timer = setTimeout(() => setImpulseSpin(false), 1450);
      return () => clearTimeout(timer);
    }
  }, [status]);

  const handleClick = (e) => {
    if (disabled) return;
    setImpulseSpin(true);
    setTimeout(() => setImpulseSpin(false), 1450);
    onClick?.(e);
  };

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label={label}
      aria-disabled={disabled ? "true" : undefined}
      onClick={disabled ? undefined : handleClick}
      onKeyDown={disabled ? undefined : onKeyDown}
      className={`voice-orb-container group relative flex flex-col items-center justify-center select-none cursor-pointer outline-none ${className}`}
      style={{
        "--orb-level": clampedLevel.toFixed(3),
        "--orb-scale": scale.toFixed(3),
      }}
    >
      {/* Soft Diffused Backlight (Zero Circular Ring Borders) */}
      <div
        className="voice-orb-aura absolute rounded-full pointer-events-none transition-all duration-700 ease-out"
        data-state={status}
        aria-hidden="true"
      />

      {/* Stationary 3D Crystal Glass Sphere with Internal Living Plasma & Ribbons */}
      <div
        className="voice-orb-sphere relative flex items-center justify-center rounded-full overflow-hidden transition-transform duration-300 ease-out"
        data-state={status}
        data-spin={impulseSpin ? "true" : "false"}
        style={{
          width: "148px",
          height: "148px",
          transform: `scale(${scale})`,
        }}
      >
        {/* Internal Layer 1: Deep 3D Volumetric Core Base */}
        <div
          className="voice-orb-core-depth absolute inset-0 rounded-full pointer-events-none"
          data-state={status}
          aria-hidden="true"
        />

        {/* Internal Layer 2: Primary Morphing Liquid Emerald Plasma Ribbon */}
        <div
          className="voice-orb-plasma-ribbon-a absolute pointer-events-none"
          data-state={status}
          aria-hidden="true"
        />

        {/* Internal Layer 3: Counter-Weaving Aqua & Mint Liquid Ribbon */}
        <div
          className="voice-orb-plasma-ribbon-b absolute pointer-events-none"
          data-state={status}
          aria-hidden="true"
        />

        {/* Internal Layer 4: Voice-Reactive Central Acoustic Energy Core */}
        <div
          className="voice-orb-acoustic-core absolute rounded-full pointer-events-none"
          data-state={status}
          aria-hidden="true"
        />

        {/* Internal Layer 5: Refracted Glass Ribbon Texture (Organic Breathe + Occasional Turn) */}
        <img
          src="/orb-emerald-3d.png"
          alt=""
          draggable={false}
          className="voice-orb-3d-texture w-full h-full object-cover rounded-full pointer-events-none select-none"
        />

        {/* Internal Layer 6: Counter-Flowing Crystal Light Shimmer */}
        <div
          className="voice-orb-shimmer absolute inset-0 rounded-full pointer-events-none"
          data-state={status}
          aria-hidden="true"
        />

        {/* Outer Layer 7: Stationary Studio Caustic Specular Lens Highlight */}
        <div
          className="voice-orb-caustic absolute inset-0 rounded-full pointer-events-none"
          aria-hidden="true"
        />

        {/* Outer Layer 8: Stationary 3D Spherical Fresnel Glass Rim */}
        <div
          className="voice-orb-glass-rim absolute inset-0 rounded-full pointer-events-none"
          aria-hidden="true"
        />
      </div>

      {/* Soft Emerald Floor Contact Shadow */}
      <div
        className="voice-orb-floor-shadow pointer-events-none"
        data-state={status}
        aria-hidden="true"
      />
    </div>
  );
}

export default VoiceOrb;
