'use client';
import { Plus, Edit, Trash2, Search, Camera } from 'lucide-react';
import Image from 'next/image';
import React, { useState, useEffect } from 'react';
import { useTenant } from '@/contexts/TenantContext';
import type { Product } from '@/modules/core/models/product';
import { FaWhatsapp, FaInstagram, FaTiktok, FaLink } from 'react-icons/fa';
import { useRouter } from 'next/navigation';

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

// Quick Upload Modal
function QuickUploadModal({ open, onClose, onSuccess }: { open: boolean; onClose: () => void; onSuccess: (productId: string) => void }) {
  const [media, setMedia] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Overlay preview for image/video
  const overlay = (
    <div className="absolute bottom-2 left-2 bg-black bg-opacity-60 text-white px-2 py-1 rounded text-sm">
      {title && <span className="font-bold mr-2">{title}</span>}{price && `₦${price}`}
    </div>
  );
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setMedia(file);
      setMediaPreview(URL.createObjectURL(file));
    }
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      // Use your productService.createProduct here
      const formData = new FormData();
      formData.append('name', title);
      formData.append('description', title); // minimal for quick mode
      formData.append('price', price);
      if (media) {
        if (media.type.startsWith('image/')) formData.append('image', media);
        if (media.type.startsWith('video/')) formData.append('video', media);
      }
      const res = await fetch('/api/v1/products', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) throw new Error('Failed to upload');
      const data = await res.json();
      onSuccess(data.product.id);
      onClose();
    } catch (err) {
      setError('Failed to upload. Try again.');
    } finally {
      setLoading(false);
    }
  };
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm relative">
        <button className="absolute top-2 right-2 text-gray-400" onClick={onClose}>✕</button>
        <h2 className="text-lg font-bold mb-4">Quick Upload</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input type="file" accept="image/*,video/*" capture="environment" onChange={handleFile} className="border rounded-lg px-3 py-2" />
          {mediaPreview && (
            <div className="relative w-full h-48 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center">
              {media?.type.startsWith('image/') ? (
                <img src={mediaPreview} alt="preview" className="w-full h-full object-cover" />
              ) : (
                <video src={mediaPreview} controls className="w-full h-full object-cover" />
              )}
              {overlay}
            </div>
          )}
          <input className="border rounded-lg px-3 py-2" placeholder="Product title" value={title} onChange={e => setTitle(e.target.value)} required />
          <input className="border rounded-lg px-3 py-2" placeholder="Price (₦)" type="number" min="0" value={price} onChange={e => setPrice(e.target.value)} required />
          {error && <div className="text-red-500 text-sm">{error}</div>}
          <button type="submit" className="w-full py-2 rounded-lg bg-[#6C9A8B] text-white font-semibold mt-2" disabled={loading}>{loading ? 'Uploading...' : 'Post & Share'}</button>
        </form>
      </div>
    </div>
  );
}

// Polished Share Modal
function ShareModal({ shareLinks, onClose, productUrl }: { shareLinks: any; onClose: () => void; productUrl: string }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg relative w-80 flex flex-col items-center animate-fade-in">
        <button className="absolute top-2 right-2" onClick={onClose}>✕</button>
        <h2 className="font-bold mb-4">Share your product</h2>
        {shareLinks?.whatsapp && (
          <a href={shareLinks.whatsapp.url} target="_blank" rel="noopener noreferrer" className="btn w-full mb-2 flex items-center gap-2 bg-green-500 text-white hover:bg-green-600">📱 WhatsApp</a>
        )}
        {shareLinks?.instagram && (
          <a href={shareLinks.instagram.url} target="_blank" rel="noopener noreferrer" className="btn w-full mb-2 flex items-center gap-2 bg-gradient-to-r from-pink-500 to-yellow-500 text-white hover:from-pink-600 hover:to-yellow-600">📸 Instagram</a>
        )}
        {shareLinks?.tiktok && (
          <a href={shareLinks.tiktok.url} target="_blank" rel="noopener noreferrer" className="btn w-full mb-2 flex items-center gap-2 bg-black text-white hover:bg-gray-800">�� TikTok</a>
        )}
        <button className="btn w-full flex items-center gap-2 bg-gray-200 hover:bg-gray-300 mt-2" onClick={() => { navigator.clipboard.writeText(productUrl); }}>🔗 Copy Link</button>
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
  const [quickModalOpen, setQuickModalOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareLinks, setShareLinks] = useState<any>(null);
  const [shareProductUrl, setShareProductUrl] = useState('');
  const router = useRouter();

  useEffect(() => {
    if (!tenant?.id) return;
    fetch(`/api/v1/products?tenant_id=${tenant.id}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch products');
        return res.json();
      })
      .then((data) => {
        setProducts(data.items || []);
      })
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

  // Quick Upload Success Handler
  const handleQuickSuccess = async (productId: string) => {
    // Fetch share links for the new product
    const apiBase = typeof process !== 'undefined' ? (process.env['NEXT_PUBLIC_API_BASE'] ?? '') : '';
    const shareRes = await fetch(`${apiBase}/api/v1/share/all-platforms?product_id=${productId}`);
    if (shareRes.ok) {
      setShareLinks(await shareRes.json());
      setShareProductUrl(`${window.location.origin}/store/${tenant?.id}/${productId}`);
      setShareModalOpen(true);
    }
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
          <div className="w-32 h-32 mb-6 opacity-80 flex items-center justify-center bg-gray-100 rounded-lg">
            <span className="text-4xl text-gray-300">📦</span>
          </div>
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
      {/* Floating Quick Upload Button (mobile only, not when modal open) */}
      {!modalOpen && !quickModalOpen && (
        <button
          className="md:hidden fixed bottom-20 right-6 z-50 bg-violet-600 text-white rounded-full shadow-lg p-4 hover:bg-violet-700 transition flex items-center justify-center"
          style={{ boxShadow: '0 4px 24px rgba(108,154,139,0.18)' }}
          onClick={() => setQuickModalOpen(true)}
          aria-label="Quick Upload"
        >
          <Camera className="w-6 h-6" />
        </button>
      )}
      <QuickUploadModal open={quickModalOpen} onClose={() => setQuickModalOpen(false)} onSuccess={handleQuickSuccess} />
      {shareModalOpen && shareLinks && (
        <ShareModal shareLinks={shareLinks} onClose={() => setShareModalOpen(false)} productUrl={shareProductUrl} />
      )}
    </div>
  );
}
