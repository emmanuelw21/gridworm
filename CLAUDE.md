# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Start development server (port 5174 with host access)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Clean cache and dist folders
npm run clean
```

## Architecture Overview

GridWorm is a React-based media organization application that allows users to manage, view, and manipulate media files in 2D grids, 3D environments, and book-like layouts.

### Core Technologies
- **Framework**: React 18 with Vite
- **State Management**: Jotai (atomic state management) - centralized in `src/store.js`
- **3D Graphics**: Three.js with React Three Fiber
- **Drag & Drop**: @dnd-kit
- **Storage**: Dexie (IndexedDB wrapper) for persistent storage
- **Styling**: Tailwind CSS with dark mode support

### Key Application States (Jotai Atoms in store.js)
- `mediaFilesAtom`: Main media collection
- `gridSlotsAtom`: 2D grid layout state
- `freeGridItemsAtom`: Free canvas items
- `atomPagesAtom`: Book page organization
- `bookVolumeMetadataAtom`: Book metadata
- `selectedBookIndexAtom`: Current book selection
- UI state atoms for panels, dialogs, and views

### State Management Data Flow
**Critical State Dependencies:**
- `atomPagesAtom`:
  - Writers: `PageMappingDialog`, `handleManualSync`, `loadProject`
  - Readers: `Book.jsx`, `PageThumbnails`, `AnimatedBookViewer`
  - Note: Changes trigger re-renders in 3D book viewer
  
- `mediaFilesAtom`:
  - Writers: File upload handlers, placeholder creation, metadata editors
  - Readers: All media display components
  - Note: Large updates should be batched to avoid performance issues

### Major Components

1. **Media Management** (`src/components/MediaGrid/`)
   - Handles file uploads, thumbnails, metadata
   - Uses Web Workers for thumbnail generation (`public/thumbnail.worker.js`)
   - Virtualized grid for performance with large datasets

2. **3D Visualization** (`src/components/ThreeDGrid/`, `src/components/ThreeDViewport/`)
   - Three.js integration for 3D scene management
   - Transform controls for object manipulation
   - Bookshelf and book viewing in 3D space

3. **Book System** (`src/components/BookViewer/`, `src/components/Bookshelf/`)
   - Organize media into book structures
   - 3D book viewer with page turning
   - Non-destructive workflows for missing media
   - Canonical Book JSON structure:
   ```json
   {
     "title": "string",
     "description": "string",
     "pages": [{"id": "string", "name": "string", "url": "string"}],
     "volumeMetadata": {"pageCount": "number", "coverMaterial": "string"}
   }
   ```

4. **Free Canvas** (`src/components/FreeGrid/`)
   - Vector drawing tools
   - Text page creation
   - Alignment and arrangement tools

### Component Prop Signatures
Key prop functions passed between components:

```javascript
// Gridworm.jsx → Book3DViewerPanel.jsx
onSaveToBookshelf(bookJsonObject: object): void

// Gridworm.jsx → Bookshelf.jsx
onApplyBookLayout(bookData: object): void
getCurrentBookData(): object

// LoadProjectDialog.jsx → Gridworm.jsx
onLoadAndOpenBook(projectData: object): void
```

### Data Flow
1. Media files are stored in IndexedDB via Dexie service
2. State is managed through Jotai atoms (centralized in store.js)
3. Components subscribe to relevant atoms for reactive updates
4. Projects can be saved/loaded as JSON files containing full state

### Performance Considerations
- Thumbnail generation uses Web Workers to avoid blocking UI
- Large lists use react-window for virtualization
- Textures are preloaded for smooth 3D rendering
- Debounced updates for expensive operations

### File Naming Conventions
- Components: PascalCase (e.g., `MediaPanel.jsx`)
- Utilities: camelCase (e.g., `helpers.js`)
- Hooks: camelCase with 'use' prefix (e.g., `useKeyboardShortcuts.js`)

### Missing Media Handling
The application gracefully handles missing media by creating placeholder objects with `isMissing` or `isPlaceholder` flags, allowing projects to maintain structure even when source files are unavailable.

### Error Handling Guidelines
- **File Import**: Validate JSON structure before processing. Show user-friendly notifications for malformed data
- **Missing Media**: Create placeholders with visual indicators (red border, "Missing" text)
- **3D Loading**: Fallback to blank textures if media fails to load
- **State Updates**: Use try-catch blocks around batch updates to prevent partial state corruption

### Development Task Dependencies
When implementing features, note these critical dependencies:

1. **Book Features**: Require canonical Book JSON structure to be defined first
2. **3D Viewport Multi-select**: Depends on THREE.Group implementation
3. **Texture Loading**: Requires thumbnail generation for video formats
4. **Save to Bookshelf**: Requires both Book JSON structure and storage implementation

### Testing Validation Steps
For major features, verify:

**Toggleable UI Elements:**
- Animation smoothness and completion
- Parent container resizing
- Persistent UI elements remain visible

**Data Import/Export:**
- Valid data loads correctly
- Invalid data shows error messages
- Partial data creates appropriate placeholders

**3D Interactions:**
- Transform controls update object properties
- Multi-select groups behave as single units
- Camera controls remain responsive

### No Testing Framework
Currently, no testing framework is configured. Consider adding Vitest or Jest for future development.

## Daily Development Log

See [DAILY_LOG.md](./docs/developer-journal/DAILY_LOG.md) for detailed daily development updates and changes.

## Recent Updates and Features

### 3D Viewport Enhancements
1. **Multi-Object Transformations**: Fixed stale closure issues with transform callbacks by using refs
   - `currentTransformModeRef` and `currentTransformSpaceRef` ensure current values are used
   - Supports local/global transform modes (toggle with 'X' key)
   - Global mode: Transform objects as one unit around collective center
   - Local mode: Transform each object around its own center

2. **Thumbnail Management**:
   - Custom thumbnail generation in 3D viewport with live preview
   - Thumbnail revert functionality to restore original thumbnails
   - Book viewer textures now update when thumbnails change (cache key includes thumbnail hash)
   - Optimized loading to use existing thumbnails immediately

3. **Performance Mode**: Reduces texture size, limits active videos, and simplifies materials for better performance

### FreeGrid Canvas Updates

1. **Artboard System**:
   - Artboards sit at z-index 5 (above grid, below media/vectors)
   - Media items default to z-index 100+
   - Vector/SVG elements at z-index 200
   - Artboard UI controls at z-index 99997-99999 (always on top)
   - Selection works directly on artboards or with Alt+click through media
   - 1×1 artboard preset added to grid dialog

2. **Multi-Selection and Alignment**:
   - **Universal compatibility**: Media items, vectors, and artboards can be selected together
   - **Alignment tools work across all types**: The `alignItems` function in FreeGridCanvas.jsx handles:
     - Media items (from `freeGridItems`)
     - Artboards (from `artboards` atom)
     - Vector elements (shapes, paths, text, annotations)
   - **Mixed selection support**: Can align media + artboards + vectors simultaneously
   - **Respect for locks**: Locked items and artboards are excluded from alignment operations

3. **Z-Index Layering Strategy**:
   - Grid/Background: No z-index (lowest)
   - Artboards: z-index 5
   - Media Items: z-index 100+ (can be higher if specified)
   - Vectors/SVG: z-index 200
   - Artboard Controls: z-index 99997-99999 (highest)

### Resource Management
- Starmie integration now delays CORS requests until panel is accessed (`hasBeenAccessed` state)
- Fixed memory monitoring variable scoping issues
- Emergency cleanup triggers at 90% memory usage

### Bug Fixes
- Fixed `setSelectedArtboard` typo (should be `setSelectedArtboards` plural)
- Fixed book viewer texture caching to update when thumbnails change
- Removed transition dampening from artboard dragging for smoother interaction

## Planned Features

### Thumbnail Export System
**Goal**: Export both default and custom thumbnails in various formats

1. **Export Formats**:
   - PNG: High-quality thumbnail export
   - JPG: Compressed thumbnail export with quality settings
   - CSV: Metadata export including thumbnail paths, dimensions, timestamps

2. **Implementation Considerations**:
   - **Batch Export**: Export all thumbnails or selected subset
   - **Custom vs Default**: Option to export only custom thumbnails, only defaults, or both
   - **Naming Convention**: Include media ID, timestamp, or custom naming pattern
   - **Resolution Options**: Export at original size or specific dimensions
   - **Metadata Preservation**: Include thumbnail generation settings in exports

3. **Technical Approach**:
   ```javascript
   // Proposed thumbnail export structure
   {
     exportType: 'thumbnails',
     format: 'png|jpg|csv',
     selection: 'all|custom|default|selected',
     options: {
       quality: 0.9,          // For JPG
       resolution: 'original|256|512|1024',
       includeMetadata: true,
       namingPattern: '{mediaId}_{timestamp}_{type}'
     }
   }
   ```

4. **CSV Export Format**:
   ```csv
   media_id,media_name,thumbnail_type,thumbnail_path,width,height,generated_at,settings
   123,video.mp4,custom,thumb_123_custom.png,512,512,2024-01-01T12:00:00Z,"{zoom:1.5,rotation:0}"
   ```

5. **Integration Points**:
   - Add export option to Media Panel toolbar
   - Include in project export as optional thumbnails bundle
   - Batch operations in 3D viewport thumbnail generator

### Known Issues to Address
- Lock behavior inconsistency between media, vectors, and text elements
- Selection behavior needs refinement (reverting to previous state)
- Artboard button visibility when overlapping needs further refinement
- Consider implementing virtual scrolling for large numbers of artboards
- Optimize SVG rendering performance for complex vector drawings