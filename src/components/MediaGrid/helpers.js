// components/MediaGrid/helpers.js

// Get appropriate icon for file type
export const getFileIcon = (type) => {
  if (type.startsWith('image')) return { type: 'Image', size: 16 };
  if (type.startsWith('video')) return { type: 'Video', size: 16 };
  if (type.startsWith('audio')) return { type: 'Music', size: 16 };
  if (type.includes('3d') || type.includes('model')) return { type: '3D', size: 16 };
  return { type: 'Image', size: 16 };
};

// Helper to format file size
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

// Extract filename from URL or path
export const getFilename = (path) => {
  if (!path) return "blank.jpg";
  // For object URLs or blob URLs
  if (path.startsWith('blob:') || path.startsWith('data:')) {
    return "generated-file.jpg";
  }
  // For regular file paths
  return path.split('/').pop() || path;
};

// Helper to get file extension from filename
export const getFileExtension = (filename) => {
  return filename.toLowerCase().split('.').pop();
};

// Helper to get file type category
export const getFileTypeCategory = (media) => {
  const type = media.type.toLowerCase();
  const extension = getFileExtension(media.name);
  
  // Image types
  if (type.startsWith('image/') || 
      ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension)) {
    return 'image';
  }
  
  // Video types
  if (type.startsWith('video/') || 
      ['mp4', 'webm', 'mov', 'avi', 'mkv'].includes(extension)) {
    return 'video';
  }
  
  // Audio types
  if (type.startsWith('audio/') || 
      ['mp3', 'wav', 'ogg', 'flac'].includes(extension)) {
    return 'audio';
  }

  // 3D types
  if (type.startsWith('model/') || type.includes('3d') ||
      ['gltf', 'glb', 'obj', 'fbx', 'stl', 'ply', '3ds', 'dae'].includes(extension)) {
    return '3d';
  }
  
  return 'other';
};

const is3DExtension = (ext) => {
  const ext3D = ['gltf', 'glb', 'obj', 'fbx', 'stl', 'ply', '3ds', 'dae', 'usdz', 'usda', 'usdc'];
  return ext3D.includes(ext.toLowerCase());
};

// Helper for checking if media is video
export const isVideo = (type) => {
  return type.startsWith('video/') || 
         type.includes('mp4') || 
         type.includes('webm') || 
         type.includes('mov') || 
         type.includes('quicktime') ||
         type.includes('avi') ||
         type.includes('mkv');
};

// Helper for checking if media is image
export const isImage = (type) => {
  return type.startsWith('image/') || 
         type.includes('jpg') || 
         type.includes('jpeg') || 
         type.includes('png') || 
         type.includes('gif') || 
         type.includes('webp') || 
         type.includes('svg');
};

// Helper for checking if media is audio
export const isAudio = (type) => {
  return type.startsWith('audio/') || 
         type.includes('mp3') || 
         type.includes('wav') || 
         type.includes('ogg') || 
         type.includes('flac');
};

// Helper for checking if media is animated
export const isAnimated = (type, name) => {
  return (type.includes('gif') || 
         (type.includes('webp') && !type.includes('still')) || 
         name.endsWith('.gif') || 
         name.endsWith('.webp'));
};

// Helper for checking if media is 3D
export const is3D = (type) => {
  if (!type) return false;
  const fileType = type.toLowerCase();
  const supported3DTypes = ['gltf', 'glb', 'obj', 'fbx', 'stl', 'ply', '3ds', 'dae', 'model'];
  return supported3DTypes.some(ext => fileType.includes(ext));
};

// Helper for checking if media is PDF
export const isPDF = (type) => {
  return type.startsWith('application/pdf') ||
          type.includes('pdf') ||
          type.includes('application/x-pdf') ||
          type.includes('application/x-bzpdf') ||
          type.includes('application/x-gzpdf');
};

// Process file for media library - Optimized version
export const processFile = (file) => {
  if (!file) return null;
  
  const fileExtension = getFileExtension(file.name);
  const fileName = file.name;
  const fileSize = formatFileSize(file.size);
  const fileDate = new Date(file.lastModified).toLocaleString();
  let fileType = file.type || '';
  
  // Handle 3D file types
  if (!fileType && is3DExtension(fileExtension)) {
    const ext = fileExtension.toLowerCase();
    if (ext === 'gltf' || ext === 'glb') fileType = 'model/gltf-binary';
    else if (ext === 'obj') fileType = 'model/obj';
    else if (ext === 'fbx') fileType = 'model/fbx';
    else if (ext === 'stl') fileType = 'model/stl';
    else if (ext === '3ds') fileType = 'model/3ds';
    else if (ext === 'dae') fileType = 'model/collada+xml';
    else if (ext === 'ply') fileType = 'model/ply';
    else fileType = `model/${ext}`;
  }
  
  // Determine file type based on extension if MIME type is not accurate
  const getFileTypeFromExtension = (filename) => {
    const ext = filename.toLowerCase().split('.').pop();
    switch (ext) {
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg';
      case 'png':
        return 'image/png';
      case 'gif':
        return 'image/gif';
      case 'webp':
        return 'image/webp';
      case 'mp4':
        return 'video/mp4';
      case 'webm':
        return 'video/webm';
      case 'mov':
        return 'video/quicktime';
      case 'mp3':
        return 'audio/mpeg';
      case 'wav':
        return 'audio/wav';
      case 'gltf':
      case 'glb':
        return 'model/gltf-binary';
      case 'obj':
        return 'model/obj';
      case 'fbx':
        return 'model/fbx';
      case 'stl':
        return 'model/stl';
      default:
        return file.type || 'application/octet-stream';
    }
  };

  // Support a wide range of media formats
  // Check either by MIME type or file extension
  const isSupported = (file) => {
    const fileType = file.type.toLowerCase();
    const fileName = file.name.toLowerCase();
    const ext = getFileExtension(fileName);
    
    // Image formats
    if (fileType.startsWith('image/') || 
        ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) {
      return true;
    }
    
    // Video formats
    if (fileType.startsWith('video/') || 
        ['mp4', 'webm', 'mov', 'avi', 'mkv'].includes(ext)) {
      return true;
    }
    
    // Audio formats
    if (fileType.startsWith('audio/') || 
        ['mp3', 'wav', 'ogg', 'flac'].includes(ext)) {
      return true;
    }
    
    // 3D formats
    if (fileType.startsWith('model/') || 
        ['gltf', 'glb', 'obj', 'fbx', 'stl', 'ply', '3ds', 'dae'].includes(ext)) {
      return true;
    }
    
    return false;
  };
  
  if (isSupported(file)) {
    // Determine correct file type if extension doesn't match mime type
    let type = file.type;
    
    if (!type || type === '' || type === 'application/octet-stream') {
      type = getFileTypeFromExtension(file.name);
    }
    
    // Create a more performance-efficient media object with lazy URL generation
    let objectUrl = null;
    
    const mediaObj = {
      file,
      // Lazy URL getter - creates object URL only when accessed
      get url() {
        if (!objectUrl) {
          objectUrl = URL.createObjectURL(file);
        }
        return objectUrl;
      },
      // Clean up method to release blob URL when no longer needed
      releaseUrl() {
        if (objectUrl) {
          URL.revokeObjectURL(objectUrl);
          objectUrl = null;
        }
      },
      type,
      name: file.name,
      size: formatFileSize(file.size),
      date: new Date(file.lastModified).toISOString().split('T')[0],
      metadata: {
        title: file.name.split('.')[0],
        description: "",
        author: "Emmanuel Whyte",
        dateCreated: new Date(file.lastModified).toISOString().split('T')[0],
        location: "",
        tags: [],
        category: getFileTypeCategory({type, name: file.name}),
        license: "All Rights Reserved"
      }
    };
    
    return mediaObj;
  }
  return null;
};