// components/MediaGrid/MediaPreview.jsx
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { FileX, RefreshCw as RefreshCwIcon, AlertTriangle, Music as MusicIconLucide, Box, Layers } from 'lucide-react';
import { isVideo, isImage, isAudio, is3D } from './helpers';

const MediaPreview = ({
  media,
  className = "",
  autoplay = false,
  hoverPlay = false,
  onMediaLoad = null,
  onMediaMissing = null, // New prop for missing media
  noBackground = false // New prop to disable background
}) => {
  if (!media) return null;

  const mediaRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isHoveredForHoverPlay, setIsHoveredForHoverPlay] = useState(false);

  useEffect(() => {
    // Don't set loading for extracted pages or if we already have a thumbnail
    if (!media.isExtractedPage && !media.thumbnail) {
      setIsLoading(true);
    } else {
      setIsLoading(false);
    }
  }, [media.url, media.name, media.isExtractedPage, media.thumbnail]);

  const handleMediaError = useCallback(() => {
    setIsLoading(false);
    if (onMediaMissing && media && media.id) {
      onMediaMissing(media.id, media.name);
    }
  }, [onMediaMissing, media]);

  const handleMediaLoad = useCallback((e) => {
    setIsLoading(false);
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

  const commonContainerClasses = `relative w-full h-full flex items-center justify-center ${noBackground ? '' : 'bg-gray-100 dark:bg-gray-800'}`;

  if (media.isPlaceholder || media.isMissing) {
    return (
      <div className={`${commonContainerClasses} ${className} p-2 text-center`}>
        <FileX size={24} className="text-red-500 mb-1" />
        <div className="text-xs font-medium truncate max-w-full px-1" title={media.name || 'Missing Media'}>
          {media.name || 'Missing Media'}
        </div>
        <div className="text-xs text-gray-500 mt-0.5">
          Placeholder
        </div>
      </div>
    );
  }

  const LoadingIndicator = () => (isLoading) ? (
    <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-20 z-10">
      <RefreshCwIcon size={20} className="animate-spin text-white" />
    </div>
  ) : null;

  // Handle MediaStack
  if (media.isStack) {
    const displayInfo = media.getDisplayInfo();
    return (
      <div
        className={`${commonContainerClasses} ${className} cursor-pointer`}
        onMouseEnter={() => setIsHoveredForHoverPlay(true)}
        onMouseLeave={() => setIsHoveredForHoverPlay(false)}
      >
        <LoadingIndicator />
        {media.thumbnail ? (
          <div className="relative w-full h-full">
            <img
              src={media.thumbnail}
              alt={displayInfo.name}
              className="w-full h-full object-cover"
              onError={handleMediaError}
              onLoad={handleMediaLoad}
            />
            {/* Stack indicator overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-2 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Layers size={16} className="mr-1" />
                  <span className="text-xs font-medium">{displayInfo.stackType.toUpperCase()}</span>
                </div>
                <span className="text-xs">{displayInfo.pageCount} pages</span>
              </div>
              <p className="text-xs truncate mt-1 opacity-80">{displayInfo.name}</p>
            </div>
          </div>
        ) : (
          <div className={`w-full h-full flex flex-col items-center justify-center ${noBackground ? '' : 'bg-gray-100 dark:bg-gray-800'}`}>
            <Layers size={32} className="text-orange-500 mb-2" />
            <p className="text-xs font-medium text-gray-700 dark:text-gray-300">{displayInfo.stackType.toUpperCase()}</p>
            <p className="text-xs text-gray-600 dark:text-gray-400">{displayInfo.pageCount} pages</p>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1 truncate max-w-full px-2">{displayInfo.name}</p>
          </div>
        )}
      </div>
    );
  }

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
              setIsLoading(false); // Ensure loading state is false on error
              if (onMediaMissing && media && media.id) {
                onMediaMissing(media.id, media.name);
              }
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
          key={media.url || media.thumbnail}
          ref={mediaRef}
          src={media.thumbnail || media.url}
          alt={media.name}
          className={`max-w-full max-h-full object-contain ${isLoading ? 'opacity-0' : 'opacity-100'}`}
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
          className={`max-w-full max-h-full object-contain ${isLoading ? 'opacity-0' : 'opacity-100'}`}
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
        <MusicIconLucide size={32} className={`text-blue-500 mb-2 ${isLoading ? 'opacity-0' : 'opacity-100'}`} />
        <p className={`text-xs truncate max-w-full px-2 ${isLoading ? 'opacity-0' : 'opacity-100'}`} title={media.name}>{media.name}</p>
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