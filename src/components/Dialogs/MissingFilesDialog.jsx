// components/Dialogs/MissingFilesDialog.jsx
import React, { useState, useRef } from 'react';
import { AlertTriangle, Upload, FolderOpen, X, FileQuestion } from 'lucide-react';

const MissingFilesDialog = ({ 
  missingFiles, 
  onProceed, 
  onCancel, 
  onUploadFiles,
  darkMode 
}) => {
  const [showDetails, setShowDetails] = useState(false);
  const fileInputRef = useRef(null);
  const folderInputRef = useRef(null);
  
  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      onUploadFiles(files);
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-md w-full max-h-[80vh] overflow-hidden flex flex-col">
        <div className="flex items-center mb-4">
          <AlertTriangle className="text-yellow-500 mr-3" size={32} />
          <h2 className="text-xl font-bold dark:text-white">Missing Media Files</h2>
        </div>
        
        <div className="mb-4">
          <p className="text-gray-600 dark:text-gray-300 mb-2">
            This book contains {missingFiles.length} missing media file{missingFiles.length > 1 ? 's' : ''}.
            Would you like to locate them before loading?
          </p>
          
          {showDetails && (
            <div className="mt-3 p-3 bg-gray-100 dark:bg-gray-700 rounded max-h-40 overflow-y-auto">
              <p className="text-sm font-semibold mb-2 dark:text-gray-200">Missing files:</p>
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                {missingFiles.map((file, index) => (
                  <li key={index} className="flex items-center">
                    <FileQuestion size={14} className="mr-2 flex-shrink-0" />
                    <span className="truncate">{file}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline mt-2"
          >
            {showDetails ? 'Hide' : 'Show'} missing files
          </button>
        </div>
        
        <div className="space-y-3">
          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,video/*,audio/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 
                       transition-colors flex items-center justify-center"
            >
              <Upload size={18} className="mr-2" />
              Select Files
            </button>
            
            <input
              ref={folderInputRef}
              type="file"
              webkitdirectory="true"
              directory="true"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
            <button 
              onClick={() => folderInputRef.current?.click()}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 
                       transition-colors flex items-center justify-center"
            >
              <FolderOpen size={18} className="mr-2" />
              Select Folder
            </button>
          </div>
          
          <div className="flex gap-2 pt-2 border-t dark:border-gray-700">
            <button
              onClick={onProceed}
              className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 
                       dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600 
                       transition-colors"
            >
              Load with Placeholders
            </button>
            
            <button
              onClick={onCancel}
              className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 
                       dark:hover:text-gray-200 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
        
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 text-center">
          Tip: Missing files will be shown as placeholders and automatically replaced when you add them
        </p>
      </div>
    </div>
  );
};

export default MissingFilesDialog;