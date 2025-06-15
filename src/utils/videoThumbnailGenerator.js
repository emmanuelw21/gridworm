// utils/videoThumbnailGenerator.js
export class VideoThumbnailGenerator {
  static async generateThumbnail(mediaFile, options = {}) {
    const {
      timestamp = 0.4, // Default to 0.4 seconds
      width = 512,
      height = 512,
      quality = 0.9
    } = options;

    // Check if it's a video file
    if (!mediaFile.type?.startsWith('video/')) {
      throw new Error('Not a video file');
    }

    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      video.crossOrigin = 'anonymous';
      video.muted = true;
      
      // Set up canvas dimensions
      canvas.width = width;
      canvas.height = height;

      const handleLoadedMetadata = () => {
        // Seek to the specified timestamp
        video.currentTime = Math.min(timestamp, video.duration * 0.1);
      };

      const handleSeeked = () => {
        // Calculate aspect ratio
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

        // Clear canvas and draw video frame
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(video, x, y, drawWidth, drawHeight);

        // Convert to blob
        canvas.toBlob((blob) => {
          cleanup();
          if (blob) {
            const thumbnailUrl = URL.createObjectURL(blob);
            resolve(thumbnailUrl);
          } else {
            reject(new Error('Failed to create thumbnail blob'));
          }
        }, 'image/jpeg', quality);
      };

      const handleError = (e) => {
        cleanup();
        reject(new Error(`Failed to load video: ${e.message || 'Unknown error'}`));
      };

      const cleanup = () => {
        video.removeEventListener('loadedmetadata', handleLoadedMetadata);
        video.removeEventListener('seeked', handleSeeked);
        video.removeEventListener('error', handleError);
        video.src = '';
        video.load();
      };

      // Set up event listeners
      video.addEventListener('loadedmetadata', handleLoadedMetadata);
      video.addEventListener('seeked', handleSeeked, { once: true });
      video.addEventListener('error', handleError);

      // Set video source
      video.src = mediaFile.url;
      video.load();
    });
  }

  // Generate thumbnail for WebP animated images
  static async generateWebPThumbnail(mediaFile, options = {}) {
    const { width = 512, height = 512 } = options;

    return new Promise((resolve, reject) => {
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      canvas.width = width;
      canvas.height = height;

      img.crossOrigin = 'anonymous';

      img.onload = () => {
        // Calculate scaling
        const scale = Math.min(
          canvas.width / img.width,
          canvas.height / img.height
        );

        const drawWidth = img.width * scale;
        const drawHeight = img.height * scale;
        const x = (canvas.width - drawWidth) / 2;
        const y = (canvas.height - drawHeight) / 2;

        // Clear and draw
        ctx.fillStyle = '#f0f0f0';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, x, y, drawWidth, drawHeight);

        // Convert to JPEG for better compatibility
        canvas.toBlob((blob) => {
          if (blob) {
            const thumbnailUrl = URL.createObjectURL(blob);
            resolve(thumbnailUrl);
          } else {
            reject(new Error('Failed to create WebP thumbnail'));
          }
        }, 'image/jpeg', 0.9);
      };

      img.onerror = () => {
        reject(new Error('Failed to load WebP image'));
      };

      img.src = mediaFile.url;
    });
  }
}