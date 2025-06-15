// components/MediaGrid/MediaModel.js
export class MediaFile {
  constructor(file) {
    this.id = `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).substr(2, 9)}`;
    this.file = file;
    this.name = file.name;
    this.type = file.type || this.getTypeFromExtension(file.name);
    this.size = file.size;
    this.lastModified = file.lastModified;
    this.thumbnail = null;
    this.thumbnailTimestamp = null;
    this.metadata = {
      title: file.name.split('.')[0],
      description: "",
      author: "",
      tags: [],
      category: this.getFileTypeCategory()
    };
    this._objectUrl = null;
    this.transform3D = null;
  }

  get url() {
    // If we already have a URL cached, return it
    if (this._objectUrl) {
      return this._objectUrl;
    }
    
    // If this is a text page or other special media, return the stored URL
    if (this.isTextPage && this._url) {
      return this._url;
    }
    
    // Create object URL from file if available
    if (this.file && typeof URL !== 'undefined') {
      try {
        this._objectUrl = URL.createObjectURL(this.file);
        return this._objectUrl;
      } catch (error) {
        console.warn('Failed to create object URL:', error);
        return null;
      }
    }
    
    return null;
  }
  
  set url(value) {
    // Allow setting URL directly for special cases like text pages
    this._url = value;
  }

  releaseUrl() {
    if (this._objectUrl) {
      URL.revokeObjectURL(this._objectUrl);
      this._objectUrl = null;
    }
  }

  async setThumbnail(source) {
    if (typeof source === 'number') {
      // Video timestamp
      this.thumbnailTimestamp = source;
      this.thumbnail = await this.captureVideoFrame(source);
    } else if (typeof source === 'string') {
      // Data URL or file path
      this.thumbnail = source;
    } else if (source instanceof File) {
      // New thumbnail file
      this.thumbnail = URL.createObjectURL(source);
    } else if (source instanceof HTMLCanvasElement) {
      // Canvas element (for 3D captures)
      this.thumbnail = source.toDataURL('image/jpeg', 0.8);
    }
  }

  async captureVideoFrame(timestamp) {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.src = this.url;
      video.currentTime = timestamp;
      video.onloadeddata = () => {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
        video.remove();
      };
    });
  }

  getTypeFromExtension(filename) {
    const ext = filename.toLowerCase().split('.').pop();
    const typeMap = {
      // Images
      'jpg': 'image/jpeg', 'jpeg': 'image/jpeg', 'png': 'image/png',
      'gif': 'image/gif', 'webp': 'image/webp', 'svg': 'image/svg+xml',
      // Videos
      'mp4': 'video/mp4', 'webm': 'video/webm', 'mov': 'video/quicktime',
      'avi': 'video/x-msvideo', 'mkv': 'video/x-matroska',
      // Audio
      'mp3': 'audio/mpeg', 'wav': 'audio/wav', 'ogg': 'audio/ogg',
      'flac': 'audio/flac',
      // 3D
      'gltf': 'model/gltf-binary', 'glb': 'model/gltf-binary',
      'obj': 'model/obj', 'fbx': 'model/fbx', 'stl': 'model/stl',
      'ply': 'model/ply', '3ds': 'model/3ds', 'dae': 'model/collada+xml'
    };
    return typeMap[ext] || 'application/octet-stream';
  }

  getFileTypeCategory() {
    const type = this.type.toLowerCase();
    if (type.startsWith('image/')) return 'image';
    if (type.startsWith('video/')) return 'video';
    if (type.startsWith('audio/')) return 'audio';
    if (type.startsWith('model/') || type.includes('3d')) return '3d';
    return 'other';
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      type: this.type,
      size: this.size,
      lastModified: this.lastModified,
      thumbnail: this.thumbnail,
      thumbnailTimestamp: this.thumbnailTimestamp,
      metadata: this.metadata,
      transform3D: this.transform3D
    };
  }
}