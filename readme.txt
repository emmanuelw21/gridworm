Enhanced Media Grid App Components Guide
Here's a structured guide to help you navigate and piece together the components of the Enhanced Media Grid App:
Core Component Structure

Main App Component: EnhancedMediaGridApp
Import Statements: React, hooks, icon imports from lucide-react

State Management

Basic State

phase, mediaFiles, filteredMediaFiles, gridSlots, hoveredItem
gridConfig (columns, rows, cellWidth, cellHeight)
showControls, mediaPanelLayout


Index Panel State

showIndexPanel, indexPanelWidth
editingIndex, editedIndexJson
indexData


Export & Metadata State

showExportDialog, exportData (title, author, description, etc.)
exportSettings (exportFolder, createZip, includeManifest, etc.)
selectedMediaItems, bulkMetadataField, bulkMetadataValue
availableMetadataFields


JSON Template State

showJsonEditor, jsonTemplate
jsonTemplatePresets (default, detailed, minimal)


Dialog Control State

showUpdateIndexDialog, updateIndexData
showAdvancedExportDialog
showBulkMetadataEditor
showSaveDialog, showLoadDialog, projectName, savedProjects


Filter & Sort State

searchTerm, showFilters, fileTypeFilters
sortConfig (key, direction)



Core Utility Functions

File Processing

getFileIcon, formatFileSize, getFilename
processFile, getFileTypeFromExtension, isSupported
getFileExtension, getFileTypeCategory


Filter & Sort Functions

handleSort, toggleFileTypeFilter
setFiltersForCategory, areAllFiltersActive, areAnyFiltersActive


Grid Functions

generateBookData, createIndexEntry
updateGridConfig, handleDropToSlot


Export & Save Functions

updateIndex, handleExport, handleBatchExport
saveIndex, saveProject, loadProject
generateManifest


JSON Template Functions

addJsonField, removeJsonField, updateJsonTemplate
handleTemplateSelection


Metadata Functions

applyBulkMetadataChanges, handleMetadataFieldEdit
toggleMediaItemSelection, selectAllMediaItems, deselectAllMediaItems
handleMediaItemSelect



UI Components

MediaPreview Component

Renders different media types (image, video, audio)
Includes selection indicators


JsonTreeView Component

Recursive component for editing JSON structure
Supports drag-and-drop field reordering



Dialogs

Save/Load Dialogs

showSaveDialog - For saving project
showLoadDialog - For loading project


Export Dialogs

showExportDialog - Basic export options
showAdvancedExportDialog - Advanced export with batch options
showUpdateIndexDialog - For updating index


Metadata Editor Dialog

showBulkMetadataEditor - For editing metadata of multiple items


JSON Editor Dialog

showJsonEditor - For customizing JSON templates



Layout Sections

Top Bar - Main app controls
Media Panel - Left side with media files
Grid Builder - Middle section with grid slots
Index Panel - Right side with index data

Event Handlers

File Input Handlers

handleFilesSelected, onFileInputChange
handleUploadFiles, handleUploadFolder
handleProjectFileSelected, handleIndexFileSelected


Form Input Handlers

handleExportFormChange, handleUpdateIndexFormChange
handleExportSettingsChange


Resize Handlers

handleMediaPanelResize, handleIndexPanelResize
setIsResizing, setIsResizingIndexPanel


Keyboard Shortcut Handlers

Ctrl+A for select all
Delete key for removing items
Escape key for closing dialogs



This guide should help you navigate the different sections of the Enhanced Media Grid App and understand how they fit together. The components are organized in a logical flow from state management to utility functions to UI components and event handlers.