// utils/performanceUtils.js
export const disposeThreeObject = (object) => {
  if (!object) return;

  // First collect all children to dispose
  const childrenToDispose = [];
  if (object.children) {
    object.traverse((child) => {
      if (child !== object) {
        childrenToDispose.push(child);
      }
    });
  }

  // Remove from parent first
  if (object.parent) {
    object.parent.remove(object);
  }

  // Dispose geometry
  if (object.geometry) {
    object.geometry.dispose();
  }

  // Dispose material(s)
  if (object.material) {
    if (Array.isArray(object.material)) {
      object.material.forEach(material => {
        if (material.map) material.map.dispose();
        if (material.normalMap) material.normalMap.dispose();
        if (material.roughnessMap) material.roughnessMap.dispose();
        if (material.metalnessMap) material.metalnessMap.dispose();
        if (material.envMap) material.envMap.dispose();
        material.dispose();
      });
    } else {
      if (object.material.map) object.material.map.dispose();
      if (object.material.normalMap) object.material.normalMap.dispose();
      if (object.material.roughnessMap) object.material.roughnessMap.dispose();
      if (object.material.metalnessMap) object.material.metalnessMap.dispose();
      if (object.material.envMap) object.material.envMap.dispose();
      object.material.dispose();
    }
  }

  // Clear children array
  if (object.children) {
    object.children = [];
  }

  // Dispose children that were collected
  childrenToDispose.forEach(child => {
    disposeThreeObject(child);
  });
};

export class ListenerManager {
  constructor() {
    this.listeners = new Map();
  }
  
  add(element, event, handler, options) {
    if (!this.listeners.has(element)) {
      this.listeners.set(element, new Map());
    }
    const elementListeners = this.listeners.get(element);
    if (!elementListeners.has(event)) {
      elementListeners.set(event, new Set());
    }
    elementListeners.get(event).add({ handler, options });
    element.addEventListener(event, handler, options);
  }
  
  remove(element, event, handler) {
    if (!this.listeners.has(element)) return;
    
    const elementListeners = this.listeners.get(element);
    if (!elementListeners.has(event)) return;
    
    const handlers = elementListeners.get(event);
    handlers.forEach(({ handler: h, options }) => {
      if (h === handler) {
        element.removeEventListener(event, h, options);
        handlers.delete({ handler: h, options });
      }
    });
  }
  
  removeAll() {
    this.listeners.forEach((events, element) => {
      events.forEach((handlers, event) => {
        handlers.forEach(({ handler, options }) => {
          element.removeEventListener(event, handler, options);
        });
      });
    });
    this.listeners.clear();
  }
}

export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

export const throttle = (func, limit) => {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};