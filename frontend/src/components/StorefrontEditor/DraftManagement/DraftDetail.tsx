import React from 'react';
import { DraftManagement } from '@/components/StorefrontEditor/DraftManagement/DraftManagement';import * as React from 'react';
import { DraftDetail } from '@/components/StorefrontEditor/DraftManagement/DraftDetail';
import { Select } from '@mui/material';import { DraftDetailProps } from '@/components/StorefrontEditor/DraftManagement/DraftDetail';import { CalendarIcon, CheckIcon, ClockIcon, ExclamationTriangleIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import { Check, Save } from 'lucide-react';
import { Draft, UUID, DraftStatus } from '../../../types/storefrontEditor';
import { updateDraft } from '../../../lib/api/storefrontEditor';
import { 
  ClockIcon, 
  CheckIcon, 
  TrashIcon, 
  PencilIcon,
  CalendarIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

interface DraftDetailProps {
  draft: Draft;
  tenantId: UUID;
  onPublish: (draftId: UUID, scheduleTime?: Date) => Promise<boolean>;
  onDelete: (draftId: UUID) => Promise<boolean>;
  onRefresh: () => void;
}

const DraftDetail: React.FC<DraftDetailProps> = ({ 
  draft, 
  tenantId, 
  onPublish, 
  onDelete,
  onRefresh
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: draft.name,
    description: draft.description,
  });
  
  // Schedule time state
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');

  // Format date
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString();
  };

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      await updateDraft(tenantId, draft.id, formData);
      setSuccessMessage('Draft updated successfully');
      setIsEditing(false);
      onRefresh();
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError('Failed to update draft');
      console.error('Error updating draft:', err);
    } finally {
      setLoading(false);
    }
  };

  // Handle publish
  const handlePublish = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const success = await onPublish(draft.id);
      
      if (success) {
        setSuccessMessage('Draft published successfully');
        setIsPublishing(false);
        
        // Clear success message after 3 seconds
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setError('Failed to publish draft');
      }
    } catch (err) {
      setError('Failed to publish draft');
      console.error('Error publishing draft:', err);
    } finally {
      setLoading(false);
    }
  };

  // Handle schedule publish
  const handleSchedulePublish = async () => {
    if (!scheduleDate || !scheduleTime) {
      setError('Please select both date and time');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const scheduledDateTime = new Date(`${scheduleDate}T${scheduleTime}`);
      
      // Validate future date
      if (scheduledDateTime <= new Date()) {
        setError('Schedule time must be in the future');
        setLoading(false);
        return;
      }
      
      const success = await onPublish(draft.id, scheduledDateTime);
      
      if (success) {
        setSuccessMessage('Draft scheduled for publishing');
        setIsScheduling(false);
        
        // Clear success message after 3 seconds
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setError('Failed to schedule draft');
      }
    } catch (err) {
      setError('Failed to schedule draft');
      console.error('Error scheduling draft:', err);
    } finally {
      setLoading(false);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const success = await onDelete(draft.id);
      
      if (success) {
        setSuccessMessage('Draft deleted successfully');
      } else {
        setError('Failed to delete draft');
      }
    } catch (err) {
      setError('Failed to delete draft');
      console.error('Error deleting draft:', err);
    } finally {
      setLoading(false);
    }
  };

  // Check if draft can be published
  const canPublish = draft.status === DraftStatus.DRAFT;
  
  // Check if draft can be scheduled
  const canSchedule = draft.status === DraftStatus.DRAFT;
  
  // Check if draft is already scheduled
  const isAlreadyScheduled = draft.status === DraftStatus.SCHEDULED;

  return (
    <div className="bg-white rounded-lg border shadow-sm overflow-hidden h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b flex justify-between items-center">
        <h3 className="text-lg font-medium">Draft Details</h3>
        <div className="flex gap-2">
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <PencilIcon className="h-4 w-4 mr-2" />
              Edit
            </button>
          )}
          
          {canPublish && !isEditing && (
            <button
              onClick={() => setIsPublishing(true)}
              className="inline-flex items-center px-3 py-1.5 border border-green-600 shadow-sm text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
            >
              <CheckIcon className="h-4 w-4 mr-2" />
              Publish
            </button>
          )}
          
          {canSchedule && !isEditing && (
            <button
              onClick={() => setIsScheduling(true)}
              className="inline-flex items-center px-3 py-1.5 border border-blue-600 shadow-sm text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              <ClockIcon className="h-4 w-4 mr-2" />
              Schedule
            </button>
          )}
        </div>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="m-4 p-3 bg-green-100 text-green-800 rounded-md flex items-center">
          <CheckIcon className="h-5 w-5 mr-2" />
          {successMessage}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="m-4 p-3 bg-red-100 text-red-800 rounded-md flex items-center">
          <ExclamationTriangleIcon className="h-5 w-5 mr-2" />
          {error}
        </div>
      )}

      {/* Content */}
      <div className="p-4 overflow-y-auto flex-1">
        {isEditing ? (
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Draft Name
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
              
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                  Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  rows={4}
                  value={formData.description}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
              
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  disabled={loading}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  {loading ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </form>
        ) : isPublishing ? (
          <div className="space-y-4">
            <div className="bg-yellow-50 p-4 rounded-md">
              <div className="flex">
                <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">Publish Confirmation</h3>
                  <div className="mt-2 text-sm text-yellow-700">
                    <p>
                      Are you sure you want to publish this draft? This will make all changes live on your storefront.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setIsPublishing(false)}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePublish}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                {loading ? 'Publishing...' : 'Confirm Publish'}
              </button>
            </div>
          </div>
        ) : isScheduling ? (
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-md">
              <div className="flex">
                <CalendarIcon className="h-5 w-5 text-blue-400" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">Schedule Publication</h3>
                  <div className="mt-2 text-sm text-blue-700">
                    <p>
                      Select a date and time when you want this draft to be automatically published.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="scheduleDate" className="block text-sm font-medium text-gray-700">
                  Date
                </label>
                <input
                  type="date"
                  id="scheduleDate"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]} // Today's date as minimum
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
              
              <div>
                <label htmlFor="scheduleTime" className="block text-sm font-medium text-gray-700">
                  Time
                </label>
                <input
                  type="time"
                  id="scheduleTime"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-2 mt-4">
              <button
                type="button"
                onClick={() => setIsScheduling(false)}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSchedulePublish}
                disabled={loading || !scheduleDate || !scheduleTime}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                {loading ? 'Scheduling...' : 'Schedule'}
              </button>
            </div>
          </div>
        ) : isDeleting ? (
          <div className="space-y-4">
            <div className="bg-red-50 p-4 rounded-md">
              <div className="flex">
                <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Delete Confirmation</h3>
                  <div className="mt-2 text-sm text-red-700">
                    <p>
                      Are you sure you want to delete this draft? This action cannot be undone.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setIsDeleting(false)}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                {loading ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Status */}
            <div className="bg-gray-50 p-4 rounded-md">
              <h4 className="text-sm font-medium text-gray-500 mb-1">Status</h4>
              <div className="flex items-center">
                <span className={`text-sm px-2.5 py-1 rounded-full capitalize ${
                  draft.status === DraftStatus.DRAFT
                    ? 'bg-gray-100 text-gray-800'
                    : draft.status === DraftStatus.PENDING
                    ? 'bg-yellow-100 text-yellow-800'
                    : draft.status === DraftStatus.PUBLISHED
                    ? 'bg-green-100 text-green-800'
                    : draft.status === DraftStatus.SCHEDULED
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {draft.status}
                </span>
                
                {isAlreadyScheduled && (
                  <span className="ml-2 text-sm text-gray-500">
                    (Scheduled for publishing)
                  </span>
                )}
              </div>
            </div>
            
            {/* Draft Information */}
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-2">Draft Information</h4>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
                <div className="col-span-2">
                  <dt className="text-sm font-medium text-gray-500">Name</dt>
                  <dd className="mt-1 text-sm text-gray-900">{draft.name}</dd>
                </div>
                
                <div className="col-span-2">
                  <dt className="text-sm font-medium text-gray-500">Description</dt>
                  <dd className="mt-1 text-sm text-gray-900">{draft.description}</dd>
                </div>
                
                <div>
                  <dt className="text-sm font-medium text-gray-500">Created</dt>
                  <dd className="mt-1 text-sm text-gray-900">{formatDate(draft.created_at)}</dd>
                </div>
                
                <div>
                  <dt className="text-sm font-medium text-gray-500">Last Updated</dt>
                  <dd className="mt-1 text-sm text-gray-900">{formatDate(draft.updated_at)}</dd>
                </div>
              </dl>
            </div>
            
            {/* Draft Changes */}
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-2">Changes Summary</h4>
              <div className="bg-gray-50 p-3 rounded-md">
                {Object.keys(draft.changes).length > 0 ? (
                  <ul className="space-y-1 text-sm">
                    {Object.entries(draft.changes).map(([section, changeCount], index) => (
                      <li key={index} className="flex justify-between">
                        <span className="capitalize">{section.replace('_', ' ')}</span>
                        <span className="font-medium">{changeCount} changes</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-500">No changes recorded yet.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      {!isEditing && !isPublishing && !isScheduling && !isDeleting && (
        <div className="p-4 border-t">
          <button
            onClick={() => setIsDeleting(true)}
            className="inline-flex items-center px-3 py-1.5 border border-red-300 shadow-sm text-sm leading-4 font-medium rounded-md text-red-700 bg-white hover:bg-red-50"
          >
            <TrashIcon className="h-4 w-4 mr-2" />
            Delete Draft
          </button>
        </div>
      )}
    </div>
  );
};

export default DraftDetail;
