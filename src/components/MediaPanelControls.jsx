import React from 'react';
import {
  Grid,
  List,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  Pin,
  PinOff
} from 'lucide-react';

// ThumbnailSizeToggle Component
export const ThumbnailSizeToggle = ({ currentSize, onChange }) => {
  const sizes = [
    { label: 's', icon: Grid, title: 'Small Thumbnails' },
    { label: 'm', icon: List, title: 'Medium Thumbnails' },
    { label: 'l', icon: Maximize2, title: 'Large Thumbnails' }
  ];

  return (
    <div className="flex space-x-1">
      {sizes.map(({ label, icon: Icon, title }) => (
        <button
          key={label}
          onClick={() => onChange(label)}
          title={title}
          className={`p-1.5 rounded ${currentSize === label ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`}
        >
          <Icon size={16} />
        </button>
      ))}
    </div>
  );
};


// PinButton Component
export const PinButton = ({ isPinned, onToggle }) => (
  <button
    onClick={onToggle}
    title={isPinned ? "Unpin panel" : "Pin panel"}
    className={`p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 ${isPinned ? 'text-blue-500 dark:text-blue-400' : ''}`}
  >
    {isPinned ? <Pin size={16} /> : <PinOff size={16} />}
  </button>
);