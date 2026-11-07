import React from "react";

/**
 * VoiceOrb: Flagship Photorealistic 3D Emerald & Crystal-Glass Ribbon Sphere
 * with multi-layered emerald plasma glow, acoustic ripple rings, counter-rotating
 * caustic light refraction, and continuous 3D rotational physics.
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
      {/* Layer 1: Deep Ambient Emerald & Aqua Plasma Backlight */}
      <div
        className="voice-orb-aura absolute rounded-full pointer-events-none transition-all duration-500 ease-out"
        data-state={status}
        aria-hidden="true"
      />

      {/* Layer 2: Expanding Acoustic Emerald Ripple Rings */}
      <div
        className="voice-orb-pulse-ring absolute rounded-full pointer-events-none"
        data-state={status}
        aria-hidden="true"
      />
      <div
        className="voice-orb-pulse-ring voice-orb-pulse-ring-delay absolute rounded-full pointer-events-none"
        data-state={status}
        aria-hidden="true"
      />

      {/* Layer 3: Orbital Conic Glow Halo around the Sphere */}
      <div
        className="voice-orb-orbital-halo absolute rounded-full pointer-events-none"
        data-state={status}
        aria-hidden="true"
      />

      {/* Layer 4: Photorealistic 3D Emerald & Glass Ribbon Sphere */}
      <div
        className="voice-orb-sphere relative flex items-center justify-center rounded-full overflow-hidden transition-transform duration-300 ease-out"
        data-state={status}
        style={{
          width: "156px",
          height: "156px",
          transform: `scale(${scale})`,
        }}
      >
        {/* Continuously Rotating 3D Raytraced Emerald & Glass Ribbon Core */}
        <img
          src="/orb-emerald-3d.png"
          alt=""
          draggable={false}
          className="voice-orb-3d-texture w-full h-full object-cover rounded-full pointer-events-none select-none"
        />

        {/* Counter-Rotating Internal Crystal Light Shimmer */}
        <div
          className="voice-orb-shimmer absolute inset-0 rounded-full pointer-events-none"
          data-state={status}
          aria-hidden="true"
        />

        {/* Stationary Studio Caustic Specular Highlight */}
        <div
          className="voice-orb-caustic absolute inset-0 rounded-full pointer-events-none"
          aria-hidden="true"
        />

        {/* Stationary Spherical Glass Rim & Luminous Emerald Inner Refraction */}
        <div
          className="voice-orb-glass-rim absolute inset-0 rounded-full pointer-events-none"
          aria-hidden="true"
        />
      </div>

      {/* Layer 5: Luminous Emerald Floor Contact Reflection Shadow */}
      <div
        className="voice-orb-floor-shadow pointer-events-none"
        data-state={status}
        aria-hidden="true"
      />
    </div>
  );
}

export default VoiceOrb;
