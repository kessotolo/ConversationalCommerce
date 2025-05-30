import { DraftManagement } from '@/components/StorefrontEditor/DraftManagement/DraftManagement';import * as React from 'react';
import { List, Select } from '@mui/material';import { DraftManagementProps } from '@/components/StorefrontEditor/DraftManagement/DraftManagement';import { Search } from 'lucide-react';
import { getDrafts, publishDraft, deleteDraft } from '../../../lib/api/storefrontEditor';
import { Draft, UUID, DraftStatus } from '../../../types/storefrontEditor';
import DraftList from './DraftList';
import DraftDetail from './DraftDetail';
import CreateDraftModal from './CreateDraftModal';
import { PlusIcon } from '@heroicons/react/24/outline';

interface DraftManagementProps {
  tenantId: UUID;
}

const DraftManagement: React.FC<DraftManagementProps> = ({ tenantId }) => {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [selectedDraft, setSelectedDraft] = useState<Draft | null>(null);
  const [totalDrafts, setTotalDrafts] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [skip, setSkip] = useState(0);
  const [limit] = useState(10);
  
  // Filter state
  const [statusFilter, setStatusFilter] = useState<DraftStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Load drafts
  const loadDrafts = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await getDrafts(tenantId, skip, limit);
      setDrafts(response.items);
      setTotalDrafts(response.total);
      
      // Select first draft if nothing is selected
      if (response.items.length > 0 && !selectedDraft) {
        setSelectedDraft(response.items[0]);
      }
    } catch (err) {
      setError('Failed to load drafts. Please try again later.');
      console.error('Error loading drafts:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load drafts on initial render and when filters change
  useEffect(() => {
    loadDrafts();
  }, [tenantId, skip, limit]);

  // Handle draft selection
  const handleDraftSelect = (draft: Draft) => {
    setSelectedDraft(draft);
  };

  // Handle publishing a draft
  const handlePublishDraft = async (draftId: UUID, scheduleTime?: Date) => {
    try {
      await publishDraft(tenantId, draftId, scheduleTime);
      loadDrafts(); // Refresh list after publishing
    } catch (err) {
      console.error('Error publishing draft:', err);
      return false;
    }
    return true;
  };

  // Handle deleting a draft
  const handleDeleteDraft = async (draftId: UUID) => {
    try {
      await deleteDraft(tenantId, draftId);
      
      // If the deleted draft was selected, clear selection
      if (selectedDraft && selectedDraft.id === draftId) {
        setSelectedDraft(null);
      }
      
      loadDrafts(); // Refresh list after deletion
    } catch (err) {
      console.error('Error deleting draft:', err);
      return false;
    }
    return true;
  };

  // Handle pagination
  const handlePageChange = (newSkip: number) => {
    setSkip(newSkip);
  };

  // Apply filters
  const filteredDrafts = drafts.filter(draft => {
    // Apply status filter
    if (statusFilter !== 'all' && draft.status !== statusFilter) {
      return false;
    }
    
    // Apply search query
    if (searchQuery && !draft.name.toLowerCase().includes(searchQuery.toLowerCase()) && 
        !draft.description.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    
    return true;
  });

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-semibold">Draft Management</h2>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          <PlusIcon className="w-5 h-5 mr-2" />
          Create Draft
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="flex-1 flex gap-6">
        {/* Draft List */}
        <div className="w-1/3 bg-white rounded-lg border shadow-sm overflow-hidden">
          <div className="p-4 border-b">
            <div className="flex gap-2 mb-3">
              <button 
                onClick={() => setStatusFilter('all')}
                className={`text-xs px-3 py-1 rounded-full ${
                  statusFilter === 'all' 
                    ? 'bg-blue-100 text-blue-800' 
                    : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                }`}
              >
                All
              </button>
              <button 
                onClick={() => setStatusFilter(DraftStatus.DRAFT)}
                className={`text-xs px-3 py-1 rounded-full ${
                  statusFilter === DraftStatus.DRAFT 
                    ? 'bg-blue-100 text-blue-800' 
                    : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                }`}
              >
                Drafts
              </button>
              <button 
                onClick={() => setStatusFilter(DraftStatus.PENDING)}
                className={`text-xs px-3 py-1 rounded-full ${
                  statusFilter === DraftStatus.PENDING 
                    ? 'bg-blue-100 text-blue-800' 
                    : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                }`}
              >
                Pending
              </button>
              <button 
                onClick={() => setStatusFilter(DraftStatus.SCHEDULED)}
                className={`text-xs px-3 py-1 rounded-full ${
                  statusFilter === DraftStatus.SCHEDULED 
                    ? 'bg-blue-100 text-blue-800' 
                    : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                }`}
              >
                Scheduled
              </button>
            </div>

            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search drafts..."
                className="w-full pl-10 pr-4 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
          </div>

          <DraftList
            drafts={filteredDrafts}
            loading={loading}
            selectedDraftId={selectedDraft?.id}
            onDraftSelect={handleDraftSelect}
          />

          {/* Pagination */}
          <div className="p-3 border-t flex justify-between items-center">
            <span className="text-sm text-gray-600">
              {filteredDrafts.length > 0 ? 
                `Showing ${skip + 1}-${skip + filteredDrafts.length} of ${totalDrafts}` : 
                'No drafts found'}
            </span>
            <div className="flex space-x-2">
              <button
                onClick={() => handlePageChange(Math.max(0, skip - limit))}
                disabled={skip === 0}
                className={`px-3 py-1 rounded ${
                  skip === 0
                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                Previous
              </button>
              <button
                onClick={() => handlePageChange(skip + limit)}
                disabled={skip + limit >= totalDrafts}
                className={`px-3 py-1 rounded ${
                  skip + limit >= totalDrafts
                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                Next
              </button>
            </div>
          </div>
        </div>

        {/* Draft Detail */}
        <div className="w-2/3">
          {selectedDraft ? (
            <DraftDetail
              draft={selectedDraft}
              tenantId={tenantId}
              onPublish={handlePublishDraft}
              onDelete={handleDeleteDraft}
              onRefresh={loadDrafts}
            />
          ) : (
            <div className="bg-white rounded-lg border shadow-sm p-8 flex flex-col items-center justify-center h-full">
              <svg className="h-16 w-16 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900">No draft selected</h3>
              <p className="text-gray-500 mt-1">Select a draft to view details or create a new one.</p>
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="mt-4 flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                <PlusIcon className="w-5 h-5 mr-2" />
                Create Draft
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Create Draft Modal */}
      {isCreateModalOpen && (
        <CreateDraftModal
          tenantId={tenantId}
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={loadDrafts}
        />
      )}
    </div>
  );
};

export default DraftManagement;
