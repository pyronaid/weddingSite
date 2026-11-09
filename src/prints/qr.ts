/**
 * QR codes as SVG. Error correction Q (25%): they still scan with glare, a
 * fold or a bit of tape. The library is loaded on first use only.
 */
export async function qrSvg(content: string): Promise<string> {
  const { default: QRCode } = await import('qrcode');
  return QRCode.toString(content, {
    type: 'svg',
    errorCorrectionLevel: 'Q',
    margin: 4,
    color: { dark: '#000000', light: '#ffffff' },
  });
}
