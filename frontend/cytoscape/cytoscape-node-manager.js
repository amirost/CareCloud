
document.addEventListener("DOMContentLoaded", () => {
  // Ensure namespace exists
  window.cytoscapeEditor = window.cytoscapeEditor || {};

  const userTypePopup = document.getElementById('user-type-popup');
  const createUserPairingBtn = document.getElementById('createUserPairingBtn');
  const createUserCloudBtn = document.getElementById('createUserCloudBtn');
  
  window.cytoscapeEditor.nodeManager = {
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
          
        case 'ajouter-paire-clients':
          // On crée le premier utilisateur
          const userId1 = 'U' + graphEditor.counters.user++;
          this.createStandardNode(userId1, 'user', position, { userType: 'pairing' });
          
          // On crée le deuxième utilisateur, légèrement décalé
          const userId2 = 'U' + graphEditor.counters.user++;
          const position2 = { x: position.x + 80, y: position.y }; // Décalage pour la visibilité
          this.createStandardNode(userId2, 'user', position2, { userType: 'pairing' });
          
          return null;

        case 'ajouter-client-cloud':
          nodeId = 'U' + graphEditor.counters.user++;
          nodeType = 'user';
          return this.createStandardNode(nodeId, 'user', position, { userType: 'cloud' });

        case 'ajouter-utilisateur':
          nodeId = 'U' + graphEditor.counters.user++;
          nodeType = 'user';
          return this.createStandardNode(nodeId, 'user', position, { userType: 'pairing' });

        case 'ajouter-cloud':
          nodeId = 'C' + graphEditor.counters.cloud++;
          nodeType = 'cloud';
          return this.createStandardNode(nodeId, nodeType, position);
                    
        default:
          return null;
      }
    },

    createStandardNode: function(nodeId, nodeType, position, options = {}) {
      console.log(`[createStandardNode] Creating node with ID: ${nodeId}, Type: ${nodeType}`);
      const nodeData = {
        id: nodeId,
        type: nodeType
      };

      // On n'ajoute la propriété `userType` QUE si le nœud est de type 'user'
      if (nodeType === 'user') {
        nodeData.userType = options.userType || 'pairing'; // 'pairing' est le défaut pour un user
      }

      const node = window.cy.add({
        group: 'nodes',
        data: nodeData,
        position: position
      });
      
      if (nodeType === 'user') {
        const userColors = [
          "#cc3838", "#1bb3a9", "#cc9e33", "#0e6d8f", "#2b2d9b", "#b43c1e", "#217e72",
          "#c16f2e", "#b79137", "#1e3842", "#ff7cd9", "#9a81a8", "#8bbde5", "#6f9fcc",
          "#ff95aA", "#c40058", "#3f0084", "#210070", "#2034bb", "#1996bd"
        ];
        
        let colorIndex;
        let colorGroup;
        
        // Logique de coloration pour les paires
        if (options.userType === 'pairing') {
          const pairIndex = Math.floor((parseInt(nodeId.substring(1)) - 1) / 2);
          colorIndex = pairIndex % userColors.length;
          colorGroup = pairIndex % 4;
        } 

        else if (options.userType === 'cloud') {
          colorIndex = (window.graphEditor.counters.user - 1) % userColors.length;
          colorGroup = (window.graphEditor.counters.user - 1) % 4;
        }
        
        if (colorIndex !== undefined) {
          node.data('pairColor', userColors[colorIndex]);
          node.data('colorGroup', colorGroup);
        }
        
        if (options.userType === 'cloud') {
          node.addClass('user-type-cloud'); 
          
          const phoneNodeId = `phone-${nodeId}`;
          const taskNodeId = `task-${nodeId}`;
          const offset = 40;

          window.cy.add({
            group: 'nodes',
            data: { id: phoneNodeId, type: 'phone-config', parentId: nodeId },
            position: { x: position.x + offset, y: position.y }
          });

          window.cy.add({
            group: 'nodes',
            data: { id: taskNodeId, type: 'task-creator', parentId: nodeId },
            position: { x: position.x, y: position.y + offset }
          });
        }
      }
      
      console.log(`Added ${nodeType} node with ID ${nodeId}`);
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
          'z-index': 10,
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