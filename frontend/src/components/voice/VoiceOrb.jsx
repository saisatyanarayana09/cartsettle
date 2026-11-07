import React from "react";

/**
 * VoiceOrb: Flagship Photorealistic 3D Emerald & Crystal-Glass Ribbon Sphere.
 * Pure 3D glass sculpture with zero circular ring borders behind it — blends
 * seamlessly into the Full-Screen AI Assistant Aurora & Edge-Light Shader.
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
      {/* Soft Diffused Backlight (No Circular Ring Borders) */}
      <div
        className="voice-orb-aura absolute rounded-full pointer-events-none transition-all duration-700 ease-out"
        data-state={status}
        aria-hidden="true"
      />

      {/* Photorealistic 3D Emerald & Glass Ribbon Sphere */}
      <div
        className="voice-orb-sphere relative flex items-center justify-center rounded-full overflow-hidden transition-transform duration-300 ease-out"
        data-state={status}
        style={{
          width: "152px",
          height: "152px",
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

        {/* Stationary Spherical Glass Rim & Inner Refraction */}
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
