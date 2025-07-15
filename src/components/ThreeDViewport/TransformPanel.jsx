// components/ThreeDViewport/TransformPanel.jsx
import React, { useState, useRef, useEffect } from 'react';
import { Move, RotateCw, Maximize2, X, Lock, Unlock, GripVertical } from 'lucide-react';

const TransformPanel = ({ 
  selectedObjects, 
  transformValues, 
  axisLocks,
  onTransformChange,
  onAxisLockChange,
  darkMode,
  containerBounds,
  onDockToTop
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 16, y: 16 }); // Default to upper left of viewport
  const dragRef = useRef(null);
  const panelRef = useRef(null);
  
  // Initialize position on mount
  useEffect(() => {
    // Position at upper left of viewport container
    setPosition({ x: 16, y: 16 });
  }, []);
  
  // Auto-expand when object is selected
  useEffect(() => {
    if (selectedObjects.length === 1) {
      setIsExpanded(true);
    }
  }, [selectedObjects.length]);
  
  const handleDragStart = (e) => {
    e.preventDefault();
    const rect = panelRef.current.getBoundingClientRect();
    dragRef.current = {
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
      lastY: e.clientY
    };
    setIsDragging(true);
    document.body.style.cursor = 'move';
  };
  
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging) return;
      
      e.preventDefault();
      
      // Store last mouse position for docking check
      if (dragRef.current) {
        dragRef.current.lastY = e.clientY;
      }
      
      // Direct position update - no smoothing or dampening
      const newX = e.clientX - dragRef.current.offsetX;
      const newY = e.clientY - dragRef.current.offsetY;
      
      // Keep panel within bounds
      const bounds = containerBounds || { left: 0, top: 0, right: window.innerWidth, bottom: window.innerHeight };
      const panelWidth = panelRef.current?.offsetWidth || 320;
      const panelHeight = panelRef.current?.offsetHeight || 200;
      
      const minX = bounds.left;
      const maxX = bounds.right - panelWidth;
      const minY = bounds.top;
      const maxY = bounds.bottom - panelHeight;
      
      const finalX = Math.max(minX, Math.min(newX, maxX));
      const finalY = Math.max(minY, Math.min(newY, maxY));
      
      setPosition({ x: finalX, y: finalY });
      
      // Check if panel is near the top for docking
      if (onDockToTop && newY < 100 && newY >= 0) {
        // Add visual feedback that docking is available
        const dockIndicator = document.getElementById('transform-dock-indicator');
        if (!dockIndicator) {
          const indicator = document.createElement('div');
          indicator.id = 'transform-dock-indicator';
          indicator.className = 'fixed top-14 left-1/2 transform -translate-x-1/2 bg-blue-500 text-white px-4 py-2 rounded shadow-lg z-[70]';
          indicator.textContent = 'Release to dock panel';
          document.body.appendChild(indicator);
        }
      } else {
        // Remove dock indicator if moved away
        const dockIndicator = document.getElementById('transform-dock-indicator');
        if (dockIndicator) {
          dockIndicator.remove();
        }
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.body.style.cursor = 'auto';
      
      // Clean up dock indicator
      const dockIndicator = document.getElementById('transform-dock-indicator');
      if (dockIndicator) {
        dockIndicator.remove();
      }
      
      // Check if we should dock
      if (onDockToTop && dragRef.current) {
        const newY = dragRef.current.lastY - dragRef.current.offsetY;
        if (newY < 100 && newY >= 0) {
          onDockToTop();
        }
      }
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, containerBounds, onDockToTop]);
  
  if (selectedObjects.length !== 1) return null;
  
  return (
    <div
      ref={panelRef}
      className={`
        bg-white dark:bg-gray-800 rounded-lg shadow-lg
        ${isExpanded ? 'w-80' : 'w-12'}
        ${isDragging ? 'cursor-move' : ''}
      `}
      style={{
        position: 'absolute',
        left: `${position.x}px`,
        top: `${position.y}px`,
        zIndex: 40,
        userSelect: 'none'
      }}
    >
      {/* Drag handle */}
      <div 
        className="absolute top-0 left-0 right-0 h-8 cursor-move flex items-center justify-center"
        onMouseDown={handleDragStart}
      >
        <GripVertical size={16} className="text-gray-400" />
      </div>
      
      {/* Collapsed state - just icons */}
      {!isExpanded && (
        <div className="pt-8 p-2 space-y-2">
          <button
            onClick={() => setIsExpanded(true)}
            className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
            title="Expand transform panel"
          >
            <Move size={16} className="text-gray-600 dark:text-gray-400" />
          </button>
        </div>
      )}
      
      {/* Expanded state */}
      {isExpanded && (
        <div className="pt-8 p-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-sm text-gray-700 dark:text-gray-300">
              Transform Properties
            </h3>
            <div className="flex items-center space-x-1">
              <button
                onClick={() => setIsExpanded(false)}
                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500"
                title="Collapse panel"
              >
                <X size={14} />
              </button>
            </div>
          </div>
          
          {/* Transform controls */}
          <div className="space-y-4">
            {/* Position */}
            <div>
              <h4 className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2 flex items-center">
                <Move size={12} className="mr-1" /> Position
              </h4>
              {['x', 'y', 'z'].map(axis => (
                <div key={axis} className="flex items-center space-x-2 mb-1 transform-control">
                  <button
                    onClick={() => onAxisLockChange('position', axis, !axisLocks.position[axis])}
                    className={`p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 ${
                      axisLocks.position[axis] ? 'text-orange-500' : 'text-gray-400'
                    }`}
                    title={`${axisLocks.position[axis] ? 'Unlock' : 'Lock'} ${axis.toUpperCase()} axis`}
                  >
                    {axisLocks.position[axis] ? <Lock size={12} /> : <Unlock size={12} />}
                  </button>
                  <span className="text-xs w-4 font-medium">{axis.toUpperCase()}:</span>
                  <input
                    type="number"
                    value={transformValues.position[axis]}
                    onChange={(e) => onTransformChange('position', axis, e.target.value)}
                    disabled={axisLocks.position[axis]}
                    className="flex-1 px-2 py-1 text-xs border rounded dark:bg-gray-700 dark:border-gray-600 disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed"
                    step="0.1"
                  />
                </div>
              ))}
            </div>
            
            {/* Rotation */}
            <div>
              <h4 className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2 flex items-center">
                <RotateCw size={12} className="mr-1" /> Rotation
              </h4>
              {['x', 'y', 'z'].map(axis => (
                <div key={axis} className="flex items-center space-x-2 mb-1 transform-control">
                  <button
                    onClick={() => onAxisLockChange('rotation', axis, !axisLocks.rotation[axis])}
                    className={`p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 ${
                      axisLocks.rotation[axis] ? 'text-orange-500' : 'text-gray-400'
                    }`}
                    title={`${axisLocks.rotation[axis] ? 'Unlock' : 'Lock'} ${axis.toUpperCase()} rotation`}
                  >
                    {axisLocks.rotation[axis] ? <Lock size={12} /> : <Unlock size={12} />}
                  </button>
                  <span className="text-xs w-4 font-medium">{axis.toUpperCase()}:</span>
                  <input
                    type="number"
                    value={transformValues.rotation[axis]}
                    onChange={(e) => onTransformChange('rotation', axis, e.target.value)}
                    disabled={axisLocks.rotation[axis]}
                    className="flex-1 px-2 py-1 text-xs border rounded dark:bg-gray-700 dark:border-gray-600 disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed"
                    step="1"
                  />
                  <span className="text-xs text-gray-500">°</span>
                </div>
              ))}
            </div>
            
            {/* Scale */}
            <div>
              <h4 className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2 flex items-center">
                <Maximize2 size={12} className="mr-1" /> Scale
              </h4>
              {['x', 'y', 'z'].map(axis => (
                <div key={axis} className="flex items-center space-x-2 mb-1 transform-control">
                  <button
                    onClick={() => onAxisLockChange('scale', axis, !axisLocks.scale[axis])}
                    className={`p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 ${
                      axisLocks.scale[axis] ? 'text-orange-500' : 'text-gray-400'
                    }`}
                    title={`${axisLocks.scale[axis] ? 'Unlock' : 'Lock'} ${axis.toUpperCase()} scale`}
                  >
                    {axisLocks.scale[axis] ? <Lock size={12} /> : <Unlock size={12} />}
                  </button>
                  <span className="text-xs w-4 font-medium">{axis.toUpperCase()}:</span>
                  <input
                    type="number"
                    value={transformValues.scale[axis]}
                    onChange={(e) => onTransformChange('scale', axis, e.target.value)}
                    disabled={axisLocks.scale[axis]}
                    className="flex-1 px-2 py-1 text-xs border rounded dark:bg-gray-700 dark:border-gray-600 disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed"
                    step="0.1"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransformPanel;