import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Type, Check, X } from 'lucide-react';

const TextAreaTool = ({ 
  canvasRef, 
  isActive, 
  onTextCreate,
  onTextUpdate,
  onCancelEdit,
  zoomLevel = 1,
  panOffset = { x: 0, y: 0 },
  darkMode = false,
  editingTextId = null,
  annotations = []
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [startPos, setStartPos] = useState(null);
  const [currentPos, setCurrentPos] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editingText, setEditingText] = useState('');
  const [textStyle, setTextStyle] = useState({
    fontSize: 38, // Increased from 16 to 38 (16 * 2.38) to account for new zoom baseline
    fontFamily: 'Arial',
    color: darkMode ? '#FFFFFF' : '#000000',
    textAlign: 'left',
    fontWeight: 'normal',
    fontStyle: 'normal'
  });
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState(null);
  const [resizeStart, setResizeStart] = useState(null);
  
  const textAreaRef = useRef(null);
  
  // Handle editing existing text
  useEffect(() => {
    if (editingTextId && annotations) {
      const textAnnotation = annotations.find(ann => ann.id === editingTextId && ann.type === 'text');
      if (textAnnotation) {
        setStartPos({ x: textAnnotation.x, y: textAnnotation.y });
        setCurrentPos({ x: textAnnotation.x + textAnnotation.width, y: textAnnotation.y + textAnnotation.height });
        setEditingText(textAnnotation.content || '');
        setTextStyle(textAnnotation.style || {
          fontSize: 38, // Increased from 16 to 38 (16 * 2.38) to account for new zoom baseline
          fontFamily: 'Arial',
          color: darkMode ? '#FFFFFF' : '#000000',
          textAlign: 'left',
          fontWeight: 'normal',
          fontStyle: 'normal'
        });
        setIsEditing(true);
      }
    }
  }, [editingTextId, annotations, darkMode]);

  // Convert client coordinates to canvas coordinates
  const getCanvasPosition = (clientX, clientY) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: (clientX - rect.left) / zoomLevel - panOffset.x,
      y: (clientY - rect.top) / zoomLevel - panOffset.y
    };
  };

  useEffect(() => {
    if (!isActive || !canvasRef.current) return;

    const handleMouseDown = (e) => {
      if (e.target.closest('.text-area-overlay')) return;
      
      const pos = getCanvasPosition(e.clientX, e.clientY);
      setStartPos(pos);
      setCurrentPos(pos);
      setIsCreating(true);
    };

    const handleMouseMove = (e) => {
      if (!isCreating) return;
      const pos = getCanvasPosition(e.clientX, e.clientY);
      setCurrentPos(pos);
    };

    const handleMouseUp = (e) => {
      if (!isCreating) return;
      
      const pos = getCanvasPosition(e.clientX, e.clientY);
      const width = Math.abs(pos.x - startPos.x);
      const height = Math.abs(pos.y - startPos.y);
      
      // Minimum size for text area
      if (width > 50 && height > 30) {
        setIsEditing(true);
        setEditingText('');
      }
      
      setIsCreating(false);
    };

    const canvas = canvasRef.current;
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);

    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isActive, canvasRef, isCreating, startPos, zoomLevel, panOffset]);

  const handleTextConfirm = () => {
    if (!editingText.trim() || !startPos || !currentPos) return;

    const x = Math.min(startPos.x, currentPos.x);
    const y = Math.min(startPos.y, currentPos.y);
    const width = Math.abs(currentPos.x - startPos.x);
    const height = Math.abs(currentPos.y - startPos.y);

    if (editingTextId && onTextUpdate) {
      // Update existing text
      onTextUpdate(editingTextId, {
        x,
        y,
        width,
        height,
        content: editingText,
        style: { ...textStyle }
      });
    } else {
      // Create new text
      onTextCreate({
        id: `text-${Date.now()}`,
        type: 'text',
        x,
        y,
        width,
        height,
        content: editingText,
        style: { ...textStyle }
      });
    }

    // Reset state
    setIsEditing(false);
    setEditingText('');
    setStartPos(null);
    setCurrentPos(null);
  };

  const handleTextCancel = () => {
    setIsEditing(false);
    setEditingText('');
    setStartPos(null);
    setCurrentPos(null);
    if (editingTextId && onCancelEdit) {
      onCancelEdit();
    }
  };
  
  // Handle resize
  const handleResizeMouseDown = (e, handle) => {
    e.stopPropagation();
    setIsResizing(true);
    setResizeHandle(handle);
    setResizeStart(getCanvasPosition(e.clientX, e.clientY));
  };
  
  const handleResizeMouseMove = useCallback((e) => {
    if (!isResizing || !resizeStart || !startPos) return;
    
    const currentMousePos = getCanvasPosition(e.clientX, e.clientY);
    const deltaX = currentMousePos.x - resizeStart.x;
    const deltaY = currentMousePos.y - resizeStart.y;
    
    let newStart = { ...startPos };
    let newCurrent = { ...currentPos };
    
    switch (resizeHandle) {
      case 'tl':
        newStart.x = startPos.x + deltaX;
        newStart.y = startPos.y + deltaY;
        break;
      case 'tr':
        newCurrent.x = currentPos.x + deltaX;
        newStart.y = startPos.y + deltaY;
        break;
      case 'bl':
        newStart.x = startPos.x + deltaX;
        newCurrent.y = currentPos.y + deltaY;
        break;
      case 'br':
        newCurrent.x = currentPos.x + deltaX;
        newCurrent.y = currentPos.y + deltaY;
        break;
      case 't':
        newStart.y = startPos.y + deltaY;
        break;
      case 'b':
        newCurrent.y = currentPos.y + deltaY;
        break;
      case 'l':
        newStart.x = startPos.x + deltaX;
        break;
      case 'r':
        newCurrent.x = currentPos.x + deltaX;
        break;
    }
    
    setStartPos(newStart);
    setCurrentPos(newCurrent);
    setResizeStart(currentMousePos);
  }, [isResizing, resizeStart, resizeHandle, startPos, currentPos, getCanvasPosition]);
  
  const handleResizeMouseUp = useCallback(() => {
    setIsResizing(false);
    setResizeHandle(null);
    setResizeStart(null);
  }, []);
  
  useEffect(() => {
    if (isResizing) {
      const handleMouseMove = (e) => handleResizeMouseMove(e);
      const handleMouseUp = () => handleResizeMouseUp();
      
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isResizing, handleResizeMouseMove, handleResizeMouseUp]);

  if (!isActive) return null;

  // Calculate box dimensions
  const boxX = startPos && currentPos ? Math.min(startPos.x, currentPos.x) : 0;
  const boxY = startPos && currentPos ? Math.min(startPos.y, currentPos.y) : 0;
  const boxWidth = startPos && currentPos ? Math.abs(currentPos.x - startPos.x) : 0;
  const boxHeight = startPos && currentPos ? Math.abs(currentPos.y - startPos.y) : 0;

  return (
    <>
      {/* Creation preview */}
      {isCreating && startPos && currentPos && (
        <div
          className="absolute pointer-events-none"
          style={{
            left: `${boxX}px`,
            top: `${boxY}px`,
            width: `${boxWidth}px`,
            height: `${boxHeight}px`,
            border: '2px dashed #3B82F6',
            backgroundColor: 'rgba(59, 130, 246, 0.1)'
          }}
        />
      )}

      {/* Text editing overlay */}
      {isEditing && startPos && currentPos && (
        <div
          className="text-area-overlay absolute"
          style={{
            left: `${boxX}px`,
            top: `${boxY}px`,
            width: `${boxWidth}px`,
            height: `${boxHeight}px`,
            zIndex: 1000
          }}
        >
          {/* Resize handles */}
          <div className="absolute inset-0 pointer-events-none">
            {/* Corner handles */}
            <div
              className="absolute w-3 h-3 bg-blue-500 cursor-nw-resize pointer-events-auto"
              style={{ left: '-6px', top: '-6px' }}
              onMouseDown={(e) => handleResizeMouseDown(e, 'tl')}
            />
            <div
              className="absolute w-3 h-3 bg-blue-500 cursor-ne-resize pointer-events-auto"
              style={{ right: '-6px', top: '-6px' }}
              onMouseDown={(e) => handleResizeMouseDown(e, 'tr')}
            />
            <div
              className="absolute w-3 h-3 bg-blue-500 cursor-sw-resize pointer-events-auto"
              style={{ left: '-6px', bottom: '-6px' }}
              onMouseDown={(e) => handleResizeMouseDown(e, 'bl')}
            />
            <div
              className="absolute w-3 h-3 bg-blue-500 cursor-se-resize pointer-events-auto"
              style={{ right: '-6px', bottom: '-6px' }}
              onMouseDown={(e) => handleResizeMouseDown(e, 'br')}
            />
            {/* Edge handles */}
            <div
              className="absolute w-3 h-3 bg-blue-500 cursor-n-resize pointer-events-auto"
              style={{ left: '50%', top: '-6px', transform: 'translateX(-50%)' }}
              onMouseDown={(e) => handleResizeMouseDown(e, 't')}
            />
            <div
              className="absolute w-3 h-3 bg-blue-500 cursor-s-resize pointer-events-auto"
              style={{ left: '50%', bottom: '-6px', transform: 'translateX(-50%)' }}
              onMouseDown={(e) => handleResizeMouseDown(e, 'b')}
            />
            <div
              className="absolute w-3 h-3 bg-blue-500 cursor-w-resize pointer-events-auto"
              style={{ left: '-6px', top: '50%', transform: 'translateY(-50%)' }}
              onMouseDown={(e) => handleResizeMouseDown(e, 'l')}
            />
            <div
              className="absolute w-3 h-3 bg-blue-500 cursor-e-resize pointer-events-auto"
              style={{ right: '-6px', top: '50%', transform: 'translateY(-50%)' }}
              onMouseDown={(e) => handleResizeMouseDown(e, 'r')}
            />
          </div>
          <textarea
            ref={textAreaRef}
            value={editingText}
            onChange={(e) => setEditingText(e.target.value)}
            className="w-full h-full p-2 resize-none border-2 border-blue-500 rounded"
            style={{
              fontSize: `${textStyle.fontSize}px`,
              fontFamily: textStyle.fontFamily,
              color: textStyle.color,
              textAlign: textStyle.textAlign,
              fontWeight: textStyle.fontWeight,
              fontStyle: textStyle.fontStyle,
              backgroundColor: darkMode ? 'rgba(0, 0, 0, 0.8)' : 'rgba(255, 255, 255, 0.9)'
            }}
            placeholder="Type your text here..."
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                handleTextCancel();
              }
            }}
          />
          
          {/* Text controls */}
          <div className="absolute -top-10 left-0 flex items-center space-x-2 bg-white dark:bg-gray-800 rounded shadow-lg p-2">
            <select
              value={textStyle.fontFamily}
              onChange={(e) => setTextStyle({ ...textStyle, fontFamily: e.target.value })}
              className="text-sm border rounded px-2 py-1 dark:bg-gray-700 dark:border-gray-600"
            >
              <option value="Arial">Arial</option>
              <option value="Helvetica">Helvetica</option>
              <option value="Times New Roman">Times</option>
              <option value="Georgia">Georgia</option>
              <option value="Courier New">Courier</option>
              <option value="Comic Sans MS">Comic Sans</option>
            </select>
            
            <input
              type="number"
              value={textStyle.fontSize}
              onChange={(e) => setTextStyle({ ...textStyle, fontSize: parseInt(e.target.value) || 38 })}
              className="w-16 text-sm border rounded px-2 py-1 dark:bg-gray-700 dark:border-gray-600"
              min="8"
              max="72"
            />
            
            <input
              type="color"
              value={textStyle.color}
              onChange={(e) => setTextStyle({ ...textStyle, color: e.target.value })}
              className="w-8 h-8 border rounded cursor-pointer"
            />
            
            {/* Text alignment buttons */}
            <div className="flex space-x-1 border-l pl-2">
              <button
                onClick={() => setTextStyle({ ...textStyle, textAlign: 'left' })}
                className={`p-1 rounded ${textStyle.textAlign === 'left' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}
                title="Align Left"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <rect x="2" y="3" width="10" height="2" />
                  <rect x="2" y="7" width="6" height="2" />
                  <rect x="2" y="11" width="8" height="2" />
                </svg>
              </button>
              <button
                onClick={() => setTextStyle({ ...textStyle, textAlign: 'center' })}
                className={`p-1 rounded ${textStyle.textAlign === 'center' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}
                title="Align Center"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <rect x="3" y="3" width="10" height="2" />
                  <rect x="5" y="7" width="6" height="2" />
                  <rect x="4" y="11" width="8" height="2" />
                </svg>
              </button>
              <button
                onClick={() => setTextStyle({ ...textStyle, textAlign: 'right' })}
                className={`p-1 rounded ${textStyle.textAlign === 'right' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}
                title="Align Right"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <rect x="4" y="3" width="10" height="2" />
                  <rect x="8" y="7" width="6" height="2" />
                  <rect x="6" y="11" width="8" height="2" />
                </svg>
              </button>
            </div>
            
            <button
              onClick={handleTextConfirm}
              className="p-1 bg-green-600 text-white rounded hover:bg-green-700"
              title="Confirm"
            >
              <Check size={16} />
            </button>
            
            <button
              onClick={handleTextCancel}
              className="p-1 bg-red-600 text-white rounded hover:bg-red-700"
              title="Cancel"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default TextAreaTool;