// utils/bookshelfHelpers.js

/**
 * Apply a book's layout to the current media library without destructive loading
 * This creates a non-destructive workflow where missing media becomes placeholders
 */
export const applyBookLayout = (
  book,
  mediaFiles,
  setMediaFiles,
  setGridSlots,
  setBookVolumeMetadata,
  setAtomPages,
  setShowBook3DViewer,
  setShowBookshelf
) => {
  try {
    // 1. Create lookup maps for both ID and name
    const mediaByName = new Map(mediaFiles.map(f => [f.name, f]));
    const mediaById = new Map(mediaFiles.map(f => [f.id, f]));
    
    // 2. Process book pages and build grid
    const gridItems = [];
    const placeholdersToAdd = [];
    const processedPages = [];

    book.pages.forEach((page, pageIndex) => {
      const processedPage = { front: null, back: null };
      
      // Process front page
      if (page.front) {
        const mediaRef = findMediaReference(page.front, mediaById, mediaByName);
        if (mediaRef.found) {
          processedPage.front = mediaRef.media.name || mediaRef.media.id;
          gridItems.push(mediaRef.media);
        } else if (page.front !== 'blank') {
          const placeholder = createMediaPlaceholder(page.front, 'front', pageIndex);
          placeholdersToAdd.push(placeholder);
          processedPage.front = placeholder.name;
          gridItems.push(placeholder);
        }
      }
      
      // Process back page
      if (page.back) {
        const mediaRef = findMediaReference(page.back, mediaById, mediaByName);
        if (mediaRef.found) {
          processedPage.back = mediaRef.media.name || mediaRef.media.id;
          gridItems.push(mediaRef.media);
        } else if (page.back !== 'blank') {
          const placeholder = createMediaPlaceholder(page.back, 'back', pageIndex);
          placeholdersToAdd.push(placeholder);
          processedPage.back = placeholder.name;
          gridItems.push(placeholder);
        }
      }
      
      processedPages.push(processedPage);
    });

    // 3. Add placeholders to media files (non-destructive)
    if (placeholdersToAdd.length > 0) {
      setMediaFiles(prev => [...prev, ...placeholdersToAdd]);
    }

    // 4. Create grid slots array - ensure minimum size
    const gridSize = Math.max(20, gridItems.length); // Minimum 20 slots
    const newGridSlots = new Array(gridSize).fill(null);
    
    // Fill grid with items
    gridItems.forEach((item, index) => {
      if (index < newGridSlots.length) {
        newGridSlots[index] = item;
      }
    });

    // 5. Update all state
    setGridSlots(newGridSlots);
    
    // Set book metadata
    setBookVolumeMetadata({
      title: book.title || book.volumeMetadata?.title || 'Untitled Book',
      author: book.author || book.volumeMetadata?.author || 'Unknown Author',
      description: book.description || book.volumeMetadata?.description || '',
      ...book.volumeMetadata
    });
    
    // Set pages for 3D viewer
    setAtomPages(processedPages);
    
    // Show 3D viewer and hide bookshelf
    setShowBook3DViewer(true);
    setShowBookshelf(false);

    return {
      success: true,
      appliedSlots: newGridSlots,
      missingCount: placeholdersToAdd.length,
      totalPages: processedPages.length,
      loadedCount: gridItems.length - placeholdersToAdd.length
    };
    
  } catch (error) {
    console.error('Error applying book layout:', error);
    return {
      success: false,
      error: error.message,
      appliedSlots: [],
      missingCount: 0,
      totalPages: 0,
      loadedCount: 0
    };
  }
};

/**
 * Find media reference by ID or name
 */
function findMediaReference(ref, mediaById, mediaByName) {
  if (!ref) return { found: false };
  
  // Handle string references
  if (typeof ref === 'string') {
    // Special cases
    if (ref === 'blank' || ref === 'cover' || ref === 'back-cover') {
      return { found: false, isSpecial: true };
    }
    
    // Try to find by ID first, then by name
    const byId = mediaById.get(ref);
    if (byId) return { found: true, media: byId };
    
    const byName = mediaByName.get(ref);
    if (byName) return { found: true, media: byName };
    
    return { found: false };
  }
  
  // Handle object references
  if (typeof ref === 'object') {
    // Try by ID
    if (ref.id) {
      const byId = mediaById.get(ref.id);
      if (byId) return { found: true, media: byId };
    }
    
    // Try by name
    if (ref.name) {
      const byName = mediaByName.get(ref.name);
      if (byName) return { found: true, media: byName };
    }
    
    // If the object itself looks like a media item, use it
    if (ref.url || ref.thumbnail) {
      return { found: true, media: ref };
    }
    
    return { found: false };
  }
  
  return { found: false };
}

/**
 * Create a placeholder for missing media
 */
function createMediaPlaceholder(ref, position, pageIndex) {
  const name = typeof ref === 'object' ? (ref.name || ref.id || 'Unknown') : ref;
  const placeholderId = `placeholder-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  return {
    id: placeholderId,
    name: `[Missing] ${name}`,
    type: 'image/png', // Default type
    size: '0 KB',
    date: new Date().toISOString(),
    url: null,
    thumbnail: null,
    isPlaceholder: true,
    isMissing: true,
    originalRef: ref,
    originalName: name,
    pagePosition: `${position} page ${pageIndex + 1}`,
    metadata: {
      title: `Missing: ${name}`,
      description: `Placeholder for missing media item`,
      isPlaceholder: true
    },
    // Add file property for compatibility
    file: null,
    // Release URL method for compatibility
    releaseUrl: () => {}
  };
}

/**
 * Convert grid slots to book pages format
 */
export const convertSlotsToPages = (slots) => {
  const pages = [];
  const validSlots = slots.filter(slot => slot !== null);
  
  // Add cover page if we have items
  if (validSlots.length > 0) {
    pages.push({
      front: 'cover',
      back: validSlots[0] ? (validSlots[0].name || validSlots[0].id) : 'blank'
    });
    
    // Process remaining slots in pairs
    for (let i = 1; i < validSlots.length; i += 2) {
      const frontSlot = validSlots[i];
      const backSlot = validSlots[i + 1];
      
      pages.push({
        front: frontSlot ? (frontSlot.name || frontSlot.id) : 'blank',
        back: backSlot ? (backSlot.name || backSlot.id) : 'blank'
      });
    }
    
    // Add back cover
    pages.push({
      front: 'blank',
      back: 'back-cover'
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
  
  if (book.pages.length === 0) {
    return { valid: false, error: 'Book must have at least one page' };
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

/**
 * Generate a book cover thumbnail for bookshelf display
 */
export const generateBookCoverThumbnail = async (book, mediaFiles) => {
  try {
    // Find the first page with content
    let coverMedia = null;
    
    if (book.pages && book.pages.length > 0) {
      const firstPage = book.pages[0];
      if (firstPage.front) {
        coverMedia = mediaFiles.find(m => 
          m.name === firstPage.front || 
          m.id === firstPage.front ||
          (typeof firstPage.front === 'object' && m.id === firstPage.front.id)
        );
      }
    }
    
    if (coverMedia && coverMedia.thumbnail) {
      return coverMedia.thumbnail;
    }
    
    // Generate a default cover
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 300;
    const ctx = canvas.getContext('2d');
    
    // Background color based on book color
    ctx.fillStyle = book.color || '#4682B4';
    ctx.fillRect(0, 0, 200, 300);
    
    // Add title
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Word wrap title
    const words = (book.title || 'Untitled').split(' ');
    let y = 100;
    let line = '';
    
    words.forEach(word => {
      const testLine = line + word + ' ';
      const metrics = ctx.measureText(testLine);
      if (metrics.width > 180 && line !== '') {
        ctx.fillText(line, 100, y);
        line = word + ' ';
        y += 25;
      } else {
        line = testLine;
      }
    });
    ctx.fillText(line, 100, y);
    
    // Add author
    if (book.author) {
      ctx.font = '14px Arial';
      ctx.fillText(book.author, 100, 200);
    }
    
    return canvas.toDataURL('image/jpeg', 0.8);
  } catch (error) {
    console.error('Error generating book cover:', error);
    return null;
  }
};