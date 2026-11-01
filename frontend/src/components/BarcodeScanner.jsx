import React, { useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';

export default function BarcodeScanner({ onScan, onClose }) {
  useEffect(() => {
    // HTML5QrcodeScanner automatically adds its own UI
    const scanner = new Html5QrcodeScanner(
      "barcode-reader",
      { 
        fps: 10, 
        qrbox: { width: 250, height: 150 }, 
        aspectRatio: 1.0,
        supportedScanTypes: [0] // 0 means camera, we don't need file upload usually for mobile POS
      },
      false
    );

    scanner.render(
      (decodedText) => {
        scanner.clear();
        onScan(decodedText);
      },
      (error) => {
        // Ignore read errors
      }
    );

    return () => {
      scanner.clear().catch(e => console.error("Scanner clear error", e));
    };
  }, [onScan]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl p-4 w-full max-w-md shadow-2xl relative">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-slate-800">Scan Product Barcode</h2>
          <button onClick={onClose} className="p-2 text-slate-500 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
        
        <div id="barcode-reader" className="w-full overflow-hidden rounded-xl border-2 border-slate-100 bg-slate-50"></div>
        
        <p className="text-xs text-slate-500 text-center mt-4">Point your camera at the product's barcode (UPC/EAN).</p>
      </div>
    </div>
  );
}
