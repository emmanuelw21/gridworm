import React from 'react';
import { Pencil, Type, Eraser, RotateCw } from 'lucide-react';

export const PencilTool = ({ isActive, onToggle }) => (
  <button
    onClick={onToggle}
    title={isActive ? "Switch to Select Tool" : "Switch to Pen Tool"}
    className={`p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 ${isActive ? 'text-blue-500 dark:text-blue-400' : 'text-gray-600 dark:text-gray-300'}`}
  >
    <Pencil size={18} />
  </button>
);

export const TextTool = ({ isActive, onToggle }) => (
  <button
    onClick={onToggle}
    title={isActive ? "Switch to Select Tool" : "Switch to Text Tool"}
    className={`p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 ${isActive ? 'text-blue-500 dark:text-blue-400' : 'text-gray-600 dark:text-gray-300'}`}
  >
    <Type size={18} />
  </button>
);

export const EraserTool = ({ mode, onToggle }) => (
  <button
    onClick={onToggle}
    title={
      mode === 0 ? "Eraser: OFF - Click to Enable Pixel Eraser" : 
      mode === 1 ? "Eraser: PIXEL - Click & Drag to Erase (Click again for Clear All)" : 
      "Eraser: CLEAR ALL - Double-click to Clear All Annotations"
    }
    className={`p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 ${
      mode === 0 ? 'text-gray-600 dark:text-gray-300' : 
      mode === 1 ? 'text-blue-500 dark:text-blue-400' : 
      'text-red-500 dark:text-red-400'
    }`}
  >
    <Eraser size={18} />
  </button>
);

export const RotateTool = ({ onClick, disabled }) => (
  <button
    onClick={onClick}
    title="Rotate selected items 90°"
    className={`p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 ${
      disabled ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed' : 'text-gray-600 dark:text-gray-300'
    }`}
    disabled={disabled}
  >
    <RotateCw size={18} />
  </button>
);

export const ColorPicker = ({ color, onChange }) => (
  <div className="relative w-6 h-6 flex items-center justify-center">
    <div
      className="w-4 h-4 rounded border border-gray-300 dark:border-gray-600 cursor-pointer"
      style={{ backgroundColor: color }}
      title="Select color"
    ></div>
    <input
      type="color"
      value={color}
      onChange={(e) => onChange(e.target.value)}
      className="absolute opacity-0 inset-0 cursor-pointer w-full h-full"
      aria-label="Color picker"
    />
  </div>
);

export default {
  PencilTool,
  TextTool,
  EraserTool, 
  RotateTool,
  ColorPicker
};