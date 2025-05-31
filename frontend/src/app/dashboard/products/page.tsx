"use client";

import React from 'react';import React from 'react';import React from 'react';import { FormEvent } from 'react';
import React from 'react';import * as React from 'react';
// Removed circular import;
// Removed self-import
import { Image } from 'next/image';
import { Save } from 'lucide-react';
import { Plus, Search, Edit, Trash2, BadgeCheck, BadgeX } from 'lucide-react';
// Removed self-import

// Product type
interface Product {
  id: string;
  name: string;
  price: number;
  image_url: string;
  status: 'Active' | 'Draft';
  inventory: number;
}

// Mocked product data
const MOCK_PRODUCTS: Product[] = [
  {
    id: '1',
    name: 'Premium Coffee Blend',
    price: 14.99,
    image_url: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?q=80&w=500',
    status: 'Active',
    inventory: 120,
  },
  {
    id: '2',
    name: 'Organic Green Tea',
    price: 9.99,
    image_url: 'https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?q=80&w=500',
    status: 'Active',
    inventory: 80,
  },
  {
    id: '3',
    name: 'Handcrafted Ceramic Mug',
    price: 24.99,
    image_url: 'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?q=80&w=500',
    status: 'Draft',
    inventory: 0,
  },
];

type AddProductModalProps = {
  open: boolean;
  onClose: () => void;
  onAdd: (product: Product) => void;
};

function AddProductModal({ open, onClose, onAdd, editingProduct }: AddProductModalProps & { editingProduct?: Product | null }) {
  const isEditing = !!editingProduct;
  const [name, setName] = useState(editingProduct?.name || '');
  const [price, setPrice] = useState(editingProduct?.price?.toString() || '');
  const [image, setImage] = useState(editingProduct?.image_url || '');
  const [status, setStatus] = useState<'Active' | 'Draft'>(editingProduct?.status || 'Active');
  const [inventory, setInventory] = useState(editingProduct?.inventory?.toString() || '');

  React.useEffect(() => {
    if (editingProduct) {
      setName(editingProduct.name);
      setPrice(editingProduct.price.toString());
      setImage(editingProduct.image_url);
      setStatus(editingProduct.status);
      setInventory(editingProduct.inventory.toString());
    } else {
      setName(''); setPrice(''); setImage(''); setStatus('Active'); setInventory('');
    }
  }, [editingProduct, open]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const product: Product = {
      id: editingProduct ? editingProduct.id : Date.now().toString(),
      name,
      price: parseFloat(price),
      image_url: image,
      status,
      inventory: parseInt(inventory, 10),
    };
    onAdd(product);
    onClose();
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">{isEditing ? 'Edit Product' : 'Add Product'}</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input className="border rounded-lg px-3 py-2" placeholder="Product name" value={name} onChange={e => setName(e.target.value)} required />
          <input className="border rounded-lg px-3 py-2" placeholder="Price" type="number" min="0" step="0.01" value={price} onChange={e => setPrice(e.target.value)} required />
          <input className="border rounded-lg px-3 py-2" placeholder="Image URL" value={image} onChange={e => setImage(e.target.value)} />
          <input className="border rounded-lg px-3 py-2" placeholder="Inventory" type="number" min="0" value={inventory} onChange={e => setInventory(e.target.value)} required />
          <select className="border rounded-lg px-3 py-2" value={status} onChange={e => setStatus(e.target.value as 'Active' | 'Draft')}>
            <option value="Active">Active</option>
            <option value="Draft">Draft</option>
          </select>
          <div className="flex gap-2 justify-end mt-2">
            <button type="button" className="px-4 py-2 rounded-lg bg-gray-100" onClick={onClose}>Cancel</button>
            <button type="submit" className="px-4 py-2 rounded-lg bg-[#6C9A8B] text-white font-semibold">{isEditing ? 'Save changes' : 'Add'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ProductsDashboardPage() {
  const [products, setProducts] = useState<Product[]>(MOCK_PRODUCTS);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleAddOrEditProduct = (product: Product) => {
    if (editingProduct) {
      setProducts(products.map(p => (p.id === product.id ? product : p)));
      setEditingProduct(null);
    } else {
      setProducts([product, ...products]);
    }
  };

  const handleDelete = (id: string) => {
    const product = products.find(p => p.id === id);
    if (!product) return;
    const confirmed = window.confirm(`Are you sure you want to delete "${product.name}"? This action cannot be undone.`);
    if (confirmed) {
      setProducts(products.filter(p => p.id !== id));
    }
  };

  const handleOpenAdd = () => {
    setEditingProduct(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (product: Product) => {
    setEditingProduct(product);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingProduct(null);
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Products</h1>
          <div className="flex gap-2 items-center w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
              <input
                className="pl-10 pr-3 py-2 rounded-lg border border-gray-200 w-full focus:outline-none focus:ring-2 focus:ring-[#6C9A8B] bg-white"
                placeholder="Search products..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <button
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#6C9A8B] text-white font-semibold shadow hover:bg-[#588074] transition"
              onClick={handleOpenAdd}
            >
              <Plus size={18} /> Add product
            </button>
          </div>
        </div>
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 bg-white rounded-2xl shadow-inner border border-gray-100">
            <img src="/empty-box.svg" alt="No products" className="w-32 h-32 mb-6 opacity-80" />
            <h2 className="text-xl font-semibold mb-2">No products yet</h2>
            <p className="text-gray-500 mb-6">Start adding products to see them listed here.</p>
            <button
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#6C9A8B] text-white font-semibold shadow hover:bg-[#588074] transition"
              onClick={handleOpenAdd}
            >
              <Plus size={18} /> Add your first product
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto bg-white rounded-2xl shadow border border-gray-100">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-[#f7faf9]">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Image</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Inventory</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {filtered.map(product => (
                  <tr key={product.id} className="hover:bg-[#f7faf9] transition">
                    <td className="px-6 py-4">
                      <img src={product.image_url} alt={product.name} className="w-14 h-14 object-cover rounded-lg border border-gray-100" />
                    </td>
                    <td className="px-6 py-4 font-semibold text-gray-900">{product.name}</td>
                    <td className="px-6 py-4">
                      {product.status === 'Active' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-100"><BadgeCheck size={14} /> Active</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500 border border-gray-200"><BadgeX size={14} /> Draft</span>
                      )}
                    </td>
                    <td className="px-6 py-4">${product.price.toFixed(2)}</td>
                    <td className="px-6 py-4">{product.inventory}</td>
                    <td className="px-6 py-4 flex gap-2">
                      <button className="p-2 rounded hover:bg-gray-100 text-gray-500" title="Edit" onClick={() => handleOpenEdit(product)}><Edit size={16} /></button>
                      <button className="p-2 rounded hover:bg-red-50 text-red-500" title="Delete" onClick={() => handleDelete(product.id)}><Trash2 size={16} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <AddProductModal open={modalOpen} onClose={handleCloseModal} onAdd={handleAddOrEditProduct} editingProduct={editingProduct} />
      </div>
    </DashboardLayout>
  );
}
