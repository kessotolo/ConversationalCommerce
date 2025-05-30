import React from 'react';
import { File } from '@/types/File';import * as React from 'react';

interface ImageUploaderProps {
    onImageSelect: (file: File) => void;
}

export default function ImageUploader({ onImageSelect }: ImageUploaderProps) {
    const [preview, setPreview] = useState<string>('');

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            onImageSelect(file);
            setPreview(URL.createObjectURL(file));
        }
    };

    return (
        <div className="space-y-2">
            <input
                type="file"
                accept="image/*"
                onChange={handleChange}
                className="block w-full text-sm text-gray-500
          file:mr-4 file:py-2 file:px-4
          file:rounded-full file:border-0
          file:text-sm file:font-semibold
          file:bg-violet-50 file:text-violet-700
          hover:file:bg-violet-100"
            />
            {preview && (
                <img
                    src={preview}
                    alt="Preview"
                    className="w-32 h-32 object-cover rounded-lg shadow-sm"
                />
            )}
        </div>
    );
}