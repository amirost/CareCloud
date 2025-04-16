// cytoscape-events.js - Event handlers for Cytoscape interactions

document.addEventListener("DOMContentLoaded", () => {
  // Ensure namespace exists
  window.cytoscapeEditor = window.cytoscapeEditor || {};
  
  // Variable for edge creation
  let sourceNode = null;
  
  // Register all event handlers
  window.cytoscapeEditor.registerEventHandlers = function() {
    if (!window.cy) {
      console.error("Cytoscape instance not found. Initialize Cytoscape first.");
      return;
    }
    
    // Add left-click handler for adding nodes and handling node clicks
    window.cy.on('tap', function(event) {
      const target = event.target;
      
      // If we clicked on the background and have an active node creation action
      if (target === window.cy && window.graphEditor.activeAction) {
        // Add a new node at the clicked position
        window.cytoscapeEditor.nodeManager.addNode(event.position);
      }
      // If we clicked on a node
      else if (target.isNode()) {
        // Skip interaction with halo nodes
        if (target.data('type') === 'antenna-halo') {
          return;
        }
        handleNodeClick(target);
      }
      // If we clicked on an edge
      else if (target.isEdge()) {
        handleEdgeClick(target);
      }
    });
    
    // Add right-click handler for deleting elements
    window.cy.on('cxttap', function(event) {
      const target = event.target;
      
      // If right-clicked on a node or edge
      if (target !== window.cy) {
        // Skip right-clicks on halo nodes
        if (target.isNode() && target.data('type') === 'antenna-halo') {
          return;
        }
        // Delete the element
        window.cytoscapeEditor.elementManager.deleteElement(target);
      }
    });
    
    // Add event listener to handle position changes for antenna nodes
    window.cy.on('position', 'node[type="antenna"]', function(event) {
      const antennaNode = event.target;
      const haloId = antennaNode.data('haloId');
      
      if (haloId) {
        const haloNode = window.cy.getElementById(haloId);
        if (haloNode) {
          // Update halo position to match antenna position
          haloNode.position(antennaNode.position());
        }
      }
    });
    
    // Add event listener for drag operations to ensure halos follow antennas
    window.cy.on('drag', 'node[type="antenna"]', function(event) {
      const antennaNode = event.target;
      const haloId = antennaNode.data('haloId');
      
      if (haloId) {
        const haloNode = window.cy.getElementById(haloId);
        if (haloNode) {
          // Update halo position to match antenna position during drag
          haloNode.position(antennaNode.position());
        }
      }
    });
  };
  
  // Function to handle node clicks for automatic link creation
  function handleNodeClick(node) {
    // Si we're in SC mode, only handle node selection but don't create edges
    if (window.graphEditor.activeMode === "SC") {
      window.cy.elements().unselect();
      node.select();
      console.log("Selected node in SC mode:", node.id());
      window.cytoscapeEditor.propertiesManager.showNodeProperties(node);
      return;
    }
  
    // Si the node is a user, just select it but don't use for connections
    if (node.data('type') === 'user') {
      window.cy.elements().unselect();
      node.select();
      console.log("Selected user node:", node.id());
      window.cytoscapeEditor.propertiesManager.showNodeProperties(node);
      return;
    }
    
    // Si we don't have a source node yet, set this as source
    if (!sourceNode) {
      sourceNode = node;
      window.cy.elements().unselect();
      sourceNode.select(); // Select the source
      window.cytoscapeEditor.propertiesManager.showNodeProperties(node);
      console.log("Selected source node:", sourceNode.id());
    } 
    // Si we already have a source node, create the edge
    else {
      // Don't connect a node to itself
      if (sourceNode.id() === node.id()) {
        console.log("Impossible de connecter un nœud à lui-même.");
        window.cy.elements().unselect();
        sourceNode = null;
        return;
      }
      
      // Vérifier si on tente de connecter deux antennes
      if (sourceNode.data('type') === 'antenna' && node.data('type') === 'antenna') {
        window.cy.elements().unselect();
        sourceNode = null;
        return;
      }
      
      // Create the edge
      const edge = window.cytoscapeEditor.edgeManager.createEdge(sourceNode, node);
      
      // Show properties of the newly created edge
      window.cy.elements().unselect();
      edge.select();
      window.cytoscapeEditor.propertiesManager.showEdgeProperties(edge);
      
      // Reset source node reference
      sourceNode = null;
    }
  }
  
  // Function to handle edge clicks to show properties
  function handleEdgeClick(edge) {
    window.cy.elements().unselect();
    edge.select();
    window.cytoscapeEditor.propertiesManager.showEdgeProperties(edge);
  }
  
  // Handle mode changes
  window.cytoscapeEditor.handleModeChange = function() {
    // Reset any pending edge creation
    if (sourceNode) {
      window.cy.elements().unselect();
      sourceNode = null;
    }
  };
  
  // Expose sourceNode reset functionality
  window.cytoscapeEditor.resetSourceNode = function() {
    sourceNode = null;
  };
});