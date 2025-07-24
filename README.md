
<p align="center">
  <img width="250" height="231" alt="favicon" src="https://github.com/user-attachments/assets/66b98158-ad3c-40fb-9798-6e7807c53f3c" />
</p>

---


GridWorm is a media organization tool that transforms how you manage, view, and present your digital content. Think of it as a visual file manager meets creative canvas meets presentation tool - all in one seamless application.

## 🎯 Key Features Overview

- **Grid-Based Organization**: Arrange media in customizable grids up to 100×100 cells
- **3D Visualization**: Automatic book generation and 3D viewport for immersive media experiences  
- **Free Canvas Mode**: Vector drawing, text editing, and artboard creation
- **Smart Media Management**: Handle missing files gracefully with placeholders
- **Export Flexibility**: Multiple export formats and batch operations
- **Performance Optimized**: Built-in performance testing to ensure smooth operation
- **Bookshelf**: Compile your media into tomes and save them in a bookshelf for easy retrieval

---

## 📊 Standard Grid (Main Interface)

The heart of GridWorm - a flexible, responsive grid system for organizing your media files.

### Key Benefits:
- **Instant Visual Overview**: See all your media at a glance in a customizable grid layout
- **Flexible Import Options**: 
  - Drag & drop files directly into specific grid cells
  - Import entire folders while maintaining structure
  - **Supported File Types**:
    - 🖼️ **Images**: JPG, PNG, GIF, WebP, SVG
    - 🎥 **Videos**: MP4, WebM, MOV, AVI, MKV
    - 🎵 **Audio**: MP3, WAV, OGG, FLAC
    - 📄 **Documents**: PDF (with page extraction), TXT, CSV
    - 🎨 **3D Models**: GLTF, GLB, OBJ, FBX, STL
- **Smart Grid Management**:
  - Dynamically resize grid from 1×1 to 100×100 cells
  - Adjustable cell dimensions for optimal viewing
  - Excel-style cell references (A1, B2, etc.) for easy navigation
  - Built-in performance tester guides you to optimal grid sizes for your system
- **Grid Lock System**: Three intelligent modes:
  - 🔴 **Locked**: Preserves exact cell positions when resizing
  - 🟠 **Memory Mode**: Maintains positions with smart gap management
  - 🟢 **Free Flow**: Automatic reflow for efficient space usage
- **Excel-Like Grid Edit Mode** (Grid Edit Button):
  - 📝 **Direct Cell Editing**: Click any cell to add text, just like Excel
  - 🎨 **Cell Customization**: Change individual cell background colors
  - 📊 **Formula Support**: Enter formulas for calculations (SUM, COUNT, etc.)
  - 🔤 **Text Formatting**: Add labels, notes, or annotations to any cell
  - 📐 **Mixed Content**: Combine media files with text and data in the same grid
  - ⌨️ **Keyboard Navigation**: Tab between cells for rapid data entry
  - 🎯 **Multi-Select**: Select multiple cells for batch operations
  - 📥 **CSV Import**: Import CSV data directly into grid cells
  - 📄 **PDF Page Extraction**: Click any PDF to extract individual pages or all pages as images
- **Quick Access Bookshelf**: Pin favorite projects to the top shelf for instant loading
- **Resilient File Handling**: Missing media appears as placeholders - upload the files later and they automatically reconnect

<img width="800" height="474" alt="Screenshot 2025-07-23 201541" src="https://github.com/user-attachments/assets/a67fe51e-625f-4dee-984f-331fecb0ae26" />

<img width="2244" height="1188" alt="Screenshot 2025-07-23 214019" src="https://github.com/user-attachments/assets/b6865e4b-cd2b-4527-a350-c0201a90cd5b" />

---

<img width="386" height="47" alt="Artboard 2" src="https://github.com/user-attachments/assets/474974b9-1c3a-4fe5-8ccd-ea59008d955f" />

1. Toggle Grid preview modes: **Live** (autoplay) | **Hover** (media plays on hover) | **Off**  
2. Show/hide grid boundaries  
3. Show/hide column headers  
4. Display cell reference overlays (e.g. A1, B2, etc.) on upper left corner of each cell
5. Enter cell edit mode – directly select grid cells to change background color, add text, enter formulas  
6. Lock grid (preserve cell positions when resizing) - default behavior is "free flow" which auto-sorts media
7. Show grid dimensions  
8. Test grid performance limits 
9. Allow duplicates in grid  
10. Enable nudging items on grid (e.g. pushes media instead of swapping placement)  
11. Enable grid click selection – choose this option to simultaneously select corresponding item in media panel to enable export operations and more (use CTRL + click for multiselect)  
12. Clear all items on grid  
13. Add random media to empty grid slots  
    - **TIP:** Enable duplicates + click add random if slots exceed number of unique media items to completely fill grid


---

## 🎨 Free Grid Canvas

Transform GridWorm into a creative workspace with vector drawing and layout tools.

- **Hybrid Media Canvas**: Combine raster images with vector graphics and text
- **Artboard System**: 
  - Create individual artboards or grids of artboards
  - Each artboard has independent export settings
  - **Media Slicing**: Place large images over artboard grids to automatically slice into segments
  - Perfect for creating social media post series or image sequences
- **Versatile Export Options**:
  - Export artboards back to the main grid for further organization
  - Direct export to JPG/PNG with quality control
  - Batch export multiple artboards with consistent settings
- **Layer Management**: 
  - Full layer support with visibility and lock toggles
  - Drag-and-drop reordering
  - Import media directly from the grid or media panel
- **Vector Tools**: Basic shapes, pen tool, and text editing for annotations and overlays

<img width="2236" height="1132" alt="Screenshot 2025-07-23 212502" src="https://github.com/user-attachments/assets/d1796284-c5f9-4a70-8633-77e7dc76e2df" />

---

## 📚 Bookshelf

Your personal library for organizing and accessing media collections as interactive books.

### Standout Features:
- **Visual Book Management**: See your projects as books on customizable shelves
- **Drag & Drop Organization**: Rearrange books between shelves intuitively
- **Top Shelf Quick Access**: Pin frequently used books for one-click loading from the main interface
- **Rich Metadata**: 
  - Customize book colors, covers, and themes
  - Add author information and descriptions
  - Track creation dates and modification history in book edit mode
- **Flexible Export/Import**: 
  - Export entire bookshelves as JSON for backup or sharing
  - Import saved book collection JSON
  - Preserve all relationships and metadata
- **Smart Preview System**: (Coming Soon) Hover to preview book contents without opening

<img width="1599" height="950" alt="Screenshot 2025-07-23 223424" src="https://github.com/user-attachments/assets/ee585908-cce9-4b98-bdf5-3a344de8bd70" />

Loading books without media present within the media panel will prompt you with the following dialog

<img width="450" height="341" alt="gridworm_missingmedia" src="https://github.com/user-attachments/assets/c6c2b11a-d083-4c02-adf9-8c76650fc6bc" />

---

## 📖 3D Book Viewer

Experience your media collections as interactive 3D books with realistic page-turning animations.

### Features:
- **Automatic Book Generation**: Grid content instantly becomes a browsable 3D book
- **Interactive Page Mapping**: 
  - Visually rearrange pages while maintaining grid integrity
  - Drag-and-drop page reordering with live preview
  - Smart sync indicators show when book differs from grid order
- **Presentation Mode**: Perfect for showcasing portfolios or presentations
- **Customizable Book Properties**:
  - Adjust page thickness and book dimensions
  - Choose cover materials and colors
  - Add spine text and cover images
- **Export Options**:
  - Save as standalone project (SAVE button on main page)
  - Save directly to bookshelf - directly from Book Viewer interface

<img width="1583" height="941" alt="Screenshot 2025-07-23 223654" src="https://github.com/user-attachments/assets/3e23b707-88e8-4291-83f7-ecc9c0d87537" />

<img width="1441" height="953" alt="Screenshot 2025-07-23 223845" src="https://github.com/user-attachments/assets/ba5bab17-facb-49ba-978c-bd6e0e88391e" />


---

## 📝 Text Page Creator

Built-in document creation tool for adding text content to your media collections.

### Rich Text Features:
- **Integrated Text Editor**: Create formatted text pages without leaving GridWorm
- **Template System**: Save and reuse page layouts
- **Direct Grid Export**: 
  - Convert text to image pages
  - Add to specific grid positions
  - Maintain consistent styling across pages
- **Typography Controls**: Font selection, size, color, and alignment options
- **Batch Creation**: Generate multiple pages with consistent formatting

<img width="1283" height="758" alt="gridworm_textcreator" src="https://github.com/user-attachments/assets/b5b930ef-7dd8-452c-a51c-e5578882b65c" />

---

## 🎮 3D Viewport

Immersive 3D environment for advanced media manipulation and visualization.

### Cutting-Edge Capabilities:
- **Spatial Media Organization**: Arrange media in 3D space for unique perspectives
- **Multi-Source Import**:
  - Drag from media panel
  - Drop from local folders
  - Import from grid with position mapping
- **Orientation Control Widget**: 
  - Precisely control media placement in 3D space
  - Rotate, scale, and position with visual feedback
  - Snap-to-grid options for alignment
- **Custom Thumbnail Generation**:
  - Capture any 3D view as a thumbnail
  - Export high-quality thumbnails for use elsewhere
  - Perfect for creating preview images of 3D arrangements
- **Performance Mode**: Optimized rendering for smooth interaction with large media sets

<img width="2549" height="1143" alt="Screenshot 2025-07-23 230844" src="https://github.com/user-attachments/assets/cc4f5f2b-9ffd-4b73-b208-c07099d3bb90" />

<img width="2558" height="1144" alt="Screenshot 2025-07-23 230914" src="https://github.com/user-attachments/assets/fe51e2a2-b2bc-49d8-8160-9326063fcb60" />


---

## 📤 Export Operations

Comprehensive export system for maximum flexibility in how you use your organized media.

### Export Capabilities:
- **File Operations Scripts**:
  - Generate platform-specific scripts (PowerShell, Bash, CMD)
  - Batch operations: move, copy, delete, rename
  - Smart path handling for missing system paths
  - One-click script generation and clipboard copy
- **Thumbnail Export**:
  - Export all or custom thumbnails in PNG/JPG format drectly from the media panel
  - Configurable resolution (256px to 4096px)
  - Quality control for JPG exports
  - Metadata CSV with dimensions and file info
  - Batch processing with progress tracking
- **Project Management**:
  - Save complete projects as JSON files
  - Load projects with automatic missing file handling
  - Export books to bookshelf format
- **Document Processing**:
  - **PDF Page Extraction**: Upload PDFs and extract all pages as individual images
    - Interactive page preview with zoom controls
    - Extract single pages or entire document
    - Maintains page order and quality
    - Text content extraction for searchability
  - **CSV Import**: Convert spreadsheet data to grid cells
    - Configurable delimiters and headers
    - Style options for alternating rows
    - Parse media references from CSV data
- **Shell Script Generation**:
  - Generate PowerShell/Bash/CMD scripts
  - Batch move, copy, delete, or rename operations
  - Platform-specific path handling

<img width="763" height="815" alt="gridworm_operations" src="https://github.com/user-attachments/assets/fe510647-a27b-4d13-87fe-bcbcee2b29df" />

---

## ⭐ Starmie - ComfyUI Integration

Seamlessly bridge GridWorm with ComfyUI for AI-powered image generation and processing workflows.

### **Direct ComfyUI Connection
- **Real-Time Workflow Integration**: 
  - Import generated media as they're created
  - Maintain full resolution and metadata
- **Smart Import Options**:
  - Import all images from a workflow
  - Select specific images to import
  - Preserve ComfyUI metadata for traceability
- **Zero Configuration**: Automatically detects local ComfyUI instances

### How to Use with ComfyUI:

1. **Before Starting ComfyUI**:
   - Open the Gridworm root folder and Copy and paste the comfyui-starmie folder into your ~\ComfyUI\custom_nodes folder -- you only need to do this once
   - From the same Gridworm root folder, navigate to the starmie-bridge folder and run the start_bridge_polling.bat file (this initiated the Starmie "watcher" in terminal)
     
2. Ensure ComfyUI is running on your local machine (default: http://localhost:8188)

3. **Open Starmie Panel**:
   - Click the "Starmie" button in GridWorm's top toolbar
   - The panel will slide out from the bottom right corner - click and expand it
   - Connection status shows at the top (green = connected) - if you completed the above steps successfully, Starmie auto-detects the local connection
   - *Click the file directory to specify the output folder you want Gridworm/Starmie to "watch" (defaults to a ~\ComfyUI\selected-output folder)

4. **Import from ComfyUI**:
   - Add and connect the Starmie Universal Node as your image output node (I created several nodes you can try, but this should work in most cases)
   - Images appear instantly in your GridWorm media panel and standard grid
   - There will also be a check every 3 seconds to update any files that are added to the watched folder (manually or via ComfyUI)

5. **Workflow Tips**:
   - **Iterative Design**: Generate variations in ComfyUI, import the best ones to GridWorm
   - **Batch Processing**: Run batch operations in ComfyUI, organize results in GridWorm
   - **Version Control**: Use GridWorm's grid to track different iterations from ComfyUI
   - **Mixed Media**: Combine AI-generated images with your existing media library
   - **Manage Media**: Use export operations to move files locally or delete the ones you do not want individually or as mass actions
   - - TIP: All script operations are stored in the Log tab for ease of review and intended for nondestructive staging. You can run the operations and then copy and paste the commands into terminal at a later time!

---

## 🚀 Getting Started

### Prerequisites (What You Need First)

Before you can run GridWorm, you need to install Node.js, which is a program that lets you run JavaScript applications on your computer.

1. **Download Node.js**:
   - Go to [https://nodejs.org](https://nodejs.org)
   - Save the installer to your computer
   - Run the installer and click "Next" through all the steps (the default options are fine)

2. **Verify Installation** (Optional but recommended):
   - **Windows**: Press `Windows Key + R`, type `cmd`, and press Enter
   - **Mac**: Press `Command + Space`, type `terminal`, and press Enter
   - Type this command and press Enter:
     ```
     node --version
     ```
   - You should see something like `v18.17.0` (the numbers might be different)

### Installing GridWorm

1. **Download GridWorm**:
   - Click the green "Code" button on this GitHub page
   - Select "Download ZIP"
   - Save the ZIP file to your computer
   - Extract (unzip) the file to a location you'll remember (like your Desktop)

2. **Open a Terminal/Command Prompt**:
   - **Windows**: 
     - Right-click inside the extracted GridWorm folder
     - Select "Open in Terminal" or "Open PowerShell window here" 
   - **Mac**: 
     - Right-click the extracted GridWorm folder
     - Select "New Terminal at Folder"

3. **Install GridWorm dependencies** (this downloads all the remaining necessary files):
   - In the terminal window that opened, type exactly:
     ```
     npm install
     ```
   - Press Enter and wait (this might take 2-5 minutes)
   - You'll see lots of text scrolling by - that's normal!

4. **Start GridWorm**:
   - Once the installation is complete, type:
     ```
     npm run dev
     ```
   - Press Enter
   - You should see a message like:
     ```
     ➜ Local: http://localhost:5174/
     ```

5. **Open GridWorm in Your Browser**:
   - Click the link that appears (http://localhost:5174/)
   - OR open your web browser and type `localhost:5174` in the address bar
   - GridWorm should now be running!

### Your First GridWorm Session

1. **Understanding the Interface**:
   - **Media Panel** (left side): Shows all your imported files
   - **Grid Area** (center): Where you organize your media
   - **Controls** (top): Buttons for different features
   - **Dark/Light Mode** (top right): Click the sun/moon icon

2. **Add Your First Media**:
   - Find some image files on your computer (photos, screenshots, etc.)
   - Drag them directly onto the grid
   - OR click the "Upload" button and select files
   - Your images will appear in both the Media Panel and on the grid

3. **Organize Your Grid**:
   - Click "Grid Size" button
   - Use the sliders to change the number of rows and columns
   - Try the preset buttons (3×3, 10×10, etc.) to quickly resize
   - Drag images from one cell to another to rearrange

4. **Try Grid Edit Mode** (Excel-like features):
   - Click the "Grid Edit" button (looks like a pencil icon)
   - Click on any empty cell and start typing
   - Right-click a cell to change its background color
   - Try adding =SUM(A1:A3) in a cell to see formulas work (you'll have to click away from the active cell to see it update)
   - Mix text labels with your images for organization
   - Click "Exit Edit Mode" when done

6. **Work with PDFs**:
   - Drag a PDF file onto the grid
   - With preview mode on (eye icon), click the PDF
   - Choose "Extract All Pages" to convert the PDF to individual page images
   - Or select specific pages to extract
   - Each page becomes a separate image in your grid

7. **Explore Key Features**:
   - **3D Book View**: Click the book icon to see your grid as a 3D book
   - **Free Grid**: Switch to free grid mode for creative layouts
   - **Save Your Work**: Click "Save Project" to save your arrangement

8. **Performance Check** (Recommended for first time):
   - Click the gauge icon in the grid controls
   - This tests your computer's capability
   - It will recommend the best grid size for smooth performance

### Stopping GridWorm

When you're done:
1. Go back to the terminal/command prompt window
2. Press `Ctrl + C` (on both Windows and Mac)
3. Type `Y` if it asks to terminate
4. Close the terminal window
5. Close the browser tab

### Next Time You Use GridWorm

1. Open the terminal in the GridWorm folder (same as step 2 in Installation)
2. Type `npm run dev` and press Enter
3. Open your browser to `localhost:5174`

### Pro Tips for Beginners

- **Start Small**: Begin with a 3×3 or 4×3 grid until you're comfortable
- **Use Grid Lock**: The lock button prevents accidental rearrangement
- **Save Often**: Create projects or save to bookshelf to save your arrangements
- **Missing Files Are OK**: If you move files, GridWorm shows placeholders - just re-add the files
- **Experiment**: Try all the buttons - you can't break anything!

### Troubleshooting

**"npm is not recognized"**: Node.js isn't installed correctly. Try reinstalling from step 1.

**"Port 5174 is already in use"**: GridWorm is already running. Check your browser for an open tab.

**Images won't load**: Make sure your image files are in common formats (JPG, PNG, GIF).

**Everything is slow**: Run the performance test (gauge icon) and use a smaller grid size.

### Need More Help?

- Video tutorial (coming soon)!!
- Send me a message with feedback!

---

## 💡 Use Cases

- **Digital Asset Management**: Organize large media libraries visually
- **Portfolio Presentation**: Create interactive 3D books of your work
- **Content Planning**: Use grids to plan social media posts or campaigns
- **Educational Materials**: Organize learning resources in memorable visual layouts
- **Creative Workflows**: Combine media organization with basic editing tools
- **Archive Management**: Handle large collections with missing file resilience

---

## 🛠️ Technical Highlights

- Built with React 18 and Vite for blazing-fast performance
- Three.js integration for smooth 3D experiences
- IndexedDB for reliable local storage
- Responsive design works on all screen sizes
- Dark/Light mode for comfortable viewing
- Memory-efficient handling of large media collections

---

## 📄 License

[Your License Here]

---

## 🤝 Contributing

[Contributing guidelines]

---

*GridWorm - Where media organization meets creative freedom*
