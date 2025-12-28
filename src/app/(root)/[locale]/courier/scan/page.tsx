
"use client";

import { useEffect, useState, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { toast } from "sonner";
import { Loader2, Camera, Navigation, MapPin } from "lucide-react";

export default function CourierScanPage() {
    const [scanning, setScanning] = useState(false);
    const [result, setResult] = useState<string | null>(null);
    const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    // Using a ref to hold the scanner instance to control cleanup
    const scannerRef = useRef<Html5Qrcode | null>(null);

    useEffect(() => {
        // Get Location on Mount
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
                (err) => console.error("Location access denied", err)
            );
        }
    }, []);

    const startScan = async () => {
        setScanning(true);
        setResult(null);

        try {
            // small delay to render div
            await new Promise(r => setTimeout(r, 100));

            if (!scannerRef.current) {
                scannerRef.current = new Html5Qrcode("reader");
            }

            await scannerRef.current.start(
                { facingMode: "environment" },
                { fps: 10, qrbox: { width: 250, height: 250 } },
                onScanSuccess,
                onScanFailure
            );
        } catch (err) {
            console.error("Camera start failed", err);
            setScanning(false);
            toast.error("Kamerani ochib bo'lmadi. Ruxsatni tekshiring.");
        }
    };

    const stopScan = async () => {
        if (scannerRef.current) {
            try {
                await scannerRef.current.stop();
                setScanning(false);
            } catch (err) {
                console.error("Stop failed", err);
            }
        }
    };

    const onScanSuccess = async (decodedText: string) => {
        // Stop scanning immediately to prevent duplicate triggers
        if (scannerRef.current) {
            await scannerRef.current.stop();
            setScanning(false);
        }

        handleProcess(decodedText);
    };

    const onScanFailure = (error: any) => {
        // console.warn(error);
    };

    const handleProcess = async (token: string) => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/courier/scan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    token,
                    lat: location?.lat || 0,
                    lng: location?.lng || 0
                })
            });
            const data = await res.json();

            if (data.success) {
                setResult(data.orderId);
                toast.success(`Buyurtma #${data.orderId.slice(-6)}: ${data.status}`);
            } else {
                toast.error(data.error || "Xatolik yuz berdi");
            }
        } catch (e) {
            toast.error("Tarmoq xatoligi");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-black text-white p-4 flex flex-col items-center justify-center relative">

            <h1 className="text-2xl font-bold mb-8 flex items-center gap-2">
                <Navigation className="text-blue-500" /> Courier Scanner
            </h1>

            {/* Camera Viewport */}
            <div className="w-full max-w-md aspect-square bg-gray-900 rounded-2xl overflow-hidden border-2 border-gray-700 relative shadow-2xl">
                <div id="reader" className="w-full h-full"></div>

                {!scanning && !result && (
                    <div className="absolute inset-0 flex items-center justify-center flex-col gap-4 text-gray-500">
                        <Camera size={48} />
                        <p>Scan tugmasini bosing</p>
                    </div>
                )}

                {scanning && (
                    <div className="absolute top-4 right-4 animate-pulse">
                        <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    </div>
                )}
            </div>

            {/* Controls */}
            <div className="mt-8 w-full max-w-md space-y-4">
                {!scanning ? (
                    <button
                        onClick={startScan}
                        disabled={isLoading}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl text-lg shadow-lg flex items-center justify-center gap-2"
                    >
                        {isLoading ? <Loader2 className="animate-spin" /> : <Camera />}
                        QR Kodni Skanerlash
                    </button>
                ) : (
                    <button
                        onClick={stopScan}
                        className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 rounded-xl text-lg shadow-lg"
                    >
                        To'xtatish
                    </button>
                )}

                {/* Location Status */}
                <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
                    <MapPin size={16} className={location ? "text-green-500" : "text-gray-600"} />
                    {location ? "GPS Aktiv" : "Joylashuv aniqlanmoqda..."}
                </div>

                {/* Result Card */}
                {result && (
                    <div className="bg-green-600/20 border border-green-500/50 p-4 rounded-xl mt-4 text-center">
                        <p className="text-green-400 text-sm font-semibold uppercase tracking-wider">Muvaffaqiyatli</p>
                        <p className="text-white font-mono text-xl mt-1">Order #{result.slice(-6)}</p>
                        <p className="text-gray-300 text-xs mt-2">Status o'zgardi: ON_DELIVERY</p>
                    </div>
                )}
            </div>
        </div>
    );
}
