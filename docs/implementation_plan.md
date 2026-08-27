# Implementation Plan: Top Menu Bar & Interactive Sidebar Activity Bar

Implement a full-featured, professional Desktop Menu Bar (**File, Edit, View, Run, Terminal, Help**) with native-feeling dropdowns, keyboard accelerators, and hover-to-switch interactions, and upgrade the Sidebar to have an **always-accessible Activity Bar** that toggles/collapses and switches panels when clicking icons (e.g., clicking Folder toggles Explorer panel open/closed).

---

## Proposed Changes

### 1. TitleBar & Menu Bar System

#### [NEW] [MenuBar.tsx](file:///c:/Users/rawat/BUIMB%20Projects/Cortex/src/renderer/src/components/TitleBar/MenuBar.tsx)
- Create a modular, accessible Menu Bar component embedded directly in the TitleBar next to the Cortex logo.
- Supports **File**, **Edit**, **View**, **Run**, **Terminal**, and **Help** menus.
- **Key Interactions:**
  - **Click to open:** Clicking a top-level menu item opens its dropdown menu.
  - **Hover-to-switch:** Once a dropdown is open, hovering over any sibling menu immediately switches to that dropdown without additional clicks.
  - **Click-outside & Escape:** Gracefully closes open menus when clicking anywhere outside or pressing `Escape`.
  - **Keyboard shortcuts labels:** Shows clean keyboard shortcut badges for all actions (`Ctrl+N`, `Ctrl+O`, `Ctrl+S`, `Ctrl+Shift+P`, `Ctrl+\``, `Alt+Z`, etc.).
  - **Action Handlers:** Each menu item executes the corresponding real action in `useEditorStore`, `useWorkspaceStore`, or Monaco editor instance.

#### Menu Structure & Items:
- **File**: New File, Open File, Open Folder, Save (`Ctrl+S`), Save All, Close Tab (`Ctrl+W`), Close All Tabs, Exit Window.
- **Edit**: Undo (`Ctrl+Z`), Redo (`Ctrl+Y`), Cut, Copy, Paste, Find (`Ctrl+F`), Replace (`Ctrl+H`), Toggle Comment (`Ctrl+/`).
- **View**: Command Palette (`Ctrl+Shift+P`), Quick Open (`Ctrl+P`), Toggle Explorer (`Ctrl+B`), Toggle Terminal (`Ctrl+\``), Zoom In (`Ctrl+=`), Zoom Out (`Ctrl+-`), Toggle Minimap, Toggle Word Wrap (`Alt+Z`).
- **Run**: Start / Run Active File in Terminal, Run Script, Restart Terminal Session.
- **Terminal**: New Terminal, Clear Terminal, Toggle Terminal Panel (`Ctrl+\``).
- **Help**: Keyboard Shortcuts (`Ctrl+K Ctrl+S`), Cortex Documentation, About Cortex Modal dialog.

#### [MODIFY] [TitleBar.tsx](file:///c:/Users/rawat/BUIMB%20Projects/Cortex/src/renderer/src/components/TitleBar.tsx)
- Integrate `<MenuBar />` alongside the Cortex logo.
- Maintain the responsive center Quick Open search bar (`Ctrl+P`) and right-side window controls (`Minimize`, `Maximize`, `Close`).

---

### 2. Interactive Sidebar & Activity Bar Overhaul

#### [MODIFY] [useEditorStore.ts](file:///c:/Users/rawat/BUIMB%20Projects/Cortex/src/renderer/src/store/useEditorStore.ts)
- Add `activeSidebarView`: `'explorer' | 'search' | 'settings' | null`.
- Add `toggleSidebarView(view)` action:
  - If the clicked view is already active and the sidebar is open, collapse the sidebar panel (`isSidebarOpen: false`, `activeSidebarView: null`).
  - If the sidebar is closed or on another view, open and switch to that view (`isSidebarOpen: true`, `activeSidebarView: view`).
  - Update `toggleSidebar()` to smoothly synchronize with `activeSidebarView`.

#### [MODIFY] [Sidebar.tsx](file:///c:/Users/rawat/BUIMB%20Projects/Cortex/src/renderer/src/components/Sidebar/Sidebar.tsx)
- Decouple the **Activity Bar** (48px left rail) from the expandable panel:
  - The Activity Bar remains visible on the left edge.
  - Clicking the **Files/Folder icon** toggles the Explorer panel (closes when open, opens when closed).
  - Clicking the **Search icon** opens the Search view (or toggles).
  - Clicking the **Terminal icon** toggles the integrated terminal dock.
  - Clicking the **Settings icon** opens Settings.
  - Active icon highlights with the `#5DD62C` accent indicator.
- Expandable panel smoothly hides/shows with resizer handle.

---

### 3. About Dialog / Modal

#### [NEW] [AboutModal.tsx](file:///c:/Users/rawat/BUIMB%20Projects/Cortex/src/renderer/src/components/AboutModal/AboutModal.tsx)
- Sleek dialog triggered from `Help -> About Cortex` displaying version, tech stack (Electron, Monaco, React, TypeScript), and quick links.

---

## Verification Plan

### Automated / Build Verification
- Run `npm run build` or typecheck via TypeScript compiler to verify zero type errors or broken imports:
  ```powershell
  npm run typecheck # or npx tsc --noEmit
  ```

### Manual Verification
1. **Menu Bar Interactions:**
   - Click **File**, **Edit**, **View**, **Run**, **Terminal**, **Help** to see dropdowns open with icons and shortcut labels.
   - Move mouse across the menu bar when open to verify instant hover-to-switch behavior.
   - Click items (e.g. *File -> Open Folder*, *View -> Toggle Terminal*, *File -> Save*) to verify actions execute.
   - Press `Escape` or click outside to verify menus close cleanly.
2. **Activity Bar & Sidebar Toggle:**
   - Click the Explorer (Files) icon: verify panel collapses if already open, and expands when clicked again.
   - Verify active indicator highlight updates correctly.
   - Verify terminal toggle icon in Activity Bar syncs with terminal open/closed state.
