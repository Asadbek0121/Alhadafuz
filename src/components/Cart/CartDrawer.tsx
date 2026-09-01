"use client";
// noinspection CssInlineStyles,HtmlFormInputWithoutLabel,HtmlUnknownAttribute

import { useCartStore, cartItemKey, isChinaItem } from '@/store/useCartStore';
import styles from './CartDrawer.module.css';
import { X, Trash2, ShoppingCart, ChevronRight } from 'lucide-react';
import { Link } from '@/navigation';
import Image from "next/image";
import { useTranslations } from 'next-intl';
import { useScrollLock } from '@/hooks/useScrollLock';
import { useFocusTrap } from '@/hooks/useFocusTrap';

/** Tanlangan variant JSON'ni o'qib chiqadi */
function parseVariantLabel(variant?: string): string | null {
    if (!variant) return null;
    try {
        const obj = JSON.parse(variant);
        return Object.entries(obj).map(([k, v]) => `${k}: ${v}`).join(' · ');
    } catch {
        return variant;
    }
}

export default function CartDrawer() {
    const { items, isOpen, closeCart, removeFromCart, updateQuantity, total, isHydrated } = useCartStore();
    const tCart = useTranslations('Cart');
    const tHeader = useTranslations('Header');
    const tChina = useTranslations('ChinaOrder');
    const hasChina = items.some(isChinaItem);

    // Drawer ochiq paytida fon sahifa scroll qilinmaydi
    useScrollLock(isOpen);
    const drawerRef = useFocusTrap(isOpen, closeCart);

    if (!isOpen) return null;

    return (
        <>
            <div className={styles.overlay} onClick={closeCart}></div>
            <div className={styles.drawer} ref={drawerRef} role="dialog" aria-modal="true" aria-label={tCart('cart_title')}>
                <div className={styles.header}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <h3>{tHeader('savatcha')}</h3>
                        <span style={{ background: '#eee', padding: '2px 8px', borderRadius: '12px', fontSize: '14px', fontWeight: '600' }}>{isHydrated ? items.length : 0}</span>
                    </div>
                    <button onClick={closeCart} className={styles.closeBtn} title={tCart('close')} aria-label={tCart('close')}><X size={24} /></button>
                </div>

                <div className={styles.items}>
                    {!isHydrated || items.length === 0 ? (
                        <div className={styles.empty}>
                            <div style={{ marginBottom: '24px' }}>
                                <img src="/icons/empty-cart.svg" alt="" width={180} height={180} style={{ objectFit: 'contain' }} />
                            </div>
                            <h3 style={{ fontSize: '19px', fontWeight: '700', marginBottom: '12px', color: '#000' }}>{tCart('empty_title')}</h3>
                            <p style={{ color: '#888', fontSize: '15px', maxWidth: '280px', lineHeight: '1.4', margin: '0 auto 32px' }}>
                                {tCart('empty_desc')}
                            </p>
                            <Link href="/" onClick={closeCart} className={styles.btnContinue} style={{ width: '160px', borderRadius: '12px', background: '#007aff', textAlign: 'center', display: 'flex', justifyContent: 'center', alignItems: 'center', textDecoration: 'none' }}>
                                {tCart('back_home')}
                            </Link>
                        </div>
                    ) : (
                        items.map(item => (
                            <div key={cartItemKey(item)} className={styles.item}>
                                <Image
                                    src={item.image}
                                    alt={item.title}
                                    width={70}
                                    height={70}
                                    className={styles.image}
                                />
                                <div className={styles.details}>
                                    <div className={styles.title}>{item.title}</div>
                                    {item.fulfillmentType === 'CHINA_ORDER' && (
                                        <div className={styles.chinaLabel} style={{ fontSize: '11px', color: '#dc2626', fontWeight: 600, marginTop: 2 }}>
                                            {tChina('badge')} · {tChina('cargo_separate')}
                                        </div>
                                    )}
                                    {(item.variantLabel || parseVariantLabel(item.variant)) && (
                                        <div className={styles.variant}>{item.variantLabel || parseVariantLabel(item.variant)}</div>
                                    )}
                                    {item.sku && (
                                        <div className={styles.variant}>SKU: {item.sku}</div>
                                    )}
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '8px' }}>
                                        <div className={styles.controls}>
                                            <button onClick={() => updateQuantity(item.id, -1, item.variant, item.variantId)} title="Kamaytirish" aria-label="Mahsulot sonini kamaytirish">-</button>
                                            <span>{item.quantity}</span>
                                            <button onClick={() => updateQuantity(item.id, 1, item.variant, item.variantId)} title="Ko'paytirish" aria-label="Mahsulot sonini ko'paytirish">+</button>
                                        </div>
                                        <div className={styles.price}>{(item.price * item.quantity).toLocaleString()} {tHeader('som')}</div>
                                    </div>
                                </div>
                                <button className={styles.remove} onClick={() => removeFromCart(item.id, item.variant, item.variantId)} title="O'chirish" aria-label="Mahsulotni savatdan o'chirish">
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        ))
                    )}
                </div>

                {items.length > 0 && (
                    <div className={styles.footer}>
                        <div className={styles.total}>
                            <span style={{ fontWeight: '500' }}>{hasChina ? tChina('now_paid') : tCart('total')}:</span>
                            <span style={{ color: 'var(--primary)' }}>{total().toLocaleString()} {tHeader('som')}</span>
                        </div>
                        {hasChina && (
                            <div style={{ fontSize: '12px', color: '#dc2626', marginTop: 4, fontWeight: 500 }}>
                                {tChina('cargo_separate')}
                            </div>
                        )}

                        <div className={styles.actionButtons}>
                            <Link href="/checkout" onClick={closeCart} className={styles.checkoutBtn} style={{ textAlign: 'center', display: 'block', textDecoration: 'none' }}>
                                {tCart('checkout')}
                            </Link>
                            <Link href="/cart" onClick={closeCart} className={styles.viewCartBtn}>
                                {tHeader('savatcha')} <ChevronRight size={16} />
                            </Link>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
