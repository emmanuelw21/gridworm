// components/ThreeDViewport/TransformPanel.jsx
import React, { useState, useRef, useEffect } from 'react';
import { Move, RotateCw, Maximize2, X, Lock, Unlock, Pin, PinOff } from 'lucide-react';

const TransformPanel = ({ 
  selectedObjects, 
  transformValues, 
  axisLocks,
  onTransformChange,
  onAxisLockChange,
  position = { right: 20, top: 80 },
  darkMode
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [panelPosition, setPanelPosition] = useState(position);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const panelRef = useRef(null);
  
  // Smoothly expand/collapse when selection changes
  useEffect(() => {
    if (selectedObjects.length === 1) {
      setIsExpanded(true);
    } else if (selectedObjects.length === 0) {
      setIsExpanded(false);
    }
  }, [selectedObjects.length]);
  
  const handleMouseDown = (e) => {
    if (!isPinned || e.target.closest('.transform-control')) return;
    
    setIsDragging(true);
    setDragStart({
      x: e.clientX - panelPosition.left || e.clientX - (window.innerWidth - panelPosition.right),
      y: e.clientY - panelPosition.top
    });
  };
  
  const handleMouseMove = (e) => {
    if (!isDragging) return;
    
    const newPosition = {
      left: e.clientX - dragStart.x,
      top: e.clientY - dragStart.y
    };
    
    setPanelPosition(newPosition);
  };
  
  const handleMouseUp = () => {
    setIsDragging(false);
  };
  
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragStart]);
  
  if (selectedObjects.length !== 1) return null;
  
  const styles = isPinned 
    ? { 
        position: 'fixed',
        left: `${panelPosition.left}px`,
        top: `${panelPosition.top}px`,
        zIndex: 1000
      }
    : {
        position: 'absolute',
        right: `${panelPosition.right}px`,
        top: `${panelPosition.top}px`
      };
  
  return (
    <div
      ref={panelRef}
      className={`
        bg-white dark:bg-gray-800 rounded-lg shadow-lg
        transition-all duration-300 ease-in-out
        ${isExpanded ? 'w-80' : 'w-12'}
        ${isDragging ? 'cursor-move' : ''}
      `}
      style={styles}
      onMouseDown={handleMouseDown}
    >
      {/* Collapsed state - just icons */}
      {!isExpanded && (
        <div className="p-2 space-y-2">
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
        <div className="p-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-sm text-gray-700 dark:text-gray-300">
              Transform Properties
            </h3>
            <div className="flex items-center space-x-1">
              <button
                onClick={() => setIsPinned(!isPinned)}
                className={`p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 ${
                  isPinned ? 'text-blue-500' : 'text-gray-500'
                }`}
                title={isPinned ? 'Unpin panel' : 'Pin panel'}
              >
                {isPinned ? <Pin size={14} /> : <PinOff size={14} />}
              </button>
              <button
                onClick={() => setIsExpanded(false)}
                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
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