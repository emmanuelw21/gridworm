import React from 'react';

// Horizontal ruler component
export const HorizontalRuler = ({ 
  showRulers, 
  rulerUnits, 
  zoomLevel, 
  panOffset 
}) => {
  if (!showRulers) return null;
  
  return (
    <div className="absolute top-8 left-8 right-0 h-6 bg-white dark:bg-gray-800 border-b border-r border-gray-300 dark:border-gray-600 overflow-hidden z-30">
      <div
        className="relative h-full"
        style={{
          transform: `translateX(${panOffset.x * zoomLevel}px) scaleX(${zoomLevel})`,
          transformOrigin: '0 0',
          width: '10000px'
        }}
      >
        {Array.from({ length: 100 }).map((_, i) => (
          <div
            key={`h-tick-${i}`}
            className="absolute top-0 h-6 border-l border-gray-300 dark:border-gray-600"
            style={{
              left: `${i * 100}px`,
              borderLeftWidth: i % 10 === 0 ? '2px' : '1px',
              height: i % 10 === 0 ? '100%' : (i % 5 === 0 ? '66%' : '33%')
            }}
          >
            {i % 10 === 0 && (
              <span className="absolute top-0 left-1 text-xs text-gray-600 dark:text-gray-300">
                {i * 100}
                {rulerUnits}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// Vertical ruler component
export const VerticalRuler = ({ 
  showRulers, 
  rulerUnits, 
  zoomLevel, 
  panOffset 
}) => {
  if (!showRulers) return null;

  return (
    <div
  className="absolute top-0 left-8 right-0 h-8 bg-white dark:bg-gray-800 border-b-2 border-gray-400 dark:border-gray-600 overflow-hidden z-30"
  style={{ boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
>
  <div
    className="relative h-full"
    style={{
      transform: `translateX(${panOffset.x * zoomLevel}px) scaleX(${zoomLevel})`,
      transformOrigin: '0 0',
      width: '10000px'
    }}
  >
    {Array.from({ length: 100 }).map((_, i) => (
      <div
        key={`h-tick-${i}`}
        className="absolute top-0 h-8 border-l border-gray-400 dark:border-gray-500"
        style={{
          left: `${i * 100}px`,
          borderLeftWidth: i % 10 === 0 ? '2px' : '1px',
          height: i % 10 === 0 ? '100%' : (i % 5 === 0 ? '66%' : '33%'),
          borderColor: i % 10 === 0 ? '#374151' : '#9CA3AF'
        }}
      >
        {i % 10 === 0 && (
          <span className="absolute top-1 left-2 text-xs font-medium text-gray-700 dark:text-gray-300">
            {i * 100}
          </span>
        )}
      </div>
    ))}
  </div>
</div>
  );
};

// Ruler intersection corner with units selector
export const RulerCorner = ({ 
  showRulers, 
  rulerUnits, 
  onChangeUnits 
}) => {
  if (!showRulers) return null;

  return (
    <div className="absolute top-8 left-0 w-8 h-6 bg-white dark:bg-gray-800 border-r border-b border-gray-300 dark:border-gray-600 z-40 flex items-center justify-center">
      <select
        value={rulerUnits}
        onChange={(e) => onChangeUnits(e.target.value)}
        className="text-xs bg-transparent border-none cursor-pointer text-gray-600 dark:text-gray-300"
        title="Change ruler units"
      >
        <option value="px">px</option>
        <option value="cm">cm</option>
        <option value="in">in</option>
      </select>
    </div>
  );
};

export default {
  HorizontalRuler,
  VerticalRuler,
  RulerCorner
};