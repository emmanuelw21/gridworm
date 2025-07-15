// In ThreeDViewportPanel.jsx
import React from 'react';
import { Box, X } from 'lucide-react';
import ThreeDViewport from '../ThreeDViewport/ThreeDViewport';
import AnimatedBookViewer from '../BookViewer/AnimatedBookViewer.jsx';


const ThreeDViewportPanel = ({
  show3DViewport,
  viewportWidth,
  onBeginResizing,
  onClose,
  darkMode,
  gridSlots,
  freeGridItems,
  mediaFiles,
  gridConfig,
  bookMode,
  onBookModeToggle,
  pageMapping,
  onPageMappingConfirm,
  bookPages,
  currentBookPage,
  onBookPageChange,
  bookVolumeMetadata,
  showBookViewer = false,
  onMediaMissing
}) => {
  if (!show3DViewport) return null;

  return (
    <div
      className="relative bg-white dark:bg-gray-900 border-l border-gray-300 dark:border-gray-600 flex flex-col"
      style={{ width: `${viewportWidth}px` }}
    >
      {/* Panel Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center">
          <Box size={18} className="mr-2 text-gray-600 dark:text-gray-400" />
          <h2 className="font-bold text-lg text-gray-700 dark:text-gray-300">
            3D Viewport {bookMode && '(Book Mode)'}
          </h2>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
          title="Close 3D Viewport"
        >
          <X size={18} className="text-gray-600 dark:text-gray-400" />
        </button>
      </div>

      {/* 3D Viewport Content */}
      <div className="flex-1 overflow-hidden">
        <ThreeDViewport 
          darkMode={darkMode}
          gridSlots={gridSlots}
          freeGridItems={freeGridItems}
          mediaFiles={mediaFiles}
          gridConfig={gridConfig}
          bookMode={bookMode}
          onBookModeToggle={onBookModeToggle}
          pageMapping={pageMapping}
          onPageMappingConfirm={onPageMappingConfirm}
          bookPages={bookPages}
          currentBookPage={currentBookPage}
          onBookPageChange={onBookPageChange}
          bookVolumeMetadata={bookVolumeMetadata}
          onMediaMissing={onMediaMissing}
        />
      </div>

      {/* Resize Handle */}
      <div
        className="absolute top-0 left-0 bottom-0 w-2 cursor-ew-resize hover:bg-blue-300 opacity-0 hover:opacity-50 transition-opacity"
        onMouseDown={(e) => {
          e.preventDefault();
          onBeginResizing();
        }}
        title="Resize 3D Viewport"
      />
      {showBookViewer && (
  <AnimatedBookViewer
    isOpen={showBookViewer}
    onClose={() => setShowBookViewer(false)}
    bookData={{
      pages: bookPages,
      volumeMetadata: bookVolumeMetadata
    }}
    volumeMetadata={bookVolumeMetadata}
    embedded={true}
  />
)}
    </div>
  );
};

export default ThreeDViewportPanel;