// hooks/useProjectStorage.js
import { useState, useCallback, useEffect } from 'react';
import { useAtom } from 'jotai';
import { projectStorage, dbUtils } from '../services/database';
import { migrateFromLocalStorage } from '../utils/storageMigration';
import { 
  mediaFilesAtom, 
  gridSlotsAtom, 
  freeGridItemsAtom,
  bookVolumeMetadataAtom,
  atomPagesAtom,
  vectorShapesAtom,
  vectorPathsAtom,
  vectorTextAtom
} from '../store';

/**
 * Hook for managing project storage with IndexedDB
 */
export const useProjectStorage = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [projects, setProjects] = useState([]);
  
  // Atoms for project data
  const [mediaFiles, setMediaFiles] = useAtom(mediaFilesAtom);
  const [gridSlots, setGridSlots] = useAtom(gridSlotsAtom);
  const [freeGridItems, setFreeGridItems] = useAtom(freeGridItemsAtom);
  const [bookVolumeMetadata, setBookVolumeMetadata] = useAtom(bookVolumeMetadataAtom);
  const [atomPages, setAtomPages] = useAtom(atomPagesAtom);
  const [vectorShapes, setVectorShapes] = useAtom(vectorShapesAtom);
  const [vectorPaths, setVectorPaths] = useAtom(vectorPathsAtom);
  const [vectorText, setVectorText] = useAtom(vectorTextAtom);

  // Initialize and migrate on mount
  useEffect(() => {
    const init = async () => {
      try {
        // Migrate from localStorage if needed
        await migrateFromLocalStorage();
        
        // Load all projects
        const allProjects = await projectStorage.getAllProjects();
        setProjects(allProjects);
      } catch (err) {
        console.error('Failed to initialize project storage:', err);
        setError(err.message);
      }
    };
    
    init();
  }, []);

  /**
   * Save current project state
   */
  const saveProject = useCallback(async (projectName, author = 'Gridworm User') => {
    setLoading(true);
    setError(null);
    
    try {
      // Prepare project data
      const projectData = {
        name: projectName,
        author: author,
        mediaFiles: mediaFiles.map(file => ({
          id: file.id,
          name: file.name,
          type: file.type,
          fileType: file.fileType,
          size: file.size,
          lastModified: file.lastModified,
          thumbnailUrl: file.thumbnailUrl,
          metadata: file.metadata || {}
        })),
        gridSlots: gridSlots.map(slot => slot ? {
          id: slot.id,
          name: slot.name,
          type: slot.type,
          fileType: slot.fileType
        } : null),
        freeGridItems: freeGridItems,
        bookData: {
          volumeMetadata: bookVolumeMetadata,
          pages: atomPages
        },
        vectorData: {
          shapes: vectorShapes,
          paths: vectorPaths,
          text: vectorText
        },
        savedAt: new Date().toISOString()
      };

      // Save to IndexedDB
      const projectId = await projectStorage.saveProject(projectData);
      
      // Reload projects list
      const allProjects = await projectStorage.getAllProjects();
      setProjects(allProjects);
      
      // Show storage usage
      const dbSize = await dbUtils.getDatabaseSize();
      if (dbSize) {
        console.log(`Storage used: ${(dbSize.percentUsed).toFixed(2)}%`);
      }
      
      return projectId;
    } catch (err) {
      console.error('Failed to save project:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [mediaFiles, gridSlots, freeGridItems, bookVolumeMetadata, atomPages, vectorShapes, vectorPaths, vectorText]);

  /**
   * Load a project by ID
   */
  const loadProject = useCallback(async (projectId) => {
    setLoading(true);
    setError(null);
    
    try {
      const project = await projectStorage.loadProject(projectId);
      
      if (!project) {
        throw new Error('Project not found');
      }

      // Restore project state
      // Note: Media files need to be re-uploaded as we don't store the actual file data
      const restoredMediaFiles = project.mediaFiles.map(file => ({
        ...file,
        isPlaceholder: true, // Mark as placeholder until user re-uploads
        url: null,
        file: null
      }));
      
      setMediaFiles(restoredMediaFiles);
      setGridSlots(project.gridSlots || []);
      setFreeGridItems(project.freeGridItems || {});
      
      if (project.bookData) {
        setBookVolumeMetadata(project.bookData.volumeMetadata || {});
        setAtomPages(project.bookData.pages || []);
      }
      
      if (project.vectorData) {
        setVectorShapes(project.vectorData.shapes || []);
        setVectorPaths(project.vectorData.paths || []);
        setVectorText(project.vectorData.text || []);
      }
      
      return project;
    } catch (err) {
      console.error('Failed to load project:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [setMediaFiles, setGridSlots, setFreeGridItems, setBookVolumeMetadata, setAtomPages, setVectorShapes, setVectorPaths, setVectorText]);

  /**
   * Delete a project
   */
  const deleteProject = useCallback(async (projectId) => {
    setLoading(true);
    setError(null);
    
    try {
      await projectStorage.deleteProject(projectId);
      
      // Reload projects list
      const allProjects = await projectStorage.getAllProjects();
      setProjects(allProjects);
    } catch (err) {
      console.error('Failed to delete project:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Export project to JSON file
   */
  const exportProject = useCallback(async (projectId) => {
    try {
      const project = await projectStorage.loadProject(projectId);
      
      if (!project) {
        throw new Error('Project not found');
      }

      const blob = new Blob([JSON.stringify(project, null, 2)], { 
        type: 'application/json' 
      });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project.name.replace(/\s+/g, '-').toLowerCase()}.gridworm.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export project:', err);
      setError(err.message);
      throw err;
    }
  }, []);

  /**
   * Import project from JSON file
   */
  const importProject = useCallback(async (file) => {
    setLoading(true);
    setError(null);
    
    try {
      const text = await file.text();
      const projectData = JSON.parse(text);
      
      // Validate project data
      if (!projectData.name || !Array.isArray(projectData.mediaFiles)) {
        throw new Error('Invalid project file format');
      }
      
      // Save as new project
      const projectId = await projectStorage.saveProject({
        ...projectData,
        name: `${projectData.name} (Imported)`,
        importedAt: new Date().toISOString()
      });
      
      // Reload projects list
      const allProjects = await projectStorage.getAllProjects();
      setProjects(allProjects);
      
      return projectId;
    } catch (err) {
      console.error('Failed to import project:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Search projects by name or author
   */
  const searchProjects = useCallback(async (query) => {
    try {
      const results = await projectStorage.searchProjects(query);
      return results;
    } catch (err) {
      console.error('Failed to search projects:', err);
      setError(err.message);
      return [];
    }
  }, []);

  return {
    // State
    projects,
    loading,
    error,
    
    // Actions
    saveProject,
    loadProject,
    deleteProject,
    exportProject,
    importProject,
    searchProjects
  };
};