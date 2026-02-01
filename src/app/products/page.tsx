'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { DashboardLayout } from '@/components/layout'
import { createClient } from '@/lib/supabase/client'
import { Product, Category, Supplier } from '@/types'
import { 
  FiPlus, FiSearch, FiEdit2, FiTrash2, FiPackage, FiFilter,
  FiX, FiAlertTriangle, FiDownload, FiUpload
} from 'react-icons/fi'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { format } from 'date-fns'

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    brand: '',
    generic_name: '',
    category_id: '',
    supplier_id: '',
    barcode: '',
    sku: '',
    stock: 0,
    min_stock: 10,
    price: 0,
    cost: 0,
    batch_number: '',
    expiry_date: '',
    unit: 'pieces',
    requires_prescription: false,
    controlled_substance: false,
    description: ''
  })

  const supabase = createClient()

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    const [productsRes, categoriesRes, suppliersRes] = await Promise.all([
      supabase.from('products').select('*').order('name'),
      supabase.from('categories').select('*').order('name'),
      supabase.from('suppliers').select('*').eq('status', 'active').order('name')
    ])
    
    setProducts(productsRes.data || [])
    setCategories(categoriesRes.data || [])
    setSuppliers(suppliersRes.data || [])
    setLoading(false)
  }

  const filteredProducts = products.filter(p => {
    const matchesSearch = 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.brand?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.barcode?.includes(searchQuery)
    const matchesCategory = !filterCategory || p.category_id === filterCategory
    const matchesStatus = !filterStatus || p.status === filterStatus
    return matchesSearch && matchesCategory && matchesStatus
  })

  const openAddModal = () => {
    setEditingProduct(null)
    setFormData({
      name: '', brand: '', generic_name: '', category_id: '', supplier_id: '',
      barcode: '', sku: '', stock: 0, min_stock: 10, price: 0, cost: 0,
      batch_number: '', expiry_date: '', unit: 'pieces',
      requires_prescription: false, controlled_substance: false, description: ''
    })
    setModalOpen(true)
  }

  const openEditModal = (product: Product) => {
    setEditingProduct(product)
    setFormData({
      name: product.name,
      brand: product.brand || '',
      generic_name: product.generic_name || '',
      category_id: product.category_id || '',
      supplier_id: product.supplier_id || '',
      barcode: product.barcode || '',
      sku: product.sku || '',
      stock: product.stock,
      min_stock: product.min_stock,
      price: product.price,
      cost: product.cost,
      batch_number: product.batch_number || '',
      expiry_date: product.expiry_date || '',
      unit: product.unit,
      requires_prescription: product.requires_prescription,
      controlled_substance: product.controlled_substance,
      description: product.description || ''
    })
    setModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name || formData.price <= 0 || formData.cost <= 0) {
      toast.error('Please fill in required fields')
      return
    }

    const productData = {
      ...formData,
      category_id: formData.category_id || null,
      supplier_id: formData.supplier_id || null,
      expiry_date: formData.expiry_date || null
    }

    if (editingProduct) {
      const { error } = await supabase
        .from('products')
        .update(productData)
        .eq('id', editingProduct.id)
      
      if (error) {
        toast.error('Failed to update product')
        return
      }
      toast.success('Product updated')
    } else {
      const { error } = await supabase.from('products').insert(productData)
      
      if (error) {
        toast.error('Failed to add product')
        return
      }
      toast.success('Product added')
    }
    
    setModalOpen(false)
    fetchData()
  }

  const deleteProduct = async (id: string) => {
    const { error } = await supabase.from('products').delete().eq('id', id)
    
    if (error) {
      toast.error('Failed to delete product')
      return
    }
    
    setProducts(prev => prev.filter(p => p.id !== id))
    toast.success('Product deleted')
  }

  const exportCSV = () => {
    const headers = ['Name', 'Brand', 'Stock', 'Price', 'Cost', 'Batch', 'Expiry']
    const rows = products.map(p => 
      [p.name, p.brand, p.stock, p.price, p.cost, p.batch_number, p.expiry_date].join(',')
    )
    const csv = [headers.join(','), ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `products_${format(new Date(), 'yyyy-MM-dd')}.csv`
    a.click()
    toast.success('Products exported')
  }

  return (
    <DashboardLayout title="Products" subtitle="Manage your product inventory">
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 flex-col gap-3 sm:flex-row">
            <div className="relative flex-1 max-w-md">
              <FiSearch className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-border bg-card py-2.5 pl-11 pr-4 text-sm transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="rounded-xl border border-border bg-card px-4 py-2.5 text-sm"
            >
              <option value="">All Categories</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="rounded-xl border border-border bg-card px-4 py-2.5 text-sm"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="discontinued">Discontinued</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button
              onClick={exportCSV}
              className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-medium transition-colors hover:bg-muted"
            >
              <FiDownload className="h-4 w-4" />
              Export
            </button>
            <button
              onClick={openAddModal}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90"
            >
              <FiPlus className="h-4 w-4" />
              Add Product
            </button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl bg-card p-4 shadow-sm">
            <p className="text-sm text-muted-foreground">Total Products</p>
            <p className="mt-1 text-2xl font-bold text-foreground">{products.length}</p>
          </div>
          <div className="rounded-xl bg-card p-4 shadow-sm">
            <p className="text-sm text-muted-foreground">Low Stock</p>
            <p className="mt-1 text-2xl font-bold text-amber-600">{products.filter(p => p.stock < p.min_stock).length}</p>
          </div>
          <div className="rounded-xl bg-card p-4 shadow-sm">
            <p className="text-sm text-muted-foreground">Out of Stock</p>
            <p className="mt-1 text-2xl font-bold text-red-600">{products.filter(p => p.stock === 0).length}</p>
          </div>
          <div className="rounded-xl bg-card p-4 shadow-sm">
            <p className="text-sm text-muted-foreground">Stock Value</p>
            <p className="mt-1 text-2xl font-bold text-primary">
              PKR {products.reduce((sum, p) => sum + (p.stock * p.cost), 0).toLocaleString()}
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="py-16 text-center">
              <FiPackage className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <p className="mt-4 text-lg font-medium text-muted-foreground">No products found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="py-3 px-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Product</th>
                    <th className="py-3 px-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Stock</th>
                    <th className="py-3 px-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Price</th>
                    <th className="py-3 px-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Cost</th>
                    <th className="py-3 px-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Batch</th>
                    <th className="py-3 px-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Expiry</th>
                    <th className="py-3 px-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
                    <th className="py-3 px-4 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredProducts.map((product, index) => (
                    <motion.tr
                      key={product.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.02 }}
                      className="table-row-hover"
                    >
                      <td className="py-4 px-4">
                        <div>
                          <p className="font-medium text-foreground">{product.name}</p>
                          <p className="text-xs text-muted-foreground">{product.brand}</p>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
                          product.stock === 0 
                            ? 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400' 
                            : product.stock < product.min_stock 
                              ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400' 
                              : 'bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400'
                        }`}>
                          {product.stock === 0 && <FiAlertTriangle className="mr-1 h-3 w-3" />}
                          {product.stock}
                        </span>
                      </td>
                      <td className="py-4 px-4 font-medium text-foreground">PKR {product.price.toFixed(0)}</td>
                      <td className="py-4 px-4 text-muted-foreground">PKR {product.cost.toFixed(0)}</td>
                      <td className="py-4 px-4 text-sm text-muted-foreground">{product.batch_number || '-'}</td>
                      <td className="py-4 px-4 text-sm text-muted-foreground">
                        {product.expiry_date ? format(new Date(product.expiry_date), 'MMM yyyy') : '-'}
                      </td>
                      <td className="py-4 px-4">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
                          product.status === 'active' 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {product.status}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEditModal(product)}
                            className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                          >
                            <FiEdit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => deleteProduct(product.id)}
                            className="rounded-lg p-2 text-red-500 transition-colors hover:bg-red-50"
                          >
                            <FiTrash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingProduct ? 'Edit Product' : 'Add New Product'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium">Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm"
                  required
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Brand</label>
                <input
                  type="text"
                  value={formData.brand}
                  onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                  className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Generic Name</label>
                <input
                  type="text"
                  value={formData.generic_name}
                  onChange={(e) => setFormData({ ...formData, generic_name: e.target.value })}
                  className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Category</label>
                <select
                  value={formData.category_id}
                  onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                  className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm"
                >
                  <option value="">Select Category</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Supplier</label>
                <select
                  value={formData.supplier_id}
                  onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
                  className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm"
                >
                  <option value="">Select Supplier</option>
                  {suppliers.map(sup => (
                    <option key={sup.id} value={sup.id}>{sup.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Barcode</label>
                <input
                  type="text"
                  value={formData.barcode}
                  onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                  className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Stock *</label>
                <input
                  type="number"
                  value={formData.stock}
                  onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value) || 0 })}
                  className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm"
                  min={0}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Min Stock Level</label>
                <input
                  type="number"
                  value={formData.min_stock}
                  onChange={(e) => setFormData({ ...formData, min_stock: parseInt(e.target.value) || 0 })}
                  className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm"
                  min={0}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Selling Price (PKR) *</label>
                <input
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                  className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm"
                  min={0}
                  step={0.01}
                  required
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Cost Price (PKR) *</label>
                <input
                  type="number"
                  value={formData.cost}
                  onChange={(e) => setFormData({ ...formData, cost: parseFloat(e.target.value) || 0 })}
                  className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm"
                  min={0}
                  step={0.01}
                  required
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Batch Number</label>
                <input
                  type="text"
                  value={formData.batch_number}
                  onChange={(e) => setFormData({ ...formData, batch_number: e.target.value })}
                  className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Expiry Date</label>
                <input
                  type="date"
                  value={formData.expiry_date}
                  onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                  className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm"
                />
              </div>
            </div>
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.requires_prescription}
                  onChange={(e) => setFormData({ ...formData, requires_prescription: e.target.checked })}
                  className="rounded border-border"
                />
                <span className="text-sm">Requires Prescription</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.controlled_substance}
                  onChange={(e) => setFormData({ ...formData, controlled_substance: e.target.checked })}
                  className="rounded border-border"
                />
                <span className="text-sm">Controlled Substance</span>
              </label>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm"
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-xl border border-border px-5 py-2.5 text-sm font-medium transition-colors hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90"
              >
                {editingProduct ? 'Update Product' : 'Add Product'}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}
