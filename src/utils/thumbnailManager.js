// Centralized thumbnail management
class ThumbnailManager {
  constructor() {
    this.thumbnailCache = new Map();
    this.pendingGenerations = new Map();
  }

  async ensureThumbnail(mediaFile) {
    if (!mediaFile || !mediaFile.id) return null;

    // Check if thumbnail already exists
    if (mediaFile.thumbnail) {
      return mediaFile.thumbnail;
    }

    // Check cache
    if (this.thumbnailCache.has(mediaFile.id)) {
      return this.thumbnailCache.get(mediaFile.id);
    }

    // Check if generation is already in progress
    if (this.pendingGenerations.has(mediaFile.id)) {
      return this.pendingGenerations.get(mediaFile.id);
    }

    // Generate thumbnail based on type
    const thumbnailPromise = this.generateThumbnail(mediaFile);
    this.pendingGenerations.set(mediaFile.id, thumbnailPromise);

    try {
      const thumbnail = await thumbnailPromise;
      this.thumbnailCache.set(mediaFile.id, thumbnail);
      this.pendingGenerations.delete(mediaFile.id);
      return thumbnail;
    } catch (error) {
      console.error(`Failed to generate thumbnail for ${mediaFile.name}:`, error);
      this.pendingGenerations.delete(mediaFile.id);
      return null;
    }
  }

  async generateThumbnail(mediaFile) {
    if (mediaFile.type.startsWith('video/')) {
      return this.generateVideoThumbnail(mediaFile);
    } else if (mediaFile.type.startsWith('image/')) {
      return this.generateImageThumbnail(mediaFile);
    } else if (mediaFile.type.startsWith('audio/')) {
      return this.generateAudioThumbnail(mediaFile);
    } else if (is3D(mediaFile.type)) {
      return this.generate3DThumbnail(mediaFile);
    }
    return null;
  }

  async generateVideoThumbnail(mediaFile) {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      video.crossOrigin = 'anonymous';
      video.muted = true;

      const cleanup = () => {
        video.removeEventListener('loadeddata', handleLoaded);
        video.removeEventListener('error', handleError);
        video.src = '';
      };

      const handleLoaded = () => {
        video.currentTime = Math.min(1, video.duration * 0.1); // Seek to 10% or 1 second
      };

      const handleSeeked = () => {
        canvas.width = 512;
        canvas.height = 512;

        const aspectRatio = video.videoWidth / video.videoHeight;
        let drawWidth = canvas.width;
        let drawHeight = canvas.height;

        if (aspectRatio > 1) {
          drawHeight = canvas.width / aspectRatio;
        } else {
          drawWidth = canvas.height * aspectRatio;
        }

        const x = (canvas.width - drawWidth) / 2;
        const y = (canvas.height - drawHeight) / 2;

        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(video, x, y, drawWidth, drawHeight);

        canvas.toBlob((blob) => {
          cleanup();
          if (blob) {
            const thumbnailUrl = URL.createObjectURL(blob);
            resolve(thumbnailUrl);
          } else {
            reject(new Error('Failed to create thumbnail blob'));
          }
        }, 'image/jpeg', 0.8);
      };

      const handleError = (e) => {
        cleanup();
        reject(e);
      };

      video.addEventListener('loadeddata', handleLoaded);
      video.addEventListener('seeked', handleSeeked, { once: true });
      video.addEventListener('error', handleError);

      video.src = mediaFile.url;
    });
  }

  async generateImageThumbnail(mediaFile) {
    // For images, we can use the URL directly in most cases
    // But for webp, we might want to convert to ensure compatibility
    if (mediaFile.type === 'image/webp') {
      return this.convertWebPToJPEG(mediaFile.url);
    }
    return mediaFile.url;
  }

  async convertWebPToJPEG(webpUrl) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      img.crossOrigin = 'anonymous';

      img.onload = () => {
        canvas.width = Math.min(512, img.width);
        canvas.height = Math.min(512, img.height);

        const scale = Math.min(
          canvas.width / img.width,
          canvas.height / img.height
        );

        const drawWidth = img.width * scale;
        const drawHeight = img.height * scale;
        const x = (canvas.width - drawWidth) / 2;
        const y = (canvas.height - drawHeight) / 2;

        ctx.drawImage(img, x, y, drawWidth, drawHeight);

        canvas.toBlob((blob) => {
          if (blob) {
            const jpegUrl = URL.createObjectURL(blob);
            resolve(jpegUrl);
          } else {
            reject(new Error('Failed to convert WebP to JPEG'));
          }
        }, 'image/jpeg', 0.9);
      };

      img.onerror = () => {
        reject(new Error('Failed to load WebP image'));
      };

      img.src = webpUrl;
    });
  }

  generateAudioThumbnail(mediaFile) {
    // Return a default audio thumbnail
    return '/audio-thumbnail.png';
  }

  generate3DThumbnail(mediaFile) {
    // Return a default 3D thumbnail
    return '/3d-thumbnail.png';
  }

  cleanup() {
    // Clean up blob URLs
    this.thumbnailCache.forEach((url) => {
      if (url && url.startsWith('blob:')) {
        URL.revokeObjectURL(url);
      }
    });
    this.thumbnailCache.clear();
    this.pendingGenerations.clear();
  }
}

export const thumbnailManager = new ThumbnailManager();