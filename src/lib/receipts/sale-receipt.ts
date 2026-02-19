import jsPDF from 'jspdf'

interface PharmacyInfo {
  name: string
  address?: string | null
  phone?: string | null
  license_number?: string | null
}

interface ReceiptItem {
  name: string
  quantity: number
  price: number
  total: number
  batch_number?: string | null
  expiry_date?: string | null
}

interface SaleReceiptProps {
  pharmacy: PharmacyInfo
  receipt: {
    id: string
    sale_date: string
    payment_method: string
    subtotal: number
    tax: number
    discount: number
    total: number
    paid_amount: number
    change: number
    cashier:string
    customer:string
  }
  items: ReceiptItem[]
}

export function generateSaleReceiptPdf(props: SaleReceiptProps): jsPDF {
  const { pharmacy, receipt, items } = props
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [80, 200]
  })

  let y = 5
  const pageWidth = 80
  const leftMargin = 5
  const rightMargin = 5
  const contentWidth = pageWidth - leftMargin - rightMargin

  doc.setFontSize(16)
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
  doc.text('SALES RECEIPT', pageWidth / 2, y, { align: 'center' })
  y += 5

  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.text(`Receipt #: ${receipt.id}`, leftMargin, y)
  y += 3
  doc.text(`Date: ${new Date(receipt.sale_date).toLocaleString()}`, leftMargin, y)
  y += 3
  doc.text(`Payment: ${receipt.payment_method}`, leftMargin, y)
  y += 3
  
  const formattedCustomer = receipt.customer && receipt.customer.length > 30 
    ? receipt.customer.substring(0, 27) + '...' 
    : receipt.customer || 'N/A'
  doc.text(`Customer: ${formattedCustomer}`, leftMargin, y)
  y += 3
  doc.text(`Cashier: ${receipt.cashier}`, leftMargin, y)
  y += 4

  doc.setLineWidth(0.1)
  doc.line(leftMargin, y, pageWidth - rightMargin, y)
  y += 3

  doc.setFont('helvetica', 'bold')
  doc.text('Item', leftMargin, y)
  doc.text('Qty', leftMargin + 25, y)
  doc.text('Price', leftMargin + 35, y)
  doc.text('Total', pageWidth - rightMargin, y, { align: 'right' })
  y += 3

  doc.setLineWidth(0.1)
  doc.line(leftMargin, y, pageWidth - rightMargin, y)
  y += 3

  doc.setFont('helvetica', 'normal')
  items.forEach((item) => {
    const itemName = item.name.length > 20 ? item.name.substring(0, 18) + '..' : item.name
    doc.text(itemName, leftMargin, y)
    doc.text(String(item.quantity), leftMargin + 25, y)
    doc.text(item.price.toFixed(2), leftMargin + 35, y)
    doc.text(item.total.toFixed(2), pageWidth - rightMargin, y, { align: 'right' })
    y += 3
    
    if (item.batch_number || item.expiry_date) {
      doc.setFontSize(6)
      if (item.batch_number) {
        doc.text(`Batch: ${item.batch_number}`, leftMargin, y)
      }
      if (item.expiry_date) {
        const expiryX = item.batch_number ? leftMargin + 35 : leftMargin
        doc.text(`Exp: ${new Date(item.expiry_date).toLocaleDateString()}`, expiryX, y)
      }
      doc.setFontSize(7)
    }
    y += 3
  })

  y += 2
  doc.setLineWidth(0.2)
  doc.line(leftMargin, y, pageWidth - rightMargin, y)
  y += 4

  doc.setFont('helvetica', 'bold')
  doc.text('Subtotal:', leftMargin, y)
  doc.text(receipt.subtotal.toFixed(2), pageWidth - rightMargin, y, { align: 'right' })
  y += 3

  if (receipt.tax > 0) {
    doc.setFont('helvetica', 'normal')
    doc.text('Tax (5%):', leftMargin, y)
    doc.text(receipt.tax.toFixed(2), pageWidth - rightMargin, y, { align: 'right' })
    y += 3
  }

  if (receipt.discount > 0) {
    doc.text('Discount:', leftMargin, y)
    doc.text(`-${receipt.discount.toFixed(2)}`, pageWidth - rightMargin, y, { align: 'right' })
    y += 3
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text('TOTAL:', leftMargin, y)
  doc.text(`Rs ${receipt.total.toFixed(2)}`, pageWidth - rightMargin, y, { align: 'right' })
  y += 5

  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text('Paid Amount:', leftMargin, y)
  doc.text(receipt.paid_amount.toFixed(2), pageWidth - rightMargin, y, { align: 'right' })
  y += 3
  doc.text('Change:', leftMargin, y)
  doc.text(receipt.change.toFixed(2), pageWidth - rightMargin, y, { align: 'right' })
  y += 5

  doc.setLineWidth(0.2)
  doc.line(leftMargin, y, pageWidth - rightMargin, y)
  y += 4

  doc.setFontSize(7)
  doc.text('Thank you for your purchase!', pageWidth / 2, y, { align: 'center' })
  y += 4
  doc.text('Please keep this receipt for returns', pageWidth / 2, y, { align: 'center' })
  y += 4
  doc.text('Generated by PharmaPOS', pageWidth / 2, y, { align: 'center' })

  return doc
}

export async function printSaleReceipt(props: SaleReceiptProps): Promise<void> {
  const doc = generateSaleReceiptPdf(props)
  doc.autoPrint()
  window.open(doc.output('bloburl'))
}

export function generateSaleReceiptHtml(props: SaleReceiptProps): string {
  const { pharmacy, receipt, items } = props
  return `
    <div class="receipt" style="width: 80mm; font-family: monospace; font-size: 12px; padding: 5mm;">
      <div style="text-align: center; margin-bottom: 5px;">
        <h5 style="margin: 0; font-size: 16px; font-weight: bold;">${pharmacy.name}</h5>
        ${pharmacy.address ? `<p style="margin: 2px 0;">${pharmacy.address}</p>` : ''}
        ${pharmacy.phone ? `<p style="margin: 2px 0;">Tel: ${pharmacy.phone}</p>` : ''}
        ${pharmacy.license_number ? `<p style="margin: 2px 0;">License: ${pharmacy.license_number}</p>` : ''}
      </div>
      <hr style="border: 1px solid #000; margin: 3px 0;">
      <div style="text-align: center;">
        <strong>SALES RECEIPT</strong>
      </div>
      <div style="margin-top: 5px;">
        <p style="margin: 2px 0;">Receipt #: ${receipt.id}</p>
        <p style="margin: 2px 0;">Date: ${new Date(receipt.sale_date).toLocaleString()}</p>
        <p style="margin: 2px 0;">Payment: ${receipt.payment_method}</p>
        <p style="margin: 2px 0;">Customer: ${receipt.customer || 'N/A'}</p>
        <p style="margin: 2px 0;">Cashier: ${receipt.cashier}</p>
      </div>
      <hr style="border: 1px solid #000; margin: 3px 0;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr style="border-bottom: 1px solid #000;">
          <th style="text-align: left; padding: 3px;">Item</th>
          <th style="text-align: right; padding: 3px;">Qty</th>
          <th style="text-align: right; padding: 3px;">Price</th>
          <th style="text-align: right; padding: 3px;">Total</th>
        </tr>
        ${items.map(item => `
          <tr>
            <td colspan="4" style="padding: 2px 0; font-size: 11px;"><strong>${item.name}</strong></td>
          </tr>
          <tr>
            <td style="padding: 0;">${item.batch_number ? `Batch: ${item.batch_number}` : ''}</td>
            <td style="text-align: right;">${item.quantity}</td>
            <td style="text-align: right;">${item.price.toFixed(2)}</td>
            <td style="text-align: right;">${item.total.toFixed(2)}</td>
          </tr>
        `).join('')}
      </table>
      <hr style="border: 1px solid #000; margin: 3px 0;">
      <div style="margin-top: 5px;">
        <p style="margin: 2px 0; display: flex; justify-content: space-between;">
          <span>Subtotal:</span>
          <span>${receipt.subtotal.toFixed(2)}</span>
        </p>
        ${receipt.tax > 0 ? `
        <p style="margin: 2px 0; display: flex; justify-content: space-between;">
          <span>Tax (5%):</span>
          <span>${receipt.tax.toFixed(2)}</span>
        </p>
        ` : ''}
        ${receipt.discount > 0 ? `
        <p style="margin: 2px 0; display: flex; justify-content: space-between;">
          <span>Discount:</span>
          <span>-${receipt.discount.toFixed(2)}</span>
        </p>
        ` : ''}
        <p style="margin: 3px 0; display: flex; justify-content: space-between; font-weight: bold; font-size: 14px;">
          <span>TOTAL:</span>
          <span>Rs ${receipt.total.toFixed(2)}</span>
        </p>
        <p style="margin: 2px 0; display: flex; justify-content: space-between;">
          <span>Paid Amount:</span>
          <span>${receipt.paid_amount.toFixed(2)}</span>
        </p>
        <p style="margin: 2px 0; display: flex; justify-content: space-between;">
          <span>Change:</span>
          <span>${receipt.change.toFixed(2)}</span>
        </p>
      </div>
      <hr style="border: 1px solid #000; margin: 5px 0;">
      <div style="text-align: center; margin-top: 5px;">
        <p style="margin: 2px 0;">Thank you for your purchase!</p>
        <p style="margin: 2px 0;">Please keep this receipt for returns</p>
        <p style="margin: 5px 0 0 0;">Generated by PharmaPOS</p>
      </div>
    </div>
  `
}
