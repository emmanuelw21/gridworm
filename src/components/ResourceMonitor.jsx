// components/ResourceMonitor.jsx
import React, { useEffect, useState, useRef } from 'react';
import { AlertTriangle, Activity, X } from 'lucide-react';

const ResourceMonitor = ({ rendererRef, onForceCleanup }) => {
  const [stats, setStats] = useState({
    memory: 0,
    memoryLimit: 0,
    objects: 0,
    geometries: 0,
    textures: 0,
    programs: 0,
    activeVideos: 0,
    fps: 0,
    warnings: []
  });
  
  const [isVisible, setIsVisible] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);
  const frameCountRef = useRef(0);
  const lastTimeRef = useRef(performance.now());
  
  useEffect(() => {
    let animationId;
    const warnings = new Set();
    
    const checkPerformance = () => {
      animationId = requestAnimationFrame(checkPerformance);
      
      // Calculate FPS
      frameCountRef.current++;
      const currentTime = performance.now();
      const deltaTime = currentTime - lastTimeRef.current;
      
      if (deltaTime >= 1000) {
        const fps = Math.round((frameCountRef.current * 1000) / deltaTime);
        frameCountRef.current = 0;
        lastTimeRef.current = currentTime;
        
        // Get memory info
        let memoryMB = 0;
        let memoryLimit = 0;
        let currentMemoryPercentage = 0;
        
        if (window.performance && window.performance.memory) {
          memoryMB = Math.round(window.performance.memory.usedJSHeapSize / 1048576);
          memoryLimit = Math.round(window.performance.memory.jsHeapSizeLimit / 1048576);
          
          // Memory warnings
          currentMemoryPercentage = (memoryMB / memoryLimit) * 100;
          if (currentMemoryPercentage > 80) {
            warnings.add('High memory usage (>80%)');
          } else if (currentMemoryPercentage > 60) {
            warnings.add('Moderate memory usage (>60%)');
          }
        }
        
        // Get Three.js stats
        let threeStats = {
          render: { triangles: 0, points: 0, lines: 0 },
          memory: { geometries: 0, textures: 0 },
          programs: 0
        };
        
        if (rendererRef?.current?.info) {
          threeStats = rendererRef.current.info;
        }
        
        // FPS warning
        if (fps < 30) {
          warnings.add('Low FPS (<30)');
        }
        
        // Count active videos
        const activeVideos = document.querySelectorAll('video:not([paused])').length;
        if (activeVideos > 5) {
          warnings.add(`Too many active videos (${activeVideos})`);
        }
        
        setStats({
          memory: memoryMB,
          memoryLimit,
          memoryPercentage: currentMemoryPercentage,
          objects: threeStats.render.triangles || 0,
          geometries: threeStats.memory.geometries || 0,
          textures: threeStats.memory.textures || 0,
          programs: threeStats.programs?.length || 0,
          activeVideos,
          fps,
          warnings: Array.from(warnings)
        });
        
        // Auto cleanup if critical
        if (currentMemoryPercentage > 90) {
          console.error('Critical memory usage! Triggering emergency cleanup');
          if (onForceCleanup) {
            onForceCleanup();
          }
        }
        
        warnings.clear();
      }
    };
    
    checkPerformance();
    
    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [rendererRef, onForceCleanup]);
  
  if (!isVisible) return null;
  
  const memoryPercentage = stats.memoryPercentage || 0;
  
  const getMemoryColor = () => {
    if (memoryPercentage > 80) return 'text-red-500';
    if (memoryPercentage > 60) return 'text-yellow-500';
    return 'text-green-500';
  };
  
  return (
    <div className={`fixed bottom-4 left-4 bg-black bg-opacity-90 text-white text-xs rounded-lg shadow-lg z-50 ${
      isMinimized ? 'w-auto' : 'w-64'
    }`}>
      <div className="flex items-center justify-between p-2 border-b border-gray-700">
        <div className="flex items-center space-x-2">
          <Activity size={14} className={stats.warnings.length > 0 ? 'text-yellow-500' : 'text-green-500'} />
          <span className="font-medium">Performance Monitor</span>
        </div>
        <div className="flex items-center space-x-1">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1 hover:bg-gray-700 rounded"
          >
            {isMinimized ? '□' : '—'}
          </button>
          <button
            onClick={() => setIsVisible(false)}
            className="p-1 hover:bg-gray-700 rounded"
          >
            <X size={12} />
          </button>
        </div>
      </div>
      
      {!isMinimized && (
        <div className="p-3 space-y-2">
          {/* Memory */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <span>Memory:</span>
              <span className={getMemoryColor()}>
                {stats.memory}MB / {stats.memoryLimit}MB ({memoryPercentage}%)
              </span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all ${
                  memoryPercentage > 80 ? 'bg-red-500' : 
                  memoryPercentage > 60 ? 'bg-yellow-500' : 'bg-green-500'
                }`}
                style={{ width: `${Math.min(memoryPercentage, 100)}%` }}
              />
            </div>
          </div>
          
          {/* Stats */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>FPS: <span className={stats.fps < 30 ? 'text-red-500' : ''}>{stats.fps}</span></div>
            <div>Videos: <span className={stats.activeVideos > 5 ? 'text-yellow-500' : ''}>{stats.activeVideos}</span></div>
            <div>Geometries: {stats.geometries}</div>
            <div>Textures: {stats.textures}</div>
            <div>Triangles: {stats.objects}</div>
            <div>Programs: {stats.programs}</div>
          </div>
          
          {/* Warnings */}
          {stats.warnings.length > 0 && (
            <div className="border-t border-gray-700 pt-2">
              <div className="flex items-center space-x-1 text-yellow-500 mb-1">
                <AlertTriangle size={12} />
                <span className="font-medium">Warnings:</span>
              </div>
              {stats.warnings.map((warning, i) => (
                <div key={i} className="text-xs text-yellow-400">• {warning}</div>
              ))}
            </div>
          )}
          
          {/* Actions */}
          <div className="border-t border-gray-700 pt-2">
            <button
              onClick={onForceCleanup}
              className="w-full px-2 py-1 bg-red-600 hover:bg-red-700 rounded text-xs"
            >
              Force Cleanup
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResourceMonitor;