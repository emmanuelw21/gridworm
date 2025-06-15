// components/ThreeDGrid/ThreeDBookshelf.jsx
import * as THREE from 'three';
import React, { useRef, useEffect, useState } from 'react';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry';
import { 
  Plus, Folder, Book, Box, Search, Filter,
  Grid, List, ChevronLeft, ChevronRight 
} from 'lucide-react';

const ThreeDBookshelf = ({
  collections,
  onCollectionSelect,
  onVolumeCreate,
  onCollectionCreate,
  darkMode,
  viewMode = '3d' // '3d', 'grid', 'list'
}) => {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const labelRendererRef = useRef(null);
  const [selectedCollection, setSelectedCollection] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [hoveredBook, setHoveredBook] = useState(null);
  const [shelfLayout, setShelfLayout] = useState('library'); // 'library', 'carousel', 'wall'

  useEffect(() => {
    if (!mountRef.current || viewMode !== '3d') return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(darkMode ? 0x1a1a1a : 0xf5f5f5);
    scene.fog = new THREE.Fog(scene.background, 10, 50);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(
      60,
      mountRef.current.clientWidth / mountRef.current.clientHeight,
      0.1,
      100
    );
    camera.position.set(0, 5, 15);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;
    mountRef.current.appendChild(renderer.domElement);

    // CSS2D Renderer for labels
    const labelRenderer = new CSS2DRenderer();
    labelRenderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    labelRenderer.domElement.style.position = 'absolute';
    labelRenderer.domElement.style.top = '0';
    labelRendererRef.current = labelRenderer;
    mountRef.current.appendChild(labelRenderer.domElement);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const spotLight1 = new THREE.SpotLight(0xffffff, 0.8);
    spotLight1.position.set(10, 20, 10);
    spotLight1.angle = Math.PI / 6;
    spotLight1.penumbra = 0.3;
    spotLight1.castShadow = true;
    scene.add(spotLight1);

    const spotLight2 = new THREE.SpotLight(0xffffff, 0.4);
    spotLight2.position.set(-10, 20, -10);
    spotLight2.angle = Math.PI / 6;
    spotLight2.penumbra = 0.3;
    scene.add(spotLight2);

    // Floor
    const floorGeometry = new THREE.PlaneGeometry(50, 50);
    const floorMaterial = new THREE.MeshLambertMaterial({ 
      color: darkMode ? 0x2a2a2a : 0xe0e0e0 
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Create bookshelf
    createBookshelf(scene, collections);

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 5;
    controls.maxDistance = 30;
    controls.maxPolarAngle = Math.PI / 2;

    // Raycaster for interaction
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const onMouseMove = (event) => {
      const rect = mountRef.current.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(scene.children, true);

      if (intersects.length > 0) {
        const object = intersects[0].object;
        if (object.userData.collection) {
          setHoveredBook(object.userData.collection);
          mountRef.current.style.cursor = 'pointer';
        } else {
          setHoveredBook(null);
          mountRef.current.style.cursor = 'default';
        }
      } else {
        setHoveredBook(null);
        mountRef.current.style.cursor = 'default';
      }
    };

    const onClick = (event) => {
      const rect = mountRef.current.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(scene.children, true);

      if (intersects.length > 0) {
        const object = intersects[0].object;
        if (object.userData.collection) {
          setSelectedCollection(object.userData.collection);
          onCollectionSelect(object.userData.collection);
          
          // Animate camera to focus on selected book
          const bookPosition = object.getWorldPosition(new THREE.Vector3());
          const targetPosition = bookPosition.clone();
          targetPosition.z += 5;
          targetPosition.y += 2;
          
          // Smooth camera transition
          animateCamera(camera, targetPosition, bookPosition, controls);
        }
      }
    };

    renderer.domElement.addEventListener('mousemove', onMouseMove);
    renderer.domElement.addEventListener('click', onClick);

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();
      
      // Rotate books slightly on hover
      scene.traverse((child) => {
        if (child.userData.collection && child.userData.originalRotation !== undefined) {
          if (hoveredBook && hoveredBook.id === child.userData.collection.id) {
            child.rotation.z = child.userData.originalRotation + Math.sin(Date.now() * 0.003) * 0.05;
          } else {
            child.rotation.z = child.userData.originalRotation;
          }
        }
      });
      
      renderer.render(scene, camera);
      labelRenderer.render(scene, camera);
    };
    animate();

    // Handle resize
    const handleResize = () => {
      if (!mountRef.current) return;
      camera.aspect = mountRef.current.clientWidth / mountRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
      labelRenderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('mousemove', onMouseMove);
      renderer.domElement.removeEventListener('click', onClick);
      renderer.dispose();
      scene.clear();
      mountRef.current?.removeChild(renderer.domElement);
      mountRef.current?.removeChild(labelRenderer.domElement);
    };
  }, [collections, viewMode, darkMode, hoveredBook, shelfLayout]);

  const createBookshelf = (scene, collections) => {
    // Wood texture for shelves
    const woodTexture = new THREE.TextureLoader().load('/textures/wood.jpg'); // You'll need to provide this
    const shelfMaterial = new THREE.MeshLambertMaterial({ 
      color: 0x8B4513,
      map: woodTexture 
    });

    // Create shelves
    const shelfGeometry = new THREE.BoxGeometry(15, 0.5, 3);
    const shelvesPerColumn = 4;
    const shelfSpacing = 3.5;
    
    for (let i = 0; i < shelvesPerColumn; i++) {
      const shelf = new THREE.Mesh(shelfGeometry, shelfMaterial);
      shelf.position.y = i * shelfSpacing - 2;
      shelf.castShadow = true;
      shelf.receiveShadow = true;
      scene.add(shelf);
      
      // Side supports
      const supportGeometry = new THREE.BoxGeometry(0.5, shelfSpacing - 0.5, 3);
      const leftSupport = new THREE.Mesh(supportGeometry, shelfMaterial);
      leftSupport.position.set(-7.25, i * shelfSpacing - 2 + shelfSpacing / 2, 0);
      leftSupport.castShadow = true;
      scene.add(leftSupport);
      
      const rightSupport = new THREE.Mesh(supportGeometry, shelfMaterial);
      rightSupport.position.set(7.25, i * shelfSpacing - 2 + shelfSpacing / 2, 0);
      rightSupport.castShadow = true;
      scene.add(rightSupport);
    }

    // Create books (collections)
    const booksPerShelf = 12;
    const bookSpacing = 14 / booksPerShelf;
    
    collections.forEach((collection, index) => {
      const shelfIndex = Math.floor(index / booksPerShelf);
      const bookIndex = index % booksPerShelf;
      
      if (shelfIndex >= shelvesPerColumn) return; // Skip if no more shelves
      
      // Book dimensions with variation
      const bookWidth = 0.5 + Math.random() * 0.3;
      const bookHeight = 2 + Math.random() * 0.5;
      const bookDepth = 0.3 + Math.random() * 0.2;
      
      // Book geometry
      const bookGeometry = new THREE.BoxGeometry(bookWidth, bookHeight, bookDepth);
      
      // Book material with random color
      const bookColor = new THREE.Color().setHSL(Math.random(), 0.6, 0.5);
      const bookMaterial = new THREE.MeshLambertMaterial({ color: bookColor });
      
      const book = new THREE.Mesh(bookGeometry, bookMaterial);
      book.position.set(
        -7 + bookIndex * bookSpacing + bookWidth / 2,
        shelfIndex * shelfSpacing - 2 + bookHeight / 2 + 0.25,
        0
      );
      
      // Slight random rotation for realism
      book.rotation.z = (Math.random() - 0.5) * 0.1;
      book.userData.originalRotation = book.rotation.z;
      book.userData.collection = collection;
      book.castShadow = true;
      book.receiveShadow = true;
      
      scene.add(book);
      
      // Add label
      const labelDiv = document.createElement('div');
      labelDiv.className = 'book-label';
      labelDiv.textContent = collection.name;
      labelDiv.style.padding = '2px 6px';
      labelDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
      labelDiv.style.color = 'white';
      labelDiv.style.fontSize = '10px';
      labelDiv.style.borderRadius = '3px';
      labelDiv.style.whiteSpace = 'nowrap';
      labelDiv.style.pointerEvents = 'none';
      
      const label = new CSS2DObject(labelDiv);
      label.position.set(0, -bookHeight / 2 - 0.5, 0);
      book.add(label);
      
      // Add spine text (optional - requires font loading)
      if (collection.thumbnail) {
        const textureLoader = new THREE.TextureLoader();
        textureLoader.load(collection.thumbnail, (texture) => {
          const spineMaterial = new THREE.MeshLambertMaterial({ map: texture });
          book.material = [
            bookMaterial, // right
            bookMaterial, // left
            bookMaterial, // top
            bookMaterial, // bottom
            spineMaterial, // front (spine)
            bookMaterial  // back
          ];
        });
      }
    });
  };

  const animateCamera = (camera, targetPosition, lookAtPosition, controls) => {
    const startPosition = camera.position.clone();
    const startTarget = controls.target.clone();
    const duration = 1000;
    const startTime = Date.now();
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeProgress = 1 - Math.pow(1 - progress, 3); // Ease out cubic
      
      camera.position.lerpVectors(startPosition, targetPosition, easeProgress);
      controls.target.lerpVectors(startTarget, lookAtPosition, easeProgress);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    animate();
  };

  // Grid view component
  const GridView = () => (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4 p-4">
      {collections.map(collection => (
        <div
          key={collection.id}
          className="group cursor-pointer transform transition-transform hover:scale-105"
          onClick={() => onCollectionSelect(collection)}
        >
          <div className="relative aspect-[3/4] bg-gradient-to-br from-gray-300 to-gray-400 
                          dark:from-gray-700 dark:to-gray-800 rounded-lg shadow-lg overflow-hidden">
            {collection.thumbnail && (
              <img
                src={collection.thumbnail}
                alt={collection.name}
                className="absolute inset-0 w-full h-full object-cover"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent 
                            opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="absolute bottom-0 left-0 right-0 p-3">
                <h3 className="text-white font-semibold text-sm">{collection.name}</h3>
                <p className="text-gray-300 text-xs mt-1">
                  {collection.items?.length || 0} items
                </p>
              </div>
            </div>
          </div>
          <h3 className="mt-2 text-sm font-medium text-gray-800 dark:text-gray-200 text-center">
            {collection.name}
          </h3>
        </div>
      ))}
      
      {/* Add new collection */}
      <div
        className="group cursor-pointer transform transition-transform hover:scale-105"
        onClick={onCollectionCreate}
      >
        <div className="relative aspect-[3/4] bg-gray-200 dark:bg-gray-700 rounded-lg 
                        shadow-lg overflow-hidden border-2 border-dashed border-gray-400 
                        dark:border-gray-600 flex items-center justify-center">
          <Plus size={48} className="text-gray-400 dark:text-gray-600 
                                     group-hover:text-gray-600 dark:group-hover:text-gray-400 
                                     transition-colors" />
        </div>
        <h3 className="mt-2 text-sm font-medium text-gray-600 dark:text-gray-400 text-center">
          New Collection
        </h3>
      </div>
    </div>
  );

  // List view component
  const ListView = () => (
    <div className="p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 
                             dark:text-gray-300 uppercase tracking-wider">
                Collection
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 
                             dark:text-gray-300 uppercase tracking-wider">
                Items
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 
                             dark:text-gray-300 uppercase tracking-wider">
                Created
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 
                             dark:text-gray-300 uppercase tracking-wider">
                Modified
              </th>
              <th className="px-6 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {collections.map(collection => (
              <tr
                key={collection.id}
                className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                onClick={() => onCollectionSelect(collection)}
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    {collection.thumbnail ? (
                      <img
                        src={collection.thumbnail}
                        alt={collection.name}
                        className="w-10 h-10 rounded object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded bg-gray-300 dark:bg-gray-600 
                                      flex items-center justify-center">
                        <Folder size={20} className="text-gray-500 dark:text-gray-400" />
                      </div>
                    )}
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {collection.name}
                      </div>
                      {collection.description && (
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {collection.description}
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {collection.items?.length || 0}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {new Date(collection.created).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {new Date(collection.modified).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    className="text-blue-600 hover:text-blue-900 dark:text-blue-400 
                               dark:hover:text-blue-300"
                    onClick={(e) => {
                      e.stopPropagation();
                      onVolumeCreate(collection.id);
                    }}
                  >
                    Create Volume
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="flex-shrink-0 bg-white dark:bg-gray-800 shadow-sm border-b 
                      border-gray-200 dark:border-gray-700">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Media Library
            </h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 
                                 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search collections..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 
                           rounded-lg bg-white dark:bg-gray-700 text-gray-900 
                           dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 
                           focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* View mode selector */}
            <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
              <button
                onClick={() => setShelfLayout('library')}
                className={`p-2 rounded ${viewMode === '3d' ? 'bg-white dark:bg-gray-600 shadow' : ''}`}
                title="3D Bookshelf"
              >
                <Box size={18} />
              </button>
              <button
                onClick={() => setShelfLayout('grid')}
                className={`p-2 rounded ${viewMode === 'grid' ? 'bg-white dark:bg-gray-600 shadow' : ''}`}
                title="Grid View"
              >
                <Grid size={18} />
              </button>
              <button
                onClick={() => setShelfLayout('list')}
                className={`p-2 rounded ${viewMode === 'list' ? 'bg-white dark:bg-gray-600 shadow' : ''}`}
                title="List View"
              >
                <List size={18} />
              </button>
            </div>
            
            <button
              onClick={onCollectionCreate}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 
                         transition-colors flex items-center space-x-2"
            >
              <Plus size={18} />
              <span>New Collection</span>
            </button>
          </div>
        </div>
        
        {/* 3D view layout options */}
        {viewMode === '3d' && (
          <div className="px-4 pb-3 flex items-center space-x-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">Layout:</span>
            <button
              onClick={() => setShelfLayout('library')}
              className={`px-3 py-1 text-sm rounded ${
                shelfLayout === 'library' 
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' 
                  : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              Library
            </button>
            <button
              onClick={() => setShelfLayout('carousel')}
              className={`px-3 py-1 text-sm rounded ${
                shelfLayout === 'carousel' 
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' 
                  : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              Carousel
            </button>
            <button
              onClick={() => setShelfLayout('wall')}
              className={`px-3 py-1 text-sm rounded ${
                shelfLayout === 'wall' 
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' 
                  : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              Wall
            </button>
          </div>
        )}
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {viewMode === '3d' && (
          <div ref={mountRef} className="w-full h-full" />
        )}
        {viewMode === 'grid' && <GridView />}
        {viewMode === 'list' && <ListView />}
      </div>
      
      {/* Selected collection info */}
      {selectedCollection && (
        <div className="absolute bottom-4 left-4 right-4 bg-white dark:bg-gray-800 
                        rounded-lg shadow-lg p-4 max-w-md mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                {selectedCollection.name}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {selectedCollection.items?.length || 0} items
              </p>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => onCollectionSelect(selectedCollection)}
                className="px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 
                           text-sm"
              >
                Open
              </button>
              <button
                onClick={() => onVolumeCreate(selectedCollection.id)}
                className="px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 
                           text-sm"
              >
                Export Volume
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ThreeDBookshelf;