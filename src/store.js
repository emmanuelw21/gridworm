import { atom } from 'jotai';

// Core media state
export const mediaFilesAtom = atom([]);
export const gridSlotsAtom = atom(Array(20).fill(null));
export const freeGridItemsAtom = atom({});
export const selectedMediaItemsAtom = atom([]);
export const selectedGridIndexAtom = atom(null);
export const selectedFreeGridIdsAtom = atom([]);

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
    if (selectedFileTypes.length > 0 && !selectedFileTypes.includes(file.fileType)) {
      return false;
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
    pdfs: 0,
    gifs: 0,
    other: 0
  };

  mediaFiles.forEach(file => {
    switch (file.fileType) {
      case 'image':
        stats.images++;
        break;
      case 'video':
        stats.videos++;
        break;
      case 'pdf':
        stats.pdfs++;
        break;
      case 'gif':
        stats.gifs++;
        break;
      default:
        stats.other++;
    }
  });

  

  return stats;
});