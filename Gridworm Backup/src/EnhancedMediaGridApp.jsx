import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  Sliders, X, Upload, FolderOpen, Save, Download,
  Book, RefreshCw, Archive, Image as ImageIconLucide, Video as VideoIconLucide, Music as MusicIconLucide, Edit, Eye, EyeOff, Terminal,
  Repeat, Repeat1, ListTree, AlertTriangle, Copy, MoveHorizontal, Target, Trash2, Dice5,
  CheckSquare, Square, FileX, RefreshCw as RefreshCwIcon, MousePointer2 as MousePointer2Icon, // Added MousePointer2Icon
  Columns, Rows, Maximize, Minimize, Grid as GridIcon, Move, Filter, FileText, Search, SortDesc, SortAsc, LayoutGrid, ListMinus, List, Pencil, Type, Eraser, RotateCw, ZoomIn, ZoomOut  // Added for GridBuilderPanel
} from 'lucide-react';

// Import Panel Components (assuming they are in ./components/Panels/)
// MediaPanel and GridBuilderPanel will be defined inline for this update
// import MediaPanel from './components/Panels/MediaPanel';
// import GridBuilderPanel from './components/Panels/GridBuilderPanel';
import IndexPanel from './components/Panels/IndexPanel';
import ConsolePanel from './components/Panels/ConsolePanel';

// Import Dialog Components (assuming they are in ./components/Dialogs/)
import ExportDialog from './components/Dialogs/ExportDialog';
import UpdateIndexDialog from './components/Dialogs/UpdateIndexDialog';
import MediaNameEditDialog from './components/Dialogs/MediaNameEditDialog';
import JsonEditorDialog from './components/Dialogs/JsonEditorDialog';
import SaveProjectDialog from './components/Dialogs/SaveProjectDialog';
import LoadProjectDialog from './components/Dialogs/LoadProjectDialog';
// RemoveMediaDialog will be defined inline
import FileOperationsExportDialog from './components/Dialogs/FileOperationsExportDialog';

// Import other necessary components
import { EnlargedPreviewModal } from './components/MediaGrid/Index'; // Assuming Index.jsx exports this
import VirtualizedGrid from './components/MediaGrid/VirtualizedGrid'; // Needed for MediaPanel


// Import helpers (assuming they are in ./components/MediaGrid/helpers.js)
import {
  getFilename, formatFileSize,
  processFile, getFileExtension, getFileTypeCategory,
  isVideo, isImage, isAudio
} from './components/MediaGrid/helpers';

// #############################################################################
// Inline Child Component: MediaPreview.jsx (Based on user selection)
// Path for imports if it were separate: './components/MediaGrid/MediaPreview.jsx'
// #############################################################################
const MediaPreview = ({
  media,
  className = "",
  autoplay = false,
  hoverPlay = false,
  onMediaLoad = null // New callback for handling media dimensions
}) => {
  if (!media) return null;

  const mediaRef = useRef(null);
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isHoveredForHoverPlay, setIsHoveredForHoverPlay] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    setHasError(false);
  }, [media.url, media.name]);

  const handleMediaError = useCallback(() => {
    setIsLoading(false);
    setHasError(true);
  }, []);

  const handleMediaLoad = useCallback((e) => {
    setIsLoading(false);
    setHasError(false);

    // Report natural dimensions for images
    if (onMediaLoad && e.target) {
      const width = e.target.naturalWidth || e.target.videoWidth || 160;
      const height = e.target.naturalHeight || e.target.videoHeight || 120;
      onMediaLoad(width, height);
    }
  }, [onMediaLoad]);

  useEffect(() => {
    const el = mediaRef.current;
    if (!el || (!isVideo(media.type) && !isAudio(media.type))) return;

    const playMedia = () => el.play().catch(e => console.warn(`Autoplay/Hoverplay failed for ${media.name}:`, e.message));
    const pauseMedia = () => {
      el.pause();
      if (el.currentTime > 0 && !el.loop) el.currentTime = 0;
    };

    if (autoplay && (isVideo(media.type) || isAudio(media.type))) {
      playMedia();
    } else if (hoverPlay && isHoveredForHoverPlay && (isVideo(media.type) || isAudio(media.type))) {
      playMedia();
    } else {
      pauseMedia();
    }
  }, [autoplay, hoverPlay, isHoveredForHoverPlay, media.type, media.url, media.name]);


  const commonContainerClasses = "relative w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800";

  if (media.isPlaceholder || media.isMissing || hasError) {
    return (
      <div className={`${commonContainerClasses} ${className} p-2 text-center`}>
        <FileX size={24} className="text-red-500 mb-1" />
        <div className="text-xs font-medium truncate max-w-full px-1" title={media.name || 'Missing Media'}>
          {media.name || (hasError ? 'Error Loading' : 'Missing Media')}
        </div>
        <div className="text-xs text-gray-500 mt-0.5">
          {hasError ? 'Could not load preview.' : (media.isPlaceholder ? 'Placeholder' : 'File missing')}
        </div>
      </div>
    );
  }

  const LoadingIndicator = () => (isLoading && !hasError) ? (
    <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-20 z-10">
      <RefreshCwIcon size={20} className="animate-spin text-white" />
    </div>
  ) : null;


  if (isImage(media.type)) {
    return (
      <div
        className={`${commonContainerClasses} ${className}`}
        onMouseEnter={() => setIsHoveredForHoverPlay(true)}
        onMouseLeave={() => setIsHoveredForHoverPlay(false)}
      >
        <LoadingIndicator />
        <img
          key={media.url}
          src={media.url}
          alt={media.name}
          className={`max-w-full max-h-full object-contain transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
          onError={handleMediaError}
          onLoad={handleMediaLoad}
          loading="lazy"
        />
      </div>
    );
  }

  if (isVideo(media.type)) {
    return (
      <div
        className={`${commonContainerClasses} ${className}`}
        onMouseEnter={() => setIsHoveredForHoverPlay(true)}
        onMouseLeave={() => setIsHoveredForHoverPlay(false)}
      >
        <LoadingIndicator />
        <video
          key={media.url}
          ref={mediaRef}
          src={media.url}
          muted
          loop={autoplay || hoverPlay}
          playsInline
          preload="metadata"
          className={`max-w-full max-h-full object-contain transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
          onError={handleMediaError}
          onLoadedData={handleMediaLoad}
          onCanPlay={handleMediaLoad}
        />
      </div>
    );
  }

  if (isAudio(media.type)) {
    return (
      <div
        className={`${commonContainerClasses} ${className} flex-col`}
        onMouseEnter={() => setIsHoveredForHoverPlay(true)}
        onMouseLeave={() => setIsHoveredForHoverPlay(false)}
      >
        <LoadingIndicator />
        <MusicIconLucide size={32} className={`text-blue-500 mb-2 transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'}`} />
        <p className={`text-xs truncate max-w-full px-2 transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'}`} title={media.name}>{media.name}</p>
        <audio
          key={media.url}
          ref={mediaRef}
          src={media.url}
          preload="metadata"
          loop={autoplay || hoverPlay}
          className="hidden"
          onError={handleMediaError}
          onLoadedData={handleMediaLoad}
          onCanPlay={handleMediaLoad}
        />
      </div>
    );
  }

  return (
    <div className={`${commonContainerClasses} ${className} p-2 text-center`}>
      <AlertTriangle size={24} className="text-yellow-500 mb-1" />
      <div className="text-xs font-medium truncate max-w-full px-1" title={media.name}>{media.name}</div>
      <div className="text-xs text-gray-500 mt-0.5">Preview not available for this type.</div>
    </div>
  );
};


// #############################################################################
// Inline Child Component: RemoveMediaDialog.jsx (Corrected)
// #############################################################################
const RemoveMediaDialog = ({
  showDialog,
  selectedCount,
  onClose,
  onRemoveFromList,
  onExportDeleteCommand
}) => {
  if (!showDialog) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 max-w-md w-full">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold dark:text-white">
            Remove Media
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white"
          >
            <X size={24} />
          </button>
        </div>

        <div className="mb-6">
          <div className="flex items-center text-amber-600 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-300 p-3 rounded-lg mb-4">
            <AlertTriangle className="mr-2" size={20} />
            <p>You've selected {selectedCount} media item{selectedCount !== 1 ? 's' : ''}. What would you like to do?</p>
          </div>

          <div className="space-y-4">
            <button
              onClick={onRemoveFromList}
              className="w-full flex items-center justify-center p-3 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              <Trash2 size={18} className="mr-2" />
              Remove from Media Panel
              <span className="text-xs opacity-80 ml-2">(Removes from app, files remain on disk)</span>
            </button>

            <button
              onClick={onExportDeleteCommand}
              className="w-full flex items-center justify-center p-3 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
            >
              <Trash2 size={18} className="mr-2" />
              Export Delete Command
              <span className="text-xs opacity-80 ml-2">(For terminal execution to delete from disk)</span>
            </button>
          </div>
        </div>

        <div className="text-xs text-gray-500 dark:text-gray-400">
          Removing from Media Panel only affects this application's view. Exporting a delete command helps you manage actual files on your system.
        </div>
      </div>
    </div>
  );
};

// #############################################################################
// Inline Child Component: MediaPanel.jsx (Updated for preview logic)
// Path for imports if it were separate: './components/Panels/MediaPanel.jsx'
// #############################################################################
const MediaPanel = ({
  mediaFiles,
  filteredMediaFiles,
  mediaPanelLayout,
  searchTerm,
  showFilters,
  fileTypeFilters,
  sortConfig,
  hoveredItem,
  selectedMediaItems,
  onSearchChange,
  onToggleFilters,
  onSelectAll,
  onDeselectAll,
  onRemoveSelected,
  onSort,
  onFileFilterCategoryChange,
  onToggleFileTypeFilter,
  onMediaItemHover,
  onMediaItemSelect, // Expects (originalIndex, isShiftKey, isCtrlOrMetaKey)
  onMediaPreviewClick,
  onEditMetadata,
  onBeginResize
}) => {
  const [previewMode, setPreviewMode] = useState('off');

  const cyclePreviewMode = () => {
    setPreviewMode(prev => {
      if (prev === 'off') return 'live';
      if (prev === 'live') return 'hover';
      return 'off';
    });
  };

  const [showSelectedOnly, setShowSelectedOnly] = useState(false);

  useEffect(() => {
    if (selectedMediaItems.length === 0 && showSelectedOnly) {
      setShowSelectedOnly(false);
    }
  }, [selectedMediaItems, showSelectedOnly]);

  const displayedMedia = useMemo(() => {
    if (showSelectedOnly) {
      const selectedOriginalIndices = new Set(selectedMediaItems);
      return mediaFiles.filter((file, index) => selectedOriginalIndices.has(index))
        .filter(file => filteredMediaFiles.some(filteredFile => filteredFile.id === file.id));
    }
    return filteredMediaFiles;
  }, [filteredMediaFiles, mediaFiles, selectedMediaItems, showSelectedOnly]);

  const areAllExtsInFilterCategoryActive = (category) => {
    const extensions = {
      image: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'],
      video: ['mp4', 'webm', 'mov', 'avi', 'mkv'],
      audio: ['mp3', 'wav', 'ogg', 'flac']
    };
    if (!extensions[category]) return false;
    return extensions[category].every(ext => fileTypeFilters[ext.toLowerCase()]);
  };

  const getSortIcon = (key) => {
    if (sortConfig.key === key) {
      return sortConfig.direction === 'asc' ?
        <SortAsc size={16} className="ml-1" /> :
        <SortDesc size={16} className="ml-1" />;
    }
    return null;
  };

  const virtualizedGridHeight = `calc(100vh - ${showFilters ? 380 : 220}px)`;

  return (
    <div
      className='relative bg-white dark:bg-gray-900 border-r border-gray-300 dark:border-gray-600 flex flex-col'
      style={{ width: `${mediaPanelLayout.width}px` }}
    >
      <div className='p-3 border-b border-gray-200 dark:border-gray-700'>
        <div className='flex justify-between items-center mb-2 text-gray-700 dark:text-gray-300'>
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
          <div className='flex flex-wrap space-x-1'>
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
            <button onClick={onToggleFilters} className={`p-1.5 rounded ${showFilters ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`} title='Toggle Filters'><Filter size={16} /></button>
            <button onClick={onSelectAll} className='p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700' title='Select All'><CheckSquare size={16} /></button>
            <button onClick={onDeselectAll} className='p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700' title='Deselect All'><Square size={16} /></button>
            <button onClick={() => setShowSelectedOnly(prev => !prev)} disabled={selectedMediaItems.length === 0} className={`p-1.5 rounded ${showSelectedOnly ? 'bg-blue-100 text-blue-600' : selectedMediaItems.length > 0 ? 'hover:bg-gray-200' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`} title={showSelectedOnly ? 'Show All Media' : 'Show Selected Only'}>
              {showSelectedOnly ? <List size={16} /> : <FileText size={16} />}
            </button>
            <button onClick={onRemoveSelected} disabled={selectedMediaItems.length === 0} className={`p-1.5 rounded ${selectedMediaItems.length > 0 ? 'bg-red-100 text-red-600 hover:bg-red-200' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`} title='Remove Selected'><Trash2 size={16} /></button>
          </div>
        </div>
        <div className='relative mb-3'>
          <input type='text' value={searchTerm} onChange={e => onSearchChange(e.target.value)} placeholder='Search media...' className='w-full pl-8 pr-3 py-1.5 border rounded border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500' />
          <Search size={16} className='absolute left-2 top-2.5 text-gray-400' />
          {searchTerm && (<button onClick={() => onSearchChange('')} className='absolute right-2 top-2 text-gray-400 hover:text-gray-600'><X size={14} /></button>)}
        </div>
        <div className="flex items-center space-x-2 mb-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Sort by:</span>
          <button onClick={() => onSort('name')} className={`px-2 py-1 text-xs rounded flex items-center ${sortConfig.key === 'name' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600'}`} title='Sort by Name'>Name {getSortIcon('name')}</button>
          <button onClick={() => onSort('date')} className={`px-2 py-1 text-xs rounded flex items-center ${sortConfig.key === 'date' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600'}`} title='Sort by Date'>Date {getSortIcon('date')}</button>
          <button onClick={() => onSort('type')} className={`px-2 py-1 text-xs rounded flex items-center ${sortConfig.key === 'type' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600'}`} title='Sort by Type'>Type {getSortIcon('type')}</button>
          <button onClick={() => onSort('size')} className={`px-2 py-1 text-xs rounded flex items-center ${sortConfig.key === 'size' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600'}`} title='Sort by Size'>Size {getSortIcon('size')}</button>
        </div>

        {showFilters && (
          <div className='p-3 mb-1 bg-gray-50 dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700 flex flex-col gap-2 text-sm text-gray-700 dark:text-gray-300'>
            <div className="flex items-center justify-between">
              <span className="font-medium">Filter by Type</span>
              <button onClick={() => onFileFilterCategoryChange('all')} className="text-xs text-blue-600 dark:text-blue-400 hover:underline">Reset All</button>
            </div>
            {['image', 'video', 'audio'].map(category => (
              <div key={category} className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="flex items-center cursor-pointer">
                    <input type="checkbox" checked={areAllExtsInFilterCategoryActive(category)} onChange={() => onFileFilterCategoryChange(category)} className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:focus:ring-blue-600 dark:ring-offset-gray-800" />
                    <span className="ml-2 flex items-center capitalize">
                      {category === 'image' && <ImageIconLucide size={14} className="mr-1" />}
                      {category === 'video' && <VideoIconLucide size={14} className="mr-1" />}
                      {category === 'audio' && <MusicIconLucide size={14} className="mr-1" />}
                      {category}s
                    </span>
                  </label>
                  <div className="space-x-1 text-xs">
                    {(category === 'image' ? ['jpg', 'png', 'gif', 'webp', 'svg'] :
                      category === 'video' ? ['mp4', 'webm', 'mov', 'avi', 'mkv'] :
                        ['mp3', 'wav', 'ogg', 'flac']).map(ext => (
                          <button key={ext} onClick={() => onToggleFileTypeFilter(ext)}
                            className={`px-1.5 py-0.5 rounded ${fileTypeFilters[ext.toLowerCase()] ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'}`}>
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

      <div className='flex-grow overflow-y-auto pr-2 pl-1 pt-1'>
        {displayedMedia.length === 0 ? (
          <div className='text-center py-8 text-gray-500 dark:text-gray-400'>
            {mediaFiles.length === 0 ? 'No media files uploaded.' :
              showSelectedOnly ? 'No selected items match filters.' :
                'No media files match current filters.'}
          </div>
        ) : (
          <VirtualizedGrid
            items={displayedMedia}
            columns={mediaPanelLayout.columns}
            cellWidth={160}
            cellHeight={120}
            containerHeight={virtualizedGridHeight}
            renderItem={(media, displayedItemIndex) => {
              const originalIndex = mediaFiles.findIndex(m => m.id === media.id);
              if (originalIndex === -1) return null;

              const isSelected = selectedMediaItems.includes(originalIndex);
              const isHovered = hoveredItem?.type === 'media' && hoveredItem.idx === originalIndex;

              const autoplayProp = previewMode === 'live';
              const hoverPlayProp = previewMode === 'hover';

              return (
                <div
                  key={media.id || originalIndex}
                  className={`relative border rounded cursor-pointer overflow-hidden group m-1
                    ${isSelected ? 'border-blue-500 ring-2 ring-blue-300 dark:ring-blue-700'
                      : media.isPlaceholder || media.isMissing
                        ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/30'
                        : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500'}`}
                  draggable
                  onDragStart={e => e.dataTransfer.setData('text/plain', originalIndex.toString())}
                  onMouseEnter={() => {
                    onMediaItemHover({ type: 'media', idx: originalIndex });
                  }}
                  onMouseLeave={() => onMediaItemHover(null)}
                  onClick={e => { // Corrected onClick logic
                    if (e.shiftKey || e.ctrlKey || e.metaKey) {
                      onMediaItemSelect(originalIndex, e.shiftKey, e.ctrlKey || e.metaKey);
                    } else if (previewMode === 'off') {
                      onMediaItemSelect(originalIndex, false, false);
                    } else {
                      onMediaPreviewClick(media);
                    }
                  }}
                >
                  <div className='absolute top-1.5 left-1.5 z-10'>
                    <button onClick={(e) => { e.stopPropagation(); onMediaItemSelect(originalIndex, false, e.ctrlKey || e.metaKey); }}
                      className={`p-0.5 rounded ${isSelected ? 'bg-blue-500 text-white' : 'bg-white/70 hover:bg-gray-200 dark:bg-gray-800/70 dark:hover:bg-gray-700'}`}>
                      {isSelected ? <CheckSquare size={16} /> : <Square size={16} className="text-gray-500 dark:text-gray-400" />}
                    </button>
                  </div>
                  <div className='w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800'>
                    <MediaPreview
                      media={media}
                      selected={isSelected}
                      autoplay={autoplayProp}
                      hoverPlay={hoverPlayProp}
                      className='max-w-full max-h-full object-contain'
                    />
                  </div>
                  {isHovered && !media.isPlaceholder && !media.isMissing && (
                    <div className='absolute inset-0 bg-black bg-opacity-70 text-white p-2 text-xs flex flex-col pointer-events-none'>
                      <div className='flex justify-between items-start'>
                        <span className='font-medium truncate' title={media.name}>{media.name}</span>
                        <button onClick={e => { e.stopPropagation(); e.preventDefault(); onEditMetadata(originalIndex); }}
                          className='p-1 rounded-full bg-blue-500 text-white hover:bg-blue-600 pointer-events-auto' title='Edit metadata'>
                          <Edit size={14} />
                        </button>
                      </div>
                      <div className='mt-auto'>
                        <div className='flex items-center space-x-1'>
                          {isImage(media.type) && <ImageIconLucide size={12} />} {isVideo(media.type) && <VideoIconLucide size={12} />} {isAudio(media.type) && <MusicIconLucide size={12} />}
                          <span>{media.type}</span>
                        </div>
                        <div>{media.size}</div>
                        <div>{media.date}</div>
                      </div>
                    </div>
                  )}
                </div>
              );
            }}
          />
        )}
      </div>

      <div
        className='absolute top-0 right-0 bottom-0 w-2 cursor-ew-resize hover:bg-blue-300 dark:hover:bg-blue-700 opacity-50 hover:opacity-100 transition-opacity media-panel-resize-anchor'
        onMouseDown={e => { e.preventDefault(); onBeginResize(); }}
        title='Resize Media Panel'
      />
    </div>
  );
};

// #############################################################################
// Inline Child Component: GridBuilderPanel.jsx
// #############################################################################
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
}) => {
  const [previewMode, setPreviewMode] = useState('off');
  const [showGridControls, setShowGridControls] = useState(false);
  const [hideBorders, setHideBorders] = useState(false);
  const [freeGridMode, setFreeGridMode] = useState(false);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [snapToItems, setSnapToItems] = useState(true);
  const [snapDistance, setSnapDistance] = useState(10);
  const [isResizing, setIsResizing] = useState(false);
  const [resizingItem, setResizingItem] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedItem, setDraggedItem] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [showConnections, setShowConnections] = useState(true);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [activeTool, setActiveTool] = useState('select'); // 'select', 'text', 'pen', 'eraser', 'rotate'
  const [annotations, setAnnotations] = useState([]);
  const [currentAnnotation, setCurrentAnnotation] = useState(null);
  const [selectedItems, setSelectedItems] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [strokeColor, setStrokeColor] = useState('#FF0000');
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [textInput, setTextInput] = useState('');
  const [showTextInput, setShowTextInput] = useState(false);
  const [textInputPosition, setTextInputPosition] = useState({ x: 0, y: 0 });

  // Refs
  const gridContainerRef = useRef(null);
  const drawingCanvasRef = useRef(null);
  const lastPanPositionRef = useRef({ x: 0, y: 0 });

  // Store positions and dimensions of items in free-form layout
  const [freeGridItems, setFreeGridItems] = useState({});

  // Track natural dimensions of media items
  const [mediaDimensions, setMediaDimensions] = useState({});

  // For handling multiple item layout optimization
  const autoArrangeItems = useCallback(() => {
    if (!gridSlots.some(slot => slot !== null)) return;

    const newItems = {};
    const containerWidth = gridContainerRef.current?.clientWidth || 800;
    const maxWidth = containerWidth - 100;

    // Define a grid layout
    const GRID_SPACING = 20;
    let grid = [];
    let maxColumns = Math.floor(maxWidth / (gridConfig.cellWidth + GRID_SPACING));
    if (maxColumns < 1) maxColumns = 1;

    // Filter valid slots
    const validSlots = gridSlots.filter(slot => slot !== null);

    // Calculate row and column counts
    const totalItems = validSlots.length;
    const rows = Math.ceil(totalItems / maxColumns);
    const columns = Math.min(maxColumns, totalItems);

    // Create a grid
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < columns; c++) {
        const index = r * columns + c;
        if (index < totalItems) {
          const slot = validSlots[index];
          const width = mediaDimensions[slot.id]?.width || gridConfig.cellWidth;
          const height = mediaDimensions[slot.id]?.height || gridConfig.cellHeight;

          const originalIndex = gridSlots.findIndex(s => s && s.id === slot.id);

          const x = c * (gridConfig.cellWidth + GRID_SPACING) + GRID_SPACING;
          const y = r * (gridConfig.cellHeight + GRID_SPACING) + GRID_SPACING;

          newItems[slot.id] = {
            x: x,
            y: y,
            width: width,
            height: height,
            originalIndex: originalIndex,
            rotation: 0 // Default rotation
          };
        }
      }
    }

    setFreeGridItems(newItems);
  }, [gridSlots, gridConfig, mediaDimensions]);

  // Initialize free grid item positions
  useEffect(() => {
    if (freeGridMode && Object.keys(freeGridItems).length === 0 && gridSlots.some(slot => slot !== null)) {
      autoArrangeItems();
    }
  }, [freeGridMode, gridSlots, autoArrangeItems, freeGridItems]);

  // Handle switching to free grid mode
  useEffect(() => {
    if (freeGridMode) {
      // When switching to free grid, auto arrange all items
      autoArrangeItems();
    }
  }, [freeGridMode, autoArrangeItems]);

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

  // Handle zoom with mouse wheel
  const handleWheel = (e) => {
    // Only handle zoom if Ctrl key is pressed (standard zoom gesture)
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY < 0 ? 0.1 : -0.1;
      setZoomLevel(prev => {
        // Limit zoom bounds
        const newZoom = Math.max(0.1, Math.min(5, prev + delta));
        return newZoom;
      });
    }
    // Handle horizontal scroll with shift key
    else if (e.shiftKey && gridContainerRef.current) {
      e.preventDefault();
      gridContainerRef.current.scrollLeft += e.deltaY;
    }
  };

  // Handle panning with middle mouse button
  const handleMouseDown = (e) => {
    if (e.button === 1) { // Middle mouse button
      e.preventDefault();
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
      lastPanPositionRef.current = { x: e.clientX, y: e.clientY };
    }

    // Handle drawing with pen tool
    if (activeTool === 'pen' && e.button === 0) {
      e.preventDefault();
      const container = gridContainerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const x = (e.clientX - rect.left) / zoomLevel - panOffset.x;
      const y = (e.clientY - rect.top) / zoomLevel - panOffset.y;

      setIsDrawing(true);
      setCurrentAnnotation({
        id: `annotation-${Date.now()}`,
        type: 'path',
        color: strokeColor,
        width: strokeWidth,
        points: [`M ${x} ${y}`],
        zIndex: annotations.length + 1
      });
    }

    // Handle text tool
    if (activeTool === 'text' && e.button === 0) {
      e.preventDefault();
      const container = gridContainerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const x = (e.clientX - rect.left) / zoomLevel - panOffset.x;
      const y = (e.clientY - rect.top) / zoomLevel - panOffset.y;

      setShowTextInput(true);
      setTextInputPosition({ x, y });
      setTextInput('');
      setTimeout(() => {
        const input = document.getElementById('text-annotation-input');
        if (input) input.focus();
      }, 10);
    }

    // Handle eraser tool
    if (activeTool === 'eraser' && e.button === 0) {
      e.preventDefault();
      const container = gridContainerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const x = (e.clientX - rect.left) / zoomLevel - panOffset.x;
      const y = (e.clientY - rect.top) / zoomLevel - panOffset.y;

      // Find and remove annotations that are near this point
      setAnnotations(prev =>
        prev.filter(anno => {
          if (anno.type === 'path') {
            // For paths, check if any point is near
            const points = anno.points.map(p => {
              const coords = p.split(' ');
              if (coords[0] === 'M' || coords[0] === 'L') {
                return { x: parseFloat(coords[1]), y: parseFloat(coords[2]) };
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
        })
      );
    }

    // Handle selection with select tool
    if (activeTool === 'select' && e.button === 0) {
      // Check if clicked on an item
      const container = gridContainerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const x = (e.clientX - rect.left) / zoomLevel - panOffset.x;
      const y = (e.clientY - rect.top) / zoomLevel - panOffset.y;

      // Check if clicked on an existing item
      let clickedOnItem = false;
      let clickedItemId = null;

      Object.entries(freeGridItems).forEach(([id, item]) => {
        if (
          x >= item.x &&
          x <= item.x + item.width &&
          y >= item.y &&
          y <= item.y + item.height
        ) {
          clickedOnItem = true;
          clickedItemId = id;
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
  };

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

    // Handle drawing with pen tool
    if (isDrawing && activeTool === 'pen') {
      const container = gridContainerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const x = (e.clientX - rect.left) / zoomLevel - panOffset.x;
      const y = (e.clientY - rect.top) / zoomLevel - panOffset.y;

      setCurrentAnnotation(prev => {
        if (!prev) return null;
        return {
          ...prev,
          points: [...prev.points, `L ${x} ${y}`]
        };
      });
    }
  };

  const handleMouseUp = (e) => {
    // End panning
    if (isPanning) {
      setIsPanning(false);
    }

    // End drawing
    if (isDrawing && activeTool === 'pen') {
      setIsDrawing(false);
      if (currentAnnotation) {
        setAnnotations(prev => [...prev, currentAnnotation]);
        setCurrentAnnotation(null);
      }
    }
  };

  // Handle text input completion
  const handleTextInputComplete = () => {
    if (textInput.trim() === '') {
      setShowTextInput(false);
      return;
    }

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

  // Get dimensions of media items (especially images)
  const updateMediaDimensions = (mediaId, width, height) => {
    setMediaDimensions(prev => ({
      ...prev,
      [mediaId]: { width, height }
    }));

    // Update free grid item if it exists
    if (freeGridItems[mediaId]) {
      setFreeGridItems(prev => ({
        ...prev,
        [mediaId]: {
          ...prev[mediaId],
          width,
          height
        }
      }));
    }
  };

  // Helper to find snap points (improved for multi-item handling)
  const findSnapPoints = (item, currentX, currentY) => {
    if (!snapToItems) return { x: currentX, y: currentY };

    let bestX = currentX;
    let bestY = currentY;
    let minXDiff = snapDistance;
    let minYDiff = snapDistance;

    // Check snapping against every other item
    Object.entries(freeGridItems).forEach(([id, otherItem]) => {
      if (id === item.id || (item.ids && item.ids.includes(id))) return;

      // Edge alignment (left, right, top, bottom)
      const xLeftDiff = Math.abs(otherItem.x - currentX);
      const xRightDiff = Math.abs((otherItem.x + otherItem.width) - (currentX + item.width));
      const yTopDiff = Math.abs(otherItem.y - currentY);
      const yBottomDiff = Math.abs((otherItem.y + otherItem.height) - (currentY + item.height));

      // Right to left alignment
      const xRightToLeftDiff = Math.abs(otherItem.x - (currentX + item.width));
      // Left to right alignment
      const xLeftToRightDiff = Math.abs((otherItem.x + otherItem.width) - currentX);

      // Bottom to top alignment
      const yBottomToTopDiff = Math.abs(otherItem.y - (currentY + item.height));
      // Top to bottom alignment
      const yTopToBottomDiff = Math.abs((otherItem.y + otherItem.height) - currentY);

      // Center alignment
      const xCenterDiff = Math.abs((otherItem.x + otherItem.width / 2) - (currentX + item.width / 2));
      const yCenterDiff = Math.abs((otherItem.y + otherItem.height / 2) - (currentY + item.height / 2));

      // Find best X snap
      [xCenterDiff, xLeftDiff, xRightDiff, xRightToLeftDiff, xLeftToRightDiff].forEach(diff => {
        if (diff < minXDiff) {
          minXDiff = diff;
          if (diff === xCenterDiff) {
            bestX = otherItem.x + otherItem.width / 2 - item.width / 2;
          } else if (diff === xLeftDiff) {
            bestX = otherItem.x;
          } else if (diff === xRightDiff) {
            bestX = otherItem.x + otherItem.width - item.width;
          } else if (diff === xRightToLeftDiff) {
            bestX = otherItem.x - item.width;
          } else if (diff === xLeftToRightDiff) {
            bestX = otherItem.x + otherItem.width;
          }
        }
      });

      // Find best Y snap
      [yCenterDiff, yTopDiff, yBottomDiff, yBottomToTopDiff, yTopToBottomDiff].forEach(diff => {
        if (diff < minYDiff) {
          minYDiff = diff;
          if (diff === yCenterDiff) {
            bestY = otherItem.y + otherItem.height / 2 - item.height / 2;
          } else if (diff === yTopDiff) {
            bestY = otherItem.y;
          } else if (diff === yBottomDiff) {
            bestY = otherItem.y + otherItem.height - item.height;
          } else if (diff === yBottomToTopDiff) {
            bestY = otherItem.y - item.height;
          } else if (diff === yTopToBottomDiff) {
            bestY = otherItem.y + otherItem.height;
          }
        }
      });
    });

    return { x: bestX, y: bestY };
  };

  // Handle start of dragging (support for multiple selection)
  const handleDragStart = (e, slot, slotIndex) => {
    if (!freeGridItems[slot.id]) return;

    const container = gridContainerRef.current;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    const item = freeGridItems[slot.id];

    // Calculate offset within the item where mouse was clicked
    const offsetX = e.clientX - (containerRect.left + item.x * zoomLevel + panOffset.x * zoomLevel);
    const offsetY = e.clientY - (containerRect.top + item.y * zoomLevel + panOffset.y * zoomLevel);

    // Check if we're dragging multiple items
    const isMultiDrag = selectedItems.length > 1 && selectedItems.includes(slot.id);

    if (isMultiDrag) {
      // Create a bounding box for all selected items
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
            offsetY: selectedItem.y - minY
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

    // Custom drag image to make it more fluid
    const dragImg = document.createElement('div');
    dragImg.style.width = '1px';
    dragImg.style.height = '1px';
    dragImg.style.opacity = '0.01';
    document.body.appendChild(dragImg);
    e.dataTransfer.setDragImage(dragImg, 0, 0);

    // Set drag data for compatibility
    const mediaOriginalIndex = mediaFiles.findIndex(m => m && slot && m.id === slot.id);
    if (mediaOriginalIndex !== -1) {
      e.dataTransfer.setData('text/plain', mediaOriginalIndex.toString());
      e.dataTransfer.setData('application/grid-slot', slotIndex.toString());
      e.dataTransfer.effectAllowed = 'move';
    }

    e.stopPropagation();
  };

  // Handle multiple items being dragged
  const handleMultiDrag = (e) => {
    const container = gridContainerRef.current;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();

    // Calculate new position for the group
    let newX = (e.clientX - containerRect.left - dragOffset.x) / zoomLevel - panOffset.x;
    let newY = (e.clientY - containerRect.top - dragOffset.y) / zoomLevel - panOffset.y;

    // Snap to grid if enabled
    if (snapToGrid) {
      const gridSize = 20;
      newX = Math.round(newX / gridSize) * gridSize;
      newY = Math.round(newY / gridSize) * gridSize;
    }

    // Find snap points if snapping to items
    if (snapToItems) {
      const snapResult = findSnapPoints(draggedItem, newX, newY);
      newX = snapResult.x;
      newY = snapResult.y;
    }

    // Ensure bounds
    newX = Math.max(0, newX);
    newY = Math.max(0, newY);

    // Update positions for all items in the selection
    const updatedItems = {};

    draggedItem.offsets.forEach(offset => {
      const itemX = newX + offset.offsetX;
      const itemY = newY + offset.offsetY;
      const currentItem = freeGridItems[offset.id];

      updatedItems[offset.id] = {
        ...currentItem,
        x: itemX,
        y: itemY
      };
    });

    setFreeGridItems(prev => ({
      ...prev,
      ...updatedItems
    }));
  };

  // Handle drag over for standard items
  const handleSingleDrag = (e) => {
    const container = gridContainerRef.current;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    const item = freeGridItems[draggedItem];

    // Calculate new position
    let newX = (e.clientX - containerRect.left - dragOffset.x) / zoomLevel - panOffset.x;
    let newY = (e.clientY - containerRect.top - dragOffset.y) / zoomLevel - panOffset.y;

    // Snap to grid if enabled
    if (snapToGrid) {
      const gridSize = 20;
      newX = Math.round(newX / gridSize) * gridSize;
      newY = Math.round(newY / gridSize) * gridSize;
    }

    // Find snap points if snapping to items
    if (snapToItems) {
      const snapResult = findSnapPoints(item, newX, newY);
      newX = snapResult.x;
      newY = snapResult.y;
    }

    // Ensure item stays within container
    newX = Math.max(0, newX);
    newY = Math.max(0, newY);

    // Update position
    setFreeGridItems(prev => ({
      ...prev,
      [draggedItem]: {
        ...prev[draggedItem],
        x: newX,
        y: newY
      }
    }));
  };

  // Handle drag over for either single or multiple items
  const handleDragOver = (e) => {
    e.preventDefault();

    if (!isDragging || !draggedItem) return;

    if (typeof draggedItem === 'object' && draggedItem.id === 'multi-selection') {
      handleMultiDrag(e);
    } else {
      handleSingleDrag(e);
    }
  };

  // Handle drop for final placement
  const handleDrop = (e) => {
    e.preventDefault();

    // If dropping a new item from media panel
    const mediaOriginalIndexString = e.dataTransfer.getData('text/plain');
    if (mediaOriginalIndexString && !isDragging) {
      const mediaOriginalIndex = parseInt(mediaOriginalIndexString, 10);
      const media = mediaFiles[mediaOriginalIndex];

      if (media) {
        // Find a good position for the new item
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

    setIsDragging(false);
    setDraggedItem(null);
  };

  // Handle drag end for cleanup
  const handleDragEnd = () => {
    setIsDragging(false);
    setDraggedItem(null);
  };

  // Rotate selected items
  const rotateSelectedItems = (degrees) => {
    if (selectedItems.length === 0) return;

    const updatedItems = {};

    selectedItems.forEach(id => {
      const item = freeGridItems[id];
      if (item) {
        updatedItems[id] = {
          ...item,
          rotation: (item.rotation || 0) + degrees
        };
      }
    });

    setFreeGridItems(prev => ({
      ...prev,
      ...updatedItems
    }));
  };

  // Find connections between items for visual effect
  const findConnections = () => {
    if (!showConnections) return [];

    const connections = [];
    const items = Object.entries(freeGridItems);

    for (let i = 0; i < items.length; i++) {
      const [id1, item1] = items[i];

      for (let j = i + 1; j < items.length; j++) {
        const [id2, item2] = items[j];

        // Check if items are touching or very close
        const isConnectedHorizontally =
          Math.abs((item1.x + item1.width) - item2.x) < 2 ||
          Math.abs((item2.x + item2.width) - item1.x) < 2;

        const isConnectedVertically =
          Math.abs((item1.y + item1.height) - item2.y) < 2 ||
          Math.abs((item2.y + item2.height) - item1.y) < 2;

        const hasHorizontalOverlap =
          (item1.x < item2.x + item2.width && item1.x + item1.width > item2.x);

        const hasVerticalOverlap =
          (item1.y < item2.y + item2.height && item1.y + item1.height > item2.y);

        if ((isConnectedHorizontally && hasVerticalOverlap) ||
          (isConnectedVertically && hasHorizontalOverlap)) {
          connections.push({ from: id1, to: id2 });
        }
      }
    }

    return connections;
  };

  // Calculate connections for visual effect
  const connections = useMemo(() => {
    return freeGridMode ? findConnections() : [];
  }, [freeGridMode, freeGridItems, showConnections]);

  return (
    <div className="flex-1 overflow-auto p-4 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100">
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
            <GridIcon size={18} className={hideBorders ? 'opacity-30' : 'opacity-100'} />
          </button>
          <button
            onClick={() => setFreeGridMode(!freeGridMode)}
            title={freeGridMode ? "Use standard grid layout" : "Use free-form grid layout"}
            className={`p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 ${freeGridMode ? 'text-blue-500 dark:text-blue-400' : 'text-gray-600 dark:text-gray-300'}`}
          >
            <Move size={18} />
          </button>
          {freeGridMode && (
            <>
              <button
                onClick={() => setSnapToItems(!snapToItems)}
                title={snapToItems ? "Disable magnetic snapping" : "Enable magnetic snapping"}
                className={`p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 ${snapToItems ? 'text-blue-500 dark:text-blue-400' : 'text-gray-600 dark:text-gray-300'}`}
              >
                <Target size={18} />
              </button>
              <button
                onClick={() => setSnapToGrid(!snapToGrid)}
                title={snapToGrid ? "Disable grid snapping" : "Enable grid snapping"}
                className={`p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 ${snapToGrid ? 'text-blue-500 dark:text-blue-400' : 'text-gray-600 dark:text-gray-300'}`}
              >
                <GridIcon size={18} />
              </button>
              <button
                onClick={() => setShowConnections(!showConnections)}
                title={showConnections ? "Hide item connections" : "Show item connections"}
                className={`p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 ${showConnections ? 'text-blue-500 dark:text-blue-400' : 'text-gray-600 dark:text-gray-300'}`}
              >
                <Columns size={18} />
              </button>
              <button
                onClick={autoArrangeItems}
                title="Auto-arrange items in grid"
                className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
              >
                <LayoutGrid size={18} />
              </button>
              <div className="h-5 w-px bg-gray-300 dark:bg-gray-600 mx-1"></div> {/* Divider */}
              <button
                onClick={() => setActiveTool(activeTool === 'select' ? 'pen' : 'select')}
                title={activeTool === 'select' ? "Switch to Pen Tool" : "Switch to Select Tool"}
                className={`p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 ${activeTool === 'pen' ? 'text-blue-500 dark:text-blue-400' : 'text-gray-600 dark:text-gray-300'}`}
              >
                <Pencil size={18} />
              </button>
              <button
                onClick={() => setActiveTool(activeTool === 'select' ? 'text' : 'select')}
                title={activeTool === 'select' ? "Switch to Text Tool" : "Switch to Select Tool"}
                className={`p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 ${activeTool === 'text' ? 'text-blue-500 dark:text-blue-400' : 'text-gray-600 dark:text-gray-300'}`}
              >
                <Type size={18} />
              </button>
              <button
                onClick={() => setActiveTool(activeTool === 'select' ? 'eraser' : 'select')}
                title={activeTool === 'select' ? "Switch to Eraser Tool" : "Switch to Select Tool"}
                className={`p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 ${activeTool === 'eraser' ? 'text-blue-500 dark:text-blue-400' : 'text-gray-600 dark:text-gray-300'}`}
              >
                <Eraser size={18} />
              </button>
              <button
                onClick={() => rotateSelectedItems(90)}
                title="Rotate selected items 90°"
                className={`p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 ${selectedItems.length > 0 ? 'text-gray-600 dark:text-gray-300' : 'text-gray-400 dark:text-gray-600 cursor-not-allowed'}`}
                disabled={selectedItems.length === 0}
              >
                <RotateCw size={18} />
              </button>
              <div className="relative">
                <input
                  type="color"
                  value={strokeColor}
                  onChange={(e) => setStrokeColor(e.target.value)}
                  className="absolute opacity-0 inset-0 cursor-pointer"
                />
                <div
                  className="w-5 h-5 rounded border border-gray-300 dark:border-gray-600"
                  style={{ backgroundColor: strokeColor }}
                ></div>
              </div>
            </>
          )}

          <div className="h-5 w-px bg-gray-300 dark:bg-gray-600 mx-1"></div> {/* Divider */}

          <button
            onClick={onToggleAllowDuplicates}
            title={allowDuplicates ? "Prevent duplicates in grid" : "Allow duplicates in grid"}
            className={`p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 ${allowDuplicates ? 'text-blue-500 dark:text-blue-400' : 'text-gray-600 dark:text-gray-300'}`}
          >
            <Copy size={18} />
          </button>
          <button
            onClick={onToggleAllowNudging}
            title={allowNudging ? "Disable nudging items in grid" : "Enable nudging items in grid"}
            className={`p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 ${allowNudging ? 'text-blue-500 dark:text-blue-400' : 'text-gray-600 dark:text-gray-300'}`}
          >
            <MoveHorizontal size={18} />
          </button>
          <button
            onClick={onToggleMarkSelection}
            title={markSelection ? "Disable grid click selection" : "Enable grid click selection (Ctrl/Shift to add to selection)"}
            className={`p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 ${markSelection ? 'text-blue-500 dark:text-blue-400' : 'text-gray-600 dark:text-gray-300'}`}
          >
            <Target size={18} />
          </button>
          <button
            onClick={onClearGrid}
            title="Clear all items from grid"
            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
          >
            <Trash2 size={18} />
          </button>
          <button
            onClick={onAddRandomMedia}
            title="Add random media to empty grid slots"
            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
          >
            <Dice5 size={18} />
          </button>
        </div>
      </div>

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
                    onClick={() => setZoomLevel(prev => Math.max(0.1, prev - 0.1))}
                    className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-xs flex items-center"
                  >
                    <ZoomOut size={12} className="mr-1" /> Zoom Out
                  </button>
                  <button
                    onClick={() => setZoomLevel(1)}
                    className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-xs flex items-center"
                  >
                    <Maximize size={12} className="mr-1" /> Reset
                  </button>
                  <button
                    onClick={() => setZoomLevel(prev => Math.min(5, prev + 0.1))}
                    className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-xs flex items-center"
                  >
                    <ZoomIn size={12} className="mr-1" /> Zoom In
                  </button>
                </div>
              </div>
            </div>
          )}
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
                                {isImage(slot.type) && <ImageIconLucide size={12} className="mr-1 flex-shrink-0" />}
                                {isVideo(slot.type) && <VideoIconLucide size={12} className="mr-1 flex-shrink-0" />}
                                {isAudio(slot.type) && <MusicIconLucide size={12} className="mr-1 flex-shrink-0" />}
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
            cursor: isPanning ? 'grabbing' : (activeTool === 'pen' ? 'crosshair' : (activeTool === 'eraser' ? 'not-allowed' : 'default'))
          }}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {/* Zoom and Pan Container */}
          <div
            className="absolute left-0 top-0 w-full h-full"
            style={{
              transform: `scale(${zoomLevel}) translate(${panOffset.x}px, ${panOffset.y}px)`,
              transformOrigin: '0 0'
            }}
          >
            {/* Grid guidelines */}
            {snapToGrid && !hideBorders && (
              <div className="absolute inset-0 pointer-events-none">
                <div className="w-full h-full" style={{
                  backgroundSize: '20px 20px',
                  backgroundImage: 'linear-gradient(to right, rgba(128, 128, 128, 0.1) 1px, transparent 1px), linear-gradient(to bottom, rgba(128, 128, 128, 0.1) 1px, transparent 1px)',
                  width: '4000px',
                  height: '4000px'
                }}></div>
              </div>
            )}

            {/* Connection lines between items */}
            {connections.map((connection, index) => {
              const item1 = freeGridItems[connection.from];
              const item2 = freeGridItems[connection.to];

              if (!item1 || !item2) return null;

              // Find connection points
              const startX = item1.x + item1.width / 2;
              const startY = item1.y + item1.height / 2;
              const endX = item2.x + item2.width / 2;
              const endY = item2.y + item2.height / 2;

              return (
                <div
                  key={`connection-${index}`}
                  className="absolute pointer-events-none z-0"
                  style={{
                    left: Math.min(startX, endX),
                    top: Math.min(startY, endY),
                    width: Math.abs(startX - endX),
                    height: Math.abs(startY - endY),
                    overflow: 'visible'
                  }}
                >
                  <svg width="100%" height="100%" className="absolute left-0 top-0">
                    <line
                      x1={startX < endX ? 0 : '100%'}
                      y1={startY < endY ? 0 : '100%'}
                      x2={startX < endX ? '100%' : 0}
                      y2={startY < endY ? '100%' : 0}
                      stroke="rgba(59, 130, 246, 0.5)"
                      strokeWidth="2"
                      strokeDasharray="4 2"
                    />
                  </svg>
                </div>
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
            {currentAnnotation && (
              <svg
                className="absolute left-0 top-0 w-full h-full pointer-events-none"
                style={{ zIndex: 1000 }}
              >
                <path
                  d={currentAnnotation.points.join(' ')}
                  stroke={currentAnnotation.color}
                  strokeWidth={currentAnnotation.width}
                  fill="none"
                />
              </svg>
            )}

            {/* Media items in free grid */}
            {gridSlots.filter(Boolean).map((slot, idx) => {
              const slotIndex = gridSlots.findIndex(s => s && s.id === slot.id);
              const isCurrentlyHovered = hoveredItem?.type === 'slot' && hoveredItem.idx === slotIndex;
              const autoplayProp = previewMode === 'live';
              const hoverPlayProp = previewMode === 'hover';
              const itemPosition = freeGridItems[slot.id] || {
                x: 20,
                y: 20,
                width: mediaDimensions[slot.id]?.width || gridConfig.cellWidth,
                height: mediaDimensions[slot.id]?.height || gridConfig.cellHeight,
                rotation: 0
              };

              const isSelected = selectedItems.includes(slot.id);
              const isConnected = connections.some(conn =>
                conn.from === slot.id || conn.to === slot.id
              );

              return (
                <div
                  key={slot.id || idx}
                  className={`absolute ${hideBorders ? '' : 'border border-gray-300 dark:border-gray-600'} flex items-center justify-center
                              bg-white dark:bg-gray-800
                              ${isSelected ? 'ring-2 ring-blue-500 z-20' : isConnected ? 'ring-1 ring-blue-300 dark:ring-blue-600 z-10' : ''}
                              ${isDragging && (draggedItem === slot.id || (typeof draggedItem === 'object' && draggedItem?.ids?.includes(slot.id))) ? 'opacity-70' : 'opacity-100'}
                              ${hideBorders ? 'hover:ring-2 hover:ring-blue-300 dark:hover:ring-blue-600' : 'hover:border-blue-500 dark:hover:border-blue-400'}
                              ${activeTool === 'select' ? 'cursor-grab' : 'cursor-default'} transition-all duration-100 ease-in-out overflow-hidden rounded-md shadow-sm`}
                  style={{
                    width: `${itemPosition.width}px`,
                    height: `${itemPosition.height}px`,
                    left: `${itemPosition.x}px`,
                    top: `${itemPosition.y}px`,
                    transform: itemPosition.rotation ? `rotate(${itemPosition.rotation}deg)` : 'none',
                    transition: isDragging && (draggedItem === slot.id || (typeof draggedItem === 'object' && draggedItem?.ids?.includes(slot.id))) ? 'none' : 'all 0.1s ease'
                  }}
                  onMouseEnter={() => onHover({ type: 'slot', idx: slotIndex })}
                  onMouseLeave={() => onHover(null)}
                  onClick={(e) => {
                    if (activeTool === 'select') {
                      if (markSelection && (e.ctrlKey || e.metaKey || e.shiftKey)) {
                        onSelectGridItem(slotIndex, e.shiftKey, e.ctrlKey || e.metaKey);
                      } else if (previewMode === 'off') {
                        if (markSelection) onSelectGridItem(slotIndex, false, false);
                      } else {
                        onPreviewMedia(slot);
                      }
                    }
                  }}
                  draggable={activeTool === 'select'}
                  onDragStart={(e) => activeTool === 'select' && handleDragStart(e, slot, slotIndex)}
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
                    {isCurrentlyHovered && previewMode !== 'hover' && activeTool === 'select' && (
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
                                {isImage(slot.type) && <ImageIconLucide size={12} className="mr-1 flex-shrink-0" />}
                                {isVideo(slot.type) && <VideoIconLucide size={12} className="mr-1 flex-shrink-0" />}
                                {isAudio(slot.type) && <MusicIconLucide size={12} className="mr-1 flex-shrink-0" />}
                                <span className="truncate">{slot.type}</span>
                              </div>
                              <div className="truncate">Size: {slot.size}</div>
                            </>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Rotate Handle */}
                    {isSelected && activeTool === 'select' && (
                      <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-6 cursor-move w-5 h-5 bg-blue-500 rounded-full z-30 flex items-center justify-center text-white">
                        <RotateCw size={12} />
                      </div>
                    )}

                    {/* Resize Handle */}
                    {activeTool === 'select' && (
                      <div className="absolute bottom-0 right-0 w-6 h-6 cursor-se-resize pointer-events-auto z-10 opacity-0 group-hover:opacity-100"
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          setIsResizing(true);
                          setResizingItem({
                            id: slot.id,
                            startWidth: itemPosition.width,
                            startHeight: itemPosition.height,
                            startX: e.clientX,
                            startY: e.clientY
                          });
                        }}
                      >
                        <div className="w-0 h-0 border-t-0 border-r-0 border-b-[6px] border-l-0 border-r-[6px] border-solid border-transparent border-b-gray-400"></div>
                      </div>
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

          {/* Zoom controls */}
          <div className="absolute bottom-4 right-4 bg-white dark:bg-gray-800 rounded shadow p-1 flex flex-col opacity-70 hover:opacity-100 transition-opacity">
            <button
              onClick={() => setZoomLevel(prev => Math.min(5, prev + 0.1))}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              title="Zoom In"
            >
              <ZoomIn size={16} />
            </button>
            <div className="text-xs text-center my-1">{Math.round(zoomLevel * 100)}%</div>
            <button
              onClick={() => setZoomLevel(prev => Math.max(0.1, prev - 0.1))}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              title="Zoom Out"
            >
              <ZoomOut size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Resizing event handlers */}
      {isResizing && (
        <div className="fixed inset-0 cursor-se-resize z-[1000]"
          onMouseMove={(e) => {
            if (!resizingItem) return;

            const deltaX = e.clientX - resizingItem.startX;
            const deltaY = e.clientY - resizingItem.startY;

            const newWidth = Math.max(50, resizingItem.startWidth + deltaX / zoomLevel);
            const newHeight = Math.max(50, resizingItem.startHeight + deltaY / zoomLevel);

            setFreeGridItems(prev => ({
              ...prev,
              [resizingItem.id]: {
                ...prev[resizingItem.id],
                width: newWidth,
                height: newHeight
              }
            }));
          }}
          onMouseUp={() => {
            setIsResizing(false);
            setResizingItem(null);
          }}
        />
      )}
    </div>
  );
};


// #############################################################################
// Main App Component: EnhancedMediaGridApp
// #############################################################################
const EnhancedMediaGridApp = ({ darkMode, setDarkMode }) => {
  const [mediaFiles, setMediaFiles] = useState([]);
  const [filteredMediaFiles, setFilteredMediaFiles] = useState([]);
  const [gridSlots, setGridSlots] = useState(Array(20).fill(null));
  const [freeGridItems, setFreeGridItems] = useState({});
  const [freeGridMode, setFreeGridMode] = useState(false);


  const [hoveredItem, setHoveredItem] = useState(null);
  const [allowDuplicates, setAllowDuplicates] = useState(false);
  const [markSelection, setMarkSelection] = useState(false);
  const [repeatGridPlaylist, setRepeatGridPlaylist] = useState(false);
  const [allowNudging, setAllowNudging] = useState(false);
  const [gridConfig, setGridConfig] = useState({
    columns: 4, rows: 5, cellWidth: 160, cellHeight: 120
  });
  const [gridHasOverflow, setGridHasOverflow] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [mediaPanelLayout, setMediaPanelLayout] = useState({ columns: 1, width: 280 });
  const [mediaPanelCollapsed, setMediaPanelCollapsed] = useState(false);
  const [mediaPanelPinned, setMediaPanelPinned] = useState(false);
  const [thumbnailSize, setThumbnailSize] = useState('l'); // 's', 'm', 'l'
  const [showIndexPanel, setShowIndexPanel] = useState(true);
  const [indexPanelWidth, setIndexPanelWidth] = useState(300);
  const [showConsolePanel, setShowConsolePanel] = useState(false);
  const [consolePanelWidth, setConsolePanelWidth] = useState(350);
  const [showEnlargedPreview, setShowEnlargedPreview] = useState(false);
  const [previewMedia, setPreviewMedia] = useState(null);
  const [modalMediaList, setModalMediaList] = useState([]);
  const [editingMediaName, setEditingMediaName] = useState(null);
  const [editedMediaNameValue, setEditedMediaNameValue] = useState("");
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showUpdateIndexDialog, setShowUpdateIndexDialog] = useState(false);
  const [showJsonEditor, setShowJsonEditor] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showLoadDialog, setShowLoadDialog] = useState(false);
  const [showFileOperationsDialog, setShowFileOperationsDialog] = useState(false);
  const [exportData, setExportData] = useState({ title: "", author: "Emmanuel Whyte", description: "", slot: "", frontCover: "", backCover: "", jsonPath: "" });
  const [updateIndexData, setUpdateIndexData] = useState({ title: "", author: "Emmanuel Whyte", description: "", slot: "", frontCover: "", backCover: "", jsonPath: "", indexPath: "/index.json" });
  const [jsonTemplate, setJsonTemplate] = useState({ "title": "Media Collection", "author": "User", "dateCreated": new Date().toISOString().split('T')[0], "items": [] });
  const [jsonTemplatePresets, setJsonTemplatePresets] = useState([
    { name: "default", template: { "title": "Media Collection", "author": "User", "dateCreated": new Date().toISOString().split('T')[0], "items": [] } },
    { name: "detailed", template: { "collection": { "title": "Media Collection", "author": "User", "dateCreated": new Date().toISOString().split('T')[0], "description": "", "items": [], "metadata": { "totalItems": 0, "totalSize": "0 KB", "categories": [] } } } },
    { name: "minimal", template: { "items": [] } }
  ]);
  const [indexData, setIndexData] = useState([]);
  const [editingIndex, setEditingIndex] = useState(false);
  const [editedIndexJson, setEditedIndexJson] = useState('');
  const [savedProjects, setSavedProjects] = useState([]);
  const [projectName, setProjectName] = useState('');
  const [commandHistory, setCommandHistory] = useState([]);
  const [selectedMediaItems, setSelectedMediaItems] = useState([]);
  const [lastSelectedIndex, setLastSelectedIndex] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [fileTypeFilters, setFileTypeFilters] = useState({
    jpg: true, jpeg: true, png: true, gif: true, webp: true, svg: true,
    mp4: true, webm: true, mov: true, avi: true, mkv: true,
    mp3: true, wav: true, ogg: true, flac: true
  });
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });
  const [isResizingMediaPanel, setIsResizingMediaPanel] = useState(false);
  const [isResizingIndexPanel, setIsResizingIndexPanel] = useState(false);
  const [isResizingConsolePanel, setIsResizingConsolePanel] = useState(false);

  const fileInputRef = useRef(null);
  const folderInputRef = useRef(null);
  const indexFileInputRef = useRef(null);

  const cleanupMediaResource = useCallback((mediaItem, shouldRevokeUrl = false) => {
    if (!mediaItem) return;
    const itemUrl = mediaItem.url;
    const itemName = mediaItem.name;

    if (mediaItem.releaseUrl && typeof mediaItem.releaseUrl === 'function') {
      try {
        mediaItem.releaseUrl();
      } catch (error) {
        console.warn(`Error in mediaItem.releaseUrl() for ${itemName}:`, error);
      }
    } else if (shouldRevokeUrl && itemUrl && typeof itemUrl === 'string' && itemUrl.startsWith('blob:')) {
      try {
        URL.revokeObjectURL(itemUrl);
      } catch (error) {
        console.warn(`Error revoking object URL for ${itemName} (fallback):`, error);
      }
    }
  }, []);

  const addCommandToHistory = (type, commands, platform = null) => {
    setCommandHistory(prevHistory => [
      { id: self.crypto.randomUUID(), timestamp: new Date().toISOString(), type, commands, platform },
      ...prevHistory
    ].slice(0, 50));
  };

  const clearCommandHistory = () => setCommandHistory([]);
  const handleToggleAllowDuplicates = () => setAllowDuplicates(prev => !prev);
  const handleToggleAllowNudging = () => setAllowNudging(prev => !prev);
  const handleToggleMarkSelection = () => setMarkSelection(prev => !prev);

  const handleClearGrid = () => {
    if (window.confirm("Are you sure you want to clear the entire grid? This action cannot be undone.")) {
      const newGridSize = gridConfig.columns * gridConfig.rows;
      setGridSlots(Array(Math.max(newGridSize, 20)).fill(null));
    }
  };

  const handleAddRandomMedia = () => {
    const availableMedia = mediaFiles.filter(mf => !mf.isMissing && !mf.isPlaceholder);
    if (availableMedia.length === 0) {
      alert("No media files available to add to the grid. Please upload some files first.");
      return;
    }
    const newGrid = [...gridSlots];
    const totalVisibleSlots = gridConfig.columns * gridConfig.rows;
    let changed = false;
    for (let i = 0; i < totalVisibleSlots; i++) {
      if (newGrid[i] === null) {
        const randomIndex = Math.floor(Math.random() * availableMedia.length);
        if (!allowDuplicates) {
          if (newGrid.some(slot => slot && slot.id === availableMedia[randomIndex].id)) {
            let attempts = 0;
            let uniqueFound = false;
            while (attempts < 5 && !uniqueFound) {
              const nextRandomIndex = Math.floor(Math.random() * availableMedia.length);
              if (!newGrid.some(slot => slot && slot.id === availableMedia[nextRandomIndex].id)) {
                newGrid[i] = availableMedia[nextRandomIndex];
                uniqueFound = true;
                changed = true;
              }
              attempts++;
            }
            if (!uniqueFound) console.log("Could not find a unique random item for slot", i);
            continue;
          }
        }
        newGrid[i] = availableMedia[randomIndex];
        changed = true;
      }
    }
    if (changed) setGridSlots(newGrid);
    else alert("No empty slots to fill, or no unique media found (if duplicates are off).");
  };

  const handleFilesSelected = useCallback((inputFiles) => {
    const newMediaObjects = Array.from(inputFiles)
      .map(rawFile => {
        const processed = processFile(rawFile);
        if (processed) {
          if (!processed.id) {
            processed.id = `${rawFile.name}-${rawFile.size}-${rawFile.lastModified}-${Math.random().toString(36).substr(2, 9)}`;
          }
          processed.userPath = rawFile.webkitRelativePath || rawFile.name;
          if (!processed.metadata) {
            processed.metadata = { title: getFilename(processed.name || rawFile.name) };
          }
          if (!processed.metadata.category) {
            processed.metadata.category = getFileTypeCategory(processed);
          }
        }
        return processed;
      })
      .filter(item => item !== null);

    if (newMediaObjects.length > 0) {
      setMediaFiles(prev => {
        const existingIds = new Set(prev.map(f => f.id));
        const trulyNewFiles = newMediaObjects.filter(nm => !existingIds.has(nm.id));
        newMediaObjects.forEach(nm => {
          if (existingIds.has(nm.id)) {
            cleanupMediaResource(nm, true);
          }
        });
        return [...prev, ...trulyNewFiles];
      });
    }
  }, [cleanupMediaResource]);


  const selectAllMediaItems = useCallback(() => {
    const allIndicesInView = filteredMediaFiles
      .map(filteredFile => mediaFiles.findIndex(originalFile => originalFile.id === filteredFile.id))
      .filter(idx => idx !== -1);
    setSelectedMediaItems(allIndicesInView);
    setLastSelectedIndex(allIndicesInView.length > 0 ? allIndicesInView[allIndicesInView.length - 1] : null);
  }, [filteredMediaFiles, mediaFiles]);

  const deselectAllMediaItems = () => {
    setSelectedMediaItems([]);
    setLastSelectedIndex(null);
  };

  useEffect(() => {
    setGridSlots(Array(gridConfig.columns * gridConfig.rows).fill(null));
  }, []);

  useEffect(() => {
    const initialIdxData = [];
    setIndexData(initialIdxData);
    updateEditedIndexJson(initialIdxData);

    const savedProjectsData = localStorage.getItem('mediaGridProjects');
    if (savedProjectsData) {
      try {
        setSavedProjects(JSON.parse(savedProjectsData));
      } catch (e) { console.error("Failed to parse saved projects from localStorage", e); }
    }
  }, []);

  useEffect(() => {
    let result = [...mediaFiles];
    if (showFilters) {
      result = result.filter(media => {
        const extension = getFileExtension(media.name);
        return fileTypeFilters[extension.toLowerCase()] === true;
      });
    }
    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase();
      result = result.filter(media =>
        media.name.toLowerCase().includes(term) ||
        (media.metadata?.title && media.metadata.title.toLowerCase().includes(term)) ||
        (media.metadata?.tags && Array.isArray(media.metadata.tags) && media.metadata.tags.some(tag => tag.toLowerCase().includes(term)))
      );
    }
    result.sort((a, b) => {
      let comparison = 0;
      const valA = a[sortConfig.key];
      const valB = b[sortConfig.key];

      if (sortConfig.key === 'name' || sortConfig.key === 'type') {
        comparison = String(valA).localeCompare(String(valB));
      } else if (sortConfig.key === 'date') {
        comparison = new Date(valB) - new Date(valA);
      } else if (sortConfig.key === 'size') {
        const parseSize = (sizeStr) => {
          if (!sizeStr || typeof sizeStr !== 'string') return 0;
          const num = parseFloat(sizeStr);
          if (sizeStr.toLowerCase().includes('gb')) return num * 1024 * 1024 * 1024;
          if (sizeStr.toLowerCase().includes('mb')) return num * 1024 * 1024;
          if (sizeStr.toLowerCase().includes('kb')) return num * 1024;
          return num;
        };
        comparison = parseSize(a.size) - parseSize(b.size);
      }
      return sortConfig.direction === 'asc' ? comparison : -comparison;
    });
    setFilteredMediaFiles(result);
  }, [mediaFiles, searchTerm, fileTypeFilters, sortConfig, showFilters]);

  useEffect(() => {
    return () => {
      mediaFiles.forEach(mf => cleanupMediaResource(mf, true));
    };
  }, []);

  useEffect(() => {
    const columns = thumbnailSize === 's' ? 5 : thumbnailSize === 'm' ? 4 : 3;
    setMediaPanelLayout(prev => ({ ...prev, columns }));
  }, [thumbnailSize]);


  useEffect(() => {
    const preventDefaults = (e) => { e.preventDefault(); e.stopPropagation(); };
    const handleExternalDrop = (e) => {
      preventDefaults(e);
      const files = e.dataTransfer.items
        ? Array.from(e.dataTransfer.items).filter(item => item.kind === 'file').map(item => item.getAsFile())
        : Array.from(e.dataTransfer.files);
      if (files.length > 0) handleFilesSelected(files.filter(f => f !== null));
    };
    document.addEventListener('dragover', preventDefaults);
    document.addEventListener('drop', handleExternalDrop);
    return () => {
      document.removeEventListener('dragover', preventDefaults);
      document.removeEventListener('drop', handleExternalDrop);
    };
  }, [handleFilesSelected]);

  const handleMediaPanelResize = useCallback((e) => {
    const panelContainer = document.querySelector('#app-container > div.flex.flex-1.overflow-hidden');
    if (!panelContainer) return;
    const containerRect = panelContainer.getBoundingClientRect();
    const newWidth = e.clientX - containerRect.left;
    const minWidth = 150;
    const maxWidth = window.innerWidth / 2;
    if (newWidth >= minWidth && newWidth <= maxWidth) {
      updateMediaPanelLayout(newWidth);
    }
  }, []);

  const handleIndexPanelResize = useCallback((e) => {
    const newWidth = window.innerWidth - e.clientX;
    const minWidth = 200;
    const maxWidth = window.innerWidth / 2;
    if (newWidth >= minWidth && newWidth <= maxWidth) {
      setIndexPanelWidth(newWidth);
    }
  }, []);

  const handleConsolePanelResize = useCallback((e) => {
    const newWidth = window.innerWidth - e.clientX;
    const minWidth = 200;
    const maxWidth = window.innerWidth / 2.5;
    if (newWidth >= minWidth && newWidth <= maxWidth) {
      setConsolePanelWidth(newWidth);
    }
  }, []);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isResizingMediaPanel) handleMediaPanelResize(e);
      else if (isResizingIndexPanel) handleIndexPanelResize(e);
      else if (isResizingConsolePanel) handleConsolePanelResize(e);
    };
    const handleMouseUp = () => {
      setIsResizingMediaPanel(false);
      setIsResizingIndexPanel(false);
      setIsResizingConsolePanel(false);
      document.body.style.cursor = '';
    };

    if (isResizingMediaPanel || isResizingIndexPanel || isResizingConsolePanel) {
      document.body.style.cursor = 'col-resize';
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp, { once: true });
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
    };
  }, [isResizingMediaPanel, isResizingIndexPanel, isResizingConsolePanel, handleMediaPanelResize, handleIndexPanelResize, handleConsolePanelResize]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'a' && !editingIndex && !showJsonEditor && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        selectAllMediaItems();
      }
      if (e.key === 'Delete' && selectedMediaItems.length > 0 && !showJsonEditor && editingMediaName === null && !showRemoveDialog && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        setShowRemoveDialog(true);
      }
      if (e.key === 'Escape') {
        if (showEnlargedPreview) { setShowEnlargedPreview(false); return; }
        if (showJsonEditor) { setShowJsonEditor(false); setEditingMediaName(null); return; }
        if (editingMediaName !== null) { setEditingMediaName(null); setEditedMediaNameValue(""); return; }
        if (showRemoveDialog) { setShowRemoveDialog(false); return; }
        if (showExportDialog) { setShowExportDialog(false); return; }
        if (showUpdateIndexDialog) { setShowUpdateIndexDialog(false); return; }
        if (showSaveDialog) { setShowSaveDialog(false); return; }
        if (showLoadDialog) { setShowLoadDialog(false); return; }
        if (showFileOperationsDialog) { setShowFileOperationsDialog(false); return; }
        if (showConsolePanel && !isResizingConsolePanel) { setShowConsolePanel(false); return; }
        if (editingIndex) { setEditingIndex(false); return; }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedMediaItems, editingIndex, showJsonEditor, editingMediaName, showExportDialog, showUpdateIndexDialog, showSaveDialog, showLoadDialog, showEnlargedPreview, showRemoveDialog, showFileOperationsDialog, showConsolePanel, selectAllMediaItems, isResizingConsolePanel]);

  useEffect(() => {
    const totalSlotsInConfig = gridConfig.columns * gridConfig.rows;
    let lastNonNullIndex = -1;
    for (let i = 0; i < gridSlots.length; i++) {
      if (gridSlots[i] !== null) {
        lastNonNullIndex = i;
      }
    }
    setGridHasOverflow(lastNonNullIndex >= totalSlotsInConfig);
  }, [gridSlots, gridConfig.columns, gridConfig.rows]);

  const handleDropToSlot = (targetSlotIdx, dropData) => {
    let itemToPlace = null;
    let sourceSlotIndex = dropData.type === 'internal_media' ? dropData.sourceSlotIndex : null;
    let isNewFile = false;
    let dropPosition = dropData.position || null;


    if (dropData.type === 'file') {
      const processed = processFile(dropData.file);
      if (!processed) return;
      if (!processed.id) processed.id = `${dropData.file.name}-${dropData.file.size}-${dropData.file.lastModified}-${Math.random().toString(36).substr(2, 9)}`;
      processed.userPath = dropData.file.webkitRelativePath || dropData.file.name;
      if (!processed.metadata) processed.metadata = { title: getFilename(processed.name) };
      if (!processed.metadata.category) processed.metadata.category = getFileTypeCategory(processed);

      const existingFile = mediaFiles.find(mf => mf.id === processed.id);
      if (!existingFile) {
        itemToPlace = processed;
        isNewFile = true;
      } else {
        cleanupMediaResource(processed, true);
        itemToPlace = existingFile;
      }
    } else if (dropData.type === 'internal_media') {
      if (mediaFiles[dropData.mediaOriginalIndex]) {
        itemToPlace = mediaFiles[dropData.mediaOriginalIndex];
      } else {
        console.error("Dragged media not found in mediaFiles array:", dropData.mediaOriginalIndex);
        return;
      }
    }

    if (!itemToPlace) return;

    if (isNewFile) {
      setMediaFiles(prevMediaFiles => [...prevMediaFiles, itemToPlace]);
    }

    if (freeGridMode) {
      // Add the item to the slots array
      while (targetSlotIdx >= newGridSlots.length) {
        newGridSlots.push(null);
      }

      if (sourceSlotIndex !== null && sourceSlotIndex !== targetSlotIdx) {
        // Moving an item from one slot to another
        newGridSlots[targetSlotIdx] = itemToPlace;
        newGridSlots[sourceSlotIndex] = null;
      } else {
        // Adding a new item
        newGridSlots[targetSlotIdx] = itemToPlace;
      }

      // Calculate appropriate position in free grid
      setTimeout(() => {
        if (dropPosition) {
          // Position provided, use it
          setFreeGridItems(prev => {
            const width = mediaDimensions[itemToPlace.id]?.width || gridConfig.cellWidth;
            const height = mediaDimensions[itemToPlace.id]?.height || gridConfig.cellHeight;

            return {
              ...prev,
              [itemToPlace.id]: {
                x: dropPosition.x,
                y: dropPosition.y,
                width,
                height,
                originalIndex: targetSlotIdx,
                rotation: 0
              }
            };
          });
        } else {
          // No position provided, auto-calculate
          autoArrangeItems();
        }
      }, 0);

      return newGridSlots;
    }

    setGridSlots(prevGridSlots => {
      let newGridSlots = [...prevGridSlots];
      const itemCurrentlyInTargetSlot = newGridSlots[targetSlotIdx];

      while (targetSlotIdx >= newGridSlots.length) {
        newGridSlots.push(null);
      }

      if (allowNudging && itemCurrentlyInTargetSlot && (sourceSlotIndex === null || sourceSlotIndex !== targetSlotIdx)) {
        let linearGrid = [...newGridSlots];
        const draggedItem = itemToPlace;

        if (sourceSlotIndex !== null && sourceSlotIndex < linearGrid.length) {
          linearGrid[sourceSlotIndex] = null;
        }

        if (!allowDuplicates) {
          const duplicateIndex = linearGrid.findIndex((slot, idx) =>
            idx !== sourceSlotIndex && slot && slot.id === draggedItem.id
          );
          if (duplicateIndex !== -1) {
            if (sourceSlotIndex !== null) {
              linearGrid[targetSlotIdx] = draggedItem;
              linearGrid[sourceSlotIndex] = itemCurrentlyInTargetSlot;
            } else {
              linearGrid[targetSlotIdx] = draggedItem;
            }
            return linearGrid;
          }
        }

        const displacedItem = linearGrid[targetSlotIdx];
        linearGrid[targetSlotIdx] = draggedItem;

        if (displacedItem) {
          let currentItemToNudge = displacedItem;
          for (let i = targetSlotIdx + 1; ; i++) {
            if (i >= linearGrid.length) {
              linearGrid.push(currentItemToNudge);
              break;
            }
            const temp = linearGrid[i];
            linearGrid[i] = currentItemToNudge;
            currentItemToNudge = temp;
            if (currentItemToNudge === null) break;
          }
        }
        newGridSlots = linearGrid;

      } else {
        if (sourceSlotIndex === null) {
          if (!allowDuplicates) {
            newGridSlots = newGridSlots.map((slot, index) =>
              (slot && slot.id === itemToPlace.id && index !== targetSlotIdx) ? null : slot
            );
          }
          newGridSlots[targetSlotIdx] = itemToPlace;
        } else {
          if (sourceSlotIndex === targetSlotIdx) return newGridSlots;

          if (allowDuplicates) {
            newGridSlots[targetSlotIdx] = itemToPlace;
          } else {
            newGridSlots[targetSlotIdx] = itemToPlace;
            if (sourceSlotIndex < newGridSlots.length) {
              newGridSlots[sourceSlotIndex] = itemCurrentlyInTargetSlot;
            }
          }
        }
      }
      const visualGridSize = gridConfig.columns * gridConfig.rows;
      let lastActualItemIndex = -1;
      for (let i = newGridSlots.length - 1; i >= 0; i--) {
        if (newGridSlots[i] !== null) { lastActualItemIndex = i; break; }
      }
      const requiredLength = Math.max(visualGridSize, lastActualItemIndex + 1);
      if (newGridSlots.length > requiredLength) newGridSlots.splice(requiredLength);
      while (newGridSlots.length < requiredLength) newGridSlots.push(null);

      return newGridSlots;
    });
  };

  const handleGridItemSelect = (slotIdx, isShiftKey = false, isCtrlOrMetaKey = false) => {
    if (!gridSlots[slotIdx]) return;
    const itemInClickedSlot = gridSlots[slotIdx];
    const originalIndexInMediaFiles = mediaFiles.findIndex(m => m.id === itemInClickedSlot.id);
    if (originalIndexInMediaFiles === -1) return;

    if (markSelection) {
      handleMediaItemSelect(originalIndexInMediaFiles, isShiftKey, isCtrlOrMetaKey);
    }
  };

  const handleRemoveFromGridSlot = (slotIndexToRemove) => {
    setGridSlots(prevGridSlots => {
      const newGridSlots = [...prevGridSlots];
      if (slotIndexToRemove >= 0 && slotIndexToRemove < newGridSlots.length) {
        newGridSlots[slotIndexToRemove] = null;
      }
      return newGridSlots;
    });
  };

  const handleRemoveFromMediaPanel = () => {
    if (selectedMediaItems.length === 0) return;
    const idsToRemove = new Set(selectedMediaItems.map(idx => mediaFiles[idx]?.id).filter(Boolean));
    setGridSlots(prevGridSlots =>
      prevGridSlots.map(slot =>
        slot && idsToRemove.has(slot.id) ? null : slot
      )
    );
    const itemsBeingRemoved = mediaFiles.filter((_, index) => selectedMediaItems.includes(index));
    setMediaFiles(prevMediaFiles =>
      prevMediaFiles.filter((_, index) => !selectedMediaItems.includes(index))
    );
    itemsBeingRemoved.forEach(item => cleanupMediaResource(item, true));
    setSelectedMediaItems([]);
    setLastSelectedIndex(null);
    setShowRemoveDialog(false);
  };

  const handleExportDeleteCommand = () => {
    const selectedFileObjects = selectedMediaItems.map(idx => mediaFiles[idx]).filter(Boolean);
    const commandLines = selectedFileObjects
      .filter(fileObject => fileObject.userPath)
      .map(fileObject => `Remove-Item -Path '${fileObject.userPath.replace(/'/g, "''")}' -Force`);

    if (commandLines.length === 0) { alert("No valid file paths for deletion among selected items."); return; }
    const finalCommand = commandLines.join('\n');
    addCommandToHistory('Delete Files (PS)', finalCommand, 'windows_ps');
    navigator.clipboard.writeText(finalCommand)
      .then(() => { alert("PowerShell delete command copied to clipboard. Review before executing!"); })
      .catch(err => { console.error("Failed to copy delete command:", err); alert("Failed to copy command to clipboard."); });
    setShowRemoveDialog(false);
  };


  const applyIndexChanges = () => {
    try {
      const parsedData = JSON.parse(editedIndexJson);
      setIndexData(parsedData);
      setEditingIndex(false);
    } catch (error) { alert('Invalid JSON format. Please check your input.'); console.error('JSON parse error:', error); }
  };

  const handleSort = (key) => {
    setSortConfig(prevSort => {
      if (prevSort.key === key) {
        return { ...prevSort, direction: prevSort.direction === 'asc' ? 'desc' : 'asc' };
      }
      let newDirection = 'asc';
      if (key === 'date' || key === 'size') newDirection = 'desc';
      return { key, direction: newDirection };
    });
  };

  const toggleFileTypeFilter = (typeToToggle) => {
    setFileTypeFilters(prev => ({ ...prev, [typeToToggle.toLowerCase()]: !prev[typeToToggle.toLowerCase()] }));
  };

  const handleFileFilterCategoryChange = (category) => {
    const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];
    const videoExts = ['mp4', 'webm', 'mov', 'avi', 'mkv'];
    const audioExts = ['mp3', 'wav', 'ogg', 'flac'];

    if (category === 'all') {
      setFileTypeFilters(prev => {
        const newFilters = { ...prev };
        [...imageExts, ...videoExts, ...audioExts].forEach(ext => newFilters[ext] = true);
        return newFilters;
      });
      return;
    }

    let extsToChange;
    if (category === 'image') extsToChange = imageExts;
    else if (category === 'video') extsToChange = videoExts;
    else if (category === 'audio') extsToChange = audioExts;
    else return;

    const allActiveInCategory = extsToChange.every(ext => fileTypeFilters[ext.toLowerCase()]);
    setFileTypeFilters(prev => {
      const newFilters = { ...prev };
      extsToChange.forEach(ext => newFilters[ext.toLowerCase()] = !allActiveInCategory);
      return newFilters;
    });
  };

  const handleRemoveSelected = () => {
    if (selectedMediaItems.length > 0) setShowRemoveDialog(true);
  };

  const handleMediaItemSelect = (clickedOriginalIndex, isShiftKey, isCtrlOrMetaKey) => {
    if (clickedOriginalIndex < 0 || clickedOriginalIndex >= mediaFiles.length) return;

    setSelectedMediaItems(prevSelected => {
      let newSelected = [...prevSelected];
      const itemIsCurrentlySelected = newSelected.includes(clickedOriginalIndex);

      if (isShiftKey && lastSelectedIndex !== null && lastSelectedIndex !== clickedOriginalIndex) {
        const currentFilteredMediaIds = filteredMediaFiles.map(f => f.id);
        const clickedId = mediaFiles[clickedOriginalIndex].id;
        const lastSelectedId = mediaFiles[lastSelectedIndex].id;
        const filteredIndexOfClicked = currentFilteredMediaIds.indexOf(clickedId);
        const filteredIndexOfLastSelected = currentFilteredMediaIds.indexOf(lastSelectedId);

        if (filteredIndexOfClicked !== -1 && filteredIndexOfLastSelected !== -1) {
          const startRangeInFiltered = Math.min(filteredIndexOfClicked, filteredIndexOfLastSelected);
          const endRangeInFiltered = Math.max(filteredIndexOfClicked, filteredIndexOfLastSelected);
          const idsToSelectInRange = currentFilteredMediaIds.slice(startRangeInFiltered, endRangeInFiltered + 1);
          const originalIndicesToSelect = idsToSelectInRange
            .map(id => mediaFiles.findIndex(mf => mf.id === id))
            .filter(idx => idx !== -1);
          newSelected = Array.from(new Set([...newSelected, ...originalIndicesToSelect]));
        } else { // Fallback for non-contiguous shift (or if items not in filtered view)
          if (!itemIsCurrentlySelected) {
            newSelected.push(clickedOriginalIndex); // Add to selection if not already selected
          }
          // If already selected, shift-click doesn't change it unless it's part of a new range.
        }
      } else { // Not a shift click, or shift click without a valid range start
        if (itemIsCurrentlySelected) {
          if (isCtrlOrMetaKey) { // Ctrl/Meta on selected item: deselect it
            newSelected = newSelected.filter(i => i !== clickedOriginalIndex);
          } else { // Plain click on selected item: make it the only selection
            newSelected = [clickedOriginalIndex];
          }
        } else { // Item is not currently selected
          if (isCtrlOrMetaKey) { // Ctrl/Meta on unselected item: add to selection
            newSelected.push(clickedOriginalIndex);
          } else { // Plain click on an unselected item: make it the only selection
            newSelected = [clickedOriginalIndex];
          }
        }
      }
      return newSelected;
    });
    setLastSelectedIndex(clickedOriginalIndex);
  };


  const updateEditedIndexJson = (data) => {
    setEditedIndexJson(JSON.stringify(data, null, 2));
  };

  const generateBookData = () => { return { title: "Generated Book", author: "System", pages: [] }; };
  const createIndexEntry = (data = exportData) => { return { title: data.title || "New Volume", description: data.description || "" }; };

  const handleUpdateGridConfig = (newConfigPartial) => {
    setGridConfig(prevConfig => {
      const updatedConfig = { ...prevConfig, ...newConfigPartial };
      const newTotalVisualSlots = updatedConfig.columns * updatedConfig.rows;

      setGridSlots(prevSlots => {
        let currentContent = prevSlots.filter(Boolean);
        let newSlotsArr = Array(newTotalVisualSlots).fill(null);
        currentContent.forEach((item, i) => {
          if (i < newTotalVisualSlots) {
            newSlotsArr[i] = item;
          }
        });
        if (currentContent.length > newTotalVisualSlots) {
          newSlotsArr = [...newSlotsArr, ...currentContent.slice(newTotalVisualSlots)];
        }
        let lastActualItemIdx = -1;
        for (let i = newSlotsArr.length - 1; i >= 0; i--) {
          if (newSlotsArr[i] !== null) {
            lastActualItemIdx = i;
            break;
          }
        }
        const requiredLen = Math.max(newTotalVisualSlots, lastActualItemIdx + 1);
        if (newSlotsArr.length > requiredLen) {
          newSlotsArr.splice(requiredLen);
        }
        while (newSlotsArr.length < requiredLen) {
          newSlotsArr.push(null);
        }
        return newSlotsArr;
      });
      return updatedConfig;
    });
  };

  const updateMediaPanelLayout = (width) => {
    setMediaPanelLayout(prev => {
      const columns = width < 200 ? 1 : width < 380 ? 2 : mediaPanelLayout.columns > 3 ? mediaPanelLayout.columns : 3;
      return { ...prev, width, columns };
    });
  };

  const updateIndexFile = () => { console.log("Update index file triggered", updateIndexData); };
  const handleIndexFileSelected = (e) => { if (e.target.files[0]) console.log("Index file selected", e.target.files[0]); };
  const saveIndexFile = () => { console.log("Save index file triggered"); };
  const handleProjectFileSelected = (e) => { if (e.target.files[0]) console.log("Project file selected", e.target.files[0]); };

  const handleUploadFiles = () => fileInputRef.current.click();
  const handleUploadFolder = () => folderInputRef.current.click();
  const onFileInputChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFilesSelected(e.target.files);
    }
    e.target.value = null;
  };

  const saveProject = () => { console.log("Save project triggered", projectName); };
  const loadProject = (projectToLoad) => { console.log("Load project triggered", projectToLoad); };
  const handleExport = () => { console.log("Export volume triggered", exportData); };

  const addJsonField = (currentPath, key, defaultValue = "") => { console.log("Add JSON field:", currentPath, key, defaultValue); };
  const removeJsonField = (currentPath, key) => { console.log("Remove JSON field:", currentPath, key); };
  const editJsonField = (fullPath, value) => { console.log("Edit JSON field:", fullPath, value); };

  const handleExportFormChange = (e) => setExportData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  const handleUpdateIndexFormChange = (e) => setUpdateIndexData(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const openEnlargedPreview = (media, specificList = null) => {
    setPreviewMedia(media);
    const listToUse = specificList || filteredMediaFiles;
    setModalMediaList(listToUse.filter(Boolean));
    setShowEnlargedPreview(true);
  };

  const handleToggleRepeatGridPlaylist = () => setRepeatGridPlaylist(prev => !prev);

  const handleMediaNameUpdate = () => {
    if (editingMediaName !== null && mediaFiles[editingMediaName]) {
      const updatedMediaFiles = [...mediaFiles];
      const oldName = updatedMediaFiles[editingMediaName].name;
      updatedMediaFiles[editingMediaName] = {
        ...updatedMediaFiles[editingMediaName],
        name: editedMediaNameValue,
        metadata: {
          ...updatedMediaFiles[editingMediaName].metadata,
          title: editedMediaNameValue.split('.')[0]
        }
      };
      setMediaFiles(updatedMediaFiles);
      console.log(`Media name updated for index ${editingMediaName} from ${oldName} to ${editedMediaNameValue}`);
      setGridSlots(prevSlots => prevSlots.map(slot => {
        if (slot && slot.id === updatedMediaFiles[editingMediaName].id) {
          return { ...slot, name: editedMediaNameValue, metadata: { ...slot.metadata, title: editedMediaNameValue.split('.')[0] } };
        }
        return slot;
      }));
      if (previewMedia && previewMedia.id === updatedMediaFiles[editingMediaName].id) {
        setPreviewMedia({ ...previewMedia, name: editedMediaNameValue, metadata: { ...previewMedia.metadata, title: editedMediaNameValue.split('.')[0] } });
      }
    }
    setEditingMediaName(null);
    setEditedMediaNameValue("");
  };

  const handleMediaMetadataUpdate = () => {
    if (editingMediaName !== null && mediaFiles[editingMediaName]) {
      const updatedMediaFiles = [...mediaFiles];
      updatedMediaFiles[editingMediaName] = {
        ...updatedMediaFiles[editingMediaName],
        metadata: jsonTemplate
      };
      setMediaFiles(updatedMediaFiles);
      console.log(`Media metadata updated for index ${editingMediaName}`);
      setGridSlots(prevSlots => prevSlots.map(slot => {
        if (slot && slot.id === updatedMediaFiles[editingMediaName].id) {
          return { ...slot, metadata: jsonTemplate };
        }
        return slot;
      }));
      if (previewMedia && previewMedia.id === updatedMediaFiles[editingMediaName].id) {
        setPreviewMedia({ ...previewMedia, metadata: jsonTemplate });
      }
    }
    setShowJsonEditor(false);
    setEditingMediaName(null);
  };

  const handleEditMediaNameFromPreview = () => {
    if (previewMedia) {
      const originalIndex = mediaFiles.findIndex(m => m.id === previewMedia.id);
      if (originalIndex !== -1) {
        setEditingMediaName(originalIndex);
        setEditedMediaNameValue(previewMedia.name);
        setShowEnlargedPreview(false);
      }
    }
  };
  const handleEditMetadataFromPreview = () => {
    if (previewMedia) {
      const originalIndex = mediaFiles.findIndex(m => m.id === previewMedia.id);
      if (originalIndex !== -1) {
        setEditingMediaName(originalIndex);
        setJsonTemplate(mediaFiles[originalIndex].metadata || { title: mediaFiles[originalIndex].name.split('.')[0], description: "" });
        setShowJsonEditor(true);
        setShowEnlargedPreview(false);
      }
    }
  };
  const handleEditMetadata = (originalIndex) => {
    if (mediaFiles[originalIndex]) {
      setEditingMediaName(originalIndex);
      setJsonTemplate(mediaFiles[originalIndex].metadata || { title: mediaFiles[originalIndex].name.split('.')[0], description: "" });
      setShowJsonEditor(true);
    }
  };
  const handleOpenFileOperationsDialog = () => {
    if (selectedMediaItems.length > 0) {
      setShowFileOperationsDialog(true);
    } else {
      alert("Please select media items first to perform file operations.");
    }
  };
  const logGeneratedFileOperations = (commands, platform) => addCommandToHistory('File Operations', commands, platform);

  return (
    <div id="app-container" className={`flex flex-col h-screen bg-gray-100 dark:bg-gray-900 transition-colors duration-300 ${darkMode ? 'dark' : ''}`}>
      <div className="flex items-center justify-between space-x-2 p-2 bg-gray-200 dark:bg-gray-700 shadow-md flex-wrap">
        <img
          src={darkMode ? "/gridworm-02.png" : "/gridworm-01.png"}
          alt="Gridworm logo"
          className="h-12 sm:h-14 w-auto mr-2 sm:mr-4"
        />
        <div className="flex items-center space-x-1 sm:space-x-2 flex-wrap gap-y-1 sm:gap-y-2">
          <button onClick={handleUploadFiles} title="Add individual files" className="flex items-center px-2 sm:px-3 py-1 sm:py-1.5 text-white bg-green-600 rounded hover:bg-green-700 transition-colors text-xs sm:text-sm"><Upload size={14} className="mr-1 sm:mr-1.5" /> Files</button>
          <button onClick={handleUploadFolder} title="Add all files from a folder" className="flex items-center px-2 sm:px-3 py-1 sm:py-1.5 text-white bg-green-600 rounded hover:bg-green-700 transition-colors text-xs sm:text-sm"><FolderOpen size={14} className="mr-1 sm:mr-1.5" /> Folder</button>
          <button onClick={() => setShowSaveDialog(true)} title="Save current project layout" className="flex items-center px-2 sm:px-3 py-1 sm:py-1.5 text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors text-xs sm:text-sm"><Save size={14} className="mr-1 sm:mr-1.5" /> Save</button>
          <button onClick={() => setShowLoadDialog(true)} title="Load a saved project" className="flex items-center px-2 sm:px-3 py-1 sm:py-1.5 text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors text-xs sm:text-sm"><Download size={14} className="mr-1 sm:mr-1.5" /> Load</button>
          <button onClick={() => setShowExportDialog(true)} title="Export grid as a new volume (JSON data)" className="flex items-center px-2 sm:px-3 py-1 sm:py-1.5 text-white bg-purple-600 rounded hover:bg-purple-700 transition-colors text-xs sm:text-sm"><Archive size={14} className="mr-1 sm:mr-1.5" /> Export Vol</button>
          <button onClick={() => setShowUpdateIndexDialog(true)} title="Update main index with current grid (JSON data)" className="flex items-center px-2 sm:px-3 py-1 sm:py-1.5 text-white bg-yellow-500 rounded hover:bg-yellow-600 transition-colors text-xs sm:text-sm"><RefreshCw size={14} className="mr-1 sm:mr-1.5" /> Index</button>
          <button
            onClick={handleOpenFileOperationsDialog}
            title="Export rename/move commands for selected files"
            className="flex items-center px-2 sm:px-3 py-1 sm:py-1.5 text-white bg-teal-600 rounded hover:bg-teal-700 transition-colors text-xs sm:text-sm"
            disabled={selectedMediaItems.length === 0}
          >
            <Terminal size={14} className="mr-1 sm:mr-1.5" /> Ops
          </button>
          {/* <button onClick={() => setShowControls(!showControls)} title="Toggle app controls section" className="flex items-center px-2 sm:px-3 py-1 sm:py-1.5 text-white bg-gray-600 rounded hover:bg-gray-700 transition-colors text-xs sm:text-sm"><Sliders size={14} className="mr-1 sm:mr-1.5" /> App Controls</button> */}
          <button onClick={() => setShowIndexPanel(!showIndexPanel)} title="Toggle Index Panel" className={`flex items-center px-2 py-1 sm:px-3 sm:py-1.5 text-white rounded transition-colors text-xs sm:text-sm ${showIndexPanel ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-gray-500 hover:bg-gray-600'}`}><Book size={14} className="mr-0 sm:mr-1.5" /> <span className="hidden sm:inline">Book Index</span></button>
          <button
            onClick={() => setShowConsolePanel(!showConsolePanel)}
            title="Toggle Command Log Panel"
            className={`flex items-center px-2 py-1 sm:px-3 sm:py-1.5 text-white rounded transition-colors text-xs sm:text-sm ${showConsolePanel ? 'bg-cyan-600 hover:bg-cyan-700' : 'bg-gray-500 hover:bg-gray-600'}`}
          >
            <ListTree size={14} className="mr-0 sm:mr-1.5" /> <span className="hidden sm:inline">Log</span>
          </button>
          <button
            onClick={() => setDarkMode(!darkMode)}
            title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            className="flex items-center px-2 sm:px-3 py-1 sm:py-1.5 rounded bg-gray-300 dark:bg-gray-500 hover:bg-gray-400 dark:hover:bg-gray-600 transition-colors text-gray-800 dark:text-gray-200 text-xs sm:text-sm"
          >
            {darkMode ? '🌙' : '☀️'} <span className="ml-1 sm:ml-2 hidden sm:inline">{darkMode ? 'Dark' : 'Light'}</span>
          </button>
        </div>
      </div>

      <input type="file" ref={fileInputRef} style={{ display: 'none' }} multiple accept="image/*,video/*,audio/*,.jpg,.jpeg,.png,.gif,.webp,.svg,.mp4,.webm,.mov,.avi,.mkv,.mp3,.wav,.ogg,.flac" onChange={onFileInputChange} />
      <input type="file" ref={folderInputRef} style={{ display: 'none' }} webkitdirectory="true" directory="true" multiple onChange={onFileInputChange} />
      <input type="file" ref={indexFileInputRef} style={{ display: 'none' }} accept=".json" onChange={handleIndexFileSelected} />

      {showControls && (
        <div className="p-3 bg-gray-200 dark:bg-gray-700 border-b border-gray-300 dark:border-gray-600 shadow">
          <p className="text-sm text-center text-gray-600 dark:text-gray-400">
            Grid configuration controls are available within the "Grid Builder" panel.
            Media Panel display controls are within the "Media" panel.
          </p>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        <MediaPanel
          onBeginResize={() => setIsResizingMediaPanel(true)}
          mediaFiles={mediaFiles}
          filteredMediaFiles={filteredMediaFiles}
          mediaPanelLayout={mediaPanelLayout}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          showFilters={showFilters}
          onToggleFilters={() => setShowFilters(!showFilters)}
          fileTypeFilters={fileTypeFilters}
          onToggleFileTypeFilter={toggleFileTypeFilter}
          onFileFilterCategoryChange={handleFileFilterCategoryChange}
          sortConfig={sortConfig}
          onSort={handleSort}
          selectedMediaItems={selectedMediaItems}
          onMediaItemSelect={handleMediaItemSelect}
          onSelectAll={selectAllMediaItems}
          onDeselectAll={deselectAllMediaItems}
          onEditMetadata={handleEditMetadata}
          onRemoveSelected={handleRemoveSelected}
          onMediaPreviewClick={(media) => openEnlargedPreview(media, filteredMediaFiles)}
          hoveredItem={hoveredItem}
          onMediaItemHover={setHoveredItem}
          isCollapsed={mediaPanelCollapsed}
          onToggleCollapse={() => setMediaPanelCollapsed(!mediaPanelCollapsed)}
          isPinned={mediaPanelPinned}
          onTogglePin={() => setMediaPanelPinned(!mediaPanelPinned)}
          thumbnailSize={thumbnailSize}
          onChangeThumbnailSize={setThumbnailSize}
        />
        <GridBuilderPanel
          gridConfig={gridConfig}
          onUpdateGridConfig={handleUpdateGridConfig}
          gridSlots={gridSlots}
          mediaFiles={mediaFiles}
          gridHasOverflow={gridHasOverflow}
          hoveredItem={hoveredItem}
          onHover={setHoveredItem}
          onRemoveFromSlot={handleRemoveFromGridSlot}
          onDropToSlot={handleDropToSlot}
          onSelectGridItem={handleGridItemSelect}
          onPreviewMedia={(media) => openEnlargedPreview(media, gridSlots.filter(Boolean))}
          markSelection={markSelection}
          onToggleMarkSelection={handleToggleMarkSelection}
          allowNudging={allowNudging}
          onToggleAllowNudging={handleToggleAllowNudging}
          allowDuplicates={allowDuplicates}
          onToggleAllowDuplicates={handleToggleAllowDuplicates}
          onClearGrid={handleClearGrid}
          onAddRandomMedia={handleAddRandomMedia}
          freeGridMode={freeGridMode}
          onToggleFreeGridMode={() => setFreeGridMode(prev => !prev)}
        />
        <IndexPanel
          onBeginResizing={() => setIsResizingIndexPanel(true)}
          showIndexPanel={showIndexPanel}
          indexPanelWidth={indexPanelWidth}
          indexData={indexData}
          editingIndex={editingIndex}
          editedIndexJson={editedIndexJson}
          onShowIndexPanelChange={setShowIndexPanel}
          onLoadIndexFile={() => indexFileInputRef.current.click()}
          onSaveIndex={saveIndexFile}
          onApplyIndexChanges={applyIndexChanges}
          onStartEditingIndex={() => setEditingIndex(true)}
          onEditedIndexJsonChange={setEditedIndexJson}
        />
        <ConsolePanel
          showConsolePanel={showConsolePanel}
          consolePanelWidth={consolePanelWidth}
          commandHistory={commandHistory}
          onClose={() => setShowConsolePanel(false)}
          onClearHistory={clearCommandHistory}
          onBeginResizing={() => setIsResizingConsolePanel(true)}
        />
      </div>

      <RemoveMediaDialog
        showDialog={showRemoveDialog}
        selectedCount={selectedMediaItems.length}
        onClose={() => setShowRemoveDialog(false)}
        onRemoveFromList={handleRemoveFromMediaPanel}
        onExportDeleteCommand={handleExportDeleteCommand}
      />
      <ExportDialog showExportDialog={showExportDialog} exportData={exportData} onClose={() => setShowExportDialog(false)} onExport={handleExport} onFormChange={handleExportFormChange} />
      <UpdateIndexDialog showUpdateIndexDialog={showUpdateIndexDialog} updateIndexData={updateIndexData} onClose={() => setShowUpdateIndexDialog(false)} onUpdateIndex={updateIndexFile} onFormChange={handleUpdateIndexFormChange} />

      {editingMediaName !== null && !showJsonEditor && (
        <MediaNameEditDialog
          isEditing={true}
          mediaName={(mediaFiles[editingMediaName]?.name || "Unknown Media")}
          editedMediaName={editedMediaNameValue}
          onClose={() => { setEditingMediaName(null); setEditedMediaNameValue(""); }}
          onMediaNameChange={setEditedMediaNameValue}
          onUpdate={handleMediaNameUpdate}
        />
      )}
      <JsonEditorDialog
        showJsonEditor={showJsonEditor}
        jsonTemplate={jsonTemplate}
        editingMediaName={editingMediaName !== null ? (mediaFiles[editingMediaName]?.name) : null}
        onClose={() => { setShowJsonEditor(false); setEditingMediaName(null); }}
        onAddField={addJsonField}
        onRemoveField={removeJsonField}
        onEditField={editJsonField}
        onSaveTemplate={() => { setShowJsonEditor(false); }}
        onUpdateMetadata={handleMediaMetadataUpdate}
        presets={jsonTemplatePresets}
        onPresetSelect={(preset) => setJsonTemplate(JSON.parse(JSON.stringify(preset.template)))}
      />
      <SaveProjectDialog showSaveDialog={showSaveDialog} projectName={projectName} onClose={() => setShowSaveDialog(false)} onProjectNameChange={setProjectName} onSaveProject={saveProject} />
      <LoadProjectDialog showLoadDialog={showLoadDialog} savedProjects={savedProjects} onClose={() => setShowLoadDialog(false)} onFileSelected={handleProjectFileSelected} onLoadProject={(project) => loadProject(project)} />

      <EnlargedPreviewModal
        showEnlargedPreview={showEnlargedPreview}
        previewMedia={previewMedia}
        onClose={() => setShowEnlargedPreview(false)}
        onEditName={handleEditMediaNameFromPreview}
        onEditMetadata={handleEditMetadataFromPreview}
        mediaList={modalMediaList}
        setPreviewMedia={setPreviewMedia}
        autoLoop={true}
        repeatPlaylistActive={repeatGridPlaylist}
        onToggleRepeatPlaylist={handleToggleRepeatGridPlaylist}
      />
      <FileOperationsExportDialog
        showDialog={showFileOperationsDialog}
        onClose={() => setShowFileOperationsDialog(false)}
        selectedMediaItems={selectedMediaItems.map(index => mediaFiles[index]).filter(Boolean)}
        onLogCommands={logGeneratedFileOperations}
      />
    </div>
  );
};

export default EnhancedMediaGridApp;