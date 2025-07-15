import React, { useState, useRef, useEffect } from 'react';
import {
  MousePointer, MousePointer2, Pen, Plus, Minus, GitBranch,
  Square, Circle, Hexagon, Type, Pipette, PaintBucket,
  Brush, Edit3, Pencil, Eraser, ChevronRight, ChevronLeft, GripVertical, Wrench
} from 'lucide-react';

const CollapsibleVectorToolbar = ({ activeTool, onToolChange, darkMode, containerBounds, onDockToToolbar, toolbarHeight = 120 }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const bounds = containerBounds || { left: 280, top: 56, right: window.innerWidth, bottom: window.innerHeight };
  const [position, setPosition] = useState({ x: bounds.left + 20, y: bounds.top + 44 }); // Start on left side within bounds
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef(null);
  const toolbarRef = useRef(null);
  

  const tools = [
    { id: 'select', icon: MousePointer, shortcut: 'V' },
    { id: 'pencil', icon: Pencil, shortcut: 'B' },
    { id: 'vector-pen', icon: Edit3, shortcut: 'P' },
    { id: 'rectangle', icon: Square, shortcut: 'R' },
    { id: 'ellipse', icon: Circle, shortcut: 'O' },
    { id: 'polygon', icon: Hexagon, shortcut: 'G' },
    { id: 'text', icon: Type, shortcut: 'T' },
    { id: 'eraser', icon: Eraser, shortcut: 'E' },
    { id: 'eyedropper', icon: Pipette, shortcut: 'I' },
    { id: 'paint-bucket', icon: PaintBucket, shortcut: 'K' },
  ];

  // Handle dragging
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
      
      // Keep toolbar within the FreeGrid container bounds
      const bounds = containerBounds || { left: 280, top: 56, right: window.innerWidth, bottom: window.innerHeight };
      const toolbarWidth = toolbarRef.current.offsetWidth;
      const toolbarHeight = toolbarRef.current.offsetHeight;
      
      const minX = bounds.left;
      const maxX = bounds.right - toolbarWidth;
      const minY = bounds.top;
      const maxY = bounds.bottom - toolbarHeight;
      
      // Directly set position - no animation or transition
      const finalX = Math.max(minX, Math.min(newX, maxX));
      const finalY = Math.max(minY, Math.min(newY, maxY));
      
      setPosition({ x: finalX, y: finalY });
      
      // Check if toolbar is near the top for docking (only show when dragging and near top)
      if (onDockToToolbar && newY < toolbarHeight && newY >= 0) {
        // Add visual feedback that docking is available
        const dockIndicator = document.getElementById('dock-indicator');
        if (!dockIndicator) {
          const indicator = document.createElement('div');
          indicator.id = 'dock-indicator';
          indicator.className = 'fixed top-14 left-1/2 transform -translate-x-1/2 bg-blue-500 text-white px-4 py-2 rounded shadow-lg z-[70]';
          indicator.textContent = 'Release to dock toolbar';
          document.body.appendChild(indicator);
        }
      } else {
        // Remove dock indicator if moved away
        const dockIndicator = document.getElementById('dock-indicator');
        if (dockIndicator) {
          dockIndicator.remove();
        }
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.body.style.cursor = 'auto';
      
      // Clean up dock indicator
      const dockIndicator = document.getElementById('dock-indicator');
      if (dockIndicator) {
        dockIndicator.remove();
      }
      
      // Check if we should dock - use the raw Y position from the drag
      if (onDockToToolbar && dragRef.current) {
        const newY = dragRef.current.lastY - dragRef.current.offsetY;
        if (newY < toolbarHeight && newY >= 0) {
          onDockToToolbar();
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
  }, [isDragging, position.y, toolbarHeight, onDockToToolbar, containerBounds]);

  const handleDragStart = (e) => {
    e.preventDefault();
    const rect = toolbarRef.current.getBoundingClientRect();
    dragRef.current = {
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top
    };
    setIsDragging(true);
    // Add cursor style for dragging
    document.body.style.cursor = 'move';
  };

  return (
    <div
      ref={toolbarRef}
      className={`fixed bg-gray-100 dark:bg-gray-800 shadow-lg rounded-lg z-[60] ${
        isCollapsed ? 'w-12' : 'w-auto'
      }`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transition: 'none',
        transform: 'none'
      }}
    >
      {/* Drag handle */}
      <div
        className="flex items-center justify-between p-2 cursor-move border-b border-gray-200 dark:border-gray-700 select-none"
        onMouseDown={handleDragStart}
      >
        <div className="flex items-center gap-2">
          {isCollapsed ? (
            <Wrench size={20} className="text-gray-600 dark:text-gray-400" />
          ) : (
            <>
              <GripVertical size={16} className="text-gray-400" />
              <Wrench size={20} className="text-gray-600 dark:text-gray-400" />
            </>
          )}
        </div>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
          title={isCollapsed ? 'Expand toolbar' : 'Collapse toolbar'}
        >
          {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      {/* Tools */}
      <div className={`p-2 space-y-1 ${isCollapsed ? 'hidden' : 'block'}`}>
        {tools.map(tool => (
          <button
            key={tool.id}
            onClick={() => onToolChange(tool.id)}
            className={`p-2 rounded relative group flex items-center w-full ${
              activeTool === tool.id 
                ? 'bg-blue-500 text-white' 
                : 'hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
            title={`${tool.id} (${tool.shortcut})`}
          >
            <tool.icon size={20} />
            <span className="ml-2 text-xs capitalize">{tool.id.replace('-', ' ')}</span>
            <span className="ml-auto text-[10px] opacity-60">{tool.shortcut}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default CollapsibleVectorToolbar;