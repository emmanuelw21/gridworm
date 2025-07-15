import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  X, Edit, CheckSquare, Music, AlertTriangle, FileX,
  Maximize, Minimize, GridIcon, Move, Filter, Target, Copy,
  MoveHorizontal, List, Trash2, Dice5, Pencil, Type, Eraser,
  RotateCw, LayoutGrid, ZoomIn, ZoomOut, Ruler, ImageIcon, VideoIcon,
  MousePointer2Icon, Eye, EyeOff, Columns, Rows, Square, RefreshCw
} from 'lucide-react';
import MediaPreview from './MediaPreview';
import { isVideo, isImage, isAudio } from './helpers';

const GridBuilderPanel = ({
  gridConfig,
  onUpdateGridConfig,
  gridSlots,
  mediaFiles,
  gridHasOverflow,
  hoveredItem,
  onHover,
  onRemoveFromSlot,
  onDropToSlot,
  onSelectGridItem,
  onPreviewMedia,
  markSelection,
  onToggleMarkSelection,
  allowNudging,
  onToggleAllowNudging,
  allowDuplicates,
  onToggleAllowDuplicates,
  onClearGrid,
  onAddRandomMedia,
  freeGridMode,
  onToggleFreeGridMode,
}) => {
  // Viewing modes
  const [previewMode, setPreviewMode] = useState('off');
  const [showGridControls, setShowGridControls] = useState(false);
  const [hideBorders, setHideBorders] = useState(false);

  // Grid and layout controls
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [snapToItems, setSnapToItems] = useState(true);
  const [snapDistance, setSnapDistance] = useState(10);
  const [gridLayout, setGridLayout] = useState('auto'); // 'auto', 'flow', 'masonry', etc.
  const [showRulers, setShowRulers] = useState(false);
  const [rulerUnits, setRulerUnits] = useState('px'); // 'px', 'cm', 'in'

  // Transformation states
  const [isResizing, setIsResizing] = useState(false);
  const [resizingItem, setResizingItem] = useState(null);
  const [resizingCorner, setResizingCorner] = useState(null); // 'tl', 'tr', 'bl', 'br'
  const [isRotating, setIsRotating] = useState(false);
  const [rotationOrigin, setRotationOrigin] = useState({ x: 0, y: 0 });
  const [rotationStart, setRotationStart] = useState(0);
  const [rotationStartAngle, setRotationStartAngle] = useState(0);

  // Drag and drop states
  const [isDragging, setIsDragging] = useState(false);
  const [draggedItem, setDraggedItem] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [selectedItems, setSelectedItems] = useState([]);

  // Canvas navigation states
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Drawing states - SIMPLIFIED for better functioning
  const [isPencilMode, setIsPencilMode] = useState(false);
  const [isEraserMode, setIsEraserMode] = useState(false); // 0=off, 1=pixel, 2=clear all
  const [eraserMode, setEraserMode] = useState(0); // 0=off, 1=pixel, 2=clear all
  const [isDrawing, setIsDrawing] = useState(false);
  const [annotations, setAnnotations] = useState([]);
  const [currentPath, setCurrentPath] = useState(null);
  const [strokeColor, setStrokeColor] = useState('#FF0000');
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [textInputMode, setTextInputMode] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [textInputPosition, setTextInputPosition] = useState({ x: 0, y: 0 });
  const [showTextInput, setShowTextInput] = useState(false);

  // Connection visualization
  const [showConnections, setShowConnections] = useState(true);

  // Refs
  const gridContainerRef = useRef(null);
  const drawingCanvasRef = useRef(null);
  const lastPanPositionRef = useRef({ x: 0, y: 0 });

  // Store positions and dimensions of items in free-form layout
  const [freeGridItems, setFreeGridItems] = useState({});

  // Track natural dimensions of media items
  const [mediaDimensions, setMediaDimensions] = useState({});

  // Cycle preview mode
  const cyclePreviewMode = () => {
    setPreviewMode(prev => {
      if (prev === 'off') return 'live';
      if (prev === 'live') return 'hover';
      return 'off';
    });
  };

  // Handle grid config update
  const handleLocalUpdateGridConfig = (key, value) => {
    let numericValue = parseInt(value, 10);
    if (key === "columns" || key === "rows") numericValue = Math.max(1, numericValue);
    if ((key === "cellWidth" || key === "cellHeight") && numericValue < 50) numericValue = 50;

    if (!isNaN(numericValue)) {
      onUpdateGridConfig({ ...gridConfig, [key]: numericValue });
    }
  };

  const totalVisibleSlots = gridConfig.columns * gridConfig.rows;

  // Auto-arrange items in free grid mode - IMPROVED to make items smaller
  const autoArrangeItems = useCallback(() => {
    if (!gridSlots.some(slot => slot !== null)) return;

    const newItems = { ...freeGridItems };
    const containerWidth = gridContainerRef.current?.clientWidth || 800;
    const containerHeight = gridContainerRef.current?.clientHeight || 600;
    const maxWidth = containerWidth - 80;
    const maxHeight = containerHeight - 80;

    // Filter valid slots that aren't already positioned (to avoid resetting)
    const validSlots = gridSlots.filter((slot, idx) => {
      // If nudging is off, preserve existing positions
      if (!allowNudging && slot && freeGridItems[slot.id]) {
        return false;
      }
      return slot !== null;
    });
    
    // Only proceed if we have new items to arrange
    if (validSlots.length === 0) return;
    
    // Calculate optimal grid dimensions
    const totalItems = validSlots.length;
    const aspectRatio = maxWidth / maxHeight;
    
    // Try to find a grid layout that best fits the container
    const columnsApprox = Math.sqrt(totalItems * aspectRatio);
    const rowsApprox = Math.sqrt(totalItems / aspectRatio);
    
    const columns = Math.max(1, Math.round(columnsApprox));
    const rows = Math.ceil(totalItems / columns);
    
    // Calculate item size to fit everything - MAKING ITEMS SMALLER
    const itemWidth = Math.min(
      (maxWidth - (columns - 1) * 20) / (columns * 2.5), // Scale down by 2.5x
      Math.min(150, maxWidth / 4) // Cap at 150px or quarter of container
    );
    const itemHeight = itemWidth * 0.75; // 4:3 aspect ratio
    
    // Place items in a grid
    const PADDING = 20;
    
    validSlots.forEach((slot, index) => {
      // Skip slots that already have a position (if nudging is off)
      if (!allowNudging && freeGridItems[slot.id]) {
        return;
      }

      const col = index % columns;
      const row = Math.floor(index / columns);
      
      const x = PADDING + col * (itemWidth + PADDING);
      const y = PADDING + row * (itemHeight + PADDING);
      
      newItems[slot.id] = {
        ...freeGridItems[slot.id],
        x,
        y,
        width: itemWidth,
        height: itemHeight,
        originalIndex: gridSlots.findIndex(s => s && s.id === slot.id),
        rotation: freeGridItems[slot.id]?.rotation || 0
      };
    });
    
    setFreeGridItems(newItems);
  }, [gridSlots, freeGridItems, allowNudging, gridConfig]);

  // Initialize free grid items when switching to free grid mode
  useEffect(() => {
    if (freeGridMode && Object.keys(freeGridItems).length === 0 && gridSlots.some(slot => slot !== null)) {
      autoArrangeItems();
    }
  }, [freeGridMode, autoArrangeItems, freeGridItems, gridSlots]);

  // Update media dimensions when they become available
  const updateMediaDimensions = (mediaId, width, height) => {
    if (!mediaId) return;

    setMediaDimensions(prev => ({
      ...prev,
      [mediaId]: { width, height }
    }));

    // Update free grid item if it exists and doesn't already have dimensions set
    if (freeGridItems[mediaId] && !freeGridItems[mediaId].hasCustomDimensions) {
      setFreeGridItems(prev => {
        const item = prev[mediaId];
        if (!item) return prev;

        // Maintain aspect ratio but limit size - SCALE DOWN FOR INITIAL DROP
        const maxDimension = 150; // Smaller initial size
        let newWidth = width;
        let newHeight = height;

        if (width > maxDimension || height > maxDimension) {
          const ratio = width / height;
          if (width > height) {
            newWidth = maxDimension;
            newHeight = maxDimension / ratio;
          } else {
            newHeight = maxDimension;
            newWidth = maxDimension * ratio;
          }
        }

        return {
          ...prev,
          [mediaId]: {
            ...item,
            width: newWidth,
            height: newHeight
          }
        };
      });
    }
  };

  // Handle wheel events for zooming
  const handleWheel = (e) => {
    // Control/Alt + wheel for zooming
    if ((e.ctrlKey || e.altKey) && gridContainerRef.current) {
      e.preventDefault();

      // Calculate zoom point based on cursor position
      const rect = gridContainerRef.current.getBoundingClientRect();
      const mouseX = (e.clientX - rect.left) / zoomLevel - panOffset.x;
      const mouseY = (e.clientY - rect.top) / zoomLevel - panOffset.y;

      // Calculate zoom delta
      const delta = e.deltaY < 0 ? 0.05 : -0.05;
      const newZoom = Math.max(0.1, Math.min(5, zoomLevel + delta));

      // Adjust pan offset to zoom around cursor
      const newPanOffsetX = mouseX - (mouseX * newZoom / zoomLevel);
      const newPanOffsetY = mouseY - (mouseY * newZoom / zoomLevel);

      setZoomLevel(newZoom);
      setPanOffset({
        x: panOffset.x + newPanOffsetX,
        y: panOffset.y + newPanOffsetY
      });
    }
  };

  // Helper to find snap points for item positioning
  const findSnapPoints = (item, currentX, currentY) => {
    if (!snapToItems) return { x: currentX, y: currentY };

    let bestX = currentX;
    let bestY = currentY;
    let minXDiff = snapDistance;
    let minYDiff = snapDistance;

    // Check snapping against every other item
    Object.entries(freeGridItems).forEach(([id, otherItem]) => {
      if (id === item.id || (item.ids && item.ids.includes(id))) return;

      // Calculate different potential snap points
      // Left edge to right edge
      const leftToRightDiff = Math.abs((otherItem.x + otherItem.width) - currentX);
      // Right edge to left edge
      const rightToLeftDiff = Math.abs(otherItem.x - (currentX + item.width));
      // Top edge to bottom edge
      const topToBottomDiff = Math.abs((otherItem.y + otherItem.height) - currentY);
      // Bottom edge to top edge
      const bottomToTopDiff = Math.abs(otherItem.y - (currentY + item.height));

      // Left edges align
      const leftAlignDiff = Math.abs(otherItem.x - currentX);
      // Right edges align
      const rightAlignDiff = Math.abs((otherItem.x + otherItem.width) - (currentX + item.width));
      // Top edges align
      const topAlignDiff = Math.abs(otherItem.y - currentY);
      // Bottom edges align
      const bottomAlignDiff = Math.abs((otherItem.y + otherItem.height) - (currentY + item.height));

      // Center alignment
      const centerXDiff = Math.abs((otherItem.x + otherItem.width / 2) - (currentX + item.width / 2));
      const centerYDiff = Math.abs((otherItem.y + otherItem.height / 2) - (currentY + item.height / 2));

      // Find best X snap
      const xDiffs = [
        { diff: leftToRightDiff, value: otherItem.x + otherItem.width },
        { diff: rightToLeftDiff, value: otherItem.x - item.width },
        { diff: leftAlignDiff, value: otherItem.x },
        { diff: rightAlignDiff, value: otherItem.x + otherItem.width - item.width },
        { diff: centerXDiff, value: otherItem.x + otherItem.width / 2 - item.width / 2 }
      ];

      const bestXSnap = xDiffs.reduce((best, current) =>
        current.diff < best.diff ? current : best, { diff: minXDiff, value: bestX });

      if (bestXSnap.diff < minXDiff) {
        minXDiff = bestXSnap.diff;
        bestX = bestXSnap.value;
      }

      // Find best Y snap
      const yDiffs = [
        { diff: topToBottomDiff, value: otherItem.y + otherItem.height },
        { diff: bottomToTopDiff, value: otherItem.y - item.height },
        { diff: topAlignDiff, value: otherItem.y },
        { diff: bottomAlignDiff, value: otherItem.y + otherItem.height - item.height },
        { diff: centerYDiff, value: otherItem.y + otherItem.height / 2 - item.height / 2 }
      ];

      const bestYSnap = yDiffs.reduce((best, current) =>
        current.diff < best.diff ? current : best, { diff: minYDiff, value: bestY });

      if (bestYSnap.diff < minYDiff) {
        minYDiff = bestYSnap.diff;
        bestY = bestYSnap.value;
      }
    });

    return { x: bestX, y: bestY };
  };

  // Start dragging item(s)
  const handleDragStart = (e, slot, slotIndex) => {
    if (!freeGridItems[slot.id]) return;

    const container = gridContainerRef.current;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    const item = freeGridItems[slot.id];

    // Calculate mouse offset within the item
    const offsetX = e.clientX - (containerRect.left + ((item.x * zoomLevel) + (panOffset.x * zoomLevel)));
    const offsetY = e.clientY - (containerRect.top + ((item.y * zoomLevel) + (panOffset.y * zoomLevel)));

    // Check if we're dragging multiple items
    const isMultiDrag = selectedItems.length > 1 && selectedItems.includes(slot.id);

    if (isMultiDrag) {
      // Create a bounding box and relative positions for all selected items
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;

      selectedItems.forEach(id => {
        const selectedItem = freeGridItems[id];
        if (selectedItem) {
          minX = Math.min(minX, selectedItem.x);
          minY = Math.min(minY, selectedItem.y);
          maxX = Math.max(maxX, selectedItem.x + selectedItem.width);
          maxY = Math.max(maxY, selectedItem.y + selectedItem.height);
        }
      });

      const width = maxX - minX;
      const height = maxY - minY;

      // Store offsets of each item relative to the group's top-left corner
      setDraggedItem({
        id: 'multi-selection',
        ids: selectedItems,
        x: minX,
        y: minY,
        width,
        height,
        offsets: selectedItems.map(id => {
          const selectedItem = freeGridItems[id];
          return {
            id,
            offsetX: selectedItem.x - minX,
            offsetY: selectedItem.y - minY,
            width: selectedItem.width,
            height: selectedItem.height
          };
        })
      });
    } else {
      setDraggedItem(slot.id);

      // If dragging a non-selected item, update selection
      if (!selectedItems.includes(slot.id)) {
        setSelectedItems([slot.id]);
      }
    }

    setDragOffset({ x: offsetX, y: offsetY });
    setIsDragging(true);

    // Create invisible drag image for smoother dragging
    const dragImg = document.createElement('div');
    dragImg.style.width = '1px';
    dragImg.style.height = '1px';
    dragImg.style.opacity = '0.01';
    document.body.appendChild(dragImg);
    e.dataTransfer.setDragImage(dragImg, 0, 0);

    // Set compatibility data for standard handlers
    const mediaOriginalIndex = mediaFiles.findIndex(m => m && slot && m.id === slot.id);
    if (mediaOriginalIndex !== -1) {
      e.dataTransfer.setData('text/plain', mediaOriginalIndex.toString());
      e.dataTransfer.setData('application/grid-slot', slotIndex.toString());
      e.dataTransfer.effectAllowed = 'move';
    }

    e.stopPropagation();
  };

  // Handle drag over - implement "bubbly block nudge"
  const handleDragOver = (e) => {
    e.preventDefault();

    if (!isDragging || !draggedItem) return;

    const container = gridContainerRef.current;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();

    // Calculate new position for the drag target(s)
    let dragTargetItems = [];

    if (typeof draggedItem === 'object' && draggedItem.id === 'multi-selection') {
      // Multi-selection drag
      const newGroupX = (e.clientX - containerRect.left - dragOffset.x) / zoomLevel - panOffset.x;
      const newGroupY = (e.clientY - containerRect.top - dragOffset.y) / zoomLevel - panOffset.y;

      // Apply grid snapping if enabled
      let snappedX = newGroupX;
      let snappedY = newGroupY;

      if (snapToGrid) {
        const gridSize = 20;
        snappedX = Math.round(newGroupX / gridSize) * gridSize;
        snappedY = Math.round(newGroupY / gridSize) * gridSize;
      }

      // Apply item snapping if enabled
      if (snapToItems) {
        const snapResult = findSnapPoints(
          {
            id: 'group',
            x: snappedX,
            y: snappedY,
            width: draggedItem.width,
            height: draggedItem.height
          },
          snappedX,
          snappedY
        );
        snappedX = snapResult.x;
        snappedY = snapResult.y;
      }

      // Calculate positions for all items in the group
      dragTargetItems = draggedItem.offsets.map(offset => ({
        id: offset.id,
        x: snappedX + offset.offsetX,
        y: snappedY + offset.offsetY,
        width: offset.width,
        height: offset.height,
        isSelected: true
      }));
    } else {
      // Single item drag
      const item = freeGridItems[draggedItem];

      let newX = (e.clientX - containerRect.left - dragOffset.x) / zoomLevel - panOffset.x;
      let newY = (e.clientY - containerRect.top - dragOffset.y) / zoomLevel - panOffset.y;

      // Apply grid snapping if enabled
      if (snapToGrid) {
        const gridSize = 20;
        newX = Math.round(newX / gridSize) * gridSize;
        newY = Math.round(newY / gridSize) * gridSize;
      }

      // Apply item snapping if enabled
      if (snapToItems) {
        const snapResult = findSnapPoints(item, newX, newY);
        newX = snapResult.x;
        newY = snapResult.y;
      }

      dragTargetItems = [{
        id: draggedItem,
        x: newX,
        y: newY,
        width: item.width,
        height: item.height,
        isSelected: true
      }];
    }

    // Handle nudging if enabled
    if (allowNudging && nudgeMode === 'fluid') {
      // Clone of all items except the ones being dragged
      const staticItems = { ...freeGridItems };
      dragTargetItems.forEach(item => delete staticItems[item.id]);

      // Process all static items to see if they're affected by the dragged items
      let iterations = 0;
      const maxIterations = 5;
      let hasChanges = true;
      const affectedItems = { ...staticItems };

      // Map of item IDs to their new positions
      const updatedItems = {};
      dragTargetItems.forEach(item => {
        updatedItems[item.id] = {
          ...freeGridItems[item.id],
          x: item.x,
          y: item.y
        };
      });

      while (hasChanges && iterations < maxIterations) {
        hasChanges = false;
        iterations++;

        // Process each affected static item
        Object.entries(affectedItems).forEach(([id, staticItem]) => {
          let willUpdateItem = false;
          let closestPushX = 0;
          let closestPushY = 0;
          let minOverlap = Infinity;

          // Check collision with all dragged items and already affected items
          [...dragTargetItems, ...Object.values(updatedItems)].forEach(movingItem => {
            if (id === movingItem.id) return;

            // Check for collision
            if (
              movingItem.x < staticItem.x + staticItem.width &&
              movingItem.x + movingItem.width > staticItem.x &&
              movingItem.y < staticItem.y + staticItem.height &&
              movingItem.y + movingItem.height > staticItem.y
            ) {
              // Calculate overlap on each axis
              const overlapX = Math.min(
                movingItem.x + movingItem.width,
                staticItem.x + staticItem.width
              ) - Math.max(movingItem.x, staticItem.x);

              const overlapY = Math.min(
                movingItem.y + movingItem.height,
                staticItem.y + staticItem.height
              ) - Math.max(movingItem.y, staticItem.y);

              // Find the smallest push required to resolve collision
              const overlap = Math.min(overlapX, overlapY);

              if (overlap < minOverlap) {
                minOverlap = overlap;

                if (overlapX < overlapY) {
                  // Push horizontally
                  if (movingItem.x < staticItem.x) {
                    // Push right
                    closestPushX = overlapX;
                    closestPushY = 0;
                  } else {
                    // Push left
                    closestPushX = -overlapX;
                    closestPushY = 0;
                  }
                } else {
                  // Push vertically
                  if (movingItem.y < staticItem.y) {
                    // Push down
                    closestPushY = overlapY;
                    closestPushX = 0;
                  } else {
                    // Push up
                    closestPushY = -overlapY;
                    closestPushX = 0;
                  }
                }

                willUpdateItem = true;
              }
            }
          });

          // Apply the push if needed
          if (willUpdateItem) {
            hasChanges = true;

            const newX = staticItem.x + closestPushX;
            const newY = staticItem.y + closestPushY;

            // Update the item position
            updatedItems[id] = {
              ...staticItem,
              x: newX,
              y: newY
            };

            // Update in the affected items for next iteration
            affectedItems[id] = {
              ...staticItem,
              x: newX,
              y: newY
            };
          }
        });
      }

      // Update all items positions
      setFreeGridItems(prev => ({
        ...prev,
        ...updatedItems
      }));
    } else {
      // No nudging, just update dragged items
      const updatedItems = {};
      dragTargetItems.forEach(item => {
        updatedItems[item.id] = {
          ...freeGridItems[item.id],
          x: item.x,
          y: item.y
        };
      });

      setFreeGridItems(prev => ({
        ...prev,
        ...updatedItems
      }));
    }
  };

  // Handle drop for new items
  const handleDrop = (e) => {
    e.preventDefault();

    // If dropping a new item from media panel
    if (!isDragging) {
      const mediaOriginalIndexString = e.dataTransfer.getData('text/plain');
      if (mediaOriginalIndexString) {
        const mediaOriginalIndex = parseInt(mediaOriginalIndexString, 10);
        const media = mediaFiles[mediaOriginalIndex];

        if (media) {
          // Calculate drop position in free grid
          const container = gridContainerRef.current;
          if (!container) return;

          const containerRect = container.getBoundingClientRect();
          const dropX = (e.clientX - containerRect.left) / zoomLevel - panOffset.x;
          const dropY = (e.clientY - containerRect.top) / zoomLevel - panOffset.y;

          // Use the standard drop handler but override the position
          onDropToSlot(gridSlots.length, {
            type: 'internal_media',
            mediaOriginalIndex,
            sourceSlotIndex: null,
            position: { x: dropX, y: dropY }
          });
        }
      }
    }

    setIsDragging(false);
    setDraggedItem(null);
  };

  // Handle drag end for cleanup
  const handleDragEnd = () => {
    setIsDragging(false);
    setDraggedItem(null);
  };

  // MOUSE HANDLING - UPDATED FOR PENCIL AND ERASING
  const handleMouseDown = (e) => {
    // Middle mouse button for panning
    if (e.button === 1) { // Middle mouse button
      e.preventDefault();
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
      lastPanPositionRef.current = { x: e.clientX, y: e.clientY };
      return;
    }

    // Primary mouse button (left-click)
    if (e.button === 0) {
      const container = gridContainerRef.current;
      if (!container) return;
      
      const rect = container.getBoundingClientRect();
      const x = (e.clientX - rect.left) / zoomLevel - panOffset.x;
      const y = (e.clientY - rect.top) / zoomLevel - panOffset.y;

      // Handle pencil drawing
      if (isPencilMode) {
        e.preventDefault();
        e.stopPropagation();
        setIsDrawing(true);
        setCurrentPath({
          id: `annotation-${Date.now()}`,
          type: 'path',
          color: strokeColor,
          width: strokeWidth,
          points: [`M ${x} ${y}`] // Start the path
        });
        return;
      }

      // Handle eraser modes
      if (isEraserMode) {
        e.preventDefault();
        e.stopPropagation();
        
        if (eraserMode === 1) { // Pixel-perfect erase
          // Find and remove annotations that are near this point
          setAnnotations(prev => {
            return prev.filter(anno => {
              if (anno.type === 'path') {
                // For paths, check if any point is near
                const points = anno.points.map(p => {
                  const parts = p.split(' ');
                  if (parts[0] === 'M' || parts[0] === 'L') {
                    return { x: parseFloat(parts[1]), y: parseFloat(parts[2]) };
                  }
                  return null;
                }).filter(Boolean);

                return !points.some(p =>
                  Math.sqrt(Math.pow(p.x - x, 2) + Math.pow(p.y - y, 2)) < 20
                );
              }

              if (anno.type === 'text') {
                // For text, check if the click is inside the text area
                return !(
                  x >= anno.x - 10 &&
                  x <= anno.x + 150 &&
                  y >= anno.y - 10 &&
                  y <= anno.y + 30
                );
              }

              return true;
            });
          });
        } else if (eraserMode === 2 && e.detail === 2) { // Double-click clear all
          // Clear all annotations on double-click
          setAnnotations([]);
        }
        return;
      }

      // Handle text input
      if (textInputMode) {
        e.preventDefault();
        e.stopPropagation();
        setShowTextInput(true);
        setTextInputPosition({ x, y });
        setTextInput('');
        setTimeout(() => {
          const input = document.getElementById('text-annotation-input');
          if (input) input.focus();
        }, 10);
        return;
      }

      // Handle selection (if not in a special mode)
      if (!isPencilMode && !isEraserMode && !textInputMode) {
        // Check if clicked on an item
        let clickedOnItem = false;
        let clickedItemId = null;

        Object.entries(freeGridItems).forEach(([id, item]) => {
          // Check if point is inside item, accounting for rotation
          const centerX = item.x + item.width / 2;
          const centerY = item.y + item.height / 2;
          
          // Get vector from center to click point
          const dx = x - centerX;
          const dy = y - centerY;
          
          // If item has rotation, we need to calculate if the point is inside the rotated rectangle
          if (item.rotation) {
            // Convert rotation to radians
            const rad = -item.rotation * Math.PI / 180;
            
            // Rotate point back
            const rotatedX = dx * Math.cos(rad) - dy * Math.sin(rad);
            const rotatedY = dx * Math.sin(rad) + dy * Math.cos(rad);
            
            // Check if rotated point is inside the rectangle
            if (
              Math.abs(rotatedX) <= item.width / 2 &&
              Math.abs(rotatedY) <= item.height / 2
            ) {
              clickedOnItem = true;
              clickedItemId = id;
            }
          } else {
            // No rotation, simple rectangle check
            if (
              x >= item.x &&
              x <= item.x + item.width &&
              y >= item.y &&
              y <= item.y + item.height
            ) {
              clickedOnItem = true;
              clickedItemId = id;
            }
          }
        });

        if (clickedOnItem) {
          // Toggle selection with Ctrl/Cmd key
          if (e.ctrlKey || e.metaKey) {
            setSelectedItems(prev => {
              if (prev.includes(clickedItemId)) {
                return prev.filter(id => id !== clickedItemId);
              } else {
                return [...prev, clickedItemId];
              }
            });
          } else {
            // Select only this item
            setSelectedItems([clickedItemId]);
          }
        } else if (!(e.ctrlKey || e.metaKey)) {
          // Clear selection if clicking empty space
          setSelectedItems([]);
        }
      }
    }
  };

  // Handle mouse move for all functions
  const handleMouseMove = (e) => {
    // Handle panning
    if (isPanning && gridContainerRef.current) {
      const deltaX = e.clientX - lastPanPositionRef.current.x;
      const deltaY = e.clientY - lastPanPositionRef.current.y;

      setPanOffset(prev => ({
        x: prev.x + deltaX / zoomLevel,
        y: prev.y + deltaY / zoomLevel
      }));

      lastPanPositionRef.current = { x: e.clientX, y: e.clientY };
    }

    // Handle drawing with pencil
    if (isDrawing && isPencilMode) {
      const container = gridContainerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const x = (e.clientX - rect.left) / zoomLevel - panOffset.x;
      const y = (e.clientY - rect.top) / zoomLevel - panOffset.y;

      setCurrentPath(prev => {
        if (!prev) return null;
        return {
          ...prev,
          points: [...prev.points, `L ${x} ${y}`] // Continue the path
        };
      });
    }

    // Handle continuous erasing in pixel mode
    if (isEraserMode && eraserMode === 1 && e.buttons === 1) {
      const container = gridContainerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const x = (e.clientX - rect.left) / zoomLevel - panOffset.x;
      const y = (e.clientY - rect.top) / zoomLevel - panOffset.y;

      // Find and remove annotations near this point
      setAnnotations(prev => {
        return prev.filter(anno => {
          if (anno.type === 'path') {
            // For paths, check points
            const points = anno.points.map(p => {
              const parts = p.split(' ');
              if (parts[0] === 'M' || parts[0] === 'L') {
                return { x: parseFloat(parts[1]), y: parseFloat(parts[2]) };
              }
              return null;
            }).filter(Boolean);

            return !points.some(p =>
              Math.sqrt(Math.pow(p.x - x, 2) + Math.pow(p.y - y, 2)) < 20
            );
          }

          if (anno.type === 'text') {
            // For text, check if mouse is over text area
            return !(
              x >= anno.x - 10 &&
              x <= anno.x + 150 &&
              y >= anno.y - 10 &&
              y <= anno.y + 30
            );
          }

          return true;
        });
      });
    }
  };

  // Handle mouse up to end actions
  const handleMouseUp = (e) => {
    // End panning
    if (isPanning) {
      setIsPanning(false);
    }

    // End drawing with pencil
    if (isDrawing && isPencilMode) {
      setIsDrawing(false);
      if (currentPath && currentPath.points.length > 1) {
        setAnnotations(prev => [...prev, currentPath]);
        setCurrentPath(null);
      }
    }
  };

  // Handle text input completion
  const handleTextInputComplete = () => {
    if (textInput.trim() === '') {
      setShowTextInput(false);
      return;
    }

    // Add new text annotation
    const newAnnotation = {
      id: `annotation-${Date.now()}`,
      type: 'text',
      text: textInput,
      x: textInputPosition.x,
      y: textInputPosition.y,
      color: strokeColor,
      fontSize: 16,
      zIndex: annotations.length + 1
    };

    setAnnotations(prev => [...prev, newAnnotation]);
    setShowTextInput(false);
    setTextInput('');
  };

  // Start resizing from any corner
  const startResizing = (e, itemId, corner) => {
    e.preventDefault();
    e.stopPropagation();

    const item = freeGridItems[itemId];
    if (!item) return;

    setIsResizing(true);
    setResizingItem({
      id: itemId,
      startWidth: item.width,
      startHeight: item.height,
      startX: e.clientX,
      startY: e.clientY,
      originalX: item.x,
      originalY: item.y
    });
    setResizingCorner(corner);
  };

  // Handle resizing during mouse move
  const handleMouseMoveResize = useCallback((e) => {
    if (!isResizing || !resizingItem) return;

    const item = freeGridItems[resizingItem.id];
    if (!item) return;

    // Calculate deltas based on mouse movement
    const deltaX = e.clientX - resizingItem.startX;
    const deltaY = e.clientY - resizingItem.startY;

    // Apply resize based on corner being dragged
    const newDimensions = { ...item };

    if (resizingCorner === 'br') { // Bottom-right
      newDimensions.width = Math.max(50, resizingItem.startWidth + deltaX / zoomLevel);
      newDimensions.height = Math.max(50, resizingItem.startHeight + deltaY / zoomLevel);
    } else if (resizingCorner === 'bl') { // Bottom-left
      const newWidth = Math.max(50, resizingItem.startWidth - deltaX / zoomLevel);
      newDimensions.x = resizingItem.originalX - (newWidth - resizingItem.startWidth);
      newDimensions.width = newWidth;
      newDimensions.height = Math.max(50, resizingItem.startHeight + deltaY / zoomLevel);
    } else if (resizingCorner === 'tr') { // Top-right
      newDimensions.width = Math.max(50, resizingItem.startWidth + deltaX / zoomLevel);
      const newHeight = Math.max(50, resizingItem.startHeight - deltaY / zoomLevel);
      newDimensions.y = resizingItem.originalY - (newHeight - resizingItem.startHeight);
      newDimensions.height = newHeight;
    } else if (resizingCorner === 'tl') { // Top-left
      const newWidth = Math.max(50, resizingItem.startWidth - deltaX / zoomLevel);
      const newHeight = Math.max(50, resizingItem.startHeight - deltaY / zoomLevel);
      newDimensions.x = resizingItem.originalX - (newWidth - resizingItem.startWidth);
      newDimensions.y = resizingItem.originalY - (newHeight - resizingItem.startHeight);
      newDimensions.width = newWidth;
      newDimensions.height = newHeight;
    }

    // Maintain aspect ratio if shift is pressed
    if (e.shiftKey) {
      const aspectRatio = resizingItem.startWidth / resizingItem.startHeight;
      
      if (['br', 'tl'].includes(resizingCorner)) {
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
          newDimensions.height = newDimensions.width / aspectRatio;
        } else {
          newDimensions.width = newDimensions.height * aspectRatio;
        }
      } else if (resizingCorner === 'bl') {
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
          newDimensions.height = newDimensions.width / aspectRatio;
        } else {
          const oldWidth = newDimensions.width;
          newDimensions.width = newDimensions.height * aspectRatio;
          newDimensions.x = resizingItem.originalX - (newDimensions.width - resizingItem.startWidth);
        }
      } else if (resizingCorner === 'tr') {
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
          const oldHeight = newDimensions.height;
          newDimensions.height = newDimensions.width / aspectRatio;
          newDimensions.y = resizingItem.originalY - (newDimensions.height - resizingItem.startHeight);
        } else {
          newDimensions.width = newDimensions.height * aspectRatio;
        }
      }
    }

    // Update the item dimensions
    setFreeGridItems(prev => ({
      ...prev,
      [resizingItem.id]: {
        ...prev[resizingItem.id],
        ...newDimensions,
        hasCustomDimensions: true
      }
    }));
  }, [isResizing, resizingItem, freeGridItems, zoomLevel, resizingCorner]);

  // End resizing
  const handleMouseUpResize = useCallback(() => {
    setIsResizing(false);
    setResizingItem(null);
    setResizingCorner(null);
  }, []);

  // Start rotation
  const startRotation = (e, itemId) => {
    e.preventDefault();
    e.stopPropagation();

    const item = freeGridItems[itemId];
    if (!item) return;

    // Calculate center of item as rotation origin
    const centerX = item.x + item.width / 2;
    const centerY = item.y + item.height / 2;

    // Calculate initial angle between mouse and center
    const container = gridContainerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left) / zoomLevel - panOffset.x;
    const mouseY = (e.clientY - rect.top) / zoomLevel - panOffset.y;

    const startAngle = Math.atan2(mouseY - centerY, mouseX - centerX) * (180 / Math.PI);

    setIsRotating(true);
    setRotationOrigin({ x: centerX, y: centerY });
    setRotationStart(startAngle);
    setRotationStartAngle(item.rotation || 0);
  };

  // Handle rotation during mouse move
  const handleMouseMoveRotation = useCallback((e) => {
    if (!isRotating) return;

    const container = gridContainerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left) / zoomLevel - panOffset.x;
    const mouseY = (e.clientY - rect.top) / zoomLevel - panOffset.y;

    // Calculate current angle
    const currentAngle = Math.atan2(mouseY - rotationOrigin.y, mouseX - rotationOrigin.x) * (180 / Math.PI);
    let angleDiff = currentAngle - rotationStart;

    // Snap to 15 degree increments if shift key is pressed
    if (e.shiftKey) {
      angleDiff = Math.round(angleDiff / 15) * 15;
    }

    // Update rotation for all selected items
    const updatedItems = {};

    selectedItems.forEach(id => {
      const item = freeGridItems[id];
      if (item) {
        updatedItems[id] = {
          ...item,
          rotation: ((rotationStartAngle + angleDiff) % 360 + 360) % 360
        };
      }
    });

    setFreeGridItems(prev => ({
      ...prev,
      ...updatedItems
    }));
  }, [isRotating, rotationOrigin, rotationStart, rotationStartAngle, selectedItems, freeGridItems, zoomLevel, panOffset]);

  // End rotation
  const handleMouseUpRotation = useCallback(() => {
    setIsRotating(false);
  }, []);

  // Add event listeners for rotation
  useEffect(() => {
    if (isRotating) {
      document.addEventListener('mousemove', handleMouseMoveRotation);
      document.addEventListener('mouseup', handleMouseUpRotation);

      return () => {
        document.removeEventListener('mousemove', handleMouseMoveRotation);
        document.removeEventListener('mouseup', handleMouseUpRotation);
      };
    }
  }, [isRotating, handleMouseMoveRotation, handleMouseUpRotation]);

  // Add event listeners for resizing
  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMoveResize);
      document.addEventListener('mouseup', handleMouseUpResize);

      return () => {
        document.removeEventListener('mousemove', handleMouseMoveResize);
        document.removeEventListener('mouseup', handleMouseUpResize);
      };
    }
  }, [isResizing, handleMouseMoveResize, handleMouseUpResize]);

  // Toggle pencil mode
  const togglePencilMode = () => {
    // Ensure we exit other modes
    setEraserMode(0);
    setIsEraserMode(false);
    setTextInputMode(false);
    
    // Toggle pencil mode
    setIsPencilMode(prev => !prev);
  };

  // Toggle eraser modes
  const toggleEraserMode = () => {
    // Ensure we exit other modes first
    setIsPencilMode(false);
    setTextInputMode(false);
    
    // Cycle through eraser modes: Off -> Pixel -> Clear All -> Off
    if (eraserMode === 0) {
      setEraserMode(1); // Pixel mode
      setIsEraserMode(true);
    } else if (eraserMode === 1) {
      setEraserMode(2); // Clear all mode
      setIsEraserMode(true);
    } else {
      setEraserMode(0); // Off
      setIsEraserMode(false);
    }
  };

  // Toggle text input mode
  const toggleTextMode = () => {
    // Ensure we exit other modes
    setIsPencilMode(false);
    setEraserMode(0);
    setIsEraserMode(false);
    
    // Toggle text mode
    setTextInputMode(prev => !prev);
  };

  // Find connections between items for visualization
  const findConnections = () => {
    if (!showConnections) return [];

    const connections = [];
    const items = Object.entries(freeGridItems);

    for (let i = 0; i < items.length; i++) {
      const [id1, item1] = items[i];

      for (let j = i + 1; j < items.length; j++) {
        const [id2, item2] = items[j];

        // Skip if either item is currently being dragged
        if (isDragging && (
          (typeof draggedItem === 'string' && draggedItem === id1) ||
          (typeof draggedItem === 'string' && draggedItem === id2) ||
          (typeof draggedItem === 'object' && draggedItem?.ids?.includes(id1)) ||
          (typeof draggedItem === 'object' && draggedItem?.ids?.includes(id2))
        )) {
          continue;
        }

        // Check if items are touching or very close (within 2px)
        const tolerance = 2;

        // Get bounding boxes accounting for rotation
        const bounds1 = getRotatedBounds(item1);
        const bounds2 = getRotatedBounds(item2);

        // Check if bounds are close/touching
        if (
          bounds1.right + tolerance >= bounds2.left &&
          bounds1.left - tolerance <= bounds2.right &&
          bounds1.bottom + tolerance >= bounds2.top &&
          bounds1.top - tolerance <= bounds2.bottom
        ) {
          // Items are touching or very close
          connections.push({ from: id1, to: id2 });
        }
      }
    }

    return connections;
  };

  // Helper to get bounds of rotated item
  const getRotatedBounds = (item) => {
    const centerX = item.x + item.width / 2;
    const centerY = item.y + item.height / 2;
    const halfWidth = item.width / 2;
    const halfHeight = item.height / 2;
    const rotation = (item.rotation || 0) * Math.PI / 180;

    // Find corners of unrotated item relative to center
    const corners = [
      { x: -halfWidth, y: -halfHeight },
      { x: halfWidth, y: -halfHeight },
      { x: halfWidth, y: halfHeight },
      { x: -halfWidth, y: halfHeight }
    ];

    // Rotate corners
    const rotatedCorners = corners.map(corner => {
      const x = corner.x * Math.cos(rotation) - corner.y * Math.sin(rotation);
      const y = corner.x * Math.sin(rotation) + corner.y * Math.cos(rotation);
      return { x: centerX + x, y: centerY + y };
    });

    // Get bounds of rotated item
    const xs = rotatedCorners.map(c => c.x);
    const ys = rotatedCorners.map(c => c.y);

    return {
      left: Math.min(...xs),
      right: Math.max(...xs),
      top: Math.min(...ys),
      bottom: Math.max(...ys)
    };
  };

  // Calculate connections for visualization
  const connections = useMemo(() => {
    return freeGridMode ? findConnections() : [];
  }, [freeGridMode, freeGridItems, showConnections, isDragging, draggedItem]);

  // Rotate selected items by specific degrees
  const rotateSelectedItems = (degrees) => {
    if (selectedItems.length === 0) return;

    const updatedItems = {};
    selectedItems.forEach(id => {
      const item = freeGridItems[id];
      if (item) {
        updatedItems[id] = {
          ...item,
          rotation: ((item.rotation || 0) + degrees) % 360
        };
      }
    });

    setFreeGridItems(prev => ({
      ...prev,
      ...updatedItems
    }));
  };

  return (
    <div className="flex-1 overflow-auto p-4 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100">
      {/* Toolbar */}
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center">
          <h2 className="font-bold dark:text-gray-100">Grid Builder</h2>
          {gridHasOverflow && (
            <div title="Some media items are outside the current grid view." className="ml-2 cursor-help">
              <AlertTriangle size={18} className="text-yellow-500 dark:text-yellow-400" />
            </div>
          )}
          
          <button
            onClick={() => setShowGridControls(prev => !prev)}
            className="ml-3 px-2 py-0.5 text-xs rounded bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 flex items-center"
            title="Toggle grid size controls"
          >
            <GridIcon size={14} className="mr-1" />
            {showGridControls ? 'Hide Controls' : 'Grid Size'}
          </button>
        </div>
        <div className="flex items-center space-x-2">
          {/* View controls */}
          <div className="flex items-center space-x-1 p-1 border border-gray-300 dark:border-gray-600 rounded bg-gray-100 dark:bg-gray-800">
            <button
              onClick={cyclePreviewMode}
              className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
              title={previewMode === 'off' ? 'Grid Preview: OFF (Click selects if enabled)' :
                previewMode === 'live' ? 'Grid Preview: LIVE (Media autoplays)' :
                  'Grid Preview: HOVER (Media plays on hover)'}
            >
              {previewMode === 'off' && <EyeOff size={16} />}
              {previewMode === 'live' && <Eye size={16} />}
              {previewMode === 'hover' && <MousePointer2Icon size={16} />}
            </button>
            <button
              onClick={() => setHideBorders(!hideBorders)}
              title={hideBorders ? "Show grid boundaries" : "Hide grid boundaries"}
              className={`p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 ${hideBorders ? 'text-blue-500 dark:text-blue-400' : 'text-gray-600 dark:text-gray-300'}`}
            >
              <GridIcon size={16} className={hideBorders ? 'opacity-30' : 'opacity-100'} />
            </button>
            <button
              onClick={() => setShowRulers(!showRulers)}
              title={showRulers ? "Hide rulers" : "Show rulers"}
              className={`p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 ${showRulers ? 'text-blue-500 dark:text-blue-400' : 'text-gray-600 dark:text-gray-300'}`}
            >
              <Ruler size={16} />
            </button>
          </div>

          {/* Layout controls */}
          <div className="flex items-center space-x-1 p-1 border border-gray-300 dark:border-gray-600 rounded bg-gray-100 dark:bg-gray-800">
            <button
              onClick={onToggleFreeGridMode}
              title={freeGridMode ? "Use standard grid layout" : "Use free-form grid layout"}
              className={`p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 ${freeGridMode ? 'text-blue-500 dark:text-blue-400' : 'text-gray-600 dark:text-gray-300'}`}
            >
              <Move size={16} />
            </button>
            {freeGridMode && (
              <>
                <button
                  onClick={() => autoArrangeItems('grid')}
                  title="Arrange in grid layout"
                  className={`p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 ${gridLayout === 'grid' ? 'text-blue-500 dark:text-blue-400' : 'text-gray-600 dark:text-gray-300'}`}
                >
                  <LayoutGrid size={16} />
                </button>
                <button
                  onClick={() => setSnapToItems(!snapToItems)}
                  title={snapToItems ? "Disable magnetic snapping" : "Enable magnetic snapping"}
                  className={`p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 ${snapToItems ? 'text-blue-500 dark:text-blue-400' : 'text-gray-600 dark:text-gray-300'}`}
                >
                  <Target size={16} />
                </button>
                <button
                  onClick={() => setSnapToGrid(!snapToGrid)}
                  title={snapToGrid ? "Disable grid snapping" : "Enable grid snapping"}
                  className={`p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 ${snapToGrid ? 'text-blue-500 dark:text-blue-400' : 'text-gray-600 dark:text-gray-300'}`}
                >
                  <GridIcon size={16} />
                </button>
                <button
                  onClick={() => setShowConnections(!showConnections)}
                  title={showConnections ? "Hide item connections" : "Show item connections"}
                  className={`p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 ${showConnections ? 'text-blue-500 dark:text-blue-400' : 'text-gray-600 dark:text-gray-300'}`}
                >
                  <Columns size={16} />
                </button>
              </>
            )}
          </div>

          {/* Drawing tools - only in free grid mode */}
          {freeGridMode && (
            <div className="flex items-center space-x-1 p-1 border border-gray-300 dark:border-gray-600 rounded bg-gray-100 dark:bg-gray-800">
              <button
                onClick={togglePencilMode}
                title={isPencilMode ? "Switch to Select Tool" : "Switch to Pen Tool"}
                className={`p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 ${isPencilMode ? 'text-blue-500 dark:text-blue-400' : 'text-gray-600 dark:text-gray-300'}`}
              >
                <Pencil size={16} />
              </button>
              <button
                onClick={toggleTextMode}
                title={textInputMode ? "Switch to Select Tool" : "Switch to Text Tool"}
                className={`p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 ${textInputMode ? 'text-blue-500 dark:text-blue-400' : 'text-gray-600 dark:text-gray-300'}`}
              >
                <Type size={16} />
              </button>
              <button
                onClick={toggleEraserMode}
                title={
                  eraserMode === 0 ? "Eraser: OFF - Click to Enable Pixel Eraser" : 
                  eraserMode === 1 ? "Eraser: PIXEL - Click & Drag to Erase (Click again for Clear All)" : 
                  "Eraser: CLEAR ALL - Double-click to Clear All Annotations"
                }
                className={`p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 ${
                  eraserMode === 0 ? 'text-gray-600 dark:text-gray-300' : 
                  eraserMode === 1 ? 'text-blue-500 dark:text-blue-400' : 
                  'text-red-500 dark:text-red-400'
                }`}
              >
                <Eraser size={16} />
              </button>
              <button
                onClick={() => rotateSelectedItems(90)}
                title="Rotate selected items 90°"
                className={`p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 ${selectedItems.length > 0 ? 'text-gray-600 dark:text-gray-300' : 'text-gray-400 dark:text-gray-600 cursor-not-allowed'}`}
                disabled={selectedItems.length === 0}
              >
                <RotateCw size={16} />
              </button>
              <div className="relative w-6 h-6 flex items-center justify-center">
                <div
                  className="w-4 h-4 rounded border border-gray-300 dark:border-gray-600 cursor-pointer"
                  style={{ backgroundColor: strokeColor }}
                  title="Select color"
                ></div>
                <input
                  type="color"
                  value={strokeColor}
                  onChange={(e) => setStrokeColor(e.target.value)}
                  className="absolute opacity-0 inset-0 cursor-pointer w-full h-full"
                  aria-label="Color picker"
                />
              </div>
            </div>
          )}

          {/* Media controls */}
          <div className="flex items-center space-x-1 p-1 border border-gray-300 dark:border-gray-600 rounded bg-gray-100 dark:bg-gray-800">
            <button
              onClick={onToggleAllowDuplicates}
              title={allowDuplicates ? "Prevent duplicates in grid" : "Allow duplicates in grid"}
              className={`p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 ${allowDuplicates ? 'text-blue-500 dark:text-blue-400' : 'text-gray-600 dark:text-gray-300'}`}
            >
              <Copy size={16} />
            </button>
            <button
              onClick={onToggleAllowNudging}
              title={allowNudging ? "Disable nudging items in grid" : "Enable nudging items in grid"}
              className={`p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 ${allowNudging ? 'text-blue-500 dark:text-blue-400' : 'text-gray-600 dark:text-gray-300'}`}
            >
              <MoveHorizontal size={16} />
            </button>
            <button
              onClick={onToggleMarkSelection}
              title={markSelection ? "Disable grid click selection" : "Enable grid click selection"}
              className={`p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 ${markSelection ? 'text-blue-500 dark:text-blue-400' : 'text-gray-600 dark:text-gray-300'}`}
            >
              <Target size={16} />
            </button>
            <button
              onClick={onClearGrid}
              title="Clear all items from grid"
              className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
            >
              <Trash2 size={16} />
            </button>
            <button
              onClick={onAddRandomMedia}
              title="Add random media to empty grid slots"
              className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
            >
              <Dice5 size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Grid Controls Panel */}
      {showGridControls && (
        <div className="mb-4 p-3 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1 flex items-center"><Columns size={14} className="mr-1" /> Columns: {gridConfig.columns}</label>
              <input type="range" min="1" max="12" value={gridConfig.columns} onChange={(e) => handleLocalUpdateGridConfig('columns', e.target.value)} className="w-full accent-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 flex items-center"><Rows size={14} className="mr-1" /> Rows: {gridConfig.rows}</label>
              <input type="range" min="1" max="20" value={gridConfig.rows} onChange={(e) => handleLocalUpdateGridConfig('rows', e.target.value)} className="w-full accent-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 flex items-center"><Maximize size={14} className="mr-1" /> Cell Width (px): {gridConfig.cellWidth}</label>
              <input type="range" min="80" max="500" step="10" value={gridConfig.cellWidth} onChange={(e) => handleLocalUpdateGridConfig('cellWidth', e.target.value)} className="w-full accent-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 flex items-center"><Maximize size={14} className="transform rotate-90 mr-1" /> Cell Height (px): {gridConfig.cellHeight}</label>
              <input type="range" min="60" max="500" step="10" value={gridConfig.cellHeight} onChange={(e) => handleLocalUpdateGridConfig('cellHeight', e.target.value)} className="w-full accent-blue-500" />
            </div>
          </div>
          
          {/* Additional settings for free grid mode */}
          {freeGridMode && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 gap-4 mt-3">
              <div>
                <label className="block text-sm font-medium mb-1 flex items-center">
                  <Target size={14} className="mr-1" /> Snap Distance: {snapDistance}px
                </label>
                <input
                  type="range"
                  min="1"
                  max="20"
                  value={snapDistance}
                  onChange={(e) => setSnapDistance(parseInt(e.target.value, 10))}
                  className="w-full accent-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 flex items-center">
                  <ZoomIn size={14} className="mr-1" /> Zoom: {Math.round(zoomLevel * 100)}%
                </label>
                <input
                  type="range"
                  min="10"
                  max="500"
                  value={Math.round(zoomLevel * 100)}
                  onChange={(e) => setZoomLevel(parseInt(e.target.value, 10) / 100)}
                  className="w-full accent-blue-500"
                />
                <div className="flex justify-between mt-1">
                  <button
                    onClick={() => setZoomLevel(1)}
                    className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-xs flex items-center"
                  >
                    <Maximize size={12} className="mr-1" /> Reset
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Preset buttons */}
          <div className="mt-3 flex space-x-2">
            <button onClick={() => onUpdateGridConfig({ ...gridConfig, columns: 3, rows: 3, cellWidth: 160, cellHeight: 120 })} className="px-2 py-1 text-xs bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 rounded">3×3 (Default Size)</button>
            <button onClick={() => onUpdateGridConfig({ ...gridConfig, columns: 4, rows: 3, cellWidth: 160, cellHeight: 120 })} className="px-2 py-1 text-xs bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 rounded">4×3 (Default Size)</button>
            <button onClick={() => onUpdateGridConfig({ ...gridConfig, columns: 1, rows: 1, cellWidth: 320, cellHeight: 240 })} className="px-2 py-1 text-xs bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 rounded">1×1 (Large)</button>
          </div>
        </div>
      )}

      {/* Standard Grid Layout */}
      {!freeGridMode && (
        <div
          className="grid border border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-900 overflow-hidden"
          style={{
            gridTemplateColumns: `repeat(${gridConfig.columns}, ${gridConfig.cellWidth}px)`,
            gridTemplateRows: `repeat(${gridConfig.rows}, ${gridConfig.cellHeight}px)`,
            width: 'max-content',
            gap: '2px',
            minHeight: `${gridConfig.rows * gridConfig.cellHeight}px`,
            maxWidth: '100%',
            overflowX: 'auto'
          }}
        >
          {gridSlots.slice(0, totalVisibleSlots).map((slot, idx) => {
            const isCurrentlyHovered = hoveredItem?.type === 'slot' && hoveredItem.idx === idx;
            const autoplayProp = previewMode === 'live';
            const hoverPlayProp = previewMode === 'hover';

            return (
              <div
                key={idx}
                className={`relative ${hideBorders ? '' : 'border-2 border-dashed border-gray-300 dark:border-gray-600'} flex items-center justify-center
                            dark:bg-gray-800
                            ${hideBorders ? 'hover:bg-gray-100 dark:hover:bg-gray-700' : 'hover:border-blue-500 dark:hover:border-blue-400'}
                            ${slot ? 'cursor-grab' : 'cursor-default'}
                            transition-all duration-150 ease-in-out overflow-hidden`}
                style={{
                  height: `${gridConfig.cellHeight}px`
                }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const droppedFiles = e.dataTransfer.files;
                  if (droppedFiles && droppedFiles.length > 0) {
                    onDropToSlot(idx, { type: 'file', file: droppedFiles[0] });
                  } else {
                    const mediaOriginalIndexString = e.dataTransfer.getData('text/plain');
                    const sourceSlotIndexString = e.dataTransfer.getData('application/grid-slot');
                    if (mediaOriginalIndexString) {
                      const mediaOriginalIndex = parseInt(mediaOriginalIndexString, 10);
                      const sourceSlotIndex = sourceSlotIndexString ? parseInt(sourceSlotIndexString, 10) : null;
                      onDropToSlot(idx, {
                        type: 'internal_media',
                        mediaOriginalIndex,
                        sourceSlotIndex
                      });
                    }
                  }
                }}
                onMouseEnter={() => onHover({ type: 'slot', idx })}
                onMouseLeave={() => onHover(null)}
                onClick={(e) => {
                  if (slot) {
                    if (markSelection && (e.ctrlKey || e.metaKey || e.shiftKey)) {
                      onSelectGridItem(idx, e.shiftKey, e.ctrlKey || e.metaKey);
                    } else if (previewMode === 'off') {
                      if (markSelection) onSelectGridItem(idx, false, false);
                    } else {
                      onPreviewMedia(slot);
                    }
                  }
                }}
                draggable={!!slot}
                onDragStart={(e) => {
                  if (slot) {
                    const mediaOriginalIndex = mediaFiles.findIndex(m => m && slot && m.id === slot.id);
                    if (mediaOriginalIndex !== -1) {
                      e.dataTransfer.setData('text/plain', mediaOriginalIndex.toString());
                      e.dataTransfer.setData('application/grid-slot', idx.toString());
                      e.dataTransfer.effectAllowed = 'move';
                    } else {
                      console.warn("Could not find dragged grid item in mediaFiles array.", slot);
                      e.preventDefault();
                    }
                  } else {
                    e.preventDefault();
                  }
                }}
              >
                {slot ? (
                  <div className="w-full h-full flex items-center justify-center overflow-hidden group">
                    <MediaPreview
                      media={slot}
                      autoplay={autoplayProp}
                      hoverPlay={hoverPlayProp}
                      className="max-w-full max-h-full object-contain"
                      onMediaLoad={(width, height) => updateMediaDimensions(slot.id, width, height)}
                    />
                    {isCurrentlyHovered && previewMode !== 'hover' && (
                      <div className="absolute inset-0 bg-black bg-opacity-60 text-white p-1.5 flex flex-col text-xs justify-between transition-opacity duration-200 pointer-events-none">
                        <div className="flex justify-between items-start">
                          <span className="font-semibold truncate pr-1 flex-grow" title={slot.name}>
                            {slot.isMissing && <AlertTriangle size={14} className="text-amber-400 inline mr-1" />}
                            {slot.name}
                          </span>
                          <button
                            className="text-red-400 hover:text-red-200 p-0.5 rounded-full hover:bg-black/40 flex-shrink-0 pointer-events-auto"
                            onClick={(e) => { e.stopPropagation(); onRemoveFromSlot(idx); }}
                            title="Remove from slot"
                          >
                            <X size={14} />
                          </button>
                        </div>
                        <div className="mt-auto space-y-0.5">
                          {slot.isMissing ? (
                            <div className="text-amber-300">File data missing</div>
                          ) : (
                            <>
                              <div className="flex items-center truncate">
                                {isImage(slot.type) && <ImageIcon size={12} className="mr-1 flex-shrink-0" />}
                                {isVideo(slot.type) && <VideoIcon size={12} className="mr-1 flex-shrink-0" />}
                                {isAudio(slot.type) && <Music size={12} className="mr-1 flex-shrink-0" />}
                                <span className="truncate">{slot.type}</span>
                              </div>
                              <div className="truncate">Size: {slot.size}</div>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-gray-400 flex flex-col items-center justify-center text-xs">
                    <Move size={20} className="mb-1 text-gray-500" />
                    Drop here
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Free-form Grid Layout */}
      {freeGridMode && (
        <div
          ref={gridContainerRef}
          className="relative border border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-900"
          style={{
            minHeight: '500px',
            height: `${Math.max(gridConfig.rows * gridConfig.cellHeight, 500)}px`,
            overflow: 'auto',
            position: 'relative',
            cursor: isPanning ? 'grabbing' : (
              isPencilMode ? 'crosshair' :
              isEraserMode ? (eraserMode === 2 ? 'not-allowed' : 'cell') :
              textInputMode ? 'text' : 'default'
            )
          }}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {/* Rulers */}
          {showRulers && (
            <>
              {/* Horizontal ruler */}
              <div className="absolute top-0 left-8 right-0 h-6 bg-white dark:bg-gray-800 border-b border-r border-gray-300 dark:border-gray-600 overflow-hidden z-30">
                <div
                  className="relative h-full"
                  style={{
                    transform: `translateX(${panOffset.x * zoomLevel}px) scaleX(${zoomLevel})`,
                    transformOrigin: '0 0',
                    width: '10000px'
                  }}
                >
                  {Array.from({ length: 100 }).map((_, i) => (
                    <div
                      key={`h-tick-${i}`}
                      className="absolute top-0 h-6 border-l border-gray-300 dark:border-gray-600"
                      style={{
                        left: `${i * 100}px`,
                        borderLeftWidth: i % 10 === 0 ? '2px' : '1px',
                        height: i % 10 === 0 ? '100%' : (i % 5 === 0 ? '66%' : '33%')
                      }}
                    >
                      {i % 10 === 0 && (
                        <span className="absolute top-0 left-1 text-xs text-gray-600 dark:text-gray-300">
                          {i * 100}
                          {rulerUnits}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Vertical ruler */}
              <div className="absolute top-6 left-0 bottom-0 w-8 bg-white dark:bg-gray-800 border-r border-gray-300 dark:border-gray-600 overflow-hidden z-30">
                <div
                  className="relative w-full"
                  style={{
                    transform: `translateY(${panOffset.y * zoomLevel}px) scaleY(${zoomLevel})`,
                    transformOrigin: '0 0',
                    height: '10000px'
                  }}
                >
                  {Array.from({ length: 100 }).map((_, i) => (
                    <div
                      key={`v-tick-${i}`}
                      className="absolute left-0 w-8 border-t border-gray-300 dark:border-gray-600"
                      style={{
                        top: `${i * 100}px`,
                        borderTopWidth: i % 10 === 0 ? '2px' : '1px',
                        width: i % 10 === 0 ? '100%' : (i % 5 === 0 ? '66%' : '33%')
                      }}
                    >
                      {i % 10 === 0 && (
                        <span className="absolute top-1 left-0 text-xs text-gray-600 dark:text-gray-300 transform -rotate-90 origin-top-left">
                          {i * 100}
                          {rulerUnits}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Ruler intersection */}
              <div className="absolute top-0 left-0 w-8 h-6 bg-white dark:bg-gray-800 border-r border-b border-gray-300 dark:border-gray-600 z-40 flex items-center justify-center">
                <select
                  value={rulerUnits}
                  onChange={(e) => setRulerUnits(e.target.value)}
                  className="text-xs bg-transparent border-none cursor-pointer text-gray-600 dark:text-gray-300"
                  title="Change ruler units"
                >
                  <option value="px">px</option>
                  <option value="cm">cm</option>
                  <option value="in">in</option>
                </select>
              </div>
            </>
          )}

          {/* Grid background with content area - zoom and pan container */}
          <div
            className="absolute left-0 top-0 w-full h-full"
            style={{
              transform: `scale(${zoomLevel}) translate(${panOffset.x}px, ${panOffset.y}px)`,
              transformOrigin: '0 0',
              paddingTop: showRulers ? '6px' : '0',
              paddingLeft: showRulers ? '8px' : '0'
            }}
          >
            {/* Grid guidelines */}
            {snapToGrid && !hideBorders && (
              <div className="absolute inset-0 pointer-events-none">
                <div className="w-full h-full" style={{
                  backgroundSize: '20px 20px',
                  backgroundImage: 'linear-gradient(to right, rgba(128, 128, 128, 0.1) 1px, transparent 1px), linear-gradient(to bottom, rgba(128, 128, 128, 0.1) 1px, transparent 1px)',
                  width: '10000px',
                  height: '10000px',
                  left: '-5000px',
                  top: '-5000px',
                  position: 'absolute'
                }}></div>
              </div>
            )}

            {/* Connection lines between items */}
            {connections.map((connection, index) => {
              const item1 = freeGridItems[connection.from];
              const item2 = freeGridItems[connection.to];

              if (!item1 || !item2) return null;

              // Calculate center points
              const p1CenterX = item1.x + item1.width / 2;
              const p1CenterY = item1.y + item1.height / 2;
              const p2CenterX = item2.x + item2.width / 2;
              const p2CenterY = item2.y + item2.height / 2;

              return (
                <svg
                  key={`connection-${index}`}
                  className="absolute left-0 top-0 pointer-events-none z-[1]"
                  style={{
                    width: '100%',
                    height: '100%'
                  }}
                >
                  <line
                    x1={p1CenterX}
                    y1={p1CenterY}
                    x2={p2CenterX}
                    y2={p2CenterY}
                    stroke="rgba(59, 130, 246, 0.5)"
                    strokeWidth="2"
                    strokeDasharray="4 2"
                  />
                </svg>
              );
            })}

            {/* Annotations */}
            {annotations.map(annotation => {
              if (annotation.type === 'path') {
                return (
                  <svg
                    key={annotation.id}
                    className="absolute left-0 top-0 w-full h-full pointer-events-none"
                    style={{ zIndex: annotation.zIndex }}
                  >
                    <path
                      d={annotation.points.join(' ')}
                      stroke={annotation.color}
                      strokeWidth={annotation.width}
                      fill="none"
                    />
                  </svg>
                );
              }

              if (annotation.type === 'text') {
                return (
                  <div
                    key={annotation.id}
                    className="absolute pointer-events-none"
                    style={{
                      left: `${annotation.x}px`,
                      top: `${annotation.y}px`,
                      color: annotation.color,
                      fontSize: `${annotation.fontSize}px`,
                      fontWeight: 'normal',
                      zIndex: annotation.zIndex
                    }}
                  >
                    {annotation.text}
                  </div>
                );
              }

              return null;
            })}

            {/* Current drawing in progress */}
            {currentPath && (
              <svg
                className="absolute left-0 top-0 w-full h-full pointer-events-none"
                style={{ zIndex: 1000 }}
              >
                <path
                  d={currentPath.points.join(' ')}
                  stroke={currentPath.color}
                  strokeWidth={currentPath.width}
                  fill="none"
                />
              </svg>
            )}

            {/* Media items in free grid */}
            {Object.entries(freeGridItems).map(([id, itemPosition]) => {
              const slot = gridSlots.find(s => s && s.id === id);
              if (!slot) return null;

              const slotIndex = gridSlots.findIndex(s => s && s.id === id);
              const isCurrentlyHovered = hoveredItem?.type === 'slot' && hoveredItem.idx === slotIndex;
              const autoplayProp = previewMode === 'live';
              const hoverPlayProp = previewMode === 'hover';
              const isSelected = selectedItems.includes(id);
              const isConnected = connections.some(conn =>
                conn.from === id || conn.to === id
              );
              const isBeingDragged = isDragging && (
                draggedItem === id ||
                (typeof draggedItem === 'object' && draggedItem?.ids?.includes(id))
              );

              return (
                <div
                  key={id}
                  className={`absolute ${hideBorders ? '' : 'border border-gray-300 dark:border-gray-600'} flex items-center justify-center
                              bg-white dark:bg-gray-800
                              ${isSelected ? 'ring-2 ring-blue-500 z-20' : isConnected ? 'ring-1 ring-blue-300 dark:ring-blue-600 z-10' : ''}
                              ${isBeingDragged ? 'opacity-70' : 'opacity-100'}
                              ${hideBorders ? 'hover:ring-2 hover:ring-blue-300 dark:hover:ring-blue-600' : 'hover:border-blue-500 dark:hover:border-blue-400'}
                              ${!isPencilMode && !isEraserMode && !textInputMode ? 'cursor-grab' : 'cursor-default'} transition-all duration-100 ease-in-out overflow-hidden rounded-md shadow-sm group`}
                  style={{
                    width: `${itemPosition.width}px`,
                    height: `${itemPosition.height}px`,
                    left: `${itemPosition.x}px`,
                    top: `${itemPosition.y}px`,
                    transform: itemPosition.rotation ? `rotate(${itemPosition.rotation}deg)` : 'none',
                    transition: isBeingDragged ? 'none' : 'transform 0.2s ease, box-shadow 0.2s ease',
                    borderRadius: itemPosition.borderRadius || '',
                    zIndex: isSelected || isBeingDragged ? 20 : 10
                  }}
                  onMouseEnter={() => onHover({ type: 'slot', idx: slotIndex })}
                  onMouseLeave={() => onHover(null)}
                  onClick={(e) => {
                    // Only handle clicks if not in a drawing mode
                    if (!isPencilMode && !isEraserMode && !textInputMode) {
                      if (markSelection && (e.ctrlKey || e.metaKey || e.shiftKey)) {
                        onSelectGridItem(slotIndex, e.shiftKey, e.ctrlKey || e.metaKey);
                      } else if (previewMode === 'off') {
                        if (markSelection) onSelectGridItem(slotIndex, false, false);
                      } else {
                        onPreviewMedia(slot);
                      }
                    }
                  }}
                  draggable={!isPencilMode && !isEraserMode && !textInputMode}
                  onDragStart={(e) => {
                    if (!isPencilMode && !isEraserMode && !textInputMode) {
                      handleDragStart(e, slot, slotIndex);
                    }
                  }}
                  onDragEnd={handleDragEnd}
                >
                  <div className="w-full h-full flex items-center justify-center overflow-hidden">
                    <MediaPreview
                      media={slot}
                      autoplay={autoplayProp}
                      hoverPlay={hoverPlayProp}
                      className="max-w-full max-h-full object-contain"
                      onMediaLoad={(width, height) => updateMediaDimensions(slot.id, width, height)}
                    />

                    {/* Hover overlay with info */}
                    {isCurrentlyHovered && previewMode !== 'hover' && !isPencilMode && !isEraserMode && !textInputMode && (
                      <div className="absolute inset-0 bg-black bg-opacity-60 text-white p-1.5 flex flex-col text-xs justify-between transition-opacity duration-200 pointer-events-none z-20">
                        <div className="flex justify-between items-start">
                          <span className="font-semibold truncate pr-1 flex-grow" title={slot.name}>
                            {slot.isMissing && <AlertTriangle size={14} className="text-amber-400 inline mr-1" />}
                            {slot.name}
                          </span>
                          <button
                            className="text-red-400 hover:text-red-200 p-0.5 rounded-full hover:bg-black/40 flex-shrink-0 pointer-events-auto"
                            onClick={(e) => { e.stopPropagation(); onRemoveFromSlot(slotIndex); }}
                            title="Remove from slot"
                          >
                            <X size={14} />
                          </button>
                        </div>
                        <div className="mt-auto space-y-0.5">
                          {slot.isMissing ? (
                            <div className="text-amber-300">File data missing</div>
                          ) : (
                            <>
                              <div className="flex items-center truncate">
                                {isImage(slot.type) && <ImageIcon size={12} className="mr-1 flex-shrink-0" />}
                                {isVideo(slot.type) && <VideoIcon size={12} className="mr-1 flex-shrink-0" />}
                                {isAudio(slot.type) && <Music size={12} className="mr-1 flex-shrink-0" />}
                                <span className="truncate">{slot.type}</span>
                              </div>
                              <div className="truncate">Size: {slot.size}</div>
                            </>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Selection controls */}
                    {isSelected && !isPencilMode && !isEraserMode && !textInputMode && (
                      <>
                        {/* Rotation handle */}
                        <div
className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-6 cursor-move w-5 h-5 bg-blue-500 rounded-full z-30 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 item-control"
                          onMouseDown={(e) => startRotation(e, id)}
                        >
                          <RotateCw size={12} />
                        </div>

                        {/* Resize handles for all corners */}
                        {/* Top-left resize handle */}
                        <div
                          className="absolute top-0 left-0 w-6 h-6 cursor-nw-resize pointer-events-auto z-10 opacity-0 group-hover:opacity-100 item-control"
                          onMouseDown={(e) => startResizing(e, id, 'tl')}
                        >
                          <div className="absolute top-1 left-1 w-3 h-3 border-l-2 border-t-2 border-blue-500"></div>
                        </div>

                        {/* Top-right resize handle */}
                        <div
                          className="absolute top-0 right-0 w-6 h-6 cursor-ne-resize pointer-events-auto z-10 opacity-0 group-hover:opacity-100 item-control"
                          onMouseDown={(e) => startResizing(e, id, 'tr')}
                        >
                          <div className="absolute top-1 right-1 w-3 h-3 border-r-2 border-t-2 border-blue-500"></div>
                        </div>

                        {/* Bottom-left resize handle */}
                        <div
                          className="absolute bottom-0 left-0 w-6 h-6 cursor-sw-resize pointer-events-auto z-10 opacity-0 group-hover:opacity-100 item-control"
                          onMouseDown={(e) => startResizing(e, id, 'bl')}
                        >
                          <div className="absolute bottom-1 left-1 w-3 h-3 border-l-2 border-b-2 border-blue-500"></div>
                        </div>

                        {/* Bottom-right resize handle */}
                        <div
                          className="absolute bottom-0 right-0 w-6 h-6 cursor-se-resize pointer-events-auto z-10 opacity-0 group-hover:opacity-100 item-control"
                          onMouseDown={(e) => startResizing(e, id, 'br')}
                        >
                          <div className="absolute bottom-1 right-1 w-3 h-3 border-r-2 border-b-2 border-blue-500"></div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Text input for annotations */}
            {showTextInput && (
              <div
                className="absolute"
                style={{
                  left: `${textInputPosition.x}px`,
                  top: `${textInputPosition.y}px`,
                  zIndex: 1000
                }}
              >
                <input
                  id="text-annotation-input"
                  type="text"
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleTextInputComplete();
                    } else if (e.key === 'Escape') {
                      setShowTextInput(false);
                      setTextInput('');
                    }
                  }}
                  onBlur={handleTextInputComplete}
                  className="px-2 py-1 border border-blue-500 rounded bg-white text-black"
                  style={{ color: strokeColor }}
                  autoFocus
                />
              </div>
            )}
          </div>

          {/* Drop area for empty free grid */}
          {gridSlots.filter(Boolean).length === 0 && (
            <div
              className="absolute inset-0 flex items-center justify-center text-gray-400 bg-gray-50 dark:bg-gray-800"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const droppedFiles = e.dataTransfer.files;
                if (droppedFiles && droppedFiles.length > 0) {
                  onDropToSlot(0, { type: 'file', file: droppedFiles[0] });
                } else {
                  const mediaOriginalIndexString = e.dataTransfer.getData('text/plain');
                  if (mediaOriginalIndexString) {
                    const mediaOriginalIndex = parseInt(mediaOriginalIndexString, 10);
                    onDropToSlot(0, {
                      type: 'internal_media',
                      mediaOriginalIndex,
                      sourceSlotIndex: null
                    });
                  }
                }
              }}
            >
              <div className="text-center">
                <Move size={32} className="mx-auto mb-2 text-gray-500" />
                <p className="text-sm">Drag and drop media items here to create a free-form layout</p>
                <p className="text-xs mt-2 text-gray-500">Items will snap together when placed close to each other</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Resizing event handlers */}
      {isResizing && (
        <div className="fixed inset-0 cursor-se-resize z-[1000]" />
      )}

      {/* Rotation event handlers */}
      {isRotating && (
        <div className="fixed inset-0 cursor-move z-[1000]" />
      )}
    </div>
  );
};

export default GridBuilderPanel;