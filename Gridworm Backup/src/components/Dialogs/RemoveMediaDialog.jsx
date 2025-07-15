// RemoveMediaDialog.jsx
import React from 'react';
import { Trash2, X, AlertTriangle } from 'lucide-react';

const RemoveMediaDialog = ({ 
  showDialog, 
  selectedCount, 
  onClose, 
  onRemoveFromList, // Renamed from onRemoveFromMediaPanel for clarity, assuming it removes from the app's list
  onExportDeleteCommand 
  // removeContext, // This prop and onRemoveFromGridOnly are removed as they are better handled by parent logic
  // onRemoveFromGridOnly, // This would be handled by the parent component conditionally calling a specific function
}) => {
  if (!showDialog) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 max-w-md w-full text-gray-900 dark:text-gray-100">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold">
            Remove Media
          </h3>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white"
          >
            <X size={24} />
          </button>
        </div>
        
        <div className="mb-6">
          <div className="flex items-center text-amber-600 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-300 p-3 rounded-lg mb-4">
            <AlertTriangle className="mr-2" size={20} />
            <p>You've selected {selectedCount} media item{selectedCount !== 1 ? 's' : ''}. What would you like to do?</p>
          </div>
          
          <div className="space-y-4">
            <button
              onClick={onRemoveFromList} // This callback should handle removing from the mediaFiles array in the parent
              className="w-full flex items-center justify-center p-3 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              <Trash2 size={18} className="mr-2" />
              Remove from App List
              <p className="text-xs opacity-80 ml-2 block text-center w-full mt-1">(Files remain on your system)</p>
            </button>
            
            <button
              onClick={onExportDeleteCommand}
              className="w-full flex items-center justify-center p-3 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
            >
              <Trash2 size={18} className="mr-2" />
              Export Delete Command
              <p className="text-xs opacity-80 ml-2 block text-center w-full mt-1">(For terminal execution)</p>
            </button>
          </div>
        </div>
        
        <div className="text-xs text-gray-500 dark:text-gray-400">
          Note: Removing media from the app list only affects this application. Exporting a delete command allows you to manage actual files on your system.
        </div>
      </div>
    </div>
  );
};

export default RemoveMediaDialog;