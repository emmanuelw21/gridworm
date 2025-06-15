// components/ThreeDViewport/LookAtTool.jsx
import React, { useState } from 'react';
import { Eye, Target, X } from 'lucide-react';

const LookAtTool = ({ selectedObjects, onApplyLookAt, onClose }) => {
  const [targetPosition, setTargetPosition] = useState({ x: 0, y: 0, z: 0 });
  const [preserveUpDirection, setPreserveUpDirection] = useState(true);
  
  const handleApply = () => {
    onApplyLookAt(targetPosition, preserveUpDirection);
  };
  
  return (
    <div className="absolute top-20 right-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 w-64 z-40">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium flex items-center">
          <Eye size={16} className="mr-2" />
          Look At Tool
        </h3>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <X size={16} />
        </button>
      </div>
      
      <div className="space-y-3">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {selectedObjects.length} objects selected
        </p>
        
        <div>
          <label className="text-xs font-medium">Target Position</label>
          <div className="grid grid-cols-3 gap-2 mt-1">
            <div>
              <label className="text-xs">X</label>
              <input
                type="number"
                value={targetPosition.x}
                onChange={(e) => setTargetPosition(prev => ({ ...prev, x: parseFloat(e.target.value) || 0 }))}
                className="w-full px-2 py-1 text-xs border rounded"
                step="0.1"
              />
            </div>
            <div>
              <label className="text-xs">Y</label>
              <input
                type="number"
                value={targetPosition.y}
                onChange={(e) => setTargetPosition(prev => ({ ...prev, y: parseFloat(e.target.value) || 0 }))}
                className="w-full px-2 py-1 text-xs border rounded"
                step="0.1"
              />
            </div>
            <div>
              <label className="text-xs">Z</label>
              <input
                type="number"
                value={targetPosition.z}
                onChange={(e) => setTargetPosition(prev => ({ ...prev, z: parseFloat(e.target.value) || 0 }))}
                className="w-full px-2 py-1 text-xs border rounded"
                step="0.1"
              />
            </div>
          </div>
        </div>
        
        <div className="flex items-center">
          <input
            type="checkbox"
            checked={preserveUpDirection}
            onChange={(e) => setPreserveUpDirection(e.target.checked)}
            className="mr-2"
          />
          <label className="text-sm">Preserve up direction</label>
        </div>
        
        <div className="flex space-x-2">
          <button
            onClick={() => setTargetPosition({ x: 0, y: 0, z: 0 })}
            className="flex-1 px-2 py-1 text-xs bg-gray-200 hover:bg-gray-300 rounded"
          >
            Center (0,0,0)
          </button>
          <button
            onClick={handleApply}
            className="flex-1 px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Apply Look At
          </button>
        </div>
      </div>
    </div>
  );
};

export default LookAtTool;