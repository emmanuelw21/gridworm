// components/FreeGrid/VectorPenTool.jsx
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Edit3 } from 'lucide-react';

const VectorPenTool = ({
    isActive,
    canvasRef,
    onPathComplete,
    strokeColor = '#000000',
    strokeWidth = 2,
    fillColor = 'none',
    zoomLevel = 1,
    panOffset = { x: 0, y: 0 }
}) => {
    const [anchors, setAnchors] = useState([]);
    const [selectedAnchor, setSelectedAnchor] = useState(null);
    const [isDraggingHandle, setIsDraggingHandle] = useState(false);
    const [draggedHandle, setDraggedHandle] = useState(null);
    const [previewPoint, setPreviewPoint] = useState(null);
    const [isClosingPath, setIsClosingPath] = useState(false);

    // Convert client coordinates to canvas coordinates
    const getCanvasPosition = useCallback((clientX, clientY) => {
        if (!canvasRef?.current) return { x: 0, y: 0 };
        const rect = canvasRef.current.getBoundingClientRect();
        return {
            x: (clientX - rect.left) / zoomLevel - panOffset.x,
            y: (clientY - rect.top) / zoomLevel - panOffset.y
        };
    }, [canvasRef, zoomLevel, panOffset]);

    // Generate SVG path data from anchors
    const generatePath = useCallback((isPathClosed) => {
        if (anchors.length < 2) return '';

        let path = `M ${anchors[0].x} ${anchors[0].y}`;

        for (let i = 1; i < anchors.length; i++) {
            const prevAnchor = anchors[i - 1];
            const currAnchor = anchors[i];
            path += ` C ${prevAnchor.handleOut.x} ${prevAnchor.handleOut.y}, ${currAnchor.handleIn.x} ${currAnchor.handleIn.y}, ${currAnchor.x} ${currAnchor.y}`;
        }

        if (isPathClosed && anchors.length > 2) {
            const lastAnchor = anchors[anchors.length - 1];
            const firstAnchor = anchors[0];
            path += ` C ${lastAnchor.handleOut.x} ${lastAnchor.handleOut.y}, ${firstAnchor.handleIn.x} ${firstAnchor.handleIn.y}, ${firstAnchor.x} ${firstAnchor.y}`;
            path += ' Z'; // Close the path
        }

        return path;
    }, [anchors]);

    // Complete the path and send it to the parent
    const completePath = useCallback((closed = false) => {
        if (anchors.length < 2) {
            // Path is too short, just reset
            setAnchors([]);
            setSelectedAnchor(null);
            setIsClosingPath(false);
            setPreviewPoint(null);
            return;
        }

        const pathData = {
            id: `path-${Date.now()}`,
            type: 'bezier',
            anchors: [...anchors],
            closed,
            stroke: strokeColor,
            strokeWidth,
            fill: closed ? fillColor : 'none',
            path: generatePath(closed) // Generate final path
        };

        if (onPathComplete) {
            onPathComplete(pathData);
        }

        // Reset for the next path
        setAnchors([]);
        setSelectedAnchor(null);
        setIsClosingPath(false);
        setPreviewPoint(null);
    }, [anchors, strokeColor, strokeWidth, fillColor, generatePath, onPathComplete]);

    // Add a new anchor point to the path
    const addAnchor = useCallback((e) => {
        const pos = getCanvasPosition(e.clientX, e.clientY);

        // Check if clicking on the first anchor to close the path
        if (anchors.length > 2) {
            const firstAnchor = anchors[0];
            const distance = Math.sqrt(
                Math.pow(pos.x - firstAnchor.x, 2) +
                Math.pow(pos.y - firstAnchor.y, 2)
            );

            // Adjust snap distance based on zoom level
            if (distance < (10 / zoomLevel)) {
                completePath(true); // Complete the path as closed
                return;
            }
        }

        const newAnchor = {
            id: Date.now(),
            x: pos.x,
            y: pos.y,
            handleIn: { x: pos.x, y: pos.y },
            handleOut: { x: pos.x, y: pos.y },
            type: 'smooth' // 'smooth', 'corner', 'symmetric'
        };

        setAnchors(prev => [...prev, newAnchor]);
    }, [anchors, getCanvasPosition, completePath, zoomLevel]);

    // Start dragging a control handle
    const startDraggingHandle = useCallback((e, anchorId, handleType) => {
        e.stopPropagation();
        setIsDraggingHandle(true);
        setDraggedHandle({ anchorId, handleType });
        setSelectedAnchor(anchorId);
    }, []);

    // Update handle position while dragging
    const updateHandle = useCallback((e) => {
        if (!isDraggingHandle || !draggedHandle) return;

        const pos = getCanvasPosition(e.clientX, e.clientY);

        setAnchors(prev => prev.map(anchor => {
            if (anchor.id === draggedHandle.anchorId) {
                const updated = { ...anchor };

                if (draggedHandle.handleType === 'in') {
                    updated.handleIn = { x: pos.x, y: pos.y };
                    if (anchor.type === 'smooth') {
                        const dx = anchor.x - pos.x;
                        const dy = anchor.y - pos.y;
                        updated.handleOut = { x: anchor.x + dx, y: anchor.y + dy };
                    }
                } else {
                    updated.handleOut = { x: pos.x, y: pos.y };
                    if (anchor.type === 'smooth') {
                        const dx = anchor.x - pos.x;
                        const dy = anchor.y - pos.y;
                        updated.handleIn = { x: anchor.x + dx, y: anchor.y + dy };
                    }
                }
                return updated;
            }
            return anchor;
        }));
    }, [isDraggingHandle, draggedHandle, getCanvasPosition]);


    // Handle mouse move for previews and dragging
    const handleMouseMove = useCallback((e) => {
        if (isDraggingHandle) {
            updateHandle(e);
        } else if (isActive && anchors.length > 0) {
            const pos = getCanvasPosition(e.clientX, e.clientY);
            setPreviewPoint(pos);

            // Check if hovering over the first point to set closing state for preview
            if (anchors.length > 2) {
                const firstAnchor = anchors[0];
                const distance = Math.sqrt(
                    Math.pow(pos.x - firstAnchor.x, 2) +
                    Math.pow(pos.y - firstAnchor.y, 2)
                );
                setIsClosingPath(distance < (10 / zoomLevel));
            } else {
                setIsClosingPath(false);
            }
        }
    }, [isDraggingHandle, isActive, anchors, updateHandle, getCanvasPosition, zoomLevel]);

    const handleMouseUp = useCallback(() => {
        setIsDraggingHandle(false);
        setDraggedHandle(null);
    }, []);

    // Handle clicks on the canvas to add anchors
    const handleClick = useCallback((e) => {
        if (!isActive || isDraggingHandle) return;

        const pos = getCanvasPosition(e.clientX, e.clientY);
        for (const anchor of anchors) {
            const distance = Math.sqrt(
                Math.pow(pos.x - anchor.x, 2) +
                Math.pow(pos.y - anchor.y, 2)
            );
            if (distance < 8 / zoomLevel) {
                setSelectedAnchor(anchor.id);
                return; // Don't add a new anchor if selecting an existing one
            }
        }

        addAnchor(e);
    }, [isActive, isDraggingHandle, anchors, getCanvasPosition, addAnchor, zoomLevel]);

    // Keyboard shortcuts for completing or canceling the path
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (!isActive) return;

            if (e.key === 'Enter') {
                e.preventDefault();
                completePath(isClosingPath); // Complete path, closed if hovering start point
            } else if (e.key === 'Escape') {
                e.preventDefault();
                // Cancel drawing entirely
                setAnchors([]);
                setSelectedAnchor(null);
                setIsClosingPath(false);
                setPreviewPoint(null);
            } else if (e.key === 'Backspace' && anchors.length > 0) {
                e.preventDefault();
                setAnchors(prev => prev.slice(0, -1));
                setIsClosingPath(false); // Can't be closing after deleting a point
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isActive, anchors, completePath, isClosingPath]);

    // Add/remove main mouse event listeners
    useEffect(() => {
        if (!isActive) return;

        const canvas = canvasRef?.current;
        if (!canvas) return;

        canvas.addEventListener('click', handleClick);
        canvas.addEventListener('mousemove', handleMouseMove);
        canvas.addEventListener('mouseup', handleMouseUp);
        // Prevent context menu while drawing
        const preventContext = (e) => e.preventDefault();
        canvas.addEventListener('contextmenu', preventContext);


        return () => {
            canvas.removeEventListener('click', handleClick);
            canvas.removeEventListener('mousemove', handleMouseMove);
            canvas.removeEventListener('mouseup', handleMouseUp);
            canvas.removeEventListener('contextmenu', preventContext);
        };
    }, [isActive, canvasRef, handleClick, handleMouseMove, handleMouseUp]);

    if (!isActive) return null;

    return (
        <svg
            className="absolute inset-0 pointer-events-none"
            style={{ width: '100%', height: '100%' }}
        >
            {/* Render path and points */}
            {anchors.length > 0 && (
                <>
                    {/* The main path being drawn */}
                    <path
                        d={generatePath(isClosingPath)}
                        stroke={strokeColor}
                        strokeWidth={strokeWidth}
                        fill={isClosingPath ? fillColor : 'none'}
                        fillOpacity={0.5}
                        className="pointer-events-none"
                    />

                    {/* Preview line from last anchor to cursor */}
                    {previewPoint && anchors.length > 0 && !isClosingPath && (
                        <line
                            x1={anchors[anchors.length - 1].x}
                            y1={anchors[anchors.length - 1].y}
                            x2={previewPoint.x}
                            y2={previewPoint.y}
                            stroke={strokeColor}
                            strokeWidth={1}
                            strokeDasharray="5,5"
                            opacity={0.5}
                        />
                    )}

                    {/* Anchor points and control handles */}
                    {anchors.map((anchor, index) => (
                        <g key={anchor.id}>
                            {/* Control handles for selected anchor */}
                            {selectedAnchor === anchor.id && (
                                <>
                                    <line x1={anchor.handleIn.x} y1={anchor.handleIn.y} x2={anchor.x} y2={anchor.y} stroke="#007BFF" strokeWidth={1} />
                                    <line x1={anchor.x} y1={anchor.y} x2={anchor.handleOut.x} y2={anchor.handleOut.y} stroke="#007BFF" strokeWidth={1} />
                                    <circle cx={anchor.handleIn.x} cy={anchor.handleIn.y} r={4} fill="#fff" stroke="#007BFF" strokeWidth={1} className="cursor-pointer pointer-events-auto" onMouseDown={(e) => startDraggingHandle(e, anchor.id, 'in')} />
                                    <circle cx={anchor.handleOut.x} cy={anchor.handleOut.y} r={4} fill="#fff" stroke="#007BFF" strokeWidth={1} className="cursor-pointer pointer-events-auto" onMouseDown={(e) => startDraggingHandle(e, anchor.id, 'out')} />
                                </>
                            )}

                            {/* Anchor point itself */}
                            <rect
                                x={anchor.x - 4}
                                y={anchor.y - 4}
                                width={8}
                                height={8}
                                fill={selectedAnchor === anchor.id ? '#007BFF' : '#fff'}
                                stroke="#333"
                                strokeWidth={2}
                                className="cursor-pointer pointer-events-auto"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedAnchor(anchor.id);
                                }}
                            />

                            {/* Visual indicator on first anchor when path can be closed */}
                            {index === 0 && anchors.length > 2 && isClosingPath && (
                                <circle
                                    cx={anchor.x}
                                    cy={anchor.y}
                                    r={8}
                                    fill="none"
                                    stroke="#007BFF"
                                    strokeWidth={2}
                                    strokeDasharray="3,3"
                                />
                            )}
                        </g>
                    ))}
                </>
            )}
        </svg>
    );
};

export default VectorPenTool;
