import React, { useState } from 'react';
import { useAtom } from 'jotai';
import { 
  Eye, EyeOff, Lock, Unlock, Plus, Trash2, 
  ChevronRight, ChevronDown, Layers, GripVertical 
} from 'lucide-react';
import { 
  layersAtom, 
  activeLayerIdAtom, 
  layerOrderAtom 
} from '../../store.js';

const LayerPanel = ({ darkMode = false }) => {
  const [layers, setLayers] = useAtom(layersAtom);
  const [activeLayerId, setActiveLayerId] = useAtom(activeLayerIdAtom);
  const [layerOrder, setLayerOrder] = useAtom(layerOrderAtom);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [draggedLayerId, setDraggedLayerId] = useState(null);
  const [dragOverLayerId, setDragOverLayerId] = useState(null);

  const addCustomLayer = () => {
    const newLayerId = `custom-${Date.now()}`;
    const newLayer = {
      id: newLayerId,
      name: `Layer ${layers.filter(l => l.type === 'custom').length + 1}`,
      visible: true,
      locked: false,
      type: 'custom'
    };
    
    setLayers([...layers, newLayer]);
    setLayerOrder([...layerOrder, newLayerId]);
    setActiveLayerId(newLayerId);
  };

  const deleteLayer = (layerId) => {
    const layer = layers.find(l => l.id === layerId);
    if (layer?.type === 'default') return; // Can't delete default layers
    
    setLayers(layers.filter(l => l.id !== layerId));
    setLayerOrder(layerOrder.filter(id => id !== layerId));
    
    // Set a new active layer if we deleted the active one
    if (activeLayerId === layerId) {
      setActiveLayerId(layerOrder[0] || 'media');
    }
  };

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

  // Render layers in reverse order (top to bottom in UI, but represents bottom to top in z-order)
  const orderedLayers = [...layerOrder].reverse().map(id => 
    layers.find(l => l.id === id)
  ).filter(Boolean);

  return (
    <div 
      className={`
        absolute top-20 right-4 
        ${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'}
        rounded-lg shadow-lg border 
        ${darkMode ? 'border-gray-700' : 'border-gray-300'}
        transition-all duration-200
        ${isCollapsed ? 'w-12' : 'w-64'}
        z-[9999]
      `}
    >
      {/* Header */}
      <div 
        className={`
          flex items-center justify-between p-3 
          border-b ${darkMode ? 'border-gray-700' : 'border-gray-300'}
          cursor-pointer
        `}
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className="flex items-center gap-2">
          <Layers size={18} />
          {!isCollapsed && <span className="font-medium">Layers</span>}
        </div>
        {!isCollapsed && (
          <ChevronDown 
            size={16} 
            className={`transform transition-transform ${isCollapsed ? '-rotate-90' : ''}`}
          />
        )}
      </div>

      {/* Layer List */}
      {!isCollapsed && (
        <div className="p-2">
          <div className="space-y-1">
            {orderedLayers.map((layer) => (
              <div
                key={layer.id}
                draggable
                onDragStart={(e) => handleDragStart(e, layer.id)}
                onDragOver={(e) => handleDragOver(e, layer.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, layer.id)}
                onDragEnd={handleDragEnd}
                className={`
                  flex items-center gap-2 p-2 rounded cursor-pointer
                  transition-all duration-150
                  ${activeLayerId === layer.id 
                    ? darkMode ? 'bg-blue-600' : 'bg-blue-500 text-white'
                    : darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                  }
                  ${dragOverLayerId === layer.id ? 'border-t-2 border-blue-400' : ''}
                  ${draggedLayerId === layer.id ? 'opacity-50' : ''}
                `}
                onClick={() => setActiveLayerId(layer.id)}
              >
                <GripVertical size={14} className="opacity-50" />
                
                <span className="flex-1 select-none">{layer.name}</span>
                
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleLayerVisibility(layer.id);
                  }}
                  className="p-1 hover:bg-black/10 rounded"
                >
                  {layer.visible ? <Eye size={14} /> : <EyeOff size={14} />}
                </button>
                
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleLayerLock(layer.id);
                  }}
                  className="p-1 hover:bg-black/10 rounded"
                >
                  {layer.locked ? <Lock size={14} /> : <Unlock size={14} />}
                </button>
                
                {layer.type === 'custom' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteLayer(layer.id);
                    }}
                    className="p-1 hover:bg-red-500/20 rounded text-red-500"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Add Layer Button */}
          <button
            onClick={addCustomLayer}
            className={`
              w-full mt-2 p-2 rounded flex items-center justify-center gap-2
              transition-colors
              ${darkMode 
                ? 'bg-gray-700 hover:bg-gray-600' 
                : 'bg-gray-100 hover:bg-gray-200'
              }
            `}
          >
            <Plus size={16} />
            <span>Add Layer</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default LayerPanel;