// utils/pdfProcessor.js

/**
 * PDF Processing utility for extracting pages from PDF files
 * Uses pdf.js library for PDF manipulation
 */

// Dynamic import for pdf.js to avoid bundling issues
let pdfjsLib = null;

/**
 * Initialize pdf.js library
 * @returns {Promise<Object>} pdf.js library object
 */
async function initPdfJs() {
  if (pdfjsLib) return pdfjsLib;
  
  try {
    // Use the global pdfjs from CDN
    if (window.pdfjsLib) {
      pdfjsLib = window.pdfjsLib;
      // Set worker URL if not already set
      if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      }
      return pdfjsLib;
    } else {
      throw new Error('PDF.js library not found. Please ensure pdf.js is loaded from CDN.');
    }
  } catch (error) {
    console.error('Failed to initialize pdf.js:', error);
    throw new Error('PDF.js library not available. Please ensure pdf.js is loaded.');
  }
}

/**
 * Extract text content from a PDF page
 * @param {Object} page - PDF page object
 * @returns {Promise<string>} Extracted text content
 */
async function extractTextFromPage(page) {
  try {
    const textContent = await page.getTextContent();
    const textItems = textContent.items;
    let text = '';
    
    for (let i = 0; i < textItems.length; i++) {
      const item = textItems[i];
      text += item.str;
      
      // Add space or newline based on transform
      if (item.hasEOL) {
        text += '\n';
      } else if (i < textItems.length - 1) {
        const nextItem = textItems[i + 1];
        // Add space if there's a gap between items
        if (Math.abs(item.transform[4] + item.width - nextItem.transform[4]) > 2) {
          text += ' ';
        }
      }
    }
    
    return text.trim();
  } catch (error) {
    console.error('Error extracting text from page:', error);
    return '';
  }
}

/**
 * Render a PDF page to canvas and return as data URL
 * @param {Object} page - PDF page object
 * @param {number} scale - Render scale (default: 1.5)
 * @returns {Promise<Object>} Object containing thumbnail URL and dimensions
 */
async function renderPageToThumbnail(page, scale = 1.5) {
  try {
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    
    const renderContext = {
      canvasContext: context,
      viewport: viewport
    };
    
    await page.render(renderContext).promise;
    
    return {
      url: canvas.toDataURL('image/png'),
      width: viewport.width,
      height: viewport.height,
      blob: await new Promise(resolve => canvas.toBlob(resolve, 'image/png'))
    };
  } catch (error) {
    console.error('Error rendering PDF page:', error);
    return null;
  }
}

/**
 * Extract pages from a PDF file
 * @param {File} file - PDF file to process
 * @param {Object} options - Processing options
 * @returns {Promise<Object>} Object containing pages array and metadata
 */
export async function extractPDFPages(file, options = {}) {
  const {
    maxPages = 1000, // Maximum pages to extract
    extractText = true, // Whether to extract text content
    thumbnailScale = 1.5, // Scale for thumbnail generation
    onProgress = null // Progress callback function
  } = options;
  
  try {
    // Initialize pdf.js
    const pdfjs = await initPdfJs();
    
    // Convert file to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    
    // Load the PDF document
    const loadingTask = pdfjs.getDocument({
      data: arrayBuffer,
      cMapUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/',
      cMapPacked: true
    });
    
    const pdf = await loadingTask.promise;
    const numPages = Math.min(pdf.numPages, maxPages);
    
    const pages = [];
    
    // Extract each page
    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      try {
        const page = await pdf.getPage(pageNum);
        
        // Render page to thumbnail
        const thumbnail = await renderPageToThumbnail(page, thumbnailScale);
        
        // Extract text if requested
        let textContent = '';
        if (extractText) {
          textContent = await extractTextFromPage(page);
        }
        
        // Create page data
        const pageData = {
          pageNumber: pageNum,
          totalPages: pdf.numPages,
          thumbnail: thumbnail?.url || null,
          thumbnailBlob: thumbnail?.blob || null,
          width: thumbnail?.width || 0,
          height: thumbnail?.height || 0,
          textContent: textContent,
          metadata: {
            pageNumber: pageNum,
            totalPages: pdf.numPages,
            hasText: textContent.length > 0,
            sourcePDF: file.name
          }
        };
        
        pages.push(pageData);
        
        // Call progress callback if provided
        if (onProgress) {
          onProgress({
            current: pageNum,
            total: numPages,
            percentage: Math.round((pageNum / numPages) * 100)
          });
        }
        
        // Clean up page resources
        page.cleanup();
      } catch (pageError) {
        console.error(`Error processing page ${pageNum}:`, pageError);
        // Continue with next page
      }
    }
    
    // Clean up document resources
    pdf.cleanup();
    
    return {
      pages,
      metadata: {
        fileName: file.name,
        fileSize: file.size,
        pageCount: pdf.numPages,
        extractedPages: pages.length,
        hasText: pages.some(p => p.textContent.length > 0)
      }
    };
  } catch (error) {
    console.error('Error extracting PDF pages:', error);
    throw error;
  }
}

/**
 * Check if a file is a PDF
 * @param {File} file - File to check
 * @returns {boolean} True if file is a PDF
 */
export function isPDFFile(file) {
  return file.type === 'application/pdf' || 
         file.name.toLowerCase().endsWith('.pdf');
}

/**
 * Check if a file is a supported document type
 * @param {File} file - File to check
 * @returns {boolean} True if file is a supported document
 */
export function isSupportedDocument(file) {
  const supportedTypes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // docx
    'application/msword', // doc
    'text/plain', // txt
    'application/rtf', // rtf
    'application/vnd.oasis.opendocument.text' // odt
  ];
  
  return supportedTypes.includes(file.type) || 
         isPDFFile(file);
}

/**
 * Get document type from file
 * @param {File} file - File to check
 * @returns {string} Document type
 */
export function getDocumentType(file) {
  if (isPDFFile(file)) return 'pdf';
  if (file.type.includes('word') || file.name.match(/\.docx?$/i)) return 'word';
  if (file.type === 'text/plain' || file.name.endsWith('.txt')) return 'text';
  if (file.type === 'application/rtf' || file.name.endsWith('.rtf')) return 'rtf';
  if (file.type.includes('opendocument')) return 'odt';
  return 'unknown';
}