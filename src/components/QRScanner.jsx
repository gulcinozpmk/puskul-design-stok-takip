import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";

export default function QRScanner({ onScan, onClose }) {
  const videoRef = useRef(null);
  const controlsRef = useRef(null);
  const startedRef = useRef(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (startedRef.current) return; // StrictMode fix
    startedRef.current = true;

    const codeReader = new BrowserMultiFormatReader();

    startScanner(codeReader);

    return () => stopScanner();
  }, []);

  const startScanner = async (codeReader) => {
    try {
      const devices = await BrowserMultiFormatReader.listVideoInputDevices();

      if (!devices.length) {
        setError("Kamera bulunamadı.");
        return;
      }

      const deviceId = devices[devices.length - 1].deviceId;

      controlsRef.current = await codeReader.decodeFromVideoDevice(
        deviceId,
        videoRef.current,
        (result, err) => {
          if (result) {
            stopScanner();
            onScan(result.getText());
          }
        }
      );
    } catch (err) {
      setError("Kamera başlatılamadı.");
    }
  };

  const stopScanner = () => {
    if (controlsRef.current) {
      controlsRef.current.stop();
      controlsRef.current = null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm mx-4">

        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-800">
            📷 Barkod Tara
          </h3>

          <button
            onClick={() => {
              stopScanner();
              onClose();
            }}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
          >
            &times;
          </button>
        </div>

        {error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
            {error}
          </div>
        ) : (
          <video
            ref={videoRef}
            className="w-full rounded-lg"
          />
        )}

        <p className="text-xs text-gray-500 text-center mt-3">
          Barkodu kameraya yaklaştırın
        </p>
      </div>
    </div>
  );
}