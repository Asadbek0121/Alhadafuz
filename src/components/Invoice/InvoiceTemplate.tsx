import React from 'react';

interface InvoiceTemplateProps {
    order: any;
    settings: any;
    subTotal: number;
    grandTotal: number;
    clickMethod?: any;
}

export default function InvoiceTemplate({ order, settings, subTotal, grandTotal, clickMethod }: InvoiceTemplateProps) {
    // Click to'lov linkini tayyorlash
    let clickUrl = "";
    if (clickMethod?.config) {
        try {
            const config = JSON.parse(clickMethod.config);
            if (config.service_id && config.merchant_id) {
                clickUrl = `https://my.click.uz/services/pay?service_id=${config.service_id}&merchant_id=${config.merchant_id}&amount=${grandTotal}&transaction_param=${order.id}`;
            }
        } catch (e) {
            console.error("Click config parsing error", e);
        }
    }

    // Kuryer bot linki (Buyurtmani boshqarish uchun)
    const courierBotUsername = "Hadaf_kuryerbot"; // Haqiqiy kuryer bot username
    const courierBotUrl = `https://t.me/${courierBotUsername}?start=${order.id}`;

    return (
        <div className="invoice-container">
            <div className="header">
                <div className="brand">
                    <img src="/logo.png" alt="Logo" className="logo" />
                    <div className="brand-text">
                        <h1>Hadaf</h1>
                        <span className="market">Market</span>
                        <div className="tagline">SAVDO VA LOGISTIKA MARKAZI</div>
                    </div>
                </div>
                <div className="invoice-label">
                    <h2>INVOYS</h2>
                    <div className="domain">WWW.ALHADAF.UZ</div>
                </div>
            </div>

            <div className="info-section">
                <div className="bill-to">
                    <h3>Xaridor :</h3>
                    <div className="customer-name">{order.user.name || order.shippingName || "Mijoz"}</div>
                    <div className="customer-details">
                        <p>{order.shippingPhone || order.user.phone || "Telefon kiritilmagan"}</p>
                        <p>{order.user.email || "Email kiritilmagan"}</p>
                        <p style={{ maxWidth: '350px' }}>{order.shippingAddress || "Manzil kiritilmagan"}</p>
                    </div>
                </div>
                <div className="invoice-meta">
                    <div className="meta-item">
                        <div className="meta-label">Invoys № :</div>
                        <div className="meta-value">#{order.id.slice(-6).toUpperCase()}</div>
                    </div>
                    <div className="meta-item">
                        <div className="meta-label">Sana :</div>
                        <div className="meta-value" suppressHydrationWarning>
                            {new Date(order.createdAt).toLocaleDateString('uz-UZ', {
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric'
                            })}
                        </div>
                    </div>
                </div>
            </div>

            <table>
                <thead>
                    <tr>
                        <th>№</th>
                        <th>MAHSULOT TAVSIFI</th>
                        <th style={{ textAlign: 'center' }}>SONI</th>
                        <th style={{ textAlign: 'center' }}>NARXI (SO'M)</th>
                        <th style={{ textAlign: 'right' }}>JAMI</th>
                    </tr>
                </thead>
                <tbody>
                    {order.items.map((item: any, idx: number) => (
                        <tr key={item.id}>
                            <td style={{ color: '#9ca3af', fontWeight: 900 }}>{String(idx + 1).padStart(2, '0')}</td>
                            <td style={{ fontWeight: 700 }}>
                                {item.product.title}
                                <div style={{ fontSize: '10px', color: '#9ca3af', marginTop: '5px', fontWeight: 900 }}>
                                    ID: {item.productId.slice(-8).toUpperCase()}
                                </div>
                            </td>
                            <td style={{ textAlign: 'center', fontWeight: 900 }}>{item.quantity}</td>
                            <td style={{ textAlign: 'center', fontWeight: 700 }}>{item.price.toLocaleString()}</td>
                            <td style={{ textAlign: 'right', fontWeight: 900 }}>{(item.price * item.quantity).toLocaleString()}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <div className="totals-section">
                <div className="payment-info">
                    <h4>TO'LOV MA'LUMOTLARI :</h4>
                    <div className="payment-item">
                        <span style={{ fontWeight: 900, color: '#9ca3af', width: '120px' }}>TO'LOV USULI:</span>
                        <span style={{ fontWeight: 700 }}>
                            {order.paymentMethod === 'CASH' ? 'NAQD' :
                                order.paymentMethod === 'CARD' ? 'KARTA' :
                                    order.paymentMethod === 'TRANSFER' ? 'O\'TKAZMA' : order.paymentMethod}
                        </span>
                    </div>
                    <div className="payment-item">
                        <span style={{ fontWeight: 900, color: '#9ca3af', width: '120px' }}>HOLATI:</span>
                        <span style={{ fontWeight: 700, color: '#0052FF' }}>
                            {order.paymentStatus === 'PENDING' ? 'KUTILMOQDA' :
                                order.paymentStatus === 'PAID' ? 'TO\'LANDI' :
                                    order.paymentStatus === 'CANCELLED' ? 'BEKOR QILINDI' : order.paymentStatus}
                        </span>
                    </div>
                    <p className="thanks-text">Bizning xizmatimizdan foydalanganingiz uchun rahmat!</p>
                </div>

                <div className="totals-calc">
                    <div className="calc-row">
                        <span>ORALIK JAMI :</span>
                        <span className="calc-value">{subTotal.toLocaleString()}</span>
                    </div>
                    <div className="grand-total-box">
                        <span className="total-label">UMUMIY JAMI</span>
                        <div style={{ textAlign: 'right' }}>
                            <span className="total-amount">{grandTotal.toLocaleString()}</span>
                            <span className="currency">SO'M</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Terms and Dual QR Section */}
            <div style={{ marginTop: '40px', display: 'grid', gridTemplateColumns: '1.2fr 1.8fr', gap: '30px', alignItems: 'flex-start' }}>
                <div style={{ borderLeft: '2px solid #f3f4f6', paddingLeft: '20px' }}>
                    <h5 style={{ fontSize: '11px', fontWeight: 900, color: '#111827', textTransform: 'uppercase', marginBottom: '10px', letterSpacing: '0.1em' }}>Qoidalar va shartlar :</h5>
                    <ul style={{ fontSize: '10px', color: '#9ca3af', listStyle: 'none', padding: 0, margin: 0, lineHeight: '1.6', fontStyle: 'italic' }}>
                        <li>• Mahsulot sifati bo'yicha e'tirozlar 24 soat ichida kabul qilinadi.</li>
                        <li>• To'lov amalga oshirilgandan so'ng qaytarib berilmaydi.</li>
                        <li>• Yetkazib berilgan tovarlar tekshirib qabul qilinishi shart.</li>
                    </ul>

                    <div style={{ marginTop: '20px', display: 'flex', gap: '40px' }}>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ width: '120px', borderBottom: '1px solid #e5e7eb', marginBottom: '8px' }}></div>
                            <span style={{ fontSize: '9px', fontWeight: 900, color: '#9ca3af', textTransform: 'uppercase' }}>Xaridor imzosi</span>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ width: '120px', borderBottom: '1px solid #e5e7eb', marginBottom: '8px' }}></div>
                            <span style={{ fontSize: '9px', fontWeight: 900, color: '#9ca3af', textTransform: 'uppercase' }}>Sotuvchi (M.O'.)</span>
                        </div>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    {/* To'lov QR */}
                    <div style={{ textAlign: 'center' }}>
                        <div style={{
                            width: '100px',
                            height: '100px',
                            border: '1px solid #f3f4f6',
                            borderRadius: '8px',
                            margin: '0 auto 8px auto',
                            padding: '5px',
                            background: clickUrl ? 'white' : '#f9fafb',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            {clickUrl ? (
                                <img
                                    src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(clickUrl)}`}
                                    alt="Click QR"
                                    style={{ width: '100%', height: '100%' }}
                                />
                            ) : (
                                <span style={{ fontSize: '8px', color: '#9ca3af', fontWeight: 900, textTransform: 'uppercase' }}>CLICK SOZLANMAGAN</span>
                            )}
                        </div>
                        <div style={{ fontSize: '9px', fontWeight: 900, color: '#0052FF', letterSpacing: '0.05em' }}>CLICK TO'LOV</div>
                    </div>

                    {/* Kuryer QR */}
                    <div style={{ textAlign: 'center' }}>
                        <div style={{
                            width: '100px',
                            height: '100px',
                            border: '1px solid #f3f4f6',
                            borderRadius: '8px',
                            margin: '0 auto 8px auto',
                            padding: '5px',
                            background: 'white'
                        }}>
                            <img
                                src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(courierBotUrl)}`}
                                alt="Courier QR"
                                style={{ width: '100%', height: '100%' }}
                            />
                        </div>
                        <div style={{ fontSize: '9px', fontWeight: 900, color: '#111827', letterSpacing: '0.05em' }}>KURYER NAZORATI</div>
                    </div>
                </div>
            </div>

            <div className="footer">
                <div className="footer-grid">
                    <div className="footer-item">
                        <span style={{ color: '#2563eb', marginRight: '8px' }}>☎</span> {settings?.phone || "+998 71 200 01 05"}
                    </div>
                    <div className="footer-item" style={{ justifyContent: 'center' }}>
                        <span style={{ color: '#2563eb', marginRight: '8px' }}>✉</span> {settings?.email || "info@hadaf.uz"}
                    </div>
                    <div className="footer-item" style={{ justifyContent: 'flex-end', textAlign: 'right' }}>
                        <span style={{ color: '#2563eb', marginRight: '8px' }}>📍</span> {settings?.address || "Termiz, Surxondaryo"}
                    </div>
                </div>
            </div>
        </div>
    );
}
