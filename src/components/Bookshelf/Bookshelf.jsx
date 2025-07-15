// components/Bookshelf/Bookshelf.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X, Download, Trash2, Plus, Book, Edit2, Palette,
  Save, Upload, Settings, ChevronDown, ChevronUp, Eye, 
  RefreshCw, AlertTriangle, RotateCw, Image as ImageIcon,
  Maximize2, Grid, Sliders, Info, FileText, Move
} from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import AnimatedBookViewer from '../BookViewer/AnimatedBookViewer';

const BOOKSHELF_STORAGE_KEY = 'gridworm_bookshelf_data_v5';
const THUMBNAIL_CACHE_PREFIX = 'gridworm_thumb_cache_';

const defaultThemes = {
  classic: {
    name: 'Classic Wood',
    background: 'linear-gradient(180deg, #8B4513 0%, #A0522D 100%)',
    shelfColor: '#654321',
    shelfShadow: 'inset 0 2px 4px rgba(0,0,0,0.3)',
    bookTextColor: '#FFFFFF'
  },
  modern: {
    name: 'Modern White',
    background: 'linear-gradient(180deg, #F5F5F5 0%, #E0E0E0 100%)',
    shelfColor: '#CCCCCC',
    shelfShadow: '0 2px 4px rgba(0,0,0,0.1)',
    bookTextColor: '#333333'
  },
  dark: {
    name: 'Dark Mode',
    background: 'linear-gradient(180deg, #1a1a1a 0%, #2d2d2d 100%)',
    shelfColor: '#3a3a3a',
    shelfShadow: '0 2px 8px rgba(0,0,0,0.5)',
    bookTextColor: '#FFFFFF'
  },
  library: {
    name: 'Library Green',
    background: 'linear-gradient(180deg, #2E5F2E 0%, #1F3F1F 100%)',
    shelfColor: '#1A2F1A',
    shelfShadow: 'inset 0 2px 6px rgba(0,0,0,0.4)',
    bookTextColor: '#F0F0F0'
  }
};

// Utility function to create low-quality thumbnails
const createLowQualityThumbnail = async (imageUrl, maxSize = 100) => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // Calculate dimensions to maintain aspect ratio
      let width = img.width;
      let height = img.height;
      
      if (width > height) {
        if (width > maxSize) {
          height = (height / width) * maxSize;
          width = maxSize;
        }
      } else {
        if (height > maxSize) {
          width = (width / height) * maxSize;
          height = maxSize;
        }
      }
      
      canvas.width = width;
      canvas.height = height;
      
      // Draw and compress
      ctx.drawImage(img, 0, 0, width, height);
      
      // Convert to low quality JPEG
      const dataUrl = canvas.toDataURL('image/jpeg', 0.3);
      resolve(dataUrl);
    };
    
    img.onerror = () => {
      resolve(null);
    };
    
    img.src = imageUrl;
  });
};

// Enhanced Edit Book Dialog
const EditBookDialog = ({ book, onSave, onCancel, darkMode }) => {
  const [editedBook, setEditedBook] = useState({
    title: book.title || '',
    author: book.author || '',
    description: book.description || book.volumeMetadata?.description || '',
    color: book.color || '#8B4513'
  });

  const bookColors = [
    '#8B4513', '#DC143C', '#4682B4', '#228B22', '#4B0082',
    '#FF6347', '#FFD700', '#00CED1', '#FF1493', '#32CD32',
    '#800080', '#FF4500', '#00BFFF', '#9370DB', '#20B2AA',
    '#2F4F4F', '#B22222', '#5F9EA0', '#D2691E', '#6495ED'
  ];

  const handleSave = () => {
    onSave(editedBook);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100]">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-[480px] max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-bold mb-4 dark:text-white">Edit Book Details</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 dark:text-gray-300">Title</label>
            <input
              type="text"
              value={editedBook.title}
              onChange={(e) => setEditedBook({ ...editedBook, title: e.target.value })}
              className="w-full px-3 py-2 rounded border border-gray-300 dark:bg-gray-700
                       dark:border-gray-600 dark:text-white focus:outline-none focus:ring-2 
                       focus:ring-blue-500"
              placeholder="Book Title"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 dark:text-gray-300">Author</label>
            <input
              type="text"
              value={editedBook.author}
              onChange={(e) => setEditedBook({ ...editedBook, author: e.target.value })}
              className="w-full px-3 py-2 rounded border border-gray-300 dark:bg-gray-700
                       dark:border-gray-600 dark:text-white focus:outline-none focus:ring-2 
                       focus:ring-blue-500"
              placeholder="Author Name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 dark:text-gray-300">Description</label>
            <textarea
              value={editedBook.description}
              onChange={(e) => setEditedBook({ ...editedBook, description: e.target.value })}
              className="w-full px-3 py-2 rounded border border-gray-300 dark:bg-gray-700
                       dark:border-gray-600 dark:text-white focus:outline-none focus:ring-2 
                       focus:ring-blue-500 resize-none"
              placeholder="Book Description"
              rows="4"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 dark:text-gray-300">Cover Color</label>
            <div className="space-y-2">
              <div className="grid grid-cols-10 gap-2">
                {bookColors.map(color => (
                  <button
                    key={color}
                    onClick={() => setEditedBook({ ...editedBook, color })}
                    className={`w-8 h-8 rounded border-2 transition-all hover:scale-110 ${
                      editedBook.color === color 
                        ? 'border-gray-900 dark:border-white shadow-lg' 
                        : 'border-gray-300 dark:border-gray-600'
                    }`}
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="color"
                  value={editedBook.color}
                  onChange={(e) => setEditedBook({ ...editedBook, color: e.target.value })}
                  className="w-12 h-8 rounded border cursor-pointer"
                />
                <input
                  type="text"
                  value={editedBook.color}
                  onChange={(e) => setEditedBook({ ...editedBook, color: e.target.value })}
                  className="flex-1 px-2 py-1 text-sm rounded border dark:bg-gray-700 
                           dark:border-gray-600 dark:text-white font-mono"
                />
              </div>
            </div>
          </div>

          {/* Book Stats */}
          <div className="pt-4 border-t dark:border-gray-700">
            <h4 className="text-sm font-medium mb-2 dark:text-gray-300">Book Information</h4>
            <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 dark:text-gray-400">
              <div>Pages: {book.pages?.length || book.pageCount || 0}</div>
              <div>Created: {new Date(book.createdAt || Date.now()).toLocaleDateString()}</div>
            </div>
          </div>
        </div>

        <div className="flex justify-end mt-6 space-x-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 
                     dark:hover:bg-gray-600 transition-colors dark:text-gray-300"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 
                     transition-colors"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

// Enhanced Book Item Component with properly visible hover info
const BookItem = ({ 
  book, 
  index, 
  shelfIndex, 
  onEdit,
  onDelete, 
  onView, 
  onExport,
  onPreview,
  theme, 
  darkMode,
  mediaFiles
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const bookRef = useRef(null);
  const hoverTimeoutRef = useRef(null);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: book.id,
    data: {
      book,
      shelfIndex,
      index
    }
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    cursor: isDragging ? 'grabbing' : 'grab',
  };

  // Get cover image from cached thumbnails or first page
  const getCoverImage = () => {
    // First check if we have a cached thumbnail
    if (book.cachedCoverThumbnail) {
      return book.cachedCoverThumbnail;
    }

    // If book has pages array
    if (book.pages && book.pages.length > 0) {
      const firstPage = book.pages[0];
      
      // Get the front of the first page
      if (firstPage && firstPage.front) {
        // If mediaFiles are provided, find the actual media
        if (mediaFiles && mediaFiles.length > 0) {
          const frontMedia = mediaFiles.find(m => 
            m.id === firstPage.front || 
            m.name === firstPage.front ||
            (typeof firstPage.front === 'object' && m.id === firstPage.front.id)
          );
          if (frontMedia) {
            return frontMedia.thumbnail || frontMedia.url || null;
          }
        }
        
        // If front is an object with thumbnail
        if (typeof firstPage.front === 'object' && firstPage.front.thumbnail) {
          return firstPage.front.thumbnail;
        }
      }
    }
    
    return null;
  };

  const coverImage = getCoverImage();

  // Handle mouse enter with delay
  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    setIsHovered(true);
  };

  // Handle mouse leave with delay
  const handleMouseLeave = () => {
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovered(false);
    }, 300); // Increased delay for better interaction
  };

  // Clear timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div
      ref={setNodeRef}
      style={{ ...style, position: 'relative' }}
      className="relative"
    >
      {/* Main hover container */}
      <div
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{ position: 'relative' }}
      >
        {/* Book spine */}
        <div
          ref={bookRef}
          className={`relative w-[60px] h-[200px] rounded cursor-pointer shadow-lg 
                     transition-all duration-200 flex flex-col justify-between p-2 overflow-hidden
                     ${isHovered ? 'shadow-xl -translate-y-1' : ''}`}
          style={{
            backgroundColor: book.color || '#8B4513'
          }}
          onClick={() => !isDragging && onView(book)}
          {...attributes}
          {...listeners}
        >
          {/* Spine texture with cover image */}
          {coverImage && (
            <div 
              className="absolute inset-0 opacity-40"
              style={{
                backgroundImage: `url(${coverImage})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                filter: 'brightness(0.8) contrast(1.2)'
              }}
            />
          )}
          
          {/* Gradient overlay for depth */}
          <div 
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `linear-gradient(90deg, 
                rgba(0,0,0,0.3) 0%, 
                rgba(0,0,0,0.1) 20%,
                rgba(0,0,0,0) 50%,
                rgba(0,0,0,0.1) 80%,
                rgba(0,0,0,0.3) 100%)`
            }}
          />
          
          {/* Title */}
          <div
            className="text-xs font-bold writing-vertical-lr text-center flex-1 
                       overflow-hidden relative z-10 drop-shadow-lg px-1"
            style={{ 
              color: theme.bookTextColor,
              textShadow: '0 1px 2px rgba(0,0,0,0.5)',
              writingMode: 'vertical-rl',
              textOrientation: 'mixed'
            }}
          >
            {book.title}
          </div>

          {/* Book spine details */}
          <div className="relative z-10 space-y-1">
            <div className="w-full h-px bg-white/30" />
            {book.author && (
              <div className="text-[10px] text-center opacity-80 drop-shadow truncate" 
                   style={{ color: theme.bookTextColor }}>
                {book.author.split(' ').map(word => word[0]).join('')}
              </div>
            )}
            <div className="w-full h-px bg-white/30" />
            <div className="text-xs text-center font-semibold drop-shadow" 
                 style={{ color: theme.bookTextColor }}>
              {book.pageCount || book.pages?.length || 0}p
            </div>
          </div>
        </div>

        {/* Hover info card - now properly visible */}
        {isHovered && !isDragging && (
          <div
            className="absolute left-1/2 -translate-x-1/2 bottom-full mb-12 
                     bg-white dark:bg-gray-800 rounded-lg shadow-2xl 
                     border border-gray-200 dark:border-gray-700 
                     w-96 transition-all duration-200 transform"
            style={{ zIndex: 10000 }}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            <div className="flex">
              {/* Left side - Book info */}
              <div className="flex-1 p-4">
                <h3 className="font-bold text-lg dark:text-white mb-1">
                  {book.title || 'Untitled'}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  Author: {book.author || 'Unknown'}
                </p>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  <p className="font-semibold">Description:</p>
                  <p className="text-xs mt-1">
                    {book.description || 'No description available'}
                  </p>
                </div>
              </div>

              {/* Right side - Cover image */}
              <div className="w-32 h-48 bg-gray-200 dark:bg-gray-700 rounded-r-lg overflow-hidden flex-shrink-0">
                {coverImage ? (
                  <img 
                    src={coverImage} 
                    alt={book.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.parentElement.innerHTML = '<div class="w-full h-full flex items-center justify-center text-gray-400 text-sm">No Cover</div>';
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 font-bold text-sm">
                    No Cover
                  </div>
                )}
              </div>
            </div>

            {/* Arrow pointing down */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full">
              <div className="w-0 h-0 border-l-[10px] border-l-transparent 
                            border-r-[10px] border-r-transparent 
                            border-t-[10px] border-t-white dark:border-t-gray-800"></div>
            </div>
          </div>
        )}

        {/* Action buttons - Always visible on hover */}
        {isHovered && !isDragging && (
          <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 flex space-x-1"
               style={{ zIndex: 9999 }}
               onMouseEnter={handleMouseEnter}
               onMouseLeave={handleMouseLeave}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPreview(book);
              }}
              className="w-8 h-8 bg-white dark:bg-gray-700 rounded shadow-lg hover:shadow-xl 
                       flex items-center justify-center transition-all hover:scale-110"
              title="2D Preview"
            >
              <Eye size={16} className="text-gray-700 dark:text-gray-300" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit(book);
              }}
              className="w-8 h-8 bg-white dark:bg-gray-700 rounded shadow-lg hover:shadow-xl 
                       flex items-center justify-center transition-all hover:scale-110"
              title="Edit"
            >
              <Edit2 size={16} className="text-gray-700 dark:text-gray-300" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (window.confirm(`Delete "${book.title}"?`)) {
                  onDelete(shelfIndex, index);
                }
              }}
              className="w-8 h-8 bg-white dark:bg-gray-700 rounded shadow-lg hover:shadow-xl 
                       flex items-center justify-center transition-all hover:scale-110"
              title="Delete"
            >
              <Trash2 size={16} className="text-red-500" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// Shelf Component
const Shelf = ({ 
  shelfData, 
  shelfIndex, 
  theme, 
  onBookAction, 
  darkMode, 
  onEditShelfName,
  onDeleteShelf,
  shelves,
  mediaFiles,
  onMoveShelf
}) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(shelfData.label);
  const [isDraggingShelf, setIsDraggingShelf] = useState(false);

  const handleSaveShelfName = () => {
    if (editedName.trim()) {
      onEditShelfName(shelfIndex, editedName.trim());
    }
    setIsEditingName(false);
  };

  return (
    <div 
      className={`mb-8 group relative ${isDraggingShelf ? 'opacity-50' : ''}`}
      draggable={shelves.length > 1}
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('shelfIndex', shelfIndex.toString());
        setIsDraggingShelf(true);
      }}
      onDragEnd={() => setIsDraggingShelf(false)}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
      }}
      onDrop={(e) => {
        e.preventDefault();
        const fromIndex = parseInt(e.dataTransfer.getData('shelfIndex'));
        if (fromIndex !== shelfIndex && onMoveShelf) {
          onMoveShelf(fromIndex, shelfIndex);
        }
      }}
    >
      {/* Drag handle for entire shelf */}
      {shelves.length > 1 && (
        <div className="absolute left-0 top-0 bottom-0 w-8 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-move">
          <Move size={20} className="text-gray-400 dark:text-gray-600" />
        </div>
      )}
      
      {/* Shelf label */}
      <div className="mb-2 px-4 flex items-center justify-between">
        {isEditingName ? (
          <input
            type="text"
            value={editedName}
            onChange={(e) => setEditedName(e.target.value)}
            onBlur={handleSaveShelfName}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSaveShelfName();
              if (e.key === 'Escape') {
                setEditedName(shelfData.label);
                setIsEditingName(false);
              }
            }}
            className="text-sm font-medium px-2 py-1 rounded border dark:bg-gray-700 dark:border-gray-600"
            autoFocus
          />
        ) : (
          <>
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
              {shelfData.label} ({shelfData.books.length} books)
            </h3>
            <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => setIsEditingName(true)}
                className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                title="Edit shelf name"
              >
                <Edit2 size={14} className="text-gray-500 dark:text-gray-400" />
              </button>
              {shelves.length > 1 && (
                <button
                  onClick={() => onDeleteShelf(shelfIndex)}
                  className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors"
                  title="Delete shelf"
                >
                  <Trash2 size={14} className="text-red-500" />
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {/* Books container with extra space for hover elements */}
      <div className="relative min-h-[280px]">
        <SortableContext
          items={shelfData.books.map(book => book.id)}
          strategy={horizontalListSortingStrategy}
        >
          <div className="flex items-end px-4 pb-16 min-h-[200px] overflow-x-auto gap-2">
            {shelfData.books.map((book, bookIndex) => (
              <BookItem
                key={book.id}
                book={book}
                index={bookIndex}
                shelfIndex={shelfIndex}
                theme={theme}
                onEdit={onBookAction.edit}
                onDelete={onBookAction.delete}
                onView={onBookAction.view}
                onExport={onBookAction.export}
                onPreview={onBookAction.preview}
                darkMode={darkMode}
                mediaFiles={mediaFiles}
              />
            ))}

            {shelfData.books.length === 0 && (
              <div className="text-center text-gray-400 dark:text-gray-600 w-full py-8">
                Drop books here or add from grid
              </div>
            )}
          </div>
        </SortableContext>

        {/* Shelf board */}
        <div
          className="absolute bottom-0 left-0 right-0 h-4 rounded"
          style={{
            backgroundColor: theme.shelfColor,
            boxShadow: theme.shelfShadow
          }}
        />
      </div>
    </div>
  );
};

// Main Bookshelf Component
const Bookshelf = ({ onClose, onApplyBookLayout, getCurrentBookData, darkMode, onAddBook, mediaFiles, onShelvesUpdate }) => {
  const [shelves, setShelves] = useState([
    { id: 'shelf-1', label: 'My Books', books: [] }
  ]);

  const [selectedTheme, setSelectedTheme] = useState('classic');
  const [showSettings, setShowSettings] = useState(false);
  const [previewBook, setPreviewBook] = useState(null);
  const [editingBook, setEditingBook] = useState(null);
  const [activeId, setActiveId] = useState(null);
  const fileInputRef = useRef(null);

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

  // Cache thumbnails for books
  const cacheBookThumbnails = useCallback(async (book) => {
    try {
      const cacheKey = `${THUMBNAIL_CACHE_PREFIX}${book.id}`;
      
      // Check if already cached
      const existingCache = localStorage.getItem(cacheKey);
      if (existingCache) {
        return JSON.parse(existingCache);
      }

      // Get current book data for thumbnail generation
      const fullBookData = getCurrentBookData ? getCurrentBookData() : null;
      if (!fullBookData || !fullBookData.mediaFiles) return {};

      const thumbnailCache = {};
      
      // Cache first few pages for preview
      const pagesToCache = Math.min(6, book.pages?.length || 0);
      
      for (let i = 0; i < pagesToCache; i++) {
        const page = book.pages[i];
        if (!page) continue;

        // Cache front page
        if (page.front) {
          const media = fullBookData.mediaFiles.find(m => 
            m.name === page.front || m.id === page.front
          );
          if (media && (media.thumbnail || media.url)) {
            const lowQualityThumb = await createLowQualityThumbnail(
              media.thumbnail || media.url
            );
            if (lowQualityThumb) {
              thumbnailCache[`${i}_front`] = lowQualityThumb;
            }
          }
        }

        // Cache back page
        if (page.back) {
          const media = fullBookData.mediaFiles.find(m => 
            m.name === page.back || m.id === page.back
          );
          if (media && (media.thumbnail || media.url)) {
            const lowQualityThumb = await createLowQualityThumbnail(
              media.thumbnail || media.url
            );
            if (lowQualityThumb) {
              thumbnailCache[`${i}_back`] = lowQualityThumb;
            }
          }
        }
      }

      // Store in localStorage
      try {
        localStorage.setItem(cacheKey, JSON.stringify(thumbnailCache));
      } catch (e) {
        console.warn('Could not cache thumbnails:', e);
      }

      return thumbnailCache;
    } catch (error) {
      console.error('Error caching thumbnails:', error);
      return {};
    }
  }, [getCurrentBookData]);

  // Load cached thumbnails for preview
  const loadCachedThumbnails = useCallback((bookId) => {
    try {
      const cacheKey = `${THUMBNAIL_CACHE_PREFIX}${bookId}`;
      const cached = localStorage.getItem(cacheKey);
      return cached ? JSON.parse(cached) : {};
    } catch (error) {
      console.error('Error loading cached thumbnails:', error);
      return {};
    }
  }, []);

  // Minimal storage - only store essential book data
  const saveBookshelfMinimal = useCallback((newShelves, newTheme) => {
    try {
      const minimalData = {
        shelves: (newShelves || shelves).map(shelf => ({
          id: shelf.id,
          label: shelf.label,
          books: shelf.books.map(book => ({
            id: book.id,
            title: book.title,
            author: book.author,
            description: book.description,
            color: book.color,
            skew: 0,
            createdAt: book.createdAt,
            pageCount: book.pages?.length || book.pageCount || 0,
            // Store page structure with references
            pages: book.pages?.map(page => ({
              front: page.front,
              back: page.back
            })) || []
          }))
        })),
        theme: newTheme || selectedTheme,
        version: '5.0'
      };
      
      localStorage.setItem(BOOKSHELF_STORAGE_KEY, JSON.stringify(minimalData));
    } catch (error) {
      console.error('Error saving bookshelf:', error);
    }
  }, [shelves, selectedTheme]);

  // Load saved bookshelf data
  useEffect(() => {
    try {
      const saved = localStorage.getItem(BOOKSHELF_STORAGE_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        if (data.shelves && Array.isArray(data.shelves)) {
          setShelves(data.shelves.map(shelf => ({
            ...shelf,
            books: shelf.books.map(book => ({
              ...book,
              skew: 0,
              // Pages are already in the correct format
              pages: book.pages || []
            }))
          })));
        }
        if (data.theme) setSelectedTheme(data.theme);
      }
    } catch (error) {
      console.error('Error loading bookshelf:', error);
    }
  }, []);
  
  // Save shelves whenever they change
  useEffect(() => {
    const saveToStorage = () => {
      const dataToSave = {
        version: 5,
        shelves: shelves,
        theme: selectedTheme,
        lastUpdated: new Date().toISOString()
      };
      localStorage.setItem(BOOKSHELF_STORAGE_KEY, JSON.stringify(dataToSave));
      
      // Notify parent component
      if (onShelvesUpdate) {
        onShelvesUpdate(shelves);
      }
    };
    
    // Don't save on initial load
    if (shelves.some(shelf => shelf.books.length > 0)) {
      saveToStorage();
    }
  }, [shelves, selectedTheme, onShelvesUpdate]);

  // Add book from current grid - simplified
  const handleAddCurrent = useCallback(async () => {
    const bookData = getCurrentBookData();
    
    console.log('Adding book from current data:', bookData);
    
    // Simple page storage - just store references
    const simplifiedPages = bookData.pages?.map(page => ({
      front: page.front,
      back: page.back
    })) || [];
    
    const newBook = {
      id: `book-${Date.now()}-${Math.random()}`,
      title: bookData.title || `Book ${new Date().toLocaleDateString()}`,
      author: bookData.author || 'Unknown',
      description: bookData.description || '',
      pages: simplifiedPages,
      color: bookData.color || '#8B4513',
      skew: 0,
      createdAt: new Date().toISOString(),
      pageCount: simplifiedPages.length
    };

    // Cache thumbnails for preview
    await cacheBookThumbnails(newBook);

    const targetShelfIndex = shelves.reduce((minIndex, shelf, index) => 
      shelf.books.length < shelves[minIndex].books.length ? index : minIndex, 0
    );
    
    const newShelves = [...shelves];
    newShelves[targetShelfIndex].books.push(newBook);
    setShelves(newShelves);
    saveBookshelfMinimal(newShelves);

    showNotification(`"${newBook.title}" added to ${newShelves[targetShelfIndex].label}!`, 'success');
    
    if (onAddBook) {
      onAddBook(newBook);
    }
  }, [getCurrentBookData, shelves, saveBookshelfMinimal, onAddBook, cacheBookThumbnails]);

  // Show notification
  const showNotification = (message, type = 'info') => {
    const notification = document.createElement('div');
    const bgColor = 
      type === 'success' ? 'bg-green-600' : 
      type === 'error' ? 'bg-red-600' : 
      type === 'warning' ? 'bg-yellow-600' : 'bg-blue-600';
    
    notification.className = `fixed top-4 right-4 ${bgColor} text-white px-4 py-2 rounded shadow-lg z-[100] flex items-center max-w-md`;
    notification.innerHTML = `
      ${type === 'success' ? '<svg class="w-5 h-5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>' : ''}
      <span>${message}</span>
    `;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
  };

  // Handle preview with cached thumbnails
  const handlePreview = useCallback(async (book) => {
    // Load cached thumbnails
    const cachedThumbnails = loadCachedThumbnails(book.id);
    
    // Build media files from cache
    const previewMediaFiles = [];
    book.pages?.forEach((page, pageIndex) => {
      if (page.front) {
        const cacheKey = `${pageIndex}_front`;
        if (cachedThumbnails[cacheKey]) {
          previewMediaFiles.push({
            id: page.front,
            name: page.front,
            thumbnail: cachedThumbnails[cacheKey],
            url: cachedThumbnails[cacheKey],
            type: 'image/jpeg'
          });
        }
      }
      if (page.back) {
        const cacheKey = `${pageIndex}_back`;
        if (cachedThumbnails[cacheKey]) {
          previewMediaFiles.push({
            id: page.back,
            name: page.back,
            thumbnail: cachedThumbnails[cacheKey],
            url: cachedThumbnails[cacheKey],
            type: 'image/jpeg'
          });
        }
      }
    });

    // If we have current media files, use those instead
    const actualMediaFiles = mediaFiles && mediaFiles.length > 0 ? mediaFiles : previewMediaFiles;

    setPreviewBook({
      ...book,
      mediaFiles: actualMediaFiles
    });
  }, [loadCachedThumbnails, mediaFiles]);

  // Import book
  const handleImportBook = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const bookData = JSON.parse(event.target.result);
        const newBook = {
          id: `book-${Date.now()}-${Math.random()}`,
          title: bookData.title || 'Imported Book',
          author: bookData.author || 'Unknown',
          description: bookData.description || '',
          pages: bookData.pages || [],
          color: bookData.color || '#4682B4',
          skew: 0,
          createdAt: new Date().toISOString()
        };

        const targetShelfIndex = 0;
        const newShelves = [...shelves];
        newShelves[targetShelfIndex].books.push(newBook);
        setShelves(newShelves);
        saveBookshelfMinimal(newShelves);

        showNotification('Book imported successfully!', 'success');
      } catch (error) {
        showNotification('Error importing book. Please check the file format.', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Export book
  const handleExportBook = (book) => {
    const fullBook = getCurrentBookData ? getCurrentBookData() : null;
    
    const exportData = {
      title: book.title,
      author: book.author,
      description: book.description,
      color: book.color,
      pages: fullBook?.pages || book.pages || [],
      mediaFiles: fullBook?.mediaFiles || [],
      exportedAt: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${book.title.replace(/\s+/g, '-').toLowerCase()}.book.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Export bookshelf
  const exportBookshelf = () => {
    const exportData = {
      shelves: shelves.map(shelf => ({
        ...shelf,
        books: shelf.books.map(book => ({
          id: book.id,
          title: book.title,
          author: book.author,
          description: book.description,
          color: book.color,
          skew: 0,
          createdAt: book.createdAt,
          pageCount: book.pages?.length || book.pageCount || 0,
          pages: book.pages || []
        }))
      })),
      theme: selectedTheme,
      exportedAt: new Date().toISOString(),
      totalBooks: shelves.reduce((sum, shelf) => sum + shelf.books.length, 0)
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bookshelf-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    showNotification('Bookshelf exported successfully!', 'success');
  };

  // Edit book
  const handleEditBook = (book) => {
    setEditingBook(book);
  };

  const handleSaveEditedBook = (editedData) => {
    const newShelves = shelves.map(shelf => ({
      ...shelf,
      books: shelf.books.map(book => 
        book.id === editingBook.id 
          ? { 
              ...book, 
              title: editedData.title,
              author: editedData.author,
              description: editedData.description,
              color: editedData.color
            }
          : book
      )
    }));
    
    setShelves(newShelves);
    saveBookshelfMinimal(newShelves);
    setEditingBook(null);
    showNotification('Book details updated!', 'success');
  };

  // Book actions
  const bookActions = {
    edit: handleEditBook,
    delete: (shelfIndex, bookIndex) => {
      const newShelves = [...shelves];
      const deletedBook = newShelves[shelfIndex].books[bookIndex];
      newShelves[shelfIndex].books.splice(bookIndex, 1);
      setShelves(newShelves);
      saveBookshelfMinimal(newShelves);

      // Clean up cached thumbnails
      try {
        localStorage.removeItem(`${THUMBNAIL_CACHE_PREFIX}${deletedBook.id}`);
      } catch (e) {
        console.warn('Could not remove cached thumbnails');
      }

      showNotification(`"${deletedBook.title}" removed from bookshelf`, 'info');
    },
    view: (book) => {
      if (onApplyBookLayout) {
        const fullBookData = getCurrentBookData ? getCurrentBookData() : book;
        onApplyBookLayout({
          ...book,
          pages: book.pages, // Use the book's stored pages
          mediaFiles: fullBookData.mediaFiles || []
        });
        onClose();
      } else {
        showNotification("Cannot open book. Application is not configured correctly.", 'error');
      }
    },
    export: handleExportBook,
    preview: handlePreview
  };

  // Shelf management
  const addShelf = () => {
    const newShelf = {
      id: `shelf-${Date.now()}`,
      label: `Shelf ${shelves.length + 1}`,
      books: []
    };
    const newShelves = [...shelves, newShelf];
    setShelves(newShelves);
    saveBookshelfMinimal(newShelves);
  };

  const removeShelf = (index) => {
    if (shelves[index].books.length > 0) {
      if (!window.confirm(`This shelf contains ${shelves[index].books.length} books. Delete anyway?`)) return;
    }
    const newShelves = shelves.filter((_, i) => i !== index);
    setShelves(newShelves);
    saveBookshelfMinimal(newShelves);
  };

  const editShelfName = (shelfIndex, newName) => {
    const newShelves = [...shelves];
    newShelves[shelfIndex].label = newName;
    setShelves(newShelves);
    saveBookshelfMinimal(newShelves);
  };
  
  const moveShelf = (fromIndex, toIndex) => {
    const newShelves = [...shelves];
    const [movedShelf] = newShelves.splice(fromIndex, 1);
    newShelves.splice(toIndex, 0, movedShelf);
    setShelves(newShelves);
    saveBookshelfMinimal(newShelves);
  };

  // Drag handlers
  const handleDragStart = (event) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    
    if (!over) {
      setActiveId(null);
      return;
    }

    const activeData = active.data.current;
    const overData = over.data?.current;

    if (activeData && overData) {
      const fromShelfIndex = activeData.shelfIndex;
      const fromBookIndex = activeData.index;
      const toShelfIndex = overData.shelfIndex;
      const toBookIndex = overData.index;

      if (fromShelfIndex !== toShelfIndex || fromBookIndex !== toBookIndex) {
        const newShelves = [...shelves];
        
        const [movedBook] = newShelves[fromShelfIndex].books.splice(fromBookIndex, 1);
        
        if (toShelfIndex !== undefined) {
          if (toBookIndex !== undefined) {
            newShelves[toShelfIndex].books.splice(toBookIndex, 0, movedBook);
          } else {
            newShelves[toShelfIndex].books.push(movedBook);
          }
        }
        
        setShelves(newShelves);
        saveBookshelfMinimal(newShelves);
      }
    }

    setActiveId(null);
  };

  const theme = darkMode && selectedTheme === 'classic' ? defaultThemes.dark : defaultThemes[selectedTheme];
  const totalBooks = shelves.reduce((sum, shelf) => sum + shelf.books.length, 0);

  const activeBook = activeId ? 
    shelves.flatMap(shelf => shelf.books).find(book => book.id === activeId) : 
    null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div
        className="bg-white dark:bg-gray-900 rounded-lg shadow-2xl w-full max-w-7xl h-5/6 flex flex-col transition-colors"
        style={{ maxHeight: '90vh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold flex items-center text-gray-800 dark:text-white">
            <Book className="mr-2" size={28} />
            My Bookshelf
            <span className="ml-3 text-sm font-normal text-gray-500">
              {totalBooks} {totalBooks === 1 ? 'book' : 'books'}
            </span>
          </h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleAddCurrent}
              className="px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm flex items-center transition-colors"
              title="Add current grid as book"
            >
              <Plus size={16} className="mr-1" />
              Add Current
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 text-sm flex items-center transition-colors"
              title="Import book file"
            >
              <Upload size={16} className="mr-1" />
              Import
            </button>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title="Settings"
            >
              <Settings size={20} className="text-gray-700 dark:text-gray-300" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <X size={20} className="text-gray-700 dark:text-gray-300" />
            </button>
          </div>
        </div>

        {/* Settings panel */}
        {showSettings && (
          <div className="border-b border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-800">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium mb-2 text-gray-800 dark:text-white">Theme</h3>
                <div className="flex space-x-2">
                  {Object.entries(defaultThemes).map(([key, theme]) => (
                    <button
                      key={key}
                      onClick={() => {
                        setSelectedTheme(key);
                        saveBookshelfMinimal(null, key);
                      }}
                      className={`px-3 py-1 rounded text-sm transition-colors ${
                        selectedTheme === key
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                      }`}
                    >
                      {theme.name}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={exportBookshelf}
                  className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm flex items-center transition-colors"
                  title="Export entire bookshelf"
                >
                  <Download size={16} className="mr-1" />
                  Export All
                </button>
                <button
                  onClick={addShelf}
                  className="px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 text-sm flex items-center transition-colors"
                >
                  <Plus size={16} className="mr-1" />
                  Add Shelf
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Bookshelf content */}
        <div
          className="flex-1 overflow-y-auto p-6 transition-colors"
          style={{ 
            background: darkMode 
              ? 'linear-gradient(180deg, #1a1a1a 0%, #2d2d2d 100%)' 
              : theme.background 
          }}
        >
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            {shelves.map((shelf, index) => (
              <Shelf
                key={shelf.id}
                shelfData={shelf}
                shelfIndex={index}
                theme={theme}
                onBookAction={bookActions}
                onEditShelfName={editShelfName}
                onDeleteShelf={removeShelf}
                onMoveShelf={moveShelf}
                darkMode={darkMode}
                shelves={shelves}
                mediaFiles={mediaFiles}
              />
            ))}
            
            <DragOverlay>
              {activeBook ? (
                <div
                  className="w-[60px] h-[200px] rounded shadow-xl"
                  style={{
                    backgroundColor: activeBook.color || '#8B4513',
                    opacity: 0.8,
                    transform: 'rotate(5deg)'
                  }}
                />
              ) : null}
            </DragOverlay>
          </DndContext>
          
          {/* Empty state */}
          {totalBooks === 0 && (
            <div className="text-center py-16">
              <Book size={64} className="mx-auto mb-4 text-gray-300 dark:text-gray-600" />
              <p className="text-lg text-gray-500 dark:text-gray-400 mb-4">
                Your bookshelf is empty
              </p>
              <p className="text-sm text-gray-400 dark:text-gray-500">
                Add books from the grid using the "Add Current" button
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-800">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {shelves.length} {shelves.length === 1 ? 'shelf' : 'shelves'}
          </div>
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".json, .book.json"
          onChange={handleImportBook}
          className="hidden"
        />

        {/* 2D Preview dialog */}
        {previewBook && (
          <AnimatedBookViewer
            isOpen={!!previewBook}
            onClose={() => setPreviewBook(null)}
            bookData={{
              ...previewBook,
              mediaFiles: previewBook.mediaFiles || []
            }}
            volumeMetadata={previewBook.volumeMetadata || {
              title: previewBook.title,
              author: previewBook.author,
              description: previewBook.description
            }}
            embedded={true}
          />
        )}

        {/* Edit dialog */}
        {editingBook && (
          <EditBookDialog
            book={editingBook}
            onSave={handleSaveEditedBook}
            onCancel={() => setEditingBook(null)}
            darkMode={darkMode}
          />
        )}
      </div>
    </div>
  );
};

export default Bookshelf;