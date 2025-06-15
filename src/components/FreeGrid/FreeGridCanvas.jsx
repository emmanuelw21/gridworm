// components/FreeGrid/FreeGridCanvas.jsx
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  Move, Target, Trash2, Dice5, ZoomIn, ZoomOut, Maximize,
  AlignHorizontalJustifyStart, AlignHorizontalJustifyCenter, AlignHorizontalJustifyEnd,
  AlignVerticalJustifyStart, AlignVerticalJustifyCenter, AlignVerticalJustifyEnd,
  AlignHorizontalDistributeCenter, AlignVerticalDistributeCenter,
  Ruler, Grid, Copy, Layers, Lock, Unlock, Download, EyeOff, Eye, MousePointer2Icon,
  CheckSquare, X, Edit3, Type, Book, FileText
} from 'lucide-react';

import MediaPreview from '../MediaGrid/MediaPreview.jsx';
import { PencilTool, TextTool, EraserTool, RotateTool, ColorPicker } from '../DrawingTools.jsx';
import GridItem from '../GridItem.jsx';
import { HorizontalRuler, VerticalRuler, RulerCorner } from '../Rulers.jsx';
import MarqueeSelection from './MarqueeSelection.jsx';
import AlignmentTools from './AlignmentTools.jsx';
import VectorToolbar from './VectorToolbar.jsx';
import AutoArrangePanel from './AutoArrangePanel.jsx';
import VectorPenTool from './VectorPenTool.jsx';
import TextPageCreator from './TextPageCreator.jsx';
import AnimatedBookViewer from '../BookViewer/AnimatedBookViewer.jsx';
import VectorShapeTools from './VectorShapeTools.jsx';


const FreeGridCanvas = ({
  mediaFiles,
  freeGridItems,
  setFreeGridItems,
  selectedMediaItems,
  onMediaItemSelect,
  onPreviewMedia,
  allowDuplicates,
  onToggleAllowDuplicates,
  onClearGrid,
  onAddRandomMedia,
  gridConfig,
  onDropToSlot,
  onAddGridToFreeGrid,
  is3DViewportOpen = false,
  threeDViewportWidth = 0,
  iscollapsed = false,
  onAddMediaFile, // New prop for adding media files
  setMediaFiles, // New prop for updating media files
  onPageMappingConfirm,
}) => {
  // Core state management
  const [selectedItems, setSelectedItems] = useState([]);
  const [hoveredItem, setHoveredItem] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedItems, setDraggedItems] = useState([]);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isResizing, setIsResizing] = useState(false);
  const [resizingItem, setResizingItem] = useState(null);
  const [isRotating, setIsRotating] = useState(false);
  const [rotatingItem, setRotatingItem] = useState(null);
  const [rotationStart, setRotationStart] = useState(0);
  const [previewMode, setPreviewMode] = useState('off'); // 'off', 'live', 'hover'
  const [enableGridSelection, setEnableGridSelection] = useState(true);
  const [showBoundaries, setShowBoundaries] = useState(true);
  const [showAutoArrange, setShowAutoArrange] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  // New state for enhanced features
  const [showTextCreator, setShowTextCreator] = useState(false);
  const [showBookViewer, setShowBookViewer] = useState(false);
  const [vectorPaths, setVectorPaths] = useState([]);
  const [currentBookData, setCurrentBookData] = useState(null);

  // Canvas configuration
  const [canvasSize] = useState({ width: 5000, height: 5000 }); // Large canvas area
  const [activeBounds] = useState({ width: 4000, height: 4000 }); // Active working area

  // Media Panel state
  const [mediaPanelCollapsed, setMediaPanelCollapsed] = useState(false);
  const [mediaPanelPinned, setMediaPanelPinned] = useState(false);

  // Tools state
  const [activeTool, setActiveTool] = useState('select');
  const [showGrid, setShowGrid] = useState(true);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [snapToItems, setSnapToItems] = useState(true);
  const [snapDistance, setSnapDistance] = useState(10);
  const [showRulers, setShowRulers] = useState(false);
  const [rulerUnits, setRulerUnits] = useState('px');
  const [lockedItems, setLockedItems] = useState(new Set());

  // Drawing state
  const [annotations, setAnnotations] = useState([]);
  const [currentAnnotation, setCurrentAnnotation] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [strokeColor, setStrokeColor] = useState('#FF0000');
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [eraserMode, setEraserMode] = useState(0);
  const [fillColor, setFillColor] = useState('rgba(255, 0, 0, 0.3)');
  const [annotationpoints, setAnnotationPoints] = useState([]);


  // Marquee selection state
  const [isMarqueeSelecting, setIsMarqueeSelecting] = useState(false);
  const [marqueeStart, setMarqueeStart] = useState({ x: 0, y: 0 });
  const [marqueeEnd, setMarqueeEnd] = useState({ x: 0, y: 0 });

  // Refs
  const canvasRef = useRef(null);
  const lastPanPositionRef = useRef({ x: 0, y: 0 });
  const gridContainerRef = useRef(null);


  // Get media item by ID
  const getMediaById = (mediaId) => {
    return mediaFiles.find(m => m.id === mediaId);
  };

  // Add preview mode handler
  const cyclePreviewMode = () => {
    setPreviewMode(prev => {
      if (prev === 'off') return 'live';
      if (prev === 'live') return 'hover';
      return 'off';
    });
  };

  // Handle zoom with mouse wheel
  const handleWheel = useCallback((e) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY < 0 ? 0.1 : -0.1;
      setZoomLevel(prev => Math.max(0.1, Math.min(5, prev + delta)));
    }
  }, []);

  // Calculate canvas-relative position
  const getCanvasPosition = useCallback((clientX, clientY) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: (clientX - rect.left) / zoomLevel - panOffset.x,
      y: (clientY - rect.top) / zoomLevel - panOffset.y
    };
  }, [zoomLevel, panOffset]);

  // Vector path completion handler
  const handleVectorPathComplete = useCallback((pathData) => {
    setVectorPaths(prev => [...prev, pathData]);

    // Also add as annotation for consistency
    setAnnotations(prev => [...prev, {
      id: pathData.id,
      type: 'vector',
      path: pathData.path,
      stroke: pathData.stroke,
      strokeWidth: pathData.strokeWidth,
      fill: pathData.fill,
      anchors: pathData.anchors
    }]);
  }, []);

  // Text page creation handler
  const handleTextPageCreate = useCallback((pageDataArray) => {
    // Check if we have the necessary functions
    if (!onAddMediaFile && !setMediaFiles) {
      console.error('Neither onAddMediaFile nor setMediaFiles is available');
      alert('Unable to add pages. Please try again.');
      return;
    }

    // Add to media files using the appropriate method
    if (onAddMediaFile) {
      onAddMediaFile(pageDataArray);
    } else if (setMediaFiles) {
      setMediaFiles(prev => [...prev, ...pageDataArray]);
    }

    // Find the rightmost and bottommost positions of existing items
    let maxX = 100;
    let maxY = 100;

    Object.values(freeGridItems).forEach(item => {
      maxX = Math.max(maxX, item.x + item.width);
      maxY = Math.max(maxY, item.y + item.height);
    });

    // Add to free grid with smart positioning - append to the right or below
    const pageWidth = Math.min(400, gridConfig.cellWidth * 2);
    const pageHeight = Math.min(600, gridConfig.cellHeight * 2.5);
    const spacing = 20;
    const canvasWidth = gridContainerRef.current?.clientWidth || 1200;

    // Determine if we should add horizontally or start a new row
    const startX = maxX + spacing > canvasWidth - pageWidth ? 100 : maxX + spacing;
    const startY = startX === 100 ? maxY + spacing : 100;

    // Calculate columns per row based on available space
    const columnsPerRow = Math.floor((canvasWidth - 100) / (pageWidth + spacing)) || 3;

    pageDataArray.forEach((page, index) => {
      const row = Math.floor(index / columnsPerRow);
      const col = index % columnsPerRow;

      const newItemId = `text-${page.id}`;
      setFreeGridItems(prev => ({
        ...prev,
        [newItemId]: {
          mediaId: page.id,
          x: startX + col * (pageWidth + spacing),
          y: startY + row * (pageHeight + spacing),
          width: pageWidth,
          height: pageHeight,
          rotation: 0,
          zIndex: Object.keys(prev).length + index + 1,
          isTextPage: true,
          metadata: {
            pageNumber: page.metadata.pageNumber,
            totalPages: page.metadata.totalPages
          }
        }
      }));
    });

    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('gridContentChanged', {
        detail: {
          type: 'textPagesAdded',
          count: pageDataArray.length
        }
      }));
    }, 100);

    setShowTextCreator(false);

    // Log creation
    console.log(`Appended ${pageDataArray.length} text pages to grid`);

    // Show success notification
    const notification = document.createElement('div');
    notification.className = 'fixed top-4 right-4 bg-green-600 text-white px-4 py-2 rounded shadow-lg z-50';
    notification.textContent = `${pageDataArray.length} text pages added to grid`;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);

    setShowTextCreator(false);
  }, [onAddMediaFile, setMediaFiles, gridConfig, freeGridItems]);

  // Book preview handler
  // const handlePreviewBook = useCallback(() => {
  //   // Sort items by position (top to bottom, left to right)
  //   const sortedItems = Object.entries(freeGridItems)
  //     .sort((a, b) => {
  //       // Group items by rows (50px tolerance)
  //       if (Math.abs(a[1].y - b[1].y) < 50) {
  //         return a[1].x - b[1].x;
  //       }
  //       return a[1].y - b[1].y;
  //     });

  //   // Build book data with page pairs
  //   const pages = [];
  //   for (let i = 0; i < sortedItems.length; i += 2) {
  //     const frontItem = sortedItems[i];
  //     const backItem = sortedItems[i + 1];

  //     const frontMedia = mediaFiles.find(m => m.id === frontItem[1].mediaId);
  //     const backMedia = backItem ? mediaFiles.find(m => m.id === backItem[1].mediaId) : null;

  //     // Handle text pages and regular media
  //     const getFrontData = () => {
  //       if (!frontMedia) return 'blank.jpg';
  //       if (frontMedia.metadata?.isTextPage) {
  //         return {
  //           type: 'text',
  //           content: frontMedia.metadata.textContent,
  //           settings: frontMedia.metadata.textSettings,
  //           url: frontMedia.url
  //         };
  //       }
  //       return frontMedia.name;
  //     };

  //     const getBackData = () => {
  //       if (!backMedia) return 'blank.jpg';
  //       if (backMedia.metadata?.isTextPage) {
  //         return {
  //           type: 'text',
  //           content: backMedia.metadata.textContent,
  //           settings: backMedia.metadata.textSettings,
  //           url: backMedia.url
  //         };
  //       }
  //       return backMedia.name;
  //     };

  //     pages.push({
  //       front: getFrontData(),
  //       back: getBackData()
  //     });
  //   }

  //   setCurrentBookData({
  //     title: "Grid Preview Book",
  //     author: "Grid Author",
  //     pages: pages,
  //     metadata: {
  //       created: new Date().toISOString(),
  //       totalPages: pages.length
  //     }
  //   });

  //   setShowBookViewer(true);
  // }, [freeGridItems, mediaFiles]);

  // Export book data
  const handleExportBookData = useCallback(() => {
    const sortedItems = Object.entries(freeGridItems)
      .sort((a, b) => {
        if (Math.abs(a[1].y - b[1].y) < 50) {
          return a[1].x - b[1].x;
        }
        return a[1].y - b[1].y;
      });

    const bookPages = [];

    for (let i = 0; i < sortedItems.length; i += 2) {
      const frontItem = sortedItems[i];
      const backItem = sortedItems[i + 1];

      const frontMedia = mediaFiles.find(m => m.id === frontItem[1].mediaId);
      const backMedia = backItem ? mediaFiles.find(m => m.id === backItem[1].mediaId) : null;

      const frontData = frontMedia?.metadata?.isTextPage ? {
        type: 'text',
        content: frontMedia.metadata.textContent,
        settings: frontMedia.metadata.textSettings
      } : frontMedia?.name || 'blank.jpg';

      const backData = backMedia?.metadata?.isTextPage ? {
        type: 'text',
        content: backMedia.metadata.textContent,
        settings: backMedia.metadata.textSettings
      } : backMedia?.name || 'blank.jpg';

      bookPages.push({
        front: frontData,
        back: backData
      });
    }

    const exportData = {
      title: "Exported Book",
      author: "Emmanuel Whyte",
      pages: bookPages,
      annotations: annotations,
      vectorPaths: vectorPaths,
      metadata: {
        created: new Date().toISOString(),
        totalPages: bookPages.length,
        hasTextPages: bookPages.some(p =>
          (typeof p.front === 'object' && p.front.type === 'text') ||
          (typeof p.back === 'object' && p.back.type === 'text')
        ),
        hasVectorContent: vectorPaths.length > 0
      }
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `book-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [freeGridItems, mediaFiles, annotations, vectorPaths]);

  // Snap to grid
  const snapToGridPosition = useCallback((x, y) => {
    if (!snapToGrid) return { x, y };
    const gridSize = 20;
    return {
      x: Math.round(x / gridSize) * gridSize,
      y: Math.round(y / gridSize) * gridSize
    };
  }, [snapToGrid]);

  // Find snap points for items
  const findSnapPoints = useCallback((item, currentX, currentY) => {
    if (!snapToItems) return { x: currentX, y: currentY };

    let bestX = currentX;
    let bestY = currentY;
    let minXDiff = snapDistance;
    let minYDiff = snapDistance;

    Object.entries(freeGridItems).forEach(([id, otherItem]) => {
      if (id === item.id || selectedItems.includes(id)) return;

      // Calculate all possible snap alignments
      const snapCandidates = [
        // Left edge alignment
        { diff: Math.abs(otherItem.x - currentX), x: otherItem.x },
        // Right edge alignment
        { diff: Math.abs((otherItem.x + otherItem.width) - (currentX + item.width)), x: otherItem.x + otherItem.width - item.width },
        // Center alignment
        { diff: Math.abs((otherItem.x + otherItem.width / 2) - (currentX + item.width / 2)), x: otherItem.x + otherItem.width / 2 - item.width / 2 },
        // Right to left
        { diff: Math.abs(otherItem.x - (currentX + item.width)), x: otherItem.x - item.width },
        // Left to right
        { diff: Math.abs((otherItem.x + otherItem.width) - currentX), x: otherItem.x + otherItem.width }
      ];

      snapCandidates.forEach(candidate => {
        if (candidate.diff < minXDiff) {
          minXDiff = candidate.diff;
          bestX = candidate.x;
        }
      });

      // Similar logic for Y axis
      const ySnapCandidates = [
        { diff: Math.abs(otherItem.y - currentY), y: otherItem.y },
        { diff: Math.abs((otherItem.y + otherItem.height) - (currentY + item.height)), y: otherItem.y + otherItem.height - item.height },
        { diff: Math.abs((otherItem.y + otherItem.height / 2) - (currentY + item.height / 2)), y: otherItem.y + otherItem.height / 2 - item.height / 2 },
        { diff: Math.abs(otherItem.y - (currentY + item.height)), y: otherItem.y - item.height },
        { diff: Math.abs((otherItem.y + otherItem.height) - currentY), y: otherItem.y + otherItem.height }
      ];

      ySnapCandidates.forEach(candidate => {
        if (candidate.diff < minYDiff) {
          minYDiff = candidate.diff;
          bestY = candidate.y;
        }
      });
    });

    return { x: bestX, y: bestY };
  }, [snapToItems, snapDistance, freeGridItems, selectedItems]);

  // Handle marquee selection
  const updateMarqueeSelection = useCallback(() => {
    if (!isMarqueeSelecting) return;

    const rect = {
      left: Math.min(marqueeStart.x, marqueeEnd.x),
      top: Math.min(marqueeStart.y, marqueeEnd.y),
      right: Math.max(marqueeStart.x, marqueeEnd.x),
      bottom: Math.max(marqueeStart.y, marqueeEnd.y)
    };

    const newSelection = [];
    Object.entries(freeGridItems).forEach(([id, item]) => {
      if (lockedItems.has(id)) return;

      const itemRect = {
        left: item.x,
        top: item.y,
        right: item.x + item.width,
        bottom: item.y + item.height
      };

      // Check if rectangles intersect
      if (rect.left < itemRect.right &&
        rect.right > itemRect.left &&
        rect.top < itemRect.bottom &&
        rect.bottom > itemRect.top) {
        newSelection.push(id);
      }
    });

    setSelectedItems(newSelection);
  }, [isMarqueeSelecting, marqueeStart, marqueeEnd, freeGridItems, lockedItems]);

  // Mouse event handlers
  const handleMouseDown = useCallback((e) => {
    if (e.button === 1) { // Middle mouse button for panning
      e.preventDefault();
      setIsPanning(true);
      lastPanPositionRef.current = { x: e.clientX, y: e.clientY };
      return;
    }

    const canvasPos = getCanvasPosition(e.clientX, e.clientY);

    // Check if clicking on an item
    let clickedItemId = null;
    let clickedItem = null;

    // Iterate in reverse to get topmost item
    const sortedItems = Object.entries(freeGridItems).sort((a, b) =>
      (b[1].zIndex || 0) - (a[1].zIndex || 0)
    );

    for (const [id, item] of sortedItems) {
      if (canvasPos.x >= item.x &&
        canvasPos.x <= item.x + item.width &&
        canvasPos.y >= item.y &&
        canvasPos.y <= item.y + item.height) {
        clickedItemId = id;
        clickedItem = item;

        // Check for double-click
        if (e.detail === 2) {
          handleDoubleClick(id);
          return;
        }
        break;
      }
    }

    // Handle preview mode
    if (previewMode === 'live' && clickedItem) {
      const media = getMediaById(clickedItem.mediaId);
      if (media) {
        onPreviewMedia(media);
      }
      return;
    }

    // Handle grid selection
    if (enableGridSelection && clickedItem) {
      const mediaIndex = mediaFiles.findIndex(m => m.id === clickedItem.mediaId);
      if (mediaIndex !== -1) {
        onMediaItemSelect(mediaIndex, e.shiftKey, e.ctrlKey || e.metaKey);
      }
    }

    if (activeTool === 'select') {
      if (clickedItemId) {
        if (!lockedItems.has(clickedItemId)) {
          // Handle selection
          if (e.ctrlKey || e.metaKey) {
            setSelectedItems(prev =>
              prev.includes(clickedItemId)
                ? prev.filter(id => id !== clickedItemId)
                : [...prev, clickedItemId]
            );
          } else if (!selectedItems.includes(clickedItemId)) {
            setSelectedItems([clickedItemId]);
          }

          // Start dragging
          setIsDragging(true);
          setDraggedItems(selectedItems.includes(clickedItemId) ? selectedItems : [clickedItemId]);
          setDragOffset({
            x: canvasPos.x - clickedItem.x,
            y: canvasPos.y - clickedItem.y
          });
        }
      } else {
        // Start marquee selection
        setIsMarqueeSelecting(true);
        setMarqueeStart(canvasPos);
        setMarqueeEnd(canvasPos);
        if (!e.ctrlKey && !e.metaKey) {
          setSelectedItems([]);
        }
      }
    } else if (activeTool === 'pen') {
      setIsDrawing(true);
      setCurrentAnnotation({
        id: `annotation-${Date.now()}`,
        type: 'path',
        color: strokeColor,
        width: strokeWidth,
        points: [`M ${canvasPos.x} ${canvasPos.y}`]
      });
    } else if (activeTool === 'text') {
      // Text tool is handled by the modal
      setShowTextCreator(true);
    } else if (activeTool === 'eraser' && eraserMode === 1) {
      // Start erasing
      setIsDrawing(true);
    }
  }, [activeTool, getCanvasPosition, freeGridItems, selectedItems, strokeColor, strokeWidth, eraserMode, lockedItems, previewMode, enableGridSelection, mediaFiles, onMediaItemSelect, onPreviewMedia]);

  const handleMouseMove = useCallback((e) => {
    const canvasPos = getCanvasPosition(e.clientX, e.clientY);

    if (isPanning) {
      const deltaX = e.clientX - lastPanPositionRef.current.x;
      const deltaY = e.clientY - lastPanPositionRef.current.y;
      setPanOffset(prev => ({
        x: prev.x + deltaX / zoomLevel,
        y: prev.y + deltaY / zoomLevel
      }));
      lastPanPositionRef.current = { x: e.clientX, y: e.clientY };
    } else if (isDragging && draggedItems.length > 0) {
      // Handle dragging multiple items
      const primaryItem = freeGridItems[draggedItems[0]];
      if (!primaryItem) return;

      let newX = canvasPos.x - dragOffset.x;
      let newY = canvasPos.y - dragOffset.y;

      // Apply snapping
      const snappedPos = snapToGridPosition(newX, newY);
      const itemSnappedPos = findSnapPoints(
        { ...primaryItem, width: primaryItem.width, height: primaryItem.height },
        snappedPos.x,
        snappedPos.y
      );

      const deltaX = itemSnappedPos.x - primaryItem.x;
      const deltaY = itemSnappedPos.y - primaryItem.y;

      // Update all dragged items
      const updates = {};
      draggedItems.forEach(id => {
        const item = freeGridItems[id];
        if (item && !lockedItems.has(id)) {
          updates[id] = {
            ...item,
            x: item.x + deltaX,
            y: item.y + deltaY
          };
        }
      });

      setFreeGridItems(prev => ({ ...prev, ...updates }));
    } else if (isMarqueeSelecting) {
      setMarqueeEnd(canvasPos);
      updateMarqueeSelection();
    } else if (isDrawing && activeTool === 'pen') {
      setCurrentAnnotation(prev => ({
        ...prev,
        points: [...prev.points, `L ${canvasPos.x} ${canvasPos.y}`]
      }));
    } else if (isDrawing && activeTool === 'eraser' && eraserMode === 1) {
      // Erase annotations under cursor
      eraseAtPosition(canvasPos);
    } else if (isResizing && resizingItem) {
      handleResize(e);
    } else if (isRotating && rotatingItem) {
      handleRotate(e);
    }
  }, [isPanning, isDragging, isMarqueeSelecting, isDrawing, isResizing, isRotating,
    getCanvasPosition, zoomLevel, draggedItems, dragOffset, freeGridItems,
    snapToGridPosition, findSnapPoints, updateMarqueeSelection, activeTool,
    eraserMode, resizingItem, rotatingItem, lockedItems]);

  const handleMouseUp = useCallback(() => {
    if (isDrawing && currentAnnotation && activeTool === 'pen') {
      setAnnotations(prev => [...prev, currentAnnotation]);
      setCurrentAnnotation(null);
    }

    setIsPanning(false);
    setIsDragging(false);
    setIsMarqueeSelecting(false);
    setIsDrawing(false);
    setIsResizing(false);
    setIsRotating(false);
    setDraggedItems([]);
    setResizingItem(null);
    setRotatingItem(null);
  }, [isDrawing, currentAnnotation, activeTool]);

  // Resize handling
  const handleResizeHandles = useCallback((e, itemId, handle) => {
    e.stopPropagation();
    setIsResizing(true);
    setResizingItem({
      id: itemId,
      handle,
      startX: e.clientX,
      startY: e.clientY,
      startItem: { ...freeGridItems[itemId] }
    });
  }, [freeGridItems]);

  const handleResize = useCallback((e) => {
    if (!resizingItem) return;

    const deltaX = (e.clientX - resizingItem.startX) / zoomLevel;
    const deltaY = (e.clientY - resizingItem.startY) / zoomLevel;
    const item = resizingItem.startItem;

    let newX = item.x;
    let newY = item.y;
    let newWidth = item.width;
    let newHeight = item.height;

    switch (resizingItem.handle) {
      case 'tl':
        newX = item.x + deltaX;
        newY = item.y + deltaY;
        newWidth = item.width - deltaX;
        newHeight = item.height - deltaY;
        break;
      case 'tr':
        newY = item.y + deltaY;
        newWidth = item.width + deltaX;
        newHeight = item.height - deltaY;
        break;
      case 'bl':
        newX = item.x + deltaX;
        newWidth = item.width - deltaX;
        newHeight = item.height + deltaY;
        break;
      case 'br':
        newWidth = item.width + deltaX;
        newHeight = item.height + deltaY;
        break;
      case 't':
        newY = item.y + deltaY;
        newHeight = item.height - deltaY;
        break;
      case 'b':
        newHeight = item.height + deltaY;
        break;
      case 'l':
        newX = item.x + deltaX;
        newWidth = item.width - deltaX;
        break;
      case 'r':
        newWidth = item.width + deltaX;
        break;
    }

    // Minimum size constraints
    if (newWidth < 50) {
      if (['tl', 'bl', 'l'].includes(resizingItem.handle)) {
        newX = item.x + item.width - 50;
      }
      newWidth = 50;
    }
    if (newHeight < 50) {
      if (['tl', 'tr', 't'].includes(resizingItem.handle)) {
        newY = item.y + item.height - 50;
      }
      newHeight = 50;
    }

    setFreeGridItems(prev => ({
      ...prev,
      [resizingItem.id]: {
        ...prev[resizingItem.id],
        x: newX,
        y: newY,
        width: newWidth,
        height: newHeight
      }
    }));
  }, [resizingItem, zoomLevel]);

  // Double-click to fit media dimensions
  const handleDoubleClick = useCallback((itemId) => {
    const item = freeGridItems[itemId];
    const media = getMediaById(item.mediaId);
    if (!media || !item) return;

    // Create a temporary image/video element to get natural dimensions
    if (media.type.startsWith('image/')) {
      const img = new Image();
      img.onload = () => {
        setFreeGridItems(prev => ({
          ...prev,
          [itemId]: {
            ...prev[itemId],
            width: img.naturalWidth,
            height: img.naturalHeight
          }
        }));
      };
      img.src = media.url;
    } else if (media.type.startsWith('video/')) {
      const video = document.createElement('video');
      video.onloadedmetadata = () => {
        setFreeGridItems(prev => ({
          ...prev,
          [itemId]: {
            ...prev[itemId],
            width: video.videoWidth,
            height: video.videoHeight
          }
        }));
      };
      video.src = media.url;
    }
  }, [freeGridItems]);

  // Rotation handling
  const startRotation = useCallback((e, itemId) => {
    e.stopPropagation();
    const item = freeGridItems[itemId];
    if (!item) return;

    const centerX = item.x + item.width / 2;
    const centerY = item.y + item.height / 2;
    const canvasPos = getCanvasPosition(e.clientX, e.clientY);

    const startAngle = Math.atan2(canvasPos.y - centerY, canvasPos.x - centerX) * 180 / Math.PI;

    setIsRotating(true);
    setRotatingItem({
      id: itemId,
      startAngle,
      startRotation: item.rotation || 0
    });
  }, [freeGridItems, getCanvasPosition]);

  const handleRotate = useCallback((e) => {
    if (!rotatingItem) return;

    const item = freeGridItems[rotatingItem.id];
    if (!item) return;

    const centerX = item.x + item.width / 2;
    const centerY = item.y + item.height / 2;
    const canvasPos = getCanvasPosition(e.clientX, e.clientY);

    const currentAngle = Math.atan2(canvasPos.y - centerY, canvasPos.x - centerX) * 180 / Math.PI;
    let rotation = rotatingItem.startRotation + (currentAngle - rotatingItem.startAngle);

    // Snap to 15-degree increments when shift is held
    if (e.shiftKey) {
      rotation = Math.round(rotation / 15) * 15;
    }

    setFreeGridItems(prev => ({
      ...prev,
      [rotatingItem.id]: {
        ...prev[rotatingItem.id],
        rotation: rotation % 360
      }
    }));
  }, [rotatingItem, freeGridItems, getCanvasPosition]);

  // Eraser functionality
  const eraseAtPosition = useCallback((pos) => {
  const eraseRadius = 10;

  setAnnotations(prev => prev.filter(annotation => {
    if (annotation.type === 'path') {
      // Check if any point in the path is within erase radius
      const points = annotation.points.join(' ').match(/[ML]\s*(\d+\.?\d*)\s+(\d+\.?\d*)/g);
      if (!points) return true;

      for (const point of points) {
        const coords = point.match(/(\d+\.?\d*)\s+(\d+\.?\d*)/);
        if (coords) {
          const x = parseFloat(coords[1]);
          const y = parseFloat(coords[2]);
          const distance = Math.sqrt(Math.pow(x - pos.x, 2) + Math.pow(y - pos.y, 2));
          if (distance < eraseRadius) return false;
        }
      }
    } else if (annotation.type === 'rectangle') {
      // Check if eraser is within rectangle bounds
      return !(pos.x >= annotation.x - eraseRadius && 
               pos.x <= annotation.x + annotation.width + eraseRadius &&
               pos.y >= annotation.y - eraseRadius && 
               pos.y <= annotation.y + annotation.height + eraseRadius);
    } else if (annotation.type === 'ellipse') {
      // Check if eraser is near ellipse
      const dx = pos.x - annotation.cx;
      const dy = pos.y - annotation.cy;
      const distance = Math.sqrt((dx * dx) / (annotation.rx * annotation.rx) + 
                                (dy * dy) / (annotation.ry * annotation.ry));
      return distance > 1 + eraseRadius / Math.min(annotation.rx, annotation.ry);
    } else if (annotation.type === 'polygon') {
      // Check if eraser is near any polygon point
      for (const point of annotation.points) {
        const distance = Math.sqrt(Math.pow(point.x - pos.x, 2) + 
                                  Math.pow(point.y - pos.y, 2));
        if (distance < eraseRadius) return false;
      }
    }
    return true;
  }));

  // Also erase vector paths
  setVectorPaths(prev => prev.filter(path => {
    // Check if any anchor point is within erase radius
    if (path.anchors) {
      for (const anchor of path.anchors) {
        const distance = Math.sqrt(Math.pow(anchor.x - pos.x, 2) + 
                                  Math.pow(anchor.y - pos.y, 2));
        if (distance < eraseRadius) return false;
      }
    }
    return true;
  }));
}, []);

  const clearAllAnnotations = useCallback(() => {
    if (window.confirm('Clear all annotations and vector paths?')) {
      setAnnotations([]);
      setVectorPaths([]);
    }
  }, []);

  // Alignment functions
  const alignItems = useCallback((alignment) => {
    if (selectedItems.length < 2) return;

    const items = selectedItems.map(id => ({
      id,
      ...freeGridItems[id]
    })).filter(item => !lockedItems.has(item.id));

    if (items.length < 2) return;

    let updates = {};

    switch (alignment) {
      case 'left':
        const minX = Math.min(...items.map(item => item.x));
        items.forEach(item => {
          updates[item.id] = { ...freeGridItems[item.id], x: minX };
        });
        break;

      case 'center-h':
        const avgCenterX = items.reduce((sum, item) => sum + item.x + item.width / 2, 0) / items.length;
        items.forEach(item => {
          updates[item.id] = { ...freeGridItems[item.id], x: avgCenterX - item.width / 2 };
        });
        break;

      case 'right':
        const maxRight = Math.max(...items.map(item => item.x + item.width));
        items.forEach(item => {
          updates[item.id] = { ...freeGridItems[item.id], x: maxRight - item.width };
        });
        break;

      case 'top':
        const minY = Math.min(...items.map(item => item.y));
        items.forEach(item => {
          updates[item.id] = { ...freeGridItems[item.id], y: minY };
        });
        break;

      case 'center-v':
        const avgCenterY = items.reduce((sum, item) => sum + item.y + item.height / 2, 0) / items.length;
        items.forEach(item => {
          updates[item.id] = { ...freeGridItems[item.id], y: avgCenterY - item.height / 2 };
        });
        break;

      case 'bottom':
        const maxBottom = Math.max(...items.map(item => item.y + item.height));
        items.forEach(item => {
          updates[item.id] = { ...freeGridItems[item.id], y: maxBottom - item.height };
        });
        break;

      case 'distribute-h':
        if (items.length < 3) return;
        const sortedByX = [...items].sort((a, b) => a.x - b.x);
        const startX = sortedByX[0].x;
        const endX = sortedByX[sortedByX.length - 1].x + sortedByX[sortedByX.length - 1].width;
        const totalWidth = sortedByX.reduce((sum, item) => sum + item.width, 0);
        const spacing = (endX - startX - totalWidth) / (items.length - 1);

        let currentX = startX;
        sortedByX.forEach(item => {
          updates[item.id] = { ...freeGridItems[item.id], x: currentX };
          currentX += item.width + spacing;
        });
        break;

      case 'distribute-v':
        if (items.length < 3) return;
        const sortedByY = [...items].sort((a, b) => a.y - b.y);
        const startY = sortedByY[0].y;
        const endY = sortedByY[sortedByY.length - 1].y + sortedByY[sortedByY.length - 1].height;
        const totalHeight = sortedByY.reduce((sum, item) => sum + item.height, 0);
        const spacingY = (endY - startY - totalHeight) / (items.length - 1);

        let currentY = startY;
        sortedByY.forEach(item => {
          updates[item.id] = { ...freeGridItems[item.id], y: currentY };
          currentY += item.height + spacingY;
        });
        break;
    }

    setFreeGridItems(prev => ({ ...prev, ...updates }));
  }, [selectedItems, freeGridItems, lockedItems]);

  // Handle drop
  const handleDrop = useCallback((e) => {
    e.preventDefault();
    const canvasPos = getCanvasPosition(e.clientX, e.clientY);

    // Get the data from the drag event
    const mediaOriginalIndexString = e.dataTransfer.getData('text/plain');
    if (mediaOriginalIndexString) {
      const mediaOriginalIndex = parseInt(mediaOriginalIndexString, 10);
      onDropToSlot({
        type: 'internal_media',
        mediaOriginalIndex,
        position: canvasPos
      });
    } else {
      // Handle file drops
      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        files.forEach((file, index) => {
          onDropToSlot({
            type: 'file',
            file,
            position: {
              x: canvasPos.x + index * 20,
              y: canvasPos.y + index * 20
            }
          });
        });
      }
    }
  }, [getCanvasPosition, onDropToSlot]);

  // Handle auto-arrange results
  const handleAutoArrange = useCallback((arrangedItems) => {
    if (!arrangedItems || arrangedItems.length === 0) return;

    const updates = {};

    arrangedItems.forEach(item => {
      // Find the corresponding free grid item
      const freeGridItem = Object.entries(freeGridItems).find(
        ([id, fgItem]) => fgItem.mediaId === item.id
      );

      if (freeGridItem) {
        const [itemId, originalItem] = freeGridItem;
        updates[itemId] = {
          ...originalItem,
          x: item.x,
          y: item.y,
          width: item.width || originalItem.width,
          height: item.height || originalItem.height,
          rotation: item.rotation || 0
        };
      }
    });

    setFreeGridItems(prev => ({ ...prev, ...updates }));
    setShowAutoArrange(false);
  }, [freeGridItems]);

  // Toggle locked state
  const toggleItemLock = useCallback((itemId) => {
    setLockedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  }, []);

  // Delete selected items
  const deleteSelectedItems = useCallback(() => {
    if (selectedItems.length === 0) return;

    if (window.confirm(`Delete ${selectedItems.length} selected items?`)) {
      const updates = {};
      selectedItems.forEach(id => {
        if (!lockedItems.has(id)) {
          delete updates[id];
        }
      });

      setFreeGridItems(prev => {
        const newItems = { ...prev };
        selectedItems.forEach(id => {
          if (!lockedItems.has(id)) {
            delete newItems[id];
          }
        });
        return newItems;
      });

      setSelectedItems([]);
    }
  }, [selectedItems, lockedItems]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Delete key
      if (e.key === 'Delete' && selectedItems.length > 0) {
        e.preventDefault();
        deleteSelectedItems();
      }

      // Ctrl/Cmd + A (Select all)
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault();
        setSelectedItems(Object.keys(freeGridItems).filter(id => !lockedItems.has(id)));
      }

      // Ctrl/Cmd + D (Duplicate)
      if ((e.ctrlKey || e.metaKey) && e.key === 'd' && selectedItems.length > 0) {
        e.preventDefault();
        const duplicates = {};
        selectedItems.forEach(id => {
          const item = freeGridItems[id];
          if (item) {
            const newId = `duplicate-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            duplicates[newId] = {
              ...item,
              x: item.x + 20,
              y: item.y + 20,
              zIndex: (item.zIndex || 0) + 1
            };
          }
        });
        setFreeGridItems(prev => ({ ...prev, ...duplicates }));
        setSelectedItems(Object.keys(duplicates));
      }

      // Ctrl/Cmd + E (Export book)
      if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
        e.preventDefault();
        handleExportBookData();
      }

      // // Ctrl/Cmd + P (Preview book)
      // if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
      //   e.preventDefault();
      //   handlePreviewBook();
      // }

      // Arrow keys for nudging
      if (selectedItems.length > 0 && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
        e.preventDefault();
        const nudgeAmount = e.shiftKey ? 10 : 1;
        const updates = {};

        selectedItems.forEach(id => {
          const item = freeGridItems[id];
          if (item && !lockedItems.has(id)) {
            updates[id] = { ...item };
            switch (e.key) {
              case 'ArrowLeft':
                updates[id].x -= nudgeAmount;
                break;
              case 'ArrowRight':
                updates[id].x += nudgeAmount;
                break;
              case 'ArrowUp':
                updates[id].y -= nudgeAmount;
                break;
              case 'ArrowDown':
                updates[id].y += nudgeAmount;
                break;
            }
          }
        });

        setFreeGridItems(prev => ({ ...prev, ...updates }));
      }

      // Tool shortcuts
      if (!e.ctrlKey && !e.metaKey) {
        switch (e.key.toLowerCase()) {
          case 'v':
            setActiveTool('select');
            break;
          case 'p':
            setActiveTool('vector-pen');
            break;
          case 't':
            setActiveTool('text');
            setShowTextCreator(true);
            break;
          case 'b':
            setActiveTool('pen');
            break;
          case 'e':
            if (activeTool === 'eraser') {
              setEraserMode((prev) => (prev + 1) % 3);
            } else {
              setActiveTool('eraser');
              setEraserMode(1);
            }
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedItems, freeGridItems, deleteSelectedItems, lockedItems, activeTool, handleExportBookData]);

  // Update z-index ordering
  const bringToFront = useCallback(() => {
    if (selectedItems.length === 0) return;

    const maxZ = Math.max(...Object.values(freeGridItems).map(item => item.zIndex || 0));
    const updates = {};

    selectedItems.forEach((id, index) => {
      updates[id] = {
        ...freeGridItems[id],
        zIndex: maxZ + index + 1
      };
    });

    setFreeGridItems(prev => ({ ...prev, ...updates }));
  }, [selectedItems, freeGridItems]);

  const sendToBack = useCallback(() => {
    if (selectedItems.length === 0) return;

    const minZ = Math.min(...Object.values(freeGridItems).map(item => item.zIndex || 0));
    const updates = {};

    selectedItems.forEach((id, index) => {
      updates[id] = {
        ...freeGridItems[id],
        zIndex: minZ - selectedItems.length + index
      };
    });

    setFreeGridItems(prev => ({ ...prev, ...updates }));
  }, [selectedItems, freeGridItems]);



  return (
    <div className="flex-1 overflow-hidden bg-gray-50 dark:bg-gray-800 relative h-full">
      {/* Toolbar */}
      <div
        className="top-0 relative left-0 right-0 z-50 bg-white dark:bg-gray-900 border-b border-gray-300 dark:border-gray-600 p-2"
        style={{
          transition: 'margin-right 0.3s ease'
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 overflow-x-auto flex-shrink-0">
            {/* Tool Selection */}
            <div className="flex items-center space-x-1 border-r pr-2 mr-2">
              <button
                onClick={() => setActiveTool('select')}
                className={`p-1.5 rounded ${activeTool === 'select' ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100'}`}
                title="Select Tool (V)"
              >
                <Target size={18} />
              </button>
              <PencilTool
                isActive={activeTool === 'pen'}
                onToggle={() => setActiveTool(activeTool === 'pen' ? 'select' : 'pen')}
              />
              <button
                onClick={() => setActiveTool('vector-pen')}
                className={`p-1.5 rounded ${activeTool === 'vector-pen' ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100'}`}
                title="Vector Pen Tool (P)"
              >
                <Edit3 size={18} />
              </button>
              <TextTool
                isActive={activeTool === 'text'}
                onToggle={() => {
                  setActiveTool(activeTool === 'text' ? 'select' : 'text');
                  if (activeTool !== 'text') {
                    setShowTextCreator(true);
                  }
                }}
              />
              <EraserTool
                mode={eraserMode}
                onToggle={() => {
                  if (eraserMode === 0) {
                    setEraserMode(1);
                    setActiveTool('eraser');
                  } else if (eraserMode === 1) {
                    setEraserMode(2);
                  } else {
                    setEraserMode(0);
                    setActiveTool('select');
                  }
                }}
              />
              {eraserMode === 2 && (
                <button
                  onClick={clearAllAnnotations}
                  className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                >
                  Clear All
                </button>
              )}
            </div>

            {/* Drawing tools */}
            {(activeTool === 'pen' || activeTool === 'vector-pen') && (
              <div className="flex items-center space-x-2 border-r pr-2 mr-2">
                <ColorPicker color={strokeColor} onChange={setStrokeColor} />
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={strokeWidth}
                  onChange={(e) => setStrokeWidth(parseInt(e.target.value))}
                  className="w-20"
                  title="Stroke Width"
                />
              </div>
            )}

            {/* View controls */}
            <div className="flex items-center space-x-1 border-r pr-2 mr-2">
              <button
                onClick={() => setShowGrid(!showGrid)}
                className={`p-1.5 rounded ${showGrid ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100'}`}
                title="Toggle Grid"
              >
                <Grid size={18} />
              </button>
              <button
                onClick={() => setSnapToGrid(!snapToGrid)}
                className={`p-1.5 rounded ${snapToGrid ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100'}`}
                title="Snap to Grid"
              >
                <Grid size={18} className="opacity-60" />
              </button>
              <button
                onClick={() => setSnapToItems(!snapToItems)}
                className={`p-1.5 rounded ${snapToItems ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100'}`}
                title="Snap to Items"
              >
                <Target size={18} />
              </button>
              <button
                onClick={() => setShowRulers(!showRulers)}
                className={`p-1.5 rounded ${showRulers ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100 text-gray-700 dark:text-gray-300'}`}
                title="Toggle Rulers"
              >
                <Ruler size={18} />
              </button>
              <button
                onClick={() => setShowAutoArrange(!showAutoArrange)}
                className={`p-1.5 rounded ${showAutoArrange ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100'}`}
                title="Auto Arrange"
              >
                <Grid size={18} />
              </button>
            </div>

            {/* Preview controls */}
            <button
              onClick={cyclePreviewMode}
              className={`p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300`}
              title={previewMode === 'off' ? 'Preview: OFF (Click selects)' :
                previewMode === 'live' ? 'Preview: LIVE (Click for preview)' :
                  'Preview: HOVER (Hover for preview)'}
            >
              {previewMode === 'off' && <EyeOff size={18} />}
              {previewMode === 'live' && <Eye size={18} />}
              {previewMode === 'hover' && <MousePointer2Icon size={18} />}
            </button>

            <button
              onClick={() => setEnableGridSelection(!enableGridSelection)}
              className={`p-1.5 rounded ${enableGridSelection ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100'}`}
              title={enableGridSelection ? "Grid selection enabled" : "Grid selection disabled"}
            >
              <CheckSquare size={18} />
            </button>

            {/* Book controls */}
            <div className="flex items-center space-x-1 border-r pr-2 mr-2">
              <button
                onClick={() => setShowTextCreator(true)}
                className="p-1.5 rounded bg-green-600 text-white hover:bg-green-700"
                title="Create Text Page (T)"
              >
                <FileText size={18} />
              </button>

              {showTextCreator && (

                <TextPageCreator

                  isOpen={showTextCreator}
                  onClose={() => setShowTextCreator(false)}
                  onCreatePages={handleTextPageCreate}
                  darkMode={darkMode} // Add this prop
                  pageConfig={{
                    width: 400,
                    height: 600,
                    padding: 50,
                    fontSize: 16,
                    fontFamily: 'Georgia, serif'
                  }}
                />
              )}

            </div>

            {/* Alignment tools */}
            {selectedItems.length > 1 && (
              <AlignmentTools onAlign={alignItems} />
            )}

            {/* Vector toolbar position */}
            <div
              className="absolute left-0 top-16 z-40"
              style={{
                marginRight: is3DViewportOpen ? `${threeDViewportWidth}px` : '0',
                transition: 'margin-right 0.3s ease'
              }}
            >
              <VectorToolbar
                activeTool={activeTool}
                onToolChange={(tool) => {
                  setActiveTool(tool);
                  // Reset any drawing states when changing tools
                  setIsDrawing(false);
                  setCurrentAnnotation(null);
                }}
              />
            </div>

            {/* Layer controls */}
            {selectedItems.length > 0 && (
              <div className="flex items-center space-x-1 border-r pr-2 mr-2 dark text-gray-300">
                <button
                  onClick={bringToFront}
                  className="p-1.5 rounded hover:bg-gray-100"
                  title="Bring to Front"
                >
                  <Layers size={18} />
                </button>
                <button
                  onClick={sendToBack}
                  className="p-1.5 rounded hover:bg-gray-100"
                  title="Send to Back"
                >
                  <Layers size={18} className="rotate-180" />
                </button>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center space-x-1">
              {onAddGridToFreeGrid && (
                <button
                  onClick={onAddGridToFreeGrid}
                  className="p-1.5 rounded bg-purple-600 text-white hover:bg-purple-700"
                  title="Add standard grid to free grid"
                >
                  <Download size={18} />
                </button>
              )}
              <button
                onClick={onToggleAllowDuplicates}
                className={`p-1.5 rounded ${allowDuplicates ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300' : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
                title={allowDuplicates ? "Prevent duplicates" : "Allow duplicates"}
              >
                <Copy size={18} />
              </button>
              <button
                onClick={onClearGrid}
                className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-red-600 dark:text-red-400"
                title="Clear all items"
              >
                <Trash2 size={18} />
              </button>
              <button
                onClick={onAddRandomMedia}
                className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                title="Add random media"
              >
                <Dice5 size={18} />
              </button>
            </div>
          </div>

          {/* Zoom controls */}
          <div className="flex items-center space-x-2 flex-shrink-0">
            <button
              onClick={() => setZoomLevel(prev => Math.max(0.1, prev - 0.1))}
              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
            >
              <ZoomOut size={16} />
            </button>
            <span className="text-sm font-medium w-12 text-center text-gray-700 dark:text-gray-300">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              onClick={() => setZoomLevel(prev => Math.min(5, prev + 0.1))}
              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
            >
              <ZoomIn size={16} />
            </button>
            <button
              onClick={() => setZoomLevel(1)}
              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
              title="Reset Zoom"
            >
              <Maximize size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Rulers */}
      <RulerCorner
        showRulers={showRulers}
        rulerUnits={rulerUnits}
        onChangeUnits={setRulerUnits}
      />
      <HorizontalRuler
        showRulers={showRulers}
        rulerUnits={rulerUnits}
        zoomLevel={zoomLevel}
        panOffset={panOffset}
      />
      <VerticalRuler
        showRulers={showRulers}
        rulerUnits={rulerUnits}
        zoomLevel={zoomLevel}
        panOffset={panOffset}
      />

      {/* Canvas */}
      <div
        ref={canvasRef}
        className="absolute inset-0 overflow-hidden"
        style={{
          top: showRulers ? '56px' : '56px',
          left: showRulers ? '32px' : '0',
          transition: 'right 0.3s ease',
          cursor: isPanning ? 'grabbing' :
            activeTool === 'pen' ? 'crosshair' :
              activeTool === 'vector-pen' ? 'crosshair' :
                activeTool === 'eraser' ? 'not-allowed' :
                  activeTool === 'text' ? 'text' :
                    isDragging ? 'grabbing' : 'default'
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
      >
        <div
          style={{
            transform: `scale(${zoomLevel}) translate(${panOffset.x}px, ${panOffset.y}px)`,
            transformOrigin: '0 0',
            width: `${canvasSize.width}px`,
            height: `${canvasSize.height}px`,
            position: 'relative'
          }}
        >
          {/* Background layers to show canvas boundaries */}
          <div
            className="absolute inset-0"
            style={{
              background: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(0,0,0,0.03) 10px, rgba(0,0,0,0.03) 20px)'
            }}
          />

          {/* Active working area */}
          <div
            className="absolute"
            style={{
              left: 0,
              top: 0,
              width: `${activeBounds.width}px`,
              height: `${activeBounds.height}px`,
              backgroundColor: 'rgba(255, 255, 255, 0.5)',
              border: '2px dashed rgba(0, 0, 0, 0.1)'
            }}
          />

          {/* Grid */}
          {showGrid && (
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                backgroundImage: `
                  linear-gradient(to right, rgba(0,0,0,0.05) 1px, transparent 1px),
                  linear-gradient(to bottom, rgba(0,0,0,0.05) 1px, transparent 1px)
                `,
                backgroundSize: '20px 20px'
              }}
            />
          )}

          {/* Annotations and Vector Paths */}
          <svg
            className="absolute inset-0 pointer-events-none"
            style={{ width: `${canvasSize.width}px`, height: `${canvasSize.height}px` }}
          >
            {/* Regular annotations */}
            {annotations.map(annotation => {
              // Handle different annotation types
              if (annotation.type === 'path') {
                return (
                  <path
                    key={annotation.id}
                    d={annotation.points.join(' ')}
                    stroke={annotation.color || annotation.stroke}
                    strokeWidth={annotation.width || annotation.strokeWidth}
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                );
              } else if (annotation.type === 'vector') {
                return (
                  <path
                    key={annotation.id}
                    d={annotation.path}
                    stroke={annotation.stroke}
                    strokeWidth={annotation.strokeWidth}
                    fill={annotation.fill || 'none'}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                );
              } else if (annotation.type === 'rectangle') {
                return (
                  <rect
                    key={annotation.id}
                    x={annotation.x}
                    y={annotation.y}
                    width={annotation.width}
                    height={annotation.height}
                    stroke={annotation.stroke}
                    strokeWidth={annotation.strokeWidth}
                    fill={annotation.fill || 'none'}
                  />
                );
              } else if (annotation.type === 'ellipse') {
                return (
                  <ellipse
                    key={annotation.id}
                    cx={annotation.cx}
                    cy={annotation.cy}
                    rx={annotation.rx}
                    ry={annotation.ry}
                    stroke={annotation.stroke}
                    strokeWidth={annotation.strokeWidth}
                    fill={annotation.fill || 'none'}
                  />
                );
              } else if (annotation.type === 'polygon') {
                return (
                  <polygon
                    key={annotation.id}
                    points={annotation.points.map(p => `${p.x},${p.y}`).join(' ')}
                    stroke={annotation.stroke}
                    strokeWidth={annotation.strokeWidth}
                    fill={annotation.fill || 'none'}
                  />
                );
              }
              return null;
            })}

            {/* Vector paths */}
            {vectorPaths.map(path => (
              <path
                key={path.id}
                d={path.path}
                stroke={path.stroke}
                strokeWidth={path.strokeWidth}
                fill={path.fill || 'none'}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}

            {/* Current annotation being drawn */}
            {currentAnnotation && (
              <path
                d={currentAnnotation.points.join(' ')}
                stroke={currentAnnotation.color}
                strokeWidth={currentAnnotation.width}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}
          </svg>

          {/* Grid items */}
          {Object.entries(freeGridItems).map(([id, item]) => {
            const media = getMediaById(item.mediaId);
            if (!media) return null;

            const isSelected = selectedItems.includes(id);
            const isLocked = lockedItems.has(id);
            const isBeingDragged = isDragging && draggedItems.includes(id);

            return (
              <div
                key={id}
                style={{
                  position: 'absolute',
                  left: `${item.x}px`,
                  top: `${item.y}px`,
                  width: `${item.width}px`,
                  height: `${item.height}px`,
                  transform: `rotate(${item.rotation || 0}deg)`,
                  zIndex: item.zIndex || 0,
                  cursor: isLocked ? 'not-allowed' : 'move',
                  opacity: isBeingDragged ? 0.5 : 1,
                  transition: isBeingDragged ? 'none' : 'opacity 0.2s'
                }}
                onMouseEnter={() => setHoveredItem(id)}
                onMouseLeave={() => setHoveredItem(null)}
              >
                {/* Media preview */}
                <div className="relative w-full h-full">
                  <MediaPreview
                    media={media}
                    className="w-full h-full rounded border-2 border-gray-300"
                    hoverPlay={true}
                  />

                  {/* Text page indicator */}
                  {media.metadata?.isTextPage && (
                    <div className="absolute top-2 left-2 bg-blue-600 text-white px-2 py-1 text-xs rounded">
                      Text Page
                    </div>
                  )}

                  {/* Selection outline */}
                  {isSelected && (
                    <div className="absolute inset-0 border-2 border-blue-500 pointer-events-none rounded" />
                  )}

                  {/* Hover outline */}
                  {hoveredItem === id && !isSelected && (
                    <div className="absolute inset-0 border-2 border-gray-400 pointer-events-none rounded" />
                  )}

                  {/* Lock indicator */}
                  {isLocked && (
                    <div className="absolute top-1 right-1 p-1 bg-yellow-500 text-white rounded">
                      <Lock size={12} />
                    </div>
                  )}

                  {/* Resize handles */}
                  {isSelected && !isLocked && activeTool === 'select' && (
                    <>
                      {/* Corner handles */}
                      <div
                        className="absolute -top-1 -left-1 w-3 h-3 bg-blue-500 cursor-nw-resize"
                        onMouseDown={(e) => handleResizeHandles(e, id, 'tl')}
                      />
                      <div
                        className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 cursor-ne-resize"
                        onMouseDown={(e) => handleResizeHandles(e, id, 'tr')}
                      />
                      <div
                        className="absolute -bottom-1 -left-1 w-3 h-3 bg-blue-500 cursor-sw-resize"
                        onMouseDown={(e) => handleResizeHandles(e, id, 'bl')}
                      />
                      <div
                        className="absolute -bottom-1 -right-1 w-3 h-3 bg-blue-500 cursor-se-resize"
                        onMouseDown={(e) => handleResizeHandles(e, id, 'br')}
                      />

                      {/* Edge handles */}
                      <div
                        className="absolute -top-1 left-1/2 -translate-x-1/2 w-6 h-3 bg-blue-500 cursor-n-resize"
                        onMouseDown={(e) => handleResizeHandles(e, id, 't')}
                      />
                      <div
                        className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-6 h-3 bg-blue-500 cursor-s-resize"
                        onMouseDown={(e) => handleResizeHandles(e, id, 'b')}
                      />
                      <div
                        className="absolute top-1/2 -left-1 -translate-y-1/2 w-3 h-6 bg-blue-500 cursor-w-resize"
                        onMouseDown={(e) => handleResizeHandles(e, id, 'l')}
                      />
                      <div
                        className="absolute top-1/2 -right-1 -translate-y-1/2 w-3 h-6 bg-blue-500 cursor-e-resize"
                        onMouseDown={(e) => handleResizeHandles(e, id, 'r')}
                      />

                      {/* Rotation handle */}
                      <div
                        className="absolute -top-8 left-1/2 -translate-x-1/2 w-4 h-4 bg-green-500 rounded-full cursor-pointer"
                        onMouseDown={(e) => startRotation(e, id)}
                        title="Rotate"
                      >
                        <RotateTool size={12} className="text-white m-0.5" />
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })}

          {/* Marquee selection */}
          {isMarqueeSelecting && (
            <MarqueeSelection
              start={marqueeStart}
              end={marqueeEnd}
            />
          )}

          {/* Vector Pen Tool overlay */}
          {activeTool === 'vector-pen' && (
            <VectorPenTool
              isActive={true}
              canvasRef={canvasRef}
              onPathComplete={handleVectorPathComplete}
              strokeColor={strokeColor}
              strokeWidth={strokeWidth}
              fillColor="none"
              zoomLevel={zoomLevel}
              panOffset={panOffset}
            />
          )}
          {['rectangle', 'ellipse', 'polygon'].includes(activeTool) && (
            <VectorShapeTools
              activeTool={activeTool}
              canvasRef={canvasRef}
              onShapeComplete={(shapeData) => {
                // Add to annotations
                setAnnotations(prev => [...prev, {
                  ...shapeData,
                  id: shapeData.id
                }]);
              }}
              strokeColor={strokeColor}
              strokeWidth={strokeWidth}
              fillColor={fillColor}
              zoomLevel={zoomLevel}
              panOffset={panOffset}
            />
          )}
        </div>
      </div>

      {/* Selected items info */}
      {selectedItems.length > 0 && (
        <div
          className="absolute bottom-4 left-4 bg-white dark:bg-gray-800 rounded shadow-lg p-2 text-sm"
          style={{
            marginRight: is3DViewportOpen ? `${threeDViewportWidth + 20}px` : '0',
            transition: 'margin-right 0.3s ease'
          }}
        >
          <div className="flex items-center space-x-2">
            <span>{selectedItems.length} item{selectedItems.length !== 1 ? 's' : ''} selected</span>
            {selectedItems.length === 1 && (
              <button
                onClick={() => toggleItemLock(selectedItems[0])}
                className="p-1 rounded hover:bg-gray-100"
                title={lockedItems.has(selectedItems[0]) ? "Unlock" : "Lock"}
              >
                {lockedItems.has(selectedItems[0]) ? <Unlock size={14} /> : <Lock size={14} />}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Canvas info */}
      <div
        className="absolute bottom-4 right-4 bg-white dark:bg-gray-800 rounded shadow-lg p-2 text-xs"
        style={{
          transition: 'margin-right 0.3s ease'
        }}
      >
        <div className="text-gray-600 dark:text-gray-400">
          Active area: {activeBounds.width} × {activeBounds.height}px
        </div>
        <div className="text-gray-600 dark:text-gray-400">
          Canvas: {canvasSize.width} × {canvasSize.height}px
        </div>
        {vectorPaths.length > 0 && (
          <div className="text-gray-600 dark:text-gray-400">
            Vector paths: {vectorPaths.length}
          </div>
        )}
      </div>

      {/* Auto Arrange Panel */}
      {showAutoArrange && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="relative">
            <button
              onClick={() => setShowAutoArrange(false)}
              className="absolute -top-10 right-0 p-2 bg-white rounded-full shadow-lg hover:bg-gray-100"
            >
              <X size={20} />
            </button>
            <AutoArrangePanel
              items={Object.entries(freeGridItems).map(([id, item]) => ({
                id: item.mediaId,
                x: item.x,
                y: item.y,
                width: item.width,
                height: item.height,
                rotation: item.rotation || 0
              }))}
              onArrange={handleAutoArrange}
            />
          </div>
        </div>
      )}

      {/* Text Page Creator */}
      <TextPageCreator
        isOpen={showTextCreator}
        onClose={() => setShowTextCreator(false)}
        onCreatePage={handleTextPageCreate}
        pageConfig={{
          width: 816,  // Letter size
          height: 1056,
          padding: 72
        }}
      />

      {/* Animated Book Viewer */}
      <AnimatedBookViewer
        isOpen={showBookViewer}
        onClose={() => setShowBookViewer(false)}
        bookData={currentBookData}
        volumeMetadata={{
          title: "Grid Preview",
          slot: "preview"
        }}
        onRefresh={() => {
          // Refresh book data
          handlePreviewBook();
        }}
      />
    </div>
  );
};

export default FreeGridCanvas;