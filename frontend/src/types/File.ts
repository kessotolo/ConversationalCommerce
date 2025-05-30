import * as React from 'react';
// @ts-nocheck
// DO NOT MODIFY: This file is manually maintained
// File type definitions

export interface FileType {
  id: string;
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
  id: string;
  url: string;
  name: string;
  size: number;
  type: string;
  path?: string;
}
