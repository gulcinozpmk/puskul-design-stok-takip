import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

export default function QRScanner({ onScan, onClose }) {
  const [error, setError] = useState('');
  const scannerRef = useRef(null);
  const scannedRef = useRef(false);

  useEffect(() => {
    const scannerId = 'html5-qrcode-scanner';
    const scanner = new Html5Qrcode(scannerId);
    scannerRef.current = scanner;

    Html5Qrcode.getCameras().then(cameras => {
      if (!cameras || cameras.length === 0) {
        setError('Kamera bulunamadı. Bu özelliği kullanmak için kameralı bir cihaz gereklidir.');
        return;
      }

      // Arka kamerayı tercih et
      const camera = cameras.find(c =>
        c.label.toLowerCase().includes('back') ||
        c.label.toLowerCase().includes('rear') ||
        c.label.toLowerCase().includes('arka')
      ) || cameras[cameras.length - 1];

      scanner.start(
        camera.id,
        { fps: 10, qrbox: { width: 220, height: 150 } },
        (decodedText) => {
          if (scannedRef.current) return;
          scannedRef.current = true;
          stopScanner();
          onScan(decodedText);
        },
        () => {} // Her frame'deki hataları görmezden gel
      ).catch(err => {
        setError('Kamera başlatılamadı: ' + err);
      });
    }).catch(() => {
      setError('Kamera erişimi sağlanamadı. Lütfen kamera iznini kontrol edin.');
    });

    return () => stopScanner();
  }, []);

  const stopScanner = () => {
    if (scannerRef.current) {
      try {
        scannerRef.current.stop().then(() => {
          scannerRef.current.clear();
        }).catch(() => {});
      } catch(e) {}
      scannerRef.current = null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-800">📷 QR / Barkod Tara</h3>
          <button onClick={() => { stopScanner(); onClose(); }}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>

        {error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
            {error}
          </div>
        ) : (
          <div className="relative rounded-lg overflow-hidden">
            <div id="html5-qrcode-scanner" className="w-full" />
          </div>
        )}

        <p className="text-xs text-gray-500 text-center mt-3">
          QR kodu veya barkodu çerçeve içine getirin
        </p>
      </div>
    </div>
  );
}