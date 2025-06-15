// hooks/useKeyboardShortcuts.js
const useKeyboardShortcuts = () => {
  useEffect(() => {
    const shortcuts = {
      // Tools
      'v': () => setActiveTool('select'),
      'a': () => setActiveTool('direct-select'),
      'p': () => setActiveTool('pen'),
      'r': () => setActiveTool('rectangle'),
      'e': () => setActiveTool('ellipse'),
      't': () => setActiveTool('text'),
      'i': () => setActiveTool('eyedropper'),
      'k': () => setActiveTool('paint-bucket'),
      
      // View
      'cmd+0': () => resetZoom(),
      'cmd+=': () => zoomIn(),
      'cmd+-': () => zoomOut(),
      'space': (e) => { e.preventDefault(); startPan(); },
      
      // Edit
      'cmd+c': () => copySelected(),
      'cmd+v': () => paste(),
      'cmd+x': () => cutSelected(),
      'cmd+d': () => duplicateSelected(),
      'cmd+a': () => selectAll(),
      'cmd+shift+a': () => deselectAll(),
      'delete': () => deleteSelected(),
      
      // Layers
      'cmd+shift+n': () => createNewLayer(),
      'cmd+g': () => groupSelected(),
      'cmd+shift+g': () => ungroupSelected(),
      'cmd+e': () => mergeDown(),
      
      // Transform
      'cmd+t': () => enterTransformMode(),
      'cmd+shift+t': () => repeatLastTransform(),
      
      // 3D specific
      '1': () => setViewport('top'),
      '2': () => setViewport('front'),
      '3': () => setViewport('side'),
      '4': () => setViewport('perspective'),
      '5': () => setViewport('quad'),
      
      // Snap
      'shift': () => enableProportionalScale(),
      'alt': () => enableFromCenter(),
      'cmd': () => toggleSnapToGrid(),
    };
    
    const handleKeyDown = (e) => {
      const key = getKeyCombo(e);
      if (shortcuts[key]) {
        shortcuts[key](e);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
};