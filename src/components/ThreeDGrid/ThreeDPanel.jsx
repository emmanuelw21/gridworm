// Updated ThreeDPanel.jsx - Fixed alignment with GridBuilder
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  X, ChevronLeft, ChevronRight, Pin, PinOff, Box, Grid, Eye, EyeOff,
  Move, RotateCw, Maximize2, Lock, Unlock, Download, Upload,
  Camera, Layers, Sun, Moon, Settings, Plus, Circle, Triangle, Hexagon
} from 'lucide-react';
import ThreeDViewer from './ThreeDViewer';
import { is3D } from '../MediaGrid/helpers';

const ThreeDPanel = ({
  isOpen,
  onClose,
  selectedMedia,
  mediaFiles,
  onMediaUpdate,
  darkMode,
  width = 400,
  onBeginResize,
  isCollapsed: externalIsCollapsed,
  onCollapseChange,
  onAddPrimitive,
  onCaptureThumbnail
}) => {
  const [internalIsCollapsed, setInternalIsCollapsed] = useState(false);
  const isCollapsed = externalIsCollapsed !== undefined ? externalIsCollapsed : internalIsCollapsed;
  const setIsCollapsed = onCollapseChange || setInternalIsCollapsed;

  const [isPinned, setIsPinned] = useState(false);
  const [hoverExpanded, setHoverExpanded] = useState(false);
  const [transformMode, setTransformMode] = useState('translate');
  const [showGrid, setShowGrid] = useState(true);
  const [showAxes, setShowAxes] = useState(true);
  const [showWireframe, setShowWireframe] = useState(false);
  const [autoRotate, setAutoRotate] = useState(false);
  const [currentObject, setCurrentObject] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showPrimitiveMenu, setShowPrimitiveMenu] = useState(false);
  const [selected3DMedia, setSelected3DMedia] = useState(selectedMedia);

  const panelTimeoutRef = useRef(null);
  const viewerRef = useRef(null);

  // Update selected media when prop changes
  useEffect(() => {
    if (selectedMedia && (is3D(selectedMedia.type) || selectedMedia.isPrimitive)) {
      setSelected3DMedia(selectedMedia);
    }
  }, [selectedMedia]);

  const handleMouseEnter = useCallback(() => {
    if (isCollapsed && !isPinned) {
      setHoverExpanded(true);
      if (panelTimeoutRef.current) {
        clearTimeout(panelTimeoutRef.current);
      }
    }
  }, [isCollapsed, isPinned]);

  const handleMouseLeave = useCallback(() => {
    if (isCollapsed && !isPinned) {
      panelTimeoutRef.current = setTimeout(() => {
        setHoverExpanded(false);
      }, 300);
    }
  }, [isCollapsed, isPinned]);

  const handleTransformChange = useCallback((transform) => {
    if (selected3DMedia && onMediaUpdate) {
      onMediaUpdate(selected3DMedia.id, {
        ...selected3DMedia,
        transform3D: {
          position: transform.position.toArray(),
          rotation: transform.rotation.toArray(),
          scale: transform.scale.toArray()
        }
      });
    }
  }, [selected3DMedia, onMediaUpdate]);

  const handleCaptureViewport = useCallback(async () => {
    if (viewerRef.current && selected3DMedia && onCaptureThumbnail) {
      const thumbnail = await viewerRef.current.captureViewport();
      if (thumbnail) {
        onCaptureThumbnail(selected3DMedia.id, thumbnail);
      }
    }
  }, [selected3DMedia, onCaptureThumbnail]);

  const handleDropFromMediaPanel = useCallback((e) => {
    e.preventDefault();
    
    const mediaIndex = e.dataTransfer.getData('text/plain');
    const mediaId = e.dataTransfer.getData('mediaId');
    
    if (mediaIndex && mediaFiles) {
      const media = mediaFiles[parseInt(mediaIndex)];
      if (media && (is3D(media.type) || media.isPrimitive)) {
        setSelected3DMedia(media);
        
        // Generate thumbnail after model loads
        if (!media.thumbnail) {
          setTimeout(() => {
            handleCaptureViewport();
          }, 1000);
        }
      }
    }
  }, [mediaFiles, handleCaptureViewport]);

  const handleAddPrimitive = (type) => {
    if (onAddPrimitive) {
      const primitive = {
        id: `primitive-${type}-${Date.now()}`,
        name: `${type.charAt(0).toUpperCase() + type.slice(1)} Primitive`,
        type: 'model/primitive',
        isPrimitive: true,
        primitiveType: type,
        size: '0 KB',
        date: new Date().toISOString(),
        url: null, // Primitives don't need URL
        metadata: {
          title: `${type} primitive`,
          category: '3d'
        }
      };
      
      onAddPrimitive(primitive);
      setSelected3DMedia(primitive);
    }
    setShowPrimitiveMenu(false);
  };

// ThreeDPanel.jsx continued...
 const isExpanded = !isCollapsed || (isCollapsed && hoverExpanded && !isPinned);
 const panelWidth = isCollapsed && !hoverExpanded ? 40 : width;

 if (!isOpen) return null;

 return (
    <div
      className="absolute right-0 top-0 bottom-0 bg-white dark:bg-gray-900 border-l border-gray-300 dark:border-gray-600 shadow-xl transition-all duration-300 flex flex-col"
      style={{ 
        width: `${panelWidth}px`,
        top: '116px', // As you mentioned, this aligns properly
        zIndex: 45 // Ensure it's above other content but below toolbars with z-50
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
     {/* Collapse/Pin Controls */}
     <div className={`absolute top-3 ${isCollapsed ? 'left-2' : 'left-2'} z-10`}>
       {isCollapsed && !hoverExpanded && (
         <button
           onClick={() => setIsCollapsed(false)}
           className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 bg-gray-100 dark:bg-gray-800"
           title="Expand panel"
         >
           <ChevronLeft size={16} />
         </button>
       )}
     </div>

     {isExpanded && (
       <>
         {/* Header - matches GridBuilder height */}
         <div className="h-14 bg-gray-100 dark:bg-gray-800 border-b border-gray-300 dark:border-gray-600 flex items-center justify-between px-3 flex-shrink-0">
           <div className="flex items-center space-x-2">
             <Box size={20} className="text-gray-600 dark:text-gray-400" />
             <h3 className="font-semibold text-gray-800 dark:text-gray-200">3D Viewport</h3>
           </div>
           <div className="flex items-center space-x-1">
             {/* Transform tools */}
             <button
               onClick={() => setTransformMode('translate')}
               className={`p-1.5 rounded ${transformMode === 'translate' ? 'bg-blue-500 text-white' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`}
               title="Move (W)"
             >
               <Move size={16} />
             </button>
             <button
               onClick={() => setTransformMode('rotate')}
               className={`p-1.5 rounded ${transformMode === 'rotate' ? 'bg-blue-500 text-white' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`}
               title="Rotate (E)"
             >
               <RotateCw size={16} />
             </button>
             <button
               onClick={() => setTransformMode('scale')}
               className={`p-1.5 rounded ${transformMode === 'scale' ? 'bg-blue-500 text-white' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`}
               title="Scale (R)"
             >
               <Maximize2 size={16} />
             </button>
             
             <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />
             
             {/* Pin button */}
             <button
               onClick={() => setIsPinned(!isPinned)}
               className={`p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 ${isPinned ? 'text-blue-500' : ''}`}
               title={isPinned ? "Unpin panel" : "Pin panel"}
             >
               {isPinned ? <Pin size={16} /> : <PinOff size={16} />}
             </button>
             
             {/* Collapse button */}
             <button
               onClick={() => setIsCollapsed(!isCollapsed)}
               className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
               title="Collapse panel"
             >
               <ChevronRight size={16} />
             </button>
             
             {/* Close button */}
             <button
               onClick={onClose}
               className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
               title="Close 3D Viewport"
             >
               <X size={16} />
             </button>
           </div>
         </div>

         {/* Content */}
         <div className="flex-1 flex flex-col overflow-hidden">
           {/* Toolbar */}
           <div className="p-2 border-b border-gray-200 dark:border-gray-700 space-y-2">
             {/* View Options */}
             <div className="flex items-center space-x-1">
               <button
                 onClick={() => setShowGrid(!showGrid)}
                 className={`p-1.5 rounded text-sm ${showGrid ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                 title="Toggle Grid"
               >
                 <Grid size={16} />
               </button>
               <button
                 onClick={() => setShowAxes(!showAxes)}
                 className={`p-1.5 rounded text-sm ${showAxes ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                 title="Toggle Axes"
               >
                 <Box size={16} />
               </button>
               <button
                 onClick={() => setShowWireframe(!showWireframe)}
                 className={`p-1.5 rounded text-sm ${showWireframe ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                 title="Toggle Wireframe"
               >
                 <Box size={16} className="opacity-50" />
               </button>
               <button
                 onClick={() => setAutoRotate(!autoRotate)}
                 className={`p-1.5 rounded text-sm ${autoRotate ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                 title="Auto Rotate"
               >
                 <RotateCw size={16} className={autoRotate ? 'animate-spin' : ''} />
               </button>
             </div>

             {/* Actions */}
             <div className="flex items-center space-x-1">
               {/* Add Primitive Dropdown */}
               <div className="relative">
                 <button
                   onClick={() => setShowPrimitiveMenu(!showPrimitiveMenu)}
                   className="px-2 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-700 flex items-center"
                   title="Add 3D Primitive"
                 >
                   <Plus size={14} className="inline mr-1" />
                   Add Primitive
                 </button>
                 {showPrimitiveMenu && (
                   <div className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded shadow-lg z-50">
                     <button
                       onClick={() => handleAddPrimitive('cube')}
                       className="flex items-center px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 w-full text-left text-sm"
                     >
                       <Box size={16} className="mr-2" />
                       Cube
                     </button>
                     <button
                       onClick={() => handleAddPrimitive('sphere')}
                       className="flex items-center px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 w-full text-left text-sm"
                     >
                       <Circle size={16} className="mr-2" />
                       Sphere
                     </button>
                     <button
                       onClick={() => handleAddPrimitive('cone')}
                       className="flex items-center px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 w-full text-left text-sm"
                     >
                       <Triangle size={16} className="mr-2" />
                       Cone
                     </button>
                     <button
                       onClick={() => handleAddPrimitive('cylinder')}
                       className="flex items-center px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 w-full text-left text-sm"
                     >
                       <Hexagon size={16} className="mr-2" />
                       Cylinder
                     </button>
                   </div>
                 )}
               </div>
               
               <button
                 onClick={handleCaptureViewport}
                 className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                 title="Capture as Thumbnail"
               >
                 <Camera size={14} className="inline mr-1" />
                 Capture
               </button>
               <button
                 className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                 title="Export Model"
               >
                 <Download size={14} className="inline mr-1" />
                 Export
               </button>
             </div>
           </div>

           {/* 3D Viewport */}
           <div 
             className="flex-1 relative bg-gray-100 dark:bg-gray-800"
             onDragOver={(e) => e.preventDefault()}
             onDrop={handleDropFromMediaPanel}
           >
             {selected3DMedia && (is3D(selected3DMedia.type) || selected3DMedia.isPrimitive) ? (
               <ThreeDViewer
                 ref={viewerRef}
                 media={selected3DMedia}
                 width={width - 2}
                 height="100%"
                 gridConfig={{ cellWidth: 160, cellHeight: 120, cellSize: 10 }}
                 onTransformChange={handleTransformChange}
                 transformMode={transformMode}
                 viewMode="3d"
                 showGrid={showGrid}
                 showAxes={showAxes}
                 showWireframe={showWireframe}
                 showBoundingBox={false}
                 snapToGrid={false}
                 darkMode={darkMode}
                 isSelected={true}
                 autoRotate={autoRotate}
                 className="w-full h-full"
                 onObjectLoad={setCurrentObject}
               />
             ) : (
               <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400 p-4 text-center">
                 <div>
                   <Box size={48} className="mx-auto mb-2 opacity-30" />
                   <p className="text-sm">
                     {selected3DMedia ? 'Selected file is not a 3D model' : 'Select a 3D model to view'}
                   </p>
                   <p className="text-xs mt-2 opacity-70">
                     Supported formats: GLTF, GLB, OBJ, FBX, STL, PLY, 3DS, DAE
                   </p>
                   <p className="text-xs mt-2 opacity-50">
                     Drag and drop 3D files here
                   </p>
                   <p className="text-xs mt-2 opacity-50">
                     Or use "Add Primitive" to start with basic shapes
                   </p>
                 </div>
               </div>
             )}
           </div>

           {/* Info Panel */}
           {selected3DMedia && (
             <div className="p-3 border-t border-gray-200 dark:border-gray-700 text-sm">
               <div className="font-medium text-gray-700 dark:text-gray-300 mb-1">
                 {selected3DMedia.name}
                 {selected3DMedia.isPrimitive && (
                   <span className="ml-2 text-xs bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300 px-1 py-0.5 rounded">
                     Primitive
                   </span>
                 )}
               </div>
               <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                 <div>Type: {selected3DMedia.type}</div>
                 <div>Size: {selected3DMedia.size}</div>
                 {currentObject && (
                   <>
                     <div>Position: {currentObject.position?.toArray().map(v => v.toFixed(2)).join(', ')}</div>
                     <div>Rotation: {currentObject.rotation?.toArray().map(v => (v * 180 / Math.PI).toFixed(1)).join('°, ')}°</div>
                     <div>Scale: {currentObject.scale?.toArray().map(v => v.toFixed(2)).join(', ')}</div>
                   </>
                 )}
               </div>
             </div>
           )}
         </div>
       </>
     )}

     {/* Resize handle */}
     {isExpanded && (
       <div
         className="absolute top-0 left-0 bottom-0 w-2 cursor-ew-resize hover:bg-blue-300 opacity-0 hover:opacity-50 transition-opacity"
         onMouseDown={e => { e.preventDefault(); onBeginResize?.(); }}
       />
     )}
   </div>
 );
};

export default ThreeDPanel;