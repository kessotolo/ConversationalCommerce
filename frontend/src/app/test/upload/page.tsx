'use client';

import { useState } from 'react';
import ImageUploader from '@/components/ImageUploader';
import { productService } from '@/lib/api';

export default function UploadTestPage() {
    const [selectedImage, setSelectedImage] = useState<File | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);

    const handleImageSelect = (file: File) => {
        setSelectedImage(file);
        setError(null);
        setSuccess(null);
        setUploadedUrl(null);
    };

    const handleUpload = async () => {
        if (!selectedImage) {
            setError('Please select an image first');
            return;
        }

        setIsLoading(true);
        setError(null);
        setSuccess(null);

        try {
            const formData = new FormData();
            formData.append('image', selectedImage);

            const response = await productService.uploadImage(formData);
            setUploadedUrl(response.url);
            setSuccess('Image uploaded successfully!');
        } catch (error: any) {
            console.error('Error uploading image:', error);
            setError(error.message || 'Failed to upload image. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto p-6">
            <h1 className="text-2xl font-bold mb-6">Image Upload Test</h1>

            <div className="space-y-6">
                <div className="bg-white p-6 rounded-lg shadow">
                    <h2 className="text-lg font-semibold mb-4">Upload Image</h2>

                    <div className="space-y-4">
                        <ImageUploader onImageSelect={handleImageSelect} />

                        {selectedImage && (
                            <div className="text-sm text-gray-600">
                                <p>Selected file: {selectedImage.name}</p>
                                <p>Type: {selectedImage.type}</p>
                                <p>Size: {(selectedImage.size / 1024).toFixed(2)} KB</p>
                            </div>
                        )}

                        <button
                            onClick={handleUpload}
                            disabled={isLoading || !selectedImage}
                            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-violet-600 hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-500 disabled:opacity-50"
                        >
                            {isLoading ? 'Uploading...' : 'Upload Image'}
                        </button>
                    </div>
                </div>

                {error && (
                    <div className="rounded-md bg-red-50 p-4">
                        <div className="flex">
                            <div className="flex-shrink-0">
                                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div className="ml-3">
                                <p className="text-sm font-medium text-red-800">{error}</p>
                            </div>
                        </div>
                    </div>
                )}

                {success && (
                    <div className="rounded-md bg-green-50 p-4">
                        <div className="flex">
                            <div className="flex-shrink-0">
                                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div className="ml-3">
                                <p className="text-sm font-medium text-green-800">{success}</p>
                            </div>
                        </div>
                    </div>
                )}

                {uploadedUrl && (
                    <div className="bg-white p-6 rounded-lg shadow">
                        <h2 className="text-lg font-semibold mb-4">Uploaded Image</h2>
                        <div className="relative h-64 w-full">
                            <img
                                src={uploadedUrl}
                                alt="Uploaded"
                                className="object-contain w-full h-full"
                            />
                        </div>
                        <div className="mt-4">
                            <p className="text-sm text-gray-600 break-all">URL: {uploadedUrl}</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}