// components/FreeGrid/VectorShapeTools.jsx
import React, { useState, useEffect, useCallback } from 'react';

const VectorShapeTools = ({
  activeTool,
  canvasRef,
  onShapeComplete,
  strokeColor = '#000000',
  strokeWidth = 2,
  fillColor = 'none',
  zoomLevel = 1,
  panOffset = { x: 0, y: 0 },
  darkMode = false
}) => {
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState(null);
  const [currentPoint, setCurrentPoint] = useState(null);
  const [polygonPoints, setPolygonPoints] = useState([]);
  const [isNearFirstPoint, setIsNearFirstPoint] = useState(false);

  const getCanvasPosition = useCallback((clientX, clientY) => {
    if (!canvasRef?.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: (clientX - rect.left) / zoomLevel - panOffset.x,
      y: (clientY - rect.top) / zoomLevel - panOffset.y
    };
  }, [canvasRef, zoomLevel, panOffset]);

  const completePolygon = useCallback(() => {
    if (polygonPoints.length < 3) return;

    // Calculate bounding box for polygon
    const xs = polygonPoints.map(p => p.x);
    const ys = polygonPoints.map(p => p.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    const shapeData = {
      id: `polygon-${Date.now()}`,
      type: 'polygon',
      points: polygonPoints,
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
      stroke: strokeColor,
      strokeWidth,
      fill: fillColor
    };

    if (onShapeComplete) {
      onShapeComplete(shapeData);
    }
    
    // Reset all states
    setPolygonPoints([]);
    setIsDrawing(false);
    setIsNearFirstPoint(false);
    setCurrentPoint(null);
  }, [polygonPoints, strokeColor, strokeWidth, fillColor, onShapeComplete]);

  const handleMouseDown = useCallback((e) => {
    if (!['rectangle', 'ellipse', 'polygon'].includes(activeTool)) return;
    
    const pos = getCanvasPosition(e.clientX, e.clientY);
    
    if (activeTool === 'polygon') {
      if (polygonPoints.length === 0) {
        setPolygonPoints([pos]);
        setIsDrawing(true);
      } else {
        // Check if clicking near first point to close
        const first = polygonPoints[0];
        const dist = Math.sqrt(Math.pow(pos.x - first.x, 2) + Math.pow(pos.y - first.y, 2));
        // Increased sensitivity from 10 to 20 pixels
        if (dist < 20 && polygonPoints.length > 2) {
          // Force complete the polygon immediately
          e.preventDefault();
          e.stopPropagation();
          completePolygon();
          return;
        } else {
          setPolygonPoints([...polygonPoints, pos]);
        }
      }
    } else {
      setStartPoint(pos);
      setCurrentPoint(pos);
      setIsDrawing(true);
    }
  }, [activeTool, getCanvasPosition, polygonPoints, completePolygon]);

  const handleMouseMove = useCallback((e) => {
    const pos = getCanvasPosition(e.clientX, e.clientY);
    
    if (activeTool === 'polygon' && polygonPoints.length > 2) {
      // Check if near first point for visual feedback
      const first = polygonPoints[0];
      const dist = Math.sqrt(Math.pow(pos.x - first.x, 2) + Math.pow(pos.y - first.y, 2));
      setIsNearFirstPoint(dist < 20);
    }
    
    if (!isDrawing) {
      setCurrentPoint(pos);
      return;
    }
    
    if (activeTool !== 'polygon') {
      setCurrentPoint(pos);
    } else {
      setCurrentPoint(pos); // For preview line
    }
  }, [isDrawing, activeTool, getCanvasPosition, polygonPoints]);

  const handleMouseUp = useCallback((e) => {
    if (!isDrawing || activeTool === 'polygon') return;
    
    const pos = getCanvasPosition(e.clientX, e.clientY);
    
    let shapeData = {
      id: `shape-${Date.now()}`,
      type: activeTool,
      stroke: strokeColor,
      strokeWidth,
      fill: fillColor
    };

    if (activeTool === 'rectangle') {
      shapeData.x = Math.min(startPoint.x, pos.x);
      shapeData.y = Math.min(startPoint.y, pos.y);
      shapeData.width = Math.abs(pos.x - startPoint.x);
      shapeData.height = Math.abs(pos.y - startPoint.y);
    } else if (activeTool === 'ellipse') {
      shapeData.x = Math.min(startPoint.x, pos.x);
      shapeData.y = Math.min(startPoint.y, pos.y);
      shapeData.width = Math.abs(pos.x - startPoint.x);
      shapeData.height = Math.abs(pos.y - startPoint.y);
      // Also store center and radius for rendering
      shapeData.cx = (startPoint.x + pos.x) / 2;
      shapeData.cy = (startPoint.y + pos.y) / 2;
      shapeData.rx = Math.abs(pos.x - startPoint.x) / 2;
      shapeData.ry = Math.abs(pos.y - startPoint.y) / 2;
    }

    if (onShapeComplete) {
      onShapeComplete(shapeData);
    }

    setIsDrawing(false);
    setStartPoint(null);
    setCurrentPoint(null);
  }, [isDrawing, activeTool, startPoint, strokeColor, strokeWidth, fillColor, getCanvasPosition, onShapeComplete]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsDrawing(false);
        setStartPoint(null);
        setCurrentPoint(null);
        setPolygonPoints([]);
      } else if (e.key === 'Enter' && activeTool === 'polygon' && polygonPoints.length > 2) {
        completePolygon();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTool, polygonPoints, completePolygon]);

  // Mouse event listeners
  useEffect(() => {
    const canvas = canvasRef?.current;
    if (!canvas) return;

    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);

    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseup', handleMouseUp);
    };
  }, [canvasRef, handleMouseDown, handleMouseMove, handleMouseUp]);

  if (!['rectangle', 'ellipse', 'polygon'].includes(activeTool)) return null;

  return (
    <svg
      className="absolute inset-0 pointer-events-none"
      style={{ width: '100%', height: '100%', zIndex: 201 }}
    >
      {/* Rectangle preview */}
      {activeTool === 'rectangle' && isDrawing && startPoint && currentPoint && (
        <rect
          x={Math.min(startPoint.x, currentPoint.x)}
          y={Math.min(startPoint.y, currentPoint.y)}
          width={Math.abs(currentPoint.x - startPoint.x)}
          height={Math.abs(currentPoint.y - startPoint.y)}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          fill={fillColor}
          fillOpacity={0.3}
        />
      )}

      {/* Ellipse preview */}
      {activeTool === 'ellipse' && isDrawing && startPoint && currentPoint && (
        <ellipse
          cx={(startPoint.x + currentPoint.x) / 2}
          cy={(startPoint.y + currentPoint.y) / 2}
          rx={Math.abs(currentPoint.x - startPoint.x) / 2}
          ry={Math.abs(currentPoint.y - startPoint.y) / 2}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          fill={fillColor}
          fillOpacity={0.3}
        />
      )}

      {/* Polygon preview */}
      {activeTool === 'polygon' && polygonPoints.length > 0 && (
        <>
          {polygonPoints.length > 1 && (
            <polygon
              points={polygonPoints.map(p => `${p.x},${p.y}`).join(' ')}
              stroke={strokeColor}
              strokeWidth={strokeWidth}
              fill={fillColor}
              fillOpacity={0.3}
            />
          )}
          {currentPoint && (
            <line
              x1={polygonPoints[polygonPoints.length - 1].x}
              y1={polygonPoints[polygonPoints.length - 1].y}
              x2={currentPoint.x}
              y2={currentPoint.y}
              stroke={strokeColor}
              strokeWidth={1}
              strokeDasharray="5,5"
              opacity={0.5}
            />
          )}
          {polygonPoints.map((point, i) => {
            // Show visual feedback for first point when it's closeable
            const showCloseIndicator = i === 0 && isNearFirstPoint && polygonPoints.length > 2;
            
            return (
              <circle
                key={i}
                cx={point.x}
                cy={point.y}
                r={showCloseIndicator ? 10 : 4}
                fill={showCloseIndicator ? '#3B82F6' : (darkMode ? "#374151" : "#fff")}
                stroke={showCloseIndicator ? "#1D4ED8" : (darkMode ? "#9CA3AF" : strokeColor)}
                strokeWidth={showCloseIndicator ? 3 : 2}
                opacity={showCloseIndicator ? 0.9 : 1}
                style={i === 0 && polygonPoints.length > 2 ? { 
                  pointerEvents: 'all', 
                  cursor: 'pointer' 
                } : {}}
                onClick={i === 0 && polygonPoints.length > 2 ? completePolygon : undefined}
              />
            );
          })}
        </>
      )}
    </svg>
  );
};

export default VectorShapeTools;