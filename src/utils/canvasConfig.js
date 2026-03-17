// Existing constants
export const GRID_SIZE = 20; // Assuming existing
export const PAPER_SIZES = { A4: { width: 794, height: 1123 } }; // Assuming existing

// Step 1: Centralize Magic Numbers and Layout Constants
export const BLOCK_ESTIMATED_WIDTH = 100;
export const BLOCK_ESTIMATED_HEIGHT = 40;
export const CANVAS_PADDING = 800;
export const CURSOR_Y_OFFSET = 60;

// Step 4: Refactor Event Delegation Selectors
export const DOM_CLASSES = {
  BLOCK_CONTAINER: 'block-container',
  SIDEBAR: 'sidebar-panel',
  NAVBAR: 'navbar',
  CANVAS: 'canvas-area'
};
