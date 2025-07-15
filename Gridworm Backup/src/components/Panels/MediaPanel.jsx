import React, { useState, useEffect, useMemo } from 'react';
import {
  Search, X, CheckSquare, Square, Edit, ImageIconLucide, VideoIconLucide, 
  MusicIconLucide, SortAsc, SortDesc, Filter, Trash2, FileText, List
} from 'lucide-react';
import VirtualizedGrid from './VirtualizedGrid';
import MediaPreview from './MediaPreview';
import { isImage, isVideo, isAudio } from './helpers';
import { ThumbnailSizeToggle, PanelCollapseToggle } from './MediaPanelControls';

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
  onMediaItemSelect,
  onMediaPreviewClick,
  onEditMetadata,
  onBeginResize,
  isCollapsed = false,
  onToggleCollapse,
  isPinned = false,
  onTogglePin,
  thumbnailSize = 'l',
  onChangeThumbnailSize
}) => {
  const [previewMode, setPreviewMode] = useState('off');
  const [showSelectedOnly, setShowSelectedOnly] = useState(false);
  const [hoverExpanded, setHoverExpanded] = useState(false);

  // State for collapsed panel animation
  const [transitioning, setTransitioning] = useState(false);

  // Handle collapse/expand with animation
  const handleToggleCollapse = () => {
    setTransitioning(true);
    setTimeout(() => {
      onToggleCollapse();
      setTransitioning(false);
    }, 300);
  };

  // Expanded state including hover
  const isExpanded = !isCollapsed || (isCollapsed && hoverExpanded && !isPinned);

  const cyclePreviewMode = () => {
    setPreviewMode(prev => {
      if (prev === 'off') return 'live';
      if (prev === 'live') return 'hover';
      return 'off';
    });
  };

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
      className={`relative bg-white dark:bg-gray-900 border-r border-gray-300 dark:border-gray-600 flex flex-col transition-all duration-300 ${transitioning ? 'overflow-hidden' : ''}`}
      style={{
        width: isCollapsed && !hoverExpanded ? '40px' : `${mediaPanelLayout.width}px`,
      }}
      onMouseEnter={() => !isPinned && isCollapsed && setHoverExpanded(true)}
      onMouseLeave={() => !isPinned && setHoverExpanded(false)}
    >
      {/* Collapse/Pin Controls */}
      <div className={`absolute top-3 right-${isCollapsed ? '2' : '-8'} z-10 transition-all duration-300 ${isCollapsed && !hoverExpanded ? 'opacity-100' : 'opacity-0'}`}>
        <PanelCollapseToggle 
          isCollapsed={isCollapsed} 
          onToggle={handleToggleCollapse}
          isPinned={isPinned}
          onPinToggle={onTogglePin}
        />
      </div>

      {/* Panel Content - Only rendered when expanded */}
      {isExpanded && (
        <>
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
                  {/* Icon based on preview mode */}
                </button>
                <button onClick={onToggleFilters} className={`p-1.5 rounded ${showFilters ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`} title='Toggle Filters'><Filter size={16} /></button>
                <button onClick={onSelectAll} className='p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700' title='Select All'><CheckSquare size={16} /></button>
                <button onClick={onDeselectAll} className='p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700' title='Deselect All'><Square size={16} /></button>
                <button onClick={() => setShowSelectedOnly(prev => !prev)} disabled={selectedMediaItems.length === 0} className={`p-1.5 rounded ${showSelectedOnly ? 'bg-blue-100 text-blue-600' : selectedMediaItems.length > 0 ? 'hover:bg-gray-200' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`} title={showSelectedOnly ? 'Show All Media' : 'Show Selected Only'}>
                  {showSelectedOnly ? <List size={16} /> : <FileText size={16} />}
                </button>
                <button onClick={onRemoveSelected} disabled={selectedMediaItems.length === 0} className={`p-1.5 rounded ${selectedMediaItems.length > 0 ? 'bg-red-100 text-red-600 hover:bg-red-200' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`} title='Remove Selected'><Trash2 size={16} /></button>
                <ThumbnailSizeToggle currentSize={thumbnailSize} onChange={onChangeThumbnailSize} />
                <button
                  onClick={handleToggleCollapse}
                  className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 ml-1"
                  title="Collapse panel"
                >
                  <ChevronLeft size={16} />
                </button>
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
                      onClick={e => { 
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
                              {isImage(media.type) && <ImageIconLucide size={12} />} 
                              {isVideo(media.type) && <VideoIconLucide size={12} />} 
                              {isAudio(media.type) && <MusicIconLucide size={12} />}
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
        </>
      )}

      {/* Collapsed state content */}
      {isCollapsed && !hoverExpanded && (
        <div className="h-full flex flex-col items-center pt-12">
          <button 
            className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full"
            onClick={handleToggleCollapse}
            title="Expand panel"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      )}

      {/* Resize handle */}
      <div
        className={`absolute top-0 right-0 bottom-0 w-2 cursor-ew-resize hover:bg-blue-300 dark:hover:bg-blue-700 opacity-50 hover:opacity-100 transition-opacity media-panel-resize-anchor ${isCollapsed && !hoverExpanded ? 'hidden' : ''}`}
        onMouseDown={e => { e.preventDefault(); onBeginResize(); }}
        title='Resize Media Panel'
      />
    </div>
  );
};

export default MediaPanel;