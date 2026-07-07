interface PdfEntry {
  label: string
  qr: string
}

interface LabelSheetOpts {
  pageSize?: 'a4' | 'letter'
  labelMm?: number
  gapMm?: number
  marginMm?: number
}

export function usePdf() {
  /** Single QR code on a page with a label underneath. */
  async function exportQrPdf(label: string, qrDataUrl: string, sizeMm = 60) {
    const { jsPDF } = await import('jspdf')
    const doc = new jsPDF({ unit: 'mm', format: 'a4' })
    const pageW = doc.internal.pageSize.getWidth()
    const pageH = doc.internal.pageSize.getHeight()
    const x = (pageW - sizeMm) / 2
    const y = (pageH - sizeMm) / 2 - 8
    doc.addImage(qrDataUrl, 'PNG', x, y, sizeMm, sizeMm)
    doc.setFontSize(16)
    doc.text(label, pageW / 2, y + sizeMm + 12, { align: 'center' })
    doc.save(`${label}-qr.pdf`)
  }

  /** Box manifest: header + QR + items table. */
  async function exportManifestPdf(box: { name: string; location?: string | null; category?: string | null; status?: string }, items: { name: string; description?: string | null; quantity: number }[], qrDataUrl: string) {
    const { jsPDF } = await import('jspdf')
    const doc = new jsPDF({ unit: 'mm', format: 'a4' })
    const pageW = doc.internal.pageSize.getWidth()
    let y = 22

    doc.setFontSize(20)
    doc.text(box.name, 14, y)
    y += 8

    doc.setFontSize(11)
    const meta = [box.location, box.category, box.status].filter(Boolean).join(' · ')
    if (meta) {
      doc.text(meta, 14, y)
      y += 6
    }
    doc.text(`Items: ${items.length}`, 14, y)

    doc.addImage(qrDataUrl, 'PNG', pageW - 44, 18, 30, 30)
    y += 10

    doc.setFontSize(10)
    doc.setTextColor(120)
    doc.text('Qty', 14, y)
    doc.text('Name', 30, y)
    doc.text('Description', 100, y)
    doc.setTextColor(0)
    y += 2
    doc.setDrawColor(220)
    doc.line(14, y, pageW - 14, y)
    y += 6

    for (const it of items) {
      if (y > 282) {
        doc.addPage()
        y = 20
      }
      doc.text(String(it.quantity), 14, y)
      doc.text(String(it.name).slice(0, 40), 30, y)
      doc.text(String(it.description ?? '').slice(0, 60), 100, y)
      y += 6
    }

    doc.save(`${box.name}-manifest.pdf`)
  }

  /** Grid of QR labels on a sheet (A4 or Letter). */
  async function exportLabelSheet(entries: PdfEntry[], opts: LabelSheetOpts = {}) {
    const { jsPDF } = await import('jspdf')
    const pageSize = opts.pageSize ?? 'a4'
    const labelMm = opts.labelMm ?? 40
    const gapMm = opts.gapMm ?? 5
    const marginMm = opts.marginMm ?? 12

    const doc = new jsPDF({ unit: 'mm', format: pageSize })
    const pageW = doc.internal.pageSize.getWidth()
    const pageH = doc.internal.pageSize.getHeight()
    const cellW = labelMm
    const cellH = labelMm + 8
    const cols = Math.max(1, Math.floor((pageW - marginMm * 2 + gapMm) / (cellW + gapMm)))
    const rows = Math.max(1, Math.floor((pageH - marginMm * 2 + gapMm) / (cellH + gapMm)))
    const perPage = cols * rows

    entries.forEach((e, i) => {
      const inPage = i % perPage
      if (i > 0 && inPage === 0) doc.addPage()
      const r = Math.floor(inPage / cols)
      const c = inPage % cols
      const x = marginMm + c * (cellW + gapMm)
      const y = marginMm + r * (cellH + gapMm)
      doc.addImage(e.qr, 'PNG', x, y, labelMm, labelMm)
      doc.setFontSize(9)
      doc.text(e.label.slice(0, 24), x + labelMm / 2, y + labelMm + 5, { align: 'center', maxWidth: cellW })
    })

    doc.save('box-labels.pdf')
  }

  return { exportQrPdf, exportManifestPdf, exportLabelSheet }
}
