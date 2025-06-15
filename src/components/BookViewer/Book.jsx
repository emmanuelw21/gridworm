// components/BookViewer/Book.jsx
import { useCursor } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useAtom } from "jotai";
import { easing } from "maath";
import { useEffect, useMemo, useRef, useState } from "react";
import { VideoThumbnailGenerator } from '../../utils/videoThumbnailGenerator';
import {
  Bone,
  BoxGeometry,
  Color,
  Float32BufferAttribute,
  MathUtils,
  MeshStandardMaterial,
  Skeleton,
  SkinnedMesh,
  SRGBColorSpace,
  TextureLoader,
  Uint16BufferAttribute,
  Vector3,
  VideoTexture,
  LinearFilter,
  RGBAFormat,
  CanvasTexture
} from "three";
import { degToRad } from "three/src/math/MathUtils.js";
import { pageAtom } from "./UI";

// Import your existing helpers
import { 
  is3D, 
  isVideo, 
  isImage, 
  isAnimated,
  getFileTypeCategory,
  getFileExtension 
} from '../MediaGrid/helpers';
import { thumbnailManager } from '../../utils/thumbnailManager';

// Global texture cache with enhanced video support
const textureCache = new Map();
const videoTextureCache = new Map();
const pendingLoads = new Map();
const textureLoader = new TextureLoader();

// Default page dimensions
const DEFAULT_PAGE_WIDTH = 1.28;
const DEFAULT_PAGE_HEIGHT = 1.71;
const PAGE_DEPTH = 0.003;
const PAGE_SEGMENTS = 30;

// Animation constants
const easingFactor = 0.5;
const easingFactorFold = 0.3;
const insideCurveStrength = 0.18;
const outsideCurveStrength = 0.05;
const turningCurveStrength = 0.09;

const whiteColor = new Color("white");
const emissiveColor = new Color("orange");

// Device detection utilities
const isMobileDevice = () => /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
const isIOSDevice = () => /iPhone|iPad|iPod/i.test(navigator.userAgent);
const isSafari = () => /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

// Enhanced media format detection
const getMediaFormat = (media) => {
  if (!media) return { type: 'unknown', category: 'unknown', mobileFriendly: false };
  
  const name = media.name || '';
  const type = media.type || '';
  const ext = getFileExtension(name);
  
  // Comprehensive format mapping with mobile compatibility info
  const formatMap = {
    // Video formats
    'webm': { 
      type: 'video/webm', 
      category: 'video', 
      mobileFriendly: false, // Not supported on iOS
      needsThumbnail: true 
    },
    'mov': { 
      type: 'video/quicktime', 
      category: 'video', 
      mobileFriendly: 'ios', // Only on iOS
      needsThumbnail: true 
    },
    'mp4': { 
      type: 'video/mp4', 
      category: 'video', 
      mobileFriendly: true, // Universal support
      needsThumbnail: false 
    },
    'avi': { 
      type: 'video/x-msvideo', 
      category: 'video', 
      mobileFriendly: false,
      needsThumbnail: true 
    },
    'mkv': { 
      type: 'video/x-matroska', 
      category: 'video', 
      mobileFriendly: false,
      needsThumbnail: true 
    },
    
    // Animated formats
    'gif': { 
      type: 'image/gif', 
      category: 'animated', 
      mobileFriendly: true,
      needsThumbnail: false 
    },
    
    // Image formats
    'webp': { 
      type: 'image/webp', 
      category: 'image', 
      mobileFriendly: true, // Now widely supported
      needsThumbnail: false 
    },
    'avif': { 
      type: 'image/avif', 
      category: 'image', 
      mobileFriendly: 'modern', // Only modern browsers
      needsThumbnail: false 
    },
    'jpg': { 
      type: 'image/jpeg', 
      category: 'image', 
      mobileFriendly: true,
      needsThumbnail: false 
    },
    'jpeg': { 
      type: 'image/jpeg', 
      category: 'image', 
      mobileFriendly: true,
      needsThumbnail: false 
    },
    'png': { 
      type: 'image/png', 
      category: 'image', 
      mobileFriendly: true,
      needsThumbnail: false 
    },
    'svg': { 
      type: 'image/svg+xml', 
      category: 'image', 
      mobileFriendly: true,
      needsThumbnail: false 
    },
    
    // 3D formats
    'glb': { 
      type: 'model/gltf-binary', 
      category: '3d', 
      mobileFriendly: false,
      needsThumbnail: true 
    },
    'gltf': { 
      type: 'model/gltf+json', 
      category: '3d', 
      mobileFriendly: false,
      needsThumbnail: true 
    },
    
    // Audio formats
    'mp3': { 
      type: 'audio/mpeg', 
      category: 'audio', 
      mobileFriendly: true,
      needsThumbnail: true 
    },
    'wav': { 
      type: 'audio/wav', 
      category: 'audio', 
      mobileFriendly: true,
      needsThumbnail: true 
    },
  };
  
  const format = formatMap[ext] || { 
    type: type || 'unknown', 
    category: getFileTypeCategory(media) || 'unknown', 
    mobileFriendly: false,
    needsThumbnail: true
  };
  
  return { ...format, extension: ext };
};

// Check browser support for image formats
const checkImageFormatSupport = (format) => {
  if (format === 'webp') {
    // WebP is now widely supported
    return true;
  }
  
  if (format === 'avif') {
    // Check AVIF support
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 1;
    return canvas.toDataURL('image/avif').indexOf('image/avif') === 5;
  }
  
  return true; // Assume other formats are supported
};

// Helper function to create a blank/loading texture
const createBlankTexture = (text = "Blank", isPlaceholder = false) => {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  
  if (isPlaceholder) {
    // Yellow background for placeholders
    ctx.fillStyle = '#FFC107';
    ctx.fillRect(0, 0, 512, 512);
    
    // Dark text
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 32px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('MISSING MEDIA', 256, 200);
    
    ctx.font = '20px Arial';
    ctx.fillText('[Add to media panel]', 256, 250);
    
    if (text && text !== "Blank") {
      ctx.font = '16px Arial';
      ctx.fillStyle = '#333333';
      const words = text.split(' ');
      let y = 300;
      for (let i = 0; i < words.length; i += 3) {
        const line = words.slice(i, i + 3).join(' ');
        ctx.fillText(line, 256, y);
        y += 25;
      }
    }
  } else {
    // Normal blank texture with gradient
    const gradient = ctx.createLinearGradient(0, 0, 512, 512);
    gradient.addColorStop(0, '#f5f5f5');
    gradient.addColorStop(1, '#e0e0e0');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 512, 512);
    
    // Add subtle pattern
    ctx.fillStyle = 'rgba(0, 0, 0, 0.03)';
    for (let i = 0; i < 512; i += 32) {
      ctx.fillRect(i, 0, 1, 512);
      ctx.fillRect(0, i, 512, 1);
    }
    
    ctx.fillStyle = '#999999';
    ctx.font = '24px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 256, 256);
  }
  
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
};

// Enhanced video texture creation with proper mobile handling
const createVideoTexture = (media) => {
  const cacheKey = `video-${media.id}`;
  
  if (videoTextureCache.has(cacheKey)) {
    return videoTextureCache.get(cacheKey).texture;
  }

  const video = document.createElement('video');
  video.crossOrigin = 'anonymous';
  video.loop = true;
  video.muted = true;
  video.playsInline = true; // Critical for iOS
  video.preload = 'metadata';
  
  // Enhanced mobile compatibility attributes
  video.setAttribute('webkit-playsinline', 'true');
  video.setAttribute('x-webkit-airplay', 'allow');
  video.setAttribute('x5-video-player-type', 'h5'); // For some Android browsers
  video.setAttribute('x5-video-player-fullscreen', 'false');
  
  // Set video source with proper error handling
  const url = media.url;
  if (url) {
    video.src = url;
    
    // Load video metadata
    video.load();
    
    const texture = new VideoTexture(video);
    texture.minFilter = LinearFilter;
    texture.magFilter = LinearFilter;
    texture.format = RGBAFormat;
    texture.colorSpace = SRGBColorSpace;
    texture.needsUpdate = true;
    
    // Store video reference for cleanup
    videoTextureCache.set(cacheKey, { texture, video });
    
    // Auto-play when ready with promise-based error handling
    video.addEventListener('loadeddata', () => {
      video.play().catch(error => {
        console.warn('Video autoplay failed (normal on mobile):', error);
        // Don't throw - just log the warning
      });
    });
    
    return texture;
  }
  
  return null;
};

// Main texture preloading function with comprehensive format support
const preloadTexture = async (media, mediaFiles) => {
  if (!media) return createBlankTexture();
  
  const cacheKey = typeof media === 'object' ? `media-${media.id}` : `string-${media}`;
  
  // Return cached texture immediately
  if (textureCache.has(cacheKey)) {
    return textureCache.get(cacheKey);
  }
  
  // Return pending load if already loading
  if (pendingLoads.has(cacheKey)) {
    return pendingLoads.get(cacheKey);
  }
  
  // Handle special cases
  if (media === 'blank') return createBlankTexture();
  if (media === 'cover' || media === 'gridworm-cover') return createBlankTexture('Cover');
  if (media === 'back-cover' || media === 'gridworm-back') return createBlankTexture('Back Cover');
  
  // Start new load
  const loadPromise = new Promise((resolve) => {
    let mediaFile = null;
    
    // Resolve the actual media file from the reference
    if (typeof media === 'object') {
      if (media.url || media.thumbnail) {
        mediaFile = media;
      } else if (media.id) {
        mediaFile = mediaFiles?.find(m => m.id === media.id);
      }
    } else if (typeof media === 'string') {
      mediaFile = mediaFiles?.find(m => m.id === media || m.name === media);
    }
    
    if (!mediaFile) {
      resolve(createBlankTexture("Invalid Reference"));
      return;
    }
    
    const format = getMediaFormat(mediaFile);
    const isMobile = isMobileDevice();
    
    console.log(`Loading texture for: ${mediaFile.name} (${format.extension})`);
    
    // Handle WebM and other video files specially
    if (format.extension === 'webm' || format.category === 'video') {
      // For desktop, create video texture
      if (!isMobile && mediaFile.url) {
        console.log(`Creating video texture for: ${mediaFile.name}`);
        
        // Create video element
        const video = document.createElement('video');
        video.crossOrigin = 'anonymous';
        video.src = mediaFile.url;
        video.loop = true;
        video.muted = true;
        video.playsInline = true;
        video.autoplay = true;
        
        // Create texture from video
        video.addEventListener('loadeddata', () => {
          const texture = new VideoTexture(video);
          texture.minFilter = LinearFilter;
          texture.magFilter = LinearFilter;
          texture.format = RGBAFormat;
          texture.colorSpace = SRGBColorSpace;
          texture.needsUpdate = true;
          
          // Play the video
          video.play().catch(e => {
            console.warn('Video autoplay failed:', e);
            // Create a play button overlay
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth || 512;
            canvas.height = video.videoHeight || 512;
            const ctx = canvas.getContext('2d');
            
            // Draw first frame
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            
            // Add play button overlay
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = 'white';
            ctx.font = '48px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('▶', canvas.width/2, canvas.height/2);
            
            const staticTexture = new CanvasTexture(canvas);
            staticTexture.colorSpace = SRGBColorSpace;
            staticTexture.needsUpdate = true;
            
            textureCache.set(cacheKey, staticTexture);
            pendingLoads.delete(cacheKey);
            resolve(staticTexture);
            return;
          });
          
          textureCache.set(cacheKey, texture);
          pendingLoads.delete(cacheKey);
          resolve(texture);
        });
        
        video.addEventListener('error', (e) => {
          console.error(`Error loading video ${mediaFile.name}:`, e);
          resolve(createBlankTexture(`Video Error: ${mediaFile.name}`));
        });
        
        // Start loading
        video.load();
        return;
      }
      
      // For mobile or if no URL, create a static preview
      if (mediaFile.thumbnail) {
        textureLoader.load(
          mediaFile.thumbnail,
          (texture) => {
            texture.colorSpace = SRGBColorSpace;
            texture.needsUpdate = true;
            textureCache.set(cacheKey, texture);
            pendingLoads.delete(cacheKey);
            resolve(texture);
          },
          undefined,
          () => resolve(createBlankTexture(`Video: ${mediaFile.name}`))
        );
      } else {
        // Create video icon placeholder
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(0, 0, 512, 512);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 64px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('🎬', 256, 200);
        ctx.font = 'bold 32px Arial';
        ctx.fillText('WebM', 256, 280);
        ctx.font = '16px Arial';
        const displayName = mediaFile.name.length > 30 
          ? mediaFile.name.substring(0, 27) + '...' 
          : mediaFile.name;
        ctx.fillText(displayName, 256, 320);
        
        const texture = new CanvasTexture(canvas);
        texture.colorSpace = SRGBColorSpace;
        texture.needsUpdate = true;
        
        textureCache.set(cacheKey, texture);
        pendingLoads.delete(cacheKey);
        resolve(texture);
      }
      return;
    }
    
    // For images (including WebP), load directly
    if (format.category === 'image' || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(format.extension)) {
      const urlToLoad = mediaFile.url || mediaFile.thumbnail;
      if (urlToLoad) {
        textureLoader.load(
          urlToLoad,
          (texture) => {
            texture.colorSpace = SRGBColorSpace;
            texture.needsUpdate = true;
            texture.anisotropy = isMobile ? 4 : 16;
            texture.minFilter = LinearFilter;
            texture.magFilter = LinearFilter;
            texture.generateMipmaps = !isMobile;
            
            textureCache.set(cacheKey, texture);
            pendingLoads.delete(cacheKey);
            resolve(texture);
          },
          undefined,
          (err) => {
            console.error(`Error loading texture for ${mediaFile.name}:`, err);
            resolve(createBlankTexture(mediaFile.name));
          }
        );
      } else {
        resolve(createBlankTexture('No URL'));
      }
      return;
    }
    
    // For other types, use thumbnail if available
    if (mediaFile.thumbnail) {
      textureLoader.load(
        mediaFile.thumbnail,
        (texture) => {
          texture.colorSpace = SRGBColorSpace;
          texture.needsUpdate = true;
          textureCache.set(cacheKey, texture);
          pendingLoads.delete(cacheKey);
          resolve(texture);
        },
        undefined,
        () => resolve(createBlankTexture(mediaFile.name))
      );
    } else {
      resolve(createBlankTexture(`${format.extension.toUpperCase()}: ${mediaFile.name}`));
    }
  });
  
  pendingLoads.set(cacheKey, loadPromise);
  return loadPromise;
};

// Create page geometry with dynamic dimensions
const createPageGeometry = (pageWidth, pageHeight) => {
  const segmentWidth = pageWidth / PAGE_SEGMENTS;
  const geometry = new BoxGeometry(
    pageWidth,
    pageHeight,
    PAGE_DEPTH,
    PAGE_SEGMENTS,
    2
  );
  geometry.translate(pageWidth / 2, 0, 0);

  const position = geometry.attributes.position;
  const vertex = new Vector3();
  const skinIndexes = [];
  const skinWeights = [];

  for (let i = 0; i < position.count; i++) {
    vertex.fromBufferAttribute(position, i);
    const x = vertex.x;
    const skinIndex = Math.max(0, Math.floor(x / segmentWidth));
    let skinWeight = (x % segmentWidth) / segmentWidth;
    skinIndexes.push(skinIndex, skinIndex + 1, 0, 0);
    skinWeights.push(1 - skinWeight, skinWeight, 0, 0);
  }

  geometry.setAttribute("skinIndex", new Uint16BufferAttribute(skinIndexes, 4));
  geometry.setAttribute("skinWeight", new Float32BufferAttribute(skinWeights, 4));
  
  return { geometry, segmentWidth };
};

// Page component with optimized texture loading and video playback control
const Page = ({ number, front, back, page, opened, bookClosed, mediaFiles, pageWidth, pageHeight, totalPages }) => {
  const [textures, setTextures] = useState({ front: null, back: null });
  const [picture, setPicture] = useState(null);
  const [picture2, setPicture2] = useState(null);
  const [pageGeometry, setPageGeometry] = useState(null);
  const [segmentWidth, setSegmentWidth] = useState(0);
  
  const group = useRef();
  const turnedAt = useRef(0);
  const lastOpened = useRef(opened);
  const skinnedMeshRef = useRef();
  const [highlighted, setHighlighted] = useState(false);
  useCursor(highlighted);

  // Create geometry when dimensions change
  useEffect(() => {
    const { geometry, segmentWidth: segWidth } = createPageGeometry(pageWidth, pageHeight);
    setPageGeometry(geometry);
    setSegmentWidth(segWidth);
    
    return () => {
      geometry.dispose();
    };
  }, [pageWidth, pageHeight]);

  // Preload textures before they're needed
  useEffect(() => {
    let mounted = true;
    
    const loadTextures = async () => {
      try {
        const [frontTex, backTex] = await Promise.all([
          preloadTexture(front, mediaFiles),
          preloadTexture(back, mediaFiles)
        ]);
        
        if (mounted) {
          setTextures({ front: frontTex, back: backTex });
          setPicture(frontTex);
          setPicture2(backTex);
        }
      } catch (error) {
        console.error('Error loading page textures:', error);
      }
    };
    
    loadTextures();
    
    return () => {
      mounted = false;
    };
  }, [front, back, mediaFiles]);

  // Create skinned mesh with improved material properties
  const manualSkinnedMesh = useMemo(() => {
    // Use picture and picture2, not textures
    if (!picture || !picture2 || !pageGeometry) return null;
    
    const bones = [];
    for (let i = 0; i <= PAGE_SEGMENTS; i++) {
      let bone = new Bone();
      bones.push(bone);
      bone.position.x = i === 0 ? 0 : segmentWidth;
      if (i > 0) bones[i - 1].add(bone);
    }
    const skeleton = new Skeleton(bones);

    // Updated materials with paper-like properties
    const materials = [
      new MeshStandardMaterial({ color: whiteColor }),
      new MeshStandardMaterial({ color: "#111" }),
      new MeshStandardMaterial({ color: whiteColor }),
      new MeshStandardMaterial({ color: whiteColor }),
      new MeshStandardMaterial({
        color: whiteColor,
        map: picture,
        roughness: 0.95,
        metalness: 0,
        emissive: new Color(0x000000),
        emissiveIntensity: 0,
        envMapIntensity: 0.3,
      }),
      new MeshStandardMaterial({
        color: whiteColor,
        map: picture2,
        roughness: 0.95,
        metalness: 0,
        emissive: new Color(0x000000),
        emissiveIntensity: 0,
        envMapIntensity: 0.3,
      }),
    ];

    const mesh = new SkinnedMesh(pageGeometry, materials);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    mesh.add(skeleton.bones[0]);
    mesh.bind(skeleton);
    return mesh;
  }, [picture, picture2, pageGeometry, segmentWidth]);

  // Page turning animation
  useFrame((_, delta) => {
    if (!skinnedMeshRef.current) return;

    const emissiveIntensity = highlighted ? 0.02 : 0; // Very subtle highlight
    skinnedMeshRef.current.material[4].emissiveIntensity =
      skinnedMeshRef.current.material[5].emissiveIntensity = MathUtils.lerp(
        skinnedMeshRef.current.material[4].emissiveIntensity,
        emissiveIntensity,
        0.1
      );

    if (lastOpened.current !== opened) {
      turnedAt.current = +new Date();
      lastOpened.current = opened;
    }
    
    let turningTime = Math.min(400, new Date() - turnedAt.current) / 400;
    turningTime = Math.sin(turningTime * Math.PI);

    let targetRotation = opened ? -Math.PI / 2 : Math.PI / 2;
    
    // Special handling for back cover
    const isBackCover = page === totalPages - 1 && number === totalPages - 1;
    if (bookClosed && isBackCover) {
      targetRotation = -Math.PI / 2;
    }
    
    if (!bookClosed) targetRotation += degToRad(number * 0.8);

    const bones = skinnedMeshRef.current.skeleton.bones;
    for (let i = 0; i < bones.length; i++) {
      const target = i === 0 ? group.current : bones[i];
      const insideCurveIntensity = i < 8 ? Math.sin(i * 0.2 + 0.25) : 0;
      const outsideCurveIntensity = i >= 8 ? Math.cos(i * 0.3 + 0.09) : 0;
      const turningIntensity = Math.sin(i * Math.PI * (1 / bones.length)) * turningTime;
      
      let rotationAngle =
        insideCurveStrength * insideCurveIntensity * targetRotation -
        outsideCurveStrength * outsideCurveIntensity * targetRotation +
        turningCurveStrength * turningIntensity * targetRotation;
      let foldRotationAngle = degToRad(Math.sign(targetRotation) * 2);

      if (bookClosed) {
        if (i === 0) {
          rotationAngle = targetRotation;
          foldRotationAngle = 0;
        } else {
          rotationAngle = 0;
          foldRotationAngle = 0;
        }
      }

      easing.dampAngle(target.rotation, "y", rotationAngle, easingFactor, delta);

      const foldIntensity =
        i > 8 ? Math.sin(i * Math.PI * (1 / bones.length) - 0.5) * turningTime : 0;
      easing.dampAngle(target.rotation, "x", foldRotationAngle * foldIntensity, easingFactorFold, delta);
    }
  });

  const [_, setPage] = useAtom(pageAtom);

return (
    <group
      ref={group}
      onPointerEnter={(e) => {
        e.stopPropagation();
        setHighlighted(true);
      }}
      onPointerLeave={(e) => {
        e.stopPropagation();
        setHighlighted(false);
      }}
      onClick={(e) => {
        e.stopPropagation();
        setPage(opened ? number : number + 1);
        setHighlighted(false);
      }}
    >
      {manualSkinnedMesh && (
        <primitive
          object={manualSkinnedMesh}
          ref={skinnedMeshRef}
          position-z={-number * PAGE_DEPTH + page * PAGE_DEPTH}
        />
      )}
    </group>
  );
};

// Main Book component with preloading and enhanced cleanup
export const Book = ({ 
  pages, 
  volumeId, 
  volumeMetadata, 
  mediaFiles, 
  scale = 1,
  pageWidth = DEFAULT_PAGE_WIDTH,
  pageHeight = DEFAULT_PAGE_HEIGHT,
  ...props 
}) => {
  const [page] = useAtom(pageAtom);
  const [delayedPage, setDelayedPage] = useState(page);

  // Preload all textures when book opens
  useEffect(() => {
    if (!pages || pages.length === 0) return;
    
    const preloadAll = async () => {
      console.log('Preloading textures for', pages.length, 'pages');
      const allMedia = pages.flatMap(p => [p.front, p.back]).filter(Boolean);
      const uniqueMedia = [...new Set(allMedia.map(m => 
        typeof m === 'object' ? m.id : m
      ))].map(id => 
        typeof id === 'string' ? allMedia.find(m => 
          (typeof m === 'object' && m.id === id) || m === id
        ) : id
      );
      
      await Promise.all(uniqueMedia.map(m => preloadTexture(m, mediaFiles)));
      console.log('Texture preloading complete');
    };
    
    preloadAll();
  }, [pages, mediaFiles]);

  // Page turning animation with smooth transitions
  useEffect(() => {
    let timeout;
    const goToPage = () => {
      setDelayedPage((prev) => {
        if (page === prev) return prev;
        const pageDiff = Math.abs(page - prev);
        const delay = pageDiff > 2 ? 50 : 150; // Faster for large jumps
        timeout = setTimeout(goToPage, delay);
        return page > prev ? prev + 1 : prev - 1;
      });
    };
    goToPage();
    return () => clearTimeout(timeout);
  }, [page]);

  // Enhanced cleanup for video textures and cache
  useEffect(() => {
    return () => {
      // Clean up video textures
      videoTextureCache.forEach(({ video, texture }) => {
        if (video) {
          video.pause();
          video.src = '';
          video.load();
        }
        if (texture) {
          texture.dispose();
        }
      });
      videoTextureCache.clear();
      
      // Note: Don't clear texture cache here as it's global
      // Only clear it when the entire app unmounts
    };
  }, [volumeId]);

  // Cleanup texture cache on unmount
  useEffect(() => {
    return () => {
      // This runs when component is completely unmounted
      if (textureCache.size > 100) { // Only clear if cache is getting large
        textureCache.forEach((texture) => {
          if (texture && texture.dispose) {
            texture.dispose();
          }
        });
        textureCache.clear();
        pendingLoads.clear();
      }
    };
  }, []);

  if (!pages || pages.length === 0) {
    return null;
  }

return (
    <group {...props} scale={[scale, scale, scale]} rotation-y={-Math.PI / 2}>
      {pages.map((pageData, index) => (
        <Page
          key={`${volumeId || 'book'}-page-${index}`} 
          page={delayedPage}
          number={index}
          opened={delayedPage > index}
          bookClosed={delayedPage === 0 || delayedPage === pages.length - 1}
          mediaFiles={mediaFiles}
          pageWidth={pageWidth}
          pageHeight={pageHeight}
          totalPages={pages.length}
          front={pageData.front}
          back={pageData.back}
        />
      ))}
    </group>
  );
};