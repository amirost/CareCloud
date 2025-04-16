// cytoscape-core.js - Core initialization and setup for Cytoscape

document.addEventListener("DOMContentLoaded", () => {
  // Create a namespace for cytoscape editor functions
  window.cytoscapeEditor = window.cytoscapeEditor || {};
  
  // Get the cytoscape container
  const cyContainer = document.getElementById("cy");
  
  // Reference to the Cytoscape instance - made global for graph-persistence.js
  window.cy = null;
  
  // Initialize Cytoscape
  window.cytoscapeEditor.initCytoscape = function() {
    // Check if styles are available
    if (!window.cytoscapeStyle) {
      console.error("Cytoscape styles not found. Make sure cytoscape-style.js is loaded before this script.");
      return;
    }
    
    // Initialize Cytoscape directly on the container
    window.cy = cytoscape({
      container: cyContainer,
      style: window.cytoscapeStyle,
      
      // Start with an empty graph
      elements: [],
      
      // Center the viewport
      zoom: 1,
      pan: { x: 0, y: 0 },
      
      // Set max/min zoom levels
      minZoom: 0.5,
      maxZoom: 3,
      wheelSensitivity: 0.3,
      
      // Use a more natural layout
      layout: {
        name: 'preset'
      },
      
      // Center the initial viewport
      fit: true,
      padding: 50,
      
      // Enable box selection
      boxSelectionEnabled: true
    });
    
    // Register event handlers from other modules
    if (window.cytoscapeEditor.registerEventHandlers) {
      window.cytoscapeEditor.registerEventHandlers();
    }
    
    console.log("Cytoscape initialized successfully");
    window.cytoscapeEditor.isInitialized = true;
  };
  
  // Flag to track initialization
  window.cytoscapeEditor.isInitialized = false;
});