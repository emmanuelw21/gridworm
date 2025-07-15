// components/BookViewer/AnimatedBookViewer.jsx
import React, { useState, useEffect } from 'react';
import { Book as BookIcon, X, Maximize2, Minimize2, ChevronLeft, ChevronRight, RotateCw } from 'lucide-react';

const AnimatedBookViewer = ({ 
  isOpen, 
  onClose, 
  bookData,
  volumeMetadata,
  onRefresh,
  embedded = true 
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [isFlipping, setIsFlipping] = useState(false);
  
  const totalPages = bookData?.pages?.length || 0;

  // Toggle fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const goToPage = (pageNum) => {
    if (pageNum >= 0 && pageNum < totalPages) {
      setIsFlipping(true);
      setTimeout(() => {
        setCurrentPage(pageNum);
        setIsFlipping(false);
      }, 300);
    }
  };

  const getCurrentPageData = () => {
    if (!bookData?.pages || currentPage >= bookData.pages.length) {
      return { front: null, back: null };
    }
    return bookData.pages[currentPage];
  };

  const getMediaUrl = (mediaItem) => {
    if (!mediaItem) return null;
    
    // Handle when mediaItem is an object (media file object)
    if (typeof mediaItem === 'object' && mediaItem !== null) {
      // For missing or placeholder media
      if (mediaItem.isMissing || mediaItem.isPlaceholder) {
        return null; // Will show placeholder UI
      }
      
      // For text pages
      if (mediaItem.isTextPage || mediaItem.metadata?.isTextPage) {
        return mediaItem.thumbnail || mediaItem.url || null;
      }
      
      // For images - prefer thumbnail for performance
      if (mediaItem.type?.startsWith('image/')) {
        return mediaItem.thumbnail || mediaItem.url || null;
      }
      
      // For videos - must use thumbnail
      if (mediaItem.type?.startsWith('video/')) {
        return mediaItem.thumbnail || null;
      }
      
      // For 3D models - use thumbnail
      if (mediaItem.type?.startsWith('model/')) {
        return mediaItem.thumbnail || null;
      }
      
      // Default: try thumbnail first, then URL
      return mediaItem.thumbnail || mediaItem.url || null;
    }
    
    // Handle string references
    const mediaName = String(mediaItem);
    
    if (mediaName === 'blank') return null;
    
    // Special handling for cover pages
    if (mediaName === 'cover' || mediaName === 'gridworm-cover') {
      return '/gridworm-cover.png';
    }
    if (mediaName === 'back-cover' || mediaName === 'gridworm-back') {
      return '/gridworm-back.png';
    }
    if (mediaName.startsWith('gridworm-')) {
      return `/${mediaName}`;
    }
    
    // Find media in mediaFiles by name or ID
    const media = bookData?.mediaFiles?.find(m => m.name === mediaName || m.id === mediaName);
    // Prefer thumbnail for performance
    return media?.thumbnail || media?.url || null;
  };

  if (!isOpen) return null;

  const pageData = getCurrentPageData();
  const frontUrl = getMediaUrl(pageData.front);
  const backUrl = getMediaUrl(pageData.back);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className={`bg-white dark:bg-gray-900 rounded-lg shadow-2xl flex flex-col ${
        isFullscreen ? 'w-full h-full' : 'w-11/12 h-5/6 max-w-7xl'
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <BookIcon size={24} className="text-blue-600" />
            <div>
              <h2 className="text-xl font-semibold">
                {volumeMetadata?.title || 'Book Preview'}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Page {currentPage + 1} of {totalPages}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 0}
              className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
              title="Previous Page"
            >
              <ChevronLeft size={20} />
            </button>
            
            <button
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage >= totalPages - 1}
              className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
              title="Next Page"
            >
              <ChevronRight size={20} />
            </button>
            
            {onRefresh && (
              <button
                onClick={onRefresh}
                className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                title="Refresh"
              >
                <RotateCw size={20} />
              </button>
            )}
            
            <button
              onClick={toggleFullscreen}
              className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            >
              {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
            </button>
            
            <button
              onClick={onClose}
              className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
              title="Close"
            >
              <X size={20} />
            </button>
          </div>
        </div>
        
        {/* Book viewer - 2D representation */}
        <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 p-8">
          <div className="relative w-full max-w-6xl h-full flex items-center justify-center">
            {/* Book spread */}
            <div className={`relative flex gap-1 transition-all duration-300 ${isFlipping ? 'opacity-50' : 'opacity-100'}`}>
              {/* Left page */}
              <div className="w-96 h-[512px] bg-white dark:bg-gray-800 shadow-2xl rounded-l-lg overflow-hidden">
                {frontUrl ? (
                  <img 
                    src={frontUrl} 
                    alt={typeof pageData.front === 'object' ? pageData.front.name : pageData.front}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <div className="text-center">
                      <BookIcon size={48} className="mx-auto mb-2 opacity-20" />
                      <p>Page {currentPage * 2 + 1}</p>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Right page */}
              <div className="w-96 h-[512px] bg-white dark:bg-gray-800 shadow-2xl rounded-r-lg overflow-hidden">
                {backUrl ? (
                  <img 
                    src={backUrl} 
                    alt={typeof pageData.back === 'object' ? pageData.back.name : pageData.back}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <div className="text-center">
                      <BookIcon size={48} className="mx-auto mb-2 opacity-20" />
                      <p>Page {currentPage * 2 + 2}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Navigation overlay */}
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-white/90 dark:bg-gray-800/90 backdrop-blur rounded-lg shadow-lg p-4">
            <div className="flex items-center space-x-4">
              <button
                className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 0}
              >
                Previous
              </button>
              
              <div className="text-sm font-medium">
                Page {currentPage + 1} / {totalPages}
              </div>
              
              <button
                className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage >= totalPages - 1}
              >
                Next
              </button>
            </div>
            
            {/* Page slider */}
            <input
              type="range"
              min="0"
              max={Math.max(0, totalPages - 1)}
              value={currentPage}
              onChange={(e) => goToPage(parseInt(e.target.value))}
              className="w-full mt-2"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnimatedBookViewer;