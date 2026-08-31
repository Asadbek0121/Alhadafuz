/**
 * Hadaf Market professional email template (Uzbek).
 * Inline-styled — React Email kutubxonasisiz ishlaydi.
 */
export function buildInvoiceEmailHtml(invoice: any): string {
    const snap = typeof invoice.snapshotData === 'string'
        ? JSON.parse(invoice.snapshotData)
        : invoice.snapshotData;

    const itemsHtml = (snap.items || []).map((item: any) => `
        <tr>
            <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#334155;">
                ${item.title}${item.variantLabel ? `<br><span style="font-size:11px;color:#94a3b8;">${item.variantLabel}</span>` : ''}
            </td>
            <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;text-align:center;font-size:13px;color:#334155;">
                ${item.quantity}
            </td>
            <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;text-align:right;font-size:13px;color:#334155;">
                ${Number(item.price).toLocaleString()} so'm
            </td>
            <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;text-align:right;font-size:13px;font-weight:600;color:#334155;">
                ${Number(item.lineTotal).toLocaleString()} so'm
            </td>
        </tr>
    `).join('');

    const issueDate = new Date(invoice.issueDate || invoice.createdAt).toLocaleDateString('uz-UZ', {
        year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });

    return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background-color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;">
        <tr><td style="padding:32px 16px;">
            <table role="presentation" align="center" width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
                <!-- Header -->
                <tr>
                    <td style="padding:32px 32px 0;">
                        <table role="presentation" width="100%">
                            <tr>
                                <td style="font-size:24px;font-weight:900;color:#1e293b;">
                                    <span style="color:#2563eb;">Hadaf</span> Market
                                </td>
                                <td style="text-align:right;font-size:12px;color:#94a3b8;line-height:1.4;">
                                    Elektron chek<br>
                                    № ${invoice.invoiceNumber}
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>

                <!-- Divider -->
                <tr><td style="padding:16px 32px;"><hr style="border:0;border-top:2px solid #f1f5f9;"></td></tr>

                <!-- Customer + Order info -->
                <tr>
                    <td style="padding:0 32px;">
                        <table role="presentation" width="100%">
                            <tr>
                                <td width="50%" style="vertical-align:top;padding-right:16px;">
                                    <p style="font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;margin:0 0 4px;">Xaridor</p>
                                    <p style="margin:0;font-size:14px;font-weight:600;color:#1e293b;">${snap.customer?.name || '—'}</p>
                                    <p style="margin:4px 0 0;font-size:13px;color:#64748b;">${snap.customer?.phone || ''}</p>
                                </td>
                                <td width="50%" style="vertical-align:top;">
                                    <p style="font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;margin:0 0 4px;">Buyurtma</p>
                                    <p style="margin:0;font-size:13px;color:#334155;">№ ${snap.order?.id?.slice(-6)?.toUpperCase() || '—'}</p>
                                    <p style="margin:4px 0 0;font-size:11px;color:#64748b;">${snap.order?.paymentMethod || ''} | ${issueDate}</p>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>

                <!-- Items table -->
                <tr>
                    <td style="padding:24px 32px 0;">
                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                            <thead>
                                <tr style="background-color:#f8fafc;">
                                    <th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;">Mahsulot</th>
                                    <th style="padding:10px 12px;text-align:center;font-size:11px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;">Soni</th>
                                    <th style="padding:10px 12px;text-align:right;font-size:11px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;">Narxi</th>
                                    <th style="padding:10px 12px;text-align:right;font-size:11px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;">Jami</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${itemsHtml}
                            </tbody>
                        </table>
                    </td>
                </tr>

                <!-- Totals -->
                <tr>
                    <td style="padding:24px 32px;">
                        <table role="presentation" align="right" width="250" cellpadding="0" cellspacing="0">
                            <tr>
                                <td style="font-size:13px;color:#64748b;padding:4px 0;">Mahsulotlar sumasi</td>
                                <td style="font-size:13px;color:#334155;text-align:right;font-weight:500;padding:4px 0;">
                                    ${Number(snap.subtotal).toLocaleString()} so'm
                                </td>
                            </tr>
                            ${snap.discountAmount > 0 ? `
                            <tr>
                                <td style="font-size:13px;color:#64748b;padding:4px 0;">Chegirma</td>
                                <td style="font-size:13px;color:#ef4444;text-align:right;padding:4px 0;">
                                    −${Number(snap.discountAmount).toLocaleString()} so'm
                                </td>
                            </tr>` : ''}
                            ${snap.deliveryFee > 0 ? `
                            <tr>
                                <td style="font-size:13px;color:#64748b;padding:4px 0;">Yetkazib berish</td>
                                <td style="font-size:13px;color:#334155;text-align:right;padding:4px 0;">
                                    ${Number(snap.deliveryFee).toLocaleString()} so'm
                                </td>
                            </tr>` : ''}
                            <tr>
                                <td style="border-top:2px solid #e2e8f0;padding:12px 0 4px;font-size:14px;font-weight:700;color:#1e293b;">Jami to'landi</td>
                                <td style="border-top:2px solid #e2e8f0;padding:12px 0 4px;font-size:14px;font-weight:700;color:#1e293b;text-align:right;">
                                    ${Number(snap.totalAmount).toLocaleString()} so'm
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>

                <!-- Footer -->
                <tr>
                    <td style="padding:24px 32px 32px;text-align:center;background-color:#f8fafc;border-radius:0 0 16px 16px;">
                        <p style="margin:0 0 4px;font-size:12px;color:#94a3b8;">
                            Hadaf Market — Surxondaryo viloyati, Termiz shahri
                        </p>
                        <p style="margin:0 0 4px;font-size:12px;color:#94a3b8;">
                            Telefon: +998 (33) 686-20-01
                        </p>
                        <p style="margin:0;font-size:11px;color:#cbd5e1;">
                            © ${new Date().getFullYear()} Hadaf Market. Barcha huquqlar himoyalangan.
                        </p>
                    </td>
                </tr>
            </table>
        </td></tr>
    </table>
</body>
</html>`;
}