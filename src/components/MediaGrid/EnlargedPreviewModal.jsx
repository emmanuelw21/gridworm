// components/MediaGrid/EnlargedPreviewModal.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  X, Edit, FileJson, Music, ChevronLeft, ChevronRight, 
  AlertTriangle, FileX, Maximize, Play, Repeat, Repeat1,
  Pause, Clock, Image as ImageIconLucide, Video as VideoIconLucide, 
  RefreshCw as RefreshCwIcon, Box, Boxes
} from 'lucide-react';
import { isVideo, isImage, isAudio, is3D } from './helpers';
import ThreeDViewer from '../ThreeDGrid/ThreeDViewer';

const EnlargedPreviewModal = ({
  showEnlargedPreview, previewMedia, onClose, onEditName, onEditMetadata, mediaList, 
  setPreviewMedia, autoLoop = true, repeatPlaylistActive = false, onToggleRepeatPlaylist
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [indexedMediaList, setIndexedMediaList] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [theatreMode, setTheatreMode] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [autoPlayEnabled, setAutoPlayEnabled] = useState(false);
  const [autoPlayDuration, setAutoPlayDuration] = useState(5);
  const [autoPlayTimeRemaining, setAutoPlayTimeRemaining] = useState(0);
  const [autoPlayPaused, setAutoPlayPaused] = useState(false);
  const [isZooming, setIsZooming] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [transitionActive, setTransitionActive] = useState(false);

  const mediaRef = useRef(null);
  const controlsTimerRef = useRef(null);
  const autoPlayTimerRef = useRef(null);
  const countdownIntervalRef = useRef(null);
  const transitionTimeoutRef = useRef(null);
  const viewer3DRef = useRef(null);

  useEffect(() => {
    if (Array.isArray(mediaList) && mediaList.length > 0 && previewMedia) {
      const newIndexedList = mediaList.map((item, idx) => ({ media: item, originalIndex: idx }));
      setIndexedMediaList(newIndexedList);
      const matchIndex = newIndexedList.findIndex(item => item.media && previewMedia && item.media.id === previewMedia.id);
      setCurrentIndex(matchIndex !== -1 ? matchIndex : 0);
    } else if (!previewMedia) {
        setIndexedMediaList([]);
    }
  }, [mediaList, previewMedia]);

  useEffect(() => {
    if (previewMedia) {
      setIsLoading(true); 
      setImageError(false); 
      setTransitionActive(false);
      if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current);
    }
  }, [previewMedia]);

  // Auto-hide controls in theatre mode
  useEffect(() => {
    const clearHideTimer = () => {
      if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    };

    if (theatreMode && controlsVisible && !autoPlayPaused) {
      clearHideTimer();
      controlsTimerRef.current = setTimeout(() => {
        setControlsVisible(false);
      }, 3000);
    } else if (!theatreMode || !controlsVisible) {
        clearHideTimer();
    }
    return clearHideTimer;
  }, [theatreMode, controlsVisible, previewMedia, autoPlayPaused]);

  // Auto play functionality with countdown
  useEffect(() => {
    const isStillImage = previewMedia && isImage(previewMedia.type) && !previewMedia.type.includes('gif');

    if (!autoPlayEnabled || !showEnlargedPreview || autoPlayPaused || !isStillImage) {
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      if (autoPlayTimerRef.current) clearTimeout(autoPlayTimerRef.current);
      setAutoPlayTimeRemaining(0);
      return;
    }
    
    setAutoPlayTimeRemaining(autoPlayDuration);
    countdownIntervalRef.current = setInterval(() => setAutoPlayTimeRemaining(prev => Math.max(0, parseFloat((prev - 0.1).toFixed(1)))), 100);
    autoPlayTimerRef.current = setTimeout(() => {
      setTransitionActive(true);
      transitionTimeoutRef.current = setTimeout(() => { handleGoNext(); setTransitionActive(false);}, 300);
    }, autoPlayDuration * 1000);

    return () => {
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      if (autoPlayTimerRef.current) clearTimeout(autoPlayTimerRef.current);
      if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current);
    };
  }, [autoPlayEnabled, previewMedia, currentIndex, showEnlargedPreview, autoPlayDuration, autoPlayPaused]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!showEnlargedPreview) {
      if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
      if (autoPlayTimerRef.current) clearTimeout(autoPlayTimerRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current);
      setZoomLevel(1); 
      setTheatreMode(false); 
      setAutoPlayEnabled(false); 
      setAutoPlayPaused(false); 
      setControlsVisible(true);
    } else {
        if (theatreMode) {
            setControlsVisible(true);
        }
    }
  }, [showEnlargedPreview]);

  const handleGoNext = useCallback(() => {
    if (indexedMediaList.length <= 1 && !repeatPlaylistActive) return;
    let newIndex = currentIndex + 1;
    if (newIndex >= indexedMediaList.length) {
      if (repeatPlaylistActive) newIndex = 0;
      else { if (autoPlayEnabled) setAutoPlayEnabled(false); return; }
    }
    setCurrentIndex(newIndex);
    setPreviewMedia(indexedMediaList[newIndex].media);
  }, [currentIndex, indexedMediaList, repeatPlaylistActive, setPreviewMedia, autoPlayEnabled, setAutoPlayEnabled]);

  const handleGoPrev = () => {
    if (indexedMediaList.length <= 1 && !repeatPlaylistActive) return;
    let newIndex = currentIndex - 1;
    if (newIndex < 0) {
      if (repeatPlaylistActive) newIndex = indexedMediaList.length - 1;
      else return;
    }
    setCurrentIndex(newIndex);
    setPreviewMedia(indexedMediaList[newIndex].media);
  };
  
  const handleMouseMoveInModal = () => {
    if (theatreMode) {
      setControlsVisible(true);
    }
  };

  const toggleAutoPlayPause = () => setAutoPlayPaused(prev => !prev);
  
  const handleMediaEnded = () => {
    if (autoPlayEnabled || (!autoLoop && (repeatPlaylistActive || currentIndex < indexedMediaList.length - 1))) {
      setTransitionActive(true);
      transitionTimeoutRef.current = setTimeout(() => { handleGoNext(); setTransitionActive(false); }, 300);
    }
  };
  
  if (!showEnlargedPreview || !previewMedia) return null;

  // Missing Media Case
  if (previewMedia?.isMissing || previewMedia?.isPlaceholder) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-75 dark:bg-opacity-85 flex items-center justify-center z-[100] p-4" onClick={onClose}>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl flex flex-col max-w-md w-full p-6 text-gray-900 dark:text-gray-100" onClick={e => e.stopPropagation()}>
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-lg truncate flex items-center" title={previewMedia.name}>
              <AlertTriangle size={20} className="text-amber-500 inline mr-2 shrink-0" />
              Missing Media
            </h3>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white">
              <X size={24} />
            </button>
          </div>
          <p className="text-sm mb-2">File: <span className="font-medium">{previewMedia.name}</span></p>
          <p className="text-sm text-gray-600 dark:text-gray-400">This media could not be loaded. It might be missing or the path is incorrect.</p>
        </div>
      </div>
    );
  }
  
  const isPrevDisabled = indexedMediaList.length <= 1 || (!repeatPlaylistActive && currentIndex <= 0);
  const isNextDisabled = indexedMediaList.length <= 1 || (!repeatPlaylistActive && currentIndex >= indexedMediaList.length - 1);
  const isCurrentMediaAutoPlayable = previewMedia && isImage(previewMedia.type) && !previewMedia.type.includes('gif');
  const is3DMedia = previewMedia && (is3D(previewMedia.type) || previewMedia.isPrimitive);

  // Theatre mode UI logic
  const controlsOpacityClass = (theatreMode && !controlsVisible) ? 'opacity-0 pointer-events-none' : 'opacity-100';
  const detailsOpacityClass = (theatreMode && !controlsVisible) ? 'opacity-0 h-0 overflow-hidden p-0 border-0' : 'opacity-100 p-4';

  return (
    // EnlargedPreviewModal.jsx 
   <div 
     className={`fixed inset-0 z-[100] flex items-center justify-center text-white
                 ${theatreMode ? 'bg-black' : 'bg-black bg-opacity-70 dark:bg-opacity-80'} transition-colors duration-300`}
     onClick={onClose}
     onMouseMove={handleMouseMoveInModal}
     tabIndex={-1}
   >
     {/* Main Modal Content Structure */}
     <div 
       className={`flex flex-col bg-transparent w-full h-full max-w-screen-2xl max-h-screen overflow-hidden`}
       onClick={(e) => e.stopPropagation()}
     >
       {/* Header Section - Conditionally fades */}
       <div className={`flex-shrink-0 bg-gray-800/30 dark:bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${controlsOpacityClass}`}>
         <div className="max-w-screen-xl mx-auto p-3 flex justify-between items-center">
           <h3 className="font-semibold text-lg truncate" title={previewMedia.name}>{previewMedia.name}</h3>
           <div className="flex items-center space-x-2">
             <button onClick={(e) => { e.stopPropagation(); setTheatreMode(prev => !prev); setControlsVisible(true); }} className={`p-1.5 rounded hover:bg-white/20 ${theatreMode ? 'text-blue-400' : ''}`} title={theatreMode ? "Exit Theatre" : "Theatre Mode"}>
               <Maximize size={18} />
             </button>
             <button onClick={(e) => { e.stopPropagation(); onToggleRepeatPlaylist(); }} className={`p-1.5 rounded hover:bg-white/20 ${repeatPlaylistActive ? 'text-blue-400' : ''}`} title={repeatPlaylistActive ? "No Repeat" : "Repeat All"}>
               {repeatPlaylistActive ? <Repeat1 size={18} /> : <Repeat size={18} />}
             </button>
             {isCurrentMediaAutoPlayable && (
               <button onClick={(e) => { e.stopPropagation(); setAutoPlayEnabled(prev => !prev); setAutoPlayPaused(false);}} className={`p-1.5 rounded hover:bg-white/20 ${autoPlayEnabled ? 'text-blue-400' : ''}`} title={autoPlayEnabled ? "Stop Autoplay" : "Autoplay Slideshow"}>
                 <Play size={18} />
               </button>
             )}
             {autoPlayEnabled && isCurrentMediaAutoPlayable && (
               <button onClick={(e)=>{e.stopPropagation(); toggleAutoPlayPause();}} className={`p-1.5 rounded hover:bg-white/20 ${autoPlayPaused ? 'text-yellow-400' : ''}`} title={autoPlayPaused ? "Resume" : "Pause"}>
                 {autoPlayPaused ? <Play size={18}/> : <Pause size={18}/>}
               </button>
             )}
             {autoPlayEnabled && isCurrentMediaAutoPlayable && (
               <div onClick={e=>e.stopPropagation()} className="flex items-center">
                 <input type="number" min="1" max="60" value={autoPlayDuration} onChange={(e) => setAutoPlayDuration(Math.max(1, parseInt(e.target.value,10)) || 5)} className="w-10 px-1 py-0.5 bg-black/30 text-white text-xs rounded border border-white/20" title="Secs/slide"/>
                 <span className="ml-1 text-xs">s</span>
               </div>
             )}
             {autoPlayEnabled && !autoPlayPaused && isCurrentMediaAutoPlayable && autoPlayTimeRemaining > 0 && (
               <div className="flex items-center text-xs ml-2">
                 <Clock size={14} className="mr-1" />
                 <span>{autoPlayTimeRemaining.toFixed(1)}s</span>
               </div>
             )}
             <span className="text-sm text-gray-300 mx-2">{currentIndex + 1} of {indexedMediaList.length}</span>
             <button onClick={onClose} className="p-1.5 rounded hover:bg-white/20" title="Close (Esc)">
               <X size={18} />
             </button>
           </div>
         </div>
         
       </div>

       {/* Media Display Area (Stays visible) & Navigation (Conditionally fades) */}
       <div className="flex-grow flex items-center justify-center relative overflow-hidden min-h-0">
         {/* Prev Button - Conditionally fades */}
         <button
           onClick={(e) => { e.stopPropagation(); setTransitionActive(true); setTimeout(() => { handleGoPrev(); setTransitionActive(false); }, 300);}}
           disabled={isPrevDisabled}
           className={`absolute left-4 top-1/2 transform -translate-y-1/2 z-[101] p-2 rounded-full 
                       ${isPrevDisabled ? 'bg-gray-700/30 text-gray-500 cursor-not-allowed' : 'bg-black/40 text-white hover:bg-black/70'} 
                       transition-all duration-300 ${controlsOpacityClass}`}
           aria-label="Previous"
         >
           <ChevronLeft size={32} />
         </button>

         {/* Media Content - Always visible unless loading/error */}
         <div className={`w-full h-full flex items-center justify-center transition-opacity duration-300 ${transitionActive ? 'opacity-30 scale-95' : 'opacity-100 scale-100'}`}>
           {isLoading && !is3DMedia && (isImage(previewMedia.type) || isVideo(previewMedia.type)) && (
             <div className="absolute inset-0 flex items-center justify-center z-10">
               <RefreshCwIcon size={48} className="animate-spin text-white/80" />
             </div>
           )}
           
           {is3DMedia ? (
             <div className="w-full h-full max-w-5xl max-h-[80vh]">
               <ThreeDViewer
                 ref={viewer3DRef}
                 media={previewMedia}
                 width="100%"
                 height="100%"
                 gridConfig={{ cellWidth: 160, cellHeight: 120, cellSize: 10 }}
                 viewMode="3d"
                 showGrid={true}
                 showAxes={false}
                 showWireframe={false}
                 showBoundingBox={false}
                 snapToGrid={false}
                 darkMode={true}
                 isSelected={false}
                 autoRotate={true}
                 enableInteraction={true}
                 className="w-full h-full"
               />
             </div>
           ) : isImage(previewMedia.type) && !imageError ? (
             <img 
               src={previewMedia.url} 
               alt={previewMedia.name} 
               className={`max-h-full max-w-full object-contain transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'}`} 
               onLoad={() => setIsLoading(false)} 
               onError={() => { setIsLoading(false); setImageError(true); }} 
             />
           ) : isVideo(previewMedia.type) && !imageError ? (
             <video 
               ref={mediaRef} 
               src={previewMedia.url} 
               controls 
               autoPlay 
               loop={autoLoop} 
               className={`max-h-full max-w-full transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'}`} 
               onLoadedData={() => setIsLoading(false)} 
               onError={() => { setIsLoading(false); setImageError(true); }} 
               onEnded={handleMediaEnded} 
               playsInline 
             />
           ) : isAudio(previewMedia.type) && !imageError ? (
             <div className="w-full flex flex-col items-center justify-center p-8 text-white">
               <MusicIconLucide size={96} className="mb-4" />
               <p className="mb-4 text-xl">{previewMedia.name}</p>
               <audio 
                 ref={mediaRef} 
                 src={previewMedia.url} 
                 controls 
                 autoPlay 
                 loop={autoLoop} 
                 className="w-full max-w-md mt-2" 
                 onLoadedData={() => setIsLoading(false)} 
                 onError={() => { setIsLoading(false); setImageError(true); }} 
                 onEnded={handleMediaEnded} 
               />
             </div>
           ) : imageError ? (
             <div className="p-4 bg-red-800/50 rounded text-center">
               <AlertTriangle size={32} className="mx-auto mb-2"/>
               Error loading media: 
               <p className="text-sm mt-1">{previewMedia.name}</p>
             </div>
           ) : (
             <div className="text-center">Unable to preview this file type.</div>
           )}
         </div>

         {/* Next Button - Conditionally fades */}
         <button
           onClick={(e) => { e.stopPropagation(); setTransitionActive(true); setTimeout(() => { handleGoNext(); setTransitionActive(false); }, 300);}}
           disabled={isNextDisabled}
           className={`absolute right-4 top-1/2 transform -translate-y-1/2 z-[101] p-2 rounded-full 
                       ${isNextDisabled ? 'bg-gray-700/30 text-gray-500 cursor-not-allowed' : 'bg-black/40 text-white hover:bg-black/70'}
                       transition-all duration-300 ${controlsOpacityClass}`}
           aria-label="Next"
         >
           <ChevronRight size={32} />
         </button>
       </div>

       {/* Details and Metadata Section - Conditionally fades and collapses */}
       <div className={`flex-shrink-0 bg-gray-800/30 dark:bg-black/50 backdrop-blur-sm transition-all duration-300 ${detailsOpacityClass} ${theatreMode && !controlsVisible ? 'max-h-0': 'max-h-60'}`}>
         <div className={`max-w-screen-xl mx-auto overflow-y-auto `}>
           <div className="relative">
             <div className="absolute top-3 right-3 z-20 flex space-x-2">
               <button onClick={(e) => { e.stopPropagation(); onEditName(); }} className="px-3 py-1.5 bg-blue-600/80 text-white rounded-md hover:bg-blue-700 flex items-center shadow-sm text-xs" title="Edit Name">
                 <Edit size={14} className="mr-1.5" /> Edit Name
               </button>
               <button onClick={(e) => { e.stopPropagation(); onEditMetadata(); }} className="px-3 py-1.5 bg-purple-600/80 text-white rounded-md hover:bg-purple-700 flex items-center shadow-sm text-xs" title="Edit Metadata">
                 <FileJson size={14} className="mr-1.5" /> Metadata
               </button>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 pr-[200px] md:pr-[230px]">
               <div>
                 <h4 className="font-semibold mb-1 text-sm text-gray-200">File Details</h4>
                 <div className="text-xs space-y-0.5 text-gray-300">
                   <div className="flex items-center">
                     <span className="font-medium text-gray-100 mr-1">Type:</span>
                     <span className="flex items-center">
                       {isImage(previewMedia.type) && <ImageIconLucide size={12} className="mr-1" />}
                       {isVideo(previewMedia.type) && <VideoIconLucide size={12} className="mr-1" />}
                       {isAudio(previewMedia.type) && <MusicIconLucide size={12} className="mr-1" />}
                       {is3DMedia && <Boxes size={12} className="mr-1" />}
                       {previewMedia.type}
                     </span>
                   </div>
                   <div><span className="font-medium text-gray-100">Size:</span> {previewMedia.size}</div>
                   <div><span className="font-medium text-gray-100">Date:</span> {previewMedia.date}</div>
                   {previewMedia.isPrimitive && (
                     <div>
                       <span className="font-medium text-gray-100">Primitive:</span> {previewMedia.primitiveType}
                     </div>
                   )}
                 </div>
               </div>
               <div>
                 <h4 className="font-semibold mb-1 text-sm text-gray-200">Metadata</h4>
                 <div className="text-xs space-y-0.5 text-gray-300">
                   <div><span className="font-medium text-gray-100">Title:</span> {previewMedia.metadata?.title || previewMedia.name.split('.')[0]}</div>
                   <div><span className="font-medium text-gray-100">Author:</span> {previewMedia.metadata?.author || '-'}</div>
                   {previewMedia.metadata?.category && (
                     <div><span className="font-medium text-gray-100">Category:</span> {previewMedia.metadata.category}</div>
                   )}
                 </div>
               </div>
             </div>
           </div>
         </div>
       </div>
     </div>
   </div>
 );
};

export default EnlargedPreviewModal;