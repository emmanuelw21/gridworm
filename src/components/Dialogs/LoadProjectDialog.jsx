// LoadProjectDialog.jsx
import React, { useState } from 'react';
import { X, FolderInput, Upload, Trash2, Book, Calendar, Package } from 'lucide-react';

const LoadProjectDialog = ({
  showLoadDialog,
  savedProjects,
  onClose,
  onFileSelected,
  onLoadProject,
  onDeleteProject,
  onLoadAndOpenBook
}) => {
  const [selectedProject, setSelectedProject] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState(null);

  if (!showLoadDialog) return null;

  const handleDelete = (e, project) => {
    e.stopPropagation();
    setProjectToDelete(project);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    if (projectToDelete && onDeleteProject) {
      onDeleteProject(projectToDelete.id);
    }
    setShowDeleteConfirm(false);
    setProjectToDelete(null);
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return 'Unknown size';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-75 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 max-w-2xl w-full text-gray-900 dark:text-gray-100 max-h-[90vh] flex flex-col">
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
            <label htmlFor="projectFileInput" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Load from file
            </label>
            <div className="flex items-center space-x-2">
              <input 
                id="projectFileInput"
                type="file"
                accept=".json,.gridworm.json"
                onChange={onFileSelected}
                className="flex-1 px-3 py-2 border rounded text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 dark:file:bg-blue-900 file:text-blue-700 dark:file:text-blue-300 hover:file:bg-blue-100 dark:hover:file:bg-blue-800 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300"
              />
              <Upload size={20} className="text-gray-500" />
            </div>
          </div>
          
          {savedProjects && savedProjects.length > 0 ? (
            <div className="flex-1 overflow-hidden flex flex-col">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Or load from saved projects
              </label>
              <div className="flex-1 overflow-y-auto border rounded dark:border-gray-600">
                {savedProjects.map((project, idx) => (
                  <div 
                    key={project.id || idx}
                    onClick={() => setSelectedProject(project)}
                    className={`p-4 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer border-b last:border-b-0 dark:border-gray-700 transition-colors ${
                      selectedProject?.id === project.id ? 'bg-blue-50 dark:bg-blue-900/30' : ''
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="font-medium text-lg">{project.name}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400 mt-1 space-y-1">
                          <div className="flex items-center space-x-4">
                            <span className="flex items-center">
                              <Calendar size={14} className="mr-1" />
                              {project.date ? new Date(project.date).toLocaleDateString() : 'Unknown date'}
                            </span>
                            <span className="flex items-center">
                              <Package size={14} className="mr-1" />
                              {project.mediaCount || 0} items
                            </span>
                            {project.fileSize && (
                              <span>{formatFileSize(project.fileSize)}</span>
                            )}
                          </div>
                          {project.description && (
                            <p className="text-xs italic">{project.description}</p>
                          )}
                        </div>
                      </div>
                      <button 
                        className="p-2 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                        title="Delete project"
                        onClick={(e) => handleDelete(e, project)}
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center border rounded dark:border-gray-600 py-12">
              <p className="text-gray-500 dark:text-gray-400 text-center">
                No saved projects found.<br />
                Load a project from a file to get started.
              </p>
            </div>
          )}
          
          <div className="mt-6 flex justify-between">
            <div className="flex space-x-3">
              {selectedProject && onLoadAndOpenBook && (
                <button
                  onClick={() => onLoadAndOpenBook(selectedProject)}
                  className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 flex items-center"
                >
                  <Book size={16} className="mr-2" /> Load & Open Book
                </button>
              )}
            </div>
            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 dark:border-gray-500 rounded text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              {selectedProject && (
                <button
                  onClick={() => onLoadProject(selectedProject)}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center"
                >
                  <FolderInput size={16} className="mr-2" /> Load Project
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-75 flex items-center justify-center z-[60] p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 max-w-sm w-full">
            <h3 className="text-lg font-bold mb-4">Delete Project?</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
              Are you sure you want to delete "{projectToDelete?.name}"? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-500 rounded text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default LoadProjectDialog;