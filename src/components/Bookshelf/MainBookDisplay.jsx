// components/Bookshelf/MainBookDisplay.jsx
import React, { useState, useRef } from 'react';
import { Book, BookOpen, Info } from 'lucide-react';

const MiniBookSpine = ({ book, index, onReorder, onBookClick, darkMode }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const tooltipTimeout = useRef(null);
  
  const bookColors = [
    'bg-red-600', 'bg-blue-600', 'bg-green-600', 'bg-purple-600', 'bg-yellow-600', 
    'bg-pink-600', 'bg-indigo-600', 'bg-gray-600', 'bg-orange-600', 'bg-teal-600'
  ];
  
  const handleMouseEnter = () => {
    tooltipTimeout.current = setTimeout(() => {
      setShowTooltip(true);
    }, 500);
  };
  
  const handleMouseLeave = () => {
    setShowTooltip(false);
    if (tooltipTimeout.current) {
      clearTimeout(tooltipTimeout.current);
    }
  };
  
  return (
    <div className="relative group" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      <div
        className={`
          h-8 w-6 rounded-sm shadow cursor-pointer
          transform transition-all duration-200 hover:scale-110 hover:-translate-y-1
          ${bookColors[index % 10]}
        `}
        onClick={() => onBookClick(book)}
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData('bookIndex', index.toString());
          e.dataTransfer.effectAllowed = 'move';
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
        }}
        onDrop={(e) => {
          e.preventDefault();
          const fromIndex = parseInt(e.dataTransfer.getData('bookIndex'));
          if (fromIndex !== index) {
            onReorder(fromIndex, index);
          }
        }}
      />
      
      {/* Tooltip */}
      {showTooltip && (
        <div className={`
          absolute top-full left-1/2 transform -translate-x-1/2 mt-2
          ${darkMode ? 'bg-gray-800' : 'bg-white'} 
          rounded-lg shadow-xl p-3 w-48 z-50
          border ${darkMode ? 'border-gray-700' : 'border-gray-200'}
          pointer-events-none
        `}>
          <div className="text-xs">
            <h4 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'} mb-1`}>
              {book.title || 'Untitled Book'}
            </h4>
            {(book.metadata?.author || book.author) && (
              <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'} mb-1`}>
                by {book.metadata?.author || book.author}
              </p>
            )}
            {(book.description || book.metadata?.description) && (
              <p className={`${darkMode ? 'text-gray-300' : 'text-gray-700'} line-clamp-2`}>
                {book.description || book.metadata?.description}
              </p>
            )}
            <p className={`${darkMode ? 'text-gray-500' : 'text-gray-500'} mt-1`}>
              {book.pages?.length || 0} pages
            </p>
          </div>
          
          {/* Tooltip arrow */}
          <div className={`absolute -top-2 left-1/2 transform -translate-x-1/2 w-0 h-0 
            border-l-[6px] border-l-transparent
            border-r-[6px] border-r-transparent
            border-b-[6px] ${darkMode ? 'border-b-gray-800' : 'border-b-white'}
          `} />
        </div>
      )}
    </div>
  );
};

const BookSpine = ({ book, index, onReorder, onBookClick, darkMode }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const tooltipTimeout = useRef(null);
  
  const bookColors = [
    'bg-red-600',
    'bg-blue-600',
    'bg-green-600',
    'bg-purple-600',
    'bg-yellow-600',
    'bg-pink-600',
    'bg-indigo-600',
    'bg-gray-600',
    'bg-orange-600',
    'bg-teal-600'
  ];
  
  const color = bookColors[index % bookColors.length];
  
  const handleMouseEnter = () => {
    setIsHovered(true);
    // Show tooltip after a short delay
    tooltipTimeout.current = setTimeout(() => {
      setShowTooltip(true);
    }, 500);
  };
  
  const handleMouseLeave = () => {
    setIsHovered(false);
    setShowTooltip(false);
    if (tooltipTimeout.current) {
      clearTimeout(tooltipTimeout.current);
    }
  };
  
  return (
    <div
      className="relative group"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div
        className={`
          relative h-48 w-12 ${color} rounded-sm shadow-lg cursor-pointer
          transform transition-all duration-200 hover:scale-105 hover:-translate-y-2
          flex flex-col items-center justify-center
          ${isHovered ? 'z-20' : 'z-10'}
        `}
        onClick={() => onBookClick(book)}
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData('bookIndex', index.toString());
          e.dataTransfer.effectAllowed = 'move';
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
        }}
        onDrop={(e) => {
          e.preventDefault();
          const fromIndex = parseInt(e.dataTransfer.getData('bookIndex'));
          if (fromIndex !== index) {
            onReorder(fromIndex, index);
          }
        }}
      >
        {/* Book spine design */}
        <div className="absolute inset-0 bg-black bg-opacity-20 rounded-sm" />
        <div className="absolute top-2 bottom-2 left-1 right-1 border border-white/20 rounded-sm" />
        
        {/* Book title on spine */}
        <div className="relative transform rotate-90 whitespace-nowrap text-white text-xs font-semibold px-2">
          <div className="max-w-[160px] overflow-hidden text-ellipsis">
            {book.title || 'Untitled'}
          </div>
        </div>
        
        {/* Book icon */}
        <BookOpen size={16} className="absolute bottom-2 text-white/70" />
      </div>
      
      {/* Tooltip */}
      {showTooltip && (
        <div className={`
          absolute bottom-full left-1/2 transform -translate-x-1/2 mb-4
          ${darkMode ? 'bg-gray-800' : 'bg-white'} 
          rounded-lg shadow-xl p-4 w-64 z-50
          border ${darkMode ? 'border-gray-700' : 'border-gray-200'}
        `}>
          <div className="flex items-start gap-3">
            <Book className={`${darkMode ? 'text-gray-400' : 'text-gray-600'} flex-shrink-0`} size={24} />
            <div className="flex-1">
              <h3 className={`font-semibold text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {book.title || 'Untitled Book'}
              </h3>
              {book.metadata?.author && (
                <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'} mt-1`}>
                  by {book.metadata.author}
                </p>
              )}
              {book.description && (
                <p className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-700'} mt-2 line-clamp-3`}>
                  {book.description}
                </p>
              )}
              <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'} mt-2`}>
                {book.pages?.length || 0} pages
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const MainBookDisplay = ({ 
  books = [], 
  onBookClick, 
  onReorderBooks,
  darkMode = false,
  inline = false 
}) => {
  if (!books || books.length === 0) {
    if (inline) return null;
    
    return (
      <div className={`
        ${darkMode ? 'bg-gray-800/50' : 'bg-gray-100'} 
        rounded-lg p-8 text-center
      `}>
        <Book size={48} className={`mx-auto mb-4 ${darkMode ? 'text-gray-600' : 'text-gray-400'}`} />
        <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          No books on the top shelf yet
        </p>
        <p className={`text-sm ${darkMode ? 'text-gray-500' : 'text-gray-500'} mt-2`}>
          Add books to your bookshelf to see them here
        </p>
      </div>
    );
  }
  
  if (inline) {
    // Compact inline version for header
    return (
      <div className="flex items-center space-x-1 h-10">
        {books.slice(0, 10).map((book, index) => (
          <MiniBookSpine
            key={book.id || index}
            book={book}
            index={index}
            onReorder={onReorderBooks}
            onBookClick={onBookClick}
            darkMode={darkMode}
          />
        ))}
        {books.length > 10 && (
          <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'} ml-1`}>
            +{books.length - 10} more
          </span>
        )}
      </div>
    );
  }
  
  return (
    <div className={`
      ${darkMode ? 'bg-gray-800/50' : 'bg-gray-100'} 
      rounded-lg p-6
    `}>
      <div className="flex items-center justify-between mb-4">
        <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          Your Library
        </h3>
        <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          {books.length} book{books.length !== 1 ? 's' : ''}
        </span>
      </div>
      
      {/* Book shelf visualization */}
      <div className="relative">
        {/* Shelf back */}
        <div className={`
          absolute inset-x-0 bottom-0 h-4 
          ${darkMode ? 'bg-gray-700' : 'bg-amber-800'} 
          rounded-b-md shadow-inner
        `} />
        
        {/* Books container */}
        <div className="relative flex gap-2 justify-start items-end pb-4 px-4 overflow-x-auto">
          {books.map((book, index) => (
            <BookSpine
              key={book.id || index}
              book={book}
              index={index}
              onReorder={onReorderBooks}
              onBookClick={onBookClick}
              darkMode={darkMode}
            />
          ))}
        </div>
        
        {/* Shelf front edge */}
        <div className={`
          absolute inset-x-0 bottom-0 h-2 
          ${darkMode ? 'bg-gray-600' : 'bg-amber-900'} 
          rounded-b-md
        `} />
      </div>
    </div>
  );
};

export default MainBookDisplay;