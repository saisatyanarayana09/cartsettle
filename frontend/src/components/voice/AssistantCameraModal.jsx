import React, { useEffect, useRef, useState, useCallback } from "react";
import { Camera, Upload, X, Sparkles, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AssistantCameraModal({
  isOpen,
  onClose,
  onCaptureFile,
  onFallbackUpload,
  title = "AI Vision Camera",
}) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const isCancelledRef = useRef(false);
  const [error, setError] = useState("");
  const [starting, setStarting] = useState(false);

  // Complete hardware release: stops tracks on streamRef and videoRef, clears srcObject, releases camera lock
  const releaseCameraHardware = useCallback(() => {
    isCancelledRef.current = true;

    // 1. Stop all tracks on the active streamRef
    if (streamRef.current) {
      try {
        const tracks = streamRef.current.getTracks() || [];
        tracks.forEach((track) => {
          try {
            track.stop();
            track.enabled = false;
          } catch (e) {
            console.warn("Track stop error:", e);
          }
        });
      } catch (err) {
        console.warn("Stream release error:", err);
      }
      streamRef.current = null;
    }

    // 2. Stop tracks on video element's srcObject if attached, pause video, and detach srcObject
    if (videoRef.current) {
      try {
        const attachedStream = videoRef.current.srcObject;
        if (attachedStream && typeof attachedStream.getTracks === "function") {
          attachedStream.getTracks().forEach((t) => {
            try {
              t.stop();
              t.enabled = false;
            } catch {}
          });
        }
        videoRef.current.pause();
        videoRef.current.srcObject = null;
      } catch (e) {
        console.warn("Video element release error:", e);
      }
    }
  }, []);

  const startCamera = useCallback(async () => {
    releaseCameraHardware();
    isCancelledRef.current = false;
    setStarting(true);
    setError("");

    try {
      if (!navigator?.mediaDevices?.getUserMedia) {
        throw new Error("Camera API is not supported in this browser.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      // If user closed the modal while camera was initializing or permission was prompting:
      if (isCancelledRef.current) {
        stream.getTracks().forEach((t) => {
          try {
            t.stop();
            t.enabled = false;
          } catch {}
        });
        return;
      }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        try {
          await videoRef.current.play();
        } catch {}
      }
      setStarting(false);
    } catch (err) {
      if (isCancelledRef.current) return;
      setStarting(false);
      setError(err?.message || "Camera is unavailable or in use by another app.");
    }
  }, [releaseCameraHardware]);

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      releaseCameraHardware();
    }
    return () => {
      releaseCameraHardware();
    };
  }, [isOpen, startCamera, releaseCameraHardware]);

  useEffect(() => {
    const handleUnload = () => releaseCameraHardware();
    window.addEventListener("beforeunload", handleUnload);
    return () => window.removeEventListener("beforeunload", handleUnload);
  }, [releaseCameraHardware]);

  if (!isOpen) return null;

  const handleClose = () => {
    releaseCameraHardware();
    onClose();
  };

  const handleCapture = () => {
    const video = videoRef.current;
    if (!video) return;

    try {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Immediately shut off camera hardware so the laptop LED indicator turns off instantly
      releaseCameraHardware();

      canvas.toBlob(
        (blob) => {
          if (!blob) return;
          const file = new File([blob], `camera_capture_${Date.now()}.jpg`, {
            type: "image/jpeg",
          });
          onClose();
          onCaptureFile(file);
        },
        "image/jpeg",
        0.92
      );
    } catch (err) {
      console.error("Capture error:", err);
      releaseCameraHardware();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-emerald-500/40 text-white shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-sm font-bold tracking-tight">{title}</span>
            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">
              Instants Vision
            </span>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            aria-label="Close camera"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="relative w-full aspect-video bg-slate-950 flex items-center justify-center overflow-hidden">
          {!error ? (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              <div className="instants-scanner-beam" />
              <div className="pointer-events-none absolute inset-4 border-2 border-emerald-400/50 rounded-xl" />
              {starting && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-950/80 text-xs text-emerald-300 font-semibold gap-2">
                  <Sparkles className="size-4 animate-spin" />
                  Starting camera...
                </div>
              )}
            </>
          ) : (
            <div className="p-6 text-center space-y-3">
              <Camera className="size-8 text-amber-400 mx-auto" />
              <p className="text-xs text-slate-300 max-w-xs mx-auto leading-relaxed">
                {error}
              </p>
              <div className="flex items-center justify-center gap-2 pt-1">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={startCamera}
                  className="h-8 text-xs border-slate-700 bg-slate-800 text-white hover:bg-slate-700 cursor-pointer"
                >
                  <RefreshCw className="size-3.5 mr-1.5" />
                  Retry Camera
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    releaseCameraHardware();
                    onClose();
                    onFallbackUpload?.();
                  }}
                  className="h-8 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-bold cursor-pointer"
                >
                  <Upload className="size-3.5 mr-1.5" />
                  Upload Image Instead
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 px-4 py-3 bg-slate-900 border-t border-slate-800">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              releaseCameraHardware();
              onClose();
              onFallbackUpload?.();
            }}
            className="h-9 text-xs text-slate-300 hover:text-white hover:bg-slate-800 cursor-pointer"
          >
            <Upload className="size-3.5 mr-1.5" />
            Choose File Instead
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={Boolean(error) || starting}
            onClick={handleCapture}
            className="h-9 px-4 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer"
          >
            <Camera className="size-3.5 mr-1.5" />
            Capture & Scan Now
          </Button>
        </div>
      </div>
    </div>
  );
}

export default AssistantCameraModal;
