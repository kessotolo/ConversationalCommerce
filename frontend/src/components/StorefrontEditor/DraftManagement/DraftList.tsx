import React from 'react';

import type { Draft } from '@/modules/storefront/models/draft';

interface DraftListProps {
  drafts: Draft[];
  loading: boolean;
  selectedDraftId?: string | undefined;
  onDraftSelect: (draft: Draft) => void;
}

const DraftList: React.FC<DraftListProps> = ({
  drafts,
  loading,
  selectedDraftId,
  onDraftSelect,
}) => {
  // Format date helper
  const formatDate = (dateString?: string): string => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date);
  };

  // Get status badge class based on status
  const getStatusBadgeClass = (status: Draft['status']): string => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'published':
        return 'bg-green-100 text-green-800';
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="p-4 flex justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700" />
      </div>
    );
  }

  if (drafts.length === 0) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500">No drafts found.</p>
      </div>
    );
  }

  return (
    <div className="divide-y overflow-y-auto max-h-[500px]">
      {drafts.map((draft) => (
        <div
          key={draft.id}
          onClick={() => onDraftSelect(draft)}
          className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
            selectedDraftId && selectedDraftId === draft.id ? 'bg-blue-50' : ''
          }`}
        >
          <div className="flex justify-between items-start mb-1">
            <h3 className="font-medium text-gray-900 truncate" title={draft.name}>
              {draft.name}
            </h3>
            <span className={`text-xs px-2 py-1 rounded-full ${getStatusBadgeClass(draft.status)}`}>
              {draft.status}
            </span>
          </div>
          <p className="text-sm text-gray-500 mb-2 line-clamp-2" title={draft.description || ''}>
            {draft.description || ''}
          </p>
          <div className="flex justify-between text-xs text-gray-500">
            <span>Last updated: {draft.updated_at ? formatDate(draft.updated_at) : 'N/A'}</span>
          </div>
        </div>
      ))}
    </div>
  );
};

export default DraftList;
