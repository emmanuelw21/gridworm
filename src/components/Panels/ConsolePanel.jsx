// components/Panels/ConsolePanel.jsx
import React, { useState, useRef, useEffect } from 'react';
import {
  X, Terminal, Trash2, Copy, Download, FileText, ChevronDown, 
  ChevronRight, Search, Filter, Clock, Tag, FileJson
} from 'lucide-react';

const ConsolePanel = ({
  showConsolePanel,
  consolePanelWidth,
  commandHistory,
  onClose,
  onClearHistory,
  onBeginResizing
}) => {
  const [expandedEntries, setExpandedEntries] = useState(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const consoleEndRef = useRef(null);

  // Auto-scroll to bottom when new entries added
  useEffect(() => {
    if (consoleEndRef.current) {
      consoleEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [commandHistory]);

  // Export functionality
  const exportHistory = (format = 'json') => {
    const historyData = commandHistory.map(entry => {
      if (entry.type === 'text-content' || entry.type === 'text-pages') {
        return {
          ...entry,
          fullContent: entry.commands.fullText || entry.commands.pages?.map(p => p.content).join('\n\n---\n\n')
        };
      }
      return entry;
    });
    
    if (format === 'json') {
      const blob = new Blob([JSON.stringify(historyData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `console-history-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } else if (format === 'txt') {
      // Export as readable text for journal entries
      let textContent = 'Console History Export\n';
      textContent += `Generated: ${new Date().toLocaleString()}\n`;
      textContent += '═'.repeat(50) + '\n\n';
      
      historyData.forEach(entry => {
        const date = new Date(entry.timestamp);
        textContent += `[${date.toLocaleString()}] ${entry.type.toUpperCase()}\n`;
        textContent += '─'.repeat(40) + '\n';
        
        if (entry.type === 'text-content' || entry.type === 'text-pages') {
          if (entry.fullContent) {
            textContent += `\nContent:\n${entry.fullContent}\n`;
          }
          if (entry.commands.pages) {
            textContent += `\nPages Created: ${entry.commands.pages.length}\n`;
            entry.commands.pages.forEach((page, idx) => {
              textContent += `\nPage ${idx + 1}:\n`;
              textContent += `Words: ${page.metadata?.wordCount || 0}\n`;
              textContent += `Excerpt: ${page.excerpt || page.content?.substring(0, 100)}...\n`;
            });
          }
        } else {
          textContent += JSON.stringify(entry.commands, null, 2) + '\n';
        }
        
        textContent += '\n' + '═'.repeat(50) + '\n\n';
      });
      
      const blob = new Blob([textContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `journal-export-${new Date().toISOString().split('T')[0]}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  // Filter entries
  const filteredHistory = commandHistory.filter(entry => {
    const matchesSearch = searchTerm === '' || 
      JSON.stringify(entry).toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || entry.type === filterType;
    return matchesSearch && matchesType;
  });

  const toggleExpanded = (id) => {
    setExpandedEntries(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      // Could add a toast notification here
    });
  };

  const getEntryIcon = (type) => {
    switch (type) {
      case 'text-content':
      case 'text-pages':
        return <FileText size={14} />;
      case 'Delete Files (PS)':
        return <Trash2 size={14} />;
      case 'File Operations':
        return <Terminal size={14} />;
      default:
        return <Terminal size={14} />;
    }
  };

  const getUniqueTypes = () => {
    const types = new Set(commandHistory.map(entry => entry.type));
    return Array.from(types);
  };

  if (!showConsolePanel) return null;

  return (
    <div
      className="fixed right-0 top-0 bottom-0 bg-white dark:bg-gray-900 border-l border-gray-300 dark:border-gray-600 flex flex-col z-40"
      style={{ width: `${consolePanelWidth}px` }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center">
          <Terminal size={18} className="mr-2 text-gray-600 dark:text-gray-400" />
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">
            Command Log ({filteredHistory.length})
          </h3>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => exportHistory('json')}
            className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
            title="Export as JSON"
          >
            <FileJson size={16} />
          </button>
          <button
            onClick={() => exportHistory('txt')}
            className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
            title="Export as Journal"
          >
            <FileText size={16} />
          </button>
          <button
            onClick={onClearHistory}
            className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
            title="Clear History"
          >
            <Trash2 size={16} />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="p-2 border-b border-gray-200 dark:border-gray-700 space-y-2">
        <div className="flex items-center space-x-2">
          <div className="flex-1 relative">
            <Search size={14} className="absolute left-2 top-2 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search logs..."
              className="w-full pl-7 pr-2 py-1 text-sm border rounded dark:bg-gray-800 dark:border-gray-600"
            />
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-2 py-1 text-sm border rounded dark:bg-gray-800 dark:border-gray-600"
          >
            <option value="all">All Types</option>
            {getUniqueTypes().map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Console content */}
      <div className="flex-1 overflow-y-auto p-3 font-mono text-xs">
        {filteredHistory.length === 0 ? (
          <div className="text-center text-gray-500 dark:text-gray-400 py-8">
            No command history
          </div>
        ) : (
          <div className="space-y-2">
            {filteredHistory.map((entry) => {
              const isExpanded = expandedEntries.has(entry.id);
              const timestamp = new Date(entry.timestamp);
              
              return (
                <div
                  key={entry.id}
                  className="border border-gray-200 dark:border-gray-700 rounded overflow-hidden"
                >
                  <div
                    className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                    onClick={() => toggleExpanded(entry.id)}
                  >
                    <div className="flex items-center space-x-2">
                      {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      {getEntryIcon(entry.type)}
                      <span className="font-medium">{entry.type}</span>
                      {entry.platform && (
                        <span className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 rounded text-xs">
                          {entry.platform}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-2 text-gray-500 dark:text-gray-400">
                      <Clock size={12} />
                      <span>{timestamp.toLocaleTimeString()}</span>
                    </div>
                  </div>
                  
                  {isExpanded && (
                    <div className="p-3 bg-gray-900 dark:bg-black text-gray-100 overflow-x-auto">
                      {entry.type === 'text-content' || entry.type === 'text-pages' ? (
                        <div className="space-y-2">
                          {entry.commands.pages && (
                            <div>
                              <div className="text-green-400 mb-2">
                                Created {entry.commands.pages.length} text pages
                              </div>
                              {entry.commands.pages.map((page, idx) => (
                                <div key={idx} className="ml-4 mb-2 text-gray-300">
                                  <div className="font-medium">Page {page.pageNumber || idx + 1}:</div>
                                  <div className="ml-2 text-xs">
                                    Words: {page.metadata?.wordCount || 0} | 
                                    Characters: {page.metadata?.characterCount || 0}
                                  </div>
                                  {page.excerpt && (
                                    <div className="ml-2 mt-1 italic text-gray-400">
                                      "{page.excerpt}"
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                          {entry.commands.fullText && (
                            <div className="mt-2 p-2 bg-gray-800 rounded max-h-40 overflow-y-auto">
                              <div className="text-green-400 mb-1">Full Text:</div>
                              <pre className="whitespace-pre-wrap text-gray-300 text-xs">
                                {entry.commands.fullText}
                              </pre>
                            </div>
                          )}
                        </div>
                      ) : (
                        <pre className="whitespace-pre-wrap">
                          {typeof entry.commands === 'string' 
                            ? entry.commands 
                            : JSON.stringify(entry.commands, null, 2)}
                        </pre>
                      )}
                      
                      <div className="mt-3 flex items-center space-x-2">
                        <button
                          onClick={() => copyToClipboard(
                            typeof entry.commands === 'string' 
                              ? entry.commands 
                              : JSON.stringify(entry.commands, null, 2)
                          )}
                          className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded flex items-center text-xs"
                        >
                          <Copy size={12} className="mr-1" />
                          Copy
                        </button>
                        {entry.commands.exportable && (
                          <button
                            onClick={() => {
                              const blob = new Blob([JSON.stringify(entry, null, 2)], { type: 'application/json' });
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = `${entry.type}-${entry.id}.json`;
                              a.click();
                              URL.revokeObjectURL(url);
                            }}
                            className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded flex items-center text-xs"
                          >
                            <Download size={12} className="mr-1" />
                            Export Entry
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        <div ref={consoleEndRef} />
      </div>

      {/* Resize handle */}
      <div
        className="absolute top-0 left-0 bottom-0 w-2 cursor-ew-resize hover:bg-blue-300 opacity-0 hover:opacity-50 transition-opacity"
        onMouseDown={(e) => {
          e.preventDefault();
          onBeginResizing();
        }}
      />
    </div>
  );
};

export default ConsolePanel;