// components/Panels/MediaPanelEnhanced.jsx
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useAtom } from 'jotai';
import {
  Search, X, CheckSquare, Square, Edit,
  Image as ImageIconLucide, Video as VideoIconLucide, Music as MusicIconLucide,
  SortAsc, SortDesc, Filter, Trash2, FileText, List, Eye, EyeOff,
  MousePointer2 as MousePointer2Icon, ChevronLeft, ChevronRight,
  Grid, Maximize2, Pin, PinOff, AlertTriangle, RefreshCw, Boxes
} from 'lucide-react';
import MediaPreview from '../MediaGrid/MediaPreview.jsx';
import VirtualizedGrid from '../MediaGrid/VirtualizedGrid.jsx';
import { isImage, isVideo, isAudio, isPDF, is3D } from '../MediaGrid/helpers.js';
import { useThumbnailWorker } from '../../hooks/useThumbnailWorker';

// Import atoms from store
import {
  filteredMediaFilesAtom,
  selectedMediaItemsAtom,
  searchTermAtom,
  selectedFileTypesAtom,
  showRecentlyAddedOnlyAtom,
  mediaStatsAtom
} from '../../store.js';

/**
 * Enhanced MediaPanel Component with Jotai state management and virtualization
 * 
 * Improvements:
 * - Uses centralized Jotai store for state management
 * - Implements virtualization for smooth scrolling with thousands of items
 * - Uses Web Workers for video thumbnail generation (non-blocking)
 * - Automatic performance optimization based on item count
 */
const MediaPanelEnhanced = ({
  // Event handlers that don't have atoms yet
  onMediaItemHover,
  onMediaPreviewClick,
  onEditMetadata,
  onBeginResize,
  onToggleCollapse,
  onTogglePin,
  onRefreshMedia,
  
  // UI state
  isCollapsed = false,
  isPinned = false,
  mediaPanelLayout,
  darkMode = false,
}) => {
  // ============================================================================
  // ATOM STATE MANAGEMENT
  // ============================================================================
  
  const [filteredMediaFiles] = useAtom(filteredMediaFilesAtom);
  const [selectedMediaItems, setSelectedMediaItems] = useAtom(selectedMediaItemsAtom);
  const [searchTerm, setSearchTerm] = useAtom(searchTermAtom);
  const [selectedFileTypes, setSelectedFileTypes] = useAtom(selectedFileTypesAtom);
  const [showRecentlyAddedOnly, setShowRecentlyAddedOnly] = useAtom(showRecentlyAddedOnlyAtom);
  const [mediaStats] = useAtom(mediaStatsAtom);
  
  // ============================================================================
  // LOCAL STATE
  // ============================================================================
  
  const [previewMode, setPreviewMode] = useState('off');
  const [showSelectedOnly, setShowSelectedOnly] = useState(false);
  const [hoverExpanded, setHoverExpanded] = useState(false);
  const [thumbnailSize, setThumbnailSize] = useState('m');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });
  const [gridColumns, setGridColumns] = useState(2);
  
  // ============================================================================
  // REFS
  // ============================================================================
  
  const panelContentRef = useRef(null);
  const panelTimeoutRef = useRef(null);
  const prevPinnedRef = useRef(isPinned);
  
  // ============================================================================
  // HOOKS
  // ============================================================================
  
  const { generateThumbnailWithFallback } = useThumbnailWorker();
  
  // ============================================================================
  // THUMBNAIL SIZE CONFIGURATION
  // ============================================================================
  
  const thumbnailSizes = {
    s: { min: 80, max: 120 },
    m: { min: 120, max: 180 },
    l: { min: 180, max: 240 }
  };
  
  // ============================================================================
  // PERFORMANCE OPTIMIZATION
  // ============================================================================
  
  // Use virtualization when we have more than 100 items
  const useVirtualization = filteredMediaFiles.length > 100;
  
  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================
  
  const displayedFiles = useMemo(() => {
    let files = showSelectedOnly 
      ? filteredMediaFiles.filter((_, idx) => selectedMediaItems.includes(idx))
      : filteredMediaFiles;
      
    // Apply sorting
    if (sortConfig.key) {
      files = [...files].sort((a, b) => {
        let aVal, bVal;
        
        switch (sortConfig.key) {
          case 'name':
            aVal = a.name.toLowerCase();
            bVal = b.name.toLowerCase();
            break;
          case 'date':
            aVal = a.lastModified || 0;
            bVal = b.lastModified || 0;
            break;
          case 'type':
            aVal = a.fileType;
            bVal = b.fileType;
            break;
          case 'size':
            aVal = a.size || 0;
            bVal = b.size || 0;
            break;
          default:
            return 0;
        }
        
        if (sortConfig.direction === 'asc') {
          return aVal > bVal ? 1 : -1;
        } else {
          return aVal < bVal ? 1 : -1;
        }
      });
    }
    
    return files;
  }, [filteredMediaFiles, selectedMediaItems, showSelectedOnly, sortConfig]);
  
  // ============================================================================
  // GRID LAYOUT CALCULATION
  // ============================================================================
  
  useEffect(() => {
    if (!panelContentRef.current) return;
    
    const observer = new ResizeObserver(() => {
      const width = panelContentRef.current?.clientWidth || 280;
      const padding = 16;
      const gap = 8;
      const availableWidth = width - (padding * 2);
      
      const { min, max } = thumbnailSizes[thumbnailSize];
      const minColumns = Math.floor(availableWidth / (max + gap));
      const maxColumns = Math.floor(availableWidth / (min + gap));
      
      const columns = Math.max(1, Math.min(maxColumns, minColumns || 1));
      setGridColumns(columns);
    });
    
    observer.observe(panelContentRef.current);
    return () => observer.disconnect();
  }, [thumbnailSize]);
  
  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================
  
  const handleMouseEnter = useCallback(() => {
    if (isCollapsed && !isPinned) {
      setHoverExpanded(true);
      if (panelTimeoutRef.current) {
        clearTimeout(panelTimeoutRef.current);
      }
    }
  }, [isCollapsed, isPinned]);
  
  const handleMouseLeave = useCallback(() => {
    if (isCollapsed && !isPinned && hoverExpanded) {
      panelTimeoutRef.current = setTimeout(() => {
        setHoverExpanded(false);
      }, 300);
    }
  }, [isCollapsed, isPinned, hoverExpanded]);
  
  const handleSelectAll = () => {
    setSelectedMediaItems(displayedFiles.map((_, idx) => idx));
  };
  
  const handleDeselectAll = () => {
    setSelectedMediaItems([]);
  };
  
  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };
  
  const handleRefresh = async () => {
    setIsRefreshing(true);
    if (onRefreshMedia) {
      await onRefreshMedia();
    }
    setTimeout(() => setIsRefreshing(false), 500);
  };
  
  // ============================================================================
  // RENDER ITEM FOR VIRTUALIZED GRID
  // ============================================================================
  
  const renderMediaItem = useCallback((item, index) => {
    const isSelected = selectedMediaItems.includes(index);
    const isHovered = false; // Managed internally by MediaPreview
    
    return (
      <MediaPreview
        key={item.id}
        media={item}
        index={index}
        isSelected={isSelected}
        isHovered={isHovered}
        onMouseEnter={() => onMediaItemHover?.({ type: 'media', idx: index })}
        onMouseLeave={() => onMediaItemHover?.(null)}
        onClick={() => onMediaPreviewClick?.(item)}
        onEditClick={() => onEditMetadata?.(item)}
        size={thumbnailSize}
        previewMode={previewMode}
        generateThumbnail={generateThumbnailWithFallback}
      />
    );
  }, [selectedMediaItems, thumbnailSize, previewMode, onMediaItemHover, onMediaPreviewClick, onEditMetadata, generateThumbnailWithFallback]);
  
  // ============================================================================
  // RENDER
  // ============================================================================
  
  const panelWidth = isCollapsed && !hoverExpanded ? 48 : (mediaPanelLayout?.width || 280);
  const showContent = !isCollapsed || hoverExpanded;
  
  const cellSize = thumbnailSizes[thumbnailSize];
  const cellWidth = cellSize.max;
  const cellHeight = cellSize.max * 0.75;
  
  return (
    <div
      className={`flex flex-col border-r transition-all duration-300 ${
        darkMode ? 'bg-gray-900 border-gray-700' : 'bg-gray-50 border-gray-200'
      }`}
      style={{ width: `${panelWidth}px` }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Header */}
      <div className={`p-2 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className="flex items-center justify-between">
          <h3 className={`font-medium ${showContent ? '' : 'hidden'} ${darkMode ? 'text-white' : ''}`}>
            Media ({mediaStats.total})
          </h3>
          
          <div className="flex items-center space-x-1">
            {showContent && (
              <>
                <button
                  onClick={() => setThumbnailSize(s => s === 's' ? 'm' : s === 'm' ? 'l' : 's')}
                  className={`p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700`}
                  title={`Thumbnail size: ${thumbnailSize.toUpperCase()}`}
                >
                  <Grid size={16} />
                </button>
                <button
                  onClick={() => setPreviewMode(m => m === 'off' ? 'hover' : m === 'hover' ? 'live' : 'off')}
                  className={`p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700`}
                  title={`Preview: ${previewMode}`}
                >
                  {previewMode === 'off' ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
                <button
                  onClick={handleRefresh}
                  className={`p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 ${isRefreshing ? 'animate-spin' : ''}`}
                  title="Refresh media"
                >
                  <RefreshCw size={16} />
                </button>
              </>
            )}
            <button
              onClick={onTogglePin}
              className={`p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 ${isPinned ? 'text-blue-600' : ''}`}
              title={isPinned ? 'Unpin panel' : 'Pin panel'}
            >
              {isPinned ? <Pin size={16} /> : <PinOff size={16} />}
            </button>
            <button
              onClick={onToggleCollapse}
              className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
              title={isCollapsed ? 'Expand panel' : 'Collapse panel'}
            >
              {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </button>
          </div>
        </div>
      </div>
      
      {/* Search and filters */}
      {showContent && (
        <div className="p-2 space-y-2">
          <div className="relative">
            <Search className="absolute left-2 top-2 text-gray-400" size={16} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search media..."
              className={`w-full pl-8 pr-8 py-1.5 rounded border ${
                darkMode 
                  ? 'bg-gray-800 border-gray-700 text-white' 
                  : 'bg-white border-gray-300'
              }`}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2 top-2 text-gray-400 hover:text-gray-600"
              >
                <X size={16} />
              </button>
            )}
          </div>
          
          <div className="flex items-center justify-between">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`text-sm flex items-center space-x-1 ${
                darkMode ? 'text-gray-300' : 'text-gray-600'
              }`}
            >
              <Filter size={14} />
              <span>Filters</span>
            </button>
            
            <div className="flex items-center space-x-1">
              <button
                onClick={handleSelectAll}
                className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                title="Select all"
              >
                <CheckSquare size={14} />
              </button>
              <button
                onClick={handleDeselectAll}
                className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                title="Deselect all"
              >
                <Square size={14} />
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Content area */}
      {showContent && (
        <div 
          ref={panelContentRef}
          className="flex-1 overflow-y-auto p-2"
        >
          {useVirtualization ? (
            <VirtualizedGrid
              items={displayedFiles}
              renderItem={renderMediaItem}
              columns={gridColumns}
              cellWidth={cellWidth}
              cellHeight={cellHeight}
              containerHeight={600}
            />
          ) : (
            <div 
              className="grid gap-2"
              style={{ gridTemplateColumns: `repeat(${gridColumns}, 1fr)` }}
            >
              {displayedFiles.map((item, index) => renderMediaItem(item, index))}
            </div>
          )}
          
          {displayedFiles.length === 0 && (
            <div className="text-center py-8 text-gray-400">
              {searchTerm || selectedFileTypes.length > 0 
                ? 'No media matches filters' 
                : 'No media uploaded'}
            </div>
          )}
        </div>
      )}
      
      {/* Resize handle */}
      {!isCollapsed && (
        <div
          className="absolute top-0 right-0 w-1 h-full cursor-ew-resize hover:bg-blue-500 transition-colors"
          onMouseDown={onBeginResize}
        />
      )}
    </div>
  );
};

export default MediaPanelEnhanced;