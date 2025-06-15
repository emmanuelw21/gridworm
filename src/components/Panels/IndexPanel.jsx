// IndexPanel.jsx
import React from 'react';
import { FolderOpen, Download, Save, Edit, X as CloseIcon } from 'lucide-react';

const IndexPanel = ({
  showIndexPanel,
  indexPanelWidth,
  indexData,
  editingIndex,
  editedIndexJson,
  onShowIndexPanelChange,
  onBeginResizing,
  onLoadIndexFile,
  onSaveIndex,
  onApplyIndexChanges,
  onStartEditingIndex,
  onEditedIndexJsonChange
}) => {
  if (!showIndexPanel) return null;

  return (
    <div
      className="relative bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 flex flex-col shadow-lg"
      style={{ width: `${indexPanelWidth}px` }}
    >
      {/* Index Panel Header */}
      <div className="flex justify-between items-center p-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 flex-shrink-0">
        <h2 className="font-semibold text-lg">Book Index</h2>
        <div className="flex items-center space-x-1">
          <button
            onClick={onLoadIndexFile}
            title="Load Index File (.json)"
            className="p-1.5 rounded text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
          >
            <FolderOpen size={18} />
          </button>
          <button
            onClick={onSaveIndex}
            title="Save Index to File (.json)"
            className="p-1.5 rounded text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
          >
            <Download size={18} />
          </button>
          {editingIndex ? (
            <button
              onClick={onApplyIndexChanges}
              title="Apply JSON Changes"
              className="p-1.5 rounded bg-green-500 text-white hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700"
            >
              <Save size={18} />
            </button>
          ) : (
            <button
              onClick={onStartEditingIndex}
              title="Edit Raw JSON"
              className="p-1.5 rounded text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              <Edit size={18} />
            </button>
          )}
          <button
            onClick={() => onShowIndexPanelChange(false)}
            title="Close Index Panel"
            className="p-1.5 rounded text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
          >
            <CloseIcon size={18} />
          </button>
        </div>
      </div>

      {/* Index Content */}
      <div className="flex-grow overflow-y-auto bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
        {editingIndex ? (
          <div className="p-2 h-full">
            <textarea
              value={editedIndexJson}
              onChange={(e) => onEditedIndexJsonChange(e.target.value)}
              className="w-full h-full font-mono text-sm p-3 border border-gray-300 rounded bg-gray-50 dark:bg-gray-900 dark:text-gray-300 dark:border-gray-700 focus:ring-blue-500 focus:border-blue-500 resize-none"
              spellCheck="false"
              placeholder="Enter or paste JSON here..."
            />
          </div>
        ) : (
          <div className="p-4">
            {indexData && indexData.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-8 text-gray-500 dark:text-gray-400">
                <p className="mb-2">No volumes in index.</p>
                <button
                  onClick={onStartEditingIndex}
                  className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 underline"
                >
                  Edit Index to Add Volume
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {indexData && indexData.map((item, idx) => (
                  <div key={item.id || idx} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 hover:shadow-lg dark:hover:border-gray-600 transition-shadow bg-white dark:bg-gray-850"> {/* Slightly lighter item cards */}
                    <div className="font-semibold text-md text-gray-800 dark:text-gray-100">{item.title || 'Untitled Volume'}</div>
                    {item.slot && <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Slot: {item.slot}</div>}
                    {item.description && <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">{item.description}</p>}
                    {(item.frontCover || item.backCover) && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs mb-1">
                        {item.frontCover && <div><span className="font-medium text-gray-700 dark:text-gray-300">Front:</span> <span className="text-gray-600 dark:text-gray-400">{item.frontCover}</span></div>}
                        {item.backCover && <div><span className="font-medium text-gray-700 dark:text-gray-300">Back:</span> <span className="text-gray-600 dark:text-gray-400">{item.backCover}</span></div>}
                      </div>
                    )}
                    {item.jsonPath && <div className="text-xs text-blue-600 dark:text-blue-400 truncate" title={item.jsonPath}>Path: {item.jsonPath}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Resize Handle */}
      <div
        className="absolute top-0 left-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-400 dark:hover:bg-blue-600 opacity-30 hover:opacity-100 transition-opacity index-panel-resize-anchor"
        onMouseDown={(e) => { e.preventDefault(); onBeginResizing(); }}
        title="Resize Index Panel"
      ></div>
    </div>
  );
};

export default IndexPanel;