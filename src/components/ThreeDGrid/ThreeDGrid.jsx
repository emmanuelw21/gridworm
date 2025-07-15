// components/ThreeDGrid/ThreeDGrid.jsx
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Box, Grid, Maximize, Eye, EyeOff, Lock, Unlock,
  Move, RotateCw, Square, Circle, Hexagon, Type,
  Pipette, PaintBucket, Plus, Minus, GitBranch,
  MousePointer, MousePointer2, Layers,
  Save, Download, Settings, Camera, Sun, Moon, Scaling
} from 'lucide-react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader';

import ThreeDViewer from './ThreeDViewer';
import ThreeDViewport from './ThreeDViewport';
import {
  is3D, get3DLoader, createGridHelper3D, snapToGrid3D,
  createEnvironment, createLightSetup, normalizeModel,
  disposeObject
} from './helpers3D';

const ThreeDGrid = ({
  mediaFiles,
  gridItems,
  setGridItems,
  selectedItems,
  onItemSelect,
  onPreviewMedia,
  gridConfig,
  darkMode
}) => {
  // State
  const [viewportMode, setViewportMode] = useState('single'); // 'single', 'quad', 'custom'
  const [activeViewport, setActiveViewport] = useState('perspective');
  const [transformMode, setTransformMode] = useState('translate'); // 'translate', 'rotate', 'scale'
  const [showGrid, setShowGrid] = useState(true);
  const [showAxes, setShowAxes] = useState(true);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [showWireframe, setShowWireframe] = useState(false);
  const [showShadows, setShowShadows] = useState(true);
  const [layers, setLayers] = useState([
    { id: 'default', name: 'Default Layer', visible: true, locked: false, opacity: 100 }
  ]);
  const [activeLayer, setActiveLayer] = useState('default');

  // Vector tools state
  const [activeTool, setActiveTool] = useState('select');
  const [strokeColor, setStrokeColor] = useState('#FF0000');
  const [fillColor, setFillColor] = useState('#FFFFFF');

  // Refs
  const containerRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRefs = useRef({
    perspective: null,
    top: null,
    front: null,
    side: null
  });
  const controlsRef = useRef(null);
  const transformControlsRef = useRef(null);
  const raycasterRef = useRef(new THREE.Raycaster());
  const mouseRef = useRef(new THREE.Vector2());
  const objectsRef = useRef({});

  // Initialize Three.js scene
  useEffect(() => {
    if (!containerRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Environment
    createEnvironment(scene, {
      showGrid,
      showAxes,
      backgroundColor: darkMode ? 0x1a1a1a : 0xf0f0f0,
      fog: true
    });

    // Lighting
    createLightSetup(scene);

    // Renderer
    const render = () => {
      renderer.render(scene, getActiveCamera());
    };
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true
    });
    renderer.shadowMap.enabled = showShadows;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    rendererRef.current = renderer;
    containerRef.current.appendChild(renderer.domElement);

    // Cameras
    const aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;

    // Perspective camera
    const perspectiveCamera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
    perspectiveCamera.position.set(20, 20, 20);
    perspectiveCamera.lookAt(0, 0, 0);
    cameraRefs.current.perspective = perspectiveCamera;

    // Orthographic cameras
    const frustumSize = 20;
    const topCamera = new THREE.OrthographicCamera(
      frustumSize * aspect / -2, frustumSize * aspect / 2,
      frustumSize / 2, frustumSize / -2,
      0.1, 1000
    );
    topCamera.position.set(0, 100, 0);
    topCamera.lookAt(0, 0, 0);
    cameraRefs.current.top = topCamera;

    const frontCamera = new THREE.OrthographicCamera(
      frustumSize * aspect / -2, frustumSize * aspect / 2,
      frustumSize / 2, frustumSize / -2,
      0.1, 1000
    );
    frontCamera.position.set(0, 0, 100);
    frontCamera.lookAt(0, 0, 0);
    cameraRefs.current.front = frontCamera;

    const sideCamera = new THREE.OrthographicCamera(
      frustumSize * aspect / -2, frustumSize * aspect / 2,
      frustumSize / 2, frustumSize / -2,
      0.1, 1000
    );
    sideCamera.position.set(100, 0, 0);
    sideCamera.lookAt(0, 0, 0);
    cameraRefs.current.side = sideCamera;

    // Controls
    const orbitControls = new OrbitControls(perspectiveCamera, renderer.domElement);
    orbitControls.enableDamping = true;
    orbitControls.dampingFactor = 0.05;
    orbitControls.screenSpacePanning = false;
    orbitControls.minDistance = 5;
    orbitControls.maxDistance = 100;
    controlsRef.current = orbitControls;

    // Transform controls
    const transformControls = new TransformControls(perspectiveCamera, renderer.domElement);
    transformControls.addEventListener('change', render);
    transformControls.addEventListener('dragging-changed', (event) => {
      orbitControls.enabled = !event.value;
    });
    scene.add(transformControls);
    transformControlsRef.current = transformControls;

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      orbitControls.update();
      render();
    };



    animate();

    // Load existing 3D items
    Object.entries(gridItems).forEach(([id, item]) => {
      const media = mediaFiles.find(m => m.id === item.mediaId);
      if (media && is3D(media.type)) {
        load3DModel(id, item, media);
      }
    });

    // Handle resize
    const handleResize = () => {
      if (!containerRef.current) return;

      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      const aspect = width / height;

      // Update perspective camera
      perspectiveCamera.aspect = aspect;
      perspectiveCamera.updateProjectionMatrix();

      // Update orthographic cameras
      const frustumSize = 20;
      cameraRefs.current.top.left = frustumSize * aspect / -2;
      cameraRefs.current.top.right = frustumSize * aspect / 2;
      cameraRefs.current.top.updateProjectionMatrix();

      cameraRefs.current.front.left = frustumSize * aspect / -2;
      cameraRefs.current.front.right = frustumSize * aspect / 2;
      cameraRefs.current.front.updateProjectionMatrix();

      cameraRefs.current.side.left = frustumSize * aspect / -2;
      cameraRefs.current.side.right = frustumSize * aspect / 2;
      cameraRefs.current.side.updateProjectionMatrix();

      renderer.setSize(width, height);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);

      // Cleanup
      Object.values(objectsRef.current).forEach(obj => {
        disposeObject(obj);
      });

      renderer.dispose();
      scene.clear();
      containerRef.current?.removeChild(renderer.domElement);
    };
  }, [darkMode, gridConfig, showGrid, showAxes, showShadows]);

  // Get active camera based on viewport
  const getActiveCamera = useCallback(() => {
    return cameraRefs.current[activeViewport] || cameraRefs.current.perspective;
  }, [activeViewport]);

  // Load 3D model
  const load3DModel = useCallback(async (itemId, item, media) => {
    const loader = get3DLoader(media.type);
    if (!loader) return;

    try {
      const result = await loader.loadAsync(media.url);
      const model = result.scene || result;

      // Normalize model size
      normalizeModel(model, 5);

      // Apply saved transform
      if (item.transform) {
        model.position.set(item.transform.x, item.transform.y, item.transform.z);
        model.rotation.set(item.transform.rx, item.transform.ry, item.transform.rz);
        model.scale.set(item.transform.sx, item.transform.sy, item.transform.sz);
      }

      // Enable shadows
      model.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;

          // Set wireframe if enabled
          if (showWireframe) {
            child.material.wireframe = true;
          }
        }
      });

      model.userData = {
        itemId,
        mediaId: item.mediaId,
        layerId: item.layerId || 'default'
      };

      // Remove old model if exists
      if (objectsRef.current[itemId]) {
        sceneRef.current.remove(objectsRef.current[itemId]);
        disposeObject(objectsRef.current[itemId]);
      }

      objectsRef.current[itemId] = model;
      sceneRef.current.add(model);

      // Select if it should be selected
      if (selectedItems.includes(itemId)) {
        transformControlsRef.current.attach(model);
      }
    } catch (error) {
      console.error('Error loading 3D model:', error);
    }
  }, [selectedItems, showWireframe]);

  // Handle transform changes
  const handleTransformChange = useCallback(() => {
    const object = transformControlsRef.current?.object;
    if (!object || !object.userData.itemId) return;

    const itemId = object.userData.itemId;
    const position = object.position.clone();
    const rotation = object.rotation.clone();
    const scale = object.scale.clone();

    // Apply grid snapping if enabled
    if (snapToGrid && transformMode === 'translate') {
      const snapped = snapToGrid3D(position, gridConfig.cellSize / 4);
      object.position.copy(snapped);
    }

    setGridItems(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        transform: {
          x: object.position.x,
          y: object.position.y,
          z: object.position.z,
          rx: object.rotation.x,
          ry: object.rotation.y,
          rz: object.rotation.z,
          sx: object.scale.x,
          sy: object.scale.y,
          sz: object.scale.z
        }
      }
    }));
  }, [transformMode, snapToGrid, gridConfig.cellSize, setGridItems]);

  // Update transform controls when mode changes
  useEffect(() => {
    if (transformControlsRef.current) {
      transformControlsRef.current.setMode(transformMode);
    }
  }, [transformMode]);

  // Update selected objects
  useEffect(() => {
    if (!transformControlsRef.current || !sceneRef.current) return;

    // Detach current
    transformControlsRef.current.detach();

    // Find and attach selected object
    if (selectedItems.length > 0) {
      const selectedId = selectedItems[selectedItems.length - 1]; // Last selected
      const object = objectsRef.current[selectedId];
      if (object) {
        transformControlsRef.current.attach(object);
      }
    }
  }, [selectedItems]);

  // Handle mouse events
  const handleMouseDown = useCallback((event) => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycasterRef.current.setFromCamera(mouseRef.current, getActiveCamera());
    const intersects = raycasterRef.current.intersectObjects(Object.values(objectsRef.current), true);

    if (intersects.length > 0) {
      let object = intersects[0].object;

      // Find the root object with userData
      while (object.parent && !object.userData.itemId) {
        object = object.parent;
      }

      if (object.userData.itemId) {
        onItemSelect(object.userData.itemId, event.shiftKey, event.ctrlKey || event.metaKey);
      }
    } else if (!event.shiftKey && !event.ctrlKey && !event.metaKey) {
      // Click on empty space - deselect
      onItemSelect(null);
    }
  }, [getActiveCamera, onItemSelect]);

  // Add model from media
  const addModelFromMedia = useCallback((media, position = { x: 0, y: 0, z: 0 }) => {
    if (!is3D(media.type)) return;

    const itemId = `model-${Date.now()}`;
    const newItem = {
      mediaId: media.id,
      x: position.x,
      y: position.y,
      z: position.z,
      width: gridConfig.cellWidth,
      height: gridConfig.cellHeight,
      rotation: 0,
      zIndex: Object.keys(gridItems).length + 1,
      layerId: activeLayer,
      transform: {
        x: position.x,
        y: position.y,
        z: position.z,
        rx: 0,
        ry: 0,
        rz: 0,
        sx: 1,
        sy: 1,
        sz: 1
      }
    };

    setGridItems(prev => ({
      ...prev,
      [itemId]: newItem
    }));

    // Load the model
    load3DModel(itemId, newItem, media);
  }, [gridConfig, gridItems, activeLayer, setGridItems, load3DModel]);

  // Viewport layout
  const getViewportLayout = () => {
    switch (viewportMode) {
      case 'quad':
        return [
          { id: 'top', type: 'top', position: { x: 0, y: 0, width: 0.5, height: 0.5 } },
          { id: 'front', type: 'front', position: { x: 0.5, y: 0, width: 0.5, height: 0.5 } },
          { id: 'side', type: 'side', position: { x: 0, y: 0.5, width: 0.5, height: 0.5 } },
          { id: 'perspective', type: 'perspective', position: { x: 0.5, y: 0.5, width: 0.5, height: 0.5 } }
        ];
      default:
        return [
          { id: activeViewport, type: activeViewport, position: { x: 0, y: 0, width: 1, height: 1 } }
        ];
    }
  };

  // Vector tools toolbar
  const VectorToolbar = () => (
    <div className="absolute left-0 top-16 bg-white dark:bg-gray-800 shadow-lg rounded-r p-2 space-y-1">
      <button
        onClick={() => setActiveTool('select')}
        className={`p-2 rounded ${activeTool === 'select' ? 'bg-blue-500 text-white' : 'hover:bg-gray-200'}`}
        title="Select (V)"
      >
        <MousePointer size={20} />
      </button>
      <button
        onClick={() => setActiveTool('move')}
        className={`p-2 rounded ${activeTool === 'move' ? 'bg-blue-500 text-white' : 'hover:bg-gray-200'}`}
        title="Move Tool"
      >
        <Move size={20} />
      </button>
      <button
        onClick={() => setActiveTool('rotate')}
        className={`p-2 rounded ${activeTool === 'rotate' ? 'bg-blue-500 text-white' : 'hover:bg-gray-200'}`}
        title="Rotate Tool"
      >
        <RotateCw size={20} />
      </button>
      <button
        onClick={() => setActiveTool('scale')}
        className={`p-2 rounded ${activeTool === 'scale' ? 'bg-blue-500 text-white' : 'hover:bg-gray-200'}`}
        title="Scale Tool"
      >
        <Scaling size={20} />
      </button>
    </div>
  );

  // Layer panel
  const LayerPanel = () => (
    <div className="absolute right-0 top-16 w-64 bg-white dark:bg-gray-800 shadow-lg rounded-l max-h-96 overflow-y-auto">
      <div className="p-2 border-b flex justify-between items-center">
        <h3 className="font-bold text-sm">Layers</h3>
        <div className="flex space-x-1">
          <button
            onClick={() => {
              const newLayer = {
                id: `layer-${Date.now()}`,
                name: `Layer ${layers.length + 1}`,
                visible: true,
                locked: false,
                opacity: 100
              };
              setLayers([...layers, newLayer]);
              setActiveLayer(newLayer.id);
            }}
            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
            title="New Layer"
          >
            <Plus size={16} />
          </button>
        </div>
      </div>
      <div className="p-2 space-y-1">
        {layers.map((layer) => (
          <div
            key={layer.id}
            className={`flex items-center space-x-2 p-2 rounded cursor-pointer
                        ${activeLayer === layer.id ? 'bg-blue-100 dark:bg-blue-900' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
            onClick={() => setActiveLayer(layer.id)}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                setLayers(layers.map(l =>
                  l.id === layer.id ? { ...l, visible: !l.visible } : l
                ));
              }}
              className="p-1"
            >
              {layer.visible ? <Eye size={16} /> : <EyeOff size={16} />}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setLayers(layers.map(l =>
                  l.id === layer.id ? { ...l, locked: !l.locked } : l
                ));
              }}
              className="p-1"
            >
              {layer.locked ? <Lock size={16} /> : <Unlock size={16} />}
            </button>
            <span className="flex-1 text-sm">{layer.name}</span>
            <input
              type="range"
              min="0"
              max="100"
              value={layer.opacity}
              onChange={(e) => {
                e.stopPropagation();
                setLayers(layers.map(l =>
                  l.id === layer.id ? { ...l, opacity: parseInt(e.target.value) } : l
                ));
              }}
              className="w-16"
              onClick={(e) => e.stopPropagation()}
            />
            <span className="text-xs w-8">{layer.opacity}%</span>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="relative w-full h-full bg-gray-100 dark:bg-gray-900" ref={containerRef}>
      {/* Toolbar */}
      <div className="absolute top-0 left-0 right-0 h-16 bg-white dark:bg-gray-800 shadow-md z-10 flex items-center justify-between px-4">
        <div className="flex items-center space-x-4">
          {/* Transform controls */}
          <div className="flex items-center space-x-1 border-r pr-4">
            <button
              onClick={() => { setTransformMode('translate'); setActiveTool('move'); }}
              className={`p-2 rounded ${transformMode === 'translate' ? 'bg-blue-500 text-white' : 'hover:bg-gray-200'}`}
              title="Move (W)"
            >
              <Move size={20} />
            </button>
            <button
              onClick={() => { setTransformMode('rotate'); setActiveTool('rotate'); }}
              className={`p-2 rounded ${transformMode === 'rotate' ? 'bg-blue-500 text-white' : 'hover:bg-gray-200'}`}
              title="Rotate (E)"
            >
              <RotateCw size={20} />
            </button>
            <button
              onClick={() => { setTransformMode('scale'); setActiveTool('scale'); }}
              className={`p-2 rounded ${transformMode === 'scale' ? 'bg-blue-500 text-white' : 'hover:bg-gray-200'}`}
              title="Scale (R)"
            >
              <Scaling size={20} />
            </button>
          </div>

          {/* View options */}
          <div className="flex items-center space-x-1">
            <button
              onClick={() => setShowGrid(!showGrid)}
              className={`p-2 rounded ${showGrid ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-200'}`}
              title="Toggle Grid"
            >
              <Grid size={20} />
            </button>
            <button
              onClick={() => setSnapToGrid(!snapToGrid)}
              className={`p-2 rounded ${snapToGrid ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-200'}`}
              title="Snap to Grid"
            >
              <Grid size={20} className="opacity-60" />
            </button>
            <button
              onClick={() => setShowWireframe(!showWireframe)}
              className={`p-2 rounded ${showWireframe ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-200'}`}
              title="Wireframe Mode"
            >
              <Box size={20} />
            </button>
            <button
              onClick={() => setShowShadows(!showShadows)}
              className={`p-2 rounded ${showShadows ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-200'}`}
              title="Toggle Shadows"
            >
              {showShadows ? <Sun size={20} /> : <Moon size={20} />}
            </button>
          </div>
        </div>

        {/* Viewport controls */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setViewportMode(viewportMode === 'single' ? 'quad' : 'single')}
            className="px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300"
          >
            <Maximize size={16} className="inline mr-1" />
            {viewportMode === 'single' ? 'Quad View' : 'Single View'}
          </button>
          {viewportMode === 'single' && (
            <select
              value={activeViewport}
              onChange={(e) => setActiveViewport(e.target.value)}
              className="px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded"
            >
              <option value="perspective">Perspective</option>
              <option value="top">Top</option>
              <option value="front">Front</option>
              <option value="side">Side</option>
            </select>
          )}
        </div>
      </div>

      {/* Vector tools */}
      <VectorToolbar />

      {/* Layers panel */}
      <LayerPanel />

      {/* Mouse event handler overlay */}
      <div
        className="absolute inset-0 top-16"
        onMouseDown={handleMouseDown}
        style={{ pointerEvents: transformControlsRef.current?.dragging ? 'none' : 'auto' }}
      />

      {/* Status bar */}
      <div className="absolute bottom-0 left-0 right-0 h-6 bg-white dark:bg-gray-800 border-t border-gray-300 dark:border-gray-600 flex items-center px-2 text-xs">
        <span className="mr-4">Objects: {Object.keys(objectsRef.current).length}</span>
        <span className="mr-4">Selected: {selectedItems.length}</span>
        <span className="mr-4">Active Layer: {layers.find(l => l.id === activeLayer)?.name || 'None'}</span>
        <span className="mr-4">Transform: {transformMode}</span>
      </div>
    </div>
  );
};

export default ThreeDGrid;