// utils/enhancedThumbnailManager.js
export class EnhancedThumbnailManager {
  constructor() {
    this.thumbnailCache = new Map();
    this.generationPromises = new Map();
  }

  async getOrGenerateThumbnail(mediaFile, options = {}) {
    if (!mediaFile || !mediaFile.url) return null;

    // Check if we already have a thumbnail
    if (mediaFile.thumbnail) {
      return mediaFile.thumbnail;
    }

    // Check cache
    const cacheKey = `${mediaFile.id}-${mediaFile.name}`;
    if (this.thumbnailCache.has(cacheKey)) {
      return this.thumbnailCache.get(cacheKey);
    }

    // Check if generation is already in progress
    if (this.generationPromises.has(cacheKey)) {
      return this.generationPromises.get(cacheKey);
    }

    // Generate thumbnail based on type
    const ext = mediaFile.name.split('.').pop().toLowerCase();
    let generationPromise;

    if (mediaFile.type?.startsWith('video/') || ['webm', 'mp4', 'mov', 'avi', 'mkv'].includes(ext)) {
      generationPromise = this.generateVideoThumbnail(mediaFile, options);
    } else if (ext === 'webp' && this.isAnimated(mediaFile)) {
      generationPromise = this.generateAnimatedImageThumbnail(mediaFile, options);
    } else {
      return mediaFile.url; // Static images can use URL directly
    }

    this.generationPromises.set(cacheKey, generationPromise);

    try {
      const thumbnailUrl = await generationPromise;
      this.thumbnailCache.set(cacheKey, thumbnailUrl);
      this.generationPromises.delete(cacheKey);
      return thumbnailUrl;
    } catch (error) {
      console.error(`Failed to generate thumbnail for ${mediaFile.name}:`, error);
      this.generationPromises.delete(cacheKey);
      return null;
    }
  }

  async generateVideoThumbnail(mediaFile, options = {}) {
    const { timestamp = 0.1, width = 512, height = 512 } = options;

    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.crossOrigin = 'anonymous';
      video.muted = true;
      video.preload = 'metadata';

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      let handled = false;

      const cleanup = () => {
        video.src = '';
        video.load();
        video.remove();
      };

      video.addEventListener('loadeddata', () => {
        if (handled) return;
        // Seek to 10% of the video or the specified timestamp
        const seekTime = Math.min(timestamp, video.duration * 0.1);
        video.currentTime = seekTime;
      });

      video.addEventListener('seeked', () => {
        if (handled) return;
        handled = true;

        try {
          // Draw the video frame
          const aspectRatio = video.videoWidth / video.videoHeight;
          let drawWidth = width;
          let drawHeight = height;

          if (aspectRatio > 1) {
            drawHeight = width / aspectRatio;
          } else {
            drawWidth = height * aspectRatio;
          }

          const x = (width - drawWidth) / 2;
          const y = (height - drawHeight) / 2;

          ctx.fillStyle = '#000000';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(video, x, y, drawWidth, drawHeight);

          // Convert to data URL
          const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
          cleanup();
          resolve(dataUrl);
        } catch (err) {
          cleanup();
          reject(err);
        }
      });

      video.addEventListener('error', (e) => {
        if (handled) return;
        handled = true;
        cleanup();
        reject(new Error(`Failed to load video: ${e.message || 'Unknown error'}`));
      });

      // Set source and start loading
      video.src = mediaFile.url;
      video.load();
    });
  }

  async generateAnimatedImageThumbnail(mediaFile, options = {}) {
    const { width = 512, height = 512 } = options;

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      img.onload = () => {
        try {
          const aspectRatio = img.width / img.height;
          let drawWidth = width;
          let drawHeight = height;

          if (aspectRatio > 1) {
            drawHeight = width / aspectRatio;
          } else {
            drawWidth = height * aspectRatio;
          }

          const x = (width - drawWidth) / 2;
          const y = (height - drawHeight) / 2;

          ctx.fillStyle = '#f0f0f0';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, x, y, drawWidth, drawHeight);

          const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
          resolve(dataUrl);
        } catch (err) {
          reject(err);
        }
      };

      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };

      img.src = mediaFile.url;
    });
  }

  isAnimated(mediaFile) {
    // Simple check - you might want to enhance this
    const ext = mediaFile.name.split('.').pop().toLowerCase();
    return ext === 'gif' || (ext === 'webp' && mediaFile.name.toLowerCase().includes('anim'));
  }

  cleanup() {
    this.thumbnailCache.forEach((url) => {
      if (url && url.startsWith('blob:')) {
        URL.revokeObjectURL(url);
      }
    });
    this.thumbnailCache.clear();
    this.generationPromises.clear();
  }
}

// Export singleton instance
export const enhancedThumbnailManager = new EnhancedThumbnailManager();