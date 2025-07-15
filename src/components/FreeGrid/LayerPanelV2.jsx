import React, { useState, useEffect, useRef } from 'react';
import { useAtom } from 'jotai';
import { 
  Eye, EyeOff, Lock, Unlock, ChevronRight, ChevronDown, 
  Layers, GripVertical, Image, Type, PenTool, Move, Square, Target, Trash2, Folder, FolderOpen
} from 'lucide-react';
import { 
  layersAtom, 
  activeLayerIdAtom, 
  layerOrderAtom,
  typeFiltersAtom,
  freeGridItemsAtom,
  mediaFilesAtom,
  layerGroupsAtom
} from '../../store.js';

const LayerPanelV2 = ({ 
  darkMode = false, 
  annotations = [],
  mediaFiles = [],
  containerBounds = { left: 0, top: 0, right: window.innerWidth, bottom: window.innerHeight },
  artboards = {},
  selectedArtboards = [],
  onLayerSelect = () => {},
  onLayerDoubleClick = () => {},
  onArtboardSelect = () => {},
  onArtboardUpdate = () => {},
  onDeleteItem = () => {},
  onDockToToolbar = null,
  toolbarHeight = 120
}) => {
  const [layers, setLayers] = useAtom(layersAtom);
  const [activeLayerId, setActiveLayerId] = useAtom(activeLayerIdAtom);
  const [layerOrder, setLayerOrder] = useAtom(layerOrderAtom);
  const [typeFilters, setTypeFilters] = useAtom(typeFiltersAtom);
  const [freeGridItems] = useAtom(freeGridItemsAtom);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [draggedLayerId, setDraggedLayerId] = useState(null);
  const [dragOverLayerId, setDragOverLayerId] = useState(null);
  const [showArtboardList, setShowArtboardList] = useState(false);
  const [layerGroups, setLayerGroups] = useAtom(layerGroupsAtom);
  const [selectedLayers, setSelectedLayers] = useState([]);
  
  // Panel positioning state - start upper right within container bounds
  const panelWidth = 300; // Approximate panel width
  const rightEdge = Math.min(containerBounds.right - panelWidth - 20, window.innerWidth - panelWidth - 20);
  const [position, setPosition] = useState({ x: rightEdge, y: containerBounds.top + 44 });
  const [isDraggingPanel, setIsDraggingPanel] = useState(false);
  const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 });
  const panelRef = useRef(null);

  // Sync layers with actual items
  useEffect(() => {
    const newLayers = [];
    const newOrder = [];

    // Add media items as layers
    Object.entries(freeGridItems).forEach(([id, item]) => {
      const media = mediaFiles.find(m => m.id === item.mediaId);
      if (media) {
        const existingLayer = layers.find(l => l.itemId === id && l.itemType === 'media');
        const layer = existingLayer || {
          id: `layer-media-${id}`,
          itemId: id,
          itemType: 'media',
          name: media.name || 'Untitled Media',
          visible: true,
          locked: false
        };
        newLayers.push(layer);
        newOrder.push(layer.id);
      }
    });

    // Add annotations as layers
    annotations.forEach(annotation => {
      const existingLayer = layers.find(l => l.itemId === annotation.id && l.itemType === annotation.type);
      
      // Generate appropriate name based on annotation type
      let name = 'Layer';
      if (annotation.type === 'text') {
        name = annotation.content ? 
          (annotation.content.substring(0, 20) + (annotation.content.length > 20 ? '...' : '')) 
          : 'Text Layer';
      } else {
        // Name vectors based on their specific type
        switch (annotation.type) {
          case 'rectangle': name = 'Rectangle'; break;
          case 'ellipse': name = 'Ellipse'; break;
          case 'polygon': name = 'Polygon'; break;
          case 'path': name = 'Pencil Drawing'; break;
          case 'vector': name = 'Vector Path'; break;
          default: name = 'Vector Layer';
        }
      }
      
      const layer = existingLayer || {
        id: `layer-${annotation.type}-${annotation.id}`,
        itemId: annotation.id,
        itemType: annotation.type === 'text' ? 'text' : 'vectors',
        name: name,
        visible: true,
        locked: false
      };
      newLayers.push(layer);
      newOrder.push(layer.id);
    });

    // Update only if there are changes
    if (newLayers.length !== layers.length || 
        !newLayers.every(nl => layers.some(l => l.id === nl.id))) {
      setLayers(newLayers);
      setLayerOrder(newOrder);
    }
  }, [freeGridItems, annotations, mediaFiles]);

  const toggleLayerVisibility = (layerId) => {
    setLayers(layers.map(layer => 
      layer.id === layerId 
        ? { ...layer, visible: !layer.visible }
        : layer
    ));
  };

  const toggleLayerLock = (layerId) => {
    setLayers(layers.map(layer => 
      layer.id === layerId 
        ? { ...layer, locked: !layer.locked }
        : layer
    ));
  };

  const toggleTypeFilter = (type, property) => {
    setTypeFilters({
      ...typeFilters,
      [type]: {
        ...typeFilters[type],
        [property]: !typeFilters[type][property]
      }
    });
  };

  const handleDragStart = (e, layerId) => {
    setDraggedLayerId(layerId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, layerId) => {
    e.preventDefault();
    if (layerId !== draggedLayerId) {
      setDragOverLayerId(layerId);
    }
  };

  const handleDragLeave = () => {
    setDragOverLayerId(null);
  };

  const handleDrop = (e, targetLayerId) => {
    e.preventDefault();
    if (!draggedLayerId || draggedLayerId === targetLayerId) return;

    const newOrder = [...layerOrder];
    const draggedIndex = newOrder.indexOf(draggedLayerId);
    const targetIndex = newOrder.indexOf(targetLayerId);
    
    // Remove dragged layer from its position
    newOrder.splice(draggedIndex, 1);
    // Insert at new position
    newOrder.splice(targetIndex, 0, draggedLayerId);
    
    setLayerOrder(newOrder);
    setDraggedLayerId(null);
    setDragOverLayerId(null);
  };

  const handleDragEnd = () => {
    setDraggedLayerId(null);
    setDragOverLayerId(null);
  };

  // Panel drag handlers
  const handlePanelMouseDown = (e) => {
    setIsDraggingPanel(true);
    setDragStartPos({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDraggingPanel) return;

      e.preventDefault();
      
      // Store last mouse position for docking check
      if (dragStartPos) {
        dragStartPos.lastY = e.clientY;
      }

      const newX = e.clientX - dragStartPos.x;
      const newY = e.clientY - dragStartPos.y;

      // Constrain to container bounds
      const panelWidth = panelRef.current?.offsetWidth || 300;
      const panelHeight = panelRef.current?.offsetHeight || 400;

      const constrainedX = Math.max(
        containerBounds.left,
        Math.min(containerBounds.right - panelWidth, newX)
      );
      const constrainedY = Math.max(
        containerBounds.top,
        Math.min(containerBounds.bottom - panelHeight, newY)
      );

      setPosition({ x: constrainedX, y: constrainedY });
      
      // Check if panel is near the top for docking (only show when dragging and near top)
      if (onDockToToolbar && newY < toolbarHeight && newY >= 0) {
        // Add visual feedback that docking is available
        const dockIndicator = document.getElementById('layer-dock-indicator');
        if (!dockIndicator) {
          const indicator = document.createElement('div');
          indicator.id = 'layer-dock-indicator';
          indicator.className = 'fixed top-14 left-1/2 transform -translate-x-1/2 bg-green-500 text-white px-4 py-2 rounded shadow-lg z-[70]';
          indicator.textContent = 'Release to dock layer panel';
          document.body.appendChild(indicator);
        }
      } else {
        // Remove dock indicator if moved away
        const dockIndicator = document.getElementById('layer-dock-indicator');
        if (dockIndicator) {
          dockIndicator.remove();
        }
      }
    };

    const handleMouseUp = () => {
      setIsDraggingPanel(false);
      document.body.style.cursor = 'auto';
      
      // Clean up dock indicator
      const dockIndicator = document.getElementById('layer-dock-indicator');
      if (dockIndicator) {
        dockIndicator.remove();
      }
      
      // Check if we should dock - use the raw Y position from the drag
      if (onDockToToolbar && dragStartPos) {
        const newY = dragStartPos.lastY - dragStartPos.y;
        if (newY < toolbarHeight && newY >= 0) {
          onDockToToolbar();
        }
      }
    };

    if (isDraggingPanel) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDraggingPanel, dragStartPos, containerBounds, onDockToToolbar, toolbarHeight]);

  // Get icon for item type
  const getItemIcon = (itemType) => {
    switch (itemType) {
      case 'media': return <Image size={14} />;
      case 'text': return <Type size={14} />;
      case 'vectors': return <PenTool size={14} />;
      default: return null;
    }
  };

  // Render layers in reverse order (top to bottom in UI, but represents bottom to top in z-order)
  const orderedLayers = [...layerOrder].reverse().map(id => 
    layers.find(l => l.id === id)
  ).filter(Boolean);

  return (
    <div 
      ref={panelRef}
      className={`
        fixed
        ${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'}
        rounded-lg shadow-lg border 
        ${darkMode ? 'border-gray-700' : 'border-gray-300'}
        ${isCollapsed ? 'w-12' : 'w-72'}
        z-[9999]
        ${isDraggingPanel ? 'cursor-move' : ''}
      `}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transition: isDraggingPanel ? 'none' : 'width 0.2s'
      }}
    >
      {/* Header */}
      <div 
        className={`
          flex items-center justify-between p-3 
          border-b ${darkMode ? 'border-gray-700' : 'border-gray-300'}
          ${isCollapsed ? 'cursor-move' : ''}
        `}
        onMouseDown={isCollapsed ? handlePanelMouseDown : undefined}
      >
        <div className="flex items-center gap-2">
          {!isCollapsed ? (
            <div
              className="cursor-move p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
              onMouseDown={handlePanelMouseDown}
              title="Drag to move panel"
            >
              <Move size={16} />
            </div>
          ) : null}
          <Layers size={18} />
          {!isCollapsed && <span className="font-medium select-none">Layers</span>}
        </div>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
        >
          <ChevronDown 
            size={16} 
            className={`transform transition-transform ${isCollapsed ? '-rotate-90' : ''}`}
          />
        </button>
      </div>

      {!isCollapsed && (
        <>
          {/* Type Filters */}
          <div className={`p-3 border-b ${darkMode ? 'border-gray-700' : 'border-gray-300'}`}>
            <div className="text-xs font-medium mb-2 text-gray-500">Type Filters</div>
            <div className="space-y-1">
              {/* Media Filter */}
              <div className="flex items-center justify-between p-1">
                <div className="flex items-center gap-2">
                  <Image size={14} />
                  <span className="text-sm">Media</span>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => toggleTypeFilter('media', 'visible')}
                    className="p-1 hover:bg-black/10 rounded"
                  >
                    {typeFilters.media.visible ? <Eye size={14} /> : <EyeOff size={14} />}
                  </button>
                  <button
                    onClick={() => toggleTypeFilter('media', 'locked')}
                    className="p-1 hover:bg-black/10 rounded"
                  >
                    {typeFilters.media.locked ? <Lock size={14} /> : <Unlock size={14} />}
                  </button>
                </div>
              </div>

              {/* Vectors Filter */}
              <div className="flex items-center justify-between p-1">
                <div className="flex items-center gap-2">
                  <PenTool size={14} />
                  <span className="text-sm">Vectors</span>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => toggleTypeFilter('vectors', 'visible')}
                    className="p-1 hover:bg-black/10 rounded"
                  >
                    {typeFilters.vectors.visible ? <Eye size={14} /> : <EyeOff size={14} />}
                  </button>
                  <button
                    onClick={() => toggleTypeFilter('vectors', 'locked')}
                    className="p-1 hover:bg-black/10 rounded"
                  >
                    {typeFilters.vectors.locked ? <Lock size={14} /> : <Unlock size={14} />}
                  </button>
                </div>
              </div>

              {/* Text Filter */}
              <div className="flex items-center justify-between p-1">
                <div className="flex items-center gap-2">
                  <Type size={14} />
                  <span className="text-sm">Text</span>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => toggleTypeFilter('text', 'visible')}
                    className="p-1 hover:bg-black/10 rounded"
                  >
                    {typeFilters.text.visible ? <Eye size={14} /> : <EyeOff size={14} />}
                  </button>
                  <button
                    onClick={() => toggleTypeFilter('text', 'locked')}
                    className="p-1 hover:bg-black/10 rounded"
                  >
                    {typeFilters.text.locked ? <Lock size={14} /> : <Unlock size={14} />}
                  </button>
                </div>
              </div>

              {/* Artboards Filter */}
              <div className="flex items-center justify-between p-1">
                <div className="flex items-center gap-2">
                  <Square size={14} />
                  <span className="text-sm">Artboards</span>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => toggleTypeFilter('artboards', 'priority')}
                    className={`p-1 hover:bg-black/10 rounded ${
                      typeFilters.artboards?.priority ? 'bg-blue-500/20' : ''
                    }`}
                    title="Priority mode - artboards appear through other items"
                  >
                    <Target size={14} className={typeFilters.artboards?.priority ? 'text-blue-500' : ''} />
                  </button>
                  <button
                    onClick={() => toggleTypeFilter('artboards', 'visible')}
                    className="p-1 hover:bg-black/10 rounded"
                  >
                    {typeFilters.artboards?.visible ? <Eye size={14} /> : <EyeOff size={14} />}
                  </button>
                  <button
                    onClick={() => toggleTypeFilter('artboards', 'locked')}
                    className="p-1 hover:bg-black/10 rounded"
                  >
                    {typeFilters.artboards?.locked ? <Lock size={14} /> : <Unlock size={14} />}
                  </button>
                </div>
              </div>
              
              {/* Expandable Artboard List */}
              {Object.keys(artboards).length > 0 && (
                <div className="ml-4 mt-1">
                  <button
                    onClick={() => setShowArtboardList(!showArtboardList)}
                    className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                  >
                    <ChevronRight 
                      size={12} 
                      className={`transform transition-transform ${showArtboardList ? 'rotate-90' : ''}`}
                    />
                    <span>{Object.keys(artboards).length} artboard{Object.keys(artboards).length !== 1 ? 's' : ''}</span>
                  </button>
                  
                  {showArtboardList && (
                    <div className="mt-1 space-y-1 max-h-40 overflow-y-auto">
                      {Object.entries(artboards).map(([id, artboard]) => (
                        <div
                          key={id}
                          className={`
                            flex items-center justify-between p-1 pl-4 rounded text-xs
                            ${selectedArtboards.includes(id)
                              ? darkMode ? 'bg-blue-600' : 'bg-blue-500 text-white'
                              : darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                            }
                            cursor-pointer
                          `}
                          onClick={() => onArtboardSelect(id, {})}
                        >
                          <span className="flex-1 truncate">{artboard.name}</span>
                          <div className="flex gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onArtboardUpdate(id, { isLocked: !artboard.isLocked });
                              }}
                              className="p-1 hover:bg-black/10 rounded"
                            >
                              {artboard.isLocked ? <Lock size={10} /> : <Unlock size={10} />}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Layer List */}
          <div className="p-2 max-h-96 overflow-y-auto">
            <div className="space-y-1">
              {orderedLayers.map((layer, index) => (
                <div
                  key={layer.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, layer.id)}
                  onDragOver={(e) => handleDragOver(e, layer.id)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, layer.id)}
                  onDragEnd={handleDragEnd}
                  className={`
                    flex items-center gap-2 p-2 rounded cursor-pointer text-sm
                    transition-all duration-150
                    ${activeLayerId === layer.id 
                      ? darkMode ? 'bg-blue-600' : 'bg-blue-500 text-white'
                      : darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                    }
                    ${dragOverLayerId === layer.id ? 'border-t-2 border-blue-400' : ''}
                    ${draggedLayerId === layer.id ? 'opacity-50' : ''}
                  `}
                  onClick={() => {
                    setActiveLayerId(layer.id);
                    onLayerSelect(layer);
                  }}
                  onDoubleClick={() => onLayerDoubleClick(layer)}
                >
                  <GripVertical size={12} className="opacity-50" />
                  {getItemIcon(layer.itemType)}
                  
                  <span className="flex-1 truncate">{layer.name}</span>
                  <span className="text-xs opacity-50">{index + 1}</span>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleLayerVisibility(layer.id);
                    }}
                    className="p-1 hover:bg-black/10 rounded"
                  >
                    {layer.visible ? <Eye size={12} /> : <EyeOff size={12} />}
                  </button>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleLayerLock(layer.id);
                    }}
                    className="p-1 hover:bg-black/10 rounded"
                  >
                    {layer.locked ? <Lock size={12} /> : <Unlock size={12} />}
                  </button>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm(`Delete ${layer.name}?`)) {
                        onDeleteItem(layer);
                      }
                    }}
                    className="p-1 hover:bg-red-500/20 rounded text-red-500"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default LayerPanelV2;