
<p align="center">
  <img width="250" height="231" alt="Gridworm" src="https://github.com/user-attachments/assets/66b98158-ad3c-40fb-9798-6e7807c53f3c" />
</p>

---

# Gridworm

Gridworm takes a pile of media, puts it in order on a grid, and binds it into a book you can page through in 3D. It runs entirely in the browser: no server, no account, and your projects stay on your own machine.

It started as a question: how do I arrange media on a grid, then use that grid to flow the pages of a book? The grid is the table where you shuffle prints around; the book follows. Along the way Gridworm grew several features that had nothing to do with that question, and they have been cut. What is left does one thing: take media, put it in order, and make a book.

- **One place for every kind of media.** Images, video, audio, PDFs (split into pages), text files, and 3D model files, previewed in the cells.
- **Order is the content.** A grid of cells you fill, reorder, nudge, or swap.
- **The grid becomes a book.** The 3D viewer turns the grid into a page-turning book, with page mapping, flow direction, and cover settings.
- **Nothing breaks when files move.** Missing media becomes a placeholder and reconnects when the file comes back.
- **Built for big collections.** Thumbnails are made off the main thread, long lists only draw what is on screen, and projects live in the browser's own database.

---

## The grid

The main interface: a grid of cells you fill with media and arrange by hand.

- **Bring media in** by dragging files onto the grid or into specific cells, or by importing a folder. Images (JPG, PNG, GIF, WebP, SVG), video (MP4, WebM, MOV), audio, PDF, plain text and Markdown, and 3D model files (GLTF, GLB, OBJ, FBX, STL) are recognised. Pictures and video preview live in the cells; 3D models show as a labelled card.
- **Shape the grid** with up to 40 rows and 40 columns, a cell width and height of your choosing, and a gap between cells. Presets such as 3×3 get you started.
- **Arrange** by dragging cells around. Nudging pushes neighbours along instead of swapping. Allow duplicates to place the same file in more than one cell, or fill the empty cells with random media from the panel.
- **PDFs become pages.** Drop a PDF on the grid and extract one page, a range, or every page as its own image, in order.
- **Missing files are placeholders.** If a file moves, its cell is kept and marked. Add the file again and it reconnects.

<img width="800" height="474" alt="The grid builder full of images, with column and row controls" src="https://github.com/user-attachments/assets/a67fe51e-625f-4dee-984f-331fecb0ae26" />

<img width="2244" height="1188" alt="A larger grid of images with the media panel open" src="https://github.com/user-attachments/assets/b6865e4b-cd2b-4527-a350-c0201a90cd5b" />

---

## The book

The same media, bound. The 3D book viewer turns the grid into a page-turning book.

- **Automatic.** The book is generated from the grid, and a sync indicator shows when the two have drifted apart.
- **Page mapping.** Choose the reading order: across, down, zigzag, or by hand, with drag-and-drop reordering and a live preview.
- **Covers and spine.** Set the book colour, a cover image, the spine text, an author and a description.
- **Save it.** Save the book straight to the bookshelf from the viewer, or save the whole project.

<img width="1583" height="941" alt="The 3D book viewer showing an open book of images" src="https://github.com/user-attachments/assets/3e23b707-88e8-4291-83f7-ecc9c0d87537" />

<img width="1441" height="953" alt="Page mapping: drag to reorder items, flow type and start corner" src="https://github.com/user-attachments/assets/ba5bab17-facb-49ba-978c-bd6e0e88391e" />

---

## The bookshelf

Every book you make, kept on shelves.

- **Books on shelves.** See your projects as books, drag them between shelves, and pin the ones you use most to the top shelf for one-click loading.
- **Each book remembers** its colour, cover, author, description, and when it was made and last changed.
- **Export and import** a whole bookshelf as a JSON file, for backup or to move it to another machine.

<img width="1599" height="950" alt="My Bookshelf with shelves of books in several colours" src="https://github.com/user-attachments/assets/ee585908-cce9-4b98-bdf5-3a344de8bd70" />

Opening a book whose media is not in the media panel asks you where the files are:

<img width="450" height="341" alt="The missing media dialog" src="https://github.com/user-attachments/assets/c6c2b11a-d083-4c02-adf9-8c76650fc6bc" />

---

## Projects and exports

- **Projects** are saved as JSON and stored in the browser's database (IndexedDB), with the grid, the book settings and the media list. Loading a project with missing files shows them as placeholders rather than failing.
- **File operation scripts.** Select media in the panel and generate a PowerShell, Bash or CMD script that moves, copies, renames or deletes the real files on disk, so the order you built in Gridworm can be applied to the folder itself.
- **Undo** (Ctrl+Z) steps back through grid edits.

<img width="763" height="815" alt="The file operations export dialog" src="https://github.com/user-attachments/assets/fe510647-a27b-4d13-87fe-bcbcee2b29df" />

---

## The cutting room

Four features were built, worked, and were cut. As the app grew it became too much to sustain, and every extra tool was a step toward bad practice and product bloat when the main idea is just to make a book.

- **The spreadsheet rules.** Cell addresses like A1 and B2, a formula parser, lock modes for what moves when the grid changes, scripting, print layouts. A spreadsheet was growing inside a photo grid, and the grid only ever needed to hold things in order. Gone from the code.
- **The 3D viewport.** A room for laying media out in space and shooting new thumbnails from it. Blender does this better, and it was the heaviest thing in the app.
- **The free canvas.** Artboards, layers, a pencil, a vector pen, a paint bucket. Krita, Figma and the Adobe suite are a click away; Gridworm did not need to be a fifth.
- **Text Pages.** A small word processor for pages of type in the book. A text file dropped into a cell does the same job.

The 3D viewport, the free canvas and Text Pages are still present in this repository's source, behind their old toolbar buttons, while they are removed in stages. They are not maintained and will go in a later release. Read the longer account on [emmanuelwhyte.com](https://emmanuelwhyte.com/projects/gridworm).

### Starmie (retired)

Starmie was an early bridge that pulled images from ComfyUI straight into the grid as they were made. Its ComfyUI node and folder watcher have been retired from this repository, so it no longer runs. The panel stays in the code as a record of the idea.

---

## Getting started

### What you need

Node.js. Download it from [nodejs.org](https://nodejs.org) and run the installer with the default options. To check it worked, open a terminal (Windows: `Windows key + R`, type `cmd`; Mac: `Command + Space`, type `terminal`) and run:

```
node --version
```

### Install and run

1. Click the green **Code** button on this page, choose **Download ZIP**, and unzip it somewhere you will remember.
2. Open a terminal in that folder (Windows: right-click inside the folder and choose **Open in Terminal**; Mac: right-click the folder and choose **New Terminal at Folder**).
3. Install the dependencies. This takes a few minutes the first time:
   ```
   npm install
   ```
4. Start Gridworm:
   ```
   npm run dev
   ```
5. Open the address it prints, usually `http://localhost:5174/`, in your browser.

To stop it, press `Ctrl + C` in the terminal. Next time, open the terminal in the same folder and run `npm run dev` again.

### Your first session

1. **The interface.** The media panel on the left lists everything you have imported. The grid in the middle is where you arrange it. The controls along the top open the book viewer, the bookshelf, and the grid settings.
2. **Add media.** Drag some pictures onto the grid, or use **Import Media** and **Import all files in folder** in the media panel. They appear in both the panel and the grid.
3. **Shape the grid.** Open the grid size controls, set rows and columns, or use a preset. Drag cells to rearrange.
4. **Try a PDF.** Drop one on the grid, click it, and extract its pages as images.
5. **Make the book.** Click the book icon to see the grid as a 3D book. Open page mapping to change the reading order.
6. **Keep it.** Save the project, or save the book to the bookshelf.

### Tips

- Start with a small grid, 3×3 or 4×3, until the controls feel familiar.
- Save often: a project or a book on the shelf is the record of your arrangement.
- Moved files are not lost. Gridworm shows a placeholder, and re-adding the file reconnects it.

### Troubleshooting

- **"npm is not recognized":** Node.js is not installed, or the terminal was opened before the install finished. Reinstall and open a new terminal.
- **"Port 5174 is already in use":** Gridworm is already running. Look for its tab in the browser.
- **Pictures will not load:** use common formats (JPG, PNG, GIF, WebP).
- **Everything is slow:** use a smaller grid, and fewer very large videos at once.

---

## Built with

- **React 18 and Vite**: the app
- **Three.js with React Three Fiber and drei**: the book and the bookshelf
- **Jotai**: shared app state
- **Dexie (IndexedDB)**: projects and books stored in the browser
- **Web Workers and react-window**: thumbnails made without freezing the page, and long lists that only draw what is on screen
- **dnd-kit and Tailwind CSS**: drag and drop, and styling
- **pdf.js**: PDF page extraction, loaded from a CDN

## License

Business Source License 1.1. See `LICENSE`.
