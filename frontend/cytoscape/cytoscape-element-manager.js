// cytoscape-element-manager.js - Handles element operations common to nodes and edges

document.addEventListener("DOMContentLoaded", () => {
  // Ensure namespace exists
  window.cytoscapeEditor = window.cytoscapeEditor || {};
  
  // Create element manager  
  window.cytoscapeEditor.elementManager = {
    // Function to delete an element (node or edge)
    deleteElement: function(element) {
      if (!window.cy || !element) {
        console.error("Cannot delete element: missing required components.");
        return;
      }
      
      const elementId = element.id();
      const elementType = element.isNode() ? 'node' : 'edge';
      
      // >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> LA CORRECTION EST ICI <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<
      // Si nous supprimons un utilisateur ET que nous sommes en mode RV, trouvons et supprimons son partenaire.
      if (element.isNode() && element.data('type') === 'user' && window.graphEditor.activeMode === 'RV') {
        // Récupérer l'ID numérique de l'utilisateur
        const userMatch = elementId.match(/U(\d+)/);
        if (userMatch && userMatch[1]) {
          const userId = parseInt(userMatch[1]);
          const isEven = userId % 2 === 0;
          
          // Si c'est un utilisateur pair, chercher l'impair associé, et vice versa
          const partnerId = isEven ? `U${userId - 1}` : `U${userId + 1}`;
          const partnerNode = window.cy.getElementById(partnerId);
          
          if (partnerNode && partnerNode.length > 0) {
            console.log(`Suppression automatique du partenaire ${partnerId} (mode RV)`);
            // Supprimer le partenaire (en évitant la récursion)
            window.cy.remove(partnerNode);
          }
        }
      }
      // >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> FIN DE LA CORRECTION <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<
      
      // Si deleting the source node for a connection, reset it
      if (window.cytoscapeEditor.resetSourceNode) {
        window.cytoscapeEditor.resetSourceNode();
      }
      
      // Si this is an antenna, also remove its halo
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
      if (window.graphEditor.selectedElement && 
          window.graphEditor.selectedElement.id() === elementId) {
        window.graphEditor.hidePropertiesPanel();
      }
      
      console.log(`Deleted ${elementType} with ID: ${elementId}`);
    },
    
    // Update all antennas in the graph when consumption settings change
    updateAllAntennaConsumption: function() {
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
    },
    
    // Update all halo positions to match their associated antenna nodes
    updateAllHaloPositions: function() {
      if (!window.cy) return;
      
      // Update all antennas in the graph
      window.cy.nodes('[type="antenna"]').forEach(antenna => {
        const haloId = antenna.data('haloId');
        if (haloId) {
          const haloNode = window.cy.getElementById(haloId);
          if (haloNode) {
            // Update halo position to match antenna position
            haloNode.position(antenna.position());
          }
        }
      });
      
      console.log("Updated all halo positions to match their antennas");
    },
    
    // Makes all halos non-interactive
    setHalosNonInteractive: function() {
      if (!window.cy) return;
      
      window.cy.style()
        .selector('node[type="antenna-halo"]')
        .style({
          'events': 'no'  // Make halos non-interactive
        })
        .update();
      
      console.log("Set all antenna halos to be non-interactive");
    }
  };
  
  // Add the updateAntennaConsumption function to cytoscapeEditor
  window.cytoscapeEditor.updateAntennaConsumption = function() {
    window.cytoscapeEditor.elementManager.updateAllAntennaConsumption();
  };
});