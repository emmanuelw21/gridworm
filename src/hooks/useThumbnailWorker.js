import { useEffect, useRef, useCallback } from 'react';

/**
 * Hook for generating video thumbnails using Web Workers
 * This moves the CPU-intensive thumbnail generation off the main thread
 */
export const useThumbnailWorker = () => {
  const workerRef = useRef(null);
  const pendingCallbacks = useRef(new Map());

  useEffect(() => {
    // Create worker
    workerRef.current = new Worker('/thumbnail.worker.js');

    // Handle messages from worker
    workerRef.current.onmessage = (event) => {
      const { type, data, error } = event.data;
      
      if (type === 'thumbnailGenerated') {
        const callbacks = pendingCallbacks.current.get('single');
        if (callbacks) {
          callbacks.resolve(data);
          pendingCallbacks.current.delete('single');
        }
      } else if (type === 'multipleThumbnailsGenerated') {
        const callbacks = pendingCallbacks.current.get('multiple');
        if (callbacks) {
          callbacks.resolve(data);
          pendingCallbacks.current.delete('multiple');
        }
      } else if (type === 'error') {
        // Reject all pending callbacks
        pendingCallbacks.current.forEach((callbacks) => {
          callbacks.reject(new Error(error));
        });
        pendingCallbacks.current.clear();
      }
    };

    // Cleanup
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
      }
    };
  }, []);

  /**
   * Generate a single thumbnail from a video file
   * @param {File|Blob} videoFile - The video file to generate thumbnail from
   * @param {Object} options - Options for thumbnail generation
   * @param {number} options.seekTime - Time in seconds to seek to (default: 2.0)
   * @param {number} options.quality - JPEG quality 0-1 (default: 0.8)
   * @returns {Promise<{thumbnail: Blob, width: number, height: number}>}
   */
  const generateThumbnail = useCallback(async (videoFile, options = {}) => {
    if (!workerRef.current) {
      throw new Error('Worker not initialized');
    }

    return new Promise((resolve, reject) => {
      pendingCallbacks.current.set('single', { resolve, reject });
      
      workerRef.current.postMessage({
        type: 'generateThumbnail',
        data: {
          videoBlob: videoFile,
          seekTime: options.seekTime || 2.0,
          quality: options.quality || 0.8
        }
      });
    });
  }, []);

  /**
   * Generate multiple thumbnails from a video file
   * @param {File|Blob} videoFile - The video file to generate thumbnails from
   * @param {Object} options - Options for thumbnail generation
   * @param {number} options.count - Number of thumbnails to generate (default: 4)
   * @param {number} options.quality - JPEG quality 0-1 (default: 0.8)
   * @returns {Promise<{thumbnails: Array<{blob: Blob, time: number, index: number}>}>}
   */
  const generateMultipleThumbnails = useCallback(async (videoFile, options = {}) => {
    if (!workerRef.current) {
      throw new Error('Worker not initialized');
    }

    return new Promise((resolve, reject) => {
      pendingCallbacks.current.set('multiple', { resolve, reject });
      
      workerRef.current.postMessage({
        type: 'generateMultipleThumbnails',
        data: {
          videoBlob: videoFile,
          count: options.count || 4,
          quality: options.quality || 0.8
        }
      });
    });
  }, []);

  /**
   * Generate thumbnail with fallback to main thread if worker fails
   */
  const generateThumbnailWithFallback = useCallback(async (videoFile, options = {}) => {
    try {
      return await generateThumbnail(videoFile, options);
    } catch (error) {
      console.warn('Worker thumbnail generation failed, falling back to main thread:', error);
      
      // Fallback to main thread
      return generateThumbnailMainThread(videoFile, options);
    }
  }, [generateThumbnail]);

  return {
    generateThumbnail,
    generateMultipleThumbnails,
    generateThumbnailWithFallback
  };
};

/**
 * Fallback function to generate thumbnail on main thread
 */
async function generateThumbnailMainThread(videoFile, options = {}) {
  const video = document.createElement('video');
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  video.muted = true;
  video.playsInline = true;
  
  const videoUrl = URL.createObjectURL(videoFile);
  
  try {
    await new Promise((resolve, reject) => {
      video.onloadedmetadata = resolve;
      video.onerror = reject;
      video.src = videoUrl;
    });
    
    await new Promise((resolve) => {
      video.onseeked = resolve;
      video.currentTime = options.seekTime || 2.0;
    });
    
    canvas.width = 320;
    canvas.height = 240;
    
    const aspectRatio = video.videoWidth / video.videoHeight;
    let drawWidth = 320;
    let drawHeight = 240;
    
    if (aspectRatio > 320 / 240) {
      drawHeight = 320 / aspectRatio;
    } else {
      drawWidth = 240 * aspectRatio;
    }
    
    const offsetX = (320 - drawWidth) / 2;
    const offsetY = (240 - drawHeight) / 2;
    
    ctx.drawImage(video, offsetX, offsetY, drawWidth, drawHeight);
    
    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        resolve({
          thumbnail: blob,
          width: drawWidth,
          height: drawHeight
        });
      }, 'image/jpeg', options.quality || 0.8);
    });
    
  } finally {
    URL.revokeObjectURL(videoUrl);
  }
}