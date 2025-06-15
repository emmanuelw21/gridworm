// thumbnail.worker.js - Web Worker for generating video thumbnails

self.addEventListener('message', async (event) => {
  const { type, data } = event.data;
  
  if (type === 'generateThumbnail') {
    try {
      const { videoBlob, seekTime = 2.0, quality = 0.8 } = data;
      
      // Create video element
      const video = document.createElement('video');
      video.muted = true;
      video.playsInline = true;
      
      // Create object URL for the video
      const videoUrl = URL.createObjectURL(videoBlob);
      
      // Wait for video to load metadata
      await new Promise((resolve, reject) => {
        video.onloadedmetadata = resolve;
        video.onerror = reject;
        video.src = videoUrl;
      });
      
      // Seek to desired time
      await new Promise((resolve, reject) => {
        video.onseeked = resolve;
        video.onerror = reject;
        video.currentTime = Math.min(seekTime, video.duration * 0.1);
      });
      
      // Create offscreen canvas
      const canvas = new OffscreenCanvas(320, 240);
      const ctx = canvas.getContext('2d');
      
      // Calculate dimensions maintaining aspect ratio
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
      
      // Draw video frame to canvas
      ctx.drawImage(video, offsetX, offsetY, drawWidth, drawHeight);
      
      // Convert to blob
      const blob = await canvas.convertToBlob({ 
        type: 'image/jpeg', 
        quality: quality 
      });
      
      // Clean up
      URL.revokeObjectURL(videoUrl);
      
      // Send thumbnail back
      self.postMessage({
        type: 'thumbnailGenerated',
        data: {
          thumbnail: blob,
          width: drawWidth,
          height: drawHeight
        }
      });
      
    } catch (error) {
      self.postMessage({
        type: 'error',
        error: error.message
      });
    }
  }
  
  if (type === 'generateMultipleThumbnails') {
    try {
      const { videoBlob, count = 4, quality = 0.8 } = data;
      
      const video = document.createElement('video');
      video.muted = true;
      video.playsInline = true;
      
      const videoUrl = URL.createObjectURL(videoBlob);
      
      await new Promise((resolve, reject) => {
        video.onloadedmetadata = resolve;
        video.onerror = reject;
        video.src = videoUrl;
      });
      
      const duration = video.duration;
      const thumbnails = [];
      
      for (let i = 0; i < count; i++) {
        const time = (duration * (i + 1)) / (count + 1);
        
        await new Promise((resolve) => {
          video.onseeked = resolve;
          video.currentTime = time;
        });
        
        const canvas = new OffscreenCanvas(160, 120);
        const ctx = canvas.getContext('2d');
        
        const aspectRatio = video.videoWidth / video.videoHeight;
        let drawWidth = 160;
        let drawHeight = 120;
        
        if (aspectRatio > 160 / 120) {
          drawHeight = 160 / aspectRatio;
        } else {
          drawWidth = 120 * aspectRatio;
        }
        
        const offsetX = (160 - drawWidth) / 2;
        const offsetY = (120 - drawHeight) / 2;
        
        ctx.drawImage(video, offsetX, offsetY, drawWidth, drawHeight);
        
        const blob = await canvas.convertToBlob({ 
          type: 'image/jpeg', 
          quality: quality 
        });
        
        thumbnails.push({
          blob,
          time,
          index: i
        });
      }
      
      URL.revokeObjectURL(videoUrl);
      
      self.postMessage({
        type: 'multipleThumbnailsGenerated',
        data: { thumbnails }
      });
      
    } catch (error) {
      self.postMessage({
        type: 'error',
        error: error.message
      });
    }
  }
});