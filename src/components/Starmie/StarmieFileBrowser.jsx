import React, { useState, useCallback } from 'react';
import { Folder, Image, RefreshCw, Download, FolderOpen, Check } from 'lucide-react';
import { MediaFile } from '../MediaGrid/MediaModel.js';

const StarmieFileBrowser = ({ 
  onImport, 
  darkMode, 
  showNotification 
}) => {
  const [folderPath, setFolderPath] = useState('');
  const [files, setFiles] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState(new Set());
  const [manifest, setManifest] = useState(null);

  // Common ComfyUI paths to try
  const commonPaths = [
    'C:/Users/emman/Documents/ComfyUI/selected-output',
    'C:/ComfyUI/selected-output',
    'C:/Users/emman/Desktop/ComfyUI/selected-output',
    '../ComfyUI/selected-output',
    './selected-output'
  ];

  const handleFolderSelect = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    // Get the directory path from the first file
    const firstFilePath = files[0].webkitRelativePath || files[0].name;
    const folderName = firstFilePath.split('/')[0];
    
    setFolderPath(folderName);
    setIsLoading(true);

    try {
      // Filter for image files
      const imageFiles = files.filter(file => 
        file.type.startsWith('image/') || 
        file.name.match(/\.(jpg|jpeg|png|gif|webp|bmp)$/i)
      );

      // Look for manifest file
      const manifestFile = files.find(f => f.name === '.starmie-manifest.json');
      if (manifestFile) {
        const text = await manifestFile.text();
        const manifestData = JSON.parse(text);
        setManifest(manifestData);
      }

      setFiles(imageFiles);
      showNotification?.(`Found ${imageFiles.length} images in ${folderName}`, 'success');
    } catch (error) {
      console.error('Error loading folder:', error);
      showNotification?.('Error loading folder', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleFileSelection = (file) => {
    const newSelected = new Set(selectedFiles);
    if (newSelected.has(file)) {
      newSelected.delete(file);
    } else {
      newSelected.add(file);
    }
    setSelectedFiles(newSelected);
  };

  const selectAll = () => {
    if (selectedFiles.size === files.length) {
      setSelectedFiles(new Set());
    } else {
      setSelectedFiles(new Set(files));
    }
  };

  const importSelected = async () => {
    if (selectedFiles.size === 0) {
      showNotification?.('No files selected', 'warning');
      return;
    }

    setIsLoading(true);
    const mediaFiles = [];

    try {
      for (const file of selectedFiles) {
        const mediaFile = new MediaFile(file);
        
        // Add Starmie metadata if available from manifest
        if (manifest) {
          const manifestItem = manifest.items.find(item => 
            item.filename === file.name
          );
          if (manifestItem) {
            mediaFile.metadata = {
              ...mediaFile.metadata,
              starmie: {
                starred: true,
                starredAt: manifestItem.starred_at,
                tag: manifestItem.tag || 'starred',
                id: manifestItem.id
              }
            };
            mediaFile.tags = [...(mediaFile.tags || []), '⭐ Starred'];
          }
        }

        // Generate thumbnail if needed
        if (mediaFile.type.startsWith('image/')) {
          await mediaFile.generateThumbnail();
        }

        mediaFiles.push(mediaFile);
      }

      if (onImport) {
        onImport(mediaFiles);
        showNotification?.(`Imported ${mediaFiles.length} files from Starmie folder`, 'success');
        setSelectedFiles(new Set());
      }
    } catch (error) {
      console.error('Error importing files:', error);
      showNotification?.('Error importing files', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`p-4 ${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-lg`}>
      <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
        Browse Starmie Folder
      </h3>

      {/* Folder selector */}
      <div className="mb-4">
        <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
          Select ComfyUI selected-output folder:
        </label>
        
        <div className="flex gap-2">
          <label className={`flex-1 flex items-center justify-center px-4 py-2 border rounded-lg cursor-pointer
            ${darkMode 
              ? 'border-gray-600 bg-gray-700 hover:bg-gray-600 text-gray-300' 
              : 'border-gray-300 bg-gray-50 hover:bg-gray-100 text-gray-700'}
            transition-colors`}>
            <FolderOpen className="mr-2" size={20} />
            Browse for Folder
            <input
              type="file"
              webkitdirectory="true"
              directory="true"
              multiple
              onChange={handleFolderSelect}
              className="hidden"
              accept="image/*"
            />
          </label>
        </div>

        {/* Common paths hint */}
        <div className={`mt-2 text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
          <p>Common locations:</p>
          {commonPaths.slice(0, 2).map((path, idx) => (
            <p key={idx} className="font-mono">{path}</p>
          ))}
        </div>
      </div>

      {/* Current folder */}
      {folderPath && (
        <div className={`mb-4 p-2 rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
          <div className="flex items-center">
            <Folder size={16} className="mr-2" />
            <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              {folderPath}
            </span>
            {manifest && (
              <span className="ml-auto text-xs text-green-600">
                ✓ Manifest found
              </span>
            )}
          </div>
        </div>
      )}

      {/* File list */}
      {files.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              {files.length} images found
            </span>
            <button
              onClick={selectAll}
              className={`text-sm px-2 py-1 rounded ${
                darkMode 
                  ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' 
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
              } transition-colors`}
            >
              {selectedFiles.size === files.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>

          <div className={`max-h-60 overflow-y-auto border rounded-lg p-2 ${
            darkMode ? 'border-gray-600 bg-gray-900' : 'border-gray-300 bg-gray-50'
          }`}>
            {files.map((file, idx) => (
              <div
                key={idx}
                onClick={() => toggleFileSelection(file)}
                className={`flex items-center p-2 rounded cursor-pointer transition-colors ${
                  selectedFiles.has(file)
                    ? darkMode ? 'bg-blue-900 text-blue-300' : 'bg-blue-100 text-blue-700'
                    : darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'
                }`}
              >
                <Image size={16} className="mr-2 flex-shrink-0" />
                <span className={`text-sm truncate ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  {file.name}
                </span>
                <span className={`ml-auto text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                  {(file.size / 1024 / 1024).toFixed(1)}MB
                </span>
                {selectedFiles.has(file) && (
                  <Check size={16} className="ml-2 text-green-500" />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Import button */}
      {selectedFiles.size > 0 && (
        <button
          onClick={importSelected}
          disabled={isLoading}
          className={`w-full flex items-center justify-center space-x-2 px-4 py-2 rounded
            ${darkMode 
              ? 'bg-green-600 hover:bg-green-700 text-white disabled:bg-gray-700' 
              : 'bg-green-500 hover:bg-green-600 text-white disabled:bg-gray-300'}
            disabled:cursor-not-allowed transition-colors`}
        >
          <Download size={16} />
          <span>Import {selectedFiles.size} Selected Images</span>
        </button>
      )}

      {isLoading && (
        <div className="flex items-center justify-center py-4">
          <RefreshCw className="animate-spin" size={24} />
        </div>
      )}
    </div>
  );
};

export default StarmieFileBrowser;