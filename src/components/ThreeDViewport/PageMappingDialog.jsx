// components/ThreeDViewport/PageMappingDialog.jsx
import React, { useState, useEffect, useRef } from 'react';
import {
  X, Grid, List, ChevronLeft, ChevronRight, RotateCw,
  Book, FileText, Image, Play, Music, Box, AlertCircle
} from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, rectSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Sortable grid item component
const SortableGridItem = ({ id, item, index, getMediaUrl, getMediaType }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    cursor: 'grab'
  };

  const mediaUrl = getMediaUrl(item);
  const mediaType = getMediaType(item);
  const TypeIcon = mediaType === 'image' ? Image :
    mediaType === 'video' ? Play :
      mediaType === 'audio' ? Music :
        mediaType === '3d' ? Box : FileText;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`relative bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden group
        ${isDragging ? 'ring-2 ring-blue-500 z-50' : 'hover:ring-2 hover:ring-gray-400'}`}
    >
      <div className="absolute top-1 left-1 bg-black/60 text-white text-xs px-1 rounded z-10">
        {index}
      </div>

      {/* Special indicators for first and last items */}
      {index === 0 && (
        <div className="absolute top-1 right-1 bg-green-600 text-white text-xs px-2 py-0.5 rounded z-10">
          Cover
        </div>
      )}

      {mediaUrl ? (
        <img
          src={mediaUrl}
          alt={item?.name || `Item ${index}`}
          className="w-full h-full object-cover"
          draggable={false}
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center p-2">
          <TypeIcon size={24} className="text-gray-400 mb-1" />
          <span className="text-xs text-gray-500 text-center truncate w-full">
            {item?.name || 'Empty'}
          </span>
        </div>
      )}

      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
    </div>
  );
};

const PageMappingDialog = ({
  gridSlots,
  gridConfig,
  mediaFiles,
  currentMapping,
  onConfirm,
  onCancel,
  darkMode = false
}) => {
  // State management
  const [items, setItems] = useState([]);
  const [flowType, setFlowType] = useState('horizontal');
  const [startCorner, setStartCorner] = useState('top-left');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'preview'
  const [previewPage, setPreviewPage] = useState(0);

  // Book metadata
  const [bookMetadata, setBookMetadata] = useState({
    title: 'My Book',
    author: 'Author Name',
    description: 'Book created from grid'
  });

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Initialize items from grid or current book draft
  useEffect(() => {
    // If we have a current mapping (draft), reconstruct the order from it
    if (currentMapping && currentMapping.length > 0) {
      console.log('Initializing from current book draft:', currentMapping);
      
      // Extract all items from the pages in order
      const orderedItems = [];
      const usedIds = new Set();
      
      currentMapping.forEach(page => {
        // Add front item
        if (page.front) {
          const item = mediaFiles.find(m => m.name === page.front || m.id === page.front);
          if (item && !usedIds.has(item.id)) {
            orderedItems.push(item);
            usedIds.add(item.id);
          }
        }
        
        // Add back item
        if (page.back) {
          const item = mediaFiles.find(m => m.name === page.back || m.id === page.back);
          if (item && !usedIds.has(item.id)) {
            orderedItems.push(item);
            usedIds.add(item.id);
          }
        }
      });
      
      // Add any remaining items from grid that weren't in the mapping
      gridSlots.filter(Boolean).forEach(item => {
        if (!usedIds.has(item.id)) {
          orderedItems.push(item);
        }
      });
      
      setItems(orderedItems);
    } else {
      // Otherwise use grid order
      const gridItems = gridSlots.filter(slot => slot !== null);
      setItems(gridItems);
    }
  }, [gridSlots, currentMapping, mediaFiles]);

  // Get media URL for display
  const getMediaUrl = (item) => {
    if (!item) return null;

    // For text pages
    if (item.isTextPage || item.metadata?.isTextPage) {
      return item.thumbnail || item.url;
    }

    // For regular media
    return item.thumbnail || item.url;
  };

  // Get media type
  const getMediaType = (item) => {
    if (!item) return 'unknown';
    if (item.isTextPage || item.metadata?.isTextPage) return 'text';
    if (item.type?.startsWith('image/')) return 'image';
    if (item.type?.startsWith('video/')) return 'video';
    if (item.type?.startsWith('audio/')) return 'audio';
    if (item.type?.includes('gltf') || item.type?.includes('glb')) return '3d';
    return 'unknown';
  };

  // Handle drag end
  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      setItems((prevItems) => {
        const oldIndex = prevItems.findIndex(item => item.id === active.id);
        const newIndex = prevItems.findIndex(item => item.id === over.id);

        return arrayMove(prevItems, oldIndex, newIndex);
      });
    }
  };

  // Apply flow transformations to items
  const getTransformedItems = () => {
    let transformedItems = [...items];

    // Apply flow pattern
    if (flowType === 'zigzag') {
      const cols = gridConfig.columns;
      const rows = Math.ceil(items.length / cols);
      transformedItems = [];

      for (let row = 0; row < rows; row++) {
        const rowItems = items.slice(row * cols, (row + 1) * cols);
        if (row % 2 === 1) {
          rowItems.reverse();
        }
        transformedItems.push(...rowItems);
      }
    } else if (flowType === 'vertical') {
      transformedItems = [];
      const cols = gridConfig.columns;
      const rows = Math.ceil(items.length / cols);

      for (let col = 0; col < cols; col++) {
        for (let row = 0; row < rows; row++) {
          const index = row * cols + col;
          if (index < items.length) {
            transformedItems.push(items[index]);
          }
        }
      }
    }

    // Apply start corner
    if (startCorner === 'top-right' || startCorner === 'bottom-right') {
      const cols = gridConfig.columns;
      const rows = Math.ceil(transformedItems.length / cols);
      const mirrored = [];
      
      for (let row = 0; row < rows; row++) {
        const rowItems = transformedItems.slice(row * cols, (row + 1) * cols);
        rowItems.reverse();
        mirrored.push(...rowItems);
      }
      transformedItems = mirrored;
    }
    
    if (startCorner === 'bottom-left' || startCorner === 'bottom-right') {
      const cols = gridConfig.columns;
      const rows = Math.ceil(transformedItems.length / cols);
      const flipped = [];
      
      for (let row = rows - 1; row >= 0; row--) {
        const rowItems = transformedItems.slice(row * cols, (row + 1) * cols);
        flipped.push(...rowItems);
      }
      transformedItems = flipped;
    }

    return transformedItems;
  };

  // Convert items array to book pages
  const itemsToPages = (itemsArray) => {
  const pages = [];
  
  if (itemsArray.length === 0) return pages;
  
  if (itemsArray.length === 1) {
    // Single item: it's both front and back cover
    pages.push({
      front: itemsArray[0],
      back: null
    });
    pages.push({
      front: null,
      back: itemsArray[0]
    });
    return pages;
  }

  // First page: front cover + second item
  pages.push({
    front: itemsArray[0],
    back: itemsArray.length > 1 ? itemsArray[1] : null
  });

  // Interior pages
  for (let i = 2; i < itemsArray.length - 1; i += 2) {
    pages.push({
      front: itemsArray[i],
      back: itemsArray[i + 1] || null
    });
  }

  // Last page: ensure back cover is always set
  const lastItem = itemsArray[itemsArray.length - 1];
  
  // Check if last item is already used in previous page
  const lastPageIndex = pages.length - 1;
  if (lastPageIndex >= 0 && pages[lastPageIndex].back === null && itemsArray.length > 2) {
    // Last interior page has empty back, put second-to-last there
    pages[lastPageIndex].back = itemsArray[itemsArray.length - 2];
  }
  
  // Always add final page with back cover
  pages.push({
    front: null,
    back: lastItem
  });

  return pages;
};

  // Get preview pages based on current item order
  const getPreviewPages = () => {
    const transformedItems = getTransformedItems();
    return itemsToPages(transformedItems);
  };

  // Render grid view
  const renderGridView = () => (
    <div className="flex-1 p-4 overflow-auto">
      <div className="mb-4">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Drag to reorder items ({items.length} total)
        </h3>
        <div className="text-xs text-gray-500 dark:text-gray-400">
          First item will be the front cover, last item will be the back cover
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={items.map(item => item.id)}
          strategy={rectSortingStrategy}
        >
          <div className="grid grid-cols-4 gap-3">
            {items.map((item, index) => (
              <SortableGridItem
                key={item.id}
                id={item.id}
                item={item}
                index={index}
                getMediaUrl={getMediaUrl}
                getMediaType={getMediaType}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Add last item indicator */}
      {items.length > 0 && (
        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 text-right">
          Last item (#{items.length - 1}) will be the back cover
        </div>
      )}
    </div>
  );

  // Render preview
  const renderPreview = () => {
    const pages = getPreviewPages();
    const currentPageData = pages[previewPage] || { front: null, back: null };

    return (
      <div className="flex-1 p-4 overflow-auto">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Book Preview - Page {previewPage + 1} of {pages.length}
          </h3>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setPreviewPage(Math.max(0, previewPage - 1))}
              disabled={previewPage === 0}
              className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => setPreviewPage(Math.min(pages.length - 1, previewPage + 1))}
              disabled={previewPage >= pages.length - 1}
              className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* Book spread preview */}
        <div className="flex justify-center">
          <div className="flex gap-1 bg-gray-200 dark:bg-gray-800 p-4 rounded-lg shadow-inner">
            {/* Left page */}
            <div className="w-64 h-96 bg-white dark:bg-gray-700 rounded-l shadow-lg overflow-hidden relative">
              {currentPageData.front ? (
                <>
                  {getMediaUrl(currentPageData.front) ? (
                    <img
                      src={getMediaUrl(currentPageData.front)}
                      alt={currentPageData.front.name}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center">
                      <FileText size={48} className="text-gray-400 mb-2" />
                      <span className="text-sm text-gray-500 text-center px-4">
                        {currentPageData.front.name}
                      </span>
                    </div>
                  )}
                  {previewPage === 0 && (
                    <div className="absolute top-2 left-2 bg-green-600 text-white text-xs px-2 py-1 rounded">
                      Front Cover
                    </div>
                  )}
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  <span>Blank Page</span>
                </div>
              )}
            </div>

            {/* Right page */}
            <div className="w-64 h-96 bg-white dark:bg-gray-700 rounded-r shadow-lg overflow-hidden relative">
              {currentPageData.back ? (
                <>
                  {getMediaUrl(currentPageData.back) ? (
                    <img
                      src={getMediaUrl(currentPageData.back)}
                      alt={currentPageData.back.name}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center">
                      <FileText size={48} className="text-gray-400 mb-2" />
                      <span className="text-sm text-gray-500 text-center px-4">
                        {currentPageData.back.name}
                      </span>
                    </div>
                  )}
                  {previewPage === pages.length - 1 && (
                    <div className="absolute top-2 right-2 bg-purple-600 text-white text-xs px-2 py-1 rounded">
                      Back Cover
                    </div>
                  )}
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  <span>Blank Page</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Page navigation */}
        <div className="mt-4 flex gap-2 overflow-x-auto pb-2 justify-center">
          {pages.map((page, index) => (
            <button
              key={index}
              onClick={() => setPreviewPage(index)}
              className={`flex-shrink-0 px-3 py-1 text-xs rounded border-2 transition-all
                ${previewPage === index ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30' : 'border-gray-300 dark:border-gray-600'}`}
            >
              Page {index + 1}
            </button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center" style={{ zIndex: 9999 }}>
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-2xl w-11/12 h-5/6 max-w-6xl flex flex-col" style={{ zIndex: 10000 }}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
          <h2 className="text-xl font-semibold flex items-center dark:text-white">
            <Book className="mr-2" size={24} />
            Configure Book Page Mapping
          </h2>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setViewMode(viewMode === 'grid' ? 'preview' : 'grid')}
              className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
              title={viewMode === 'grid' ? 'Preview book' : 'Edit order'}
            >
              {viewMode === 'grid' ? <Book size={20} /> : <Grid size={20} />}
            </button>

            <button onClick={onCancel} className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Main content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left panel - Settings */}
          <div className="w-64 border-r dark:border-gray-700 p-4 overflow-y-auto">
            <div className="space-y-4">
              {/* Book metadata */}
              <div>
                <label className="block text-sm font-medium mb-1 dark:text-gray-300">Title</label>
                <input
                  type="text"
                  value={bookMetadata.title}
                  onChange={(e) => setBookMetadata({ ...bookMetadata, title: e.target.value })}
                  className="w-full px-3 py-2 rounded border dark:bg-gray-800 dark:border-gray-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 dark:text-gray-300">Author</label>
                <input
                  type="text"
                  value={bookMetadata.author}
                  onChange={(e) => setBookMetadata({ ...bookMetadata, author: e.target.value })}
                  className="w-full px-3 py-2 rounded border dark:bg-gray-800 dark:border-gray-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 dark:text-gray-300">Description</label>
                <textarea
                  value={bookMetadata.description}
                  onChange={(e) => setBookMetadata({ ...bookMetadata, description: e.target.value })}
                  className="w-full px-3 py-2 rounded border dark:bg-gray-800 dark:border-gray-600"
                  rows="3"
                />
              </div>

              {/* Flow settings */}
              <div>
                <label className="block text-sm font-medium mb-2 dark:text-gray-300">Flow Type</label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="horizontal"
                      checked={flowType === 'horizontal'}
                      onChange={(e) => setFlowType(e.target.value)}
                      className="mr-2"
                    />
                    <span className="text-sm">→ Horizontal (Left to Right)</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="vertical"
                      checked={flowType === 'vertical'}
                      onChange={(e) => setFlowType(e.target.value)}
                      className="mr-2"
                    />
                    <span className="text-sm">↓ Vertical (Top to Bottom)</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="zigzag"
                      checked={flowType === 'zigzag'}
                      onChange={(e) => setFlowType(e.target.value)}
                      className="mr-2"
                    />
                    <span className="text-sm">↗ Zigzag</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="manual"
                      checked={flowType === 'manual'}
                      onChange={(e) => setFlowType(e.target.value)}
                      className="mr-2"
                    />
                    <span className="text-sm">✋ Manual (Drag & Drop)</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 dark:text-gray-300">Start Corner</label>
                <select
                  value={startCorner}
                  onChange={(e) => setStartCorner(e.target.value)}
                  className="w-full px-3 py-2 rounded border dark:bg-gray-800 dark:border-gray-600"
                >
                  <option value="top-left">Top Left</option>
                  <option value="top-right">Top Right</option>
                  <option value="bottom-left">Bottom Left</option>
                  <option value="bottom-right">Bottom Right</option>
                </select>
              </div>

              {/* Item info */}
              <div className="pt-4 border-t dark:border-gray-700">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Total Items: {items.length}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  Book Pages: {Math.ceil((items.length + 1) / 2)}
                </p>
              </div>
            </div>
          </div>

          {/* Right panel - Grid or Preview */}
          {viewMode === 'grid' ? renderGridView() : renderPreview()}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 p-4 border-t dark:border-gray-700">
          <button
            onClick={onCancel}
            className="px-4 py-2 border rounded hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-800"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              const transformedItems = getTransformedItems();
              const pages = itemsToPages(transformedItems);
              
              console.log('Creating book with pages:', pages);
              onConfirm(pages, bookMetadata);
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Create Book
          </button>
        </div>
      </div>
    </div>
  );
};

export default PageMappingDialog;