"use client";

import { useCartStore } from '@/store/useCartStore';
import styles from './page.module.css';
import { Trash2, ShoppingCart, Heart, Minus, Plus } from 'lucide-react';
import { Link, useRouter } from '@/navigation';
import { useUserStore } from '@/store/useUserStore';
import { useTranslations } from 'next-intl';

export default function CartPage() {
    const { items, removeFromCart, updateQuantity, total, clearCart } = useCartStore();
    const tCart = useTranslations('Cart');
    const tHeader = useTranslations('Header');
    const tCheckout = useTranslations('Checkout');
    const router = useRouter();
    const { isAuthenticated } = useUserStore();

    if (items.length === 0) {
        return (
            <div className="container" style={{ padding: '60px 20px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: '60vh', justifyContent: 'center' }}>
                <div style={{ marginBottom: '24px' }}>
                    <ShoppingCart size={100} strokeWidth={0} fill="#3b82f6" style={{ filter: 'drop-shadow(0 10px 20px rgba(59, 130, 246, 0.3))' }} />
                </div>
                <h3 style={{ fontSize: '19px', fontWeight: '700', marginBottom: '12px', color: '#000' }}>Savatda hozircha mahsulot yo‘q</h3>
                <p style={{ color: '#888', fontSize: '15px', maxWidth: '300px', lineHeight: '1.4', margin: '0 auto 32px' }}>
                    Bosh sahifadagi termalardan boshlang yoki kerakli mahsulotni qidiruv orqali toping
                </p>
                <Link href="/" style={{ width: '160px', height: '44px', borderRadius: '12px', background: '#007aff', textAlign: 'center', display: 'flex', justifyContent: 'center', alignItems: 'center', textDecoration: 'none', color: 'white', fontWeight: 600, fontSize: '16px' }}>
                    Asosiy
                </Link>
            </div>
        )
    }

    return (
        <div className={`container ${styles.container}`}>
            <div className={styles.main}>
                <div className={styles.header}>
                    <h1>{tCart('cart_title')} <span style={{ color: '#888', fontSize: '18px', fontWeight: '400' }}>({items.length} {tCart('items_count')})</span></h1>
                    <button className={styles.clearBtn} onClick={clearCart}>
                        <Trash2 size={16} /> {tCart('clear_all')}
                    </button>
                </div>

                <div className={styles.list}>
                    {items.map(item => (
                        <div key={item.id} className={styles.item}>
                            <div className={styles.checkbox}>
                                <input type="checkbox" defaultChecked />
                            </div>
                            <img src={item.image} alt={item.title} className={styles.img} />

                            <div className={styles.info}>
                                <div className={styles.title}>{item.title}</div>
                                <div className={styles.meta}>
                                    <span className={styles.brand}>Apple</span>
                                </div>
                            </div>

                            <div className={styles.controls}>
                                <button onClick={() => updateQuantity(item.id, -1)} disabled={item.quantity <= 1}><Minus size={16} /></button>
                                <input type="text" value={item.quantity} readOnly />
                                <button onClick={() => updateQuantity(item.id, 1)}><Plus size={16} /></button>
                            </div>

                            <div className={styles.priceBlock}>
                                <div className={styles.price}>{(item.price * item.quantity).toLocaleString()} {tHeader('som')}</div>
                                <div className={styles.unitPrice}>{item.price.toLocaleString()} {tHeader('som')} / {tCart('pcs')}</div>
                            </div>

                            <div className={styles.actions}>
                                <button onClick={() => removeFromCart(item.id)} className={styles.actionBtn}>
                                    <Trash2 size={20} />
                                </button>
                                <button className={styles.actionBtn}>
                                    <Heart size={20} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className={styles.sidebar}>
                <div className={styles.summaryCard}>
                    <h3>{tCheckout('your_order')}</h3>

                    <div className={styles.summaryRow}>
                        <span>{tHeader('mahsulotlar')} ({items.length}):</span>
                        <span>{total().toLocaleString()} {tHeader('som')}</span>
                    </div>
                    <div className={styles.summaryRow}>
                        <span>{tCart('discount')}:</span>
                        <span style={{ color: 'red' }}>-0 {tHeader('som')}</span>
                    </div>
                    <div className={styles.summaryRow}>
                        <span>{tHeader('yetkazib_berish')}:</span>
                        <span style={{ color: 'green' }}>{tCart('free')}</span>
                    </div>

                    <div className={styles.divider}></div>

                    <div className={`${styles.summaryRow} ${styles.totalRow}`}>
                        <span>{tCart('total')}:</span>
                        <span>{total().toLocaleString()} {tHeader('som')}</span>
                    </div>

                    <button
                        onClick={() => {
                            if (isAuthenticated) {
                                router.push('/checkout');
                            } else {
                                router.push('/auth/login?callbackUrl=/checkout');
                            }
                        }}
                        className={styles.checkoutBtn}
                        style={{ display: 'block', width: '100%', textAlign: 'center', textDecoration: 'none' }}
                    >
                        {tCart('checkout')}
                    </button>
                </div>
            </div>
        </div>
    );
}
