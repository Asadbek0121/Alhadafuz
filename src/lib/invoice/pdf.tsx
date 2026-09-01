import React from 'react';
import ReactPDF, { Document, Page, Text, View, StyleSheet, Font, Image } from '@react-pdf/renderer';

// Register fonts if needed — by default @react-pdf uses Helvetica
Font.registerHyphenationCallback((word) => [word]);

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica', fontSize: 10, color: '#1e293b' },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  brandName: { fontSize: 22, fontWeight: 'bold' as const, color: '#2563eb' },
  invoiceNumber: { fontSize: 12, color: '#64748b', textAlign: 'right' as const, marginTop: 4 },
  divider: { borderBottom: '1px solid #e2e8f0', marginVertical: 16 },
  sectionTitle: { fontSize: 14, fontWeight: 'bold' as const, color: '#1e293b', marginBottom: 8 },
  infoRow: { flexDirection: 'row', marginBottom: 4 },
  infoLabel: { width: '30%', color: '#94a3b8', fontSize: 9 },
  infoValue: { width: '70%', color: '#334155', fontSize: 10, fontWeight: 'medium' as const },
  tableHeader: { flexDirection: 'row', backgroundColor: '#f8fafc', padding: '8 12', marginTop: 16 },
  tableHeaderCell: { fontSize: 8, color: '#94a3b8', fontWeight: 'bold' as const, textTransform: 'uppercase' as const },
  tableRow: { flexDirection: 'row', padding: '8 12', borderBottom: '1px solid #f1f5f9' },
  tableCell: { fontSize: 9, color: '#334155' },
  totalRow: { flexDirection: 'row', padding: '8 12', backgroundColor: '#f8fafc', marginTop: 8 },
  totalLabel: { fontSize: 10, fontWeight: 'bold' as const, color: '#1e293b' },
  totalValue: { fontSize: 10, fontWeight: 'bold' as const, color: '#1e293b', textAlign: 'right' as const },
  footer: { position: 'absolute' as const, bottom: 40, left: 40, right: 40, textAlign: 'center' as const, color: '#94a3b8', fontSize: 8 },
});

interface InvoicePdfProps {
  invoiceNumber: string;
  issueDate: string;
  orderId: string;
  customer: any;
  items: any[];
  subtotal: number;
  discountAmount: number;
  deliveryFee: number;
  totalAmount: number;
  currency: string;
  paymentMethod: string;
  paymentStatus: string;
  qrDataUrl?: string;
  logoUrl?: string;
}

const InvoicePdfDocument: React.FC<InvoicePdfProps> = (props) => (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Image
            src={props.logoUrl || 'https://www.alhadaf.uz/logo.png'}
            style={{ width: 34, height: 34, borderRadius: 6 }}
          />
          <View style={{ marginLeft: 8 }}>
            <Text style={styles.brandName}>Hadaf Market</Text>
            <Text style={{ fontSize: 9, color: '#64748b', marginTop: 2 }}>Surxondaryo, Termiz</Text>
          </View>
        </View>
        <View>
          <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#1e293b' }}>INVOICE</Text>
          <Text style={styles.invoiceNumber}>{props.invoiceNumber}</Text>
        </View>
      </View>

      <View style={styles.divider} />

      {/* Customer */}
      <Text style={styles.sectionTitle}>Xaridor</Text>
      <View style={styles.infoRow}><Text style={styles.infoLabel}>Ism</Text><Text style={styles.infoValue}>{props.customer?.name || '—'}</Text></View>
      <View style={styles.infoRow}><Text style={styles.infoLabel}>Telefon</Text><Text style={styles.infoValue}>{props.customer?.phone || '—'}</Text></View>
      <View style={styles.infoRow}><Text style={styles.infoLabel}>Buyurtma</Text><Text style={styles.infoValue}>#{props.orderId.slice(-6).toUpperCase()}</Text></View>
      <View style={styles.infoRow}><Text style={styles.infoLabel}>Sana</Text><Text style={styles.infoValue}>{props.issueDate}</Text></View>
      <View style={styles.infoRow}><Text style={styles.infoLabel}>To'lov</Text><Text style={styles.infoValue}>{props.paymentMethod} | {props.paymentStatus}</Text></View>

      {/* Items Table */}
      <View style={styles.tableHeader}>
        <Text style={[styles.tableHeaderCell, { width: '40%' }]}>Mahsulot</Text>
        <Text style={[styles.tableHeaderCell, { width: '15%', textAlign: 'center' }]}>Soni</Text>
        <Text style={[styles.tableHeaderCell, { width: '20%', textAlign: 'right' }]}>Narxi</Text>
        <Text style={[styles.tableHeaderCell, { width: '25%', textAlign: 'right' }]}>Jami</Text>
      </View>

      {props.items.map((item: any, i: number) => (
        <View key={i} style={styles.tableRow}>
          <Text style={[styles.tableCell, { width: '40%' }]}>{item.title}{item.variantLabel ? ` (${item.variantLabel})` : ''}</Text>
          <Text style={[styles.tableCell, { width: '15%', textAlign: 'center' }]}>{item.quantity}</Text>
          <Text style={[styles.tableCell, { width: '20%', textAlign: 'right' }]}>{Number(item.price).toLocaleString()}</Text>
          <Text style={[styles.tableCell, { width: '25%', textAlign: 'right' }]}>{Number(item.lineTotal).toLocaleString()}</Text>
        </View>
      ))}

      {/* Totals */}
      <View style={{ marginTop: 16, alignSelf: 'flex-end', width: '50%' }}>
        <View style={{ flexDirection: 'row', padding: '4 0' }}>
          <Text style={{ width: '50%', fontSize: 10, color: '#64748b' }}>Mahsulotlar</Text>
          <Text style={{ width: '50%', fontSize: 10, color: '#334155', textAlign: 'right' }}>{Number(props.subtotal).toLocaleString()} so'm</Text>
        </View>
        {props.discountAmount > 0 && (
          <View style={{ flexDirection: 'row', padding: '4 0' }}>
            <Text style={{ width: '50%', fontSize: 10, color: '#64748b' }}>Chegirma</Text>
            <Text style={{ width: '50%', fontSize: 10, color: '#ef4444', textAlign: 'right' }}>-{Number(props.discountAmount).toLocaleString()} so'm</Text>
          </View>
        )}
        {props.deliveryFee > 0 && (
          <View style={{ flexDirection: 'row', padding: '4 0' }}>
            <Text style={{ width: '50%', fontSize: 10, color: '#64748b' }}>Yetkazish</Text>
            <Text style={{ width: '50%', fontSize: 10, color: '#334155', textAlign: 'right' }}>{Number(props.deliveryFee).toLocaleString()} so'm</Text>
          </View>
        )}
        <View style={{ flexDirection: 'row', borderTop: '2px solid #e2e8f0', padding: '8 0', marginTop: 4 }}>
          <Text style={{ width: '50%', fontSize: 11, fontWeight: 'bold', color: '#1e293b' }}>JAMI</Text>
          <Text style={{ width: '50%', fontSize: 11, fontWeight: 'bold', color: '#1e293b', textAlign: 'right' }}>{Number(props.totalAmount).toLocaleString()} so'm</Text>
        </View>
      </View>

      {/* QR */}
      {props.qrDataUrl && (
        <View style={{ marginTop: 24, flexDirection: 'row', alignItems: 'center' }}>
          <Image src={props.qrDataUrl} style={{ width: 90, height: 90 }} />
          <View style={{ marginLeft: 12 }}>
            <Text style={{ fontSize: 9, color: '#64748b' }}>Buyurtmani kuzatish</Text>
            <Text style={{ fontSize: 8, color: '#94a3b8', marginTop: 2 }}>QR kodni skanerlang</Text>
          </View>
        </View>
      )}

      {/* Footer */}
      <View style={styles.footer}>
        <Text>Hadaf Market — Surxondaryo viloyati, Termiz shahri | Tel: +998 (33) 686-20-01</Text>
        <Text style={{ marginTop: 2 }}>© {new Date().getFullYear()} Hadaf Market. Barcha huquqlar himoyalangan.</Text>
      </View>
    </Page>
  </Document>
);

export async function generateInvoicePdf(invoice: any): Promise<Buffer> {
  const snap = typeof invoice.snapshotData === 'string' ? JSON.parse(invoice.snapshotData) : invoice.snapshotData;
  const issueDate = new Date(invoice.issueDate || invoice.createdAt).toLocaleDateString('uz-UZ', {
    year: 'numeric', month: 'long', day: 'numeric'  });

  // QR kod — buyurtmani kuzatish uchun
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.alhadaf.uz';
  const orderUrl = `${appUrl}/uz/delivery?order=${invoice.orderId}`;
  let qrDataUrl: string | undefined;
  try {
    const { generateQrDataUrl } = await import('./qr');
    qrDataUrl = await generateQrDataUrl(orderUrl, 120);
  } catch (e) {
    console.error('[invoice] PDF QR generation failed:', e);
  }

  const pdfStream = await ReactPDF.renderToStream(
    <InvoicePdfDocument
      invoiceNumber={invoice.invoiceNumber}
      issueDate={issueDate}
      orderId={invoice.orderId}
      customer={snap.customer || {}}
      items={snap.items || []}
      subtotal={snap.subtotal}
      discountAmount={snap.discountAmount}
      deliveryFee={snap.deliveryFee}
      totalAmount={snap.totalAmount}
      currency={snap.currency || 'UZS'}
      paymentMethod={snap.order?.paymentMethod || ''}
      paymentStatus={snap.order?.paymentStatus || ''}
      qrDataUrl={qrDataUrl}
      logoUrl={process.env.NEXT_PUBLIC_APP_URL ? `${process.env.NEXT_PUBLIC_APP_URL}/logo.png` : undefined}
    />
  );

  return new Promise((resolve, reject) => {
    const chunks: Uint8Array[] = [];
    pdfStream.on('data', (chunk: Uint8Array) => chunks.push(chunk));
    pdfStream.on('end', () => resolve(Buffer.concat(chunks)));
    pdfStream.on('error', reject);  });
}

export async function generateAndSaveInvoicePdf(invoiceId: string): Promise<Buffer> {
  const { prisma } = await import('@/lib/prisma');
  const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
  if (!invoice) throw new Error('Invoice not found');
  return generateInvoicePdf(invoice);
}
