import jsPDF from 'jspdf'

interface PharmacyInfo {
  name: string
  address?: string | null
  phone?: string | null
  license_number?: string | null
}

interface PurchaseReceiptItem {
  product_name: string
  quantity: number
  cost_price: number
  total: number
  batch_number: string
  expiry_date: string
}

interface PurchaseReceiptProps {
  pharmacy: PharmacyInfo
  supplier?: {
    name: string
    email?: string | null
    phone?: string | null
    address?: string | null
  }
  purchase: {
    id: string
    purchase_date: string
    invoice_number?: string | null
    purchase_type: string
    subtotal: number
    tax: number
    discount: number
    total: number
    notes?: string | null
    created_by: string
  }
  items: PurchaseReceiptItem[]
}

export function generatePurchaseReceiptPdf(props: PurchaseReceiptProps): jsPDF {
  const { pharmacy, supplier, purchase, items } = props
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [80, 250]
  })

  let y = 5
  const pageWidth = 80
  const leftMargin = 5
  const rightMargin = 5

  doc.setFontSize(15)
  doc.setFont('helvetica', 'bold')
  doc.text(pharmacy.name, pageWidth / 2, y, { align: 'center' })
  y += 5

  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  if (pharmacy.address) {
    doc.text(pharmacy.address, pageWidth / 2, y, { align: 'center' })
    y += 4
  }
  if (pharmacy.phone) {
    doc.text(`Tel: ${pharmacy.phone}`, pageWidth / 2, y, { align: 'center' })
    y += 4
  }
  if (pharmacy.license_number) {
    doc.text(`License: ${pharmacy.license_number}`, pageWidth / 2, y, { align: 'center' })
    y += 4
  }

  y += 2
  doc.setLineWidth(0.2)
  doc.line(leftMargin, y, pageWidth - rightMargin, y)
  y += 4

  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text('PURCHASE RECEIPT', pageWidth / 2, y, { align: 'center' })
  y += 5

  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.text(`Purchase #: ${purchase.id}`, leftMargin, y)
  y += 3
  if (purchase.invoice_number) {
    doc.text(`Invoice #: ${purchase.invoice_number}`, leftMargin, y)
    y += 3
  }
  doc.text(`Date: ${new Date(purchase.purchase_date).toLocaleString()}`, leftMargin, y)
  y += 3
  doc.text(`Type: ${purchase.purchase_type.replace(/_/g, ' ').toUpperCase()}`, leftMargin, y)
  y += 3

  if (supplier) {
    y += 2
    doc.setFont('helvetica', 'bold')
    doc.text('Supplier:', leftMargin, y)
    y += 3
    doc.setFont('helvetica', 'normal')
    doc.text(supplier.name, leftMargin, y)
    y += 3
    if (supplier.email) {
      doc.text(`Email: ${supplier.email}`, leftMargin, y)
      y += 3
    }
    if (supplier.phone) {
      doc.text(`Tel: ${supplier.phone}`, leftMargin, y)
      y += 3
    }
    if (supplier.address) {
      const address = supplier.address.length > 35 ? supplier.address.substring(0, 32) + '...' : supplier.address
      doc.text(address, leftMargin, y)
      y += 3
    }
  }

  y += 2
  doc.text(`Created by: ${purchase.created_by}`, leftMargin, y)
  y += 4

  doc.setLineWidth(0.1)
  doc.line(leftMargin, y, pageWidth - rightMargin, y)
  y += 3

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.text('Item', leftMargin, y)
  doc.text('Qty', leftMargin + 20, y)
  doc.text('Cost', leftMargin + 30, y)
  doc.text('Total', pageWidth - rightMargin, y, { align: 'right' })
  y += 3

  doc.setLineWidth(0.1)
  doc.line(leftMargin, y, pageWidth - rightMargin, y)
  y += 3

  doc.setFont('helvetica', 'normal')
  items.forEach((item) => {
    const productName = item.product_name.length > 22 ? item.product_name.substring(0, 20) + '..' : item.product_name
    doc.text(productName, leftMargin, y)
    doc.text(String(item.quantity), leftMargin + 20, y)
    doc.text(item.cost_price.toFixed(2), leftMargin + 30, y)
    doc.text(item.total.toFixed(2), pageWidth - rightMargin, y, { align: 'right' })
    y += 3

    doc.setFontSize(6)
    doc.text(`Batch: ${item.batch_number}`, leftMargin, y)
    const expiryDate = new Date(item.expiry_date).toLocaleDateString()
    doc.text(`Exp: ${expiryDate}`, leftMargin + 30, y)
    doc.setFontSize(7)
    y += 4
  })

  y += 2
  doc.setLineWidth(0.2)
  doc.line(leftMargin, y, pageWidth - rightMargin, y)
  y += 4

  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text('Subtotal:', leftMargin, y)
  doc.text(purchase.subtotal.toFixed(2), pageWidth - rightMargin, y, { align: 'right' })
  y += 3

  if (purchase.tax > 0) {
    doc.text('Tax:', leftMargin, y)
    doc.text(purchase.tax.toFixed(2), pageWidth - rightMargin, y, { align: 'right' })
    y += 3
  }

  if (purchase.discount > 0) {
    doc.text('Discount:', leftMargin, y)
    doc.text(`-${purchase.discount.toFixed(2)}`, pageWidth - rightMargin, y, { align: 'right' })
    y += 3
  }

  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('TOTAL:', leftMargin, y)
  doc.text(`Rs ${purchase.total.toFixed(2)}`, pageWidth - rightMargin, y, { align: 'right' })
  y += 5

  if (purchase.notes) {
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.text('Notes:', leftMargin, y)
    y += 3
    const noteLines = doc.splitTextToSize(purchase.notes, 70)
    doc.text(noteLines, leftMargin, y)
    y += noteLines.length * 3 + 3
  }

  doc.setLineWidth(0.2)
  doc.line(leftMargin, y, pageWidth - rightMargin, y)
  y += 4

  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.text('Generated by PharmaPOS', pageWidth / 2, y, { align: 'center' })

  return doc
}

export async function printPurchaseReceipt(props: PurchaseReceiptProps): Promise<void> {
  const doc = generatePurchaseReceiptPdf(props)
  doc.autoPrint()
  window.open(doc.output('bloburl'))
}

export function generatePurchaseReceiptHtml(props: PurchaseReceiptProps): string {
  const { pharmacy, supplier, purchase, items } = props
  return `
    <div class="receipt" style="width: 80mm; font-family: monospace; font-size: 11px; padding: 5mm;">
      <div style="text-align: center; margin-bottom: 5px;">
        <h5 style="margin: 0; font-size: 15px; font-weight: bold;">${pharmacy.name}</h5>
        ${pharmacy.address ? `<p style="margin: 2px 0;">${pharmacy.address}</p>` : ''}
        ${pharmacy.phone ? `<p style="margin: 2px 0;">Tel: ${pharmacy.phone}</p>` : ''}
        ${pharmacy.license_number ? `<p style="margin: 2px 0;">License: ${pharmacy.license_number}</p>` : ''}
      </div>
      <hr style="border: 1px solid #000; margin: 3px 0;">
      <div style="text-align: center;">
        <strong>PURCHASE RECEIPT</strong>
      </div>
      <div style="margin-top: 5px;">
        <p style="margin: 2px 0;">Purchase #: ${purchase.id}</p>
        ${purchase.invoice_number ? `<p style="margin: 2px 0;">Invoice #: ${purchase.invoice_number}</p>` : ''}
        <p style="margin: 2px 0;">Date: ${new Date(purchase.purchase_date).toLocaleString()}</p>
        <p style="margin: 2px 0;">Type: ${purchase.purchase_type.replace(/_/g, ' ').toUpperCase()}</p>
        ${supplier ? `
        <p style="margin: 2px 0;"><strong>Supplier: ${supplier.name}</strong></p>
        ${supplier.email ? `<p style="margin: 2px 0;">Email: ${supplier.email}</p>` : ''}
        ${supplier.phone ? `<p style="margin: 2px 0;">Tel: ${supplier.phone}</p>` : ''}
        ` : ''}
        <p style="margin: 2px 0;">Created by: ${purchase.created_by}</p>
      </div>
      <hr style="border: 1px solid #000; margin: 3px 0;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr style="border-bottom: 1px solid #000;">
          <th style="text-align: left; padding: 3px;">Item</th>
          <th style="text-align: right; padding: 3px;">Qty</th>
          <th style="text-align: right; padding: 3px;">Cost</th>
          <th style="text-align: right; padding: 3px;">Total</th>
        </tr>
        ${items.map(item => `
          <tr>
            <td colspan="4" style="padding: 2px 0; font-size: 10px;"><strong>${item.product_name}</strong></td>
          </tr>
          <tr>
            <td style="padding: 0; font-size: 9px;">
              Batch: ${item.batch_number}<br>
              Exp: ${new Date(item.expiry_date).toLocaleDateString()}
            </td>
            <td style="text-align: right;">${item.quantity}</td>
            <td style="text-align: right;">${item.cost_price.toFixed(2)}</td>
            <td style="text-align: right;">${item.total.toFixed(2)}</td>
          </tr>
        `).join('')}
      </table>
      <hr style="border: 1px solid #000; margin: 3px 0;">
      <div style="margin-top: 5px;">
        <p style="margin: 2px 0; display: flex; justify-content: space-between;">
          <span>Subtotal:</span>
          <span>${purchase.subtotal.toFixed(2)}</span>
        </p>
        ${purchase.tax > 0 ? `
        <p style="margin: 2px 0; display: flex; justify-content: space-between;">
          <span>Tax:</span>
          <span>${purchase.tax.toFixed(2)}</span>
        </p>
        ` : ''}
        ${purchase.discount > 0 ? `
        <p style="margin: 2px 0; display: flex; justify-content: space-between;">
          <span>Discount:</span>
          <span>-${purchase.discount.toFixed(2)}</span>
        </p>
        ` : ''}
        <p style="margin: 3px 0; display: flex; justify-content: space-between; font-weight: bold; font-size: 13px;">
          <span>TOTAL:</span>
          <span>Rs ${purchase.total.toFixed(2)}</span>
        </p>
        ${purchase.notes ? `
        <p style="margin: 3px 0;"><strong>Notes:</strong></p>
        <p style="margin: 2px 0;">${purchase.notes}</p>
        ` : ''}
      </div>
      <hr style="border: 1px solid #000; margin: 5px 0;">
      <div style="text-align: center; margin-top: 5px;">
        <p style="margin: 5px 0 0 0;">Generated by PharmaPOS</p>
      </div>
    </div>
  `
}
