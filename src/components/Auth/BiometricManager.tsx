"use client";

import { useState, useEffect } from "react";
import { startRegistration, startAuthentication } from "@simplewebauthn/browser";
import { Fingerprint, Loader2, ShieldCheck, ShieldAlert, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { signIn } from "next-auth/react";
import { useTranslations } from "next-intl";

export default function BiometricManager() {
    const t = useTranslations('Profile');
    const [isSupported, setIsSupported] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isRegistered, setIsRegistered] = useState(false);

    useEffect(() => {
        // Check if WebAuthn is supported and platform authenticator is available
        if (typeof window !== "undefined" && (window as any).PublicKeyCredential) {
            (window as any).PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
                .then((available: boolean) => setIsSupported(available));

            // Check if already registered (can check via API)
            fetch('/api/user/info')
                .then(res => res.json())
                .then(user => {
                    if (user && user.authenticators && user.authenticators.length > 0) {
                        setIsRegistered(true);
                    }
                });
        }
    }, []);

    const handleRegister = async () => {
        setIsLoading(true);
        try {
            // 1. Get registration options from server
            const optionsRes = await fetch('/api/auth/webauthn/register-options');
            if (!optionsRes.ok) throw new Error(t('biometric_error'));
            const options = await optionsRes.json();

            // 2. Start biometric registration on the browser
            const credential = await startRegistration(options);

            // 3. Verify registration on the server
            const verifyRes = await fetch('/api/auth/webauthn/register-verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(credential),
            });

            if (verifyRes.ok) {
                const result = await verifyRes.json();
                if (result.verified) {
                    toast.success(t('biometric_success'));
                    setIsRegistered(true);
                }
            } else {
                throw new Error("Verification failed");
            }
        } catch (error: any) {
            console.error(error);
            if (error.name !== 'NotAllowedError') { // User cancelled
                toast.error(t('biometric_error') + ": " + (error.message || ""));
            }
        } finally {
            setIsLoading(false);
        }
    };

    if (!isSupported) return null;

    return (
        <div className="bg-gradient-to-br from-indigo-50 to-blue-50 p-6 rounded-2xl border border-indigo-100 flex gap-4">
            <div className="text-indigo-600 pt-1">
                <Fingerprint size={24} />
            </div>
            <div className="space-y-1 flex-1">
                <h4 className="font-bold text-indigo-900">{t('biometric_title')}</h4>
                <p className="text-sm text-indigo-800/80 leading-relaxed">
                    {t('biometric_desc')}
                </p>
                <button
                    onClick={handleRegister}
                    disabled={isLoading}
                    className={`mt-3 flex items-center gap-2 font-bold text-sm px-4 py-2 rounded-xl border transition-all ${isRegistered
                        ? "bg-green-500 text-white border-green-600 cursor-default"
                        : "bg-indigo-600 text-white border-indigo-700 hover:bg-indigo-700 shadow-md"
                        }`}
                >
                    {isLoading ? <Loader2 size={16} className="animate-spin" /> : (isRegistered ? <CheckCircle2 size={16} /> : <Fingerprint size={16} />)}
                    {isRegistered ? t('biometric_active') : t('biometric_enable')}
                </button>
            </div>
        </div>
    );
}

/**
 * Static function to trigger biometric login
 */
export async function startBiometricLogin(login?: string) {
    try {
        // 1. Get login options
        const optionsRes = await fetch('/api/auth/webauthn/login-options', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ login }),
        });

        if (!optionsRes.ok) {
            const errorData = await optionsRes.json().catch(() => ({}));
            throw new Error(errorData.details || errorData.error || "Biometrik login sozlamalarini olishda xatolik");
        }
        const options = await optionsRes.json();

        // 2. Start biometric authentication on the browser
        const assertion = await startAuthentication(options);

        // 3. Verify on server
        const verifyRes = await fetch('/api/auth/webauthn/login-verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(assertion),
        });

        if (verifyRes.ok) {
            const result = await verifyRes.json();
            if (result.verified && result.token) {
                // 4. Use the one-time token to sign in with NextAuth
                const signInResult = await signIn('credentials', {
                    login: 'TELEGRAM_TOKEN', // We reuse this provider as it supports token-based login
                    password: result.token,
                    redirect: false,
                });
                return signInResult;
            }
        }
        throw new Error("Tizimga kirish tasdiqlanmadi");
    } catch (error: any) {
        if (error.name === 'NotAllowedError') {
            // User cancelled, don't throw to avoid error toast
            return null;
        }
        console.error(error);
        throw error;
    }
}
