import React from 'react';
import {
  Grid,
  List,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  Pin,
  PinOff,
  Magnet,
  Ruler,
  Eraser,
  ZoomIn,
  ZoomOut
} from 'lucide-react';

/**
 * ThumbnailSizeToggle
 * Props:
 * - currentSize: 's' | 'm' | 'l'
 * - onChange: (size: string) => void
 */
export function ThumbnailSizeToggle({ currentSize, onChange }) {
  const sizes = [
    { label: 's', icon: Grid },
    { label: 'm', icon: List },
    { label: 'l', icon: Maximize2 }
  ];

  return (
    <div className="thumbnail-size-toggle flex space-x-2">
      {sizes.map(({ label, icon: Icon }) => (
        <button
          key={label}
          aria-label={`Thumbnail size ${label}`}
          onClick={() => onChange(label)}
          className={`p-2 rounded-md focus:outline-none focus:ring ${currentSize === label ? 'bg-gray-200 dark:bg-gray-700' : ''}`}
        >
          <Icon size={16} />
        </button>
      ))}
    </div>
  );
}

/**
 * PanelCollapseToggle
 * Props:
 * - isCollapsed: boolean
 * - onToggle: () => void
 * - isPinned: boolean
 * - onPinToggle: () => void
 */
export function PanelCollapseToggle({ isCollapsed, onToggle, isPinned, onPinToggle }) {
  return (
    <div className="panel-collapse-toggle flex flex-col items-center space-y-2">
      <button
        aria-label={isCollapsed ? 'Expand panel' : 'Collapse panel'}
        onClick={onToggle}
        className="p-2 rounded-md focus:outline-none focus:ring hover:bg-gray-200 dark:hover:bg-gray-700"
      >
        {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>
      <button
        aria-label={isPinned ? 'Unpin panel' : 'Pin panel'}
        onClick={onPinToggle}
        className={`p-2 rounded-md focus:outline-none focus:ring hover:bg-gray-200 dark:hover:bg-gray-700 ${isPinned ? 'text-blue-500' : ''}`}
      >
        {isPinned ? <Pin size={16} /> : <PinOff size={16} />}
      </button>
    </div>
  );
}

/**
 * MagnetToggle
 * Props:
 * - enabled: boolean
 * - onToggle: () => void
 */
export function MagnetToggle({ enabled, onToggle }) {
  return (
    <button
      aria-label={enabled ? 'Disable snapping' : 'Enable snapping'}
      onClick={onToggle}
      className={`p-2 rounded-md focus:outline-none focus:ring hover:bg-gray-200 dark:hover:bg-gray-700 ${enabled ? 'text-blue-600' : ''}`}
    >
      <Magnet size={16} className={enabled ? 'text-blue-600 dark:text-blue-400' : ''} />
    </button>
  );
}

/**
 * RulerToggle
 * Props:
 * - showing: boolean
 * - onToggle: () => void
 */
export function RulerToggle({ showing, onToggle }) {
  return (
    <button
      aria-label={showing ? 'Hide ruler' : 'Show ruler'}
      onClick={onToggle}
      className={`p-2 rounded-md focus:outline-none focus:ring hover:bg-gray-200 dark:hover:bg-gray-700 ${showing ? 'text-blue-600' : ''}`}
    >
      <Ruler size={16} className={showing ? 'text-blue-600 dark:text-blue-400' : ''} />
    </button>
  );
}

/**
 * EraserToggle
 * Props:
 * - mode: 0 | 1 | 2 - 0 is off, 1 is pixel eraser, 2 is clear all
 * - onToggle: () => void
 */
export function EraserToggle({ mode, onToggle }) {
  return (
    <button
      aria-label={
        mode === 0 ? 'Eraser: OFF' : 
        mode === 1 ? 'Eraser: Pixel Mode' : 
        'Eraser: Clear All Mode'
      }
      onClick={onToggle}
      className={`p-2 rounded-md focus:outline-none focus:ring hover:bg-gray-200 dark:hover:bg-gray-700 ${
        mode === 0 ? '' : mode === 1 ? 'text-blue-600' : 'text-red-600'
      }`}
    >
      <Eraser size={16} className={
        mode === 0 ? '' : 
        mode === 1 ? 'text-blue-600 dark:text-blue-400' : 
        'text-red-600 dark:text-red-400'
      } />
    </button>
  );
}

/**
 * ZoomControl
 * Props:
 * - zoomLevel: number
 * - onZoomIn: () => void
 * - onZoomOut: () => void
 * - onReset: () => void
 */
export function ZoomControl({ zoomLevel, onZoomIn, onZoomOut, onReset }) {
  return (
    <div className="zoom-control fixed right-4 bottom-4 flex flex-col space-y-2 bg-white dark:bg-gray-800 p-2 rounded shadow-lg z-30 opacity-70 hover:opacity-100 transition-opacity">
      <button
        aria-label="Zoom in"
        onClick={onZoomIn}
        className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring"
      >
        <ZoomIn size={16} />
      </button>
      <span className="text-xs text-gray-600 dark:text-gray-300 text-center">{Math.round(zoomLevel * 100)}%</span>
      <button
        aria-label="Zoom out"
        onClick={onZoomOut}
        className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring"
      >
        <ZoomOut size={16} />
      </button>
      <button
        aria-label="Reset zoom"
        onClick={onReset}
        className="text-xs p-1 mt-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring border-t border-gray-200 dark:border-gray-700 pt-2"
      >
        Reset
      </button>
    </div>
  );
}