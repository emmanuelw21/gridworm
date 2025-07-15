// components/FreeGrid/Artboard.jsx
import React, { useState, useRef, useEffect } from 'react';
import { 
  Square, 
  Maximize2, 
  Download, 
  Image as ImageIcon,
  Copy,
  Trash2,
  Lock,
  Unlock,
  Edit2,
  Check,
  X
} from 'lucide-react';

const PRESET_SIZES = [
  { name: 'Custom', width: 800, height: 600 },
  { name: 'Instagram Post', width: 1080, height: 1080 },
  { name: 'Instagram Story', width: 1080, height: 1920 },
  { name: 'Twitter Post', width: 1200, height: 675 },
  { name: 'A4 Portrait', width: 793, height: 1122 },
  { name: 'A4 Landscape', width: 1122, height: 793 },
  { name: 'Letter Portrait', width: 816, height: 1056 },
  { name: 'Letter Landscape', width: 1056, height: 816 },
  { name: 'HD 1920x1080', width: 1920, height: 1080 },
  { name: '4K', width: 3840, height: 2160 },
];

const Artboard = ({
  id,
  x,
  y,
  width,
  height,
  name,
  backgroundColor = '#FFFFFF',
  isSelected,
  isLocked,
  zoomLevel,
  onSelect,
  onUpdate,
  onDelete,
  onExport,
  onAddToMediaPanel,
  onDragStart,
  onResizeStart,
  darkMode,
  activeTool = 'select',
  priorityMode = false
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(name);
  const artboardRef = useRef(null);

  const handleNameSubmit = () => {
    onUpdate(id, { name: editName });
    setIsEditing(false);
  };

  const handleExportAs = async (format) => {
    await onExport(id, format);
  };

  const handleAddToMedia = async () => {
    await onAddToMediaPanel(id);
  };

  const handleMouseDown = (e) => {
    e.stopPropagation();
    e.preventDefault(); // Prevent canvas from handling this
    
    // Allow artboard interaction in select mode
    if (activeTool !== 'select') return;
    
    // Always select when clicked (pass event for multi-select)
    onSelect(id, e);
    
    // Start dragging if not locked
    if (!isLocked && onDragStart) {
      onDragStart(e, id);
    }
  };

  const handleResizeMouseDown = (e, handle) => {
    e.stopPropagation();
    if (activeTool !== 'select') return;
    if (!isLocked && onResizeStart) {
      onResizeStart(e, id, handle);
    }
  };

  return (
    <div
      ref={artboardRef}
      data-artboard={id}
      className={`absolute ${
        isSelected 
          ? 'ring-2 ring-blue-500 ring-offset-2' 
          : 'hover:ring-1 hover:ring-gray-400'
      } ${isLocked ? 'opacity-50' : ''} transition-all duration-200`}
      style={{
        left: `${x}px`,
        top: `${y}px`,
        width: `${width}px`,
        height: `${height}px`,
        backgroundColor,
        border: priorityMode ? '2px solid #3B82F6' : '2px dashed #999',
        zIndex: priorityMode ? 10000 : 5, // In priority mode, above all items
        pointerEvents: 'auto',
        opacity: priorityMode ? 0.9 : 1,
        boxShadow: priorityMode ? '0 0 20px rgba(59, 130, 246, 0.5)' : 'none'
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Artboard Header */}
      <div className={`absolute -top-8 left-0 flex items-center space-x-2 ${
        isSelected ? 'opacity-100' : 'opacity-0 hover:opacity-100'
      } transition-opacity`} style={{ zIndex: 99999, opacity: 0.95 }}>
        {isEditing ? (
          <div className="flex items-center space-x-1">
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleNameSubmit();
                if (e.key === 'Escape') {
                  setEditName(name);
                  setIsEditing(false);
                }
              }}
              className="px-2 py-1 text-sm border rounded bg-white dark:bg-gray-800 dark:border-gray-600 text-gray-900 dark:text-gray-100"
              autoFocus
            />
            <button
              onClick={handleNameSubmit}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-700 dark:text-gray-300"
            >
              <Check size={14} />
            </button>
            <button
              onClick={() => {
                setEditName(name);
                setIsEditing(false);
              }}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-700 dark:text-gray-300"
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <div 
            className="flex items-center space-x-1 px-2 py-1 bg-white dark:bg-gray-800 rounded shadow-lg cursor-pointer border border-gray-200 dark:border-gray-600 hover:shadow-xl transition-all duration-200"
            onClick={(e) => {
              e.stopPropagation();
              setIsEditing(true);
            }}
          >
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{name}</span>
            <Edit2 size={12} className="text-gray-600 dark:text-gray-400" />
          </div>
        )}
        
        <span className="text-xs text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 px-2 py-1 rounded shadow border border-gray-200 dark:border-gray-600">
          {Math.round(width)} × {Math.round(height)}px
        </span>
      </div>

      {/* Artboard Controls */}
      {isSelected && (
        <div data-artboard-controls={id} className="absolute -right-12 top-0 flex flex-col space-y-1" style={{ zIndex: 99998, opacity: 0.95 }}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onUpdate(id, { isLocked: !isLocked });
            }}
            className="p-2 bg-white dark:bg-gray-800 rounded shadow-lg hover:shadow-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-white"
            title={isLocked ? "Unlock" : "Lock"}
          >
            {isLocked ? <Lock size={16} /> : <Unlock size={16} />}
          </button>
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleAddToMedia();
            }}
            className="p-2 bg-white dark:bg-gray-800 rounded shadow-lg hover:shadow-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-white"
            title="Add to media panel"
          >
            <ImageIcon size={16} />
          </button>
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleExportAs('png');
            }}
            className="p-2 bg-white dark:bg-gray-800 rounded shadow-lg hover:shadow-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-white"
            title="Export as PNG"
          >
            <Download size={16} />
          </button>
          
          {/* Spacer */}
          <div className="h-4" />
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(id);
            }}
            className="p-2 bg-white dark:bg-gray-800 rounded shadow-lg hover:shadow-xl transition-all duration-200 border border-gray-200 dark:border-gray-600 text-red-600 dark:text-red-400"
            title="Delete artboard"
          >
            <Trash2 size={16} />
          </button>
        </div>
      )}


      {/* Resize Handles */}
      {isSelected && !isLocked && (
        <>
          {/* Corner handles */}
          <div 
            className="absolute -top-1 -left-1 w-3 h-3 bg-blue-500 rounded-full cursor-nw-resize hover:bg-blue-600 transition-colors" 
            style={{ zIndex: 99997 }}
            onMouseDown={(e) => handleResizeMouseDown(e, 'nw')}
          />
          <div 
            className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full cursor-ne-resize hover:bg-blue-600 transition-colors" 
            style={{ zIndex: 99997 }}
            onMouseDown={(e) => handleResizeMouseDown(e, 'ne')}
          />
          <div 
            className="absolute -bottom-1 -left-1 w-3 h-3 bg-blue-500 rounded-full cursor-sw-resize hover:bg-blue-600 transition-colors" 
            style={{ zIndex: 99997 }}
            onMouseDown={(e) => handleResizeMouseDown(e, 'sw')}
          />
          <div 
            className="absolute -bottom-1 -right-1 w-3 h-3 bg-blue-500 rounded-full cursor-se-resize hover:bg-blue-600 transition-colors" 
            style={{ zIndex: 99997 }}
            onMouseDown={(e) => handleResizeMouseDown(e, 'se')}
          />
          
          {/* Edge handles */}
          <div 
            className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-blue-500 rounded-full cursor-n-resize hover:bg-blue-600 transition-colors" 
            style={{ zIndex: 99997 }}
            onMouseDown={(e) => handleResizeMouseDown(e, 'n')}
          />
          <div 
            className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-blue-500 rounded-full cursor-s-resize hover:bg-blue-600 transition-colors" 
            style={{ zIndex: 99997 }}
            onMouseDown={(e) => handleResizeMouseDown(e, 's')}
          />
          <div 
            className="absolute top-1/2 -left-1 transform -translate-y-1/2 w-3 h-3 bg-blue-500 rounded-full cursor-w-resize hover:bg-blue-600 transition-colors" 
            style={{ zIndex: 99997 }}
            onMouseDown={(e) => handleResizeMouseDown(e, 'w')}
          />
          <div 
            className="absolute top-1/2 -right-1 transform -translate-y-1/2 w-3 h-3 bg-blue-500 rounded-full cursor-e-resize hover:bg-blue-600 transition-colors" 
            style={{ zIndex: 99997 }}
            onMouseDown={(e) => handleResizeMouseDown(e, 'e')}
          />
        </>
      )}
    </div>
  );
};

export default Artboard;