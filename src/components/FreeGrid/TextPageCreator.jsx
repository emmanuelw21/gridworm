// components/FreeGrid/TextPageCreator.jsx
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  FileText, Save, X, Settings, Type, AlignLeft, AlignCenter,
  AlignRight, Bold, Italic, Underline, Plus, ChevronLeft,
  ChevronRight, Layers, Download, Upload, Edit2, Trash2,
  Copy, FolderPlus, Book, Grid, CheckSquare, Square,
  Move, Minimize2, Maximize2, Eye, EyeOff
} from 'lucide-react';
import { TextPage, createTextPageFromContent } from '../MediaGrid/TextPage';
import { useAtom } from 'jotai';
import { textPageCollectionAtom, textPageGroupsAtom, activeTextPageGroupAtom } from '../../store';

const TextPageCreator = ({ isOpen, onClose, onCreatePages, onAddToMediaPanel, pageConfig = {}, darkMode = false }) => {
  // Page collection state - using Jotai for persistence
  const [pageCollection, setPageCollection] = useAtom(textPageCollectionAtom);
  const [pageGroups, setPageGroups] = useAtom(textPageGroupsAtom);
  const [activeGroup, setActiveGroup] = useAtom(activeTextPageGroupAtom);
  
  // Local state
  const [currentEditingPage, setCurrentEditingPage] = useState(null);
  const [selectedPages, setSelectedPages] = useState([]);

  // Editor state
  const [content, setContent] = useState(() => {
    // Restore draft content from session storage
    const draft = sessionStorage.getItem('textPageCreator_draft');
    return draft || '';
  });
  const [currentPageContent, setCurrentPageContent] = useState('');
  const [isAutoPageBreak, setIsAutoPageBreak] = useState(true);
  const [pageCounter, setPageCounter] = useState(() => {
    const savedCounter = sessionStorage.getItem('textPageCreator_pageCounter');
    return savedCounter ? parseInt(savedCounter) : 1;
  });

  // UI state
  const [showSettings, setShowSettings] = useState(false);
  const [showGroupDialog, setShowGroupDialog] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [previewMode, setPreviewMode] = useState('single'); // 'single', 'grid', 'book'
  const [isCreating, setIsCreating] = useState(false);

  // Page settings
  const [pageSettings, setPageSettings] = useState({
    width: pageConfig.width || 400,
    height: pageConfig.height || 600,
    padding: 50,
    fontSize: 16,
    fontFamily: 'Georgia, serif',
    lineHeight: 1.6,
    textAlign: 'left',
    backgroundColor: darkMode ? '#1a1a1a' : '#ffffff',
    textColor: darkMode ? '#e5e5e5' : '#000000',
    ...pageConfig
  });

  const editorRef = useRef(null);
  const canvasRef = useRef(null);
  const pagePreviewRefs = useRef({});

  // Calculate lines that fit on a page
  const calculateLinesPerPage = useCallback(() => {
    const usableHeight = pageSettings.height - (pageSettings.padding * 2);
    const lineHeightPx = pageSettings.fontSize * pageSettings.lineHeight;
    return Math.floor(usableHeight / lineHeightPx);
  }, [pageSettings]);

  // Check if current content exceeds page capacity
  const checkPageBreak = useCallback(() => {
    if (!isAutoPageBreak || !editorRef.current) return;

    const lines = content.split('\n');
    const linesPerPage = calculateLinesPerPage();

    if (lines.length > linesPerPage) {
      // Time for a new page
      handleCreatePage();
    }
  }, [content, isAutoPageBreak, calculateLinesPerPage]);

  // Update colors when dark mode changes
  useEffect(() => {
    setPageSettings(prev => ({
      ...prev,
      backgroundColor: darkMode ? '#1a1a1a' : '#ffffff',
      textColor: darkMode ? '#e5e5e5' : '#000000'
    }));
  }, [darkMode]);

  // Monitor content for auto page breaks
  useEffect(() => {
    if (isAutoPageBreak) {
      checkPageBreak();
    }
  }, [content, checkPageBreak]);

  // Auto-save draft content to session storage
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      sessionStorage.setItem('textPageCreator_draft', content);
    }, 500); // Debounce for 500ms

    return () => clearTimeout(timeoutId);
  }, [content]);

  // Save page counter to session storage
  useEffect(() => {
    sessionStorage.setItem('textPageCreator_pageCounter', pageCounter.toString());
  }, [pageCounter]);

  // Create a new page
  const handleCreatePage = useCallback(async () => {
    if (!content.trim() && !currentEditingPage) return;

    const pageContent = content.trim();
    const pageNumber = currentEditingPage ? currentEditingPage.pageNumber : pageCounter;
    const groupPrefix = activeGroup ? `${activeGroup}-` : '';

    // Create the text page
    const textPage = await createTextPageFromContent(
      pageContent,
      pageSettings,
      pageNumber,
      pageCollection.length + 1
    );

    // Add metadata - don't override the unique ID already generated
    textPage.name = `${groupPrefix}Page ${pageNumber}`;
    textPage.metadata.groupId = activeGroup;
    textPage.metadata.groupName = pageGroups[activeGroup]?.name;
    textPage.metadata.pageNumber = pageNumber;
    textPage.metadata.createdAt = new Date().toISOString();

    if (currentEditingPage) {
      // Update existing page
      setPageCollection(prev => prev.map(p =>
        p.id === currentEditingPage.id ? { ...textPage, id: currentEditingPage.id } : p
      ));
      setCurrentEditingPage(null);
    } else {
      // Add new page
      setPageCollection(prev => [...prev, textPage]);
      setPageCounter(prev => prev + 1);
    }

    // Clear editor for next page
    setContent('');
    sessionStorage.removeItem('textPageCreator_draft');
    editorRef.current?.focus();
  }, [content, currentEditingPage, pageCounter, activeGroup, pageGroups, pageSettings, pageCollection.length]);

  // Select page for editing
  const handleSelectPage = useCallback((page) => {
    if (currentEditingPage && content.trim()) {
      // Save current edits first
      handleCreatePage();
    }

    setCurrentEditingPage(page);
    setContent(page.textContent || '');
    editorRef.current?.focus();
  }, [currentEditingPage, content, handleCreatePage]);

  // Toggle page selection for grouping
  const togglePageSelection = useCallback((pageId) => {
    setSelectedPages(prev => {
      if (prev.includes(pageId)) {
        return prev.filter(id => id !== pageId);
      }
      return [...prev, pageId];
    });
  }, []);

  // Create a group from selected pages
  const handleCreateGroup = useCallback(() => {
    if (selectedPages.length === 0 || !groupName.trim()) return;

    const groupId = `group-${Date.now()}`;
    const newGroup = {
      id: groupId,
      name: groupName,
      pages: [...selectedPages],
      createdAt: new Date().toISOString()
    };

    setPageGroups(prev => ({ ...prev, [groupId]: newGroup }));

    // Update page metadata
    setPageCollection(prev => prev.map(page => {
      if (selectedPages.includes(page.id)) {
        return {
          ...page,
          name: `${groupName}-${page.name}`,
          metadata: {
            ...page.metadata,
            groupId: groupId,
            groupName: groupName
          }
        };
      }
      return page;
    }));

    setSelectedPages([]);
    setGroupName('');
    setShowGroupDialog(false);
    setActiveGroup(groupId);
  }, [selectedPages, groupName]);

  // Export pages to grid
  const handleExportToGrid = useCallback((pagesToExport = null) => {
    const pages = pagesToExport || pageCollection;
    if (pages.length === 0) {
      alert('No pages to export');
      return;
    }

    // Save any current edits
    if (content.trim()) {
      handleCreatePage();
    }

    // Call the parent callback with pages
    onCreatePages(pages);

    // Keep the window open but clear the selection
    setSelectedPages([]);

    // Show success message
    const notification = document.createElement('div');
    notification.className = 'fixed top-4 right-4 bg-green-600 text-white px-4 py-2 rounded shadow-lg z-50';
    notification.textContent = `${pages.length} pages exported to grid`;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
  }, [pageCollection, content, handleCreatePage, onCreatePages]);

  // Export pages to media panel only
  const handleExportToMediaPanel = useCallback((pagesToExport = null) => {
    const pages = pagesToExport || pageCollection;
    if (pages.length === 0) {
      alert('No pages to export');
      return;
    }

    // Save any current edits
    if (content.trim()) {
      handleCreatePage();
    }

    // Call the parent callback with pages for media panel
    if (onAddToMediaPanel) {
      onAddToMediaPanel(pages);
    }

    // Keep the window open but clear the selection
    setSelectedPages([]);

    // Show success message
    const notification = document.createElement('div');
    notification.className = 'fixed top-4 right-4 bg-blue-600 text-white px-4 py-2 rounded shadow-lg z-50';
    notification.textContent = `${pages.length} pages added to media panel`;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
  }, [pageCollection, content, handleCreatePage, onAddToMediaPanel]);

  // Export group to grid
  const handleExportGroup = useCallback((groupId) => {
    const group = pageGroups[groupId];
    if (!group) return;

    const groupPages = pageCollection.filter(p => group.pages.includes(p.id));
    handleExportToGrid(groupPages);
  }, [pageGroups, pageCollection, handleExportToGrid]);

  // Delete page
  const handleDeletePage = useCallback((pageId) => {
    setPageCollection(prev => prev.filter(p => p.id !== pageId));

    // Remove from groups
    setPageGroups(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(groupId => {
        updated[groupId].pages = updated[groupId].pages.filter(id => id !== pageId);
      });
      return updated;
    });

    // Clear editor if this was the editing page
    if (currentEditingPage?.id === pageId) {
      setCurrentEditingPage(null);
      setContent('');
    }
  }, [currentEditingPage]);

  // Duplicate page
  const handleDuplicatePage = useCallback((page) => {
    const newPage = {
      ...page,
      id: `${page.id}-copy-${Date.now()}`,
      name: `${page.name} (Copy)`,
      metadata: {
        ...page.metadata,
        pageNumber: pageCounter,
        createdAt: new Date().toISOString()
      }
    };

    setPageCollection(prev => [...prev, newPage]);
    setPageCounter(prev => prev + 1);
  }, [pageCounter]);

  // Render page preview
  const splitTextIntoPages = useCallback((text) => {
    if (!text.trim()) return [];

    const canvas = document.createElement('canvas');
    canvas.width = pageSettings.width;
    canvas.height = pageSettings.height;
    const ctx = canvas.getContext('2d');

    ctx.font = `${pageSettings.fontSize}px ${pageSettings.fontFamily}`;

    const maxWidth = pageSettings.width - (pageSettings.padding * 2);
    const lineHeightPx = pageSettings.fontSize * pageSettings.lineHeight;
    const maxLinesPerPage = Math.floor((pageSettings.height - (pageSettings.padding * 2)) / lineHeightPx);

    // Split text into words
    const words = text.split(/\s+/);
    const allLines = [];
    let currentLine = '';

    // Process words into lines
    words.forEach(word => {
      const testLine = currentLine + (currentLine ? ' ' : '') + word;
      const metrics = ctx.measureText(testLine);

      if (metrics.width > maxWidth && currentLine) {
        allLines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    });

    if (currentLine) {
      allLines.push(currentLine);
    }

    // Group lines into pages
    const pages = [];
    for (let i = 0; i < allLines.length; i += maxLinesPerPage) {
      const pageLines = allLines.slice(i, i + maxLinesPerPage);
      pages.push({
        lines: pageLines,
        content: pageLines.join('\n')
      });
    }

    return pages;
  }, [pageSettings]);

  // Update the handleCreatePage function to handle multiple pages at once
 const handleCreatePageFromPaste = useCallback(async (pastedText) => {
  const pages = splitTextIntoPages(pastedText);
  
  if (pages.length === 0) return;
  
  const createdPages = [];
  const groupPrefix = activeGroup ? `${activeGroup}-` : '';
  const startingPageNumber = pageCounter;
  
  for (let i = 0; i < pages.length; i++) {
    const pageNumber = startingPageNumber + i;
    const pageContent = pages[i].content;
    
    try {
      // Create the text page with proper page number
      const textPage = await createTextPageFromContent(
        pageContent,
        pageSettings,
        pageNumber,
        startingPageNumber + pages.length
      );
      
      // Ensure page number is set
      textPage.metadata.pageNumber = pageNumber;
      
      // Set name and metadata without overriding the unique ID
      textPage.name = `${groupPrefix}Page ${pageNumber}`;
      textPage.metadata.groupId = activeGroup;
      textPage.metadata.groupName = pageGroups[activeGroup]?.name;
      textPage.metadata.createdAt = new Date().toISOString();
      
      createdPages.push(textPage);
    } catch (error) {
      console.error('Error creating text page:', error);
    }
  }
  
  // Add all pages to collection
  setPageCollection(prev => [...prev, ...createdPages]);
  setPageCounter(prev => prev + pages.length);
  
  // Clear editor
  setContent('');
  editorRef.current?.focus();
  
  // Show notification
  const notification = document.createElement('div');
  notification.className = 'fixed top-4 right-4 bg-green-600 text-white px-4 py-2 rounded shadow-lg z-50';
  notification.textContent = `Created ${createdPages.length} pages from pasted content`;
  document.body.appendChild(notification);
  setTimeout(() => notification.remove(), 3000);
}, [splitTextIntoPages, pageCounter, activeGroup, pageGroups, pageSettings]);

  // Update the content change handler to detect paste
  const handleContentChange = useCallback((e) => {
    const newContent = e.target.value;
    const oldContent = content;

    // Detect if this is a paste operation (large content change)
    if (newContent.length - oldContent.length > 100) {
      // This is likely a paste
      if (isAutoPageBreak) {
        handleCreatePageFromPaste(newContent);
        return;
      }
    }

    setContent(newContent);
  }, [content, isAutoPageBreak, handleCreatePageFromPaste]);

  // Fix the renderPagePreview function to prevent cropping
  const renderPagePreview = useCallback((page, canvas) => {
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    canvas.width = pageSettings.width;
    canvas.height = pageSettings.height;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Background
    ctx.fillStyle = pageSettings.backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Set up text rendering
    ctx.fillStyle = pageSettings.textColor;
    ctx.font = `${pageSettings.fontSize}px ${pageSettings.fontFamily}`;
    ctx.textBaseline = 'top';

    const maxWidth = pageSettings.width - (pageSettings.padding * 2);
    const lineHeightPx = pageSettings.fontSize * pageSettings.lineHeight;

    // Split content into lines that fit within max width
    const words = (page.textContent || '').split(/\s+/);
    const lines = [];
    let currentLine = '';

    words.forEach(word => {
      const testLine = currentLine + (currentLine ? ' ' : '') + word;
      const metrics = ctx.measureText(testLine);

      if (metrics.width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    });

    if (currentLine) {
      lines.push(currentLine);
    }

    // Draw lines
    let y = pageSettings.padding;
    const maxLines = Math.floor((pageSettings.height - (pageSettings.padding * 2)) / lineHeightPx);

    lines.slice(0, maxLines).forEach(line => {
      let x = pageSettings.padding;

      if (pageSettings.textAlign === 'center') {
        const metrics = ctx.measureText(line);
        x = (canvas.width - metrics.width) / 2;
      } else if (pageSettings.textAlign === 'right') {
        const metrics = ctx.measureText(line);
        x = canvas.width - pageSettings.padding - metrics.width;
      }

      ctx.fillText(line, x, y);
      y += lineHeightPx;
    });

    // Page number
    ctx.font = `12px ${pageSettings.fontFamily}`;
    ctx.fillStyle = darkMode ? '#666' : '#888';
    ctx.textAlign = 'center';
    ctx.fillText(`— ${page.metadata.pageNumber} —`, canvas.width / 2, canvas.height - 30);
    ctx.textAlign = 'left'; // Reset
  }, [pageSettings, darkMode]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 's':
            e.preventDefault();
            handleCreatePage();
            break;
          case 'g':
            e.preventDefault();
            if (selectedPages.length > 0) {
              setShowGroupDialog(true);
            }
            break;
          case 'e':
            e.preventDefault();
            handleExportToGrid();
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleCreatePage, handleExportToGrid, selectedPages]);

  if (!isOpen) return null;

  const groupedPages = {};
  pageCollection.forEach(page => {
    const groupId = page.metadata?.groupId || 'ungrouped';
    if (!groupedPages[groupId]) {
      groupedPages[groupId] = [];
    }
    groupedPages[groupId].push(page);
  });



  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className={`${darkMode ? 'dark' : ''} bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-7xl h-5/6 flex flex-col`}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
          <h2 className="text-xl font-semibold flex items-center dark:text-white">
            <FileText className="mr-2" size={24} />
            Text Page Creator
            <span className="ml-3 text-sm text-gray-500 dark:text-gray-400">
              {pageCollection.length} pages | {Object.keys(pageGroups).length} groups
            </span>
          </h2>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setPreviewMode(prev =>
                prev === 'single' ? 'grid' : prev === 'grid' ? 'book' : 'single'
              )}
              className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
              title={`Preview: ${previewMode}`}
            >
              {previewMode === 'single' && <Eye size={20} />}
              {previewMode === 'grid' && <Grid size={20} />}
              {previewMode === 'book' && <Book size={20} />}
            </button>

            <label className="flex items-center text-sm dark:text-gray-300">
              <input
                type="checkbox"
                checked={isAutoPageBreak}
                onChange={(e) => setIsAutoPageBreak(e.target.checked)}
                className="mr-2"
              />
              Auto page break
            </label>

            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
              title="Page Settings"
            >
              <Settings size={20} className="dark:text-gray-300" />
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <X size={20} className="dark:text-gray-300" />
            </button>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Editor panel */}
          <div className="flex-1 flex flex-col">
            {/* Editor toolbar */}
            <div className="flex items-center justify-between p-2 border-b dark:border-gray-700">
              <div className="flex items-center space-x-2">
                <select
                  value={pageSettings.fontFamily}
                  onChange={(e) => setPageSettings({ ...pageSettings, fontFamily: e.target.value })}
                  className="px-2 py-1 rounded border text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="Georgia, serif">Georgia</option>
                  <option value="Times New Roman, serif">Times New Roman</option>
                  <option value="Arial, sans-serif">Arial</option>
                  <option value="Helvetica, sans-serif">Helvetica</option>
                  <option value="Courier New, monospace">Courier New</option>
                </select>

                <input
                  type="number"
                  value={pageSettings.fontSize}
                  onChange={(e) => setPageSettings({ ...pageSettings, fontSize: parseInt(e.target.value) || 16 })}
                  className="w-16 px-2 py-1 rounded border text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  min="8"
                  max="72"
                />

                <div className="flex items-center space-x-1 border-l pl-2 dark:border-gray-600">
                  <button
                    onClick={() => setPageSettings({ ...pageSettings, textAlign: 'left' })}
                    className={`p-1 rounded ${pageSettings.textAlign === 'left' ? 'bg-blue-100 dark:bg-blue-900' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                  >
                    <AlignLeft size={16} className="dark:text-gray-300" />
                  </button>
                  <button
                    onClick={() => setPageSettings({ ...pageSettings, textAlign: 'center' })}
                    className={`p-1 rounded ${pageSettings.textAlign === 'center' ? 'bg-blue-100 dark:bg-blue-900' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                  >
                    <AlignCenter size={16} className="dark:text-gray-300" />
                  </button>
                  <button
                    onClick={() => setPageSettings({ ...pageSettings, textAlign: 'right' })}
                    className={`p-1 rounded ${pageSettings.textAlign === 'right' ? 'bg-blue-100 dark:bg-blue-900' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                  >
                    <AlignRight size={16} className="dark:text-gray-300" />
                  </button>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                {activeGroup && (
                  <span className="text-sm bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded">
                    Group: {pageGroups[activeGroup]?.name}
                  </span>
                )}

                {currentEditingPage && (
                  <span className="text-sm bg-yellow-100 dark:bg-yellow-900 px-2 py-1 rounded">
                    Editing: {currentEditingPage.name}
                  </span>
                )}

                <button
                  onClick={handleCreatePage}
                  className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center"
                  title="Save Page (Ctrl+S)"
                >
                  <Save size={16} className="mr-1" />
                  {currentEditingPage ? 'Update' : 'Save'} Page
                </button>
              </div>
            </div>

            {/* Text editor */}
            <div className="flex-1 p-4 overflow-auto">
              <textarea
                ref={editorRef}
                value={content}
                onChange={handleContentChange} // Use the new handler
                placeholder={currentEditingPage
                  ? `Editing ${currentEditingPage.name}...`
                  : "Start typing or paste your text here... Pages will be created automatically."
                }
                className="w-full h-full p-4 border rounded resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 
    dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                style={{
                  fontFamily: pageSettings.fontFamily,
                  fontSize: `${pageSettings.fontSize}px`,
                  lineHeight: pageSettings.lineHeight,
                  textAlign: pageSettings.textAlign
                }}
              />
            </div>

            {/* Status bar */}
            <div className="flex items-center justify-between px-4 py-2 border-t text-sm text-gray-600 
              dark:border-gray-700 dark:text-gray-400">
              <div>
                Words: {content.split(/\s+/).filter(w => w).length} |
                Characters: {content.length} |
                Lines: {content.split('\n').length} / {calculateLinesPerPage()}
              </div>

              <div className="flex items-center space-x-2">
                {selectedPages.length > 0 && (
                  <>
                    <button
                      onClick={() => setShowGroupDialog(true)}
                      className="px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 flex items-center"
                      title="Create Group (Ctrl+G)"
                    >
                      <FolderPlus size={14} className="mr-1" />
                      Group {selectedPages.length} Pages
                    </button>

                    <button
                      onClick={() => handleExportToMediaPanel(
                        pageCollection.filter(p => selectedPages.includes(p.id))
                      )}
                      className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center"
                      title="Export selected pages to media panel"
                    >
                      <Layers size={14} className="mr-1" />
                      To Media Panel
                    </button>

                    <button
                      onClick={() => handleExportToGrid(
                        pageCollection.filter(p => selectedPages.includes(p.id))
                      )}
                      className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 flex items-center"
                      title="Export selected pages directly to grid"
                    >
                      <Grid size={14} className="mr-1" />
                      To Grid
                    </button>
                  </>
                )}

                <button
                  onClick={() => handleExportToMediaPanel()}
                  className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center"
                  title="Export all pages to media panel"
                  disabled={pageCollection.length === 0}
                >
                  <Layers size={14} className="mr-1" />
                  All to Media Panel
                </button>

                <button
                  onClick={() => handleExportToGrid()}
                  className="px-3 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700 flex items-center"
                  title="Export all pages to grid (Ctrl+E)"
                  disabled={pageCollection.length === 0}
                >
                  <Grid size={14} className="mr-1" />
                  All to Grid
                </button>
              </div>
            </div>
          </div>

          {/* Page collection panel */}
          <div className="w-96 border-l flex flex-col dark:border-gray-700">
            <div className="p-2 border-b flex items-center justify-between dark:border-gray-700">
              <h3 className="font-medium dark:text-white">Page Collection</h3>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setSelectedPages(
                    selectedPages.length === pageCollection.length ? [] : pageCollection.map(p => p.id)
                  )}
                  className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                  title="Select All"
                >
                  {selectedPages.length === pageCollection.length ?
                    <CheckSquare size={16} className="dark:text-gray-300" /> :
                    <Square size={16} className="dark:text-gray-300" />
                  }
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto bg-gray-50 dark:bg-gray-900 p-2">
              {pageCollection.length === 0 ? (
                <div className="text-center text-gray-500 dark:text-gray-400 mt-8">
                  <FileText size={48} className="mx-auto mb-2 opacity-20" />
                  <p>No pages created yet</p>
                  <p className="text-sm mt-2">Start typing and save pages</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Ungrouped pages */}
                  {groupedPages.ungrouped && groupedPages.ungrouped.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-2 dark:text-gray-300">
                        Ungrouped Pages ({groupedPages.ungrouped.length})
                      </h4>
                      <div className={`grid gap-2 ${previewMode === 'grid' ? 'grid-cols-2' : 'grid-cols-1'}`}>
                        {groupedPages.ungrouped.map(page => (
                          <PagePreviewCard
                            key={page.id}
                            page={page}
                            isSelected={selectedPages.includes(page.id)}
                            isEditing={currentEditingPage?.id === page.id}
                            previewMode={previewMode}
                            canvasRef={(ref) => pagePreviewRefs.current[page.id] = ref}
                            onSelect={() => handleSelectPage(page)}
                            onToggleSelection={() => togglePageSelection(page.id)}
                            onDelete={() => handleDeletePage(page.id)}
                            onDuplicate={() => handleDuplicatePage(page)}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Grouped pages */}
                  {Object.entries(pageGroups).map(([groupId, group]) => (
                    <div key={groupId} className="border rounded p-2 dark:border-gray-700">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-medium dark:text-gray-300">
                          {group.name} ({groupedPages[groupId]?.length || 0})
                        </h4>

                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => setActiveGroup(groupId === activeGroup ? null : groupId)}
                            className={`p-1 rounded text-xs ${activeGroup === groupId ?
                                'bg-blue-600 text-white' :
                                'hover:bg-gray-100 dark:hover:bg-gray-700'
                              }`}
                            title="Set as active group"
                          >
                            Active
                          </button>

                          <button
                            onClick={() => handleExportGroup(groupId)}
                            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                            title="Export group to grid"
                          >
                            <Grid size={14} className="dark:text-gray-300" />
                          </button>
                        </div>
                      </div>

                      {groupedPages[groupId] && (
                        <div className={`grid gap-2 ${previewMode === 'grid' ? 'grid-cols-2' : 'grid-cols-1'}`}>
                          {groupedPages[groupId].map(page => (
                            <PagePreviewCard
                              key={page.id}
                              page={page}
                              isSelected={selectedPages.includes(page.id)}
                              isEditing={currentEditingPage?.id === page.id}
                              previewMode={previewMode}
                              canvasRef={(ref) => pagePreviewRefs.current[page.id] = ref}
                              onSelect={() => handleSelectPage(page)}
                              onToggleSelection={() => togglePageSelection(page.id)}
                              onDelete={() => handleDeletePage(page.id)}
                              onDuplicate={() => handleDuplicatePage(page)}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Settings panel */}
          {showSettings && (
            <div className="w-80 border-l p-4 overflow-auto dark:border-gray-700">
              <h3 className="font-medium mb-4 dark:text-white">Page Settings</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1 dark:text-gray-300">Page Size</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      value={pageSettings.width}
                      onChange={(e) => setPageSettings({ ...pageSettings, width: parseInt(e.target.value) || 400 })}
                      className="px-2 py-1 rounded border text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      placeholder="Width"
                    />
                    <input
                      type="number"
                      value={pageSettings.height}
                      onChange={(e) => setPageSettings({ ...pageSettings, height: parseInt(e.target.value) || 600 })}
                      className="px-2 py-1 rounded border text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      placeholder="Height"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1 dark:text-gray-300">Padding</label>
                  <input
                    type="number"
                    value={pageSettings.padding}
                    onChange={(e) => setPageSettings({ ...pageSettings, padding: parseInt(e.target.value) || 20 })}
                    className="w-full px-2 py-1 rounded border text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1 dark:text-gray-300">Line Height</label>
                  <input
                    type="range"
                    value={pageSettings.lineHeight}
                    onChange={(e) => setPageSettings({ ...pageSettings, lineHeight: parseFloat(e.target.value) })}
                    className="w-full"
                    min="1"
                    max="3"
                    step="0.1"
                  />
                  <span className="text-xs dark:text-gray-400">{pageSettings.lineHeight}</span>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1 dark:text-gray-300">Colors</label>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs dark:text-gray-400">Text</label>
                      <input
                        type="color"
                        value={pageSettings.textColor}
                        onChange={(e) => setPageSettings({ ...pageSettings, textColor: e.target.value })}
                        className="w-full h-8 rounded cursor-pointer"
                      />
                    </div>
                    <div>
                      <label className="text-xs dark:text-gray-400">Background</label>
                      <input
                        type="color"
                        value={pageSettings.backgroundColor}
                        onChange={(e) => setPageSettings({ ...pageSettings, backgroundColor: e.target.value })}
                        className="w-full h-8 rounded cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                {/* Templates */}
                <div>
                  <label className="block text-sm font-medium mb-1 dark:text-gray-300">Templates</label>
                  <select
                    onChange={(e) => {
                      const templates = {
                        book: { width: 400, height: 600, padding: 50, fontSize: 16, lineHeight: 1.8 },
                        letter: { width: 816, height: 1056, padding: 72, fontSize: 12, lineHeight: 1.5 },
                        card: { width: 500, height: 350, padding: 30, fontSize: 14, lineHeight: 1.4 },
                        pocketbook: { width: 320, height: 480, padding: 40, fontSize: 14, lineHeight: 1.6 }
                      };
                      if (templates[e.target.value]) {
                        setPageSettings({ ...pageSettings, ...templates[e.target.value] });
                      }
                    }}
                    className="w-full px-2 py-1 rounded border text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  >
                    <option value="">Select template...</option>
                    <option value="book">Book Page (400x600)</option>
                    <option value="pocketbook">Pocket Book (320x480)</option>
                    <option value="letter">Letter (8.5x11")</option>
                    <option value="card">Card (5x3.5")</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Group creation dialog */}
        {showGroupDialog && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 w-96">
              <h3 className="text-lg font-medium mb-4 dark:text-white">Create Page Group</h3>

              <input
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Enter group name..."
                className="w-full px-3 py-2 border rounded mb-4 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                autoFocus
              />

              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                {selectedPages.length} pages will be added to this group
              </p>

              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => {
                    setShowGroupDialog(false);
                    setGroupName('');
                  }}
                  className="px-4 py-2 border rounded hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateGroup}
                  className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
                  disabled={!groupName.trim()}
                >
                  Create Group
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Page preview card component
const PagePreviewCard = ({
  page,
  isSelected,
  isEditing,
  previewMode,
  canvasRef,
  onSelect,
  onToggleSelection,
  onDelete,
  onDuplicate
}) => {
  return (
    <div
      className={`relative border rounded p-2 cursor-pointer transition-all
        ${isSelected ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'}
        ${isEditing ? 'ring-2 ring-yellow-500' : ''}
        ${previewMode === 'grid' ? 'h-48' : 'h-32'}
      `}
      onClick={onSelect}
    >
      {/* Selection checkbox */}
      <div
        className="absolute top-1 left-1 z-10"
        onClick={(e) => {
          e.stopPropagation();
          onToggleSelection();
        }}
      >
        {isSelected ?
          <CheckSquare size={16} className="text-blue-600" /> :
          <Square size={16} className="text-gray-400 hover:text-gray-600" />
        }
      </div>

      {/* Page actions */}
      <div className="absolute top-1 right-1 flex space-x-1 opacity-0 hover:opacity-100 transition-opacity z-10">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDuplicate();
          }}
          className="p-1 bg-white dark:bg-gray-700 rounded shadow hover:bg-gray-100 dark:hover:bg-gray-600"
          title="Duplicate"
        >
          <Copy size={12} />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (window.confirm('Delete this page?')) {
              onDelete();
            }
          }}
          className="p-1 bg-white dark:bg-gray-700 rounded shadow hover:bg-red-100 dark:hover:bg-red-900"
          title="Delete"
        >
          <Trash2 size={12} className="text-red-600" />
        </button>
      </div>

      {/* Page info */}
      <div className="text-xs font-medium mb-1 pl-5 dark:text-gray-300">
        {page.name}
        {isEditing && <span className="ml-1 text-yellow-600">(Editing)</span>}
      </div>

      {/* Preview canvas or text */}
      {previewMode === 'single' ? (
        <div className="text-xs text-gray-600 dark:text-gray-400 pl-5">
          {page.textContent ?
            page.textContent.substring(0, 100) + (page.textContent.length > 100 ? '...' : '') :
            'Empty page'
          }
        </div>
      ) : (
        <canvas
          ref={canvasRef}
          className="w-full h-full object-contain rounded"
          style={{ maxHeight: previewMode === 'grid' ? '150px' : '80px' }}
        />
      )}
    </div>
  );
};

export default TextPageCreator;