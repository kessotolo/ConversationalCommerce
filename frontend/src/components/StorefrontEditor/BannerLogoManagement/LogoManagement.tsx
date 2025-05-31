import { FC } from 'react';// Removed self-import
// Removed self-importimport * as React from 'react';
import { List, Select } from '@mui/material';import { LogoManagementProps } from '@/components/StorefrontEditor/BannerLogoManagement/LogoManagement';import React, { useState, useEffect } from 'react';
import { getLogos, publishLogo, deleteLogo } from '../../../lib/api/StorefrontEditor';
import { Logo, UUID, LogoStatus, LogoType } from '../../../types/StorefrontEditor';
import LogoList from './LogoList';
import LogoDetail from './LogoDetail';
import CreateLogoModal from './CreateLogoModal';
import { PlusIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

interface LogoManagementProps {
  tenantId: UUID;
}

const LogoManagement: React.FC<LogoManagementProps> = ({ tenantId }) => {
  const [logos, setLogos] = useState<Logo[]>([]);
  const [selectedLogo, setSelectedLogo] = useState<Logo | null>(null);
  const [totalLogos, setTotalLogos] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [offset, setOffset] = useState(0);
  const [limit] = useState(20);
  
  // Filter state
  const [statusFilter, setStatusFilter] = useState<LogoStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<LogoType | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Load logos
  const loadLogos = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params: any = { offset, limit };
      
      // Add filters if set
      if (statusFilter !== 'all') params.status = statusFilter;
      if (typeFilter !== 'all') params.logo_type = typeFilter;
      if (searchQuery) params.search = searchQuery;
      
      const response = await getLogos(tenantId, params);
      setLogos(response.items);
      setTotalLogos(response.total);
      
      // Select first logo if nothing is selected
      if (response.items.length > 0 && !selectedLogo) {
        setSelectedLogo(response.items[0]);
      }
    } catch (err) {
      setError('Failed to load logos. Please try again later.');
      console.error('Error loading logos:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load logos on initial render and when filters change
  useEffect(() => {
    loadLogos();
  }, [tenantId, offset, limit, statusFilter, typeFilter, searchQuery]);

  // Handle logo selection
  const handleLogoSelect = (logo: Logo) => {
    setSelectedLogo(logo);
  };

  // Handle publishing a logo
  const handlePublishLogo = async (logoId: UUID) => {
    try {
      await publishLogo(tenantId, logoId);
      setSuccessMessage('Logo published successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
      loadLogos();
      return true;
    } catch (err) {
      setError('Failed to publish logo');
      setTimeout(() => setError(null), 3000);
      console.error('Error publishing logo:', err);
      return false;
    }
  };

  // Handle deleting a logo
  const handleDeleteLogo = async (logoId: UUID) => {
    try {
      await deleteLogo(tenantId, logoId);
      
      // If the deleted logo was selected, clear selection
      if (selectedLogo && selectedLogo.id === logoId) {
        setSelectedLogo(null);
      }
      
      setSuccessMessage('Logo deleted successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
      loadLogos();
      return true;
    } catch (err) {
      setError('Failed to delete logo');
      setTimeout(() => setError(null), 3000);
      console.error('Error deleting logo:', err);
      return false;
    }
  };

  // Handle pagination
  const handlePageChange = (newOffset: number) => {
    setOffset(newOffset);
  };

  // Apply filters
  const handleFilterChange = (status: LogoStatus | 'all', type: LogoType | 'all', query: string) => {
    setStatusFilter(status);
    setTypeFilter(type);
    setSearchQuery(query);
    setOffset(0); // Reset pagination when filters change
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center">
          <h3 className="text-xl font-medium">Logos</h3>
          <button
            onClick={loadLogos}
            className="ml-2 p-1 text-gray-500 hover:text-gray-700 focus:outline-none"
            title="Refresh"
          >
            <ArrowPathIcon className="h-5 w-5" />
          </button>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          <PlusIcon className="w-5 h-5 mr-2" />
          Create Logo
        </button>
      </div>

      {successMessage && (
        <div className="mb-4 p-3 bg-green-100 text-green-800 rounded-md">
          {successMessage}
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-800 rounded-md">
          {error}
        </div>
      )}

      <div className="flex-1 flex gap-6">
        {/* Logo List */}
        <div className="w-1/2 bg-white rounded-lg border shadow-sm overflow-hidden flex flex-col">
          <LogoList
            logos={logos}
            loading={loading}
            selectedLogoId={selectedLogo?.id}
            onLogoSelect={handleLogoSelect}
            onFilterChange={handleFilterChange}
            statusFilter={statusFilter}
            typeFilter={typeFilter}
            searchQuery={searchQuery}
          />
          
          {/* Pagination */}
          {logos.length > 0 && (
            <div className="p-3 border-t mt-auto">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">
                  Showing {offset + 1}-{Math.min(offset + logos.length, totalLogos)} of {totalLogos}
                </span>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handlePageChange(Math.max(0, offset - limit))}
                    disabled={offset === 0}
                    className={`px-3 py-1 rounded text-sm ${
                      offset === 0
                        ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => handlePageChange(offset + limit)}
                    disabled={offset + limit >= totalLogos}
                    className={`px-3 py-1 rounded text-sm ${
                      offset + limit >= totalLogos
                        ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Logo Detail */}
        <div className="w-1/2">
          {selectedLogo ? (
            <LogoDetail
              logo={selectedLogo}
              tenantId={tenantId}
              onPublish={handlePublishLogo}
              onDelete={handleDeleteLogo}
              onUpdate={loadLogos}
            />
          ) : (
            <div className="bg-white rounded-lg border shadow-sm p-8 flex flex-col items-center justify-center h-full">
              <svg className="h-16 w-16 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900">No logo selected</h3>
              <p className="text-gray-500 mt-1">Select a logo to view details or create a new one.</p>
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="mt-4 flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                <PlusIcon className="w-5 h-5 mr-2" />
                Create Logo
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Create Logo Modal */}
      {isCreateModalOpen && (
        <CreateLogoModal
          tenantId={tenantId}
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={loadLogos}
        />
      )}
    </div>
  );
};

export default LogoManagement;
