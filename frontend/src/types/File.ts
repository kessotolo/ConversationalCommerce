// File type definitions
// Using UUID type for ID fields as per project standardization
// Removed circular import;
// Removed circular import;

export interface FileType {
  id: string; // UUID
  name: string;
  size: number;
  type: string;
  url: string;
  path?: string;
  createdAt: string;
  updatedAt?: string;
  metadata?: {
    [key: string]: any;
  };
}

export interface UploadedFile {
  file: File;
  progress: number;
  error?: string;
  uploaded: boolean;
}

export interface FileUploadResponse {
  id: string; // UUID
  url: string;
  name: string;
  size: number;
  type: string;
  path?: string;
}
