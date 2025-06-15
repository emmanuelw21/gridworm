// Updated ThreeDViewer.jsx - Fixed loading issues
import React, { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader';
import { 
  AlertTriangle, Loader, Maximize2, Minimize2, 
  RotateCw, Move, Grid
} from 'lucide-react';
import { get3DLoader, createBoundingBox, snapToGrid3D } from './helpers3D';

const ThreeDViewer = forwardRef(({ 
  media, 
  width, 
  height, 
  gridConfig,
  onTransformChange,
  transformMode = 'translate',
  viewMode = '3d',
  showGrid = true,
  showAxes = true,
  showWireframe = false,
  showBoundingBox = false,
  snapToGrid = true,
  darkMode = false,
  isSelected = false,
  autoRotate = false,
  className = '',
  onObjectLoad,
  enableInteraction = true,
  thumbnailMode = false
}, ref) => {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const orbitControlsRef = useRef(null);
  const transformControlsRef = useRef(null);
  const objectRef = useRef(null);
  const frameId = useRef(null);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modelInfo, setModelInfo] = useState({
    vertices: 0,
    faces: 0,
    materials: 0,
    animations: 0
  });

  // Expose methods to parent
  useImperativeHandle(ref, () => ({
    captureViewport: async () => {
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
        const dataURL = rendererRef.current.domElement.toDataURL('image/png');
        return dataURL;
      }
      return null;
    },
    getObject: () => objectRef.current,
    resetCamera: () => {
      if (orbitControlsRef.current && objectRef.current) {
        const box = new THREE.Box3().setFromObject(objectRef.current);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        
        const maxDim = Math.max(size.x, size.y, size.z);
        const fov = cameraRef.current.fov * (Math.PI / 180);
        const distance = maxDim / (2 * Math.tan(fov / 2));
        
        cameraRef.current.position.set(distance, distance, distance);
        cameraRef.current.lookAt(center);
        orbitControlsRef.current.target.copy(center);
      }
    }
  }));

  // Create primitive geometry
  const createPrimitive = useCallback((type) => {
    let geometry;
    let material;

    switch (type) {
      case 'cube':
        geometry = new THREE.BoxGeometry(2, 2, 2);
        material = new THREE.MeshPhongMaterial({ color: 0x00ff00 });
        break;
        
      case 'sphere':
        geometry = new THREE.SphereGeometry(1.5, 32, 16);
        material = new THREE.MeshPhongMaterial({ color: 0x0088ff });
        break;
        
      case 'cone':
        geometry = new THREE.ConeGeometry(1.5, 3, 32);
        material = new THREE.MeshPhongMaterial({ color: 0xff0088 });
        break;
        
      case 'cylinder':
        geometry = new THREE.CylinderGeometry(1, 1, 3, 32);
        material = new THREE.MeshPhongMaterial({ color: 0xff8800 });
        break;
        
      default:
        geometry = new THREE.BoxGeometry(2, 2, 2);
        material = new THREE.MeshPhongMaterial({ color: 0x888888 });
    }

    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    
    return mesh;
  }, []);

  // Initialize scene
  useEffect(() => {
    if (!mountRef.current || !media) return;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(darkMode ? 0x1a1a1a : 0xf5f5f5);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(
      50,
      width / height,
      0.1,
      1000
    );
    camera.position.set(5, 5, 5);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = !thumbnailMode;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;
    mountRef.current.appendChild(renderer.domElement);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight1.position.set(5, 10, 5);
    directionalLight1.castShadow = !thumbnailMode;
    scene.add(directionalLight1);

    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.3);
    directionalLight2.position.set(-5, 5, -5);
    scene.add(directionalLight2);

    // Grid
    if (showGrid && !thumbnailMode) {
      const gridHelper = new THREE.GridHelper(20, 20, 0x888888, 0xcccccc);
      gridHelper.material.opacity = 0.3;
      gridHelper.material.transparent = true;
      scene.add(gridHelper);
    }

    // Axes
    if (showAxes && !thumbnailMode) {
      const axesHelper = new THREE.AxesHelper(5);
      scene.add(axesHelper);
    }

    // Controls
    if (enableInteraction) {
      const orbitControls = new OrbitControls(camera, renderer.domElement);
      orbitControls.enableDamping = true;
      orbitControls.dampingFactor = 0.05;
      orbitControls.autoRotate = autoRotate;
      orbitControls.autoRotateSpeed = 2;
      orbitControlsRef.current = orbitControls;

      // Transform controls
      const transformControls = new TransformControls(camera, renderer.domElement);
      transformControls.addEventListener('change', () => {
        if (objectRef.current && onTransformChange) {
          onTransformChange({
            position: objectRef.current.position,
            rotation: objectRef.current.rotation,
            scale: objectRef.current.scale
          });
        }
      });
      
      transformControls.addEventListener('dragging-changed', (event) => {
        orbitControls.enabled = !event.value;
      });
      
      scene.add(transformControls);
      transformControlsRef.current = transformControls;
    }

    // Load model or create primitive
    loadModel();

    // Animation loop
    let animationFrameId;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      if (orbitControlsRef.current && enableInteraction) {
        orbitControlsRef.current.update();
      }
      renderer.render(scene, camera);
    };
    
    if (!thumbnailMode) {
      animate();
    } else {
      // For thumbnail mode, wait a bit for model to load then render once
      setTimeout(() => {
        renderer.render(scene, camera);
      }, 100);
    }

    // Cleanup
    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      
      // Dispose of resources
      scene.traverse((child) => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(m => m.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
      
      renderer.dispose();
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
    };
  }, [media, width, height, showGrid, showAxes, darkMode, autoRotate, enableInteraction, thumbnailMode]);

  // Load 3D model or create primitive
  const loadModel = useCallback(async () => {
    if (!media || !sceneRef.current) return;
    
    setLoading(true);
    setError(null);
    
    try {
      let model;
      
      // Check if it's a primitive
      if (media.isPrimitive && media.primitiveType) {
        model = createPrimitive(media.primitiveType);
        
        // Set model info for primitives
        setModelInfo({
          vertices: model.geometry.attributes.position.count,
          faces: model.geometry.index ? model.geometry.index.count / 3 : model.geometry.attributes.position.count / 3,
          materials: 1,
          animations: 0
        });
      } else if (media.url) {
        // Load actual 3D file
        const loader = get3DLoader(media.type);
        if (!loader) {
          throw new Error(`Unsupported 3D format: ${media.type}`);
        }

        // For GLTFLoader, set up Draco decoder
        if (loader instanceof GLTFLoader) {
          const dracoLoader = new DRACOLoader();
          dracoLoader.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/');
          loader.setDRACOLoader(dracoLoader);
        }

        const result = await loader.loadAsync(media.url);
        model = result.scene || result;
        
        // Process model
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        
        // Center model
        model.position.sub(center);
        
        // Scale to fit
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 4 / maxDim;
        model.scale.multiplyScalar(scale);
        
        // Calculate model info
        let vertices = 0, faces = 0, materials = new Set();
        model.traverse((child) => {
          if (child.isMesh && child.geometry) {
            vertices += child.geometry.attributes.position?.count || 0;
            if (child.geometry.index) {
              faces += child.geometry.index.count / 3;
            }
            if (child.material) {
              materials.add(child.material.uuid);
            }
          }
        });
        
        setModelInfo({
          vertices,
          faces: Math.floor(faces),
          materials: materials.size,
          animations: result.animations ? result.animations.length : 0
        });
      }
      
      // Clear previous model
      if (objectRef.current) {
        sceneRef.current.remove(objectRef.current);
      }
      
      // Add shadow support
      model.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          
          if (child.material && showWireframe) {
            child.material.wireframe = true;
          }
        }
      });
      
      // Apply saved transform if exists
      if (media.transform3D) {
        if (media.transform3D.position) {
          model.position.fromArray(media.transform3D.position);
        }
        if (media.transform3D.rotation) {
          model.rotation.fromArray(media.transform3D.rotation);
        }
        if (media.transform3D.scale) {
          model.scale.fromArray(media.transform3D.scale);
        }
      }
      
      // Add to scene
      objectRef.current = model;
      sceneRef.current.add(model);
      
      // Add bounding box if requested
      if (showBoundingBox) {
        const boxHelper = createBoundingBox(model);
        sceneRef.current.add(boxHelper);
      }
      
      // Position camera
      if (cameraRef.current && (!media.transform3D || thumbnailMode)) {
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        
        const maxDim = Math.max(size.x, size.y, size.z);
        const fov = cameraRef.current.fov * (Math.PI / 180);
        const distance = maxDim / (2 * Math.tan(fov / 2)) * 1.5;
        
        cameraRef.current.position.set(distance, distance, distance);
        cameraRef.current.lookAt(center);
        
        if (orbitControlsRef.current) {
          orbitControlsRef.current.target.copy(center);
        }
        
        // Render for thumbnail
        if (rendererRef.current && thumbnailMode) {
          rendererRef.current.render(sceneRef.current, cameraRef.current);
        }
      }
      
      if (onObjectLoad) {
        onObjectLoad(model);
      }
      
      setLoading(false);
    } catch (err) {
      console.error('Error loading 3D model:', err);
      setError(err.message);
      setLoading(false);
    }
  }, [media, showBoundingBox, createPrimitive, showWireframe, thumbnailMode, onObjectLoad]);

  // Update transform mode
  useEffect(() => {
    if (transformControlsRef.current && objectRef.current && enableInteraction) {
      transformControlsRef.current.setMode(transformMode);
    }
  }, [transformMode, enableInteraction]);

  // Update selection
  useEffect(() => {
    if (transformControlsRef.current && objectRef.current && enableInteraction) {
      if (isSelected) {
        transformControlsRef.current.attach(objectRef.current);
      } else {
        transformControlsRef.current.detach();
      }
    }
  }, [isSelected, enableInteraction]);

  // Handle resize
  useEffect(() => {
    if (!cameraRef.current || !rendererRef.current) return;
    
    const parsedWidth = typeof width === 'string' && width.includes('%') 
      ? mountRef.current?.clientWidth || 400 
      : width;
    const parsedHeight = typeof height === 'string' && height.includes('%') 
      ? mountRef.current?.clientHeight || 300 
      : height;
    
    cameraRef.current.aspect = parsedWidth / parsedHeight;
    cameraRef.current.updateProjectionMatrix();
    rendererRef.current.setSize(parsedWidth, parsedHeight);
  }, [width, height]);

  // Render loading state
  if (loading && !thumbnailMode) {
    return (
      <div className={`relative bg-gray-100 dark:bg-gray-800 flex items-center justify-center ${className}`} 
           style={{ width, height }}>
        <div className="text-center">
          <Loader className="animate-spin mx-auto mb-2" size={24} />
          <p className="text-sm text-gray-600 dark:text-gray-400">Loading 3D model...</p>
        </div>
      </div>
    );
  }

  // Render error state
  if (error && !thumbnailMode) {
    return (
      <div className={`relative bg-gray-100 dark:bg-gray-800 flex items-center justify-center ${className}`} 
           style={{ width, height }}>
        <div className="text-center p-4">
          <AlertTriangle className="mx-auto mb-2 text-red-500" size={24} />
          <p className="text-sm text-gray-600 dark:text-gray-400">Error loading 3D model</p>
          <p className="text-xs text-gray-500 mt-1">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`} style={{ width, height }}>
      <div ref={mountRef} className="w-full h-full" />
      
      {/* Model info overlay - only for interactive mode */}
      {!loading && modelInfo && !thumbnailMode && (
        <div className="absolute bottom-2 left-2 text-xs bg-black bg-opacity-50 text-white p-2 rounded">
          <div>Vertices: {modelInfo.vertices.toLocaleString()}</div>
          <div>Faces: {modelInfo.faces.toLocaleString()}</div>
          <div>Materials: {modelInfo.materials}</div>
          {modelInfo.animations > 0 && (
            <div>Animations: {modelInfo.animations}</div>
          )}
        </div>
      )}
      
      {/* View mode indicator */}
      {!thumbnailMode && (
        <div className="absolute top-2 left-2 text-xs bg-black bg-opacity-50 text-white px-2 py-1 rounded">
          {viewMode.toUpperCase()}
        </div>
      )}
    </div>
  );
});

ThreeDViewer.displayName = 'ThreeDViewer';

export default ThreeDViewer;