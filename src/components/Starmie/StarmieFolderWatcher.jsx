import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  FolderOpen, Play, Pause, RefreshCw, Settings, 
  CheckCircle, AlertCircle, Upload, Clock
} from 'lucide-react';
import { MediaFile } from '../MediaGrid/MediaModel.js';

const StarmieFolderWatcher = ({ 
  onImport, 
  darkMode, 
  showNotification 
}) => {
  const [watchFolder, setWatchFolder] = useState('');
  const [isWatching, setIsWatching] = useState(false);
  const [syncInterval, setSyncInterval] = useState(5000); // 5 seconds
  const [lastSync, setLastSync] = useState(null);
  const [processedFiles, setProcessedFiles] = useState(new Set());
  const [pendingFiles, setPendingFiles] = useState([]);
  const [stats, setStats] = useState({ total: 0, imported: 0, pending: 0 });
  
  const fileInputRef = useRef(null);
  const intervalRef = useRef(null);
  const manifestCache = useRef({});

  // Handle folder selection
  const handleFolderSelect = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    // Get folder path from first file
    const firstFile = files[0];
    const folderPath = firstFile.webkitRelativePath ? 
      firstFile.webkitRelativePath.split('/')[0] : 
      'Selected Folder';
    
    setWatchFolder(folderPath);
    
    // Initial scan
    await scanFolder(files);
  };

  // Scan folder for new files
  const scanFolder = useCallback(async (files) => {
    const imageFiles = files.filter(file => 
      file.type.startsWith('image/') || 
      file.name.match(/\.(jpg|jpeg|png|gif|webp|bmp)$/i)
    );

    // Check for manifest
    const manifestFile = files.find(f => f.name === '.starmie-manifest.json');
    if (manifestFile) {
      try {
        const text = await manifestFile.text();
        manifestCache.current = JSON.parse(text);
      } catch (error) {
        console.error('Error reading manifest:', error);
      }
    }

    // Find new files
    const newFiles = imageFiles.filter(file => 
      !processedFiles.has(file.name)
    );

    setPendingFiles(newFiles);
    setStats({
      total: imageFiles.length,
      imported: processedFiles.size,
      pending: newFiles.length
    });

    return newFiles;
  }, [processedFiles]);

  // Import pending files
  const importPendingFiles = useCallback(async () => {
    if (pendingFiles.length === 0) return;

    const mediaFiles = [];
    const newProcessed = new Set(processedFiles);

    for (const file of pendingFiles) {
      try {
        const mediaFile = new MediaFile(file);
        
        // Add metadata from manifest if available
        if (manifestCache.current?.items) {
          const manifestItem = manifestCache.current.items.find(
            item => item.filename === file.name
          );
          if (manifestItem) {
            mediaFile.metadata = {
              ...mediaFile.metadata,
              starmie: {
                starred: true,
                starredAt: manifestItem.starred_at,
                folder: watchFolder,
                id: manifestItem.id
              }
            };
            mediaFile.tags = [...(mediaFile.tags || []), '⭐ Auto-imported'];
          }
        }

        // Generate thumbnail
        if (mediaFile.type.startsWith('image/')) {
          await mediaFile.generateThumbnail();
        }

        mediaFiles.push(mediaFile);
        newProcessed.add(file.name);
      } catch (error) {
        console.error(`Error processing ${file.name}:`, error);
      }
    }

    if (mediaFiles.length > 0 && onImport) {
      onImport(mediaFiles);
      setProcessedFiles(newProcessed);
      setPendingFiles([]);
      setLastSync(new Date());
      showNotification?.(
        `Auto-imported ${mediaFiles.length} new images from ${watchFolder}`, 
        'success'
      );
    }
  }, [pendingFiles, processedFiles, watchFolder, onImport, showNotification]);

  // Auto-import effect
  useEffect(() => {
    if (pendingFiles.length > 0 && isWatching) {
      importPendingFiles();
    }
  }, [pendingFiles, isWatching, importPendingFiles]);

  // Watching interval
  useEffect(() => {
    if (isWatching && watchFolder) {
      // Import immediately
      importPendingFiles();
      
      // Set up interval
      intervalRef.current = setInterval(() => {
        // In a real implementation, we'd re-scan the folder
        // For browser limitations, user needs to re-select folder
        showNotification?.(
          'Re-select folder to check for new files (browser limitation)', 
          'info'
        );
      }, syncInterval);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [isWatching, watchFolder, syncInterval, importPendingFiles, showNotification]);

  const toggleWatching = () => {
    setIsWatching(!isWatching);
    if (!isWatching) {
      showNotification?.(`Started watching ${watchFolder}`, 'success');
    } else {
      showNotification?.('Stopped watching folder', 'info');
    }
  };

  const formatTime = (date) => {
    if (!date) return 'Never';
    return date.toLocaleTimeString();
  };

  return (
    <div className={`p-4 ${darkMode ? 'bg-gray-900' : 'bg-gray-50'} rounded-lg`}>
      <h4 className={`text-md font-semibold mb-4 flex items-center ${
        darkMode ? 'text-white' : 'text-gray-900'
      }`}>
        <Clock className="mr-2" size={18} />
        Folder Auto-Sync
      </h4>

      {/* Folder selector */}
      <div className="mb-4">
        <label className={`flex items-center justify-center px-4 py-3 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
          darkMode 
            ? 'border-gray-600 hover:border-gray-500 bg-gray-800' 
            : 'border-gray-300 hover:border-gray-400 bg-white'
        }`}>
          <FolderOpen className="mr-2" size={20} />
          <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>
            {watchFolder || 'Select Folder to Watch'}
          </span>
          <input
            ref={fileInputRef}
            type="file"
            webkitdirectory="true"
            directory="true"
            multiple
            onChange={handleFolderSelect}
            className="hidden"
          />
        </label>
      </div>

      {/* Sync settings */}
      {watchFolder && (
        <>
          <div className="mb-4 flex items-center space-x-4">
            <label className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Check every:
            </label>
            <select
              value={syncInterval}
              onChange={(e) => setSyncInterval(parseInt(e.target.value))}
              disabled={isWatching}
              className={`text-sm px-2 py-1 rounded ${
                darkMode 
                  ? 'bg-gray-700 text-gray-300 border-gray-600' 
                  : 'bg-white text-gray-700 border-gray-300'
              } border`}
            >
              <option value="5000">5 seconds</option>
              <option value="10000">10 seconds</option>
              <option value="30000">30 seconds</option>
              <option value="60000">1 minute</option>
            </select>
          </div>

          {/* Control buttons */}
          <div className="flex space-x-2 mb-4">
            <button
              onClick={toggleWatching}
              className={`flex-1 flex items-center justify-center px-4 py-2 rounded font-medium transition-colors ${
                isWatching
                  ? darkMode 
                    ? 'bg-red-600 hover:bg-red-700 text-white' 
                    : 'bg-red-500 hover:bg-red-600 text-white'
                  : darkMode
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'bg-green-500 hover:bg-green-600 text-white'
              }`}
            >
              {isWatching ? (
                <>
                  <Pause size={16} className="mr-2" />
                  Stop Watching
                </>
              ) : (
                <>
                  <Play size={16} className="mr-2" />
                  Start Watching
                </>
              )}
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className={`px-4 py-2 rounded transition-colors ${
                darkMode 
                  ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' 
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
              }`}
              title="Re-scan folder"
            >
              <RefreshCw size={16} />
            </button>
          </div>

          {/* Status */}
          <div className={`p-3 rounded-lg ${
            darkMode ? 'bg-gray-800' : 'bg-gray-100'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-sm font-medium ${
                darkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Status
              </span>
              {isWatching ? (
                <span className="flex items-center text-green-500 text-sm">
                  <CheckCircle size={14} className="mr-1" />
                  Watching
                </span>
              ) : (
                <span className="flex items-center text-gray-500 text-sm">
                  <AlertCircle size={14} className="mr-1" />
                  Not watching
                </span>
              )}
            </div>

            <div className={`space-y-1 text-sm ${
              darkMode ? 'text-gray-400' : 'text-gray-600'
            }`}>
              <div className="flex justify-between">
                <span>Total images:</span>
                <span className="font-medium">{stats.total}</span>
              </div>
              <div className="flex justify-between">
                <span>Imported:</span>
                <span className="font-medium text-green-600">{stats.imported}</span>
              </div>
              <div className="flex justify-between">
                <span>Pending:</span>
                <span className="font-medium text-yellow-600">{stats.pending}</span>
              </div>
              <div className="flex justify-between">
                <span>Last sync:</span>
                <span className="font-medium">{formatTime(lastSync)}</span>
              </div>
            </div>
          </div>

          {/* Browser limitation notice */}
          <div className={`mt-3 p-2 rounded text-xs ${
            darkMode ? 'bg-yellow-900 text-yellow-300' : 'bg-yellow-100 text-yellow-800'
          }`}>
            <p className="font-medium mb-1">Browser Limitation:</p>
            <p>Due to browser security, you need to re-select the folder periodically to check for new files. Consider using the manual "Browse Folder" option for better control.</p>
          </div>
        </>
      )}
    </div>
  );
};

export default StarmieFolderWatcher;