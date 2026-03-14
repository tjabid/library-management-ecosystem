"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, X } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface BarcodeScannerProps {
  onScan: (value: string) => void;
  onClose: () => void;
}

export function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  const divRef = useRef<HTMLDivElement>(null);
  const scannerRef = useRef<{ stop: () => Promise<void> } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let stopped = false;

    const init = async () => {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        if (!divRef.current || stopped) return;

        const scanner = new Html5Qrcode("barcode-reader");
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 150 } },
          (decodedText) => {
            onScan(decodedText);
          },
          undefined
        );
      } catch (err) {
        if (!stopped) {
          setError("Camera access denied or not available. Enter the code manually.");
        }
      }
    };

    init();

    return () => {
      stopped = true;
      scannerRef.current?.stop().catch(() => {});
    };
  }, [onScan]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
      <div className="bg-white rounded-xl overflow-hidden w-full max-w-sm mx-4">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-blue-600" />
            <span className="font-semibold text-slate-900">Scan Barcode</span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div id="barcode-reader" ref={divRef} className="w-full" style={{ minHeight: 260 }} />

        {error && (
          <div className="px-4 pb-4">
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          </div>
        )}

        <div className="px-4 pb-4">
          <Button variant="secondary" className="w-full" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
