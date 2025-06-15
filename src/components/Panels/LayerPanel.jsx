// components/Layers/LayerPanel.jsx
const LayerPanel = ({ layers, onLayerUpdate, onLayerReorder }) => {
  const [selectedLayers, setSelectedLayers] = useState([]);

  return (
    <div className="w-64 bg-gray-100 dark:bg-gray-800 border-l">
      <div className="p-2 border-b">
        <h3 className="font-bold">Layers</h3>
        <div className="flex space-x-1 mt-2">
          <button className="p-1 hover:bg-gray-200" title="New Layer">
            <Plus size={16} />
          </button>
          <button className="p-1 hover:bg-gray-200" title="New Group">
            <Folder size={16} />
          </button>
          <button className="p-1 hover:bg-gray-200" title="Delete Layer">
            <Trash2 size={16} />
          </button>
        </div>
      </div>
      
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="layers">
          {(provided) => (
            <div ref={provided.innerRef} {...provided.droppableProps}>
              {layers.map((layer, index) => (
                <LayerItem
                  key={layer.id}
                  layer={layer}
                  index={index}
                  selected={selectedLayers.includes(layer.id)}
                  onSelect={handleLayerSelect}
                  onUpdate={onLayerUpdate}
                />
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
};

const LayerItem = ({ layer, index, selected, onSelect, onUpdate }) => (
  <Draggable draggableId={layer.id} index={index}>
    {(provided, snapshot) => (
      <div
        ref={provided.innerRef}
        {...provided.draggableProps}
        {...provided.dragHandleProps}
        className={`p-2 border-b flex items-center space-x-2 ${
          selected ? 'bg-blue-100' : 'hover:bg-gray-50'
        } ${snapshot.isDragging ? 'shadow-lg' : ''}`}
        onClick={() => onSelect(layer.id)}
      >
        <Eye 
          size={16} 
          className={layer.visible ? '' : 'text-gray-400'}
          onClick={(e) => {
            e.stopPropagation();
            onUpdate(layer.id, { visible: !layer.visible });
          }}
        />
        {layer.locked && <Lock size={14} />}
        <span className="flex-1">{layer.name}</span>
        <input
          type="range"
          min="0"
          max="100"
          value={layer.opacity}
          onChange={(e) => onUpdate(layer.id, { opacity: e.target.value })}
          className="w-16"
          onClick={(e) => e.stopPropagation()}
        />
        <span className="text-xs">{layer.opacity}%</span>
      </div>
    )}
  </Draggable>
);