# 🚀 Workflow Builder UI Component

A polished, high-performance Workflow Builder built with **Angular 21** and **Vanilla CSS**. This component allows users to visually design workflows with drag-and-drop nodes, interactive connections, and a robust state management system.

## ✨ Key Features

- **Node Management**: Drag nodes from the side palette (Start, Task, Decision, End) onto a dynamic canvas.
- **Interactive Canvas**: Smooth Panning and Zooming (Infinite feel) with a "Reset View" feature.
- **Connection Engine**: Draggable connections with automatic path routing (Bézier curves) and arrow indicators.
- **Smart Configuration**: Context-aware side panel to edit node properties (titles, descriptions) or connection states.
- **History System**: Full **Undo/Redo** support (Ctrl+Z / Ctrl+Shift+Z) covering transformations and structural changes.
- **Keyboard Navigation**: Move nodes with arrow keys (Shift for larger steps) and delete items via the keyboard.
- **Workflow Validation**: Integrated checker to ensure connectivity and structural integrity (Start/End nodes).
- **Save & Load**: Fast JSON-based export/import functionality.
- **Premium UI**: 
  - Glassmorphism effects
  - Responsive design (Desktop & Tablet)
  - **Dark Mode** support
  - WCAG 2.1 oriented accessibility (ARIA labels, keyboard controls)

## 🛠️ Technology Stack

- **Framework**: Angular (Latest)
- **Styling**: Vanilla CSS (Modern Grid/Flexbox)
- **State**: In-component history stack
- **Icons**: Lean SVG system

## 🚀 Getting Started

1.  **Clone the Repo**:
    ```bash
    git clone [repository-url]
    cd workflow-builder
    ```
2.  **Install Dependencies**:
    ```bash
    npm install
    ```
3.  **Run Development Server**:
    ```bash
    npm start
    ```
    Navigate to `http://localhost:4200/`.

## 📂 Project Structure

- `src/app/workflow-builder`: Core component logic and templates.
- `src/app/workflow-builder/models`: TypeScript interfaces for Nodes and Connections.
- `src/app/workflow-builder/services`: JSON export/import logic.

## 💾 Keyboard Shortcuts

- `Arrow Keys`: Move selected node
- `Shift + Arrow Keys`: Large move
- `Delete / Backspace`: Remove selected node/connection
- `Ctrl + Z`: Undo
- `Ctrl + Shift + Z`: Redo

## 📝 License

MIT
