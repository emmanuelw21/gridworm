// Get appropriate icon for file type
export const getFileIcon = (type) => {
  if (type.startsWith('image')) return { type: 'Image', size: 16 };
  if (type.startsWith('video')) return { type: 'Video', size: 16 };
  if (type.startsWith('audio')) return { type: 'Music', size: 16 };
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
  
  return 'other';
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

// Process file for media library - Optimized version
export const processFile = (file) => {
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
      default:
        return file.type || 'application/octet-stream';
    }
  };

  // Support a wide range of media formats
  // Check either by MIME type or file extension
  const isSupported = (file) => {
    const fileType = file.type.toLowerCase();
    const fileName = file.name.toLowerCase();
    
    // Image formats
    if (fileType.startsWith('image/') || 
        fileName.endsWith('.jpg') || 
        fileName.endsWith('.jpeg') || 
        fileName.endsWith('.png') || 
        fileName.endsWith('.gif') || 
        fileName.endsWith('.webp') || 
        fileName.endsWith('.svg')) {
      return true;
    }
    
    // Video formats
    if (fileType.startsWith('video/') || 
        fileName.endsWith('.mp4') || 
        fileName.endsWith('.webm') || 
        fileName.endsWith('.mov') || 
        fileName.endsWith('.avi') || 
        fileName.endsWith('.mkv')) {
      return true;
    }
    
    // Audio formats
    if (fileType.startsWith('audio/') || 
        fileName.endsWith('.mp3') || 
        fileName.endsWith('.wav') || 
        fileName.endsWith('.ogg') || 
        fileName.endsWith('.flac')) {
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