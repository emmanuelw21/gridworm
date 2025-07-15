// SaveProjectDialog.jsx
import React, { useState } from 'react';
import { X, Save, Download, Database } from 'lucide-react';

const SaveProjectDialog = ({
  showSaveDialog,
  projectName,
  onClose,
  onProjectNameChange,
  onSaveProject,
  existingProjects = []
}) => {
  const [saveMethod, setSaveMethod] = useState('both'); // 'file', 'local', 'both'
  const [showOverwriteWarning, setShowOverwriteWarning] = useState(false);

  React.useEffect(() => {
    // Check if project name already exists
    const exists = existingProjects.some(p => p.name === projectName);
    setShowOverwriteWarning(exists && projectName.trim() !== '');
  }, [projectName, existingProjects]);

  if (!showSaveDialog) return null;

  const handleSave = () => {
    onSaveProject(saveMethod);
  };

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
        
        <div className="space-y-4">
          <div>
            <label htmlFor="projectNameInput" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Project Name
            </label>
            <input 
              id="projectNameInput"
              type="text"
              value={projectName}
              onChange={(e) => onProjectNameChange(e.target.value)}
              placeholder="Enter project name"
              className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500"
              autoFocus
            />
            {showOverwriteWarning && (
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                ⚠️ A project with this name already exists and will be overwritten
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Save Method
            </label>
            <div className="space-y-2">
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  value="file"
                  checked={saveMethod === 'file'}
                  onChange={(e) => setSaveMethod(e.target.value)}
                  className="mr-2"
                />
                <Download size={16} className="mr-2" />
                <span className="text-sm">Download as file (.gridworm.json)</span>
              </label>
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  value="local"
                  checked={saveMethod === 'local'}
                  onChange={(e) => setSaveMethod(e.target.value)}
                  className="mr-2"
                />
                <Database size={16} className="mr-2" />
                <span className="text-sm">Save to browser storage</span>
              </label>
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  value="both"
                  checked={saveMethod === 'both'}
                  onChange={(e) => setSaveMethod(e.target.value)}
                  className="mr-2"
                />
                <Save size={16} className="mr-2" />
                <span className="text-sm">Both (recommended)</span>
              </label>
            </div>
          </div>

          <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 p-3 rounded">
            <p className="font-semibold mb-1">What gets saved:</p>
            <ul className="list-disc list-inside space-y-0.5">
              <li>All media files and metadata</li>
              <li>Grid layout and configuration</li>
              <li>Free grid positions</li>
              <li>Book settings and page mappings</li>
              <li>View preferences</li>
            </ul>
          </div>
        </div>
        
        <div className="flex justify-end space-x-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 dark:border-gray-500 rounded text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center"
            disabled={!projectName || !projectName.trim()}
          >
            <Save size={16} className="mr-2" /> Save Project
          </button>
        </div>
      </div>
    </div>
  );
};

export default SaveProjectDialog;