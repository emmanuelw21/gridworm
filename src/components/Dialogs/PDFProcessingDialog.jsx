// components/Dialogs/PDFProcessingDialog.jsx
import React from 'react';
import { FileText, Loader } from 'lucide-react';

/**
 * PDFProcessingDialog Component
 * Shows progress while processing PDF files
 */
const PDFProcessingDialog = ({ 
  isOpen, 
  fileName, 
  progress = 0,
  darkMode = false 
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className={`${darkMode ? 'dark' : ''} bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-96`}>
        <div className="flex items-center mb-4">
          <FileText className="text-orange-600 dark:text-orange-400 mr-3" size={32} />
          <div>
            <h3 className="text-lg font-semibold dark:text-white">Processing Document</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">{fileName}</p>
          </div>
        </div>

        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">Extracting pages...</span>
            <span className="text-sm font-medium dark:text-white">{progress}%</span>
          </div>
          
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div 
              className="bg-orange-600 dark:bg-orange-400 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="flex items-center justify-center text-gray-500 dark:text-gray-400">
          <Loader className="animate-spin mr-2" size={16} />
          <span className="text-sm">Please wait while we process your document...</span>
        </div>
      </div>
    </div>
  );
};

export default PDFProcessingDialog;