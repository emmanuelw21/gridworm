import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Pipette } from 'lucide-react';

const VisualEyedropper = ({ isActive, onColorPick, onCancel }) => {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [hoveredColor, setHoveredColor] = useState('#000000');
  const [magnifierCanvas, setMagnifierCanvas] = useState(null);
  const magnifierRef = useRef(null);
  const captureCanvasRef = useRef(null);
  const animationFrameRef = useRef(null);

  useEffect(() => {
    if (!isActive) return;

    // Create canvases for magnifier and capture
    const magnifierCanvas = document.createElement('canvas');
    magnifierCanvas.width = 150;
    magnifierCanvas.height = 150;
    const magnifierCtx = magnifierCanvas.getContext('2d', { willReadFrequently: true });
    
    const captureCanvas = document.createElement('canvas');
    captureCanvas.width = window.innerWidth;
    captureCanvas.height = window.innerHeight;
    const captureCtx = captureCanvas.getContext('2d', { willReadFrequently: true });
    
    magnifierRef.current = { canvas: magnifierCanvas, ctx: magnifierCtx };
    captureCanvasRef.current = { canvas: captureCanvas, ctx: captureCtx };

    const captureScreen = () => {
      // Fill with current background color first
      const bgElement = document.querySelector('.bg-gray-50, .dark\\:bg-gray-800');
      if (bgElement) {
        const bgStyle = window.getComputedStyle(bgElement);
        captureCtx.fillStyle = bgStyle.backgroundColor;
        captureCtx.fillRect(0, 0, captureCanvas.width, captureCanvas.height);
      }
      
      // Focus on media elements first, then other elements
      const mediaElements = Array.from(document.querySelectorAll('img, video, canvas')).filter(el => {
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0 && 
               rect.top < window.innerHeight && rect.bottom > 0 &&
               rect.left < window.innerWidth && rect.right > 0;
      });
      
      // Draw media elements with better error handling
      mediaElements.forEach(element => {
        const rect = element.getBoundingClientRect();
        
        try {
          if (element.tagName === 'IMG' && element.complete && element.naturalWidth > 0) {
            captureCtx.drawImage(element, rect.left, rect.top, rect.width, rect.height);
          } else if (element.tagName === 'VIDEO' && element.readyState >= 2) {
            captureCtx.drawImage(element, rect.left, rect.top, rect.width, rect.height);
          } else if (element.tagName === 'CANVAS' && element.width > 0 && element.height > 0) {
            // Try to draw canvas content
            try {
              captureCtx.drawImage(element, rect.left, rect.top, rect.width, rect.height);
            } catch (canvasErr) {
              // If canvas is tainted, try to at least get its background
              const ctx = element.getContext('2d');
              if (ctx) {
                const imageData = ctx.getImageData(0, 0, 1, 1);
                if (imageData.data[3] > 0) {
                  captureCtx.fillStyle = `rgba(${imageData.data[0]}, ${imageData.data[1]}, ${imageData.data[2]}, ${imageData.data[3] / 255})`;
                  captureCtx.fillRect(rect.left, rect.top, rect.width, rect.height);
                }
              }
            }
          }
        } catch (err) {
          // For any errors, try to at least capture the element's background color
          const style = window.getComputedStyle(element);
          if (style.backgroundColor && style.backgroundColor !== 'rgba(0, 0, 0, 0)') {
            captureCtx.fillStyle = style.backgroundColor;
            captureCtx.fillRect(rect.left, rect.top, rect.width, rect.height);
          }
        }
      });
    };

    const updateMagnifier = (x, y) => {
      const magnifierSize = 150;
      const zoomLevel = 5;
      const sourceSize = magnifierSize / zoomLevel;
      
      // Don't clear - keep previous content to avoid white flashes
      // magnifierCtx.fillStyle = '#f0f0f0';
      // magnifierCtx.fillRect(0, 0, magnifierSize, magnifierSize);
      
      // Draw magnified area
      try {
        // First try to get from capture canvas
        magnifierCtx.imageSmoothingEnabled = false;
        magnifierCtx.drawImage(
          captureCanvas,
          x - sourceSize / 2,
          y - sourceSize / 2,
          sourceSize,
          sourceSize,
          0,
          0,
          magnifierSize,
          magnifierSize
        );
        
        // Get center pixel color
        const pixel = captureCtx.getImageData(x, y, 1, 1).data;
        if (pixel[3] > 0) { // If not transparent
          const r = pixel[0];
          const g = pixel[1];
          const b = pixel[2];
          return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase()}`;
        }
      } catch (err) {
        // Fallback to element detection
      }
      
      // Fallback: check elements at position
      const element = document.elementFromPoint(x, y);
      if (element) {
        const computedStyle = window.getComputedStyle(element);
        const bgColor = computedStyle.backgroundColor;
        if (bgColor && bgColor !== 'rgba(0, 0, 0, 0)') {
          const rgb = bgColor.match(/\d+/g);
          if (rgb) {
            const r = parseInt(rgb[0]);
            const g = parseInt(rgb[1]);
            const b = parseInt(rgb[2]);
            return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase()}`;
          }
        }
      }
      
      return '#FFFFFF';
    };

    const handleMouseMove = (e) => {
      setMousePos({ x: e.clientX, y: e.clientY });
      
      // Always capture on mouse move for better accuracy
      captureScreen();
      
      // Update magnifier and get color
      const color = updateMagnifier(e.clientX, e.clientY);
      setHoveredColor(color);
      
      // Update magnifier canvas state for display
      setMagnifierCanvas(magnifierCanvas.toDataURL());
    };

    const handleClick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (onColorPick) {
        onColorPick(hoveredColor);
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (onCancel) onCancel();
      }
    };

    // Initial capture
    setTimeout(captureScreen, 100);

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('click', handleClick, true);
    document.addEventListener('keydown', handleKeyDown);

    // Change cursor
    document.body.style.cursor = 'none';

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('click', handleClick, true);
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.cursor = 'auto';
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isActive, hoveredColor, onColorPick, onCancel]);

  if (!isActive) return null;

  return (
    <>
      {/* Magnifier and color preview */}
      <div
        className="fixed z-[9999] pointer-events-none"
        style={{
          left: `${mousePos.x - 75}px`,
          top: `${mousePos.y - 180}px`,
        }}
      >
        {/* Magnifier preview */}
        <div className="bg-gray-900 rounded-lg shadow-2xl p-2 mb-2">
          <div 
            className="w-[150px] h-[150px] rounded border-2 border-gray-700"
            style={{
              backgroundImage: magnifierCanvas ? `url(${magnifierCanvas})` : undefined,
              backgroundSize: 'contain',
              imageRendering: 'pixelated'
            }}
          >
            {/* Crosshair */}
            <div className="relative w-full h-full">
              <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-black opacity-50" />
              <div className="absolute top-0 bottom-0 left-1/2 w-[1px] bg-black opacity-50" />
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-3 h-3 border-2 border-white rounded-full shadow-md" />
            </div>
          </div>
        </div>
        
        {/* Color info */}
        <div className="bg-gray-900 text-white rounded-lg shadow-xl p-3 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Pipette size={16} />
            <span className="text-sm font-mono">{hoveredColor}</span>
          </div>
          <div 
            className="w-8 h-8 rounded border-2 border-white shadow-inner"
            style={{ backgroundColor: hoveredColor }}
          />
        </div>
        
        {/* Instructions */}
        <div className="text-xs text-gray-300 mt-1 text-center bg-gray-900 rounded px-2 py-1">
          Click to select • ESC to cancel
        </div>
      </div>
      
      {/* Custom cursor */}
      <div
        className="fixed z-[10000] pointer-events-none"
        style={{
          left: `${mousePos.x - 12}px`,
          top: `${mousePos.y - 12}px`,
        }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="11" fill="none" stroke="white" strokeWidth="2" />
          <circle cx="12" cy="12" r="10" fill="none" stroke="black" strokeWidth="1" />
          <line x1="12" y1="0" x2="12" y2="24" stroke="white" strokeWidth="2" />
          <line x1="0" y1="12" x2="24" y2="12" stroke="white" strokeWidth="2" />
          <line x1="12" y1="1" x2="12" y2="23" stroke="black" strokeWidth="1" />
          <line x1="1" y1="12" x2="23" y2="12" stroke="black" strokeWidth="1" />
        </svg>
      </div>
    </>
  );
};

export default VisualEyedropper;