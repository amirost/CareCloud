// rv-cytoscape-init.js - Initializes Cytoscape for the RV game
import { createRVStyles } from './RV-styles.js';

/**
 * Initializes Cytoscape instance for the RV gameplay
 * @param {Object} gameState - Game state object to attach Cytoscape instance to
 * @param {Object} options - Optional configuration parameters
 * @returns {Promise} - Resolves with initialized Cytoscape instance
 */
export function initCytoscape(gameState, options = {}) {
  return new Promise((resolve) => {
    // Get container element
    const container = document.getElementById(options.containerId || 'cy');
    if (!container) {
      console.error('Cytoscape container element not found');
      resolve(null);
      return;
    }
    
    // Get unified styles
    const gameplayStyles = createRVStyles();
    
    // Default configuration for gameplay
    const defaultConfig = {
      zoom: 1,
      pan: { x: 0, y: 0 },
      minZoom: 0,
      maxZoom: 1,
      wheelSensitivity: 0,
      layout: { name: 'preset' },
      fit: true,
      padding: 50,
      boxSelectionEnabled: false,
      panningEnabled: false,
      userPanningEnabled: false,
      //zoomingEnabled: false,
      userZoomingEnabled: false,
      autoungrabify: true
    };
    
    // Merge with provided options
    const cytoscapeConfig = {
      ...defaultConfig,
      ...options,
      container: container,
      style: gameplayStyles,
      elements: options.elements || []
    };
    
    // Initialize Cytoscape
    gameState.cy = cytoscape(cytoscapeConfig);
    console.log('Cytoscape initialized for RV gameplay');
    
    // Store reference to the global window object if needed for compatibility
    if (options.attachToWindow) {
      window.cy = gameState.cy;
    }
    
    // Apply any post-initialization configurations
    if (options.onInit && typeof options.onInit === 'function') {
      options.onInit(gameState.cy);
    }
    
    // Resolve with the created instance
    resolve(gameState.cy);
  });
}