// The subset of the qrcode package used by qr.ts (it ships no types).
declare module 'qrcode' {
  interface ToStringOptions {
    type: 'svg';
    errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
    margin?: number;
    color?: { dark?: string; light?: string };
  }
  const QRCode: { toString(content: string, options: ToStringOptions): Promise<string> };
  export default QRCode;
}
