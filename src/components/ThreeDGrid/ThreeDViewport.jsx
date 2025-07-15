// components/ThreeDGrid/ThreeDViewport.jsx
import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer';
import { 
  Maximize2, Grid, Crosshair, Camera,
  RotateCw, Move, Scale
} from 'lucide-react';
import { snapToGrid3D } from './helpers3D';

const ThreeDViewport = ({
  viewport,
  scene,
  camera,
  renderer,
  items,
  selectedItems,
  onItemSelect,
  onTransformChange,
  transformMode,
  snapToGrid,
  gridConfig,
  layers
}) => {
  const mountRef = useRef(null);
  const rendererRef = useRef(null);
  const labelRendererRef = useRef(null);
  const orbitControlsRef = useRef(null);
  const transformControlsRef = useRef(null);
  const raycasterRef = useRef(new THREE.Raycaster());
  const mouseRef = useRef(new THREE.Vector2());
  
  const [hoveredObject, setHoveredObject] = useState(null);
  const [viewportActive, setViewportActive] = useState(false);

  // Initialize viewport
  useEffect(() => {
    if (!mountRef.current || !scene || !camera) return;

    // Create viewport-specific renderer
    const viewportRenderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    });
    viewportRenderer.setSize(
      mountRef.current.clientWidth,
      mountRef.current.clientHeight
    );
    viewportRenderer.setPixelRatio(window.devicePixelRatio);
    viewportRenderer.shadowMap.enabled = true;
    rendererRef.current = viewportRenderer;
    mountRef.current.appendChild(viewportRenderer.domElement);

    // CSS2D renderer for labels
    const labelRenderer = new CSS2DRenderer();
    labelRenderer.setSize(
      mountRef.current.clientWidth,
      mountRef.current.clientHeight
    );
    labelRenderer.domElement.style.position = 'absolute';
    labelRenderer.domElement.style.top = '0';
    labelRenderer.domElement.style.pointerEvents = 'none';
    labelRendererRef.current = labelRenderer;
    mountRef.current.appendChild(labelRenderer.domElement);

    // Setup camera based on viewport type
    setupCamera();

    // Controls
    const orbitControls = new OrbitControls(camera, viewportRenderer.domElement);
    orbitControls.enableDamping = true;
    orbitControls.dampingFactor = 0.05;
    
    // Restrict controls based on viewport type
    if (viewport.type === 'top') {
      orbitControls.enableRotate = false;
      camera.position.set(0, 20, 0);
      camera.lookAt(0, 0, 0);
    } else if (viewport.type === 'front') {
      orbitControls.enableRotate = false;
      camera.position.set(0, 0, 20);
      camera.lookAt(0, 0, 0);
    } else if (viewport.type === 'side') {
      orbitControls.enableRotate = false;
      camera.position.set(20, 0, 0);
      camera.lookAt(0, 0, 0);
    }
    
    orbitControlsRef.current = orbitControls;

    // Transform controls
    const transformControls = new TransformControls(camera, viewportRenderer.domElement);
    transformControls.setMode(transformMode);
    
    transformControls.addEventListener('change', () => {
      const object = transformControls.object;
      if (object && onTransformChange) {
        if (snapToGrid && transformMode === 'translate') {
          const snapped = snapToGrid3D(object.position, gridConfig.cellSize / 4);
          object.position.copy(snapped);
        }
        
        onTransformChange(object.userData.itemId, {
          position: object.position.clone(),
          rotation: object.rotation.clone(),
          scale: object.scale.clone()
        });
      }
    });
    
    transformControls.addEventListener('dragging-changed', (event) => {
      orbitControls.enabled = !event.value;
    });
    
    scene.add(transformControls);
    transformControlsRef.current = transformControls;

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      
      // Update controls
      orbitControls.update();
      
      // Update layer visibility
      scene.traverse((child) => {
        if (child.userData.layerId) {
          const layer = layers.find(l => l.id === child.userData.layerId);
          if (layer) {
            child.visible = layer.visible;
            if (child.material) {
              child.material.opacity = layer.opacity / 100;
              child.material.transparent = layer.opacity < 100;
            }
          }
        }
      });
      
      // Render
      viewportRenderer.render(scene, camera);
      labelRenderer.render(scene, camera);
    };
    animate();

    // Event handlers
    const handleMouseMove = (event) => {
      const rect = mountRef.current.getBoundingClientRect();
      mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      
      // Raycast for hover
      raycasterRef.current.setFromCamera(mouseRef.current, camera);
      const intersects = raycasterRef.current.intersectObjects(scene.children, true);
      
      if (intersects.length > 0) {
        const object = intersects[0].object;
        if (object.userData.itemId) {
          setHoveredObject(object);
          mountRef.current.style.cursor = 'pointer';
        }
      } else {
        setHoveredObject(null);
        mountRef.current.style.cursor = 'default';
      }
    };

    const handleClick = (event) => {
      const rect = mountRef.current.getBoundingClientRect();
      mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      
      raycasterRef.current.setFromCamera(mouseRef.current, camera);
      const intersects = raycasterRef.current.intersectObjects(scene.children, true);
      
      if (intersects.length > 0) {
        const object = intersects[0].object;
        if (object.userData.itemId) {
          onItemSelect(object.userData.itemId, event.shiftKey, event.ctrlKey || event.metaKey);
          
          // Attach transform controls
          if (selectedItems.includes(object.userData.itemId)) {
            transformControlsRef.current.attach(object);
          }
        }
      } else {
        // Click on empty space - deselect
        if (!event.shiftKey && !event.ctrlKey && !event.metaKey) {
          onItemSelect(null);
          transformControlsRef.current.detach();
        }
      }
    };

    const handleResize = () => {
      if (!mountRef.current) return;
      
      const width = mountRef.current.clientWidth;
      const height = mountRef.current.clientHeight;
      
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      
      viewportRenderer.setSize(width, height);
      labelRenderer.setSize(width, height);
    };

    // Add event listeners
    viewportRenderer.domElement.addEventListener('mousemove', handleMouseMove);
    viewportRenderer.domElement.addEventListener('click', handleClick);
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      viewportRenderer.domElement.removeEventListener('mousemove', handleMouseMove);
      viewportRenderer.domElement.removeEventListener('click', handleClick);
      viewportRenderer.dispose();
      mountRef.current?.removeChild(viewportRenderer.domElement);
      mountRef.current?.removeChild(labelRenderer.domElement);
    };
  }, [scene, camera, viewport, layers]);

  // Update transform mode
  useEffect(() => {
    if (transformControlsRef.current) {
      transformControlsRef.current.setMode(transformMode);
    }
  }, [transformMode]);

  // Update selected objects
  useEffect(() => {
    if (!transformControlsRef.current || !scene) return;
    
    // Find selected objects
    let selectedObject = null;
    scene.traverse((child) => {
      if (child.userData.itemId && selectedItems.includes(child.userData.itemId)) {
        selectedObject = child;
      }
    });
    
    if (selectedObject) {
      transformControlsRef.current.attach(selectedObject);
    } else {
      transformControlsRef.current.detach();
    }
  }, [selectedItems, scene]);

  const setupCamera = () => {
    if (!camera) return;
    
    switch (viewport.type) {
      case 'top':
        camera.position.set(0, 20, 0);
        camera.up.set(0, 0, -1);
        camera.lookAt(0, 0, 0);
        break;
      case 'front':
        camera.position.set(0, 0, 20);
        camera.up.set(0, 1, 0);
        camera.lookAt(0, 0, 0);
        break;
      case 'side':
        camera.position.set(20, 0, 0);
        camera.up.set(0, 1, 0);
        camera.lookAt(0, 0, 0);
        break;
      case 'perspective':
        camera.position.set(10, 10, 10);
        camera.up.set(0, 1, 0);
        camera.lookAt(0, 0, 0);
        break;
    }
  };

  const getTransformIcon = () => {
    switch (transformMode) {
      case 'translate': return <Move size={16} />;
      case 'rotate': return <RotateCw size={16} />;
      case 'scale': return <Scale size={16} />;
      default: return <Move size={16} />;
    }
  };

  return (
    <div
      className={`absolute border ${viewportActive ? 'border-blue-500' : 'border-gray-300'} 
                  bg-gray-50 dark:bg-gray-900`}
      style={{
        left: `${viewport.position.x * 100}%`,
        top: `${viewport.position.y * 100}%`,
        width: `${viewport.position.width * 100}%`,
        height: `${viewport.position.height * 100}%`
      }}
      onMouseEnter={() => setViewportActive(true)}
      onMouseLeave={() => setViewportActive(false)}
    >
      <div ref={mountRef} className="w-full h-full" />
      
      {/* Viewport label */}
      <div className="absolute top-2 left-2 flex items-center space-x-2">
        <div className="bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs">
          {viewport.type.toUpperCase()}
        </div>
        {snapToGrid && (
          <div className="bg-black bg-opacity-50 text-white p-1 rounded">
            <Grid size={12} />
          </div>
        )}
        <div className="bg-black bg-opacity-50 text-white p-1 rounded">
          {getTransformIcon()}
        </div>
      </div>
      
      {/* Viewport controls */}
      {viewportActive && (
        <div className="absolute top-2 right-2 flex space-x-1">
          <button
            className="bg-black bg-opacity-50 text-white p-1 rounded hover:bg-opacity-70"
            title="Frame Selected"
            onClick={() => {
              if (selectedItems.length > 0 && orbitControlsRef.current) {
                // Frame selected objects
                const box = new THREE.Box3();
                scene.traverse((child) => {
                  if (child.userData.itemId && selectedItems.includes(child.userData.itemId)) {
                    box.expandByObject(child);
                  }
                });
                
                const center = box.getCenter(new THREE.Vector3());
                const size = box.getSize(new THREE.Vector3());
                const maxDim = Math.max(size.x, size.y, size.z);
                const fov = camera.fov * (Math.PI / 180);
                const distance = maxDim / (2 * Math.tan(fov / 2));
                
                camera.position.copy(center);
                camera.position.z += distance * 1.5;
                orbitControlsRef.current.target.copy(center);
              }
            }}
          >
            <Crosshair size={14} />
          </button>
          <button
            className="bg-black bg-opacity-50 text-white p-1 rounded hover:bg-opacity-70"
            title="Maximize Viewport"
            onClick={() => {
              // Toggle viewport maximization
              // This would be handled by parent component
            }}
          >
            <Maximize2 size={14} />
          </button>
        </div>
      )}
      
      {/* Hovered object info */}
      {hoveredObject && (
        <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs">
          {hoveredObject.name || hoveredObject.userData.itemId}
        </div>
      )}
    </div>
  );
};

export default ThreeDViewport;