import Decimal from 'decimal.js'

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP })

export function formatCurrency(amount: number | string | Decimal, currency: string = 'PKR'): string {
  const decimal = new Decimal(amount || 0)
  return `${currency} ${decimal.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`
}

export function calculateSubtotal(items: { price: number; quantity: number }[]): Decimal {
  return items.reduce((sum, item) => {
    return sum.plus(new Decimal(item.price).times(item.quantity))
  }, new Decimal(0))
}

export function calculateTax(subtotal: number | Decimal, taxRate: number): Decimal {
  const sub = new Decimal(subtotal)
  const rate = new Decimal(taxRate).dividedBy(100)
  return sub.times(rate)
}

export function calculateDiscount(subtotal: number | Decimal, discountPercent: number): Decimal {
  const sub = new Decimal(subtotal)
  const rate = new Decimal(discountPercent).dividedBy(100)
  return sub.times(rate)
}

export function calculateTotal(
  subtotal: number | Decimal,
  tax: number | Decimal,
  discount: number | Decimal = 0
): Decimal {
  return new Decimal(subtotal).plus(tax).minus(discount)
}

export function calculateProfit(
  sellingPrice: number | Decimal,
  costPrice: number | Decimal,
  quantity: number = 1
): Decimal {
  const profit = new Decimal(sellingPrice).minus(costPrice)
  return profit.times(quantity)
}

export function calculateProfitMargin(
  sellingPrice: number | Decimal,
  costPrice: number | Decimal
): Decimal {
  const selling = new Decimal(sellingPrice)
  const cost = new Decimal(costPrice)
  if (selling.isZero()) return new Decimal(0)
  return selling.minus(cost).dividedBy(selling).times(100)
}

export function calculateMarkup(
  sellingPrice: number | Decimal,
  costPrice: number | Decimal
): Decimal {
  const selling = new Decimal(sellingPrice)
  const cost = new Decimal(costPrice)
  if (cost.isZero()) return new Decimal(0)
  return selling.minus(cost).dividedBy(cost).times(100)
}

export function calculateStockValue(
  stock: number,
  costPrice: number | Decimal,
  method: 'average' | 'fifo' | 'lifo' = 'average'
): Decimal {
  return new Decimal(stock).times(costPrice)
}

export function roundToNearest(value: number | Decimal, nearest: number = 0.01): Decimal {
  const decimal = new Decimal(value)
  const nearestDecimal = new Decimal(nearest)
  return decimal.dividedBy(nearestDecimal).round().times(nearestDecimal)
}

export function toDecimal(value: number | string | Decimal | null | undefined): Decimal {
  if (value === null || value === undefined) return new Decimal(0)
  return new Decimal(value)
}

export function toNumber(value: Decimal): number {
  return value.toNumber()
}

export function safeAdd(...values: (number | string | Decimal | null | undefined)[]): Decimal {
  return values.reduce((sum: Decimal, val) => sum.plus(toDecimal(val)), new Decimal(0))
}

export function safeMinus(a: number | Decimal, b: number | Decimal): Decimal {
  return new Decimal(a).minus(b)
}

export function safeMultiply(a: number | Decimal, b: number | Decimal): Decimal {
  return new Decimal(a).times(b)
}

export function safeDivide(a: number | Decimal, b: number | Decimal): Decimal {
  const divisor = new Decimal(b)
  if (divisor.isZero()) return new Decimal(0)
  return new Decimal(a).dividedBy(divisor)
}
