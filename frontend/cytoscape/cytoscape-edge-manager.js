// cytoscape-edge-manager.js - Handles edge creation and management

document.addEventListener("DOMContentLoaded", () => {
  // Ensure namespace exists
  window.cytoscapeEditor = window.cytoscapeEditor || {};
  
  // Create edge manager
  window.cytoscapeEditor.edgeManager = {
    // Function to create an edge between two nodes
    createEdge: function(sourceNode, targetNode) {
      if (!window.cy || !sourceNode || !targetNode) {
        console.error("Cannot create edge: missing required components.");
        return null;
      }
      
      // Create a unique ID for the edge
      const edgeId = 'E' + window.graphEditor.counters.edge++;
      
      // Get defaults from graphEditor
      const defaults = window.graphEditor.edgeDefaults;
      
      // Set initial values
      const initialCapacity = defaults.capacity || 1;
      const initialDistance = defaults.distance || 1;
      const baseConsumption = defaults.baseConsumption || 100;
      const initialConsumption = window.graphEditor.calculateEdgeConsumption(baseConsumption, initialCapacity, initialDistance);
      
      // Add the edge to the graph
      const edge = window.cy.add({
        group: 'edges',
        data: {
          id: edgeId,
          source: sourceNode.id(),
          target: targetNode.id(),
          capacity: initialCapacity,
          distance: initialDistance,
          baseConsumption: initialConsumption,
          thickness: defaults.thickness || 10
        }
      });
      
      console.log(`Added edge ${edgeId} from ${sourceNode.id()} to ${targetNode.id()}`);
      return edge;
    },
    
    // Update edge capacity
    updateEdgeCapacity: function(edge, capacity) {
      if (!edge || !edge.isEdge()) return null;
      
      const distance = parseInt(edge.data('distance')) || 1;
      const baseConsummption = parseInt(edge.data('baseConsumption'))|| 100;
      const consumption = window.graphEditor.calculateEdgeConsumption(baseConsummption, capacity, distance);
      
      edge.data('capacity', capacity);
      
      return consumption;
    },
    
    // Update edge distance
    updateEdgeDistance: function(edge, distance) {
      if (!edge || !edge.isEdge()) return null;
      
      const capacity = parseInt(edge.data('capacity')) || 1;
      const baseConsummption = parseInt(edge.data('baseConsumption'))|| 100;
      const consumption = window.graphEditor.calculateEdgeConsumption(baseConsummption, capacity, distance);
      
      edge.data('distance', distance);
   
      return consumption;
    },
    
    // Update edge thickness
    updateEdgeThickness: function(edge, thickness) {
      if (!edge || !edge.isEdge()) return;
      
      edge.data('thickness', thickness);
    }
  };
});