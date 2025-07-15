// components/ThreeDViewport/GridPlacementDialog.jsx
import React, { useState, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { X, Grid, Layers, ArrowUp, ArrowRight, Eye, EyeOff } from 'lucide-react';

const GridPlacementDialog = ({ 
  gridItems, 
  gridConfig,
  onConfirm, 
  onCancel,
  darkMode 
}) => {
  const [orientation, setOrientation] = useState('horizontal'); // 'horizontal' or 'vertical'
  const [faceDirection, setFaceDirection] = useState('forward'); // 'forward', 'backward', 'up', 'down', 'left', 'right'
  const [spacing, setSpacing] = useState(3);
  const [columns, setColumns] = useState(4);
  const [showPreview, setShowPreview] = useState(true);
  
  const previewRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const frameRef = useRef(null);
  
  // Initialize preview scene
  useEffect(() => {
    if (!previewRef.current) return;
    
    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(darkMode ? 0x1a1a1a : 0xf0f0f0);
    sceneRef.current = scene;
    
    // Camera
    const camera = new THREE.PerspectiveCamera(
      50,
      previewRef.current.clientWidth / previewRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(10, 10, 10);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;
    
    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(previewRef.current.clientWidth, previewRef.current.clientHeight);
    renderer.setClearColor(0x000000, 0);
    previewRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;
    
    // Add grid helper
    const gridHelper = new THREE.GridHelper(20, 20, 0x444444, 0x222222);
    scene.add(gridHelper);
    
    // Add axes
    const axesHelper = new THREE.AxesHelper(5);
    scene.add(axesHelper);
    
    // Lighting
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.4);
    dirLight.position.set(5, 5, 5);
    scene.add(dirLight);
    
    return () => {
      if (previewRef.current && renderer.domElement) {
        previewRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [darkMode]);
  
  // Update preview
  useEffect(() => {
    if (!sceneRef.current || !showPreview) return;
    
    // Clear existing preview objects
    const objectsToRemove = [];
    sceneRef.current.traverse((child) => {
      if (child.userData.isPreview) {
        objectsToRemove.push(child);
      }
    });
    objectsToRemove.forEach(obj => sceneRef.current.remove(obj));
    
    // Create wireframe previews
    const validItems = gridItems.filter(item => item !== null);
    const itemCount = validItems.length;
    
    if (itemCount === 0) return;
    
    // Calculate layout
    const actualColumns = Math.min(columns, itemCount);
    const rows = Math.ceil(itemCount / actualColumns);
    
    // Create preview group
    const previewGroup = new THREE.Group();
    previewGroup.userData.isPreview = true;
    
    // Add wireframe boxes for each item
    validItems.forEach((item, index) => {
      const col = index % actualColumns;
      const row = Math.floor(index / actualColumns);
      
      // Create wireframe box
      const geometry = new THREE.BoxGeometry(2, 1.5, 0.1);
      const edges = new THREE.EdgesGeometry(geometry);
      const lineMaterial = new THREE.LineBasicMaterial({ 
        color: 0x00ff00,
        linewidth: 2
      });
      const wireframe = new THREE.LineSegments(edges, lineMaterial);
      
      // Position based on orientation and layout
      if (orientation === 'horizontal') {
        wireframe.position.x = (col - actualColumns/2 + 0.5) * spacing;
        wireframe.position.z = (row - rows/2 + 0.5) * spacing;
        wireframe.position.y = 0;
        
        // Apply face direction rotation
        switch (faceDirection) {
          case 'backward':
            wireframe.rotation.y = Math.PI;
            break;
          case 'left':
            wireframe.rotation.y = Math.PI / 2;
            break;
          case 'right':
            wireframe.rotation.y = -Math.PI / 2;
            break;
          case 'up':
            wireframe.rotation.x = -Math.PI / 2;
            break;
          case 'down':
            wireframe.rotation.x = Math.PI / 2;
            break;
        }
      } else { // vertical
        wireframe.position.x = (col - actualColumns/2 + 0.5) * spacing;
        wireframe.position.y = (row + 0.5) * spacing;
        wireframe.position.z = 0;
        
        // Apply face direction for vertical
        switch (faceDirection) {
          case 'backward':
            wireframe.rotation.y = Math.PI;
            break;
          case 'left':
            wireframe.rotation.y = Math.PI / 2;
            break;
          case 'right':
            wireframe.rotation.y = -Math.PI / 2;
            break;
        }
      }
      
      wireframe.userData.isPreview = true;
      previewGroup.add(wireframe);
    });
    
    // Add direction arrow
    const arrowGeometry = new THREE.ConeGeometry(0.5, 2, 4);
    const arrowMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const arrow = new THREE.Mesh(arrowGeometry, arrowMaterial);
    arrow.userData.isPreview = true;
    
    // Position arrow to show face direction
    const centerX = 0;
    const centerY = orientation === 'horizontal' ? 0 : (rows * spacing) / 2;
    const centerZ = 0;
    
    arrow.position.set(centerX, centerY, centerZ);
    
    // Rotate arrow based on face direction
    switch (faceDirection) {
      case 'forward':
        arrow.position.z = -5;
        arrow.rotation.x = Math.PI / 2;
        break;
      case 'backward':
        arrow.position.z = 5;
        arrow.rotation.x = -Math.PI / 2;
        break;
      case 'up':
        arrow.position.y = centerY + 5;
        break;
      case 'down':
        arrow.position.y = centerY - 5;
        arrow.rotation.z = Math.PI;
        break;
      case 'left':
        arrow.position.x = -5;
        arrow.rotation.z = Math.PI / 2;
        break;
      case 'right':
        arrow.position.x = 5;
        arrow.rotation.z = -Math.PI / 2;
        break;
    }
    
    previewGroup.add(arrow);
    sceneRef.current.add(previewGroup);
    
    // Animate
    const animate = () => {
      frameRef.current = requestAnimationFrame(animate);
      
      previewGroup.rotation.y += 0.005;
      
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };
    
    animate();
    
    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [gridItems, orientation, faceDirection, spacing, columns, showPreview]);
  
  const handleConfirm = () => {
    onConfirm({
      orientation,
      faceDirection,
      spacing,
      columns
    });
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Import Grid to 3D Viewport
          </h3>
          <button
            onClick={onCancel}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X size={20} />
          </button>
        </div>
        
        {/* Content */}
        <div className="flex h-[500px]">
          {/* Controls */}
          <div className="w-1/2 p-6 space-y-4 overflow-y-auto">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                {gridItems.filter(item => item !== null).length} items will be imported
              </p>
            </div>
            
            {/* Orientation */}
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                Orientation
              </label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="horizontal"
                    checked={orientation === 'horizontal'}
                    onChange={(e) => setOrientation(e.target.value)}
                    className="mr-2"
                  />
                  <Grid size={16} className="mr-2" />
                  Horizontal (Ground layout)
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="vertical"
                    checked={orientation === 'vertical'}
                    onChange={(e) => setOrientation(e.target.value)}
                    className="mr-2"
                  />
                  <Layers size={16} className="mr-2" />
                  Vertical (Wall layout)
                </label>
              </div>
            </div>
            
            {/* Face Direction */}
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                Face Direction
              </label>
              <select
                value={faceDirection}
                onChange={(e) => setFaceDirection(e.target.value)}
                className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
              >
                <option value="forward">Forward (Towards camera)</option>
                <option value="backward">Backward (Away from camera)</option>
                {orientation === 'horizontal' && (
                  <>
                    <option value="up">Upward (Facing sky)</option>
                    <option value="down">Downward (Facing ground)</option>
                  </>
                )}
                <option value="left">Left</option>
                <option value="right">Right</option>
              </select>
            </div>
            
            {/* Spacing */}
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                Spacing: {spacing} units
              </label>
              <input
                type="range"
                min="1"
                max="10"
                step="0.5"
                value={spacing}
                onChange={(e) => setSpacing(parseFloat(e.target.value))}
                className="w-full"
              />
            </div>
            
            {/* Columns */}
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                Columns: {columns}
              </label>
              <input
                type="range"
                min="1"
                max="10"
                value={columns}
                onChange={(e) => setColumns(parseInt(e.target.value))}
                className="w-full"
              />
            </div>
            
            {/* Actions */}
            <div className="flex justify-end space-x-2 pt-4">
              <button
                onClick={onCancel}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Import to Viewport
              </button>
            </div>
          </div>
          
          {/* Preview */}
          <div className="w-1/2 bg-gray-100 dark:bg-gray-900 relative">
            <div className="absolute top-4 right-4 z-10">
              <button
                onClick={() => setShowPreview(!showPreview)}
                className="p-2 bg-white dark:bg-gray-800 rounded shadow hover:bg-gray-50 dark:hover:bg-gray-700"
                title={showPreview ? "Hide preview" : "Show preview"}
              >
                {showPreview ? <Eye size={16} /> : <EyeOff size={16} />}
              </button>
            </div>
            
            {showPreview ? (
              <div ref={previewRef} className="w-full h-full" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <EyeOff size={48} className="mx-auto mb-2" />
                  <p>Preview disabled</p>
                </div>
              </div>
            )}
            
            <div className="absolute bottom-4 left-4 bg-white dark:bg-gray-800 rounded p-2 text-xs">
              <p className="text-gray-600 dark:text-gray-400">
                <ArrowUp size={12} className="inline mr-1" />
                Red arrow shows face direction
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GridPlacementDialog;