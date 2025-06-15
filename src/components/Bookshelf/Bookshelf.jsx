// components/Bookshelf/Bookshelf.jsx
import React, { useState, useEffect, useRef } from 'react';
import {
  X, Download, Trash2, Plus, Book, Edit2, Palette,
  GripVertical, Save, Upload, Settings, ChevronDown,
  ChevronUp, Eye, Info, RefreshCw, AlertTriangle
} from 'lucide-react';

const BOOKSHELF_STORAGE_KEY = 'gridworm_bookshelf_data';
const MAX_BOOKS_PER_SHELF = 100; // Limit to prevent performance issues

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

const BookItem = ({ book, index, shelfIndex, onRename, onRecolor, onDelete, onView, onExport, theme, isDragging, dragHandleProps, darkMode }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(book.title);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const hoverTimeoutRef = useRef(null);
  const actionTimeoutRef = useRef(null);

  const bookColors = [
    '#8B4513', '#DC143C', '#4682B4', '#228B22', '#4B0082',
    '#FF6347', '#FFD700', '#00CED1', '#FF1493', '#32CD32',
    '#800080', '#FF4500', '#00BFFF', '#9370DB', '#20B2AA'
  ];

  // Enhanced hover handling
  const handleMouseEnter = () => {
    setIsHovered(true);
    if (actionTimeoutRef.current) {
      clearTimeout(actionTimeoutRef.current);
    }
    hoverTimeoutRef.current = setTimeout(() => {
      setShowActions(true);
    }, 100);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    actionTimeoutRef.current = setTimeout(() => {
      setShowActions(false);
      setShowColorPicker(false);
    }, 300);
  };

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
      if (actionTimeoutRef.current) clearTimeout(actionTimeoutRef.current);
    };
  }, []);

  const handleRename = () => {
    if (editName.trim() && editName !== book.title) {
      onRename(shelfIndex, index, editName);
    }
    setIsEditing(false);
  };

  // Get cover image from first page with better handling
  const getCoverImage = () => {
    if (book.pages && book.pages.length > 0 && book.pages[0].front) {
      const front = book.pages[0].front;
      
      // If front is an object with thumbnail
      if (typeof front === 'object' && front !== null) {
        if (front.thumbnail) return front.thumbnail;
        if (front.url && (front.type?.startsWith('image/') || front.url.match(/\.(jpg|jpeg|png|gif|webp)$/i))) {
          return front.url;
        }
      }
      
      // If we have mediaFiles reference, try to find the media
      if (book.mediaFiles && Array.isArray(book.mediaFiles)) {
        const frontRef = typeof front === 'string' ? front : (front?.name || front?.id);
        const media = book.mediaFiles.find(m => 
          m.name === frontRef || 
          m.id === frontRef ||
          m.name === `[Missing] ${frontRef}`
        );
        
        if (media) {
          return media.thumbnail || media.url;
        }
      }
    }
    return null;
  };

  const coverImage = getCoverImage();

  return (
    <div
      className={`relative group transition-all duration-200 ${isDragging ? 'opacity-50' : ''}`}
      style={{
        width: '60px',
        height: '200px',
        margin: '0 5px',
        transform: isDragging ? 'rotate(5deg)' : 'rotate(0deg)'
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Book spine with enhanced image background */}
      <div
        className="relative w-full h-full rounded cursor-pointer shadow-lg transition-all duration-200
                   hover:shadow-xl hover:-translate-y-1 flex flex-col justify-between p-2 overflow-hidden"
        style={{
          backgroundColor: book.color || '#8B4513',
          transform: `perspective(100px) rotateY(${book.skew || 0}deg)`
        }}
        onClick={() => onView(book)}
      >
        {/* Background image for spine - higher opacity */}
        {coverImage && (
          <div 
            className="absolute inset-0 opacity-60" // Increased from opacity-30
            style={{
              backgroundImage: `url(${coverImage})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              filter: 'blur(0.5px)' // Reduced blur for clearer image
            }}
          />
        )}
        
        {/* Gradient overlay to ensure text readability */}
        <div 
          className="absolute inset-0"
          style={{
            background: `linear-gradient(to bottom, 
              rgba(0,0,0,0.3) 0%, 
              rgba(0,0,0,0.1) 50%, 
              rgba(0,0,0,0.3) 100%)`
          }}
        />
        
        {/* Title on spine */}
        <div
          className="text-xs font-bold writing-vertical-lr text-center flex-1 overflow-hidden relative z-10 drop-shadow-lg"
          style={{ color: theme.bookTextColor }}
        >
          {book.title}
        </div>

        {/* Book decoration */}
        <div className="w-full h-px bg-white opacity-30 relative z-10" />
        <div className="text-xs text-center opacity-90 relative z-10 font-semibold drop-shadow" 
             style={{ color: theme.bookTextColor }}>
          {book.pages?.length || 0}p
        </div>
      </div>

      {/* Action buttons */}
      {showActions && (
        <div 
          className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-100
                      transition-opacity bg-white dark:bg-gray-800 rounded-lg shadow-lg p-1
                      flex items-center space-x-1 z-20"
          onMouseEnter={() => {
            if (actionTimeoutRef.current) {
              clearTimeout(actionTimeoutRef.current);
            }
          }}
          onMouseLeave={handleMouseLeave}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsEditing(true);
            }}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
            title="Edit details"
          >
            <Edit2 size={14} className="text-gray-700 dark:text-gray-300" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowColorPicker(!showColorPicker);
            }}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
            title="Change Color"
          >
            <Palette size={14} className="text-gray-700 dark:text-gray-300" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onExport(book);
            }}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
            title="Export"
          >
            <Download size={14} className="text-gray-700 dark:text-gray-300" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (window.confirm(`Delete "${book.title}"?`)) {
                onDelete(shelfIndex, index);
              }
            }}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-red-600 transition-colors"
            title="Delete"
          >
            <Trash2 size={14} />
          </button>
        </div>
      )}

      {/* Edit modal */}
      {isEditing && (
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 bg-white dark:bg-gray-800
                        rounded-lg shadow-xl p-4 z-30 w-64">
          <div className="space-y-2">
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="Book title"
              className="w-full px-2 py-1 text-sm rounded border border-gray-300 dark:bg-gray-700
                         dark:border-gray-600 dark:text-white focus:outline-none focus:ring-2 
                         focus:ring-blue-500"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRename();
                if (e.key === 'Escape') setIsEditing(false);
              }}
            />
          </div>
          <div className="flex justify-end mt-3 space-x-2">
            <button
              onClick={() => setIsEditing(false)}
              className="px-3 py-1 text-xs bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 
                         dark:hover:bg-gray-600 transition-colors dark:text-gray-300"
            >
              Cancel
            </button>
            <button
              onClick={handleRename}
              className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 
                         transition-colors"
            >
              Save
            </button>
          </div>
        </div>
      )}

      {/* Color picker */}
      {showColorPicker && showActions && (
        <div 
          className="absolute -top-24 left-1/2 -translate-x-1/2 bg-white dark:bg-gray-800
                      rounded-lg shadow-xl p-2 z-30 w-40"
          onMouseEnter={() => {
            if (actionTimeoutRef.current) {
              clearTimeout(actionTimeoutRef.current);
            }
          }}
          onMouseLeave={handleMouseLeave}
        >
          <div className="grid grid-cols-5 gap-1">
            {bookColors.map(color => (
              <button
                key={color}
                onClick={(e) => {
                  e.stopPropagation();
                  onRecolor(shelfIndex, index, color);
                  setShowColorPicker(false);
                }}
                className="w-6 h-6 rounded border-2 border-gray-300 hover:border-gray-500 
                           transition-colors"
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const Shelf = ({ shelfData, shelfIndex, theme, onBookAction, onDragStart, onDragOver, onDrop, darkMode, onEditShelfName }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(shelfData.label);

  const handleSaveShelfName = () => {
    if (editedName.trim()) {
      onEditShelfName(shelfIndex, editedName.trim());
    }
    setIsEditingName(false);
  };

  return (
    <div
      className="mb-8"
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragOver(true);
        onDragOver(e, shelfIndex);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragOver(false);
        onDrop(e, shelfIndex);
      }}
    >
      {/* Shelf label */}
      <div className="mb-2 px-4 flex items-center justify-between group">
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
              {shelfData.label}
            </h3>
            <button
              onClick={() => setIsEditingName(true)}
              className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-all"
              title="Edit shelf name"
            >
              <Edit2 size={14} className="text-gray-500 dark:text-gray-400" />
            </button>
          </>
        )}
      </div>

      {/* Books container */}
      <div
        className={`relative min-h-[220px] transition-all duration-200 ${
          isDragOver ? 'bg-blue-50 dark:bg-blue-900/20' : ''
        }`}
      >
        <div className="flex items-end px-4 pb-4 min-h-[200px] overflow-x-auto">
          {shelfData.books.map((book, bookIndex) => (
            <div
              key={book.id}
              draggable
              onDragStart={(e) => onDragStart(e, shelfIndex, bookIndex)}
              className="cursor-move flex-shrink-0"
            >
              <BookItem
                book={book}
                index={bookIndex}
                shelfIndex={shelfIndex}
                theme={theme}
                onRename={onBookAction.rename}
                onRecolor={onBookAction.recolor}
                onDelete={onBookAction.delete}
                onView={onBookAction.view}
                onExport={onBookAction.export}
                darkMode={darkMode}
                dragHandleProps={{}}
              />
            </div>
          ))}

          {shelfData.books.length === 0 && (
            <div className="text-center text-gray-400 dark:text-gray-600 w-full py-8">
              Drop books here
            </div>
          )}

          {/* Warning if approaching limit */}
          {shelfData.books.length >= MAX_BOOKS_PER_SHELF - 10 && (
            <div className="absolute top-2 right-2 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 px-2 py-1 rounded text-xs flex items-center">
              <AlertTriangle size={12} className="mr-1" />
              {MAX_BOOKS_PER_SHELF - shelfData.books.length} slots left
            </div>
          )}
        </div>

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

const Bookshelf = ({ onClose, onApplyBookLayout, getCurrentBookData, darkMode }) => {
  const [shelves, setShelves] = useState([
    { id: 'shelf-1', label: 'My Books', books: [] }
  ]);

  const [selectedTheme, setSelectedTheme] = useState('classic');
  const [showSettings, setShowSettings] = useState(false);
  const [draggedBook, setDraggedBook] = useState(null);
  const [storageInfo, setStorageInfo] = useState({ used: 0, percentage: 0 });
  const fileInputRef = useRef(null);

  // Load saved bookshelf data on component mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(BOOKSHELF_STORAGE_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        if (data.shelves && Array.isArray(data.shelves) && data.shelves.length > 0) {
          setShelves(data.shelves);
        }
        if (data.theme) setSelectedTheme(data.theme);
        
        // Calculate storage info
        const sizeInBytes = new Blob([saved]).size;
        const sizeInKB = (sizeInBytes / 1024).toFixed(1);
        const percentage = ((sizeInBytes / (5 * 1024 * 1024)) * 100).toFixed(1);
        setStorageInfo({ used: sizeInKB, percentage });
      }
    } catch (error) {
      console.error('Error loading bookshelf:', error);
    }
  }, []);

  // Save bookshelf data whenever it changes
  const saveBookshelf = (newShelves, newTheme) => {
    try {
      const dataToSave = {
        shelves: newShelves || shelves,
        theme: newTheme || selectedTheme,
        savedAt: new Date().toISOString(),
        version: '2.0'
      };
      
      const dataString = JSON.stringify(dataToSave);
      localStorage.setItem(BOOKSHELF_STORAGE_KEY, dataString);
      
      // Update storage info
      const sizeInBytes = new Blob([dataString]).size;
      const sizeInKB = (sizeInBytes / 1024).toFixed(1);
      const percentage = ((sizeInBytes / (5 * 1024 * 1024)) * 100).toFixed(1);
      setStorageInfo({ used: sizeInKB, percentage });
    } catch (error) {
      console.error('Error saving bookshelf:', error);
      if (error.name === 'QuotaExceededError') {
        alert('Storage quota exceeded. Please remove some books or optimize storage.');
      }
    }
  };

  // Add current grid as a new book to the shelf
  const handleAddCurrent = () => {
    const bookData = getCurrentBookData();
    
    // Find the shelf with the least books
    const targetShelfIndex = shelves.reduce((minIndex, shelf, index) => 
      shelf.books.length < shelves[minIndex].books.length ? index : minIndex, 0
    );
    
    if (shelves[targetShelfIndex].books.length >= MAX_BOOKS_PER_SHELF) {
      alert(`This shelf is full (${MAX_BOOKS_PER_SHELF} books max). Please create a new shelf or remove some books.`);
      return;
    }
    
    const newBook = {
      id: `book-${Date.now()}`,
      title: bookData.title || `Book ${new Date().toLocaleDateString()}`,
      author: bookData.author || 'Unknown',
      pages: bookData.pages || [],
      volumeMetadata: bookData.volumeMetadata || {},
      metadata: bookData.metadata || {},
      color: '#8B4513',
      createdAt: new Date().toISOString(),
      mediaFiles: bookData.mediaFiles || []
    };

    const newShelves = [...shelves];
    newShelves[targetShelfIndex].books.push(newBook);
    setShelves(newShelves);
    saveBookshelf(newShelves);

    // Show success notification
    const notification = document.createElement('div');
    notification.className = 'fixed top-4 right-4 bg-green-600 text-white px-4 py-2 rounded shadow-lg z-[100] flex items-center';
    notification.innerHTML = `
      <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
      </svg>
      Book added to ${newShelves[targetShelfIndex].label}!
    `;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
  };

  // Import a book from a JSON file
  const handleImportBook = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const bookData = JSON.parse(event.target.result);
        const newBook = {
          id: `book-${Date.now()}`,
          title: bookData.title || 'Imported Book',
          author: bookData.author || 'Unknown',
          pages: bookData.pages || [],
          volumeMetadata: bookData.volumeMetadata || {},
          metadata: bookData.metadata || {},
          color: '#4682B4',
          createdAt: new Date().toISOString()
        };

        const targetShelfIndex = shelves.findIndex(shelf => shelf.books.length < MAX_BOOKS_PER_SHELF);
        if (targetShelfIndex === -1) {
          alert('All shelves are full. Please create a new shelf.');
          return;
        }

        const newShelves = [...shelves];
        newShelves[targetShelfIndex].books.push(newBook);
        setShelves(newShelves);
        saveBookshelf(newShelves);

        // Show success notification
        const notification = document.createElement('div');
        notification.className = 'fixed top-4 right-4 bg-green-600 text-white px-4 py-2 rounded shadow-lg z-[100]';
        notification.textContent = 'Book imported successfully!';
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 3000);
      } catch (error) {
        alert('Error importing book. Please check the file format.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Export a book to a JSON file
  const handleExportBook = (book) => {
    const exportData = {
      title: book.title,
      author: book.author,
      pages: book.pages,
      volumeMetadata: book.volumeMetadata,
      metadata: book.metadata,
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

  // Optimize storage
  const cleanupBookshelf = () => {
    try {
      const optimizedShelves = shelves.map(shelf => ({
        ...shelf,
        books: shelf.books.map(book => ({
          id: book.id,
          title: book.title,
          author: book.author,
          description: book.description?.substring(0, 200),
          createdAt: book.createdAt,
          color: book.color,
          volumeMetadata: {
            pageCount: book.volumeMetadata?.pageCount || book.pages?.length || 0
          },
          pages: book.pages.map(page => ({
            front: typeof page.front === 'object' ? (page.front.name || page.front.id) : page.front,
            back: typeof page.back === 'object' ? (page.back.name || page.back.id) : page.back
          }))
        }))
      }));
      
      setShelves(optimizedShelves);
      saveBookshelf(optimizedShelves);
      
      alert('Bookshelf optimized successfully!');
    } catch (error) {
      console.error('Error optimizing bookshelf:', error);
      alert('Error optimizing bookshelf.');
    }
  };

  // Export entire bookshelf
  const exportBookshelf = () => {
    const exportData = {
      shelves,
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
  };

  // Book action handlers
  const bookActions = {
    rename: (shelfIndex, bookIndex, newName) => {
      const newShelves = [...shelves];
      newShelves[shelfIndex].books[bookIndex].title = newName;
      setShelves(newShelves);
      saveBookshelf(newShelves);
    },
    recolor: (shelfIndex, bookIndex, newColor) => {
      const newShelves = [...shelves];
      newShelves[shelfIndex].books[bookIndex].color = newColor;
      setShelves(newShelves);
      saveBookshelf(newShelves);
    },
    delete: (shelfIndex, bookIndex) => {
      const newShelves = [...shelves];
      newShelves[shelfIndex].books.splice(bookIndex, 1);
      setShelves(newShelves);
      saveBookshelf(newShelves);
    },
    view: (book) => {
      if (onApplyBookLayout) {
        onApplyBookLayout(book);
      } else {
        console.error("onApplyBookLayout handler is missing!");
        alert("Cannot open book. Application is not configured correctly.");
      }
    },
    export: handleExportBook
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
    saveBookshelf(newShelves);
  };

  const removeShelf = (index) => {
    if (shelves[index].books.length > 0) {
      if (!window.confirm('This shelf contains books. Delete anyway?')) return;
    }
    const newShelves = shelves.filter((_, i) => i !== index);
    setShelves(newShelves);
    saveBookshelf(newShelves);
  };

  const editShelfName = (shelfIndex, newName) => {
    const newShelves = [...shelves];
    newShelves[shelfIndex].label = newName;
    setShelves(newShelves);
    saveBookshelf(newShelves);
  };

  // Drag and drop handlers
  const handleDragStart = (e, shelfIndex, bookIndex) => {
    setDraggedBook({ shelfIndex, bookIndex, book: shelves[shelfIndex].books[bookIndex] });
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, shelfIndex) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, targetShelfIndex) => {
    e.preventDefault();
    if (!draggedBook) return;

    if (shelves[targetShelfIndex].books.length >= MAX_BOOKS_PER_SHELF) {
      alert(`Target shelf is full (${MAX_BOOKS_PER_SHELF} books max).`);
      return;
    }

    const newShelves = [...shelves];
    newShelves[draggedBook.shelfIndex].books.splice(draggedBook.bookIndex, 1);
    newShelves[targetShelfIndex].books.push(draggedBook.book);

    setShelves(newShelves);
    saveBookshelf(newShelves);
    setDraggedBook(null);
  };

  const theme = darkMode && selectedTheme === 'classic' ? defaultThemes.dark : defaultThemes[selectedTheme];
  const totalBooks = shelves.reduce((sum, shelf) => sum + shelf.books.length, 0);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div
        className="bg-white dark:bg-gray-900 rounded-lg shadow-2xl w-full max-w-6xl h-5/6 flex flex-col transition-colors"
        style={{ maxHeight: '90vh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold flex items-center text-gray-800 dark:text-white">
            <Book className="mr-2" size={28} />
            My Bookshelf
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
                        saveBookshelf(null, key);
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
                  onClick={cleanupBookshelf}
                  className="px-3 py-1 bg-yellow-600 text-white rounded hover:bg-yellow-700 text-sm flex items-center transition-colors"
                  title="Optimize bookshelf storage"
                >
                  <RefreshCw size={16} className="mr-1" />
                  Optimize
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
            
            {/* Storage info */}
            <div className="mt-3 text-xs text-gray-600 dark:text-gray-400">
              Storage used: {storageInfo.used} KB ({storageInfo.percentage}% of 5MB limit)
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-1">
                <div 
                  className={`h-2 rounded-full transition-all ${
                    parseFloat(storageInfo.percentage) > 80 ? 'bg-red-500' : 
                    parseFloat(storageInfo.percentage) > 60 ? 'bg-yellow-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${Math.min(100, storageInfo.percentage)}%` }}
                />
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
          {shelves.map((shelf, index) => (
            <div key={shelf.id} className="relative group">
              <Shelf
                shelfData={shelf}
                shelfIndex={index}
                theme={theme}
                onBookAction={bookActions}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onEditShelfName={editShelfName}
                darkMode={darkMode}
              />
              
              {/* Delete shelf button */}
              {shelves.length > 1 && (
                <button
                  onClick={() => removeShelf(index)}
                  className="absolute top-0 right-2 opacity-0 group-hover:opacity-100
                           transition-opacity p-1 bg-red-600 text-white rounded text-xs
                           hover:bg-red-700"
                >
                  <Trash2 size={12} />
                </button>
              )}
            </div>
          ))}
          
          {/* Empty state */}
          {totalBooks === 0 && (
            <div className="text-center py-16">
              <Book size={64} className="mx-auto mb-4 text-gray-300 dark:text-gray-600" />
              <p className="text-lg text-gray-500 dark:text-gray-400 mb-4">
                Your bookshelf is empty
              </p>
              <p className="text-sm text-gray-400 dark:text-gray-500">
                Add books from the grid using the "Save to Bookshelf" button
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-800">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {totalBooks} {totalBooks === 1 ? 'book' : 'books'} in library across {shelves.length} {shelves.length === 1 ? 'shelf' : 'shelves'}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-500">
              {MAX_BOOKS_PER_SHELF - Math.max(...shelves.map(s => s.books.length), 0)} slots available on fullest shelf
            </div>
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
      </div>
    </div>
  );
};

export default Bookshelf;