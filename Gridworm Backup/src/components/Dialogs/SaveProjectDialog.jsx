// SaveProjectDialog.jsx
import React from 'react';
import { X, Save } from 'lucide-react';

const SaveProjectDialog = ({
  showSaveDialog,
  projectName,
  onClose,
  onProjectNameChange,
  onSaveProject
}) => {
  if (!showSaveDialog) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 max-w-md w-full text-gray-900 dark:text-gray-100">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Save Project</h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="mb-4">
          <label htmlFor="projectNameInput" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Project Name</label>
          <input 
            id="projectNameInput"
            type="text"
            value={projectName}
            onChange={(e) => onProjectNameChange(e.target.value)}
            placeholder="Enter project name"
            className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500"
            autoFocus
          />
        </div>
        
        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 dark:border-gray-500 rounded text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            onClick={onSaveProject}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center"
            disabled={!projectName || !projectName.trim()} // Disable if empty or only whitespace
          >
            <Save size={16} className="mr-2" /> Save Project
          </button>
        </div>
      </div>
    </div>
  );
};

export default SaveProjectDialog;