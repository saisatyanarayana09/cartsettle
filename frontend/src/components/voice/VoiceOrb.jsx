import React from "react";

/**
 * VoiceOrb: Flagship Sculptural 3D Emerald & Glass Ribbon Sphere.
 * Matches the minimalist industrial design prototype with diagonal
 * volumetric emerald and pearl-glass ribbons, refractive rim lighting,
 * and a soft floor contact shadow.
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
      {/* Subtle Ambient Backlight (primarily visible in dark mode or active listening) */}
      <div
        className="voice-orb-aura absolute rounded-full pointer-events-none transition-all duration-500 ease-out"
        data-state={status}
      />

      {/* Sculptural 3D Glass & Emerald Ribbon Sphere */}
      <div
        className="voice-orb-sphere relative flex items-center justify-center rounded-full overflow-hidden transition-transform duration-300 ease-out"
        data-state={status}
        style={{
          width: "124px",
          height: "124px",
          transform: `scale(${scale})`,
        }}
      >
        <svg
          viewBox="0 0 200 200"
          className="voice-orb-svg w-full h-full block pointer-events-none"
          aria-hidden="true"
        >
          <defs>
            {/* Base Crystal Sphere Gradient */}
            <radialGradient id="orbGlassBase" cx="36%" cy="28%" r="72%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="32%" stopColor="#e2f2ee" />
              <stop offset="68%" stopColor="#94b8b0" />
              <stop offset="90%" stopColor="#1e463c" />
              <stop offset="100%" stopColor="#0f2922" />
            </radialGradient>

            {/* Primary Deep Emerald 3D Ribbon */}
            <linearGradient id="emeraldRibbon1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#6ee7b7" />
              <stop offset="22%" stopColor="#10b981" />
              <stop offset="55%" stopColor="#047857" />
              <stop offset="85%" stopColor="#064e3b" />
              <stop offset="100%" stopColor="#022c22" />
            </linearGradient>

            {/* Secondary Luminous Emerald Ribbon */}
            <linearGradient id="emeraldRibbon2" x1="15%" y1="0%" x2="85%" y2="100%">
              <stop offset="0%" stopColor="#a7f3d0" />
              <stop offset="30%" stopColor="#34d399" />
              <stop offset="65%" stopColor="#059669" />
              <stop offset="100%" stopColor="#065f46" />
            </linearGradient>

            {/* Sculpted Silver-Pearl Glass Ribbon */}
            <linearGradient id="pearlGlassRibbon" x1="0%" y1="10%" x2="100%" y2="90%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.98" />
              <stop offset="38%" stopColor="#f1f5f9" stopOpacity="0.92" />
              <stop offset="72%" stopColor="#94a3b8" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#334155" stopOpacity="0.9" />
            </linearGradient>

            {/* Inner Spherical Shadow & Rim Refraction */}
            <radialGradient id="orbInnerDepth" cx="50%" cy="50%" r="50%">
              <stop offset="68%" stopColor="#000000" stopOpacity="0" />
              <stop offset="90%" stopColor="#042f2e" stopOpacity="0.32" />
              <stop offset="97%" stopColor="#ffffff" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#064e3b" stopOpacity="0.4" />
            </radialGradient>

            {/* Top-Left Specular Crescent */}
            <linearGradient id="orbTopGloss" x1="20%" y1="0%" x2="65%" y2="65%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
              <stop offset="45%" stopColor="#ffffff" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
            </linearGradient>

            <clipPath id="sphereClip">
              <circle cx="100" cy="100" r="98" />
            </clipPath>
          </defs>

          <g clipPath="url(#sphereClip)">
            {/* 1. Base Refractive Glass Sphere */}
            <circle cx="100" cy="100" r="98" fill="url(#orbGlassBase)" />

            {/* 2. Animated Diagonal 3D Sculpted Ribbons */}
            <g className="voice-orb-ribbons-group">
              {/* Upper-Left Dark Glass & Emerald Fold */}
              <path
                d="M -30 85 C 20 10, 95 -15, 155 -25 C 125 25, 45 95, -20 125 Z"
                fill="url(#emeraldRibbon1)"
                opacity="0.92"
              />
              {/* Upper Pearl-Silver Glass Fold */}
              <path
                d="M -25 118 C 35 45, 110 10, 185 -10 C 195 15, 185 35, 165 45 C 100 65, 35 125, -10 155 Z"
                fill="url(#pearlGlassRibbon)"
              />
              {/* Center Hero Emerald 3D Ribbon */}
              <path
                d="M -15 152 C 45 85, 120 42, 205 18 C 215 48, 205 75, 190 92 C 120 112, 55 165, 10 205 Z"
                fill="url(#emeraldRibbon1)"
              />
              {/* Center Ribbon Specular Ridge */}
              <path
                d="M -10 148 C 48 82, 122 40, 202 20 C 198 30, 125 65, -2 158 Z"
                fill="#a7f3d0"
                opacity="0.55"
              />
              {/* Lower Pearl Glass Channel */}
              <path
                d="M 12 198 C 68 138, 138 96, 212 76 C 215 102, 202 128, 182 145 C 125 158, 75 192, 42 215 Z"
                fill="url(#pearlGlassRibbon)"
              />
              {/* Bottom-Right Emerald Core Fold */}
              <path
                d="M 45 212 C 95 162, 152 132, 212 118 C 205 165, 165 202, 105 218 Z"
                fill="url(#emeraldRibbon2)"
              />
            </g>

            {/* 3. Top-Left Curved Glass Specular Reflection */}
            <ellipse
              cx="68"
              cy="52"
              rx="48"
              ry="26"
              transform="rotate(-32 68 52)"
              fill="url(#orbTopGloss)"
            />

            {/* 4. Spherical Inner Depth & Glass Rim */}
            <circle cx="100" cy="100" r="98" fill="url(#orbInnerDepth)" />
            <circle
              cx="100"
              cy="100"
              r="97.2"
              fill="none"
              stroke="#ffffff"
              strokeOpacity="0.45"
              strokeWidth="1.5"
            />
          </g>
        </svg>
      </div>

      {/* Floor Contact Reflection Shadow */}
      <div
        className="voice-orb-floor-shadow pointer-events-none"
        data-state={status}
        aria-hidden="true"
      />
    </div>
  );
}

export default VoiceOrb;
