import QRCode from 'qrcode';

/** Invoice uchun QR data URL — email ichida ishonchli ko'rinadi (tashqi API yo'q). */
export async function generateQrDataUrl(data: string, size = 200): Promise<string> {
  try {
    return await QRCode.toDataURL(data, {
      width: size,
      margin: 1,
      errorCorrectionLevel: 'M',
    });
  } catch (e) {
    console.error('[invoice] QR generation failed:', e);
    return '';
  }
}

export async function generateQrBuffer(data: string): Promise<Buffer | null> {
  try {
    const buf = await QRCode.toBuffer(data, {
      width: 200,
      margin: 1,
      errorCorrectionLevel: 'M',
    });
    return buf;
  } catch (e) {
    console.error('[invoice] QR buffer failed:', e);
    return null;
  }
}
