import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Zap, CheckCircle, AlertCircle, Download, Settings,
  Play, Pause, FolderOpen, RefreshCw, Server
} from 'lucide-react';
import { MediaFile } from '../MediaGrid/MediaModel.js';

const StarmieBridgeConnector = ({ 
  onImport, 
  darkMode, 
  showNotification 
}) => {
  const [bridgeUrl, setBridgeUrl] = useState('http://localhost:5555');
  const [isConnected, setIsConnected] = useState(false);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [watchFolder, setWatchFolder] = useState('');
  const [customFolder, setCustomFolder] = useState('C:/Users/emman/Documents/ComfyUI/selected-output');
  const [syncInterval, setSyncInterval] = useState(3000);
  const [stats, setStats] = useState({ total: 0, imported: 0, pending: 0 });
  const [lastCheck, setLastCheck] = useState(null);
  
  const intervalRef = useRef(null);
  const processedFiles = useRef(new Set());
  const lastTimestamp = useRef(null);

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
      console.error('Bridge connection failed:', error);
    }
    setIsConnected(false);
    return false;
  }, [bridgeUrl]);

  // Set watch folder on bridge
  const setWatchFolderOnBridge = async () => {
    try {
      const response = await fetch(`${bridgeUrl}/starmie/watch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: customFolder })
      });
      
      if (response.ok) {
        const data = await response.json();
        setWatchFolder(data.watching);
        showNotification?.(`Now watching: ${data.watching}`, 'success');
        return true;
      }
    } catch (error) {
      console.error('Failed to set watch folder:', error);
      showNotification?.('Failed to set watch folder', 'error');
    }
    return false;
  };

  // Check for new files
  const checkForNewFiles = useCallback(async () => {
    if (!isConnected || !isMonitoring) return;

    try {
      const url = lastTimestamp.current 
        ? `${bridgeUrl}/starmie/changes?since=${lastTimestamp.current}`
        : `${bridgeUrl}/starmie/changes`;
        
      const response = await fetch(url);
      if (!response.ok) return;

      const data = await response.json();
      console.log('Bridge response:', data); // Debug log
      lastTimestamp.current = data.timestamp;
      
      if (data.changes && data.changes.length > 0) {
        console.log(`Found ${data.changes.length} new files to import`);
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
    
    for (const fileInfo of fileInfos) {
      if (processedFiles.current.has(fileInfo.id)) continue;
      
      try {
        // Fetch file from bridge
        const response = await fetch(`${bridgeUrl}/starmie/file/${fileInfo.id}`);
        if (!response.ok) continue;
        
        const blob = await response.blob();
        const file = new File([blob], fileInfo.name, { type: blob.type });
        
        const mediaFile = new MediaFile(file);
        
        // Add metadata
        mediaFile.metadata = {
          ...mediaFile.metadata,
          starmie: {
            starred: true,
            importedAt: new Date().toISOString(),
            originalPath: fileInfo.path,
            bridgeImport: true
          }
        };
        
        mediaFile.tags = [...(mediaFile.tags || []), '⭐ Auto-imported'];
        
        // Generate thumbnail
        if (mediaFile.type.startsWith('image/')) {
          await mediaFile.generateThumbnail();
        }
        
        newMediaFiles.push(mediaFile);
        processedFiles.current.add(fileInfo.id);
      } catch (error) {
        console.error(`Failed to import ${fileInfo.name}:`, error);
      }
    }
    
    if (newMediaFiles.length > 0 && onImport) {
      onImport(newMediaFiles);
      showNotification?.(`Auto-imported ${newMediaFiles.length} new files`, 'success');
      
      setStats(prev => ({
        ...prev,
        imported: prev.imported + newMediaFiles.length
      }));
    }
  };

  // Connection check effect
  useEffect(() => {
    checkBridgeConnection();
    const interval = setInterval(checkBridgeConnection, 10000); // Check every 10s
    return () => clearInterval(interval);
  }, [checkBridgeConnection]);

  // Monitoring effect
  useEffect(() => {
    if (isMonitoring && isConnected) {
      // Initial check
      checkForNewFiles();
      
      // Set up interval
      intervalRef.current = setInterval(checkForNewFiles, syncInterval);
      
      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [isMonitoring, isConnected, syncInterval, checkForNewFiles]);

  const toggleMonitoring = () => {
    setIsMonitoring(!isMonitoring);
    if (!isMonitoring) {
      processedFiles.current.clear(); // Reset on start
      lastTimestamp.current = Date.now(); // Use milliseconds timestamp
    }
  };

  return (
    <div className={`p-4 ${darkMode ? 'bg-gray-900' : 'bg-gray-50'} rounded-lg`}>
      <h4 className={`text-md font-semibold mb-4 flex items-center ${
        darkMode ? 'text-white' : 'text-gray-900'
      }`}>
        <Server className="mr-2" size={18} />
        Bridge Connection (True Automation)
      </h4>

      {/* Connection status */}
      <div className={`mb-4 p-3 rounded-lg ${
        isConnected 
          ? darkMode ? 'bg-green-900' : 'bg-green-100'
          : darkMode ? 'bg-red-900' : 'bg-red-100'
      }`}>
        <div className="flex items-center justify-between">
          <span className={`font-medium ${
            isConnected
              ? darkMode ? 'text-green-300' : 'text-green-800'
              : darkMode ? 'text-red-300' : 'text-red-800'
          }`}>
            {isConnected ? 'Bridge Connected' : 'Bridge Not Found'}
          </span>
          {isConnected ? (
            <CheckCircle className="text-green-500" size={20} />
          ) : (
            <AlertCircle className="text-red-500" size={20} />
          )}
        </div>
        {!isConnected && (
          <p className={`text-sm mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Run: <code className="font-mono">python starmie-bridge/starmie_bridge.py</code>
          </p>
        )}
      </div>

      {isConnected && (
        <>
          {/* Watch folder config */}
          <div className="mb-4">
            <label className={`block text-sm font-medium mb-2 ${
              darkMode ? 'text-gray-300' : 'text-gray-700'
            }`}>
              Folder to Watch:
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                value={customFolder}
                onChange={(e) => setCustomFolder(e.target.value)}
                className={`flex-1 px-3 py-2 rounded text-sm ${
                  darkMode 
                    ? 'bg-gray-800 text-white border-gray-600' 
                    : 'bg-white text-gray-900 border-gray-300'
                } border`}
                placeholder="C:/path/to/folder"
              />
              <button
                onClick={setWatchFolderOnBridge}
                className={`px-4 py-2 rounded transition-colors ${
                  darkMode 
                    ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                    : 'bg-blue-500 hover:bg-blue-600 text-white'
                }`}
              >
                Set
              </button>
            </div>
            {watchFolder && (
              <p className={`text-xs mt-1 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                Currently watching: {watchFolder}
              </p>
            )}
          </div>

          {/* Sync interval */}
          <div className="mb-4">
            <label className={`block text-sm font-medium mb-2 ${
              darkMode ? 'text-gray-300' : 'text-gray-700'
            }`}>
              Check Interval:
            </label>
            <select
              value={syncInterval}
              onChange={(e) => setSyncInterval(parseInt(e.target.value))}
              className={`w-full px-3 py-2 rounded text-sm ${
                darkMode 
                  ? 'bg-gray-800 text-white border-gray-600' 
                  : 'bg-white text-gray-900 border-gray-300'
              } border`}
            >
              <option value="1000">1 second</option>
              <option value="3000">3 seconds</option>
              <option value="5000">5 seconds</option>
              <option value="10000">10 seconds</option>
            </select>
          </div>

          {/* Control button */}
          <button
            onClick={toggleMonitoring}
            className={`w-full flex items-center justify-center px-4 py-3 rounded-lg font-medium transition-colors ${
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
                <Pause size={20} className="mr-2" />
                Stop Auto-Import
              </>
            ) : (
              <>
                <Play size={20} className="mr-2" />
                Start Auto-Import
              </>
            )}
          </button>

          {/* Status */}
          {isMonitoring && (
            <div className={`mt-4 p-3 rounded-lg ${
              darkMode ? 'bg-gray-800' : 'bg-gray-100'
            }`}>
              <div className={`space-y-1 text-sm ${
                darkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
                <div className="flex justify-between">
                  <span>Status:</span>
                  <span className="font-medium text-green-600">Monitoring</span>
                </div>
                <div className="flex justify-between">
                  <span>Imported:</span>
                  <span className="font-medium">{stats.imported}</span>
                </div>
                <div className="flex justify-between">
                  <span>Last check:</span>
                  <span className="font-medium">
                    {lastCheck ? lastCheck.toLocaleTimeString() : 'Never'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Info box */}
      <div className={`mt-4 p-3 rounded-lg ${
        darkMode ? 'bg-blue-900' : 'bg-blue-100'
      }`}>
        <p className={`text-sm ${darkMode ? 'text-blue-300' : 'text-blue-800'}`}>
          <strong>True Automation!</strong> The bridge server watches your folder and Gridworm automatically imports new files. No manual interaction needed!
        </p>
      </div>
    </div>
  );
};

export default StarmieBridgeConnector;