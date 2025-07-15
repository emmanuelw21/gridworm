import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Star, CheckCircle, AlertCircle, Play, Pause, 
  ChevronUp, ChevronDown, Server, RefreshCw, X, FolderOpen, Check
} from 'lucide-react';
import { processFile, isVideo } from '../MediaGrid/helpers.js';
import { enhancedThumbnailManager } from '../../utils/enhancedThumbnailManager';
import { useAtom } from 'jotai';
import { showStarmiePanelAtom } from '../../store.js';

const StarmiePanel = ({ 
  onImport, 
  darkMode, 
  showNotification,
  isVisible = true 
}) => {
  const [showStarmiePanel, setShowStarmiePanel] = useAtom(showStarmiePanelAtom);
  const [isExpanded, setIsExpanded] = useState(false);
  const [bridgeUrl] = useState('http://localhost:5555');
  const [isConnected, setIsConnected] = useState(false);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [watchFolder, setWatchFolder] = useState('');
  const [customFolder, setCustomFolder] = useState('');
  const [isEditingFolder, setIsEditingFolder] = useState(false);
  const [stats, setStats] = useState({ imported: 0 });
  const [lastCheck, setLastCheck] = useState(null);
  const [hasBeenAccessed, setHasBeenAccessed] = useState(false);
  
  const intervalRef = useRef(null);
  const processedFiles = useRef(new Set());
  const lastTimestamp = useRef(null);
  const folderInputRef = useRef(null);

  // Check bridge connection
  const checkBridgeConnection = useCallback(async () => {
    try {
      const response = await fetch(`${bridgeUrl}/starmie/status`);
      if (response.ok) {
        const data = await response.json();
        setIsConnected(true);
        setWatchFolder(data.watching || '');
        return true;
      }
    } catch (error) {
      // Silent fail
    }
    setIsConnected(false);
    return false;
  }, [bridgeUrl]);

  // Check for new files
  const checkForNewFiles = useCallback(async () => {
    if (!isConnected || !isMonitoring) return;

    try {
      // Always get changes - bridge handles what's new
      const response = await fetch(`${bridgeUrl}/starmie/changes`);
      if (!response.ok) return;

      const data = await response.json();
      
      if (data.changes && data.changes.length > 0) {
        console.log(`Bridge returned ${data.changes.length} new files`);
        await importFiles(data.changes);
      }
      
      setLastCheck(new Date());
    } catch (error) {
      console.error('Error checking for files:', error);
    }
  }, [isConnected, isMonitoring, bridgeUrl]);

  // Import files from bridge
  const importFiles = async (fileInfos) => {
    const newMediaFiles = [];
    console.log(`Importing ${fileInfos.length} files from bridge`);
    
    for (const fileInfo of fileInfos) {
      if (processedFiles.current.has(fileInfo.id)) {
        console.log(`Skipping already processed: ${fileInfo.name}`);
        continue;
      }
      
      try {
        const response = await fetch(`${bridgeUrl}/starmie/file/${fileInfo.id}`);
        if (!response.ok) continue;
        
        const blob = await response.blob();
        // Use the type from fileInfo if blob.type is generic
        const mimeType = blob.type === 'application/octet-stream' && fileInfo.type 
          ? fileInfo.type 
          : blob.type;
        const file = new File([blob], fileInfo.name, { type: mimeType });
        console.log(`Processing ${fileInfo.name} with type: ${mimeType}`);
        
        // Process the file using the same helper as file uploads
        const processedFile = processFile(file);
        if (!processedFile) {
          console.error(`Failed to process file: ${fileInfo.name}`);
          continue;
        }
        
        // Add Starmie metadata
        processedFile.metadata = {
          ...processedFile.metadata,
          starmie: {
            starred: true,
            importedAt: new Date().toISOString(),
            bridgeImport: true,
            watchedFolder: watchFolder,
            originalPath: fileInfo.path
          }
        };
        
        // Add Starmie tag  
        if (!processedFile.metadata.tags) {
          processedFile.metadata.tags = [];
        }
        
        // Tag based on likely source
        const fileName = fileInfo.name.toLowerCase();
        if (fileName.includes('comfyui') || fileName.match(/^\d{8}_\d{6}_/)) {
          processedFile.metadata.tags.push('🎨 ComfyUI');
        } else {
          processedFile.metadata.tags.push('📁 Folder Import');
        }
        processedFile.metadata.tags.push('⭐ Starmie');
        
        // Generate thumbnail for videos
        if (isVideo(processedFile.type)) {
          console.log(`Generating thumbnail for video: ${processedFile.name}`);
          try {
            const thumbnailUrl = await enhancedThumbnailManager.getOrGenerateThumbnail(processedFile);
            if (thumbnailUrl) {
              processedFile.thumbnail = thumbnailUrl;
              console.log(`Video thumbnail generated for: ${processedFile.name}`);
            }
          } catch (error) {
            console.error(`Failed to generate video thumbnail for ${processedFile.name}:`, error);
          }
        }
        
        newMediaFiles.push(processedFile);
        processedFiles.current.add(fileInfo.id);
      } catch (error) {
        console.error(`Failed to import ${fileInfo.name}:`, error);
      }
    }
    
    if (newMediaFiles.length > 0 && onImport) {
      onImport(newMediaFiles);
      showNotification?.(`Imported ${newMediaFiles.length} files`, 'success');
      
      setStats(prev => ({
        ...prev,
        imported: prev.imported + newMediaFiles.length
      }));
    }
  };

  // Mark as accessed when panel is shown
  useEffect(() => {
    if (showStarmiePanel && !hasBeenAccessed) {
      setHasBeenAccessed(true);
    }
  }, [showStarmiePanel, hasBeenAccessed]);

  // Connection check - only after panel has been accessed at least once
  useEffect(() => {
    if (!hasBeenAccessed) return;
    
    checkBridgeConnection();
    const interval = setInterval(checkBridgeConnection, 10000);
    return () => clearInterval(interval);
  }, [hasBeenAccessed, checkBridgeConnection]);

  // Monitoring
  useEffect(() => {
    if (isMonitoring && isConnected) {
      checkForNewFiles();
      intervalRef.current = setInterval(checkForNewFiles, 3000);
      
      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [isMonitoring, isConnected, checkForNewFiles]);

  const toggleMonitoring = () => {
    setIsMonitoring(!isMonitoring);
    if (!isMonitoring) {
      processedFiles.current.clear();
      // Don't use timestamp anymore - bridge handles what's new
      lastTimestamp.current = null;
    }
  };

  const handleRefresh = async () => {
    if (!isConnected) return;
    
    try {
      // Use the import-all endpoint
      const response = await fetch(`${bridgeUrl}/starmie/import-all`);
      if (!response.ok) return;
      
      const data = await response.json();
      console.log(`Found ${data.count} files to import`);
      
      if (data.files && data.files.length > 0) {
        console.log('Files to import:', data.files);
        // Clear processed files to allow re-import
        processedFiles.current.clear();
        // Import all files
        await importFiles(data.files);
        showNotification?.(`Imported ${data.files.length} files from folder`, 'success');
      } else {
        showNotification?.('No files found in folder', 'info');
      }
    } catch (error) {
      console.error('Error importing all files:', error);
      showNotification?.('Failed to import files', 'error');
    }
  };

  const updateWatchFolder = async (importExisting = false) => {
    if (!customFolder.trim()) return;
    
    try {
      const response = await fetch(`${bridgeUrl}/starmie/watch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: customFolder.trim() })
      });
      
      if (response.ok) {
        const data = await response.json();
        setWatchFolder(data.watching);
        setIsEditingFolder(false);
        showNotification?.(`Now watching: ${data.watching}`, 'success');
        
        // Reset processed files when changing folder
        processedFiles.current.clear();
        
        if (importExisting && data.existing_files > 0) {
          // Import all existing files by setting timestamp to 0
          lastTimestamp.current = 0;
          showNotification?.(`Found ${data.existing_files} existing files to import`, 'info');
        } else {
          // Only import new files from now on
          lastTimestamp.current = Date.now();
        }
      } else {
        showNotification?.('Failed to update watch folder', 'error');
      }
    } catch (error) {
      console.error('Failed to update watch folder:', error);
      showNotification?.('Failed to update watch folder', 'error');
    }
  };

  if (!isVisible) return null;

  return (
    <div className={`fixed bottom-4 right-4 z-50 ${
      darkMode ? 'bg-gray-800' : 'bg-white'
    } rounded-lg shadow-xl border ${
      darkMode ? 'border-gray-700' : 'border-gray-200'
    } transition-all duration-300 ${
      isExpanded ? 'w-80' : 'w-64'
    }`}>
      {/* Header */}
      <div className={`p-3 flex items-center justify-between ${
        darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
      } rounded-t-lg`}>
        <div 
          className="flex items-center space-x-2 cursor-pointer flex-1"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <Star className="text-yellow-500" size={18} />
          <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Starmie
          </span>
          <div className={`w-2 h-2 rounded-full ${
            isConnected ? 'bg-green-500' : 'bg-red-500'
          }`} />
        </div>
        <div className="flex items-center space-x-1">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className={`p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600`}
          >
            {isExpanded ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
          </button>
          <button
            onClick={() => setShowStarmiePanel(false)}
            className={`p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600`}
            title="Close Starmie"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Content */}
      {isExpanded && (
        <div className="p-3 pt-0 space-y-3">
          {/* Connection status */}
          <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            {isConnected ? (
              <div className="flex items-center space-x-1">
                <Server size={12} />
                <span>Bridge connected</span>
              </div>
            ) : (
              <div className="flex items-center space-x-1 text-red-500">
                <AlertCircle size={12} />
                <span>Bridge not found</span>
              </div>
            )}
            {watchFolder && (
              <div className="mt-1">
                {isEditingFolder ? (
                  <div className="flex items-center space-x-1">
                    <input
                      ref={folderInputRef}
                      type="text"
                      value={customFolder}
                      onChange={(e) => setCustomFolder(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') updateWatchFolder();
                        if (e.key === 'Escape') {
                          setIsEditingFolder(false);
                          setCustomFolder(watchFolder);
                        }
                      }}
                      className={`flex-1 px-2 py-1 text-xs rounded ${
                        darkMode 
                          ? 'bg-gray-700 text-white border-gray-600' 
                          : 'bg-white text-gray-900 border-gray-300'
                      } border`}
                      placeholder="Enter folder path"
                      autoFocus
                    />
                    <button
                      onClick={updateWatchFolder}
                      className={`p-1 rounded ${
                        darkMode 
                          ? 'bg-green-600 hover:bg-green-700 text-white' 
                          : 'bg-green-500 hover:bg-green-600 text-white'
                      }`}
                      title="Save"
                    >
                      <Check size={12} />
                    </button>
                    <button
                      onClick={() => {
                        setIsEditingFolder(false);
                        setCustomFolder(watchFolder);
                      }}
                      className={`p-1 rounded ${
                        darkMode 
                          ? 'bg-gray-600 hover:bg-gray-700 text-white' 
                          : 'bg-gray-400 hover:bg-gray-500 text-white'
                      }`}
                      title="Cancel"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <div 
                    className={`flex items-center space-x-1 cursor-pointer hover:opacity-80`}
                    onClick={() => {
                      setIsEditingFolder(true);
                      setCustomFolder(watchFolder);
                    }}
                    title="Click to change folder"
                  >
                    <FolderOpen size={12} />
                    <span className="truncate text-xs">{watchFolder}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Folder selector if no folder is set */}
          {isConnected && !watchFolder && (
            <div className="mt-2">
              <div className={`text-xs mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Set folder to watch:
              </div>
              <div className="flex items-center space-x-1">
                <input
                  type="text"
                  value={customFolder}
                  onChange={(e) => setCustomFolder(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') updateWatchFolder();
                  }}
                  className={`flex-1 px-2 py-1 text-xs rounded ${
                    darkMode 
                      ? 'bg-gray-700 text-white border-gray-600' 
                      : 'bg-white text-gray-900 border-gray-300'
                  } border`}
                  placeholder="C:/path/to/folder"
                />
                <button
                  onClick={updateWatchFolder}
                  className={`px-2 py-1 rounded text-xs ${
                    darkMode 
                      ? 'bg-green-600 hover:bg-green-700 text-white' 
                      : 'bg-green-500 hover:bg-green-600 text-white'
                  }`}
                >
                  Set
                </button>
              </div>
            </div>
          )}

          {/* Controls */}
          {isConnected && watchFolder && (
            <>
              <div className="flex space-x-2">
                <button
                  onClick={toggleMonitoring}
                  className={`flex-1 flex items-center justify-center px-3 py-2 rounded text-sm font-medium transition-colors ${
                    isMonitoring
                      ? darkMode 
                        ? 'bg-red-600 hover:bg-red-700 text-white' 
                        : 'bg-red-500 hover:bg-red-600 text-white'
                      : darkMode
                        ? 'bg-green-600 hover:bg-green-700 text-white'
                        : 'bg-green-500 hover:bg-green-600 text-white'
                  }`}
                >
                  {isMonitoring ? (
                    <>
                      <Pause size={14} className="mr-1" />
                      Stop
                    </>
                  ) : (
                    <>
                      <Play size={14} className="mr-1" />
                      Start
                    </>
                  )}
                </button>
                <button
                  onClick={handleRefresh}
                  className={`px-3 py-2 rounded transition-colors ${
                    darkMode 
                      ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                      : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                  }`}
                  title="Import all files in folder"
                >
                  <RefreshCw size={14} />
                </button>
              </div>

              {/* Stats */}
              {isMonitoring && (
                <div className={`text-xs space-y-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  <div className="flex justify-between">
                    <span>Status:</span>
                    <span className="text-green-600">Active</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Imported:</span>
                    <span>{stats.imported}</span>
                  </div>
                  {lastCheck && (
                    <div className="flex justify-between">
                      <span>Last check:</span>
                      <span>{lastCheck.toLocaleTimeString()}</span>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* Help text */}
          {!isConnected && (
            <div className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
              Run: <code className="font-mono bg-gray-200 dark:bg-gray-700 px-1 rounded">
                python starmie_bridge_polling.py
              </code>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StarmiePanel;