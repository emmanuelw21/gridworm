# GridWorm Daily Development Log

## 2025-07-14

### Major Weekend Feature: Starmie Integration
- **Starmie ComfyUI Bridge** (Developed over the weekend):
  - Lightweight but intuitive integration with ComfyUI for automatic workflow support
  - Enables seamless media processing through ComfyUI nodes
  - Designed to keep the feature set minimal while providing powerful automation capabilities
  - Works exceptionally well for batch processing and AI-enhanced media workflows
  - Bridge connector provides real-time status updates and progress tracking

### Major Changes

#### Layer System Implementation
- **Complete Layer Panel (LayerPanelV2)**:
  - Each item (media, vector, text) is now its own layer with individual visibility/lock controls
  - Drag-to-reorder functionality for z-index management
  - Type filters (Media, Vectors, Text, Artboards) act as global filters, not layers themselves
  - Artboard dropdown with individual artboard controls
  - Delete functionality for each layer
  - Panel is moveable and dockable to toolbar
  - Active layer selection highlights corresponding item in canvas

#### Lock Functionality
- **Implemented Photoshop-style locking**:
  - Locked items are completely unselectable (cannot click, drag, or marquee select)
  - Lock checking added to all selection handlers
  - Works with both individual layer locks and type filter locks
  - Cursor shows "not-allowed" when hovering over locked items
  - **Known Issue**: Lock behavior may be inconsistent between media, vectors, and text

#### Visibility System Fix
- **Fixed critical visibility bug**:
  - Items now appear immediately when added to FreeGrid
  - No longer requires clicking layers button to see items
  - Changed logic from requiring `layer?.visible` to allowing items without layers

#### UI/UX Improvements
- **Text Tool Enhancements**:
  - Fixed missing useCallback import
  - Added invisible clickable rectangles for better text selection
  - Double-click to edit works even when text overlaps other elements
  - Increased default font size from 16 to 38 for new zoom baseline

- **Zoom and Scaling**:
  - Changed default zoom from 1 to 2.38 (so old 42% = new 100%)
  - Updated zoom limits to 0.238-11.9
  - Ruler measurements adjusted to match new zoom baseline

- **Media Item Behavior**:
  - Grid export maintains 160×120 dimensions
  - Manual drag & drop uses actual media dimensions scaled to 40%
  - Resize handles now scale with media item size
  - Rotation handle size increases with item size

- **Vector Toolbar**:
  - Changed icon from custom ToolCase to Wrench (size 20) for better visual flow
  - Set initial position to upper left when undocked
  - Both toolbars (vector and layers) now start docked by default for cleaner initial UI

- **Dockable Panels**:
  - Layer panel and vector toolbar can dock to main toolbar
  - Drag panels near top of screen to dock
  - Visual feedback shows when docking is available
  - Collapsed state maintained when docked

#### Debug Features
- **Info Toggle**:
  - Added debug info overlay showing:
    - Media dimensions
    - Bounding box dimensions
    - Scale percentage
  - Toggle with Info button in toolbar
  - Foundation for additional debugging features in future updates

#### Bug Fixes
- Fixed `onToolChange` to `setActiveTool` error
- Fixed RotateCw import
- Fixed pencil tool auto-fill creating "strange blobs"
- Fixed color update behavior (only updates on user interaction)
- Removed grey borders from media items
- Fixed 3D viewport thumbnail loading performance
- Fixed layer visibility logic preventing normal media addition

### Files Modified
1. `/src/components/FreeGrid/FreeGridCanvas.jsx` - Major refactoring for layer system
2. `/src/components/FreeGrid/LayerPanelV2.jsx` - New comprehensive layer panel
3. `/src/components/FreeGrid/TextAreaTool.jsx` - Fixed imports and font size
4. `/src/store.js` - Added layer system atoms
5. `/src/components/FreeGrid/CollapsibleVectorToolbar.jsx` - Updated icon and positioning
6. `/src/components/ThreeDViewport/ThreeDViewport.jsx` - Fixed thumbnail loading
7. `/src/Gridworm.jsx` - Updated handleFreeGridDrop for dual behavior
8. `/src/components/MediaGrid/helpers.js` - Added dimension extraction
9. `/src/components/Rulers.jsx` - Updated measurements for new zoom

### Known Issues to Address
- Lock behavior inconsistency between media, vectors, and text
- Selection behavior needs to be reverted to previous "perfect" state
- Artboard priority mode may need refinement

### User Feedback Highlights
- "works pretty well!" - On text editing fix
- "oh that's perfect!" - On layer selection implementation
- "all working so perfectly" - Before final lock implementation
- Frustration expressed about added complexity affecting basic functionality

### Additional Features (Retrospective)

#### Artboard Enhancements
- **Artboard Grid Creation**:
  - Create multiple artboards in grid layouts (2×2, 3×3, 4×4, etc.)
  - Custom grid configurations with adjustable spacing
  - 1×1 preset for single artboard creation
  - Automatic positioning and alignment

- **Export Capabilities**:
  - Save artboard directly to media panel as PNG
  - **Save multiple artboards at once** - allows clipping/segmenting media and vectors
  - Export artboard with all contained elements
  - Maintains proper layering and transparency
  - Generates appropriate thumbnails for exported images
  - Effectively creates a clipping/segmentation workflow for complex compositions

#### Bookshelf Integration
- **Main Page Preview**:
  - Top shelf of bookshelf now visible on main page
  - Provides quick access to recent books
  - Visual preview reflects actual bookshelf content
  - Smooth integration with existing UI

#### Thumbnail System Updates
- **Automatic Default Thumbnails**:
  - Default thumbnails now render automatically for all media types
  - No manual generation required for basic thumbnails
  - Custom thumbnail generation still fully supported
  - Live preview when creating custom thumbnails
  - **Note**: 3D viewport does NOT preserve object positions when panel is closed/reopened

### Next Steps
- Fix lock behavior consistency across all element types
- Revert selection behavior to previous working state
- Test all interactions thoroughly to ensure basic functionality isn't impaired by layer system
- Enhance Starmie integration with additional ComfyUI workflow templates