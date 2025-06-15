// components/Panels/MediaPanel.jsx
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Search, X, CheckSquare, Square, Edit,
  Image as ImageIconLucide, Video as VideoIconLucide, Music as MusicIconLucide,
  SortAsc, SortDesc, Filter, Trash2, FileText, List, Eye, EyeOff,
  MousePointer2 as MousePointer2Icon, ChevronLeft, ChevronRight,
  Grid, Maximize2, Pin, PinOff, AlertTriangle, RefreshCw, Boxes
} from 'lucide-react';
import MediaPreview from '../MediaGrid/MediaPreview.jsx';
import { isImage, isVideo, isAudio, isPDF, is3D } from '../MediaGrid/helpers.js';

/**
 * MediaPanel Component
 * 
 * A comprehensive media management panel that displays all uploaded media files
 * with search, filter, sort, and selection capabilities.
 * 
 * Features:
 * - Collapsible/pinnable panel with auto-expand on hover
 * - Thumbnail size controls (small/medium/large)
 * - Preview modes (off/live/hover) for media playback
 * - Advanced filtering by file type
 * - Multi-selection with keyboard shortcuts
 * - Drag and drop support to grid
 * - Text page support with preview
 * - Missing file detection and refresh
 */
const MediaPanel = ({
  // Core media data
  mediaFiles,              // Array of all media files
  filteredMediaFiles,      // Filtered subset based on search/filters
  mediaPanelLayout,        // Layout configuration {width, columns}

  // Search and filter state
  searchTerm,              // Current search query
  showFilters,             // Whether filter panel is visible
  fileTypeFilters,         // Object with file extensions as keys, boolean values
  sortConfig,              // {key: 'name'|'date'|'type'|'size', direction: 'asc'|'desc'}

  // UI state
  hoveredItem,             // Currently hovered item {type: 'media', idx: number}
  selectedMediaItems,      // Array of selected media indices
  isCollapsed = false,     // Whether panel is collapsed
  isPinned = false,        // Whether panel is pinned open

  // Event handlers
  onSearchChange,          // Search input change handler
  onToggleFilters,         // Toggle filter panel visibility
  onSelectAll,             // Select all visible media
  onDeselectAll,           // Clear selection
  onRemoveSelected,        // Remove selected items
  onSort,                  // Sort by column
  onFileFilterCategoryChange, // Toggle entire category of filters
  onToggleFileTypeFilter,  // Toggle individual file type filter
  onMediaItemHover,        // Handle media item hover
  onMediaItemSelect,       // Handle media item selection
  onMediaPreviewClick,     // Handle preview click
  onEditMetadata,          // Edit media metadata
  onBeginResize,           // Start panel resize
  onToggleCollapse,        // Toggle collapsed state
  onTogglePin,             // Toggle pinned state
  onRefreshMedia,          // Refresh media to check for missing files
  darkMode = false,      // Dark mode flag
}) => {
  // ============================================================================
  // LOCAL STATE MANAGEMENT
  // ============================================================================

  /**
   * Preview mode controls how media behaves:
   * - 'off': Click to select, no auto-preview
   * - 'live': Media auto-plays when visible
   * - 'hover': Media plays on hover
   */
  const [previewMode, setPreviewMode] = useState('off');

  /**
   * Filter to show only selected items
   * Useful when working with specific media subset
   */
  const [showSelectedOnly, setShowSelectedOnly] = useState(false);

  /**
   * Controls panel expansion on hover when collapsed
   * Only active when panel is collapsed and not pinned
   */
  const [hoverExpanded, setHoverExpanded] = useState(false);

  /**
   * Thumbnail size setting
   * 's' = small (80-120px), 'm' = medium (120-180px), 'l' = large (180-240px)
   */
  const [thumbnailSize, setThumbnailSize] = useState('m');

  /**
   * Whether refresh operation is in progress
   * Shows loading state during media refresh
   */
  const [isRefreshing, setIsRefreshing] = useState(false);

  // ============================================================================
  // REFS FOR DOM MANIPULATION
  // ============================================================================

  const panelContentRef = useRef(null);    // Reference to scrollable content area
  const panelTimeoutRef = useRef(null);    // Timeout for hover collapse delay
  const prevPinnedRef = useRef(isPinned);  // Track previous pin state for transitions

  // ============================================================================
  // THUMBNAIL SIZE CONFIGURATION
  // ============================================================================

  /**
   * Defines min/max sizes for each thumbnail size setting
   * Used to calculate responsive grid layout
   */
  const thumbnailSizes = {
    s: { min: 80, max: 120 },    // Small: 2-5 columns depending on width
    m: { min: 120, max: 180 },   // Medium: 1-4 columns
    l: { min: 180, max: 240 }    // Large: 1-3 columns
  };

  // ============================================================================
  // GRID LAYOUT STATE
  // ============================================================================

  /**
   * Number of columns in the media grid
   * Dynamically calculated based on panel width and thumbnail size
   */
  const [gridColumns, setGridColumns] = useState(2);

  // ============================================================================
  // HOVER EXPAND/COLLAPSE HANDLERS
  // ============================================================================

  /**
   * Handle mouse enter event for auto-expansion
   * Only expands if panel is collapsed and not pinned
   */
  const handleMouseEnter = useCallback(() => {
    if (isCollapsed && !isPinned) {
      setHoverExpanded(true);
      // Clear any pending collapse timeout
      if (panelTimeoutRef.current) {
        clearTimeout(panelTimeoutRef.current);
      }
    }
  }, [isCollapsed, isPinned]);

  /**
   * Handle mouse leave event for auto-collapse
   * Adds delay before collapsing to prevent flicker
   */
  const handleMouseLeave = useCallback(() => {
    if (isCollapsed && !isPinned) {
      panelTimeoutRef.current = setTimeout(() => {
        setHoverExpanded(false);
      }, 300); // 300ms delay before collapse
    }
  }, [isCollapsed, isPinned]);

  // ============================================================================
  // PIN STATE MANAGEMENT
  // ============================================================================

  /**
   * Reset hover expansion when panel is pinned
   * Pinned panels should not use hover expansion
   */
  useEffect(() => {
    if (isPinned && !isCollapsed) {
      setHoverExpanded(false);
    }
  }, [isPinned, isCollapsed]);

  /**
   * Auto-collapse panel when unpinned
   * Provides expected behavior when removing pin
   */
  useEffect(() => {
    // If we just unpinned (was pinned, now not pinned)
    if (prevPinnedRef.current === true && isPinned === false) {
      // Notify parent to collapse
      if (onToggleCollapse && !isCollapsed) {
        onToggleCollapse();
      }
    }
    prevPinnedRef.current = isPinned;
  }, [isPinned, isCollapsed, onToggleCollapse]);

  // ============================================================================
  // RESPONSIVE GRID LAYOUT CALCULATION
  // ============================================================================

  /**
   * Dynamically calculate optimal grid columns based on panel width
   * Uses ResizeObserver for responsive updates
   */
  useEffect(() => {
    if (!panelContentRef.current) return;

    const resizeObserver = new ResizeObserver(entries => {
      for (let entry of entries) {
        const width = entry.contentRect.width;
        const currentSize = thumbnailSizes[thumbnailSize];
        const idealSize = (currentSize.min + currentSize.max) / 2;

        // Calculate columns that fit without overflow
        const padding = 48; // Account for padding and scrollbar
        const gap = 12; // Gap between items
        const availableWidth = width - padding;

        let columns = Math.floor((availableWidth + gap) / (idealSize + gap));
        columns = Math.max(1, columns); // At least 1 column

        setGridColumns(columns);
      }
    });

    resizeObserver.observe(panelContentRef.current);

    return () => resizeObserver.disconnect();
  }, [thumbnailSize]);

  /**
   * Calculate actual item size based on available space
   * Ensures items fit perfectly within grid columns
   */
  const itemSize = useMemo(() => {
    if (!panelContentRef.current) return thumbnailSizes[thumbnailSize].min;

    const width = panelContentRef.current.offsetWidth || mediaPanelLayout.width;
    const padding = 24;
    const gap = 12;
    const availableWidth = width - padding;

    const calculatedSize = (availableWidth - (gridColumns - 1) * gap) / gridColumns;
    const { min, max } = thumbnailSizes[thumbnailSize];

    return Math.max(min, Math.min(max, calculatedSize));
  }, [gridColumns, mediaPanelLayout.width, thumbnailSize]);

  // ============================================================================
  // UI CONTROL FUNCTIONS
  // ============================================================================

  /**
   * Cycle through thumbnail sizes: small -> medium -> large -> small
   */
  const cycleThumbnailSize = () => {
    setThumbnailSize(prev => {
      if (prev === 's') return 'm';
      if (prev === 'm') return 'l';
      return 's';
    });
  };

  /**
   * Cycle through preview modes: off -> live -> hover -> off
   */
  const cyclePreviewMode = () => {
    setPreviewMode(prev => {
      if (prev === 'off') return 'live';
      if (prev === 'live') return 'hover';
      return 'off';
    });
  };

  /**
   * Handle media refresh with loading state
   */
  const handleRefresh = async () => {
    if (onRefreshMedia) {
      setIsRefreshing(true);
      try {
        await onRefreshMedia();
      } finally {
        setIsRefreshing(false);
      }
    }
  };

  // ============================================================================
  // SELECTED-ONLY FILTER MANAGEMENT
  // ============================================================================

  /**
   * Auto-disable "show selected only" when selection is cleared
   */
  useEffect(() => {
    if (selectedMediaItems.length === 0 && showSelectedOnly) {
      setShowSelectedOnly(false);
    }
  }, [selectedMediaItems, showSelectedOnly]);

  // ============================================================================
  // MEDIA FILTERING LOGIC
  // ============================================================================

  /**
   * Compute displayed media based on filters and selection
   * Applies search, file type filters, and selected-only filter
   */
  const displayedMedia = useMemo(() => {
    if (showSelectedOnly) {
      const selectedOriginalIndices = new Set(selectedMediaItems);
      return mediaFiles.filter((file, index) => selectedOriginalIndices.has(index))
        .filter(file => filteredMediaFiles.some(filteredFile => filteredFile.id === file.id));
    }
    return filteredMediaFiles;
  }, [filteredMediaFiles, mediaFiles, selectedMediaItems, showSelectedOnly]);

  // ============================================================================
  // FILTER HELPERS
  // ============================================================================

  /**
   * Check if all extensions in a category are active
   * Used to determine checkbox state for category filters
   */
  const areAllExtsInFilterCategoryActive = (category) => {
    const extensions = {
      image: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'],
      video: ['mp4', 'webm', 'mov', 'avi', 'mkv'],
      audio: ['mp3', 'wav', 'ogg', 'flac'],
      '3d': ['gltf', 'glb', 'obj', 'fbx', 'stl', 'ply', '3ds', 'dae'],
    };
    if (!extensions[category]) return false;
    return extensions[category].every(ext => fileTypeFilters[ext.toLowerCase()]);
  };

  /**
   * Get appropriate sort icon for column headers
   * Shows ascending/descending arrow for active sort
   */
  const getSortIcon = (key) => {
    if (sortConfig.key === key) {
      return sortConfig.direction === 'asc' ?
        <SortAsc size={16} className="ml-1" /> :
        <SortDesc size={16} className="ml-1" />;
    }
    return null;
  };

  // ============================================================================
  // COMPUTE PANEL EXPANSION STATE
  // ============================================================================

  /**
   * Determine if panel should be expanded
   * True if not collapsed OR if hover-expanded (when collapsed but hovered)
   */
  const isExpanded = !isCollapsed || (isCollapsed && hoverExpanded && !isPinned);

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div
      className={`relative bg-white dark:bg-gray-900 border-r border-gray-300 dark:border-gray-600 flex flex-col transition-all duration-300`}
      style={{
        // Collapsed width is 40px, expanded width from layout prop
        width: isCollapsed && !hoverExpanded ? '40px' : `${mediaPanelLayout.width}px`,
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* ======================================================================
          COLLAPSE/EXPAND BUTTON (VISIBLE WHEN COLLAPSED)
          ====================================================================== */}
      <div className={`absolute top-3 ${isCollapsed ? 'right-2' : 'right-'} z-10`}>
        {isCollapsed && !hoverExpanded && (
          <button
            onClick={onToggleCollapse}
            className="p-1.5 padding right rounded hover:bg-gray-200 dark:hover:bg-gray-700 bg-gray-100 dark:bg-gray-600"
            title="Expand panel"
          >
            <ChevronRight size={16} />
          </button>
        )}
      </div>

      {/* ======================================================================
          MAIN PANEL CONTENT (VISIBLE WHEN EXPANDED)
          ====================================================================== */}
      {isExpanded && (
        <>
          {/* ==================================================================
              HEADER SECTION
              ================================================================== */}
          <div className='p-3 border-b border-gray-200 dark:border-gray-700'>
            {/* Header Title and Controls */}
            <div className='flex justify-between items-center mb-2 text-gray-700 dark:text-gray-300'>
              {/* Left side: Title and selection count */}
              <div className='flex items-center'>
                <h2 className='font-bold text-lg'>Media ({displayedMedia.length})</h2>
                {selectedMediaItems.length > 0 && (
                  <span className="ml-2 text-sm">
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300 rounded">
                      {selectedMediaItems.length} Selected
                    </span>
                  </span>
                )}
              </div>

              {/* Right side: Action buttons */}
              <div className='flex flex-wrap items-center space-x-1'>
                {/* Preview mode toggle */}
                <button
                  onClick={cyclePreviewMode}
                  className='p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700'
                  title={previewMode === 'off' ? 'Preview: OFF (Click selects)' :
                    previewMode === 'live' ? 'Preview: LIVE (Media autoplays)' :
                      'Preview: HOVER (Media plays on hover)'}
                >
                  {previewMode === 'off' && <EyeOff size={16} />}
                  {previewMode === 'live' && <Eye size={16} />}
                  {previewMode === 'hover' && <MousePointer2Icon size={16} />}
                </button>

                {/* Filter toggle */}
                <button
                  onClick={onToggleFilters}
                  className={`p-1.5 rounded ${showFilters ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                  title='Toggle Filters'
                >
                  <Filter size={16} />
                </button>

                {/* Selection controls */}
                <button
                  onClick={onSelectAll}
                  className='p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700'
                  title='Select All'
                >
                  <CheckSquare size={16} />
                </button>
                <button
                  onClick={onDeselectAll}
                  className='p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700'
                  title='Deselect All'
                >
                  <Square size={16} />
                </button>

                {/* Show selected only toggle */}
                <button
                  onClick={() => setShowSelectedOnly(prev => !prev)}
                  disabled={selectedMediaItems.length === 0}
                  className={`p-1.5 rounded ${showSelectedOnly ? 'bg-blue-100 text-blue-600' : selectedMediaItems.length > 0 ? 'hover:bg-gray-200' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
                  title={showSelectedOnly ? 'Show All Media' : 'Show Selected Only'}
                >
                  {showSelectedOnly ? <List size={16} /> : <FileText size={16} />}
                </button>

                {/* Remove selected button */}
                <button
                  onClick={onRemoveSelected}
                  disabled={selectedMediaItems.length === 0}
                  className={`p-1.5 rounded ${selectedMediaItems.length > 0 ? 'bg-red-100 text-red-600 hover:bg-red-200' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
                  title='Remove Selected'
                >
                  <Trash2 size={16} />
                </button>

                {/* Thumbnail size toggle */}
                <button
                  onClick={cycleThumbnailSize}
                  className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                  title={`Thumbnail size: ${thumbnailSize === 's' ? 'Small' : thumbnailSize === 'm' ? 'Medium' : 'Large'} (click to cycle)`}
                >
                  <Grid size={16} />
                </button>

                {/* Refresh media button */}
                {onRefreshMedia && (
                  <button
                    onClick={handleRefresh}
                    className={`p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 ${isRefreshing ? 'animate-spin' : ''}`}
                    title="Refresh media (check for missing files)"
                    disabled={isRefreshing}
                  >
                    <RefreshCw size={16} />
                  </button>
                )}

                {/* Pin/unpin button */}
                <button
                  onClick={onTogglePin}
                  className={`p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 ${isPinned ? 'text-blue-500' : ''}`}
                  title={isPinned ? "Unpin panel" : "Pin panel"}
                >
                  {isPinned ? <Pin size={16} /> : <PinOff size={16} />}
                </button>
              </div>
            </div>

            {/* ==================================================================
                SEARCH BAR
                ================================================================== */}
            <div className='relative mb-3'>
              <input
                type='text'
                value={searchTerm}
                onChange={e => onSearchChange(e.target.value)}
                placeholder='Search media...'
                className='w-full pl-8 pr-3 py-1.5 border rounded border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500'
              />
              <Search size={16} className='absolute left-2 top-2.5 text-gray-400' />
              {searchTerm && (
                <button
                  onClick={() => onSearchChange('')}
                  className='absolute right-2 top-2 text-gray-400 hover:text-gray-600'
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* ==================================================================
                SORT CONTROLS
                ================================================================== */}
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Sort by:</span>
              <button
                onClick={() => onSort('name')}
                className={`px-2 py-1 text-xs rounded flex items-center ${sortConfig.key === 'name' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600'}`}
                title='Sort by Name'
              >
                Name {getSortIcon('name')}
              </button>
              <button
                onClick={() => onSort('date')}
                className={`px-2 py-1 text-xs rounded flex items-center ${sortConfig.key === 'date' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600'}`}
                title='Sort by Date'
              >
                Date {getSortIcon('date')}
              </button>
              <button
                onClick={() => onSort('type')}
                className={`px-2 py-1 text-xs rounded flex items-center ${sortConfig.key === 'type' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600'}`}
                title='Sort by Type'
              >
                Type {getSortIcon('type')}
              </button>
              <button
                onClick={() => onSort('size')}
                className={`px-2 py-1 text-xs rounded flex items-center ${sortConfig.key === 'size' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600'}`}
                title='Sort by Size'
              >
                Size {getSortIcon('size')}
              </button>
            </div>

            {/* ==================================================================
                FILTER PANEL (COLLAPSIBLE)
                ================================================================== */}
            {showFilters && (
              <div className='p-3 mb-1 bg-gray-50 dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700 flex flex-col gap-2 text-sm text-gray-700 dark:text-gray-300'>
                <div className="flex items-center justify-between">
                  <span className="font-medium">Filter by Type</span>
                  <button
                    onClick={() => onFileFilterCategoryChange('all')}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Reset All
                  </button>
                </div>

                {/* File type category filters */}
                {['image', 'video', 'audio', '3d'].map(category => (
                  <div key={category} className="space-y-1">
                    <div className="flex items-center justify-between">
                      {/* Category checkbox */}
                      <label className="flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={areAllExtsInFilterCategoryActive(category)}
                          onChange={() => onFileFilterCategoryChange(category)}
                          className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:focus:ring-blue-600 dark:ring-offset-gray-800"
                        />
                        <span className="ml-2 flex items-center capitalize">
                          {category === 'image' && <ImageIconLucide size={14} className="mr-1" />}
                          {category === 'video' && <VideoIconLucide size={14} className="mr-1" />}
                          {category === 'audio' && <MusicIconLucide size={14} className="mr-1" />}
                          {category === '3d' && <Boxes size={14} className="mr-1" />}
                          {category === '3d' ? '3D' : category}
                        </span>
                      </label>

                      {/* Individual extension toggles */}
                      <div className="space-x-1 text-xs">
                        {(category === 'image' ? ['jpg', 'png', 'gif', 'webp', 'svg'] :
                          category === 'video' ? ['mp4', 'webm', 'mov', 'avi', 'mkv'] :
                            category === 'audio' ? ['mp3', 'wav', 'ogg', 'flac'] :
                              ['gltf', 'glb', 'obj', 'fbx', 'stl']).map(ext => (
                                <button
                                  key={ext}
                                  onClick={() => onToggleFileTypeFilter(ext)}
                                  className={`px-1.5 py-0.5 rounded ${fileTypeFilters[ext.toLowerCase()] ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'}`}
                                >
                                  {ext}
                                </button>
                              ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ==================================================================
              SCROLLABLE MEDIA GRID
              ================================================================== */}
          <div
            ref={panelContentRef}
            className='flex-1 overflow-y-scroll p-2 min-h-0 relative'
            style={{
              // Ensure it takes up available space but can scroll
              maxHeight: 'calc(100vh - 200px)', // Adjust based on header height
            }}
          >
            {displayedMedia.length === 0 ? (
              // Empty state message
              <div className='text-center py-8 text-gray-500 dark:text-gray-400'>
                {mediaFiles.length === 0 ? 'No media files uploaded.' :
                  showSelectedOnly ? 'No selected items match filters.' :
                    'No media files match current filters.'}
              </div>
            ) : (
              // Media grid
              <div
                className="grid gap-3"
                style={{
                  gridTemplateColumns: `repeat(${gridColumns}, 1fr)`
                }}
              >
                {/* ==============================================================
                    MEDIA ITEM RENDERING
                    ============================================================== */}
                {displayedMedia.map((media, displayedItemIndex) => {
                  // Find original index in unfiltered array
                  const originalIndex = mediaFiles.findIndex(m => m.id === media.id);
                  if (originalIndex === -1) return null;

                  // Compute item states
                  const isSelected = selectedMediaItems.includes(originalIndex);
                  const isHovered = hoveredItem?.type === 'media' && hoveredItem.idx === originalIndex;

                  // Preview mode props for MediaPreview component
                  const autoplayProp = previewMode === 'live';
                  const hoverPlayProp = previewMode === 'hover';

                  return (
                    <div
                      key={media.id || originalIndex}
                      className={`relative border rounded cursor-pointer overflow-hidden group
                        ${isSelected ? 'border-blue-500 ring-2 ring-blue-300 dark:ring-blue-700'
                          : media.isPlaceholder || media.isMissing
                            ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/30'
                            : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500'}`}
                      style={{
                        width: `${itemSize}px`,
                        height: `${itemSize}px`
                      }}
                      // Drag and drop support
                      draggable
                      onDragStart={e => {
                        e.dataTransfer.setData('text/plain', originalIndex.toString());
                        e.dataTransfer.setData('mediaId', media.id);
                        e.dataTransfer.setData('mediaType', media.type);
                        e.dataTransfer.effectAllowed = 'copy';

                        // Include full media data for advanced drop targets
                        e.dataTransfer.setData('application/json', JSON.stringify({
                          id: media.id,
                          name: media.name,
                          type: media.type,
                          url: media.url,
                          size: media.size,
                          isTextPage: media.isTextPage,
                          metadata: media.metadata
                        }));
                      }}
                      // Hover handling
                      onMouseEnter={() => {
                        onMediaItemHover({ type: 'media', idx: originalIndex });
                      }}
                      onMouseLeave={() => onMediaItemHover(null)}
                      // Click handling based on mode and modifiers
                      onClick={e => {
                        if (e.shiftKey || e.ctrlKey || e.metaKey) {
                          // Multi-selection with modifier keys
                          onMediaItemSelect(originalIndex, e.shiftKey, e.ctrlKey || e.metaKey);
                        } else if (previewMode === 'off') {
                          // Single selection in non-preview mode
                          onMediaItemSelect(originalIndex, false, false);
                        } else {
                          // Open preview in preview modes
                          onMediaPreviewClick(media);
                        }
                      }}
                    >
                      {/* ========================================================
                          MEDIA ITEM OVERLAYS
                          ======================================================== */}

                      {/* Selection checkbox (top-left) */}
                      <div className='absolute top-1.5 left-1.5 z-10'>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onMediaItemSelect(originalIndex, false, e.ctrlKey || e.metaKey);
                          }}
                          className={`p-0.5 rounded ${isSelected ? 'bg-blue-500 text-white' : 'bg-white/70 hover:bg-gray-200 dark:bg-gray-800/70 dark:hover:bg-gray-700'}`}
                        >
                          {isSelected ? <CheckSquare size={16} /> : <Square size={16} className="text-gray-500 dark:text-gray-400" />}
                        </button>
                      </div>

                      {/* Missing file indicator (top-right) */}
                      {media.isMissing && (
                        <div className="absolute top-1.5 right-1.5 z-10">
                          <AlertTriangle size={18} className="text-amber-500" title="File missing or moved" />
                        </div>
                      )}

                      {/* Text page indicator (top-right, next to missing indicator) */}
                      {media.isTextPage && (
                        <div className="absolute top-1.5 right-8 z-10 flex items-center bg-blue-600 text-white px-1.5 py-0.5 rounded text-xs">
                          <FileText size={12} className="mr-1" />
                          <span>Page {media.metadata?.pageNumber || '?'}</span>
                        </div>
                      )}

                      {/* ========================================================
                          MEDIA PREVIEW AREA
                          ======================================================== */}
                      <div className='w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800'>
                        <MediaPreview
                          media={media}
                          autoplay={autoplayProp}
                          hoverPlay={hoverPlayProp}
                          className='max-w-full max-h-full object-contain'
                        />
                      </div>

                      {/* ========================================================
                          HOVER OVERLAY WITH DETAILS
                          ======================================================== */}
                      {isHovered && !media.isPlaceholder && (
                        <div className='absolute inset-0 bg-black bg-opacity-70 text-white p-2 text-xs flex flex-col pointer-events-none'>
                          {/* Header with name and edit button */}
                          <div className='flex justify-between items-start'>
                            <span className='font-medium truncate' title={media.name}>
                              {media.getDisplayName ? media.getDisplayName() : media.name}
                            </span>
                            <button
                              onClick={e => {
                                e.stopPropagation();
                                e.preventDefault();
                                onEditMetadata(originalIndex);
                              }}
                              className='p-1 rounded-full bg-blue-500 text-white hover:bg-blue-600 pointer-events-auto'
                              title='Edit metadata'
                            >
                              <Edit size={14} />
                            </button>
                          </div>

                          {/* Media details */}
                          <div className='mt-auto'>
                            {/* File type icon and type */}
                            <div className='flex items-center space-x-1'>
                              {isImage(media.type) && <ImageIconLucide size={12} />}
                              {isVideo(media.type) && <VideoIconLucide size={12} />}
                              {isAudio(media.type) && <MusicIconLucide size={12} />}
                              {is3D(media.type) && <Boxes size={12} />}
                              {isPDF(media.type) && <FileText size={12} />}
                              {media.isTextPage && <FileText size={12} className="text-blue-500" />}
                              <span>{media.type}</span>
                            </div>

                            {/* File size and date */}
                            <div>{media.size}</div>
                            <div>{media.date}</div>

                            {/* Missing file warning */}
                            {media.isMissing && (
                              <div className="text-amber-300 text-xs mt-1">
                                File missing - click refresh to update
                              </div>
                            )}

                            {/* Text page preview */}
                            {media.isTextPage && (
                              <div className="mt-2 pt-2 border-t border-gray-600">
                                <div className="text-xs font-medium mb-1">Text Preview:</div>
                                <div className="italic opacity-80 text-xs line-clamp-3">
                                  "{media.getPreviewText ? media.getPreviewText(100) : media.metadata?.textContent?.substring(0, 100)}..."
                                </div>
                                <div className="mt-1 text-xs">
                                  <span className="mr-2">Words: {media.metadata?.wordCount || 0}</span>
                                  <span>Chars: {media.metadata?.characterCount || 0}</span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* ======================================================================
          RESIZE HANDLE
          ====================================================================== */}
      {isExpanded && (
        <div
          className="absolute top-0 right-0 bottom-0 w-2 cursor-ew-resize hover:bg-blue-300 opacity-0 hover:opacity-50 transition-opacity"
          onMouseDown={e => {
            e.preventDefault();
            onBeginResize();
          }}
          title='Resize Media Panel'
        />
      )}
    </div>
  );
};

export default MediaPanel;