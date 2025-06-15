// utils/bookshelfHelpers.js

/**
 * Apply a book's layout to the current media library without destructive loading
 * This creates a non-destructive workflow where missing media becomes placeholders
 */
export const applyBookLayout = (book, mediaFiles, setMediaFiles, setGridSlots, setBookVolumeMetadata, setAtomPages, setShowBook3DViewer, setShowBookshelf) => {
  // 1. DO NOT clear mediaFiles. Get a lookup of currently available media.
  const availableMedia = new Map(mediaFiles.map(f => [f.name, f]));

  // 2. Map the book's pages to available media.
  const newGridSlots = [];
  const placeholdersToAdd = [];

  book.pages.forEach(page => {
    [page.front, page.back].forEach(itemRef => {
      if (!itemRef || (typeof itemRef === 'string' && itemRef === 'blank')) {
        newGridSlots.push(null);
        return;
      }

      const mediaName = typeof itemRef === 'object' ? itemRef.name : itemRef;
      const foundMedia = availableMedia.get(mediaName);

      if (foundMedia) {
        newGridSlots.push(foundMedia);
      } else {
        // 3. If a media item is NOT found, create a non-destructive placeholder.
        const placeholder = {
          id: `placeholder-${mediaName}-${Date.now()}`,
          name: `[Missing] ${mediaName}`,
          type: 'placeholder',
          isPlaceholder: true,
          isMissing: true,
          originalName: mediaName,
          fileType: 'image', // Default type for placeholders
          thumbnailUrl: null,
          url: null,
          size: 0,
          lastModified: Date.now()
        };
        newGridSlots.push(placeholder);
        // Only add the placeholder to the media list if it's not already there.
        if (!availableMedia.has(placeholder.name)) {
          placeholdersToAdd.push(placeholder);
          availableMedia.set(placeholder.name, placeholder);
        }
      }
    });
  });

  // 4. Add ONLY the new placeholders to the media panel.
  if (placeholdersToAdd.length > 0) {
    setMediaFiles(prev => [...prev, ...placeholdersToAdd]);
  }

  // 5. Update the grid and open the book viewer.
  setGridSlots(newGridSlots);
  setBookVolumeMetadata(book.volumeMetadata || { 
    title: book.title || 'Untitled Book', 
    author: book.author || 'Unknown Author',
    description: book.description || ''
  });
  setAtomPages(book.pages);
  setShowBook3DViewer(true);
  setShowBookshelf(false);

  return {
    appliedSlots: newGridSlots,
    missingCount: placeholdersToAdd.length,
    totalPages: book.pages.length
  };
};

/**
 * Convert grid slots to book pages format
 */
export const convertSlotsToPages = (slots) => {
  const pages = [];
  
  // Process slots in pairs for front/back pages
  for (let i = 0; i < slots.length; i += 2) {
    const frontSlot = slots[i];
    const backSlot = slots[i + 1];
    
    pages.push({
      front: frontSlot ? (frontSlot.name || frontSlot) : 'blank',
      back: backSlot ? (backSlot.name || backSlot) : 'blank'
    });
  }
  
  return pages;
};

/**
 * Validate book data structure
 */
export const validateBookData = (book) => {
  if (!book || typeof book !== 'object') {
    return { valid: false, error: 'Invalid book data' };
  }
  
  if (!Array.isArray(book.pages)) {
    return { valid: false, error: 'Book must have pages array' };
  }
  
  for (let i = 0; i < book.pages.length; i++) {
    const page = book.pages[i];
    if (!page || typeof page !== 'object') {
      return { valid: false, error: `Invalid page at index ${i}` };
    }
    if (!('front' in page) || !('back' in page)) {
      return { valid: false, error: `Page ${i} must have front and back properties` };
    }
  }
  
  return { valid: true };
};