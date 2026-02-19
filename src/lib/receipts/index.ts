export {
  generateSaleReceiptPdf,
  printSaleReceipt,
  generateSaleReceiptHtml,
} from './sale-receipt'

export {
  generatePurchaseReceiptPdf,
  printPurchaseReceipt,
  generatePurchaseReceiptHtml,
} from './purchase-receipt'

export {
  generateReturnReceiptPdf,
  printReturnReceipt,
  generateReturnReceiptHtml,
} from './return-receipt'

export interface PharmacyInfo {
  name: string
  address?: string | null
  phone?: string | null
  license_number?: string | null
}

export interface ReceiptItem {
  name: string
  quantity: number
  price: number
  total: number
  batch_number?: string | null
  expiry_date?: string | null
}
