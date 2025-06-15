// components/UI/DropdownMenu.jsx
import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

const DropdownMenu = ({ 
  title, 
  icon: Icon, 
  children, 
  buttonClassName = "",
  menuClassName = "",
  disabled = false 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className={`flex items-center px-2 sm:px-3 py-1 sm:py-1.5 text-white rounded transition-colors text-xs sm:text-sm ${buttonClassName}`}
      >
        {Icon && <Icon size={14} className="mr-1 sm:mr-1.5" />}
        {title}
        <ChevronDown size={14} className={`ml-1 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      {isOpen && (
        <div className={`absolute left-0 mt-1 min-w-[200px] bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50 ${menuClassName}`}>
          <div onClick={() => setIsOpen(false)}>
            {children}
          </div>
        </div>
      )}
    </div>
  );
};

export const DropdownItem = ({ onClick, icon: Icon, children, className = "", disabled = false }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`w-full flex items-center px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
  >
    {Icon && <Icon size={16} className="mr-2" />}
    {children}
  </button>
);

export default DropdownMenu;