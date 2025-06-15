// components/MediaGrid/BoundingBoxControls.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Maximize2, Box, Eye, EyeOff } from 'lucide-react';

export const useBoundingBox = (mediaRef, containerRef) => {
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [showBounds, setShowBounds] = useState(false);

  const calculateFitDimensions = () => {
    if (!mediaRef.current || !containerRef.current) return;

    let naturalWidth = 0;
    let naturalHeight = 0;

    // Get natural dimensions based on media type
    if (mediaRef.current.tagName === 'IMG') {
      naturalWidth = mediaRef.current.naturalWidth;
      naturalHeight = mediaRef.current.naturalHeight;
    } else if (mediaRef.current.tagName === 'VIDEO') {
      naturalWidth = mediaRef.current.videoWidth;
      naturalHeight = mediaRef.current.videoHeight;
    } else if (mediaRef.current.tagName === 'CANVAS') {
      // For 3D content
      naturalWidth = mediaRef.current.width;
      naturalHeight = mediaRef.current.height;
    }

    if (naturalWidth === 0 || naturalHeight === 0) return;

    const containerWidth = containerRef.current.clientWidth;
    const containerHeight = containerRef.current.clientHeight;

    // Calculate scale to fit container
    const scaleX = containerWidth / naturalWidth;
    const scaleY = containerHeight / naturalHeight;
    const scale = Math.min(scaleX, scaleY);

    setDimensions({
      width: naturalWidth * scale,
      height: naturalHeight * scale
    });
  };

  const fitToMedia = () => {
    calculateFitDimensions();
  };

  return {
    dimensions,
    showBounds,
    setShowBounds,
    fitToMedia
  };
};

export const BoundingBoxOverlay = ({ show, dimensions, isSelected }) => {
  if (!show && !isSelected) return null;

  return (
    <div
      className={`absolute pointer-events-none transition-all duration-200 ${
        isSelected ? 'border-2 border-blue-500' : 'border border-gray-400'
      }`}
      style={{
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)',
        width: `${dimensions.width}px`,
        height: `${dimensions.height}px`
      }}
    />
  );
};

// export const BoundingBoxControls = ({ mediaRef, containerRef, isSelected }) => {

//     const { dimensions, showBounds, setShowBounds, fitToMedia } = useBoundingBox(mediaRef, containerRef);
//     const buttonRef = useRef(null);
    
//     useEffect(() => {
//         fitToMedia();
//     }, [mediaRef, containerRef]);
    
//     return (
//         <div className="absolute top-2 right-2 flex items-center space-x-2">
//         <button
//             ref={buttonRef}
//             className="p-1 hover:bg-gray-200 rounded"
//             onClick={() => setShowBounds(!showBounds)}
//             title={showBounds ? 'Hide Bounding Box' : 'Show Bounding Box'}
//         >
//             {showBounds ? <Eye size={16} /> : <EyeOff size={16} />}
//         </button>
//         <button
//             className="p-1 hover:bg-gray-200 rounded"
//             onClick={fitToMedia}
//             title="Fit to Media"
//         >
//             <Maximize2 size={16} />
//         </button>
//         <BoundingBoxOverlay show={showBounds} dimensions={dimensions} isSelected={isSelected} />
//         </div>
//     );
//     }

