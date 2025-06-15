// ConsolePanel.jsx
import React from 'react';
import { Terminal, Copy, X, Trash2 } from 'lucide-react'; // Added Trash2 for clear

const ConsolePanel = ({
  showConsolePanel,
  consolePanelWidth,
  commandHistory, // Array of { id, timestamp, type, commands, platform? }
  onClose, // Function to set showConsolePanel(false)
  onClearHistory, // Function to clear commandHistory
  onBeginResizing, // For the resize handle
}) => {
  if (!showConsolePanel) return null;

  const handleCopyToClipboard = (commandsToCopy) => {
    navigator.clipboard.writeText(commandsToCopy).then(() => {
      // Consider a more visible feedback like a temporary "Copied!" state on the button
      console.log("Commands copied to clipboard.");
      // Example: Set a temporary state for feedback
      // const button = event.target; // Get the button element
      // const originalText = button.innerHTML;
      // button.innerHTML = 'Copied!';
      // setTimeout(() => { button.innerHTML = originalText; }, 1500);
    }).catch(err => {
      console.error('Failed to copy commands: ', err);
      alert('Failed to copy commands. See console.');
    });
  };

  return (
    <div
      className="relative bg-white border-l border-gray-300 dark:bg-gray-800 dark:border-gray-700 flex flex-col"
      style={{ width: `${consolePanelWidth}px` }}
    >
      {/* Panel Header */}
      <div className="flex justify-between items-center p-3 border-b border-gray-300 bg-gray-50 dark:bg-gray-700 dark:text-gray-100 flex-shrink-0">
        <div className="flex items-center">
          <Terminal size={18} className="mr-2" />
          <h2 className="font-bold text-lg">Command Log</h2>
        </div>
        <div>
          <button
            onClick={onClearHistory}
            title="Clear Command History"
            className={`p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 mr-1 ${commandHistory.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
            disabled={commandHistory.length === 0}
          >
            <Trash2 size={16} />
          </button>
          <button
            onClick={onClose}
            title="Close Console Panel"
            className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Command History Content */}
      <div className="flex-grow overflow-y-auto p-3 space-y-3 dark:bg-gray-800">
        {commandHistory.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">No commands logged yet.</p>
        ) : (
          // Displaying newest first by default due to how items are added in addCommandToHistory
          commandHistory.map(logEntry => ( 
            <div key={logEntry.id} className="bg-gray-100 dark:bg-gray-700 p-3 rounded-md shadow-sm">
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                  {new Date(logEntry.timestamp).toLocaleString()}
                </span>
                <span className={`px-2 py-0.5 text-xs rounded-full font-medium
                  ${logEntry.type === 'Delete Command' ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' : 
                    'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'}`}>
                  {logEntry.type} {logEntry.platform ? `(${logEntry.platform.replace('windows_ps', 'PowerShell').replace('windows_cmd', 'CMD').replace('posix', 'Unix')})` : ''}
                </span>
              </div>
              <pre className="whitespace-pre-wrap break-all bg-white dark:bg-gray-900 p-2.5 rounded text-xs font-mono max-h-48 overflow-y-auto border border-gray-200 dark:border-gray-600 text-gray-800 dark:text-gray-200">
                {logEntry.commands}
              </pre>
              <button
                onClick={(e) => handleCopyToClipboard(logEntry.commands)}
                className="mt-2.5 px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50 flex items-center"
              >
                <Copy size={14} className="mr-1.5" /> Copy
              </button>
            </div>
          ))
        )}
      </div>

      {/* Resize Handle */}
      <div
        className="absolute top-0 left-0 bottom-0 w-2 cursor-col-resize bg-gray-200 dark:bg-gray-600 hover:bg-blue-500 dark:hover:bg-blue-400 opacity-50 hover:opacity-100 transition-opacity"
        onMouseDown={onBeginResizing}
        title="Resize Console Panel"
      ></div>
    </div>
  );
};

export default ConsolePanel;
