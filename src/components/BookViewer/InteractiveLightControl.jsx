// Interactive 2D Light Position Control Component
import React, { useRef, useState, useCallback, useEffect } from 'react';

const InteractiveLightControl = ({ 
  lightingConfig, 
  onPositionChange, 
  darkMode 
}) => {
  const canvasRef = useRef(null);
  const [isDragging, setIsDragging] = useState(null); // 'key' or 'fill' or null
  const [canvasSize, setCanvasSize] = useState({ width: 300, height: 200 });
  
  // Convert 3D position to 2D canvas coordinates
  const worldToCanvas = useCallback((x, z) => {
    const centerX = canvasSize.width / 2;
    const centerZ = canvasSize.height / 2;
    const scale = 8; // Scale factor for world coordinates
    
    return {
      x: centerX + (x / scale) * (canvasSize.width / 2 - 20),
      y: centerZ + (z / scale) * (canvasSize.height / 2 - 20)
    };
  }, [canvasSize]);
  
  // Convert 2D canvas coordinates to 3D position
  const canvasToWorld = useCallback((canvasX, canvasY) => {
    const centerX = canvasSize.width / 2;
    const centerZ = canvasSize.height / 2;
    const scale = 8;
    
    const x = ((canvasX - centerX) / (canvasSize.width / 2 - 20)) * scale;
    const z = ((canvasY - centerZ) / (canvasSize.height / 2 - 20)) * scale;
    
    return { x, z };
  }, [canvasSize]);
  
  // Draw the 2D visualization
  const drawVisualization = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const { width, height } = canvasSize;
    
    // Clear canvas
    ctx.fillStyle = darkMode ? '#000' : '#1a1a1a';
    ctx.fillRect(0, 0, width, height);
    
    // Draw grid
    ctx.strokeStyle = darkMode ? '#333' : '#444';
    ctx.lineWidth = 1;
    const gridSize = 20;
    
    for (let x = 0; x <= width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    
    for (let y = 0; y <= height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    
    // Draw book outline (center rectangle)
    const bookWidth = 60;
    const bookHeight = 80;
    const bookX = (width - bookWidth) / 2;
    const bookY = (height - bookHeight) / 2;
    
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 2;
    ctx.strokeRect(bookX, bookY, bookWidth, bookHeight);
    
    // Fill book with a subtle color
    ctx.fillStyle = darkMode ? 'rgba(128, 128, 128, 0.3)' : 'rgba(160, 160, 160, 0.3)';
    ctx.fillRect(bookX, bookY, bookWidth, bookHeight);
    
    // Draw light positions
    const keyPos = worldToCanvas(
      lightingConfig.keyLight.position.x, 
      lightingConfig.keyLight.position.z
    );
    const fillPos = worldToCanvas(
      lightingConfig.fillLight.position.x, 
      lightingConfig.fillLight.position.z
    );
    
    // Draw light shadows/influence (simple gradient effect)
    const drawLightInfluence = (pos, color, intensity) => {
      const gradient = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, 80);
      gradient.addColorStop(0, `${color}33`); // 20% opacity
      gradient.addColorStop(1, `${color}00`); // 0% opacity
      
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
    };
    
    // Draw key light influence
    drawLightInfluence(keyPos, '#ffff00', lightingConfig.keyLight.intensity);
    
    // Draw fill light influence  
    drawLightInfluence(fillPos, '#00ffff', lightingConfig.fillLight.intensity);
    
    // Draw light circles
    const drawLight = (pos, color, label, isSelected) => {
      // Outer circle (selection indicator)
      if (isSelected) {
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 16, 0, 2 * Math.PI);
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      
      // Main light circle
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 12, 0, 2 * Math.PI);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = darkMode ? '#fff' : '#000';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // Light label
      ctx.fillStyle = darkMode ? '#fff' : '#000';
      ctx.font = '10px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(label, pos.x, pos.y - 20);
    };
    
    drawLight(keyPos, '#ffff00', 'Key', isDragging === 'key');
    drawLight(fillPos, '#00ffff', 'Fill', isDragging === 'fill');
    
  }, [canvasSize, lightingConfig, isDragging, darkMode, worldToCanvas]);
  
  // Handle mouse events
  const getMousePos = useCallback((e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  }, []);
  
  const getLightAtPosition = useCallback((mousePos) => {
    const keyPos = worldToCanvas(
      lightingConfig.keyLight.position.x, 
      lightingConfig.keyLight.position.z
    );
    const fillPos = worldToCanvas(
      lightingConfig.fillLight.position.x, 
      lightingConfig.fillLight.position.z
    );
    
    const distance = (p1, p2) => Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);
    
    if (distance(mousePos, keyPos) <= 12) return 'key';
    if (distance(mousePos, fillPos) <= 12) return 'fill';
    return null;
  }, [lightingConfig, worldToCanvas]);
  
  const handleMouseDown = useCallback((e) => {
    const mousePos = getMousePos(e);
    const lightType = getLightAtPosition(mousePos);
    setIsDragging(lightType);
  }, [getMousePos, getLightAtPosition]);
  
  const handleMouseMove = useCallback((e) => {
    if (!isDragging) return;
    
    const mousePos = getMousePos(e);
    const worldPos = canvasToWorld(mousePos.x, mousePos.y);
    
    // Constrain to reasonable bounds
    worldPos.x = Math.max(-15, Math.min(15, worldPos.x));
    worldPos.z = Math.max(-15, Math.min(15, worldPos.z));
    
    onPositionChange(isDragging, worldPos.x, worldPos.z);
  }, [isDragging, getMousePos, canvasToWorld, onPositionChange]);
  
  const handleMouseUp = useCallback(() => {
    setIsDragging(null);
  }, []);
  
  // Effect to redraw canvas when config changes
  useEffect(() => {
    drawVisualization();
  }, [drawVisualization]);
  
  // Setup canvas size and event listeners
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Set canvas size
    canvas.width = canvasSize.width;
    canvas.height = canvasSize.height;
    
    // Add event listeners
    canvas.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseDown, handleMouseMove, handleMouseUp, canvasSize]);
  
  return (
    <div className="bg-gray-100 dark:bg-gray-900 rounded-lg p-2">
      <div className="text-xs font-medium mb-1 dark:text-gray-300">
        Interactive Light Positions (Top View)
      </div>
      <canvas
        ref={canvasRef}
        className="w-full rounded cursor-pointer border border-gray-300 dark:border-gray-600"
        style={{ 
          width: '100%', 
          height: '200px',
          imageRendering: 'pixelated' 
        }}
      />
      <div className="flex justify-between mt-1 text-xs">
        <span className="text-yellow-500">● Key Light (drag to move)</span>
        <span className="text-gray-500">□ Book</span>
        <span className="text-cyan-500">● Fill Light (drag to move)</span>
      </div>
      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-center">
        Click and drag the light circles to adjust positions
      </div>
    </div>
  );
};

export default InteractiveLightControl;