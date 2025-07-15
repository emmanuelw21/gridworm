// JsonEditorDialog.jsx
import React from 'react';
import { X, Save } from 'lucide-react';
import JsonTreeView from '../MediaGrid/JsonTreeView'; // Assuming path is correct

const JsonEditorDialog = ({
  showJsonEditor,
  jsonTemplate,
  editingMediaName,
  onClose,
  onAddField,
  onRemoveField,
  onEditField,
  onSaveTemplate, // For saving the template globally (if editing template mode)
  onUpdateMetadata, // For saving metadata to a specific media item
  // presets, // Optional: if you want to load from a list of preset templates
  // onPresetSelect // Optional: callback for when a preset is selected
}) => {
  if (!showJsonEditor) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-75 flex items-center justify-center z-50 p-4"> 
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl p-6 w-full max-w-4xl text-gray-900 dark:text-gray-100 flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center mb-4 flex-shrink-0">
          <h2 className="text-xl font-bold">
            {editingMediaName ? `Edit Metadata: ${editingMediaName}` : 'Edit JSON Template Structure'}
          </h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="mb-4 flex-1 overflow-auto p-1 border dark:border-gray-700 rounded">
          <JsonTreeView 
            data={jsonTemplate} 
            path="" // Root path is empty string
            onAdd={onAddField} 
            onRemove={onRemoveField}
            onEdit={onEditField}
          />
        </div>
        
        <div className="flex justify-end space-x-3 flex-shrink-0 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
          {editingMediaName !== null ? ( // Check if we are editing a specific media item
            <button
              onClick={onUpdateMetadata}
              className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 flex items-center"
            >
              <Save size={16} className="mr-2" /> Update Metadata
            </button>
          ) : (
            <button
              onClick={onSaveTemplate}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center"
            >
              <Save size={16} className="mr-2" /> Save Template Structure
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default JsonEditorDialog;