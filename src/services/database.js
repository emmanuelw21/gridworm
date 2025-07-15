import Dexie from 'dexie';

/**
 * GridwormDB - IndexedDB database for Gridworm application
 * 
 * Provides robust, high-capacity storage for:
 * - Projects (saved grid configurations and book layouts)
 * - Media metadata (file information without the actual files)
 * - Bookshelf data (saved books and collections)
 * - Application settings
 */
class GridwormDB extends Dexie {
  constructor() {
    super('GridwormDB');
    
    // Define database schema
    this.version(1).stores({
      // Projects table - stores complete project data
      projects: '++id, name, createdAt, updatedAt, author',
      
      // Media metadata table - stores file metadata for quick access
      mediaMetadata: 'id, name, fileType, size, lastModified',
      
      // Bookshelf table - stores saved books
      books: '++id, title, author, createdAt, shelfId',
      
      // Settings table - stores application settings
      settings: 'key',
      
      // Thumbnails cache - stores generated thumbnails
      thumbnails: 'mediaId, generatedAt'
    });
    
    // Initialize tables
    this.projects = this.table('projects');
    this.mediaMetadata = this.table('mediaMetadata');
    this.books = this.table('books');
    this.settings = this.table('settings');
    this.thumbnails = this.table('thumbnails');
  }
}

// Create database instance
export const db = new GridwormDB();

/**
 * Project storage service
 */
export const projectStorage = {
  /**
   * Save a project to IndexedDB
   * @param {Object} projectData - The project data to save
   * @returns {Promise<number>} The ID of the saved project
   */
  async saveProject(projectData) {
    const project = {
      ...projectData,
      createdAt: projectData.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    if (project.id) {
      // Update existing project
      await db.projects.update(project.id, project);
      return project.id;
    } else {
      // Create new project
      return await db.projects.add(project);
    }
  },
  
  /**
   * Load a project by ID
   * @param {number} id - The project ID
   * @returns {Promise<Object>} The project data
   */
  async loadProject(id) {
    return await db.projects.get(id);
  },
  
  /**
   * Get all projects
   * @returns {Promise<Array>} Array of all projects
   */
  async getAllProjects() {
    return await db.projects.toArray();
  },
  
  /**
   * Delete a project
   * @param {number} id - The project ID to delete
   */
  async deleteProject(id) {
    await db.projects.delete(id);
  },
  
  /**
   * Search projects by name
   * @param {string} query - Search query
   * @returns {Promise<Array>} Matching projects
   */
  async searchProjects(query) {
    const lowerQuery = query.toLowerCase();
    return await db.projects
      .filter(project => 
        project.name.toLowerCase().includes(lowerQuery) ||
        (project.author && project.author.toLowerCase().includes(lowerQuery))
      )
      .toArray();
  }
};

/**
 * Media metadata storage service
 */
export const mediaStorage = {
  /**
   * Save media metadata
   * @param {Object} metadata - Media file metadata
   */
  async saveMetadata(metadata) {
    await db.mediaMetadata.put(metadata);
  },
  
  /**
   * Save multiple media metadata entries
   * @param {Array} metadataArray - Array of metadata objects
   */
  async bulkSaveMetadata(metadataArray) {
    await db.mediaMetadata.bulkPut(metadataArray);
  },
  
  /**
   * Get metadata by ID
   * @param {string} id - Media ID
   * @returns {Promise<Object>} Media metadata
   */
  async getMetadata(id) {
    return await db.mediaMetadata.get(id);
  },
  
  /**
   * Get all metadata
   * @returns {Promise<Array>} All media metadata
   */
  async getAllMetadata() {
    return await db.mediaMetadata.toArray();
  },
  
  /**
   * Delete metadata
   * @param {string} id - Media ID
   */
  async deleteMetadata(id) {
    await db.mediaMetadata.delete(id);
    // Also delete associated thumbnail
    await db.thumbnails.where('mediaId').equals(id).delete();
  }
};

/**
 * Thumbnail cache service
 */
export const thumbnailCache = {
  /**
   * Save a thumbnail to cache
   * @param {string} mediaId - Media ID
   * @param {Blob} thumbnailBlob - Thumbnail image blob
   */
  async saveThumbnail(mediaId, thumbnailBlob) {
    await db.thumbnails.put({
      mediaId,
      thumbnail: thumbnailBlob,
      generatedAt: new Date().toISOString()
    });
  },
  
  /**
   * Get thumbnail from cache
   * @param {string} mediaId - Media ID
   * @returns {Promise<Blob|null>} Thumbnail blob or null if not cached
   */
  async getThumbnail(mediaId) {
    const entry = await db.thumbnails.get(mediaId);
    return entry ? entry.thumbnail : null;
  },
  
  /**
   * Clear old thumbnails (older than specified days)
   * @param {number} days - Number of days to keep
   */
  async clearOldThumbnails(days = 7) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    await db.thumbnails
      .where('generatedAt')
      .below(cutoffDate.toISOString())
      .delete();
  }
};

/**
 * Settings storage service
 */
export const settingsStorage = {
  /**
   * Save a setting
   * @param {string} key - Setting key
   * @param {any} value - Setting value
   */
  async set(key, value) {
    await db.settings.put({ key, value, updatedAt: new Date().toISOString() });
  },
  
  /**
   * Get a setting
   * @param {string} key - Setting key
   * @param {any} defaultValue - Default value if setting doesn't exist
   * @returns {Promise<any>} Setting value
   */
  async get(key, defaultValue = null) {
    const setting = await db.settings.get(key);
    return setting ? setting.value : defaultValue;
  },
  
  /**
   * Get all settings
   * @returns {Promise<Object>} All settings as key-value pairs
   */
  async getAll() {
    const settings = await db.settings.toArray();
    return settings.reduce((acc, setting) => {
      acc[setting.key] = setting.value;
      return acc;
    }, {});
  },
  
  /**
   * Delete a setting
   * @param {string} key - Setting key
   */
  async delete(key) {
    await db.settings.delete(key);
  }
};

/**
 * Book storage service
 */
export const bookStorage = {
  /**
   * Save a book
   * @param {Object} bookData - Book data
   * @returns {Promise<number>} Book ID
   */
  async saveBook(bookData) {
    const book = {
      ...bookData,
      createdAt: bookData.createdAt || new Date().toISOString()
    };
    
    if (book.id) {
      await db.books.update(book.id, book);
      return book.id;
    } else {
      return await db.books.add(book);
    }
  },
  
  /**
   * Get all books
   * @returns {Promise<Array>} All books
   */
  async getAllBooks() {
    return await db.books.toArray();
  },
  
  /**
   * Get books by shelf
   * @param {string} shelfId - Shelf ID
   * @returns {Promise<Array>} Books on the shelf
   */
  async getBooksByShelf(shelfId) {
    return await db.books.where('shelfId').equals(shelfId).toArray();
  },
  
  /**
   * Delete a book
   * @param {number} id - Book ID
   */
  async deleteBook(id) {
    await db.books.delete(id);
  }
};

/**
 * Database utilities
 */
export const dbUtils = {
  /**
   * Clear all data from the database
   * WARNING: This will delete all data!
   */
  async clearAllData() {
    await db.projects.clear();
    await db.mediaMetadata.clear();
    await db.books.clear();
    await db.settings.clear();
    await db.thumbnails.clear();
  },
  
  /**
   * Export entire database to JSON
   * @returns {Promise<Object>} Database export
   */
  async exportDatabase() {
    const [projects, mediaMetadata, books, settings] = await Promise.all([
      db.projects.toArray(),
      db.mediaMetadata.toArray(),
      db.books.toArray(),
      db.settings.toArray()
    ]);
    
    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      data: {
        projects,
        mediaMetadata,
        books,
        settings
      }
    };
  },
  
  /**
   * Import database from JSON
   * @param {Object} data - Database export data
   */
  async importDatabase(data) {
    if (data.version !== 1) {
      throw new Error('Unsupported database version');
    }
    
    // Clear existing data
    await this.clearAllData();
    
    // Import new data
    await Promise.all([
      db.projects.bulkAdd(data.data.projects),
      db.mediaMetadata.bulkAdd(data.data.mediaMetadata),
      db.books.bulkAdd(data.data.books),
      db.settings.bulkAdd(data.data.settings)
    ]);
  },
  
  /**
   * Get database size estimate
   * @returns {Promise<Object>} Size information
   */
  async getDatabaseSize() {
    if ('estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      return {
        usage: estimate.usage,
        quota: estimate.quota,
        percentUsed: (estimate.usage / estimate.quota) * 100
      };
    }
    return null;
  }
};

// Initialize database on first load
db.open().catch((err) => {
  console.error('Failed to open database:', err);
});

export default db;