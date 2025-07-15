// JsonEditorDialog.jsx
import React, { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import JsonTreeView from '../MediaGrid/JsonTreeView'; // Assuming path is correct

const JsonEditorDialog = ({
  showJsonEditor,
  jsonTemplate,
  editingMediaName,
  mediaItem, // Add this prop to get the full media item
  onClose,
  onAddField,
  onRemoveField,
  onEditField,
  onUpdateMetadata,
  // presets, // Optional: if you want to load from a list of preset templates
  // onPresetSelect // Optional: callback for when a preset is selected
}) => {
  const [localData, setLocalData] = useState(jsonTemplate);
  const [mediaName, setMediaName] = useState('');

  useEffect(() => {
    setLocalData(jsonTemplate);
    if (mediaItem) {
      setMediaName(mediaItem.name || '');
    } else if (editingMediaName) {
      setMediaName(editingMediaName);
    }
  }, [jsonTemplate, editingMediaName, mediaItem]);

  if (!showJsonEditor) return null;

  const handleSave = () => {
    onUpdateMetadata(localData, mediaName);
  };

  const handleNameChange = (newName) => {
    setMediaName(newName);
    const updatedData = {
      ...localData,
      title: newName.split('.')[0]
    };
    setLocalData(updatedData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-75 flex items-center justify-center z-50 p-4"> 
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl p-6 w-full max-w-4xl text-gray-900 dark:text-gray-100 flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center mb-4 flex-shrink-0">
          <h2 className="text-xl font-bold">
            Edit Metadata{editingMediaName ? `: ${editingMediaName}` : ''}
          </h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>
        {/* Name field at the top */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            File Name
          </label>
          <input
            type="text"
            value={mediaName}
            onChange={(e) => handleNameChange(e.target.value)}
            className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600"
            placeholder="Enter file name..."
          />
        </div>
        <div className="mb-4 flex-1 overflow-auto p-1 border dark:border-gray-700 rounded">
          <JsonTreeView 
            data={localData} 
            path=""
            onAdd={onAddField} 
            onRemove={onRemoveField}
            onEdit={(path, value) => {
              onEditField(path, value);
              setLocalData(prev => {
                const newData = { ...prev };
                const pathParts = path.split('.').filter(p => p);
                let current = newData;
                for (let i = 0; i < pathParts.length - 1; i++) {
                  current = current[pathParts[i]] || {};
                }
                if (pathParts.length > 0) {
                  current[pathParts[pathParts.length - 1]] = value;
                }
                return newData;
              });
            }}
          />
        </div>
        <div className="flex justify-end space-x-3 flex-shrink-0 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 flex items-center"
          >
            <Save size={16} className="mr-2" /> Update Metadata
          </button>
        </div>
      </div>
    </div>
  );
};

export default JsonEditorDialog;