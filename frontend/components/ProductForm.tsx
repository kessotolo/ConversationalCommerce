import React, { useState } from 'react';
import ImageUploader from './ImageUploader';
import { apiClient } from '@/lib/api';

interface ProductFormProps {
    onSubmit: (data: any) => void;
}

export default function ProductForm({ onSubmit }: ProductFormProps) {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [price, setPrice] = useState('');
    const [selectedImage, setSelectedImage] = useState<File | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const formData = new FormData();
            formData.append('name', name);
            formData.append('description', description);
            formData.append('price', price);
            if (selectedImage) {
                formData.append('image', selectedImage);
            }

            const response = await apiClient.post('/products', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            onSubmit(response.data);

            // Reset form
            setName('');
            setDescription('');
            setPrice('');
            setSelectedImage(null);
        } catch (error) {
            console.error('Error creating product:', error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                    Product Name
                </label>
                <input
                    type="text"
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-violet-500 focus:ring-violet-500"
                    required
                />
            </div>

            <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                    Description
                </label>
                <textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-violet-500 focus:ring-violet-500"
                    required
                />
            </div>

            <div>
                <label htmlFor="price" className="block text-sm font-medium text-gray-700">
                    Price
                </label>
                <input
                    type="number"
                    id="price"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    step="0.01"
                    min="0"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-violet-500 focus:ring-violet-500"
                    required
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700">
                    Product Image
                </label>
                <ImageUploader onImageSelect={setSelectedImage} />
            </div>

            <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-violet-600 hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-500 disabled:opacity-50"
            >
                {isLoading ? 'Creating...' : 'Create Product'}
            </button>
        </form>
    );
}