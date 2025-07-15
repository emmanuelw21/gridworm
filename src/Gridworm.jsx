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
  Box, Pencil, Type, Eraser, RotateCw, MousePointer, Star
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
import TextPageCreator from './components/FreeGrid/TextPageCreator.jsx';

// Import Dialog Components
import ExportDialog from './components/Dialogs/ExportDialog.jsx';
import UpdateIndexDialog from './components/Dialogs/UpdateIndexDialog.jsx';

import JsonEditorDialog from './components/Dialogs/JsonEditorDialog.jsx';
import SaveProjectDialog from './components/Dialogs/SaveProjectDialog.jsx';
import LoadProjectDialog from './components/Dialogs/LoadProjectDialog.jsx';
import RemoveMediaDialog from './components/Dialogs/RemoveMediaDialog.jsx';
import FileOperationsExportDialog from './components/Dialogs/FileOperationsExportDialog.jsx';
import MissingFilesDialog from './components/Dialogs/MissingFilesDialog.jsx';
import DropdownMenu, { DropdownItem } from './components/UI/DropDownMenu.jsx';
import Bookshelf from './components/Bookshelf/Bookshelf.jsx';
import MainBookDisplay from './components/Bookshelf/MainBookDisplay.jsx';
import StarmiePanel from './components/Starmie/StarmiePanel.jsx';

// Import MediaGrid components
import EnlargedPreviewModal from './components/MediaGrid/EnlargedPreviewModal.jsx';

// Import helpers
import {
  getFilename, formatFileSize,
  processFile, getFileExtension, getFileTypeCategory,
  isVideo, isImage, isAudio, generateFileHash, createMissingMediaPlaceholder,
  extractMediaDimensions
} from './components/MediaGrid/helpers.js';
import { MediaStack, createMediaStack } from './components/MediaGrid/MediaStack.js';
import { extractPDFPages, isPDFFile, isSupportedDocument, getDocumentType } from './utils/pdfProcessor.js';
import { extractDocumentPages, isTextDocument, isWordDocument } from './utils/documentProcessor.js';
import MediaStackPreview from './components/MediaGrid/MediaStackPreview.jsx';
import PDFProcessingDialog from './components/Dialogs/PDFProcessingDialog.jsx';

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
  showStarmiePanelAtom,
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

// Helper to generate a book thumbnail from the first available media file
async function generateBookThumbnail(bookPages, mediaFiles) {
  if (!bookPages || !bookPages.length) return null;
  const firstPage = bookPages[0];
  const frontId = firstPage.front;
  const media = mediaFiles.find(m => m.id === frontId || m.name === frontId);
  if (media && media.thumbnail) return media.thumbnail;
  if (media && media.url && media.type && media.type.startsWith('image')) return media.url;
  // Optionally, generate a canvas-based placeholder or return a color
  return null;
}

// Helper to find missing media for a book
function getMissingMediaForBook(bookPages, mediaFiles) {
  const allRefs = [];
  bookPages.forEach(page => {
    if (page.front) allRefs.push(page.front);
    if (page.back) allRefs.push(page.back);
  });
  // Remove duplicates
  const uniqueRefs = Array.from(new Set(allRefs));
  // Find missing
  return uniqueRefs.filter(ref => !mediaFiles.some(m => m.id === ref || m.name === ref));
}

// Helper to create placeholders for missing media
function createPlaceholdersForMissing(missingRefs) {
  return missingRefs.map(ref => ({
    id: `placeholder-${ref}`,
    name: `[Missing] ${ref}`,
    type: 'placeholder',
    url: null,
    isPlaceholder: true,
    originalRef: ref,
    thumbnail: null
  }));
}

// Utility: Generate content-based media identity
const generateMediaIdentity = async (file) => {
  const contentHash = await generateFileHash(file); // SHA-256 of first 1MB + file size
  return {
    contentId: contentHash,
    fileName: file.name,
    fileSize: file.size,
    fingerprint: `${contentHash}-${file.size}-${file.name}`
  };
};

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
  const [showTextPageCreator, setShowTextPageCreator] = useState(false);
  const [showPDFProcessor, setShowPDFProcessor] = useState(false);
  const [processingPDF, setProcessingPDF] = useState(null);
  const [pdfProgress, setPdfProgress] = useState(0);
  const [showMediaStackPreview, setShowMediaStackPreview] = useState(false);
  const [previewingStack, setPreviewingStack] = useState(null);

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
  const [showConsolePanel, setShowConsolePanel] = useAtom(showConsolePanelAtom);
  const [showStarmiePanel, setShowStarmiePanel] = useAtom(showStarmiePanelAtom);
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
  const [showMissingFilesDialog, setShowMissingFilesDialog] = useState({ show: false, missingFiles: [] });
  
  // Bookshelf state
  const [bookshelfData, setBookshelfData] = useState(null);
  const [topShelfBooks, setTopShelfBooks] = useState([]);

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
    gltf: true, glb: true, obj: true, fbx: true, stl: true, ply: true, '3ds': true, dae: true,
    text: true, pdf: true
  });
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });

  // Resizing state
  const [isResizingMediaPanel, setIsResizingMediaPanel] = useState(false);
  const [isResizingConsolePanel, setIsResizingConsolePanel] = useState(false);

  // Enhanced storage hook
  const {
    saveProject: saveProjectToDB,
    loadProject: loadProjectFromDB,
    deleteProject: deleteProjectFromDB,
    projects: savedProjects
  } = useProjectStorage();

  // Computed values for tracking placeholders
  const placeholderInfo = useMemo(() => {
    const placeholders = mediaFiles.filter(m => m && (m.isPlaceholder || m.isMissing));
    return {
      count: placeholders.length,
      items: placeholders,
      hasPlaceholders: placeholders.length > 0
    };
  }, [mediaFiles]);

  // Refs - ONLY DECLARE ONCE
  const fileInputRef = useRef(null);
  const folderInputRef = useRef(null);
  const indexFileInputRef = useRef(null);

  // Notification helper - Move this BEFORE any usage
  const showNotification = useCallback((message, type = 'info') => {
    const notification = document.createElement('div');
    notification.className = `fixed bottom-4 right-4 px-4 py-2 rounded shadow-lg z-50 flex items-center ${
      type === 'success' ? 'bg-green-600 text-white' :
      type === 'error' ? 'bg-red-600 text-white' :
      type === 'warning' ? 'bg-yellow-500 text-black' :
      'bg-blue-600 text-white'
    }`;
    notification.innerHTML = `<span>${message}</span>`;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 4000);
  }, []);

  // Add this new function to handle replacements (moved after showNotification declaration)
  const handlePlaceholderReplacements = useCallback((replacements) => {
    console.log(`Processing ${replacements.length} placeholder replacements`);
    const replacementMap = new Map();
    replacements.forEach(({ placeholder, realFile }) => {
      replacementMap.set(placeholder.id, realFile.id);
      replacementMap.set(placeholder.originalRef, realFile.id);
      if (realFile.contentId) {
        replacementMap.set(realFile.contentId, realFile.id);
      }
    });
    setMediaFiles(prev => {
      const placeholderIds = replacements.map(r => r.placeholder.id);
      return prev.filter(m => !placeholderIds.includes(m.id));
    });
    setGridSlots(prev => prev.map(slot => {
      if (!slot) return null;
      const newId = replacementMap.get(slot.id) || replacementMap.get(slot.name);
      return newId ? mediaFiles.find(m => m.id === newId) || slot : slot;
    }));
    // TODO: Similar updates for atomPages, freeGridItems, etc.
  }, [mediaFiles, setMediaFiles, setGridSlots, setAtomPages]);

  // Safer placeholder replacement effect
  useEffect(() => {
    // Don't run during initial mount or if no media files
    if (mediaFiles.length === 0) return;
    
    // Use a ref to prevent infinite loops
    const checkForReplacements = () => {
      const placeholders = mediaFiles.filter(m => m && (m.isPlaceholder || m.isMissing));
      if (placeholders.length === 0) return;
      
      const regularFiles = mediaFiles.filter(m => m && !m.isPlaceholder && !m.isMissing);
      const replacements = [];
      
      placeholders.forEach(placeholder => {
        // Extract original name safely
        const originalName = placeholder.name ? placeholder.name.replace(/^\[Missing\]\s*/, '') : '';
        
        // Find matching real file
        const realFile = regularFiles.find(f => 
          f && f.name && (
            f.name === originalName || 
            f.name === placeholder.originalName ||
            (placeholder.originalRef && f.id === placeholder.originalRef)
          )
        );
        
        if (realFile) {
          replacements.push({ placeholder, realFile });
        }
      });
      
      // Process replacements outside of the iteration
      if (replacements.length > 0) {
        // Use setTimeout to avoid state updates during render
        setTimeout(() => {
          handlePlaceholderReplacements(replacements);
        }, 0);
      }
    };
    
    // Delay the check to avoid render issues
    const timeoutId = setTimeout(checkForReplacements, 100);
    
    return () => clearTimeout(timeoutId);
  }, [mediaFiles.length, handlePlaceholderReplacements]); // Only depend on length to avoid infinite loops

    // Add this new function to handle the actual loading
    const proceedWithBookLoad = (book) => {
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
        notification.innerHTML = `
        <div class="flex items-center">
          <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z">
            </path>
          </svg>
          <span>Book loaded with ${result.missingCount} missing files (placeholders created)</span>
        </div>
      `;
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 5000);
      } else {
        console.log(`Book "${book.title}" loaded successfully`);
      }
    };

  // Add handler for missing files dialog
  const handleMissingFilesDialogProceed = () => {
    if (showMissingFilesDialog.bookToLoad) {
      proceedWithBookLoad(showMissingFilesDialog.bookToLoad);
    }
    setShowMissingFilesDialog({ show: false, missingFiles: [] });
  };

  const handleMissingFilesDialogCancel = () => {
    setShowMissingFilesDialog({ show: false, missingFiles: [] });
  };

  const handleMissingFilesUpload = useCallback(async (uploadedFiles) => {
    // Process the uploaded files properly
    const processedFiles = await Promise.all(
      uploadedFiles.map(async (file) => {
        try {
          const mediaFile = new MediaFile(file);
          
          // Generate content ID for matching
          const identity = await generateMediaIdentity(file);
          mediaFile.contentId = identity.contentId;
          mediaFile.fingerprint = identity.fingerprint;
          
          // Generate thumbnails for videos
          const ext = mediaFile.name.split('.').pop().toLowerCase();
          if (mediaFile.type?.startsWith('video/') || ['webm', 'mp4', 'mov'].includes(ext)) {
            const thumbnailUrl = await enhancedThumbnailManager.getOrGenerateThumbnail(mediaFile);
            if (thumbnailUrl) {
              mediaFile.thumbnail = thumbnailUrl;
            }
          }
          
          return mediaFile;
        } catch (error) {
          console.error('Error processing file:', file.name, error);
          return null;
        }
      })
    );
  
    const validFiles = processedFiles.filter(f => f !== null);
    
    if (validFiles.length === 0) {
      showNotification('No valid files were processed', 'error');
      return;
    }
  
    // Get current placeholders (both book placeholders and general missing media placeholders)
    const currentPlaceholders = mediaFiles.filter(m => m.isPlaceholder || m.isMissing);
    const regularFiles = mediaFiles.filter(m => !m.isPlaceholder && !m.isMissing);
    
    // Create a map of existing files by name for quick lookup
    const existingFileMap = new Map(regularFiles.map(f => [f.name, f]));
    
    // Process each uploaded file
    const replacements = [];
    const newFiles = [];
    
    validFiles.forEach(file => {
      // Check if this file already exists
      if (existingFileMap.has(file.name)) {
        console.log(`File ${file.name} already exists, skipping`);
        return;
      }
      
      // Find matching placeholder by various criteria
      const matchingPlaceholder = currentPlaceholders.find(ph => {
        // Match by original name
        if (ph.originalName === file.name) return true;
        
        // Match by name (removing [Missing] prefix if present)
        const placeholderName = ph.name.replace(/^\[Missing\]\s*/, '');
        if (placeholderName === file.name) return true;
        
        // Match by content ID if available
        if (ph.contentId && file.contentId && ph.contentId === file.contentId) return true;
        
        // Match by original ref
        if (ph.originalRef === file.name || ph.originalRef === file.id) return true;
        
        return false;
      });
      
      if (matchingPlaceholder) {
        // Keep the same ID to maintain references
        file.id = matchingPlaceholder.id;
        replacements.push({ placeholder: matchingPlaceholder, realFile: file });
      } else {
        newFiles.push(file);
      }
    });
    
    // Update media files - replace placeholders with real files
    setMediaFiles(prev => {
      return prev.map(m => {
        const replacement = replacements.find(r => r.placeholder.id === m.id);
        return replacement ? replacement.realFile : m;
      }).concat(newFiles);
    });
    
    // Update grid slots
    setGridSlots(prev => {
      return prev.map(slot => {
        if (!slot) return null;
        
        const replacement = replacements.find(r => r.placeholder.id === slot.id);
        return replacement ? replacement.realFile : slot;
      });
    });
    
    // Update atom pages
    if (atomPages.length > 0) {
      setAtomPages(prev => {
        return prev.map(page => {
          let updated = { ...page };
          
          replacements.forEach(({ placeholder, realFile }) => {
            // Use the file name or ID for page references
            const newRef = realFile.name || realFile.id;
            
            // Check various ways the placeholder might be referenced
            const placeholderRefs = [
              placeholder.name,
              placeholder.id,
              placeholder.originalRef,
              placeholder.originalName,
              placeholder.name.replace(/^\[Missing\]\s*/, '')
            ].filter(Boolean);
            
            placeholderRefs.forEach(ref => {
              if (page.front === ref) {
                updated.front = newRef;
              }
              if (page.back === ref) {
                updated.back = newRef;
              }
            });
          });
          
          return updated;
        });
      });
    }
    
    // Update free grid items
    if (Object.keys(freeGridItems).length > 0) {
      setFreeGridItems(prev => {
        const updated = { ...prev };
        Object.entries(updated).forEach(([key, item]) => {
          const replacement = replacements.find(r => r.placeholder.id === item.mediaId);
          if (replacement) {
            updated[key] = { ...item, mediaId: replacement.realFile.id };
          }
        });
        return updated;
      });
    }
    
    // Close the dialog if it's open
    if (showMissingFilesDialog.show) {
      setShowMissingFilesDialog({ show: false, missingFiles: [] });
    }
    
    // Show success notification
    const message = replacements.length > 0 
      ? `Replaced ${replacements.length} placeholder(s) with real files!`
      : `Added ${newFiles.length} new file(s)!`;
    showNotification(message, 'success');
    
    // If we have a book to load and all missing files are resolved, proceed with loading
    if (showMissingFilesDialog.bookToLoad && replacements.length === showMissingFilesDialog.missingFiles.length) {
      setTimeout(() => {
        proceedWithBookLoad(showMissingFilesDialog.bookToLoad);
      }, 100);
    }
  }, [mediaFiles, atomPages, freeGridItems, setMediaFiles, setGridSlots, setAtomPages, setFreeGridItems, showNotification, showMissingFilesDialog, proceedWithBookLoad]);

  // Initialize database migration and load bookshelf
  useEffect(() => {
    const initializeDatabase = async () => {
      try {
        await migrateFromLocalStorage();
        console.log('Database migration completed');
      } catch (error) {
        console.error('Database migration failed:', error);
      }
    };

    const loadBookshelfData = () => {
      try {
        const saved = localStorage.getItem('gridworm_bookshelf_data_v5');
        if (saved) {
          const data = JSON.parse(saved);
          setBookshelfData(data);
          // Set top shelf books (first shelf)
          if (data.shelves && data.shelves.length > 0) {
            setTopShelfBooks(data.shelves[0].books || []);
          }
        }
      } catch (error) {
        console.error('Error loading bookshelf data:', error);
      }
    };

    initializeDatabase();
    loadBookshelfData();
    
    // Listen for storage changes
    const handleStorageChange = (e) => {
      if (e.key === 'gridworm_bookshelf_data_v5') {
        loadBookshelfData();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
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
  }, [pageMapping, generateDefaultBook, freeGridMode, freeGridItems, mediaFiles, gridSlots]);

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

  // Handle PDF processing
  const handleDocumentFile = useCallback(async (documentFile) => {
    setProcessingPDF(documentFile);
    setShowPDFProcessor(true);
    
    try {
      let result;
      const docType = getDocumentType(documentFile);
      
      if (isPDFFile(documentFile)) {
        // Extract pages from PDF
        result = await extractPDFPages(documentFile, {
          maxPages: 100, // Limit for performance
          extractText: true,
          thumbnailScale: 1.5,
          onProgress: (progress) => {
            console.log(`Processing PDF: ${progress.percentage}%`);
            setPdfProgress(progress.percentage);
          }
        });
      } else if (isTextDocument(documentFile) || isWordDocument(documentFile)) {
        // Extract pages from text/Word documents
        result = await extractDocumentPages(documentFile, {
          maxPages: 100,
          onProgress: (progress) => {
            console.log(`Processing ${docType}: ${progress.percentage}%`);
            setPdfProgress(progress.percentage);
          }
        });
      } else {
        throw new Error('Unsupported document type');
      }
      
      // Create MediaStack
      const stack = createMediaStack(documentFile, result.pages);
      
      // Add to media files
      setMediaFiles(prev => [...prev, stack]);
      
      // Show success notification
      showNotification(`${docType.toUpperCase()} processed: ${result.pages.length} pages extracted`, 'success');
      
      setShowPDFProcessor(false);
      setProcessingPDF(null);
    } catch (error) {
      console.error('Error processing document:', error);
      showNotification('Failed to process document: ' + error.message, 'error');
      setShowPDFProcessor(false);
      setProcessingPDF(null);
    }
  }, [showNotification]);

  // File handling
  const handleFilesSelected = useCallback(async (inputFiles) => {
    // Separate documents from other files
    const files = Array.from(inputFiles);
    const documentFiles = files.filter(isSupportedDocument);
    const otherFiles = files.filter(f => !isSupportedDocument(f));
    
    // Handle documents separately
    for (const docFile of documentFiles) {
      await handleDocumentFile(docFile);
    }
    
    // Process other files normally
    if (otherFiles.length === 0) return;
    const processedFiles = await Promise.all(otherFiles.map(async rawFile => {
      let processed = processFile(rawFile);
      if (!processed) return null;
      const identity = await generateMediaIdentity(rawFile);
      processed.contentId = identity.contentId;
      processed.fingerprint = identity.fingerprint;
      // Generate thumbnail for videos
      if (isVideo(processed.type) && typeof enhancedThumbnailManager?.getOrGenerateThumbnail === 'function') {
        processed.thumbnail = await enhancedThumbnailManager.getOrGenerateThumbnail(processed);
      }
      return processed;
    }));

    setMediaFiles(prev => {
      let updated = [...prev];
      for (const newFile of processedFiles) {
        if (!newFile) continue;
        // Find a broken real media item (not placeholder) by contentId or (name+size)
        const brokenIdx = updated.findIndex(f =>
          !f.isPlaceholder &&
          (
            (f.contentId && f.contentId === newFile.contentId) ||
            (f.name === newFile.name && f.size === newFile.size)
          ) &&
          (!f.url || !f.thumbnail || f.isMissing)
        );
        if (brokenIdx !== -1) {
          // Revoke old object URL if present
          if (updated[brokenIdx].url && updated[brokenIdx].url.startsWith('blob:')) {
            URL.revokeObjectURL(updated[brokenIdx].url);
          }
          if (updated[brokenIdx].thumbnail && updated[brokenIdx].thumbnail.startsWith('blob:')) {
            URL.revokeObjectURL(updated[brokenIdx].thumbnail);
          }
          // Create a new object URL for the new file
          let newUrl = newFile.url;
          if (newFile.file && typeof newFile.file === 'object') {
            newUrl = URL.createObjectURL(newFile.file);
          }
          // Regenerate thumbnail (for videos, images, etc.)
          let newThumbnail = newFile.thumbnail;
          if (isVideo(newFile.type) && typeof enhancedThumbnailManager?.getOrGenerateThumbnail === 'function') {
            newThumbnail = enhancedThumbnailManager.getOrGenerateThumbnail({ ...newFile, url: newUrl });
          } else if (newFile.file && newFile.type && newFile.type.startsWith('image/')) {
            newThumbnail = newUrl;
          }
          const updatedMedia = {
            ...updated[brokenIdx],
            ...newFile,
            url: newUrl,
            thumbnail: newThumbnail,
            isMissing: false,
            isPlaceholder: false,
          };
          updated[brokenIdx] = updatedMedia;
          
          // Extract dimensions asynchronously after updating
          extractMediaDimensions(updatedMedia).then(dimensions => {
            if (dimensions) {
              setMediaFiles(prev => prev.map(m => 
                m.id === updatedMedia.id 
                  ? { ...m, metadata: { ...m.metadata, ...dimensions } }
                  : m
              ));
            }
          });
          // Update all references in gridSlots and atomPages by id
          setGridSlots(slots => slots.map(slot => slot && slot.id === updatedMedia.id ? updatedMedia : slot));
          setAtomPages(pages => pages.map(page => {
            const newPage = { ...page };
            if (newPage.front && newPage.front.id === updatedMedia.id) newPage.front = updatedMedia;
            if (newPage.back && newPage.back.id === updatedMedia.id) newPage.back = updatedMedia;
            return newPage;
          }));
        } else {
          // Only add if not a duplicate by contentId
          if (!updated.some(f => f.contentId === newFile.contentId)) {
            updated.push(newFile);
            
            // Extract dimensions asynchronously after adding
            extractMediaDimensions(newFile).then(dimensions => {
              if (dimensions) {
                setMediaFiles(prev => prev.map(m => 
                  m.id === newFile.id 
                    ? { ...m, metadata: { ...m.metadata, ...dimensions } }
                    : m
                ));
              }
            });
          }
        }
      }
      return updated;
    });
  }, [setMediaFiles, setGridSlots, setAtomPages, handleDocumentFile]);

  const handleUploadFiles = () => fileInputRef.current.click();
  const handleUploadFolder = () => folderInputRef.current.click();

  // Main book display handlers
  const handleMainBookClick = (book) => {
    // Apply the book layout directly
    handleApplyBookLayout(book);
  };
  
  const handleReorderTopShelfBooks = (fromIndex, toIndex) => {
    const newBooks = [...topShelfBooks];
    const [movedBook] = newBooks.splice(fromIndex, 1);
    newBooks.splice(toIndex, 0, movedBook);
    setTopShelfBooks(newBooks);
    
    // Update localStorage
    if (bookshelfData) {
      const updatedData = {
        ...bookshelfData,
        shelves: bookshelfData.shelves.map((shelf, index) => 
          index === 0 ? { ...shelf, books: newBooks } : shelf
        )
      };
      localStorage.setItem('gridworm_bookshelf_data_v5', JSON.stringify(updatedData));
      setBookshelfData(updatedData);
    }
  };

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

    // Optionally update atomPages, freeGridItems, etc. as needed
    // (restore original logic if it existed)

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
        // Check if it's a text page first
        if (media.isTextPage || media.metadata?.isTextPage) {
          return fileTypeFilters['text'] === true;
        }
        
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
    const textExts = ['text', 'pdf'];

    if (category === 'all') {
      setFileTypeFilters(prev => {
        const newFilters = { ...prev };
        [...imageExts, ...videoExts, ...audioExts, ...threeDExts, ...textExts].forEach(ext => newFilters[ext] = true);
        return newFilters;
      });
      return;
    }

    let extsToChange;
    if (category === 'image') extsToChange = imageExts;
    else if (category === 'video') extsToChange = videoExts;
    else if (category === 'audio') extsToChange = audioExts;
    else if (category === '3d') extsToChange = threeDExts;
    else if (category === 'text') extsToChange = textExts;
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
    let mediaObject = null;

    if (dropData.type === 'file') {
      const processed = processFile(dropData.file);
      if (!processed) return;

      // Add to media files
      setMediaFiles(prev => [...prev, processed]);
      mediaId = processed.id;
      mediaObject = processed;
    } else if (dropData.type === 'internal_media') {
      const media = mediaFiles[dropData.mediaOriginalIndex];
      if (media) {
        mediaId = media.id;
        mediaObject = media;
      }
    }

    if (mediaId && mediaObject) {
      // For manual drag & drop, use actual media dimensions scaled to 40%
      let width, height;
      const scaleFactor = 0.4; // 40% of original size
      
      if (mediaObject.metadata?.width && mediaObject.metadata?.height) {
        // Use actual dimensions scaled down to 40%
        width = mediaObject.metadata.width * scaleFactor;
        height = mediaObject.metadata.height * scaleFactor;
      } else {
        // Fallback to grid config if no dimensions yet
        width = gridConfig.cellWidth;
        height = gridConfig.cellHeight;
        
        // Extract dimensions asynchronously and update
        extractMediaDimensions(mediaObject).then(dimensions => {
          if (dimensions) {
            // Update media object
            mediaObject.metadata = { ...mediaObject.metadata, ...dimensions };
            
            // Update the free grid item with 40% scaled dimensions
            setFreeGridItems(prev => ({
              ...prev,
              [newItemId]: {
                ...prev[newItemId],
                width: dimensions.width * scaleFactor,
                height: dimensions.height * scaleFactor
              }
            }));
          }
        });
      }
      
      setFreeGridItems(prev => ({
        ...prev,
        [newItemId]: {
          mediaId,
          x: dropData.position?.x || 100,
          y: dropData.position?.y || 100,
          z: is3DMode ? 0 : undefined,
          width: width,
          height: height,
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
            const response = await fetch(file.url, { method: 'HEAD' });
            if (!response.ok) {
              return { 
                ...file, 
                isMissing: true, 
                isPlaceholder: true,
                originalUrl: file.url,
                originalName: file.name,
                contentId: file.contentId,
                url: null,
                thumbnail: file.thumbnail
              };
            }
            return { ...file, isMissing: false };
          } catch (error) {
            return { 
              ...file, 
              isMissing: true,
              isPlaceholder: true,
              originalUrl: file.url,
              originalName: file.name,
              contentId: file.contentId,
              url: null,
              thumbnail: file.thumbnail
            };
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
 
  const handleConsolePanelResize = useCallback((e) => {
    const newWidth = window.innerWidth - e.clientX;
    const minWidth = 200;
    const maxWidth = window.innerWidth / 2;
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
      const mediaItem = mediaFiles[originalIndex];
      setEditingMediaName(originalIndex);
      setJsonTemplate(mediaItem.metadata || {
        title: mediaItem.name.split('.')[0],
        description: "",
        category: getFileTypeCategory(mediaItem)
      });
      setShowJsonEditor(true);
    }
  };
 
  const handleMediaMetadataUpdate = (newMetadata, newName) => {
    if (editingMediaName !== null && mediaFiles[editingMediaName]) {
      const mediaItem = mediaFiles[editingMediaName];
      const oldName = mediaItem.name;
      // Handle name change if provided
      let finalName = newName || oldName;
      if (newName && newName !== oldName) {
        // Extract file extension from original name
        const lastDotIndex = oldName.lastIndexOf('.');
        const extension = lastDotIndex !== -1 ? oldName.substring(lastDotIndex) : '';
        // Ensure the new name has the same extension
        if (extension && !finalName.endsWith(extension)) {
          finalName = finalName + extension;
        }
      }
      // Create updated media object with both name and metadata
      const updatedMedia = {
        ...mediaItem,
        name: finalName,
        metadata: {
          ...newMetadata,
          originalFileName: mediaItem.metadata?.originalFileName || oldName
        },
        id: mediaItem.id,
        type: mediaItem.type,
        size: mediaItem.size,
        date: mediaItem.date,
        url: mediaItem.url,
        thumbnail: mediaItem.thumbnail,
        thumbnailTimestamp: mediaItem.thumbnailTimestamp,
        userPath: mediaItem.userPath,
      };
      setMediaFiles(prev => {
        const newFiles = [...prev];
        newFiles[editingMediaName] = updatedMedia;
        return newFiles;
      });
      setGridSlots(prev => prev.map(slot => (slot && slot.id === mediaItem.id) ? updatedMedia : slot));
      setFreeGridItems(prev => ({ ...prev }));
      if (previewMedia && previewMedia.id === mediaItem.id) {
        setPreviewMedia(updatedMedia);
      }
      console.log(`Media updated: ${oldName} -> ${finalName}`);
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
        handleEditMetadata(originalIndex);
        setShowEnlargedPreview(false);
      }
    }
  };
 
  // Preview handling
  const openEnlargedPreview = (media, specificList = null) => {
    // Check if media is a MediaStack
    if (media && media.isStack) {
      setPreviewingStack(media);
      setShowMediaStackPreview(true);
      return;
    }
    
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
      showConsolePanel,
      show3DViewport,
      mediaPanelCollapsed,
      mediaPanelPinned,
      mediaPanelLayout,
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
      setShowConsolePanel(projectData.showConsolePanel || false);
      setShow3DViewport(projectData.show3DViewport || false);
      setMediaPanelCollapsed(projectData.mediaPanelCollapsed || false);
      setMediaPanelPinned(projectData.mediaPanelPinned || false);
      if (projectData.mediaPanelLayout) setMediaPanelLayout(projectData.mediaPanelLayout);
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
      const missingCount = restoredMediaFileObjects.filter(f => f.isPlaceholder && !f.isTextPage).length;
 
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
      // First, check for missing files
      const missingFiles = [];
 
      book.pages.forEach(page => {
        [page.front, page.back].forEach(item => {
          if (!item || item === 'blank') return;
 
          const itemName = typeof item === 'object' ? (item.name || item.id) : item;
          const found = mediaFiles.some(m =>
            m.name === itemName ||
            m.id === itemName ||
            m.name === item
          );
 
          if (!found && !missingFiles.includes(itemName)) {
            missingFiles.push(itemName);
          }
        });
      });
 
      // If more than 3 files are missing, show dialog
      if (missingFiles.length >= 3) {
        setShowMissingFilesDialog({
          show: true,
          missingFiles,
          bookToLoad: book
        });
        return;
      }
 
      // Otherwise, proceed with loading
      proceedWithBookLoad(book);
    } catch (error) {
      console.error('Error applying book layout:', error);
      alert('Error loading book: ' + error.message);
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
 
  const addJsonField = (currentPath, key, defaultValue = "") => {
    setJsonTemplate(prev => {
      const newTemplate = { ...prev };
      const pathParts = currentPath.split('.').filter(p => p);
      let current = newTemplate;
      
      for (let part of pathParts) {
        if (!current[part]) current[part] = {};
        current = current[part];
      }
      
      current[key] = defaultValue;
      return newTemplate;
    });
  };
  
  const removeJsonField = (currentPath, key) => {
    setJsonTemplate(prev => {
      const newTemplate = { ...prev };
      const pathParts = currentPath.split('.').filter(p => p);
      let current = newTemplate;
      
      for (let i = 0; i < pathParts.length - 1; i++) {
        current = current[pathParts[i]];
      }
      
      if (pathParts.length > 0) {
        delete current[pathParts[pathParts.length - 1]];
      } else {
        delete newTemplate[key];
      }
      
      return newTemplate;
    });
  };
  
  const editJsonField = (fullPath, value) => {
    setJsonTemplate(prev => {
      const newTemplate = { ...prev };
      const pathParts = fullPath.split('.').filter(p => p);
      let current = newTemplate;
      
      for (let i = 0; i < pathParts.length - 1; i++) {
        if (!current[pathParts[i]]) current[pathParts[i]] = {};
        current = current[pathParts[i]];
      }
      
      if (pathParts.length > 0) {
        current[pathParts[pathParts.length - 1]] = value;
      }
      
      return newTemplate;
    });
  };
 
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
      else if (isResizingConsolePanel) handleConsolePanelResize(e);
    };
 
    const handleMouseUp = () => {
      setIsResizingMediaPanel(false);
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
      else if (isResizingConsolePanel) handleConsolePanelResize(e);
      else if (isResizing3DViewport) handle3DViewportResize(e);
    };
 
    const handleMouseUp = () => {
      setIsResizingMediaPanel(false);
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

  // Handler for text page creation - add to media panel only
  const handleTextPageAddToMediaPanel = useCallback((textPages) => {
    handleAddMediaFiles(textPages);
  }, [handleAddMediaFiles]);

  // Handler for text page creation - add directly to grid and book
  const handleTextPageExportToGrid = useCallback((textPages) => {
    // Add to media files first
    handleAddMediaFiles(textPages);
    
    // Also update book pages if in book mode
    if (atomPages.length > 0 || bookMode) {
      const newBookPages = textPages.map(page => ({
        id: page.id,
        name: page.name,
        url: page.url || page.thumbnail
      }));
      setAtomPages(prev => [...prev, ...newBookPages]);
      
      // Log the addition
      addCommandToHistory('book-update', {
        action: 'add-text-pages',
        count: textPages.length,
        timestamp: new Date().toISOString()
      }, 'info');
    }
  }, [handleAddMediaFiles, atomPages.length, bookMode, setAtomPages, addCommandToHistory]);

  // Handler for extracting pages from MediaStack
  const handleExtractStackPages = useCallback((pageIndices) => {
    if (!previewingStack) return;
    
    const extractedPages = previewingStack.extractPages(pageIndices);
    if (extractedPages.length > 0) {
      // Convert to text pages for the text creator
      const textPages = extractedPages.map((page, index) => {
        const pageData = previewingStack.pages[pageIndices[index]];
        return {
          ...page,
          isTextPage: true,
          textContent: pageData.textContent || '',
          thumbnail: pageData.thumbnail,
          metadata: {
            ...page.metadata,
            isTextPage: true,
            extractedFromPDF: true
          }
        };
      });
      
      // Open text page creator with extracted pages
      setShowTextPageCreator(true);
      // Add pages to text page creator collection
      handleTextPageAddToMediaPanel(textPages);
      
      showNotification(`Extracted ${extractedPages.length} pages`, 'success');
    }
  }, [previewingStack, handleTextPageAddToMediaPanel, showNotification]);

  // Handler for extracting all pages from MediaStack
  const handleExtractAllStackPages = useCallback(() => {
    if (!previewingStack) return;
    
    const allIndices = Array.from({ length: previewingStack.pageCount }, (_, i) => i);
    handleExtractStackPages(allIndices);
  }, [previewingStack, handleExtractStackPages]);
 
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
    // 1. Add to media panel
    handleAddMediaFiles(pageDataArray);
 
    // 2. Add to grid at correct position (before back cover, or at end)
    setGridSlots(prevGrid => {
      let newGrid = [...prevGrid];
      // Find the index of the back cover (if any)
      const backCoverIdx = newGrid.findIndex(item => item && item.metadata && item.metadata.isBackCover);
      // Insert before back cover, or at end if no back cover
      const insertIdx = backCoverIdx !== -1 ? backCoverIdx : newGrid.length;
      // Remove nulls at the end to avoid trailing empty slots
      while (newGrid.length > 0 && newGrid[newGrid.length - 1] === null) newGrid.pop();
      // Insert all new text pages
      newGrid.splice(insertIdx, 0, ...pageDataArray);
      return newGrid;
    });
 
    // 3. Optionally, add to book pages/atomPages if needed (if you want text pages to be part of logical book)
    setAtomPages(prevPages => {
      if (!prevPages || prevPages.length === 0) return prevPages;
      // Insert before back cover, or at end
      const backCoverIdx = prevPages.findIndex(page => page && page.isBackCover);
      const insertIdx = backCoverIdx !== -1 ? backCoverIdx : prevPages.length;
      const newPages = [...prevPages];
      newPages.splice(insertIdx, 0, ...pageDataArray.map(tp => ({ front: tp.id, back: null })));
      return newPages;
    });
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
 
  const handleSaveToBookshelf = useCallback(async (bookData) => {
    try {
      console.log('Saving book to bookshelf:', bookData.title);
      if (!bookData || !bookData.title || !bookData.pages) {
        throw new Error('Invalid book data - missing required fields');
      }
      const BOOKSHELF_STORAGE_KEY = 'gridworm_bookshelf_data_v5';
      const existingData = localStorage.getItem(BOOKSHELF_STORAGE_KEY);
      let bookshelfData = { shelves: [{ id: 'default', books: [] }], version: '1.0' };
      if (existingData) {
        const parsed = JSON.parse(existingData);
        if (Array.isArray(parsed)) {
          bookshelfData = {
            shelves: [{ id: 'default', books: parsed }],
            version: '1.0'
          };
        } else {
          bookshelfData = parsed;
        }
      }
      // Generate thumbnail for the book
      const thumbnail = await generateBookThumbnail(bookData.pages, mediaFiles);
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
        thumbnail, // Add the generated thumbnail
        metadata: {
          ...bookData.metadata,
          addedToShelf: new Date().toISOString(),
          source: 'book_viewer'
        }
      };
      if (!bookshelfData.shelves[0]) {
        bookshelfData.shelves[0] = { id: 'default', books: [] };
      }
      bookshelfData.shelves[0].books.unshift(canonicalBook);
      localStorage.setItem(BOOKSHELF_STORAGE_KEY, JSON.stringify(bookshelfData));
      showNotification(`"${bookData.title}" saved to bookshelf!`, 'success');
      console.log('Book saved to bookshelf successfully');
      return true;
    } catch (error) {
      console.error('Error saving book to bookshelf:', error);
      showNotification('Error saving book: ' + error.message, 'error');
      throw error;
    }
  }, [showNotification, mediaFiles]);
 
  // Handler for loading a book from the bookshelf
  const handleBookSelect = useCallback((book) => {
    // 1. Find missing media
    const missingRefs = getMissingMediaForBook(book.pages, mediaFiles);
    if (missingRefs.length >= 3) {
      setShowMissingFilesDialog({ show: true, missingFiles: missingRefs });
    }
    // 2. Create placeholders for missing media
    const placeholders = createPlaceholdersForMissing(missingRefs);
    // 3. Add placeholders to media panel (do not remove existing media)
    setMediaFiles(prev => {
      // Avoid duplicate placeholders
      const existingIds = new Set(prev.map(m => m.id));
      return [...prev, ...placeholders.filter(ph => !existingIds.has(ph.id))];
    });
    // 4. Replace missing refs in grid and book pages with placeholders
    const gridItems = [];
    const processedPages = book.pages.map(page => {
      const processedPage = { ...page };
      // Front
      if (page.front && !mediaFiles.some(m => m.id === page.front || m.name === page.front)) {
        processedPage.front = `placeholder-${page.front}`;
        gridItems.push(placeholders.find(ph => ph.id === `placeholder-${page.front}`));
      } else if (page.front) {
        gridItems.push(mediaFiles.find(m => m.id === page.front || m.name === page.front));
      }
      // Back
      if (page.back && !mediaFiles.some(m => m.id === page.back || m.name === page.back)) {
        processedPage.back = `placeholder-${page.back}`;
        gridItems.push(placeholders.find(ph => ph.id === `placeholder-${page.back}`));
      } else if (page.back) {
        gridItems.push(mediaFiles.find(m => m.id === page.back || m.name === page.back));
      }
      return processedPage;
    });
    // 5. Update grid and book state
    const emptyGrid = new Array(gridConfig.columns * gridConfig.rows).fill(null);
    const newGrid = [...emptyGrid];
    gridItems.forEach((item, index) => {
      if (item && index < newGrid.length) {
        newGrid[index] = item;
      }
    });
    setGridSlots(newGrid);
    setAtomPages(processedPages);
    setBookVolumeMetadata(book.volumeMetadata || {});
    showNotification('Book loaded successfully!', 'success');
    if (placeholders.length > 0) {
      setTimeout(() => {
        showNotification(
          `${placeholders.length} media files are missing. Placeholders added to media panel.`,
          'warning'
        );
      }, 1000);
    }
    setShowBookshelf(false);
    setShowBook3DViewer(true);
    setCurrentBookPage(0);
  }, [mediaFiles, gridConfig, setMediaFiles, setGridSlots, setAtomPages, setBookVolumeMetadata, showNotification]);
 
  // Handler to mark a media item as a placeholder when it fails to load
  const handleMarkMediaAsPlaceholder = useCallback((mediaId, mediaName) => {
    setMediaFiles(prev => prev.map(m => {
      if (m.id === mediaId) {
        // Release the URL if it exists
        if (m.releaseUrl && typeof m.releaseUrl === 'function') {
          m.releaseUrl();
        }
        // Create placeholder using helper
        return createMissingMediaPlaceholder(m);
      }
      return m;
    }));
    
    // Show notification about the missing file
    showNotification(`File moved or missing: ${mediaName || 'Unknown'}`, 'warning');
  }, [setMediaFiles, showNotification]);

  // Handler for finding missing files
  const handleFindMissingFiles = useCallback(() => {
    const missingFileNames = placeholderInfo.items.map(item => 
      item.originalName || item.name.replace(/^\[Missing\]\s*/, '')
    );
    setShowMissingFilesDialog({ show: true, missingFiles: missingFileNames });
  }, [placeholderInfo.items]);
 
  return (
    <div id="app-container" className="flex flex-col h-screen bg-gray-100 dark:bg-gray-900 transition-colors duration-300">
      {/* Header - Simplified */}
      <div className="flex items-center justify-between space-x-2 p-2 bg-gray-200 dark:bg-gray-700 shadow-md flex-wrap">
        <div className="flex items-center space-x-2 flex-1">
          <img
            src={darkMode ? "/gridworm-02.png" : "/gridworm-01.png"}
            alt="Gridworm logo"
            className="h-12 sm:h-14 w-auto"
          />
          
          {/* Bookshelf Button */}
          <button
            onClick={() => setShowBookshelf(true)}
            title="View Bookshelf"
            className="flex items-center px-2 sm:px-3 py-1 sm:py-1.5 text-white bg-purple-600 rounded hover:bg-purple-700 transition-colors text-xs sm:text-sm"
          >
            <Book size={14} className="mr-1 sm:mr-1.5" /> Bookshelf
          </button>
          
          {/* Main Book Display - inline in header */}
          {topShelfBooks.length > 0 && (
            <div className="flex-1 mx-2">
              <MainBookDisplay
                books={topShelfBooks}
                onBookClick={handleMainBookClick}
                onReorderBooks={handleReorderTopShelfBooks}
                darkMode={darkMode}
                inline={true}
              />
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-1 sm:space-x-2 flex-wrap gap-y-1 sm:gap-y-2">
          {/* Project operations */}
          <button onClick={() => setShowSaveDialog(true)} title="Save current project layout" className="flex items-center px-2 sm:px-3 py-1 sm:py-1.5 text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors text-xs sm:text-sm">
            <Save size={14} className="mr-1 sm:mr-1.5" /> Save
          </button>
          <button onClick={() => setShowLoadDialog(true)} title="Load a saved project" className="flex items-center px-2 sm:px-3 py-1 sm:py-1.5 text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors text-xs sm:text-sm">
            <Download size={14} className="mr-1 sm:mr-1.5" /> Load
          </button>
          <button
            onClick={handleOpenFileOperationsDialog}
            title="Export rename/move commands for selected files"
            className="flex items-center px-2 sm:px-3 py-1 sm:py-1.5 text-white bg-teal-600 rounded hover:bg-teal-700 transition-colors text-xs sm:text-sm"
            disabled={selectedMediaItems.length === 0}
          >
            <Terminal size={14} className="mr-1 sm:mr-1.5" /> Ops
          </button>

          {/* Find Missing Files button - only show when there are placeholders */}
          {placeholderInfo.hasPlaceholders && (
            <button
              onClick={handleFindMissingFiles}
              title={`Find ${placeholderInfo.count} missing file${placeholderInfo.count > 1 ? 's' : ''}`}
              className="flex items-center px-2 sm:px-3 py-1 sm:py-1.5 text-white bg-amber-600 rounded hover:bg-amber-700 transition-colors text-xs sm:text-sm animate-pulse"
            >
              <FileX size={14} className="mr-1 sm:mr-1.5" /> 
              <span>Find Missing ({placeholderInfo.count})</span>
            </button>
          )}
 
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

          {/* Starmie Panel toggle */}
          <button
            onClick={() => setShowStarmiePanel(!showStarmiePanel)}
            title="Toggle Starmie ComfyUI Connection"
            className={`flex items-center px-2 py-1 sm:px-3 sm:py-1.5 text-white rounded transition-colors text-xs sm:text-sm ${showStarmiePanel ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-gray-500 hover:bg-gray-600'
              }`}
          >
            <Star size={14} className="mr-0 sm:mr-1.5" />
            <span className="hidden sm:inline">Starmie</span>
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
        accept="image/*,video/*,audio/*,application/pdf,text/plain,text/markdown,application/rtf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.jpg,.jpeg,.png,.gif,.webp,.svg,.mp4,.webm,.mov,.avi,.mkv,.mp3,.wav,.ogg,.flac,.gltf,.glb,.obj,.fbx,.stl,.ply,.3ds,.dae,.pdf,.txt,.md,.rtf,.doc,.docx"
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
            onMediaMissing={handleMarkMediaAsPlaceholder}
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

              {/* Text Page Creator */}
              <button
                onClick={() => setShowTextPageCreator(true)}
                title="Create text pages"
                className="flex items-center px-2 py-1 sm:px-3 sm:py-1.5 text-white bg-orange-600 hover:bg-orange-700 rounded transition-colors text-xs sm:text-sm"
              >
                <FileText size={14} className="mr-0 sm:mr-1.5" />
                <span className="hidden sm:inline">Text Pages</span>
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
                onAddToMediaPanel={handleTextPageAddToMediaPanel}
                onPageMappingConfirm={handlePageMappingConfirm}
                handleUploadFiles={handleUploadFiles}
                onExportPagesToMainGrid={handleCreateTextPages}
                darkMode={darkMode}
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
          onMediaMissing={handleMarkMediaAsPlaceholder}
        />
 
        <ConsolePanel
          showConsolePanel={showConsolePanel}
          consolePanelWidth={consolePanelWidth}
          commandHistory={commandHistory}
          onClose={() => setShowConsolePanel(false)}
          onClearHistory={clearCommandHistory}
          onBeginResizing={() => setIsResizingConsolePanel(true)}
        />

        {/* Starmie Panel */}
        <StarmiePanel
          onImport={handleAddMediaFiles}
          darkMode={darkMode}
          showNotification={showNotification}
          isVisible={showStarmiePanel}
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
        <JsonEditorDialog
          showJsonEditor={showJsonEditor}
          jsonTemplate={jsonTemplate}
          editingMediaName={editingMediaName !== null ? (mediaFiles[editingMediaName]?.name) : null}
          mediaItem={editingMediaName !== null ? mediaFiles[editingMediaName] : null}
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
      )}
 
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
 
      {showMissingFilesDialog.show && (
        <MissingFilesDialog
          missingFiles={showMissingFilesDialog.missingFiles}
          onProceed={handleMissingFilesDialogProceed}
          onCancel={handleMissingFilesDialogCancel}
          onUploadFiles={handleMissingFilesUpload}
          darkMode={darkMode}
        />
      )}

      {/* Text Page Creator */}
      {showTextPageCreator && (
        <TextPageCreator
          isOpen={showTextPageCreator}
          onClose={() => setShowTextPageCreator(false)}
          onCreatePages={handleTextPageExportToGrid}
          onAddToMediaPanel={handleTextPageAddToMediaPanel}
          darkMode={darkMode}
          pageConfig={{
            width: 400,
            height: 600,
            padding: 50,
            fontSize: 16,
            fontFamily: 'Georgia, serif'
          }}
        />
      )}

      {/* MediaStack Preview */}
      {showMediaStackPreview && previewingStack && (
        <MediaStackPreview
          stack={previewingStack}
          isOpen={showMediaStackPreview}
          onClose={() => {
            setShowMediaStackPreview(false);
            setPreviewingStack(null);
          }}
          onExtractPage={handleExtractStackPages}
          onExtractAll={handleExtractAllStackPages}
          darkMode={darkMode}
        />
      )}

      {/* PDF Processing Dialog */}
      <PDFProcessingDialog
        isOpen={showPDFProcessor}
        fileName={processingPDF?.name || 'document.pdf'}
        progress={pdfProgress}
        darkMode={darkMode}
      />
 
      <EnlargedPreviewModal
        showEnlargedPreview={showEnlargedPreview}
        previewMedia={previewMedia}
        onClose={() => setShowEnlargedPreview(false)}
        onEditName={handleEditMediaNameFromPreview}
        onEditMetadata={handleEditMetadataFromPreview}
        onViewIn3D={handleViewIn3D}
        onMediaMissing={handleMarkMediaAsPlaceholder}
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
         onShelvesUpdate={(shelves) => {
           // Update top shelf books when shelves change
           if (shelves && shelves.length > 0) {
             setTopShelfBooks(shelves[0].books || []);
           }
         }}
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