import React, { useEffect, useRef, useState } from "react";

/**
 * VoiceOrb: True 60fps 3D Volumetric Crystal Sphere with Internal Flowing Ribbons & Plasma.
 * Replaces static bitmap images with a real-time 60fps HTML5 Canvas 3D spherical ribbon
 * and plasma shader inside a stationary 3D glass sphere shell.
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

  const canvasRef = useRef(null);
  const stateRef = useRef({
    status,
    micLevel: clampedLevel,
    spinBoost: 0,
  });

  useEffect(() => {
    stateRef.current.status = status;
    stateRef.current.micLevel = clampedLevel;
  }, [status, clampedLevel]);

  // Trigger a smooth 3D internal velocity surge when status changes or orb is tapped
  useEffect(() => {
    if (status === "working" || status === "speaking" || status === "listening") {
      stateRef.current.spinBoost = 2.4;
      setImpulseSpin(true);
      const timer = setTimeout(() => setImpulseSpin(false), 1450);
      return () => clearTimeout(timer);
    }
  }, [status]);

  const handleClick = (e) => {
    if (disabled) return;
    stateRef.current.spinBoost = 3.0;
    setImpulseSpin(true);
    setTimeout(() => setImpulseSpin(false), 1450);
    onClick?.(e);
  };

  // Real-time 60fps 3D Spherical Ribbon & Liquid Plasma Renderer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let ctx = null;
    try {
      ctx = canvas.getContext("2d");
    } catch {
      ctx = null;
    }
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 2, 2.5);
    const size = 148;
    canvas.width = Math.round(size * dpr);
    canvas.height = Math.round(size * dpr);

    let rafId = 0;
    let phase = 0;
    let lastTime = performance.now();

    // 5 sculpted 3D spherical ribbons at distinct latitudes and harmonic frequencies
    const ribbons = [
      {
        latBase: -0.52,
        width: 22,
        freq1: 2.0,
        freq2: 3.0,
        speed: 1.15,
        phaseOffset: 0.0,
        colorA: "rgba(4, 120, 87, 0.92)",
        colorB: "rgba(16, 185, 129, 0.95)",
        ridge: "rgba(167, 243, 208, 0.85)",
      },
      {
        latBase: -0.18,
        width: 26,
        freq1: 2.0,
        freq2: 4.0,
        speed: -0.95,
        phaseOffset: 1.3,
        colorA: "rgba(236, 253, 245, 0.95)",
        colorB: "rgba(167, 243, 208, 0.88)",
        ridge: "rgba(255, 255, 255, 0.95)",
      },
      {
        latBase: 0.14,
        width: 24,
        freq1: 3.0,
        freq2: 2.0,
        speed: 1.32,
        phaseOffset: 2.5,
        colorA: "rgba(5, 150, 105, 0.94)",
        colorB: "rgba(52, 211, 153, 0.92)",
        ridge: "rgba(209, 250, 229, 0.9)",
      },
      {
        latBase: 0.46,
        width: 20,
        freq1: 2.0,
        freq2: 3.0,
        speed: -1.1,
        phaseOffset: 3.8,
        colorA: "rgba(240, 253, 250, 0.92)",
        colorB: "rgba(110, 231, 183, 0.85)",
        ridge: "rgba(255, 255, 255, 0.9)",
      },
      {
        latBase: -0.02,
        width: 16,
        freq1: 3.0,
        freq2: 5.0,
        speed: 1.55,
        phaseOffset: 4.9,
        colorA: "rgba(6, 182, 212, 0.72)",
        colorB: "rgba(16, 185, 129, 0.86)",
        ridge: "rgba(165, 243, 252, 0.85)",
      },
    ];

    const renderFrame = (now) => {
      const dt = Math.min(0.05, Math.max(0.004, (now - lastTime) / 1000));
      lastTime = now;

      const { status: curStatus, micLevel: curMic, spinBoost } = stateRef.current;
      stateRef.current.spinBoost = spinBoost * 0.94;

      // Synthetic acoustic energy when speaking or working so orb is always visibly alive
      const speakingWave =
        curStatus === "speaking"
          ? 0.38 + 0.28 * Math.sin(now * 0.008) + 0.18 * Math.cos(now * 0.013)
          : curStatus === "listening"
            ? Math.max(curMic, 0.22 + 0.14 * Math.sin(now * 0.006))
            : curStatus === "working"
              ? 0.45 + 0.2 * Math.sin(now * 0.012)
              : 0.12 + 0.06 * Math.sin(now * 0.003);

      const energy = Math.min(1, Math.max(curMic, speakingWave));
      const baseSpeed =
        curStatus === "working"
          ? 2.45
          : curStatus === "speaking"
            ? 1.75
            : curStatus === "listening"
              ? 1.45 + energy * 0.8
              : 0.95;

      phase += dt * (baseSpeed + stateRef.current.spinBoost);

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, size, size);

      const cx = size / 2;
      const cy = size / 2;
      const R = size * 0.485;

      // Clip to 3D sphere boundary
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.clip();

      // 1. Deep 3D Pearl-Mint & Emerald Spherical Core Base
      const coreShiftX = Math.sin(phase * 0.7) * 8;
      const coreShiftY = Math.cos(phase * 0.55) * 8;
      const baseGrad = ctx.createRadialGradient(
        cx - 16 + coreShiftX,
        cy - 18 + coreShiftY,
        4,
        cx,
        cy,
        R * 1.08,
      );
      baseGrad.addColorStop(0, "#ffffff");
      baseGrad.addColorStop(0.28, "#ecfdf5");
      baseGrad.addColorStop(0.62, "#6ee7b7");
      baseGrad.addColorStop(0.86, "#059669");
      baseGrad.addColorStop(1, "#064e3b");
      ctx.fillStyle = baseGrad;
      ctx.fillRect(0, 0, size, size);

      // 2. Internal Drifting Liquid Plasma Blobs
      for (let b = 0; b < 3; b++) {
        const angle = phase * (0.6 + b * 0.25) + b * 2.1;
        const bx = cx + Math.cos(angle) * (R * 0.36);
        const by = cy + Math.sin(angle * 1.2) * (R * 0.32);
        const bRad = R * (0.62 + 0.14 * Math.sin(phase * 1.3 + b));
        const blobGrad = ctx.createRadialGradient(bx, by, 2, bx, by, bRad);
        if (b === 0) {
          blobGrad.addColorStop(0, "rgba(16, 185, 129, 0.55)");
          blobGrad.addColorStop(1, "rgba(16, 185, 129, 0)");
        } else if (b === 1) {
          blobGrad.addColorStop(0, "rgba(255, 255, 255, 0.65)");
          blobGrad.addColorStop(1, "rgba(255, 255, 255, 0)");
        } else {
          blobGrad.addColorStop(
            0,
            curStatus === "working"
              ? "rgba(6, 182, 212, 0.58)"
              : "rgba(52, 211, 153, 0.50)",
          );
          blobGrad.addColorStop(1, "rgba(20, 184, 166, 0)");
        }
        ctx.fillStyle = blobGrad;
        ctx.fillRect(0, 0, size, size);
      }

      // Tilt angle (-38deg diagonal like the sculptural emerald glass orb) + subtle 3D nutation
      const tilt = -0.66 + 0.08 * Math.sin(phase * 0.45);
      const cosTilt = Math.cos(tilt);
      const sinTilt = Math.sin(tilt);
      const pitch = 0.25 * Math.cos(phase * 0.38);
      const cosPitch = Math.cos(pitch);
      const sinPitch = Math.sin(pitch);

      // Helper to project 3D spherical point (lon, lat) onto 2D canvas with depth z
      const projectPoint = (lon, lat) => {
        const cosLat = Math.cos(lat);
        const sinLat = Math.sin(lat);
        const x0 = R * cosLat * Math.sin(lon);
        const y0 = R * sinLat;
        const z0 = R * cosLat * Math.cos(lon);

        // Pitch around X-axis
        const y1 = y0 * cosPitch - z0 * sinPitch;
        const z1 = y0 * sinPitch + z0 * cosPitch;

        // Diagonal sculptural tilt around Z-axis
        const x2 = x0 * cosTilt - y1 * sinTilt;
        const y2 = x0 * sinTilt + y1 * cosTilt;

        return { x: cx + x2, y: cy + y2, z: z1 };
      };

      const steps = 44;
      const waveAmp = 0.16 + energy * 0.18;

      // 3A. Render Back-Hemisphere Ribbon Segments (Refracted through the back of the crystal sphere)
      ribbons.forEach((rib) => {
        ctx.save();
        ctx.beginPath();
        let started = false;
        for (let i = 0; i <= steps; i++) {
          const u = (i / steps) * Math.PI * 2;
          const lon = u + phase * rib.speed + rib.phaseOffset;
          const wave =
            Math.sin(u * rib.freq1 + phase * 1.4 + rib.phaseOffset) * waveAmp +
            Math.cos(u * rib.freq2 - phase * 1.1) * (waveAmp * 0.55);
          const lat = Math.max(-1.25, Math.min(1.25, rib.latBase + wave));
          const pt = projectPoint(lon, lat);
          if (pt.z < 0) {
            if (!started) {
              ctx.moveTo(pt.x, pt.y);
              started = true;
            } else {
              ctx.lineTo(pt.x, pt.y);
            }
          } else {
            started = false;
          }
        }
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.lineWidth = rib.width * 0.72;
        ctx.strokeStyle = rib.colorB;
        ctx.globalAlpha = 0.28;
        ctx.stroke();
        ctx.restore();
      });

      // 3B. Central Voice-Reactive 3D Acoustic Core Glow (Between Back and Front Hemispheres)
      const coreRadius = R * (0.48 + energy * 0.34);
      const coreGlow = ctx.createRadialGradient(cx, cy, 2, cx, cy, coreRadius);
      coreGlow.addColorStop(0, `rgba(255, 255, 255, ${0.75 + energy * 0.22})`);
      coreGlow.addColorStop(0.45, `rgba(110, 231, 183, ${0.42 + energy * 0.25})`);
      coreGlow.addColorStop(1, "rgba(16, 185, 129, 0)");
      ctx.fillStyle = coreGlow;
      ctx.fillRect(0, 0, size, size);

      // 3C. Render Front-Hemisphere 3D Sculpted Glass Ribbons with Specular Ridge
      ribbons.forEach((rib, idx) => {
        const frontPoints = [];
        for (let i = 0; i <= steps; i++) {
          const t = (i / steps - 0.5) * Math.PI * 1.08; // Front hemisphere longitude (-97deg to +97deg)
          const u = t + phase * rib.speed + rib.phaseOffset;
          const wave =
            Math.sin(u * rib.freq1 + phase * 1.6 + rib.phaseOffset) * waveAmp +
            Math.cos(u * rib.freq2 - phase * 1.25 + idx) * (waveAmp * 0.6);
          const lat = Math.max(-1.22, Math.min(1.22, rib.latBase + wave));
          frontPoints.push(projectPoint(t, lat));
        }

        const grad = ctx.createLinearGradient(
          cx - R * 0.8,
          cy + R * 0.8,
          cx + R * 0.8,
          cy - R * 0.8,
        );
        grad.addColorStop(0, rib.colorA);
        grad.addColorStop(0.52, rib.colorB);
        grad.addColorStop(1, rib.colorA);

        // Main 3D Glass Ribbon Body
        ctx.save();
        ctx.beginPath();
        frontPoints.forEach((pt, i) => {
          if (i === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        });
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.lineWidth = rib.width * (1 + energy * 0.14);
        ctx.strokeStyle = grad;
        ctx.shadowColor = "rgba(6, 78, 59, 0.35)";
        ctx.shadowBlur = 10;
        ctx.stroke();

        // Upper Specular Glass Refraction Ridge on Each Ribbon
        ctx.beginPath();
        frontPoints.forEach((pt, i) => {
          if (i === 0) ctx.moveTo(pt.x - 1.5, pt.y - 2.2);
          else ctx.lineTo(pt.x - 1.5, pt.y - 2.2);
        });
        ctx.lineWidth = rib.width * 0.26;
        ctx.strokeStyle = rib.ridge;
        ctx.shadowBlur = 0;
        ctx.stroke();
        ctx.restore();
      });

      // 4. Internal Shimmering Specular Caustic Highlights
      const specGrad = ctx.createRadialGradient(
        cx - R * 0.34,
        cy - R * 0.38,
        2,
        cx - R * 0.28,
        cy - R * 0.32,
        R * 0.65,
      );
      specGrad.addColorStop(0, "rgba(255, 255, 255, 0.72)");
      specGrad.addColorStop(0.35, "rgba(255, 255, 255, 0.22)");
      specGrad.addColorStop(1, "rgba(255, 255, 255, 0)");
      ctx.fillStyle = specGrad;
      ctx.fillRect(0, 0, size, size);

      ctx.restore();
      rafId = window.requestAnimationFrame(renderFrame);
    };

    rafId = window.requestAnimationFrame(renderFrame);
    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, []);

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

      {/* Stationary 3D Crystal Glass Sphere with Real-Time 60fps Internal 3D Ribbons & Plasma */}
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

        {/* Internal Layer 5: 60fps Real-Time 3D Volumetric Spherical Ribbon & Plasma Canvas */}
        <canvas
          ref={canvasRef}
          className="voice-orb-canvas relative z-[2] w-full h-full rounded-full pointer-events-none select-none block"
          aria-hidden="true"
        />

        {/* Internal Layer 6: Counter-Flowing Crystal Light Shimmer */}
        <div
          className="voice-orb-shimmer absolute inset-0 z-[3] rounded-full pointer-events-none"
          data-state={status}
          aria-hidden="true"
        />

        {/* Outer Layer 7: Stationary Studio Caustic Specular Lens Highlight */}
        <div
          className="voice-orb-caustic absolute inset-0 z-[4] rounded-full pointer-events-none"
          aria-hidden="true"
        />

        {/* Outer Layer 8: Stationary 3D Spherical Fresnel Glass Rim */}
        <div
          className="voice-orb-glass-rim absolute inset-0 z-[5] rounded-full pointer-events-none"
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
