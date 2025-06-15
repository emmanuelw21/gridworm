// components/MediaGrid/TextPage.js
import { MediaFile } from './MediaModel.js';

export class TextPage {
  constructor(file, metadata = {}) {
    // Handle both File and pageData objects
    if (file instanceof File || file instanceof Blob) {
      // Standard file/blob initialization
      this.file = file;
      this.id = `text-page-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      this.name = file.name || `text-page-${metadata.pageNumber || 1}.png`;
      this.type = file.type || 'image/png';
      this.size = file.size;
      this.date = new Date();
      this.url = URL.createObjectURL(file);
      this.thumbnail = this.url;
    } else if (file && typeof file === 'object') {
      // Handle pageData object (for backwards compatibility)
      this.id = file.id || `text-page-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      this.name = file.name || `text-page-${metadata.pageNumber || 1}.png`;
      this.type = file.type || 'image/png';
      this.size = file.size || 0;
      this.date = file.date || new Date();
      this.url = file.url || null;
      this.thumbnail = file.thumbnail || file.url || null;
      this.file = file.blob || file.file || null;
    }
    
    // Common initialization
    this.metadata = {
      ...metadata,
      isTextPage: true,
      pageNumber: metadata.pageNumber || 1,
      totalPages: metadata.totalPages || 1
    };
    
    this.isTextPage = true;
    this.textContent = metadata.textContent || '';
    this.userPath = null;
    this.isMissing = false;
    this.isPlaceholder = false;
  }

  releaseUrl() {
    if (this.url && this.url.startsWith('blob:')) {
      URL.revokeObjectURL(this.url);
      this.url = null;
      this.thumbnail = null;
    }
  }

  getDisplayName() {
    return this.name || `Text Page ${this.metadata.pageNumber}`;
  }

  getPreviewText(maxLength = 100) {
    if (!this.textContent) return '';
    return this.textContent.length > maxLength 
      ? this.textContent.substring(0, maxLength) + '...' 
      : this.textContent;
  }
}


// Helper to create text page from canvas
export const createTextPageFromContent = async (content, settings, pageNumber, totalPages) => {
  // Create a canvas to render the page
  const canvas = document.createElement('canvas');
  canvas.width = settings.width || 400;
  canvas.height = settings.height || 600;
  const ctx = canvas.getContext('2d');
  
  // Background
  ctx.fillStyle = settings.backgroundColor || '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Set text properties
  ctx.fillStyle = settings.textColor || '#000000';
  ctx.font = `${settings.fontSize || 16}px ${settings.fontFamily || 'Georgia, serif'}`;
  ctx.textBaseline = 'top';
  
  const padding = settings.padding || 50;
  const maxWidth = canvas.width - (padding * 2);
  const lineHeight = (settings.fontSize || 16) * (settings.lineHeight || 1.6);
  
  // Word wrap the content
  const words = content.split(/\s+/);
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
  let y = padding;
  const maxLines = Math.floor((canvas.height - padding * 2) / lineHeight);
  
  lines.slice(0, maxLines).forEach(line => {
    let x = padding;
    
    if (settings.textAlign === 'center') {
      const metrics = ctx.measureText(line);
      x = (canvas.width - metrics.width) / 2;
    } else if (settings.textAlign === 'right') {
      const metrics = ctx.measureText(line);
      x = canvas.width - padding - metrics.width;
    }
    
    ctx.fillText(line, x, y);
    y += lineHeight;
  });
  
  // Add page number
  ctx.font = `12px ${settings.fontFamily || 'Georgia, serif'}`;
  ctx.fillStyle = '#888888';
  ctx.textAlign = 'center';
  ctx.fillText(`— ${pageNumber} —`, canvas.width / 2, canvas.height - 30);
  
  // Convert canvas to blob
  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
  
  // Create a File object from the blob with a proper name
  const fileName = `text-page-${pageNumber}.png`;
  const file = new File([blob], fileName, { type: 'image/png' });
  
  // Create metadata
  const metadata = {
    pageNumber: pageNumber || 1,
    totalPages: totalPages || 1,
    textSettings: settings,
    textContent: content,
    isTextPage: true,
    wordCount: words.filter(w => w.trim()).length,
    characterCount: content.length,
    createdAt: new Date().toISOString()
  };
  
  // Create TextPage instance using the File object
  const textPage = new TextPage(file, metadata);
  
  // Override the textContent property since it's stored in metadata
  textPage.textContent = content;
  
  return textPage;
};