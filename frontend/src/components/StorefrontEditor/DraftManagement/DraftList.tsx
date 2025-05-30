import * as React from 'react';
import { DraftManagement } from '@/components/StorefrontEditor/DraftManagement/DraftManagement';
import { DraftList } from '@/components/StorefrontEditor/DraftManagement/DraftList';import { DraftListProps } from '@/components/StorefrontEditor/DraftManagement/DraftList';import React from 'react';
import { Draft, UUID, DraftStatus } from '../../../types/storefrontEditor';

interface DraftListProps {
  drafts: Draft[];
  loading: boolean;
  selectedDraftId?: UUID;
  onDraftSelect: (draft: Draft) => void;
}

const DraftList: React.FC<DraftListProps> = ({ 
  drafts, 
  loading, 
  selectedDraftId, 
  onDraftSelect 
}) => {
  // Format date
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Get status badge class based on status
  const getStatusBadgeClass = (status: DraftStatus): string => {
    switch (status) {
      case DraftStatus.DRAFT:
        return 'bg-gray-100 text-gray-800';
      case DraftStatus.PENDING:
        return 'bg-yellow-100 text-yellow-800';
      case DraftStatus.PUBLISHED:
        return 'bg-green-100 text-green-800';
      case DraftStatus.SCHEDULED:
        return 'bg-blue-100 text-blue-800';
      case DraftStatus.ARCHIVED:
        return 'bg-gray-100 text-gray-600';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="p-4 flex justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700"></div>
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
            selectedDraftId === draft.id ? 'bg-blue-50' : ''
          }`}
        >
          <div className="flex justify-between items-start mb-1">
            <h3 className="font-medium text-gray-900 truncate" title={draft.name}>
              {draft.name}
            </h3>
            <span
              className={`text-xs px-2 py-1 rounded-full ${getStatusBadgeClass(draft.status)}`}
            >
              {draft.status}
            </span>
          </div>
          <p className="text-sm text-gray-500 mb-2 line-clamp-2" title={draft.description}>
            {draft.description}
          </p>
          <div className="flex justify-between text-xs text-gray-500">
            <span>Last updated: {formatDate(draft.updated_at)}</span>
          </div>
        </div>
      ))}
    </div>
  );
};

export default DraftList;
