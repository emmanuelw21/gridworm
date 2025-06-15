import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';

const VirtualizedGrid = ({ items, renderItem, columns, cellWidth, cellHeight, containerHeight }) => {
  const containerRef = useRef(null);
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 20 });
  
  // Calculate row height based on our cell height
  const rowHeight = cellHeight + 12; // 12px for gap
  
  // Calculate number of rows
  const rowCount = Math.ceil(items.length / columns);
  
  // Update visible range when scrolling
  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    
    const { scrollTop, clientHeight } = containerRef.current;
    
    // Calculate visible range with buffer
    const buffer = 5; // Buffer rows above and below
    const startRow = Math.max(0, Math.floor(scrollTop / rowHeight) - buffer);
    const endRow = Math.min(rowCount, Math.ceil((scrollTop + clientHeight) / rowHeight) + buffer);
    
    const startIndex = startRow * columns;
    const endIndex = Math.min(items.length, endRow * columns);
    
    setVisibleRange({ start: startIndex, end: endIndex });
  }, [columns, rowHeight, rowCount, items.length]);
  
  // Setup scroll event handler
  useEffect(() => {
    const currentRef = containerRef.current;
    if (currentRef) {
      currentRef.addEventListener('scroll', handleScroll);
      // Initial calculation
      handleScroll();
    }
    
    return () => {
      if (currentRef) {
        currentRef.removeEventListener('scroll', handleScroll);
      }
    };
  }, [handleScroll]);
  
  // Recalculate when items or layout changes
  useEffect(() => {
    handleScroll();
  }, [items, columns, cellHeight, handleScroll]);
  
  // Get visible items
  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.start, visibleRange.end);
  }, [items, visibleRange]);
  
  return (
    <div 
      ref={containerRef} 
      className="overflow-y-auto"
      style={{ height: containerHeight || '100%' }}
    >
      {/* Spacer div for scrolling */}
      <div style={{ height: rowCount * rowHeight, position: 'relative' }}>
        {/* Actual grid with visible items only */}
        <div 
          className="grid gap-3 absolute"
          style={{ 
            gridTemplateColumns: `repeat(${columns}, 1fr)`,
            width: columns * (cellWidth + 12), // 12px for gap
            transform: `translateY(${Math.floor(visibleRange.start / columns) * rowHeight}px)`
          }}
        >
          {visibleItems.map((item, idx) => renderItem(item, visibleRange.start + idx))}
        </div>
      </div>
    </div>
  );
};

export default VirtualizedGrid;