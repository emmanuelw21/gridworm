// utils/documentProcessor.js

/**
 * Document Processing utility for extracting content from various document formats
 * Supports: txt, md, doc, docx, rtf
 */

import { TextPage } from '../components/MediaGrid/TextPage.js';

/**
 * Check if a file is a text-based document
 * @param {File} file - File to check
 * @returns {boolean} True if file is a text document
 */
export function isTextDocument(file) {
  const textTypes = [
    'text/plain',
    'text/markdown',
    'text/x-markdown',
    'application/rtf',
    'text/rtf'
  ];
  
  const textExtensions = ['.txt', '.md', '.markdown', '.rtf'];
  const fileName = file.name.toLowerCase();
  
  return textTypes.includes(file.type) || 
         textExtensions.some(ext => fileName.endsWith(ext));
}

/**
 * Check if a file is a Word document
 * @param {File} file - File to check
 * @returns {boolean} True if file is a Word document
 */
export function isWordDocument(file) {
  const wordTypes = [
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // docx
    'application/msword' // doc
  ];
  
  return wordTypes.includes(file.type) || 
         file.name.match(/\.docx?$/i);
}

/**
 * Extract text content from a file
 * @param {File} file - File to process
 * @returns {Promise<string>} Extracted text content
 */
async function extractTextContent(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      resolve(e.target.result);
    };
    
    reader.onerror = (e) => {
      reject(new Error('Failed to read file: ' + e.target.error));
    };
    
    reader.readAsText(file);
  });
}

/**
 * Extract content from Word documents using mammoth.js
 * @param {File} file - Word document file
 * @returns {Promise<string>} Extracted text content
 */
async function extractWordContent(file) {
  try {
    // Load mammoth.js from CDN if not already loaded
    if (!window.mammoth) {
      await loadMammothJS();
    }
    
    const arrayBuffer = await file.arrayBuffer();
    const result = await window.mammoth.extractRawText({ arrayBuffer });
    
    return result.value;
  } catch (error) {
    console.error('Error extracting Word content:', error);
    // Fallback: return file info
    return `[Unable to extract content from Word document: ${file.name}]`;
  }
}

/**
 * Load mammoth.js library from CDN
 */
async function loadMammothJS() {
  return new Promise((resolve, reject) => {
    if (window.mammoth) {
      resolve();
      return;
    }
    
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/mammoth@1.6.0/mammoth.browser.min.js';
    script.onload = resolve;
    script.onerror = () => reject(new Error('Failed to load mammoth.js'));
    document.head.appendChild(script);
  });
}

/**
 * Split text into pages based on various criteria
 * @param {string} text - Text content to split
 * @param {Object} options - Split options
 * @returns {Array<Object>} Array of page objects
 */
function splitTextIntoPages(text, options = {}) {
  const {
    maxCharsPerPage = 3000,
    splitByParagraphs = true,
    splitByHeaders = true,
    preserveFormatting = true
  } = options;
  
  const pages = [];
  let currentPage = '';
  let currentPageWordCount = 0;
  
  // Split by double newlines (paragraphs) or single newlines
  const chunks = text.split(/\n\n+/);
  
  chunks.forEach((chunk, index) => {
    const chunkLength = chunk.length;
    
    // Check if adding this chunk would exceed the page limit
    if (currentPage.length + chunkLength > maxCharsPerPage && currentPage.length > 0) {
      // Save current page
      pages.push({
        content: currentPage.trim(),
        wordCount: currentPageWordCount,
        pageNumber: pages.length + 1
      });
      
      // Start new page
      currentPage = chunk;
      currentPageWordCount = chunk.split(/\s+/).length;
    } else {
      // Add to current page
      currentPage += (currentPage ? '\n\n' : '') + chunk;
      currentPageWordCount += chunk.split(/\s+/).length;
    }
  });
  
  // Don't forget the last page
  if (currentPage.trim()) {
    pages.push({
      content: currentPage.trim(),
      wordCount: currentPageWordCount,
      pageNumber: pages.length + 1
    });
  }
  
  return pages;
}

/**
 * Generate a thumbnail for a text page
 * @param {string} text - Text content
 * @param {string} title - Page title
 * @param {number} pageNumber - Page number
 * @returns {Promise<Object>} Thumbnail data
 */
async function generateTextThumbnail(text, title, pageNumber) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  // Set canvas size (A4 aspect ratio)
  canvas.width = 595;
  canvas.height = 842;
  
  // Background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Page border
  ctx.strokeStyle = '#e0e0e0';
  ctx.lineWidth = 1;
  ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);
  
  // Title
  ctx.fillStyle = '#333333';
  ctx.font = 'bold 24px Arial';
  ctx.fillText(title || `Page ${pageNumber}`, 40, 60);
  
  // Page number
  ctx.font = '14px Arial';
  ctx.fillStyle = '#666666';
  ctx.fillText(`Page ${pageNumber}`, canvas.width - 100, 60);
  
  // Text preview
  ctx.font = '14px Arial';
  ctx.fillStyle = '#444444';
  
  // Word wrap the text
  const lines = [];
  const words = text.split(' ');
  let currentLine = '';
  const maxWidth = canvas.width - 80;
  const lineHeight = 20;
  let y = 100;
  
  words.forEach(word => {
    const testLine = currentLine + word + ' ';
    const metrics = ctx.measureText(testLine);
    
    if (metrics.width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word + ' ';
    } else {
      currentLine = testLine;
    }
  });
  
  if (currentLine) {
    lines.push(currentLine);
  }
  
  // Draw lines (max 30 lines)
  lines.slice(0, 30).forEach((line, index) => {
    ctx.fillText(line, 40, y + (index * lineHeight));
  });
  
  // Add fade out effect at bottom
  const gradient = ctx.createLinearGradient(0, canvas.height - 100, 0, canvas.height);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
  gradient.addColorStop(1, 'rgba(255, 255, 255, 1)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, canvas.height - 100, canvas.width, 100);
  
  // Convert to blob
  return new Promise(resolve => {
    canvas.toBlob(blob => {
      resolve({
        url: canvas.toDataURL('image/png'),
        blob: blob,
        width: canvas.width,
        height: canvas.height
      });
    }, 'image/png');
  });
}

/**
 * Process a document file and extract pages
 * @param {File} file - Document file to process
 * @param {Object} options - Processing options
 * @returns {Promise<Object>} Object containing pages array and metadata
 */
export async function extractDocumentPages(file, options = {}) {
  const {
    maxPages = 100,
    onProgress = null
  } = options;
  
  try {
    let textContent = '';
    let documentType = 'text';
    
    // Extract content based on file type
    if (isTextDocument(file)) {
      textContent = await extractTextContent(file);
      documentType = file.name.endsWith('.md') ? 'markdown' : 'text';
    } else if (isWordDocument(file)) {
      textContent = await extractWordContent(file);
      documentType = 'word';
    } else {
      throw new Error('Unsupported document type');
    }
    
    // Split into pages
    const pageData = splitTextIntoPages(textContent);
    const pages = [];
    
    // Create page objects with thumbnails
    for (let i = 0; i < Math.min(pageData.length, maxPages); i++) {
      const page = pageData[i];
      
      // Generate thumbnail
      const thumbnail = await generateTextThumbnail(
        page.content,
        file.name,
        page.pageNumber
      );
      
      // Create page object
      pages.push({
        pageNumber: page.pageNumber,
        totalPages: pageData.length,
        thumbnail: thumbnail.url,
        thumbnailBlob: thumbnail.blob,
        width: thumbnail.width,
        height: thumbnail.height,
        textContent: page.content,
        metadata: {
          pageNumber: page.pageNumber,
          totalPages: pageData.length,
          wordCount: page.wordCount,
          documentType: documentType,
          sourceDocument: file.name
        }
      });
      
      // Report progress
      if (onProgress) {
        onProgress({
          current: i + 1,
          total: Math.min(pageData.length, maxPages),
          percentage: Math.round(((i + 1) / Math.min(pageData.length, maxPages)) * 100)
        });
      }
    }
    
    return {
      pages,
      metadata: {
        fileName: file.name,
        fileSize: file.size,
        pageCount: pageData.length,
        extractedPages: pages.length,
        documentType: documentType,
        totalWordCount: pageData.reduce((sum, p) => sum + p.wordCount, 0)
      }
    };
  } catch (error) {
    console.error('Error extracting document pages:', error);
    throw error;
  }
}

/**
 * Create a TextPage from document page data
 * @param {Object} pageData - Page data from document extraction
 * @param {string} groupId - Group ID for the text page
 * @returns {TextPage} New TextPage instance
 */
export function createTextPageFromDocument(pageData, groupId) {
  const textPage = new TextPage(
    pageData.textContent,
    pageData.metadata.sourceDocument
  );
  
  textPage.metadata = {
    ...textPage.metadata,
    ...pageData.metadata,
    groupId: groupId
  };
  
  return textPage;
}