// components/ThreeDGrid/helpers3D.js
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader';

import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader';
import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader';
import { ColladaLoader } from 'three/examples/jsm/loaders/ColladaLoader';
import { TDSLoader } from 'three/examples/jsm/loaders/TDSLoader';

export const is3D = (type) => {
  if (!type) return false;
  const fileType = type.toLowerCase();
  const supported3DTypes = ['gltf', 'glb', 'obj', 'fbx', 'stl', 'ply', '3ds', 'dae'];
  return supported3DTypes.some(ext => fileType.includes(ext));
};

export const get3DLoader = (type) => {
  const fileType = type.toLowerCase();
  
  if (fileType.includes('gltf') || fileType.includes('glb')) {
    const loader = new GLTFLoader();
    
    // Optional: Add Draco support for compressed models
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/');
    loader.setDRACOLoader(dracoLoader);
    
    return loader;
  } else if (fileType.includes('obj')) {
    return new OBJLoader();
  } else if (fileType.includes('fbx')) {
    return new FBXLoader();
  } else if (fileType.includes('stl')) {
    return new STLLoader();
  } else if (fileType.includes('ply')) {
    return new PLYLoader();
  } else if (fileType.includes('dae')) {
    return new ColladaLoader();
  } else if (fileType.includes('3ds')) {
    return new TDSLoader();
  }
  
  return null;
};

export const createGridHelper3D = (gridConfig) => {
  const size = Math.max(gridConfig.columns, gridConfig.rows) * gridConfig.cellSize;
  const divisions = Math.max(gridConfig.columns, gridConfig.rows);
  
  const gridHelper = new THREE.GridHelper(size, divisions, 0x888888, 0xcccccc);
  gridHelper.material.opacity = 0.3;
  gridHelper.material.transparent = true;
  
  return gridHelper;
};

export const snapToGrid3D = (position, gridSize) => {
  return new THREE.Vector3(
    Math.round(position.x / gridSize) * gridSize,
    Math.round(position.y / gridSize) * gridSize,
    Math.round(position.z / gridSize) * gridSize
  );
};

export const createBoundingBox = (object) => {
  const box = new THREE.BoxHelper(object, 0xffff00);
  box.material.linewidth = 2;
  return box;
};

export const calculateBoundingBox = (object) => {
  const box = new THREE.Box3().setFromObject(object);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  
  return { box, size, center };
};

export const normalizeModel = (model, targetSize = 10) => {
  const { box, size, center } = calculateBoundingBox(model);
  
  // Center the model
  model.position.sub(center);
  
  // Scale to fit target size
  const maxDimension = Math.max(size.x, size.y, size.z);
  const scale = targetSize / maxDimension;
  model.scale.multiplyScalar(scale);
  
  return model;
};

export const createLightSetup = (scene) => {
  // Ambient light for overall illumination
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);
  
  // Main directional light
  const directionalLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight1.position.set(10, 10, 5);
  directionalLight1.castShadow = true;
  directionalLight1.shadow.camera.near = 0.1;
  directionalLight1.shadow.camera.far = 50;
  directionalLight1.shadow.camera.left = -20;
  directionalLight1.shadow.camera.right = 20;
  directionalLight1.shadow.camera.top = 20;
  directionalLight1.shadow.camera.bottom = -20;
  directionalLight1.shadow.mapSize.width = 2048;
  directionalLight1.shadow.mapSize.height = 2048;
  directionalLight1.shadow.bias = -0.001;
  scene.add(directionalLight1);
  
  // Fill light
  const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.4);
  directionalLight2.position.set(-5, 5, -5);
  scene.add(directionalLight2);
  
  // Rim light for better definition
  const directionalLight3 = new THREE.DirectionalLight(0xffffff, 0.3);
  directionalLight3.position.set(0, -5, -10);
  scene.add(directionalLight3);
  
  return { ambientLight, directionalLight1, directionalLight2, directionalLight3 };
};

export const createEnvironment = (scene, options = {}) => {
  const {
    showGrid = true,
    showAxes = true,
    gridSize = 100,
    gridDivisions = 10,
    backgroundColor = 0xf0f0f0,
    fog = true
  } = options;
  
  // Background
  scene.background = new THREE.Color(backgroundColor);
  
  // Fog
  if (fog) {
    scene.fog = new THREE.Fog(backgroundColor, 50, 200);
  }
  
  // Grid
  if (showGrid) {
    const gridHelper = new THREE.GridHelper(gridSize, gridDivisions, 0x888888, 0xcccccc);
    gridHelper.material.opacity = 0.3;
    gridHelper.material.transparent = true;
    scene.add(gridHelper);
  }
  
  // Axes
  if (showAxes) {
    const axesHelper = new THREE.AxesHelper(gridSize / 2);
    scene.add(axesHelper);
  }
  
  // Ground plane for shadows
  const planeGeometry = new THREE.PlaneGeometry(gridSize * 2, gridSize * 2);
  const planeMaterial = new THREE.ShadowMaterial({ opacity: 0.2 });
  const plane = new THREE.Mesh(planeGeometry, planeMaterial);
  plane.rotation.x = -Math.PI / 2;
  plane.position.y = -0.01;
  plane.receiveShadow = true;
  scene.add(plane);
  
  return { plane };
};

export const createMaterialVariants = (baseColor = 0x808080) => {
  return {
    standard: new THREE.MeshStandardMaterial({
      color: baseColor,
      roughness: 0.5,
      metalness: 0.5
    }),
    basic: new THREE.MeshBasicMaterial({ color: baseColor }),
    phong: new THREE.MeshPhongMaterial({
      color: baseColor,
      shininess: 100
    }),
    lambert: new THREE.MeshLambertMaterial({ color: baseColor }),
    toon: new THREE.MeshToonMaterial({ color: baseColor }),
    wireframe: new THREE.MeshBasicMaterial({
      color: baseColor,
      wireframe: true
    })
  };
};

export const disposeObject = (object) => {
  if (!object) return;
  
  // Dispose geometries
  if (object.geometry) {
    object.geometry.dispose();
  }
  
  // Dispose materials
  if (object.material) {
    if (Array.isArray(object.material)) {
      object.material.forEach(material => disposeMaterial(material));
    } else {
      disposeMaterial(object.material);
    }
  }
  
  // Dispose children
  if (object.children) {
    for (let i = object.children.length - 1; i >= 0; i--) {
      disposeObject(object.children[i]);
    }
  }
};

const disposeMaterial = (material) => {
  if (!material) return;
  
  // Dispose textures
  Object.keys(material).forEach(key => {
    const value = material[key];
    if (value && typeof value === 'object' && 'minFilter' in value) {
      value.dispose();
    }
  });
  
  // Dispose material
  material.dispose();
};

export const animateRotation = (object, speed = 1) => {
  if (!object) return;
  
  object.rotation.y += 0.01 * speed;
};

export const createTextSprite = (text, parameters = {}) => {
  const {
    fontface = 'Arial',
    fontsize = 24,
    backgroundColor = { r: 255, g: 255, b: 255, a: 0.8 },
    textColor = { r: 0, g: 0, b: 0, a: 1.0 }
  } = parameters;
  
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  
  // Measure text
  context.font = `${fontsize}px ${fontface}`;
  const metrics = context.measureText(text);
  const textWidth = metrics.width;
  
  // Set canvas size
  canvas.width = textWidth + 20;
  canvas.height = fontsize + 20;
  
  // Background
  context.fillStyle = `rgba(${backgroundColor.r},${backgroundColor.g},${backgroundColor.b},${backgroundColor.a})`;
  context.fillRect(0, 0, canvas.width, canvas.height);
  
  // Text
  context.font = `${fontsize}px ${fontface}`;
  context.fillStyle = `rgba(${textColor.r},${textColor.g},${textColor.b},${textColor.a})`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(text, canvas.width / 2, canvas.height / 2);
  
  // Create texture
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  
  // Create sprite
  const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
  const sprite = new THREE.Sprite(spriteMaterial);
  sprite.scale.set(canvas.width / 100, canvas.height / 100, 1);
  
  return sprite;
};