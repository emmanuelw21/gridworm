// components/ThreeDViewport/ThumbnailGenerator.jsx
import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { 
  Camera, X, RotateCw, ZoomIn, ZoomOut, Maximize, 
  Move, Download, Settings, Eye, Grid, Save, RefreshCw,
  Play, Pause, SkipForward, SkipBack
} from 'lucide-react';

const ThumbnailGenerator = ({ 
  object,
  objects,
  onCapture, 
  onClose,
  onRevert = null,
  darkMode,
  defaultView = 'perspective',
  batchMode = false,
  onBatchComplete = null,
  videoElements = null,
  videoTextures = null
}) => {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const objectRef = useRef(null);
  const frameRef = useRef(null);
  const resizeObserverRef = useRef(null);
  
  const [activeTab, setActiveTab] = useState(batchMode ? 'batch' : 'preview');
  const [showQuickViews, setShowQuickViews] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [showAxes, setShowAxes] = useState(true);
  const [backgroundColor, setBackgroundColor] = useState(darkMode ? '#1a1a1a' : '#f0f0f0');
  const [cameraInfo, setCameraInfo] = useState({ fov: 50, distance: 5 });
  const [captureSize, setCaptureSize] = useState(512);
  const [isCapturing, setIsCapturing] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });
  const [selectedDefaultView, setSelectedDefaultView] = useState('front');
  const [editingPreset, setEditingPreset] = useState(null);
  
  // Video control states
  const [videoControls, setVideoControls] = useState({
    playing: false,
    currentTime: 0,
    duration: 0,
    mediaId: null
  });
  const videoRef = useRef(null);
  
  // Camera presets with target
  const [cameraPresets, setCameraPresets] = useState({
    perspective: { position: [3, 3, 5], target: [0, 0, 0], fov: 50 },
    front: { position: [0, 0, 5], target: [0, 0, 0], fov: 50 },
    back: { position: [0, 0, -5], target: [0, 0, 0], fov: 50 },
    left: { position: [-5, 0, 0], target: [0, 0, 0], fov: 50 },
    right: { position: [5, 0, 0], target: [0, 0, 0], fov: 50 },
    top: { position: [0, 5, 0], target: [0, 0, 0], fov: 50 },
    bottom: { position: [0, -5, 0], target: [0, 0, 0], fov: 50 }
  });
  
  // Create reference cube with front indicator
  const createReferenceCube = () => {
    const group = new THREE.Group();
    
    // Create cube with different colored faces
    const geometry = new THREE.BoxGeometry(2, 2, 2);
    const materials = [
      new THREE.MeshPhongMaterial({ color: 0xff0000 }), // right - red
      new THREE.MeshPhongMaterial({ color: 0x00ff00 }), // left - green  
      new THREE.MeshPhongMaterial({ color: 0x0000ff }), // top - blue
      new THREE.MeshPhongMaterial({ color: 0xffff00 }), // bottom - yellow
      new THREE.MeshPhongMaterial({ color: 0x00ffff }), // front - cyan
      new THREE.MeshPhongMaterial({ color: 0xff00ff })  // back - magenta
    ];
    
    const cube = new THREE.Mesh(geometry, materials);
    group.add(cube);
    
    // Add "FRONT" text indicator
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'white';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('FRONT', 128, 32);
    
    const texture = new THREE.CanvasTexture(canvas);
    const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.position.set(0, 0, 1.5);
    sprite.scale.set(2, 0.5, 1);
    group.add(sprite);
    
    return group;
  };
  
  // Check if current object is a video
  const isVideo = useCallback(() => {
    if (!object || !object.userData) return false;
    const mediaInfo = object.userData.mediaInfo;
    return mediaInfo && mediaInfo.type && mediaInfo.type.startsWith('video/');
  }, [object]);
  
  // Get video element for current object
  const getVideoElement = useCallback(() => {
    if (!object || !object.userData || !videoElements) return null;
    const mediaId = object.userData.mediaId;
    return videoElements.get(mediaId);
  }, [object, videoElements]);
  
  // Initialize video controls
  useEffect(() => {
    if (isVideo() && object) {
      const video = getVideoElement();
      if (video) {
        videoRef.current = video;
        setVideoControls({
          playing: !video.paused,
          currentTime: video.currentTime,
          duration: video.duration || 0,
          mediaId: object.userData.mediaId
        });
        
        // Add event listeners
        const updateTime = () => {
          setVideoControls(prev => ({
            ...prev,
            currentTime: video.currentTime,
            duration: video.duration || prev.duration
          }));
        };
        
        const updatePlaying = () => {
          setVideoControls(prev => ({
            ...prev,
            playing: !video.paused
          }));
        };
        
        video.addEventListener('timeupdate', updateTime);
        video.addEventListener('play', updatePlaying);
        video.addEventListener('pause', updatePlaying);
        video.addEventListener('loadedmetadata', updateTime);
        
        return () => {
          video.removeEventListener('timeupdate', updateTime);
          video.removeEventListener('play', updatePlaying);
          video.removeEventListener('pause', updatePlaying);
          video.removeEventListener('loadedmetadata', updateTime);
        };
      }
    }
  }, [object, isVideo, getVideoElement]);
  
  // Video control functions
  const handleVideoPlayPause = () => {
    const video = videoRef.current;
    if (!video) return;
    
    if (video.paused) {
      video.play();
    } else {
      video.pause();
    }
  };
  
  const handleVideoSeek = (time) => {
    const video = videoRef.current;
    if (!video) return;
    
    video.currentTime = time;
    setVideoControls(prev => ({ ...prev, currentTime: time }));
    
    // Update texture if needed
    if (videoTextures && object) {
      const texture = videoTextures.get(object.userData.mediaId);
      if (texture) {
        texture.needsUpdate = true;
      }
    }
  };
  
  const handleVideoSkip = (seconds) => {
    const video = videoRef.current;
    if (!video) return;
    
    const newTime = Math.max(0, Math.min(video.duration, video.currentTime + seconds));
    handleVideoSeek(newTime);
  };
  
  // Initialize scene
  useEffect(() => {
    if (!mountRef.current) return;
    
    console.log('Initializing thumbnail generator scene');
    
    // Use requestAnimationFrame to ensure DOM is ready
    const initializeScene = () => {
      if (!mountRef.current) return;
      
      // Scene setup
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(backgroundColor);
      sceneRef.current = scene;
      
      // Get actual dimensions
      const width = mountRef.current.clientWidth || mountRef.current.offsetWidth || 600;
      const height = mountRef.current.clientHeight || mountRef.current.offsetHeight || 400;
      
      console.log(`Initializing with dimensions: ${width}x${height}`);
      
      // Camera
      const camera = new THREE.PerspectiveCamera(
        cameraInfo.fov,
        width / height,
        0.1,
        1000
      );
      const preset = cameraPresets[defaultView];
      camera.position.set(...preset.position);
      camera.fov = preset.fov;
      camera.updateProjectionMatrix();
      cameraRef.current = camera;
      
      // Renderer
      const renderer = new THREE.WebGLRenderer({ 
        antialias: true,
        preserveDrawingBuffer: true
      });
      renderer.setSize(width, height);
      renderer.setPixelRatio(window.devicePixelRatio);
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      mountRef.current.appendChild(renderer.domElement);
      rendererRef.current = renderer;
      
      // Controls
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = false;
      controls.dampingFactor = 0.05;
      controls.target.set(...preset.target);
      controls.update();
      controlsRef.current = controls;
      
      // Grid
      const gridHelper = new THREE.GridHelper(10, 10, 0x444444, 0x222222);
      gridHelper.name = 'grid';
      scene.add(gridHelper);
      
      // Axes
      const axesHelper = new THREE.AxesHelper(3);
      axesHelper.name = 'axes';
      scene.add(axesHelper);
      
      // Lighting
      scene.add(new THREE.AmbientLight(0xffffff, 0.6));
      
      const dirLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
      dirLight1.position.set(5, 5, 5);
      dirLight1.castShadow = true;
      scene.add(dirLight1);
      
      const dirLight2 = new THREE.DirectionalLight(0xffffff, 0.4);
      dirLight2.position.set(-5, -5, -5);
      scene.add(dirLight2);
      
      // Add the object or reference cube
      if (!batchMode && !object) {
        const referenceCube = createReferenceCube();
        scene.add(referenceCube);
        objectRef.current = referenceCube;
        console.log('Created reference cube for thumbnail preview');
        frameObject();
      } else if (!batchMode && object) {
        const objectClone = object.clone();
        scene.add(objectClone);
        objectRef.current = objectClone;
        frameObject();
      }
      
      // Animation loop
      const animate = () => {
        frameRef.current = requestAnimationFrame(animate);
        controls.update();
        
        // Update camera info
        const distance = camera.position.distanceTo(controls.target);
        setCameraInfo(prev => ({
          ...prev,
          distance: Math.round(distance * 10) / 10
        }));
        
        // Update video texture if playing
        if (videoRef.current && !videoRef.current.paused && videoTextures && object) {
          const texture = videoTextures.get(object.userData.mediaId);
          if (texture) {
            texture.needsUpdate = true;
          }
        }
        
        renderer.render(scene, camera);
      };
      animate();
    };
    
    requestAnimationFrame(initializeScene);
    
    // Handle resize
    const handleResize = () => {
      if (!mountRef.current || !cameraRef.current || !rendererRef.current) return;
      
      const width = mountRef.current.clientWidth;
      const height = mountRef.current.clientHeight;
      
      if (width > 0 && height > 0) {
        cameraRef.current.aspect = width / height;
        cameraRef.current.updateProjectionMatrix();
        rendererRef.current.setSize(width, height);
        console.log(`Resized to: ${width}x${height}`);
      }
    };
    
    // Use ResizeObserver
    resizeObserverRef.current = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          handleResize();
        }
      }
    });
    
    if (mountRef.current) {
      resizeObserverRef.current.observe(mountRef.current);
    }
    
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
      }
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
      if (mountRef.current && rendererRef.current && rendererRef.current.domElement) {
        if (rendererRef.current.domElement.parentNode === mountRef.current) {
          mountRef.current.removeChild(rendererRef.current.domElement);
        }
      }
      if (rendererRef.current) {
        rendererRef.current.dispose();
      }
    };
  }, [object, batchMode, defaultView]);
  
  // Update helpers visibility
  useEffect(() => {
    if (!sceneRef.current) return;
    
    const grid = sceneRef.current.getObjectByName('grid');
    if (grid) grid.visible = showGrid;
    
    const axes = sceneRef.current.getObjectByName('axes');
    if (axes) axes.visible = showAxes;
  }, [showGrid, showAxes]);
  
  // Update background color
  useEffect(() => {
    if (sceneRef.current) {
      sceneRef.current.background = new THREE.Color(backgroundColor);
    }
  }, [backgroundColor]);
  
  // Frame object
  const frameObject = (targetObject = null) => {
    const objToFrame = targetObject || objectRef.current;
    if (!objToFrame || !cameraRef.current || !controlsRef.current) return;
    
    const box = new THREE.Box3().setFromObject(objToFrame);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    
    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = cameraRef.current.fov * (Math.PI / 180);
    const cameraDistance = Math.abs(maxDim / Math.sin(fov / 2)) * 0.5;
    
    const direction = new THREE.Vector3();
    cameraRef.current.getWorldDirection(direction);
    
    cameraRef.current.position.copy(center).sub(direction.multiplyScalar(cameraDistance));
    controlsRef.current.target.copy(center);
    controlsRef.current.update();
  };
  
  // Set camera view
  const setView = (viewName) => {
    if (!cameraRef.current || !controlsRef.current) return;
    
    const preset = cameraPresets[viewName];
    if (preset) {
      cameraRef.current.position.set(...preset.position);
      cameraRef.current.fov = preset.fov;
      cameraRef.current.updateProjectionMatrix();
      controlsRef.current.target.set(...preset.target);
      controlsRef.current.update();
      
      console.log(`Applied view: ${viewName}`, {
        position: preset.position,
        target: preset.target,
        fov: preset.fov
      });
      
      // Frame object after view change
      setTimeout(frameObject, 100);
    }
  };
  
  // Save current camera position as preset
  const savePresetFromCurrent = (presetName) => {
    if (!cameraRef.current || !controlsRef.current) return;
    
    const newPreset = {
      position: cameraRef.current.position.toArray(),
      target: controlsRef.current.target.toArray(),
      fov: cameraRef.current.fov
    };
    
    console.log(`Saving preset "${presetName}":`, {
      position: newPreset.position.map(v => v.toFixed(2)),
      target: newPreset.target.map(v => v.toFixed(2)),
      fov: newPreset.fov
    });
    
    setCameraPresets(prev => ({
      ...prev,
      [presetName]: newPreset
    }));
  };
  
  // Capture thumbnail
  const captureThumb = () => {
    if (!rendererRef.current || !sceneRef.current || !cameraRef.current) return;
    
    console.log('Capturing thumbnail...');
    
    // Pause video during capture if needed
    const wasPlaying = videoRef.current && !videoRef.current.paused;
    if (wasPlaying) {
      videoRef.current.pause();
    }
    
    setIsCapturing(true);
    
    // Store current state
    const currentSize = {
      width: rendererRef.current.domElement.width,
      height: rendererRef.current.domElement.height
    };
    
    // Set capture size
    rendererRef.current.setSize(captureSize, captureSize);
    cameraRef.current.aspect = 1;
    cameraRef.current.updateProjectionMatrix();
    
    // Hide helpers for capture
    const grid = sceneRef.current.getObjectByName('grid');
    const axes = sceneRef.current.getObjectByName('axes');
    const gridVisible = grid?.visible;
    const axesVisible = axes?.visible;
    
    if (grid) grid.visible = false;
    if (axes) axes.visible = false;
    
    // Render
    rendererRef.current.render(sceneRef.current, cameraRef.current);
    
    // Capture
    const dataURL = rendererRef.current.domElement.toDataURL('image/png');
    
    // Restore helpers
    if (grid) grid.visible = gridVisible;
    if (axes) axes.visible = axesVisible;
    
    // Restore size
    rendererRef.current.setSize(currentSize.width, currentSize.height);
    cameraRef.current.aspect = currentSize.width / currentSize.height;
    cameraRef.current.updateProjectionMatrix();
    
    setIsCapturing(false);
    
    // Resume video if it was playing
    if (wasPlaying) {
      videoRef.current.play();
    }
    
    console.log('Thumbnail captured');
    
    // Return the result
    if (onCapture) {
      onCapture(dataURL, {
        view: 'custom',
        position: cameraRef.current.position.toArray(),
        target: controlsRef.current.target.toArray(),
        fov: cameraRef.current.fov,
        videoTime: videoRef.current ? videoRef.current.currentTime : undefined
      });
    }
  };
  
  // Batch capture
  const performBatchCapture = async () => {
    if (!objects || objects.length === 0) return;
    
    console.log(`Starting batch capture for ${objects.length} objects`);
    setIsCapturing(true);
    setBatchProgress({ current: 0, total: objects.length });
    
    for (let i = 0; i < objects.length; i++) {
      const obj = objects[i];
      setBatchProgress({ current: i + 1, total: objects.length });
      
      // Clear scene
      if (objectRef.current) {
        sceneRef.current.remove(objectRef.current);
      }
      
      // Add new object
      const mesh = obj.mesh || obj;
      if (!mesh) continue;
      
      const objectClone = mesh.clone();
      sceneRef.current.add(objectClone);
      objectRef.current = objectClone;
      
      // Set view and frame
      setView(selectedDefaultView);
      await new Promise(resolve => setTimeout(resolve, 100));
      frameObject(objectClone);
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Capture
      const dataURL = await captureForBatch();
      
      if (onCapture) {
        onCapture(dataURL, {
          view: selectedDefaultView,
          objectId: obj.id,
          position: cameraRef.current.position.toArray(),
          target: controlsRef.current.target.toArray(),
          fov: cameraRef.current.fov
        });
      }
    }
    
    setIsCapturing(false);
    console.log('Batch capture completed');
    if (onBatchComplete) onBatchComplete();
  };
  
  const captureForBatch = () => {
    return new Promise((resolve) => {
      if (!rendererRef.current || !sceneRef.current || !cameraRef.current) {
        resolve(null);
        return;
      }
      
      // Store current state
      const currentSize = {
        width: rendererRef.current.domElement.width,
        height: rendererRef.current.domElement.height
      };
      
      // Set capture size
      rendererRef.current.setSize(captureSize, captureSize);
      cameraRef.current.aspect = 1;
      cameraRef.current.updateProjectionMatrix();
      
      // Hide helpers
      const grid = sceneRef.current.getObjectByName('grid');
      const axes = sceneRef.current.getObjectByName('axes');
      if (grid) grid.visible = false;
      if (axes) axes.visible = false;
      
      // Render
      rendererRef.current.render(sceneRef.current, cameraRef.current);
      
      // Capture
      const dataURL = rendererRef.current.domElement.toDataURL('image/png');
      
      // Restore
      if (grid) grid.visible = showGrid;
      if (axes) axes.visible = showAxes;
      rendererRef.current.setSize(currentSize.width, currentSize.height);
      cameraRef.current.aspect = currentSize.width / currentSize.height;
      cameraRef.current.updateProjectionMatrix();
      
      resolve(dataURL);
    });
  };
  
  // Mini preview renderer for preset editing
  const PresetPreview = ({ presetName, isActive }) => {
    const miniMountRef = useRef(null);
    const miniRendererRef = useRef(null);
    
    useEffect(() => {
      if (!miniMountRef.current) return;
      
      const miniScene = new THREE.Scene();
      miniScene.background = new THREE.Color(backgroundColor);
      
      const miniCamera = new THREE.PerspectiveCamera(50, 1, 0.1, 1000);
      const preset = cameraPresets[presetName];
      miniCamera.position.set(...preset.position);
      miniCamera.lookAt(...preset.target);
      miniCamera.fov = preset.fov;
      miniCamera.updateProjectionMatrix();
      
      const miniRenderer = new THREE.WebGLRenderer({ antialias: true });
      miniRenderer.setSize(150, 150);
      miniMountRef.current.appendChild(miniRenderer.domElement);
      miniRendererRef.current = miniRenderer;
      
      // Add the same object or reference cube
      let miniObject;
      if (objectRef.current) {
        miniObject = objectRef.current.clone();
      } else {
        miniObject = createReferenceCube();
      }
      miniScene.add(miniObject);
      
      // Lighting
      miniScene.add(new THREE.AmbientLight(0xffffff, 0.6));
      const light = new THREE.DirectionalLight(0xffffff, 0.8);
      light.position.set(5, 5, 5);
      miniScene.add(light);
      
      miniRenderer.render(miniScene, miniCamera);
      
      return () => {
        if (miniMountRef.current && miniRenderer.domElement && miniRenderer.domElement.parentNode === miniMountRef.current) {
          miniMountRef.current.removeChild(miniRenderer.domElement);
        }
        miniRenderer.dispose();
      };
    }, [presetName, isActive]);
    
    return (
      <div 
        ref={miniMountRef} 
        className={`cursor-pointer hover:ring-2 hover:ring-blue-500 rounded ${
          isActive ? 'ring-2 ring-blue-500' : ''
        }`} 
      />
    );
  };
  
  // Format time for display
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      switch (e.key) {
        case 'f':
          frameObject();
          break;
        case 'g':
          setShowGrid(prev => !prev);
          break;
        case 'q':
          setShowQuickViews(prev => !prev);
          break;
        case ' ':
          if (isVideo()) {
            e.preventDefault();
            handleVideoPlayPause();
          }
          break;
        case 'ArrowLeft':
          if (isVideo()) {
            e.preventDefault();
            handleVideoSkip(-5);
          }
          break;
        case 'ArrowRight':
          if (isVideo()) {
            e.preventDefault();
            handleVideoSkip(5);
          }
          break;
        case 'Enter':
          if (activeTab === 'preview') captureThumb();
          else if (activeTab === 'batch') performBatchCapture();
          break;
        case 'Escape':
          if (onClose) onClose();
          break;
        // Number keys for views
        case '1':
          setView('front');
          break;
        case '2':
          setView('right');
          break;
        case '3':
          setView('back');
          break;
        case '4':
          setView('left');
          break;
        case '5':
          setView('top');
          break;
        case '6':
          setView('bottom');
          break;
        case '7':
          setView('perspective');
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, isVideo]);
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-[900px] h-[700px] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Thumbnail Generator
          </h3>
          <div className="flex items-center space-x-4">
            {/* Tab switcher */}
            <div className="flex bg-gray-100 dark:bg-gray-700 rounded p-0.5">
              <button
                onClick={() => setActiveTab('preview')}
                className={`px-3 py-1 text-sm rounded transition-colors ${
                  activeTab === 'preview' 
                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white' 
                    : 'text-gray-600 dark:text-gray-400'
                }`}
              >
                Preview
              </button>
              <button
                onClick={() => setActiveTab('controls')}
                className={`px-3 py-1 text-sm rounded transition-colors ${
                  activeTab === 'controls' 
                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white' 
                    : 'text-gray-600 dark:text-gray-400'
                }`}
              >
                Controls
              </button>
              {batchMode && (
                <button
                  onClick={() => setActiveTab('batch')}
                  className={`px-3 py-1 text-sm rounded transition-colors ${
                    activeTab === 'batch' 
                      ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white' 
                      : 'text-gray-600 dark:text-gray-400'
                  }`}
                >
                  Batch
                </button>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <X size={20} />
            </button>
          </div>
        </div>
        
        {/* Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Preview Panel - Always visible but may be smaller */}
          <div className={`${activeTab === 'preview' ? 'flex-1' : 'w-1/2'} relative bg-gray-100 dark:bg-gray-900`}>
            <div ref={mountRef} className="w-full h-full" />
            
            {/* Video controls overlay */}
            {isVideo() && activeTab === 'preview' && (
              <div className="absolute bottom-4 left-4 right-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-3">
                <div className="flex items-center space-x-3">
                  <button
                    onClick={handleVideoPlayPause}
                    className="p-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    title={videoControls.playing ? "Pause (Space)" : "Play (Space)"}
                  >
                    {videoControls.playing ? <Pause size={16} /> : <Play size={16} />}
                  </button>
                  
                  <button
                    onClick={() => handleVideoSkip(-5)}
                    className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                    title="Back 5s (←)"
                  >
                    <SkipBack size={16} />
                  </button>
                  
                  <div className="flex-1 flex items-center space-x-2">
                    <span className="text-xs">{formatTime(videoControls.currentTime)}</span>
                    <input
                      type="range"
                      min="0"
                      max={videoControls.duration || 100}
                      value={videoControls.currentTime}
                      onChange={(e) => handleVideoSeek(parseFloat(e.target.value))}
                      className="flex-1"
                    />
                    <span className="text-xs">{formatTime(videoControls.duration)}</span>
                  </div>
                  
                  <button
                    onClick={() => handleVideoSkip(5)}
                    className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                    title="Forward 5s (→)"
                  >
                    <SkipForward size={16} />
                  </button>
                </div>
                
                <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  Use the scrubber to find the perfect frame for your thumbnail
                </div>
              </div>
            )}
            
            {/* Overlay controls for preview mode */}
            {activeTab === 'preview' && (
              <div className="absolute top-4 left-4 space-y-2">
                {/* Quick views - collapsible */}
                <div className="bg-white dark:bg-gray-800 rounded shadow p-2">
                  <button
                    onClick={() => setShowQuickViews(!showQuickViews)}
                    className="text-xs font-medium mb-2 hover:text-blue-600"
                  >
                    {showQuickViews ? '▼' : '▶'} Quick Views (Q)
                  </button>
                  {showQuickViews && (
                    <div className="grid grid-cols-4 gap-1 mt-2">
                      <button
                        onClick={() => setView('perspective')}
                        className="px-2 py-1 text-xs bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 rounded"
                        title="Perspective (7)"
                      >
                        Persp
                      </button>
                      <button
                        onClick={() => setView('front')}
                        className="px-2 py-1 text-xs bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 rounded"
                        title="Front (1)"
                      >
                        Front
                      </button>
                      <button
                        onClick={() => setView('right')}
                        className="px-2 py-1 text-xs bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 rounded"
                        title="Right (2)"
                      >
                        Right
                      </button>
                      <button
                        onClick={() => setView('back')}
                        className="px-2 py-1 text-xs bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 rounded"
                        title="Back (3)"
                      >
                        Back
                      </button>
                      <button
                        onClick={() => setView('left')}
                        className="px-2 py-1 text-xs bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 rounded"
                        title="Left (4)"
                      >
                        Left
                      </button>
                      <button
                        onClick={() => setView('top')}
                        className="px-2 py-1 text-xs bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 rounded"
                        title="Top (5)"
                      >
                        Top
                      </button>
                      <button
                        onClick={() => setView('bottom')}
                        className="px-2 py-1 text-xs bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 rounded"
                        title="Bottom (6)"
                      >
                        Bottom
                      </button>
                      <button
                        onClick={frameObject}
                        className="px-2 py-1 text-xs bg-blue-600 text-white hover:bg-blue-700 rounded"
                        title="Frame Object (F)"
                      >
                        Frame
                      </button>
                    </div>
                  )}
                </div>
                
                {/* Camera info */}
                <div className="bg-white dark:bg-gray-800 rounded shadow p-2 text-xs">
                  <p>FOV: {cameraInfo.fov}°</p>
                  <p>Distance: {cameraInfo.distance}</p>
                </div>
              </div>
            )}
            
            {/* Capture indicator */}
            {isCapturing && (
              <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                <div className="bg-white rounded p-4">
                  <p className="text-lg">
                    {batchMode ? `Capturing ${batchProgress.current}/${batchProgress.total}...` : 'Capturing...'}
                  </p>
                </div>
              </div>
            )}
          </div>
          
          {/* Side Panel - Content based on active tab */}
          <div className={`${activeTab === 'preview' ? 'w-64' : 'flex-1'} p-4 border-l border-gray-200 dark:border-gray-700 overflow-y-auto`}>
            {activeTab === 'preview' && (
              <div className="space-y-4">
                {/* Display settings */}
                <div>
                  <h4 className="text-sm font-medium mb-2">Display Settings</h4>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={showGrid}
                        onChange={(e) => setShowGrid(e.target.checked)}
                        className="mr-2"
                      />
                      <Grid size={14} className="mr-1" />
                      Show Grid (G)
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={showAxes}
                        onChange={(e) => setShowAxes(e.target.checked)}
                        className="mr-2"
                      />
                      <Move size={14} className="mr-1" />
                      Show Axes
                    </label>
                  </div>
                </div>
                
                {/* Background color */}
                <div>
                  <h4 className="text-sm font-medium mb-2">Background</h4>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={backgroundColor}
                      onChange={(e) => setBackgroundColor(e.target.value)}
                      className="w-10 h-10 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={backgroundColor}
                      onChange={(e) => setBackgroundColor(e.target.value)}
                      className="flex-1 px-2 py-1 text-sm border rounded dark:bg-gray-700 dark:border-gray-600"
                    />
                  </div>
                </div>
                
                {/* Capture settings */}
                <div>
                  <h4 className="text-sm font-medium mb-2">Capture Settings</h4>
                  <div className="space-y-2">
                    <div>
                      <label className="text-xs">Size: {captureSize}px</label>
                      <input
                        type="range"
                        min="256"
                        max="2048"
                        step="256"
                        value={captureSize}
                        onChange={(e) => setCaptureSize(parseInt(e.target.value))}
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>
                
                {/* Keyboard shortcuts */}
                <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                  <p className="font-medium">Shortcuts:</p>
                  {isVideo() && (
                    <>
                      <p>Space: Play/Pause</p>
                      <p>←/→: Skip 5 seconds</p>
                    </>
                  )}
                  <p>Q: Toggle quick views</p>
                  <p>G: Toggle grid</p>
                  <p>F: Frame object</p>
                  <p>Enter: Capture</p>
                </div>
                
                {/* Actions */}
                <div className="flex flex-col space-y-2">
                  <button
                    onClick={captureThumb}
                    className="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center justify-center"
                  >
                    <Camera size={16} className="mr-2" />
                    Capture Thumbnail
                  </button>
                  
                  {/* Revert button - only show if onRevert is provided and not in batch mode */}
                  {onRevert && !batchMode && (
                    <button
                      onClick={onRevert}
                      className="w-full py-2 bg-gray-600 text-white rounded hover:bg-gray-700 flex items-center justify-center"
                      title="Revert to original thumbnail"
                    >
                      <RefreshCw size={16} className="mr-2" />
                      Revert to Original
                    </button>
                  )}
                </div>
              </div>
            )}
            
            {activeTab === 'controls' && (
              <div className="space-y-4">
                <h4 className="text-lg font-medium mb-4">Camera Preset Controls</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Click on any preset to apply it. Adjust the camera in the main view, then click save to update the preset.
                </p>
                
                <div className="grid grid-cols-2 gap-4">
                  {Object.keys(cameraPresets).map(presetName => (
                    <div 
                      key={presetName}
                      className={`border rounded-lg p-4 ${
                        editingPreset === presetName 
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                          : 'border-gray-300 dark:border-gray-600'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="font-medium capitalize">{presetName}</h5>
                        <button
                          onClick={() => {
                            savePresetFromCurrent(presetName);
                            console.log(`Saved preset: ${presetName}`);
                          }}
                          className="p-1 bg-green-600 text-white rounded hover:bg-green-700"
                          title="Save current view to this preset"
                        >
                          <Save size={14} />
                        </button>
                      </div>
                      
                      <div 
                        onClick={() => {
                          setView(presetName);
                          setEditingPreset(presetName);
                          console.log(`Applied preset: ${presetName}`);
                        }}
                      >
                        <PresetPreview presetName={presetName} isActive={editingPreset === presetName} />
                      </div>
                      
                      <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                        <p>Position: [{cameraPresets[presetName].position.map(v => v.toFixed(1)).join(', ')}]</p>
                        <p>Target: [{cameraPresets[presetName].target.map(v => v.toFixed(1)).join(', ')}]</p>
                        <p>FOV: {cameraPresets[presetName].fov}°</p>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="mt-6 p-4 bg-gray-100 dark:bg-gray-700 rounded">
                  <h5 className="font-medium mb-2">Default for Quick Generate:</h5>
                  <select 
                    value={selectedDefaultView}
                    onChange={(e) => setSelectedDefaultView(e.target.value)}
                    className="w-full px-3 py-2 border rounded dark:bg-gray-600 dark:border-gray-500"
                  >
                    {Object.keys(cameraPresets).map(preset => (
                      <option key={preset} value={preset}>
                        {preset.charAt(0).toUpperCase() + preset.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
            
            {activeTab === 'batch' && batchMode && (
              <div className="space-y-4">
                <h4 className="text-lg font-medium mb-4">Batch Generation</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Generate thumbnails for {objects?.length || 0} objects using the "{selectedDefaultView}" view.
                </p>
                
                <div className="space-y-2">
                  <div>
                    <label className="text-sm">View to use:</label>
                    <select 
                      value={selectedDefaultView}
                      onChange={(e) => setSelectedDefaultView(e.target.value)}
                      className="w-full px-3 py-2 border rounded dark:bg-gray-600 dark:border-gray-500 mt-1"
                    >
                      {Object.keys(cameraPresets).map(preset => (
                        <option key={preset} value={preset}>
                          {preset.charAt(0).toUpperCase() + preset.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="text-sm">Capture size: {captureSize}px</label>
                    <input
                      type="range"
                      min="256"
                      max="2048"
                      step="256"
                      value={captureSize}
                      onChange={(e) => setCaptureSize(parseInt(e.target.value))}
                      className="w-full mt-1"
                    />
                  </div>
                </div>
                
                {batchProgress.total > 0 && (
                  <div className="mt-4">
                    <div className="flex justify-between text-sm mb-1">
                      <span>Progress</span>
                      <span>{batchProgress.current}/{batchProgress.total}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all"
                        style={{ width: `${(batchProgress.current / batchProgress.total) * 100}%` }}
                      />
                    </div>
                  </div>
                )}
                
                <button
                  onClick={performBatchCapture}
                  disabled={isCapturing}
                  className="w-full py-3 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:bg-gray-400 flex items-center justify-center"
                >
                  <RefreshCw size={16} className={`mr-2 ${isCapturing ? 'animate-spin' : ''}`} />
                  {isCapturing ? 'Generating...' : `Generate ${objects?.length || 0} Thumbnails`}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ThumbnailGenerator;