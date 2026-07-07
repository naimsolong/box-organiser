export function useQr() {
  async function toQrDataUrl(text: string, opts: { width?: number; margin?: number } = {}) {
    const QRCode = await import('qrcode')
    return QRCode.toDataURL(text, {
      width: opts.width ?? 256,
      margin: opts.margin ?? 2,
      errorCorrectionLevel: 'M',
    })
  }

  /** Absolute public URL encoded by the QR code: {siteUrl}/b/{shareCode} */
  function shareUrl(shareCode: string) {
    const cfg = useRuntimeConfig()
    const origin = cfg.public.siteUrl || (import.meta.client ? window.location.origin : '')
    return `${origin}/b/${shareCode}`
  }

  return { toQrDataUrl, shareUrl }
}
