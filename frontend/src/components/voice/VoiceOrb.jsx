import React, { useEffect, useRef, useState } from "react";

/**
 * Dynamic Multi-Color Iridescent Palettes for each AI state and live task.
 * Colors are [R, G, B] arrays so the 60fps shader can smoothly interpolate (lerp)
 * between palettes in real time as tasks change.
 */
const ORB_PALETTES = {
  idle: {
    deep: [4, 47, 46],
    lobeA: [16, 185, 129], // Emerald
    lobeB: [6, 182, 212], // Aqua Cyan
    lobeC: [52, 211, 153], // Mint
    pearl: [236, 253, 245],
  },
  listening: {
    deep: [6, 60, 52],
    lobeA: [16, 185, 129], // Electric Emerald
    lobeB: [34, 211, 238], // Bioluminescent Cyan
    lobeC: [110, 231, 183], // Neon Mint
    pearl: [255, 255, 255],
  },
  "speaking-input": {
    deep: [6, 60, 52],
    lobeA: [16, 185, 129],
    lobeB: [6, 182, 212],
    lobeC: [52, 211, 153],
    pearl: [255, 255, 255],
  },
  thinking: {
    deep: [15, 23, 62],
    lobeA: [14, 165, 233], // Sky Cyan
    lobeB: [99, 102, 241], // Indigo
    lobeC: [139, 92, 246], // Electric Violet
    pearl: [224, 242, 254],
  },
  working: {
    deep: [15, 23, 62],
    lobeA: [14, 165, 233],
    lobeB: [99, 102, 241],
    lobeC: [16, 185, 129],
    pearl: [224, 242, 254],
  },
  speaking: {
    deep: [6, 56, 50],
    lobeA: [16, 185, 129],
    lobeB: [20, 184, 166],
    lobeC: [56, 189, 248],
    pearl: [240, 253, 250],
  },
  discovery: {
    deep: [45, 28, 12],
    lobeA: [245, 158, 11], // Warm Saffron Gold
    lobeB: [16, 185, 129], // Fresh Emerald
    lobeC: [52, 211, 153], // Mint
    pearl: [254, 243, 199],
  },
  "cart-add": {
    deep: [4, 54, 42],
    lobeA: [16, 185, 129],
    lobeB: [52, 211, 153],
    lobeC: [20, 184, 166],
    pearl: [236, 253, 245],
  },
  checkout: {
    deep: [10, 32, 68],
    lobeA: [0, 112, 186], // PayPal Sapphire Blue
    lobeB: [255, 196, 57], // PayPal Gold
    lobeC: [56, 189, 248], // Electric Cyan
    pearl: [240, 249, 255],
  },
  "order-track": {
    deep: [12, 34, 64],
    lobeA: [14, 165, 233], // Sky Cyan
    lobeB: [16, 185, 129], // Emerald
    lobeC: [99, 102, 241], // Indigo
    pearl: [224, 242, 254],
  },
  "theme-switch": {
    deep: [38, 16, 62],
    lobeA: [139, 92, 246], // Amethyst Violet
    lobeB: [236, 72, 153], // Rose Magenta
    lobeC: [245, 158, 11], // Warm Amber
    pearl: [250, 245, 255],
  },
};

function rgbStr(rgb, alpha = 1) {
  return `rgba(${Math.round(rgb[0])}, ${Math.round(rgb[1])}, ${Math.round(rgb[2])}, ${alpha})`;
}

function lerpVec3(cur, target, t) {
  cur[0] += (target[0] - cur[0]) * t;
  cur[1] += (target[1] - cur[1]) * t;
  cur[2] += (target[2] - cur[2]) * t;
}

/**
 * VoiceOrb: Dual-Model 60fps 3D Volumetric AI Orb with Smooth Laminar Flow (Zero Heartbeat Pulsing)
 * - Model "liquid" (Default): 3D Iridescent Liquid Silk Sphere (Smooth continuous fluid folds)
 * - Model "ribbon": 3D Sculpted Spherical Glass Ribbons inside a Crystal Sphere
 */
export function VoiceOrb({
  status = "idle",
  glowPalette = "idle",
  model = "liquid",
  micLevel = 0,
  onClick,
  onKeyDown,
  label = "Voice interaction",
  disabled = false,
  className = "",
}) {
  const clampedLevel = Math.min(1, Math.max(0, micLevel));
  const [impulseSpin, setImpulseSpin] = useState(false);

  const canvasRef = useRef(null);
  const stateRef = useRef({
    status,
    glowPalette,
    model,
    micLevel: clampedLevel,
    spinBoost: 0,
  });

  useEffect(() => {
    stateRef.current.status = status;
    stateRef.current.glowPalette = glowPalette;
    stateRef.current.model = model;
    stateRef.current.micLevel = clampedLevel;
  }, [status, glowPalette, model, clampedLevel]);

  useEffect(() => {
    if (status === "working" || status === "speaking" || status === "listening") {
      stateRef.current.spinBoost = 0.85;
      setImpulseSpin(true);
      const timer = setTimeout(() => setImpulseSpin(false), 1450);
      return () => clearTimeout(timer);
    }
  }, [status, glowPalette]);

  const handleClick = (e) => {
    if (disabled) return;
    stateRef.current.spinBoost = 1.1;
    setImpulseSpin(true);
    setTimeout(() => setImpulseSpin(false), 1450);
    onClick?.(e);
  };

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
    let smoothEnergy = 0.18;
    let smoothSpeed = 0.72;
    let lastTime = performance.now();

    // Live interpolated palette state for buttery-smooth color transitions
    const livePal = {
      deep: [...ORB_PALETTES.idle.deep],
      lobeA: [...ORB_PALETTES.idle.lobeA],
      lobeB: [...ORB_PALETTES.idle.lobeB],
      lobeC: [...ORB_PALETTES.idle.lobeC],
      pearl: [...ORB_PALETTES.idle.pearl],
    };

    // 6 intersecting 3D iridescent liquid silk waves for "liquid" mode
    const silkLobes = [
      { freqA: 2, freqB: 3, speed: 0.75, offset: 0.0, scale: 0.86, tilt: 0.2, colorKey: "lobeA" },
      { freqA: 3, freqB: 2, speed: -0.64, offset: 1.1, scale: 0.82, tilt: -0.5, colorKey: "lobeB" },
      { freqA: 2, freqB: 4, speed: 0.88, offset: 2.3, scale: 0.78, tilt: 0.8, colorKey: "lobeC" },
      { freqA: 3, freqB: 5, speed: -0.78, offset: 3.5, scale: 0.74, tilt: -1.1, colorKey: "lobeA" },
      { freqA: 4, freqB: 3, speed: 0.96, offset: 4.7, scale: 0.70, tilt: 1.5, colorKey: "lobeB" },
      { freqA: 2, freqB: 3, speed: -0.54, offset: 5.4, scale: 0.64, tilt: -0.3, colorKey: "pearl" },
    ];

    // 5 sculpted 3D spherical ribbons for "ribbon" mode
    const ribbons = [
      { latBase: -0.52, width: 22, freq1: 2.0, freq2: 3.0, speed: 0.85, phaseOffset: 0.0, keyA: "deep", keyB: "lobeA" },
      { latBase: -0.18, width: 26, freq1: 2.0, freq2: 4.0, speed: -0.72, phaseOffset: 1.3, keyA: "pearl", keyB: "lobeC" },
      { latBase: 0.14, width: 24, freq1: 3.0, freq2: 2.0, speed: 0.95, phaseOffset: 2.5, keyA: "lobeA", keyB: "lobeB" },
      { latBase: 0.46, width: 20, freq1: 2.0, freq2: 3.0, speed: -0.82, phaseOffset: 3.8, keyA: "pearl", keyB: "lobeC" },
      { latBase: -0.02, width: 16, freq1: 3.0, freq2: 5.0, speed: 1.10, phaseOffset: 4.9, keyA: "lobeB", keyB: "lobeA" },
    ];

    const renderFrame = (now) => {
      const dt = Math.min(0.05, Math.max(0.004, (now - lastTime) / 1000));
      lastTime = now;

      const {
        status: curStatus,
        glowPalette: curGlow,
        model: curModel,
        micLevel: curMic,
        spinBoost,
      } = stateRef.current;
      stateRef.current.spinBoost = spinBoost * 0.96;

      // Smoothly interpolate color palette
      const paletteKey =
        ORB_PALETTES[curGlow] ? curGlow : ORB_PALETTES[curStatus] ? curStatus : "idle";
      const targetPal = ORB_PALETTES[paletteKey] || ORB_PALETTES.idle;
      const lerpSpeed = Math.min(1, dt * 3.2);
      lerpVec3(livePal.deep, targetPal.deep, lerpSpeed);
      lerpVec3(livePal.lobeA, targetPal.lobeA, lerpSpeed);
      lerpVec3(livePal.lobeB, targetPal.lobeB, lerpSpeed);
      lerpVec3(livePal.lobeC, targetPal.lobeC, lerpSpeed);
      lerpVec3(livePal.pearl, targetPal.pearl, lerpSpeed);

      // Smooth, non-pulsing target energy and laminar flow speed per state
      const targetEnergy =
        curStatus === "working"
          ? 0.42
          : curStatus === "speaking"
            ? 0.36
            : curStatus === "listening"
              ? Math.max(0.28, curMic * 0.65)
              : 0.16;

      const targetSpeed =
        curStatus === "working"
          ? 1.55
          : curStatus === "speaking"
            ? 1.18
            : curStatus === "listening"
              ? 1.02
              : 0.68;

      // Exponential damping so transitions are velvety-smooth with zero heartbeat throb
      smoothEnergy += (targetEnergy - smoothEnergy) * Math.min(1, dt * 2.4);
      smoothSpeed += (targetSpeed - smoothSpeed) * Math.min(1, dt * 2.4);

      phase += dt * (smoothSpeed + stateRef.current.spinBoost);

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, size, size);

      const cx = size / 2;
      const cy = size / 2;
      const R = size * 0.485;

      // Constant, steady 3D spherical boundary (never throbs in size)
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.clip();

      if (curModel === "liquid") {
        // ====================================================================
        // MODEL 1 (DEFAULT): SMOOTH 3D LIQUID PLASMA & IRIDESCENT SILK SPHERE
        // ====================================================================

        // 1. Deep 3D Volumetric Spherical Base with gently drifting light center
        const driftX = Math.sin(phase * 0.45) * 6;
        const driftY = Math.cos(phase * 0.38) * 6;
        const coreGrad = ctx.createRadialGradient(
          cx - R * 0.22 + driftX,
          cy - R * 0.24 + driftY,
          4,
          cx,
          cy,
          R * 1.08,
        );
        coreGrad.addColorStop(0, rgbStr(livePal.pearl, 0.94));
        coreGrad.addColorStop(0.34, rgbStr(livePal.lobeC, 0.74));
        coreGrad.addColorStop(0.70, rgbStr(livePal.lobeA, 0.88));
        coreGrad.addColorStop(1, rgbStr(livePal.deep, 0.98));
        ctx.fillStyle = coreGrad;
        ctx.fillRect(0, 0, size, size);

        // 2. Render 6 Smoothly Gliding 3D Iridescent Liquid Silk Waves
        silkLobes.forEach((lobe, idx) => {
          const lobeColor = livePal[lobe.colorKey] || livePal.lobeA;
          const altColor =
            idx % 2 === 0 ? livePal.lobeB : idx % 3 === 0 ? livePal.lobeC : livePal.pearl;

          const lobePhase = phase * lobe.speed + lobe.offset;
          const centerShiftX = Math.cos(lobePhase * 0.65 + idx) * (R * 0.14);
          const centerShiftY = Math.sin(lobePhase * 0.72 - idx) * (R * 0.14);
          const lx = cx + centerShiftX;
          const ly = cy + centerShiftY;

          ctx.save();
          ctx.beginPath();
          const lobeSteps = 64;
          const baseRad = R * lobe.scale;

          for (let i = 0; i <= lobeSteps; i++) {
            const a = (i / lobeSteps) * Math.PI * 2;
            // Smooth laminar 3D spherical harmonic fold deformation
            const fold =
              Math.sin(a * lobe.freqA + lobePhase) * (0.16 + smoothEnergy * 0.08) +
              Math.cos(a * lobe.freqB - lobePhase * 1.15) * (0.11 + smoothEnergy * 0.06);

            const rad = baseRad * (1 + fold);
            const rawX = Math.cos(a) * rad;
            const rawY = Math.sin(a) * rad * (0.84 + 0.14 * Math.sin(lobePhase * 0.5));
            const rot = lobe.tilt + lobePhase * 0.28;
            const px = lx + rawX * Math.cos(rot) - rawY * Math.sin(rot);
            const py = ly + rawX * Math.sin(rot) + rawY * Math.cos(rot);

            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.closePath();

          // Iridescent Silk Gradient Fill
          const silkGrad = ctx.createRadialGradient(
            lx - baseRad * 0.28,
            ly - baseRad * 0.28,
            2,
            lx,
            ly,
            baseRad * 1.22,
          );
          silkGrad.addColorStop(0, rgbStr(livePal.pearl, 0.76));
          silkGrad.addColorStop(0.40, rgbStr(lobeColor, 0.66));
          silkGrad.addColorStop(0.76, rgbStr(altColor, 0.40));
          silkGrad.addColorStop(1, rgbStr(lobeColor, 0.0));

          ctx.globalCompositeOperation = idx % 2 === 0 ? "screen" : "overlay";
          ctx.fillStyle = silkGrad;
          ctx.fill();

          // Smooth Luminous Silk Crest Ridge
          ctx.globalCompositeOperation = "screen";
          ctx.lineWidth = 1.75;
          ctx.strokeStyle =
            idx % 2 === 0
              ? rgbStr(livePal.pearl, 0.58)
              : rgbStr(livePal.lobeC, 0.50);
          ctx.stroke();
          ctx.restore();
        });

        // 3. Steady Soft Ambient Core Luminosity & 3D Spherical Rim Depth
        const innerCore = ctx.createRadialGradient(cx, cy, 2, cx, cy, R * 0.56);
        innerCore.addColorStop(0, rgbStr([255, 255, 255], 0.68));
        innerCore.addColorStop(0.48, rgbStr(livePal.pearl, 0.36));
        innerCore.addColorStop(1, rgbStr(livePal.lobeA, 0));
        ctx.globalCompositeOperation = "screen";
        ctx.fillStyle = innerCore;
        ctx.fillRect(0, 0, size, size);

        const rimShade = ctx.createRadialGradient(cx, cy, R * 0.58, cx, cy, R * 1.02);
        rimShade.addColorStop(0, "rgba(0, 0, 0, 0)");
        rimShade.addColorStop(0.82, rgbStr(livePal.deep, 0.22));
        rimShade.addColorStop(1, rgbStr(livePal.lobeB, 0.48));
        ctx.globalCompositeOperation = "source-over";
        ctx.fillStyle = rimShade;
        ctx.fillRect(0, 0, size, size);
      } else {
        // ====================================================================
        // MODEL 2: SMOOTH 3D SCULPTED CRYSTAL RIBBON SPHERE
        // ====================================================================
        const coreShiftX = Math.sin(phase * 0.5) * 6;
        const coreShiftY = Math.cos(phase * 0.4) * 6;
        const baseGrad = ctx.createRadialGradient(
          cx - 16 + coreShiftX,
          cy - 18 + coreShiftY,
          4,
          cx,
          cy,
          R * 1.08,
        );
        baseGrad.addColorStop(0, "#ffffff");
        baseGrad.addColorStop(0.28, rgbStr(livePal.pearl, 0.96));
        baseGrad.addColorStop(0.62, rgbStr(livePal.lobeC, 0.88));
        baseGrad.addColorStop(0.86, rgbStr(livePal.lobeA, 0.94));
        baseGrad.addColorStop(1, rgbStr(livePal.deep, 0.98));
        ctx.fillStyle = baseGrad;
        ctx.fillRect(0, 0, size, size);

        const tilt = -0.66 + 0.06 * Math.sin(phase * 0.35);
        const cosTilt = Math.cos(tilt);
        const sinTilt = Math.sin(tilt);
        const pitch = 0.22 * Math.cos(phase * 0.3);
        const cosPitch = Math.cos(pitch);
        const sinPitch = Math.sin(pitch);

        const projectPoint = (lon, lat) => {
          const cosLat = Math.cos(lat);
          const sinLat = Math.sin(lat);
          const x0 = R * cosLat * Math.sin(lon);
          const y0 = R * sinLat;
          const z0 = R * cosLat * Math.cos(lon);
          const y1 = y0 * cosPitch - z0 * sinPitch;
          const z1 = y0 * sinPitch + z0 * cosPitch;
          const x2 = x0 * cosTilt - y1 * sinTilt;
          const y2 = x0 * sinTilt + y1 * cosTilt;
          return { x: cx + x2, y: cy + y2, z: z1 };
        };

        const steps = 44;
        const waveAmp = 0.16 + smoothEnergy * 0.10;

        ribbons.forEach((rib) => {
          ctx.save();
          ctx.beginPath();
          let started = false;
          for (let i = 0; i <= steps; i++) {
            const u = (i / steps) * Math.PI * 2;
            const lon = u + phase * rib.speed + rib.phaseOffset;
            const wave =
              Math.sin(u * rib.freq1 + phase * 1.1 + rib.phaseOffset) * waveAmp +
              Math.cos(u * rib.freq2 - phase * 0.9) * (waveAmp * 0.55);
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
          ctx.strokeStyle = rgbStr(livePal[rib.keyB], 0.85);
          ctx.globalAlpha = 0.28;
          ctx.stroke();
          ctx.restore();
        });

        const coreGlow = ctx.createRadialGradient(cx, cy, 2, cx, cy, R * 0.56);
        coreGlow.addColorStop(0, "rgba(255, 255, 255, 0.78)");
        coreGlow.addColorStop(0.45, rgbStr(livePal.lobeC, 0.46));
        coreGlow.addColorStop(1, rgbStr(livePal.lobeA, 0));
        ctx.fillStyle = coreGlow;
        ctx.fillRect(0, 0, size, size);

        ribbons.forEach((rib, idx) => {
          const frontPoints = [];
          for (let i = 0; i <= steps; i++) {
            const t = (i / steps - 0.5) * Math.PI * 1.08;
            const u = t + phase * rib.speed + rib.phaseOffset;
            const wave =
              Math.sin(u * rib.freq1 + phase * 1.2 + rib.phaseOffset) * waveAmp +
              Math.cos(u * rib.freq2 - phase * 0.95 + idx) * (waveAmp * 0.6);
            const lat = Math.max(-1.22, Math.min(1.22, rib.latBase + wave));
            frontPoints.push(projectPoint(t, lat));
          }

          const grad = ctx.createLinearGradient(
            cx - R * 0.8,
            cy + R * 0.8,
            cx + R * 0.8,
            cy - R * 0.8,
          );
          grad.addColorStop(0, rgbStr(livePal[rib.keyA], 0.92));
          grad.addColorStop(0.52, rgbStr(livePal[rib.keyB], 0.95));
          grad.addColorStop(1, rgbStr(livePal[rib.keyA], 0.92));

          ctx.save();
          ctx.beginPath();
          frontPoints.forEach((pt, i) => {
            if (i === 0) ctx.moveTo(pt.x, pt.y);
            else ctx.lineTo(pt.x, pt.y);
          });
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          ctx.lineWidth = rib.width;
          ctx.strokeStyle = grad;
          ctx.shadowColor = rgbStr(livePal.deep, 0.35);
          ctx.shadowBlur = 10;
          ctx.stroke();

          ctx.beginPath();
          frontPoints.forEach((pt, i) => {
            if (i === 0) ctx.moveTo(pt.x - 1.5, pt.y - 2.2);
            else ctx.lineTo(pt.x - 1.5, pt.y - 2.2);
          });
          ctx.lineWidth = rib.width * 0.26;
          ctx.strokeStyle = rgbStr(livePal.pearl, 0.9);
          ctx.shadowBlur = 0;
          ctx.stroke();
          ctx.restore();
        });
      }

      // Stationary Top-Left 3D Studio Caustic Specular Reflection
      const specGrad = ctx.createRadialGradient(
        cx - R * 0.34,
        cy - R * 0.38,
        2,
        cx - R * 0.28,
        cy - R * 0.32,
        R * 0.65,
      );
      specGrad.addColorStop(0, "rgba(255, 255, 255, 0.72)");
      specGrad.addColorStop(0.35, "rgba(255, 255, 255, 0.20)");
      specGrad.addColorStop(1, "rgba(255, 255, 255, 0)");
      ctx.globalCompositeOperation = "screen";
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
        "--orb-scale": "1.000",
      }}
    >
      {/* Steady Diffused Backlight (Zero Pulsing/Heartbeat) */}
      <div
        className="voice-orb-aura absolute rounded-full pointer-events-none transition-colors duration-700 ease-out"
        data-state={status}
        data-glow={glowPalette}
        aria-hidden="true"
      />

      {/* Steady 3D Crystal Sphere with Smooth 60fps Internal Liquid Silk / Ribbon Flow */}
      <div
        className="voice-orb-sphere relative flex items-center justify-center rounded-full overflow-hidden"
        data-state={status}
        data-glow={glowPalette}
        data-model={model}
        data-spin={impulseSpin ? "true" : "false"}
        style={{
          width: "148px",
          height: "148px",
        }}
      >
        {/* Internal Layer 1: Deep 3D Volumetric Core Base */}
        <div
          className="voice-orb-core-depth absolute inset-0 rounded-full pointer-events-none"
          data-state={status}
          aria-hidden="true"
        />

        {/* Internal Layer 2: Primary Morphing Liquid Plasma Ribbon */}
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

        {/* Internal Layer 4: Steady Inner Acoustic Core */}
        <div
          className="voice-orb-acoustic-core absolute rounded-full pointer-events-none"
          data-state={status}
          aria-hidden="true"
        />

        {/* Internal Layer 5: 60fps Real-Time Smooth 3D Liquid Silk / Ribbon Canvas */}
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

      {/* Soft Floor Contact Shadow */}
      <div
        className="voice-orb-floor-shadow pointer-events-none"
        data-state={status}
        data-glow={glowPalette}
        aria-hidden="true"
      />
    </div>
  );
}

export default VoiceOrb;
