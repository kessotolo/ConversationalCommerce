import React, { ChangeEvent, FC, useState, useRef } from 'react';

// Removed self-import// Removed self-import
// Removed circular import;


import { ArrowUpTrayIcon, DocumentPlusIcon, DocumentTextIcon, FilmIcon, MusicalNoteIcon, PhotoIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { Upload } from 'lucide-react';
import { List } from '@mui/material';import * as React from 'react';

import { 
  XMarkIcon, 
  ArrowUpTrayIcon, 
  DocumentPlusIcon, 
  PhotoIcon, 
  FilmIcon, 
  DocumentTextIcon, 
  MusicalNoteIcon
} from '@heroicons/react/24/outline';
import { uploadAsset } from '../../../lib/api/StorefrontEditor';
import { UUID, AssetType } from '../../../types/StorefrontEditor';

interface AssetUploaderProps {
  tenantId: UUID;
  onClose: () => void;
  onSuccess: () => void;
}

const AssetUploader: React.FC<AssetUploaderProps> = ({ tenantId, onClose, onSuccess }) => {
  const [files, setFiles] = useState<File[]>([]);
  const [titles, setTitles] = useState<{ [key: string]: string }>({});
  const [altTexts, setAltTexts] = useState<{ [key: string]: string }>({});
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [uploadSuccess, setUploadSuccess] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      
      // Initialize titles with filenames (without extensions)
      const newTitles = { ...titles };
      newFiles.forEach(file => {
        const fileName = file.name.split('.').slice(0, -1).join('.');
        newTitles[file.name] = fileName;
      });
      
      setFiles(prev => [...prev, ...newFiles]);
      setTitles(newTitles);
      
      // Reset input value to allow selecting the same file again
      e.target.value = '';
    }
  };

  // Handle drag and drop
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.dataTransfer.files) {
      const newFiles = Array.from(e.dataTransfer.files);
      
      // Initialize titles with filenames (without extensions)
      const newTitles = { ...titles };
      newFiles.forEach(file => {
        const fileName = file.name.split('.').slice(0, -1).join('.');
        newTitles[file.name] = fileName;
      });
      
      setFiles(prev => [...prev, ...newFiles]);
      setTitles(newTitles);
    }
  };

  // Handle removal of file from the list
  const handleRemoveFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Handle title change
  const handleTitleChange = (fileName: string, value: string) => {
    setTitles(prev => ({ ...prev, [fileName]: value }));
  };

  // Handle alt text change
  const handleAltTextChange = (fileName: string, value: string) => {
    setAltTexts(prev => ({ ...prev, [fileName]: value }));
  };

  // Determine asset type from file
  const getAssetType = (file: File): AssetType => {
    const mimeType = file.type;
    if (mimeType.startsWith('image/')) return AssetType.IMAGE;
    if (mimeType.startsWith('video/')) return AssetType.VIDEO;
    if (mimeType.startsWith('audio/')) return AssetType.AUDIO;
    if (mimeType === 'application/pdf' || 
        mimeType.includes('document') || 
        mimeType.includes('text/')) return AssetType.DOCUMENT;
    return AssetType.OTHER;
  };

  // Get appropriate icon based on asset type
  const getAssetIcon = (file: File) => {
    const assetType = getAssetType(file);
    switch (assetType) {
      case AssetType.IMAGE:
        return <PhotoIcon className="h-8 w-8 text-blue-500" />;
      case AssetType.VIDEO:
        return <FilmIcon className="h-8 w-8 text-purple-500" />;
      case AssetType.DOCUMENT:
        return <DocumentTextIcon className="h-8 w-8 text-yellow-500" />;
      case AssetType.AUDIO:
        return <MusicalNoteIcon className="h-8 w-8 text-green-500" />;
      default:
        return <DocumentPlusIcon className="h-8 w-8 text-gray-500" />;
    }
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Handle upload process
  const handleUpload = async () => {
    if (files.length === 0) return;
    
    setUploading(true);
    setErrors({});
    
    const successfulUploads: string[] = [];
    
    // Upload each file individually
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileName = file.name;
      
      // Skip if already uploaded
      if (uploadSuccess.includes(fileName)) continue;
      
      try {
        // Create form data
        const formData = new FormData();
        formData.append('file', file);
        formData.append('title', titles[fileName] || fileName);
        formData.append('asset_type', getAssetType(file));
        
        // Add alt text only for images
        if (getAssetType(file) === AssetType.IMAGE && altTexts[fileName]) {
          formData.append('alt_text', altTexts[fileName]);
        }
        
        // Upload the file
        await uploadAsset(tenantId, formData);
        
        // Mark as successfully uploaded
        successfulUploads.push(fileName);
        setUploadSuccess(prev => [...prev, fileName]);
        setUploadProgress(prev => ({ ...prev, [fileName]: 100 }));
      } catch (err) {
        console.error(`Error uploading ${fileName}:`, err);
        setErrors(prev => ({ 
          ...prev, 
          [fileName]: 'Failed to upload file. Please try again.' 
        }));
      }
    }
    
    setUploading(false);
    
    // If all files uploaded successfully, call onSuccess and close
    if (successfulUploads.length === files.length) {
      onSuccess();
      onClose();
    }
  };

  // Open file browser
  const handleBrowseClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b">
          <h3 className="text-lg font-medium">Upload Assets</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 flex-1 overflow-y-auto">
          {/* Drop Zone */}
          {files.length === 0 && (
            <div
              className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center"
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              <ArrowUpTrayIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Drag and drop files here</h3>
              <p className="mt-1 text-xs text-gray-500">Or</p>
              <button
                type="button"
                onClick={handleBrowseClick}
                className="mt-2 inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Browse Files
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileChange}
                className="hidden"
              />
              <p className="mt-2 text-xs text-gray-500">
                Supported file types: Images, Videos, Documents, Audio files
              </p>
            </div>
          )}

          {/* File List */}
          {files.length > 0 && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="font-medium">Selected Files ({files.length})</h4>
                <button
                  type="button"
                  onClick={handleBrowseClick}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Add More Files
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>

              <div className="space-y-3">
                {files.map((file, index) => {
                  const fileName = file.name;
                  const isImage = getAssetType(file) === AssetType.IMAGE;
                  const isUploaded = uploadSuccess.includes(fileName);
                  const hasError = errors[fileName];
                  const progress = uploadProgress[fileName] || 0;

                  return (
                    <div 
                      key={`${fileName}-${index}`} 
                      className={`border rounded-lg p-3 ${
                        isUploaded ? 'bg-green-50 border-green-200' : 
                        hasError ? 'bg-red-50 border-red-200' : 'bg-white'
                      }`}
                    >
                      <div className="flex gap-3">
                        {/* File Preview */}
                        <div className="flex-shrink-0">
                          {isImage && !isUploaded ? (
                            <div className="w-16 h-16 bg-gray-100 rounded flex items-center justify-center overflow-hidden">
                              <img
                                src={URL.createObjectURL(file)}
                                alt={fileName}
                                className="max-h-full max-w-full object-contain"
                                onLoad={() => URL.revokeObjectURL(URL.createObjectURL(file))}
                              />
                            </div>
                          ) : (
                            <div className="w-16 h-16 bg-gray-100 rounded flex items-center justify-center">
                              {getAssetIcon(file)}
                            </div>
                          )}
                        </div>

                        {/* File Info and Form */}
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between">
                            <p className="text-sm font-medium text-gray-900 truncate" title={fileName}>
                              {fileName}
                            </p>
                            {!isUploaded && !uploading && (
                              <button
                                onClick={() => handleRemoveFile(index)}
                                className="text-gray-500 hover:text-gray-700"
                              >
                                <XMarkIcon className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                          <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>

                          {!isUploaded && (
                            <div className="mt-2 space-y-2">
                              <div>
                                <label htmlFor={`title-${index}`} className="block text-xs font-medium text-gray-700">
                                  Title
                                </label>
                                <input
                                  type="text"
                                  id={`title-${index}`}
                                  value={titles[fileName] || ''}
                                  onChange={(e) => handleTitleChange(fileName, e.target.value)}
                                  disabled={uploading}
                                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-xs"
                                />
                              </div>
                              
                              {isImage && (
                                <div>
                                  <label htmlFor={`alt-${index}`} className="block text-xs font-medium text-gray-700">
                                    Alt Text (for images)
                                  </label>
                                  <input
                                    type="text"
                                    id={`alt-${index}`}
                                    value={altTexts[fileName] || ''}
                                    onChange={(e) => handleAltTextChange(fileName, e.target.value)}
                                    disabled={uploading}
                                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-xs"
                                  />
                                </div>
                              )}
                            </div>
                          )}

                          {/* Upload Progress */}
                          {uploading && !isUploaded && (
                            <div className="mt-2">
                              <div className="w-full bg-gray-200 rounded-full h-2.5">
                                <div 
                                  className="bg-blue-600 h-2.5 rounded-full" 
                                  style={{ width: `${progress}%` }}
                                ></div>
                              </div>
                              <span className="text-xs text-gray-500">
                                {progress === 100 ? 'Processing...' : `Uploading: ${progress}%`}
                              </span>
                            </div>
                          )}

                          {/* Success or Error Message */}
                          {isUploaded && (
                            <div className="mt-2 text-xs text-green-600 flex items-center">
                              <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              Successfully uploaded
                            </div>
                          )}

                          {hasError && (
                            <div className="mt-2 text-xs text-red-600">
                              {errors[fileName]}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t flex justify-end space-x-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={uploading || files.length === 0 || files.length === uploadSuccess.length}
            className={`px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
              uploading || files.length === 0 || files.length === uploadSuccess.length
                ? 'opacity-50 cursor-not-allowed'
                : 'hover:bg-blue-700'
            }`}
          >
            {uploading ? 'Uploading...' : 'Upload Files'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AssetUploader;
