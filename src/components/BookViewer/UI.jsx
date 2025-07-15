// components/BookViewer/UI.jsx
import { atom, useAtom } from "jotai";

export const pageAtom = atom(0);
export const pagesAtom = atom([]);

export const UI = ({ bookAtoms, totalPages, hidePageOverlay }) => {
  const [currentPage, setCurrentPage] = useAtom(bookAtoms?.pageAtom || pageAtom);
  if (hidePageOverlay) return null;
  return (
    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-white/90 dark:bg-gray-800/90 backdrop-blur rounded-lg shadow-lg p-4">
      <div className="flex items-center space-x-4">
        <button
          className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
          disabled={currentPage === 0}
        >
          Previous
        </button>
        
        <div className="text-sm font-medium">
          {currentPage === totalPages ? 'Back Cover' : `Page ${currentPage + 1} / ${totalPages}`}
        </div>
        
        <button
          className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage >= totalPages}
        >
          Next
        </button>
      </div>
      
      {/* Page slider */}
      <input
        type="range"
        min="0"
        max={Math.max(0, totalPages)}
        value={currentPage}
        onChange={(e) => setCurrentPage(parseInt(e.target.value))}
        className="w-full mt-2"
      />
    </div>
  );
};