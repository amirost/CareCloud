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
    // SC Mode or User Node: simple selection only
    if (window.graphEditor.activeMode === "SC" || node.data('type') === 'user') {
      window.cy.elements().not(node).unselect();
      node.select();
      window.cytoscapeEditor.propertiesManager.showNodeProperties(node);
      return;
    }

    // --- Special interaction nodes (Cloud Mode) ---
    // If the clicked node is a task creator, open its specific editor
    if (node.data('type') === 'task-creator') {
        console.log(`Opening task editor for ${node.id()}`);
        window.cytoscapeEditor.propertiesManager.showTaskEditorPopup(node);
        // If a source node was selected for linking, cancel it.
        if (sourceNode) {
            sourceNode.unselect();
            sourceNode = null;
        }
        return;
    }

    // If the clicked node is a phone config, open its specific editor
    if (node.data('type') === 'phone-config') {
        console.log(`Opening server editor for ${node.id()}`);
        window.cytoscapeEditor.propertiesManager.showServerEditorPopup(node);
        // Cancel any pending link creation
        if (sourceNode) {
            sourceNode.unselect();
            sourceNode = null;
        }
        return;
    }
    
    // --- Link creation logic (for RV and Cloud modes) ---

    // Case 1: No source node is selected yet.
    if (!sourceNode) {
      sourceNode = node;
      window.cy.elements().not(sourceNode).unselect();
      sourceNode.select();
      window.cytoscapeEditor.propertiesManager.showNodeProperties(node);
      console.log("Selected source node:", sourceNode.id());
      return;
    }

    // Case 2: The same node is clicked again (deselect)
    if (sourceNode.id() === node.id()) {
      console.log("Deselecting the source node.");
      sourceNode.unselect();
      sourceNode = null;
      window.graphEditor.hidePropertiesPanel();
      return;
    }

    // Case 3: A second, different node is clicked.
    
    // --- Validation Rules ---
    const sourceType = sourceNode.data('type');
    const targetType = node.data('type');
    
    console.log(`Attempting to connect: ${sourceType} -> ${targetType}`);

    const validConnections = {
        'router': ['router', 'antenna', 'cloud'],
        'antenna': ['router'],
        'cloud': ['router']
    };
    
    // Rule 1: Source node type must be able to start a connection.
    if (!validConnections[sourceType]) {
        console.log(`Invalid Action: Cannot start a connection from a "${sourceType}".`);
        sourceNode.unselect();
        sourceNode = null;
        window.graphEditor.hidePropertiesPanel();
        return;
    }

    // Rule 2: Target node type must be valid for the source.
    if (!validConnections[sourceType].includes(targetType)) {
        console.log(`Invalid Action: Connection not allowed between "${sourceType}" and "${targetType}".`);
        
        // Special case: if user tries antenna -> antenna, just switch selection.
        if (sourceType === 'antenna' && targetType === 'antenna') {
            sourceNode.unselect();
            sourceNode = node;
            sourceNode.select();
            window.cytoscapeEditor.propertiesManager.showNodeProperties(node);
        }
        return;
    }
    
    // --- If validation passes, create the edge ---
    console.log(`Valid connection: ${sourceType} -> ${targetType}. Creating edge.`);
    const edge = window.cytoscapeEditor.edgeManager.createEdge(sourceNode, node);
    if (edge) {
        window.cy.elements().unselect();
        edge.select();
        window.cytoscapeEditor.propertiesManager.showEdgeProperties(edge);
    }
    
    // Reset the source node after the link is created
    sourceNode = null; 
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