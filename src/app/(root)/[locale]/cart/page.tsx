"use client";

import { useCartStore } from '@/store/useCartStore';
import { Trash2, ShoppingCart, Heart, Minus, Plus, ArrowRight } from 'lucide-react';
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
            <div className="container min-h-[60vh] flex flex-col items-center justify-center text-center py-12 px-4">
                <div className="mb-6 relative">
                    <div className="w-24 h-24 md:w-32 md:h-32 bg-blue-50 rounded-full flex items-center justify-center">
                        <ShoppingCart size={48} className="text-blue-500 md:w-14 md:h-14 fill-blue-500/10" strokeWidth={1.5} />
                    </div>
                </div>
                <h3 className="text-xl md:text-2xl font-bold text-slate-900 mb-3">{tCart('empty_title')}</h3>
                <p className="text-slate-500 text-sm md:text-base max-w-[300px] mb-8 leading-relaxed">
                    {tCart('empty_desc')}
                </p>
                <Link href="/" className="px-8 py-3.5 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-colors">
                    {tCart('back_home')}
                </Link>
            </div>
        )
    }

    return (
        <div className="container py-4 md:py-10 max-w-7xl mx-auto px-4 mb-20 md:mb-0">
            <h1 className="text-xl md:text-3xl font-black text-slate-900 mb-4 md:mb-8 tracking-tight">{tCart('cart_title')} <span className="text-slate-400 font-normal text-sm md:text-lg">({items.length} {tCart('items_count')})</span></h1>

            <div className="flex flex-col lg:flex-row gap-4 md:gap-8">
                {/* Left: Cart Items */}
                <div className="flex-1 bg-white rounded-2xl md:rounded-3xl border border-slate-100 p-3 md:p-6 shadow-sm h-fit">
                    <div className="flex items-center justify-between mb-4 md:mb-6 pb-2 md:pb-4 border-b border-slate-100">
                        <span className="font-bold text-sm md:text-base text-slate-700">{tHeader('mahsulotlar')}</span>
                        <button
                            className="text-xs md:text-sm font-bold text-red-500 hover:bg-red-50 px-2 py-1 md:px-3 md:py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
                            onClick={clearCart}
                        >
                            <Trash2 size={14} /> {tCart('clear_all')}
                        </button>
                    </div>

                    <div className="flex flex-col gap-0">
                        {items.map(item => (
                            <div key={item.id} className="flex gap-3 md:gap-6 py-3 md:py-6 border-b border-slate-100 last:border-0 group">
                                {/* Image */}
                                <div className="shrink-0 w-16 md:w-28 aspect-square bg-slate-50 rounded-xl p-2 flex items-center justify-center relative overflow-hidden">
                                    <img src={item.image} alt={item.title} className="w-full h-full object-contain mix-blend-multiply group-hover:scale-105 transition-transform duration-500" />
                                </div>

                                {/* Content */}
                                <div className="flex-1 flex flex-col justify-between py-0.5">
                                    <div className="flex justify-between items-start gap-2">
                                        <div className="flex flex-col gap-0.5">
                                            <h3 className="text-xs md:text-lg font-bold text-slate-900 line-clamp-2 leading-snug">{item.title}</h3>
                                            <span className="text-[10px] md:text-xs text-slate-400 font-medium bg-slate-100 px-1.5 py-0.5 rounded w-fit">Apple</span>
                                        </div>
                                        <button
                                            onClick={() => removeFromCart(item.id)}
                                            className="text-slate-300 hover:text-red-500 transition-colors p-1"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>

                                    <div className="flex items-end justify-between mt-2 md:mt-0">
                                        {/* Controls */}
                                        <div className="flex items-center gap-1 md:gap-2 bg-slate-50 rounded-xl p-1 border border-slate-100">
                                            <button
                                                onClick={() => updateQuantity(item.id, -1)}
                                                disabled={item.quantity <= 1}
                                                className="w-7 h-7 md:w-8 md:h-8 flex items-center justify-center bg-white rounded-lg shadow-sm text-slate-600 hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
                                            >
                                                <Minus size={14} strokeWidth={3} />
                                            </button>
                                            <input
                                                type="text"
                                                value={item.quantity}
                                                readOnly
                                                className="w-6 md:w-10 text-center bg-transparent font-bold text-slate-900 text-xs md:text-base outline-none"
                                            />
                                            <button
                                                onClick={() => updateQuantity(item.id, 1)}
                                                className="w-7 h-7 md:w-8 md:h-8 flex items-center justify-center bg-white rounded-lg shadow-sm text-slate-600 hover:text-blue-600 transition-all active:scale-95"
                                            >
                                                <Plus size={14} strokeWidth={3} />
                                            </button>
                                        </div>

                                        {/* Price */}
                                        <div className="text-right">
                                            <div className="text-sm md:text-lg font-black text-slate-900">{(item.price * item.quantity).toLocaleString()} <span className="text-[10px] md:text-xs font-normal text-slate-500">{tHeader('som')}</span></div>
                                            {item.quantity > 1 && <div className="text-[10px] md:text-xs text-slate-400 font-medium">{item.price.toLocaleString()} {tHeader('som')} / {tCart('pcs')}</div>}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right: Summary */}
                <div className="lg:w-[380px] shrink-0">
                    <div className="bg-white rounded-2xl md:rounded-3xl border border-slate-100 shadow-xl p-4 md:p-8 lg:sticky lg:top-24">
                        <h3 className="font-bold text-lg md:text-xl text-slate-900 mb-4 md:mb-6">{tCheckout('your_order')}</h3>

                        <div className="space-y-2 md:space-y-3 mb-6 md:mb-8">
                            <div className="flex justify-between text-slate-500 text-xs md:text-sm">
                                <span>{tHeader('mahsulotlar')} ({items.length}):</span>
                                <span className="font-medium text-slate-900">{total().toLocaleString()} {tHeader('som')}</span>
                            </div>
                            <div className="flex justify-between text-slate-500 text-xs md:text-sm">
                                <span>{tCart('discount')}:</span>
                                <span className="font-bold text-red-500">-0 {tHeader('som')}</span>
                            </div>
                            <div className="flex justify-between text-slate-500 text-xs md:text-sm">
                                <span>{tHeader('yetkazib_berish')}:</span>
                                <span className="font-bold text-slate-900">0 <span className="text-[10px] md:text-xs font-normal text-slate-500">{tHeader('som')}</span></span>
                            </div>
                            <div className="border-t border-dashed border-slate-200 my-2"></div>
                            <div className="flex justify-between text-base md:text-lg font-black text-slate-900">
                                <span>{tHeader('jami_to_lov')}:</span>
                                <span>{total().toLocaleString()} <small className="font-normal text-xs md:text-sm">{tHeader('som')}</small></span>
                            </div>
                        </div>

                        <button
                            onClick={() => {
                                if (isAuthenticated) {
                                    router.push('/checkout');
                                } else {
                                    router.push('/?auth=login&callbackUrl=/checkout');
                                }
                            }}
                            className="w-full bg-blue-600 text-white py-3 md:py-4 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 active:scale-[0.98] text-sm md:text-base"
                        >
                            {tCart('checkout')} <ArrowRight size={18} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
