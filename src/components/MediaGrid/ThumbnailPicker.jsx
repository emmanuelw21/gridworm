// components/MediaGrid/ThumbnailPicker.jsx
import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, Clock, Box } from 'lucide-react';
import ThreeDViewer from '../ThreeDGrid/ThreeDViewer';

const ThumbnailPicker = ({ media, onThumbnailUpdate, onClose }) => {
  const [selectedTime, setSelectedTime] = useState(0);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [duration, setDuration] = useState(0);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const viewer3DRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && media.type.startsWith('video/')) {
      videoRef.current.addEventListener('loadedmetadata', () => {
        setDuration(videoRef.current.duration);
        setVideoLoaded(true);
      });
    }
  }, [media]);

  const handleTimeChange = (e) => {
    const time = parseFloat(e.target.value);
    setSelectedTime(time);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
  };

  const captureFrame = () => {
    if (media.type.startsWith('video/') && videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      onThumbnailUpdate(dataUrl, selectedTime);
      onClose();
    } else if (media.type.startsWith('image/')) {
      // For images, just use the image itself
      onThumbnailUpdate(media.url);
      onClose();
    } else if (media.type.includes('3d') || media.isPrimitive) {
      // Capture 3D viewport
      capture3DViewport();
    }
  };

  const capture3DViewport = async () => {
    if (viewer3DRef.current) {
      const thumbnail = await viewer3DRef.current.captureViewport();
      if (thumbnail) {
        onThumbnailUpdate(thumbnail);
        onClose();
      }
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        onThumbnailUpdate(e.target.result);
        onClose();
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold">Update Thumbnail</h2>
        </div>
        
        <div className="p-6">
          {media.type.startsWith('video/') && (
            <div className="space-y-4">
              <div className="aspect-video bg-black rounded overflow-hidden">
                <video
                  ref={videoRef}
                  src={media.url}
                  className="w-full h-full object-contain"
                  onSeeked={() => {}}
                />
              </div>
              
              {videoLoaded && (
                <div className="space-y-2">
                  <label className="flex items-center space-x-2">
                    <Clock size={16} />
                    <span>Time: {selectedTime.toFixed(1)}s / {duration.toFixed(1)}s</span>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max={duration}
                    step="0.1"
                    value={selectedTime}
                    onChange={handleTimeChange}
                    className="w-full"
                  />
                </div>
              )}
              
              <canvas ref={canvasRef} className="hidden" />
            </div>
          )}
          
          {media.type.startsWith('image/') && (
            <div className="aspect-video bg-gray-100 dark:bg-gray-700 rounded overflow-hidden">
              <img
                src={media.url}
                alt={media.name}
                className="w-full h-full object-contain"
              />
            </div>
          )}
          
          {(media.type.includes('3d') || media.isPrimitive) && (
            <div className="aspect-video bg-gray-100 dark:bg-gray-700 rounded overflow-hidden">
              <ThreeDViewer
                ref={viewer3DRef}
                media={media}
                width="100%"
                height="400px"
                gridConfig={{ cellWidth: 160, cellHeight: 120, cellSize: 10 }}
                viewMode="3d"
                showGrid={false}
                showAxes={false}
                darkMode={false}
                autoRotate={false}
                enableInteraction={true}
                thumbnailMode={false}
              />
            </div>
          )}
          
          <div className="flex items-center justify-between mt-6">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 flex items-center"
            >
              <Upload size={16} className="mr-2" />
              Upload Custom
            </button>
            
            <div className="flex space-x-2">
              <button
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={captureFrame}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center"
              >
                <Camera size={16} className="mr-2" />
                Capture
              </button>
            </div>
          </div>
          
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>
      </div>
    </div>
  );
};

export default ThumbnailPicker;