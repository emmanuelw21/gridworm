import React from 'react';
import { Lock, Unlock, Download, Image as ImageIcon, Trash2 } from 'lucide-react';

const ArtboardGridControls = ({ 
  groupId, 
  artboards, 
  isGroupLocked,
  onLockToggle, 
  onExportAll, 
  onAddAllToMedia, 
  onDeleteAll,
  darkMode = false 
}) => {
  const gridArtboards = artboards.filter(a => a.groupId === groupId);
  
  if (gridArtboards.length === 0) return null;
  
  const firstArtboard = gridArtboards[0];
  const { rows, cols } = firstArtboard.gridSize || { rows: 1, cols: 1 };

  return (
    <div data-artboard-controls="grid" className="absolute z-50" style={{
      left: `${firstArtboard.x - 60}px`,
      top: `${firstArtboard.y}px`
    }}>
      <div className="flex flex-col space-y-1">
        <div className="mb-2 px-2 py-1 bg-blue-600 text-white text-xs rounded shadow">
          {rows}×{cols} Grid
        </div>
        
        <button
          onClick={() => onLockToggle(groupId)}
          className="p-2 bg-white dark:bg-gray-700 rounded shadow hover:shadow-md transition-shadow dark:text-gray-200"
          title={isGroupLocked ? "Unlock Grid (Move individually)" : "Lock Grid (Move together)"}
        >
          {isGroupLocked ? <Lock size={16} /> : <Unlock size={16} />}
        </button>
        
        <button
          onClick={() => onAddAllToMedia(groupId)}
          className="p-2 bg-white dark:bg-gray-700 rounded shadow hover:shadow-md transition-shadow dark:text-gray-200"
          title="Add all to media panel"
        >
          <ImageIcon size={16} />
        </button>
        
        <button
          onClick={() => onExportAll(groupId)}
          className="p-2 bg-white dark:bg-gray-700 rounded shadow hover:shadow-md transition-shadow dark:text-gray-200"
          title="Export all as PNG"
        >
          <Download size={16} />
        </button>
        
        {/* Spacer */}
        <div className="h-4" />
        
        <button
          onClick={() => onDeleteAll(groupId)}
          className="p-2 bg-white dark:bg-gray-700 rounded shadow hover:shadow-md transition-shadow text-red-600 dark:text-red-400"
          title="Delete grid"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
};

export default ArtboardGridControls;