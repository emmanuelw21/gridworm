import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useAtom } from 'jotai';
import {
  Sliders, X, Upload, FolderOpen, Save, Download,
  Book, RefreshCw, Archive, Image as ImageIconLucide,
  Video as VideoIconLucide, Music as MusicIconLucide, Edit, Eye, EyeOff, Terminal,
  Repeat, Repeat1, ListTree, AlertTriangle, Copy, MoveHorizontal, Target, Trash2, Dice5,
  CheckSquare, Square, FileX, MousePointer2 as MousePointer2Icon,
  Columns, Rows, Maximize, Minimize, Grid, Move, Filter, FileText, Search,
  SortDesc, SortAsc, LayoutGrid, ListMinus, List, ZoomIn, ZoomOut,
  AlignHorizontalJustifyStart, AlignHorizontalJustifyCenter, AlignHorizontalJustifyEnd,
  AlignVerticalJustifyStart, AlignVerticalJustifyCenter, AlignVerticalJustifyEnd,
  AlignHorizontalDistributeCenter, AlignVerticalDistributeCenter,
  Ruler, ChevronLeft, ChevronRight, Pin, PinOff, Layers, SlidersHorizontal,
  Box, Pencil, Type, Eraser, RotateCw, MousePointer
} from 'lucide-react';

// Import components with correct paths
import MediaPanel from './components/Panels/MediaPanel.jsx';
import { enhancedThumbnailManager } from './utils/enhancedThumbnailManager';

import GridBuilderPanel from './components/Panels/GridBuilderPanel.jsx';
import ConsolePanel from './components/Panels/ConsolePanel.jsx';
import FreeGridCanvas from './components/FreeGrid/FreeGridCanvas.jsx';
import { ThreeDGrid, is3D } from './components/ThreeDGrid';
import { MediaFile } from './components/MediaGrid/MediaModel.js';
import ThreeDViewportPanel from './components/ThreeDViewport/ThreeDViewportPanel.jsx';
import AnimatedBookViewer from './components/BookViewer/AnimatedBookViewer.jsx';
import Book3DViewerPanel from './components/BookViewer/Book3DViewerPanel.jsx';

// Import Dialog Components
import ExportDialog from './components/Dialogs/ExportDialog.jsx';
import UpdateIndexDialog from './components/Dialogs/UpdateIndexDialog.jsx';
import MediaNameEditDialog from './components/Dialogs/MediaNameEditDialog.jsx';
import JsonEditorDialog from './components/Dialogs/JsonEditorDialog.jsx';
import SaveProjectDialog from './components/Dialogs/SaveProjectDialog.jsx';
import LoadProjectDialog from './components/Dialogs/LoadProjectDialog.jsx';
import RemoveMediaDialog from './components/Dialogs/RemoveMediaDialog.jsx';
import FileOperationsExportDialog from './components/Dialogs/FileOperationsExportDialog.jsx';
import DropdownMenu, { DropdownItem } from './components/UI/DropDownMenu.jsx';
import Bookshelf from './components/Bookshelf/Bookshelf.jsx';



// Import MediaGrid components
import EnlargedPreviewModal from './components/MediaGrid/EnlargedPreviewModal.jsx';

// Import helpers
import {
  getFilename, formatFileSize,
  processFile, getFileExtension, getFileTypeCategory,
  isVideo, isImage, isAudio
} from './components/MediaGrid/helpers.js';

// Import centralized store
import {
  mediaFilesAtom, gridSlotsAtom, freeGridItemsAtom, selectedMediaItemsAtom,
  selectedGridIndexAtom, selectedFreeGridIdsAtom, darkModeAtom, showVideoThumbnailsAtom,
  activeViewAtom, showBook3DViewerAtom, showBookshelfAtom, showEnlargedPreviewAtom,
  enlargedPreviewIndexAtom, showMediaPanelAtom, showLayerPanelAtom, showConsolePanelAtom,
  showIndexPanelAtom, showThreeDPanelAtom, showThreeDViewportAtom, showBook3DViewerPanelAtom,
  showRemoveMediaDialogAtom, showJsonEditorAtom, showEditingThumbAtom, isThumbnailPickerOpenAtom,
  showLoadProjectDialogAtom, showSaveProjectDialogAtom, showPageMappingDialogAtom,
  showJsonEditorDialogAtom, showFileOperationsDialogAtom, bookVolumeMetadataAtom,
  atomPagesAtom, three3DBooksAtom, showPageMappingAtom, showUpdateIndexAtom,
  isEditingCanvasAtom, selectedToolAtom, selectedShapeToolAtom, vectorShapesAtom,
  vectorPathsAtom, vectorTextAtom, selectedVectorIdsAtom, isVectorToolActiveAtom,
  activeTextPageIdAtom, searchTermAtom, selectedFileTypesAtom, showRecentlyAddedOnlyAtom,
  recentlyAddedIdsAtom, fileMetadataAtom, jsonDataAtom, allIndexDataAtom,
  filteredMediaFilesAtom, mediaStatsAtom
} from './store.js';

// Import enhanced storage and utilities
import { useProjectStorage } from './hooks/useProjectStorage';
import { applyBookLayout } from './utils/bookshelfHelpers';
import { migrateFromLocalStorage } from './utils/storageMigration';

const LOCAL_STORAGE_KEY = 'gridworm_saved_projects';

const EnhancedMediaGridApp = ({ darkMode: darkModeProp, setDarkMode: setDarkModeProp }) => {
  // Core state from atoms
  const [mediaFiles, setMediaFiles] = useAtom(mediaFilesAtom);
  const [filteredMediaFiles, setFilteredMediaFiles] = useState([]);
  const [gridSlots, setGridSlots] = useAtom(gridSlotsAtom);
  const [selectedMediaItems, setSelectedMediaItems] = useAtom(selectedMediaItemsAtom);
  const [selectedGridIndex, setSelectedGridIndex] = useAtom(selectedGridIndexAtom);

  // Use prop darkMode if provided, otherwise use atom
  const [atomDarkMode, setAtomDarkMode] = useAtom(darkModeAtom);
  const darkMode = darkModeProp !== undefined ? darkModeProp : atomDarkMode;

  // Add a ref to track if we're currently loading a project
  const isLoadingProjectRef = useRef(false);

  // Modified handler to prevent loops
  const handleDarkModeChange = useCallback((newValue) => {
    // Don't update if we're in the middle of loading a project
    if (isLoadingProjectRef.current) return;

    if (setDarkModeProp) {
      setDarkModeProp(newValue);
    } else {
      setAtomDarkMode(newValue);
    }
  }, [setDarkModeProp, setAtomDarkMode]);

  const [freeGridItems, setFreeGridItems] = useAtom(freeGridItemsAtom);
  const [freeGridMode, setFreeGridMode] = useState(false);
  const [is3DMode, setIs3DMode] = useState(false);
  const [showThumbnailPicker, setShowThumbnailPicker] = useAtom(isThumbnailPickerOpenAtom);
  const [thumbnailPickerMedia, setThumbnailPickerMedia] = useState(null);
  const [show3DPanel, setShow3DPanel] = useAtom(showThreeDPanelAtom);
  const [threeDPanelWidth, setThreeDPanelWidth] = useState(400);
  const [isResizing3DPanel, setIsResizing3DPanel] = useState(false);
  const [showAutoArrange, setShowAutoArrange] = useState(false);
  const [pageDataArray, setPageDataArray] = useState([]);
  const [showBookshelf, setShowBookshelf] = useAtom(showBookshelfAtom);


  const [show3DViewport, setShow3DViewport] = useAtom(showThreeDViewportAtom);
  const [threeDViewportWidth, setThreeDViewportWidth] = useState(400);
  const [isResizing3DViewport, setIsResizing3DViewport] = useState(false);

  // Book-related state
  const [showBookViewer, setShowBookViewer] = useState(false);
  const [showBook3DViewer, setShowBook3DViewer] = useAtom(showBook3DViewerAtom);
  const [bookMode, setBookMode] = useState(false);
  const [pageMapping, setPageMapping] = useState(null);
  const [bookPages, setBookPages] = useState([]);
  const [currentBookPage, setCurrentBookPage] = useState(0);
  const [bookVolumeMetadata, setBookVolumeMetadata] = useAtom(bookVolumeMetadataAtom);
  const [atomPages, setAtomPages] = useAtom(atomPagesAtom);

  // UI state
  const [hoveredItem, setHoveredItem] = useState(null);
  const [showControls, setShowControls] = useState(false);
  // const [showIndexPanel, setShowIndexPanel] = useState(false);
  const [showConsolePanel, setShowConsolePanel] = useAtom(showConsolePanelAtom);
  const [showEnlargedPreview, setShowEnlargedPreview] = useAtom(showEnlargedPreviewAtom);
  const [previewMedia, setPreviewMedia] = useState(null);
  const [previewMode, setPreviewMode] = useState('off'); // 'off', 'hover', 'always'
  const [modalMediaList, setModalMediaList] = useState([]);
  const [onPageMappingConfirm, setOnPageMappingConfirm] = useState(null);

  // Grid configuration
  const [gridConfig, setGridConfig] = useState({
    columns: 4,
    rows: 5,
    cellWidth: 160,
    cellHeight: 120,
    cellSize: 10 // For 3D grid
  });
  const [gridHasOverflow, setGridHasOverflow] = useState(false);
  const [allowDuplicates, setAllowDuplicates] = useState(false);
  const [markSelection, setMarkSelection] = useState(false);
  const [repeatGridPlaylist, setRepeatGridPlaylist] = useState(false);
  const [allowNudging, setAllowNudging] = useState(false);

  // Panel layout state
  const [mediaPanelLayout, setMediaPanelLayout] = useState({ columns: 1, width: 280 });
  const [mediaPanelCollapsed, setMediaPanelCollapsed] = useState(false);
  const [mediaPanelPinned, setMediaPanelPinned] = useState(false);
  const [thumbnailSize, setThumbnailSize] = useState('l'); // 's', 'm', 'l'
  // const [indexPanelWidth, setIndexPanelWidth] = useState(300);
  const [consolePanelWidth, setConsolePanelWidth] = useState(350);

  // New state for media panel hover
  const [mediaPanelHovered, setMediaPanelHovered] = useState(false);
  const mediaPanelTimeoutRef = useRef(null);

  // Dialog and editing state
  const [editingMediaName, setEditingMediaName] = useState(null);
  const [editedMediaNameValue, setEditedMediaNameValue] = useState("");
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showUpdateIndexDialog, setShowUpdateIndexDialog] = useState(false);
  const [showJsonEditor, setShowJsonEditor] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showLoadDialog, setShowLoadDialog] = useState(false);
  const [showFileOperationsDialog, setShowFileOperationsDialog] = useState(false);

  // Data management state
  const [exportData, setExportData] = useState({
    title: "",
    author: "Emmanuel Whyte",
    description: "",
    slot: "",
    frontCover: "",
    backCover: "",
    jsonPath: ""
  });
  const [updateIndexData, setUpdateIndexData] = useState({
    title: "",
    author: "Emmanuel Whyte",
    description: "",
    slot: "",
    frontCover: "",
    backCover: "",
    jsonPath: "",
    indexPath: "/index.json"
  });
  const [jsonTemplate, setJsonTemplate] = useState({
    "title": "Media Collection",
    "author": "User",
    "dateCreated": new Date().toISOString().split('T')[0],
    "items": []
  });
  const [jsonTemplatePresets, setJsonTemplatePresets] = useState([
    {
      name: "default",
      template: {
        "title": "Media Collection",
        "author": "User",
        "dateCreated": new Date().toISOString().split('T')[0],
        "items": []
      }
    },
    {
      name: "detailed",
      template: {
        "collection": {
          "title": "Media Collection",
          "author": "User",
          "dateCreated": new Date().toISOString().split('T')[0],
          "description": "",
          "items": [],
          "metadata": {
            "totalItems": 0,
            "totalSize": "0 KB",
            "categories": []
          }
        }
      }
    },
    {
      name: "minimal",
      template: { "items": [] }
    }
  ]);

  // Index and project state
  const [indexData, setIndexData] = useState([]);
  const [editingIndex, setEditingIndex] = useState(false);
  const [editedIndexJson, setEditedIndexJson] = useState('');
  // savedProjects now comes from useProjectStorage hook
  const [projectName, setProjectName] = useState('');
  const [commandHistory, setCommandHistory] = useState([]);

  // Selection and filtering state  
  const [lastSelectedIndex, setLastSelectedIndex] = useState(null);
  const [searchTerm, setSearchTerm] = useAtom(searchTermAtom);
  const [showFilters, setShowFilters] = useState(false);
  const [fileTypeFilters, setFileTypeFilters] = useState({
    jpg: true, jpeg: true, png: true, gif: true, webp: true, svg: true,
    mp4: true, webm: true, mov: true, avi: true, mkv: true,
    mp3: true, wav: true, ogg: true, flac: true,
    gltf: true, glb: true, obj: true, fbx: true, stl: true, ply: true, '3ds': true, dae: true
  });
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });

  // Resizing state
  const [isResizingMediaPanel, setIsResizingMediaPanel] = useState(false);
  // const [isResizingIndexPanel, setIsResizingIndexPanel] = useState(false);
  const [isResizingConsolePanel, setIsResizingConsolePanel] = useState(false);

  // Enhanced storage hook
  const {
    saveProject: saveProjectToDB,
    loadProject: loadProjectFromDB,
    deleteProject: deleteProjectFromDB,
    projects: savedProjects
  } = useProjectStorage();

  // Refs
  const fileInputRef = useRef(null);
  const folderInputRef = useRef(null);
  const indexFileInputRef = useRef(null);

  // Initialize database migration
  useEffect(() => {
    const initializeDatabase = async () => {
      try {
        await migrateFromLocalStorage();
        console.log('Database migration completed');
      } catch (error) {
        console.error('Database migration failed:', error);
      }
    };

    initializeDatabase();
  }, []);

  // Auto-generate book pages function
  const generateDefaultBook = useCallback(() => {
    const sourceItems = freeGridMode
      ? Object.values(freeGridItems).map(item => {
        return mediaFiles.find(m => m.id === item.mediaId);
      }).filter(Boolean)
      : gridSlots.filter(Boolean);

    // If no media items, create a default book with gridworm logos
    if (sourceItems.length === 0) {
      return [
        { front: 'gridworm-cover', back: 'blank' },
        { front: 'gridworm-01.png', back: 'gridworm-02.png' },
        { front: 'blank', back: 'gridworm-back' }
      ];
    }

    // Auto-generate pages from available media
    const pages = [];

    // Add cover page
    pages.push({
      front: 'cover',
      back: sourceItems[0] ? sourceItems[0].name : 'blank'
    });

    // Add content pages (2 items per page)
    for (let i = 1; i < sourceItems.length; i += 2) {
      const frontItem = sourceItems[i];
      const backItem = sourceItems[i + 1];

      pages.push({
        front: frontItem ? frontItem.name : 'blank',
        back: backItem ? backItem.name : 'blank'
      });
    }

    // Add back cover
    pages.push({
      front: 'blank',
      back: 'back-cover'
    });

    return pages;
  }, [freeGridMode, freeGridItems, mediaFiles, gridSlots]);

  // Generate book from current mapping or auto-generate
  const generateBookPages = useCallback(() => {
    if (pageMapping) {
      // Use custom mapping
      const pages = [];
      const sourceItems = freeGridMode
        ? Object.values(freeGridItems).map(item => {
          return mediaFiles.find(m => m.id === item.mediaId);
        }).filter(Boolean)
        : gridSlots.filter(Boolean);

      pageMapping.forEach((mapping) => {
        const frontItem = mapping.front !== null ? sourceItems[mapping.front] : null;
        const backItem = mapping.back !== null ? sourceItems[mapping.back] : null;

        pages.push({
          front: frontItem ? frontItem.name : 'blank',
          back: backItem ? backItem.name : 'blank'
        });
      });

      return pages;
    } else {
      // Auto-generate default book
      return generateDefaultBook();
    }
  }, [pageMapping, generateDefaultBook]);

  // Always ensure we have book pages
  const ensureBookPages = useCallback(() => {
    const pages = generateBookPages();
    setBookPages(pages);
    return pages;
  }, [generateBookPages]);

  // Handle page mapping confirmation
  const handlePageMappingConfirm = (mapping, metadata) => {
    setPageMapping(mapping);
    if (metadata) {
      setBookVolumeMetadata(metadata);
    }

    // Generate pages from mapping
    const pages = generateBookPages();
    setBookPages(pages);

    // Enable book mode
    setBookMode(true);
    console.log('Book mode enabled with', pages.length, 'pages');
  };

  // Export book function
  const handleExportToBook = () => {
    const pages = ensureBookPages();

    const bookData = {
      title: bookVolumeMetadata.title || "Grid Book",
      author: bookVolumeMetadata.author || "Gridworm User",
      description: bookVolumeMetadata.description || "Generated from grid content",
      pages: pages,
      volumeMetadata: bookVolumeMetadata,
      metadata: {
        created: new Date().toISOString(),
        gridConfig: gridConfig,
        pageMapping: pageMapping,
        sourceType: freeGridMode ? 'freegrid' : 'standard',
        totalItems: freeGridMode ? Object.keys(freeGridItems).length : gridSlots.filter(Boolean).length,
        autoGenerated: !pageMapping
      }
    };

    // Download as JSON
    const blob = new Blob([JSON.stringify(bookData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${bookData.title.replace(/\s+/g, '-').toLowerCase()}-book.json`;
    a.click();
    URL.revokeObjectURL(url);

    console.log('Book exported:', bookData.title);
  };

  // Open book viewer (always works now)
  const openBookViewer = () => {
    const pages = ensureBookPages();
    if (pages.length === 0) {
      // Fallback to absolute minimum
      setBookPages([
        { front: 'cover', back: 'blank' },
        { front: 'gridworm-01.png', back: 'gridworm-02.png' },
        { front: 'blank', back: 'back-cover' }
      ]);
    }
    setShowBookViewer(true);
  };

  const handleBookModeToggle = () => {
    setBookMode(!bookMode);
    if (!bookMode) {
      ensureBookPages();
    }
  };

  // Cleanup function
  const cleanupMediaResource = useCallback((mediaItem, shouldRevokeUrl = false) => {
    if (!mediaItem) return;
    const itemUrl = mediaItem.url;
    const itemName = mediaItem.name;

    if (mediaItem.releaseUrl && typeof mediaItem.releaseUrl === 'function') {
      try {
        mediaItem.releaseUrl();
      } catch (error) {
        console.warn(`Error in mediaItem.releaseUrl() for ${itemName}:`, error);
      }
    } else if (shouldRevokeUrl && itemUrl && typeof itemUrl === 'string' && itemUrl.startsWith('blob:')) {
      try {
        URL.revokeObjectURL(itemUrl);
      } catch (error) {
        console.warn(`Error revoking object URL for ${itemName} (fallback):`, error);
      }
    }
  }, []);

  // Command history management
  const addCommandToHistory = (type, commands, platform = null) => {
    setCommandHistory(prevHistory => [
      {
        id: self.crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        type,
        commands,
        platform
      },
      ...prevHistory
    ].slice(0, 50));
  };

  const clearCommandHistory = () => setCommandHistory([]);

  // Toggle functions
  const handleToggleAllowDuplicates = () => setAllowDuplicates(prev => !prev);
  const handleToggleAllowNudging = () => setAllowNudging(prev => !prev);
  const handleToggleMarkSelection = () => setMarkSelection(prev => !prev);
  const handleToggleRepeatGridPlaylist = () => setRepeatGridPlaylist(prev => !prev);
  const handleToggleFreeGridMode = () => {
    setFreeGridMode(prev => !prev);
    setIs3DMode(false); // Turn off 3D when switching to free grid
  };
  const handleToggle3DMode = () => {
    setIs3DMode(prev => !prev);
    setFreeGridMode(false); // Turn off free grid when switching to 3D
  };

  // Check if current media can be displayed in 3D
  const has3DContent = useMemo(() => {
    return mediaFiles.some(file => is3D(file.type));
  }, [mediaFiles]);

  // Grid management functions
  const handleClearGrid = () => {
    if (window.confirm("Are you sure you want to clear the entire grid? This action cannot be undone.")) {
      const newGridSize = gridConfig.columns * gridConfig.rows;
      setGridSlots(Array(Math.max(newGridSize, 20)).fill(null));
      setFreeGridItems({});
    }
  };

  const handleAddRandomMedia = () => {
    const availableMedia = mediaFiles.filter(mf => !mf.isMissing && !mf.isPlaceholder);
    if (availableMedia.length === 0) {
      alert("No media files available to add to the grid. Please upload some files first.");
      return;
    }

    if (freeGridMode || is3DMode) {
      // Add random items to free grid or 3D grid
      const numItems = Math.min(5, availableMedia.length);
      const newItems = {};

      for (let i = 0; i < numItems; i++) {
        const randomIndex = Math.floor(Math.random() * availableMedia.length);
        const media = availableMedia[randomIndex];

        if (!allowDuplicates && Object.values(freeGridItems).some(item => item.mediaId === media.id)) {
          continue;
        }

        const itemId = `random-${Date.now()}-${i}`;
        newItems[itemId] = {
          mediaId: media.id,
          x: Math.random() * 600 + 50,
          y: Math.random() * 400 + 50,
          z: is3DMode ? Math.random() * 200 - 100 : 0,
          width: gridConfig.cellWidth,
          height: gridConfig.cellHeight,
          rotation: 0,
          zIndex: Object.keys(freeGridItems).length + i + 1,
          transform: is3DMode ? {
            x: Math.random() * 20 - 10,
            y: Math.random() * 20 - 10,
            z: Math.random() * 20 - 10,
            rx: 0,
            ry: 0,
            rz: 0,
            sx: 1,
            sy: 1,
            sz: 1
          } : null
        };
      }

      setFreeGridItems(prev => ({ ...prev, ...newItems }));
    } else {
      // Original grid logic
      const newGrid = [...gridSlots];
      const totalVisibleSlots = gridConfig.columns * gridConfig.rows;
      let changed = false;

      for (let i = 0; i < totalVisibleSlots; i++) {
        if (newGrid[i] === null) {
          const randomIndex = Math.floor(Math.random() * availableMedia.length);

          if (!allowDuplicates) {
            if (newGrid.some(slot => slot && slot.id === availableMedia[randomIndex].id)) {
              let attempts = 0;
              let uniqueFound = false;

              while (attempts < 5 && !uniqueFound) {
                const nextRandomIndex = Math.floor(Math.random() * availableMedia.length);
                if (!newGrid.some(slot => slot && slot.id === availableMedia[nextRandomIndex].id)) {
                  newGrid[i] = availableMedia[nextRandomIndex];
                  uniqueFound = true;
                  changed = true;
                }
                attempts++;
              }

              if (!uniqueFound) console.log("Could not find a unique random item for slot", i);
              continue;
            }
          }

          newGrid[i] = availableMedia[randomIndex];
          changed = true;
        }
      }

      if (changed) setGridSlots(newGrid);
      else alert("No empty slots to fill, or no unique media found (if duplicates are off).");
    }
  };

  // New function: Add current grid to FreeGrid
  const handleAddGridToFreeGrid = () => {
    if (!freeGridMode) {
      alert("Please switch to Free Grid mode first.");
      return;
    }

    const newItems = {};
    let addedCount = 0;

    // Calculate starting position to center the grid
    const startX = 100;
    const startY = 100;
    const spacing = 10;

    gridSlots.forEach((slot, index) => {
      if (slot) {
        const row = Math.floor(index / gridConfig.columns);
        const col = index % gridConfig.columns;

        const itemId = `grid-import-${Date.now()}-${index}`;
        newItems[itemId] = {
          mediaId: slot.id,
          x: startX + col * (gridConfig.cellWidth + spacing),
          y: startY + row * (gridConfig.cellHeight + spacing),
          width: gridConfig.cellWidth,
          height: gridConfig.cellHeight,
          rotation: 0,
          zIndex: Object.keys(freeGridItems).length + addedCount + 1
        };
        addedCount++;
      }
    });

    if (addedCount === 0) {
      alert("No items in the grid to add to Free Grid.");
      return;
    }

    setFreeGridItems(prev => ({ ...prev, ...newItems }));
    alert(`Added ${addedCount} items from grid to Free Grid.`);
  };

  // New function: Send FreeGrid items to standard grid
  const handleSendToGrid = () => {
    if (freeGridMode) {
      alert("Please switch to Standard Grid mode first.");
      return;
    }

    const items = Object.values(freeGridItems);
    if (items.length === 0) {
      alert("No items in Free Grid to send to standard grid.");
      return;
    }

    // Sort items by position (top-left to bottom-right)
    const sortedItems = items.sort((a, b) => {
      const rowDiff = Math.floor(a.y / 100) - Math.floor(b.y / 100);
      if (rowDiff !== 0) return rowDiff;
      return a.x - b.x;
    });

    // Create new grid
    const newGrid = Array(gridConfig.columns * gridConfig.rows).fill(null);
    let placedCount = 0;

    sortedItems.forEach(item => {
      const media = mediaFiles.find(m => m.id === item.mediaId);
      if (media && placedCount < newGrid.length) {
        newGrid[placedCount] = media;
        placedCount++;
      }
    });

    setGridSlots(newGrid);
    alert(`Placed ${placedCount} items from Free Grid into standard grid.`);
  };

  const handleThumbnailUpdate = useCallback((mediaId, thumbnail, timestamp) => {
    setMediaFiles(prev => prev.map(media =>
      media.id === mediaId
        ? { ...media, thumbnail, thumbnailTimestamp: timestamp }
        : media
    ));
  }, []);

  // Add handler for opening thumbnail picker
  const handleOpenThumbnailPicker = useCallback((media) => {
    setThumbnailPickerMedia(media);
    setShowThumbnailPicker(true);
  }, []);

  // File handling
  const handleFilesSelected = useCallback(async (inputFiles) => {
  const newMediaObjects = Array.from(inputFiles)
    .map(rawFile => {
      try {
        const mediaFile = new MediaFile(rawFile);
        // Preserve the path if available
        if (rawFile.webkitRelativePath) {
          mediaFile.userPath = rawFile.webkitRelativePath;
        } else if (rawFile.path) {
          mediaFile.userPath = rawFile.path;
        }
        
        // Trigger thumbnail generation for videos
        const ext = mediaFile.name.split('.').pop().toLowerCase();
        if (mediaFile.type?.startsWith('video/') || ['webm', 'mp4', 'mov'].includes(ext)) {
          enhancedThumbnailManager.getOrGenerateThumbnail(mediaFile).then(thumbnailUrl => {
            if (thumbnailUrl) {
              mediaFile.thumbnail = thumbnailUrl;
              // Force re-render
              setMediaFiles(prev => [...prev]);
            }
          });
        }
        
        return mediaFile;
      } catch (e) {
        console.error('Error processing file:', e);
        return null;
      }
    })
    .filter(item => item !== null);

  if (newMediaObjects.length > 0) {
    setMediaFiles(prev => {
      const existingIds = new Set(prev.map(f => f.id));
      const trulyNewFiles = newMediaObjects.filter(nm => !existingIds.has(nm.id));
      return [...prev, ...trulyNewFiles];
    });
  }
}, [setMediaFiles]);

  const handleUploadFiles = () => fileInputRef.current.click();
  const handleUploadFolder = () => folderInputRef.current.click();

  const onFileInputChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);

      // Check if any new files match missing/placeholder files
      newFiles.forEach(newFile => {
        const placeholderFile = mediaFiles.find(f =>
          (f.isMissing || f.isPlaceholder) &&
          f.name === newFile.name &&
          f.type === newFile.type
        );

        if (placeholderFile) {
          // Replace placeholder with real file
          handleReplacePlaceholder(placeholderFile, newFile);
        } else {
          // Regular file handling
          handleFilesSelected([newFile]);
        }
      });
    }
    e.target.value = null;
  };

  const handleReplacePlaceholder = useCallback((placeholderFile, newFile) => {
    const processedNewFile = processFile(newFile);
    if (!processedNewFile) return;

    setMediaFiles(prev => prev.map(file => {
      if (file.id === placeholderFile.id) {
        // Return new file with same ID to maintain grid positions
        return {
          ...processedNewFile,
          id: file.id, // Keep same ID
          metadata: file.metadata || processedNewFile.metadata, // Preserve metadata
          isMissing: false,
          isPlaceholder: false
        };
      }
      return file;
    }));

    // Update grid slots to use the new file object
    setGridSlots(prev => prev.map(slot => {
      if (slot && slot.id === placeholderFile.id) {
        const newFileWithId = {
          ...processedNewFile,
          id: placeholderFile.id,
          metadata: placeholderFile.metadata || processedNewFile.metadata
        };
        return newFileWithId;
      }
      return slot;
    }));

    console.log(`Replaced placeholder "${placeholderFile.name}" with uploaded file`);
  }, []);

  // Media panel collapse/expand handling
  const handleMediaPanelMouseEnter = useCallback(() => {
    if (mediaPanelCollapsed && !mediaPanelPinned) {
      setMediaPanelHovered(true);
      if (mediaPanelTimeoutRef.current) {
        clearTimeout(mediaPanelTimeoutRef.current);
      }
    }
  }, [mediaPanelCollapsed, mediaPanelPinned]);

  const handleMediaPanelMouseLeave = useCallback(() => {
    if (mediaPanelCollapsed && !mediaPanelPinned) {
      mediaPanelTimeoutRef.current = setTimeout(() => {
        setMediaPanelHovered(false);
      }, 300);
    }
  }, [mediaPanelCollapsed, mediaPanelPinned]);

  const toggleMediaPanelCollapse = () => {
    setMediaPanelCollapsed(prev => !prev);
    setMediaPanelHovered(false);
  };

  const toggleMediaPanelPin = () => {
    setMediaPanelPinned(prev => !prev);
    if (!mediaPanelPinned) {
      setMediaPanelCollapsed(false);
      setMediaPanelHovered(false);
    }
  };

  // Selection management
  const selectAllMediaItems = useCallback(() => {
    const allIndicesInView = filteredMediaFiles
      .map(filteredFile => mediaFiles.findIndex(originalFile => originalFile.id === filteredFile.id))
      .filter(idx => idx !== -1);
    setSelectedMediaItems(allIndicesInView);
    setLastSelectedIndex(allIndicesInView.length > 0 ? allIndicesInView[allIndicesInView.length - 1] : null);
  }, [filteredMediaFiles, mediaFiles]);

  const deselectAllMediaItems = () => {
    setSelectedMediaItems([]);
    setLastSelectedIndex(null);
  };

  const handleMediaItemSelect = (clickedOriginalIndex, isShiftKey, isCtrlOrMetaKey) => {
    if (clickedOriginalIndex < 0 || clickedOriginalIndex >= mediaFiles.length) return;

    setSelectedMediaItems(prevSelected => {
      let newSelected = [...prevSelected];
      const itemIsCurrentlySelected = newSelected.includes(clickedOriginalIndex);

      if (isShiftKey && lastSelectedIndex !== null && lastSelectedIndex !== clickedOriginalIndex) {
        const currentFilteredMediaIds = filteredMediaFiles.map(f => f.id);
        const clickedId = mediaFiles[clickedOriginalIndex].id;
        const lastSelectedId = mediaFiles[lastSelectedIndex].id;
        const filteredIndexOfClicked = currentFilteredMediaIds.indexOf(clickedId);
        const filteredIndexOfLastSelected = currentFilteredMediaIds.indexOf(lastSelectedId);

        if (filteredIndexOfClicked !== -1 && filteredIndexOfLastSelected !== -1) {
          const startRangeInFiltered = Math.min(filteredIndexOfClicked, filteredIndexOfLastSelected);
          const endRangeInFiltered = Math.max(filteredIndexOfClicked, filteredIndexOfLastSelected);
          const idsToSelectInRange = currentFilteredMediaIds.slice(startRangeInFiltered, endRangeInFiltered + 1);
          const originalIndicesToSelect = idsToSelectInRange
            .map(id => mediaFiles.findIndex(mf => mf.id === id))
            .filter(idx => idx !== -1);
          newSelected = Array.from(new Set([...newSelected, ...originalIndicesToSelect]));
        } else {
          if (!itemIsCurrentlySelected) {
            newSelected.push(clickedOriginalIndex);
          }
        }
      } else {
        if (itemIsCurrentlySelected) {
          if (isCtrlOrMetaKey) {
            newSelected = newSelected.filter(i => i !== clickedOriginalIndex);
          } else {
            newSelected = [clickedOriginalIndex];
          }
        } else {
          if (isCtrlOrMetaKey) {
            newSelected.push(clickedOriginalIndex);
          } else {
            newSelected = [clickedOriginalIndex];
          }
        }
      }
      return newSelected;
    });
    setLastSelectedIndex(clickedOriginalIndex);
  };

  // Filtering and sorting
  useEffect(() => {
    let result = [...mediaFiles];

    if (showFilters) {
      result = result.filter(media => {
        const extension = getFileExtension(media.name);
        return fileTypeFilters[extension.toLowerCase()] === true;
      });
    }

    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase();
      result = result.filter(media =>
        media.name.toLowerCase().includes(term) ||
        (media.metadata?.title && media.metadata.title.toLowerCase().includes(term)) ||
        (media.metadata?.tags && Array.isArray(media.metadata.tags) &&
          media.metadata.tags.some(tag => tag.toLowerCase().includes(term)))
      );
    }

    result.sort((a, b) => {
      let comparison = 0;
      const valA = a[sortConfig.key];
      const valB = b[sortConfig.key];

      if (sortConfig.key === 'name' || sortConfig.key === 'type') {
        comparison = String(valA).localeCompare(String(valB));
      } else if (sortConfig.key === 'date') {
        comparison = new Date(valB) - new Date(valA);
      } else if (sortConfig.key === 'size') {
        const parseSize = (sizeStr) => {
          if (!sizeStr || typeof sizeStr !== 'string') return 0;
          const num = parseFloat(sizeStr);
          if (sizeStr.toLowerCase().includes('gb')) return num * 1024 * 1024 * 1024;
          if (sizeStr.toLowerCase().includes('mb')) return num * 1024 * 1024;
          if (sizeStr.toLowerCase().includes('kb')) return num * 1024;
          return num;
        };
        comparison = parseSize(a.size) - parseSize(b.size);
      }

      return sortConfig.direction === 'asc' ? comparison : -comparison;
    });

    setFilteredMediaFiles(result);
  }, [mediaFiles, searchTerm, fileTypeFilters, sortConfig, showFilters]);

  const handleSort = (key) => {
    setSortConfig(prevSort => {
      if (prevSort.key === key) {
        return { ...prevSort, direction: prevSort.direction === 'asc' ? 'desc' : 'asc' };
      }
      let newDirection = 'asc';
      if (key === 'date' || key === 'size') newDirection = 'desc';
      return { key, direction: newDirection };
    });
  };

  const toggleFileTypeFilter = (typeToToggle) => {
    setFileTypeFilters(prev => ({
      ...prev,
      [typeToToggle.toLowerCase()]: !prev[typeToToggle.toLowerCase()]
    }));
  };

  const handleFileFilterCategoryChange = (category) => {
    const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];
    const videoExts = ['mp4', 'webm', 'mov', 'avi', 'mkv'];
    const audioExts = ['mp3', 'wav', 'ogg', 'flac'];
    const threeDExts = ['gltf', 'glb', 'obj', 'fbx', 'stl', 'ply', '3ds', 'dae'];

    if (category === 'all') {
      setFileTypeFilters(prev => {
        const newFilters = { ...prev };
        [...imageExts, ...videoExts, ...audioExts, ...threeDExts].forEach(ext => newFilters[ext] = true);
        return newFilters;
      });
      return;
    }

    let extsToChange;
    if (category === 'image') extsToChange = imageExts;
    else if (category === 'video') extsToChange = videoExts;
    else if (category === 'audio') extsToChange = audioExts;
    else if (category === '3d') extsToChange = threeDExts;
    else return;

    const allActiveInCategory = extsToChange.every(ext => fileTypeFilters[ext.toLowerCase()]);
    setFileTypeFilters(prev => {
      const newFilters = { ...prev };
      extsToChange.forEach(ext => newFilters[ext.toLowerCase()] = !allActiveInCategory);
      return newFilters;
    });
  };

  // Grid slot management
  const handleDropToSlot = (targetSlotIdx, dropData) => {
    if (freeGridMode || is3DMode) {
      // Handle drops in free grid or 3D mode
      handleFreeGridDrop(dropData);
      return;
    }

    // Original grid slot logic
    let itemToPlace = null;
    let sourceSlotIndex = dropData.type === 'internal_media' ? dropData.sourceSlotIndex : null;
    let isNewFile = false;

    if (dropData.type === 'file') {
      const processed = processFile(dropData.file);
      if (!processed) return;

      if (!processed.id) {
        processed.id = `${dropData.file.name}-${dropData.file.size}-${dropData.file.lastModified}-${Math.random().toString(36).substr(2, 9)}`;
      }
      processed.userPath = dropData.file.webkitRelativePath || dropData.file.name;
      if (!processed.metadata) processed.metadata = { title: getFilename(processed.name) };
      if (!processed.metadata.category) processed.metadata.category = getFileTypeCategory(processed);

      const existingFile = mediaFiles.find(mf => mf.id === processed.id);
      if (!existingFile) {
        itemToPlace = processed;
        isNewFile = true;
      } else {
        cleanupMediaResource(processed, true);
        itemToPlace = existingFile;
      }
    } else if (dropData.type === 'internal_media') {
      if (mediaFiles[dropData.mediaOriginalIndex]) {
        itemToPlace = mediaFiles[dropData.mediaOriginalIndex];
      } else {
        console.error("Dragged media not found in mediaFiles array:", dropData.mediaOriginalIndex);
        return;
      }
    }

    if (!itemToPlace) return;

    if (isNewFile) {
      setMediaFiles(prevMediaFiles => [...prevMediaFiles, itemToPlace]);
    }

    setGridSlots(prevGridSlots => {
      let newGridSlots = [...prevGridSlots];
      const itemCurrentlyInTargetSlot = newGridSlots[targetSlotIdx];

      while (targetSlotIdx >= newGridSlots.length) {
        newGridSlots.push(null);
      }

      if (allowNudging && itemCurrentlyInTargetSlot && (sourceSlotIndex === null || sourceSlotIndex !== targetSlotIdx)) {
        let linearGrid = [...newGridSlots];
        const draggedItem = itemToPlace;

        if (sourceSlotIndex !== null && sourceSlotIndex < linearGrid.length) {
          linearGrid[sourceSlotIndex] = null;
        }

        if (!allowDuplicates) {
          const duplicateIndex = linearGrid.findIndex((slot, idx) =>
            idx !== sourceSlotIndex && slot && slot.id === draggedItem.id
          );
          if (duplicateIndex !== -1) {
            if (sourceSlotIndex !== null) {
              linearGrid[targetSlotIdx] = draggedItem;
              linearGrid[sourceSlotIndex] = itemCurrentlyInTargetSlot;
            } else {
              linearGrid[targetSlotIdx] = draggedItem;
            }
            return linearGrid;
          }
        }

        const displacedItem = linearGrid[targetSlotIdx];
        linearGrid[targetSlotIdx] = draggedItem;

        if (displacedItem) {
          let currentItemToNudge = displacedItem;
          for (let i = targetSlotIdx + 1; ; i++) {
            if (i >= linearGrid.length) {
              linearGrid.push(currentItemToNudge);
              break;
            }
            const temp = linearGrid[i];
            linearGrid[i] = currentItemToNudge;
            currentItemToNudge = temp;
            if (currentItemToNudge === null) break;
          }
        }
        newGridSlots = linearGrid;
      } else {
        if (sourceSlotIndex === null) {
          if (!allowDuplicates) {
            newGridSlots = newGridSlots.map((slot, index) =>
              (slot && slot.id === itemToPlace.id && index !== targetSlotIdx) ? null : slot
            );
          }
          newGridSlots[targetSlotIdx] = itemToPlace;
        } else {
          if (sourceSlotIndex === targetSlotIdx) return newGridSlots;

          if (allowDuplicates) {
            newGridSlots[targetSlotIdx] = itemToPlace;
          } else {
            newGridSlots[targetSlotIdx] = itemToPlace;
            if (sourceSlotIndex < newGridSlots.length) {
              newGridSlots[sourceSlotIndex] = itemCurrentlyInTargetSlot;
            }
          }
        }
      }

      const visualGridSize = gridConfig.columns * gridConfig.rows;
      let lastActualItemIndex = -1;
      for (let i = newGridSlots.length - 1; i >= 0; i--) {
        if (newGridSlots[i] !== null) {
          lastActualItemIndex = i;
          break;
        }
      }

      const requiredLength = Math.max(visualGridSize, lastActualItemIndex + 1);
      if (newGridSlots.length > requiredLength) newGridSlots.splice(requiredLength);
      while (newGridSlots.length < requiredLength) newGridSlots.push(null);

      return newGridSlots;
    });
  };

  const handleFreeGridDrop = (dropData) => {
    // Handle drops in free grid mode
    const newItemId = `item-${Date.now()}`;
    let mediaId = null;

    if (dropData.type === 'file') {
      const processed = processFile(dropData.file);
      if (!processed) return;

      // Add to media files
      setMediaFiles(prev => [...prev, processed]);
      mediaId = processed.id;
    } else if (dropData.type === 'internal_media') {
      const media = mediaFiles[dropData.mediaOriginalIndex];
      if (media) {
        mediaId = media.id;
      }
    }

    if (mediaId) {
      setFreeGridItems(prev => ({
        ...prev,
        [newItemId]: {
          mediaId,
          x: dropData.position?.x || 100,
          y: dropData.position?.y || 100,
          z: is3DMode ? 0 : undefined,
          width: gridConfig.cellWidth,
          height: gridConfig.cellHeight,
          rotation: 0,
          zIndex: Object.keys(prev).length + 1,
          transform: is3DMode ? {
            x: dropData.position?.x || 0,
            y: dropData.position?.y || 0,
            z: 0,
            rx: 0,
            ry: 0,
            rz: 0,
            sx: 1,
            sy: 1,
            sz: 1
          } : null
        }
      }));
    }
  };

  // Refresh media function
  const handleRefreshMedia = async () => {
    const updatedFiles = await Promise.all(
      mediaFiles.map(async (file) => {
        if (file.url && !file.isPlaceholder) {
          try {
            // Check if file still exists by attempting to fetch it
            const response = await fetch(file.url, { method: 'HEAD' });
            if (!response.ok) {
              // Mark as missing
              return { ...file, isMissing: true, originalUrl: file.url };
            }
            return { ...file, isMissing: false };
          } catch (error) {
            // Mark as missing
            return { ...file, isMissing: true, originalUrl: file.url };
          }
        }
        return file;
      })
    );

    setMediaFiles(updatedFiles);
  };

  // Replace missing media with new upload
  const handleReplaceMedia = useCallback((oldFile, newFile) => {
    const processedNewFile = processFile(newFile);
    if (!processedNewFile) return;

    setMediaFiles(prev => prev.map(file => {
      if (file.id === oldFile.id && file.isMissing) {
        // Clean up old URL if needed
        if (file.originalUrl && file.originalUrl.startsWith('blob:')) {
          URL.revokeObjectURL(file.originalUrl);
        }

        // Return new file with same ID to maintain grid positions
        return {
          ...processedNewFile,
          id: file.id, // Keep same ID
          isMissing: false,
          originalUrl: undefined
        };
      }
      return file;
    }));
  }, []);

  const handleGridItemSelect = (slotIdx, isShiftKey = false, isCtrlOrMetaKey = false) => {
    if (!gridSlots[slotIdx]) return;
    const itemInClickedSlot = gridSlots[slotIdx];
    const originalIndexInMediaFiles = mediaFiles.findIndex(m => m.id === itemInClickedSlot.id);
    if (originalIndexInMediaFiles === -1) return;

    if (markSelection) {
      handleMediaItemSelect(originalIndexInMediaFiles, isShiftKey, isCtrlOrMetaKey);
    }
  };

  const handleRemoveFromGridSlot = (slotIndexToRemove) => {
    setGridSlots(prevGridSlots => {
      const newGridSlots = [...prevGridSlots];
      if (slotIndexToRemove >= 0 && slotIndexToRemove < newGridSlots.length) {
        newGridSlots[slotIndexToRemove] = null;
      }
      return newGridSlots;
    });
  };

  const handleRemoveFromGrid = () => {
    if (selectedMediaItems.length === 0) return;

    const idsToRemove = new Set(selectedMediaItems.map(idx => mediaFiles[idx]?.id).filter(Boolean));

    // Remove from grid slots
    setGridSlots(prevGridSlots =>
      prevGridSlots.map(slot =>
        slot && idsToRemove.has(slot.id) ? null : slot
      )
    );

    // Remove from free grid items
    setFreeGridItems(prev => {
      const newItems = {};
      Object.entries(prev).forEach(([key, item]) => {
        if (!idsToRemove.has(item.mediaId)) {
          newItems[key] = item;
        }
      });
      return newItems;
    });

    // Don't remove from mediaFiles - keep in panel
    setSelectedMediaItems([]);
    setShowRemoveDialog(false);
  };

  const handleRemoveFromMediaPanel = () => {
    if (selectedMediaItems.length === 0) return;

    const idsToRemove = new Set(selectedMediaItems.map(idx => mediaFiles[idx]?.id).filter(Boolean));

    setGridSlots(prevGridSlots =>
      prevGridSlots.map(slot =>
        slot && idsToRemove.has(slot.id) ? null : slot
      )
    );

    setFreeGridItems(prev => {
      const newItems = {};
      Object.entries(prev).forEach(([key, item]) => {
        if (!idsToRemove.has(item.mediaId)) {
          newItems[key] = item;
        }
      });
      return newItems;
    });

    const itemsBeingRemoved = mediaFiles.filter((_, index) => selectedMediaItems.includes(index));
    setMediaFiles(prevMediaFiles =>
      prevMediaFiles.filter((_, index) => !selectedMediaItems.includes(index))
    );

    itemsBeingRemoved.forEach(item => cleanupMediaResource(item, true));
    setSelectedMediaItems([]);
    setLastSelectedIndex(null);
    setShowRemoveDialog(false);
  };

  const handleExportDeleteCommand = () => {
    setShowRemoveDialog(false);
  };

  const handleRemoveSelected = () => {
    if (selectedMediaItems.length > 0) setShowRemoveDialog(true);
  };

  // Panel resize handling
  const handleMediaPanelResize = useCallback((e) => {
    const panelContainer = document.querySelector('#app-container > div.flex.flex-1.overflow-hidden');
    if (!panelContainer) return;
    const containerRect = panelContainer.getBoundingClientRect();
    const newWidth = e.clientX - containerRect.left;
    const minWidth = 150;
    const maxWidth = window.innerWidth / 2;
    if (newWidth >= minWidth && newWidth <= maxWidth) {
      updateMediaPanelLayout(newWidth);
    }
  }, []);

  // const handleIndexPanelResize = useCallback((e) => {
  //   const newWidth = window.innerWidth - e.clientX;
  //   const minWidth = 200;
  //   const maxWidth = window.innerWidth / 2;
  //   if (newWidth >= minWidth && newWidth <= maxWidth) {
  //     setIndexPanelWidth(newWidth);
  //   }
  // }, []);

  const handleConsolePanelResize = useCallback((e) => {
    const newWidth = window.innerWidth - e.clientX;
    const minWidth = 200;
    const maxWidth = window.innerWidth / 2.5;
    if (newWidth >= minWidth && newWidth <= maxWidth) {
      setConsolePanelWidth(newWidth);
    }
  }, []);

  // Grid configuration
  const handleUpdateGridConfig = (newConfigPartial) => {
    setGridConfig(prevConfig => {
      const updatedConfig = { ...prevConfig, ...newConfigPartial };
      const newTotalVisualSlots = updatedConfig.columns * updatedConfig.rows;

      setGridSlots(prevSlots => {
        let currentContent = prevSlots.filter(Boolean);
        let newSlotsArr = Array(newTotalVisualSlots).fill(null);

        currentContent.forEach((item, i) => {
          if (i < newTotalVisualSlots) {
            newSlotsArr[i] = item;
          }
        });

        if (currentContent.length > newTotalVisualSlots) {
          newSlotsArr = [...newSlotsArr, ...currentContent.slice(newTotalVisualSlots)];
        }

        let lastActualItemIdx = -1;
        for (let i = newSlotsArr.length - 1; i >= 0; i--) {
          if (newSlotsArr[i] !== null) {
            lastActualItemIdx = i;
            break;
          }
        }

        const requiredLen = Math.max(newTotalVisualSlots, lastActualItemIdx + 1);
        if (newSlotsArr.length > requiredLen) {
          newSlotsArr.splice(requiredLen);
        }

        while (newSlotsArr.length < requiredLen) {
          newSlotsArr.push(null);
        }

        return newSlotsArr;
      });

      return updatedConfig;
    });
  };

  const updateMediaPanelLayout = (width) => {
    let columns = 1;
    if (thumbnailSize === 's') {
      columns = width < 200 ? 2 : width < 300 ? 3 : width < 400 ? 4 : 5;
    } else if (thumbnailSize === 'm') {
      columns = width < 250 ? 1 : width < 350 ? 2 : width < 450 ? 3 : 4;
    } else { // 'l'
      columns = width < 300 ? 1 : width < 450 ? 2 : 3;
    }

    setMediaPanelLayout({ width, columns });
  };

  // Media editing
  const handleEditMetadata = (originalIndex) => {
    if (mediaFiles[originalIndex]) {
      setEditingMediaName(originalIndex);
      setJsonTemplate(mediaFiles[originalIndex].metadata || {
        title: mediaFiles[originalIndex].name.split('.')[0],
        description: ""
      });
      setShowJsonEditor(true);
    }
  };

  const handleMediaNameUpdate = () => {
    if (editingMediaName !== null && mediaFiles[editingMediaName]) {
      const updatedMediaFiles = [...mediaFiles];
      const oldName = updatedMediaFiles[editingMediaName].name;
      updatedMediaFiles[editingMediaName] = {
        ...updatedMediaFiles[editingMediaName],
        name: editedMediaNameValue,
        metadata: {
          ...updatedMediaFiles[editingMediaName].metadata,
          title: editedMediaNameValue.split('.')[0]
        }
      };
      setMediaFiles(updatedMediaFiles);
      console.log(`Media name updated for index ${editingMediaName} from ${oldName} to ${editedMediaNameValue}`);

      setGridSlots(prevSlots => prevSlots.map(slot => {
        if (slot && slot.id === updatedMediaFiles[editingMediaName].id) {
          return {
            ...slot,
            name: editedMediaNameValue,
            metadata: {
              ...slot.metadata,
              title: editedMediaNameValue.split('.')[0]
            }
          };
        }
        return slot;
      }));

      if (previewMedia && previewMedia.id === updatedMediaFiles[editingMediaName].id) {
        setPreviewMedia({
          ...previewMedia,
          name: editedMediaNameValue,
          metadata: {
            ...previewMedia.metadata,
            title: editedMediaNameValue.split('.')[0]
          }
        });
      }
    }
    setEditingMediaName(null);
    setEditedMediaNameValue("");
  };

  const handleMediaMetadataUpdate = () => {
    if (editingMediaName !== null && mediaFiles[editingMediaName]) {
      const updatedMediaFiles = [...mediaFiles];
      updatedMediaFiles[editingMediaName] = {
        ...updatedMediaFiles[editingMediaName],
        metadata: jsonTemplate
      };
      setMediaFiles(updatedMediaFiles);
      console.log(`Media metadata updated for index ${editingMediaName}`);

      setGridSlots(prevSlots => prevSlots.map(slot => {
        if (slot && slot.id === updatedMediaFiles[editingMediaName].id) {
          return { ...slot, metadata: jsonTemplate };
        }
        return slot;
      }));

      if (previewMedia && previewMedia.id === updatedMediaFiles[editingMediaName].id) {
        setPreviewMedia({ ...previewMedia, metadata: jsonTemplate });
      }
    }
    setShowJsonEditor(false);
    setEditingMediaName(null);
  };

  const handleEditMediaNameFromPreview = () => {
    if (previewMedia) {
      const originalIndex = mediaFiles.findIndex(m => m.id === previewMedia.id);
      if (originalIndex !== -1) {
        setEditingMediaName(originalIndex);
        setEditedMediaNameValue(previewMedia.name);
        setShowEnlargedPreview(false);
      }
    }
  };

  const handleEditMetadataFromPreview = () => {
    if (previewMedia) {
      const originalIndex = mediaFiles.findIndex(m => m.id === previewMedia.id);
      if (originalIndex !== -1) {
        setEditingMediaName(originalIndex);
        setJsonTemplate(mediaFiles[originalIndex].metadata || {
          title: mediaFiles[originalIndex].name.split('.')[0],
          description: ""
        });
        setShowJsonEditor(true);
        setShowEnlargedPreview(false);
      }
    }
  };

  // Preview handling
  const openEnlargedPreview = (media, specificList = null) => {
    setPreviewMedia(media);
    const listToUse = specificList || filteredMediaFiles;
    setModalMediaList(listToUse.filter(Boolean));
    setShowEnlargedPreview(true);
  };

  // Index management
  const applyIndexChanges = () => {
    try {
      const parsedData = JSON.parse(editedIndexJson);
      setIndexData(parsedData);
      setEditingIndex(false);
    } catch (error) {
      alert('Invalid JSON format. Please check your input.');
      console.error('JSON parse error:', error);
    }
  };

  const updateEditedIndexJson = (data) => {
    setEditedIndexJson(JSON.stringify(data, null, 2));
  };

  // File operations
  const handleOpenFileOperationsDialog = () => {
    if (selectedMediaItems.length > 0) {
      setShowFileOperationsDialog(true);
    } else {
      alert("Please select media items first to perform file operations.");
    }
  };

  const logGeneratedFileOperations = (commands, platform) => {
    addCommandToHistory('File Operations', commands, platform);
  };

  // Export and save functions
  const handleExportFormChange = (e) => {
    setExportData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleUpdateIndexFormChange = (e) => {
    setUpdateIndexData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };



  // Save project function
  const saveProject = async (saveMethod = 'both') => {
    if (!projectName.trim()) return;

    // Create a version of media files without blob URLs
    const serializableMediaFiles = mediaFiles.map(file => ({
      id: file.id,
      name: file.name,
      type: file.type,
      size: file.size,
      date: file.date,
      thumbnail: file.thumbnail, // Thumbnails are usually base64, so they're safe
      thumbnailTimestamp: file.thumbnailTimestamp,
      metadata: file.metadata,
      userPath: file.userPath,
      isTextPage: file.isTextPage,
      textContent: file.textContent,
      isMissing: file.isMissing,
      isPlaceholder: file.isPlaceholder,
      // Don't save blob URLs - they won't be valid after reload
      requiresReupload: true
    }));

    const projectData = {
      id: `project_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: projectName,
      date: new Date().toISOString(),
      version: '1.1', // Updated version to indicate new save format
      appVersion: '1.0.0',
      mediaCount: mediaFiles.length,
      description: `${mediaFiles.length} media items, ${gridConfig.columns}x${gridConfig.rows} grid`,

      // Core data
      mediaFiles: serializableMediaFiles,

      // Grid data - store just the IDs
      gridSlots: gridSlots.map(slot => slot ? slot.id : null),
      gridConfig,
      freeGridItems,

      // Mode states
      freeGridMode,
      is3DMode,
      bookMode,

      // Book data
      pageMapping,
      bookPages,
      bookVolumeMetadata,
      currentBookPage,

      // UI preferences
      darkMode,
      allowDuplicates,
      allowNudging,
      markSelection,
      repeatGridPlaylist,
      previewMode,
      thumbnailSize,

      // Panel states
      showControls,
      // showIndexPanel,
      showConsolePanel,
      show3DViewport,
      mediaPanelCollapsed,
      mediaPanelPinned,
      mediaPanelLayout,
      // indexPanelWidth,
      consolePanelWidth,
      threeDViewportWidth,

      // Other data
      indexData,
      fileTypeFilters,
      sortConfig,
      commandHistory: commandHistory.slice(0, 20),
    };

    // Calculate size before stringifying
    const projectString = JSON.stringify(projectData, null, 2);
    projectData.fileSize = projectString.length;

    // Save to database
    if (saveMethod === 'local' || saveMethod === 'both') {
      try {
        await saveProjectToDB(projectName, 'Gridworm User');
        showNotification(`Project "${projectName}" saved successfully!`, 'success');
      } catch (error) {
        console.error('Error saving to database:', error);
        showNotification('Error saving project to database', 'error');
      }
    }

    // Download as file
    if (saveMethod === 'file' || saveMethod === 'both') {
      const blob = new Blob([projectString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${projectName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.gridworm.json`;
      a.click();
      URL.revokeObjectURL(url);
    }

    setShowSaveDialog(false);
  };

  // Load project function
  const loadProject = (projectData) => {
    try {
      // ---- START: NEW NON-DESTRUCTIVE LOGIC ----

      // 1. Get the current, real media files from the Jotai atom.
      const existingMediaFiles = mediaFiles;
      const existingMediaMap = new Map(existingMediaFiles.map(f => [f.id, f]));

      // 2. Process the media files from the saved project.
      //    - If a file already exists in our panel, use it.
      //    - If not, create a placeholder.
      const newPlaceholders = [];
      const restoredMediaFileObjects = projectData.mediaFiles.map(fileData => {
        if (existingMediaMap.has(fileData.id)) {
          // SUCCESS: File exists, use the real one.
          return existingMediaMap.get(fileData.id);
        } else {
          // FAILURE: File not found, create a placeholder.
          const placeholder = {
            id: fileData.id,
            name: fileData.name,
            type: fileData.type,
            size: fileData.size,
            date: fileData.date,
            url: null,
            thumbnail: fileData.thumbnail || null,
            metadata: fileData.metadata || {},
            userPath: fileData.userPath,
            isPlaceholder: true,
            isMissing: true,
            placeholderText: 'Re-upload needed',
            releaseUrl: () => { },
          };
          newPlaceholders.push(placeholder);
          return placeholder;
        }
      });

      // 3. Update the media panel by ADDING only the new placeholders.
      //    Do not overwrite the whole list.
      if (newPlaceholders.length > 0) {
        setMediaFiles(prev => [...prev, ...newPlaceholders]);
      }

      // 4. Create a map of all media (existing + new placeholders) for easy lookup.
      const allAvailableMedia = [...existingMediaFiles, ...newPlaceholders];
      const finalMediaMap = new Map(allAvailableMedia.map(f => [f.id, f]));

      // 5. Restore grid slots using the final media map.
      const restoredGridSlots = (projectData.gridSlots || []).map(slotId => {
        return slotId ? finalMediaMap.get(slotId) || null : null;
      });
      setGridSlots(restoredGridSlots);

      // Restore all other state with defaults...
      setGridConfig(projectData.gridConfig || {
        columns: 4,
        rows: 5,
        cellWidth: 160,
        cellHeight: 120,
        cellSize: 10
      });

      setFreeGridItems(projectData.freeGridItems || {});
      setFreeGridMode(projectData.freeGridMode || false);
      setIs3DMode(projectData.is3DMode || false);
      setBookMode(projectData.bookMode || false);

      setPageMapping(projectData.pageMapping || null);
      setBookPages(projectData.bookPages || []);
      setBookVolumeMetadata(projectData.bookVolumeMetadata || {
        title: "Grid Book",
        author: "Gridworm User",
        description: "Generated from grid content"
      });
      setCurrentBookPage(projectData.currentBookPage || 0);

      // Restore UI preferences
      if (projectData.darkMode !== undefined) handleDarkModeChange(projectData.darkMode);
      setAllowDuplicates(projectData.allowDuplicates || false);
      setAllowNudging(projectData.allowNudging || false);
      setMarkSelection(projectData.markSelection || false);
      setRepeatGridPlaylist(projectData.repeatGridPlaylist || false);
      setPreviewMode(projectData.previewMode || 'off');
      setThumbnailSize(projectData.thumbnailSize || 'l');

      // Restore panel states
      setShowControls(projectData.showControls || false);
      // setShowIndexPanel(projectData.showIndexPanel || false);
      setShowConsolePanel(projectData.showConsolePanel || false);
      setShow3DViewport(projectData.show3DViewport || false);
      setMediaPanelCollapsed(projectData.mediaPanelCollapsed || false);
      setMediaPanelPinned(projectData.mediaPanelPinned || false);
      if (projectData.mediaPanelLayout) setMediaPanelLayout(projectData.mediaPanelLayout);
      // if (projectData.indexPanelWidth) setIndexPanelWidth(projectData.indexPanelWidth);
      if (projectData.consolePanelWidth) setConsolePanelWidth(projectData.consolePanelWidth);
      if (projectData.threeDViewportWidth) setThreeDViewportWidth(projectData.threeDViewportWidth);

      // Restore other data
      setIndexData(projectData.indexData || []);
      if (projectData.fileTypeFilters) setFileTypeFilters(projectData.fileTypeFilters);
      if (projectData.sortConfig) setSortConfig(projectData.sortConfig);
      if (projectData.commandHistory) setCommandHistory(projectData.commandHistory);

      // Update project name
      setProjectName(projectData.name);

      setShowLoadDialog(false);

      // Count missing files
      const missingCount = restoredMediaFiles.filter(f => f.isPlaceholder && !f.isTextPage).length;

      if (missingCount > 0) {
        alert(`Project "${projectData.name}" loaded successfully!\n\n${missingCount} media file(s) need to be re-uploaded. They appear as placeholders in the grid.\n\nUse the Import button to re-upload the missing files.`);
      } else {
        alert(`Project "${projectData.name}" loaded successfully!`);
      }
    } catch (error) {
      console.error('Error loading project:', error);
      alert('Error loading project. The file might be corrupted or from an incompatible version.\n\n' + error.message);
    }
  };

  // Handle project file selected
  const handleProjectFileSelected = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const projectData = JSON.parse(event.target.result);
        loadProject(projectData);
      } catch (error) {
        console.error('Error parsing project file:', error);
        alert('Invalid project file. Please select a valid .gridworm.json file.');
      }
    };
    reader.readAsText(file);

    // Reset the input
    e.target.value = '';
  };

  // Delete project function - now uses database
  const deleteProject = async (projectId) => {
    try {
      await deleteProjectFromDB(projectId);
      showNotification('Project deleted successfully', 'success');
    } catch (error) {
      console.error('Error deleting project:', error);
      showNotification('Failed to delete project', 'error');
    }
  };

  // Load project and open book viewer
  const loadProjectAndOpenBook = (projectData) => {
    loadProject(projectData);
    // Use setTimeout to ensure state is updated before opening book viewer
    setTimeout(() => {
      if (projectData.bookPages && projectData.bookPages.length > 0) {
        setShowBook3DViewer(true);
      } else {
        // If no book pages, generate them
        ensureBookPages();
        setShowBook3DViewer(true);
      }
    }, 100);
  };

  // Non-destructive bookshelf handler - applies book layout without destroying current workspace
  const handleApplyBookLayout = (book) => {
    try {
      const result = applyBookLayout(
        book,
        mediaFiles,
        setMediaFiles,
        setGridSlots,
        setBookVolumeMetadata,
        setAtomPages,
        setShowBook3DViewer,
        setShowBookshelf
      );

      if (result.missingCount > 0) {
        // Show notification about missing files
        const notification = document.createElement('div');
        notification.className = 'fixed top-4 right-4 bg-yellow-600 text-white px-4 py-2 rounded shadow-lg z-50';
        notification.textContent = `Book loaded with ${result.missingCount} missing files (placeholders created)`;
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 5000);

        console.log(`Book "${book.title}" loaded with ${result.missingCount} missing files (placeholders created)`);
      } else {
        console.log(`Book "${book.title}" loaded successfully`);
      }

      return result;
    } catch (error) {
      console.error('Error applying book layout:', error);
      alert('Error loading book layout: ' + error.message);
    }
  };

  // Enhanced save project with IndexedDB
  const saveProjectEnhanced = async (projectName) => {
    try {
      const projectId = await saveProjectToDB(projectName || 'Untitled Project');

      // Show success notification
      const notification = document.createElement('div');
      notification.className = 'fixed top-4 right-4 bg-green-600 text-white px-4 py-2 rounded shadow-lg z-50';
      notification.textContent = 'Project saved to database!';
      document.body.appendChild(notification);
      setTimeout(() => notification.remove(), 3000);

      console.log('Project saved with ID:', projectId);
      return projectId;
    } catch (error) {
      console.error('Failed to save project:', error);
      alert('Failed to save project: ' + error.message);
    }
  };

  // Enhanced load project from IndexedDB
  const loadProjectEnhanced = async (projectId) => {
    try {
      const project = await loadProjectFromDB(projectId);

      // Show success notification
      const notification = document.createElement('div');
      notification.className = 'fixed top-4 right-4 bg-blue-600 text-white px-4 py-2 rounded shadow-lg z-50';
      notification.textContent = `Project "${project.name}" loaded from database!`;
      document.body.appendChild(notification);
      setTimeout(() => notification.remove(), 3000);

      console.log('Project loaded:', project.name);
      return project;
    } catch (error) {
      console.error('Failed to load project:', error);
      alert('Failed to load project: ' + error.message);
    }
  };

  // Placeholder functions (implement as needed)
  const updateIndexFile = () => { console.log("Update index file triggered", updateIndexData); };
  const handleIndexFileSelected = (e) => { if (e.target.files[0]) console.log("Index file selected", e.target.files[0]); };
  const saveIndexFile = () => { console.log("Save index file triggered"); };
  const handleExport = () => { console.log("Export volume triggered", exportData); };
  const addJsonField = (currentPath, key, defaultValue = "") => { console.log("Add JSON field:", currentPath, key, defaultValue); };
  const removeJsonField = (currentPath, key) => { console.log("Remove JSON field:", currentPath, key); };
  const editJsonField = (fullPath, value) => { console.log("Edit JSON field:", fullPath, value); };

  // Effects
  useEffect(() => {
    setGridSlots(Array(gridConfig.columns * gridConfig.rows).fill(null));
  }, []);

  // Projects are now automatically loaded by useProjectStorage hook

  useEffect(() => {
    const initialIdxData = [];
    setIndexData(initialIdxData);
    updateEditedIndexJson(initialIdxData);
  }, []);

  useEffect(() => {
    return () => {
      mediaFiles.forEach(mf => cleanupMediaResource(mf, true));
    };
  }, []);

  // Update media panel layout based on thumbnail size
  useEffect(() => {
    updateMediaPanelLayout(mediaPanelLayout.width);
  }, [thumbnailSize]);

  useEffect(() => {
    const totalSlotsInConfig = gridConfig.columns * gridConfig.rows;
    let lastNonNullIndex = -1;
    for (let i = 0; i < gridSlots.length; i++) {
      if (gridSlots[i] !== null) {
        lastNonNullIndex = i;
      }
    }
    setGridHasOverflow(lastNonNullIndex >= totalSlotsInConfig);
  }, [gridSlots, gridConfig.columns, gridConfig.rows]);

  // Auto-update book pages when content changes
  useEffect(() => {
    const pages = generateBookPages();
    setBookPages(pages);
  }, [gridSlots, freeGridItems, mediaFiles, pageMapping, generateBookPages]);

  // Initialize with default book on mount
  useEffect(() => {
    ensureBookPages();
  }, [ensureBookPages]);

  // Drag and drop handling
  useEffect(() => {
    const preventDefaults = (e) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const handleExternalDrop = (e) => {
      preventDefaults(e);
      const files = e.dataTransfer.items
        ? Array.from(e.dataTransfer.items).filter(item => item.kind === 'file').map(item => item.getAsFile())
        : Array.from(e.dataTransfer.files);
      if (files.length > 0) handleFilesSelected(files.filter(f => f !== null));
    };

    document.addEventListener('dragover', preventDefaults);
    document.addEventListener('drop', handleExternalDrop);

    return () => {
      document.removeEventListener('dragover', preventDefaults);
      document.removeEventListener('drop', handleExternalDrop);
    };
  }, [handleFilesSelected]);

  // Panel resize handling
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isResizingMediaPanel) handleMediaPanelResize(e);
      // else if (isResizingIndexPanel) handleIndexPanelResize(e);
      else if (isResizingConsolePanel) handleConsolePanelResize(e);
    };

    const handleMouseUp = () => {
      setIsResizingMediaPanel(false);
      // setIsResizingIndexPanel(false);
      setIsResizingConsolePanel(false);
      document.body.style.cursor = '';
    };

    if (isResizingMediaPanel || isResizingConsolePanel) {
      document.body.style.cursor = 'col-resize';
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp, { once: true });
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
    };
  }, [isResizingMediaPanel, isResizingConsolePanel,
    handleMediaPanelResize, handleConsolePanelResize]);

  const handle3DViewportResize = useCallback((e) => {
    const newWidth = window.innerWidth - e.clientX;
    const minWidth = 300;
    const maxWidth = window.innerWidth / 2;
    if (newWidth >= minWidth && newWidth <= maxWidth) {
      setThreeDViewportWidth(newWidth);
    }
  }, []);

  // Add to resize effect
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isResizingMediaPanel) handleMediaPanelResize(e);
      // else if (isResizingIndexPanel) handleIndexPanelResize(e);
      else if (isResizingConsolePanel) handleConsolePanelResize(e);
      else if (isResizing3DViewport) handle3DViewportResize(e);
    };

    const handleMouseUp = () => {
      setIsResizingMediaPanel(false);
      // setIsResizingIndexPanel(false);
      setIsResizingConsolePanel(false);
      setIsResizing3DViewport(false);
      document.body.style.cursor = '';
    };

    if (isResizingMediaPanel || isResizingConsolePanel || isResizing3DViewport) {
      document.body.style.cursor = 'col-resize';
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp, { once: true });
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
    };
  }, [isResizingMediaPanel, isResizingConsolePanel, isResizing3DViewport,
    handleMediaPanelResize, handleConsolePanelResize, handle3DViewportResize]);

  // Add handler for View in 3D
  const handleViewIn3D = useCallback((media) => {
    setShow3DViewport(true);
    // The media will be added to viewport through drag/drop or direct API
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'a' && !editingIndex && !showJsonEditor &&
        document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        selectAllMediaItems();
      }

      if (e.key === 'Delete' && selectedMediaItems.length > 0 && !showJsonEditor &&
        editingMediaName === null && !showRemoveDialog &&
        document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        setShowRemoveDialog(true);
      }

      if (e.key === 'Escape') {
        if (showEnlargedPreview) { setShowEnlargedPreview(false); return; }
        if (showJsonEditor) { setShowJsonEditor(false); setEditingMediaName(null); return; }
        if (editingMediaName !== null) { setEditingMediaName(null); setEditedMediaNameValue(""); return; }
        if (showRemoveDialog) { setShowRemoveDialog(false); return; }
        if (showExportDialog) { setShowExportDialog(false); return; }
        if (showUpdateIndexDialog) { setShowUpdateIndexDialog(false); return; }
        if (showSaveDialog) { setShowSaveDialog(false); return; }
        if (showLoadDialog) { setShowLoadDialog(false); return; }
        if (showFileOperationsDialog) { setShowFileOperationsDialog(false); return; }
        if (showConsolePanel && !isResizingConsolePanel) { setShowConsolePanel(false); return; }
        if (editingIndex) { setEditingIndex(false); return; }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedMediaItems, editingIndex, showJsonEditor, editingMediaName, showExportDialog,
    showUpdateIndexDialog, showSaveDialog, showLoadDialog, showEnlargedPreview,
    showRemoveDialog, showFileOperationsDialog, showConsolePanel, selectAllMediaItems,
    isResizingConsolePanel]);

  const handleAddMediaFiles = useCallback((newMediaFiles) => {
    setMediaFiles(prev => {
      const existingIds = new Set(prev.map(f => f.id));
      const trulyNewFiles = newMediaFiles.filter(nm => !existingIds.has(nm.id));

      // Log text pages to console
      const textPages = trulyNewFiles.filter(f => f.isTextPage);
      if (textPages.length > 0) {
        addCommandToHistory('text-pages', {
          timestamp: new Date().toISOString(),
          pages: textPages.map(p => ({
            id: p.id,
            name: p.name,
            content: p.textContent,
            metadata: p.metadata
          })),
          fullText: textPages.map(p => p.textContent).join('\n\n---\n\n'),
          exportable: true
        }, 'content');
      }

      return [...prev, ...trulyNewFiles];
    });

    // Update grid to show only new items (append mode)
    if (!freeGridMode) {
      // In standard grid mode, add items to next available slots
      setGridSlots(prev => {
        const newSlots = [...prev];
        let slotIndex = 0;

        // Find first empty slot
        while (slotIndex < newSlots.length && newSlots[slotIndex] !== null) {
          slotIndex++;
        }

        // Add new media files to empty slots
        newMediaFiles.forEach(mediaFile => {
          // Extend grid if needed
          while (slotIndex >= newSlots.length) {
            newSlots.push(null);
          }

          // Add to slot
          if (slotIndex < newSlots.length) {
            newSlots[slotIndex] = mediaFile;
            slotIndex++;
          }
        });

        return newSlots;
      });

      // Check for overflow
      const totalSlotsInConfig = gridConfig.columns * gridConfig.rows;
      const usedSlots = gridSlots.filter(s => s !== null).length + newMediaFiles.length;
      if (usedSlots > totalSlotsInConfig) {
        console.warn(`Grid overflow: ${usedSlots} items in ${totalSlotsInConfig} visible slots`);
      }
    }
  }, [addCommandToHistory, freeGridMode, gridConfig, gridSlots]);

  // Add after other useEffect hooks
  useEffect(() => {
    // Global function for text page logging
    window.logTextPages = (logEntry) => {
      addCommandToHistory('text-content', {
        ...logEntry,
        exportable: true
      }, 'journal');
    };

    return () => {
      delete window.logTextPages;
    };
  }, [addCommandToHistory]);

  // Update handleCreateTextPages in FreeGridCanvas section
  const handleCreateTextPages = (pageDataArray) => {
    // These are already TextPage objects
    handleAddMediaFiles(pageDataArray);
  };

  const getCurrentBookData = () => {
    const pages = ensureBookPages();
    return {
      title: bookVolumeMetadata.title || "Grid Book",
      author: bookVolumeMetadata.author || "Gridworm User",
      description: bookVolumeMetadata.description || "Generated from grid content",
      pages: pages,
      volumeMetadata: bookVolumeMetadata,
      metadata: {
        created: new Date().toISOString(),
        gridConfig: gridConfig,
        pageMapping: pageMapping,
        sourceType: freeGridMode ? 'freegrid' : 'standard',
        totalItems: freeGridMode ? Object.keys(freeGridItems).length : gridSlots.filter(Boolean).length,
        autoGenerated: !pageMapping
      }
    };
  };

  // const handleBookSelect = (book) => {
  //   console.log('Loading book:', book.title);

  //   // IMPORTANT: Preserve ALL existing media - DO NOT CLEAR MEDIA PANEL
  //   const existingMediaFiles = [...mediaFiles];
  //   const placeholders = [];

  //   // Clear ONLY the grid, not the media panel
  //   const emptyGrid = new Array(gridConfig.columns * gridConfig.rows).fill(null);
  //   setGridSlots(emptyGrid);

  //   // Process book pages to populate grid
  //   const gridItems = [];
  //   const processedPages = book.pages.map(page => {
  //     const processedPage = { ...page };

  //     // Process front page
  //     if (page.front) {
  //       let frontMedia = null;

  //       if (typeof page.front === 'object') {
  //         // Direct object reference
  //         frontMedia = existingMediaFiles.find(m => m.id === page.front.id || m.name === page.front.name);
  //         if (!frontMedia) {
  //           // Create placeholder for missing media
  //           const placeholder = {
  //             id: `placeholder-${page.front.id || page.front.name}`,
  //             name: `[Missing] ${page.front.name || page.front.id}`,
  //             type: 'placeholder',
  //             url: null,
  //             isPlaceholder: true,
  //             originalRef: page.front,
  //             thumbnail: null
  //           };
  //           placeholders.push(placeholder);
  //           frontMedia = placeholder;
  //         }
  //       } else if (typeof page.front === 'string') {
  //         // String reference
  //         frontMedia = existingMediaFiles.find(m => m.id === page.front || m.name === page.front);
  //         if (!frontMedia) {
  //           // Create placeholder
  //           const placeholder = {
  //             id: `placeholder-${page.front}`,
  //             name: `[Missing] ${page.front}`,
  //             type: 'placeholder',
  //             url: null,
  //             isPlaceholder: true,
  //             originalRef: page.front,
  //             thumbnail: null
  //           };
  //           placeholders.push(placeholder);
  //           frontMedia = placeholder;
  //         }
  //       }

  //       processedPage.front = frontMedia;
  //       if (frontMedia) gridItems.push(frontMedia);
  //     }

  //     // Process back page (same logic)
  //     if (page.back) {
  //       let backMedia = null;

  //       if (typeof page.back === 'object') {
  //         backMedia = existingMediaFiles.find(m => m.id === page.back.id || m.name === page.back.name);
  //         if (!backMedia) {
  //           const placeholder = {
  //             id: `placeholder-${page.back.id || page.back.name}`,
  //             name: `[Missing] ${page.back.name || page.back.id}`,
  //             type: 'placeholder',
  //             url: null,
  //             isPlaceholder: true,
  //             originalRef: page.back,
  //             thumbnail: null
  //           };
  //           placeholders.push(placeholder);
  //           backMedia = placeholder;
  //         }
  //       } else if (typeof page.back === 'string') {
  //         backMedia = existingMediaFiles.find(m => m.id === page.back || m.name === page.back);
  //         if (!backMedia) {
  //           const placeholder = {
  //             id: `placeholder-${page.back}`,
  //             name: `[Missing] ${page.back}`,
  //             type: 'placeholder',
  //             url: null,
  //             isPlaceholder: true,
  //             originalRef: page.back,
  //             thumbnail: null
  //           };
  //           placeholders.push(placeholder);
  //           backMedia = placeholder;
  //         }
  //       }

  //       processedPage.back = backMedia;
  //       if (backMedia) gridItems.push(backMedia);
  //     }

  //     return processedPage;
  //   });

  //   // Add placeholders to media panel (not replacing existing media!)
  //   if (placeholders.length > 0) {
  //     setMediaFiles([...existingMediaFiles, ...placeholders]);
  //   }

  //   // Update grid with book items
  //   const newGrid = [...emptyGrid];
  //   gridItems.forEach((item, index) => {
  //     if (index < newGrid.length) {
  //       newGrid[index] = item;
  //     }
  //   });
  //   setGridSlots(newGrid);

  //   // Update book pages atom
  //   setAtomPages(processedPages);

  //   // Update volume metadata
  //   if (book.volumeMetadata) {
  //     setBookVolumeMetadata(book.volumeMetadata);
  //   }

  //   // Show notifications
  //   showNotification('Book loaded successfully!', 'success');

  //   if (placeholders.length > 0) {
  //     setTimeout(() => {
  //       showNotification(
  //         `${placeholders.length} media files are missing. Placeholders added to media panel.`,
  //         'warning'
  //       );
  //     }, 1000);
  //   }

  //   // Close bookshelf and open 3D viewer
  //   setShowBookshelf(false);
  //   setShow3DBookViewer(true);
  //   setCurrentPage(0);
  // };

  // Notification helper
  const showNotification = (message, type = 'info') => {
    const notification = document.createElement('div');
    const bgColor = type === 'success' ? 'bg-green-600' : type === 'warning' ? 'bg-yellow-600' : 'bg-blue-600';
    notification.className = `fixed bottom-4 left-1/2 transform -translate-x-1/2 ${bgColor} text-white px-6 py-3 rounded-lg shadow-lg z-50 flex items-center space-x-2`;

    if (type === 'success') {
      notification.innerHTML = `
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
      </svg>
      <span>${message}</span>
    `;
    } else {
      notification.innerHTML = `<span>${message}</span>`;
    }

    document.body.appendChild(notification);

    // Add OK button for success messages
    if (type === 'success') {
      const okButton = document.createElement('button');
      okButton.className = 'ml-4 px-3 py-1 bg-white bg-opacity-20 rounded hover:bg-opacity-30 transition-colors';
      okButton.textContent = 'OK';
      okButton.onclick = () => notification.remove();
      notification.appendChild(okButton);
    } else {
      setTimeout(() => notification.remove(), 5000);
    }
  };

  const handleSaveToBookshelf = useCallback(async (bookData) => {
    try {
      console.log('Saving book to bookshelf:', bookData.title);

      // Validate book data
      if (!bookData || !bookData.title || !bookData.pages) {
        throw new Error('Invalid book data - missing required fields');
      }

      // Get existing bookshelf data
      const existingData = localStorage.getItem('gridworm_bookshelf_data');
      let bookshelfData = { shelves: [{ id: 'default', books: [] }], version: '1.0' };

      if (existingData) {
        const parsed = JSON.parse(existingData);
        if (Array.isArray(parsed)) {
          // Old format - convert to new format
          bookshelfData = {
            shelves: [{ id: 'default', books: parsed }],
            version: '1.0'
          };
        } else {
          bookshelfData = parsed;
        }
      }

      // Ensure canonical format
      const canonicalBook = {
        id: bookData.id || `book-${Date.now()}`,
        title: bookData.title,
        author: bookData.author || "Gridworm User",
        description: bookData.description || "",
        createdAt: new Date().toISOString(),
        color: bookData.color || '#4682B4',
        volumeMetadata: {
          pageCount: bookData.pages?.length || 0,
          coverMaterial: 'hardcover',
          ...bookData.volumeMetadata
        },
        pages: bookData.pages || [],
        metadata: {
          ...bookData.metadata,
          addedToShelf: new Date().toISOString(),
          source: 'book_viewer'
        }
      };

      // Add the book to the shelf
      if (!bookshelfData.shelves[0]) {
        bookshelfData.shelves[0] = { id: 'default', books: [] };
      }
      bookshelfData.shelves[0].books.unshift(canonicalBook);

      // Save back to localStorage
      localStorage.setItem('gridworm_bookshelf_data', JSON.stringify(bookshelfData));

      // Show success notification
      showNotification(`"${bookData.title}" saved to bookshelf!`, 'success');

      console.log('Book saved to bookshelf successfully');
      return true;
    } catch (error) {
      console.error('Error saving book to bookshelf:', error);
      showNotification('Error saving book: ' + error.message, 'error');
      throw error;
    }
  }, [showNotification]);

  

  return (
    <div id="app-container" className="flex flex-col h-screen bg-gray-100 dark:bg-gray-900 transition-colors duration-300">
      {/* Header - Simplified */}
      <div className="flex items-center justify-between space-x-2 p-2 bg-gray-200 dark:bg-gray-700 shadow-md flex-wrap">
        <img
          src={darkMode ? "/gridworm-02.png" : "/gridworm-01.png"}
          alt="Gridworm logo"
          className="h-12 sm:h-14 w-auto mr-2 sm:mr-4"
        />
        <div className="flex items-center space-x-1 sm:space-x-2 flex-wrap gap-y-1 sm:gap-y-2">
          {/* Project operations */}
          <button onClick={() => setShowSaveDialog(true)} title="Save current project layout" className="flex items-center px-2 sm:px-3 py-1 sm:py-1.5 text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors text-xs sm:text-sm">
            <Save size={14} className="mr-1 sm:mr-1.5" /> Save
          </button>
          <button onClick={() => setShowLoadDialog(true)} title="Load a saved project" className="flex items-center px-2 sm:px-3 py-1 sm:py-1.5 text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors text-xs sm:text-sm">
            <Download size={14} className="mr-1 sm:mr-1.5" /> Load
          </button>

          {/* Book Ops Dropdown - without Preview */}
          <div className="absolute left-20 mt-1 w-56  z-50">

            <DropdownMenu
              title="Book Ops"
              icon={Book}
              buttonClassName="bg-purple-600 hover:bg-purple-700"
            >
              <DropdownItem onClick={() => setShowBookshelf(true)} icon={Book}>
                View Bookshelf
              </DropdownItem>
              <DropdownItem onClick={handleExportToBook} icon={Download}>
                Quick Export Grid as Book
              </DropdownItem>
            </DropdownMenu>
          </div>
          <button
            onClick={handleOpenFileOperationsDialog}
            title="Export rename/move commands for selected files"
            className="flex items-center px-2 sm:px-3 py-1 sm:py-1.5 text-white bg-teal-600 rounded hover:bg-teal-700 transition-colors text-xs sm:text-sm"
            disabled={selectedMediaItems.length === 0}
          >
            <Terminal size={14} className="mr-1 sm:mr-1.5" /> Ops
          </button>

          {/* Console Panel toggle */}
          <button
            onClick={() => setShowConsolePanel(!showConsolePanel)}
            title="Toggle Command Log Panel"
            className={`flex items-center px-2 py-1 sm:px-3 sm:py-1.5 text-white rounded transition-colors text-xs sm:text-sm ${showConsolePanel ? 'bg-cyan-600 hover:bg-cyan-700' : 'bg-gray-500 hover:bg-gray-600'
              }`}
          >
            <ListTree size={14} className="mr-0 sm:mr-1.5" />
            <span className="hidden sm:inline">Log</span>
          </button>

          {/* Dark mode toggle */}
          <button
            onClick={() => handleDarkModeChange(!darkMode)}
            title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            className="flex items-center px-2 sm:px-3 py-1 sm:py-1.5 rounded bg-gray-300 dark:bg-gray-500 hover:bg-gray-400 dark:hover:bg-gray-600 transition-colors text-gray-800 dark:text-gray-200 text-xs sm:text-sm"
          >
            {darkMode ? '🌙' : '☀️'}
            <span className="ml-1 sm:ml-2 hidden sm:inline">{darkMode ? 'Dark' : 'Light'}</span>
          </button>
        </div>
      </div>

      {/* Hidden file inputs */}
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        multiple
        accept="image/*,video/*,audio/*,.jpg,.jpeg,.png,.gif,.webp,.svg,.mp4,.webm,.mov,.avi,.mkv,.mp3,.wav,.ogg,.flac,.gltf,.glb,.obj,.fbx,.stl,.ply,.3ds,.dae"
        onChange={onFileInputChange}
      />
      <input
        type="file"
        ref={folderInputRef}
        style={{ display: 'none' }}
        webkitdirectory="true"
        directory="true"
        multiple
        onChange={onFileInputChange}
      />
      <input
        type="file"
        ref={indexFileInputRef}
        style={{ display: 'none' }}
        accept=".json"
        onChange={handleIndexFileSelected}
      />

      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden">
        <div
          className={`transition-all duration-300`}
          onMouseEnter={handleMediaPanelMouseEnter}
          onMouseLeave={handleMediaPanelMouseLeave}
        >
          <MediaPanel
            onBeginResize={() => setIsResizingMediaPanel(true)}
            mediaFiles={mediaFiles}
            filteredMediaFiles={filteredMediaFiles}
            mediaPanelLayout={mediaPanelLayout}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            showFilters={showFilters}
            onToggleFilters={() => setShowFilters(!showFilters)}
            fileTypeFilters={fileTypeFilters}
            onToggleFileTypeFilter={toggleFileTypeFilter}
            onFileFilterCategoryChange={handleFileFilterCategoryChange}
            sortConfig={sortConfig}
            onSort={handleSort}
            selectedMediaItems={selectedMediaItems}
            onMediaItemSelect={handleMediaItemSelect}
            onSelectAll={selectAllMediaItems}
            onDeselectAll={deselectAllMediaItems}
            onEditMetadata={handleEditMetadata}
            onRemoveSelected={handleRemoveSelected}
            onMediaPreviewClick={(media) => openEnlargedPreview(media, filteredMediaFiles)}
            hoveredItem={hoveredItem}
            onMediaItemHover={setHoveredItem}
            isCollapsed={mediaPanelCollapsed}
            isPinned={mediaPanelPinned}
            onToggleCollapse={toggleMediaPanelCollapse}
            onTogglePin={toggleMediaPanelPin}
            onRefreshMedia={handleRefreshMedia}
            darkMode={darkMode}
          />
        </div>

        {/* Main content with toolbar */}
        <div className="flex-1 flex flex-col">
          {/* Grid toolbar - aligned with grid content */}
          <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-2">
            <div className="flex items-center space-x-2">
              {/* Import Dropdown */}
              <DropdownMenu
                title="Import Media"
                icon={Upload}
                buttonClassName="bg-green-600 hover:bg-green-700"
              >
                <DropdownItem onClick={handleUploadFiles} icon={Upload}>
                  As Files
                </DropdownItem>
                <DropdownItem onClick={handleUploadFolder} icon={FolderOpen}>
                  As Folder
                </DropdownItem>
              </DropdownMenu>

              {/* Mode Toggle */}
              <div className="flex items-center bg-gray-300 dark:bg-gray-600 rounded-md p-0.5">
                <button
                  onClick={() => { setFreeGridMode(false); setIs3DMode(false); }}
                  className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded transition-all ${!freeGridMode && !is3DMode
                    ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                >
                  <Grid size={14} className="inline mr-1" />
                  Standard
                </button>
                <button
                  onClick={handleToggleFreeGridMode}
                  className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded transition-all ${freeGridMode
                    ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                >
                  <Move size={14} className="inline mr-1" />
                  Free Grid
                </button>
              </div>

              {/* Book Preview */}
              <button
                onClick={() => setShowBook3DViewer(true)}
                title="Preview Book (Auto-generated from grid)"
                className="flex items-center px-2 py-1 sm:px-3 sm:py-1.5 text-white bg-purple-600 hover:bg-purple-700 rounded transition-colors text-xs sm:text-sm"
              >
                <Eye size={14} className="mr-0 sm:mr-1.5" />
                <span className="hidden sm:inline">Book Preview</span>
              </button>

              {/* 3D Viewport */}
              <button
                onClick={() => setShow3DViewport(!show3DViewport)}
                title="Toggle 3D Viewport"
                className={`flex items-center px-2 py-1 sm:px-3 sm:py-1.5 text-white rounded transition-colors text-xs sm:text-sm ${show3DViewport ? 'bg-purple-600 hover:bg-purple-700' : 'bg-gray-500 hover:bg-gray-600'
                  }`}
              >
                <Box size={14} className="mr-0 sm:mr-1.5" />
                <span className="hidden sm:inline">3D Viewport</span>
              </button>
            </div>
          </div>

          {/* Grid content */}
          <div className="flex-1 overflow-hidden">
            {is3DMode ? (
              <ThreeDGrid
                mediaFiles={mediaFiles}
                gridItems={freeGridItems}
                setGridItems={setFreeGridItems}
                selectedItems={selectedMediaItems}
                onItemSelect={handleMediaItemSelect}
                onPreviewMedia={openEnlargedPreview}
                gridConfig={gridConfig}
                darkMode={darkMode}
                is3DViewportOpen={show3DViewport}
                threeDViewportWidth={threeDViewportWidth}
              />
            ) : freeGridMode ? (
              <FreeGridCanvas
                mediaFiles={mediaFiles}
                freeGridItems={freeGridItems}
                setFreeGridItems={setFreeGridItems}
                selectedMediaItems={selectedMediaItems}
                onMediaItemSelect={handleMediaItemSelect}
                onPreviewMedia={(media) => openEnlargedPreview(media)}
                allowDuplicates={allowDuplicates}
                onToggleAllowDuplicates={handleToggleAllowDuplicates}
                onClearGrid={handleClearGrid}
                onAddRandomMedia={handleAddRandomMedia}
                gridConfig={gridConfig}
                onDropToSlot={(dropData) => handleFreeGridDrop(dropData)}
                onAddGridToFreeGrid={handleAddGridToFreeGrid}
                is3DViewportOpen={show3DViewport}
                threeDViewportWidth={threeDViewportWidth}
                pageDataArray={pageDataArray}
                setMediaFiles={setMediaFiles}
                onAddMediaFile={handleAddMediaFiles}
                onPageMappingConfirm={handlePageMappingConfirm}
                handleUploadFiles={handleUploadFiles}
              />
            ) : (
              <GridBuilderPanel
                gridConfig={gridConfig}
                onUpdateGridConfig={handleUpdateGridConfig}
                gridSlots={gridSlots}
                mediaFiles={mediaFiles}
                gridHasOverflow={gridHasOverflow}
                hoveredItem={hoveredItem}
                onHover={setHoveredItem}
                onRemoveFromSlot={handleRemoveFromGridSlot}
                onDropToSlot={handleDropToSlot}
                onSelectGridItem={handleGridItemSelect}
                onPreviewMedia={(media) => openEnlargedPreview(media, gridSlots.filter(Boolean))}
                markSelection={markSelection}
                onToggleMarkSelection={handleToggleMarkSelection}
                allowNudging={allowNudging}
                onToggleAllowNudging={handleToggleAllowNudging}
                allowDuplicates={allowDuplicates}
                onToggleAllowDuplicates={handleToggleAllowDuplicates}
                onClearGrid={handleClearGrid}
                onAddRandomMedia={handleAddRandomMedia}
                freeGridMode={freeGridMode}
                onToggleFreeGridMode={handleToggleFreeGridMode}
                is3DViewportOpen={show3DViewport}
                threeDViewportWidth={threeDViewportWidth}
              />
            )}
          </div>
        </div>



        <ThreeDViewportPanel
          show3DViewport={show3DViewport}
          viewportWidth={threeDViewportWidth}
          onBeginResizing={() => setIsResizing3DViewport(true)}
          onClose={() => setShow3DViewport(false)}
          darkMode={darkMode}
          gridSlots={gridSlots}
          freeGridItems={freeGridItems}
          mediaFiles={mediaFiles}
          gridConfig={gridConfig}
          bookMode={bookMode}
          onBookModeToggle={handleBookModeToggle}
          pageMapping={pageMapping}
          onPageMappingConfirm={(mapping, metadata) => {
            setPageMapping(mapping);
          }}
          bookPages={bookPages}
          currentBookPage={currentBookPage}
          onBookPageChange={setCurrentBookPage}

          onAddMediaFiles={handleAddMediaFiles}
        />

        <ConsolePanel
          showConsolePanel={showConsolePanel}
          consolePanelWidth={consolePanelWidth}
          commandHistory={commandHistory}
          onClose={() => setShowConsolePanel(false)}
          onClearHistory={clearCommandHistory}
          onBeginResizing={() => setIsResizingConsolePanel(true)}
        />
      </div>

      {/* Dialogs */}
      <RemoveMediaDialog
        showDialog={showRemoveDialog}
        selectedCount={selectedMediaItems.length}
        selectedMediaItems={selectedMediaItems}  // Pass the indices
        mediaFiles={mediaFiles}
        onClose={() => setShowRemoveDialog(false)}
        onRemoveFromList={handleRemoveFromMediaPanel}
        onRemoveFromGrid={handleRemoveFromGrid}
        onExportDeleteCommand={handleExportDeleteCommand}
      />

      <ExportDialog
        showExportDialog={showExportDialog}
        exportData={exportData}
        onClose={() => setShowExportDialog(false)}
        onExport={handleExport}
        onFormChange={handleExportFormChange}
      />

      <UpdateIndexDialog
        showUpdateIndexDialog={showUpdateIndexDialog}
        updateIndexData={updateIndexData}
        onClose={() => setShowUpdateIndexDialog(false)}
        onUpdateIndex={updateIndexFile}
        onFormChange={handleUpdateIndexFormChange}
      />

      {editingMediaName !== null && !showJsonEditor && (
        <MediaNameEditDialog
          isEditing={true}
          mediaName={(mediaFiles[editingMediaName]?.name || "Unknown Media")}
          editedMediaName={editedMediaNameValue}
          onClose={() => {
            setEditingMediaName(null);
            setEditedMediaNameValue("");
          }}
          onMediaNameChange={setEditedMediaNameValue}
          onUpdate={handleMediaNameUpdate}
        />
      )}

      <JsonEditorDialog
        showJsonEditor={showJsonEditor}
        jsonTemplate={jsonTemplate}
        editingMediaName={editingMediaName !== null ? (mediaFiles[editingMediaName]?.name) : null}
        onClose={() => {
          setShowJsonEditor(false);
          setEditingMediaName(null);
        }}
        onAddField={addJsonField}
        onRemoveField={removeJsonField}
        onEditField={editJsonField}
        onSaveTemplate={() => { setShowJsonEditor(false); }}
        onUpdateMetadata={handleMediaMetadataUpdate}
        presets={jsonTemplatePresets}
        onPresetSelect={(preset) => setJsonTemplate(JSON.parse(JSON.stringify(preset.template)))}
      />

      <SaveProjectDialog
        showSaveDialog={showSaveDialog}
        projectName={projectName}
        onClose={() => setShowSaveDialog(false)}
        onProjectNameChange={setProjectName}
        onSaveProject={(saveMethod) => saveProject(saveMethod)} // Pass the save method
        existingProjects={savedProjects}
      />

      <LoadProjectDialog
        showLoadDialog={showLoadDialog}
        savedProjects={savedProjects}
        onClose={() => setShowLoadDialog(false)}
        onFileSelected={handleProjectFileSelected}
        onLoadProject={loadProject}
        onDeleteProject={deleteProject}
        onLoadAndOpenBook={loadProjectAndOpenBook}
      />

      <EnlargedPreviewModal
        showEnlargedPreview={showEnlargedPreview}
        previewMedia={previewMedia}
        onClose={() => setShowEnlargedPreview(false)}
        onEditName={handleEditMediaNameFromPreview}
        onEditMetadata={handleEditMetadataFromPreview}
        onViewIn3D={handleViewIn3D}
        mediaList={modalMediaList}
        setPreviewMedia={setPreviewMedia}
        autoLoop={true}
        repeatPlaylistActive={repeatGridPlaylist}
        onToggleRepeatPlaylist={handleToggleRepeatGridPlaylist}
      />

      <FileOperationsExportDialog
        showDialog={showFileOperationsDialog}
        onClose={() => setShowFileOperationsDialog(false)}
        selectedMediaItems={selectedMediaItems.map(index => mediaFiles[index]).filter(Boolean)}
        onLogCommands={logGeneratedFileOperations}
      />

      {/* Book Viewer */}
      {showBookViewer && (
        <AnimatedBookViewer
          isOpen={showBookViewer}
          onClose={() => setShowBookViewer(false)}
          bookData={{
            pages: bookPages,
            volumeMetadata: bookVolumeMetadata,
            mediaFiles: mediaFiles
          }}
          volumeMetadata={bookVolumeMetadata}
          mediaFiles={mediaFiles}
          embedded={true}
        />
      )}

      {showBook3DViewer && (
        <Book3DViewerPanel
          isOpen={showBook3DViewer}
          onClose={() => setShowBook3DViewer(false)}
          gridSlots={gridSlots}
          freeGridItems={freeGridItems}
          mediaFiles={mediaFiles}
          gridConfig={gridConfig}
          pageMapping={pageMapping}
          onPageMappingConfirm={(mapping, metadata) => {
            setPageMapping(mapping);
            if (metadata) {
              setBookVolumeMetadata(metadata);
            }
          }}
          bookVolumeMetadata={bookVolumeMetadata}
          setBookVolumeMetadata={setBookVolumeMetadata}  // Add this line
          onAddMediaFiles={(mediaFiles) => {
            setMediaFiles(prev => [...prev, ...mediaFiles]);
          }}
          onSaveToBookshelf={handleSaveToBookshelf}
          darkMode={darkMode}
        />
      )}
      {showBookshelf && (
        <Bookshelf
          onClose={() => setShowBookshelf(false)}
          onBookSelect={(bookData) => {
            // Legacy support - still create a temporary project for old books
            const tempProject = {
              name: bookData.title || 'Imported Book',
              mediaFiles: [], // Books might not have full media data
              gridSlots: [],
              bookPages: bookData.pages,
              bookVolumeMetadata: bookData.volumeMetadata || {
                title: bookData.title,
                author: bookData.author,
                description: bookData.description
              },
              bookMode: true
            };

            // Load as project
            loadProject(tempProject);
            setShowBook3DViewer(true);
            setShowBookshelf(false);
          }}
          onApplyBookLayout={handleApplyBookLayout}
          getCurrentBookData={() => {
            const pages = ensureBookPages();
            return {
              title: bookVolumeMetadata.title || "Grid Book",
              author: bookVolumeMetadata.author || "Gridworm User",
              description: bookVolumeMetadata.description || "Generated from grid content",
              pages: pages,
              volumeMetadata: bookVolumeMetadata,
              metadata: {
                created: new Date().toISOString(),
                gridConfig: gridConfig,
                pageMapping: pageMapping,
                sourceType: freeGridMode ? 'freegrid' : 'standard',
                totalItems: freeGridMode ? Object.keys(freeGridItems).length : gridSlots.filter(Boolean).length,
                autoGenerated: !pageMapping
              }
            };
          }}
          darkMode={darkMode}
        />
      )}
    </div>
  );
};

export default EnhancedMediaGridApp;