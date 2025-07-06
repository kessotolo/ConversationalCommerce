import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Upload } from 'lucide-react';

interface UploadButtonProps {
  onImageUploaded: (imageUrl: string) => void;
  label?: string;
  accept?: string;
  maxSizeMB?: number;
}

export const UploadButton: React.FC<UploadButtonProps> = ({
  onImageUploaded,
  label = 'Upload Image',
  accept = 'image/jpeg,image/png,image/jpg',
  maxSizeMB = 5,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file size
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      setError(`File size exceeds ${maxSizeMB}MB limit`);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // For this implementation, we'll use a simple file reader to get a data URL
      // In a real application, you would upload this to your backend or a service like AWS S3
      const reader = new FileReader();

      reader.onload = () => {
        const dataUrl = reader.result as string;
        onImageUploaded(dataUrl);
        setLoading(false);
      };

      reader.onerror = () => {
        setError('Failed to read the file');
        setLoading(false);
      };

      reader.readAsDataURL(file);

      // In a real implementation, you would do something like this:
      // const formData = new FormData();
      // formData.append('file', file);
      // const response = await fetch('/api/upload', {
      //   method: 'POST',
      //   body: formData,
      // });
      // const data = await response.json();
      // onImageUploaded(data.url);
    } catch (err: unknown) {
      setError(`Upload error: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setLoading(false);
    }

    // Clear the input value so the same file can be uploaded again if needed
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-2">
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        accept={accept}
        onChange={handleFileChange}
      />

      <Button
        variant="outline"
        onClick={handleClick}
        disabled={loading}
        className="flex items-center space-x-2"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Upload className="h-4 w-4" />
        )}
        <span>{loading ? 'Uploading...' : label}</span>
      </Button>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default UploadButton;
