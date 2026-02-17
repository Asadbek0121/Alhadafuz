
"use client";

import { CheckCircle, ArrowRight, Package } from 'lucide-react';
import { Link } from '@/navigation';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';

export default function OrderSuccessPage() {
    const searchParams = useSearchParams();
    const orderId = searchParams.get('orderId');
    const t = useTranslations('OrderSuccess');

    return (
        <div className="container" style={{ padding: '80px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            <div style={{
                width: '80px',
                height: '80px',
                background: '#e8f5e9',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '24px'
            }}>
                <CheckCircle size={48} color="#2e7d32" strokeWidth={2} />
            </div>

            <h1 style={{ fontSize: '32px', fontWeight: '800', marginBottom: '12px' }}>{t('title')}</h1>
            <p style={{ fontSize: '18px', color: '#666', marginBottom: '32px', maxWidth: '500px' }}>
                {t('subtitle')}
            </p>

            {orderId && (
                <div style={{
                    padding: '16px 24px',
                    background: '#f5f5f7',
                    borderRadius: '12px',
                    marginBottom: '40px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '12px',
                    fontWeight: '600'
                }}>
                    <Package size={20} color="#666" />
                    <span>{t('order_number')}: #{orderId.slice(-8).toUpperCase()}</span>
                </div>
            )}

            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center' }}>
                <Link href="/" style={{
                    padding: '12px 24px',
                    borderRadius: '12px',
                    background: '#f5f5f7',
                    color: '#000',
                    fontWeight: '600',
                    textDecoration: 'none'
                }}>
                    {t('btn_home')}
                </Link>
                <Link href={`/track/${orderId}`} style={{
                    padding: '12px 24px',
                    borderRadius: '12px',
                    background: '#0052FF',
                    color: '#fff',
                    fontWeight: '800',
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: '0 10px 15px -3px rgba(0, 82, 255, 0.2)'
                }}>
                    🚚 BUYURTMANI KUZATISH
                </Link>
                <Link href="/profile" style={{
                    padding: '12px 24px',
                    borderRadius: '12px',
                    background: '#0a0a0b',
                    color: '#fff',
                    fontWeight: '600',
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                }}>
                    {t('btn_orders')} <ArrowRight size={18} />
                </Link>
            </div>
        </div>
    );
}
