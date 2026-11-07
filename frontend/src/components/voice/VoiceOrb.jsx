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
 * VoiceOrb: Dual-Model 60fps 3D Volumetric AI Orb
 * - Model "liquid" (Default): 3D Morphing Liquid Plasma & Iridescent Silk Sphere (Siri iOS 18 / ChatGPT Voice style)
 * - Model "ribbon": 3D Sculpted Spherical Glass Ribbons inside a Crystal Sphere
 * Both models smoothly morph their 3D geometry and iridescent color palette per task and voice state.
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
  const scale = 1 + clampedLevel * 0.14;
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
      stateRef.current.spinBoost = 2.2;
      setImpulseSpin(true);
      const timer = setTimeout(() => setImpulseSpin(false), 1450);
      return () => clearTimeout(timer);
    }
  }, [status, glowPalette]);

  const handleClick = (e) => {
    if (disabled) return;
    stateRef.current.spinBoost = 2.8;
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
    let lastTime = performance.now();

    // Live interpolated palette state for buttery-smooth color transitions
    const livePal = {
      deep: [...ORB_PALETTES.idle.deep],
      lobeA: [...ORB_PALETTES.idle.lobeA],
      lobeB: [...ORB_PALETTES.idle.lobeB],
      lobeC: [...ORB_PALETTES.idle.lobeC],
      pearl: [...ORB_PALETTES.idle.pearl],
    };

    // 6 intersecting 3D iridescent liquid silk lobes for "liquid" mode
    const silkLobes = [
      { freqA: 2, freqB: 3, speed: 1.05, offset: 0.0, scale: 0.88, tilt: 0.2, colorKey: "lobeA" },
      { freqA: 3, freqB: 2, speed: -0.92, offset: 1.1, scale: 0.84, tilt: -0.5, colorKey: "lobeB" },
      { freqA: 2, freqB: 4, speed: 1.28, offset: 2.3, scale: 0.80, tilt: 0.8, colorKey: "lobeC" },
      { freqA: 3, freqB: 5, speed: -1.15, offset: 3.5, scale: 0.76, tilt: -1.1, colorKey: "lobeA" },
      { freqA: 4, freqB: 3, speed: 1.42, offset: 4.7, scale: 0.72, tilt: 1.5, colorKey: "lobeB" },
      { freqA: 2, freqB: 3, speed: -0.78, offset: 5.4, scale: 0.66, tilt: -0.3, colorKey: "pearl" },
    ];

    // 5 sculpted 3D spherical ribbons for "ribbon" mode
    const ribbons = [
      { latBase: -0.52, width: 22, freq1: 2.0, freq2: 3.0, speed: 1.15, phaseOffset: 0.0, keyA: "deep", keyB: "lobeA" },
      { latBase: -0.18, width: 26, freq1: 2.0, freq2: 4.0, speed: -0.95, phaseOffset: 1.3, keyA: "pearl", keyB: "lobeC" },
      { latBase: 0.14, width: 24, freq1: 3.0, freq2: 2.0, speed: 1.32, phaseOffset: 2.5, keyA: "lobeA", keyB: "lobeB" },
      { latBase: 0.46, width: 20, freq1: 2.0, freq2: 3.0, speed: -1.1, phaseOffset: 3.8, keyA: "pearl", keyB: "lobeC" },
      { latBase: -0.02, width: 16, freq1: 3.0, freq2: 5.0, speed: 1.55, phaseOffset: 4.9, keyA: "lobeB", keyB: "lobeA" },
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
      stateRef.current.spinBoost = spinBoost * 0.94;

      // Pick target palette based on active task glow or voice status
      const paletteKey =
        ORB_PALETTES[curGlow] ? curGlow : ORB_PALETTES[curStatus] ? curStatus : "idle";
      const targetPal = ORB_PALETTES[paletteKey] || ORB_PALETTES.idle;
      const lerpSpeed = Math.min(1, dt * 4.5);
      lerpVec3(livePal.deep, targetPal.deep, lerpSpeed);
      lerpVec3(livePal.lobeA, targetPal.lobeA, lerpSpeed);
      lerpVec3(livePal.lobeB, targetPal.lobeB, lerpSpeed);
      lerpVec3(livePal.lobeC, targetPal.lobeC, lerpSpeed);
      lerpVec3(livePal.pearl, targetPal.pearl, lerpSpeed);

      // Continuous organic voice & state energy modulation
      const speakingWave =
        curStatus === "speaking"
          ? 0.42 + 0.30 * Math.sin(now * 0.0085) + 0.18 * Math.cos(now * 0.014)
          : curStatus === "listening"
            ? Math.max(curMic, 0.25 + 0.15 * Math.sin(now * 0.0065))
            : curStatus === "working"
              ? 0.48 + 0.22 * Math.sin(now * 0.012)
              : 0.15 + 0.07 * Math.sin(now * 0.0032);

      const energy = Math.min(1, Math.max(curMic, speakingWave));
      const baseSpeed =
        curStatus === "working"
          ? 2.35
          : curStatus === "speaking"
            ? 1.75
            : curStatus === "listening"
              ? 1.45 + energy * 0.8
              : 0.92;

      phase += dt * (baseSpeed + stateRef.current.spinBoost);

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, size, size);

      const cx = size / 2;
      const cy = size / 2;
      const R = size * 0.465;

      if (curModel === "liquid") {
        // ====================================================================
        // MODEL 1 (DEFAULT): 3D MORPHING LIQUID PLASMA & IRIDESCENT SILK SPHERE
        // ====================================================================
        const outerSteps = 72;
        const morphAmp = 0.032 + energy * 0.055;

        // 1. Build Organic 3D Morphing Liquid Silhouette Clip Path
        ctx.beginPath();
        for (let i = 0; i <= outerSteps; i++) {
          const theta = (i / outerSteps) * Math.PI * 2;
          const deform =
            1 +
            Math.sin(theta * 2 + phase * 1.2) * morphAmp +
            Math.cos(theta * 3 - phase * 1.5) * (morphAmp * 0.75) +
            Math.sin(theta * 5 + phase * 2.1) * (morphAmp * 0.35);
          const r = R * deform;
          const x = cx + Math.cos(theta) * r;
          const y = cy + Math.sin(theta) * r;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.clip();

        // 2. Deep 3D Volumetric Spherical Base
        const coreGrad = ctx.createRadialGradient(
          cx - R * 0.22,
          cy - R * 0.24,
          4,
          cx,
          cy,
          R * 1.12,
        );
        coreGrad.addColorStop(0, rgbStr(livePal.pearl, 0.95));
        coreGrad.addColorStop(0.32, rgbStr(livePal.lobeC, 0.72));
        coreGrad.addColorStop(0.68, rgbStr(livePal.lobeA, 0.88));
        coreGrad.addColorStop(1, rgbStr(livePal.deep, 0.98));
        ctx.fillStyle = coreGrad;
        ctx.fillRect(0, 0, size, size);

        // 3. Render 6 Intersecting 3D Iridescent Liquid Silk Lobes (Siri / ChatGPT Fluid Folds)
        silkLobes.forEach((lobe, idx) => {
          const lobeColor = livePal[lobe.colorKey] || livePal.lobeA;
          const altColor =
            idx % 2 === 0 ? livePal.lobeB : idx % 3 === 0 ? livePal.lobeC : livePal.pearl;

          const lobePhase = phase * lobe.speed + lobe.offset;
          const centerShiftX = Math.cos(lobePhase * 0.8 + idx) * (R * 0.16);
          const centerShiftY = Math.sin(lobePhase * 0.9 - idx) * (R * 0.16);
          const lx = cx + centerShiftX;
          const ly = cy + centerShiftY;

          ctx.save();
          ctx.beginPath();
          const lobeSteps = 60;
          const baseRad = R * lobe.scale * (0.86 + energy * 0.16);

          for (let i = 0; i <= lobeSteps; i++) {
            const a = (i / lobeSteps) * Math.PI * 2;
            // 3D spherical harmonic fold deformation
            const fold =
              Math.sin(a * lobe.freqA + lobePhase) * (0.18 + energy * 0.14) +
              Math.cos(a * lobe.freqB - lobePhase * 1.3) * (0.12 + energy * 0.10) +
              Math.sin(a * (lobe.freqA + lobe.freqB) + phase * 1.8) * 0.05;

            const rad = baseRad * (1 + fold);
            // Apply 3D orbital tilt projection
            const rawX = Math.cos(a) * rad;
            const rawY = Math.sin(a) * rad * (0.82 + 0.18 * Math.sin(lobePhase * 0.6));
            const rot = lobe.tilt + lobePhase * 0.35;
            const px = lx + rawX * Math.cos(rot) - rawY * Math.sin(rot);
            const py = ly + rawX * Math.sin(rot) + rawY * Math.cos(rot);

            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.closePath();

          // Iridescent Silk Gradient Fill
          const silkGrad = ctx.createRadialGradient(
            lx - baseRad * 0.3,
            ly - baseRad * 0.3,
            2,
            lx,
            ly,
            baseRad * 1.25,
          );
          silkGrad.addColorStop(0, rgbStr(livePal.pearl, 0.78));
          silkGrad.addColorStop(0.38, rgbStr(lobeColor, 0.68));
          silkGrad.addColorStop(0.75, rgbStr(altColor, 0.42));
          silkGrad.addColorStop(1, rgbStr(lobeColor, 0.0));

          ctx.globalCompositeOperation = idx % 2 === 0 ? "screen" : "overlay";
          ctx.fillStyle = silkGrad;
          ctx.fill();

          // Luminous Silk Fold Crest Ridge (Gives the 3D glass-silk edge refraction)
          ctx.globalCompositeOperation = "screen";
          ctx.lineWidth = 1.8 + energy * 1.1;
          ctx.strokeStyle =
            idx % 2 === 0
              ? rgbStr(livePal.pearl, 0.62)
              : rgbStr(livePal.lobeC, 0.55);
          ctx.stroke();
          ctx.restore();
        });

        // 4. Voice-Reactive 3D Acoustic Ripple Waves inside the Sphere
        const rippleCount = 2;
        for (let rIdx = 0; rIdx < rippleCount; rIdx++) {
          const prog = ((phase * 0.55 + rIdx * 0.5) % 1);
          const ripRad = R * (0.18 + prog * 0.76);
          const ripAlpha = (1 - prog) * (0.24 + energy * 0.38);
          ctx.save();
          ctx.beginPath();
          for (let i = 0; i <= 48; i++) {
            const a = (i / 48) * Math.PI * 2;
            const w = 1 + Math.sin(a * 4 + phase * 2.4) * (0.04 + energy * 0.06);
            const rx = cx + Math.cos(a) * ripRad * w;
            const ry = cy + Math.sin(a) * ripRad * w;
            if (i === 0) ctx.moveTo(rx, ry);
            else ctx.lineTo(rx, ry);
          }
          ctx.closePath();
          ctx.globalCompositeOperation = "screen";
          ctx.lineWidth = 1.6 * (1 - prog * 0.5);
          ctx.strokeStyle = rgbStr(livePal.pearl, ripAlpha);
          ctx.stroke();
          ctx.restore();
        }

        // 5. Central Bioluminescent Star-Core & 3D Fresnel Rim Shading
        const corePulseRadius = R * (0.44 + energy * 0.32);
        const innerCore = ctx.createRadialGradient(cx, cy, 1, cx, cy, corePulseRadius);
        innerCore.addColorStop(0, rgbStr([255, 255, 255], 0.82 + energy * 0.16));
        innerCore.addColorStop(0.45, rgbStr(livePal.pearl, 0.45 + energy * 0.22));
        innerCore.addColorStop(1, rgbStr(livePal.lobeA, 0));
        ctx.globalCompositeOperation = "screen";
        ctx.fillStyle = innerCore;
        ctx.fillRect(0, 0, size, size);

        // 3D Spherical Edge Depth Vignette so the morphing lobes feel deeply 3D
        const rimShade = ctx.createRadialGradient(cx, cy, R * 0.55, cx, cy, R * 1.04);
        rimShade.addColorStop(0, "rgba(0, 0, 0, 0)");
        rimShade.addColorStop(0.82, rgbStr(livePal.deep, 0.22));
        rimShade.addColorStop(1, rgbStr(livePal.lobeB, 0.52));
        ctx.globalCompositeOperation = "source-over";
        ctx.fillStyle = rimShade;
        ctx.fillRect(0, 0, size, size);
      } else {
        // ====================================================================
        // MODEL 2: 3D SCULPTED CRYSTAL RIBBON SPHERE (WITH DYNAMIC TASK COLORS)
        // ====================================================================
        ctx.beginPath();
        ctx.arc(cx, cy, R, 0, Math.PI * 2);
        ctx.clip();

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
        baseGrad.addColorStop(0.28, rgbStr(livePal.pearl, 0.96));
        baseGrad.addColorStop(0.62, rgbStr(livePal.lobeC, 0.88));
        baseGrad.addColorStop(0.86, rgbStr(livePal.lobeA, 0.94));
        baseGrad.addColorStop(1, rgbStr(livePal.deep, 0.98));
        ctx.fillStyle = baseGrad;
        ctx.fillRect(0, 0, size, size);

        const tilt = -0.66 + 0.08 * Math.sin(phase * 0.45);
        const cosTilt = Math.cos(tilt);
        const sinTilt = Math.sin(tilt);
        const pitch = 0.25 * Math.cos(phase * 0.38);
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
        const waveAmp = 0.16 + energy * 0.18;

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
          ctx.strokeStyle = rgbStr(livePal[rib.keyB], 0.85);
          ctx.globalAlpha = 0.28;
          ctx.stroke();
          ctx.restore();
        });

        const coreRadius = R * (0.48 + energy * 0.34);
        const coreGlow = ctx.createRadialGradient(cx, cy, 2, cx, cy, coreRadius);
        coreGlow.addColorStop(0, `rgba(255, 255, 255, ${0.75 + energy * 0.22})`);
        coreGlow.addColorStop(0.45, rgbStr(livePal.lobeC, 0.42 + energy * 0.25));
        coreGlow.addColorStop(1, rgbStr(livePal.lobeA, 0));
        ctx.fillStyle = coreGlow;
        ctx.fillRect(0, 0, size, size);

        ribbons.forEach((rib, idx) => {
          const frontPoints = [];
          for (let i = 0; i <= steps; i++) {
            const t = (i / steps - 0.5) * Math.PI * 1.08;
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
          ctx.lineWidth = rib.width * (1 + energy * 0.14);
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
        "--orb-scale": scale.toFixed(3),
      }}
    >
      {/* Task-Reactive Diffused Backlight (Zero Circular Ring Borders) */}
      <div
        className="voice-orb-aura absolute rounded-full pointer-events-none transition-all duration-700 ease-out"
        data-state={status}
        data-glow={glowPalette}
        aria-hidden="true"
      />

      {/* 3D Crystal Sphere with Real-Time 60fps Liquid Silk or Ribbon Shader */}
      <div
        className="voice-orb-sphere relative flex items-center justify-center rounded-full overflow-hidden transition-transform duration-300 ease-out"
        data-state={status}
        data-glow={glowPalette}
        data-model={model}
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

        {/* Internal Layer 4: Voice-Reactive Central Acoustic Energy Core */}
        <div
          className="voice-orb-acoustic-core absolute rounded-full pointer-events-none"
          data-state={status}
          aria-hidden="true"
        />

        {/* Internal Layer 5: 60fps Real-Time 3D Volumetric Liquid Silk / Ribbon Canvas */}
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
