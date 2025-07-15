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
      this.date = new Date().toISOString();
      this.url = URL.createObjectURL(file);
      this.thumbnail = this.url;
    } else if (file && typeof file === 'object') {
      // Handle pageData object (for backwards compatibility)
      this.id = file.id || `text-page-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      this.name = file.name || `text-page-${metadata.pageNumber || 1}.png`;
      this.type = file.type || 'image/png';
      this.size = file.size || 0;
      this.date = file.date || new Date().toISOString();
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
  const canvas = document.createElement('canvas');
  canvas.width = settings.width || 400;
  canvas.height = settings.height || 600;
  const ctx = canvas.getContext('2d');
  
  // Background
  ctx.fillStyle = settings.backgroundColor || '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Draw text content
  ctx.fillStyle = settings.textColor || '#000000';
  ctx.font = `${settings.fontSize || 16}px ${settings.fontFamily || 'Georgia, serif'}`;
  ctx.textBaseline = 'top';
  
  const padding = settings.padding || 50;
  const maxWidth = canvas.width - (padding * 2);
  const lineHeight = (settings.fontSize || 16) * (settings.lineHeight || 1.6);
  
  // Word wrap and draw text
  const lines = wrapText(ctx, content, maxWidth);
  let y = padding;
  
  lines.forEach(line => {
    ctx.fillText(line, padding, y);
    y += lineHeight;
  });
  
  // Page number
  ctx.font = `12px ${settings.fontFamily || 'Georgia, serif'}`;
  ctx.fillStyle = '#888888';
  ctx.textAlign = 'center';
  ctx.fillText(`— ${pageNumber} —`, canvas.width / 2, canvas.height - 30);
  
  // Convert to blob with text content preserved
  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
  const dataUrl = canvas.toDataURL('image/png');
  
  const file = new File([blob], `text-page-${pageNumber}.png`, { type: 'image/png' });
  
  const textPage = new TextPage(file, {
    pageNumber,
    totalPages,
    textContent: content,
    textSettings: settings,
    isTextPage: true
  });
  
  // Store the data URL as both URL and thumbnail
  textPage.url = dataUrl;
  textPage.thumbnail = dataUrl;
  textPage._objectUrl = dataUrl; // Prevent URL regeneration
  
  return textPage;
};

function wrapText(ctx, text, maxWidth) {
  const words = text.split(/\s+/);
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
  
  return lines;
}