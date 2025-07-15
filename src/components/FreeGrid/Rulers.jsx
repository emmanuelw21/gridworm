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
    <div className="absolute top-[56px] left-[32px] right-0 h-6 bg-gray-50 dark:bg-gray-800 border-b border-gray-300 dark:border-gray-600 overflow-hidden z-30">
      <div
        className="relative h-full"
        style={{
          transform: `translateX(${panOffset.x * zoomLevel}px) scaleX(${zoomLevel})`,
          transformOrigin: '0 0',
          width: '10000px'
        }}
      >
        {Array.from({ length: 200 }).map((_, i) => (
          <div
            key={`h-tick-${i}`}
            className="absolute top-0 h-full"
            style={{
              left: `${i * 50}px`
            }}
          >
            <div 
              className="absolute bottom-0 border-l border-gray-400 dark:border-gray-500"
              style={{
                borderLeftWidth: i % 10 === 0 ? '2px' : '1px',
                height: i % 10 === 0 ? '100%' : (i % 5 === 0 ? '50%' : '25%')
              }}
            />
            {i % 10 === 0 && (
              <span className="absolute top-1 left-2 text-[10px] text-gray-600 dark:text-gray-300">
                {Math.round((i * 50) / 2.38)}{rulerUnits}
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
    <div className="absolute top-[82px] left-0 w-[32px] bottom-0 bg-gray-50 dark:bg-gray-800 border-r border-gray-300 dark:border-gray-600 overflow-hidden z-30">
      <div
        className="relative w-full"
        style={{
          transform: `translateY(${panOffset.y * zoomLevel}px) scaleY(${zoomLevel})`,
          transformOrigin: '0 0',
          height: '10000px'
        }}
      >
        {Array.from({ length: 200 }).map((_, i) => (
          <div
            key={`v-tick-${i}`}
            className="absolute left-0 w-full"
            style={{
              top: `${i * 50}px`
            }}
          >
            <div 
              className="absolute right-0 border-t border-gray-400 dark:border-gray-500"
              style={{
                borderTopWidth: i % 10 === 0 ? '2px' : '1px',
                width: i % 10 === 0 ? '100%' : (i % 5 === 0 ? '50%' : '25%')
              }}
            />
            {i % 10 === 0 && (
              <span 
                className="absolute left-1 text-[10px] text-gray-600 dark:text-gray-300"
                style={{
                  top: '2px',
                  writingMode: 'vertical-rl',
                  transform: 'rotate(180deg)'
                }}
              >
                {Math.round((i * 50) / 2.38)}{rulerUnits}
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
    <div className="absolute top-[56px] left-0 w-[32px] h-[26px] bg-gray-100 dark:bg-gray-700 border-r border-b border-gray-300 dark:border-gray-600 z-40 flex items-center justify-center">
      <button
        onClick={() => {
          const units = ['px', 'mm', 'cm', 'in'];
          const currentIndex = units.indexOf(rulerUnits);
          const nextIndex = (currentIndex + 1) % units.length;
          onChangeUnits(units[nextIndex]);
        }}
        className="text-[10px] font-medium text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400"
        title="Click to change units"
      >
        {rulerUnits}
      </button>
    </div>
  );
};

export default {
  HorizontalRuler,
  VerticalRuler,
  RulerCorner
};