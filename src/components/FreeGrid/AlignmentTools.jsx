import React from 'react';
import {
  AlignHorizontalJustifyStart,
  AlignHorizontalJustifyCenter,
  AlignHorizontalJustifyEnd,
  AlignVerticalJustifyStart,
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyEnd,
  AlignHorizontalDistributeCenter,
  AlignVerticalDistributeCenter
} from 'lucide-react';

const AlignmentTools = ({ onAlign }) => {
  return (
    <div className="flex items-center space-x-1 border-r pr-2 mr-2">
      <button
        onClick={() => onAlign('left')}
        className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
        title="Align Left"
      >
        <AlignHorizontalJustifyStart size={18} />
      </button>
      <button
        onClick={() => onAlign('center-h')}
        className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
        title="Align Center Horizontal"
      >
        <AlignHorizontalJustifyCenter size={18} />
      </button>
      <button
        onClick={() => onAlign('right')}
        className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
        title="Align Right"
      >
        <AlignHorizontalJustifyEnd size={18} />
      </button>
      <div className="w-px h-4 bg-gray-300 dark:bg-gray-600 mx-1" />
      <button
        onClick={() => onAlign('top')}
        className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
        title="Align Top"
      >
        <AlignVerticalJustifyStart size={18} />
      </button>
      <button
        onClick={() => onAlign('center-v')}
        className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
        title="Align Center Vertical"
      >
        <AlignVerticalJustifyCenter size={18} />
      </button>
      <button
        onClick={() => onAlign('bottom')}
        className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
        title="Align Bottom"
      >
        <AlignVerticalJustifyEnd size={18} />
      </button>
      <div className="w-px h-4 bg-gray-300 dark:bg-gray-600 mx-1" />
      <button
        onClick={() => onAlign('distribute-h')}
        className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
        title="Distribute Horizontally"
      >
        <AlignHorizontalDistributeCenter size={18} />
      </button>
      <button
        onClick={() => onAlign('distribute-v')}
        className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
        title="Distribute Vertically"
      >
        <AlignVerticalDistributeCenter size={18} />
      </button>
    </div>
  );
};

export default AlignmentTools;