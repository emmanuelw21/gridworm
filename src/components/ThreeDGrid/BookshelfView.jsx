// components/Collections/BookshelfView.jsx
const BookshelfView = ({ collections, onCollectionSelect, onVolumeCreate }) => {
  const [view3D, setView3D] = useState(true);

  return (
    <div className="h-full overflow-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Media Library</h2>
        <div className="flex space-x-2">
          <button 
            onClick={() => setView3D(!view3D)}
            className="px-3 py-1 bg-blue-500 text-white rounded"
          >
            {view3D ? '2D View' : '3D Bookshelf'}
          </button>
          <button className="px-3 py-1 bg-green-500 text-white rounded">
            New Collection
          </button>
        </div>
      </div>

      {view3D ? (
        <Bookshelf3D collections={collections} onSelect={onCollectionSelect} />
      ) : (
        <div className="grid grid-cols-4 gap-4">
          {collections.map(collection => (
            <CollectionCard
              key={collection.id}
              collection={collection}
              onSelect={() => onCollectionSelect(collection)}
              onCreateVolume={() => onVolumeCreate(collection.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const Bookshelf3D = ({ collections, onSelect }) => {
  // Three.js bookshelf visualization
  const shelfRef = useRef();
  
  useEffect(() => {
    // Create 3D bookshelf with collections as books
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer();
    
    // Add shelves
    const shelfGeometry = new THREE.BoxGeometry(10, 0.2, 2);
    const shelfMaterial = new THREE.MeshPhongMaterial({ color: 0x8B4513 });
    
    for (let i = 0; i < 5; i++) {
      const shelf = new THREE.Mesh(shelfGeometry, shelfMaterial);
      shelf.position.y = i * 3 - 6;
      scene.add(shelf);
    }
    
    // Add books (collections)
    collections.forEach((collection, index) => {
      const bookGeometry = new THREE.BoxGeometry(
        0.8 + Math.random() * 0.4,
        2.5,
        0.3 + Math.random() * 0.2
      );
      const bookMaterial = new THREE.MeshPhongMaterial({
        color: new THREE.Color().setHSL(Math.random(), 0.7, 0.5)
      });
      
      const book = new THREE.Mesh(bookGeometry, bookMaterial);
      const row = Math.floor(index / 10);
      const col = index % 10;
      
      book.position.set(
        col - 4.5,
        row * 3 - 5,
        0
      );
      book.userData = { collection };
      scene.add(book);
    });
    
    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    const pointLight = new THREE.PointLight(0xffffff, 0.8);
    pointLight.position.set(5, 5, 5);
    scene.add(pointLight);
    
    camera.position.z = 15;
    
    // Raycaster for selection
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    
    const onMouseClick = (event) => {
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
      
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(scene.children);
      
      if (intersects.length > 0 && intersects[0].object.userData.collection) {
        onSelect(intersects[0].object.userData.collection);
      }
    };
    
    renderer.domElement.addEventListener('click', onMouseClick);
    shelfRef.current.appendChild(renderer.domElement);
    
    const animate = () => {
      requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();
    
    return () => {
      renderer.domElement.removeEventListener('click', onMouseClick);
      shelfRef.current.removeChild(renderer.domElement);
    };
  }, [collections, onSelect]);
  
  return <div ref={shelfRef} className="w-full h-full" />;
};