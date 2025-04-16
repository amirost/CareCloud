// cytoscape-properties-manager.js - Handles properties panel for nodes and edges

document.addEventListener("DOMContentLoaded", () => {
  // Ensure namespace exists
  window.cytoscapeEditor = window.cytoscapeEditor || {};
  
  // Create properties manager
  window.cytoscapeEditor.propertiesManager = {
    // Function to show properties panel for edges
    showEdgeProperties: function(edge) {
      if (!edge || !edge.isEdge()) {
        console.error("Cannot show edge properties: invalid edge.");
        return;
      }
      
      // Update selected element reference
      window.graphEditor.selectedElement = edge;
      
      // Create or clear the properties panel
      const panel = window.graphEditor.createPropertiesPanel();
      panel.innerHTML = '';
      
      // Add a title
      const title = document.createElement('h3');
      title.textContent = `Propriétés: ${edge.id()}`;
      panel.appendChild(title);
      
      // Add capacity input
      this.createCapacityControl(panel, edge);
      
      // Add distance input
      this.createDistanceControl(panel, edge);
      
      // Add base consumption control
      this.createBaseConsumptionControl(panel, edge);

      // Add consumption display
      const consumptionDisplay = this.createConsumptionDisplay(panel, edge.data('consumption'));
      
      // Add thickness slider
      this.createThicknessControl(panel, edge);
      
      // Close button
      this.createCloseButton(panel);
      
      // Show the panel
      panel.style.display = 'block';
      
      return panel;
    },

    createBaseConsumptionControl: function(panel, edge) {
      const baseConsumptionLabel = document.createElement('label');
      baseConsumptionLabel.textContent = 'Consommation de base:';
      panel.appendChild(baseConsumptionLabel);

      const baseConsumptionInput = document.createElement('input');
      baseConsumptionInput.type = 'number';
      baseConsumptionInput.min = '0';

      baseConsumptionInput.value = window.graphEditor.edgeDefaults.consumptionBase || 100;

      const getConsumptionDisplay = () => panel.querySelector('.consumption-display');

      baseConsumptionInput.addEventListener('change', () => {
        const baseValue = parseInt(baseConsumptionInput.value) || 100;
        window.graphEditor.edgeDefaults.consumptionBase = baseValue;

        // Recalculate this edge's consumption with the new base value
        const capacity = parseInt(edge.data('capacity')) || 1;
        const distance = parseInt(edge.data('distance')) || 1;
        const baseConsummption = parseInt(baseConsumptionInput.value) || 100;

        edge.data('baseConsumption', baseConsummption);
        const consumption = window.graphEditor.calculateEdgeConsumption(baseConsummption, capacity, distance);
        
        edge.data('consumption', consumption);
                
        // Update consumption display if it exists
        const consumptionDisplay = getConsumptionDisplay();
        if (consumptionDisplay) {
          consumptionDisplay.textContent = `Consommation: ${consumption} watts`;
        }
      });

      panel.appendChild(baseConsumptionInput);
    },
    
    // Create capacity control
    createCapacityControl: function(panel, edge) {
      const capacityLabel = document.createElement('label');
      capacityLabel.textContent = 'Capacité:';
      panel.appendChild(capacityLabel);
      
      const capacityInput = document.createElement('input');
      capacityInput.type = 'number';
      capacityInput.min = '1';
      capacityInput.value = edge.data('capacity');
      
      // Get consumption display if it exists
      const getConsumptionDisplay = () => panel.querySelector('.consumption-display');
      
      capacityInput.addEventListener('change', () => {
        const capacity = parseInt(capacityInput.value) || 1;
        const consumption = window.cytoscapeEditor.edgeManager.updateEdgeCapacity(edge, capacity);
        
        // Update consumption display if it exists
        const consumptionDisplay = getConsumptionDisplay();
        if (consumptionDisplay) {
          consumptionDisplay.textContent = `Consommation: ${consumption} watts`;
        }
      });

      const autoCapacityButton = document.createElement('button');
      autoCapacityButton.className = 'auto-capacity-btn';
      autoCapacityButton.textContent = 'Capacité selon nombre utilisateurs';
      autoCapacityButton.addEventListener('click', () => {
        // Compter le nombre de paires d'utilisateurs
        const userNodes = window.cy.nodes().filter(node => node.data('type') === 'user');
        const pairCount = Math.ceil(userNodes.length / 2);
        
        console.log(`Setting capacity to number of user pairs: ${pairCount}`);
        
        // Mettre à jour la capacité
        capacityInput.value = pairCount;
        
        // Déclencher l'événement change pour mettre à jour l'edge
        const changeEvent = new Event('change');
        capacityInput.dispatchEvent(changeEvent);
      });

      // Ajouter le bouton après l'input de capacité
      panel.appendChild(document.createElement('br'));
      panel.appendChild(autoCapacityButton);
      
      panel.appendChild(capacityInput);
    },
    
    // Create distance control
    createDistanceControl: function(panel, edge) {
      const distanceLabel = document.createElement('label');
      distanceLabel.textContent = 'Distance:';
      panel.appendChild(distanceLabel);
      
      const distanceInput = document.createElement('input');
      distanceInput.type = 'number';
      distanceInput.min = '1';
      distanceInput.value = edge.data('distance');
      
      // Get consumption display if it exists
      const getConsumptionDisplay = () => panel.querySelector('.consumption-display');
      
      distanceInput.addEventListener('change', () => {
        const distance = parseInt(distanceInput.value) || 1;
        const consumption = window.cytoscapeEditor.edgeManager.updateEdgeDistance(edge, distance);
        
        // Update consumption display if it exists
        const consumptionDisplay = getConsumptionDisplay();
        if (consumptionDisplay) {
          consumptionDisplay.textContent = `Consommation: ${consumption} watts`;
        }
      });
      
      panel.appendChild(distanceInput);
    },
    
    // Create thickness control
    createThicknessControl: function(panel, edge) {
      const thicknessLabel = document.createElement('label');
      thicknessLabel.textContent = 'Epaisseur:';
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
        window.cytoscapeEditor.edgeManager.updateEdgeThickness(edge, thickness);
        thicknessValue.textContent = thickness;
      });
      
      panel.appendChild(thicknessSlider);
    },
    
    // Function to show properties panel for nodes
    showNodeProperties: function(node) {
      if (!node || !node.isNode()) {
        console.error("Cannot show node properties: invalid node.");
        return;
      }
      
      // Update selected element reference
      window.graphEditor.selectedElement = node;
      
      // Create or clear the properties panel
      const panel = window.graphEditor.createPropertiesPanel();
      panel.innerHTML = '';
      
      // Add a title
      const title = document.createElement('h3');
      title.textContent = `Propriétés: ${node.id()}`;
      panel.appendChild(title);
      
      // Add node type display
      const typeDisplay = document.createElement('div');
      typeDisplay.textContent = `Type: ${node.data('type')}`;
      panel.appendChild(typeDisplay);
      
      // If it's an antenna, add radius slider and always show consumption
      if (node.data('type') === 'antenna') {
        this.createAntennaControls(panel, node);
      }
      
      // Close button
      this.createCloseButton(panel);
      
      // Show the panel
      panel.style.display = 'block';
      
      return panel;
    },
    
    // Create antenna-specific controls
    createAntennaControls: function(panel, antennaNode) {
      const graphEditor = window.graphEditor;
      
      // Base consumption control for antennas
      const baseConsumptionLabel = document.createElement('label');
      baseConsumptionLabel.textContent = 'Consommation de base:';
      panel.appendChild(baseConsumptionLabel);
    
      const baseConsumptionInput = document.createElement('input');
      baseConsumptionInput.type = 'number';
      baseConsumptionInput.min = '1';
      // Use the global base consumption value from settings
      baseConsumptionInput.value = graphEditor.antennaSettings.consumptionBase;
    
      // Function to get consumption display element
      const getConsumptionDisplay = () => panel.querySelector('.consumption-display');
    
      baseConsumptionInput.addEventListener('change', () => {
        // Update the global base consumption value
        const baseValue = parseInt(baseConsumptionInput.value) || 100;
        graphEditor.antennaSettings.consumptionBase = baseValue;
        
        // Recalculate consumption with the new base value for this antenna
        const radius = antennaNode.data('radius');
        const consumption = graphEditor.calculateAntennaConsumption(radius);
        antennaNode.data('consumption', consumption);
        
        // Update the consumption display
        const consumptionDisplay = getConsumptionDisplay();
        if (consumptionDisplay) {
          consumptionDisplay.textContent = `Consommation: ${consumption} watts`;
        }
      });
      
      panel.appendChild(baseConsumptionInput);
      
      // Add checkbox for consumptionRadiusEnabled
      const radiusConsumptionContainer = document.createElement('div');
      radiusConsumptionContainer.className = 'checkbox-container';
      
      const radiusConsumptionLabel = document.createElement('label');
      radiusConsumptionLabel.textContent = 'Consommation selon rayon:';
      radiusConsumptionContainer.appendChild(radiusConsumptionLabel);
      
      const radiusConsumptionToggle = document.createElement('input');
      radiusConsumptionToggle.type = 'checkbox';
      radiusConsumptionToggle.checked = graphEditor.antennaSettings.consumptionRadiusEnabled || false;
      radiusConsumptionToggle.addEventListener('change', () => {
        // Update the global setting
        graphEditor.antennaSettings.consumptionRadiusEnabled = radiusConsumptionToggle.checked;
        
        // Recalculate consumption for this antenna
        const radius = antennaNode.data('radius');
        const consumption = graphEditor.calculateAntennaConsumption(radius);
        antennaNode.data('consumption', consumption);
        
        // Update consumption display
        const consumptionDisplay = getConsumptionDisplay();
        if (consumptionDisplay) {
          consumptionDisplay.textContent = `Consommation: ${consumption} watts`;
        }
      });
      
      radiusConsumptionContainer.appendChild(radiusConsumptionToggle);
      panel.appendChild(radiusConsumptionContainer);
      
      // Radius control
      const radiusLabel = document.createElement('label');
      radiusLabel.textContent = 'Rayon:';
      panel.appendChild(radiusLabel);
      
      const radiusValue = document.createElement('span');
      radiusValue.textContent = antennaNode.data('radius');
      radiusValue.className = 'radius-value';
      panel.appendChild(radiusValue);
      
      // Create consumption display
      const consumptionDisplay = this.createConsumptionDisplay(panel, antennaNode.data('consumption'));
      
      const radiusSlider = document.createElement('input');
      radiusSlider.type = 'range';
      radiusSlider.min = '10';
      radiusSlider.max = '200';
      radiusSlider.value = antennaNode.data('radius');
      radiusSlider.addEventListener('input', () => {
        const radius = parseInt(radiusSlider.value);
        const consumption = window.cytoscapeEditor.nodeManager.updateAntennaRadius(antennaNode, radius);
        
        radiusValue.textContent = radius;
        
        // Update the consumption display
        consumptionDisplay.textContent = `Consommation: ${consumption} watts`;
      });
      
      panel.appendChild(radiusSlider);
    },
    
    // Create consumption display
    createConsumptionDisplay: function(panel, consumption) {
      const consumptionDisplay = document.createElement('div');
      consumptionDisplay.className = 'consumption-display';
      consumptionDisplay.textContent = `Consommation: ${consumption} watts`;
      panel.appendChild(consumptionDisplay);
      
      return consumptionDisplay;
    },
    
    // Create close button
    createCloseButton: function(panel) {
      const closeButton = document.createElement('button');
      closeButton.textContent = 'Fermer';
      closeButton.addEventListener('click', window.graphEditor.hidePropertiesPanel);
      panel.appendChild(closeButton);
      
      return closeButton;
    }
  };
  
  // Add the refreshNodeProperties function to cytoscapeEditor
  window.cytoscapeEditor.refreshNodeProperties = function(node) {
    if (!node || !node.data) return;
    window.cytoscapeEditor.propertiesManager.showNodeProperties(node);
  };
});