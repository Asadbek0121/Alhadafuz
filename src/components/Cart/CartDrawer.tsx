"use client";

import { useCartStore } from '@/store/useCartStore';
import styles from './CartDrawer.module.css';
import { X, Trash2, ShoppingCart, ChevronRight } from 'lucide-react';
import { Link } from '@/navigation';
import { useTranslations } from 'next-intl';

export default function CartDrawer() {
    const { items, isOpen, closeCart, removeFromCart, updateQuantity, total } = useCartStore();
    const tCart = useTranslations('Cart');
    const tHeader = useTranslations('Header');

    if (!isOpen) return null;

    return (
        <>
            <div className={styles.overlay} onClick={closeCart}></div>
            <div className={styles.drawer}>
                <div className={styles.header}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <h3>{tHeader('savatcha')}</h3>
                        <span style={{ background: '#eee', padding: '2px 8px', borderRadius: '12px', fontSize: '14px', fontWeight: '600' }}>{items.length}</span>
                    </div>
                    <button onClick={closeCart} className={styles.closeBtn}><X size={24} /></button>
                </div>

                <div className={styles.items}>
                    {items.length === 0 ? (
                        <div className={styles.empty}>
                            <div style={{ marginBottom: '24px' }}>
                                <ShoppingCart size={100} strokeWidth={0} fill="#3b82f6" style={{ filter: 'drop-shadow(0 10px 20px rgba(59, 130, 246, 0.3))' }} />
                            </div>
                            <h3 style={{ fontSize: '19px', fontWeight: '700', marginBottom: '12px', color: '#000' }}>Savatda hozircha mahsulot yo‘q</h3>
                            <p style={{ color: '#888', fontSize: '15px', maxWidth: '280px', lineHeight: '1.4', margin: '0 auto 32px' }}>
                                Bosh sahifadagi termalardan boshlang yoki kerakli mahsulotni qidiruv orqali toping
                            </p>
                            <Link href="/" onClick={closeCart} className={styles.btnContinue} style={{ width: '160px', borderRadius: '12px', background: '#007aff', textAlign: 'center', display: 'flex', justifyContent: 'center', alignItems: 'center', textDecoration: 'none' }}>
                                Asosiy
                            </Link>
                        </div>
                    ) : (
                        items.map(item => (
                            <div key={item.id} className={styles.item}>
                                <img src={item.image} alt={item.title} className={styles.image} />
                                <div className={styles.details}>
                                    <div className={styles.title}>{item.title}</div>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '8px' }}>
                                        <div className={styles.controls}>
                                            <button onClick={() => updateQuantity(item.id, -1)}>-</button>
                                            <span>{item.quantity}</span>
                                            <button onClick={() => updateQuantity(item.id, 1)}>+</button>
                                        </div>
                                        <div className={styles.price}>{(item.price * item.quantity).toLocaleString()} {tHeader('som')}</div>
                                    </div>
                                </div>
                                <button className={styles.remove} onClick={() => removeFromCart(item.id)}>
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        ))
                    )}
                </div>

                {items.length > 0 && (
                    <div className={styles.footer}>
                        <div className={styles.total}>
                            <span style={{ fontWeight: '500' }}>{tCart('total')}:</span>
                            <span style={{ color: 'var(--primary)' }}>{total().toLocaleString()} {tHeader('som')}</span>
                        </div>

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
