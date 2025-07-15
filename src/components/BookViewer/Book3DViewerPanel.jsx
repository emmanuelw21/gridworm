// components/BookViewer/Book3DViewerPanel.jsx
import React, { useState, useEffect, useMemo, useRef, useCallback, memo, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, Html, PerspectiveCamera } from '@react-three/drei';
import {
  Book as BookIcon, X, CheckSquare, Square, Edit,
  Image as ImageIconLucide, Video as VideoIconLucide, Music as MusicIconLucide,
  SortAsc, SortDesc, Filter, Trash2, FileText, List, Eye, EyeOff,
  MousePointer2 as MousePointer2Icon, ChevronLeft, ChevronRight,
  Grid, Maximize2, Pin, PinOff, AlertTriangle, RefreshCw, Boxes,
  Settings, Download, Minimize2, LayoutGrid, Type,
  RotateCcw, FlipHorizontal, FlipVertical, Sliders, Lightbulb, Palette,
  ChevronUp, ChevronDown, Moon, Sun, Save, Bookmark, RotateCw
} from 'lucide-react';
import AnimatedBookViewer from './AnimatedBookViewer.jsx';
import PageMappingDialog from '../ThreeDViewport/PageMappingDialog';
import { Book } from './Book';
import { atom, useAtom } from 'jotai';
import { pageAtom } from './UI';
import * as THREE from 'three';

// Import your existing helpers
import {
  is3D,
  isVideo,
  isImage,
  isAnimated,
  getFileTypeCategory,
  getFileExtension,
} from '../MediaGrid/helpers';

// Import atoms from store
import { bookVolumeMetadataAtom, atomPagesAtom } from '../../store';

// Light position visualizer component
const LightPositionVisualizer = memo(({ lightingConfig }) => {
  return (
    <>
      {/* Key Light */}
      <mesh position={[
        lightingConfig.keyLight.position.x / 4,
        lightingConfig.keyLight.position.y / 4,
        lightingConfig.keyLight.position.z / 4
      ]}>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshBasicMaterial color="#ffff00" />
      </mesh>

      {/* Fill Light */}
      <mesh position={[
        lightingConfig.fillLight.position.x / 4,
        lightingConfig.fillLight.position.y / 4,
        lightingConfig.fillLight.position.z / 4
      ]}>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshBasicMaterial color="#00ffff" />
      </mesh>

      {/* Book reference */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[1.28 / 2, 1.71 / 2, 0.2]} />
        <meshBasicMaterial color="#666666" wireframe />
      </mesh>

      {/* Grid helper */}
      <gridHelper args={[10, 10, '#333333', '#222222']} rotation={[Math.PI / 2, 0, 0]} />
    </>
  );
});

// Save to Bookshelf Dialog Component
const SaveBookDialog = ({ onSave, onCancel, currentPages = [], mediaFiles = [] }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [author, setAuthor] = useState('Gridworm User');
  const [color, setColor] = useState('#4682B4');

  const handleSave = () => {
    if (!title.trim()) {
      alert('Please enter a title for your book');
      return;
    }
    onSave({ title, description, author, color });
  };

  const getMediaThumbnail = useCallback((mediaItem) => {
    if (!mediaItem) return null;

    // Handle string references - find the actual media
    if (typeof mediaItem === 'string') {
      if (mediaItem === 'blank' || mediaItem === 'cover' || mediaItem === 'back-cover') {
        return null;
      }

      const actualMedia = mediaFiles.find(m => m.id === mediaItem || m.name === mediaItem);
      if (!actualMedia) {
        console.warn('Media not found for:', mediaItem);
        return null;
      }

      // Return the thumbnail if available, otherwise return URL for images
      return actualMedia.thumbnail || actualMedia.url || null;
    }

    // For objects
    if (typeof mediaItem === 'object') {
      if (mediaItem.isMissing || mediaItem.isPlaceholder) {
        return null;
      }

      // Always prefer thumbnail if available (this handles videos with thumbnails)
      if (mediaItem.thumbnail) {
        return mediaItem.thumbnail;
      }

      // For images without thumbnails, use URL
      const ext = getFileExtension(mediaItem.name || '').toLowerCase();
      const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'];
      if (imageExtensions.includes(ext) && mediaItem.url) {
        return mediaItem.url;
      }

      // For everything else (videos, 3D, etc), thumbnail is required
      return null;
    }

    return null;
  }, [mediaFiles]);

  return (
    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1010]">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-96 space-y-4">
        <h3 className="text-lg font-bold dark:text-white">Save Book to Bookshelf</h3>

        <div className="text-sm text-gray-600 dark:text-gray-400 bg-blue-50 dark:bg-blue-900/20 p-3 rounded">
          This will save the current book page order ({currentPages.length} pages) to your bookshelf.
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1 dark:text-gray-300">Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter book title"
              className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 dark:text-gray-300">Author</label>
            <input
              type="text"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 dark:text-gray-300">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
              className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white h-20 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 dark:text-gray-300">Cover Color</label>
            <div className="flex items-center space-x-2">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-12 h-8 rounded border cursor-pointer"
              />
              <input
                type="text"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="flex-1 p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm font-mono"
              />
              {/* Color presets */}
              <div className="flex space-x-1">
                {['#4682B4', '#8B4513', '#228B22', '#8B008B', '#DC143C'].map(c => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    className="w-6 h-6 rounded border-2 border-gray-300 hover:border-gray-500"
                    style={{ backgroundColor: c }}
                    title={c}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-2 pt-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500 dark:text-white"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!title.trim()}
            className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            <Save size={16} />
            <span>Save to Bookshelf</span>
          </button>
        </div>
      </div>
    </div>
  );
};

// Settings Panel Component
const SettingsPanel = memo(({ bookConfig, setBookConfig, onClose }) => {
  const aspectRatios = [
    { name: 'Standard', width: 1.28, height: 1.71 },
    { name: 'Square', width: 1.5, height: 1.5 },
    { name: 'Wide', width: 1.71, height: 1.28 },
    { name: 'US Letter', width: 1.294, height: 1.682 },
    { name: 'A4', width: 1.238, height: 1.748 },
  ];

  return (
    <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 w-64 max-h-[calc(100vh-12rem)] overflow-y-auto">
      <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800">
        <h3 className="font-medium flex items-center dark:text-white">
          <Settings size={16} className="mr-2" />
          Book Settings
        </h3>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
        >
          <X size={14} />
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Aspect Ratio Presets */}
        <div>
          <label className="text-sm font-medium mb-2 block dark:text-gray-300">
            Page Format
          </label>
          <div className="grid grid-cols-2 gap-2">
            {aspectRatios.map((ratio) => (
              <button
                key={ratio.name}
                onClick={() => setBookConfig(prev => ({
                  ...prev,
                  pageWidth: ratio.width,
                  pageHeight: ratio.height
                }))}
                className={`px-3 py-2 text-xs rounded border transition-colors ${Math.abs(bookConfig.pageWidth - ratio.width) < 0.01 &&
                  Math.abs(bookConfig.pageHeight - ratio.height) < 0.01
                  ? 'bg-blue-100 border-blue-300 text-blue-700 dark:bg-blue-900 dark:border-blue-700 dark:text-blue-300'
                  : 'bg-gray-50 border-gray-200 hover:bg-gray-100 dark:bg-gray-700 dark:border-gray-600 dark:hover:bg-gray-600 dark:text-gray-300'
                  }`}
              >
                {ratio.name}
              </button>
            ))}
          </div>
        </div>

        {/* Page Width */}
        <div>
          <label className="text-sm font-medium mb-1 block dark:text-gray-300">
            Page Width: {bookConfig.pageWidth.toFixed(2)}
          </label>
          <input
            type="range"
            min="0.5"
            max="3"
            step="0.01"
            value={bookConfig.pageWidth}
            onChange={(e) => setBookConfig(prev => ({ ...prev, pageWidth: parseFloat(e.target.value) }))}
            className="w-full cursor-pointer"
          />
        </div>

        {/* Page Height */}
        <div>
          <label className="text-sm font-medium mb-1 block dark:text-gray-300">
            Page Height: {bookConfig.pageHeight.toFixed(2)}
          </label>
          <input
            type="range"
            min="0.5"
            max="3"
            step="0.01"
            value={bookConfig.pageHeight}
            onChange={(e) => setBookConfig(prev => ({ ...prev, pageHeight: parseFloat(e.target.value) }))}
            className="w-full cursor-pointer"
          />
        </div>


        {/* Reset button */}
        <button
          onClick={() => setBookConfig({
            pageWidth: 1.28,
            pageHeight: 1.71,
            flipDirection: 'vertical',
          })}
          className="w-full px-3 py-2 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600 text-sm dark:text-gray-300 transition-colors"
        >
          Reset to Default
        </button>
      </div>
    </div>
  );
});

// Enhanced Lighting Panel with Interactive 2D Controls
const LightingPanel = memo(({ lightingConfig, setLightingConfig, darkMode, onClose }) => {
  const [localConfig, setLocalConfig] = useState(lightingConfig);
  const [isDragging, setIsDragging] = useState(null);
  const updateTimeoutRef = useRef(null);

  const updateParentConfig = useCallback((newConfig) => {
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }
    updateTimeoutRef.current = setTimeout(() => {
      setLightingConfig(newConfig);
    }, 50);
  }, [setLightingConfig]);

  useEffect(() => {
    setLocalConfig(lightingConfig);
  }, [lightingConfig]);

  const handleChange = (path, value) => {
    const newConfig = { ...localConfig };
    const keys = path.split('.');
    let current = newConfig;
    for (let i = 0; i < keys.length - 1; i++) {
      current = current[keys[i]];
    }
    current[keys[keys.length - 1]] = value;
    setLocalConfig(newConfig);
    updateParentConfig(newConfig);
  };

  // Interactive 2D light control with drag functionality
  const LightControlCanvas = () => {
    const canvasRef = useRef(null);

    const handleMouseDown = (e, lightType) => {
      setIsDragging(lightType);
      e.preventDefault();
    };

    const handleMouseMove = useCallback((e) => {
      if (!isDragging || !canvasRef.current) return;

      const rect = canvasRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width - 0.5) * 40;
      const z = ((e.clientY - rect.top) / rect.height - 0.5) * 40;

      const newConfig = { ...localConfig };
      newConfig[isDragging].position.x = Math.max(-20, Math.min(20, x));
      newConfig[isDragging].position.z = Math.max(-20, Math.min(20, -z));

      setLocalConfig(newConfig);
      updateParentConfig(newConfig);
    }, [isDragging, localConfig, updateParentConfig]);

    const handleMouseUp = useCallback(() => {
      setIsDragging(null);
    }, []);

    useEffect(() => {
      if (isDragging) {
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        return () => {
          document.removeEventListener('mousemove', handleMouseMove);
          document.removeEventListener('mouseup', handleMouseUp);
        };
      }
    }, [isDragging, handleMouseMove, handleMouseUp]);

    return (
      <div className="relative">
        <div
          ref={canvasRef}
          className="w-full h-32 bg-gray-900 rounded-lg border cursor-crosshair relative overflow-hidden"
          style={{
            background: `radial-gradient(circle at ${50 + (localConfig.keyLight.position.x / 40) * 50
              }% ${50 - (localConfig.keyLight.position.z / 40) * 50
              }%, rgba(255,255,0,0.3) 0%, transparent 30%), 
            radial-gradient(circle at ${50 + (localConfig.fillLight.position.x / 40) * 50
              }% ${50 - (localConfig.fillLight.position.z / 40) * 50
              }%, rgba(0,255,255,0.2) 0%, transparent 30%), #1a1a1a`
          }}
        >
          {/* Grid pattern */}
          <div className="absolute inset-0 opacity-20">
            <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                  <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#666" strokeWidth="1" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>
          </div>

          {/* Key Light Indicator */}
          <div
            className="absolute w-4 h-4 bg-yellow-400 rounded-full border-2 border-yellow-600 cursor-grab active:cursor-grabbing transform -translate-x-1/2 -translate-y-1/2 shadow-lg transition-transform hover:scale-110"
            style={{
              left: `${50 + (localConfig.keyLight.position.x / 40) * 50}%`,
              top: `${50 - (localConfig.keyLight.position.z / 40) * 50}%`,
              boxShadow: `0 0 20px rgba(255, 255, 0, ${localConfig.keyLight.intensity * 0.5})`
            }}
            onMouseDown={(e) => handleMouseDown(e, 'keyLight')}
            title="Drag to move Key Light"
          />

          {/* Fill Light Indicator */}
          <div
            className="absolute w-4 h-4 bg-cyan-400 rounded-full border-2 border-cyan-600 cursor-grab active:cursor-grabbing transform -translate-x-1/2 -translate-y-1/2 shadow-lg transition-transform hover:scale-110"
            style={{
              left: `${50 + (localConfig.fillLight.position.x / 40) * 50}%`,
              top: `${50 - (localConfig.fillLight.position.z / 40) * 50}%`,
              boxShadow: `0 0 20px rgba(0, 255, 255, ${localConfig.fillLight.intensity * 0.5})`
            }}
            onMouseDown={(e) => handleMouseDown(e, 'fillLight')}
            title="Drag to move Fill Light"
          />

          {/* Book Indicator */}
          <div
            className="absolute w-5 h-6 bg-gray-600 border border-gray-400 transform -translate-x-1/2 -translate-y-1/2 rounded-sm"
            style={{ left: '50%', top: '50%' }}
            title="Book Position"
          >
            <div className="w-full h-full flex items-center justify-center text-xs text-gray-300">
              📖
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 w-80 max-h-[calc(100vh-12rem)] overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800">
        <h3 className="font-medium flex items-center dark:text-white">
          <Lightbulb size={16} className="mr-2" />
          Lighting & Background
        </h3>
        <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors">
          <X size={14} />
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Interactive Light Position Control */}
        <div>
          <label className="text-sm font-medium mb-2 block dark:text-gray-300">
            Light Positions (Drag to Move)
          </label>
          <LightControlCanvas />
          <div className="flex justify-between mt-1 text-xs text-gray-500">
            <span className="flex items-center">
              <span className="w-2 h-2 bg-yellow-400 rounded-full mr-1"></span>Key Light
            </span>
            <span className="flex items-center">
              <span className="w-2 h-2 bg-gray-600 rounded mr-1"></span>Book
            </span>
            <span className="flex items-center">
              <span className="w-2 h-2 bg-cyan-400 rounded-full mr-1"></span>Fill Light
            </span>
          </div>
        </div>

        {/* Ambient Light */}
        <div>
          <label className="text-sm font-medium mb-1 block dark:text-gray-300">
            Ambient Light: {Math.round(localConfig.ambientIntensity * 100)}%
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={localConfig.ambientIntensity}
            onChange={(e) => handleChange('ambientIntensity', parseFloat(e.target.value))}
            className="w-full cursor-pointer"
          />
        </div>

        {/* Key Light Controls */}
        <div className="space-y-2">
          <label className="text-sm font-medium block dark:text-gray-300 text-yellow-600">
            Key Light Settings
          </label>

          <div>
            <label className="text-xs text-gray-600 dark:text-gray-400">
              Intensity: {Math.round(localConfig.keyLight.intensity * 100)}%
            </label>
            <input
              type="range"
              min="0"
              max="2"
              step="0.01"
              value={localConfig.keyLight.intensity}
              onChange={(e) => handleChange('keyLight.intensity', parseFloat(e.target.value))}
              className="w-full cursor-pointer"
            />
          </div>

          <div>
            <label className="text-xs text-gray-600 dark:text-gray-400">
              Height: {localConfig.keyLight.position.y.toFixed(1)}
            </label>
            <input
              type="range"
              min="-20"
              max="20"
              step="0.5"
              value={localConfig.keyLight.position.y}
              onChange={(e) => handleChange('keyLight.position.y', parseFloat(e.target.value))}
              className="w-full cursor-pointer"
            />
          </div>
        </div>

        {/* Fill Light Controls */}
        <div className="space-y-2">
          <label className="text-sm font-medium block dark:text-gray-300 text-cyan-600">
            Fill Light Settings
          </label>

          <div>
            <label className="text-xs text-gray-600 dark:text-gray-400">
              Intensity: {Math.round(localConfig.fillLight.intensity * 100)}%
            </label>
            <input
              type="range"
              min="0"
              max="2"
              step="0.01"
              value={localConfig.fillLight.intensity}
              onChange={(e) => handleChange('fillLight.intensity', parseFloat(e.target.value))}
              className="w-full cursor-pointer"
            />
          </div>

          <div>
            <label className="text-xs text-gray-600 dark:text-gray-400">
              Height: {localConfig.fillLight.position.y.toFixed(1)}
            </label>
            <input
              type="range"
              min="-20"
              max="20"
              step="0.5"
              value={localConfig.fillLight.position.y}
              onChange={(e) => handleChange('fillLight.position.y', parseFloat(e.target.value))}
              className="w-full cursor-pointer"
            />
          </div>
        </div>

        {/* Background Color */}
        <div>
          <label className="text-sm font-medium mb-1 block dark:text-gray-300">Background Color</label>
          <div className="flex items-center space-x-2">
            <input
              type="color"
              value={localConfig.backgroundColor}
              onChange={(e) => handleChange('backgroundColor', e.target.value)}
              className="w-12 h-8 rounded border cursor-pointer"
            />
            <input
              type="text"
              value={localConfig.backgroundColor}
              onChange={(e) => handleChange('backgroundColor', e.target.value)}
              className="flex-1 px-2 py-1 text-sm rounded border dark:bg-gray-700 dark:border-gray-600 dark:text-white font-mono"
            />
          </div>
        </div>

        {/* Color Presets */}
        <div>
          <label className="text-sm font-medium mb-2 block dark:text-gray-300">Quick Colors</label>
          <div className="grid grid-cols-4 gap-1">
            {[
              { name: 'Dark', color: '#1a1a1a' },
              { name: 'Blue', color: '#2c3e50' },
              { name: 'Purple', color: '#4B0082' },
              { name: 'Forest', color: '#2E5F2E' },
              { name: 'Ocean', color: '#006994' },
              { name: 'Warm', color: '#8B4513' },
              { name: 'Studio', color: '#f5f5f5' },
              { name: 'Night', color: '#0a0a0a' }
            ].map(preset => (
              <button
                key={preset.name}
                onClick={() => handleChange('backgroundColor', preset.color)}
                className="p-2 rounded text-xs hover:opacity-80 transition-opacity cursor-pointer text-white shadow-sm"
                style={{
                  backgroundColor: preset.color,
                  color: preset.color === '#f5f5f5' ? '#333' : '#fff'
                }}
                title={preset.name}
              >
                {preset.name}
              </button>
            ))}
          </div>
        </div>

        {/* Preset Lighting Setups */}
        <div className="border-t pt-4 dark:border-gray-700">
          <label className="text-sm font-medium mb-2 block dark:text-gray-300">Lighting Presets</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                const preset = {
                  ambientIntensity: 0.2,
                  keyLight: { intensity: 0.8, position: { x: 5, y: 10, z: 5 }, color: '#ffffff' },
                  fillLight: { intensity: 0.3, position: { x: -5, y: -5, z: -10 }, color: '#ffffff' },
                  backgroundColor: darkMode ? '#0a0a0a' : '#1a1a1a',
                };
                setLocalConfig(preset);
                updateParentConfig(preset);
              }}
              className="px-3 py-2 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600 text-sm dark:text-gray-300 transition-colors"
            >
              Dramatic
            </button>
            <button
              onClick={() => {
                const preset = {
                  ambientIntensity: 0.5,
                  keyLight: { intensity: 1.0, position: { x: 10, y: 10, z: 10 }, color: '#ffffff' },
                  fillLight: { intensity: 0.5, position: { x: -10, y: -10, z: -10 }, color: '#ffffff' },
                  backgroundColor: darkMode ? '#1a1a1a' : '#2c3e50',
                };
                setLocalConfig(preset);
                updateParentConfig(preset);
              }}
              className="px-3 py-2 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600 text-sm dark:text-gray-300 transition-colors"
            >
              Default
            </button>
            <button
              onClick={() => {
                const preset = {
                  ambientIntensity: 0.8,
                  keyLight: { intensity: 1.2, position: { x: 0, y: 15, z: 0 }, color: '#ffffff' },
                  fillLight: { intensity: 0.8, position: { x: -5, y: 5, z: -5 }, color: '#ffffff' },
                  backgroundColor: '#f5f5f5',
                };
                setLocalConfig(preset);
                updateParentConfig(preset);
              }}
              className="px-3 py-2 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600 text-sm dark:text-gray-300 transition-colors"
            >
              Bright
            </button>
            <button
              onClick={() => {
                const preset = {
                  ambientIntensity: 0.1,
                  keyLight: { intensity: 0.6, position: { x: -10, y: 5, z: 10 }, color: '#ffffff' },
                  fillLight: { intensity: 0.2, position: { x: 10, y: -5, z: -10 }, color: '#ffffff' },
                  backgroundColor: '#000000',
                };
                setLocalConfig(preset);
                updateParentConfig(preset);
              }}
              className="px-3 py-2 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600 text-sm dark:text-gray-300 transition-colors"
            >
              Noir
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

// Memoized BookScene component
const BookScene = memo(({ atomPages, bookVolumeMetadata, mediaFiles, autoRotate, bookConfig, lightingConfig }) => {
  return (
    <>
      <ambientLight intensity={lightingConfig.ambientIntensity} />
      <pointLight
        position={[lightingConfig.keyLight.position.x, lightingConfig.keyLight.position.y, lightingConfig.keyLight.position.z]}
        intensity={lightingConfig.keyLight.intensity}
        color={lightingConfig.keyLight.color}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={0.5}
        shadow-camera-far={50}
      />
      <pointLight
        position={[lightingConfig.fillLight.position.x, lightingConfig.fillLight.position.y, lightingConfig.fillLight.position.z]}
        intensity={lightingConfig.fillLight.intensity}
        color={lightingConfig.fillLight.color}
      />

      {atomPages.length > 0 && (
        <Book
          key={`${bookConfig.pageWidth}-${bookConfig.pageHeight}`}
          pages={atomPages}
          volumeId={bookVolumeMetadata?.id || 'default'}
          volumeMetadata={bookVolumeMetadata}
          mediaFiles={mediaFiles}
          scale={1}
          position={[0, 0, 0]}
          pageWidth={bookConfig.pageWidth}
          pageHeight={bookConfig.pageHeight}
          receiveShadow
          castShadow
        />
      )}

      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        autoRotate={autoRotate}
        autoRotateSpeed={0.5}
        maxPolarAngle={Math.PI * 0.8}
        minPolarAngle={Math.PI * 0.2}
        target={[0, 0, 0]}
        zoomSpeed={0.5}
        panSpeed={0.5}
        rotateSpeed={0.5}
      />

      <Environment preset="studio" intensity={0.5} />
    </>
  );
});

// Enhanced PageThumbnails with proper docking behavior and file folder tab
const PageThumbnails = memo(({
  atomPages,
  currentPage,
  handleThumbnailClick,
  getMediaThumbnail,
  isTextPage,
  isDocked,
  onToggleDock,
  mediaFiles
}) => {
  const thumbnailsRef = useRef(null);

  const thumbnailData = useMemo(() => {
    const thumbs = [];
    const validPages = atomPages.filter(page => page != null);

    if (validPages.length === 0) return thumbs;

    // Add front cover
    if (validPages[0]?.front) {
      thumbs.push({
        type: 'cover',
        coverType: 'front',
        page: validPages[0].front,
        pageIndex: 0,
        label: 'Cover'
      });
    }

    // Generate spreads
    let pageNum = 1;
    for (let i = 1; i < validPages.length; i++) {
      const prevPage = validPages[i - 1];
      const currentPageData = validPages[i];

      if (!prevPage || !currentPageData) continue;

      const leftImage = prevPage.back;
      const rightImage = currentPageData.front;

      if (leftImage || rightImage) {
        thumbs.push({
          type: 'spread',
          left: leftImage,
          right: rightImage,
          pageIndex: i,
          label: `Pages ${pageNum}-${pageNum + 1}`
        });
        pageNum += 2;
      }
    }

    // Add back cover
    const lastPage = validPages[validPages.length - 1];
    if (lastPage && lastPage.back) {
      thumbs.push({
        type: 'cover',
        coverType: 'back',
        page: lastPage.back,
        pageIndex: validPages.length, // Set to pages.length to close the book
        label: 'Back Cover'
      });
    }

    return thumbs;
  }, [atomPages]);

  const activeThumbIndex = thumbnailData.findIndex(thumb => {
    // Special case for back cover when book is closed
    if (thumb.coverType === 'back' && currentPage === atomPages.length) {
      return true;
    }
    return thumb.pageIndex === currentPage;
  });

  // Auto-scroll to current thumbnail when not docked
  useEffect(() => {
    if (thumbnailsRef.current && activeThumbIndex >= 0 && !isDocked) {
      const container = thumbnailsRef.current;
      const thumbnail = container.children[activeThumbIndex];
      if (thumbnail) {
        thumbnail.scrollIntoView({
          behavior: 'smooth',
          inline: 'center',
          block: 'nearest'
        });
      }
    }
  }, [currentPage, activeThumbIndex, isDocked]);

  // Helper to get media type icon
  const getMediaTypeIcon = (media) => {
    if (!media) return null;

    const mediaObj = typeof media === 'object' ? media : mediaFiles?.find(m => m.id === media || m.name === media);
    if (!mediaObj) return null;

    if (isTextPage(mediaObj)) return <Type size={12} />;
    if (isVideo(mediaObj.type)) return '🎬';
    if (is3D(mediaObj.type)) return '🎲';
    if (isAnimated(mediaObj.type, mediaObj.name)) return '🎞️';

    return null;
  };

  return (
    <div className={`absolute bottom-4 left-4 right-4 transition-all duration-300 ease-in-out ${isDocked ? 'transform translate-y-[calc(100%-3rem)]' : 'transform translate-y-0'
      }`}>
      {/* Subtle File Folder Tab */}
      <div
        className="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-white/90 dark:bg-gray-800/90 backdrop-blur border border-gray-200 dark:border-gray-700 rounded-t-lg px-4 py-2 cursor-pointer hover:bg-white dark:hover:bg-gray-800 transition-colors shadow-lg z-10"
        onClick={onToggleDock}
        style={{
          clipPath: 'polygon(10% 0%, 90% 0%, 100% 100%, 0% 100%)',
          borderBottom: 'none'
        }}
      >
        <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
          <LayoutGrid size={14} />
          <span className="font-medium">{isDocked ? 'Show' : 'Hide'} Thumbnails</span>
          {isDocked ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </div>
      </div>

      {/* Thumbnails Container - only show when not docked */}
      {!isDocked && (
        <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4">
          <div ref={thumbnailsRef} className="flex space-x-3 overflow-x-auto pb-2 scroll-smooth">
            {thumbnailData.map((thumb, index) => {
              const isCurrentPage = index === activeThumbIndex;

              if (thumb.type === 'cover') {
                const mediaThumb = getMediaThumbnail(thumb.page);
                const isMissing = thumb.page?.isMissing;
                const typeIcon = getMediaTypeIcon(thumb.page);

                return (
                  <button
                    key={`${thumb.coverType}-cover-${index}`}
                    onClick={() => handleThumbnailClick(thumb.pageIndex)}
                    className={`relative flex-shrink-0 w-24 h-36 rounded-lg border-2 transition-all transform hover:scale-105 ${isCurrentPage
                      ? 'border-blue-500 shadow-xl scale-110 ring-2 ring-blue-300 z-10'
                      : thumb.coverType === 'front'
                        ? 'border-green-500 shadow-lg hover:border-green-400'
                        : 'border-purple-500 shadow-lg hover:border-purple-400'
                      } cursor-pointer`}
                    title={thumb.coverType === 'front' ? 'Front Cover' : 'Back Cover'}
                  >
                    <div className="absolute inset-0 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700">
                      {isMissing ? (
                        <div className="w-full h-full bg-yellow-500 flex flex-col items-center justify-center p-2">
                          <span className="text-xs font-bold text-black">MISSING</span>
                          <span className="text-xs text-black/70 text-center mt-1">
                            {thumb.page?.name || 'Unknown'}
                          </span>
                        </div>
                      ) : mediaThumb ? (
                        <>
                          <img
                            src={mediaThumb}
                            alt={typeof thumb.page === 'object' ? thumb.page.name : thumb.page}
                            className="absolute inset-0 w-full h-full object-cover"
                            onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.nextElementSibling.style.display = 'flex';
                            }}
                          />
                          <div className="w-full h-full items-center justify-center text-xs text-gray-400 hidden flex-col">
                            <span>Load Error</span>
                            <span className="text-xs mt-1">{thumb.page?.name}</span>
                          </div>
                        </>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          —
                        </div>
                      )}
                    </div>

                    <div className={`absolute bottom-1 left-1 ${thumb.coverType === 'front' ? 'bg-green-600' : 'bg-purple-600'
                      } text-white text-xs px-2 py-0.5 rounded-full shadow`}>
                      {thumb.coverType === 'front' ? 'Cover' : 'Back'}
                    </div>

                    {typeIcon && (
                      <div className="absolute top-1 right-1 bg-black/60 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">
                        {typeIcon}
                      </div>
                    )}
                  </button>
                );
              } else {
                // Spread thumbnail
                const leftThumb = getMediaThumbnail(thumb.left);
                const rightThumb = getMediaThumbnail(thumb.right);
                const hasTextPage = isTextPage(thumb.left) || isTextPage(thumb.right);
                const leftMissing = thumb.left?.isMissing;
                const rightMissing = thumb.right?.isMissing;
                const leftIcon = getMediaTypeIcon(thumb.left);
                const rightIcon = getMediaTypeIcon(thumb.right);

                return (
                  <button
                    key={`spread-${thumb.pageIndex}-${index}`}
                    onClick={() => handleThumbnailClick(thumb.pageIndex)}
                    className={`relative flex-shrink-0 w-36 h-28 rounded-lg border-2 transition-all transform hover:scale-105 ${isCurrentPage
                      ? 'border-blue-500 shadow-xl scale-110 ring-2 ring-blue-300 z-10'
                      : 'border-gray-300 dark:border-gray-600 hover:border-blue-400'
                      } cursor-pointer`}
                    title={`${thumb.label}`}
                  >
                    <div className="absolute inset-0 flex flex-row rounded-lg overflow-hidden">
                      {/* Left page */}
                      <div className="w-1/2 h-full bg-gray-100 dark:bg-gray-700 overflow-hidden relative">
                        {leftMissing ? (
                          <div className="w-full h-full bg-yellow-500 flex items-center justify-center p-1">
                            <span className="text-xs font-bold text-black text-center">MISSING</span>
                          </div>
                        ) : leftThumb ? (
                          <>
                            <img
                              src={leftThumb}
                              alt="Left page"
                              className="absolute inset-0 w-full h-full object-cover"
                              onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextElementSibling.style.display = 'flex';
                              }}
                            />
                            <div className="w-full h-full items-center justify-center text-xs text-gray-400 hidden">—</div>
                          </>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">—</div>
                        )}

                        {leftIcon && (
                          <div className="absolute bottom-1 left-1 bg-black/60 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
                            {leftIcon}
                          </div>
                        )}
                      </div>

                      {/* Spine */}
                      <div className="w-px h-full bg-gray-300 dark:bg-gray-600 z-10"></div>

                      {/* Right page */}
                      <div className="w-1/2 h-full bg-gray-50 dark:bg-gray-800 overflow-hidden relative">
                        {rightMissing ? (
                          <div className="w-full h-full bg-yellow-500 flex items-center justify-center p-1">
                            <span className="text-xs font-bold text-black text-center">MISSING</span>
                          </div>
                        ) : rightThumb ? (
                          <>
                            <img
                              src={rightThumb}
                              alt="Right page"
                              className="absolute inset-0 w-full h-full object-cover"
                              onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextElementSibling.style.display = 'flex';
                              }}
                            />
                            <div className="w-full h-full items-center justify-center text-xs text-gray-400 hidden">—</div>
                          </>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">—</div>
                        )}

                        {rightIcon && (
                          <div className="absolute bottom-1 right-1 bg-black/60 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
                            {rightIcon}
                          </div>
                        )}
                      </div>
                    </div>

                    {hasTextPage && (
                      <div className="absolute bottom-1 right-1 bg-blue-600 text-white rounded-full p-1 shadow-lg" title="Contains Text Page">
                        <Type size={10} />
                      </div>
                    )}

                    <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 bg-black/80 text-white text-xs px-2 py-0.5 rounded-full backdrop-blur">
                      {thumb.label}
                    </div>
                  </button>
                );
              }
            })}
          </div>
        </div>
      )}

      {/* Always visible page counter - positioned at very bottom */}
      <div className="absolute -bottom-10 left-1/2 transform -translate-x-1/2 text-center text-sm text-white bg-black/50 px-3 py-1 rounded-full backdrop-blur">
        {currentPage === atomPages.length ? 'Back Cover' : `Page ${currentPage + 1} of ${atomPages.length}`}
      </div>
    </div>
  );
});

// Main Book3DViewerPanel Component
const Book3DViewerPanel = ({
  isOpen,
  onClose,
  gridSlots,
  freeGridItems,
  mediaFiles,
  gridConfig,
  pageMapping,
  onPageMappingConfirm,
  onAddMediaFiles,
  onSaveToBookshelf,
  onUpdateGridSlots,
  onCheckForPlaceholderReplacements,
  darkMode,
}) => {
  // UI State
  const [bookVolumeMetadata, setBookVolumeMetadata] = useAtom(bookVolumeMetadataAtom);

  const [showPageMapping, setShowPageMapping] = useState(false);
  const [autoRotate, setAutoRotate] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [show2DBookViewer, setShow2DBookViewer] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(true);

  // Panel states
  const [showSettings, setShowSettings] = useState(false);
  const [showLighting, setShowLighting] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [thumbnailsDocked, setThumbnailsDocked] = useState(false);

  // Out of sync state
  const [isOutOfSync, setIsOutOfSync] = useState(false);

  // Book configuration
  const [bookConfig, setBookConfig] = useState({
    pageWidth: 1.28,
    pageHeight: 1.71,
    flipDirection: 'vertical',
  });

  // Enhanced lighting configuration
  const [lightingConfig, setLightingConfig] = useState({
    ambientIntensity: 0.5,
    keyLight: {
      intensity: 1.0,
      position: { x: 10, y: 10, z: 10 },
      color: '#ffffff'
    },
    fillLight: {
      intensity: 0.5,
      position: { x: -10, y: -10, z: -10 },
      color: '#ffffff'
    },
    backgroundColor: darkMode ? '#1a1a1a' : '#2c3e50',
  });

  // Book state
  const [currentPage, setCurrentPage] = useAtom(pageAtom);
  const [atomPages, setAtomPages] = useAtom(atomPagesAtom);

  // Book draft state - stores the custom page order
  const [bookDraft, setBookDraft] = useState(null);
  

  // Enhanced thumbnail support for all media types
  const getMediaThumbnail = useCallback((mediaItem) => {
    if (!mediaItem) return null;

    // Handle string references - find the actual media
    if (typeof mediaItem === 'string') {
      if (mediaItem === 'blank' || mediaItem === 'cover' || mediaItem === 'back-cover') {
        return null;
      }

      // Find by ID or name
      const actualMedia = mediaFiles.find(m => m.id === mediaItem || m.name === mediaItem);
      if (!actualMedia) {
        console.warn('Media not found for:', mediaItem);
        return null;
      }

      // For WebP, WebM, and other formats, prioritize thumbnail if available
      if (actualMedia.thumbnail) {
        return actualMedia.thumbnail;
      }

      // For static images (including WebP), use the URL directly
      const ext = getFileExtension(actualMedia.name).toLowerCase();
      const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'];
      if (imageExtensions.includes(ext) && actualMedia.url) {
        return actualMedia.url;
      }

      // For video formats, we MUST use thumbnail
      const videoExtensions = ['webm', 'mp4', 'mov', 'avi', 'mkv', 'ogv'];
      if (videoExtensions.includes(ext)) {
        return actualMedia.thumbnail || null;
      }

      return actualMedia.url || null;
    }

    // For objects
    if (typeof mediaItem === 'object') {
      // Check if missing or placeholder first
      if (mediaItem.isMissing || mediaItem.isPlaceholder) {
        return null;
      }

      // If it has a thumbnail, always use it (best for performance)
      if (mediaItem.thumbnail) {
        return mediaItem.thumbnail;
      }

      // For images (including WebP), use URL
      const ext = getFileExtension(mediaItem.name || '').toLowerCase();
      const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'];
      if (imageExtensions.includes(ext) && mediaItem.url) {
        return mediaItem.url;
      }

      // For video formats, thumbnail is required
      const videoExtensions = ['webm', 'mp4', 'mov', 'avi', 'mkv', 'ogv'];
      if (videoExtensions.includes(ext)) {
        console.warn(`No thumbnail available for video: ${mediaItem.name}`);
        return null;
      }

      // If it's just an ID reference, find the full media
      if (!mediaItem.url && mediaItem.id) {
        const actualMedia = mediaFiles.find(m => m.id === mediaItem.id);
        if (actualMedia) {
          // Recursive call with the actual media
          return getMediaThumbnail(actualMedia);
        }
      }

      return mediaItem.url || null;
    }

    return null;
  }, [mediaFiles]);

  // Generate pages from current grid content
  const generatePagesFromGrid = useCallback((mapping) => {
    // Always use gridSlots (Grid Builder) as the source of truth
    const sourceItems = gridSlots.filter(Boolean).map(slot => {
      // Handle slot references properly
      if (typeof slot === 'string') {
        const media = mediaFiles.find(m => m.id === slot || m.name === slot);
        return media || null;
      }
      if (slot && slot.id) {
        const media = mediaFiles.find(m => m.id === slot.id);
        return media || slot;
      }
      return slot;
    }).filter(Boolean);

    if (mapping && Array.isArray(mapping) && mapping.length > 0) {
      console.log("Applying page order from mapping dialog.");
      return mapping.map(pageData => ({
        front: pageData.front,
        back: pageData.back
      }));
    }

    const pages = [];
    console.log("No mapping found, generating pages from grid order.");

    if (sourceItems.length === 0) {
      return pages;
    }

    // For book generation, store references (name or id) not full objects
    const frontCover = sourceItems[0];
    const backCover = sourceItems[sourceItems.length - 1];
    const interiorImages = sourceItems.slice(1, -1);

    
    // Use name or ID as reference
    pages.push({
      front: frontCover.name || frontCover.id,
      back: interiorImages.length > 0 ? (interiorImages[0].name || interiorImages[0].id) : null
    });

    for (let i = 1; i < interiorImages.length; i += 2) {
      pages.push({
        front: interiorImages[i].name || interiorImages[i].id,
        back: interiorImages[i + 1] ? (interiorImages[i + 1].name || interiorImages[i + 1].id) : null
      });
    }

    // Check if we need a blank page before the back cover
    // We need a blank if the last interior page already has both front and back filled
    const lastPageIndex = pages.length - 1;
    const lastPage = pages[lastPageIndex];
    
    if (lastPage && lastPage.back === null) {
      // Last page has an empty back slot - put back cover there
      pages[lastPageIndex].back = backCover.name || backCover.id;
    } else {
      // Last page is full - need a new page with blank front and back cover
      pages.push({
        front: null,
        back: backCover.name || backCover.id
      });
    }

    return pages;
  }, [gridSlots, mediaFiles]);

  // Handle page changes
  const handlePageChange = useCallback((newPage) => {
    // Allow page to be set to atomPages.length for back cover
    const validPage = Math.max(0, Math.min(newPage, atomPages.length));
    setCurrentPage(validPage);
  }, [atomPages.length, setCurrentPage]);

  // Handle thumbnail click
  const handleThumbnailClick = useCallback((targetPage) => {
    // Allow setting page to atomPages.length for back cover (closed book)
    const validPage = Math.max(0, Math.min(targetPage, atomPages.length));
    setCurrentPage(validPage);
  }, [atomPages.length, setCurrentPage]);

  // Check if media item is text page
  const isTextPage = (mediaItem) => {
    if (!mediaItem || typeof mediaItem !== 'object') return false;
    return mediaItem.isTextPage || mediaItem.metadata?.isTextPage || false;
  };

  // Sync pages function
  const syncPages = useCallback((mapping = null) => {
    const newPages = generatePagesFromGrid(mapping);

    const validPages = newPages
      .filter(page => page != null)
      .map(page => ({
        front: page.front || null,
        back: page.back || null
      }));

    if (validPages.length === 0) {
      validPages.push({ front: null, back: null });
    }

    setAtomPages(validPages);

    if (currentPage >= validPages.length) {
      setCurrentPage(0);
    }

    // Reset draft and out of sync state since we just synced
    setBookDraft(null);
    setIsOutOfSync(false);
  }, [generatePagesFromGrid, setAtomPages, setCurrentPage, currentPage]);

  // Manual sync handler
  const handleManualSync = useCallback(() => {
    syncPages();
    setBookDraft(null);

    const notification = document.createElement('div');
    notification.className = 'fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded shadow-lg z-50 flex items-center';
    notification.innerHTML = `
      <svg class="w-4 h-4 mr-2 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
      </svg>
      <span>Book synchronized with grid</span>
    `;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 2000);
  }, [syncPages]);

  // Check if content needs sync
  const needsSync = useMemo(() => {
    if (!isOpen || atomPages.length === 0) return false;

    const currentGridItems = freeGridItems && Object.keys(freeGridItems).length > 0
      ? Object.values(freeGridItems).map(item => item.mediaId).sort()
      : gridSlots.filter(Boolean).map(item => item?.id).filter(Boolean).sort();

    const currentPageItems = atomPages.reduce((items, page) => {
      if (!page) return items;

      if (page.front && typeof page.front === 'object' && page.front.id && !page.front.isMissing) {
        items.push(page.front.id);
      }
      if (page.back && typeof page.back === 'object' && page.back.id && !page.back.isMissing) {
        items.push(page.back.id);
      }
      return items;
    }, []).sort();

    if (currentGridItems.length !== currentPageItems.length) return true;

    return currentGridItems.some((id, index) => id !== currentPageItems[index]);
  }, [gridSlots, freeGridItems, atomPages, isOpen]);

  // Enhanced page mapping handler that updates book order
  const handlePageMappingConfirm = useCallback((mapping, metadata) => {
  console.log('=== Page Mapping Confirm Debug ===');
  console.log('Mapping received:', mapping);
  console.log('Metadata received:', metadata);
  console.log('Current atomPages before update:', atomPages);

  if (!mapping || !Array.isArray(mapping)) {
    console.error('Invalid mapping provided');
    return;
  }

  // Update book metadata if provided
  if (metadata) {
    console.log('Updating book metadata:', metadata);
    setBookVolumeMetadata(prev => ({
      ...prev,
      title: metadata.title || prev?.title || 'Untitled Book',
      author: metadata.author || prev?.author || 'Unknown Author',
      description: metadata.description || prev?.description || '',
      lastModified: new Date().toISOString()
    }));
  }

  // Convert mapping directly to pages - the mapping already contains the media objects in the correct order
  const newPages = mapping.map((pageMapping, index) => {
    const page = {
      front: null,
      back: null
    };

    // Handle front page
    if (pageMapping.front) {
      // Use the media reference directly
      page.front = pageMapping.front.name || pageMapping.front.id || pageMapping.front;
    }

    // Handle back page
    if (pageMapping.back) {
      // Use the media reference directly
      page.back = pageMapping.back.name || pageMapping.back.id || pageMapping.back;
    }

    console.log(`Page ${index}:`, page);
    return page;
  });

  console.log('New pages to be set:', newPages);

  // Store this as a draft
  const draft = {
    pages: newPages,
    metadata: metadata,
    timestamp: new Date().toISOString()
  };
  console.log('Setting book draft:', draft);
  setBookDraft(draft);

  // Update the pages with the new order
  console.log('Setting atom pages...');
  setAtomPages(newPages);
  
  // Reset to first page
  setCurrentPage(0);
  
  // Mark as out of sync since this is a custom order
  setIsOutOfSync(true);
  
  // Close the mapping dialog
  setShowPageMapping(false);

  console.log('=== Page Mapping Complete ===');

  // Show success notification
  const notification = document.createElement('div');
  notification.className = 'fixed bottom-4 right-4 bg-green-600 text-white px-4 py-2 rounded shadow-lg z-50 flex items-center';
  notification.innerHTML = `
    <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
    </svg>
    <span>Book draft created with ${newPages.length} pages</span>
  `;
  document.body.appendChild(notification);
  setTimeout(() => notification.remove(), 3000);
}, [setAtomPages, setCurrentPage, setBookVolumeMetadata, atomPages]);

 // Effect to detect when book differs from grid (out of sync indicator)
 useEffect(() => {
   if (!isOpen || atomPages.length === 0 || bookDraft) {
     // If we have a draft, we're intentionally out of sync
     if (bookDraft) {
       setIsOutOfSync(true);
     }
     return;
   }

   // Check if book pages differ from grid order
   const gridOrder = gridSlots.filter(Boolean).map(item => item.name || item.id);
   const bookOrder = atomPages.reduce((acc, page) => {
     if (page.front) acc.push(page.front);
     if (page.back) acc.push(page.back);
     return acc;
   }, []);

   const ordersDiffer = gridOrder.length !== bookOrder.length ||
     gridOrder.some((id, index) => id !== bookOrder[index]);

   setIsOutOfSync(ordersDiffer);
 }, [gridSlots, atomPages, isOpen, bookDraft]);

 // Initialize pages
 useEffect(() => {
   if (isOpen && !hasInitialized && !bookDraft) {
     syncPages();
     setHasInitialized(true);
   }
 }, [isOpen, hasInitialized, syncPages, bookDraft]);

 // Reset initialization when dialog closes
 useEffect(() => {
   if (!isOpen) {
     setHasInitialized(false);
   }
 }, [isOpen]);

 // Update background color when dark mode changes
 useEffect(() => {
   setLightingConfig(prev => ({
     ...prev,
     backgroundColor: darkMode ? '#1a1a1a' : '#2c3e50'
   }));
 }, [darkMode]);

 // Keyboard navigation
 useEffect(() => {
   if (!isOpen) return;
   
   const handleKeyDown = (e) => {
     switch (e.key) {
       case 'ArrowLeft':
         e.preventDefault();
         handlePageChange(currentPage - 1);
         break;
       case 'ArrowRight':
         e.preventDefault();
         handlePageChange(currentPage + 1);
         break;
       case 'Home':
         e.preventDefault();
         handlePageChange(0);
         break;
       case 'End':
         e.preventDefault();
         handlePageChange(atomPages.length);
         break;
     }
   };

   window.addEventListener('keydown', handleKeyDown);
   return () => window.removeEventListener('keydown', handleKeyDown);
 }, [isOpen, currentPage, atomPages.length, handlePageChange]);

 // Check for placeholder replacements when media files change
 useEffect(() => {
   if (!isOpen || atomPages.length === 0) return;

   let hasReplacements = false;
   const updatedPages = atomPages.map(page => {
     const newPage = { ...page };
     
     // Check front page
     if (page.front) {
       const currentMedia = mediaFiles.find(m => m.name === page.front || m.id === page.front);
       if (currentMedia && !currentMedia.isPlaceholder) {
         // Check if there was a placeholder for this
         const placeholderName = `[Missing] ${page.front}`;
         const hasPlaceholder = mediaFiles.some(m => m.name === placeholderName && m.isPlaceholder);
         if (hasPlaceholder) {
           hasReplacements = true;
           console.log(`Replacing placeholder for front: ${page.front}`);
         }
       }
     }
     
     // Check back page
     if (page.back) {
       const currentMedia = mediaFiles.find(m => m.name === page.back || m.id === page.back);
       if (currentMedia && !currentMedia.isPlaceholder) {
         // Check if there was a placeholder for this
         const placeholderName = `[Missing] ${page.back}`;
         const hasPlaceholder = mediaFiles.some(m => m.name === placeholderName && m.isPlaceholder);
         if (hasPlaceholder) {
           hasReplacements = true;
           console.log(`Replacing placeholder for back: ${page.back}`);
         }
       }
     }
     
     return newPage;
   });

   if (hasReplacements && onCheckForPlaceholderReplacements) {
     // Notify parent to clean up placeholders
     onCheckForPlaceholderReplacements();
   }
 }, [mediaFiles, atomPages, isOpen, onCheckForPlaceholderReplacements]);

 // Handle text page creation
 const handleCreateTextPages = useCallback((pageDataArray) => {
   if (onAddMediaFiles) {
     // Add the text pages to media files
     onAddMediaFiles(pageDataArray);
   }

   // Update the book draft to include new text pages
   setTimeout(() => {
     // Get the newly added text pages
     const newTextPages = pageDataArray.map(pd => pd.name || pd.id);
     
     // Create new pages for the book
     const textBookPages = [];
     for (let i = 0; i < newTextPages.length; i += 2) {
       textBookPages.push({
         front: newTextPages[i],
         back: newTextPages[i + 1] || null
       });
     }
     
     // Append to current pages
     const updatedPages = [...atomPages, ...textBookPages];
     setAtomPages(updatedPages);
     
     // Update draft if exists
     if (bookDraft) {
       setBookDraft({
         ...bookDraft,
         pages: updatedPages,
         timestamp: new Date().toISOString()
       });
     }
     
     // Mark as out of sync
     setIsOutOfSync(true);
     
     // Update grid slots to include text pages
     if (onUpdateGridSlots) {
       const newSlots = [...gridSlots, ...pageDataArray];
       onUpdateGridSlots(newSlots);
     }
   }, 100);

 }, [onAddMediaFiles, atomPages, setAtomPages, bookDraft, gridSlots, onUpdateGridSlots]);

 // Handle saving book to bookshelf
 const handleSaveToShelf = ({ title, description, author, color }) => {
   // Use current book page order (atomPages) not grid order
   const pages = atomPages.map((page, index) => {
     const formatMedia = (mediaRef) => {
       if (!mediaRef || mediaRef === 'blank') return null;
       
       // Find the actual media object
       const media = mediaFiles.find(m => m.name === mediaRef || m.id === mediaRef);
       if (!media) {
         // If media not found, it might be a placeholder
         return {
           id: mediaRef,
           name: mediaRef,
           url: '',
           type: 'placeholder',
           thumbnail: '',
           isPlaceholder: true,
           isMissing: true
         };
       }

       return {
         id: media.id,
         name: media.name,
         url: media.url || '',
         type: media.type || media.fileType || 'image',
         thumbnail: media.thumbnail || media.thumbnailUrl || '',
         isTextPage: media.isTextPage || false,
         metadata: media.metadata || {}
       };
     };

     return {
       id: `page_${index}`,
       front: formatMedia(page.front),
       back: formatMedia(page.back)
     };
   });

   const bookData = {
     id: `book-${Date.now()}`,
     title,
     author,
     description,
     createdAt: new Date().toISOString(),
     color,
     volumeMetadata: {
       pageCount: pages.length,
       coverMaterial: 'hardcover',
       pageWidth: bookConfig.pageWidth,
       pageHeight: bookConfig.pageHeight,
       pageDepth: bookConfig.pageDepth,
       ...bookVolumeMetadata
     },
     pages: pages,
     metadata: {
       created: new Date().toISOString(),
       gridConfig: gridConfig,
       pageMapping: pageMapping,
       sourceType: freeGridItems && Object.keys(freeGridItems).length > 0 ? 'freegrid' : 'standard',
       totalItems: pages.length,
       bookOrder: true, // Indicates this uses book order, not grid order
       isDraft: !!bookDraft
     }
   };

   onSaveToBookshelf(bookData);
   setShowSaveDialog(false);

   // Show success notification
   const notification = document.createElement('div');
   notification.className = 'fixed bottom-4 right-4 bg-green-600 text-white px-4 py-2 rounded shadow-lg z-50 flex items-center';
   notification.innerHTML = `
     <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
       <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
     </svg>
     <span>"${title}" saved to bookshelf!</span>
   `;
   document.body.appendChild(notification);
   setTimeout(() => notification.remove(), 3000);
 };

 if (!isOpen) return null;

 return (
   <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 text-gray-700 dark:text-gray-300">
     <div className={`bg-white dark:bg-gray-900 rounded-lg shadow-2xl flex flex-col ${isMaximized ? 'w-full h-full' : 'w-11/12 h-5/6 max-w-7xl'
       }`}>
       {/* Header */}
       <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
         <div className="flex items-center space-x-3">
           <BookIcon size={24} className="text-purple-600" />
           <span className="text-xl font-semibold text-gray-700 dark:text-gray-300">
             3D Book Viewer
             {bookDraft && <span className="text-sm text-blue-500 ml-2">(Draft)</span>}
           </span>
           {atomPages.length > 0 && (
             <span className="text-sm text-gray-500 dark:text-gray-400">
               {currentPage === atomPages.length ? 'Back Cover' : `Page ${currentPage + 1} of ${atomPages.length}`}
             </span>
           )}
           

           {/* Out of Sync indicator */}
           {isOutOfSync && (
             <button
               onClick={handleManualSync}
               className="text-xs bg-orange-100 hover:bg-orange-200 text-orange-700 px-3 py-1 rounded-full 
                 flex items-center gap-1 transition-colors cursor-pointer animate-pulse"
               title="Book order differs from grid - click to sync"
             >
               <RefreshCw size={12} />
               Out of Sync
             </button>
           )}

           <button
             onClick={() => {
               if (atomPages.length > 0) {
                 setShowPageMapping(true);
               } else {
                 if (window.confirm('No pages in book yet. Create book from current grid?')) {
                   syncPages();
                   setTimeout(() => setShowPageMapping(true), 100);
                 }
               }
             }}
             className="px-3 py-1.5 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded 
               hover:from-purple-700 hover:to-blue-700 transition-all duration-200 
               shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center space-x-2
               text-sm"
             title="Create Custom Book Page Order"
           >
             <Grid size={14} />
             <span className="font-medium">Page Mapping</span>
           </button>
         </div>

         <div className="flex items-center space-x-2">
           {/* Navigation controls */}
           {atomPages.length > 0 && (
             <>
               <button
                 onClick={() => handlePageChange(currentPage - 1)}
                 disabled={currentPage === 0}
                 className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                 title="Previous Page"
               >
                 <ChevronLeft size={18} />
               </button>

               <button
                 onClick={() => handlePageChange(currentPage + 1)}
                 disabled={currentPage >= atomPages.length}
                 className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                 title="Next Page"
               >
                 <ChevronRight size={18} />
               </button>

               <div className="border-l border-gray-200 dark:border-gray-700 pl-2">
                 <button
                   onClick={() => setShowLighting(!showLighting)}
                   className={`p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${showLighting ? 'bg-gray-100 dark:bg-gray-700' : ''}`}
                   title="Lighting Controls"
                 >
                   <Lightbulb size={18} />
                 </button>

                 <button
                   onClick={() => setShowSettings(!showSettings)}
                   className={`p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${showSettings ? 'bg-gray-100 dark:bg-gray-700' : ''}`}
                   title="Book Settings"
                 >
                   <Sliders size={18} />
                 </button>

                 <button
                   onClick={() => setThumbnailsDocked(!thumbnailsDocked)}
                   className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                   title={thumbnailsDocked ? "Show Thumbnails" : "Hide Thumbnails"}
                 >
                   {thumbnailsDocked ? <LayoutGrid size={18} /> : <List size={18} />}
                 </button>

                 <button
                   onClick={() => setAutoRotate(!autoRotate)}
                   className={`p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${autoRotate ? 'text-blue-600' : ''}`}
                   title={autoRotate ? "Stop Auto-rotate" : "Start Auto-rotate"}
                 >
                   <RotateCw size={18} />
                 </button>
               </div>
             </>
           )}

           {/* Book builder tools */}
           <div className="border-l border-gray-200 dark:border-gray-700 pl-2">
             <button
               onClick={() => {
                 if (atomPages.length === 0) {
                   alert('Please create some pages first using "Create Book" or "Page Mapping"');
                   return;
                 }
                 setShowSaveDialog(true);
               }}
               className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-400 transition-colors"
               title="Save Book to Bookshelf"
             >
               <Save size={18} />
             </button>


             <button
               onClick={() => setShow2DBookViewer(true)}
               className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
               title="2D Book Preview"
             >
               <Eye size={18} />
             </button>
           </div>

           <button
             onClick={() => setIsMaximized(!isMaximized)}
             className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
             title={isMaximized ? "Restore" : "Maximize"}
           >
             {isMaximized ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
           </button>

           <button
             onClick={onClose}
             className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
           >
             <X size={18} />
           </button>
         </div>
       </div>

       {/* 3D Book Content or 2D Preview */}
       <div
         className="flex-1 relative transition-colors duration-300"
         style={{ backgroundColor: lightingConfig.backgroundColor }}
       >
         {/* Canvas Container */}
         <div className="absolute inset-0">
           {atomPages.length > 0 ? (
             <>
               {/* Show 2D preview if textures aren't loaded yet */}
               {!atomPages.every(page => 
                 (!page.front || mediaFiles.find(m => m.name === page.front || m.id === page.front)) &&
                 (!page.back || mediaFiles.find(m => m.name === page.back || m.id === page.back))
               ) ? (
                 <div className="h-full flex items-center justify-center">
                   <div className="text-center">
                     <div className="mb-4">
                       <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
                     </div>
                     <p className="text-lg mb-2 text-gray-600 dark:text-gray-300">Loading book textures...</p>
                     <button
                       onClick={() => setShow2DBookViewer(true)}
                       className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                     >
                       View 2D Preview While Loading
                     </button>
                   </div>
                 </div>
               ) : (
                 <Canvas
                   shadows
                   camera={{ position: [0, -5, 2], fov: 45 }}
                   gl={{
                     antialias: true,
                     alpha: true,
                     powerPreference: 'high-performance',
                     shadowMap: {
                       enabled: true,
                       type: THREE.PCFSoftShadowMap
                     }
                   }}
                   style={{ background: 'transparent' }}
                 >
                   <Suspense fallback={
                     <Html center>
                       <div className="text-white bg-black/50 px-4 py-2 rounded">
                         <div className="animate-spin w-8 h-8 border-4 border-white border-t-transparent rounded-full mx-auto mb-2"></div>
                         Loading Book...
                       </div>
                     </Html>
                   }>
                     <BookScene
                       atomPages={atomPages}
                       bookVolumeMetadata={bookVolumeMetadata}
                       mediaFiles={mediaFiles}
                       autoRotate={autoRotate}
                       bookConfig={bookConfig}
                       lightingConfig={lightingConfig}
                     />
                   </Suspense>
                 </Canvas>
               )}
             </>
           ) : (
             <div className="h-full flex items-center justify-center text-gray-400">
               <div className="text-center">
                 <BookIcon size={48} className="mx-auto mb-4 opacity-20" />
                 <p className="text-lg mb-4">No pages in book yet</p>
                 <div className="space-y-2">
                   <button
                     onClick={syncPages}
                     className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
                   >
                     Load from Grid
                   </button>
                 </div>
               </div>
             </div>
           )}
         </div>

         {/* UI Overlay Container with proper constraints to prevent overflow */}
         <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 1000 }}>
           {/* Settings Panel - constrained positioning */}
           {showSettings && (
             <div className="absolute top-4 right-4 max-w-xs max-h-[calc(100vh-12rem)] pointer-events-auto">
               <SettingsPanel
                 bookConfig={bookConfig}
                 setBookConfig={setBookConfig}
                 onClose={() => setShowSettings(false)}
               />
             </div>
           )}

           {/* Lighting Panel - constrained positioning and size */}
           {showLighting && (
             <div className="absolute top-4 left-4 max-w-sm max-h-[calc(100vh-12rem)] pointer-events-auto">
               <LightingPanel
                 lightingConfig={lightingConfig}
                 setLightingConfig={setLightingConfig}
                 darkMode={darkMode}
                 onClose={() => setShowLighting(false)}
               />
             </div>
           )}

           {/* Thumbnails positioned to not conflict with panels */}
           {atomPages.length > 0 && !showPageMapping && (
             <div className="pointer-events-auto" style={{
               paddingLeft: showLighting ? '25rem' : '0',
               paddingRight: showSettings ? '20rem' : '0'
             }}>
               <PageThumbnails
                 atomPages={atomPages}
                 currentPage={currentPage}
                 handleThumbnailClick={handleThumbnailClick}
                 getMediaThumbnail={getMediaThumbnail}
                 isTextPage={isTextPage}
                 isDocked={thumbnailsDocked}
                 onToggleDock={() => setThumbnailsDocked(!thumbnailsDocked)}
                 mediaFiles={mediaFiles}
               />
             </div>
           )}
         </div>
       </div>

       {/* Dialogs */}
       {show2DBookViewer && (
         <AnimatedBookViewer
           isOpen={show2DBookViewer}
           onClose={() => setShow2DBookViewer(false)}
           bookData={{
             pages: atomPages,
             volumeMetadata: bookVolumeMetadata || {},
             mediaFiles: mediaFiles || []
           }}
           volumeMetadata={bookVolumeMetadata}
           mediaFiles={mediaFiles}
           embedded={true}
         />
       )}

       {showPageMapping && (
         <PageMappingDialog
           gridSlots={gridSlots || []}
           gridConfig={gridConfig || { columns: 4, rows: 5 }}
           mediaFiles={mediaFiles || []}
           currentMapping={bookDraft ? bookDraft.pages : atomPages}
           onConfirm={handlePageMappingConfirm}
           onCancel={() => setShowPageMapping(false)}
           darkMode={darkMode}
         />
       )}


       {showSaveDialog && (
         <SaveBookDialog
           onSave={handleSaveToShelf}
           onCancel={() => setShowSaveDialog(false)}
           currentPages={atomPages}
           mediaFiles={mediaFiles}
         />
       )}
     </div>
   </div>
 );
};

export default Book3DViewerPanel;