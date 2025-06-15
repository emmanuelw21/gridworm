// components/FreeGrid/AutoArrangePanel.jsx
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { 
  Grid, Shuffle, Square, RectangleHorizontal, RectangleVertical,
  MousePointer, Maximize, ZoomIn, ZoomOut, RotateCw, Move,
  AlignHorizontalJustifyCenter, AlignVerticalJustifyCenter
} from 'lucide-react';

const AutoArrangePanel = ({ items, onArrange }) => {
  const [marqueeActive, setMarqueeActive] = useState(true);
  const [marqueeBounds, setMarqueeBounds] = useState({ 
    x: 100, 
    y: 100, 
    width: 400, 
    height: 300 
  });
  
  const [previewScale, setPreviewScale] = useState(0.8);
  const [isPanning, setIsPanning] = useState(false);
  const [isDraggingMarquee, setIsDraggingMarquee] = useState(false);
  const [isDraggingItem, setIsDraggingItem] = useState(false);
  const [draggedItemIndex, setDraggedItemIndex] = useState(null);
  const [resizeHandle, setResizeHandle] = useState(null);
  const [aspectRatio, setAspectRatio] = useState(null);
  
  const [arrangedItems, setArrangedItems] = useState([]);
  const [config, setConfig] = useState({
    padding: 10,
    scaleToFit: true,
    maintainAspectRatio: true
  });
  
  const previewRef = useRef(null);
  const lastMousePos = useRef({ x: 0, y: 0 });
  const dragOffset = useRef({ x: 0, y: 0 });

  // Canvas size for preview
  const canvasSize = { width: 800, height: 600 };

  // Aspect ratio presets
  const aspectRatios = [
    { label: 'Free', value: null, icon: <Maximize size={16} /> },
    { label: '1:1', value: 1, icon: <Square size={16} /> },
    { label: '16:9', value: 16/9, icon: <RectangleHorizontal size={16} /> },
    { label: '4:3', value: 4/3, icon: <RectangleHorizontal size={16} /> },
    { label: '9:16', value: 9/16, icon: <RectangleVertical size={16} /> }
  ];

  // Initialize arranged items when items change
  useEffect(() => {
    if (items.length > 0) {
      arrangeItemsInMarquee();
    }
  }, [items]);

  // Calculate scale to fit items in marquee
  const calculateScaleToFit = useCallback((itemsToFit, targetBounds) => {
    if (!itemsToFit.length) return 1;

    // Find bounding box of all items
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;

    itemsToFit.forEach(item => {
      minX = Math.min(minX, item.x);
      minY = Math.min(minY, item.y);
      maxX = Math.max(maxX, item.x + item.width);
      maxY = Math.max(maxY, item.y + item.height);
    });

    const itemsWidth = maxX - minX;
    const itemsHeight = maxY - minY;

    if (itemsWidth === 0 || itemsHeight === 0) return 1;

    const scaleX = (targetBounds.width - config.padding * 2) / itemsWidth;
    const scaleY = (targetBounds.height - config.padding * 2) / itemsHeight;

    return config.maintainAspectRatio ? Math.min(scaleX, scaleY) : 1;
  }, [config]);

  // Arrange items in grid pattern within marquee
  const arrangeItemsInMarquee = useCallback(() => {
    if (!items.length) return;

    const targetBounds = marqueeActive ? marqueeBounds : {
      x: 50,
      y: 50,
      width: canvasSize.width - 100,
      height: canvasSize.height - 100
    };

    // Calculate grid dimensions
    const itemCount = items.length;
    const aspectRatio = targetBounds.width / targetBounds.height;
    let cols = Math.ceil(Math.sqrt(itemCount * aspectRatio));
    let rows = Math.ceil(itemCount / cols);

    // Calculate cell size
    const cellWidth = (targetBounds.width - config.padding * (cols + 1)) / cols;
    const cellHeight = (targetBounds.height - config.padding * (rows + 1)) / rows;

    // Arrange items in grid
    const arranged = items.map((item, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);

      // Calculate item size maintaining aspect ratio
      const itemAspect = item.width / item.height;
      let itemWidth, itemHeight;

      if (itemAspect > cellWidth / cellHeight) {
        itemWidth = cellWidth;
        itemHeight = cellWidth / itemAspect;
      } else {
        itemHeight = cellHeight;
        itemWidth = cellHeight * itemAspect;
      }

      // Center item in cell
      const x = targetBounds.x + config.padding + col * (cellWidth + config.padding) + (cellWidth - itemWidth) / 2;
      const y = targetBounds.y + config.padding + row * (cellHeight + config.padding) + (cellHeight - itemHeight) / 2;

      return {
        ...item,
        previewX: x,
        previewY: y,
        previewWidth: itemWidth,
        previewHeight: itemHeight,
        originalId: item.id // Preserve original ID
      };
    });

    setArrangedItems(arranged);
  }, [items, marqueeActive, marqueeBounds, config, canvasSize]);

  // Randomize order
  const handleRandomize = useCallback(() => {
    const shuffled = [...arrangedItems].sort(() => Math.random() - 0.5);
    
    // Preserve positions but shuffle items
    const positions = arrangedItems.map(item => ({
      x: item.previewX,
      y: item.previewY,
      width: item.previewWidth,
      height: item.previewHeight
    }));

    const rearranged = shuffled.map((item, index) => ({
      ...item,
      previewX: positions[index].x,
      previewY: positions[index].y,
      previewWidth: positions[index].width,
      previewHeight: positions[index].height
    }));

    setArrangedItems(rearranged);
  }, [arrangedItems]);

  // Handle marquee resize
  const handleMarqueeMouseDown = useCallback((e, handle) => {
    e.preventDefault();
    e.stopPropagation();
    
    const rect = previewRef.current.getBoundingClientRect();
    lastMousePos.current = {
      x: (e.clientX - rect.left) / previewScale,
      y: (e.clientY - rect.top) / previewScale
    };

    if (handle === 'move') {
      setIsDraggingMarquee(true);
    } else {
      setResizeHandle(handle);
    }
  }, [previewScale]);

  // Handle item drag start
  const handleItemDragStart = useCallback((e, index) => {
    e.preventDefault();
    e.stopPropagation();
    
    const rect = previewRef.current.getBoundingClientRect();
    const item = arrangedItems[index];
    
    const mouseX = (e.clientX - rect.left) / previewScale;
    const mouseY = (e.clientY - rect.top) / previewScale;
    
    dragOffset.current = {
      x: mouseX - item.previewX,
      y: mouseY - item.previewY
    };
    
    setIsDraggingItem(true);
    setDraggedItemIndex(index);
  }, [arrangedItems, previewScale]);

  // Handle mouse move
  const handleMouseMove = useCallback((e) => {
    if (!previewRef.current) return;
    
    const rect = previewRef.current.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left) / previewScale;
    const mouseY = (e.clientY - rect.top) / previewScale;

    if (isDraggingMarquee) {
      const deltaX = mouseX - lastMousePos.current.x;
      const deltaY = mouseY - lastMousePos.current.y;
      
      setMarqueeBounds(prev => ({
        ...prev,
        x: Math.max(0, Math.min(prev.x + deltaX, canvasSize.width - prev.width)),
        y: Math.max(0, Math.min(prev.y + deltaY, canvasSize.height - prev.height))
      }));
      
      lastMousePos.current = { x: mouseX, y: mouseY };
    } else if (resizeHandle) {
      const bounds = { ...marqueeBounds };
      
      switch (resizeHandle) {
        case 'tl':
          bounds.width = Math.max(100, bounds.x + bounds.width - mouseX);
          bounds.height = Math.max(100, bounds.y + bounds.height - mouseY);
          bounds.x = Math.min(mouseX, bounds.x + bounds.width - 100);
          bounds.y = Math.min(mouseY, bounds.y + bounds.height - 100);
          break;
        case 'tr':
          bounds.width = Math.max(100, mouseX - bounds.x);
          bounds.height = Math.max(100, bounds.y + bounds.height - mouseY);
          bounds.y = Math.min(mouseY, bounds.y + bounds.height - 100);
          break;
        case 'bl':
          bounds.width = Math.max(100, bounds.x + bounds.width - mouseX);
          bounds.height = Math.max(100, mouseY - bounds.y);
          bounds.x = Math.min(mouseX, bounds.x + bounds.width - 100);
          break;
        case 'br':
          bounds.width = Math.max(100, mouseX - bounds.x);
          bounds.height = Math.max(100, mouseY - bounds.y);
          break;
      }
      
      // Apply aspect ratio if set
      if (aspectRatio) {
        const currentAspect = bounds.width / bounds.height;
        if (currentAspect > aspectRatio) {
          bounds.height = bounds.width / aspectRatio;
        } else {
          bounds.width = bounds.height * aspectRatio;
        }
      }
      
      setMarqueeBounds(bounds);
    } else if (isDraggingItem && draggedItemIndex !== null) {
      // Drag individual item
      const newX = mouseX - dragOffset.current.x;
      const newY = mouseY - dragOffset.current.y;
      
      setArrangedItems(prev => {
        const updated = [...prev];
        updated[draggedItemIndex] = {
          ...updated[draggedItemIndex],
          previewX: newX,
          previewY: newY
        };
        return updated;
      });
    }
  }, [isDraggingMarquee, resizeHandle, isDraggingItem, draggedItemIndex, aspectRatio, previewScale, canvasSize, marqueeBounds]);

  const handleMouseUp = useCallback(() => {
    setIsDraggingMarquee(false);
    setResizeHandle(null);
    setIsDraggingItem(false);
    setDraggedItemIndex(null);
    
    // Re-arrange items after marquee change
    if (resizeHandle || isDraggingMarquee) {
      arrangeItemsInMarquee();
    }
  }, [resizeHandle, isDraggingMarquee, arrangeItemsInMarquee]);

  // Handle item swap on drop
  const handleItemDrop = useCallback((e, targetIndex) => {
    if (!isDraggingItem || draggedItemIndex === null || draggedItemIndex === targetIndex) return;
    
    e.preventDefault();
    
    setArrangedItems(prev => {
      const updated = [...prev];
      const draggedItem = updated[draggedItemIndex];
      const targetItem = updated[targetIndex];
      
      // Swap positions
      const tempX = draggedItem.previewX;
      const tempY = draggedItem.previewY;
      const tempWidth = draggedItem.previewWidth;
      const tempHeight = draggedItem.previewHeight;
      
      updated[draggedItemIndex] = {
        ...draggedItem,
        previewX: targetItem.previewX,
        previewY: targetItem.previewY,
        previewWidth: targetItem.previewWidth,
        previewHeight: targetItem.previewHeight
      };
      
      updated[targetIndex] = {
        ...targetItem,
        previewX: tempX,
        previewY: tempY,
        previewWidth: tempWidth,
        previewHeight: tempHeight
      };
      
      return updated;
    });
  }, [isDraggingItem, draggedItemIndex]);

  // Apply arrangement
  const applyArrangement = useCallback(() => {
    if (!arrangedItems.length) return;
    
    // Calculate final positions with scaling
    const scale = config.scaleToFit ? calculateScaleToFit(arrangedItems, marqueeBounds) : 1;
    
    const finalArrangement = arrangedItems.map(item => ({
      id: item.originalId || item.id,
      x: item.previewX,
      y: item.previewY,
      width: item.previewWidth,
      height: item.previewHeight,
      rotation: 0
    }));
    
    onArrange(finalArrangement);
  }, [arrangedItems, config, calculateScaleToFit, marqueeBounds, onArrange]);

  // Mouse event listeners
  useEffect(() => {
    if (isDraggingMarquee || resizeHandle || isDraggingItem) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDraggingMarquee, resizeHandle, isDraggingItem, handleMouseMove, handleMouseUp]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 w-full max-w-3xl">
      <h3 className="text-lg font-semibold mb-4 flex items-center">
        <Grid className="mr-2" size={20} />
        Auto Arrange - Target Zone
      </h3>
      
      <div className="space-y-4">
        {/* Controls */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setMarqueeActive(!marqueeActive)}
              className={`px-3 py-1 rounded text-sm ${marqueeActive ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}
            >
              <MousePointer size={14} className="inline mr-1" />
              Target Zone
            </button>
            
            <button
              onClick={handleRandomize}
              className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 text-sm"
            >
              <Shuffle size={14} className="inline mr-1" />
              Shuffle
            </button>
            
            <button
              onClick={arrangeItemsInMarquee}
              className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
            >
              <AlignHorizontalJustifyCenter size={14} className="inline mr-1" />
              Re-arrange
            </button>
          </div>
          
          {/* Zoom controls */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setPreviewScale(Math.max(0.5, previewScale - 0.1))}
              className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              <ZoomOut size={16} />
            </button>
            <span className="text-sm">{Math.round(previewScale * 100)}%</span>
            <button
              onClick={() => setPreviewScale(Math.min(2, previewScale + 0.1))}
              className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              <ZoomIn size={16} />
            </button>
          </div>
        </div>
        
        {/* Aspect ratio selector */}
        {marqueeActive && (
          <div className="flex items-center space-x-2">
            <span className="text-sm">Aspect:</span>
            {aspectRatios.map(ratio => (
              <button
                key={ratio.label}
                onClick={() => setAspectRatio(ratio.value)}
                className={`p-1.5 rounded ${aspectRatio === ratio.value ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}
                title={ratio.label}
              >
                {ratio.icon}
              </button>
            ))}
          </div>
        )}
        
        {/* Settings */}
        <div className="flex items-center space-x-4">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={config.scaleToFit}
              onChange={(e) => setConfig({...config, scaleToFit: e.target.checked})}
              className="rounded"
            />
            <span className="text-sm">Scale to fit</span>
          </label>
          
          <div className="flex items-center space-x-2">
            <span className="text-sm">Padding:</span>
            <input
              type="number"
              value={config.padding}
              onChange={(e) => setConfig({...config, padding: parseInt(e.target.value) || 0})}
              className="w-16 px-2 py-1 rounded border text-sm"
              min="0"
              max="50"
            />
          </div>
        </div>
        
        {/* Preview Canvas */}
        <div 
          ref={previewRef}
          className="relative bg-gray-100 dark:bg-gray-900 rounded-lg overflow-hidden"
          style={{ height: '500px' }}
        >
          <div
            className="absolute inset-0"
            style={{
              transform: `scale(${previewScale})`,
              transformOrigin: 'center',
              width: canvasSize.width,
              height: canvasSize.height,
              left: '50%',
              top: '50%',
              marginLeft: -canvasSize.width / 2,
              marginTop: -canvasSize.height / 2
            }}
          >
            {/* Grid background */}
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `
                  linear-gradient(to right, rgba(0,0,0,0.05) 1px, transparent 1px),
                  linear-gradient(to bottom, rgba(0,0,0,0.05) 1px, transparent 1px)
                `,
                backgroundSize: '20px 20px'
              }}
            />
            
            {/* Target zone marquee */}
            {marqueeActive && (
              <div
                className="absolute border-2 border-blue-500 bg-blue-500 bg-opacity-10"
                style={{
                  left: marqueeBounds.x,
                  top: marqueeBounds.y,
                  width: marqueeBounds.width,
                  height: marqueeBounds.height
                }}
              >
                {/* Resize handles */}
                <div
                  className="absolute -top-2 -left-2 w-4 h-4 bg-blue-500 rounded-full cursor-nw-resize"
                  onMouseDown={(e) => handleMarqueeMouseDown(e, 'tl')}
                />
                <div
                  className="absolute -top-2 -right-2 w-4 h-4 bg-blue-500 rounded-full cursor-ne-resize"
                  onMouseDown={(e) => handleMarqueeMouseDown(e, 'tr')}
                />
                <div
                  className="absolute -bottom-2 -left-2 w-4 h-4 bg-blue-500 rounded-full cursor-sw-resize"
                  onMouseDown={(e) => handleMarqueeMouseDown(e, 'bl')}
                />
                <div
                  className="absolute -bottom-2 -right-2 w-4 h-4 bg-blue-500 rounded-full cursor-se-resize"
                  onMouseDown={(e) => handleMarqueeMouseDown(e, 'br')}
                />
                
                {/* Move handle */}
                <div
                  className="absolute inset-0 cursor-move"
                  onMouseDown={(e) => handleMarqueeMouseDown(e, 'move')}
                />
              </div>
            )}
            
            {/* Preview items */}
            {arrangedItems.map((item, index) => (
              <div
                key={item.originalId || item.id}
                className={`absolute bg-gray-300 dark:bg-gray-600 border-2 border-gray-400 dark:border-gray-500 rounded cursor-move hover:border-blue-400 transition-colors ${
                  isDraggingItem && draggedItemIndex === index ? 'opacity-50' : ''
                }`}
                style={{
                  left: item.previewX,
                  top: item.previewY,
                  width: item.previewWidth,
                  height: item.previewHeight
                }}
                onMouseDown={(e) => handleItemDragStart(e, index)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleItemDrop(e, index)}
              >
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs font-bold text-gray-700 dark:text-gray-200">
                    {index + 1}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex justify-end space-x-2">
          <button
            onClick={applyArrangement}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            disabled={arrangedItems.length === 0}
          >
            Apply Arrangement
          </button>
        </div>
        
        {/* Info */}
        <div className="text-xs text-gray-500 dark:text-gray-400">
          {arrangedItems.length} items ready to arrange. 
          {marqueeActive && ' Drag the blue zone to set target area.'}
        </div>
      </div>
    </div>
  );
};

export default AutoArrangePanel;