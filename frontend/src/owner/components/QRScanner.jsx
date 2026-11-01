import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { X, Camera } from 'lucide-react';
import { createPortal } from 'react-dom';

export default function QRScanner({ onScan, onClose }) {
  const [error, setError] = useState(null);
  const scannerRef = useRef(null);

  useEffect(() => {
    let isMounted = true;
    const scannerId = "qr-reader-target";
    const html5QrCode = new Html5Qrcode(scannerId);
    scannerRef.current = html5QrCode;

    const config = {
      fps: 15,
      qrbox: { width: 240, height: 240 },
      formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE]
    };

    html5QrCode.start(
      { facingMode: 'environment' },
      config,
      (decodedText) => {
        if (isMounted) {
          html5QrCode.stop().then(() => {
            html5QrCode.clear();
            onScan(decodedText);
          }).catch(() => {
            onScan(decodedText);
          });
        }
      },
      () => {
        // Frame scanning attempt; ignore individual frame misses
      }
    ).catch(() => {
      if (isMounted) {
        setError('Please grant camera permission to scan QR codes.');
      }
    });

    return () => {
      isMounted = false;
      try {
        if (html5QrCode.isScanning) {
          html5QrCode.stop().catch(() => {}).then(() => html5QrCode.clear().catch(() => {}));
        } else {
          html5QrCode.clear().catch(() => {});
        }
      } catch {
        // ignore cleanup error on unmount
      }
    };
  }, [onScan]);

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm px-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden relative">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h3 className="font-bold text-gray-900 flex items-center gap-2">
            <Camera size={20} className="text-indigo-600" />
            Scan Customer QR
          </h3>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors cursor-pointer">
            <X size={20} />
          </button>
        </div>
        
        <div className="relative bg-black min-h-[300px] flex items-center justify-center overflow-hidden">
          {error ? (
            <div className="text-white text-center p-6">
              <Camera size={48} className="mx-auto mb-4 text-red-400 opacity-50" />
              <p className="text-sm">{error}</p>
            </div>
          ) : (
            <div id="qr-reader-target" className="w-full h-full min-h-[300px]"></div>
          )}
        </div>
        
        <div className="p-6 bg-gray-50 text-center">
          <p className="text-sm text-gray-500">Position the QR code within the frame to automatically scan and approve the referral reward.</p>
        </div>
      </div>
    </div>
  , document.body);
}
