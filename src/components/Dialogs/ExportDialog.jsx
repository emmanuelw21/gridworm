// ExportDialog.jsx
import React from 'react';
import { X, Save } from 'lucide-react';

const ExportDialog = ({ 
  showExportDialog, 
  exportData, 
  onClose, 
  onExport, 
  onFormChange 
}) => {
  if (!showExportDialog) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 max-w-md w-full text-gray-900 dark:text-gray-100">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Export Volume</h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Volume Title</label>
            <input 
              type="text"
              name="title"
              value={exportData.title}
              onChange={onFormChange}
              placeholder="e.g. Volume Four"
              className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Author</label>
            <input 
              type="text"
              name="author"
              value={exportData.author}
              onChange={onFormChange}
              placeholder="e.g. Emmanuel Whyte"
              className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
            <textarea 
              name="description"
              value={exportData.description}
              onChange={onFormChange}
              placeholder="Add a brief description"
              className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400"
              rows={3}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Slot</label>
            <input 
              type="text"
              name="slot"
              value={exportData.slot}
              onChange={onFormChange}
              placeholder="e.g. SlotD (leave blank for auto-assignment)"
              className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Front Cover</label>
              <input 
                type="text"
                name="frontCover"
                value={exportData.frontCover}
                onChange={onFormChange}
                placeholder="Filename"
                className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Leave blank to use first image
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Back Cover</label>
              <input 
                type="text"
                name="backCover"
                value={exportData.backCover}
                onChange={onFormChange}
                placeholder="Filename"
                className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Leave blank to use last image
              </p>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">JSON Path</label>
            <input 
              type="text"
              name="jsonPath"
              value={exportData.jsonPath}
              onChange={onFormChange}
              placeholder="e.g. /volumes/book4.json"
              className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Leave blank for automatic path
            </p>
          </div>
        </div>
        
        <div className="mt-6 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 dark:border-gray-500 rounded text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            onClick={onExport}
            className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 flex items-center"
          >
            <Save size={16} className="mr-2" /> Export
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExportDialog;