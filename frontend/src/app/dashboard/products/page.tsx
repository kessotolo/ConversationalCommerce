'use client';
import { Plus, Edit, Trash2, BadgeX, Search, BadgeCheck } from 'lucide-react';
import Image from 'next/image';
import React, { useState, useEffect } from 'react';
import { useTenant } from '@/contexts/TenantContext';
import type { Product } from '@/modules/core/models/product';

type AddProductModalProps = {
  open: boolean;
  onClose: () => void;
  onAdd: (product: Product) => void;
};

function AddProductModal({
  open,
  onClose,
  onAdd,
  editingProduct,
}: AddProductModalProps & { editingProduct?: Product | null }) {
  const isEditing = !!editingProduct;
  const [name, setName] = useState(editingProduct?.name || '');
  const [price, setPrice] = useState(editingProduct?.price?.toString() || '');
  const [image, setImage] = useState(editingProduct?.image_url ?? '');

  React.useEffect(() => {
    if (editingProduct) {
      setName(editingProduct.name);
      setPrice(editingProduct.price.toString());
      setImage(editingProduct.image_url ?? '');
    } else {
      setName('');
      setPrice('');
      setImage('');
    }
  }, [editingProduct, open]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const product: Product = {
      id: editingProduct ? editingProduct.id : Date.now().toString(),
      name,
      price: parseFloat(price),
      image_url: image,
      description: editingProduct?.description ?? '',
      created_at: editingProduct?.created_at ?? new Date().toISOString(),
      updated_at: editingProduct?.updated_at ?? new Date().toISOString(),
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
          <input
            className="border rounded-lg px-3 py-2"
            placeholder="Product name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <input
            className="border rounded-lg px-3 py-2"
            placeholder="Price"
            type="number"
            min="0"
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            required
          />
          <input
            className="border rounded-lg px-3 py-2"
            placeholder="Image URL"
            value={image}
            onChange={(e) => setImage(e.target.value)}
          />
          <div className="flex gap-2 justify-end mt-2">
            <button type="button" className="px-4 py-2 rounded-lg bg-gray-100" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-[#6C9A8B] text-white font-semibold"
            >
              {isEditing ? 'Save changes' : 'Add'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ProductsDashboardPage() {
  const { tenant, isLoading: isTenantLoading } = useTenant();
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tenant?.id) return;
    setLoading(true);
    setError(null);
    fetch(`/api/v1/products?tenant_id=${tenant.id}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch products');
        return res.json();
      })
      .then((data) => {
        setProducts(data.items || []);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [tenant?.id]);

  const filtered = products.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));

  const handleAddOrEditProduct = (product: Product) => {
    if (editingProduct) {
      setProducts(products.map((p) => (p.id === product?.id ? product : p)));
      setEditingProduct(null);
    } else {
      setProducts([product, ...products]);
    }
  };

  const handleDelete = (id: string) => {
    const product = products.find((p) => p.id === id);
    if (!product) return;
    const confirmed = window.confirm(
      `Are you sure you want to delete "${product?.name}"? This action cannot be undone.`,
    );
    if (confirmed) {
      setProducts(products.filter((p) => p.id !== id));
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
              onChange={(e) => setSearch(e.target.value)}
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
          <Image
            src="/empty-box.svg"
            alt="No products"
            width={500}
            height={300}
            className="w-32 h-32 mb-6 opacity-80"
          />
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Image
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Price
                </th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {filtered.map((product) => (
                <tr key={product?.id} className="hover:bg-[#f7faf9] transition">
                  <td className="px-6 py-4">
                    <Image
                      src={product.image_url ?? ''}
                      alt={product.name}
                      width={48}
                      height={48}
                      className="rounded-lg object-cover"
                    />
                  </td>
                  <td className="px-6 py-4 font-semibold text-gray-900">{product?.name}</td>
                  <td className="px-6 py-4">${product?.price.toFixed(2)}</td>
                  <td className="px-6 py-4 flex gap-2">
                    <button
                      className="p-2 rounded hover:bg-gray-100 text-gray-500"
                      title="Edit"
                      onClick={() => handleOpenEdit(product)}
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      className="p-2 rounded hover:bg-red-50 text-red-500"
                      title="Delete"
                      onClick={() => handleDelete(product?.id)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <AddProductModal
        open={modalOpen}
        onClose={handleCloseModal}
        onAdd={handleAddOrEditProduct}
        editingProduct={editingProduct}
      />
    </div>
  );
}
