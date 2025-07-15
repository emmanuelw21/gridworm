// components/FreeGrid/FreeGridCanvas.jsx
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  Move, Target, Trash2, Dice5, ZoomIn, ZoomOut, Maximize,
  AlignHorizontalJustifyStart, AlignHorizontalJustifyCenter, AlignHorizontalJustifyEnd,
  AlignVerticalJustifyStart, AlignVerticalJustifyCenter, AlignVerticalJustifyEnd,
  AlignHorizontalDistributeCenter, AlignVerticalDistributeCenter,
  Ruler, Grid, Copy, Layers, Lock, Unlock, Download, EyeOff, Eye, MousePointer2Icon,
  CheckSquare, X, Edit3, Type, Book, FileText, Square, LayoutGrid, Magnet,
  MousePointer, MousePointer2, Pencil, Circle, Hexagon, Eraser, Pipette, PaintBucket, GripVertical, RotateCw, Maximize2Icon, Info
} from 'lucide-react';

import VectorSquareIcon from '../Icons/VectorSquareIcon.jsx';
import ScanBarcodeIcon from '../Icons/ScanBarcodeIcon.jsx';
import MediaPreview from '../MediaGrid/MediaPreview.jsx';
import { PencilTool, TextTool, EraserTool, RotateTool } from './DrawingTools.jsx';
import EnhancedColorPicker from './ColorPicker/EnhancedColorPicker.jsx';
import GridItem from './GridItem.jsx';
import { HorizontalRuler, VerticalRuler, RulerCorner } from './Rulers.jsx';
import MarqueeSelection from './MarqueeSelection.jsx';
import AlignmentTools from './AlignmentTools.jsx';
import CollapsibleVectorToolbar from './CollapsibleVectorToolbar.jsx';
import AutoArrangePanel from './AutoArrangePanel.jsx';
import VectorPenTool from './VectorPenTool.jsx';
import TextPageCreator from './TextPageCreator.jsx';
import AnimatedBookViewer from '../BookViewer/AnimatedBookViewer.jsx';
import VectorShapeTools from './VectorShapeTools.jsx';
import Artboard from './Artboard.jsx';
import TextAreaTool from './TextAreaTool.jsx';
import ArtboardGridDialog from './ArtboardGridDialog.jsx';
import ArtboardGridControls from './ArtboardGridControls.jsx';
import VisualEyedropper from './VisualEyedropper.jsx';
import LayerPanelV2 from './LayerPanelV2.jsx';
import { useAtom } from 'jotai';
import { 
  artboardsAtom, 
  selectedArtboardsAtom, 
  artboardGroupLocksAtom,
  layersAtom,
  activeLayerIdAtom,
  layerOrderAtom,
  typeFiltersAtom,
  mediaFilesAtom
} from '../../store.js';
import { debounce } from '../ThreeDViewport/utils/performanceUtils.js';


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
  onExportPagesToMainGrid, // <-- new prop
  onAddToMediaPanel, // <-- added prop for text page creator
  darkMode = false, // <-- added darkMode prop
}) => {
  // Core state management
  const [selectedItems, setSelectedItems] = useState([]);
  const [hoveredItem, setHoveredItem] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(1); // Default zoom at 100%
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
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

  // New state for enhanced features
  const [showTextCreator, setShowTextCreator] = useState(false);
  const [showBookViewer, setShowBookViewer] = useState(false);
  const [vectorPaths, setVectorPaths] = useState([]);
  const [vectorShapes, setVectorShapes] = useState([]);
  const [vectorText, setVectorText] = useState([]);
  const [selectedVectorIds, setSelectedVectorIds] = useState([]);
  const [editingTextId, setEditingTextId] = useState(null);
  const [currentBookData, setCurrentBookData] = useState(null);
  const [showArtboardGridDialog, setShowArtboardGridDialog] = useState(false);
  
  // Artboard state - using global atoms for persistence
  const [artboards, setArtboards] = useAtom(artboardsAtom);
  const [selectedArtboards, setSelectedArtboards] = useAtom(selectedArtboardsAtom);
  const [artboardGroupLocks, setArtboardGroupLocks] = useAtom(artboardGroupLocksAtom);
  const [artboardCounter, setArtboardCounter] = useState(1);
  const [draggingArtboard, setDraggingArtboard] = useState(null);
  const [resizingArtboard, setResizingArtboard] = useState(null);
  
  // Layer system state
  const [layers, setLayers] = useAtom(layersAtom);
  const [activeLayerId, setActiveLayerId] = useAtom(activeLayerIdAtom);
  const [layerOrder] = useAtom(layerOrderAtom);
  const [typeFilters] = useAtom(typeFiltersAtom);
  const [allMediaFiles] = useAtom(mediaFilesAtom);
  const [showLayerPanel, setShowLayerPanel] = useState(false); // Don't show floating panel since docked by default

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
  const [preserveAspectRatio, setPreserveAspectRatio] = useState(true);
  const [showBoundingBoxes, setShowBoundingBoxes] = useState(false);
  const [showDebugInfo, setShowDebugInfo] = useState(false);

  // Drawing state
  const [annotations, setAnnotations] = useState([]);
  const [currentAnnotation, setCurrentAnnotation] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [strokeColor, setStrokeColor] = useState('#FF0000');
  const [strokeWidth, setStrokeWidth] = useState(1);
  const [eraserMode, setEraserMode] = useState(0);
  const [fillColor, setFillColor] = useState('none');
  const [annotationpoints, setAnnotationPoints] = useState([]);
  
  // Vector toolbar docking state
  const [isToolbarDocked, setIsToolbarDocked] = useState(true);
  
  // Layer panel docking state
  const [isLayerPanelDocked, setIsLayerPanelDocked] = useState(true);
  
  // Visual eyedropper state
  const [showVisualEyedropper, setShowVisualEyedropper] = useState(false);
  
  // Docking handlers
  const handleDockLayerPanel = useCallback(() => {
    setIsLayerPanelDocked(true);
    setShowLayerPanel(false);
  }, []);

  const handleUndockLayerPanel = useCallback(() => {
    setIsLayerPanelDocked(false);
    setShowLayerPanel(true);
  }, []);


  // Marquee selection state
  const [isMarqueeSelecting, setIsMarqueeSelecting] = useState(false);
  const [marqueeStart, setMarqueeStart] = useState({ x: 0, y: 0 });
  const [marqueeEnd, setMarqueeEnd] = useState({ x: 0, y: 0 });

  // Undo/Redo state
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const maxHistorySize = 50;

  // Refs
  const canvasRef = useRef(null);
  const lastPanPositionRef = useRef({ x: 0, y: 0 });
  const gridContainerRef = useRef(null);
  const skipHistoryRef = useRef(false);
  const draggedVectorPositionsRef = useRef(null);
  const draggedMediaPositionsRef = useRef(null);


  // Get media item by ID
  const getMediaById = (mediaId) => {
    return mediaFiles.find(m => m.id === mediaId);
  };

  // Calculate actual media content bounds within container (for object-fit: contain)
  const calculateMediaContentBounds = (media, containerWidth, containerHeight) => {
    if (!media || !media.metadata || !preserveAspectRatio) {
      // If no metadata or aspect ratio preservation is off, content fills container
      return {
        left: 0,
        top: 0,
        width: containerWidth,
        height: containerHeight
      };
    }

    const { width: mediaWidth, height: mediaHeight } = media.metadata;
    if (!mediaWidth || !mediaHeight) {
      // No media dimensions available, assume content fills container
      return {
        left: 0,
        top: 0,
        width: containerWidth,
        height: containerHeight
      };
    }

    const mediaAspectRatio = mediaWidth / mediaHeight;
    const containerAspectRatio = containerWidth / containerHeight;

    let contentWidth, contentHeight, contentLeft, contentTop;

    if (mediaAspectRatio > containerAspectRatio) {
      // Media is wider than container - fit to width
      contentWidth = containerWidth;
      contentHeight = containerWidth / mediaAspectRatio;
      contentLeft = 0;
      contentTop = (containerHeight - contentHeight) / 2;
    } else {
      // Media is taller than container - fit to height
      contentHeight = containerHeight;
      contentWidth = containerHeight * mediaAspectRatio;
      contentTop = 0;
      contentLeft = (containerWidth - contentWidth) / 2;
    }

    return {
      left: contentLeft,
      top: contentTop,
      width: contentWidth,
      height: contentHeight
    };
  };

  // Add preview mode handler
  const cyclePreviewMode = () => {
    setPreviewMode(prev => {
      if (prev === 'off') return 'live';
      if (prev === 'live') return 'hover';
      return 'off';
    });
  };

  // Handle double-click to expand media to full size
  const handleMediaDoubleClick = (itemId) => {
    const gridItem = freeGridItems[itemId];
    if (!gridItem) return;
    
    const media = mediaFiles.find(m => m.id === gridItem.mediaId);
    if (!media || !media.metadata) return;

    const { width: mediaWidth, height: mediaHeight } = media.metadata;
    if (!mediaWidth || !mediaHeight) return;

    setFreeGridItems(prevItems => {
      const newItems = { ...prevItems };
      if (newItems[itemId]) {
        newItems[itemId] = {
          ...newItems[itemId],
          width: mediaWidth,
          height: mediaHeight
        };
      }
      return newItems;
    });
  };

  // History management functions
  const saveToHistory = useCallback(() => {
    if (skipHistoryRef.current) {
      skipHistoryRef.current = false;
      return;
    }

    const currentState = {
      freeGridItems,
      annotations,
      vectorShapes,
      vectorPaths,
      vectorText,
      artboards
    };

    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(currentState);
      if (newHistory.length > maxHistorySize) {
        newHistory.shift();
      }
      return newHistory;
    });
    setHistoryIndex(prev => Math.min(prev + 1, maxHistorySize - 1));
  }, [freeGridItems, annotations, vectorShapes, vectorPaths, vectorText, artboards, historyIndex]);

  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      skipHistoryRef.current = true;
      const previousState = history[historyIndex - 1];
      setFreeGridItems(previousState.freeGridItems);
      setAnnotations(previousState.annotations);
      setVectorShapes(previousState.vectorShapes);
      setVectorPaths(previousState.vectorPaths);
      setVectorText(previousState.vectorText);
      setArtboards(previousState.artboards);
      setHistoryIndex(historyIndex - 1);
    }
  }, [history, historyIndex]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      skipHistoryRef.current = true;
      const nextState = history[historyIndex + 1];
      setFreeGridItems(nextState.freeGridItems);
      setAnnotations(nextState.annotations);
      setVectorShapes(nextState.vectorShapes);
      setVectorPaths(nextState.vectorPaths);
      setVectorText(nextState.vectorText);
      setArtboards(nextState.artboards);
      setHistoryIndex(historyIndex + 1);
    }
  }, [history, historyIndex]);

  // Handle zoom with mouse wheel
  const handleWheel = useCallback((e) => {
    // Use Space+Scroll for zoom (no browser conflicts!)
    if (isSpacePressed) {
      e.preventDefault();
      
      // Only zoom if we're over the canvas
      if (!canvasRef.current) return;
      
      // Get mouse position relative to canvas
      const rect = canvasRef.current.getBoundingClientRect();
      const mouseX = (e.clientX - rect.left) / zoomLevel - panOffset.x;
      const mouseY = (e.clientY - rect.top) / zoomLevel - panOffset.y;
      
      // Calculate zoom change
      const scaleFactor = e.deltaY < 0 ? 1.1 : 0.9;
      const newZoom = Math.max(0.1, Math.min(5, zoomLevel * scaleFactor)); // Zoom limits: 10% to 500%
      
      // Adjust pan to zoom towards cursor
      if (newZoom !== zoomLevel) {
        const zoomRatio = newZoom / zoomLevel;
        setPanOffset(prev => ({
          x: mouseX - (mouseX - prev.x) * zoomRatio,
          y: mouseY - (mouseY - prev.y) * zoomRatio
        }));
        setZoomLevel(newZoom);
      }
    }
  }, [zoomLevel, panOffset, isSpacePressed]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Space for pan/zoom mode
      if (e.key === ' ' && !e.repeat) {
        e.preventDefault();
        setIsSpacePressed(true);
      }
    };

    const handleKeyUp = (e) => {
      if (e.key === ' ') {
        setIsSpacePressed(false);
        setIsPanning(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Track state changes for undo/redo
  useEffect(() => {
    // Skip initial render
    if (history.length === 0 && historyIndex === -1) {
      saveToHistory();
    }
  }, []);

  // Debounced history saving
  const debouncedSaveToHistory = useMemo(
    () => debounce(saveToHistory, 500),
    [saveToHistory]
  );

  // Watch for changes to save to history
  useEffect(() => {
    if (history.length > 0) {
      debouncedSaveToHistory();
    }
  }, [freeGridItems, annotations, vectorShapes, vectorPaths, vectorText, artboards, debouncedSaveToHistory]);

  // Track if we're programmatically updating colors to avoid loops
  const isUpdatingColorsRef = useRef(false);
  
  // Track previous color values to detect user changes
  const prevStrokeColorRef = useRef(strokeColor);
  const prevFillColorRef = useRef(fillColor);
  
  // Sync color picker with selected vector
  useEffect(() => {
    if (selectedVectorIds.length === 1 && !isUpdatingColorsRef.current) {
      const vectorId = selectedVectorIds[0];
      const allVectors = [...(annotations || []), ...(vectorPaths || []), ...(vectorText || []), ...(vectorShapes || [])];
      const selectedVector = allVectors.find(v => v.id === vectorId);
      
      if (selectedVector) {
        // Set flag to prevent this from triggering color change detection
        isUpdatingColorsRef.current = true;
        
        // Update stroke color
        if (selectedVector.stroke || selectedVector.color) {
          const newStrokeColor = selectedVector.stroke || selectedVector.color;
          setStrokeColor(newStrokeColor);
          prevStrokeColorRef.current = newStrokeColor;
        }
        // Update fill color
        if (selectedVector.fill !== undefined) {
          setFillColor(selectedVector.fill);
          prevFillColorRef.current = selectedVector.fill;
        }
        
        // Reset flag after a tick
        setTimeout(() => {
          isUpdatingColorsRef.current = false;
        }, 0);
      }
    }
  }, [selectedVectorIds, annotations, vectorPaths, vectorText, vectorShapes]);

  // Function to apply colors to selected items
  const applyColorsToSelected = useCallback(() => {
    if (selectedVectorIds.length > 0 && !isUpdatingColorsRef.current) {
      // Set flag to prevent circular updates
      isUpdatingColorsRef.current = true;
      
      // Batch all updates
      setAnnotations(prev => {
        const newAnnotations = [...prev];
        selectedVectorIds.forEach(id => {
          const index = newAnnotations.findIndex(ann => ann.id === id);
          if (index !== -1) {
            const annotation = newAnnotations[index];
            // Only apply fill to shapes that should have fill (not pencil paths)
            const shouldHaveFill = annotation.type !== 'path' || 
              (annotation.type === 'path' && annotation.points && annotation.points.length === 1 && typeof annotation.points[0] === 'string' && annotation.points[0].includes('C'));
            
            newAnnotations[index] = {
              ...annotation,
              stroke: annotation.stroke !== undefined ? strokeColor : annotation.stroke,
              color: annotation.color !== undefined ? strokeColor : annotation.color,
              fill: shouldHaveFill ? fillColor : annotation.fill
            };
          }
        });
        return newAnnotations;
      });
      
      setVectorPaths(prev => prev.map(path => 
        selectedVectorIds.includes(path.id) ? { ...path, stroke: strokeColor, fill: fillColor } : path
      ));
      
      setVectorShapes(prev => prev.map(shape => 
        selectedVectorIds.includes(shape.id) ? { ...shape, stroke: strokeColor, fill: fillColor } : shape
      ));
      
      setVectorText(prev => prev.map(text => 
        selectedVectorIds.includes(text.id) ? { ...text, color: strokeColor } : text
      ));
      
      // Reset flag after a tick
      setTimeout(() => {
        isUpdatingColorsRef.current = false;
      }, 0);
      
      showNotification(`Applied colors to ${selectedVectorIds.length} selected item(s)`);
    }
  }, [strokeColor, fillColor, selectedVectorIds]);
  
  // Update selected items when user changes color picker
  useEffect(() => {
    // Check if colors actually changed (user interaction)
    const strokeChanged = prevStrokeColorRef.current !== strokeColor;
    const fillChanged = prevFillColorRef.current !== fillColor;
    
    if ((strokeChanged || fillChanged) && selectedVectorIds.length > 0 && activeTool === 'select') {
      // User changed color with items selected - apply the changes
      applyColorsToSelected();
    }
    
    // Update refs for next comparison
    prevStrokeColorRef.current = strokeColor;
    prevFillColorRef.current = fillColor;
  }, [strokeColor, fillColor, selectedVectorIds, activeTool, applyColorsToSelected]);
  
  // Handle paint bucket tool activation
  useEffect(() => {
    if (activeTool === 'paint-bucket' && selectedVectorIds.length > 0) {
      // When paint bucket is selected with items selected, apply colors immediately
      applyColorsToSelected();
    }
  }, [activeTool, applyColorsToSelected]);

  // Calculate canvas-relative position
  const getCanvasPosition = useCallback((clientX, clientY) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: (clientX - rect.left) / zoomLevel - panOffset.x,
      y: (clientY - rect.top) / zoomLevel - panOffset.y
    };
  }, [zoomLevel, panOffset]);
  
  // Check if a point is near a path (for path selection)
  const isPointNearPath = useCallback((point, pathData) => {
    // First check if it has a bounding box - use simple hit test
    if (pathData.x !== undefined && pathData.y !== undefined && 
        pathData.width !== undefined && pathData.height !== undefined) {
      return point.x >= pathData.x && point.x <= pathData.x + pathData.width &&
             point.y >= pathData.y && point.y <= pathData.y + pathData.height;
    }
    
    // If no bounding box but has path data, do complex path checking
    if (!pathData.path) return false;
    
    // Parse the SVG path and check distance
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', pathData.path);
    
    // Use a tolerance of 10 pixels for easier selection
    const tolerance = 10 / zoomLevel;
    
    // Sample points along the path
    const length = path.getTotalLength ? path.getTotalLength() : 100;
    const samples = Math.max(20, length / 10);
    
    for (let i = 0; i <= samples; i++) {
      const t = i / samples;
      const pathPoint = path.getPointAtLength ? path.getPointAtLength(t * length) : { x: 0, y: 0 };
      
      const distance = Math.sqrt(
        Math.pow(point.x - pathPoint.x, 2) + 
        Math.pow(point.y - pathPoint.y, 2)
      );
      
      if (distance <= tolerance) {
        return true;
      }
    }
    
    return false;
  }, [zoomLevel]);

  // Artboard management functions
  const createArtboard = useCallback((x = 100, y = 100) => {
    const id = `artboard-${Date.now()}-${artboardCounter}`;
    // Use fixed dimensions matching typical page size
    const pageWidth = 400;
    const pageHeight = 600;
    
    const newArtboard = {
      id,
      x,
      y,
      width: pageWidth,
      height: pageHeight,
      name: `Artboard ${artboardCounter}`,
      backgroundColor: '#FFFFFF',
      isLocked: false
    };
    
    setArtboards(prev => ({
      ...prev,
      [id]: newArtboard
    }));
    setSelectedArtboards([id]);
    setArtboardCounter(prev => prev + 1);
    
    return id;
  }, [artboardCounter]);

  const updateArtboard = useCallback((id, updates) => {
    setArtboards(prev => ({
      ...prev,
      [id]: { ...prev[id], ...updates }
    }));
  }, []);

  const deleteArtboard = useCallback((id) => {
    setArtboards(prev => {
      const newArtboards = { ...prev };
      delete newArtboards[id];
      return newArtboards;
    });
    setSelectedArtboards(prev => prev.filter(artboardId => artboardId !== id));
  }, []);

  const exportArtboard = useCallback(async (id, format = 'png') => {
    const artboard = artboards[id];
    if (!artboard) return;

    // Create a canvas for export
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = artboard.width;
    exportCanvas.height = artboard.height;
    const ctx = exportCanvas.getContext('2d');

    // Fill background
    ctx.fillStyle = artboard.backgroundColor;
    ctx.fillRect(0, 0, artboard.width, artboard.height);

    // Draw annotations/vector graphics first
    ctx.save();
    ctx.translate(-artboard.x, -artboard.y);
    
    // Draw annotations
    annotations.forEach(annotation => {
      if (annotation.type === 'path' && annotation.points) {
        ctx.beginPath();
        const path = new Path2D(annotation.points.join(' '));
        ctx.strokeStyle = annotation.color || annotation.stroke;
        ctx.lineWidth = annotation.width || annotation.strokeWidth || 1;
        ctx.stroke(path);
      }
    });

    // Draw vector paths
    vectorPaths.forEach(path => {
      ctx.beginPath();
      const p2d = new Path2D(path.path);
      ctx.strokeStyle = path.stroke;
      ctx.lineWidth = path.strokeWidth;
      if (path.fill && path.fill !== 'none') {
        ctx.fillStyle = path.fill;
        ctx.fill(p2d);
      }
      ctx.stroke(p2d);
    });
    
    ctx.restore();

    // Draw all media items within artboard bounds
    const drawPromises = [];
    
    Object.entries(freeGridItems).forEach(([itemId, item]) => {
      const relX = item.x - artboard.x;
      const relY = item.y - artboard.y;
      
      // Check if item is within artboard
      if (relX >= -item.width && relX <= artboard.width &&
          relY >= -item.height && relY <= artboard.height) {
        
        const media = getMediaById(item.mediaId);
        if (media) {
          const promise = new Promise((resolve) => {
            if (media.type.startsWith('image/')) {
              const img = new Image();
              img.crossOrigin = 'anonymous';
              img.onload = () => {
                ctx.save();
                if (item.rotation) {
                  ctx.translate(relX + item.width/2, relY + item.height/2);
                  ctx.rotate(item.rotation * Math.PI / 180);
                  ctx.drawImage(img, -item.width/2, -item.height/2, item.width, item.height);
                } else {
                  ctx.drawImage(img, relX, relY, item.width, item.height);
                }
                ctx.restore();
                resolve();
              };
              img.onerror = () => resolve();
              img.src = media.thumbnail || media.url;
            } else if (media.type.startsWith('video/') && media.thumbnail) {
              const img = new Image();
              img.crossOrigin = 'anonymous';
              img.onload = () => {
                ctx.save();
                if (item.rotation) {
                  ctx.translate(relX + item.width/2, relY + item.height/2);
                  ctx.rotate(item.rotation * Math.PI / 180);
                  ctx.drawImage(img, -item.width/2, -item.height/2, item.width, item.height);
                } else {
                  ctx.drawImage(img, relX, relY, item.width, item.height);
                }
                ctx.restore();
                resolve();
              };
              img.onerror = () => resolve();
              img.src = media.thumbnail;
            } else if (media.metadata?.isTextPage) {
              // Draw text page content
              ctx.save();
              ctx.fillStyle = media.metadata.textSettings?.backgroundColor || '#FFFFFF';
              ctx.fillRect(relX, relY, item.width, item.height);
              
              ctx.fillStyle = media.metadata.textSettings?.color || '#000000';
              ctx.font = `${media.metadata.textSettings?.fontSize || 38}px ${media.metadata.textSettings?.fontFamily || 'Arial'}`;
              ctx.textAlign = media.metadata.textSettings?.textAlign || 'left';
              
              const lines = media.metadata.textContent.split('\n');
              const lineHeight = (media.metadata.textSettings?.fontSize || 38) * 1.5;
              lines.forEach((line, index) => {
                ctx.fillText(line, relX + 20, relY + 30 + (index * lineHeight));
              });
              ctx.restore();
              resolve();
            } else {
              resolve();
            }
          });
          drawPromises.push(promise);
        }
      }
    });

    // Wait for all images to load and draw
    await Promise.all(drawPromises);

    // Convert to blob
    const blob = await new Promise(resolve => {
      exportCanvas.toBlob(resolve, format === 'jpg' ? 'image/jpeg' : 'image/png', 0.95);
    });

    // Download
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${artboard.name}.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  }, [artboards, freeGridItems, annotations, vectorPaths, getMediaById]);

  const addArtboardToMediaPanel = useCallback(async (id) => {
    const artboard = artboards[id];
    if (!artboard) return;

    // Create canvas for export
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = artboard.width;
    exportCanvas.height = artboard.height;
    const ctx = exportCanvas.getContext('2d');

    // Fill background
    ctx.fillStyle = artboard.backgroundColor;
    ctx.fillRect(0, 0, artboard.width, artboard.height);

    // Draw annotations/vector graphics first
    ctx.save();
    ctx.translate(-artboard.x, -artboard.y);
    
    // Draw annotations
    annotations.forEach(annotation => {
      if (annotation.type === 'path' && annotation.points) {
        ctx.beginPath();
        const path = new Path2D(annotation.points.join(' '));
        ctx.strokeStyle = annotation.color || annotation.stroke;
        ctx.lineWidth = annotation.width || annotation.strokeWidth || 1;
        ctx.stroke(path);
      }
    });

    // Draw vector paths
    vectorPaths.forEach(path => {
      ctx.beginPath();
      const p2d = new Path2D(path.path);
      ctx.strokeStyle = path.stroke;
      ctx.lineWidth = path.strokeWidth;
      if (path.fill && path.fill !== 'none') {
        ctx.fillStyle = path.fill;
        ctx.fill(p2d);
      }
      ctx.stroke(p2d);
    });
    
    ctx.restore();

    // Draw all media items within artboard bounds
    const drawPromises = [];
    
    Object.entries(freeGridItems).forEach(([itemId, item]) => {
      const relX = item.x - artboard.x;
      const relY = item.y - artboard.y;
      
      // Check if item is within artboard
      if (relX >= -item.width && relX <= artboard.width &&
          relY >= -item.height && relY <= artboard.height) {
        
        const media = getMediaById(item.mediaId);
        if (media) {
          const promise = new Promise((resolve) => {
            if (media.type.startsWith('image/')) {
              const img = new Image();
              img.crossOrigin = 'anonymous';
              img.onload = () => {
                ctx.save();
                if (item.rotation) {
                  ctx.translate(relX + item.width/2, relY + item.height/2);
                  ctx.rotate(item.rotation * Math.PI / 180);
                  ctx.drawImage(img, -item.width/2, -item.height/2, item.width, item.height);
                } else {
                  ctx.drawImage(img, relX, relY, item.width, item.height);
                }
                ctx.restore();
                resolve();
              };
              img.onerror = () => resolve();
              img.src = media.thumbnail || media.url;
            } else if (media.type.startsWith('video/') && media.thumbnail) {
              const img = new Image();
              img.crossOrigin = 'anonymous';
              img.onload = () => {
                ctx.save();
                if (item.rotation) {
                  ctx.translate(relX + item.width/2, relY + item.height/2);
                  ctx.rotate(item.rotation * Math.PI / 180);
                  ctx.drawImage(img, -item.width/2, -item.height/2, item.width, item.height);
                } else {
                  ctx.drawImage(img, relX, relY, item.width, item.height);
                }
                ctx.restore();
                resolve();
              };
              img.onerror = () => resolve();
              img.src = media.thumbnail;
            } else if (media.metadata?.isTextPage) {
              // Draw text page content
              ctx.save();
              ctx.fillStyle = media.metadata.textSettings?.backgroundColor || '#FFFFFF';
              ctx.fillRect(relX, relY, item.width, item.height);
              
              ctx.fillStyle = media.metadata.textSettings?.color || '#000000';
              ctx.font = `${media.metadata.textSettings?.fontSize || 38}px ${media.metadata.textSettings?.fontFamily || 'Arial'}`;
              ctx.textAlign = media.metadata.textSettings?.textAlign || 'left';
              
              const lines = media.metadata.textContent.split('\n');
              const lineHeight = (media.metadata.textSettings?.fontSize || 38) * 1.5;
              lines.forEach((line, index) => {
                ctx.fillText(line, relX + 20, relY + 30 + (index * lineHeight));
              });
              ctx.restore();
              resolve();
            } else {
              resolve();
            }
          });
          drawPromises.push(promise);
        }
      }
    });

    // Wait for all images to load and draw
    await Promise.all(drawPromises);

    // Create thumbnail canvas
    const thumbnailSize = 256;
    const thumbnailCanvas = document.createElement('canvas');
    const aspectRatio = artboard.width / artboard.height;
    
    if (aspectRatio > 1) {
      thumbnailCanvas.width = thumbnailSize;
      thumbnailCanvas.height = thumbnailSize / aspectRatio;
    } else {
      thumbnailCanvas.width = thumbnailSize * aspectRatio;
      thumbnailCanvas.height = thumbnailSize;
    }
    
    const thumbCtx = thumbnailCanvas.getContext('2d');
    thumbCtx.drawImage(exportCanvas, 0, 0, thumbnailCanvas.width, thumbnailCanvas.height);

    // Convert to blob
    const blob = await new Promise(resolve => {
      exportCanvas.toBlob(resolve, 'image/png', 0.95);
    });
    
    // Create thumbnail blob
    const thumbnailBlob = await new Promise(resolve => {
      thumbnailCanvas.toBlob(resolve, 'image/png', 0.95);
    });

    // Create file with proper thumbnail
    const file = new File([blob], `${artboard.name}.png`, { type: 'image/png' });
    const thumbnailUrl = URL.createObjectURL(thumbnailBlob);
    
    // Create media object with thumbnail
    const mediaData = {
      id: `artboard-export-${Date.now()}`,
      name: `${artboard.name}.png`,
      type: 'image/png',
      size: blob.size,
      url: URL.createObjectURL(blob),
      thumbnail: thumbnailUrl,
      metadata: {
        width: artboard.width,
        height: artboard.height,
        isArtboardExport: true,
        originalArtboardId: id
      }
    };
    
    if (onAddMediaFile) {
      // Pass the media data directly if the function supports it
      await onAddMediaFile([mediaData]);
    } else if (setMediaFiles) {
      // Or update media files directly
      setMediaFiles(prev => [...prev, mediaData]);
    }
    
    // Show success notification
    const notification = document.createElement('div');
    notification.className = 'fixed top-4 right-4 bg-green-600 text-white px-4 py-2 rounded shadow-lg z-50';
    notification.textContent = `Artboard "${artboard.name}" added to media panel`;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
  }, [artboards, freeGridItems, annotations, vectorPaths, onAddMediaFile, setMediaFiles, getMediaById]);

  // Artboard drag and resize handlers
  const handleArtboardDragStart = useCallback((e, artboardId) => {
    e.stopPropagation();
    const artboard = artboards[artboardId];
    if (!artboard || artboard.isLocked) return;

    const canvasPos = getCanvasPosition(e.clientX, e.clientY);
    
    // Check if this is part of a locked group
    if (artboard.groupId && artboardGroupLocks[artboard.groupId]) {
      // Drag the entire group
      const groupArtboards = Object.entries(artboards)
        .filter(([_, a]) => a.groupId === artboard.groupId)
        .map(([id, a]) => ({ id, offsetX: canvasPos.x - a.x, offsetY: canvasPos.y - a.y }));
      
      setDraggingArtboard({
        id: artboardId,
        offsetX: canvasPos.x - artboard.x,
        offsetY: canvasPos.y - artboard.y,
        isGroup: true,
        groupArtboards
      });
    } else if (selectedArtboards.length > 1 && selectedArtboards.includes(artboardId)) {
      // Drag all selected artboards
      const selectedArtboardItems = selectedArtboards
        .map(id => ({ id, ...artboards[id] }))
        .filter(a => !a.isLocked)
        .map(a => ({ id: a.id, offsetX: canvasPos.x - a.x, offsetY: canvasPos.y - a.y }));
      
      setDraggingArtboard({
        id: artboardId,
        offsetX: canvasPos.x - artboard.x,
        offsetY: canvasPos.y - artboard.y,
        isGroup: true,
        groupArtboards: selectedArtboardItems
      });
    } else {
      // Drag single artboard
      setDraggingArtboard({
        id: artboardId,
        offsetX: canvasPos.x - artboard.x,
        offsetY: canvasPos.y - artboard.y,
        isGroup: false
      });
    }
  }, [artboards, artboardGroupLocks, selectedArtboards, getCanvasPosition]);

  // Handle artboard selection with multi-select support
  const handleArtboardSelect = useCallback((artboardId, e) => {
    if (e.ctrlKey || e.metaKey) {
      // Toggle selection
      setSelectedArtboards(prev => 
        prev.includes(artboardId)
          ? prev.filter(id => id !== artboardId)
          : [...prev, artboardId]
      );
    } else if (e.shiftKey && selectedArtboards.length > 0) {
      // Range selection (select all artboards between last selected and current)
      const allArtboardIds = Object.keys(artboards);
      const lastSelectedIndex = allArtboardIds.indexOf(selectedArtboards[selectedArtboards.length - 1]);
      const currentIndex = allArtboardIds.indexOf(artboardId);
      
      if (lastSelectedIndex !== -1 && currentIndex !== -1) {
        const start = Math.min(lastSelectedIndex, currentIndex);
        const end = Math.max(lastSelectedIndex, currentIndex);
        const rangeIds = allArtboardIds.slice(start, end + 1);
        
        setSelectedArtboards(prev => {
          const newSelection = [...prev];
          rangeIds.forEach(id => {
            if (!newSelection.includes(id)) {
              newSelection.push(id);
            }
          });
          return newSelection;
        });
      }
    } else {
      // Single selection
      setSelectedArtboards([artboardId]);
    }
    
    // Clear media item selection when selecting artboards
    setSelectedItems([]);
  }, [artboards, selectedArtboards]);

  const handleArtboardResizeStart = useCallback((e, artboardId, handle) => {
    e.stopPropagation();
    const artboard = artboards[artboardId];
    if (!artboard || artboard.isLocked) return;

    setResizingArtboard({
      id: artboardId,
      handle,
      startX: e.clientX,
      startY: e.clientY,
      startArtboard: { ...artboard }
    });
  }, [artboards]);

  // Vector path completion handler
  const handleVectorPathComplete = useCallback((pathData) => {
    // Add to annotations with all properties intact
    setAnnotations(prev => [...prev, {
      id: pathData.id,
      type: 'path',  // Use 'path' type like pencil strokes
      points: [pathData.path],  // Store path in points array for consistency
      x: pathData.x,
      y: pathData.y,
      boundingWidth: pathData.width,  // Bounding box dimensions
      boundingHeight: pathData.height,
      color: pathData.stroke,  // Color for stroke
      width: pathData.strokeWidth,  // Stroke width
      fill: pathData.fill,
      closed: pathData.closed
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

  // Handle eyedropper - pick color from clicked position
  const handleEyedropper = useCallback(async (e) => {
    // First try to use the native EyeDropper API if available
    if ('EyeDropper' in window) {
      try {
        const eyeDropper = new window.EyeDropper();
        const result = await eyeDropper.open();
        const pickedColor = result.sRGBHex;
        
        setStrokeColor(pickedColor);
        setFillColor(pickedColor);
        showNotification(`Color picked: ${pickedColor}`);
        setActiveTool('select');
        return;
      } catch (err) {
        // User cancelled or browser doesn't support it
        console.log('EyeDropper cancelled or not supported');
      }
    }
    
    // Fallback to checking shapes and artboards
    const canvasPos = getCanvasPosition(e.clientX, e.clientY);
    let colorPicked = false;
    let pickedColor = null;
    
    // Check annotations first (shapes, paths)
    for (const annotation of annotations) {
      if (annotation.type === 'rectangle') {
        if (canvasPos.x >= annotation.x && 
            canvasPos.x <= annotation.x + annotation.width &&
            canvasPos.y >= annotation.y && 
            canvasPos.y <= annotation.y + annotation.height) {
          pickedColor = annotation.fill || annotation.stroke || '#000000';
          colorPicked = true;
          break;
        }
      } else if (annotation.type === 'ellipse') {
        const dx = (canvasPos.x - annotation.cx) / annotation.rx;
        const dy = (canvasPos.y - annotation.cy) / annotation.ry;
        if ((dx * dx + dy * dy) <= 1) {
          pickedColor = annotation.fill || annotation.stroke || '#000000';
          colorPicked = true;
          break;
        }
      } else if (annotation.type === 'polygon' && annotation.points) {
        // Point-in-polygon test
        const points = annotation.points;
        let inside = false;
        for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
          const xi = points[i].x, yi = points[i].y;
          const xj = points[j].x, yj = points[j].y;
          const intersect = ((yi > canvasPos.y) !== (yj > canvasPos.y))
              && (canvasPos.x < (xj - xi) * (canvasPos.y - yi) / (yj - yi) + xi);
          if (intersect) inside = !inside;
        }
        if (inside) {
          pickedColor = annotation.fill || annotation.stroke || '#000000';
          colorPicked = true;
          break;
        }
      }
    }
    
    // Check artboards if no shape found
    if (!colorPicked) {
      const clickedArtboard = Object.values(artboards).find(artboard => 
        canvasPos.x >= artboard.x && 
        canvasPos.x <= artboard.x + artboard.width &&
        canvasPos.y >= artboard.y && 
        canvasPos.y <= artboard.y + artboard.height
      );
      
      if (clickedArtboard) {
        pickedColor = clickedArtboard.backgroundColor;
        colorPicked = true;
      }
    }
    
    // Apply the picked color
    if (colorPicked && pickedColor) {
      setStrokeColor(pickedColor);
      setFillColor(pickedColor);
      showNotification(`Color picked: ${pickedColor}`);
      setActiveTool('select');
    } else {
      // Try to sample from canvas (if we add canvas rendering later)
      showNotification('Click on a shape or use browser eyedropper');
    }
  }, [artboards, annotations, getCanvasPosition]);
  
  // Simple notification helper
  const showNotification = (message) => {
    const notification = document.createElement('div');
    notification.className = 'fixed top-4 right-4 bg-blue-600 text-white px-4 py-2 rounded shadow-lg z-50';
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 2000);
  };

  // Handle paint bucket - fill clicked area
  const handlePaintBucket = useCallback((canvasPos) => {
    // Find the clicked shape
    let clickedShape = null;
    let clickedIndex = -1;
    
    // Check all annotations (which includes shapes)
    for (let i = 0; i < annotations.length; i++) {
      const annotation = annotations[i];
      let isInside = false;
      
      // Check different shape types
      if (annotation.type === 'rectangle') {
        isInside = canvasPos.x >= annotation.x && 
                   canvasPos.x <= annotation.x + annotation.width &&
                   canvasPos.y >= annotation.y && 
                   canvasPos.y <= annotation.y + annotation.height;
      } else if (annotation.type === 'ellipse') {
        const cx = annotation.cx || (annotation.x + annotation.width / 2);
        const cy = annotation.cy || (annotation.y + annotation.height / 2);
        const rx = annotation.rx || (annotation.width / 2);
        const ry = annotation.ry || (annotation.height / 2);
        const dx = (canvasPos.x - cx) / rx;
        const dy = (canvasPos.y - cy) / ry;
        isInside = (dx * dx + dy * dy) <= 1;
      } else if (annotation.type === 'polygon' && annotation.points) {
        // Point-in-polygon test
        const points = annotation.points;
        let inside = false;
        for (let j = 0, k = points.length - 1; j < points.length; k = j++) {
          const xi = points[j].x, yi = points[j].y;
          const xj = points[k].x, yj = points[k].y;
          const intersect = ((yi > canvasPos.y) !== (yj > canvasPos.y))
              && (canvasPos.x < (xj - xi) * (canvasPos.y - yi) / (yj - yi) + xi);
          if (intersect) inside = !inside;
        }
        isInside = inside;
      } else if ((annotation.type === 'vector' || annotation.type === 'path' || annotation.type === 'bezier') && 
                 annotation.x !== undefined && annotation.y !== undefined) {
        // Bounding box check for paths
        isInside = canvasPos.x >= annotation.x && 
                   canvasPos.x <= annotation.x + (annotation.width || 100) &&
                   canvasPos.y >= annotation.y && 
                   canvasPos.y <= annotation.y + (annotation.height || 100);
      }
      
      if (isInside) {
        clickedShape = annotation;
        clickedIndex = i;
        break;
      }
    }
    
    // Update the clicked shape
    if (clickedShape) {
      // Only update if fill color is different to avoid loops
      if (clickedShape.fill !== fillColor) {
        setAnnotations(prev => prev.map((ann, i) => 
          i === clickedIndex ? { ...ann, fill: fillColor } : ann
        ));
        
        // Also update in vector paths if it exists there
        if (clickedShape.id) {
          setVectorPaths(prev => prev.map(vp => 
            vp.id === clickedShape.id ? { ...vp, fill: fillColor } : vp
          ));
          
          // Update vector shapes too
          setVectorShapes(prev => prev.map(vs => 
            vs.id === clickedShape.id ? { ...vs, fill: fillColor } : vs
          ));
        }
        
        showNotification(`Filled ${clickedShape.type} with ${fillColor}`);
      }
    } else {
      // If no shape found, check artboards
      const clickedArtboard = Object.values(artboards).find(artboard => 
        canvasPos.x >= artboard.x && 
        canvasPos.x <= artboard.x + artboard.width &&
        canvasPos.y >= artboard.y && 
        canvasPos.y <= artboard.y + artboard.height
      );
      
      if (clickedArtboard) {
        // Update artboard background color
        updateArtboard(clickedArtboard.id, {
          backgroundColor: fillColor
        });
        showNotification(`Filled artboard with ${fillColor}`);
      } else {
        showNotification('Click on a shape to fill it');
      }
    }
  }, [artboards, fillColor, updateArtboard, annotations, vectorPaths, vectorShapes]);

  // Handle marquee selection
  const updateMarqueeSelection = useCallback(() => {
    if (!isMarqueeSelecting) return;

    const rect = {
      left: Math.min(marqueeStart.x, marqueeEnd.x),
      top: Math.min(marqueeStart.y, marqueeEnd.y),
      right: Math.max(marqueeStart.x, marqueeEnd.x),
      bottom: Math.max(marqueeStart.y, marqueeEnd.y)
    };

    const newMediaSelection = [];
    const newArtboardSelection = [];
    const newVectorSelection = [];
    
    // Check media items
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
        newMediaSelection.push(id);
      }
    });
    
    // Check vector items
    const allVectors = [
      ...vectorShapes,
      ...vectorPaths,
      ...vectorText,
      ...annotations.filter(a => ['rectangle', 'ellipse', 'polygon', 'path', 'vector'].includes(a.type))
    ];
    
    allVectors.forEach(vector => {
      if (!vector.id) return;
      
      // Check if vector is locked
      const itemType = vector.type === 'text' ? 'text' : 'vectors';
      const layer = layers.find(l => l.itemId === vector.id && l.itemType === itemType);
      const isLayerLocked = layer?.locked || typeFilters[itemType].locked;
      if (isLayerLocked) return; // Skip locked vectors
      
      // Get bounding box for vector
      let vectorRect;
      if (vector.type === 'rectangle' || vector.type === 'text') {
        vectorRect = {
          left: vector.x || 0,
          top: vector.y || 0,
          right: (vector.x || 0) + (vector.width || 100),
          bottom: (vector.y || 0) + (vector.height || 100)
        };
      } else if (vector.type === 'ellipse') {
        const cx = vector.cx || vector.x + vector.width / 2;
        const cy = vector.cy || vector.y + vector.height / 2;
        const rx = vector.rx || vector.width / 2;
        const ry = vector.ry || vector.height / 2;
        vectorRect = {
          left: cx - rx,
          top: cy - ry,
          right: cx + rx,
          bottom: cy + ry
        };
      } else if (vector.type === 'polygon' && vector.points) {
        const xs = vector.points.map(p => p.x);
        const ys = vector.points.map(p => p.y);
        vectorRect = {
          left: Math.min(...xs),
          top: Math.min(...ys),
          right: Math.max(...xs),
          bottom: Math.max(...ys)
        };
      } else if (vector.type === 'path') {
        // For path annotations (pencil and vector pen)
        const width = vector.boundingWidth || vector.width || 100;
        const height = vector.boundingHeight || vector.height || 100;
        vectorRect = {
          left: vector.x || 0,
          top: vector.y || 0,
          right: (vector.x || 0) + width,
          bottom: (vector.y || 0) + height
        };
      } else if (vector.path) {
        // For other paths with path property
        vectorRect = {
          left: vector.x || 0,
          top: vector.y || 0,
          right: (vector.x || 0) + (vector.width || 100),
          bottom: (vector.y || 0) + (vector.height || 100)
        };
      }
      
      if (vectorRect && rect.left < vectorRect.right &&
        rect.right > vectorRect.left &&
        rect.top < vectorRect.bottom &&
        rect.bottom > vectorRect.top) {
        newVectorSelection.push(vector.id);
      }
    });
    
    // Check artboards
    Object.entries(artboards).forEach(([id, artboard]) => {
      if (artboard.isLocked) return;

      const artboardRect = {
        left: artboard.x,
        top: artboard.y,
        right: artboard.x + artboard.width,
        bottom: artboard.y + artboard.height
      };

      // Check if rectangles intersect
      if (rect.left < artboardRect.right &&
        rect.right > artboardRect.left &&
        rect.top < artboardRect.bottom &&
        rect.bottom > artboardRect.top) {
        newArtboardSelection.push(id);
      }
    });

    setSelectedItems(newMediaSelection);
    setSelectedArtboards(newArtboardSelection);
    setSelectedVectorIds(newVectorSelection);
  }, [isMarqueeSelecting, marqueeStart, marqueeEnd, freeGridItems, artboards, lockedItems, vectorShapes, vectorPaths, vectorText, annotations]);

  // Eraser functionality (moved here to be available for handleMouseDown)
  const eraseAtPosition = useCallback((pos) => {
    const eraseRadius = 20; // Larger radius for easier erasing

    // For vectors (shapes), remove entire shape if clicked
    setAnnotations(prev => prev.filter(annotation => {
      if (annotation.type === 'path') {
        // For pencil paths, erase only the parts near the eraser
        const points = annotation.points.join(' ').match(/[ML]\s*([\d.-]+)\s+([\d.-]+)/g);
        if (!points) return true;

        // Keep points that are far from eraser
        const remainingPath = [];
        let isBreaking = false;
        
        for (const point of points) {
          const coords = point.match(/([ML])\s*([\d.-]+)\s+([\d.-]+)/);
          if (coords) {
            const type = coords[1];
            const x = parseFloat(coords[2]);
            const y = parseFloat(coords[3]);
            const distance = Math.sqrt(Math.pow(x - pos.x, 2) + Math.pow(y - pos.y, 2));
            
            if (distance > eraseRadius) {
              // Point is far from eraser, keep it
              if (isBreaking || remainingPath.length === 0) {
                remainingPath.push(`M ${x} ${y}`); // Start new path segment
                isBreaking = false;
              } else {
                remainingPath.push(`L ${x} ${y}`);
              }
            } else {
              // Point is being erased, mark break in path
              isBreaking = true;
            }
          }
        }
        
        // If we have remaining points, update the annotation
        if (remainingPath.length > 1) {
          annotation.points = [remainingPath.join(' ')];
          return true;
        }
        return false; // Remove if no points left
      } else if (annotation.type === 'rectangle') {
        // For rectangles, check if click is inside
        if (pos.x >= annotation.x && 
            pos.x <= annotation.x + annotation.width &&
            pos.y >= annotation.y && 
            pos.y <= annotation.y + annotation.height) {
          return false; // Remove entire rectangle
        }
      } else if (annotation.type === 'ellipse') {
        // For ellipses, check if click is inside
        const cx = annotation.cx || (annotation.x + annotation.width / 2);
        const cy = annotation.cy || (annotation.y + annotation.height / 2);
        const rx = annotation.rx || (annotation.width / 2);
        const ry = annotation.ry || (annotation.height / 2);
        const dx = (pos.x - cx) / rx;
        const dy = (pos.y - cy) / ry;
        if (dx * dx + dy * dy <= 1) {
          return false; // Remove entire ellipse
        }
      } else if (annotation.type === 'polygon') {
        // Check if click is inside polygon using point-in-polygon test
        const points = annotation.points;
        let inside = false;
        for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
          const xi = points[i].x, yi = points[i].y;
          const xj = points[j].x, yj = points[j].y;
          const intersect = ((yi > pos.y) !== (yj > pos.y))
              && (pos.x < (xj - xi) * (pos.y - yi) / (yj - yi) + xi);
          if (intersect) inside = !inside;
        }
        if (inside) return false; // Remove entire polygon
      }
      return true;
    }));

    // Also erase vector paths
    setVectorPaths(prev => prev.filter(path => {
      // Check if click is within path bounds
      if (path.x !== undefined && path.y !== undefined) {
        if (pos.x >= path.x && 
            pos.x <= path.x + (path.width || 100) &&
            pos.y >= path.y && 
            pos.y <= path.y + (path.height || 100)) {
          return false; // Remove entire path
        }
      }
      return true;
    }));

    // Erase vector shapes
    setVectorShapes(prev => prev.filter(shape => {
      if (shape.type === 'rectangle') {
        if (pos.x >= shape.x && 
            pos.x <= shape.x + shape.width &&
            pos.y >= shape.y && 
            pos.y <= shape.y + shape.height) {
          return false;
        }
      } else if (shape.type === 'ellipse') {
        const cx = shape.cx || (shape.x + shape.width / 2);
        const cy = shape.cy || (shape.y + shape.height / 2);
        const rx = shape.rx || (shape.width / 2);
        const ry = shape.ry || (shape.height / 2);
        const dx = (pos.x - cx) / rx;
        const dy = (pos.y - cy) / ry;
        if (dx * dx + dy * dy <= 1) {
          return false;
        }
      }
      return true;
    }));

    // Erase vector text
    setVectorText(prev => prev.filter(text => {
      if (pos.x >= text.x && 
          pos.x <= text.x + (text.width || 200) &&
          pos.y >= text.y && 
          pos.y <= text.y + (text.height || 50)) {
        return false;
      }
      return true;
    }));
  }, []);

  // Mouse event handlers
  const handleMouseDown = useCallback((e) => {
    // Check if clicking on an artboard or its controls - let them handle their own events
    if (e.target.closest('[data-artboard]') || e.target.closest('[data-artboard-controls]')) {
      return;
    }
    
    // Middle mouse button or space+click for panning
    if (e.button === 1 || (e.button === 0 && isSpacePressed)) {
      e.preventDefault();
      setIsPanning(true);
      lastPanPositionRef.current = { x: e.clientX, y: e.clientY };
      return;
    }

    const canvasPos = getCanvasPosition(e.clientX, e.clientY);

    // Check if clicking on an item
    let clickedItemId = null;
    let clickedItem = null;
    let clickedArtboardId = null;

    // Helper function to check if click is within an artboard
    const getArtboardAtPosition = (pos) => {
      for (const [id, artboard] of Object.entries(artboards)) {
        if (pos.x >= artboard.x &&
            pos.x <= artboard.x + artboard.width &&
            pos.y >= artboard.y &&
            pos.y <= artboard.y + artboard.height) {
          return { id, artboard };
        }
      }
      return null;
    };

    // Check for artboard under click position
    const artboardUnderCursor = getArtboardAtPosition(canvasPos);
    
    // If artboard priority mode is active, check artboards first
    if (typeFilters.artboards?.priority && artboardUnderCursor && !typeFilters.artboards?.locked) {
      handleArtboardSelect(artboardUnderCursor.id, e);
      return;
    }

    // First check if active layer item is at click position
    if (activeLayerId) {
      const activeLayer = layers.find(l => l.id === activeLayerId);
      if (activeLayer && activeLayer.itemType === 'media') {
        const activeItemEntry = Object.entries(freeGridItems).find(([id]) => id === activeLayer.itemId);
        if (activeItemEntry) {
          const [id, item] = activeItemEntry;
          if (canvasPos.x >= item.x &&
              canvasPos.x <= item.x + item.width &&
              canvasPos.y >= item.y &&
              canvasPos.y <= item.y + item.height) {
            clickedItemId = id;
            clickedItem = item;
            
            // Check for double-click
            if (e.detail === 2) {
              handleMediaDoubleClick(id);
              return;
            }
          }
        }
      } else if (activeLayer && (activeLayer.itemType === 'text' || activeLayer.itemType === 'vectors')) {
        // Check for active layer annotation
        const allAnnotations = [...(annotations || []), ...(vectorPaths || []), ...(vectorText || []), ...(vectorShapes || [])];
        const activeAnnotation = allAnnotations.find(ann => ann.id === activeLayer.itemId);
        
        if (activeAnnotation) {
          let isHit = false;
          
          // Use the same hit detection logic as below
          if (activeAnnotation.type === 'rectangle') {
            const x = activeAnnotation.x || 0;
            const y = activeAnnotation.y || 0;
            const width = activeAnnotation.width || 100;
            const height = activeAnnotation.height || 100;
            if (canvasPos.x >= x && canvasPos.x <= x + width &&
                canvasPos.y >= y && canvasPos.y <= y + height) {
              isHit = true;
            }
          } else if (activeAnnotation.type === 'ellipse') {
            const x = activeAnnotation.x || 0;
            const y = activeAnnotation.y || 0;
            const width = activeAnnotation.width || 100;
            const height = activeAnnotation.height || 100;
            const rx = width / 2;
            const ry = height / 2;
            const cx = x + rx;
            const cy = y + ry;
            const dx = (canvasPos.x - cx) / rx;
            const dy = (canvasPos.y - cy) / ry;
            if (dx * dx + dy * dy <= 1) {
              isHit = true;
            }
          } else if (activeAnnotation.type === 'polygon' && activeAnnotation.points) {
            let inside = false;
            const points = activeAnnotation.points;
            for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
              const xi = points[i].x, yi = points[i].y;
              const xj = points[j].x, yj = points[j].y;
              const intersect = ((yi > canvasPos.y) !== (yj > canvasPos.y))
                  && (canvasPos.x < (xj - xi) * (canvasPos.y - yi) / (yj - yi) + xi);
              if (intersect) inside = !inside;
            }
            if (inside) isHit = true;
          } else if (activeAnnotation.type === 'path' && activeAnnotation.points && Array.isArray(activeAnnotation.points)) {
            const bWidth = activeAnnotation.boundingWidth || activeAnnotation.width || 100;
            const bHeight = activeAnnotation.boundingHeight || activeAnnotation.height || 100;
            if (activeAnnotation.x !== undefined && activeAnnotation.y !== undefined) {
              if (canvasPos.x >= activeAnnotation.x && canvasPos.x <= activeAnnotation.x + bWidth &&
                  canvasPos.y >= activeAnnotation.y && canvasPos.y <= activeAnnotation.y + bHeight) {
                isHit = true;
              }
            }
          } else if ((activeAnnotation.type === 'path' || activeAnnotation.type === 'vector' || activeAnnotation.type === 'bezier' || activeAnnotation.path) && !activeAnnotation.points) {
            if (isPointNearPath(canvasPos, activeAnnotation)) {
              isHit = true;
            }
          } else if (activeAnnotation.type === 'text' && activeAnnotation.x !== undefined && activeAnnotation.y !== undefined) {
            const x = activeAnnotation.x || 0;
            const y = activeAnnotation.y || 0;
            const width = activeAnnotation.width || 200;
            const height = activeAnnotation.height || 50;
            if (canvasPos.x >= x && canvasPos.x <= x + width &&
                canvasPos.y >= y && canvasPos.y <= y + height) {
              isHit = true;
              // Check for double-click on text
              if (e.detail === 2) {
                setEditingTextId(activeAnnotation.id);
                setActiveTool('text');
                return;
              }
            }
          }
          
          if (isHit) {
            // Check if vector is locked
            const itemType = activeAnnotation.type === 'text' ? 'text' : 'vectors';
            const layer = layers.find(l => l.itemId === activeAnnotation.id && l.itemType === itemType);
            const isLayerLocked = layer?.locked || typeFilters[itemType].locked;
            
            if (isLayerLocked) {
              // Vector is locked, don't allow selection
              return;
            }
            
            // Select only this active annotation and skip normal vector selection
            if (!selectedVectorIds.includes(activeAnnotation.id)) {
              setSelectedVectorIds([activeAnnotation.id]);
              setSelectedItems([]);
            }
            // Skip to dragging logic
            if (!e.ctrlKey && !e.metaKey) {
              setIsDragging(true);
              draggedVectorPositionsRef.current = {};
              draggedMediaPositionsRef.current = {};
              
              const allVectors = [...(annotations || []), ...(vectorPaths || []), ...(vectorText || []), ...(vectorShapes || [])];
              selectedVectorIds.forEach(id => {
                const vector = allVectors.find(v => v.id === id);
                if (vector) {
                  draggedVectorPositionsRef.current[id] = { 
                    x: vector.x || 0, 
                    y: vector.y || 0,
                    originalPath: vector.type === 'path' && vector.points ? [...vector.points] : null
                  };
                }
              });
              
              setDragOffset({
                x: canvasPos.x,
                y: canvasPos.y
              });
            }
            return; // Skip normal click detection
          }
        }
      }
    }
    
    // If active layer item wasn't clicked, check all items by layer order
    if (!clickedItemId) {
      // Sort items by their layer order
      const itemsWithLayerOrder = Object.entries(freeGridItems).map(([id, item]) => {
        const layer = layers.find(l => l.itemId === id && l.itemType === 'media');
        const layerIndex = layer ? layerOrder.indexOf(layer.id) : -1;
        return { id, item, layerIndex };
      }).sort((a, b) => b.layerIndex - a.layerIndex);

      for (const { id, item } of itemsWithLayerOrder) {
        // Check if item is locked
        const layer = layers.find(l => l.itemId === id && l.itemType === 'media');
        const isLayerLocked = layer?.locked || typeFilters.media.locked || lockedItems.has(id);
        
        if (!isLayerLocked &&
            canvasPos.x >= item.x &&
            canvasPos.x <= item.x + item.width &&
            canvasPos.y >= item.y &&
            canvasPos.y <= item.y + item.height) {
          clickedItemId = id;
          clickedItem = item;

          // Check for double-click
          if (e.detail === 2) {
            handleMediaDoubleClick(id);
            return;
          }
          break;
        }
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

    if (activeTool === 'select' || activeTool === 'direct-select') {
      // First check for vector clicks - unify all vector types
      let clickedVector = null;
      
      // Collect ALL vector items regardless of source
      // Note: Most shapes are in annotations, not vectorShapes
      const allVectorItems = [
        ...(annotations || []),
        ...(vectorPaths || []),
        ...(vectorText || []),
        ...(vectorShapes || [])
      ].filter(item => item && item.id); // Ensure items exist and have IDs
      
      // Check each vector item for clicks
      for (const item of allVectorItems) {
        let isHit = false;
        
        if (item.type === 'rectangle') {
          // Rectangle hit test
          const x = item.x || 0;
          const y = item.y || 0;
          const width = item.width || 100;
          const height = item.height || 100;
          if (canvasPos.x >= x && canvasPos.x <= x + width &&
              canvasPos.y >= y && canvasPos.y <= y + height) {
            isHit = true;
          }
        } else if (item.type === 'ellipse') {
          // Ellipse hit test
          const x = item.x || 0;
          const y = item.y || 0;
          const width = item.width || 100;
          const height = item.height || 100;
          const rx = width / 2;
          const ry = height / 2;
          const cx = x + rx;
          const cy = y + ry;
          const dx = (canvasPos.x - cx) / rx;
          const dy = (canvasPos.y - cy) / ry;
          if (dx * dx + dy * dy <= 1) {
            isHit = true;
          }
        } else if (item.type === 'polygon' && item.points) {
          // Polygon hit test
          let inside = false;
          const points = item.points;
          for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
            const xi = points[i].x, yi = points[i].y;
            const xj = points[j].x, yj = points[j].y;
            const intersect = ((yi > canvasPos.y) !== (yj > canvasPos.y))
                && (canvasPos.x < (xj - xi) * (canvasPos.y - yi) / (yj - yi) + xi);
            if (intersect) inside = !inside;
          }
          if (inside) {
            isHit = true;
          }
        } else if (item.type === 'path' && item.points && Array.isArray(item.points)) {
          // Pencil path hit test - check bounding box
          const bWidth = item.boundingWidth || item.width || 100;
          const bHeight = item.boundingHeight || item.height || 100;
          if (item.x !== undefined && item.y !== undefined) {
            if (canvasPos.x >= item.x && canvasPos.x <= item.x + bWidth &&
                canvasPos.y >= item.y && canvasPos.y <= item.y + bHeight) {
              isHit = true;
            }
          }
        } else if ((item.type === 'path' || item.type === 'vector' || item.type === 'bezier' || item.path) && !item.points) {
          // Path/vector hit test
          if (isPointNearPath(canvasPos, item)) {
            isHit = true;
          }
        } else if (item.type === 'text' && item.x !== undefined && item.y !== undefined) {
          // Text hit test
          const x = item.x || 0;
          const y = item.y || 0;
          const width = item.width || 200;
          const height = item.height || 50;
          if (canvasPos.x >= x && canvasPos.x <= x + width &&
              canvasPos.y >= y && canvasPos.y <= y + height) {
            isHit = true;
            // Check for double-click on text
            if (e.detail === 2) {
              setEditingTextId(item.id);
              setActiveTool('text');
              return;
            }
          }
        }
        
        if (isHit) {
          clickedVector = item;
          break;
        }
      }
      
      if (clickedVector) {
        // Check if vector is locked
        const itemType = clickedVector.type === 'text' ? 'text' : 'vectors';
        const layer = layers.find(l => l.itemId === clickedVector.id && l.itemType === itemType);
        const isLayerLocked = layer?.locked || typeFilters[itemType].locked;
        
        if (isLayerLocked) {
          // Vector is locked, don't allow selection
          return;
        }
        
        // Handle vector selection - match media item behavior
        if (e.ctrlKey || e.metaKey) {
          // Multi-select mode
          setSelectedVectorIds(prev => {
            const isSelected = prev.includes(clickedVector.id);
            if (isSelected) {
              return prev.filter(id => id !== clickedVector.id);
            } else {
              return [...prev, clickedVector.id];
            }
          });
        } else if (!selectedVectorIds.includes(clickedVector.id)) {
          // If clicking on unselected vector, select only this one
          setSelectedVectorIds([clickedVector.id]);
          setSelectedItems([]); // Clear media selection
        }
        // If clicking on already selected vector without ctrl/cmd, keep selection for dragging

        // Start unified dragging - only if not using ctrl/cmd for multi-select
        if (!e.ctrlKey && !e.metaKey) {
          setIsDragging(true);
          
          // Initialize positions for ALL selected items (both vectors and media)
          draggedVectorPositionsRef.current = {};
          draggedMediaPositionsRef.current = {};
          
          // Track all selected vectors
          const vectorsToTrack = selectedVectorIds.includes(clickedVector.id) 
            ? selectedVectorIds 
            : [clickedVector.id];
            
          // Get all vector collections
          const allVectors = [...(annotations || []), ...(vectorPaths || []), ...(vectorText || []), ...(vectorShapes || [])];
          
          vectorsToTrack.forEach(id => {
            const vector = allVectors.find(v => v.id === id);
            if (vector) {
              draggedVectorPositionsRef.current[id] = { 
                x: vector.x || 0, 
                y: vector.y || 0,
                // Store original path data for path type annotations
                originalPath: vector.type === 'path' && vector.points ? [...vector.points] : null
              };
            }
          });
          
          // Also track media items if any are selected
          if (selectedItems.length > 0) {
            setDraggedItems(selectedItems);
            // Store initial positions for media items
            selectedItems.forEach(id => {
              const item = freeGridItems[id];
              if (item) {
                draggedMediaPositionsRef.current[id] = { x: item.x, y: item.y };
              }
            });
          } else {
            setDraggedItems([]);
          }
          
          // Store the initial mouse position (same for both types)
          setDragOffset({
            x: canvasPos.x,
            y: canvasPos.y
          });
        }
      } else if (clickedItemId) {
        // Check if Alt key is pressed and there's an artboard underneath - select artboard instead
        if (e.altKey && artboardUnderCursor) {
          handleArtboardSelect(artboardUnderCursor.id, e);
          return;
        }
        
        // Handle media item selection
        if (!lockedItems.has(clickedItemId)) {
          if (e.ctrlKey || e.metaKey) {
            setSelectedItems(prev =>
              prev.includes(clickedItemId)
                ? prev.filter(id => id !== clickedItemId)
                : [...prev, clickedItemId]
            );
          } else if (!selectedItems.includes(clickedItemId)) {
            setSelectedItems([clickedItemId]);
            if (!e.ctrlKey && !e.metaKey) {
              setSelectedVectorIds([]); // Clear vector selection only if not multi-selecting
            }
          }

          // Start unified dragging - if clicked item is selected, drag all selected items
          if (!e.ctrlKey && !e.metaKey) {
            setIsDragging(true);
            const itemsToTrack = selectedItems.includes(clickedItemId) ? selectedItems : [clickedItemId];
            setDraggedItems(itemsToTrack);
            
            // Initialize positions for ALL selected items (both vectors and media)
            draggedVectorPositionsRef.current = {};
            draggedMediaPositionsRef.current = {};
            
            // Track all media items
            itemsToTrack.forEach(id => {
              const item = freeGridItems[id];
              if (item) {
                draggedMediaPositionsRef.current[id] = { x: item.x, y: item.y };
              }
            });
            
            // Track all selected vectors if any
            if (selectedVectorIds.length > 0) {
              const allVectors = [...(annotations || []), ...(vectorPaths || []), ...(vectorText || []), ...(vectorShapes || [])];
              
              selectedVectorIds.forEach(id => {
                const vector = allVectors.find(v => v.id === id);
                if (vector) {
                  draggedVectorPositionsRef.current[id] = { x: vector.x || 0, y: vector.y || 0 };
                }
              });
            }
            
            // Store the initial mouse position (same for both types)
            setDragOffset({
              x: canvasPos.x,
              y: canvasPos.y
            });
          }
        }
      } else {
        // Check if clicking on an artboard (when no media item is clicked)
        if (artboardUnderCursor) {
          // Handle artboard selection
          handleArtboardSelect(artboardUnderCursor.id, e);
          return; // Don't start marquee selection
        }
        
        // Start marquee selection
        setIsMarqueeSelecting(true);
        setMarqueeStart(canvasPos);
        setMarqueeEnd(canvasPos);
        if (!e.ctrlKey && !e.metaKey) {
          setSelectedItems([]);
          setSelectedVectorIds([]);
          setSelectedArtboards([]);
        }
      }
    } else if (activeTool === 'pencil' || activeTool === 'pen') {
      setIsDrawing(true);
      setCurrentAnnotation({
        id: `annotation-${Date.now()}`,
        type: 'path',
        color: strokeColor,
        width: strokeWidth,
        points: [`M ${canvasPos.x} ${canvasPos.y}`]
      });
    } else if (activeTool === 'text') {
      // Text tool is handled by TextAreaTool component
    } else if (activeTool === 'eraser') {
      // Erase on click - check what was clicked
      eraseAtPosition(canvasPos);
      // Also start drag erasing for continuous erase
      setIsDrawing(true);
    } else if (activeTool === 'eyedropper') {
      // Eyedropper is now handled by VisualEyedropper component
      // Do nothing here
    } else if (activeTool === 'paint-bucket') {
      // Fill area with color
      handlePaintBucket(canvasPos);
    }
  }, [activeTool, getCanvasPosition, freeGridItems, selectedItems, strokeColor, strokeWidth, lockedItems, previewMode, enableGridSelection, mediaFiles, onMediaItemSelect, onPreviewMedia, isSpacePressed, artboards, selectedVectorIds, annotations, vectorPaths, vectorText, vectorShapes, handlePaintBucket]);

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
    } else if (isDragging) {
      // Handle unified dragging for both vectors and media items
      
      // Calculate movement delta from the original drag position
      const deltaX = canvasPos.x - dragOffset.x;
      const deltaY = canvasPos.y - dragOffset.y;
      
      // Update all selected vectors
      if (selectedVectorIds.length > 0) {
        // Get initial positions if not stored
        if (!draggedVectorPositionsRef.current) {
          draggedVectorPositionsRef.current = {};
          const allVectors = [...(annotations || []), ...(vectorPaths || []), ...(vectorText || []), ...(vectorShapes || [])];
          
          selectedVectorIds.forEach(id => {
            const vector = allVectors.find(v => v.id === id);
            if (vector) {
              draggedVectorPositionsRef.current[id] = { 
                x: vector.x || 0, 
                y: vector.y || 0,
                // Store original path data for path type annotations
                originalPath: vector.type === 'path' && vector.points ? [...vector.points] : null
              };
            }
          });
        }
        
        setAnnotations(prev => prev.map(ann => {
          if (selectedVectorIds.includes(ann.id)) {
            const initialPos = draggedVectorPositionsRef.current?.[ann.id];
            if (!initialPos) return ann;
            
            const updated = {
              ...ann,
              x: initialPos.x + deltaX,
              y: initialPos.y + deltaY
            };
            
            // For polygons with absolute point coordinates, we need to move all points
            if (ann.type === 'polygon' && ann.points) {
              // Calculate how much the polygon has moved
              const currentDeltaX = (initialPos.x + deltaX) - (ann.x || 0);
              const currentDeltaY = (initialPos.y + deltaY) - (ann.y || 0);
              
              updated.points = ann.points.map(point => ({
                x: point.x + currentDeltaX,
                y: point.y + currentDeltaY
              }));
            }
            
            // For ellipses, update center coordinates
            if (ann.type === 'ellipse' && ann.cx !== undefined && ann.cy !== undefined) {
              const currentDeltaX = (initialPos.x + deltaX) - (ann.x || 0);
              const currentDeltaY = (initialPos.y + deltaY) - (ann.y || 0);
              
              updated.cx = ann.cx + currentDeltaX;
              updated.cy = ann.cy + currentDeltaY;
            }
            
            // For path type with SVG path string (pencil and vector pen paths)
            if (ann.type === 'path' && ann.points && ann.points.length > 0) {
              const originalPath = draggedVectorPositionsRef.current?.[ann.id]?.originalPath;
              if (originalPath && originalPath.length > 0) {
                // Check if it's an array of strings (pencil) or single string in array (vector pen)
                if (originalPath.length === 1 && typeof originalPath[0] === 'string') {
                  // Vector pen path - single string
                  const pathString = originalPath[0];
                  const transformedPath = pathString.replace(/([ML])\s*([\d.-]+)\s+([\d.-]+)/g, (match, cmd, x, y) => {
                    const newX = parseFloat(x) + deltaX;
                    const newY = parseFloat(y) + deltaY;
                    return `${cmd} ${newX} ${newY}`;
                  });
                  
                  // Also handle cubic bezier curves
                  const finalPath = transformedPath.replace(/C\s*([\d.-]+)\s+([\d.-]+)\s*,\s*([\d.-]+)\s+([\d.-]+)\s*,\s*([\d.-]+)\s+([\d.-]+)/g, 
                    (match, x1, y1, x2, y2, x3, y3) => {
                      return `C ${parseFloat(x1) + deltaX} ${parseFloat(y1) + deltaY}, ${parseFloat(x2) + deltaX} ${parseFloat(y2) + deltaY}, ${parseFloat(x3) + deltaX} ${parseFloat(y3) + deltaY}`;
                    });
                  
                  updated.points = [finalPath];
                } else {
                  // Pencil path - array of M and L commands
                  const transformedPoints = originalPath.map(point => {
                    if (typeof point === 'string') {
                      return point.replace(/([ML])\s*([\d.-]+)\s+([\d.-]+)/g, (match, cmd, x, y) => {
                        const newX = parseFloat(x) + deltaX;
                        const newY = parseFloat(y) + deltaY;
                        return `${cmd} ${newX} ${newY}`;
                      });
                    }
                    return point;
                  });
                  updated.points = transformedPoints;
                }
              } else {
                updated.points = ann.points;
              }
            }
            
            return updated;
          }
          return ann;
        }));
        
        setVectorShapes(prev => prev.map(shape => {
          if (selectedVectorIds.includes(shape.id)) {
            const initialPos = draggedVectorPositionsRef.current?.[shape.id];
            if (!initialPos) return shape;
            return {
              ...shape,
              x: initialPos.x + deltaX,
              y: initialPos.y + deltaY
            };
          }
          return shape;
        }));
        
        setVectorPaths(prev => prev.map(path => {
          if (selectedVectorIds.includes(path.id)) {
            const initialPos = draggedVectorPositionsRef.current?.[path.id];
            if (!initialPos) return path;
            return {
              ...path,
              x: initialPos.x + deltaX,
              y: initialPos.y + deltaY
            };
          }
          return path;
        }));
        
        setVectorText(prev => prev.map(text => {
          if (selectedVectorIds.includes(text.id)) {
            const initialPos = draggedVectorPositionsRef.current?.[text.id];
            if (!initialPos) return text;
            return {
              ...text,
              x: initialPos.x + deltaX,
              y: initialPos.y + deltaY
            };
          }
          return text;
        }));
      }
      
      // Update all selected media items
      if (draggedItems.length > 0) {
        // Get initial positions if not stored
        if (!draggedMediaPositionsRef.current) {
          draggedMediaPositionsRef.current = {};
          draggedItems.forEach(id => {
            const item = freeGridItems[id];
            if (item) {
              draggedMediaPositionsRef.current[id] = { x: item.x, y: item.y };
            }
          });
        }

        // Update all dragged items using the same delta calculation as vectors
        const updates = {};
        draggedItems.forEach(id => {
          const item = freeGridItems[id];
          const initialPos = draggedMediaPositionsRef.current?.[id];
          if (item && initialPos && !lockedItems.has(id)) {
            updates[id] = {
              ...item,
              x: initialPos.x + deltaX,
              y: initialPos.y + deltaY
            };
          }
        });

        setFreeGridItems(prev => ({ ...prev, ...updates }));
      }
    } else if (isMarqueeSelecting) {
      setMarqueeEnd(canvasPos);
      updateMarqueeSelection();
    } else if (isDrawing && (activeTool === 'pencil' || activeTool === 'pen')) {
      setCurrentAnnotation(prev => ({
        ...prev,
        points: [...prev.points, `L ${canvasPos.x} ${canvasPos.y}`]
      }));
    } else if (isDrawing && activeTool === 'eraser') {
      // Erase annotations under cursor
      eraseAtPosition(canvasPos);
    } else if (isResizing && resizingItem) {
      handleResize(e);
    } else if (isRotating && rotatingItem) {
      handleRotate(e);
    } else if (draggingArtboard) {
      // Handle artboard dragging
      const newX = canvasPos.x - draggingArtboard.offsetX;
      const newY = canvasPos.y - draggingArtboard.offsetY;
      
      if (draggingArtboard.isGroup && draggingArtboard.groupArtboards) {
        // Move all artboards in the group
        draggingArtboard.groupArtboards.forEach(({ id, offsetX, offsetY }) => {
          const groupNewX = canvasPos.x - offsetX;
          const groupNewY = canvasPos.y - offsetY;
          updateArtboard(id, {
            x: snapToGrid ? Math.round(groupNewX / 20) * 20 : groupNewX,
            y: snapToGrid ? Math.round(groupNewY / 20) * 20 : groupNewY
          });
        });
      } else {
        // Move single artboard
        updateArtboard(draggingArtboard.id, {
          x: snapToGrid ? Math.round(newX / 20) * 20 : newX,
          y: snapToGrid ? Math.round(newY / 20) * 20 : newY
        });
      }
    } else if (resizingArtboard) {
      // Handle artboard resizing
      const deltaX = (e.clientX - resizingArtboard.startX) / zoomLevel;
      const deltaY = (e.clientY - resizingArtboard.startY) / zoomLevel;
      const artboard = resizingArtboard.startArtboard;
      
      let newX = artboard.x;
      let newY = artboard.y;
      let newWidth = artboard.width;
      let newHeight = artboard.height;

      switch (resizingArtboard.handle) {
        case 'nw':
          newX = artboard.x + deltaX;
          newY = artboard.y + deltaY;
          newWidth = artboard.width - deltaX;
          newHeight = artboard.height - deltaY;
          break;
        case 'ne':
          newY = artboard.y + deltaY;
          newWidth = artboard.width + deltaX;
          newHeight = artboard.height - deltaY;
          break;
        case 'sw':
          newX = artboard.x + deltaX;
          newWidth = artboard.width - deltaX;
          newHeight = artboard.height + deltaY;
          break;
        case 'se':
          newWidth = artboard.width + deltaX;
          newHeight = artboard.height + deltaY;
          break;
        case 'n':
          newY = artboard.y + deltaY;
          newHeight = artboard.height - deltaY;
          break;
        case 's':
          newHeight = artboard.height + deltaY;
          break;
        case 'w':
          newX = artboard.x + deltaX;
          newWidth = artboard.width - deltaX;
          break;
        case 'e':
          newWidth = artboard.width + deltaX;
          break;
      }

      // Minimum size constraints
      if (newWidth < 100) {
        if (['nw', 'sw', 'w'].includes(resizingArtboard.handle)) {
          newX = artboard.x + artboard.width - 100;
        }
        newWidth = 100;
      }
      if (newHeight < 100) {
        if (['nw', 'ne', 'n'].includes(resizingArtboard.handle)) {
          newY = artboard.y + artboard.height - 100;
        }
        newHeight = 100;
      }

      updateArtboard(resizingArtboard.id, {
        x: newX,
        y: newY,
        width: newWidth,
        height: newHeight
      });
    }
  }, [isPanning, isDragging, isMarqueeSelecting, isDrawing, isResizing, isRotating,
    getCanvasPosition, zoomLevel, draggedItems, dragOffset, freeGridItems,
    snapToGridPosition, findSnapPoints, updateMarqueeSelection, activeTool,
    resizingItem, rotatingItem, lockedItems, draggingArtboard, 
    resizingArtboard, updateArtboard, snapToGrid, selectedVectorIds, annotations, 
    vectorPaths, vectorShapes, vectorText, setAnnotations, 
    setVectorShapes, setVectorPaths, setVectorText, currentAnnotation, 
    setCurrentAnnotation, draggedMediaPositionsRef, draggedVectorPositionsRef]);

  const handleMouseUp = useCallback(() => {
    if (isDrawing && currentAnnotation && (activeTool === 'pencil' || activeTool === 'pen')) {
      // Calculate bounding box for the path
      const pathString = currentAnnotation.points.join(' ');
      const pathCoords = [];
      
      // Extract all coordinates from the path string
      const coordMatches = pathString.matchAll(/([ML])\s*([\d.-]+)\s+([\d.-]+)/g);
      for (const match of coordMatches) {
        pathCoords.push({ 
          x: parseFloat(match[2]), 
          y: parseFloat(match[3]) 
        });
      }
      
      if (pathCoords.length > 0) {
        const xs = pathCoords.map(p => p.x);
        const ys = pathCoords.map(p => p.y);
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);
        
        // Ensure minimum size
        const width = Math.max(maxX - minX, 1);
        const height = Math.max(maxY - minY, 1);
        
        const finalAnnotation = {
          ...currentAnnotation,
          x: minX,
          y: minY,
          boundingWidth: width,
          boundingHeight: height
        };
        setAnnotations(prev => [...prev, finalAnnotation]);
      } else {
        // Fallback with default size
        setAnnotations(prev => [...prev, {
          ...currentAnnotation,
          x: 0,
          y: 0,
          boundingWidth: 100,
          boundingHeight: 100
        }]);
      }
      setCurrentAnnotation(null);
    }

    setIsPanning(false);
    setIsDragging(false);
    setIsMarqueeSelecting(false);
    setIsDrawing(false);
    setIsResizing(false);
    setIsRotating(false);
    setDraggedItems([]);
    draggedVectorPositionsRef.current = null;
    draggedMediaPositionsRef.current = null;
    setResizingItem(null);
    setRotatingItem(null);
    setDraggingArtboard(null);
    setResizingArtboard(null);
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
    const aspectRatio = item.width / item.height;

    let newX = item.x;
    let newY = item.y;
    let newWidth = item.width;
    let newHeight = item.height;

    if (preserveAspectRatio && ['tl', 'tr', 'bl', 'br'].includes(resizingItem.handle)) {
      // Corner handles with aspect ratio preservation
      switch (resizingItem.handle) {
        case 'tl':
          newWidth = item.width - deltaX;
          newHeight = newWidth / aspectRatio;
          newX = item.x + item.width - newWidth;
          newY = item.y + item.height - newHeight;
          break;
        case 'tr':
          newWidth = item.width + deltaX;
          newHeight = newWidth / aspectRatio;
          newY = item.y + item.height - newHeight;
          break;
        case 'bl':
          newWidth = item.width - deltaX;
          newHeight = newWidth / aspectRatio;
          newX = item.x + item.width - newWidth;
          break;
        case 'br':
          newWidth = item.width + deltaX;
          newHeight = newWidth / aspectRatio;
          break;
      }
    } else {
      // Free resize or edge handles
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
  }, [resizingItem, zoomLevel, preserveAspectRatio]);


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


  const clearAllAnnotations = useCallback(() => {
    if (window.confirm('Clear all annotations and vector paths?')) {
      setAnnotations([]);
      setVectorPaths([]);
    }
  }, []);

  // Alignment functions
  const alignItems = useCallback((alignment) => {
    // Combine selected media items, artboards, and vector items
    const selectedMediaItems = selectedItems.map(id => ({
      id,
      type: 'media',
      ...freeGridItems[id]
    })).filter(item => !lockedItems.has(item.id));
    
    const selectedArtboardItems = selectedArtboards.map(id => ({
      id,
      type: 'artboard',
      ...artboards[id]
    })).filter(item => !item.isLocked);
    
    // Add selected vector items
    const selectedVectorItems = selectedVectorIds.map(id => {
      // Find vector in all vector collections
      // Note: Most vectors are in annotations, not in separate states
      let vector = annotations.find(v => v.id === id) ||
                   vectorPaths.find(v => v.id === id) ||
                   vectorText.find(v => v.id === id) ||
                   vectorShapes.find(v => v.id === id);
      
      if (vector) {
        // Check if vector is locked via layers or type filters
        const itemType = vector.type === 'text' ? 'text' : 'vectors';
        const layer = layers.find(l => l.itemId === id && l.itemType === itemType);
        const isLayerLocked = layer?.locked || typeFilters[itemType].locked;
        
        if (isLayerLocked) return null; // Skip locked vectors
        
        // Use boundingWidth/Height for path annotations (pencil strokes)
        const width = vector.boundingWidth || vector.width || 100;
        const height = vector.boundingHeight || vector.height || 100;
        
        return {
          ...vector,
          id,
          type: 'vector',
          x: vector.x || 0,
          y: vector.y || 0,
          width: width,
          height: height
        };
      }
      return null;
    }).filter(Boolean);
    
    const items = [...selectedMediaItems, ...selectedArtboardItems, ...selectedVectorItems];
    
    if (items.length < 2) return;

    let updates = {};

    switch (alignment) {
      case 'left':
        const minX = Math.min(...items.map(item => item.x));
        items.forEach(item => {
          updates[item.id] = { x: minX };
        });
        break;

      case 'center-h':
        const avgCenterX = items.reduce((sum, item) => sum + item.x + item.width / 2, 0) / items.length;
        items.forEach(item => {
          updates[item.id] = { x: avgCenterX - item.width / 2 };
        });
        break;

      case 'right':
        const maxRight = Math.max(...items.map(item => item.x + item.width));
        items.forEach(item => {
          updates[item.id] = { x: maxRight - item.width };
        });
        break;

      case 'top':
        const minY = Math.min(...items.map(item => item.y));
        items.forEach(item => {
          updates[item.id] = { y: minY };
        });
        break;

      case 'center-v':
        const avgCenterY = items.reduce((sum, item) => sum + item.y + item.height / 2, 0) / items.length;
        items.forEach(item => {
          updates[item.id] = { y: avgCenterY - item.height / 2 };
        });
        break;

      case 'bottom':
        const maxBottom = Math.max(...items.map(item => item.y + item.height));
        items.forEach(item => {
          updates[item.id] = { y: maxBottom - item.height };
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
          updates[item.id] = { x: currentX };
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
          updates[item.id] = { y: currentY };
          currentY += item.height + spacingY;
        });
        break;
    }

    // Apply updates to appropriate state
    const mediaUpdates = {};
    const artboardUpdates = {};
    const vectorUpdates = {};
    
    Object.entries(updates).forEach(([id, update]) => {
      const item = items.find(i => i.id === id);
      if (!item) {
        return;
      }
      if (item.type === 'media') {
        mediaUpdates[id] = update;
      } else if (item.type === 'artboard') {
        artboardUpdates[id] = update;
      } else if (item.type === 'vector') {
        vectorUpdates[id] = update;
      }
    });
    
    if (Object.keys(mediaUpdates).length > 0) {
      setFreeGridItems(prev => {
        const updated = { ...prev };
        Object.entries(mediaUpdates).forEach(([id, update]) => {
          if (updated[id]) {
            updated[id] = { ...updated[id], ...update };
          }
        });
        return updated;
      });
    }
    
    if (Object.keys(artboardUpdates).length > 0) {
      setArtboards(prev => {
        const updated = { ...prev };
        Object.entries(artboardUpdates).forEach(([id, update]) => {
          updated[id] = { ...updated[id], ...update };
        });
        return updated;
      });
    }
    
    // Apply vector updates
    if (Object.keys(vectorUpdates).length > 0) {
      Object.entries(vectorUpdates).forEach(([id, update]) => {
        // Update vector shapes
        setVectorShapes(prev => prev.map(shape => 
          shape.id === id ? { ...shape, ...update } : shape
        ));
        
        // Update vector paths
        setVectorPaths(prev => prev.map(path => 
          path.id === id ? { ...path, ...update } : path
        ));
        
        // Update vector text
        setVectorText(prev => prev.map(text => 
          text.id === id ? { ...text, ...update } : text
        ));
        
        // Update annotations - special handling for different shapes
        setAnnotations(prev => prev.map(annotation => {
          if (annotation.id === id) {
            const updated = { ...annotation, ...update };
            
            // If it's a polygon with points, we need to move all points
            if (annotation.type === 'polygon' && annotation.points && update.x !== undefined && update.y !== undefined) {
              const deltaX = (update.x || annotation.x || 0) - (annotation.x || 0);
              const deltaY = (update.y || annotation.y || 0) - (annotation.y || 0);
              
              updated.points = annotation.points.map(point => ({
                x: point.x + deltaX,
                y: point.y + deltaY
              }));
            }
            
            // If it's an ellipse, update center points
            if (annotation.type === 'ellipse' && (update.x !== undefined || update.y !== undefined)) {
              const deltaX = (update.x || annotation.x || 0) - (annotation.x || 0);
              const deltaY = (update.y || annotation.y || 0) - (annotation.y || 0);
              
              if (annotation.cx !== undefined) updated.cx = (annotation.cx || 0) + deltaX;
              if (annotation.cy !== undefined) updated.cy = (annotation.cy || 0) + deltaY;
            }
            
            // If it's a path (pencil or vector pen), transform the path coordinates
            if (annotation.type === 'path' && annotation.points && (update.x !== undefined || update.y !== undefined)) {
              const deltaX = (update.x || annotation.x || 0) - (annotation.x || 0);
              const deltaY = (update.y || annotation.y || 0) - (annotation.y || 0);
              
              if (annotation.points.length === 1 && typeof annotation.points[0] === 'string') {
                // Vector pen path - single string
                const pathString = annotation.points[0];
                const transformedPath = pathString.replace(/([ML])\s*([\d.-]+)\s+([\d.-]+)/g, (match, cmd, x, y) => {
                  const newX = parseFloat(x) + deltaX;
                  const newY = parseFloat(y) + deltaY;
                  return `${cmd} ${newX} ${newY}`;
                });
                
                // Also handle cubic bezier curves
                const finalPath = transformedPath.replace(/C\s*([\d.-]+)\s+([\d.-]+)\s*,\s*([\d.-]+)\s+([\d.-]+)\s*,\s*([\d.-]+)\s+([\d.-]+)/g, 
                  (match, x1, y1, x2, y2, x3, y3) => {
                    return `C ${parseFloat(x1) + deltaX} ${parseFloat(y1) + deltaY}, ${parseFloat(x2) + deltaX} ${parseFloat(y2) + deltaY}, ${parseFloat(x3) + deltaX} ${parseFloat(y3) + deltaY}`;
                  });
                
                updated.points = [finalPath];
              } else {
                // Pencil path - array of M and L commands
                updated.points = annotation.points.map(point => {
                  if (typeof point === 'string') {
                    return point.replace(/([ML])\s*([\d.-]+)\s+([\d.-]+)/g, (match, cmd, x, y) => {
                      const newX = parseFloat(x) + deltaX;
                      const newY = parseFloat(y) + deltaY;
                      return `${cmd} ${newX} ${newY}`;
                    });
                  }
                  return point;
                });
              }
            }
            
            return updated;
          }
          return annotation;
        }));
      });
    }
  }, [selectedItems, selectedArtboards, selectedVectorIds, freeGridItems, artboards, lockedItems, vectorShapes, vectorPaths, vectorText, annotations]);

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
      // The item.id is now the freeGridItem ID
      const originalItem = freeGridItems[item.id];
      
      if (originalItem) {
        updates[item.id] = {
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

  // Delete selected vectors
  const deleteSelectedVectors = useCallback(() => {
    if (selectedVectorIds.length === 0) return;

    if (window.confirm(`Delete ${selectedVectorIds.length} selected vectors?`)) {
      // Delete from all vector collections
      setAnnotations(prev => prev.filter(ann => !selectedVectorIds.includes(ann.id)));
      setVectorPaths(prev => prev.filter(path => !selectedVectorIds.includes(path.id)));
      setVectorShapes(prev => prev.filter(shape => !selectedVectorIds.includes(shape.id)));
      setVectorText(prev => prev.filter(text => !selectedVectorIds.includes(text.id)));
      
      setSelectedVectorIds([]);
    }
  }, [selectedVectorIds]);

  // Global mouse up handler to ensure dragging stops
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isDragging || isResizing || isRotating || isPanning) {
        handleMouseUp();
      }
    };
    
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [isDragging, isResizing, isRotating, isPanning, handleMouseUp]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Delete or Backspace key
      if ((e.key === 'Delete' || e.key === 'Backspace') && (selectedItems.length > 0 || selectedVectorIds.length > 0)) {
        e.preventDefault();
        
        // Delete selected media items
        if (selectedItems.length > 0) {
          deleteSelectedItems();
        }
        
        // Delete selected vectors
        if (selectedVectorIds.length > 0) {
          deleteSelectedVectors();
        }
      }

      // Ctrl/Cmd + A (Select all)
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault();
        // Select all media items
        setSelectedItems(Object.keys(freeGridItems).filter(id => !lockedItems.has(id)));
        
        // Select all vectors (annotations, shapes, paths, text)
        const allVectorIds = [
          ...annotations.map(a => a.id),
          ...vectorShapes.map(v => v.id),
          ...vectorPaths.map(v => v.id),
          ...vectorText.map(v => v.id)
        ].filter(id => id);
        
        setSelectedVectorIds(allVectorIds);
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

      // Undo/Redo shortcuts
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === 'z') {
        e.preventDefault();
        handleUndo();
      }
      if ((e.ctrlKey || e.metaKey) && (e.shiftKey && e.key === 'z' || e.key === 'y')) {
        e.preventDefault();
        handleRedo();
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

      // Tool shortcuts - skip if text tool is active or typing in input/textarea
      const isTypingInTextInput = e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.contentEditable === 'true';
      if (!e.ctrlKey && !e.metaKey && activeTool !== 'text' && !isTypingInTextInput) {
        switch (e.key.toLowerCase()) {
          case 'v':
            setActiveTool('select');
            break;
          case 'a':
            setActiveTool('direct-select');
            break;
          case 'b':
            setActiveTool('pencil');
            break;
          case 'p':
            setActiveTool('vector-pen');
            break;
          case 'r':
            setActiveTool('rectangle');
            break;
          case 'e':
            if (activeTool === 'eraser') {
              setEraserMode((prev) => (prev + 1) % 3);
            } else {
              setActiveTool('eraser');
              setEraserMode(1);
            }
            break;
          case 'o':
            setActiveTool('ellipse');
            break;
          case 'g':
            setActiveTool('polygon');
            break;
          case 't':
            setActiveTool('text');
            // Don't show text creator dialog - just activate the text tool
            break;
          case 'i':
            setShowVisualEyedropper(true);
            break;
          case 'k':
            setActiveTool('paint-bucket');
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedItems, selectedVectorIds, freeGridItems, deleteSelectedItems, deleteSelectedVectors, lockedItems, activeTool, handleExportBookData]);

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

  // Create a grid of artboards
  const createArtboardGrid = useCallback((rows = 2, cols = 2, width = 800, height = 600) => {
    const pageWidth = width;
    const pageHeight = height;
    const spacing = 0; // No spacing for fractional export
    
    // Generate a unique group ID for this grid
    const groupId = `grid-${Date.now()}`;
    
    // Starting position
    const startX = 100;
    const startY = 100;
    
    // Create artboards in a grid
    const gridArtboards = [];
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const x = startX + col * (pageWidth + spacing);
        const y = startY + row * (pageHeight + spacing);
        const id = `artboard-${Date.now()}-${row}-${col}`;
        
        const newArtboard = {
          id,
          x,
          y,
          width: pageWidth,
          height: pageHeight,
          name: `Artboard ${row + 1}-${col + 1}`,
          backgroundColor: '#FFFFFF',
          isLocked: false,
          groupId,
          gridPosition: { row, col },
          gridSize: { rows, cols }
        };
        
        gridArtboards.push(newArtboard);
      }
    }
    
    // Add all artboards to state
    setArtboards(prev => {
      const newArtboards = { ...prev };
      gridArtboards.forEach(artboard => {
        newArtboards[artboard.id] = artboard;
      });
      return newArtboards;
    });
    
    // Show success notification
    const notification = document.createElement('div');
    notification.className = 'fixed top-4 right-4 bg-green-600 text-white px-4 py-2 rounded shadow-lg z-50';
    notification.textContent = `Created ${rows}×${cols} artboard grid`;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
  }, []);

  // Since each item is now its own layer, we don't need moveItemsToLayer anymore
  // The layer order is managed directly in the LayerPanelV2 by dragging
  
  // Helper function to render an annotation
  const renderAnnotation = useCallback((annotation, layer, isLayerLocked) => {
    const isSelected = selectedVectorIds?.includes(annotation.id);
    
    if (annotation.type === 'path') {
      // Check if it's a pencil path (multiple M/L commands) vs vector pen path (has bezier curves)
      const isPencilPath = annotation.points && annotation.points.length > 1 || 
        (annotation.points && annotation.points.length === 1 && !annotation.points[0].includes('C'));
      
      return (
        <g style={{ pointerEvents: 'auto' }}>
          <path
            d={annotation.points.join(' ')}
            stroke={annotation.color || annotation.stroke}
            strokeWidth={annotation.width || annotation.strokeWidth}
            fill={isPencilPath ? 'none' : (annotation.fill || 'none')}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
            style={{ 
              cursor: isLayerLocked ? 'not-allowed' : (activeTool === 'select' ? 'pointer' : 'default'),
              pointerEvents: activeTool === 'select' ? 'auto' : 'none'
            }}
            onClick={(e) => {
              if (activeTool === 'select' && !isLayerLocked) {
                e.stopPropagation();
                if (e.ctrlKey || e.metaKey) {
                  setSelectedVectorIds(prev => {
                    const isSelected = prev.includes(annotation.id);
                    return isSelected ? prev.filter(id => id !== annotation.id) : [...prev, annotation.id];
                  });
                } else {
                  setSelectedVectorIds([annotation.id]);
                  setSelectedItems([]);
                }
              }
            }}
          />
          {isSelected && (
            <path
              d={annotation.points.join(' ')}
              stroke="#3B82F6"
              strokeWidth={(annotation.width || annotation.strokeWidth) + 4}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="5,5"
              opacity="0.5"
              vectorEffect="non-scaling-stroke"
              pointerEvents="none"
            />
          )}
        </g>
      );
    } else if (annotation.type === 'text') {
      return (
        <g style={{ 
          pointerEvents: isLayerLocked ? 'none' : 'auto'
        }}>
          <rect
            x={annotation.x}
            y={annotation.y}
            width={annotation.width}
            height={annotation.height}
            fill="transparent"
            stroke="none"
            style={{ 
              cursor: isLayerLocked ? 'not-allowed' : (activeTool === 'select' ? 'pointer' : 'default'),
              pointerEvents: activeTool === 'select' ? 'auto' : 'none'
            }}
            onClick={(e) => {
              if (activeTool === 'select' && !isLayerLocked) {
                e.stopPropagation();
                if (e.ctrlKey || e.metaKey) {
                  setSelectedVectorIds(prev => {
                    const isSelected = prev.includes(annotation.id);
                    return isSelected ? prev.filter(id => id !== annotation.id) : [...prev, annotation.id];
                  });
                } else {
                  setSelectedVectorIds([annotation.id]);
                  setSelectedItems([]);
                }
              }
            }}
            onDoubleClick={(e) => {
              if (activeTool === 'select' && !isLayerLocked) {
                e.stopPropagation();
                e.preventDefault();
                setActiveTool('textarea');
                setEditingTextId(annotation.id);
              }
            }}
          />
          {isSelected && (
            <rect
              x={annotation.x}
              y={annotation.y}
              width={annotation.width}
              height={annotation.height}
              stroke="#3B82F6"
              strokeWidth="2"
              fill="none"
              strokeDasharray="5,5"
              pointerEvents="none"
            />
          )}
          <foreignObject
            x={annotation.x}
            y={annotation.y}
            width={annotation.width}
            height={annotation.height}
            style={{ cursor: 'move', pointerEvents: 'none' }}
          >
            <div
              style={{
                width: '100%',
                height: '100%',
                padding: '8px',
                fontSize: `${annotation.style?.fontSize || 16}px`,
                fontFamily: annotation.style?.fontFamily || 'Arial',
                color: annotation.style?.color || '#000000',
                textAlign: annotation.style?.textAlign || 'left',
                fontWeight: annotation.style?.fontWeight || 'normal',
                fontStyle: annotation.style?.fontStyle || 'normal',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                overflow: 'hidden',
                pointerEvents: 'none'
              }}
            >
              {annotation.content}
            </div>
          </foreignObject>
        </g>
      );
    } else if (annotation.type === 'rectangle') {
      return (
        <g style={{ pointerEvents: 'auto' }}>
          <rect
            x={annotation.x}
            y={annotation.y}
            width={annotation.width}
            height={annotation.height}
            stroke={annotation.stroke}
            strokeWidth={annotation.strokeWidth}
            fill={annotation.fill || 'none'}
            style={{ 
              cursor: isLayerLocked ? 'not-allowed' : (activeTool === 'select' ? 'pointer' : 'default'),
              pointerEvents: activeTool === 'select' ? 'auto' : 'none'
            }}
            onClick={(e) => {
              if (activeTool === 'select' && !isLayerLocked) {
                e.stopPropagation();
                if (e.ctrlKey || e.metaKey) {
                  setSelectedVectorIds(prev => prev.includes(annotation.id) ? 
                    prev.filter(id => id !== annotation.id) : [...prev, annotation.id]
                  );
                } else {
                  setSelectedVectorIds([annotation.id]);
                  setSelectedItems([]);
                }
              }
            }}
          />
          {isSelected && (
            <rect
              x={annotation.x - 2}
              y={annotation.y - 2}
              width={annotation.width + 4}
              height={annotation.height + 4}
              stroke="#3B82F6"
              strokeWidth="2"
              fill="none"
              strokeDasharray="5,5"
              pointerEvents="none"
            />
          )}
        </g>
      );
    } else if (annotation.type === 'ellipse') {
      return (
        <g style={{ pointerEvents: 'auto' }}>
          <ellipse
            cx={annotation.cx || annotation.x + annotation.width / 2}
            cy={annotation.cy || annotation.y + annotation.height / 2}
            rx={annotation.rx || annotation.width / 2}
            ry={annotation.ry || annotation.height / 2}
            stroke={annotation.stroke}
            strokeWidth={annotation.strokeWidth}
            fill={annotation.fill || 'none'}
            style={{ 
              cursor: isLayerLocked ? 'not-allowed' : (activeTool === 'select' ? 'pointer' : 'default'),
              pointerEvents: activeTool === 'select' ? 'auto' : 'none'
            }}
            onClick={(e) => {
              if (activeTool === 'select' && !isLayerLocked) {
                e.stopPropagation();
                setSelectedVectorIds(prev => prev.includes(annotation.id) ? 
                  prev.filter(id => id !== annotation.id) : [...prev, annotation.id]
                );
              }
            }}
          />
          {isSelected && (
            <ellipse
              cx={annotation.cx || annotation.x + annotation.width / 2}
              cy={annotation.cy || annotation.y + annotation.height / 2}
              rx={(annotation.rx || annotation.width / 2) + 2}
              ry={(annotation.ry || annotation.height / 2) + 2}
              stroke="#3B82F6"
              strokeWidth="2"
              fill="none"
              strokeDasharray="5,5"
              pointerEvents="none"
            />
          )}
        </g>
      );
    } else if (annotation.type === 'vector') {
      // Handle vector pen paths
      return (
        <g style={{ pointerEvents: 'auto' }}>
          <path
            d={annotation.path}
            stroke={annotation.stroke}
            strokeWidth={annotation.strokeWidth}
            fill={annotation.fill || 'none'}
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ 
              cursor: isLayerLocked ? 'not-allowed' : (activeTool === 'select' ? 'pointer' : 'default'),
              pointerEvents: activeTool === 'select' ? 'auto' : 'none'
            }}
            onClick={(e) => {
              if (activeTool === 'select' && !isLayerLocked) {
                e.stopPropagation();
                setSelectedVectorIds(prev => prev.includes(annotation.id) ? 
                  prev.filter(id => id !== annotation.id) : [...prev, annotation.id]
                );
              }
            }}
          />
          {isSelected && (
            <path
              d={annotation.path}
              stroke="#3B82F6"
              strokeWidth={annotation.strokeWidth + 4}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="5,5"
              opacity="0.5"
            />
          )}
        </g>
      );
    }
    return null;
  }, [activeTool, selectedVectorIds, setSelectedVectorIds, setSelectedItems, setActiveTool, setEditingTextId]);

  // Handle text area creation
  const handleTextAreaCreate = useCallback((textData) => {
    // Add text as an annotation with layer assignment
    setAnnotations(prev => [...prev, {
      id: textData.id,
      type: 'text',
      x: textData.x,
      y: textData.y,
      width: textData.width,
      height: textData.height,
      content: textData.content,
      style: textData.style,
      layerId: activeLayerId === 'text' ? 'text' : activeLayerId // Prefer text layer for text
    }]);
    
    // Switch back to select tool after creating text
    setActiveTool('select');
  }, [activeLayerId]);

  // Artboard grid handlers
  const toggleGridLock = useCallback((groupId) => {
    // Toggle the group lock state
    setArtboardGroupLocks(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
    
    // Show notification
    const isNowLocked = !artboardGroupLocks[groupId];
    const notification = document.createElement('div');
    notification.className = 'fixed top-4 right-4 bg-blue-600 text-white px-4 py-2 rounded shadow-lg z-50';
    notification.textContent = `Grid ${isNowLocked ? 'locked' : 'unlocked'} - artboards will move ${isNowLocked ? 'together' : 'individually'}`;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
  }, [artboardGroupLocks]);

  const exportAllArtboards = useCallback(async (groupId) => {
    const gridArtboards = Object.values(artboards).filter(a => a.groupId === groupId);
    
    for (const artboard of gridArtboards) {
      await exportArtboard(artboard.id, 'png');
    }
    
    // Show notification
    const notification = document.createElement('div');
    notification.className = 'fixed top-4 right-4 bg-green-600 text-white px-4 py-2 rounded shadow-lg z-50';
    notification.textContent = `Exported ${gridArtboards.length} artboards`;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
  }, [artboards, exportArtboard]);

  const addAllArtboardsToMedia = useCallback(async (groupId) => {
    const gridArtboards = Object.values(artboards).filter(a => a.groupId === groupId);
    
    for (const artboard of gridArtboards) {
      await addArtboardToMediaPanel(artboard.id);
    }
    
    // Show notification
    const notification = document.createElement('div');
    notification.className = 'fixed top-4 right-4 bg-green-600 text-white px-4 py-2 rounded shadow-lg z-50';
    notification.textContent = `Added ${gridArtboards.length} artboards to media panel`;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
  }, [artboards, addArtboardToMediaPanel]);

  const deleteArtboardGrid = useCallback((groupId) => {
    if (window.confirm('Delete entire artboard grid?')) {
      setArtboards(prev => {
        const updated = { ...prev };
        Object.keys(updated).forEach(id => {
          if (updated[id].groupId === groupId) {
            delete updated[id];
          }
        });
        return updated;
      });
      setSelectedArtboards([]);
    }
  }, []);



  return (
    <div className="flex-1 overflow-hidden bg-gray-50 dark:bg-gray-800 relative h-full">
      {/* Add custom CSS for eraser cursor */}
      <style dangerouslySetInnerHTML={{
        __html: `
          .eraser-cursor {
            cursor: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2"><rect x="5" y="11" width="14" height="8" rx="1" transform="rotate(-45 12 12)"/><path d="M20.5 21h-11"/></svg>') 12 12, auto;
          }
        `
      }} />
      {/* Toolbar */}
      <div
        className="top-0 relative left-0 right-0 z-50 bg-white dark:bg-gray-900 border-b border-gray-300 dark:border-gray-600 p-2"
        style={{
          transition: 'margin-right 0.3s ease'
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 overflow-x-auto flex-shrink-0">
            {/* Artboard Tools */}
            <div className="flex items-center space-x-1 border-r pr-2 mr-2">
              <button
                onClick={() => {
                  const canvasPos = getCanvasPosition(
                    window.innerWidth / 2,
                    window.innerHeight / 2
                  );
                  createArtboard(canvasPos.x, canvasPos.y);
                }}
                className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                title="Create Artboard"
              >
                <VectorSquareIcon size={18} />
              </button>
              <button
                onClick={() => setShowArtboardGridDialog(true)}
                className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                title="Create Artboard Grid"
              >
                <LayoutGrid size={18} />
              </button>
            </div>

            {/* Color picker - always visible */}
            <div className="flex items-center space-x-2 border-r pr-2 mr-2">
              <EnhancedColorPicker 
                currentColor={strokeColor} 
                onColorChange={setStrokeColor}
                currentFillColor={fillColor}
                onFillColorChange={setFillColor}
                isEyedropperActive={activeTool === 'eyedropper'}
                onEyedropperToggle={(active) => {
                  if (active) {
                    setShowVisualEyedropper(true);
                  } else {
                    setActiveTool('select');
                  }
                }}
                darkMode={darkMode}
              />
              {/* Show stroke width for drawing tools */}
              {['pencil', 'vector-pen', 'pen', 'rectangle', 'ellipse', 'polygon'].includes(activeTool) && (
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-gray-600 dark:text-gray-400">Stroke:</span>
                  <input
                    type="range"
                    min="0.5"
                    max="5"
                    step="0.5"
                    value={strokeWidth}
                    onChange={(e) => setStrokeWidth(parseFloat(e.target.value))}
                    className="w-20"
                    title={`Stroke Width: ${strokeWidth}px`}
                  />
                  <span className="text-xs text-gray-600 dark:text-gray-400 w-8">{strokeWidth}px</span>
                </div>
              )}
            </div>

            {/* View controls */}
            <div className="flex items-center space-x-1 border-r pr-2 mr-2">
              <button
                onClick={() => setShowGrid(!showGrid)}
                className={`p-1.5 rounded ${showGrid ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300' : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
                title="Toggle Grid"
              >
                <Grid size={18} />
              </button>
              <button
                onClick={() => setSnapToGrid(!snapToGrid)}
                className={`p-1.5 rounded ${snapToGrid ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300' : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
                title="Snap to Grid"
              >
                <Magnet size={18} />
              </button>
              <button
                onClick={() => setSnapToItems(!snapToItems)}
                className={`p-1.5 rounded ${snapToItems ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300' : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
                title="Snap to Items"
              >
                <Target size={18} />
              </button>
              <button
                onClick={() => setShowRulers(!showRulers)}
                className={`p-1.5 rounded ${showRulers ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300' : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
                title="Toggle Rulers"
              >
                <Ruler size={18} />
              </button>
              <button
                onClick={() => setShowAutoArrange(!showAutoArrange)}
                className={`p-1.5 rounded ${showAutoArrange ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300' : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
                title="Auto Arrange"
              >
                <ScanBarcodeIcon size={18} />
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
              className={`p-1.5 rounded ${enableGridSelection ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300' : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
              title={enableGridSelection ? "Grid selection enabled" : "Grid selection disabled"}
            >
              <CheckSquare size={18} />
            </button>
            
            <button
              onClick={() => setShowLayerPanel(!showLayerPanel)}
              className={`p-1.5 rounded ${showLayerPanel ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300' : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
              title="Toggle Layer Panel (L)"
            >
              <Layers size={18} />
            </button>
            
            <button
              onClick={() => setPreserveAspectRatio(!preserveAspectRatio)}
              className={`p-1.5 rounded ${preserveAspectRatio ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300' : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
              title={preserveAspectRatio ? "Aspect ratio locked" : "Aspect ratio unlocked"}
            >
              <Maximize2Icon size={18} />
            </button>

            <button
              onClick={() => setShowBoundingBoxes(!showBoundingBoxes)}
              className={`p-1.5 rounded ${showBoundingBoxes ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300' : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
              title={showBoundingBoxes ? "Bounding boxes ON" : "Bounding boxes OFF"}
            >
              <Square size={18} />
            </button>

            <button
              onClick={() => setShowDebugInfo(!showDebugInfo)}
              className={`p-1.5 rounded ${showDebugInfo ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300' : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
              title={showDebugInfo ? "Debug info ON" : "Debug info OFF"}
            >
              <Info size={18} />
            </button>

            {/* Book controls */}
            <div className="flex items-center space-x-1 border-r pr-2 mr-2">
              {showTextCreator && (
                <TextPageCreator
                  isOpen={showTextCreator}
                  onClose={() => setShowTextCreator(false)}
                  onCreatePages={handleTextPageCreate}
                  onExportPagesToMainGrid={onExportPagesToMainGrid}
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
            {(selectedItems.length + selectedArtboards.length + selectedVectorIds.length > 1) && (
              <AlignmentTools onAlign={alignItems} />
            )}

            {/* Docked vector toolbar */}
            {isToolbarDocked ? (
              <div className="flex items-center space-x-1 border-r pr-2 mr-2 bg-blue-50 dark:bg-blue-900/20 rounded px-2">
                <button
                  onClick={() => setIsToolbarDocked(false)}
                  className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 cursor-move"
                  title="Drag to undock toolbar"
                >
                  <GripVertical size={18} />
                </button>
                {/* Vector tools */}
                {[
                  { id: 'select', icon: MousePointer, shortcut: 'V' },
                  { id: 'direct-select', icon: MousePointer2, shortcut: 'A' },
                  { id: 'pencil', icon: Pencil, shortcut: 'B' },
                  { id: 'vector-pen', icon: Edit3, shortcut: 'P' },
                  { id: 'rectangle', icon: Square, shortcut: 'R' },
                  { id: 'ellipse', icon: Circle, shortcut: 'O' },
                  { id: 'polygon', icon: Hexagon, shortcut: 'G' },
                  { id: 'text', icon: Type, shortcut: 'T' },
                  { id: 'eraser', icon: Eraser, shortcut: 'E' },
                  { id: 'eyedropper', icon: Pipette, shortcut: 'I' },
                  { id: 'paint-bucket', icon: PaintBucket, shortcut: 'K' },
                ].map(tool => (
                  <button
                    key={tool.id}
                    onClick={() => {
                      if (tool.id === 'eyedropper') {
                        setShowVisualEyedropper(true);
                      } else {
                        setActiveTool(tool.id);
                      }
                    }}
                    className={`p-1.5 rounded ${
                      activeTool === tool.id || (tool.id === 'eyedropper' && showVisualEyedropper)
                        ? 'bg-blue-500 text-white' 
                        : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }`}
                    title={`${tool.id.replace('-', ' ')} (${tool.shortcut})`}
                  >
                    <tool.icon size={18} />
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex items-center space-x-1 border-r pr-2 mr-2">
                <button
                  onClick={() => setIsToolbarDocked(false)}
                  className="px-3 py-1 text-xs text-gray-500 dark:text-gray-400 italic hover:text-gray-700 dark:hover:text-gray-200"
                >
                  Click to show vector toolbar
                </button>
              </div>
            )}

            {/* Docked layer panel */}
            {isLayerPanelDocked ? (
              <div className="flex items-center space-x-1 border-r pr-2 mr-2 bg-green-50 dark:bg-green-900/20 rounded px-2">
                <button
                  onClick={handleUndockLayerPanel}
                  className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 cursor-move"
                  title="Drag to undock layer panel"
                >
                  <GripVertical size={18} />
                </button>
                <button
                  onClick={() => setShowLayerPanel(true)}
                  className={`p-1.5 rounded ${
                    showLayerPanel ? 'bg-blue-500 text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                  title="Toggle layer panel dropdown"
                >
                  <Layers size={18} />
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-1 border-r pr-2 mr-2">
                <button
                  onClick={() => {
                    setIsLayerPanelDocked(false);
                    setShowLayerPanel(true);
                  }}
                  className="px-3 py-1 text-xs text-gray-500 dark:text-gray-400 italic hover:text-gray-700 dark:hover:text-gray-200"
                >
                  Click to show layer panel
                </button>
              </div>
            )}
            
            {/* Layer controls */}
            {selectedItems.length > 0 && (
              <div className="flex items-center space-x-1 border-r pr-2 mr-2">
                <button
                  onClick={bringToFront}
                  className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                  title="Bring to Front"
                >
                  <Layers size={18} />
                </button>
                <button
                  onClick={sendToBack}
                  className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
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
                  className="p-1.5 rounded bg-purple-600 text-white hover:bg-purple-700 dark:bg-purple-700 dark:hover:bg-purple-800"
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
            <span className="text-xs text-gray-500 dark:text-gray-400 mr-2" title="Space+Scroll to zoom, Space+drag to pan">
              Space+Scroll/Drag
            </span>
            <button
              onClick={() => setZoomLevel(prev => Math.max(0.1, prev * 0.9))}
              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
              title="Zoom out"
            >
              <ZoomOut size={16} />
            </button>
            <span className="text-sm font-medium w-12 text-center text-gray-700 dark:text-gray-300">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              onClick={() => setZoomLevel(prev => Math.min(5, prev * 1.1))}
              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
              title="Zoom in"
            >
              <ZoomIn size={16} />
            </button>
            <button
              onClick={() => {
                setZoomLevel(1);
                setPanOffset({ x: 0, y: 0 });
              }}
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
        className={`absolute inset-0 overflow-hidden ${activeTool === 'eraser' ? 'eraser-cursor' : ''}`}
        style={{
          top: showRulers ? '56px' : '56px',
          left: showRulers ? '32px' : '0',
          transition: 'right 0.3s ease',
          cursor: activeTool === 'eraser' ? undefined :
            isPanning ? 'grabbing' :
            isSpacePressed ? 'move' :
            activeTool === 'pencil' || activeTool === 'pen' ? 'crosshair' :
              activeTool === 'vector-pen' ? 'crosshair' :
                activeTool === 'text' ? 'text' :
                  activeTool === 'eyedropper' ? 'crosshair' :
                    activeTool === 'paint-bucket' ? 'copy' :
                      isDragging ? 'grabbing' : 'default'
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        onContextMenu={(e) => e.preventDefault()}
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
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(0,0,0,0.03) 10px, rgba(0,0,0,0.03) 20px)'
            }}
          />

          {/* Active working area */}
          <div
            className="absolute pointer-events-none"
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

          {/* Render all items (media and annotations) in proper layer order */}
          {(() => {
            // Combine all items with their layer info
            const allItems = [];
            
            // Add media items
            Object.entries(freeGridItems).forEach(([id, item]) => {
              if (!typeFilters.media.visible) return;
              const layer = layers.find(l => l.itemId === id && l.itemType === 'media');
              // Allow items to be visible if no layer exists yet or if layer is visible
              if (layer && !layer.visible) return;
              
              const media = getMediaById(item.mediaId);
              if (media) {
                allItems.push({
                  type: 'media',
                  id,
                  item,
                  media,
                  layer,
                  layerIndex: layer ? layerOrder.indexOf(layer.id) : 999999
                });
              }
            });
            
            // Add annotations
            annotations.forEach(annotation => {
              const itemType = annotation.type === 'text' ? 'text' : 'vectors';
              if (!typeFilters[itemType].visible) return;
              
              const layer = layers.find(l => l.itemId === annotation.id && l.itemType === itemType);
              // Allow items to be visible if no layer exists yet or if layer is visible
              if (layer && !layer.visible) return;
              
              allItems.push({
                type: 'annotation',
                annotation,
                layer,
                layerIndex: layer ? layerOrder.indexOf(layer.id) : 999999
              });
            });
            
            // Sort by layer order and render
            return allItems
              .sort((a, b) => a.layerIndex - b.layerIndex)
              .map((item, index) => {
                if (item.type === 'media') {
                  const { id, item: gridItem, media, layer } = item;
                  const isLayerLocked = layer?.locked || typeFilters.media.locked;
                  const isSelected = selectedItems.includes(id);
                  const isLocked = lockedItems.has(id) || isLayerLocked;
                  const isBeingDragged = isDragging && draggedItems.includes(id);
                  
                  return (
                    <div
                      key={`media-${id}`}
                      style={{
                        position: 'absolute',
                        left: `${gridItem.x}px`,
                        top: `${gridItem.y}px`,
                        width: `${gridItem.width}px`,
                        height: `${gridItem.height}px`,
                        transform: `rotate(${gridItem.rotation || 0}deg)`,
                        zIndex: index + 100,
                        cursor: isLocked ? 'not-allowed' : 'move',
                        opacity: isBeingDragged ? 0.5 : 1,
                        transition: isBeingDragged ? 'none' : 'opacity 0.2s',
                        pointerEvents: isLocked ? 'none' : 'auto'
                      }}
                      onMouseEnter={() => !isLocked && setHoveredItem(id)}
                      onMouseLeave={() => !isLocked && setHoveredItem(null)}
                    >
                      <div className="relative w-full h-full">
                        <MediaPreview
                          media={media}
                          className="w-full h-full rounded"
                          hoverPlay={true}
                          style={{ objectFit: showBoundingBoxes ? (preserveAspectRatio ? 'contain' : 'fill') : 'fill' }}
                          noBackground={!showBoundingBoxes}
                        />
                        {media.metadata?.isTextPage && (
                          <div className="absolute top-2 left-2 bg-blue-600 text-white px-2 py-1 text-xs rounded">
                            Text Page
                          </div>
                        )}
                        {isSelected && (
                          <>
                            <div className="absolute inset-0 border-2 border-blue-500 pointer-events-none rounded" />
                            {/* Debug info overlay */}
                            {showDebugInfo && (
                              <div className="absolute -top-24 left-0 bg-black/80 text-white text-xs p-2 rounded z-[9999] pointer-events-none whitespace-nowrap">
                                <div>Media: {media.metadata?.width || 'N/A'} × {media.metadata?.height || 'N/A'}</div>
                                <div>Box: {Math.round(gridItem.width)} × {Math.round(gridItem.height)}</div>
                                <div>Scale: {media.metadata?.width ? `${Math.round((gridItem.width / media.metadata.width) * 100)}%` : 'N/A'}</div>
                                <div>ID: {media.id.substring(0, 8)}...</div>
                              </div>
                            )}
                          </>
                        )}
                        {hoveredItem === id && !isSelected && (
                          <div className="absolute inset-0 border-2 border-blue-300 pointer-events-none rounded" />
                        )}
                        {/* Resize handles */}
                        {isSelected && !isLocked && (
                          (() => {
                            // Calculate scaled handle size based on media item size
                            const minHandleSize = 6; // Minimum handle size in pixels
                            const maxHandleSize = 16; // Maximum handle size in pixels
                            
                            // More aggressive scaling for small items
                            const smallerDimension = Math.min(gridItem.width, gridItem.height);
                            let handleSize;
                            
                            if (smallerDimension < 100) {
                              // For very small items, use minimum size
                              handleSize = minHandleSize;
                            } else if (smallerDimension < 200) {
                              // For small items, scale gradually
                              handleSize = minHandleSize + ((smallerDimension - 100) / 100) * 4;
                            } else {
                              // For larger items, scale normally
                              const scaleFactor = (smallerDimension - 200) / 300;
                              handleSize = 10 + scaleFactor * 6;
                            }
                            
                            handleSize = Math.max(minHandleSize, Math.min(maxHandleSize, handleSize));
                            const rotateHandleSize = handleSize + 2; // Slightly larger rotation handle
                            const rotateIconSize = Math.max(10, Math.min(18, rotateHandleSize * 0.8));
                            
                            return (
                              <>
                                {/* Corner handles */}
                                <div
                                  className="absolute bg-white border border-blue-500 cursor-nw-resize"
                                  style={{
                                    top: `-${handleSize/2}px`,
                                    left: `-${handleSize/2}px`,
                                    width: `${handleSize}px`,
                                    height: `${handleSize}px`
                                  }}
                                  onMouseDown={(e) => handleResizeHandles(e, id, 'tl')}
                                />
                                <div
                                  className="absolute bg-white border border-blue-500 cursor-ne-resize"
                                  style={{
                                    top: `-${handleSize/2}px`,
                                    right: `-${handleSize/2}px`,
                                    width: `${handleSize}px`,
                                    height: `${handleSize}px`
                                  }}
                                  onMouseDown={(e) => handleResizeHandles(e, id, 'tr')}
                                />
                                <div
                                  className="absolute bg-white border border-blue-500 cursor-sw-resize"
                                  style={{
                                    bottom: `-${handleSize/2}px`,
                                    left: `-${handleSize/2}px`,
                                    width: `${handleSize}px`,
                                    height: `${handleSize}px`
                                  }}
                                  onMouseDown={(e) => handleResizeHandles(e, id, 'bl')}
                                />
                                <div
                                  className="absolute bg-white border border-blue-500 cursor-se-resize"
                                  style={{
                                    bottom: `-${handleSize/2}px`,
                                    right: `-${handleSize/2}px`,
                                    width: `${handleSize}px`,
                                    height: `${handleSize}px`
                                  }}
                                  onMouseDown={(e) => handleResizeHandles(e, id, 'br')}
                                />
                                {/* Edge handles */}
                                <div
                                  className="absolute left-1/2 -translate-x-1/2 bg-white border border-blue-500 cursor-n-resize"
                                  style={{
                                    top: `-${handleSize/2}px`,
                                    width: `${handleSize}px`,
                                    height: `${handleSize}px`
                                  }}
                                  onMouseDown={(e) => handleResizeHandles(e, id, 't')}
                                />
                                <div
                                  className="absolute left-1/2 -translate-x-1/2 bg-white border border-blue-500 cursor-s-resize"
                                  style={{
                                    bottom: `-${handleSize/2}px`,
                                    width: `${handleSize}px`,
                                    height: `${handleSize}px`
                                  }}
                                  onMouseDown={(e) => handleResizeHandles(e, id, 'b')}
                                />
                                <div
                                  className="absolute top-1/2 -translate-y-1/2 bg-white border border-blue-500 cursor-w-resize"
                                  style={{
                                    left: `-${handleSize/2}px`,
                                    width: `${handleSize}px`,
                                    height: `${handleSize}px`
                                  }}
                                  onMouseDown={(e) => handleResizeHandles(e, id, 'l')}
                                />
                                <div
                                  className="absolute top-1/2 -translate-y-1/2 bg-white border border-blue-500 cursor-e-resize"
                                  style={{
                                    right: `-${handleSize/2}px`,
                                    width: `${handleSize}px`,
                                    height: `${handleSize}px`
                                  }}
                                  onMouseDown={(e) => handleResizeHandles(e, id, 'r')}
                                />
                                {/* Rotation handle */}
                                <div
                                  className="absolute left-1/2 -translate-x-1/2 bg-blue-500 rounded-full cursor-pointer"
                                  style={{
                                    top: `-${rotateHandleSize + 16}px`,
                                    width: `${rotateHandleSize}px`,
                                    height: `${rotateHandleSize}px`
                                  }}
                                  onMouseDown={(e) => startRotation(e, id)}
                                  title="Rotate"
                                >
                                  <div className="absolute inset-0 flex items-center justify-center">
                                    <RotateCw size={rotateIconSize} className="text-white" />
                                  </div>
                                </div>
                              </>
                            );
                          })()
                        )}
                      </div>
                    </div>
                  );
                } else {
                  // Render annotation in its own SVG
                  const { annotation, layer } = item;
                  const itemType = annotation.type === 'text' ? 'text' : 'vectors';
                  const isLayerLocked = layer?.locked || typeFilters[itemType].locked;
                  
                  return (
                    <svg
                      key={`annotation-${annotation.id}`}
                      className="absolute inset-0"
                      style={{ 
                        width: `${canvasSize.width}px`, 
                        height: `${canvasSize.height}px`, 
                        pointerEvents: 'none',
                        zIndex: index + 100
                      }}
                    >
                      {renderAnnotation(annotation, layer, isLayerLocked)}
                    </svg>
                  );
                }
              });
          })()}

          {/* Current drawing/annotation being created */}
          {currentAnnotation && isDrawing && (
            <svg
              className="absolute inset-0"
              style={{ 
                width: `${canvasSize.width}px`, 
                height: `${canvasSize.height}px`, 
                pointerEvents: 'none',
                zIndex: 9999 // Always on top while drawing
              }}
            >
              <path
                d={currentAnnotation.points.join(' ')}
                stroke={currentAnnotation.color || strokeColor}
                strokeWidth={currentAnnotation.width || strokeWidth}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
          )}

          {/* Artboards */}
          {typeFilters.artboards?.visible && Object.entries(artboards).map(([id, artboard]) => (
            <Artboard
              key={id}
              {...artboard}
              isSelected={selectedArtboards.includes(id)}
              zoomLevel={zoomLevel}
              onSelect={handleArtboardSelect}
              onUpdate={updateArtboard}
              onDelete={deleteArtboard}
              onExport={exportArtboard}
              onAddToMediaPanel={addArtboardToMediaPanel}
              onDragStart={handleArtboardDragStart}
              onResizeStart={handleArtboardResizeStart}
              darkMode={darkMode}
              activeTool={activeTool}
              priorityMode={typeFilters.artboards?.priority}
              isLocked={typeFilters.artboards?.locked}
            />
          ))}
          
          {/* Artboard Grid Controls - Show for selected grouped artboards */}
          {selectedArtboards.length === 1 && artboards[selectedArtboards[0]]?.groupId && (
            <ArtboardGridControls
              groupId={artboards[selectedArtboards[0]].groupId}
              artboards={Object.values(artboards)}
              isGroupLocked={artboardGroupLocks[artboards[selectedArtboards[0]].groupId] || false}
              onLockToggle={toggleGridLock}
              onExportAll={exportAllArtboards}
              onAddAllToMedia={addAllArtboardsToMedia}
              onDeleteAll={deleteArtboardGrid}
              darkMode={darkMode}
            />
          )}

          {/* Marquee selection */}
          {isMarqueeSelecting && (
            <MarqueeSelection
              start={marqueeStart}
              end={marqueeEnd}
            />
          )}

          {/* Text Area Tool overlay */}
          {activeTool === 'text' && (
            <TextAreaTool
              isActive={true}
              canvasRef={canvasRef}
              onTextCreate={handleTextAreaCreate}
              zoomLevel={zoomLevel}
              panOffset={panOffset}
              darkMode={darkMode}
              editingTextId={editingTextId}
              annotations={annotations}
              onTextUpdate={(id, updates) => {
                setAnnotations(prev => prev.map(ann => 
                  ann.id === id ? { ...ann, ...updates } : ann
                ));
                setEditingTextId(null);
                setActiveTool('select');
              }}
              onCancelEdit={() => {
                setEditingTextId(null);
                setActiveTool('select');
              }}
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
              fillColor={fillColor}
              zoomLevel={zoomLevel}
              panOffset={panOffset}
              darkMode={darkMode}
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
              darkMode={darkMode}
            />
          )}
        </div>
      </div>

      {/* Selected items info */}
      {(selectedItems.length > 0 || selectedVectorIds.length > 0) && (
        <div
          className="absolute bottom-4 left-4 bg-white dark:bg-gray-800 rounded shadow-lg p-2 text-sm"
          style={{
            marginRight: is3DViewportOpen ? `${threeDViewportWidth + 20}px` : '0',
            transition: 'margin-right 0.3s ease'
          }}
        >
          <div className="flex items-center space-x-2">
            {selectedItems.length > 0 && (
              <span>{selectedItems.length} item{selectedItems.length !== 1 ? 's' : ''} selected</span>
            )}
            {selectedVectorIds.length > 0 && (
              <span>{selectedVectorIds.length} vector{selectedVectorIds.length !== 1 ? 's' : ''} selected</span>
            )}
            {selectedItems.length === 1 && (
              <button
                onClick={() => toggleItemLock(selectedItems[0])}
                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
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
              className="absolute -top-12 -right-12 p-2 bg-white dark:bg-gray-800 rounded-full shadow-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors z-10"
            >
              <X size={20} />
            </button>
            <AutoArrangePanel
              items={Object.entries(freeGridItems).map(([id, item]) => ({
                id: id, // Use the freeGridItem ID, not mediaId
                mediaId: item.mediaId, // Also pass mediaId for reference
                x: item.x,
                y: item.y,
                width: item.width,
                height: item.height,
                rotation: item.rotation || 0
              }))}
              onArrange={handleAutoArrange}
              darkMode={darkMode}
              onClose={() => setShowAutoArrange(false)}
            />
          </div>
        </div>
      )}

      {/* Text Page Creator */}
      <TextPageCreator
        isOpen={showTextCreator}
        onClose={() => setShowTextCreator(false)}
        onCreatePages={handleTextPageCreate}
        onAddToMediaPanel={onAddToMediaPanel}
        pageConfig={{
          width: 816,  // Letter size
          height: 1056,
          padding: 72
        }}
        darkMode={darkMode}
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

      {/* Artboard Grid Dialog */}
      <ArtboardGridDialog
        isOpen={showArtboardGridDialog}
        onClose={() => setShowArtboardGridDialog(false)}
        onConfirm={(rows, cols, width, height) => {
          createArtboardGrid(rows, cols, width, height);
          setShowArtboardGridDialog(false);
        }}
        darkMode={darkMode}
      />
      
      {/* Collapsible Vector Toolbar */}
      {!isToolbarDocked && (
        <CollapsibleVectorToolbar
          activeTool={activeTool}
          onToolChange={(tool) => {
            if (tool === 'eyedropper') {
              setShowVisualEyedropper(true);
            } else {
              setActiveTool(tool);
              // Reset any drawing states when changing tools
              setIsDrawing(false);
              setCurrentAnnotation(null);
            }
          }}
          darkMode={darkMode}
          containerBounds={{
            left: mediaPanelCollapsed ? 60 : 280, // Adjust based on media panel state
            top: 120, // Account for header + toolbar height + padding
            right: window.innerWidth - 20,
            bottom: window.innerHeight - 20
          }}
          onDockToToolbar={() => setIsToolbarDocked(true)}
          toolbarHeight={120} // Height threshold for docking
        />
      )}
      
      {/* Layer Panel */}
      {showLayerPanel && (
        <LayerPanelV2 
          darkMode={darkMode} 
          annotations={annotations}
          mediaFiles={allMediaFiles}
          artboards={artboards}
          selectedArtboards={selectedArtboards}
          onArtboardSelect={(artboardId, e) => handleArtboardSelect(artboardId, e)}
          onArtboardUpdate={updateArtboard}
          onDockToToolbar={handleDockLayerPanel}
          containerBounds={{
            left: mediaPanelCollapsed ? 60 : 280,
            top: 120,
            right: window.innerWidth - 20,
            bottom: window.innerHeight - 20
          }}
          onLayerSelect={(layer) => {
            // Clear all selections first
            setSelectedItems([]);
            setSelectedVectorIds([]);
            setSelectedArtboards([]);
            
            // Select the appropriate item based on layer type
            if (layer.itemType === 'media') {
              setSelectedItems([layer.itemId]);
            } else if (layer.itemType === 'text' || layer.itemType === 'vectors') {
              setSelectedVectorIds([layer.itemId]);
            }
          }}
          onLayerDoubleClick={(layer) => {
            if (layer.itemType === 'text') {
              // Find the text annotation and start editing
              const textAnnotation = annotations.find(a => a.id === layer.itemId);
              if (textAnnotation) {
                setActiveTool('textarea');
                setEditingTextId(layer.itemId);
              }
            }
          }}
          onDeleteItem={(layer) => {
            if (layer.itemType === 'media') {
              // Delete media item from freeGridItems
              setFreeGridItems(prev => {
                const newItems = { ...prev };
                delete newItems[layer.itemId];
                return newItems;
              });
              // Clear selection if deleted item was selected
              setSelectedItems(prev => prev.filter(id => id !== layer.itemId));
            } else if (layer.itemType === 'text' || layer.itemType === 'vectors') {
              // Delete annotation
              setAnnotations(prev => prev.filter(ann => ann.id !== layer.itemId));
              setVectorShapes(prev => prev.filter(shape => shape.id !== layer.itemId));
              setVectorPaths(prev => prev.filter(path => path.id !== layer.itemId));
              setVectorText(prev => prev.filter(text => text.id !== layer.itemId));
              // Clear selection if deleted item was selected
              setSelectedVectorIds(prev => prev.filter(id => id !== layer.itemId));
            }
          }}
        />
      )}
      
      {/* Visual Eyedropper */}
      <VisualEyedropper
        isActive={showVisualEyedropper}
        onColorPick={(color) => {
          setStrokeColor(color);
          setShowVisualEyedropper(false);
          setActiveTool('select');
        }}
        onCancel={() => {
          setShowVisualEyedropper(false);
          setActiveTool('select');
        }}
      />
    </div>
  );
};

export default FreeGridCanvas;