// Enhanced MediaGridApp with comprehensive Save/Load functionality

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { 
  Sliders, X, Move, Upload, FolderOpen, Image, Music, Video, Save, Download, 
  BookOpen, FileJson, Search, Filter, SortAsc, SortDesc, List, 
  FolderInput, FolderOutput, Check, PlusCircle, Edit, Trash2, AlertCircle
} from 'lucide-react';

// ProjectManager component that handles saving/loading functionality
const ProjectManager = ({ 
  mediaFiles, 
  gridSlots, 
  gridConfig, 
  onLoadProject, 
  isModalOpen, 
  onClose 
}) => {
  const [activeTab, setActiveTab] = useState('save');
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [savedProjects, setSavedProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState(null);
  const fileInputRef = useRef(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  
  // Index file management state
  const [indexFilePath, setIndexFilePath] = useState('');
  const [indexData, setIndexData] = useState([]);
  const [showIndexEditor, setShowIndexEditor] = useState(false);
  const [showAddToIndex, setShowAddToIndex] = useState(false);
  const [exportData, setExportData] = useState({
    title: "",
    author: "Emmanuel Whyte",
    description: "",
    slot: "",
    frontCover: "",
    backCover: "",
    jsonPath: ""
  });
  
  // Load saved projects from localStorage on component mount
  useEffect(() => {
    const loadSavedProjects = () => {
      try {
        const savedProjectsString = localStorage.getItem('mediaGridProjects');
        if (savedProjectsString) {
          const projects = JSON.parse(savedProjectsString);
          setSavedProjects(projects);
        }
      } catch (error) {
        console.error('Error loading saved projects:', error);
        setErrorMessage('Failed to load saved projects from local storage');
      }
    };
    
    loadSavedProjects();
    
    // Try to load last used index path
    const lastIndexPath = localStorage.getItem('lastIndexFilePath');
    if (lastIndexPath) {
      setIndexFilePath(lastIndexPath);
      loadIndexFile(lastIndexPath);
    }
  }, []);
  
  // Filter saved projects based on search term
  const filteredProjects = useMemo(() => {
    if (!searchTerm.trim()) return savedProjects;
    
    const term = searchTerm.toLowerCase();
    return savedProjects.filter(project => 
      project.name.toLowerCase().includes(term) || 
      (project.description && project.description.toLowerCase().includes(term))
    );
  }, [savedProjects, searchTerm]);
  
  // Reset form and notification messages
  const resetForm = () => {
    setProjectName('');
    setProjectDescription('');
    setSelectedProject(null);
    setErrorMessage('');
    setSuccessMessage('');
  };
  
  // Helper to serialize project data
  const serializeProject = () => {
    return {
      name: projectName,
      description: projectDescription,
      date: new Date().toISOString(),
      mediaFiles: mediaFiles.map(media => ({
        url: media.url,
        type: media.type,
        name: media.name,
        size: media.size,
        date: media.date
        // Don't store the actual file object - it won't survive serialization
      })),
      gridSlots: gridSlots.map(slot => {
        if (!slot) return null;
        return {
          url: slot.url,
          type: slot.type,
          name: slot.name,
          size: slot.size,
          date: slot.date
        };
      }),
      gridConfig: { ...gridConfig }
    };
  };
  
  // Save project to localStorage
  const saveToLocalStorage = (project) => {
    try {
      const updatedProjects = [...savedProjects];
      const existingIndex = updatedProjects.findIndex(p => p.name === project.name);
      
      if (existingIndex >= 0) {
        updatedProjects[existingIndex] = project;
      } else {
        updatedProjects.push(project);
      }
      
      localStorage.setItem('mediaGridProjects', JSON.stringify(updatedProjects));
      setSavedProjects(updatedProjects);
      return true;
    } catch (error) {
      console.error('Error saving to localStorage:', error);
      setErrorMessage('Failed to save project to local storage');
      return false;
    }
  };
  
  // Handle project save
  const handleSaveProject = () => {
    if (!projectName.trim()) {
      setErrorMessage('Please enter a project name');
      return;
    }
    
    const existingProject = savedProjects.find(p => p.name === projectName);
    if (existingProject && !confirm(`A project named "${projectName}" already exists. Overwrite it?`)) {
      return;
    }
    
    const project = serializeProject();
    
    if (saveToLocalStorage(project)) {
      setSuccessMessage(`Project "${projectName}" saved successfully`);
      
      // Create downloadable JSON file
      const jsonBlob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(jsonBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${projectName.replace(/\s+/g, '_')}.mgrid.json`;
      
      // Add a small delay so the user sees the success message
      setTimeout(() => {
        a.click();
        URL.revokeObjectURL(url);
      }, 500);
    }
  };
  
  // Handle JSON file upload for project import
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const projectData = JSON.parse(event.target.result);
        
        // Validate imported project data
        if (!projectData.name || !projectData.gridConfig || !Array.isArray(projectData.gridSlots)) {
          setErrorMessage('Invalid project file format');
          return;
        }
        
        // Check if project already exists
        const existingProject = savedProjects.find(p => p.name === projectData.name);
        if (existingProject && !confirm(`A project named "${projectData.name}" already exists. Overwrite it?`)) {
          return;
        }
        
        // Save to localStorage
        if (saveToLocalStorage(projectData)) {
          setSuccessMessage(`Project "${projectData.name}" imported successfully`);
          setSelectedProject(projectData);
        }
      } catch (error) {
        console.error('Error parsing project file:', error);
        setErrorMessage('Failed to parse project file. Invalid JSON format.');
      }
    };
    
    reader.readAsText(file);
    e.target.value = null; // Reset file input
  };
  
  // Handle loading a project
  const handleLoadProject = () => {
    if (!selectedProject) {
      setErrorMessage('Please select a project to load');
      return;
    }
    
    // Pass the selected project to parent component
    onLoadProject(selectedProject);
    setSuccessMessage(`Project "${selectedProject.name}" loaded successfully`);
    onClose();
  };
  
  // Handle project deletion
  const confirmDeleteProject = (project) => {
    setProjectToDelete(project);
    setShowDeleteConfirm(true);
  };
  
  const handleDeleteProject = () => {
    if (!projectToDelete) return;
    
    try {
      const updatedProjects = savedProjects.filter(p => p.name !== projectToDelete.name);
      localStorage.setItem('mediaGridProjects', JSON.stringify(updatedProjects));
      setSavedProjects(updatedProjects);
      setSelectedProject(null);
      setSuccessMessage(`Project "${projectToDelete.name}" deleted successfully`);
      setShowDeleteConfirm(false);
      setProjectToDelete(null);
    } catch (error) {
      console.error('Error deleting project:', error);
      setErrorMessage('Failed to delete project');
    }
  };
  
  // Export project as downloadable JSON
  const handleExportProject = (project) => {
    try {
      const jsonBlob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(jsonBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project.name.replace(/\s+/g, '_')}.mgrid.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting project:', error);
      setErrorMessage('Failed to export project');
    }
  };
  
  // Load index file 
  const loadIndexFile = async (path) => {
    try {
      // In a real implementation, you would fetch this from a server or file system
      // For this example, we'll use the provided index.json content
      // In a real application, you would use:
      // const response = await fetch(path);
      // const data = await response.json();
      
      // Simulating loading from a path by using hard-coded data for demonstration
      // In a real app, this would be fetched from the actual path
      const data = [
        {
          "title": "Volume One",
          "description": "A collection of animated drawings and random things I made that make me laugh. The first volume is experimental but aims to capture the essence of the project overall.",
          "slot": "SlotA",
          "frontCover": "cover",
          "backCover": "book-back2",
          "jsonPath": "/volumes/book1.json"
        },
        {
          "title": "Volume Two",
          "description": "Abstract explorations of form and movement through digital animation and illustration.",
          "slot": "SlotB",
          "frontCover": "cover-volume-002",
          "backCover": "blank",
          "jsonPath": "/volumes/book2.json"
        },
        {
          "title": "Volume Three",
          "description": "Experimental digital art combining moving elements and static illustrations in an interactive format.",
          "slot": "SlotC",
          "frontCover": "adblocker",
          "backCover": "blank",
          "jsonPath": "/volumes/book3.json"
        }
      ];
      
      setIndexData(data);
      localStorage.setItem('lastIndexFilePath', path);
      setSuccessMessage('Index file loaded successfully');
    } catch (error) {
      console.error('Error loading index file:', error);
      setErrorMessage('Failed to load index file');
    }
  };
  
  // Save index file
  const saveIndexFile = async () => {
    try {
      // In a real implementation, you would save this to the server or file system
      // For this example, we'll just show the updated content
      console.log('Updated index data:', JSON.stringify(indexData, null, 2));
      setSuccessMessage('Index file saved successfully');
      
      // In a real application, you would use:
      // await fetch(indexFilePath, {
      //   method: 'PUT',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(indexData)
      // });
    } catch (error) {
      console.error('Error saving index file:', error);
      setErrorMessage('Failed to save index file');
    }
  };
  
  // Add current project to index
  const handleAddToIndex = () => {
    if (!indexFilePath) {
      setErrorMessage('Please set an index file path first');
      return;
    }
    
    const newVolume = {
      title: exportData.title || projectName,
      description: exportData.description || projectDescription,
      slot: exportData.slot || `Slot${String.fromCharCode(65 + indexData.length)}`, // SlotA, SlotB, etc.
      frontCover: exportData.frontCover || (gridSlots[0]?.name || ""),
      backCover: exportData.backCover || (gridSlots[gridSlots.length - 1]?.name || "blank"),
      jsonPath: exportData.jsonPath || `/volumes/${projectName.replace(/\s+/g, '_').toLowerCase()}.json`
    };
    
    // Check if this volume already exists in the index
    const existingIndex = indexData.findIndex(vol => vol.title === newVolume.title);
    
    if (existingIndex >= 0) {
      if (confirm(`Volume "${newVolume.title}" already exists in the index. Overwrite it?`)) {
        const updatedIndexData = [...indexData];
        updatedIndexData[existingIndex] = newVolume;
        setIndexData(updatedIndexData);
        setSuccessMessage(`Updated volume "${newVolume.title}" in the index`);
      }
    } else {
      setIndexData([...indexData, newVolume]);
      setSuccessMessage(`Added volume "${newVolume.title}" to the index`);
    }
    
    setShowAddToIndex(false);
  };
  
  // Update index item
  const updateIndexItem = (index, field, value) => {
    const updatedIndexData = [...indexData];
    updatedIndexData[index] = {
      ...updatedIndexData[index],
      [field]: value
    };
    setIndexData(updatedIndexData);
  };
  
  // Remove index item
  const removeIndexItem = (index) => {
    if (confirm(`Are you sure you want to remove "${indexData[index].title}" from the index?`)) {
      const updatedIndexData = [...indexData];
      updatedIndexData.splice(index, 1);
      setIndexData(updatedIndexData);
    }
  };
  
  if (!isModalOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-4xl p-6 max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Project Manager</h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>
        
        {/* Tabs */}
        <div className="flex border-b mb-4">
          <button 
            className={`py-2 px-4 font-medium ${activeTab === 'save' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600'}`}
            onClick={() => {
              setActiveTab('save');
              resetForm();
            }}
          >
            <Save size={16} className="inline-block mr-1" /> Save Project
          </button>
          <button 
            className={`py-2 px-4 font-medium ${activeTab === 'load' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600'}`}
            onClick={() => {
              setActiveTab('load');
              resetForm();
            }}
          >
            <FolderOpen size={16} className="inline-block mr-1" /> Load Project
          </button>
          <button 
            className={`py-2 px-4 font-medium ${activeTab === 'index' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600'}`}
            onClick={() => {
              setActiveTab('index');
              resetForm();
            }}
          >
            <FileJson size={16} className="inline-block mr-1" /> Index Management
          </button>
        </div>
        
        <div className="flex-1 overflow-auto">
          {/* Notification messages */}
          {errorMessage && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded flex items-center">
              <AlertCircle size={16} className="mr-2" />
              {errorMessage}
              <button 
                className="ml-auto text-red-700" 
                onClick={() => setErrorMessage('')}
                aria-label="Dismiss"
              >
                <X size={16} />
              </button>
            </div>
          )}
          
          {successMessage && (
            <div className="mb-4 p-3 bg-green-100 text-green-700 rounded flex items-center">
              <Check size={16} className="mr-2" />
              {successMessage}
              <button 
                className="ml-auto text-green-700" 
                onClick={() => setSuccessMessage('')}
                aria-label="Dismiss"
              >
                <X size={16} />
              </button>
            </div>
          )}
          
          {/* Save Project Tab */}
          {activeTab === 'save' && (
            <div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Project Name *</label>
                  <input 
                    type="text"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder="Enter project name"
                    className="w-full px-3 py-2 border rounded focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Project Description</label>
                  <textarea 
                    value={projectDescription}
                    onChange={(e) => setProjectDescription(e.target.value)}
                    placeholder="Optional description for your project"
                    className="w-full px-3 py-2 border rounded focus:ring-blue-500 focus:border-blue-500"
                    rows={3}
                  />
                </div>
                
                <div className="bg-gray-50 p-3 rounded border">
                  <h3 className="font-medium mb-2">Project Contents Summary</h3>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    <div>Media Files: <span className="font-medium">{mediaFiles.length}</span></div>
                    <div>Grid Slots Used: <span className="font-medium">{gridSlots.filter(Boolean).length}</span></div>
                    <div>Grid Layout: <span className="font-medium">{gridConfig.columns} × {gridConfig.rows}</span></div>
                    <div>Last Modified: <span className="font-medium">{new Date().toLocaleDateString()}</span></div>
                  </div>
                </div>
              </div>
              
              <div className="mt-8 flex justify-end">
                <button
                  onClick={handleSaveProject}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center disabled:bg-blue-300"
                  disabled={!projectName.trim()}
                >
                  <Save size={16} className="mr-2" /> Save Project
                </button>
              </div>
            </div>
          )}
          
          {/* Load Project Tab */}
          {activeTab === 'load' && (
            <div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Import from file</label>
                <div className="flex space-x-2">
                  <button
                    onClick={() => fileInputRef.current.click()}
                    className="px-4 py-2 border border-blue-500 text-blue-500 rounded hover:bg-blue-50 flex items-center"
                  >
                    <Upload size={16} className="mr-2" /> Choose File
                  </button>
                  <input 
                    type="file"
                    ref={fileInputRef}
                    accept=".json,.mgrid.json"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <span className="text-sm text-gray-500 self-center">
                    Accepts .json or .mgrid.json files
                  </span>
                </div>
              </div>
              
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-medium text-gray-700">Saved Projects</label>
                  <div className="relative w-64">
                    <input 
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search projects..."
                      className="w-full pl-8 pr-3 py-1 border rounded text-sm"
                    />
                    <Search size={14} className="absolute left-2.5 top-1.5 text-gray-400" />
                    {searchTerm && (
                      <button 
                        onClick={() => setSearchTerm('')}
                        className="absolute right-2 top-1.5 text-gray-400 hover:text-gray-600"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>
                </div>
                
                {filteredProjects.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 border rounded">
                    {savedProjects.length === 0 ? (
                      <p>No saved projects yet</p>
                    ) : (
                      <p>No projects match your search</p>
                    )}
                  </div>
                ) : (
                  <div className="max-h-80 overflow-y-auto border rounded divide-y">
                    {filteredProjects.map((project, idx) => (
                      <div 
                        key={idx}
                        onClick={() => setSelectedProject(project)}
                        className={`p-2 hover:bg-gray-50 cursor-pointer ${selectedProject?.name === project.name ? 'bg-blue-50' : ''}`}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="font-medium">{project.name}</div>
                            {project.description && (
                              <div className="text-xs text-gray-500 line-clamp-2">{project.description}</div>
                            )}
                            <div className="text-xs text-gray-500 mt-1">
                              {new Date(project.date).toLocaleString()}
                            </div>
                          </div>
                          <div className="flex space-x-1">
                            <button 
                              className="text-blue-600 hover:text-blue-800 p-1"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleExportProject(project);
                              }}
                              title="Export project"
                            >
                              <Download size={16} />
                            </button>
                            <button 
                              className="text-red-600 hover:text-red-800 p-1"
                              onClick={(e) => {
                                e.stopPropagation();
                                confirmDeleteProject(project);
                              }}
                              title="Delete project"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                        
                        {/* Project metadata */}
                        <div className="mt-1 text-xs text-gray-500 grid grid-cols-3 gap-1">
                          <div>Media: {project.mediaFiles?.length || 0}</div>
                          <div>
                            Grid: {project.gridConfig?.columns || 0}×{project.gridConfig?.rows || 0}
                          </div>
                          <div>Used slots: {project.gridSlots?.filter(Boolean).length || 0}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="mt-4 flex justify-end">
                <button
                  onClick={handleLoadProject}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center disabled:bg-blue-300"
                  disabled={!selectedProject}
                >
                  <FolderOpen size={16} className="mr-2" /> Load Selected Project
                </button>
              </div>
            </div>
          )}
          
          {/* Index Management Tab */}
          {activeTab === 'index' && (
            <div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Index File Path</label>
                <div className="flex space-x-2">
                  <input 
                    type="text"
                    value={indexFilePath}
                    onChange={(e) => setIndexFilePath(e.target.value)}
                    placeholder="/path/to/index.json"
                    className="flex-1 px-3 py-2 border rounded focus:ring-blue-500 focus:border-blue-500"
                  />
                  <button
                    onClick={() => loadIndexFile(indexFilePath)}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center"
                    disabled={!indexFilePath.trim()}
                  >
                    <FolderOpen size={16} className="mr-2" /> Load
                  </button>
                </div>
              </div>
              
              {indexData.length > 0 && (
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-medium">Index Contents</h3>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setShowIndexEditor(!showIndexEditor)}
                        className="text-sm px-3 py-1 border rounded flex items-center"
                      >
                        {showIndexEditor ? 'View Mode' : 'Edit Mode'}
                      </button>
                      <button
                        onClick={() => setShowAddToIndex(true)}
                        className="text-sm px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 flex items-center"
                      >
                        <PlusCircle size={14} className="mr-1" /> Add Current Project
                      </button>
                    </div>
                  </div>
                  
                  {/* Display index data */}
                  <div className="border rounded overflow-hidden">
                    {showIndexEditor ? (
                      // Edit mode
                      <div className="divide-y">
                        {indexData.map((item, idx) => (
                          <div key={idx} className="p-3 hover:bg-gray-50">
                            <div className="flex justify-between mb-2">
                              <h4 className="font-medium">Volume {idx + 1}</h4>
                              <button
                                onClick={() => removeIndexItem(idx)}
                                className="text-red-600 hover:text-red-800"
                                title="Remove from index"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs text-gray-500 mb-1">Title</label>
                                <input 
                                  type="text"
                                  value={item.title}
                                  onChange={(e) => updateIndexItem(idx, 'title', e.target.value)}
                                  className="w-full px-2 py-1 border rounded text-sm"
                                />
                              </div>
                              <div>
                                <label className="block text-xs text-gray-500 mb-1">Slot</label>
                                <input 
                                  type="text"
                                  value={item.slot}
                                  onChange={(e) => updateIndexItem(idx, 'slot', e.target.value)}
                                  className="w-full px-2 py-1 border rounded text-sm"
                                />
                              </div>
                              <div className="col-span-2">
                                <label className="block text-xs text-gray-500 mb-1">Description</label>
                                <textarea 
                                  value={item.description}
                                  onChange={(e) => updateIndexItem(idx, 'description', e.target.value)}
                                  className="w-full px-2 py-1 border rounded text-sm"
                                  rows={2}
                                />
                              </div>
                              <div>
                                <label className="block text-xs text-gray-500 mb-1">Front Cover</label>
                                <input 
                                  type="text"
                                  value={item.frontCover}
                                  onChange={(e) => updateIndexItem(idx, 'frontCover', e.target.value)}
                                  className="w-full px-2 py-1 border rounded text-sm"
                                />
                              </div>
                              <div>
                                <label className="block text-xs text-gray-500 mb-1">Back Cover</label>
                                <input 
                                  type="text"
                                  value={item.backCover}
                                  onChange={(e) => updateIndexItem(idx, 'backCover', e.target.value)}
                                  className="w-full px-2 py-1 border rounded text-sm"
                                />
                              </div>
                              <div className="col-span-2">
                                <label className="block text-xs text-gray-500 mb-1">JSON Path</label>
                                <input 
                                  type="text"
                                  value={item.jsonPath}
                                  onChange={(e) => updateIndexItem(idx, 'jsonPath', e.target.value)}
                                  className="w-full px-2 py-1 border rounded text-sm"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      // View mode
                      <div>
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Slot</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Front Cover</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">JSON Path</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {indexData.map((item, idx) => (
                              <tr key={idx} className="hover:bg-gray-50">
                                <td className="px-4 py-2 text-sm">{item.title}</td>
                                <td className="px-4 py-2 text-sm">{item.slot}</td>
                                <td className="px-4 py-2 text-sm">{item.frontCover}</td>
                                <td className="px-4 py-2 text-sm text-gray-500">{item.jsonPath}</td>
                                <td className="px-4 py-2 text-sm line-clamp-2">{item.description}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-3 flex justify-end">
                    <button
                      onClick={saveIndexFile}
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center"
                    >
                      <Save size={16} className="mr-2" /> Save Index File
                    </button>
                  </div>
                </div>
              )}
              
              {/* "Add to Index" modal */}
              {showAddToIndex && (
                <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
                  <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-lg">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-bold">Add to Index</h3>
                      <button 
                        onClick={() => setShowAddToIndex(false)}
                        className="text-gray-500 hover:text-gray-700"
                      >
                        <X size={18} />
                      </button>
                    </div>
                    
                    <div className="space-y-3 mb-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Volume Title</label>
                        <input 
                          type="text"
                          value={exportData.title}
                          onChange={(e) => setExportData({...exportData, title: e.target.value})}
                          placeholder={projectName || "Volume Title"}
                          className="w-full px-3 py-2 border rounded focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                        <textarea 
                          value={exportData.description}
                          onChange={(e) => setExportData({...exportData, description: e.target.value})}
                          placeholder={projectDescription || "Add a brief description"}
                          className="w-full px-3 py-2 border rounded focus:ring-blue-500 focus:border-blue-500"
                          rows={3}
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Slot</label>
                        <input 
                          type="text"
                          value={exportData.slot}
                          onChange={(e) => setExportData({...exportData, slot: e.target.value})}
                          placeholder={`Slot${String.fromCharCode(65 + indexData.length)}`}
                          className="w-full px-3 py-2 border rounded focus:ring-blue-500 focus:border-blue-500"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Leave blank to auto-assign (SlotA, SlotB, etc.)
                        </p>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Front Cover</label>
                          <input 
                            type="text"
                            value={exportData.frontCover}
                            onChange={(e) => setExportData({...exportData, frontCover: e.target.value})}
                            placeholder={gridSlots[0]?.name || "cover"}
                            className="w-full px-3 py-2 border rounded focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Back Cover</label>
                          <input 
                            type="text"
                            value={exportData.backCover}
                            onChange={(e) => setExportData({...exportData, backCover: e.target.value})}
                            placeholder={gridSlots[gridSlots.length - 1]?.name || "blank"}
                            className="w-full px-3 py-2 border rounded focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">JSON Path</label>
                        <input 
                          type="text"
                          value={exportData.jsonPath}
                          onChange={(e) => setExportData({...exportData, jsonPath: e.target.value})}
                          placeholder={`/volumes/${projectName?.replace(/\s+/g, '_').toLowerCase() || "volume"}.json`}
                          className="w-full px-3 py-2 border rounded focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>
                    
                    <div className="flex justify-end space-x-3">
                      <button
                        onClick={() => setShowAddToIndex(false)}
                        className="px-4 py-2 border rounded text-gray-600 hover:bg-gray-100"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleAddToIndex}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center"
                      >
                        <PlusCircle size={16} className="mr-2" /> Add to Index
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Delete confirmation dialog */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
              <div className="text-center mb-4">
                <AlertCircle size={48} className="mx-auto mb-4 text-red-500" />
                <h3 className="text-lg font-bold">Confirm Delete</h3>
                <p className="text-gray-600">
                  Are you sure you want to delete "{projectToDelete?.name}"? This action cannot be undone.
                </p>
              </div>
              
              <div className="flex justify-center space-x-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 border rounded text-gray-600 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteProject}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 flex items-center"
                >
                  <Trash2 size={16} className="mr-2" /> Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectManager;