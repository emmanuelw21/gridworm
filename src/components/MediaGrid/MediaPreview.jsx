// components/MediaGrid/MediaPreview.jsx
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { FileX, RefreshCw as RefreshCwIcon, AlertTriangle, Music as MusicIconLucide, Box } from 'lucide-react';
import { isVideo, isImage, isAudio, is3D } from './helpers';

const MediaPreview = ({
  media,
  className = "",
  autoplay = false,
  hoverPlay = false,
  onMediaLoad = null
}) => {
  if (!media) return null;

  const mediaRef = useRef(null);
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isHoveredForHoverPlay, setIsHoveredForHoverPlay] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    setHasError(false);
  }, [media.url, media.name]);

  const handleMediaError = useCallback(() => {
    setIsLoading(false);
    setHasError(true);
  }, []);

  const handleMediaLoad = useCallback((e) => {
    setIsLoading(false);
    setHasError(false);

    // Report natural dimensions for images
    if (onMediaLoad && e.target) {
      const width = e.target.naturalWidth || e.target.videoWidth || 160;
      const height = e.target.naturalHeight || e.target.videoHeight || 120;
      onMediaLoad(width, height);
    }
  }, [onMediaLoad]);

  useEffect(() => {
    const el = mediaRef.current;
    if (!el || (!isVideo(media.type) && !isAudio(media.type))) return;

    const playMedia = () => el.play().catch(e => console.warn(`Autoplay/Hoverplay failed for ${media.name}:`, e.message));
    const pauseMedia = () => {
      el.pause();
      if (el.currentTime > 0 && !el.loop) el.currentTime = 0;
    };

    if (autoplay && (isVideo(media.type) || isAudio(media.type))) {
      playMedia();
    } else if (hoverPlay && isHoveredForHoverPlay && (isVideo(media.type) || isAudio(media.type))) {
      playMedia();
    } else {
      pauseMedia();
    }
  }, [autoplay, hoverPlay, isHoveredForHoverPlay, media.type, media.url, media.name]);

  const commonContainerClasses = "relative w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800";

  if (media.isPlaceholder || media.isMissing || hasError) {
    return (
      <div className={`${commonContainerClasses} ${className} p-2 text-center`}>
        <FileX size={24} className="text-red-500 mb-1" />
        <div className="text-xs font-medium truncate max-w-full px-1" title={media.name || 'Missing Media'}>
          {media.name || (hasError ? 'Error Loading' : 'Missing Media')}
        </div>
        <div className="text-xs text-gray-500 mt-0.5">
          {hasError ? 'Could not load preview.' : (media.isPlaceholder ? 'Placeholder' : 'File missing')}
        </div>
      </div>
    );
  }

  const LoadingIndicator = () => (isLoading && !hasError) ? (
    <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-20 z-10">
      <RefreshCwIcon size={20} className="animate-spin text-white" />
    </div>
  ) : null;

  if (is3D(media.type) || media.isPrimitive) {
    return (
      <div
        className={`${commonContainerClasses} ${className}`}
        onMouseEnter={() => setIsHoveredForHoverPlay(true)}
        onMouseLeave={() => setIsHoveredForHoverPlay(false)}
      >
        <LoadingIndicator />
        {media.thumbnail ? (
          <img
            src={media.thumbnail}
            alt={media.name}
            className="max-w-full max-h-full object-contain"
            onError={() => {
              setHasError(true);
            }}
            onLoad={() => setIsLoading(false)}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center">
            <Box size={32} className="text-blue-500 mb-2" />
            <p className="text-xs text-gray-600 dark:text-gray-400">3D Model</p>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1 truncate max-w-full px-2">{media.name}</p>
          </div>
        )}
      </div>
    );
  }

  if (isImage(media.type)) {
    return (
      <div
        className={`${commonContainerClasses} ${className}`}
        onMouseEnter={() => setIsHoveredForHoverPlay(true)}
        onMouseLeave={() => setIsHoveredForHoverPlay(false)}
      >
        <LoadingIndicator />
        <img
          key={media.url}
          src={media.url}
          alt={media.name}
          className={`max-w-full max-h-full object-contain transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
          onError={handleMediaError}
          onLoad={handleMediaLoad}
          loading="lazy"
        />
      </div>
    );
  }

  if (isVideo(media.type)) {
    return (
      <div
        className={`${commonContainerClasses} ${className}`}
        onMouseEnter={() => setIsHoveredForHoverPlay(true)}
        onMouseLeave={() => setIsHoveredForHoverPlay(false)}
      >
        <LoadingIndicator />
        <video
          key={media.url}
          ref={mediaRef}
          src={media.url}
          muted
          loop={autoplay || hoverPlay}
          playsInline
          preload="metadata"
          className={`max-w-full max-h-full object-contain transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
          onError={handleMediaError}
          onLoadedData={handleMediaLoad}
          onCanPlay={handleMediaLoad}
        />
      </div>
    );
  }

  if (isAudio(media.type)) {
    return (
      <div
        className={`${commonContainerClasses} ${className} flex-col`}
        onMouseEnter={() => setIsHoveredForHoverPlay(true)}
        onMouseLeave={() => setIsHoveredForHoverPlay(false)}
      >
        <LoadingIndicator />
        <MusicIconLucide size={32} className={`text-blue-500 mb-2 transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'}`} />
        <p className={`text-xs truncate max-w-full px-2 transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'}`} title={media.name}>{media.name}</p>
        <audio
          key={media.url}
          ref={mediaRef}
          src={media.url}
          preload="metadata"
          loop={autoplay || hoverPlay}
          className="hidden"
          onError={handleMediaError}
          onLoadedData={handleMediaLoad}
          onCanPlay={handleMediaLoad}
        />
      </div>
    );
  }

  return (
    <div className={`${commonContainerClasses} ${className} p-2 text-center`}>
      <AlertTriangle size={24} className="text-yellow-500 mb-1" />
      <div className="text-xs font-medium truncate max-w-full px-1" title={media.name}>{media.name}</div>
      <div className="text-xs text-gray-500 mt-0.5">Preview not available for this type.</div>
    </div>
  );
};

export default MediaPreview;