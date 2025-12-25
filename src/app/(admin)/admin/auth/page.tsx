"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { Loader2 } from "lucide-react";

export default function AdminAuthPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const { register, handleSubmit } = useForm();

    const onSubmit = async (data: any) => {
        setLoading(true);
        // Admin credentials for dev/demo purposes if needed or strictly DB
        const result = await signIn("credentials", {
            email: data.email,
            password: data.password,
            redirect: false,
        });

        if (result?.error) {
            toast.error("Invalid credentials or access denied");
            setLoading(false);
        } else {
            toast.success("Welcome back, Admin!");
            router.push("/admin");
            router.refresh();
        }
    };

    return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
            <div style={{ background: '#fff', borderRadius: '12px', padding: '40px', boxShadow: '0 0 30px rgba(0,0,0,0.05)', width: '400px', maxWidth: '90%' }}>
                <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                    <div style={{ width: '50px', height: '50px', background: '#0085db', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '24px', fontWeight: 'bold', margin: '0 auto 15px' }}>M</div>
                    <h1 style={{ fontSize: '24px', color: '#2A3547', margin: 0 }}>Admin Login</h1>
                    <p style={{ color: '#5A6A85' }}>Enter your credentials to access admin panel</p>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#2A3547', marginBottom: '8px' }}>Email</label>
                        <input
                            {...register('email')}
                            type="email"
                            style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #e5eaef', outline: 'none' }}
                            placeholder="admin@example.com"
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#2A3547', marginBottom: '8px' }}>Password</label>
                        <input
                            {...register('password')}
                            type="password"
                            style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #e5eaef', outline: 'none' }}
                            placeholder="••••••••"
                        />
                    </div>

                    <button
                        disabled={loading}
                        style={{ background: '#0085db', color: '#fff', padding: '14px', borderRadius: '8px', border: 'none', fontWeight: 600, cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
                    >
                        {loading && <Loader2 className="animate-spin" size={20} style={{ marginRight: '10px' }} />}
                        Sign In
                    </button>
                </form>
            </div>
        </div>
    );
}
