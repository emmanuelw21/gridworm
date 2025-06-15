// utils/storageMigration.js
import { projectStorage, settingsStorage, bookStorage } from '../services/database';

const LOCAL_STORAGE_KEY = 'gridworm_saved_projects';
const BOOKSHELF_STORAGE_KEY = 'gridworm_bookshelf_data';
const MIGRATION_FLAG_KEY = 'gridworm_indexeddb_migrated';

/**
 * Migrate data from localStorage to IndexedDB
 * This ensures a smooth transition for existing users
 */
export const migrateFromLocalStorage = async () => {
  try {
    // Check if we've already migrated
    const migrated = localStorage.getItem(MIGRATION_FLAG_KEY);
    if (migrated === 'true') {
      console.log('Data already migrated to IndexedDB');
      return;
    }

    console.log('Starting migration from localStorage to IndexedDB...');

    // Migrate projects
    const savedProjectsJson = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (savedProjectsJson) {
      try {
        const savedProjects = JSON.parse(savedProjectsJson);
        if (Array.isArray(savedProjects)) {
          console.log(`Migrating ${savedProjects.length} projects...`);
          
          for (const project of savedProjects) {
            await projectStorage.saveProject({
              ...project,
              // Ensure we have all required fields
              name: project.name || `Project ${new Date(project.createdAt || Date.now()).toLocaleDateString()}`,
              author: project.author || 'Unknown',
              createdAt: project.createdAt || new Date().toISOString(),
              updatedAt: project.updatedAt || new Date().toISOString()
            });
          }
          
          console.log('Projects migrated successfully');
        }
      } catch (error) {
        console.error('Error migrating projects:', error);
      }
    }

    // Migrate bookshelf data
    const bookshelfJson = localStorage.getItem(BOOKSHELF_STORAGE_KEY);
    if (bookshelfJson) {
      try {
        const bookshelfData = JSON.parse(bookshelfJson);
        
        // Migrate theme setting
        if (bookshelfData.theme) {
          await settingsStorage.set('bookshelfTheme', bookshelfData.theme);
        }
        
        // Migrate books from shelves
        if (bookshelfData.shelves && Array.isArray(bookshelfData.shelves)) {
          console.log('Migrating bookshelf data...');
          
          for (const shelf of bookshelfData.shelves) {
            if (shelf.books && Array.isArray(shelf.books)) {
              for (const book of shelf.books) {
                await bookStorage.saveBook({
                  ...book,
                  shelfId: shelf.id,
                  shelfLabel: shelf.label
                });
              }
            }
          }
          
          // Save shelf structure as a setting
          await settingsStorage.set('bookshelfStructure', bookshelfData.shelves.map(shelf => ({
            id: shelf.id,
            label: shelf.label
          })));
          
          console.log('Bookshelf data migrated successfully');
        }
      } catch (error) {
        console.error('Error migrating bookshelf data:', error);
      }
    }

    // Migrate other settings
    const darkModeString = localStorage.getItem('darkMode');
    if (darkModeString !== null) {
      await settingsStorage.set('darkMode', darkModeString === 'true');
    }

    // Set migration flag
    localStorage.setItem(MIGRATION_FLAG_KEY, 'true');
    console.log('Migration completed successfully');

  } catch (error) {
    console.error('Migration failed:', error);
    // Don't set the flag if migration failed, so it can be retried
  }
};

/**
 * Export localStorage data for backup before migration
 */
export const backupLocalStorageData = () => {
  const backup = {
    version: 1,
    timestamp: new Date().toISOString(),
    data: {}
  };

  // Get all localStorage keys
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('gridworm_')) {
      try {
        const value = localStorage.getItem(key);
        backup.data[key] = JSON.parse(value);
      } catch {
        // If parsing fails, store as string
        backup.data[key] = localStorage.getItem(key);
      }
    }
  }

  return backup;
};

/**
 * Clean up localStorage after successful migration
 * Only removes Gridworm-specific keys
 */
export const cleanupLocalStorage = () => {
  const keysToRemove = [];
  
  // Collect Gridworm keys
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('gridworm_') && key !== MIGRATION_FLAG_KEY) {
      keysToRemove.push(key);
    }
  }
  
  // Remove collected keys
  keysToRemove.forEach(key => {
    localStorage.removeItem(key);
  });
  
  console.log(`Cleaned up ${keysToRemove.length} localStorage entries`);
};