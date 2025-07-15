// components/MediaGrid/MediaStack.js
import { MediaFile } from './MediaModel.js';

/**
 * MediaStack class for handling multi-page documents
 * Extends MediaFile to maintain compatibility while adding stack functionality
 */
export class MediaStack extends MediaFile {
  constructor(file, pages = [], metadata = {}) {
    // Call parent constructor with the original file
    super(file);
    
    // MediaStack specific properties
    this.isStack = true;
    this.stackType = metadata.stackType || 'document';
    this.pages = pages; // Array of page objects or MediaFile instances
    this.currentPage = 0;
    this.pageCount = pages.length;
    
    // Override metadata to include stack information
    this.metadata = {
      ...this.metadata,
      ...metadata,
      isStack: true,
      stackType: this.stackType,
      pageCount: this.pageCount,
      stackId: `stack-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      originalFileName: file.name || metadata.originalFileName
    };
    
    // Set appropriate thumbnail - use first page if available
    if (pages.length > 0 && pages[0].thumbnail) {
      this.thumbnail = pages[0].thumbnail;
    }
    
    // Set name to indicate it's a stack
    this.name = `[Stack] ${this.name} (${this.pageCount} pages)`;
  }
  
  /**
   * Get a specific page from the stack
   * @param {number} pageIndex - Index of the page to retrieve
   * @returns {Object|null} Page object or null if index is invalid
   */
  getPage(pageIndex) {
    if (pageIndex >= 0 && pageIndex < this.pages.length) {
      return this.pages[pageIndex];
    }
    return null;
  }
  
  /**
   * Set the current page index
   * @param {number} pageIndex - Index to set as current
   * @returns {boolean} True if successful, false if index is invalid
   */
  setCurrentPage(pageIndex) {
    if (pageIndex >= 0 && pageIndex < this.pages.length) {
      this.currentPage = pageIndex;
      // Update thumbnail to current page
      const currentPage = this.pages[pageIndex];
      if (currentPage && currentPage.thumbnail) {
        this.thumbnail = currentPage.thumbnail;
      }
      return true;
    }
    return false;
  }
  
  /**
   * Navigate to next page
   * @returns {boolean} True if successful, false if already at last page
   */
  nextPage() {
    return this.setCurrentPage(this.currentPage + 1);
  }
  
  /**
   * Navigate to previous page
   * @returns {boolean} True if successful, false if already at first page
   */
  previousPage() {
    return this.setCurrentPage(this.currentPage - 1);
  }
  
  /**
   * Extract specific pages as individual MediaFile instances
   * @param {number[]} pageIndices - Array of page indices to extract
   * @returns {MediaFile[]} Array of extracted MediaFile instances
   */
  extractPages(pageIndices = []) {
    const extractedPages = [];
    
    pageIndices.forEach(index => {
      const page = this.getPage(index);
      if (page) {
        // Create a file-like object for the MediaFile constructor
        const pageFile = {
          name: `${this.metadata.originalFileName}_page_${index + 1}.png`,
          type: 'image/png',
          size: 0, // Will be updated when blob is created
          lastModified: Date.now()
        };
        
        // Create a new MediaFile from the page data
        const mediaFile = new MediaFile(pageFile);
        
        // Set the URL and thumbnail directly
        mediaFile._url = page.thumbnail; // Use internal URL property
        mediaFile._objectUrl = page.thumbnail; // Set object URL to prevent recreation
        mediaFile.thumbnail = page.thumbnail;
        
        // Mark as extracted page to help with special handling
        mediaFile.isExtractedPage = true;
        
        // If we have a blob, use it to create a proper file
        if (page.thumbnailBlob) {
          mediaFile.file = new File([page.thumbnailBlob], pageFile.name, { type: 'image/png' });
          mediaFile.size = page.thumbnailBlob.size;
        }
        
        // Preserve page metadata
        mediaFile.metadata = {
          ...mediaFile.metadata,
          extractedFrom: this.metadata.stackId,
          originalStackName: this.metadata.originalFileName,
          pageNumber: index + 1,
          totalPages: this.pageCount,
          hasText: page.metadata?.hasText || false,
          textContent: page.textContent || ''
        };
        
        extractedPages.push(mediaFile);
      }
    });
    
    return extractedPages;
  }
  
  /**
   * Extract all pages as individual MediaFile instances
   * @returns {MediaFile[]} Array of all pages as MediaFile instances
   */
  extractAllPages() {
    const indices = Array.from({ length: this.pageCount }, (_, i) => i);
    return this.extractPages(indices);
  }
  
  /**
   * Add a page to the stack
   * @param {Object} page - Page object to add
   */
  addPage(page) {
    this.pages.push(page);
    this.pageCount = this.pages.length;
    this.metadata.pageCount = this.pageCount;
    this.name = `[Stack] ${this.metadata.originalFileName} (${this.pageCount} pages)`;
  }
  
  /**
   * Remove a page from the stack
   * @param {number} pageIndex - Index of page to remove
   * @returns {Object|null} Removed page or null if index is invalid
   */
  removePage(pageIndex) {
    if (pageIndex >= 0 && pageIndex < this.pages.length) {
      const removed = this.pages.splice(pageIndex, 1)[0];
      this.pageCount = this.pages.length;
      this.metadata.pageCount = this.pageCount;
      this.name = `[Stack] ${this.metadata.originalFileName} (${this.pageCount} pages)`;
      
      // Adjust current page if necessary
      if (this.currentPage >= this.pageCount && this.pageCount > 0) {
        this.currentPage = this.pageCount - 1;
      }
      
      return removed;
    }
    return null;
  }
  
  /**
   * Get display information for UI
   * @returns {Object} Display information
   */
  getDisplayInfo() {
    return {
      name: this.metadata.originalFileName,
      pageCount: this.pageCount,
      currentPage: this.currentPage + 1, // 1-indexed for display
      stackType: this.stackType,
      fileType: this.type,
      size: this.size
    };
  }
}

/**
 * Create a MediaStack from a PDF or document file
 * @param {File} file - The PDF or document file
 * @param {Array} pages - Array of page data
 * @returns {MediaStack} New MediaStack instance
 */
export function createMediaStack(file, pages = []) {
  const metadata = {
    stackType: file.type === 'application/pdf' ? 'pdf' : 'document',
    originalFileName: file.name,
    createdAt: new Date().toISOString()
  };
  
  return new MediaStack(file, pages, metadata);
}