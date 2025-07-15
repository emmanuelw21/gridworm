import { atom } from 'jotai';

// Core media state
export const mediaFilesAtom = atom([]);
export const gridSlotsAtom = atom(Array(20).fill(null));
export const freeGridItemsAtom = atom({});
export const selectedMediaItemsAtom = atom([]);
export const selectedGridIndexAtom = atom(null);
export const selectedFreeGridIdsAtom = atom([]);

// Artboard state
export const artboardsAtom = atom({});
export const selectedArtboardsAtom = atom([]); // Changed to array for multi-select
export const artboardGroupLocksAtom = atom({}); // Track which groups are locked together

// Text page state
export const textPageCollectionAtom = atom([]);
export const textPageGroupsAtom = atom({});
export const activeTextPageGroupAtom = atom(null);

// UI state
export const darkModeAtom = atom(false);
export const showVideoThumbnailsAtom = atom(true);
export const activeViewAtom = atom('home');
export const showBook3DViewerAtom = atom(false);
export const showBookshelfAtom = atom(false);
export const showEnlargedPreviewAtom = atom(false);
export const enlargedPreviewIndexAtom = atom(0);

// Panel visibility
export const showMediaPanelAtom = atom(true);
export const showLayerPanelAtom = atom(false);
export const showConsolePanelAtom = atom(false);
export const showIndexPanelAtom = atom(false);
export const showThreeDPanelAtom = atom(false);
export const showThreeDViewportAtom = atom(false);
export const showBook3DViewerPanelAtom = atom(false);
export const showRemoveMediaDialogAtom = atom(false);
export const showStarmiePanelAtom = atom(false);

// Dialog state
export const showJsonEditorAtom = atom(false);
export const showEditingThumbAtom = atom(false);
export const isThumbnailPickerOpenAtom = atom(false);
export const showLoadProjectDialogAtom = atom(false);
export const showSaveProjectDialogAtom = atom(false);
export const showPageMappingDialogAtom = atom(false);
export const showJsonEditorDialogAtom = atom(false);
export const showFileOperationsDialogAtom = atom(false);

// Book/3D state
export const bookVolumeMetadataAtom = atom({
  title: "Grid Book",
  author: "Gridworm User",
  description: "Generated from grid content"
});
export const atomPagesAtom = atom([]);
export const three3DBooksAtom = atom([]);
export const showPageMappingAtom = atom(true);
export const showUpdateIndexAtom = atom(false);

// Free grid state
export const isEditingCanvasAtom = atom(false);
export const selectedToolAtom = atom('');
export const selectedShapeToolAtom = atom('');
export const vectorShapesAtom = atom([]);
export const vectorPathsAtom = atom([]);
export const vectorTextAtom = atom([]);
export const selectedVectorIdsAtom = atom([]);
export const isVectorToolActiveAtom = atom(false);
export const activeTextPageIdAtom = atom(null);

// Layer system state - each item is its own layer
export const layersAtom = atom([]); // Array of { id, itemId, itemType, name, visible, locked, groupId }
export const activeLayerIdAtom = atom(null);
export const layerOrderAtom = atom([]); // Array of layer IDs from bottom to top
export const layerGroupsAtom = atom({}); // { groupId: { name, isExpanded, visible, locked } }

// Type visibility filters (not layers)
export const typeFiltersAtom = atom({
  media: { visible: true, locked: false },
  vectors: { visible: true, locked: false },
  text: { visible: true, locked: false },
  artboards: { visible: true, locked: false, priority: false }
});

export const lockedItemsAtom = atom(new Set());

// Filter and search state
export const searchTermAtom = atom('');
export const selectedFileTypesAtom = atom([]);
export const showRecentlyAddedOnlyAtom = atom(false);
export const recentlyAddedIdsAtom = atom(new Set());

// Metadata state
export const fileMetadataAtom = atom({});
export const jsonDataAtom = atom(null);
export const allIndexDataAtom = atom({});

// Derived atoms for filtered media
export const filteredMediaFilesAtom = atom((get) => {
  const mediaFiles = get(mediaFilesAtom);
  const searchTerm = get(searchTermAtom);
  const selectedFileTypes = get(selectedFileTypesAtom);
  const showRecentlyAddedOnly = get(showRecentlyAddedOnlyAtom);
  const recentlyAddedIds = get(recentlyAddedIdsAtom);

  return mediaFiles.filter(file => {
    // Search filter
    if (searchTerm && !file.name.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }

    // File type filter
    if (selectedFileTypes.length > 0) {
      // Get the category for this file
      const category = file.getFileTypeCategory ? file.getFileTypeCategory() : 
                      file.metadata?.category || 'other';
      if (!selectedFileTypes.includes(category)) {
        return false;
      }
    }

    // Recently added filter
    if (showRecentlyAddedOnly && !recentlyAddedIds.has(file.id)) {
      return false;
    }

    return true;
  });
});



// Derived atom for media stats
export const mediaStatsAtom = atom((get) => {
  const mediaFiles = get(mediaFilesAtom);
  const stats = {
    total: mediaFiles.length,
    images: 0,
    videos: 0,
    audio: 0,
    text: 0,
    stacks: 0,
    '3d': 0,
    documents: 0,
    other: 0
  };

  mediaFiles.forEach(file => {
    // Get the category for this file
    const category = file.getFileTypeCategory ? file.getFileTypeCategory() : 
                    file.metadata?.category || 'other';
    
    switch (category) {
      case 'image':
        stats.images++;
        break;
      case 'video':
        stats.videos++;
        break;
      case 'audio':
        stats.audio++;
        break;
      case 'text':
        stats.text++;
        break;
      case 'stack':
        stats.stacks++;
        break;
      case '3d':
        stats['3d']++;
        break;
      case 'document':
        stats.documents++;
        break;
      default:
        stats.other++;
    }
  });

  return stats;
});