// cytoscape-editor-main.js - Main file that imports and coordinates all modules

document.addEventListener("DOMContentLoaded", () => {
  console.log("Cytoscape Editor initialized");
  
  // Hide Cytoscape when going back home
  const BackHomeBtn = document.getElementById("BackHomeBtn");
  if (BackHomeBtn) {
    BackHomeBtn.addEventListener('click', () => {
      if (window.cy) {
        // Reset any pending edge creation
        if (window.cytoscapeEditor.resetSourceNode) {
          window.cytoscapeEditor.resetSourceNode();
        }
        
        // Hide properties panel
        if (window.graphEditor && window.graphEditor.hidePropertiesPanel) {
          window.graphEditor.hidePropertiesPanel();
        }
      }
    });
  }
});