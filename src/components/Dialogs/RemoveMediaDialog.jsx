// RemoveMediaDialog.jsx
import React from 'react';
import { Trash2, X, AlertTriangle, Grid } from 'lucide-react';

const RemoveMediaDialog = ({
  showDialog,
  selectedCount,
  selectedMediaItems, // Array of indices
  mediaFiles,       
  onClose,
  onRemoveFromList,
  onRemoveFromGrid,
  onExportDeleteCommand
}) => {
  if (!showDialog) return null;

  const handleExportDeleteCommand = () => {
    if (!mediaFiles || !selectedMediaItems) {
      alert("Error: Missing media data.");
      return;
    }

    const selectedFileObjects = selectedMediaItems.map(idx => mediaFiles[idx]).filter(Boolean);
    
    // Check which files have valid paths
    const filesWithPaths = selectedFileObjects.filter(file => file.userPath || file.url);
    const filesWithoutPaths = selectedFileObjects.filter(file => !file.userPath && !file.url);

    if (filesWithPaths.length === 0) {
      alert(`None of the ${selectedFileObjects.length} selected file(s) have valid paths. Files might have been added via drag & drop instead of folder import.`);
      return;
    }

    if (filesWithoutPaths.length > 0) {
      const proceed = confirm(
        `${filesWithoutPaths.length} of ${selectedFileObjects.length} files don't have system paths.\n\n` +
        `Files without paths:\n${filesWithoutPaths.map(f => f.name).join('\n')}\n\n` +
        `Continue with ${filesWithPaths.length} file(s) that have paths?`
      );
      if (!proceed) return;
    }

    // Generate commands for files with paths
    const commandLines = filesWithPaths
      .map(fileObject => {
        const path = fileObject.userPath || fileObject.name; // Fallback to name
        return `Remove-Item -Path '${path.replace(/'/g, "''")}' -Force`;
      });

    const finalCommand = commandLines.join('\n');
    
    navigator.clipboard.writeText(finalCommand)
      .then(() => {
        alert(`PowerShell delete command for ${filesWithPaths.length} file(s) copied to clipboard. Review before executing!`);
      })
      .catch(err => {
        console.error("Failed to copy delete command:", err);
        alert("Failed to copy command to clipboard.");
      });

    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 max-w-md w-full text-gray-900 dark:text-gray-100">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold">
            Remove Media
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white"
          >
            <X size={24} />
          </button>
        </div>

        <div className="mb-6">
          <div className="flex items-center text-amber-600 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-300 p-3 rounded-lg mb-4">
            <AlertTriangle className="mr-2" size={20} />
            <p>You've selected {selectedCount} media item{selectedCount !== 1 ? 's' : ''}. What would you like to do?</p>
          </div>

          <div className="space-y-3">
            <button
              onClick={onRemoveFromGrid}
              className="w-full flex items-center justify-center text-center p-3 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
            >
              <div>
                <Grid size={18} className="mr-2 inline-block" />
                Remove from Grid Only
                <p className="text-xs opacity-80 block w-full mt-1">(Keeps items in the media panel)</p>
              </div>
            </button>

            <button
              onClick={onRemoveFromList}
              className="w-full flex items-center justify-center text-center p-3 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              <div>
                <Trash2 size={18} className="mr-2 inline-block" />
                Remove from This Project
                <p className="text-xs opacity-80 block w-full mt-1">(Files remain on your computer)</p>
              </div>
            </button>

            <button
              onClick={handleExportDeleteCommand}
              className="w-full flex items-center justify-center text-center p-3 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
            >
              <div>
                <Trash2 size={18} className="mr-2 inline-block" />
                Export Delete Command
                <p className="text-xs opacity-80 block w-full mt-1">(To permanently delete files via terminal)</p>
              </div>
            </button>
          </div>
        </div>

        <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
          <strong>Warning:</strong> Exporting a delete command is for advanced users. Review the command carefully before executing it in your terminal as it will permanently delete files from your system.
        </div>
      </div>
    </div>
  );
};

export default RemoveMediaDialog;