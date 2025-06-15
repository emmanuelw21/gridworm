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