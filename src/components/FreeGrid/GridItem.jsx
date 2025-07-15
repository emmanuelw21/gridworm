import React from 'react';
import { X, AlertTriangle, RotateCw, Image as ImageIcon, Video as VideoIcon, Music } from 'lucide-react';
import MediaPreview from '../MediaGrid/MediaPreview';
import { isImage, isVideo, isAudio } from '../MediaGrid/helpers';

const GridItem = ({
  slot,
  slotIndex,
  itemPosition,
  isSelected,
  isConnected,
  isBeingDragged,
  isCurrentlyHovered,
  previewMode,
  isPencilMode,
  isEraserMode,
  isTextInputMode,
  hideBorders,
  zoomLevel,
  panOffset,
  onHover,
  onSelectGridItem,
  onPreviewMedia,
  onRemoveFromSlot,
  handleDragStart,
  startResizing,
  startRotation,
  updateMediaDimensions,
  markSelection,
  children
}) => {
  const autoplayProp = previewMode === 'live';
  const hoverPlayProp = previewMode === 'hover';

  return (
    <div
      className={`absolute ${hideBorders ? '' : 'border border-gray-300 dark:border-gray-600'} flex items-center justify-center
                  bg-white dark:bg-gray-800
                  ${isSelected ? 'ring-2 ring-blue-500 z-20' : isConnected ? 'ring-1 ring-blue-300 dark:ring-blue-600 z-10' : ''}
                  ${isBeingDragged ? 'opacity-70' : 'opacity-100'}
                  ${hideBorders ? 'hover:ring-2 hover:ring-blue-300 dark:hover:ring-blue-600' : 'hover:border-blue-500 dark:hover:border-blue-400'}
                  ${!isPencilMode && !isEraserMode && !isTextInputMode ? 'cursor-grab' : 'cursor-default'} 
                  transition-all duration-100 ease-in-out overflow-hidden rounded-md shadow-sm group`}
      style={{
        width: `${itemPosition.width}px`,
        height: `${itemPosition.height}px`,
        left: `${itemPosition.x}px`,
        top: `${itemPosition.y}px`,
        transform: itemPosition.rotation ? `rotate(${itemPosition.rotation}deg)` : 'none',
        transition: isBeingDragged ? 'none' : 'transform 0.2s ease, box-shadow 0.2s ease',
        borderRadius: itemPosition.borderRadius || '',
        zIndex: isSelected || isBeingDragged ? 20 : 10
      }}
      onMouseEnter={() => onHover({ type: 'slot', idx: slotIndex })}
      onMouseLeave={() => onHover(null)}
      onClick={(e) => {
        // Only handle clicks if not in a drawing mode
        if (!isPencilMode && !isEraserMode && !isTextInputMode) {
          if (markSelection && (e.ctrlKey || e.metaKey || e.shiftKey)) {
            onSelectGridItem(slotIndex, e.shiftKey, e.ctrlKey || e.metaKey);
          } else if (previewMode === 'off') {
            if (markSelection) onSelectGridItem(slotIndex, false, false);
          } else {
            onPreviewMedia(slot);
          }
        }
      }}
      draggable={!isPencilMode && !isEraserMode && !isTextInputMode}
      onDragStart={(e) => {
        if (!isPencilMode && !isEraserMode && !isTextInputMode) {
          handleDragStart(e, slot, slotIndex);
        }
      }}
    >
      <div className="w-full h-full flex items-center justify-center overflow-hidden">
        <MediaPreview
          media={slot}
          autoplay={autoplayProp}
          hoverPlay={hoverPlayProp}
          className="max-w-full max-h-full object-contain"
          onMediaLoad={(width, height) => updateMediaDimensions(slot.id, width, height)}
        />

        {/* Hover overlay with info */}
        {isCurrentlyHovered && previewMode !== 'hover' && !isPencilMode && !isEraserMode && !isTextInputMode && (
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
                    {isImage(slot.type) && <ImageIcon size={12} className="mr-1 flex-shrink-0" />}
                    {isVideo(slot.type) && <VideoIcon size={12} className="mr-1 flex-shrink-0" />}
                    {isAudio(slot.type) && <Music size={12} className="mr-1 flex-shrink-0" />}
                    <span className="truncate">{slot.type}</span>
                  </div>
                  <div className="truncate">Size: {slot.size}</div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Selection controls */}
        {isSelected && !isPencilMode && !isEraserMode && !isTextInputMode && (
          <>
            {/* Rotation handle */}
            <div
              className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-6 cursor-move w-5 h-5 bg-blue-500 rounded-full z-30 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 item-control"
              onMouseDown={(e) => startRotation(e, slot.id)}
            >
              <RotateCw size={12} />
            </div>

            {/* Top-left resize handle */}
            <div
              className="absolute top-0 left-0 w-6 h-6 cursor-nw-resize pointer-events-auto z-10 opacity-0 group-hover:opacity-100 item-control"
              onMouseDown={(e) => startResizing(e, slot.id, 'tl')}
            >
              <div className="absolute top-1 left-1 w-3 h-3 border-l-2 border-t-2 border-blue-500"></div>
            </div>

            {/* Top-right resize handle */}
            <div
              className="absolute top-0 right-0 w-6 h-6 cursor-ne-resize pointer-events-auto z-10 opacity-0 group-hover:opacity-100 item-control"
              onMouseDown={(e) => startResizing(e, slot.id, 'tr')}
            >
              <div className="absolute top-1 right-1 w-3 h-3 border-r-2 border-t-2 border-blue-500"></div>
            </div>

            {/* Bottom-left resize handle */}
            <div
              className="absolute bottom-0 left-0 w-6 h-6 cursor-sw-resize pointer-events-auto z-10 opacity-0 group-hover:opacity-100 item-control"
              onMouseDown={(e) => startResizing(e, slot.id, 'bl')}
            >
              <div className="absolute bottom-1 left-1 w-3 h-3 border-l-2 border-b-2 border-blue-500"></div>
            </div>

            {/* Bottom-right resize handle */}
            <div
              className="absolute bottom-0 right-0 w-6 h-6 cursor-se-resize pointer-events-auto z-10 opacity-0 group-hover:opacity-100 item-control"
              onMouseDown={(e) => startResizing(e, slot.id, 'br')}
            >
              <div className="absolute bottom-1 right-1 w-3 h-3 border-r-2 border-b-2 border-blue-500"></div>
            </div>
          </>
        )}
        
        {/* Additional children (like lock indicator) */}
        {children}
      </div>
    </div>
  );
};

export default GridItem;