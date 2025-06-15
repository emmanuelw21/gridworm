import React from 'react';
import { Trash2, Move, PlusCircle } from 'lucide-react';

const JsonTreeView = ({ data, path = "", onAdd, onRemove, onEdit }) => {
  const isObject = data !== null && typeof data === 'object' && !Array.isArray(data);
  const isArray = Array.isArray(data);
  
  if (isObject) {
    return (
      // Removed ml-4 from here to allow content to go closer to the edge if desired, 
      // or keep it if you prefer the indent for nesting.
      // For full width as per red dots, removing ml-4 might be what you want.
      // If you keep ml-4, the "red dots" area is effectively indented by that much.
      <div className="dark:bg-gray-800 dark:text-gray-200"> 
        {Object.entries(data).map(([key, value]) => {
          const newPath = path ? `${path}.${key}` : key;
          const isObjectOrArray = value !== null && typeof value === 'object';
          
          return (
            <div key={newPath} className="mb-2">
              {/* Each field row now takes full width */}
              <div className="flex items-center w-full space-x-2">
                <span className="font-bold whitespace-nowrap">{key}:</span>
                {isObjectOrArray ? (
                  // If it's an object or array, we don't show an input here, 
                  // but we might want to ensure the key label doesn't get squished
                  // For now, it will take minimal space.
                  <span className="flex-1 min-w-0"></span> // Placeholder to push buttons to the right
                ) : (
                  <input
                    type="text"
                    value={String(value)}
                    onChange={(e) => onEdit(newPath, e.target.value)}
                    // flex-1 allows input to grow, min-w-0 helps with flexbox overflow issues
                    className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 min-w-0" 
                  />
                )}
                <button 
                  onClick={() => onRemove(path, key)}
                  className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-100 dark:hover:bg-red-900"
                  title="Remove field"
                >
                  <Trash2 size={14} />
                </button>
                <button
                  className="text-gray-500 hover:text-gray-700 p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 cursor-move"
                  title="Drag to reorder (Feature not fully implemented in this view)"
                  draggable
                  onDragStart={(e) => {
                    // Basic drag data, actual reordering logic would be more complex
                    e.dataTransfer.setData('application/json-field', JSON.stringify({
                      path,
                      key,
                      value: JSON.stringify(value) // Ensure value is stringified for transfer
                    }));
                    e.dataTransfer.effectAllowed = 'move';
                  }}
                >
                  <Move size={14} />
                </button>
              </div>
              {isObjectOrArray && (
                // Recursive call for nested objects/arrays
                // Added ml-4 here for visual indentation of nested structures
                <div
                  className="pl-4 border-l-2 border-gray-300 dark:border-gray-600 ml-2 mt-1" // Indent nested views
                  // Drag and drop handlers (simplified, full implementation is complex)
                  onDragOver={(e) => {
                    if (isObject) { // Allow dropping into objects
                      e.preventDefault();
                      e.stopPropagation();
                      e.dataTransfer.dropEffect = 'move';
                    }
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    try {
                      const fieldData = JSON.parse(e.dataTransfer.getData('application/json-field'));
                      // Prevent dropping item into itself or its own children
                      if (newPath.startsWith(fieldData.path) && fieldData.path !== "") return;
                      
                      onRemove(fieldData.path, fieldData.key); // Remove from old position
                      onAdd(newPath, fieldData.key, JSON.parse(fieldData.value)); // Add to new position
                    } catch (error) {
                      console.error('Error during drag and drop:', error);
                    }
                  }}
                >
                  <JsonTreeView 
                    data={value} 
                    path={newPath} 
                    onAdd={onAdd} 
                    onRemove={onRemove}
                    onEdit={onEdit}
                  />
                </div>
              )}
            </div>
          );
        })}
        {/* "Add field" button container */}
        <div 
          className="mt-3 p-2 border border-dashed border-gray-300 rounded hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700"
           onDragOver={(e) => { // Allow dropping at the end of an object
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
          }}
          onDrop={(e) => {
            e.preventDefault();
            try {
              const fieldData = JSON.parse(e.dataTransfer.getData('application/json-field'));
               // Prevent dropping item into itself or its own children if path is root
              if (path === fieldData.path) return;

              onRemove(fieldData.path, fieldData.key);
              onAdd(path, fieldData.key, JSON.parse(fieldData.value));
            } catch (error) {
              console.error('Error during drag and drop:', error);
            }
          }}
        >
          <button 
            onClick={() => {
              const key = prompt("Enter new field name:");
              if (key && key.trim() !== "") onAdd(path, key.trim(), ""); // Add with empty string as default value
              else if (key !== null) alert("Field name cannot be empty.");
            }}
            className="flex items-center text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300 text-sm w-full justify-center py-1"
          >
            <PlusCircle size={14} className="mr-1.5" /> Add field
          </button>
        </div>
      </div>
    );
  } else if (isArray) {
    // Display for arrays (simplified, as per original structure)
    return (
      <div className="ml-4 pl-2 border-l-2 border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 py-1">
        <div className="italic text-gray-500 dark:text-gray-400 mb-1 text-sm">[Array: {data.length} items]</div>
        {/* You might want to add an "Add item to array" button here if editable */}
        <div className="text-xs text-gray-400 dark:text-gray-500">
          {data.length === 0 ? "Array is empty." : "Array items will be populated on export or can be edited if structure allows."}
        </div>
        {data.length > 0 && (
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-mono bg-gray-50 dark:bg-gray-700 p-1 rounded max-h-20 overflow-y-auto">
            <div>[</div>
            {data.slice(0, 5).map((item, index) => ( // Show up to 5 items
              <div key={index} className="ml-2 truncate">
                {typeof item === 'object' 
                  ? JSON.stringify(item).substring(0, 40) + (JSON.stringify(item).length > 40 ? '...' : '')
                  : String(item).substring(0,40) + (String(item).length > 40 ? '...' : '')}
                {index < Math.min(data.length, 5) - 1 ? ',' : ''}
              </div>
            ))}
            {data.length > 5 && <div className="ml-2">... ({data.length - 5} more items)</div>}
            <div>]</div>
          </div>
        )}
      </div>
    );
  }
  
  // Fallback for primitive values if rendered directly (though usually part of an object)
  return <div className="px-2 py-1 text-sm">{String(data)}</div>;
};

export default JsonTreeView;
