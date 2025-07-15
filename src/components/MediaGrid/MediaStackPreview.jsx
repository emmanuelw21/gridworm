// components/MediaGrid/MediaStackPreview.jsx
import React, { useState, useEffect, useRef } from 'react';
import {
  ChevronLeft, ChevronRight, Layers, FileText,
  Maximize2, Grid, Download, X, Copy,
  ZoomIn, ZoomOut, Minimize2
} from 'lucide-react';

/**
 * MediaStackPreview Component
 * Displays a preview of a MediaStack with navigation controls
 */
const MediaStackPreview = ({
  stack,
  isOpen,
  onClose,
  onExtractPage,
  onExtractAll,
  onPageClick,
  darkMode = false
}) => {
  const [currentPage, setCurrentPage] = useState(stack?.currentPage || 0);
  const [viewMode, setViewMode] = useState('single'); // 'single' or 'grid'
  const [selectedPages, setSelectedPages] = useState([]);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [fitMode, setFitMode] = useState('fit'); // 'fit', 'width', 'height', or 'custom'
  const imageContainerRef = useRef(null);
  const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Update current page when stack changes
  useEffect(() => {
    if (stack) {
      setCurrentPage(stack.currentPage);
    }
  }, [stack]);

  // Reset zoom and position when changing pages or view modes
  useEffect(() => {
    setImagePosition({ x: 0, y: 0 });
    if (fitMode === 'custom') {
      setFitMode('fit');
      setZoomLevel(1);
    }
  }, [currentPage, viewMode]);

  if (!isOpen || !stack) return null;

  const displayInfo = stack.getDisplayInfo();
  const pages = stack.pages || [];
  const currentPageData = pages[currentPage];

  const handlePreviousPage = () => {
    if (currentPage > 0) {
      const newPage = currentPage - 1;
      setCurrentPage(newPage);
      stack.setCurrentPage(newPage);
    }
  };

  const handleNextPage = () => {
    if (currentPage < pages.length - 1) {
      const newPage = currentPage + 1;
      setCurrentPage(newPage);
      stack.setCurrentPage(newPage);
    }
  };

  const handlePageSelect = (pageIndex) => {
    setCurrentPage(pageIndex);
    stack.setCurrentPage(pageIndex);
    if (viewMode === 'grid') {
      setViewMode('single');
    }
  };

  const togglePageSelection = (pageIndex) => {
    setSelectedPages(prev => {
      if (prev.includes(pageIndex)) {
        return prev.filter(i => i !== pageIndex);
      }
      return [...prev, pageIndex];
    });
  };

  const handleExtractSelected = () => {
    if (selectedPages.length > 0 && onExtractPage) {
      onExtractPage(selectedPages);
      setSelectedPages([]);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className={`${darkMode ? 'dark' : ''} bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-full max-w-6xl h-5/6 flex flex-col`}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <Layers className="text-blue-600 dark:text-blue-400" size={24} />
            <div>
              <h2 className="text-xl font-semibold dark:text-white">
                {displayInfo.name}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {displayInfo.stackType.toUpperCase()} • {displayInfo.pageCount} pages • {displayInfo.size}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* View mode toggle */}
            <button
              onClick={() => setViewMode(viewMode === 'single' ? 'grid' : 'single')}
              className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
              title={viewMode === 'single' ? 'Grid view' : 'Single view'}
            >
              {viewMode === 'single' ? <Grid size={20} /> : <Maximize2 size={20} />}
            </button>

            {/* Extract all button */}
            {onExtractAll && (
              <button
                onClick={onExtractAll}
                className="px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center"
                title="Extract all pages"
              >
                <Download size={16} className="mr-1" />
                Extract All
              </button>
            )}

            {/* Close button */}
            <button
              onClick={onClose}
              className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <X size={20} className="dark:text-gray-300" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {viewMode === 'single' ? (
            /* Single page view */
            <div className="h-full flex flex-col">
              {/* Page navigation */}
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900">
                <button
                  onClick={handlePreviousPage}
                  disabled={currentPage === 0}
                  className={`p-2 rounded ${
                    currentPage === 0
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-white hover:bg-gray-100 dark:bg-gray-700 dark:hover:bg-gray-600'
                  }`}
                >
                  <ChevronLeft size={20} />
                </button>

                <div className="text-center">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Page {currentPage + 1} of {displayInfo.pageCount}
                  </p>
                  {currentPageData?.textContent && (
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                      {currentPageData.textContent.substring(0, 50)}...
                    </p>
                  )}
                </div>

                <button
                  onClick={handleNextPage}
                  disabled={currentPage === pages.length - 1}
                  className={`p-2 rounded ${
                    currentPage === pages.length - 1
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-white hover:bg-gray-100 dark:bg-gray-700 dark:hover:bg-gray-600'
                  }`}
                >
                  <ChevronRight size={20} />
                </button>
              </div>

              {/* Zoom controls */}
              <div className="absolute top-4 right-4 z-20 flex items-center space-x-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-2">
                <button
                  onClick={() => setFitMode('fit')}
                  className={`p-2 rounded ${fitMode === 'fit' ? 'bg-gray-200 dark:bg-gray-600' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                  title="Fit to window"
                >
                  <Minimize2 size={18} />
                </button>
                <div className="w-px h-6 bg-gray-300 dark:bg-gray-600" />
                <button
                  onClick={() => {
                    const newZoom = Math.max(0.25, zoomLevel - 0.25);
                    setZoomLevel(newZoom);
                    setFitMode('custom');
                  }}
                  className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                  disabled={zoomLevel <= 0.25}
                >
                  <ZoomOut size={18} />
                </button>
                <span className="text-sm font-medium min-w-[3rem] text-center">
                  {Math.round(zoomLevel * 100)}%
                </span>
                <button
                  onClick={() => {
                    const newZoom = Math.min(4, zoomLevel + 0.25);
                    setZoomLevel(newZoom);
                    setFitMode('custom');
                  }}
                  className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                  disabled={zoomLevel >= 4}
                >
                  <ZoomIn size={18} />
                </button>
              </div>

              {/* Page display */}
              <div 
                ref={imageContainerRef}
                className="flex-1 p-4 flex items-center justify-center bg-gray-100 dark:bg-gray-900 overflow-hidden relative"
                onMouseDown={(e) => {
                  if (fitMode === 'custom' && e.button === 0) {
                    setIsDragging(true);
                    setDragStart({ x: e.clientX - imagePosition.x, y: e.clientY - imagePosition.y });
                  }
                }}
                onMouseMove={(e) => {
                  if (isDragging) {
                    setImagePosition({
                      x: e.clientX - dragStart.x,
                      y: e.clientY - dragStart.y
                    });
                  }
                }}
                onMouseUp={() => setIsDragging(false)}
                onMouseLeave={() => setIsDragging(false)}
                style={{ cursor: fitMode === 'custom' ? (isDragging ? 'grabbing' : 'grab') : 'default' }}
              >
                {currentPageData?.thumbnail ? (
                  <img
                    src={currentPageData.thumbnail}
                    alt={`Page ${currentPage + 1}`}
                    className="shadow-lg rounded"
                    style={{
                      transform: fitMode === 'custom' 
                        ? `translate(${imagePosition.x}px, ${imagePosition.y}px) scale(${zoomLevel})`
                        : 'none',
                      maxWidth: fitMode === 'fit' ? '100%' : 'none',
                      maxHeight: fitMode === 'fit' ? '100%' : 'none',
                      width: fitMode === 'width' ? '100%' : 'auto',
                      height: fitMode === 'height' ? '100%' : 'auto',
                      objectFit: fitMode === 'fit' ? 'contain' : 'none',
                      transition: isDragging ? 'none' : 'transform 0.2s',
                      userSelect: 'none',
                      pointerEvents: fitMode === 'custom' ? 'none' : 'auto'
                    }}
                    onClick={() => fitMode !== 'custom' && onPageClick && onPageClick(currentPage)}
                  />
                ) : (
                  <div className="bg-white dark:bg-gray-800 p-8 rounded shadow-lg text-center">
                    <FileText size={64} className="mx-auto mb-4 text-gray-400" />
                    <p className="text-gray-600 dark:text-gray-400">
                      Page {currentPage + 1}
                    </p>
                    {currentPageData?.textContent && (
                      <p className="mt-4 text-sm text-gray-500 dark:text-gray-500 max-w-md">
                        {currentPageData.textContent.substring(0, 200)}...
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Actions */}
              {onExtractPage && (
                <div className="p-4 border-t dark:border-gray-700 flex justify-center">
                  <button
                    onClick={() => onExtractPage([currentPage])}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center"
                  >
                    <Copy size={16} className="mr-2" />
                    Extract This Page
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* Grid view */
            <div className="h-full flex flex-col">
              {/* Selection actions */}
              {selectedPages.length > 0 && (
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border-b dark:border-gray-700 flex items-center justify-between">
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    {selectedPages.length} pages selected
                  </p>
                  <button
                    onClick={handleExtractSelected}
                    className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                  >
                    Extract Selected
                  </button>
                </div>
              )}

              {/* Pages grid */}
              <div className="flex-1 overflow-auto p-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {pages.map((page, index) => (
                    <div
                      key={index}
                      className={`relative group cursor-pointer border-2 rounded overflow-hidden ${
                        selectedPages.includes(index)
                          ? 'border-blue-500 ring-2 ring-blue-200'
                          : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
                      }`}
                      onClick={() => handlePageSelect(index)}
                    >
                      {/* Selection checkbox */}
                      <div
                        className="absolute top-2 right-2 z-10"
                        onClick={(e) => {
                          e.stopPropagation();
                          togglePageSelection(index);
                        }}
                      >
                        <div className={`w-5 h-5 rounded border-2 ${
                          selectedPages.includes(index)
                            ? 'bg-blue-500 border-blue-500'
                            : 'bg-white border-gray-400'
                        }`}>
                          {selectedPages.includes(index) && (
                            <svg className="w-3 h-3 text-white mx-auto mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                      </div>

                      {/* Page number */}
                      <div className="absolute top-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
                        {index + 1}
                      </div>

                      {/* Thumbnail */}
                      <div className="aspect-[3/4] bg-gray-100 dark:bg-gray-700">
                        {page.thumbnail ? (
                          <img
                            src={page.thumbnail}
                            alt={`Page ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <FileText size={32} className="text-gray-400" />
                          </div>
                        )}
                      </div>

                      {/* Hover overlay */}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MediaStackPreview;