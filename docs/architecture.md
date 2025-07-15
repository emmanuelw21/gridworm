# Gridworm Architecture

---

## ⚙ Tech Stack

- **Framework:** React 18 + Vite
- **State Management:** Jotai
- **Rendering:** Three.js + React Three Fiber
- **Storage:** Dexie.js (IndexedDB)
- **Styling:** TailwindCSS + Lucide Icons

---

## 🧩 High-Level Architecture
Gridworm.jsx (brain)
├── MediaPanel (media imports, filters)
├── GridBuilderPanel (2D grid layout)
├── FreeGridCanvas (freeform layout)
├── ThreeDViewportPanel (3D visualization)
├── Book3DViewerPanel (3D book authoring)
│ └── AnimatedBookViewer
├── TextPageCreator (automated page builder)
├── Bookshelf (virtual bookshelf system)
└── Dialog Panels (Export, Load, JSON Editor, etc.)

## 🧪 Global State Overview (Jotai Atoms)

- `mediaFilesAtom`: Imported media files
- `gridSlotsAtom`: 2D grid slots
- `freeGridItemsAtom`: Freeform canvas item positions
- `atomPagesAtom`: Pages for book construction
- `bookVolumeMetadataAtom`: Book metadata
- `showThreeDViewportAtom`: Toggle 3D panel
- `showBook3DViewerAtom`: Toggle book viewer
- `fileMetadataAtom`: Individual file metadata

---

## 📦 Persistent Storage

- Dexie.js: IndexedDB storage of entire projects
- Auto local-storage migration system

---

## 🔌 Export Formats

- Full JSON export (flat, minimal, detailed templates)
- Page-mapping export for book configurations