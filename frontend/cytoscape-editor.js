// cytoscape-editor.js - Handles direct cytoscape operations like creating nodes, edges, etc.

document.addEventListener("DOMContentLoaded", () => {
  // Create a namespace for cytoscape editor functions
  window.cytoscapeEditor = {};
  
  // Get the cytoscape container directly
  const cyContainer = document.getElementById("cy");
  
  // Reference to the Cytoscape instance - made global for graph-persistence.js
  window.cy = null;
  
  // Variable for edge creation
  let sourceNode = null;
  
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
    
    // Add left-click handler for adding nodes and handling node clicks
    window.cy.on('tap', function(event) {
      const target = event.target;
      
      // If we clicked on the background and have an active node creation action
      if (target === window.cy && window.graphEditor.activeAction) {
        // Add a new node at the clicked position
        addNode(event.position);
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
        deleteElement(target);
      }
    });
    
    console.log("Cytoscape initialized successfully");
  };
  
  // Function to add a node at the specified position
  function addNode(position) {
    let nodeId, nodeType;
    const graphEditor = window.graphEditor;
    
    switch (graphEditor.activeAction) {
      case 'ajouter-routeur':
        nodeId = 'R' + graphEditor.counters.router++;
        nodeType = 'router';
        
        window.cy.add({
          group: 'nodes',
          data: {
            id: nodeId,
            type: nodeType
          },
          position: position
        });
        break;
        
      case 'ajouter-antenne':
        nodeId = 'A' + graphEditor.counters.antenna++;
        nodeType = 'antenna';
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
        window.cy.add({
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
        
        console.log(`Added ${nodeType} node with ID ${nodeId} at position:`, position);
        return;
        
      case 'ajouter-utilisateur':
        nodeId = 'U' + graphEditor.counters.user++;
        nodeType = 'user';
        
        window.cy.add({
          group: 'nodes',
          data: {
            id: nodeId,
            type: nodeType
          },
          position: position
        });
        break;
                
      default:
        return; // No valid action
    }
    
    console.log(`Added ${nodeType} node with ID ${nodeId} at position:`, position);
  }
  
  // Function to handle node clicks for automatic link creation
  function handleNodeClick(node) {
    // If the node is a user, just select it but don't use for connections
    if (node.data('type') === 'user') {
      window.cy.elements().unselect();
      node.select();
      console.log("Selected user node:", node.id());
      showNodeProperties(node);
      return;
    }
    
    // If we don't have a source node yet, set this as source
    if (!sourceNode) {
      sourceNode = node;
      window.cy.elements().unselect();
      sourceNode.select(); // Select the source
      showNodeProperties(node);
      console.log("Selected source node:", sourceNode.id());
    } 
    // If we already have a source node, create the edge
    else {
      // Don't connect a node to itself
      if (sourceNode.id() === node.id()) {
        console.log("Cannot connect a node to itself.");
        window.cy.elements().unselect();
        sourceNode = null;
        return;
      }
      
      // Create a unique ID for the edge
      const edgeId = 'E' + window.graphEditor.counters.edge++;
      
      // Get defaults from graphEditor
      const defaults = window.graphEditor.edgeDefaults;
      
      // Set initial values
      const initialCapacity = defaults.capacity || 1;
      const initialDistance = defaults.distance || 1;
      const initialConsumption = window.graphEditor.calculateEdgeConsumption(initialCapacity, initialDistance);
      
      // Add the edge to the graph
      const edge = window.cy.add({
        group: 'edges',
        data: {
          id: edgeId,
          source: sourceNode.id(),
          target: node.id(),
          capacity: initialCapacity,
          distance: initialDistance,
          baseConsumption: initialConsumption,
          thickness: defaults.thickness || 2
        }
      });
      
      console.log(`Added edge ${edgeId} from ${sourceNode.id()} to ${node.id()}`);
      
      // Show properties of the newly created edge
      window.cy.elements().unselect();
      edge.select();
      showEdgeProperties(edge);
      
      // Reset source node reference
      sourceNode = null;
    }
  }
  
  // Function to handle edge clicks to show properties
  function handleEdgeClick(edge) {
    window.cy.elements().unselect();
    edge.select();
    showEdgeProperties(edge);
  }
  
  // Function to delete an element (node or edge)
  function deleteElement(element) {
    const elementId = element.id();
    const elementType = element.isNode() ? 'node' : 'edge';
    
    // If deleting the source node for a connection, reset it
    if (element === sourceNode) {
      sourceNode = null;
    }
    
    // If this is an antenna, also remove its halo
    if (element.isNode() && element.data('type') === 'antenna') {
      const haloId = element.data('haloId');
      if (haloId) {
        const haloNode = window.cy.getElementById(haloId);
        if (haloNode) {
          window.cy.remove(haloNode);
        }
      }
    }
    
    // Remove the element
    window.cy.remove(element);
    
    // Hide properties panel if the selected element was deleted
    if (window.graphEditor.selectedElement && window.graphEditor.selectedElement.id() === elementId) {
      window.graphEditor.hidePropertiesPanel();
    }
    
    console.log(`Deleted ${elementType} with ID: ${elementId}`);
  }
  
  // Update antenna consumption when the global setting changes
  window.cytoscapeEditor.updateAntennaConsumption = function() {
    if (!window.cy) return;
    
    const settings = window.graphEditor.antennaSettings;
    
    // Update all antennas in the graph
    window.cy.nodes('[type="antenna"]').forEach(antenna => {
      const radius = antenna.data('radius');
      const consumption = settings.consumptionEnabled ? 
        (settings.consumptionBase * radius) : 0;
      antenna.data('consumption', consumption);
    });
    
    console.log(`Antenna consumption ${settings.consumptionEnabled ? 'enabled' : 'disabled'}`);
  };
  
  // Function to refresh node properties panel for the selected node
  window.cytoscapeEditor.refreshNodeProperties = function(node) {
    if (!node || !node.data) return;
    showNodeProperties(node);
  };
  
  // Function to show properties panel for edges
 /* function showEdgeProperties(edge) {
    // Update selected element reference
    console.log("dfgoijreiguhergjeraigeiargjeriagergergaerg");
    window.graphEditor.selectedElement = edge;
    
    // Create or clear the properties panel
    const panel = window.graphEditor.createPropertiesPanel();
    panel.innerHTML = '';
    
    // Add a title
    const title = document.createElement('h3');
    title.textContent = `Propriétés: ${edge.source()} - ${edge.target()}`;
    panel.appendChild(title);
    
    const baseConsumptionLabel = document.createElement('label');
    baseConsumptionLabel.textContent = 'Consommation de base:';
    panel.appendChild(baseConsumptionLabel);

    const baseConsumptionInput = document.createElement('input');
    baseConsumptionInput.type = 'number';
    baseConsumptionInput.min = '0';

    baseConsumptionInput.value = window.graphEditor.edgeDefaults.consumptionBase || 100;
    baseConsumptionInput.addEventListener('change', () => {
      const baseValue = parseInt(baseConsumptionInput.value) || 100;
      window.graphEditor.edgeDefaults.consumptionBase = baseValue;

      // Recalculate this edge's consumption with the new base value
      const capacity = parseInt(edge.data('capacity')) || 1;
      const distance = parseInt(edge.data('distance')) || 1;
      const consumption = window.graphEditor.calculateEdgeConsumption(capacity, distance);
      
      edge.data('consumption', consumption);
      
      // Update consumption display
      consumptionDisplay.textContent = `Consumption: ${consumption} watts`;
    });

    panel.appendChild(baseConsumptionInput);

    // Add capacity input
    const capacityLabel = document.createElement('label');
    capacityLabel.textContent = 'Capacité:';
    panel.appendChild(capacityLabel);
    
    const capacityInput = document.createElement('input');
    capacityInput.type = 'number';
    capacityInput.min = '1';
    capacityInput.value = edge.data('capacity');
    capacityInput.addEventListener('change', () => {
      const capacity = parseInt(capacityInput.value) || 1;
      const distance = parseInt(edge.data('distance')) || 1;
      const consumption = window.graphEditor.calculateEdgeConsumption(capacity, distance);
      
      edge.data('capacity', capacity);
      edge.data('consumption', consumption);
      
      // Update consumption display
      consumptionDisplay.textContent = `Consumption: ${consumption} watts`;
    });
    panel.appendChild(capacityInput);
    
    // Add distance input
    const distanceLabel = document.createElement('label');
    distanceLabel.textContent = 'Distance:';
    panel.appendChild(distanceLabel);
    
    const distanceInput = document.createElement('input');
    distanceInput.type = 'number';
    distanceInput.min = '1';
    distanceInput.value = edge.data('distance');
    distanceInput.addEventListener('change', () => {
      const capacity = parseInt(edge.data('capacity')) || 1;
      const distance = parseInt(distanceInput.value) || 1;
      const consumption = window.graphEditor.calculateEdgeConsumption(capacity, distance);
      
      edge.data('distance', distance);
      edge.data('consumption', consumption);
      
      // Update consumption display
      consumptionDisplay.textContent = `Consumption: ${consumption} watts`;
    });
    panel.appendChild(distanceInput);
    
    // Add consumption display
    const consumptionDisplay = document.createElement('div');
    consumptionDisplay.className = 'consumption-display';
    consumptionDisplay.textContent = `Consumption: ${edge.data('consumption')} watts`;
    panel.appendChild(consumptionDisplay);
    
    // Add thickness slider
    const thicknessLabel = document.createElement('label');
    thicknessLabel.textContent = 'Thickness:';
    panel.appendChild(thicknessLabel);
    
    const thicknessValue = document.createElement('span');
    thicknessValue.textContent = edge.data('thickness');
    thicknessValue.className = 'thickness-value';
    panel.appendChild(thicknessValue);
    
    const thicknessSlider = document.createElement('input');
    thicknessSlider.type = 'range';
    thicknessSlider.min = '1';
    thicknessSlider.max = '10';
    thicknessSlider.value = edge.data('thickness');
    thicknessSlider.addEventListener('input', () => {
      const thickness = parseInt(thicknessSlider.value);
      edge.data('thickness', thickness);
      thicknessValue.textContent = thickness;
    });
    panel.appendChild(thicknessSlider);
    
    // Close button
    const closeButton = document.createElement('button');
    closeButton.textContent = 'Close';
    closeButton.addEventListener('click', window.graphEditor.hidePropertiesPanel);
    panel.appendChild(closeButton);
    
    // Show the panel
    panel.style.display = 'block';
  }*/
  
  // Function to show properties panel for nodes
 /* function showNodeProperties(node) {
    // Update selected element reference
    window.graphEditor.selectedElement = node;
    
    // Create or clear the properties panel
    const panel = window.graphEditor.createPropertiesPanel();
    panel.innerHTML = '';
    
    // Add a title
    const title = document.createElement('h3');
    title.textContent = `Node Properties: ${node.id()}`;
    panel.appendChild(title);
    
    // Add node type display
    const typeDisplay = document.createElement('div');
    typeDisplay.textContent = `Type: ${node.data('type')}`;
    panel.appendChild(typeDisplay);
    
    // If it's an antenna, add radius slider and always show consumption
    if (node.data('type') === 'antenna') {
      // Radius control
      const radiusLabel = document.createElement('label');
      radiusLabel.textContent = 'Radius:';
      panel.appendChild(radiusLabel);
      
      const radiusValue = document.createElement('span');
      radiusValue.textContent = node.data('radius');
      radiusValue.className = 'radius-value';
      panel.appendChild(radiusValue);
      
      const radiusSlider = document.createElement('input');
      radiusSlider.type = 'range';
      radiusSlider.min = '10';
      radiusSlider.max = '200';
      radiusSlider.value = node.data('radius');
      radiusSlider.addEventListener('input', () => {
        const radius = parseInt(radiusSlider.value);
        node.data('radius', radius);
        radiusValue.textContent = radius;
        
        // Update the halo size
        const haloId = node.data('haloId');
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
        node.data('consumption', consumption);
        
        // Update the consumption display
        consumptionDisplay.textContent = `Consumption: ${consumption} watts`;
      });
      panel.appendChild(radiusSlider);
      
      // Always add consumption display (will show 0 when disabled)
      const consumptionDisplay = document.createElement('div');
      consumptionDisplay.className = 'consumption-display';
      consumptionDisplay.textContent = `Consumption: ${node.data('consumption')} watts`;
      panel.appendChild(consumptionDisplay);
    }
    
    // Close button
    const closeButton = document.createElement('button');
    closeButton.textContent = 'Close';
    closeButton.addEventListener('click', window.graphEditor.hidePropertiesPanel);
    panel.appendChild(closeButton);
    
    // Show the panel
    panel.style.display = 'block';
  }*/
  
  // Handle mode changes
  window.cytoscapeEditor.handleModeChange = function() {
    // Reset any pending edge creation
    if (sourceNode) {
      window.cy.elements().unselect();
      sourceNode = null;
    }
  };
  
  // Hide Cytoscape when going back home
  const BackHomeBtn = document.getElementById("BackHomeBtn");
  if (BackHomeBtn) {
    BackHomeBtn.addEventListener('click', () => {
      if (window.cy) {
        // Reset any pending edge creation
        sourceNode = null;
        
        // Hide properties panel
        window.graphEditor.hidePropertiesPanel();
      }
    });
  }
  
  // Set initialization flag
  window.cytoscapeEditor.isInitialized = false;
});