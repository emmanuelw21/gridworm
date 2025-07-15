import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Pipette, Plus, X, Check } from 'lucide-react';

const EnhancedColorPicker = ({ 
  currentColor, 
  onColorChange, 
  currentFillColor,
  onFillColorChange,
  isEyedropperActive,
  onEyedropperToggle,
  darkMode = false 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [hoveredColor, setHoveredColor] = useState(null);
  const [colorMode, setColorMode] = useState('stroke'); // 'stroke' or 'fill'
  const [recentColors, setRecentColors] = useState(() => {
    const saved = localStorage.getItem('gridworm-recent-colors');
    return saved ? JSON.parse(saved) : ['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF'];
  });
  const [savedPalettes, setSavedPalettes] = useState(() => {
    const saved = localStorage.getItem('gridworm-color-palettes');
    return saved ? JSON.parse(saved) : {
      default: ['#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF'],
      pastel: ['#FFB3BA', '#BAFFC9', '#BAE1FF', '#FFFFBA', '#FFDFBA'],
      vibrant: ['#FF006E', '#FB5607', '#FFBE0B', '#8338EC', '#3A86FF']
    };
  });
  const [activePalette, setActivePalette] = useState('default');
  const pickerRef = useRef(null);

  // Save recent colors whenever they change
  useEffect(() => {
    localStorage.setItem('gridworm-recent-colors', JSON.stringify(recentColors));
  }, [recentColors]);

  // Save palettes whenever they change
  useEffect(() => {
    localStorage.setItem('gridworm-color-palettes', JSON.stringify(savedPalettes));
  }, [savedPalettes]);

  // Add color to recent colors
  const addToRecent = useCallback((color) => {
    setRecentColors(prev => {
      const filtered = prev.filter(c => c !== color);
      return [color, ...filtered].slice(0, 12);
    });
  }, []);

  // Handle color selection
  const handleColorSelect = useCallback((color) => {
    if (colorMode === 'stroke') {
      onColorChange(color);
    } else {
      onFillColorChange(color);
    }
    addToRecent(color);
    setIsOpen(false);
  }, [colorMode, onColorChange, onFillColorChange, addToRecent]);

  // Handle eyedropper result
  const handleEyedropperResult = useCallback((color) => {
    handleColorSelect(color);
    onEyedropperToggle(false);
  }, [handleColorSelect, onEyedropperToggle]);

  // Close picker on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const presetColors = [
    '#000000', '#424242', '#757575', '#9E9E9E', '#BDBDBD', '#E0E0E0', '#EEEEEE', '#FFFFFF',
    '#D32F2F', '#F44336', '#E91E63', '#9C27B0', '#673AB7', '#3F51B5', '#2196F3', '#03A9F4',
    '#00BCD4', '#009688', '#4CAF50', '#8BC34A', '#CDDC39', '#FFEB3B', '#FFC107', '#FF9800',
    '#FF5722', '#795548', '#607D8B', '#F48FB1', '#CE93D8', '#B39DDB', '#9FA8DA', '#90CAF9'
  ];

  return (
    <div className="relative" ref={pickerRef}>
      {/* Color button */}
      <div className="flex items-center space-x-1">
        {/* Stroke color */}
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Stroke button clicked');
            setColorMode('stroke');
            setIsOpen(true);
          }}
          className={`flex items-center space-x-1 px-2 py-1 rounded border cursor-pointer ${
            colorMode === 'stroke' && isOpen
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
              : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
          }`}
          title="Stroke color"
        >
          <div className="relative">
            <div 
              className="w-4 h-4 rounded border-2 border-gray-600 dark:border-gray-400"
              style={{ backgroundColor: currentColor }}
            />
            <div className="absolute -bottom-1 -right-1 text-[8px] font-bold bg-white dark:bg-gray-800 px-0.5 rounded border border-gray-300 dark:border-gray-600">S</div>
          </div>
        </button>
        
        {/* Fill color */}
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Fill button clicked');
            setColorMode('fill');
            setIsOpen(true);
          }}
          className={`flex items-center space-x-1 px-2 py-1 rounded border cursor-pointer ${
            colorMode === 'fill' && isOpen
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
              : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
          }`}
          title="Fill color"
        >
          <div className="relative">
            <div 
              className="w-4 h-4 rounded border border-gray-600 dark:border-gray-400"
              style={{ 
                backgroundColor: currentFillColor === 'none' ? 'transparent' : currentFillColor,
                backgroundImage: currentFillColor === 'none' ? 
                  'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)' : 
                  'none',
                backgroundSize: '4px 4px',
                backgroundPosition: '0 0, 0 2px, 2px -2px, -2px 0px'
              }}
            />
            <div className="absolute -bottom-1 -right-1 text-[8px] font-bold bg-white dark:bg-gray-800 px-0.5 rounded border border-gray-300 dark:border-gray-600">F</div>
          </div>
        </button>
      </div>

      {/* Color picker dropdown */}
      {isOpen && (
        <div 
          className="fixed bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700" 
          style={{ 
            minWidth: '320px', 
            zIndex: 9999,
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)'
          }}
          onMouseLeave={() => setHoveredColor(null)}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Color Picker</h3>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(false);
              }}
              className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              <X size={20} />
            </button>
          </div>
          <div className="p-4">
          {/* Current color display */}
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1">
              <div className="text-xs text-gray-600 dark:text-gray-400">
                {colorMode === 'stroke' ? 'Stroke Color' : 'Fill Color'}
                {hoveredColor && <span className="ml-2 font-mono">{hoveredColor}</span>}
              </div>
              <button
                onClick={async () => {
                  // Try to use native EyeDropper API
                  if ('EyeDropper' in window) {
                    try {
                      const eyeDropper = new window.EyeDropper();
                      const result = await eyeDropper.open();
                      handleColorSelect(result.sRGBHex);
                    } catch (err) {
                      // User cancelled
                      console.log('EyeDropper cancelled');
                    }
                  } else {
                    // Fallback to old behavior
                    onEyedropperToggle(!isEyedropperActive);
                  }
                }}
                className={`p-1.5 rounded ${isEyedropperActive ? 'bg-blue-500 text-white' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                title="Eyedropper tool (I)"
              >
                <Pipette size={14} />
              </button>
            </div>
            <div className="flex items-center space-x-2">
              <div 
                className="w-16 h-16 rounded border-2 border-gray-300 dark:border-gray-600 transition-colors duration-150"
                style={{ 
                  backgroundColor: hoveredColor || (colorMode === 'stroke' ? currentColor : (currentFillColor === 'none' ? 'transparent' : currentFillColor)),
                  backgroundImage: colorMode === 'fill' && (hoveredColor === 'none' || (!hoveredColor && currentFillColor === 'none')) ? 
                    'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)' : 
                    'none',
                  backgroundSize: '8px 8px',
                  backgroundPosition: '0 0, 0 4px, 4px -4px, -4px 0px'
                }}
              />
              <div>
                <input
                  type="text"
                  value={hoveredColor || (colorMode === 'stroke' ? currentColor : currentFillColor)}
                  onChange={(e) => {
                    const color = e.target.value.toUpperCase();
                    setHoveredColor(color);
                    if (/^#[0-9A-Fa-f]{6}$/.test(color) || color === 'none') {
                      handleColorSelect(color);
                    }
                  }}
                  onBlur={() => setHoveredColor(null)}
                  className="w-24 px-2 py-1 text-sm font-mono border rounded dark:bg-gray-700 dark:border-gray-600"
                  placeholder="#000000"
                />
                <input
                  type="color"
                  value={colorMode === 'stroke' ? currentColor : (currentFillColor === 'none' ? '#ffffff' : currentFillColor)}
                  onChange={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleColorSelect(e.target.value);
                  }}
                  className="ml-2 w-8 h-8 cursor-pointer border-0 rounded"
                  style={{ WebkitAppearance: 'none', MozAppearance: 'none', appearance: 'none' }}
                />
                {colorMode === 'fill' && (
                  <button
                    onClick={() => handleColorSelect('none')}
                    className="ml-2 px-2 py-1 text-xs border rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    None
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Recent colors */}
          <div className="mb-3">
            <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Recent Colors</div>
            <div className="grid grid-cols-12 gap-1">
              {recentColors.map((color, i) => (
                <button
                  key={i}
                  className="w-6 h-6 rounded border border-gray-300 dark:border-gray-600 hover:scale-110 hover:shadow-lg transition-all cursor-pointer"
                  style={{ backgroundColor: color }}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleColorSelect(color);
                  }}
                  onMouseEnter={() => setHoveredColor(color)}
                  onMouseLeave={() => setHoveredColor(null)}
                  title={color}
                />
              ))}
            </div>
          </div>

          {/* Saved palettes */}
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1">
              <div className="text-xs text-gray-600 dark:text-gray-400">Saved Palettes</div>
              <select
                value={activePalette}
                onChange={(e) => setActivePalette(e.target.value)}
                className="text-xs px-2 py-0.5 rounded border dark:bg-gray-700 dark:border-gray-600"
              >
                {Object.keys(savedPalettes).map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-10 gap-1">
              {savedPalettes[activePalette]?.map((color, i) => (
                <button
                  key={i}
                  className="w-7 h-7 rounded border border-gray-300 dark:border-gray-600 hover:scale-110 hover:shadow-lg transition-all cursor-pointer"
                  style={{ backgroundColor: color }}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleColorSelect(color);
                  }}
                  onMouseEnter={() => setHoveredColor(color)}
                  onMouseLeave={() => setHoveredColor(null)}
                  title={color}
                />
              ))}
              <button
                className="w-7 h-7 rounded border-2 border-dashed border-gray-400 dark:border-gray-600 hover:border-gray-600 dark:hover:border-gray-400 flex items-center justify-center"
                onClick={() => {
                  setSavedPalettes(prev => ({
                    ...prev,
                    [activePalette]: [...(prev[activePalette] || []), currentColor].slice(0, 20)
                  }));
                }}
                title="Add current color to palette"
              >
                <Plus size={12} />
              </button>
            </div>
          </div>

          {/* Preset colors */}
          <div>
            <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Preset Colors</div>
            <div className="grid grid-cols-8 gap-1">
              {presetColors.map((color, i) => (
                <button
                  key={i}
                  className="w-8 h-8 rounded border border-gray-300 dark:border-gray-600 hover:scale-110 hover:shadow-lg transition-all cursor-pointer"
                  style={{ backgroundColor: color }}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleColorSelect(color);
                  }}
                  onMouseEnter={() => setHoveredColor(color)}
                  onMouseLeave={() => setHoveredColor(null)}
                  title={color}
                />
              ))}
            </div>
          </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default EnhancedColorPicker;