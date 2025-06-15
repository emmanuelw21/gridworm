// components/GridUtils.js
export const duplicateGridItem = (item, generateNewId = true) => {
  const newItem = {
    ...item,
    id: generateNewId ? `${item.id}-copy-${Date.now()}` : item.id,
    parentId: item.parentId || item.id,
    isDuplicate: true,
    position: item.position ? {
      ...item.position,
      x: item.position.x + 20,
      y: item.position.y + 20
    } : undefined
  };
  return newItem;
};

export const preserveDuplicatesOnModeSwitch = (items, fromMode, toMode) => {
  if (fromMode === 'free' && toMode === 'standard') {
    // Sort items by position for proper reflow
    const sortedItems = [...items].sort((a, b) => {
      const posA = a.position || { x: 0, y: 0 };
      const posB = b.position || { x: 0, y: 0 };
      return (posA.y - posB.y) || (posA.x - posB.x);
    });
    
    return sortedItems.map((item, index) => ({
      ...item,
      gridIndex: index,
      position: null // Clear position for standard grid
    }));
  } else if (fromMode === 'standard' && toMode === 'free') {
    // Convert grid positions to free positions
    const columns = 4; // Default grid columns
    const cellWidth = 160;
    const cellHeight = 120;
    const gap = 20;
    
    return items.map((item, index) => ({
      ...item,
      position: {
        x: (index % columns) * (cellWidth + gap),
        y: Math.floor(index / columns) * (cellHeight + gap)
      }
    }));
  }
  
  return items;
};