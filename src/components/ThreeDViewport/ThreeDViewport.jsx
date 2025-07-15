// components/ThreeDViewport/ThreeDViewport.jsx
import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader';
import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader';
import LookAtTool from './LookAtTool.jsx';
import TransformPanel from './TransformPanel.jsx';
import ThumbnailGenerator from './ThumbnailGenerator.jsx';
import ResourceMonitor from '../ResourceMonitor.jsx';
import { disposeThreeObject, ListenerManager } from './utils/performanceUtils';

import {
  Trash2, Move, RotateCw, Maximize2, Upload, Grid, Box, Eye, EyeOff,
  HelpCircle, Lock, Unlock, AlignHorizontalJustifyCenter, AlignVerticalJustifyCenter,
  AlignHorizontalDistributeCenter, AlignVerticalDistributeCenter, ChevronDown, ChevronRight,
  Lightbulb, Layers, FolderOpen, Folder, Plus, MoreVertical, Group as GroupIcon, X,
  AlignHorizontalJustifyStart, AlignHorizontalJustifyEnd, AlignVerticalJustifyStart,
  AlignVerticalJustifyEnd, MousePointer, ZoomIn, ZoomOut, Maximize, Square,
  RectangleHorizontal, RectangleVertical, Shuffle, Settings, Minimize2, Camera,
  RotateCcw, FlipHorizontal, FlipVertical, Image as ImageIcon, MousePointer2Icon,
  Play, Pause, Zap, ZapOff, Activity
} from 'lucide-react';
import AutoArrangePanel from '../FreeGrid/AutoArrangePanel.jsx';
import GridPlacementDialog from './GridPlacementDialog.jsx';

// Constants for performance
const MAX_CONCURRENT_VIDEOS = 5;
const MAX_TEXTURE_SIZE = 2048;
const CLEANUP_INTERVAL = 60000; // 1 minute
const MEMORY_WARNING_THRESHOLD = 0.8;
const FPS_WARNING_THRESHOLD = 30;

// Custom Transform Gizmo Classes
class TranslateGizmo extends THREE.Object3D {
  constructor() {
    super();
    this.name = 'TranslateGizmo';
    this.isTransformGizmo = true;

    const arrowLength = 1.5;
    const arrowThickness = 0.02;
    const coneHeight = 0.3;
    const coneRadius = 0.08;

    // Materials with hover states
    this.materials = {
      x: new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0.8 }),
      y: new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0.8 }),
      z: new THREE.MeshBasicMaterial({ color: 0x0000ff, transparent: true, opacity: 0.8 }),
      xHover: new THREE.MeshBasicMaterial({ color: 0xff5555, transparent: true, opacity: 1 }),
      yHover: new THREE.MeshBasicMaterial({ color: 0x55ff55, transparent: true, opacity: 1 }),
      zHover: new THREE.MeshBasicMaterial({ color: 0x5555ff, transparent: true, opacity: 1 })
    };

    // X Axis
    const xGroup = new THREE.Group();
    xGroup.name = 'x-axis';
    const xGeometry = new THREE.CylinderGeometry(arrowThickness, arrowThickness, arrowLength);
    const xAxis = new THREE.Mesh(xGeometry, this.materials.x);
    xAxis.rotation.z = Math.PI / 2;
    xAxis.position.x = arrowLength / 2;
    xAxis.userData.axis = 'x';
    xGroup.add(xAxis);

    const xConeGeometry = new THREE.ConeGeometry(coneRadius, coneHeight);
    const xCone = new THREE.Mesh(xConeGeometry, this.materials.x);
    xCone.position.x = arrowLength;
    xCone.rotation.z = -Math.PI / 2;
    xCone.userData.axis = 'x';
    xGroup.add(xCone);
    this.add(xGroup);

    // Y Axis
    const yGroup = new THREE.Group();
    yGroup.name = 'y-axis';
    const yGeometry = new THREE.CylinderGeometry(arrowThickness, arrowThickness, arrowLength);
    const yAxis = new THREE.Mesh(yGeometry, this.materials.y);
    yAxis.position.y = arrowLength / 2;
    yAxis.userData.axis = 'y';
    yGroup.add(yAxis);

    const yConeGeometry = new THREE.ConeGeometry(coneRadius, coneHeight);
    const yCone = new THREE.Mesh(yConeGeometry, this.materials.y);
    yCone.position.y = arrowLength;
    yCone.userData.axis = 'y';
    yGroup.add(yCone);
    this.add(yGroup);

    // Z Axis
    const zGroup = new THREE.Group();
    zGroup.name = 'z-axis';
    const zGeometry = new THREE.CylinderGeometry(arrowThickness, arrowThickness, arrowLength);
    const zAxis = new THREE.Mesh(zGeometry, this.materials.z);
    zAxis.rotation.x = Math.PI / 2;
    zAxis.position.z = arrowLength / 2;
    zAxis.userData.axis = 'z';
    zGroup.add(zAxis);

    const zConeGeometry = new THREE.ConeGeometry(coneRadius, coneHeight);
    const zCone = new THREE.Mesh(zConeGeometry, this.materials.z);
    zCone.position.z = arrowLength;
    zCone.rotation.x = Math.PI / 2;
    zCone.userData.axis = 'z';
    zGroup.add(zCone);
    this.add(zGroup);

    // Center sphere
    const centerGeometry = new THREE.SphereGeometry(0.08);
    const centerMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, opacity: 0.8, transparent: true });
    const center = new THREE.Mesh(centerGeometry, centerMaterial);
    center.userData.axis = 'xyz';
    this.add(center);

    // Store references
    this.axes = { x: xGroup, y: yGroup, z: zGroup };
  }

  setHover(axis) {
    Object.keys(this.axes).forEach(key => {
      const group = this.axes[key];
      group.children.forEach(child => {
        if (child.material) {
          child.material = axis === key ? this.materials[`${key}Hover`] : this.materials[key];
        }
      });
    });
  }

  clearHover() {
    Object.keys(this.axes).forEach(key => {
      const group = this.axes[key];
      group.children.forEach(child => {
        if (child.material) {
          child.material = this.materials[key];
        }
      });
    });
  }

  dispose() {
    // Dispose all materials
    Object.values(this.materials).forEach(mat => mat.dispose());

    // Dispose all geometries
    this.traverse((child) => {
      if (child.geometry) child.geometry.dispose();
    });
  }
}

class RotateGizmo extends THREE.Object3D {
  constructor() {
    super();
    this.name = 'RotateGizmo';
    this.isTransformGizmo = true;

    const radius = 1.2;
    const tubeRadius = 0.02;
    const segments = 64;

    // Materials
    this.materials = {
      x: new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0.8 }),
      y: new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0.8 }),
      z: new THREE.MeshBasicMaterial({ color: 0x0000ff, transparent: true, opacity: 0.8 }),
      xHover: new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 1, emissive: 0xff0000, emissiveIntensity: 0.5 }),
      yHover: new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 1, emissive: 0x00ff00, emissiveIntensity: 0.5 }),
      zHover: new THREE.MeshBasicMaterial({ color: 0x0000ff, transparent: true, opacity: 1, emissive: 0x0000ff, emissiveIntensity: 0.5 })
    };

    // X Ring (YZ plane)
    const xGeometry = new THREE.TorusGeometry(radius, tubeRadius, 8, segments);
    const xRing = new THREE.Mesh(xGeometry, this.materials.x);
    xRing.rotation.y = Math.PI / 2;
    xRing.userData.axis = 'x';
    this.add(xRing);

    // Y Ring (XZ plane)
    const yGeometry = new THREE.TorusGeometry(radius, tubeRadius, 8, segments);
    const yRing = new THREE.Mesh(yGeometry, this.materials.y);
    yRing.rotation.x = Math.PI / 2;
    yRing.userData.axis = 'y';
    this.add(yRing);

    // Z Ring (XY plane)
    const zGeometry = new THREE.TorusGeometry(radius, tubeRadius, 8, segments);
    const zRing = new THREE.Mesh(zGeometry, this.materials.z);
    zRing.userData.axis = 'z';
    this.add(zRing);

    // Store references
    this.rings = { x: xRing, y: yRing, z: zRing };
  }

  setHover(axis) {
    Object.keys(this.rings).forEach(key => {
      const ring = this.rings[key];
      ring.material = axis === key ? this.materials[`${key}Hover`] : this.materials[key];
    });
  }

  clearHover() {
    Object.keys(this.rings).forEach(key => {
      const ring = this.rings[key];
      ring.material = this.materials[key];
    });
  }

  dispose() {
    Object.values(this.materials).forEach(mat => mat.dispose());
    this.traverse((child) => {
      if (child.geometry) child.geometry.dispose();
    });
  }
}

class ScaleGizmo extends THREE.Object3D {
  constructor() {
    super();
    this.name = 'ScaleGizmo';
    this.isTransformGizmo = true;

    const lineLength = 1.2;
    const boxSize = 0.12;
    const lineThickness = 0.02;

    // Materials
    this.materials = {
      x: new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0.8 }),
      y: new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0.8 }),
      z: new THREE.MeshBasicMaterial({ color: 0x0000ff, transparent: true, opacity: 0.8 }),
      xyz: new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 }),
      xHover: new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 1, emissive: 0xff0000, emissiveIntensity: 0.5 }),
      yHover: new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 1, emissive: 0x00ff00, emissiveIntensity: 0.5 }),
      zHover: new THREE.MeshBasicMaterial({ color: 0x0000ff, transparent: true, opacity: 1, emissive: 0x0000ff, emissiveIntensity: 0.5 }),
      xyzHover: new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 1, emissive: 0xffffff, emissiveIntensity: 0.3 })
    };

    // X Axis
    const xGroup = new THREE.Group();
    xGroup.name = 'x-axis';
    const xLineGeometry = new THREE.CylinderGeometry(lineThickness, lineThickness, lineLength);
    const xLine = new THREE.Mesh(xLineGeometry, this.materials.x);
    xLine.rotation.z = Math.PI / 2;
    xLine.position.x = lineLength / 2;
    xLine.userData.axis = 'x';
    xGroup.add(xLine);

    const xBoxGeometry = new THREE.BoxGeometry(boxSize, boxSize, boxSize);
    const xBox = new THREE.Mesh(xBoxGeometry, this.materials.x);
    xBox.position.x = lineLength;
    xBox.userData.axis = 'x';
    xGroup.add(xBox);
    this.add(xGroup);

    // Y Axis
    const yGroup = new THREE.Group();
    yGroup.name = 'y-axis';
    const yLineGeometry = new THREE.CylinderGeometry(lineThickness, lineThickness, lineLength);
    const yLine = new THREE.Mesh(yLineGeometry, this.materials.y);
    yLine.position.y = lineLength / 2;
    yLine.userData.axis = 'y';
    yGroup.add(yLine);

    const yBoxGeometry = new THREE.BoxGeometry(boxSize, boxSize, boxSize);
    const yBox = new THREE.Mesh(yBoxGeometry, this.materials.y);
    yBox.position.y = lineLength;
    yBox.userData.axis = 'y';
    yGroup.add(yBox);
    this.add(yGroup);

    // Z Axis
    const zGroup = new THREE.Group();
    zGroup.name = 'z-axis';
    const zLineGeometry = new THREE.CylinderGeometry(lineThickness, lineThickness, lineLength);
    const zLine = new THREE.Mesh(zLineGeometry, this.materials.z);
    zLine.rotation.x = Math.PI / 2;
    zLine.position.z = lineLength / 2;
    zLine.userData.axis = 'z';
    zGroup.add(zLine);

    const zBoxGeometry = new THREE.BoxGeometry(boxSize, boxSize, boxSize);
    const zBox = new THREE.Mesh(zBoxGeometry, this.materials.z);
    zBox.position.z = lineLength;
    zBox.userData.axis = 'z';
    zGroup.add(zBox);
    this.add(zGroup);

    // Center cube for uniform scale
    const centerGeometry = new THREE.BoxGeometry(boxSize * 1.2, boxSize * 1.2, boxSize * 1.2);
    const center = new THREE.Mesh(centerGeometry, this.materials.xyz);
    center.userData.axis = 'xyz';
    this.add(center);

    // Store references
    this.axes = { x: xGroup, y: yGroup, z: zGroup };
    this.center = center;
  }

  setHover(axis) {
    Object.keys(this.axes).forEach(key => {
      const group = this.axes[key];
      group.children.forEach(child => {
        if (child.material) {
          child.material = axis === key ? this.materials[`${key}Hover`] : this.materials[key];
        }
      });
    });

    if (this.center) {
      this.center.material = axis === 'xyz' ? this.materials.xyzHover : this.materials.xyz;
    }
  }

  clearHover() {
    Object.keys(this.axes).forEach(key => {
      const group = this.axes[key];
      group.children.forEach(child => {
        if (child.material) {
          child.material = this.materials[key];
        }
      });
    });

    if (this.center) {
      this.center.material = this.materials.xyz;
    }
  }

  dispose() {
    Object.values(this.materials).forEach(mat => mat.dispose());
    this.traverse((child) => {
      if (child.geometry) child.geometry.dispose();
    });
  }
}

const ThreeDViewport = ({
  darkMode,
  gridSlots = [],
  freeGridItems = {}, mediaFiles = [],
  gridConfig = { columns: 4, rows: 5, cellWidth: 160, cellHeight: 120 },
  bookMode = false,
  onBookModeToggle,
  pageMapping,
  onPageMappingConfirm,
  bookPages = [],
  currentBookPage = 0,
  onBookPageChange,
  bookVolumeMetadata,
  onMediaMissing
}) => {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const orbitControlsRef = useRef(null);
  const transformControlsRef = useRef(null);
  const customGizmoRef = useRef(null);
  const raycasterRef = useRef(null);
  const mouseRef = useRef(new THREE.Vector2());
  const selectedObjectsRef = useRef([]);
  const mediaObjectsRef = useRef(new Map());
  const lightsRef = useRef([]);
  const groupsRef = useRef(new Map());
  const isDraggingGizmo = useRef(false);
  const currentGizmoAxis = useRef(null);
  const dragStartPoint = useRef(new THREE.Vector3());
  const dragStartRotation = useRef(new THREE.Euler());
  const dragStartScale = useRef(new THREE.Vector3());
  const dragStartPositions = useRef([]);
  const dragStartRotations = useRef([]);
  const dragStartScales = useRef([]);
  const dragStartMouse = useRef({ x: 0, y: 0 });
  const dragStartAngle = useRef(0);
  const gizmosRef = useRef({ translate: null, rotate: null, scale: null });
  const currentTransformModeRef = useRef('translate');
  const currentTransformSpaceRef = useRef('global');
  const [showLookAtTool, setShowLookAtTool] = useState(false);
  const [showThumbnailGenerator, setShowThumbnailGenerator] = useState(false);
  const [thumbnailGeneratorObject, setThumbnailGeneratorObject] = useState(null);
  const [showPageMappingDialog, setShowPageMappingDialog] = useState(false);


  // Performance management refs
  const videoElementsRef = useRef(new Map());
  const videoTexturesRef = useRef(new Map());
  const activeVideosRef = useRef(new Set());
  const animationFrameRef = useRef(null);
  const cleanupTimeoutRef = useRef(null);
  const listenerManager = useRef(new ListenerManager());
  const disposalQueue = useRef([]);

  // Performance state
  const [performanceMode, setPerformanceMode] = useState(false);
  const [showResourceMonitor, setShowResourceMonitor] = useState(true);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [viewportWidth, setViewportWidth] = useState(window.innerWidth);

  // Persistent scene data ref
  const persistentSceneData = useRef({
    objects: new Map(),
    lights: [],
    groups: new Map(),
    annotations: []
  });

  const [objects, setObjects] = useState([]);
  const [selectedObjects, setSelectedObjects] = useState([]);
  const [showGrid, setShowGrid] = useState(true);
  const [showAxes, setShowAxes] = useState(true);
  const [transformMode, setTransformMode] = useState('translate');
  const [transformSpace, setTransformSpace] = useState('global'); // 'global' or 'local'
  const [showHelp, setShowHelp] = useState(false);
  const [showLightingPanel, setShowLightingPanel] = useState(false);
  const [showLayersPanel, setShowLayersPanel] = useState(false);
  const [groups, setGroups] = useState([]);
  const [expandedGroups, setExpandedGroups] = useState(new Set());
  const [contextMenu, setContextMenu] = useState(null);
  const [showAutoArrange, setShowAutoArrange] = useState(false);
  const [previewMode, setPreviewMode] = useState('off');
  const [showImportOptions, setShowImportOptions] = useState(false);
  const [showGridPlacementDialog, setShowGridPlacementDialog] = useState(false);
  const [pendingGridImport, setPendingGridImport] = useState(null);
  const [importConfig, setImportConfig] = useState({
    orientation: 'horizontal',
    faceDirection: 'forward',
    spacing: 3,
    columns: 4
  });

  const [autoArrangeConfig, setAutoArrangeConfig] = useState({
    direction: 'horizontal',
    padding: 1,
    maxWidth: 20,
    maxHeight: 20
  });

  const [transformValues, setTransformValues] = useState({
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 }
  });

  const [axisLocks, setAxisLocks] = useState({
    position: { x: false, y: false, z: false },
    rotation: { x: false, y: false, z: false },
    scale: { x: false, y: false, z: false }
  });
  
  const [isTransformPanelDocked, setIsTransformPanelDocked] = useState(true);

  const [lights, setLights] = useState([
    { id: 'ambient', type: 'ambient', intensity: 0.6, color: '#ffffff', enabled: true },
    {
      id: 'directional', type: 'directional', intensity: 0.8, color: '#ffffff',
      position: { x: 10, y: 10, z: 5 }, enabled: true
    }
  ]);

  // Enhanced video cleanup
  const cleanupVideo = useCallback((mediaId) => {
    console.log(`Cleaning up video: ${mediaId}`);

    const video = videoElementsRef.current.get(mediaId);
    if (video) {
      video.pause();
      video.removeAttribute('src');
      video.load();
      videoElementsRef.current.delete(mediaId);
      activeVideosRef.current.delete(mediaId);
    }

    const texture = videoTexturesRef.current.get(mediaId);
    if (texture) {
      texture.dispose();
      videoTexturesRef.current.delete(mediaId);
    }
  }, []);

  // Force cleanup function
  const forceCleanup = useCallback(() => {
    console.log('Executing force cleanup...');

    // Cleanup all videos
    videoElementsRef.current.forEach((video, id) => {
      cleanupVideo(id);
    });

    // Clear disposal queue
    disposalQueue.current.forEach(item => {
      if (item && item.dispose) {
        item.dispose();
      }
    });
    disposalQueue.current = [];

    // Force renderer cleanup
    if (rendererRef.current) {
      rendererRef.current.renderLists.dispose();
    }

    // Force garbage collection hint
    if (window.gc) {
      window.gc();
    }

    console.log('Force cleanup completed');
  }, [cleanupVideo]);

  // Close more menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      const moreMenuEl = e.target.closest('[data-more-menu]');
      const moreButtonEl = e.target.closest('[data-more-button]');
      if (showMoreMenu && !moreMenuEl && !moreButtonEl) {
        setShowMoreMenu(false);
      }
    };
    
    if (showMoreMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showMoreMenu]);
  
  // Track viewport width changes
  useEffect(() => {
    const handleResize = () => {
      setViewportWidth(window.innerWidth);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Periodic cleanup
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      if (rendererRef.current) {
        rendererRef.current.renderLists.dispose();

        // Process disposal queue
        const toDispose = disposalQueue.current.splice(0, 10);
        toDispose.forEach(item => {
          if (item && item.dispose) {
            item.dispose();
          }
        });

        console.log('Periodic cleanup executed');
      }
    }, CLEANUP_INTERVAL);

    return () => clearInterval(cleanupInterval);
  }, []);

  // Enhanced keyboard shortcuts
  const keyboardShortcuts = useMemo(() => ({
    'w': () => {
      console.log('🔘 TRANSFORM MODE: translate');
      setTransformMode('translate');
    },
    'e': () => {
      console.log('🔘 TRANSFORM MODE: rotate');
      setTransformMode('rotate');
    },
    'r': () => {
      console.log('🔘 TRANSFORM MODE: scale');
      setTransformMode('scale');
    },
    'x': () => {
      const newSpace = transformSpace === 'global' ? 'local' : 'global';
      console.log('🌐 TRANSFORM SPACE:', newSpace);
      setTransformSpace(newSpace);
    },
    'f': () => {
      if (selectedObjectsRef.current.length > 0) {
        if (selectedObjectsRef.current.length === 1) {
          frameObject(selectedObjectsRef.current[0]);
        } else {
          frameAllSelected();
        }
      }
    },
    'a': () => frameAllObjects(),
    'g': () => setShowGrid(prev => !prev),
    'h': () => setShowHelp(prev => !prev),
    'l': () => setShowLightingPanel(prev => !prev),
    't': () => {
      if (selectedObjects.length === 1) {
        handleOpenThumbnailGenerator(selectedObjects[0].id);
      }
    },
    'p': () => setPerformanceMode(prev => !prev),
    'm': () => setShowResourceMonitor(prev => !prev),
    'Delete': () => deleteSelectedObjects(),
    'Escape': () => {
      clearSelection();
      setContextMenu(null);
    },
    '+': () => {
      if (cameraRef.current && orbitControlsRef.current) {
        const direction = new THREE.Vector3();
        direction.subVectors(orbitControlsRef.current.target, cameraRef.current.position);
        direction.normalize();
        cameraRef.current.position.add(direction.multiplyScalar(1));
      }
    },
    '-': () => {
      if (cameraRef.current && orbitControlsRef.current) {
        const direction = new THREE.Vector3();
        direction.subVectors(orbitControlsRef.current.target, cameraRef.current.position);
        direction.normalize();
        cameraRef.current.position.sub(direction.multiplyScalar(1));
      }
    }
  }), [selectedObjects]);

  // Handle axis lock changes
  const handleAxisLockChange = (type, axis, locked) => {
    setAxisLocks(prev => ({
      ...prev,
      [type]: { ...prev[type], [axis]: locked }
    }));
  };

  // Handle thumbnail generator
  const handleOpenThumbnailGenerator = (objId) => {
    const mesh = mediaObjectsRef.current.get(objId);
    if (mesh) {
      setThumbnailGeneratorObject(mesh);
      setShowThumbnailGenerator(true);
    }
  };

  // Handle thumbnail capture
  // Handle thumbnail revert
  const handleThumbnailRevert = () => {
    if (thumbnailGeneratorObject) {
      const objId = thumbnailGeneratorObject.userData.mediaId;

      // Revert to original thumbnail
      setObjects(prev => prev.map(obj => {
        if (obj.id === objId && obj.originalThumbnail) {
          return { 
            ...obj, 
            thumbnail: obj.originalThumbnail,
            thumbnailSettings: null
          };
        }
        return obj;
      }));

      // Update media info
      if (thumbnailGeneratorObject.userData.mediaInfo && thumbnailGeneratorObject.userData.mediaInfo.originalThumbnail) {
        thumbnailGeneratorObject.userData.mediaInfo.thumbnail = thumbnailGeneratorObject.userData.mediaInfo.originalThumbnail;
        thumbnailGeneratorObject.userData.mediaInfo.thumbnailSettings = null;
      }
    }

    setShowThumbnailGenerator(false);
    setThumbnailGeneratorObject(null);
  };

  const handleThumbnailCapture = (dataURL, cameraSettings) => {
    if (thumbnailGeneratorObject) {
      const objId = thumbnailGeneratorObject.userData.mediaId;

      // Update object with thumbnail, storing original if not already stored
      setObjects(prev => prev.map(obj => {
        if (obj.id === objId) {
          const originalThumbnail = obj.originalThumbnail || obj.thumbnail;
          return { 
            ...obj, 
            thumbnail: dataURL, 
            thumbnailSettings: cameraSettings,
            originalThumbnail: originalThumbnail
          };
        }
        return obj;
      }));

      // Update media info
      if (thumbnailGeneratorObject.userData.mediaInfo) {
        const originalThumbnail = thumbnailGeneratorObject.userData.mediaInfo.originalThumbnail || 
                                 thumbnailGeneratorObject.userData.mediaInfo.thumbnail;
        thumbnailGeneratorObject.userData.mediaInfo.thumbnail = dataURL;
        thumbnailGeneratorObject.userData.mediaInfo.thumbnailSettings = cameraSettings;
        thumbnailGeneratorObject.userData.mediaInfo.originalThumbnail = originalThumbnail;
      }
    }

    setShowThumbnailGenerator(false);
    setThumbnailGeneratorObject(null);
  };

  // Preview mode cycling
  const cyclePreviewMode = useCallback(() => {
    setPreviewMode(prev => {
      const newMode = prev === 'off' ? 'live' : prev === 'live' ? 'hover' : 'off';

      // Update all video playback based on new mode
      videoElementsRef.current.forEach((video, mediaId) => {
        if (newMode === 'off') {
          video.pause();
          video.currentTime = 0;
        } else if (newMode === 'live') {
          video.play();
        } else { // hover
          video.pause();
          video.currentTime = 0;
        }
      });

      return newMode;
    });
  }, []);

  // Handle video playback control
  const controlVideoPlayback = useCallback((mediaId, action) => {
    const video = videoElementsRef.current.get(mediaId);
    if (!video) return;

    switch (action) {
      case 'play':
        video.play();
        break;
      case 'pause':
        video.pause();
        break;
      case 'reset':
        video.pause();
        video.currentTime = 0;
        break;
    }
  }, []);

  // Media hover handling
  const handleMediaHover = useCallback((mediaId, isHovering) => {
    if (previewMode !== 'hover') return;

    const video = videoElementsRef.current.get(mediaId);
    if (video) {
      if (isHovering) {
        video.play();
      } else {
        video.pause();
        video.currentTime = 0;
      }
    }
  }, [previewMode]);

  // Batch generate thumbnails
  const batchGenerateThumbnails = useCallback(() => {
    setThumbnailGeneratorObject(null);
    setShowThumbnailGenerator(true);
  }, []);

  // Create proper bounding box that updates with object
  class SelectionBox extends THREE.LineSegments {
    constructor() {
      const geometry = new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1));
      const material = new THREE.LineBasicMaterial({
        color: 0x00ff00,
        linewidth: 2,
        depthTest: false,
        depthWrite: false,
        transparent: true,
        opacity: 1
      });
      super(geometry, material);
      this.renderOrder = 999;
      this.name = 'selectionBox';
    }

    update(object) {
      if (!object) return;

      // Calculate world bounding box
      const box = new THREE.Box3().setFromObject(object);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());

      // Update geometry
      this.geometry.dispose();
      this.geometry = new THREE.EdgesGeometry(
        new THREE.BoxGeometry(size.x, size.y, size.z)
      );

      // Position at world center
      this.position.copy(center);
      this.rotation.set(0, 0, 0);
      this.scale.set(1, 1, 1);
    }

    dispose() {
      this.geometry.dispose();
      this.material.dispose();
    }
  }

  // Get the center of selected objects
  const getSelectionCenter = useCallback(() => {
    if (selectedObjectsRef.current.length === 0) return new THREE.Vector3();
    
    if (selectedObjectsRef.current.length === 1) {
      return selectedObjectsRef.current[0].position.clone();
    }
    
    const bounds = new THREE.Box3();
    selectedObjectsRef.current.forEach(obj => {
      bounds.expandByObject(obj);
    });
    
    return bounds.getCenter(new THREE.Vector3());
  }, []);

  // Update custom gizmo based on transform mode
  const updateGizmoForMode = useCallback(() => {
    if (!sceneRef.current) return;
    
    // DEBUG: Gizmo update
    console.log('⚙️ GIZMO UPDATE:', {
      selectedCount: selectedObjectsRef.current.length,
      transformMode: transformMode,
      transformSpace: transformSpace
    });
    
    // Remove existing custom gizmo
    if (customGizmoRef.current) {
      if (customGizmoRef.current.parent) {
        customGizmoRef.current.parent.remove(customGizmoRef.current);
      }
      if (customGizmoRef.current.dispose) {
        customGizmoRef.current.dispose();
      }
      customGizmoRef.current = null;
    }
    
    // Only create gizmo for multi-selection
    if (selectedObjectsRef.current.length > 1) {
      let gizmo;
      switch (transformMode) {
        case 'translate':
          gizmo = new TranslateGizmo();
          break;
        case 'rotate':
          gizmo = new RotateGizmo();
          break;
        case 'scale':
          gizmo = new ScaleGizmo();
          break;
        default:
          gizmo = new TranslateGizmo();
      }
      
      // Position and add the gizmo
      const center = getSelectionCenter();
      gizmo.position.copy(center);
      gizmo.visible = true;
      sceneRef.current.add(gizmo);
      customGizmoRef.current = gizmo;
      
      console.log('✅ GIZMO CREATED:', {
        type: gizmo.name,
        position: center,
        visible: gizmo.visible
      });
    } else {
      console.log('❌ NO GIZMO: Single or no selection');
    }
  }, [transformMode, transformSpace, getSelectionCenter]);

  // MediaPreview component
  const MediaPreview = ({ media, className, showPlayButton }) => {
    if (media.thumbnail) {
      return <img src={media.thumbnail} alt={media.name} className={className} loading="lazy" />;
    }

    if (media.type.startsWith('image/')) {
      return <img src={media.url} alt={media.name} className={className} loading="lazy" />;
    } else if (media.type.startsWith('video/')) {
      return <video src={media.url} className={className} muted preload="none" />;
    } else {
      return (
        <div className={`${className} bg-gray-200 dark:bg-gray-700 flex items-center justify-center`}>
          <span className="text-xs text-gray-500 text-center p-1">{media.name}</span>
        </div>
      );
    }
  };

  // Updated selection functions
  const createSelectionOutline = (object) => {
    removeSelectionOutline(object);

    const selectionBox = new SelectionBox();
    selectionBox.update(object);
    sceneRef.current.add(selectionBox);

    // Store reference
    object.userData.selectionBox = selectionBox;
  };

  const removeSelectionOutline = (object) => {
    if (object.userData.selectionBox) {
      sceneRef.current.remove(object.userData.selectionBox);
      object.userData.selectionBox.dispose();
      object.userData.selectionBox = null;
    }
  };

  const updateSelectionOutlines = () => {
    selectedObjectsRef.current.forEach(obj => {
      if (obj.userData.selectionBox) {
        obj.userData.selectionBox.update(obj);
      }
    });
  };

  const updateTransformValues = useCallback(() => {
    if (selectedObjectsRef.current.length > 0) {
      if (selectedObjectsRef.current.length === 1) {
        const obj = selectedObjectsRef.current[0];
        setTransformValues({
          position: {
            x: Math.round(obj.position.x * 100) / 100,
            y: Math.round(obj.position.y * 100) / 100,
            z: Math.round(obj.position.z * 100) / 100
          },
          rotation: {
            x: Math.round((obj.rotation.x * 180 / Math.PI) * 100) / 100,
            y: Math.round((obj.rotation.y * 180 / Math.PI) * 100) / 100,
            z: Math.round((obj.rotation.z * 180 / Math.PI) * 100) / 100
          },
          scale: {
            x: Math.round(obj.scale.x * 100) / 100,
            y: Math.round(obj.scale.y * 100) / 100,
            z: Math.round(obj.scale.z * 100) / 100
          }
        });
      } else {
        // For multi-selection, show center position
        const center = getSelectionCenter();
        setTransformValues({
          position: {
            x: Math.round(center.x * 100) / 100,
            y: Math.round(center.y * 100) / 100,
            z: Math.round(center.z * 100) / 100
          },
          rotation: { x: 0, y: 0, z: 0 },
          scale: { x: 1, y: 1, z: 1 }
        });
      }
    }
  }, []);

  const handleTransformChange = (type, axis, value) => {
    if (selectedObjectsRef.current.length === 0 || axisLocks[type][axis]) return;

    const numValue = parseFloat(value) || 0;

    if (selectedObjectsRef.current.length === 1) {
      const obj = selectedObjectsRef.current[0];
      if (type === 'position') {
        obj.position[axis] = numValue;
      } else if (type === 'rotation') {
        obj.rotation[axis] = numValue * Math.PI / 180;
      } else if (type === 'scale') {
        obj.scale[axis] = Math.max(0.01, numValue);
      }
      updateSelectionOutlines();
      updateGizmoPosition();
    } else if (selectedObjectsRef.current.length > 1 && type === 'position') {
      // For multi-selection, move all objects relative to center
      const currentCenter = getSelectionCenter();
      const delta = { x: 0, y: 0, z: 0 };
      delta[axis] = numValue - currentCenter[axis];

      selectedObjectsRef.current.forEach(obj => {
        obj.position[axis] += delta[axis];
      });
      updateSelectionOutlines();
      updateGizmoPosition();
    }

    updateTransformValues();
  };


  const updateGizmoPosition = () => {
    if (selectedObjectsRef.current.length > 1 && customGizmoRef.current) {
      // For multi-selection, update gizmo position
      const center = getSelectionCenter();
      customGizmoRef.current.position.copy(center);
    }
  };

  const selectObject = (object, addToSelection = false) => {
    if (!object || (!object.userData.isMediaObject && !object.userData.isGroup && !object.userData.isLight)) return;

    if (!addToSelection) {
      // Clear previous selection
      selectedObjectsRef.current.forEach(obj => {
        removeSelectionOutline(obj);
      });
      selectedObjectsRef.current = [];
      setSelectedObjects([]);
    }

    if (!selectedObjectsRef.current.includes(object)) {
      selectedObjectsRef.current.push(object);
      createSelectionOutline(object);

      const info = object.userData.mediaInfo || object.userData.groupInfo || object.userData.lightInfo;
      setSelectedObjects(prev => [...prev, info]);
    }

    // DEBUG: Selection change
    console.log('🎯 SELECTION UPDATE:', {
      totalSelected: selectedObjectsRef.current.length,
      transformMode: transformMode,
      transformSpace: transformSpace,
      objectType: object.userData.isMediaObject ? 'media' : object.userData.isGroup ? 'group' : 'light'
    });

    // Update gizmo or transform controls based on selection count
    if (selectedObjectsRef.current.length === 1) {
      // Use standard transform controls for single selection
      if (transformControlsRef.current) {
        transformControlsRef.current.attach(selectedObjectsRef.current[0]);
        transformControlsRef.current.setMode(transformMode); // Ensure mode matches button state
        transformControlsRef.current.visible = true;
      }
      // Remove custom gizmo
      if (customGizmoRef.current) {
        if (customGizmoRef.current.parent) {
          customGizmoRef.current.parent.remove(customGizmoRef.current);
        }
        if (customGizmoRef.current.dispose) {
          customGizmoRef.current.dispose();
        }
        customGizmoRef.current = null;
      }
    } else if (selectedObjectsRef.current.length > 1) {
      // Use custom gizmo for multi-selection
      if (transformControlsRef.current) {
        transformControlsRef.current.visible = false;
        transformControlsRef.current.detach();
      }
      // Ensure transform mode is set correctly for multi-selection
      updateGizmoForMode();
      updateGizmoPosition();
    }

    updateTransformValues();
  };

  const toggleObjectSelection = (object) => {
    if (!object || (!object.userData.isMediaObject && !object.userData.isGroup && !object.userData.isLight)) return;

    const index = selectedObjectsRef.current.indexOf(object);

    if (index === -1) {
      selectObject(object, true);
    } else {
      selectedObjectsRef.current.splice(index, 1);
      removeSelectionOutline(object);

      const info = object.userData.mediaInfo || object.userData.groupInfo || object.userData.lightInfo;
      setSelectedObjects(prev => prev.filter(o => o.id !== info.id));

      if (selectedObjectsRef.current.length === 0) {
        clearSelection();
      } else if (selectedObjectsRef.current.length === 1) {
        // Switch to single selection mode
        if (transformControlsRef.current) {
          transformControlsRef.current.attach(selectedObjectsRef.current[0]);
          transformControlsRef.current.setMode(transformMode); // Ensure mode matches button state
          transformControlsRef.current.visible = true;
        }
        // Hide custom gizmo
        if (customGizmoRef.current) {
          if (customGizmoRef.current.parent) {
            customGizmoRef.current.parent.remove(customGizmoRef.current);
          }
          if (customGizmoRef.current.dispose) {
            customGizmoRef.current.dispose();
          }
          customGizmoRef.current = null;
        }
      } else {
        // Multi-selection - update gizmo to match current transform mode
        if (transformControlsRef.current) {
          transformControlsRef.current.visible = false;
          transformControlsRef.current.detach();
        }
        updateGizmoForMode();
        updateGizmoPosition();
      }
    }

    updateTransformValues();
  };

  // Clear all persistent data (call this to fully reset the 3D viewport)
  const clearPersistentData = useCallback(() => {
    console.log('Clearing all persistent 3D viewport data...');
    persistentSceneData.current.objects.clear();
    persistentSceneData.current.groups.clear();
    persistentSceneData.current.lights = [];
    persistentSceneData.current.annotations = [];
    setObjects([]);
    setLights([]);
    clearSelection();
  }, []);
  
  const clearSelection = () => {
    selectedObjectsRef.current.forEach(obj => {
      removeSelectionOutline(obj);
    });

    selectedObjectsRef.current = [];
    setSelectedObjects([]);

    if (transformControlsRef.current) {
      transformControlsRef.current.detach();
      transformControlsRef.current.visible = false;
    }

    // Remove custom gizmo
    if (customGizmoRef.current) {
      if (customGizmoRef.current.parent) {
        customGizmoRef.current.parent.remove(customGizmoRef.current);
      }
      if (customGizmoRef.current.dispose) {
        customGizmoRef.current.dispose();
      }
      customGizmoRef.current = null;
    }

    setTransformValues({
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 }
    });
  };

  const handleThumbnailClick = (objId, event) => {
    const mesh = mediaObjectsRef.current.get(objId);
    if (mesh) {
      if (event.shiftKey || event.ctrlKey || event.metaKey) {
        toggleObjectSelection(mesh);
      } else {
        selectObject(mesh);
      }
    }
  };

  const handleThumbnailDoubleClick = (objId) => {
    const mesh = mediaObjectsRef.current.get(objId);
    if (mesh) {
      frameObject(mesh);
    }
  };

  const duplicateSelectedObjects = () => {
    const newObjects = [];

    selectedObjectsRef.current.forEach(obj => {
      if (obj.userData.isMediaObject) {
        const clone = obj.clone();
        clone.position.x += 2;
        clone.position.z += 2;

        const newId = `${obj.userData.mediaId}_copy_${Date.now()}`;
        const mediaInfo = { ...obj.userData.mediaInfo, id: newId };

        clone.userData = {
          isMediaObject: true,
          mediaInfo: mediaInfo,
          mediaId: newId
        };

        sceneRef.current.add(clone);
        mediaObjectsRef.current.set(newId, clone);
        persistentSceneData.current.objects.set(newId, clone);

        newObjects.push({
          id: newId,
          name: mediaInfo.name + ' (copy)',
          type: mediaInfo.type,
          mesh: clone,
          thumbnail: mediaInfo.thumbnail
        });
      }
    });

    if (newObjects.length > 0) {
      setObjects(prev => [...prev, ...newObjects]);
      clearSelection();

      // Select the new objects
      newObjects.forEach(obj => {
        const mesh = mediaObjectsRef.current.get(obj.id);
        if (mesh) selectObject(mesh, true);
      });
    }
  };

  const deleteSelectedObjects = () => {
    selectedObjectsRef.current.forEach(obj => {
      if (obj.userData.isMediaObject) {
        const id = obj.userData.mediaId;

        // Clean up video elements and textures
        cleanupVideo(id);

        // Dispose of Three.js resources
        disposeThreeObject(obj);

        sceneRef.current.remove(obj);
        mediaObjectsRef.current.delete(id);
        persistentSceneData.current.objects.delete(id);

        setObjects(prev => prev.filter(o => o.id !== id));

        setGroups(prev => prev.map(g => ({
          ...g,
          children: g.children.filter(childId => childId !== id)
        })).filter(g => g.children.length > 0));
      } else if (obj.userData.isGroup) {
        const group = obj.userData.groupInfo;
        group.children.forEach(childId => {
          const child = mediaObjectsRef.current.get(childId);
          if (child) {
            cleanupVideo(childId);
            disposeThreeObject(child);
            sceneRef.current.remove(child);
            mediaObjectsRef.current.delete(childId);
            persistentSceneData.current.objects.delete(childId);
          }
        });

        sceneRef.current.remove(obj);
        groupsRef.current.delete(group.id);
        persistentSceneData.current.groups.delete(group.id);
        setGroups(prev => prev.filter(g => g.id !== group.id));
        setObjects(prev => prev.filter(o => !group.children.includes(o.id)));
      } else if (obj.userData.isLight) {
        const lightId = obj.userData.lightInfo.id;
        sceneRef.current.remove(obj);
        const helper = sceneRef.current.getObjectByName(`${lightId}_helper`);
        if (helper) {
          sceneRef.current.remove(helper);
          disposeThreeObject(helper);
        }

        persistentSceneData.current.lights = persistentSceneData.current.lights.filter(l => l.id !== lightId);
        setLights(prev => prev.filter(l => l.id !== lightId));
      }
    });

    clearSelection();
  };

  const frameObject = (object) => {
    if (!object || !cameraRef.current || !orbitControlsRef.current) return;

    const box = new THREE.Box3().setFromObject(object);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());

    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = cameraRef.current.fov * (Math.PI / 180);
    const cameraDistance = Math.abs(maxDim / Math.sin(fov / 2)) * 1.5;

    const direction = new THREE.Vector3()
      .subVectors(cameraRef.current.position, orbitControlsRef.current.target)
      .normalize();

    cameraRef.current.position.copy(center).add(direction.multiplyScalar(cameraDistance));
    orbitControlsRef.current.target.copy(center);
    orbitControlsRef.current.update();
  };

  const frameAllObjects = () => {
    if (!sceneRef.current || objects.length === 0) return;

    const box = new THREE.Box3();

    objects.forEach(obj => {
      const mesh = mediaObjectsRef.current.get(obj.id);
      if (mesh && mesh.userData.isMediaObject) {
        box.expandByObject(mesh);
      }
    });

    if (box.isEmpty()) return;

    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = cameraRef.current.fov * (Math.PI / 180);
    const cameraDistance = Math.abs(maxDim / Math.sin(fov / 2)) * 1.5;

    const direction = new THREE.Vector3(1, 1, 1).normalize();
    cameraRef.current.position.copy(center).add(direction.multiplyScalar(cameraDistance));
    orbitControlsRef.current.target.copy(center);
    orbitControlsRef.current.update();
  };

  const frameAllSelected = () => {
    if (selectedObjectsRef.current.length === 0) return;

    const box = new THREE.Box3();
    selectedObjectsRef.current.forEach(obj => {
      box.expandByObject(obj);
    });

    if (box.isEmpty()) return;

    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = cameraRef.current.fov * (Math.PI / 180);
    const cameraDistance = Math.abs(maxDim / Math.sin(fov / 2)) * 1.5;

    const direction = new THREE.Vector3()
      .subVectors(cameraRef.current.position, orbitControlsRef.current.target)
      .normalize();

    cameraRef.current.position.copy(center).add(direction.multiplyScalar(cameraDistance));
    orbitControlsRef.current.target.copy(center);
    orbitControlsRef.current.update();
  };

  const alignObjects = (alignment) => {
    if (selectedObjectsRef.current.length < 2) return;

    const bounds = new THREE.Box3();
    const positions = selectedObjectsRef.current.map(obj => {
      bounds.setFromObject(obj);
      return {
        obj,
        center: bounds.getCenter(new THREE.Vector3()),
        size: bounds.getSize(new THREE.Vector3()),
        min: bounds.min.clone(),
        max: bounds.max.clone()
      };
    });

    switch (alignment) {
      case 'left':
        const minX = Math.min(...positions.map(p => p.min.x));
        positions.forEach(p => {
          p.obj.position.x = minX + (p.obj.position.x - p.min.x);
        });
        break;

      case 'center-x':
        const avgX = positions.reduce((sum, p) => sum + p.center.x, 0) / positions.length;
        positions.forEach(p => {
          p.obj.position.x = avgX - (p.center.x - p.obj.position.x);
        });
        break;

      case 'right':
        const maxX = Math.max(...positions.map(p => p.max.x));
        positions.forEach(p => {
          p.obj.position.x = maxX - (p.max.x - p.obj.position.x);
        });
        break;

      case 'top':
        const maxY = Math.max(...positions.map(p => p.max.y));
        positions.forEach(p => {
          p.obj.position.y = maxY - (p.max.y - p.obj.position.y);
        });
        break;

      case 'center-y':
        const avgY = positions.reduce((sum, p) => sum + p.center.y, 0) / positions.length;
        positions.forEach(p => {
          p.obj.position.y = avgY - (p.center.y - p.obj.position.y);
        });
        break;

      case 'bottom':
        const minY = Math.min(...positions.map(p => p.min.y));
        positions.forEach(p => {
          p.obj.position.y = minY + (p.obj.position.y - p.min.y);
        });
        break;

      case 'distribute-x':
        positions.sort((a, b) => a.center.x - b.center.x);
        const totalWidth = positions[positions.length - 1].center.x - positions[0].center.x;
        const spacing = totalWidth / (positions.length - 1);
        positions.forEach((p, i) => {
          if (i > 0 && i < positions.length - 1) {
            const targetX = positions[0].center.x + spacing * i;
            p.obj.position.x = targetX - (p.center.x - p.obj.position.x);
          }
        });
        break;

      case 'distribute-y':
        positions.sort((a, b) => a.center.y - b.center.y);
        const totalHeight = positions[positions.length - 1].center.y - positions[0].center.y;
        const spacingY = totalHeight / (positions.length - 1);
        positions.forEach((p, i) => {
          if (i > 0 && i < positions.length - 1) {
            const targetY = positions[0].center.y + spacingY * i;
            p.obj.position.y = targetY - (p.center.y - p.obj.position.y);
          }
        });
        break;
    }

    updateTransformValues();
    updateSelectionOutlines();
    updateGizmoPosition();
  };

  const loadMediaAsPlane = (media, position = null) => {
    if (!sceneRef.current) return;

    const geometry = new THREE.PlaneGeometry(2, 2);
    const material = new THREE.MeshBasicMaterial({
      side: THREE.DoubleSide,
      transparent: true
    });

    const mesh = new THREE.Mesh(geometry, material);

    if (position) {
      mesh.position.set(position.x, position.y, position.z);
    } else {
      mesh.position.set(0, 0, 0);
    }

    mesh.castShadow = true;
    mesh.receiveShadow = true;

    if (media.type.startsWith('image/')) {
      const textureLoader = new THREE.TextureLoader();
      // Use thumbnail if available for faster loading
      const textureUrl = media.thumbnail || media.url;
      textureLoader.load(textureUrl, 
        (texture) => {
        // Limit texture size in performance mode
        if (performanceMode && texture.image) {
          const maxSize = 1024;
          if (texture.image.width > maxSize || texture.image.height > maxSize) {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const scale = Math.min(maxSize / texture.image.width, maxSize / texture.image.height);
            canvas.width = texture.image.width * scale;
            canvas.height = texture.image.height * scale;
            ctx.drawImage(texture.image, 0, 0, canvas.width, canvas.height);
            texture.image = canvas;
            texture.needsUpdate = true;
          }
        }

        material.map = texture;
        material.needsUpdate = true;

        const aspect = texture.image.width / texture.image.height;
        mesh.scale.x = aspect;

        if (!position) {
          frameObject(mesh);
        }
      },
      undefined,
      (error) => {
        console.error('Error loading texture:', error);
        // Create a placeholder texture
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        
        // Draw placeholder
        ctx.fillStyle = '#FF0000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '48px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Missing', canvas.width / 2, canvas.height / 2 - 30);
        ctx.fillText('Media', canvas.width / 2, canvas.height / 2 + 30);
        
        const placeholderTexture = new THREE.CanvasTexture(canvas);
        material.map = placeholderTexture;
        material.needsUpdate = true;
        
        // Mark media as missing if callback provided
        if (onMediaMissing && media.id) {
          onMediaMissing(media.id, media.name);
        }
      });
    } else if (media.type.startsWith('video/')) {
      // Load thumbnail first for immediate display
      if (media.thumbnail) {
        const textureLoader = new THREE.TextureLoader();
        textureLoader.load(media.thumbnail, (thumbnailTexture) => {
          material.map = thumbnailTexture;
          material.needsUpdate = true;
          
          // Set aspect ratio from thumbnail
          const aspect = thumbnailTexture.image.width / thumbnailTexture.image.height;
          mesh.scale.x = aspect;
          
          if (!position) {
            frameObject(mesh);
          }
        });
      }
      
      // Video loading with performance management
      if (activeVideosRef.current.size >= MAX_CONCURRENT_VIDEOS) {
        const oldestId = activeVideosRef.current.values().next().value;
        const oldestVideo = videoElementsRef.current.get(oldestId);
        if (oldestVideo) {
          oldestVideo.pause();
          activeVideosRef.current.delete(oldestId);
          console.log(`Paused video ${oldestId} due to limit`);
        }
      }

      const video = document.createElement('video');
      video.src = media.url;
      video.loop = true;
      video.muted = true;
      video.crossOrigin = 'anonymous';

      // Store video element reference
      videoElementsRef.current.set(media.id, video);

      // Set initial playback state based on preview mode
      if (previewMode === 'live') {
        video.play();
        activeVideosRef.current.add(media.id);
      } else {
        video.pause();
      }

      const texture = new THREE.VideoTexture(video);
      texture.minFilter = performanceMode ? THREE.NearestFilter : THREE.LinearFilter;
      texture.magFilter = performanceMode ? THREE.NearestFilter : THREE.LinearFilter;
      texture.format = THREE.RGBFormat;

      // Only replace thumbnail with video texture when video is ready
      video.addEventListener('loadedmetadata', () => {
        material.map = texture;
        material.needsUpdate = true;
        
        // Store texture reference
        videoTexturesRef.current.set(media.id, texture);
        
        const aspect = video.videoWidth / video.videoHeight;
        mesh.scale.x = aspect;

        if (!position) {
          frameObject(mesh);
        }
      });
    } else if (media.type.startsWith('audio/')) {
      material.color = new THREE.Color(0x00ff00);

      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 256;
      const ctx = canvas.getContext('2d');

      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = '#00ff00';
      ctx.lineWidth = 2;
      ctx.beginPath();

      for (let i = 0; i < canvas.width; i++) {
        const y = canvas.height / 2 + Math.sin(i * 0.02) * 50 * Math.random();
        if (i === 0) ctx.moveTo(i, y);
        else ctx.lineTo(i, y);
      }
      ctx.stroke();

      const texture = new THREE.CanvasTexture(canvas);
      material.map = texture;
      material.needsUpdate = true;

      if (!position) {
        frameObject(mesh);
      }
    } else {
      material.color = new THREE.Color(0x808080);

      if (!position) {
        frameObject(mesh);
      }
    }

    mesh.userData = {
      isMediaObject: true,
      mediaInfo: media,
      mediaId: media.id
    };

    sceneRef.current.add(mesh);
    mediaObjectsRef.current.set(media.id, mesh);
    persistentSceneData.current.objects.set(media.id, mesh);

    // Use existing thumbnail or generate new one if needed
    const existingThumbnail = media.thumbnail;
    if (existingThumbnail) {
      // Use existing thumbnail immediately
      setObjects(prev => [...prev, {
        id: media.id,
        name: media.name,
        type: media.type,
        mesh: mesh,
        thumbnail: existingThumbnail
      }]);
    } else {
      // Generate new thumbnail only if one doesn't exist
      setTimeout(() => {
        const thumbnail = generateThumbnail(mesh, 'perspective');
        setObjects(prev => [...prev, {
          id: media.id,
          name: media.name,
          type: media.type,
          mesh: mesh,
          thumbnail: thumbnail
        }]);
      }, 100);
    }

    return mesh;
  };

  const load3DModel = (media, position = null) => {
    if (!sceneRef.current) return;

    const extension = media.name.split('.').pop().toLowerCase();
    let loader;

    switch (extension) {
      case 'gltf':
      case 'glb':
        loader = new GLTFLoader();
        break;
      case 'obj':
        loader = new OBJLoader();
        break;
      case 'fbx':
        loader = new FBXLoader();
        break;
      case 'stl':
        loader = new STLLoader();
        break;
      case 'ply':
        loader = new PLYLoader();
        break;
      default:
        console.warn('Unsupported 3D format:', extension);
        return;
    }

    loader.load(
      media.url,
      (result) => {
        let object;

        if (result.scene) {
          object = result.scene;
        } else if (result.isObject3D) {
          object = result;
        } else if (result.isGeometry || result.isBufferGeometry) {
          const material = new THREE.MeshPhongMaterial({
            color: 0x808080,
            specular: 0x111111,
            shininess: 200
          });
          object = new THREE.Mesh(result, material);
        } else {
          object = result;
        }

        const box = new THREE.Box3().setFromObject(object);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 2 / maxDim;

        object.position.sub(center);
        object.scale.multiplyScalar(scale);

        const group = new THREE.Group();
        group.add(object);

        if (position) {
          group.position.set(position.x, position.y, position.z);
        } else {
          group.position.set(0, 0, 0);
        }

        group.userData = {
          isMediaObject: true,
          mediaInfo: media,
          mediaId: media.id,
          is3DModel: true
        };

        sceneRef.current.add(group);
        mediaObjectsRef.current.set(media.id, group);
        persistentSceneData.current.objects.set(media.id, group);

        // Generate thumbnail for 3D model
        const thumbnail = generateThumbnail(group, 'perspective');

        setObjects(prev => [...prev, {
          id: media.id,
          name: media.name,
          type: media.type,
          mesh: group,
          thumbnail: thumbnail,
          is3D: true
        }]);

        if (!position) {
          frameObject(group);
        }
      },
      (progress) => {
        console.log('Loading 3D model:', (progress.loaded / progress.total * 100).toFixed(2) + '%');
      },
      (error) => {
        console.error('Error loading 3D model:', error);
      }
    );
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();

    const mediaData = e.dataTransfer.getData('application/json');
    if (mediaData) {
      try {
        const media = JSON.parse(mediaData);

        let dropPosition = null;

        if (e.shiftKey) {
          const rect = mountRef.current.getBoundingClientRect();
          const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
          const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

          const vector = new THREE.Vector3(x, y, 0.5);
          vector.unproject(cameraRef.current);
          const dir = vector.sub(cameraRef.current.position).normalize();
          const distance = -cameraRef.current.position.z / dir.z;
          dropPosition = cameraRef.current.position.clone().add(dir.multiplyScalar(distance));
        }

        const is3D = ['gltf', 'glb', 'obj', 'fbx', 'stl', 'ply', '3ds', 'dae']
          .includes(media.name.split('.').pop().toLowerCase());

        if (is3D) {
          load3DModel(media, dropPosition);
        } else {
          loadMediaAsPlane(media, dropPosition);
        }
      } catch (error) {
        console.error('Error parsing dropped media:', error);
      }
    }
  }, [performanceMode, previewMode]);

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const is3DModel = (filename) => {
    const ext = filename.split('.').pop().toLowerCase();
    return ['gltf', 'glb', 'obj', 'fbx', 'stl', 'ply', '3ds', 'dae'].includes(ext);
  };

  const addStandardGridToViewport = () => {
    const validItems = gridSlots.filter(item => item !== null);

    if (validItems.length === 0) {
      alert("No items in standard grid to add");
      return;
    }

    setPendingGridImport({
      items: validItems,
      type: 'standard'
    });
    setShowGridPlacementDialog(true);
  };

  const addFreeGridToViewport = () => {
    if (!freeGridItems || Object.keys(freeGridItems).length === 0) {
      alert("No items in free grid to add");
      return;
    }

    const items = Object.values(freeGridItems).map(item => {
      const media = mediaFiles.find(m => m.id === item.mediaId);
      return media;
    }).filter(Boolean);

    if (items.length === 0) {
      alert("No valid items in free grid to add");
      return;
    }

    setPendingGridImport({
      items: items,
      type: 'freegrid'
    });
    setShowGridPlacementDialog(true);
  };

  const handleGridPlacementConfirm = (config) => {
    if (!pendingGridImport) return;

    const { items, type } = pendingGridImport;
    const { orientation, faceDirection, spacing, columns } = config;

    items.forEach((media, index) => {
      if (!media) return;

      const row = Math.floor(index / columns);
      const col = index % columns;

      let position = new THREE.Vector3();
      let rotation = new THREE.Euler();

      if (orientation === 'horizontal') {
        position.x = (col - columns / 2 + 0.5) * spacing;
        position.z = (row - Math.ceil(items.length / columns) / 2 + 0.5) * spacing;
        position.y = 0.1;

        // Apply face direction rotation
        switch (faceDirection) {
          case 'backward':
            rotation.y = Math.PI;
            break;
          case 'left':
            rotation.y = Math.PI / 2;
            break;
          case 'right':
            rotation.y = -Math.PI / 2;
            break;
          case 'up':
            rotation.x = -Math.PI / 2;
            position.y = 0;
            break;
          case 'down':
            rotation.x = Math.PI / 2;
            position.y = 0;
            break;
        }
      } else { // vertical
        position.x = (col - columns / 2 + 0.5) * spacing;
        position.y = (row + 0.5) * spacing;
        position.z = 0;

        // Apply face direction for vertical
        switch (faceDirection) {
          case 'backward':
            rotation.y = Math.PI;
            break;
          case 'left':
            rotation.y = Math.PI / 2;
            break;
          case 'right':
            rotation.y = -Math.PI / 2;
            break;
        }
      }

      if (is3DModel(media.name)) {
        const mesh = load3DModel(media, position);
        if (mesh) {
          setTimeout(() => {
            const loadedMesh = mediaObjectsRef.current.get(media.id);
            if (loadedMesh && rotation) {
              loadedMesh.rotation.copy(rotation);
            }
          }, 100);
        }
      } else {
        const mesh = loadMediaAsPlane(media, position);
        if (mesh) {
          setTimeout(() => {
            const loadedMesh = mediaObjectsRef.current.get(media.id);
            if (loadedMesh && rotation) {
              loadedMesh.rotation.copy(rotation);
            }
          }, 100);
        }
      }
    });

    // Frame all objects after import
    setTimeout(() => {
      frameAllObjects();
    }, 500);

    setShowGridPlacementDialog(false);
    setPendingGridImport(null);
  };

  const createGroup = () => {
    if (selectedObjectsRef.current.length < 2) return;

    const groupId = `group_${Date.now()}`;
    const group = {
      id: groupId,
      name: `Group ${groups.length + 1}`,
      children: selectedObjectsRef.current.map(obj => obj.userData.mediaInfo.id),
      expanded: true
    };

    setGroups(prev => [...prev, group]);
    setExpandedGroups(prev => new Set(prev).add(groupId));

    const threeGroup = new THREE.Group();
    threeGroup.name = groupId;
    threeGroup.userData.isGroup = true;
    threeGroup.userData.groupInfo = group;

    const box = new THREE.Box3();
    selectedObjectsRef.current.forEach(obj => box.expandByObject(obj));
    const center = box.getCenter(new THREE.Vector3());

    selectedObjectsRef.current.forEach(obj => {
      const worldPos = new THREE.Vector3();
      obj.getWorldPosition(worldPos);
      threeGroup.attach(obj);
    });

    sceneRef.current.add(threeGroup);
    groupsRef.current.set(groupId, threeGroup);
    persistentSceneData.current.groups.set(groupId, threeGroup);

    clearSelection();
  };

  const ungroupSelected = () => {
    selectedObjectsRef.current.forEach(obj => {
      if (obj.parent && obj.parent.userData.isGroup) {
        const worldPos = new THREE.Vector3();
        obj.getWorldPosition(worldPos);

        sceneRef.current.attach(obj);
        obj.position.copy(worldPos);

        const groupId = obj.parent.name;
        setGroups(prev => prev.map(g =>
          g.id === groupId
            ? { ...g, children: g.children.filter(id => id !== obj.userData.mediaInfo.id) }
            : g
        ).filter(g => g.children.length > 0));
      }
    });
  };

  const selectAllObjects = () => {
    const selectableObjects = sceneRef.current.children.filter(
      child => child.userData.isMediaObject || child.userData.isLight
    );

    clearSelection();
    selectableObjects.forEach(obj => selectObject(obj, true));
  };

  const autoArrangeObjects = useCallback((arrangedItems) => {
    if (!arrangedItems || arrangedItems.length === 0) return;

    arrangedItems.forEach(item => {
      const mesh = mediaObjectsRef.current.get(item.id);
      if (mesh) {
        mesh.position.set(item.x, item.y, item.z || 0);
        if (item.rotation !== undefined) {
          mesh.rotation.z = item.rotation * Math.PI / 180;
        }
      }
    });

    updateSelectionOutlines();
    updateGizmoPosition();
    frameAllObjects();
  }, []);

  const applyLookAt = (targetPosition, preserveUp) => {
    if (selectedObjectsRef.current.length === 0) return;

    const target = new THREE.Vector3(targetPosition.x, targetPosition.y, targetPosition.z);

    selectedObjectsRef.current.forEach(obj => {
      if (obj.userData.isMediaObject) {
        if (preserveUp) {
          // Create a rotation that looks at target while preserving up direction
          const direction = new THREE.Vector3();
          direction.subVectors(target, obj.position).normalize();

          // Calculate the rotation needed
          const quaternion = new THREE.Quaternion();
          const matrix = new THREE.Matrix4();

          // Default forward is -Z
          const forward = new THREE.Vector3(0, 0, -1);

          // Use lookAt matrix but preserve Y up
          matrix.lookAt(obj.position, target, new THREE.Vector3(0, 1, 0));
          quaternion.setFromRotationMatrix(matrix);

          obj.quaternion.copy(quaternion);
        } else {
          // Simple look at without preserving up
          obj.lookAt(target);
        }

        updateSelectionOutlines();
      }
    });

    updateTransformValues();
  };

  // Generate thumbnail for any media type
  const generateThumbnail = useCallback((object, viewName = 'perspective') => {
    // This is a simplified version for initial thumbnail generation
    // The actual thumbnail generation is now handled by ThumbnailGenerator component
    return null; // Return null to use default preview
  }, []);

  // Render scene hierarchy
  const renderSceneHierarchy = () => {
    const ungroupedObjects = objects.filter(obj => {
      return !groups.some(group => group.children.includes(obj.id));
    });

    return (
      <>
        {groups.map(group => (
          <div key={group.id} className="select-none">
            <div
              className={`flex items-center p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 cursor-pointer
               ${selectedObjects.some(o => o.id === group.id) ? 'bg-blue-100 dark:bg-blue-900' : ''}`}
              onClick={() => {
                const groupObj = groupsRef.current.get(group.id);
                if (groupObj) selectObject(groupObj);
              }}
            >
              <button
                onClick={() => {
                  if (!bookMode) {
                    setShowPageMappingDialog(true);
                  } else {
                    onBookModeToggle?.();
                  }
                }}
                className={`p-2 border border-gray-300 dark:border-gray-600 rounded ${bookMode ? 'bg-purple-500 text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                title="Book Mode"
              >
                <BookIcon size={16} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setExpandedGroups(prev => {
                    const newSet = new Set(prev);
                    if (newSet.has(group.id)) {
                      newSet.delete(group.id);
                    } else {
                      newSet.add(group.id);
                    }
                    return newSet;
                  });
                }}
                className="p-0.5 mr-1"
              >
                {expandedGroups.has(group.id) ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>
              <Folder size={14} className="mr-1" />
              <span className="text-xs flex-1">{group.name}</span>
            </div>

            {expandedGroups.has(group.id) && (
              <div className="ml-4">
                {group.children.map(childId => {
                  const obj = objects.find(o => o.id === childId);
                  if (!obj) return null;

                  return (
                    <div
                      key={obj.id}
                      className={`flex items-center p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 cursor-pointer
                       ${selectedObjects.some(o => o.id === obj.id) ? 'bg-blue-100 dark:bg-blue-900' : ''}`}
                      onClick={() => {
                        const mesh = mediaObjectsRef.current.get(obj.id);
                        if (mesh) selectObject(mesh);
                      }}
                      onMouseEnter={() => handleMediaHover(obj.id, true)}
                      onMouseLeave={() => handleMediaHover(obj.id, false)}
                    >
                      <Box size={12} className="mr-1 text-gray-500" />
                      <span className="text-xs truncate">{obj.name}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}

        {ungroupedObjects.map(obj => (
          <div
            key={obj.id}
            className={`flex items-center p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 cursor-pointer
             ${selectedObjects.some(o => o.id === obj.id) ? 'bg-blue-100 dark:bg-blue-900' : ''}`}
            onClick={() => {
              const mesh = mediaObjectsRef.current.get(obj.id);
              if (mesh) selectObject(mesh);
            }}
            onMouseEnter={() => handleMediaHover(obj.id, true)}
            onMouseLeave={() => handleMediaHover(obj.id, false)}
          >
            <Box size={12} className="mr-1 text-gray-500" />
            <span className="text-xs truncate">{obj.name}</span>
          </div>
        ))}

        {/* Show lights in hierarchy */}
        {lights.map(light => (
          <div
            key={light.id}
            className={`flex items-center p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 cursor-pointer
             ${selectedObjects.some(o => o.id === light.id) ? 'bg-blue-100 dark:bg-blue-900' : ''}`}
            onClick={() => {
              const lightObj = sceneRef.current.getObjectByName(light.id);
              if (lightObj) selectObject(lightObj);
            }}
          >
            <Lightbulb size={12} className="mr-1 text-yellow-500" />
            <span className="text-xs truncate">{light.type} light</span>
          </div>
        ))}
      </>
    );
  };

  // Handle gizmo interaction
  const handleGizmoInteraction = useCallback((event) => {
    // For single selection, let TransformControls handle it
    if (selectedObjectsRef.current.length <= 1) return;
    
    // Get the current active gizmo
    const activeGizmo = customGizmoRef.current;
    if (!activeGizmo || !activeGizmo.visible || !raycasterRef.current) return;

    const rect = mountRef.current.getBoundingClientRect();
    mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);

    // Check gizmo intersection
    const gizmoObjects = [];
    activeGizmo.traverse((child) => {
      if (child.isMesh && child.userData.axis) {
        gizmoObjects.push(child);
      }
    });

    const intersects = raycasterRef.current.intersectObjects(gizmoObjects, false);

    if (event.type === 'mousemove' && !isDraggingGizmo.current) {
      // Handle hover
      if (intersects.length > 0) {
        const axis = intersects[0].object.userData.axis;
        activeGizmo.setHover(axis);
        mountRef.current.style.cursor = 'pointer';
      } else {
        activeGizmo.clearHover();
        mountRef.current.style.cursor = 'default';
      }
    } else if (event.type === 'mousedown' && intersects.length > 0) {
      // Start dragging
      const axis = intersects[0].object.userData.axis;
      
      // DEBUG: Gizmo interaction start
      console.log('🔧 GIZMO DRAG START:', {
        selectedCount: selectedObjectsRef.current.length,
        transformMode: currentTransformModeRef.current,
        transformSpace: currentTransformSpaceRef.current,
        gizmoAxis: axis,
        gizmoType: activeGizmo.name,
        mousePos: { x: event.clientX, y: event.clientY }
      });
      
      isDraggingGizmo.current = true;
      currentGizmoAxis.current = axis;
      orbitControlsRef.current.enabled = false;

      // Store initial state
      dragStartMouse.current = { x: event.clientX, y: event.clientY };
      
      if (selectedObjectsRef.current.length === 1) {
        dragStartPoint.current.copy(selectedObjectsRef.current[0].position);
        dragStartRotation.current.copy(selectedObjectsRef.current[0].rotation);
        dragStartScale.current.copy(selectedObjectsRef.current[0].scale);
        
        if (transformMode === 'rotate') {
          // Store initial angle from object center to mouse
          const obj = selectedObjectsRef.current[0];
          const center = new THREE.Vector3();
          obj.getWorldPosition(center);
          const rect = mountRef.current.getBoundingClientRect();
          const centerScreen = center.clone().project(cameraRef.current);
          const centerX = (centerScreen.x + 1) / 2 * rect.width;
          const centerY = (-centerScreen.y + 1) / 2 * rect.height;
          dragStartAngle.current = Math.atan2(
            event.clientY - rect.top - centerY,
            event.clientX - rect.left - centerX
          );
        }
      } else if (selectedObjectsRef.current.length > 1) {
        // Store initial state for multi-selection
        const center = getSelectionCenter();
        dragStartPoint.current.copy(center);
        dragStartPositions.current = selectedObjectsRef.current.map(obj => obj.position.clone());
        dragStartRotations.current = selectedObjectsRef.current.map(obj => obj.rotation.clone());
        dragStartScales.current = selectedObjectsRef.current.map(obj => obj.scale.clone());
        
      }

      event.stopPropagation();
    } else if (event.type === 'mouseup' && isDraggingGizmo.current) {
      // End dragging
      console.log('🔧 GIZMO DRAG END:', {
        selectedCount: selectedObjectsRef.current.length,
        transformMode: currentTransformModeRef.current,
        transformSpace: currentTransformSpaceRef.current
      });
      
      isDraggingGizmo.current = false;
      currentGizmoAxis.current = null;
      orbitControlsRef.current.enabled = true;
      activeGizmo.clearHover();
    }
  }, [axisLocks, getSelectionCenter]);

  // Handle gizmo dragging
  const handleGizmoDrag = useCallback((event) => {
    if (!isDraggingGizmo.current || !currentGizmoAxis.current) return;

    // Only apply custom gizmo logic for multi-selection
    if (selectedObjectsRef.current.length <= 1) return;

    const rect = mountRef.current.getBoundingClientRect();
    mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);

    const axis = currentGizmoAxis.current;
    
    // DEBUG: Drag operation
    console.log('🔄 GIZMO DRAG:', {
      selectedCount: selectedObjectsRef.current.length,
      transformMode: currentTransformModeRef.current,
      transformSpace: currentTransformSpaceRef.current,
      axis: axis,
      mousePos: { x: event.clientX, y: event.clientY },
      mouseDelta: {
        x: event.clientX - dragStartMouse.current.x,
        y: event.clientY - dragStartMouse.current.y
      }
    });
    

    if (currentTransformModeRef.current === 'translate') {
      // Create plane for dragging
      const plane = new THREE.Plane();
      const planeNormal = new THREE.Vector3();

      if (axis === 'x') {
        planeNormal.set(0, 0, 1);
      } else if (axis === 'y') {
        planeNormal.set(1, 0, 0);
      } else if (axis === 'z') {
        planeNormal.set(0, 1, 0);
      } else if (axis === 'xyz') {
        // Use camera plane for free movement
        cameraRef.current.getWorldDirection(planeNormal);
        planeNormal.negate();
      }

      plane.setFromNormalAndCoplanarPoint(planeNormal, customGizmoRef.current.position);

      const intersection = new THREE.Vector3();
      raycasterRef.current.ray.intersectPlane(plane, intersection);

      if (intersection) {
        if (selectedObjectsRef.current.length === 1) {
          const obj = selectedObjectsRef.current[0];

          if (axis === 'x' && !axisLocks.position.x) {
            obj.position.x = intersection.x;
          } else if (axis === 'y' && !axisLocks.position.y) {
            obj.position.y = intersection.y;
          } else if (axis === 'z' && !axisLocks.position.z) {
            obj.position.z = intersection.z;
          } else if (axis === 'xyz') {
            if (!axisLocks.position.x) obj.position.x = intersection.x;
            if (!axisLocks.position.y) obj.position.y = intersection.y;
            if (!axisLocks.position.z) obj.position.z = intersection.z;
          }

          updateSelectionOutlines();
          updateGizmoPosition();
          updateTransformValues();
        } else if (selectedObjectsRef.current.length > 1) {
          // Multi-object translation
          const delta = new THREE.Vector3();
          delta.subVectors(intersection, dragStartPoint.current);
          
          selectedObjectsRef.current.forEach((obj, index) => {
            const startPos = dragStartPositions.current[index];
            if (startPos) {
              if (axis === 'x' && !axisLocks.position.x) {
                obj.position.x = startPos.x + delta.x;
              } else if (axis === 'y' && !axisLocks.position.y) {
                obj.position.y = startPos.y + delta.y;
              } else if (axis === 'z' && !axisLocks.position.z) {
                obj.position.z = startPos.z + delta.z;
              } else if (axis === 'xyz') {
                if (!axisLocks.position.x) obj.position.x = startPos.x + delta.x;
                if (!axisLocks.position.y) obj.position.y = startPos.y + delta.y;
                if (!axisLocks.position.z) obj.position.z = startPos.z + delta.z;
              }
            }
          });
          
          updateSelectionOutlines();
          updateGizmoPosition();
          updateTransformValues();
        }
      }
    } else if (currentTransformModeRef.current === 'rotate') {
      // Rotation logic - calculate rotation based on mouse movement
      let deltaAngle = 0;
      
      if (axis === 'x' || axis === 'y' || axis === 'z') {
        // For axis-specific rotation, use mouse delta
        const mouseDeltaX = event.clientX - dragStartMouse.current.x;
        const mouseDeltaY = event.clientY - dragStartMouse.current.y;
        
        // Use horizontal movement for Y axis, vertical for X/Z
        if (axis === 'y') {
          deltaAngle = mouseDeltaX * 0.01;
        } else if (axis === 'x') {
          deltaAngle = -mouseDeltaY * 0.01;
        } else if (axis === 'z') {
          deltaAngle = mouseDeltaX * 0.01;
        }
      }
      
      if (selectedObjectsRef.current.length === 1) {
        const obj = selectedObjectsRef.current[0];

        if (axis === 'x' && !axisLocks.rotation.x) {
          obj.rotation.x = dragStartRotation.current.x + deltaAngle;
        } else if (axis === 'y' && !axisLocks.rotation.y) {
          obj.rotation.y = dragStartRotation.current.y + deltaAngle;
        } else if (axis === 'z' && !axisLocks.rotation.z) {
          obj.rotation.z = dragStartRotation.current.z + deltaAngle;
        }

        updateSelectionOutlines();
        updateTransformValues();
      } else if (selectedObjectsRef.current.length > 1) {
        // Multi-object rotation - global vs local
        if (currentTransformSpaceRef.current === 'global') {
          // Global: rotate objects around collective center as one unit
          console.log('🌍 GLOBAL ROTATION:', { axis, deltaAngle, objectCount: selectedObjectsRef.current.length });
          const rotationMatrix = new THREE.Matrix4();
          const rotationAxis = new THREE.Vector3();
          
          if (axis === 'x') rotationAxis.set(1, 0, 0);
          else if (axis === 'y') rotationAxis.set(0, 1, 0);
          else if (axis === 'z') rotationAxis.set(0, 0, 1);
          
          rotationMatrix.makeRotationAxis(rotationAxis, deltaAngle);
          
          selectedObjectsRef.current.forEach((obj, index) => {
            const startPos = dragStartPositions.current[index];
            const startRot = dragStartRotations.current[index];
            if (startPos && startRot) {
              // Rotate position around initial center (dragStartPoint.current)
              const relativePos = startPos.clone().sub(dragStartPoint.current);
              relativePos.applyMatrix4(rotationMatrix);
              obj.position.copy(dragStartPoint.current).add(relativePos);
              
              // Apply rotation to each object
              if (axis === 'x' && !axisLocks.rotation.x) {
                obj.rotation.x = startRot.x + deltaAngle;
              } else if (axis === 'y' && !axisLocks.rotation.y) {
                obj.rotation.y = startRot.y + deltaAngle;
              } else if (axis === 'z' && !axisLocks.rotation.z) {
                obj.rotation.z = startRot.z + deltaAngle;
              }
              
              // Force update
              obj.updateMatrix();
              obj.updateMatrixWorld();
            }
          });
        } else {
          // Local: rotate each object around its own center
          console.log('📍 LOCAL ROTATION:', { axis, deltaAngle, objectCount: selectedObjectsRef.current.length });
          selectedObjectsRef.current.forEach((obj, index) => {
            const startRot = dragStartRotations.current[index];
            if (startRot) {
              if (axis === 'x' && !axisLocks.rotation.x) {
                obj.rotation.x = startRot.x + deltaAngle;
              } else if (axis === 'y' && !axisLocks.rotation.y) {
                obj.rotation.y = startRot.y + deltaAngle;
              } else if (axis === 'z' && !axisLocks.rotation.z) {
                obj.rotation.z = startRot.z + deltaAngle;
              }
              
              // Force update
              obj.updateMatrix();
              obj.updateMatrixWorld();
            }
          });
        }
        
        updateSelectionOutlines();
        updateGizmoPosition();
        updateTransformValues();
      }
    } else if (currentTransformModeRef.current === 'scale') {
      // Scale logic - calculate scale based on mouse movement
      const mouseDelta = (event.clientX - dragStartMouse.current.x + event.clientY - dragStartMouse.current.y) * 0.01;
      const scaleFactor = Math.max(0.01, 1 + mouseDelta);

      if (selectedObjectsRef.current.length === 1) {
        const obj = selectedObjectsRef.current[0];

        if (axis === 'x' && !axisLocks.scale.x) {
          obj.scale.x = Math.max(0.01, dragStartScale.current.x * scaleFactor);
        } else if (axis === 'y' && !axisLocks.scale.y) {
          obj.scale.y = Math.max(0.01, dragStartScale.current.y * scaleFactor);
        } else if (axis === 'z' && !axisLocks.scale.z) {
          obj.scale.z = Math.max(0.01, dragStartScale.current.z * scaleFactor);
        } else if (axis === 'xyz') {
          const uniformScale = Math.max(0.01, scaleFactor);
          if (!axisLocks.scale.x) obj.scale.x = dragStartScale.current.x * uniformScale;
          if (!axisLocks.scale.y) obj.scale.y = dragStartScale.current.y * uniformScale;
          if (!axisLocks.scale.z) obj.scale.z = dragStartScale.current.z * uniformScale;
        }

        updateSelectionOutlines();
        updateTransformValues();
      } else if (selectedObjectsRef.current.length > 1) {
        // Multi-object scaling - global vs local
        if (currentTransformSpaceRef.current === 'global') {
          // Global: scale objects from collective center maintaining relative positions
          console.log('🌍 GLOBAL SCALE:', { axis, scaleFactor, objectCount: selectedObjectsRef.current.length });
          selectedObjectsRef.current.forEach((obj, index) => {
            const startPos = dragStartPositions.current[index];
            const startScale = dragStartScales.current[index];
            if (startPos && startScale) {
              // Scale position relative to initial center
              const relativePos = startPos.clone().sub(dragStartPoint.current);
              relativePos.multiplyScalar(scaleFactor);
              obj.position.copy(dragStartPoint.current).add(relativePos);
              
              // Apply scale
              if (axis === 'x' && !axisLocks.scale.x) {
                obj.scale.x = Math.max(0.01, startScale.x * scaleFactor);
              } else if (axis === 'y' && !axisLocks.scale.y) {
                obj.scale.y = Math.max(0.01, startScale.y * scaleFactor);
              } else if (axis === 'z' && !axisLocks.scale.z) {
                obj.scale.z = Math.max(0.01, startScale.z * scaleFactor);
              } else if (axis === 'xyz') {
                const uniformScale = Math.max(0.01, scaleFactor);
                if (!axisLocks.scale.x) obj.scale.x = startScale.x * uniformScale;
                if (!axisLocks.scale.y) obj.scale.y = startScale.y * uniformScale;
                if (!axisLocks.scale.z) obj.scale.z = startScale.z * uniformScale;
              }
              
              // Force update
              obj.updateMatrix();
              obj.updateMatrixWorld();
            }
          });
        } else {
          // Local: scale each object individually around its own center
          console.log('📍 LOCAL SCALE:', { axis, scaleFactor, objectCount: selectedObjectsRef.current.length });
          selectedObjectsRef.current.forEach((obj, index) => {
            const startScale = dragStartScales.current[index];
            if (startScale) {
              // Apply scale without moving position
              if (axis === 'x' && !axisLocks.scale.x) {
                obj.scale.x = Math.max(0.01, startScale.x * scaleFactor);
              } else if (axis === 'y' && !axisLocks.scale.y) {
                obj.scale.y = Math.max(0.01, startScale.y * scaleFactor);
              } else if (axis === 'z' && !axisLocks.scale.z) {
                obj.scale.z = Math.max(0.01, startScale.z * scaleFactor);
              } else if (axis === 'xyz') {
                const uniformScale = Math.max(0.01, scaleFactor);
                if (!axisLocks.scale.x) obj.scale.x = startScale.x * uniformScale;
                if (!axisLocks.scale.y) obj.scale.y = startScale.y * uniformScale;
                if (!axisLocks.scale.z) obj.scale.z = startScale.z * uniformScale;
              }
              
              // Force update
              obj.updateMatrix();
              obj.updateMatrixWorld();
            }
          });
        }
        
        updateSelectionOutlines();
        updateGizmoPosition();
        updateTransformValues();
      }
    }
    
    // Force render
    if (rendererRef.current && sceneRef.current && cameraRef.current) {
      rendererRef.current.render(sceneRef.current, cameraRef.current);
    }
  }, [axisLocks, updateGizmoPosition, updateSelectionOutlines, updateTransformValues]);

  // Restore scene from persistent data
  const restoreSceneFromPersistentData = useCallback(() => {
    if (!sceneRef.current) return;

    console.log('Restoring from persistent data:', {
      objects: persistentSceneData.current.objects.size,
      groups: persistentSceneData.current.groups.size,
      lights: persistentSceneData.current.lights.length
    });

    // Restore objects
    persistentSceneData.current.objects.forEach((mesh, id) => {
      if (!sceneRef.current.getObjectById(mesh.id)) {
        sceneRef.current.add(mesh);
        mediaObjectsRef.current.set(id, mesh);
        
        // Re-attach to scene if needed
        if (!mesh.parent) {
          sceneRef.current.add(mesh);
        }
      }
    });

    // Restore groups
    persistentSceneData.current.groups.forEach((group, id) => {
      if (!sceneRef.current.getObjectById(group.id)) {
        sceneRef.current.add(group);
        groupsRef.current.set(id, group);
      }
    });

    // Restore lights state
    if (persistentSceneData.current.lights.length > 0) {
      setLights(persistentSceneData.current.lights);
      // Note: initializeLighting will be called by the main useEffect
    }

    // Update state
    const restoredObjects = [];
    persistentSceneData.current.objects.forEach((mesh, id) => {
      const mediaInfo = mesh.userData.mediaInfo;
      if (mediaInfo) {
        restoredObjects.push({
          id: mediaInfo.id,
          name: mediaInfo.name,
          type: mediaInfo.type,
          mesh: mesh,
          thumbnail: mediaInfo.thumbnail,
          url: mediaInfo.url
        });
      }
    });
    
    console.log('Restored objects:', restoredObjects.length);
    setObjects(restoredObjects);
  }, []);

  // Enhanced keyboard handler
  const handleKeyDown = (event) => {
    // Handle Ctrl/Cmd combinations
    if (event.ctrlKey || event.metaKey) {
      switch (event.key.toLowerCase()) {
        case 'a':
          event.preventDefault();
          selectAllObjects();
          break;
        case 'g':
          event.preventDefault();
          if (selectedObjectsRef.current.length > 1) {
            createGroup();
          }
          break;
        case 'd':
          event.preventDefault();
          if (selectedObjectsRef.current.length > 0) {
            duplicateSelectedObjects();
          }
          break;
        case 'c':
          event.preventDefault();
          // Copy selected objects (store in clipboard)
          if (selectedObjectsRef.current.length > 0) {
            // Implementation for copy
          }
          break;
        case 'v':
          event.preventDefault();
          // Paste objects
          // Implementation for paste
          break;
      }
      return;
    }

    // Regular shortcuts
    const handler = keyboardShortcuts[event.key.toLowerCase()];
    if (handler) {
      handler();
    }
  };

  // Initialize scene
  useEffect(() => {
    if (!mountRef.current) return;

    console.log('Initializing 3D viewport...');

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(darkMode ? 0x1a1a1a : 0xf0f0f0);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      75,
      mountRef.current.clientWidth / mountRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(5, 5, 5);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      antialias: true, // Will be updated by performance mode effect
      powerPreference: "high-performance",
      preserveDrawingBuffer: false,
      stencil: false,
      depth: true
    });

    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const orbitControls = new OrbitControls(camera, renderer.domElement);
    orbitControls.enableDamping = true;
    orbitControls.dampingFactor = 0.05;
    orbitControlsRef.current = orbitControls;

    const transformControls = new TransformControls(camera, renderer.domElement);
    transformControls.visible = false;
    scene.add(transformControls);
    transformControlsRef.current = transformControls;
    
    // Add event listeners for transform controls
    transformControls.addEventListener('change', () => {
      if (rendererRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
      updateTransformValues();
    });
    
    transformControls.addEventListener('dragging-changed', (event) => {
      if (orbitControlsRef.current) {
        orbitControlsRef.current.enabled = !event.value;
      }
    });

    const raycaster = new THREE.Raycaster();
    raycasterRef.current = raycaster;

    const gridHelper = new THREE.GridHelper(20, 20, 0x888888, 0x444444);
    gridHelper.name = 'grid';
    scene.add(gridHelper);

    const axesHelper = new THREE.AxesHelper(5);
    axesHelper.name = 'axes';
    scene.add(axesHelper);

    // Always restore from persistent data if available
    if (persistentSceneData.current.objects.size > 0 || persistentSceneData.current.lights.length > 0) {
      console.log('Restoring scene from persistent data...');
      restoreSceneFromPersistentData();
    }
    
    // Always initialize lighting (will use restored lights if available)
    initializeLighting();

    // Optimized animation loop
    let lastTime = 0;
    const targetFPS = 60; // Always use 60fps during initialization
    const frameTime = 1000 / targetFPS;

    const animate = (currentTime) => {
      animationFrameRef.current = requestAnimationFrame(animate);

      const deltaTime = currentTime - lastTime;

      if (deltaTime >= frameTime) {
        orbitControls.update();

        // Update video textures only if needed
        if (previewMode === 'live' && videoTexturesRef.current.size > 0) {
          videoTexturesRef.current.forEach((texture, id) => {
            const video = videoElementsRef.current.get(id);
            if (video && !video.paused && video.readyState >= 2) {
              texture.needsUpdate = true;
            }
          });
        }

        renderer.render(scene, camera);
        lastTime = currentTime - (deltaTime % frameTime);
      }
    };

    animate(0);

    const handleResize = () => {
      if (!mountRef.current || !camera || !renderer) return;
      const width = mountRef.current.clientWidth;
      const height = mountRef.current.clientHeight;

      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    if (mountRef.current) {
      resizeObserver.observe(mountRef.current);
    }

    const handleMouseClick = (event) => {
      if (!mountRef.current || contextMenu || isDraggingGizmo.current) return;

      const rect = mountRef.current.getBoundingClientRect();
      mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouseRef.current, camera);

      if (customGizmoRef.current && customGizmoRef.current.visible) {
        const gizmoObjects = [];
        customGizmoRef.current.traverse((child) => {
          if (child.isMesh && child.userData.axis) {
            gizmoObjects.push(child);
          }
        });

        const gizmoIntersects = raycaster.intersectObjects(gizmoObjects, false);
        if (gizmoIntersects.length > 0) {
          return;
        }
      }

      const clickableObjects = [];
      scene.traverse((child) => {
        if (child.isMesh && (child.userData.isMediaObject ||
          child.userData.isLight ||
          (child.parent && child.parent.userData.isMediaObject))) {
          clickableObjects.push(child);
        }
      });

      const intersects = raycaster.intersectObjects(clickableObjects, true);

      if (intersects.length > 0) {
        let targetObject = intersects[0].object;

        while (targetObject && !targetObject.userData.isMediaObject &&
          !targetObject.userData.isGroup &&
          !targetObject.userData.isLight) {
          targetObject = targetObject.parent;
        }

        if (targetObject) {
          if (event.detail === 2) {
            frameObject(targetObject);
          } else {
            if (event.shiftKey || event.ctrlKey || event.metaKey) {
              toggleObjectSelection(targetObject);
            } else {
              selectObject(targetObject);
            }
          }
        }
      } else if (!event.shiftKey && !event.ctrlKey && !event.metaKey) {
        clearSelection();
      }
    };

    const handleContextMenu = (event) => {
      event.preventDefault();

      const rect = mountRef.current.getBoundingClientRect();
      mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouseRef.current, camera);

      const clickableObjects = [];
      scene.traverse((child) => {
        if (child.isMesh && (child.userData.isMediaObject ||
          child.userData.isLight ||
          (child.parent && child.parent.userData.isMediaObject))) {
          clickableObjects.push(child);
        }
      });

      const intersects = raycaster.intersectObjects(clickableObjects, true);

      if (intersects.length > 0 || selectedObjectsRef.current.length > 0) {
        let targetObject = null;
        if (intersects.length > 0) {
          targetObject = intersects[0].object;
          while (targetObject && !targetObject.userData.isMediaObject &&
            !targetObject.userData.isGroup &&
            !targetObject.userData.isLight) {
            targetObject = targetObject.parent;
          }
        }

        setContextMenu({
          x: event.clientX,
          y: event.clientY,
          object: targetObject
        });
      }
    };

    const handleClickOutside = () => {
      setContextMenu(null);
    };

    // Add event listeners using the listener manager
    listenerManager.current.add(renderer.domElement, 'mousemove', handleGizmoInteraction);
    listenerManager.current.add(renderer.domElement, 'mousedown', handleGizmoInteraction);
    listenerManager.current.add(window, 'mouseup', handleGizmoInteraction);
    listenerManager.current.add(window, 'mousemove', handleGizmoDrag);
    listenerManager.current.add(renderer.domElement, 'click', handleMouseClick);
    listenerManager.current.add(renderer.domElement, 'contextmenu', handleContextMenu);
    listenerManager.current.add(document, 'click', handleClickOutside);
    listenerManager.current.add(window, 'keydown', handleKeyDown);

    return () => {
      console.log('Cleaning up 3D viewport (preserving persistent data)...');
      
      // Note: We intentionally do NOT clear persistentSceneData here
      // This allows the scene to be restored when the viewport is reopened
      
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      listenerManager.current.removeAll();

      if (resizeObserver) {
        resizeObserver.disconnect();
      }

      videoElementsRef.current.forEach((video, id) => {
        cleanupVideo(id);
      });

      // Dispose custom gizmo
      if (customGizmoRef.current) {
        if (customGizmoRef.current.parent) {
          customGizmoRef.current.parent.remove(customGizmoRef.current);
        }
        if (customGizmoRef.current.dispose) {
          customGizmoRef.current.dispose();
        }
        customGizmoRef.current = null;
      }
      
      // Dispose all gizmos
      Object.values(gizmosRef.current).forEach(gizmo => {
        if (gizmo) {
          if (gizmo.parent) {
            gizmo.parent.remove(gizmo);
          }
          if (gizmo.dispose) {
            gizmo.dispose();
          }
        }
      });
      gizmosRef.current = { translate: null, rotate: null, scale: null };

      const objectsToDispose = [];
      scene.traverse((child) => {
        if (child instanceof THREE.Mesh || child.isMesh || child.isObject3D) {
          objectsToDispose.push(child);
        }
      });

      // Clear all children from scene first
      while (scene.children.length > 0) {
        scene.remove(scene.children[0]);
      }

      // Then dispose of collected objects
      objectsToDispose.forEach(obj => {
        if (obj && obj.parent) {
          obj.parent.remove(obj);
        }
        disposeThreeObject(obj);
      });

      if (renderer) {
        renderer.renderLists.dispose();
        renderer.dispose();
        if (mountRef.current && renderer.domElement) {
          mountRef.current.removeChild(renderer.domElement);
        }
      }

      sceneRef.current = null;
      rendererRef.current = null;
      cameraRef.current = null;
      orbitControlsRef.current = null;
    };
  }, []); // Remove performanceMode dependency to prevent full re-initialization

  // Update background color when darkMode changes
  useEffect(() => {
    if (sceneRef.current) {
      sceneRef.current.background = new THREE.Color(darkMode ? 0x1a1a1a : 0xf0f0f0);
    }
  }, [darkMode]);
  
  // Update renderer settings when performance mode changes
  useEffect(() => {
    if (!rendererRef.current) return;
    
    // Update renderer settings without recreating the scene
    rendererRef.current.setPixelRatio(performanceMode ? 1 : Math.min(window.devicePixelRatio, 2));
    rendererRef.current.shadowMap.enabled = !performanceMode;
    rendererRef.current.shadowMap.type = performanceMode ? THREE.BasicShadowMap : THREE.PCFSoftShadowMap;
    
    // Update existing textures
    sceneRef.current?.traverse((child) => {
      if (child.material && child.material.map) {
        child.material.map.minFilter = performanceMode ? THREE.NearestFilter : THREE.LinearFilter;
        child.material.map.magFilter = performanceMode ? THREE.NearestFilter : THREE.LinearFilter;
        child.material.map.needsUpdate = true;
      }
    });
  }, [performanceMode]);


  const initializeLighting = useCallback(() => {
    if (!sceneRef.current) return;

    // Store light data in persistent storage
    persistentSceneData.current.lights = lights;
    
    // Clear existing lights first to avoid duplicates
    lightsRef.current.forEach(light => {
      sceneRef.current.remove(light);
      const helper = sceneRef.current.getObjectByName(`${light.name}_helper`);
      if (helper) sceneRef.current.remove(helper);
    });
    lightsRef.current = [];

    lights.forEach(light => {
      let lightObj;

      if (light.type === 'ambient') {
        lightObj = new THREE.AmbientLight(light.color, light.intensity);
      } else if (light.type === 'directional') {
        lightObj = new THREE.DirectionalLight(light.color, light.intensity);
        lightObj.position.set(light.position.x, light.position.y, light.position.z);
        lightObj.castShadow = true;

        const helper = new THREE.DirectionalLightHelper(lightObj, 2);
        helper.name = `${light.id}_helper`;
        sceneRef.current.add(helper);
      } else if (light.type === 'point') {
        lightObj = new THREE.PointLight(light.color, light.intensity, light.distance || 100);
        lightObj.position.set(light.position.x, light.position.y, light.position.z);

        const helper = new THREE.PointLightHelper(lightObj, 1);
        helper.name = `${light.id}_helper`;
        sceneRef.current.add(helper);
      } else if (light.type === 'spot') {
        lightObj = new THREE.SpotLight(light.color, light.intensity);
        lightObj.position.set(light.position.x, light.position.y, light.position.z);
        lightObj.angle = light.angle || Math.PI / 4;
        lightObj.penumbra = light.penumbra || 0.1;
        lightObj.castShadow = true;

        const helper = new THREE.SpotLightHelper(lightObj);
        helper.name = `${light.id}_helper`;
        sceneRef.current.add(helper);
      }

      if (lightObj) {
        lightObj.name = light.id;
        lightObj.userData.isLight = true;
        lightObj.userData.lightInfo = light;
        lightObj.visible = light.enabled;
        sceneRef.current.add(lightObj);
        lightsRef.current.push(lightObj);
      }
    });
  }, [lights]);

  const updateLight = (lightId, property, value) => {
    setLights(prev => prev.map(light =>
      light.id === lightId ? { ...light, [property]: value } : light
    ));

    const lightObj = sceneRef.current.getObjectByName(lightId);
    if (lightObj) {
      if (property === 'intensity') {
        lightObj.intensity = value;
      } else if (property === 'color') {
        lightObj.color = new THREE.Color(value);
      } else if (property === 'enabled') {
        lightObj.visible = value;
        const helper = sceneRef.current.getObjectByName(`${lightId}_helper`);
        if (helper) helper.visible = value;
      } else if (property === 'position') {
        lightObj.position.set(value.x, value.y, value.z);
      }
    }

    // Update persistent data
    persistentSceneData.current.lights = lights;
  };

  const addLight = (type) => {
    const newLight = {
      id: `${type}_${Date.now()}`,
      type,
      intensity: type === 'ambient' ? 0.3 : 1,
      color: '#ffffff',
      enabled: true,
      position: type !== 'ambient' ? { x: 5, y: 5, z: 5 } : undefined
    };

    setLights(prev => [...prev, newLight]);

    let lightObj;
    if (type === 'ambient') {
      lightObj = new THREE.AmbientLight(newLight.color, newLight.intensity);
    } else if (type === 'directional') {
      lightObj = new THREE.DirectionalLight(newLight.color, newLight.intensity);
      lightObj.position.set(5, 5, 5);
      lightObj.castShadow = true;

      const helper = new THREE.DirectionalLightHelper(lightObj, 2);
      helper.name = `${newLight.id}_helper`;
      sceneRef.current.add(helper);
    } else if (type === 'point') {
      lightObj = new THREE.PointLight(newLight.color, newLight.intensity, 100);
      lightObj.position.set(5, 5, 5);

      const helper = new THREE.PointLightHelper(lightObj, 1);
      helper.name = `${newLight.id}_helper`;
      sceneRef.current.add(helper);
    } else if (type === 'spot') {
      lightObj = new THREE.SpotLight(newLight.color, newLight.intensity);
      lightObj.position.set(5, 5, 5);
      lightObj.angle = Math.PI / 4;
      lightObj.penumbra = 0.1;
      lightObj.castShadow = true;

      const helper = new THREE.SpotLightHelper(lightObj);
      helper.name = `${newLight.id}_helper`;
      sceneRef.current.add(helper);
    }

    if (lightObj) {
      lightObj.name = newLight.id;
      lightObj.userData.isLight = true;
      lightObj.userData.lightInfo = newLight;
      sceneRef.current.add(lightObj);
      lightsRef.current.push(lightObj);
    }

    // Update persistent data
    persistentSceneData.current.lights = [...persistentSceneData.current.lights, newLight];
  };

  const deleteLight = (lightId) => {
    setLights(prev => prev.filter(l => l.id !== lightId));

    const lightObj = sceneRef.current.getObjectByName(lightId);
    if (lightObj) {
      sceneRef.current.remove(lightObj);
      const helper = sceneRef.current.getObjectByName(`${lightId}_helper`);
      if (helper) sceneRef.current.remove(helper);
    }

    // Update persistent data
    persistentSceneData.current.lights = persistentSceneData.current.lights.filter(l => l.id !== lightId);
  };

  useEffect(() => {
    // Update refs with current values
    currentTransformModeRef.current = transformMode;
    currentTransformSpaceRef.current = transformSpace;
    
    if (transformControlsRef.current) {
      transformControlsRef.current.setMode(transformMode);
      // Ensure transform controls are only visible for single selection
      if (selectedObjectsRef.current.length === 1) {
        transformControlsRef.current.visible = true;
      } else {
        transformControlsRef.current.visible = false;
        transformControlsRef.current.detach();
      }
    }
    
    // Update custom gizmo for multi-selection
    updateGizmoForMode();
  }, [transformMode, transformSpace, updateGizmoForMode]);

  useEffect(() => {
    if (sceneRef.current) {
      const grid = sceneRef.current.getObjectByName('grid');
      if (grid) grid.visible = showGrid;
    }
  }, [showGrid]);

  useEffect(() => {
    if (sceneRef.current) {
      const axes = sceneRef.current.getObjectByName('axes');
      if (axes) axes.visible = showAxes;
    }
  }, [showAxes]);

  useEffect(() => {
    if (transformControlsRef.current) {
      const mode = transformMode;
      transformControlsRef.current.showX = !axisLocks[mode]?.x;
      transformControlsRef.current.showY = !axisLocks[mode]?.y;
      transformControlsRef.current.showZ = !axisLocks[mode]?.z;
    }
  }, [axisLocks, transformMode]);

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200">
      {/* Resource Monitor */}
      {showResourceMonitor && (
        <ResourceMonitor
          rendererRef={rendererRef}
          onForceCleanup={forceCleanup}
        />
      )}
      
      {/* Docked Transform Panel */}
      {isTransformPanelDocked && selectedObjects.length === 1 && (
        <div className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-2 overflow-x-auto">
          <div className="flex items-center gap-4 min-w-fit">
            <button
              onClick={() => setIsTransformPanelDocked(false)}
              className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 flex-shrink-0"
              title="Undock panel"
            >
              <X size={16} />
            </button>
            
            {/* Position */}
            <div className="flex flex-col">
              <span className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Position</span>
              <div className="flex items-center gap-2">
                {['x', 'y', 'z'].map(axis => (
                  <div key={axis} className="flex items-center gap-1">
                    <button
                      onClick={() => handleAxisLockChange('position', axis, !axisLocks.position[axis])}
                      className={`p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 ${
                        axisLocks.position[axis] ? 'text-orange-500' : 'text-gray-400'
                      }`}
                    >
                      {axisLocks.position[axis] ? <Lock size={10} /> : <Unlock size={10} />}
                    </button>
                    <span className="text-xs font-medium">{axis.toUpperCase()}:</span>
                    <input
                      type="number"
                      value={transformValues.position[axis]}
                      onChange={(e) => handleTransformChange('position', axis, e.target.value)}
                      disabled={axisLocks.position[axis]}
                      className="w-12 px-1 py-0.5 text-xs border rounded dark:bg-gray-700 dark:border-gray-600 disabled:bg-gray-100 dark:disabled:bg-gray-800"
                      step="0.1"
                    />
                  </div>
                ))}
              </div>
            </div>
            
            {/* Rotation */}
            <div className="flex flex-col">
              <span className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Rotation</span>
              <div className="flex items-center gap-2">
                {['x', 'y', 'z'].map(axis => (
                  <div key={axis} className="flex items-center gap-1">
                    <button
                      onClick={() => handleAxisLockChange('rotation', axis, !axisLocks.rotation[axis])}
                      className={`p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 ${
                        axisLocks.rotation[axis] ? 'text-orange-500' : 'text-gray-400'
                      }`}
                    >
                      {axisLocks.rotation[axis] ? <Lock size={10} /> : <Unlock size={10} />}
                    </button>
                    <span className="text-xs font-medium">{axis.toUpperCase()}:</span>
                    <input
                      type="number"
                      value={transformValues.rotation[axis]}
                      onChange={(e) => handleTransformChange('rotation', axis, e.target.value)}
                      disabled={axisLocks.rotation[axis]}
                      className="w-12 px-1 py-0.5 text-xs border rounded dark:bg-gray-700 dark:border-gray-600 disabled:bg-gray-100 dark:disabled:bg-gray-800"
                      step="1"
                    />
                    <span className="text-xs text-gray-500">°</span>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Scale */}
            <div className="flex flex-col">
              <span className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Scale</span>
              <div className="flex items-center gap-2">
                {['x', 'y', 'z'].map(axis => (
                  <div key={axis} className="flex items-center gap-1">
                    <button
                      onClick={() => handleAxisLockChange('scale', axis, !axisLocks.scale[axis])}
                      className={`p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 ${
                        axisLocks.scale[axis] ? 'text-orange-500' : 'text-gray-400'
                      }`}
                    >
                      {axisLocks.scale[axis] ? <Lock size={10} /> : <Unlock size={10} />}
                    </button>
                    <span className="text-xs font-medium">{axis.toUpperCase()}:</span>
                    <input
                      type="number"
                      value={transformValues.scale[axis]}
                      onChange={(e) => handleTransformChange('scale', axis, e.target.value)}
                      disabled={axisLocks.scale[axis]}
                      className="w-12 px-1 py-0.5 text-xs border rounded dark:bg-gray-700 dark:border-gray-600 disabled:bg-gray-100 dark:disabled:bg-gray-800"
                      step="0.1"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="p-2 border-b border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-shrink-0 min-w-0">
            <h3 className="font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap">3D Viewport</h3>
            <span className="text-sm text-gray-500 dark:text-gray-400 hidden sm:inline whitespace-nowrap">
              ({objects.length} objects, {selectedObjects.length} selected)
            </span>
            {performanceMode && (
              <span className="text-xs bg-yellow-500 text-black px-2 py-1 rounded hidden sm:inline-block whitespace-nowrap">
                Performance Mode
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 min-w-0">
          <div className="flex items-center gap-1 border-r pr-2 mr-2">
            <button
              onClick={() => {
                console.log('🔘 BUTTON CLICK: translate');
                setTransformMode('translate');
              }}
              className={`p-1.5 rounded ${transformMode === 'translate' ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100'}`}
              title="Move (W)"
            >
              <Move size={16} />
            </button>
            <button
              onClick={() => {
                console.log('🔘 BUTTON CLICK: rotate');
                setTransformMode('rotate');
              }}
              className={`p-1.5 rounded ${transformMode === 'rotate' ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100'}`}
              title="Rotate (E)"
            >
              <RotateCw size={16} />
            </button>
            <button
              onClick={() => {
                console.log('🔘 BUTTON CLICK: scale');
                setTransformMode('scale');
              }}
              className={`p-1.5 rounded ${transformMode === 'scale' ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100'}`}
              title="Scale (R)"
            >
              <Maximize2 size={16} />
            </button>
            
            {/* Transform Space Toggle - only show for multi-selection */}
            {selectedObjects.length > 1 && (
              <button
                onClick={() => {
                  const newSpace = transformSpace === 'global' ? 'local' : 'global';
                  console.log('🌐 BUTTON CLICK: transform space', newSpace);
                  setTransformSpace(newSpace);
                }}
                className={`p-1.5 rounded text-xs font-semibold ${
                  transformSpace === 'global' 
                    ? 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-300' 
                    : 'bg-orange-100 text-orange-600 dark:bg-orange-900 dark:text-orange-300'
                }`}
                title={`${transformSpace === 'global' ? 'Global' : 'Local'} Transform Mode (X)`}
              >
                {transformSpace === 'global' ? 'GLB' : 'LOC'}
              </button>
            )}
          </div>

          {selectedObjects.length > 1 && (
            <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400 flex-shrink-0">
              <button
                onClick={() => alignObjects('left')}
                className="p-1.5 rounded hover:bg-gray-100"
                title="Align Left"
              >
                <AlignHorizontalJustifyStart size={16} />
              </button>
              <button
                onClick={() => alignObjects('center-x')}
                className="p-1.5 rounded hover:bg-gray-100"
                title="Align Center X"
              >
                <AlignHorizontalJustifyCenter size={16} />
              </button>
              <button
                onClick={() => alignObjects('right')}
                className="p-1.5 rounded hover:bg-gray-100"
                title="Align Right"
              >
                <AlignHorizontalJustifyEnd size={16} />
              </button>
            </div>
          )}
          
          {selectedObjects.length > 1 && (
            <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400 border-l pl-2 ml-1 flex-shrink-0">
              <button
                onClick={() => alignObjects('top')}
                className="p-1.5 rounded hover:bg-gray-100"
                title="Align Top"
              >
                <AlignVerticalJustifyStart size={16} />
              </button>
              <button
                onClick={() => alignObjects('center-y')}
                className="p-1.5 rounded hover:bg-gray-100"
                title="Align Center Y"
              >
                <AlignVerticalJustifyCenter size={16} />
              </button>
              <button
                onClick={() => alignObjects('bottom')}
                className="p-1.5 rounded hover:bg-gray-100"
                title="Align Bottom"
              >
                <AlignVerticalJustifyEnd size={16} />
              </button>
            </div>
          )}
          
          {selectedObjects.length > 1 && (
            <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400 border-l pl-2 ml-1 flex-shrink-0">
              <button
                onClick={() => alignObjects('distribute-x')}
                className="p-1.5 rounded hover:bg-gray-100"
                title="Distribute X"
              >
                <AlignHorizontalDistributeCenter size={16} />
              </button>
              <button
                onClick={() => alignObjects('distribute-y')}
                className="p-1.5 rounded hover:bg-gray-100"
                title="Distribute Y"
              >
                <AlignVerticalDistributeCenter size={16} />
              </button>
            </div>
          )}

          {selectedObjects.length > 0 && (
            <button
              onClick={() => setShowLookAtTool(!showLookAtTool)}
              className={`p-1.5 rounded ${showLookAtTool ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100'} flex-shrink-0`}
              title="Look At Tool"
            >
              <Eye size={16} />
            </button>
          )}

          <button
            onClick={() => setShowGrid(!showGrid)}
            className={`p-1.5 rounded ${showGrid ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100'} hidden sm:block flex-shrink-0`}
            title="Toggle Grid (G)"
          >
            <Grid size={16} />
          </button>
          <button
            onClick={() => setShowAxes(!showAxes)}
            className={`p-1.5 rounded ${showAxes ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100'} hidden sm:block flex-shrink-0`}
            title="Toggle Axes"
          >
            <Box size={16} />
          </button>

          <button
            onClick={cyclePreviewMode}
            className={`p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 flex-shrink-0`}
            title={previewMode === 'off' ? 'Preview: OFF (Click selects)' :
              previewMode === 'live' ? 'Preview: LIVE (Videos autoplay)' :
                'Preview: HOVER (Videos play on hover)'}
          >
            {previewMode === 'off' && <EyeOff size={16} />}
            {previewMode === 'live' && <Eye size={16} />}
            {previewMode === 'hover' && <MousePointer2Icon size={16} />}
          </button>

          <button
            onClick={() => setPerformanceMode(!performanceMode)}
            className={`p-1.5 rounded ${performanceMode ? 'bg-yellow-100 text-yellow-600' : 'hover:bg-gray-100'} flex-shrink-0`}
            title="Performance Mode (P)"
          >
            {performanceMode ? <Zap size={16} /> : <ZapOff size={16} />}
          </button>

          <button
            onClick={() => setShowAutoArrange(!showAutoArrange)}
            className={`p-1.5 rounded ${showAutoArrange ? 'bg-green-100 text-green-600' : 'hover:bg-gray-100'} ${viewportWidth < 768 ? 'hidden' : 'block'} flex-shrink-0`}
            title="Auto Arrange"
          >
            <Shuffle size={16} />
          </button>
          <button
            onClick={() => setShowLightingPanel(!showLightingPanel)}
            className={`p-1.5 rounded ${showLightingPanel ? 'bg-yellow-100 text-yellow-600' : 'hover:bg-gray-100'} ${viewportWidth < 1024 ? 'hidden' : 'block'} flex-shrink-0`}
            title="Lighting Controls (L)"
          >
            <Lightbulb size={16} />
          </button>
          <button
            onClick={() => setShowLayersPanel(!showLayersPanel)}
            className={`p-1.5 rounded ${showLayersPanel ? 'bg-purple-100 text-purple-600' : 'hover:bg-gray-100'} ${viewportWidth < 1024 ? 'hidden' : 'block'} flex-shrink-0`}
            title="Layers Panel"
          >
            <Layers size={16} />
          </button>
          <button
            onClick={() => setShowResourceMonitor(!showResourceMonitor)}
            className={`p-1.5 rounded ${showResourceMonitor ? 'bg-red-100 text-red-600' : 'hover:bg-gray-100'} ${viewportWidth < 1280 ? 'hidden' : 'block'} flex-shrink-0`}
            title="Resource Monitor (M)"
          >
            <Activity size={16} />
          </button>
          <button
            onClick={() => setShowHelp(!showHelp)}
            className={`p-1.5 rounded ${showHelp ? 'bg-gray-100 text-gray-600' : 'hover:bg-gray-100'} flex-shrink-0`}
            title="Help (H)"
          >
            <HelpCircle size={16} />
          </button>
          
          {/* More menu for overflow */}
          <div className="relative flex-shrink-0" data-more-menu>
            <button
              onClick={() => setShowMoreMenu(!showMoreMenu)}
              className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
              title="More options"
              data-more-button
            >
              <MoreVertical size={16} />
            </button>
            {showMoreMenu && (
              <div className="absolute right-0 top-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 z-50 min-w-[160px]">
                <button
                  onClick={() => { setShowGrid(!showGrid); setShowMoreMenu(false); }}
                  className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                >
                  <Grid size={14} />
                  Toggle Grid
                </button>
                <button
                  onClick={() => { setShowAxes(!showAxes); setShowMoreMenu(false); }}
                  className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                >
                  <Box size={14} />
                  Toggle Axes
                </button>
                <button
                  onClick={() => { setShowAutoArrange(!showAutoArrange); setShowMoreMenu(false); }}
                  className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 block md:hidden"
                >
                  <Shuffle size={14} />
                  Auto Arrange
                </button>
                <button
                  onClick={() => { setShowLightingPanel(!showLightingPanel); setShowMoreMenu(false); }}
                  className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 block lg:hidden"
                >
                  <Lightbulb size={14} />
                  Lighting
                </button>
                <button
                  onClick={() => { setShowLayersPanel(!showLayersPanel); setShowMoreMenu(false); }}
                  className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 block lg:hidden"
                >
                  <Layers size={14} />
                  Layers
                </button>
                <hr className="my-1 border-gray-200 dark:border-gray-700" />
                <button
                  onClick={() => { addStandardGridToViewport(); setShowMoreMenu(false); }}
                  className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                >
                  <Plus size={14} />
                  Add Grid
                </button>
                <button
                  onClick={() => { addFreeGridToViewport(); setShowMoreMenu(false); }}
                  className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                >
                  <Plus size={14} />
                  Add Free Grid
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1 border-l pl-2 ml-2 flex-shrink-0">
            <button
              onClick={addStandardGridToViewport}
              className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
              title="Add Standard Grid to Viewport"
            >
              + Grid
            </button>
            <button
              onClick={addFreeGridToViewport}
              className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
              title="Add Free Grid to Viewport"
            >
              + Free
            </button>
          </div>
        </div>
      </div>
    </div>

      <div className="flex flex-1 overflow-hidden">
        {showLayersPanel && (
          <div className="w-64 border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-2 overflow-y-auto">
            <h3 className="font-medium text-sm mb-2">Scene Hierarchy</h3>
            <div className="space-y-1">
              {renderSceneHierarchy()}
            </div>
          </div>
        )}

        <div
          ref={mountRef}
          className="flex-1 relative overflow-hidden"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          {contextMenu && (
            <div
              className="absolute bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded shadow-lg py-1 z-50"
              style={{ left: contextMenu.x, top: contextMenu.y }}
            >
              {selectedObjectsRef.current.length > 1 && (
                <button
                  onClick={() => {
                    createGroup();
                    setContextMenu(null);
                  }}
                  className="w-full px-3 py-1 text-sm text-left hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <GroupIcon size={14} className="inline mr-2" />
                  Group Selected
                </button>
              )}
              {selectedObjectsRef.current.some(obj => obj.parent?.userData.isGroup) && (
                <button
                  onClick={() => {
                    ungroupSelected();
                    setContextMenu(null);
                  }}
                  className="w-full px-3 py-1 text-sm text-left hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  Ungroup
                </button>
              )}
              {selectedObjectsRef.current.length > 0 && (
                <button
                  onClick={() => {
                    duplicateSelectedObjects();
                    setContextMenu(null);
                  }}
                  className="w-full px-3 py-1 text-sm text-left hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  Duplicate (Ctrl+D)
                </button>
              )}
              <button
                onClick={() => {
                  deleteSelectedObjects();
                  setContextMenu(null);
                }}
                className="w-full px-3 py-1 text-sm text-left hover:bg-gray-100 dark:hover:bg-gray-700 text-red-600"
              >
                <Trash2 size={14} className="inline mr-2" />
                Delete
              </button>
            </div>
          )}

          {showAutoArrange && (
            <div className="absolute top-4 left-4 z-40 max-w-2xl">
              <AutoArrangePanel
                items={objects.map(obj => ({
                  id: obj.id,
                  originalId: obj.id,
                  x: mediaObjectsRef.current.get(obj.id)?.position.x || 0,
                  y: mediaObjectsRef.current.get(obj.id)?.position.y || 0,
                  z: mediaObjectsRef.current.get(obj.id)?.position.z || 0,
                  width: 2,
                  height: 2,
                  rotation: (mediaObjectsRef.current.get(obj.id)?.rotation.z || 0) * 180 / Math.PI
                }))}
                darkMode={darkMode}
                onArrange={autoArrangeObjects}
              />
              <button
                onClick={() => setShowAutoArrange(false)}
                className="absolute top-4 right-4 p-1 rounded-full bg-white shadow-lg hover:bg-gray-100"
              >
                <X size={20} />
              </button>
            </div>
          )}

          {showLightingPanel && (
            <div className="absolute top-4 right-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 w-80 max-h-96 overflow-y-auto z-40">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium">Lighting</h3>
                <button
                  onClick={() => setShowLightingPanel(false)}
                  className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-3">
                {lights.map(light => (
                  <div key={light.id} className="border rounded p-2">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium capitalize">{light.type}</span>
                      <div className="flex items-center space-x-1">
                        <input
                          type="checkbox"
                          checked={light.enabled}
                          onChange={(e) => updateLight(light.id, 'enabled', e.target.checked)}
                          className="w-4 h-4"
                        />
                        {light.type !== 'ambient' && (
                          <button
                            onClick={() => deleteLight(light.id)}
                            className="p-1 rounded hover:bg-red-100 text-red-600"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <label className="text-xs w-16">Intensity:</label>
                        <input
                          type="range"
                          min="0"
                          max="2"
                          step="0.1"
                          value={light.intensity}
                          onChange={(e) => updateLight(light.id, 'intensity', parseFloat(e.target.value))}
                          className="flex-1"
                        />
                        <span className="text-xs w-8">{light.intensity}</span>
                      </div>

                      <div className="flex items-center space-x-2">
                        <label className="text-xs w-16">Color:</label>
                        <input
                          type="color"
                          value={light.color}
                          onChange={(e) => updateLight(light.id, 'color', e.target.value)}
                          className="w-8 h-8"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-3 flex space-x-2">
                <button
                  onClick={() => addLight('point')}
                  className="flex-1 px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  + Point
                </button>
                <button
                  onClick={() => addLight('spot')}
                  className="flex-1 px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  + Spot
                </button>
                <button
                  onClick={() => addLight('directional')}
                  className="flex-1 px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  + Directional
                </button>
              </div>
            </div>
          )}

          {/* Transform Panel */}
          {!isTransformPanelDocked && (
            <TransformPanel
              selectedObjects={selectedObjects}
              transformValues={transformValues}
              axisLocks={axisLocks}
              onTransformChange={handleTransformChange}
              onAxisLockChange={handleAxisLockChange}
              darkMode={darkMode}
              containerBounds={{
                left: 0,
                top: 0,
                right: mountRef.current?.offsetWidth || window.innerWidth,
                bottom: mountRef.current?.offsetHeight || window.innerHeight
              }}
              onDockToTop={() => setIsTransformPanelDocked(true)}
            />
          )}

          {objects.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center text-gray-400">
                <Upload size={48} className="mx-auto mb-2" />
                <p className="text-sm">Drag and drop media here</p>
                <p className="text-xs mt-1">Hold Shift to place at cursor</p>
              </div>
            </div>
          )}

          {showHelp && (
            <div className="absolute top-4 right-4 bg-black/80 text-white p-4 rounded-lg max-w-xs z-50">
              <h3 className="font-bold mb-2">Keyboard Shortcuts</h3>
              <div className="text-xs space-y-1">
                <div><kbd>W</kbd> - Move tool</div>
                <div><kbd>E</kbd> - Rotate tool</div>
                <div><kbd>R</kbd> - Scale tool</div>
                <div><kbd>F</kbd> - Frame selected</div>
                <div><kbd>A</kbd> - Frame all</div>
                <div><kbd>G</kbd> - Toggle grid</div>
                <div><kbd>H</kbd> - Toggle help</div>
                <div><kbd>L</kbd> - Toggle lighting</div>
                <div><kbd>T</kbd> - Open thumbnail generator</div>
                <div><kbd>P</kbd> - Toggle performance mode</div>
                <div><kbd>M</kbd> - Toggle resource monitor</div>
                <div><kbd>Ctrl+G</kbd> - Group selected</div>
                <div><kbd>Ctrl+D</kbd> - Duplicate selected</div>
                <div><kbd>Delete</kbd> - Delete selected</div>
                <div><kbd>Shift+Click</kbd> - Multi-select</div>
                <div><kbd>Double-click</kbd> - Frame object</div>
                <div><kbd>Ctrl+A</kbd> - Select all</div>
                <div><kbd>Escape</kbd> - Clear selection</div>
                <div><kbd>+/-</kbd> - Zoom in/out</div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-gray-200 dark:border-gray-700 p-2">
        <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex-shrink-0">Objects</h4>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => {
                if (selectedObjects.length === 1) {
                  handleOpenThumbnailGenerator(selectedObjects[0].id);
                } else {
                  setThumbnailGeneratorObject(null);
                  setShowThumbnailGenerator(true);
                }
              }}
              className="px-2 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-700 flex items-center whitespace-nowrap"
              title="Thumbnail Generator"
            >
              <Camera size={12} className="mr-1" />
              <span className="hidden sm:inline">Thumbnail Generator</span>
              <span className="sm:hidden">Thumbnails</span>
            </button>
            <button
              onClick={batchGenerateThumbnails}
              className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 flex items-center whitespace-nowrap"
              title="Quick generate all thumbnails"
            >
              <ImageIcon size={12} className="mr-1" />
              <span className="hidden sm:inline">Quick Generate</span>
              <span className="sm:hidden">Quick</span>
            </button>
          </div>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {objects.map(obj => (
            <div
              key={obj.id}
              onClick={(e) => handleThumbnailClick(obj.id, e)}
              onDoubleClick={() => handleThumbnailDoubleClick(obj.id)}
              onMouseEnter={() => handleMediaHover(obj.id, true)}
              onMouseLeave={() => handleMediaHover(obj.id, false)}
              onContextMenu={(e) => {
                e.preventDefault();
                handleThumbnailClick(obj.id, e);
                setContextMenu({
                  x: e.clientX,
                  y: e.clientY,
                  object: mediaObjectsRef.current.get(obj.id)
                });
              }}
              className={`relative flex-shrink-0 w-20 h-20 rounded border-2 cursor-pointer overflow-hidden transition-all group
               ${selectedObjects.some(s => s.id === obj.id)
                  ? 'border-blue-500 ring-2 ring-blue-300 transform scale-105'
                  : 'border-gray-300 hover:border-gray-400 hover:transform hover:scale-105'
                }`}
              title={`${obj.name}${selectedObjects.some(s => s.id === obj.id) ? ' (Selected)' : ''}`}
            >
              <MediaPreview
                media={obj}
                className="w-full h-full object-cover"
                showPlayButton={false}
              />
              {selectedObjects.some(s => s.id === obj.id) && (
                <div className="absolute inset-0 bg-blue-500 bg-opacity-20 pointer-events-none" />
              )}

              {/* Video control overlay */}
              {obj.type.startsWith('video/') && previewMode === 'off' && (
                <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const video = videoElementsRef.current.get(obj.id);
                      if (video) {
                        if (video.paused) {
                          video.play();
                        } else {
                          video.pause();
                        }
                      }
                    }}
                    className="p-0.5 bg-white rounded-full hover:bg-gray-200"
                  >
                    {videoElementsRef.current.get(obj.id)?.paused !== false ?
                      <Play size={12} className="text-gray-700" /> :
                      <Pause size={12} className="text-gray-700" />
                    }
                  </button>
                </div>
              )}

              {/* Thumbnail actions overlay */}
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-opacity flex items-center justify-center opacity-0 group-hover:opacity-100">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenThumbnailGenerator(obj.id);
                  }}
                  className="p-1 bg-white rounded hover:bg-gray-200"
                  title="Generate custom thumbnail (T)"
                >
                  <Camera size={14} className="text-gray-700" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {showGridPlacementDialog && pendingGridImport && (
        <GridPlacementDialog
          gridItems={pendingGridImport.items}
          gridConfig={gridConfig}
          onConfirm={handleGridPlacementConfirm}
          onCancel={() => {
            setShowGridPlacementDialog(false);
            setPendingGridImport(null);
          }}
          darkMode={darkMode}
        />
      )}

      {showLookAtTool && selectedObjects.length > 0 && (
        <LookAtTool
          selectedObjects={selectedObjects}
          onApplyLookAt={applyLookAt}
          onClose={() => setShowLookAtTool(false)}
        />
      )}


      {showThumbnailGenerator && (
        <ThumbnailGenerator
          object={thumbnailGeneratorObject}
          objects={thumbnailGeneratorObject ? null : objects.map(obj => ({
            id: obj.id,
            mesh: mediaObjectsRef.current.get(obj.id)
          }))}
          batchMode={!thumbnailGeneratorObject}
          onCapture={(dataURL, settings) => {
            if (thumbnailGeneratorObject) {
              handleThumbnailCapture(dataURL, settings);
            } else if (settings.objectId) {
              setObjects(prev => prev.map(obj =>
                obj.id === settings.objectId
                  ? { ...obj, thumbnail: dataURL, thumbnailSettings: settings }
                  : obj
              ));

              const mesh = mediaObjectsRef.current.get(settings.objectId);
              if (mesh && mesh.userData.mediaInfo) {
                mesh.userData.mediaInfo.thumbnail = dataURL;
                mesh.userData.mediaInfo.thumbnailSettings = settings;
              }
            }
          }}
          onBatchComplete={() => {
            setShowThumbnailGenerator(false);
            setThumbnailGeneratorObject(null);
          }}
          onClose={() => {
            setShowThumbnailGenerator(false);
            setThumbnailGeneratorObject(null);
          }}
          onRevert={thumbnailGeneratorObject ? handleThumbnailRevert : null}
          darkMode={darkMode}
          videoElements={videoElementsRef.current}
          videoTextures={videoTexturesRef.current}
        />

      )}

    </div>
  );
};

export default ThreeDViewport;