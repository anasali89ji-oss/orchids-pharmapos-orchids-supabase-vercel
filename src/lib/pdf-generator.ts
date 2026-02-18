import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { format } from 'date-fns'

interface ReportConfig {
  title: string
  subtitle?: string
  storeName?: string
  storeAddress?: string
  storePhone?: string
  dateRange?: { start: string; end: string }
  generatedBy?: string
}

interface TableColumn {
  header: string
  dataKey: string
  width?: number
  align?: 'left' | 'center' | 'right'
}

interface SummaryItem {
  label: string
  value: string | number
}

export class PDFGenerator {
  private doc: jsPDF
  private currentY: number = 20
  private pageWidth: number
  private margin: number = 15
  private primaryColor: [number, number, number] = [13, 148, 136]
  private textColor: [number, number, number] = [26, 35, 50]
  private mutedColor: [number, number, number] = [100, 116, 139]

  constructor(orientation: 'portrait' | 'landscape' = 'portrait') {
    this.doc = new jsPDF({ orientation, unit: 'mm', format: 'a4' })
    this.pageWidth = this.doc.internal.pageSize.getWidth()
  }

  addHeader(config: ReportConfig) {
    this.doc.setFillColor(...this.primaryColor)
    this.doc.rect(0, 0, this.pageWidth, 40, 'F')

    this.doc.setTextColor(255, 255, 255)
    this.doc.setFontSize(20)
    this.doc.setFont('helvetica', 'bold')
    this.doc.text(config.storeName || 'PharmaPOS', this.margin, 18)

    this.doc.setFontSize(10)
    this.doc.setFont('helvetica', 'normal')
    if (config.storeAddress) {
      this.doc.text(config.storeAddress, this.margin, 26)
    }
    if (config.storePhone) {
      this.doc.text(`Tel: ${config.storePhone}`, this.margin, 32)
    }

    this.doc.setFontSize(14)
    this.doc.setFont('helvetica', 'bold')
    this.doc.text(config.title, this.pageWidth - this.margin, 18, { align: 'right' })

    if (config.subtitle) {
      this.doc.setFontSize(10)
      this.doc.setFont('helvetica', 'normal')
      this.doc.text(config.subtitle, this.pageWidth - this.margin, 26, { align: 'right' })
    }

    if (config.dateRange) {
      this.doc.setFontSize(9)
      this.doc.text(
        `${config.dateRange.start} - ${config.dateRange.end}`,
        this.pageWidth - this.margin,
        32,
        { align: 'right' }
      )
    }

    this.currentY = 50
    return this
  }

  addTitle(title: string, subtitle?: string) {
    this.doc.setTextColor(...this.textColor)
    this.doc.setFontSize(16)
    this.doc.setFont('helvetica', 'bold')
    this.doc.text(title, this.margin, this.currentY)
    this.currentY += 6

    if (subtitle) {
      this.doc.setFontSize(10)
      this.doc.setFont('helvetica', 'normal')
      this.doc.setTextColor(...this.mutedColor)
      this.doc.text(subtitle, this.margin, this.currentY)
      this.currentY += 4
    }

    this.currentY += 4
    return this
  }

  addSummaryCards(items: SummaryItem[], columns: number = 4) {
    const cardWidth = (this.pageWidth - 2 * this.margin - (columns - 1) * 5) / columns
    const cardHeight = 20

    items.forEach((item, index) => {
      const col = index % columns
      const row = Math.floor(index / columns)
      const x = this.margin + col * (cardWidth + 5)
      const y = this.currentY + row * (cardHeight + 5)

      this.doc.setFillColor(241, 245, 249)
      this.doc.roundedRect(x, y, cardWidth, cardHeight, 2, 2, 'F')

      this.doc.setFontSize(8)
      this.doc.setTextColor(...this.mutedColor)
      this.doc.text(item.label, x + 4, y + 7)

      this.doc.setFontSize(12)
      this.doc.setFont('helvetica', 'bold')
      this.doc.setTextColor(...this.textColor)
      this.doc.text(String(item.value), x + 4, y + 15)
    })

    const totalRows = Math.ceil(items.length / columns)
    this.currentY += totalRows * (cardHeight + 5) + 5
    return this
  }

  addTable(columns: TableColumn[], data: Record<string, unknown>[], options?: { showTotal?: boolean; totalLabel?: string; totalValue?: string }) {
    const headers = columns.map(col => col.header)
    const body = data.map(row => columns.map(col => String(row[col.dataKey] ?? '')))

    if (options?.showTotal && options.totalLabel && options.totalValue) {
      const totalRow = columns.map((_, i) => {
        if (i === 0) return options.totalLabel!
        if (i === columns.length - 1) return options.totalValue!
        return ''
      })
      body.push(totalRow)
    }

    autoTable(this.doc, {
      startY: this.currentY,
      head: [headers],
      body: body,
      margin: { left: this.margin, right: this.margin },
      headStyles: {
        fillColor: this.primaryColor,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 9,
        cellPadding: 4
      },
      bodyStyles: {
        fontSize: 9,
        cellPadding: 3,
        textColor: this.textColor
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252]
      },
        columnStyles: columns.reduce((acc, col, i) => {
          acc[i] = { halign: (col.align || 'left') as 'left' | 'center' | 'right', cellWidth: (col.width || 'auto') as '*' | 'auto' | number }
          return acc
        }, {} as { [key: string]: Partial<any> }),
      didDrawPage: () => {
        this.addFooter()
      }
    })

    this.currentY = (this.doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10
    return this
  }

  addFooter() {
    const pageHeight = this.doc.internal.pageSize.getHeight()
    
    this.doc.setDrawColor(226, 232, 240)
    this.doc.line(this.margin, pageHeight - 15, this.pageWidth - this.margin, pageHeight - 15)
    
    this.doc.setFontSize(8)
    this.doc.setTextColor(...this.mutedColor)
    this.doc.text(
      `Generated on ${format(new Date(), 'PPpp')}`,
      this.margin,
      pageHeight - 8
    )
    this.doc.text(
      `Page ${this.doc.getNumberOfPages()}`,
      this.pageWidth - this.margin,
      pageHeight - 8,
      { align: 'right' }
    )
    return this
  }

  addNewPage() {
    this.doc.addPage()
    this.currentY = 20
    return this
  }

  addSpace(height: number = 10) {
    this.currentY += height
    return this
  }

  addText(text: string, options?: { fontSize?: number; color?: 'primary' | 'muted' | 'text'; bold?: boolean }) {
    this.doc.setFontSize(options?.fontSize || 10)
    this.doc.setFont('helvetica', options?.bold ? 'bold' : 'normal')
    
    const color = options?.color === 'primary' ? this.primaryColor :
                  options?.color === 'muted' ? this.mutedColor : this.textColor
    this.doc.setTextColor(...color)
    
    this.doc.text(text, this.margin, this.currentY)
    this.currentY += 6
    return this
  }

  addDivider() {
    this.doc.setDrawColor(226, 232, 240)
    this.doc.line(this.margin, this.currentY, this.pageWidth - this.margin, this.currentY)
    this.currentY += 5
    return this
  }

  save(filename: string) {
    this.addFooter()
    this.doc.save(filename)
  }

  getBlob(): Blob {
    this.addFooter()
    return this.doc.output('blob')
  }

  open() {
    this.addFooter()
    window.open(this.doc.output('bloburl'), '_blank')
  }
}

export function generateSalesReport(
  sales: Array<{
    receipt_number: string
    created_at: string
    customer_name: string
    items: Array<{ name: string; quantity: number }>
    grand_total: number
    payment_method: string
    payment_status: string
  }>,
  dateRange: { start: string; end: string },
  storeName: string = 'PharmaPOS'
) {
  const pdf = new PDFGenerator()
  
  const totalSales = sales.reduce((sum, s) => sum + Number(s.grand_total), 0)
  const cashSales = sales.filter(s => s.payment_method === 'Cash').reduce((sum, s) => sum + Number(s.grand_total), 0)
  const creditSales = sales.filter(s => s.payment_method === 'Credit').reduce((sum, s) => sum + Number(s.grand_total), 0)

  pdf.addHeader({
    title: 'Sales Report',
    subtitle: 'Detailed Transaction History',
    storeName,
    dateRange
  })

  pdf.addSummaryCards([
    { label: 'Total Transactions', value: sales.length },
    { label: 'Total Sales', value: `PKR ${totalSales.toLocaleString()}` },
    { label: 'Cash Sales', value: `PKR ${cashSales.toLocaleString()}` },
    { label: 'Credit Sales', value: `PKR ${creditSales.toLocaleString()}` }
  ])

  pdf.addTitle('Transaction Details')

  pdf.addTable(
    [
      { header: 'Receipt #', dataKey: 'receipt', width: 30 },
      { header: 'Date', dataKey: 'date', width: 35 },
      { header: 'Customer', dataKey: 'customer', width: 40 },
      { header: 'Items', dataKey: 'items', width: 20, align: 'center' },
      { header: 'Payment', dataKey: 'payment', width: 25, align: 'center' },
      { header: 'Status', dataKey: 'status', width: 20, align: 'center' },
      { header: 'Amount', dataKey: 'amount', width: 30, align: 'right' }
    ],
    sales.map(s => ({
      receipt: s.receipt_number,
      date: format(new Date(s.created_at), 'MMM dd, yyyy'),
      customer: s.customer_name,
      items: s.items.length,
      payment: s.payment_method,
      status: s.payment_status,
      amount: `PKR ${Number(s.grand_total).toLocaleString()}`
    })),
    {
      showTotal: true,
      totalLabel: 'Grand Total',
      totalValue: `PKR ${totalSales.toLocaleString()}`
    }
  )

  pdf.save(`sales_report_${format(new Date(), 'yyyy-MM-dd')}.pdf`)
}

export function generatePurchaseReport(
  purchases: Array<{
    purchase_number: string
    created_at: string
    supplier_name: string
    items: Array<{ name: string; qty: number }>
    total_amount: number
    payment_status: string
  }>,
  dateRange: { start: string; end: string },
  storeName: string = 'PharmaPOS'
) {
  const pdf = new PDFGenerator()
  
  const totalPurchases = purchases.reduce((sum, p) => sum + Number(p.total_amount), 0)
  const paidTotal = purchases.filter(p => p.payment_status === 'Paid').reduce((sum, p) => sum + Number(p.total_amount), 0)
  const unpaidTotal = purchases.filter(p => p.payment_status !== 'Paid').reduce((sum, p) => sum + Number(p.total_amount), 0)

  pdf.addHeader({
    title: 'Purchase Report',
    subtitle: 'Stock Purchases Summary',
    storeName,
    dateRange
  })

  pdf.addSummaryCards([
    { label: 'Total Orders', value: purchases.length },
    { label: 'Total Amount', value: `PKR ${totalPurchases.toLocaleString()}` },
    { label: 'Paid', value: `PKR ${paidTotal.toLocaleString()}` },
    { label: 'Unpaid', value: `PKR ${unpaidTotal.toLocaleString()}` }
  ])

  pdf.addTitle('Purchase Details')

  pdf.addTable(
    [
      { header: 'Purchase #', dataKey: 'number', width: 35 },
      { header: 'Date', dataKey: 'date', width: 35 },
      { header: 'Supplier', dataKey: 'supplier', width: 50 },
      { header: 'Items', dataKey: 'items', width: 20, align: 'center' },
      { header: 'Status', dataKey: 'status', width: 25, align: 'center' },
      { header: 'Amount', dataKey: 'amount', width: 35, align: 'right' }
    ],
    purchases.map(p => ({
      number: p.purchase_number,
      date: format(new Date(p.created_at), 'MMM dd, yyyy'),
      supplier: p.supplier_name || 'Manual',
      items: p.items.length,
      status: p.payment_status,
      amount: `PKR ${Number(p.total_amount).toLocaleString()}`
    })),
    {
      showTotal: true,
      totalLabel: 'Grand Total',
      totalValue: `PKR ${totalPurchases.toLocaleString()}`
    }
  )

  pdf.save(`purchase_report_${format(new Date(), 'yyyy-MM-dd')}.pdf`)
}

export function generateInventoryReport(
  products: Array<{
    name: string
    brand: string
    stock: number
    min_stock: number
    price: number
    cost: number
    expiry_date: string | null
    status: string
  }>,
  storeName: string = 'PharmaPOS'
) {
  const pdf = new PDFGenerator('landscape')
  
  const totalValue = products.reduce((sum, p) => sum + (p.stock * p.cost), 0)
  const lowStock = products.filter(p => p.stock > 0 && p.stock < p.min_stock).length
  const outOfStock = products.filter(p => p.stock === 0).length

  pdf.addHeader({
    title: 'Inventory Report',
    subtitle: 'Stock Status Overview',
    storeName
  })

  pdf.addSummaryCards([
    { label: 'Total Products', value: products.length },
    { label: 'Stock Value', value: `PKR ${totalValue.toLocaleString()}` },
    { label: 'Low Stock Items', value: lowStock },
    { label: 'Out of Stock', value: outOfStock }
  ])

  pdf.addTitle('Product Inventory')

  pdf.addTable(
    [
      { header: 'Product Name', dataKey: 'name', width: 60 },
      { header: 'Brand', dataKey: 'brand', width: 40 },
      { header: 'Stock', dataKey: 'stock', width: 20, align: 'center' },
      { header: 'Min Stock', dataKey: 'minStock', width: 25, align: 'center' },
      { header: 'Cost', dataKey: 'cost', width: 30, align: 'right' },
      { header: 'Price', dataKey: 'price', width: 30, align: 'right' },
      { header: 'Value', dataKey: 'value', width: 35, align: 'right' },
      { header: 'Expiry', dataKey: 'expiry', width: 30, align: 'center' }
    ],
    products.map(p => ({
      name: p.name,
      brand: p.brand || '-',
      stock: p.stock,
      minStock: p.min_stock,
      cost: `PKR ${p.cost}`,
      price: `PKR ${p.price}`,
      value: `PKR ${(p.stock * p.cost).toLocaleString()}`,
      expiry: p.expiry_date ? format(new Date(p.expiry_date), 'MMM yyyy') : '-'
    })),
    {
      showTotal: true,
      totalLabel: 'Total Stock Value',
      totalValue: `PKR ${totalValue.toLocaleString()}`
    }
  )

  pdf.save(`inventory_report_${format(new Date(), 'yyyy-MM-dd')}.pdf`)
}

export function generateReturnReport(
  returns: Array<{
    return_number: string
    created_at: string
    receipt_number: string
    customer_name: string
    reason: string
    refund_amount: number
    refund_method: string
    status: string
  }>,
  dateRange: { start: string; end: string },
  storeName: string = 'PharmaPOS'
) {
  const pdf = new PDFGenerator()
  
  const totalRefunds = returns.reduce((sum, r) => sum + Number(r.refund_amount), 0)
  const completedReturns = returns.filter(r => r.status === 'Completed').length

  pdf.addHeader({
    title: 'Returns Report',
    subtitle: 'Product Returns Summary',
    storeName,
    dateRange
  })

  pdf.addSummaryCards([
    { label: 'Total Returns', value: returns.length },
    { label: 'Total Refunded', value: `PKR ${totalRefunds.toLocaleString()}` },
    { label: 'Completed', value: completedReturns },
    { label: 'Pending', value: returns.length - completedReturns }
  ])

  pdf.addTitle('Return Details')

  pdf.addTable(
    [
      { header: 'Return #', dataKey: 'number', width: 30 },
      { header: 'Date', dataKey: 'date', width: 30 },
      { header: 'Receipt #', dataKey: 'receipt', width: 30 },
      { header: 'Customer', dataKey: 'customer', width: 35 },
      { header: 'Reason', dataKey: 'reason', width: 35 },
      { header: 'Status', dataKey: 'status', width: 20, align: 'center' },
      { header: 'Refund', dataKey: 'refund', width: 25, align: 'right' }
    ],
    returns.map(r => ({
      number: r.return_number,
      date: format(new Date(r.created_at), 'MMM dd, yyyy'),
      receipt: r.receipt_number || '-',
      customer: r.customer_name || 'Walk-in',
      reason: r.reason || '-',
      status: r.status,
      refund: `PKR ${Number(r.refund_amount).toLocaleString()}`
    })),
    {
      showTotal: true,
      totalLabel: 'Total Refunds',
      totalValue: `PKR ${totalRefunds.toLocaleString()}`
    }
  )

  pdf.save(`returns_report_${format(new Date(), 'yyyy-MM-dd')}.pdf`)
}

export function generateLedgerReport(
  entries: Array<{
    created_at: string
    description: string
    ref_id: string
    credit: number
    debit: number
    balance: number
    transaction_type: string
  }>,
  dateRange: { start: string; end: string },
  storeName: string = 'PharmaPOS'
) {
  const pdf = new PDFGenerator()
  
  const totalCredit = entries.reduce((sum, e) => sum + Number(e.credit), 0)
  const totalDebit = entries.reduce((sum, e) => sum + Number(e.debit), 0)
  const currentBalance = entries.length > 0 ? Number(entries[0].balance) : 0

  pdf.addHeader({
    title: 'Ledger Report',
    subtitle: 'Financial Transactions',
    storeName,
    dateRange
  })

  pdf.addSummaryCards([
    { label: 'Total Credit', value: `PKR ${totalCredit.toLocaleString()}` },
    { label: 'Total Debit', value: `PKR ${totalDebit.toLocaleString()}` },
    { label: 'Net Change', value: `PKR ${(totalCredit - totalDebit).toLocaleString()}` },
    { label: 'Current Balance', value: `PKR ${currentBalance.toLocaleString()}` }
  ])

  pdf.addTitle('Transaction Ledger')

  pdf.addTable(
    [
      { header: 'Date', dataKey: 'date', width: 30 },
      { header: 'Description', dataKey: 'description', width: 55 },
      { header: 'Ref ID', dataKey: 'ref', width: 30 },
      { header: 'Type', dataKey: 'type', width: 25, align: 'center' },
      { header: 'Credit', dataKey: 'credit', width: 25, align: 'right' },
      { header: 'Debit', dataKey: 'debit', width: 25, align: 'right' },
      { header: 'Balance', dataKey: 'balance', width: 30, align: 'right' }
    ],
    entries.map(e => ({
      date: format(new Date(e.created_at), 'MMM dd, yyyy'),
      description: e.description,
      ref: e.ref_id || '-',
      type: e.transaction_type,
      credit: Number(e.credit) > 0 ? `+${Number(e.credit).toLocaleString()}` : '-',
      debit: Number(e.debit) > 0 ? `-${Number(e.debit).toLocaleString()}` : '-',
      balance: `PKR ${Number(e.balance).toLocaleString()}`
    }))
  )

  pdf.save(`ledger_report_${format(new Date(), 'yyyy-MM-dd')}.pdf`)
}
