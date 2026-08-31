import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Camera, X, RefreshCw, Zap, CheckCircle2, AlertCircle, Sparkles, Barcode } from 'lucide-react';
import { Product } from '../types';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  onProductScanned: (product: Product) => void;
  formatCurrency: (val: number) => string;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  products,
  onProductScanned,
  formatCurrency,
}) => {
  const [scannerActive, setScannerActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);
  const [scannedProduct, setScannedProduct] = useState<Product | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [manualCode, setManualCode] = useState('');
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = 'interactive-barcode-scanner-region';

  // Sound chime synthesizer on scan
  const playBeep = () => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime); // A5 note
        osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
      }
    } catch {
      // AudioContext might be restricted until user interaction
    }
  };

  const handleBarcodeDetection = (decodedText: string) => {
    const cleanText = decodedText.trim();
    if (cleanText === lastScannedCode) return; // Prevent duplicate burst scans

    setLastScannedCode(cleanText);
    playBeep();

    // Match product by Barcode, SKU, or ID
    const matched = products.find(
      (p) =>
        p.barcode.toLowerCase() === cleanText.toLowerCase() ||
        p.sku.toLowerCase() === cleanText.toLowerCase() ||
        p.id.toLowerCase() === cleanText.toLowerCase()
    );

    if (matched) {
      setScannedProduct(matched);
      onProductScanned(matched);
      // Reset lastScannedCode after 2 seconds to allow re-scanning same item
      setTimeout(() => {
        setLastScannedCode(null);
      }, 2200);
    } else {
      setScannedProduct(null);
      setTimeout(() => {
        setLastScannedCode(null);
      }, 2000);
    }
  };

  useEffect(() => {
    if (!isOpen) {
      stopScanner();
      return;
    }

    let isMounted = true;

    const startScanner = async () => {
      setCameraError(null);
      try {
        // Stop any previous scanner instance
        if (scannerRef.current) {
          try {
            await scannerRef.current.stop();
          } catch {
            // Ignore
          }
        }

        const html5QrCode = new Html5Qrcode(scannerContainerId, {
          formatsToSupport: [
            Html5QrcodeSupportedFormats.QR_CODE,
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
          ],
          verbose: false,
        });

        scannerRef.current = html5QrCode;

        const config = {
          fps: 12,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        };

        await html5QrCode.start(
          { facingMode },
          config,
          (decodedText) => {
            if (isMounted) {
              handleBarcodeDetection(decodedText);
            }
          },
          () => {
            // Frame scan without barcode (quiet ignore)
          }
        );

        if (isMounted) {
          setScannerActive(true);
        }
      } catch (err: unknown) {
        if (isMounted) {
          console.warn('Camera scanner initialization notice:', err);
          setCameraError(
            'Camera preview unavailable in this frame or permission was not granted. You can use the instant test barcodes below or type any code.'
          );
          setScannerActive(false);
        }
      }
    };

    const timer = setTimeout(() => {
      startScanner();
    }, 150);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      stopScanner();
    };
  }, [isOpen, facingMode]);

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
      } catch {
        // Ignore
      }
      scannerRef.current = null;
    }
    setScannerActive(false);
  };

  const handleFlipCamera = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  const handleManualLookup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    handleBarcodeDetection(manualCode.trim());
    setManualCode('');
  };

  if (!isOpen) return null;

  return (
    <div
      id="barcode-scanner-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto"
    >
      <div
        id="barcode-scanner-modal-container"
        className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col my-auto"
      >
        {/* Modal Header */}
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-sm">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">Camera Barcode & QR Scanner</h2>
              <p className="text-xs text-slate-300">Point at any item barcode to instantly select for checkout</p>
            </div>
          </div>
          <button
            id="btn-close-scanner-modal"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Video / Camera Viewport */}
        <div className="relative bg-black flex flex-col items-center justify-center min-h-[300px] overflow-hidden">
          {/* html5-qrcode mounts inside this div */}
          <div
            id={scannerContainerId}
            className="w-full max-w-[340px] aspect-square rounded-xl overflow-hidden"
          />

          {/* Camera Scanning HUD Overlay */}
          {scannerActive && (
            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
              <div className="relative w-64 h-64 border-2 border-indigo-500/60 rounded-2xl flex items-center justify-center shadow-[0_0_20px_rgba(99,102,241,0.3)]">
                {/* Target Corners */}
                <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-indigo-400 -mt-1 -ml-1 rounded-tl-lg" />
                <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-indigo-400 -mt-1 -mr-1 rounded-tr-lg" />
                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-indigo-400 -mb-1 -ml-1 rounded-bl-lg" />
                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-indigo-400 -mb-1 -mr-1 rounded-br-lg" />

                {/* Animated Laser Scanning Line */}
                <div className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-rose-500 to-transparent shadow-[0_0_8px_rgba(244,63,94,0.8)] animate-pulse" />
              </div>
              <p className="mt-3 text-xs text-white/90 font-medium bg-slate-900/80 px-3 py-1 rounded-full border border-slate-700/80 backdrop-blur-md">
                Align barcode within the target box
              </p>
            </div>
          )}

          {/* Fallback info when camera is blocked or in sandbox */}
          {cameraError && (
            <div className="absolute inset-0 bg-slate-900/95 flex flex-col items-center justify-center p-6 text-center text-slate-200">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mb-3">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-semibold text-white mb-1">Camera Stream Inactive</h3>
              <p className="text-xs text-slate-400 max-w-sm mb-4 leading-relaxed">
                {cameraError}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setFacingMode((f) => (f === 'environment' ? 'user' : 'environment'))}
                  className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Retry Camera
                </button>
              </div>
            </div>
          )}

          {/* Controls Bar over Video */}
          <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between z-10">
            <span className="text-[11px] text-slate-300 bg-slate-900/80 px-2.5 py-1 rounded-md border border-slate-700/60 backdrop-blur-sm flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              Live Scanner Ready
            </span>
            <button
              id="btn-flip-camera"
              onClick={handleFlipCamera}
              className="px-2.5 py-1 text-xs font-medium rounded-md bg-slate-800/90 hover:bg-slate-700 text-white border border-slate-700 flex items-center gap-1.5 transition-colors shadow-sm"
              title="Switch Camera Facing Mode"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Switch Camera
            </button>
          </div>
        </div>

        {/* Scan Status & Result Banner */}
        <div className="p-4 bg-slate-50 border-t border-slate-200">
          {scannedProduct ? (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-emerald-900 line-clamp-1">{scannedProduct.name}</p>
                  <p className="text-[11px] text-emerald-700">
                    SKU: {scannedProduct.sku} • {formatCurrency(scannedProduct.sellingPrice)} (Added to Cart)
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-bold px-2 py-1 bg-emerald-600 text-white rounded-md shrink-0">
                +1 Added
              </span>
            </div>
          ) : lastScannedCode ? (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
              <p className="text-xs text-amber-800">
                Barcode <span className="font-mono font-bold text-amber-900">{lastScannedCode}</span> not registered in inventory.
              </p>
            </div>
          ) : (
            <form onSubmit={handleManualLookup} className="flex gap-2">
              <div className="relative flex-1">
                <Barcode className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Or enter barcode / SKU..."
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors shadow-sm"
              >
                Find & Add
              </button>
            </form>
          )}

          {/* Quick-Scan Interactive Simulator Bar */}
          <div className="mt-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-semibold text-slate-600 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                Quick Test Barcodes (Click to simulate scan):
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1 bg-white border border-slate-200 rounded-lg">
              {products.slice(0, 8).map((product) => (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => handleBarcodeDetection(product.barcode)}
                  className="px-2 py-1 text-[10px] font-medium bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-300 text-slate-700 border border-slate-200 rounded-md transition-colors flex items-center gap-1 text-left"
                >
                  <Barcode className="w-3 h-3 text-slate-400" />
                  <span className="font-mono font-semibold">{product.barcode}</span>
                  <span className="text-slate-400">({product.name.slice(0, 12)}...)</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 bg-white border-t border-slate-200 flex items-center justify-between">
          <p className="text-[11px] text-slate-500">
            Supports Standard Barcodes (EAN, UPC, Code-128) & QR Codes.
          </p>
          <button
            id="btn-done-scanner"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-lg transition-colors"
          >
            Done Scanning
          </button>
        </div>
      </div>
    </div>
  );
};
