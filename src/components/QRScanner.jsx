import { useEffect, useRef, useState } from 'react';
import BarcodeScannerComponent from 'react-qr-barcode-scanner';

export default function QRScanner({ onScan, onClose }) {
  const [error, setError] = useState('');
  const [scanned, setScanned] = useState(false);

  // Kamera var mı kontrol et
  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: true })
      .catch(() => setError('Kamera erişimi sağlanamadı. Lütfen kamera iznini kontrol edin.'));
  }, []);

  const handleUpdate = (err, result) => {
    if (scanned) return;
    if (result) {
      setScanned(true);
      onScan(result.text);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-800">📷 QR / Barkod Tara</h3>
          <button onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>

        {error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">{error}</div>
        ) : (
          <div className="relative rounded-lg overflow-hidden">
            <BarcodeScannerComponent
              width="100%"
              height={300}
              onUpdate={handleUpdate}
              facingMode="environment"
            />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-48 h-48 border-2 border-blue-400 rounded-lg opacity-70 relative">
                <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-blue-500 rounded-tl"></div>
                <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-blue-500 rounded-tr"></div>
                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-blue-500 rounded-bl"></div>
                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-blue-500 rounded-br"></div>
              </div>
            </div>
          </div>
        )}

        <p className="text-xs text-gray-500 text-center mt-3">
          QR kodu veya barkodu çerçeve içine getirin
        </p>
      </div>
    </div>
  );
}