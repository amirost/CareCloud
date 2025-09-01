// cytoscape-node-manager.js - Handles node creation and management

document.addEventListener("DOMContentLoaded", () => {
  // Ensure namespace exists
  window.cytoscapeEditor = window.cytoscapeEditor || {};
  
  // Create node manager
  window.cytoscapeEditor.nodeManager = {
    // Function to add a node at the specified position
    addNode: function(position) {
      if (!window.cy) {
        console.error("Cytoscape instance not found. Initialize Cytoscape first.");
        return null;
      }
      
      let nodeId, nodeType;
      const graphEditor = window.graphEditor;
      
      switch (graphEditor.activeAction) {
        case 'ajouter-routeur':
          nodeId = 'R' + graphEditor.counters.router++;
          nodeType = 'router';
          
          return this.createStandardNode(nodeId, nodeType, position);
          
        case 'ajouter-antenne':
          return this.createAntennaNode(position);
          
        case 'ajouter-utilisateur':
          nodeId = 'U' + graphEditor.counters.user++;
          nodeType = 'user';
          
          return this.createStandardNode(nodeId, nodeType, position);
                    
        default:
          return null; // No valid action
      }
    },

    createStandardNode: function(nodeId, nodeType, position) {
      // Create the node
      const node = window.cy.add({
        group: 'nodes',
        data: {
          id: nodeId,
          type: nodeType
        },
        position: position
      });
      
      // Apply colors directly for user nodes
      if (nodeType === 'user') {
        // Array of 20 distinct colors
      const userColors = [
        "#cc3838", "#1bb3a9", "#cc9e33", "#0e6d8f", "#2b2d9b", 
        "#b43c1e", "#217e72", "#c16f2e", "#b79137", "#1e3842",
        "#ff7cd9", "#9a81a8", "#8bbde5", "#6f9fcc", "#ff95aA",
        "#c40058", "#3f0084", "#210070", "#2034bb", "#1996bd"
      ];
        
        let colorIndex;
        let colorGroup;
        
        if (window.graphEditor.activeMode === "RV") {
          // In RV mode, users come in pairs with the same color
          colorIndex = Math.floor((window.graphEditor.counters.user) / 2) % userColors.length;
          colorGroup = Math.floor((window.graphEditor.counters.user) / 2) % 4;
        } else if (window.graphEditor.activeMode === "SC") {
          // In SC mode, each user gets a unique color
          colorIndex = (window.graphEditor.counters.user - 1) % userColors.length;
          colorGroup = (window.graphEditor.counters.user - 1) % 4;
        }
        
        // Apply the color directly to the node
        node.style('background-color', userColors[colorIndex]);
        
        // Add a colorGroup data attribute to support style selectors
        node.data('colorGroup', colorGroup);
      }
      
      console.log(`Added ${nodeType} node with ID ${nodeId} at position:`, position);
      return node;
    },
    
    // Create an antenna node with its halo
    createAntennaNode: function(position) {
      const graphEditor = window.graphEditor;
      const nodeId = 'A' + graphEditor.counters.antenna++;
      const nodeType = 'antenna';
      
      // Default radius for antenna
      const defaultRadius = graphEditor.antennaSettings.defaultRadius;
      
      // First add the halo node (larger, with low opacity)
      const haloId = nodeId + '-halo';
      window.cy.add({
        group: 'nodes',
        data: {
          id: haloId,
          type: 'antenna-halo',
          radius: defaultRadius
        },
        position: position,
        style: {
          'width': defaultRadius * 2,
          'height': defaultRadius * 2,
        }
      });
      
      // Calculate consumption based on global setting
      const consumption = graphEditor.antennaSettings.consumptionEnabled ? 
        (graphEditor.antennaSettings.consumptionBase * defaultRadius) : 0;
        
      // Then add the actual antenna node on top
      const antennaNode = window.cy.add({
        group: 'nodes',
        data: {
          id: nodeId,
          type: nodeType,
          radius: defaultRadius,
          haloId: haloId,
          consumption: consumption
        },
        position: position,
        style: {
          'z-index': 10, // Make sure it appears on top of the halo
          'width': 40,
          'height': 40
        }
      });
      window.cy.style().selector(`#${haloId}`).style({
        'events': 'no'
      }).update();
      console.log(`Added ${nodeType} node with ID ${nodeId} at position:`, position);
      
      return antennaNode;
    },
    
    // Update antenna radius and consumption
    updateAntennaRadius: function(antennaNode, radius) {
      if (!antennaNode || antennaNode.data('type') !== 'antenna') return;
      
      antennaNode.data('radius', radius);
      
      // Update the halo size
      const haloId = antennaNode.data('haloId');
      if (haloId) {
        const haloNode = window.cy.getElementById(haloId);
        if (haloNode) {
          haloNode.style({
            'width': radius * 2,
            'height': radius * 2
          });
        }
      }
      
      // Always update consumption (even if 0 when disabled)
      const consumption = window.graphEditor.calculateAntennaConsumption(radius);
      antennaNode.data('consumption', consumption);
      
      return consumption;
    }
  };
});