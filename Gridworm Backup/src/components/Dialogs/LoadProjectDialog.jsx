// LoadProjectDialog.jsx
import React from 'react';
import { X, FolderInput } from 'lucide-react'; // Assuming FolderInput is for load action

const LoadProjectDialog = ({
  showLoadDialog,
  savedProjects,
  onClose,
  onFileSelected, // For <input type="file" />
  onLoadProject   // For loading a project from the list
}) => {
  if (!showLoadDialog) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 max-w-md w-full text-gray-900 dark:text-gray-100">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Load Project</h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="mb-4">
          <label htmlFor="projectFileInput" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Load from file (.json, .mgrid.json)</label>
          <input 
            id="projectFileInput"
            type="file"
            accept=".json,.mgrid.json" // Specify accepted file types
            onChange={onFileSelected}
            className="w-full px-3 py-2 border rounded text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 dark:file:bg-blue-900 file:text-blue-700 dark:file:text-blue-300 hover:file:bg-blue-100 dark:hover:file:bg-blue-800 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300"
          />
        </div>
        
        {savedProjects && savedProjects.length > 0 && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Or load from Saved Projects</label>
            <div className="max-h-48 overflow-y-auto border rounded dark:border-gray-600">
              {savedProjects.map((project, idx) => (
                <div 
                  key={project.id || idx} // Prefer a unique project.id if available
                  onClick={() => onLoadProject(project)}
                  className="p-3 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer border-b last:border-b-0 dark:border-gray-700 flex justify-between items-center"
                >
                  <div>
                    <div className="font-medium">{project.name}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Saved: {project.date ? new Date(project.date).toLocaleString() : 'N/A'}
                    </div>
                  </div>
                  <button 
                    className="p-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                    title={`Load project: ${project.name}`}
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent div click from firing twice
                      onLoadProject(project);
                    }}
                  >
                    <FolderInput size={18} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
        
        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 dark:border-gray-500 rounded text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoadProjectDialog;