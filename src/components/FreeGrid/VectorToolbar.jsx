// components/FreeGrid/VectorToolbar.jsx
import React from 'react';
import {
  MousePointer, MousePointer2, Pen, Plus, Minus, GitBranch,
  Square, Circle, Hexagon, Type, Pipette, PaintBucket,
  Brush, Edit3
} from 'lucide-react';

const VectorToolbar = ({ activeTool, onToolChange }) => {
  const tools = [
    { id: 'select', icon: MousePointer, shortcut: 'V' },
    { id: 'direct-select', icon: MousePointer2, shortcut: 'A' },
    // { id: 'pen', icon: Edit3, shortcut: 'P' },
    { id: 'rectangle', icon: Square, shortcut: 'R' },
    { id: 'ellipse', icon: Circle, shortcut: 'E' },
    { id: 'polygon', icon: Hexagon, shortcut: 'P' },
    { id: 'text', icon: Type, shortcut: 'T' },
    { id: 'eyedropper', icon: Pipette, shortcut: 'I' },
    { id: 'paint-bucket', icon: PaintBucket, shortcut: 'K' },
  ];

  return (
    <div className="flex flex-col bg-gray-100 dark:bg-gray-800 p-2 space-y-1 shadow-lg rounded-r dark:text-gray-300">
      {tools.map(tool => (
        <button
          key={tool.id}
          onClick={() => onToolChange(tool.id)}
          className={`p-2 rounded relative group ${
            activeTool === tool.id 
              ? 'bg-blue-500 text-white' 
              : 'hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
          title={`${tool.id} (${tool.shortcut})`}
        >
          <tool.icon size={20} />
          <span className="absolute left-full ml-2 px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none z-50">
            {tool.id} ({tool.shortcut})
          </span>
        </button>
      ))}
    </div>
  );
};

export default VectorToolbar;