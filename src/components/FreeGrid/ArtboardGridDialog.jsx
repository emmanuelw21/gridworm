import React, { useState } from 'react';
import { X, Grid, LayoutGrid } from 'lucide-react';

const ArtboardGridDialog = ({ isOpen, onClose, onConfirm, darkMode = false }) => {
  const [rows, setRows] = useState(2);
  const [cols, setCols] = useState(2);
  const [width, setWidth] = useState(800);
  const [height, setHeight] = useState(600);
  const [widthError, setWidthError] = useState('');
  const [heightError, setHeightError] = useState('');
  const [showPreview, setShowPreview] = useState(true);

  if (!isOpen) return null;

  const handleConfirm = () => {
    let hasError = false;
    
    // Validate width
    if (!width || width < 50) {
      setWidthError('Width must be at least 50px');
      hasError = true;
    } else if (width > 5000) {
      setWidthError('Width cannot exceed 5000px');
      hasError = true;
    } else {
      setWidthError('');
    }
    
    // Validate height
    if (!height || height < 50) {
      setHeightError('Height must be at least 50px');
      hasError = true;
    } else if (height > 5000) {
      setHeightError('Height cannot exceed 5000px');
      hasError = true;
    } else {
      setHeightError('');
    }
    
    if (!hasError && rows > 0 && cols > 0) {
      onConfirm(rows, cols, width, height);
      onClose();
    }
  };

  const totalArtboards = rows * cols;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />
      
      {/* Dialog */}
      <div className={`relative ${darkMode ? 'bg-gray-800 text-white' : 'bg-white'} rounded-lg shadow-xl p-6 max-w-md w-full mx-4`}>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold flex items-center">
            <LayoutGrid size={24} className="mr-2" />
            Create Artboard Grid
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
          >
            <X size={20} />
          </button>
        </div>

        {/* Grid Controls */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Rows
              </label>
              <input
                type="number"
                value={rows}
                onChange={(e) => setRows(Math.max(1, Math.min(10, parseInt(e.target.value) || 1)))}
                min="1"
                max="10"
                className={`w-full px-3 py-2 border rounded ${
                  darkMode 
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : 'bg-white border-gray-300'
                }`}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">
                Columns
              </label>
              <input
                type="number"
                value={cols}
                onChange={(e) => setCols(Math.max(1, Math.min(10, parseInt(e.target.value) || 1)))}
                min="1"
                max="10"
                className={`w-full px-3 py-2 border rounded ${
                  darkMode 
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : 'bg-white border-gray-300'
                }`}
              />
            </div>
          </div>

          {/* Preview */}
          {showPreview && (
            <div className="mt-4">
              <label className="block text-sm font-medium mb-2">
                Preview ({totalArtboards} artboards)
              </label>
              <div className={`p-4 border rounded ${
                darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
              }`}>
                <div 
                  className="grid gap-1 mx-auto"
                  style={{
                    gridTemplateColumns: `repeat(${cols}, 1fr)`,
                    gridTemplateRows: `repeat(${rows}, 1fr)`,
                    width: 'fit-content',
                    maxWidth: '100%'
                  }}
                >
                  {Array.from({ length: totalArtboards }, (_, i) => (
                    <div
                      key={i}
                      className={`border-2 ${
                        darkMode ? 'border-gray-500 bg-gray-600' : 'border-gray-300 bg-white'
                      }`}
                      style={{
                        width: `${Math.min(60, 240 / Math.max(rows, cols))}px`,
                        height: `${Math.min(80, 320 / Math.max(rows, cols))}px`
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Artboard Size */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Width (px)
              </label>
              <input
                type="number"
                value={width}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '') {
                    setWidth('');
                  } else {
                    const num = parseInt(val);
                    if (!isNaN(num)) {
                      setWidth(num);
                    }
                  }
                  setWidthError(''); // Clear error on change
                }}
                className={`w-full px-3 py-2 border rounded ${
                  widthError 
                    ? 'border-red-500' 
                    : darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'bg-white border-gray-300'
                }`}
              />
              {widthError && (
                <p className="text-red-500 text-xs mt-1">{widthError}</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">
                Height (px)
              </label>
              <input
                type="number"
                value={height}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '') {
                    setHeight('');
                  } else {
                    const num = parseInt(val);
                    if (!isNaN(num)) {
                      setHeight(num);
                    }
                  }
                  setHeightError(''); // Clear error on change
                }}
                className={`w-full px-3 py-2 border rounded ${
                  heightError 
                    ? 'border-red-500' 
                    : darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'bg-white border-gray-300'
                }`}
              />
              {heightError && (
                <p className="text-red-500 text-xs mt-1">{heightError}</p>
              )}
            </div>
          </div>

          {/* Size Presets */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Size Presets
            </label>
            <select
              onChange={(e) => {
                const preset = e.target.value.split('x');
                if (preset.length === 2) {
                  setWidth(parseInt(preset[0]));
                  setHeight(parseInt(preset[1]));
                }
              }}
              className={`w-full px-3 py-2 border rounded ${
                darkMode 
                  ? 'bg-gray-700 border-gray-600 text-white' 
                  : 'bg-white border-gray-300'
              }`}
            >
              <option value="">Custom Size</option>
              <option value="800x600">800×600 (Standard)</option>
              <option value="1080x1080">1080×1080 (Instagram Post)</option>
              <option value="1080x1920">1080×1920 (Instagram Story)</option>
              <option value="1200x675">1200×675 (Twitter Post)</option>
              <option value="1920x1080">1920×1080 (HD)</option>
              <option value="3840x2160">3840×2160 (4K)</option>
            </select>
          </div>

          {/* Quick Presets */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Grid Presets
            </label>
            <div className="flex flex-wrap gap-2">
              {[
                { label: '1×1', rows: 1, cols: 1 },
                { label: '2×2', rows: 2, cols: 2 },
                { label: '3×3', rows: 3, cols: 3 },
                { label: '2×3', rows: 2, cols: 3 },
                { label: '3×2', rows: 3, cols: 2 },
                { label: '4×4', rows: 4, cols: 4 },
              ].map(preset => (
                <button
                  key={preset.label}
                  onClick={() => {
                    setRows(preset.rows);
                    setCols(preset.cols);
                  }}
                  className={`px-3 py-1 text-sm border rounded hover:bg-gray-100 dark:hover:bg-gray-700 ${
                    rows === preset.rows && cols === preset.cols
                      ? 'bg-blue-100 border-blue-500 dark:bg-blue-900 dark:border-blue-400'
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-2 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded"
          >
            Create Grid
          </button>
        </div>
      </div>
    </div>
  );
};

export default ArtboardGridDialog;