document.addEventListener("DOMContentLoaded", () => {
  // Start with a default that assumes same-machine
  let API_BASE = "http://localhost:3000";
  let API_URL = `${API_BASE}/api/graphs`;
  
  // Function to detect and update server address
  async function updateServerAddress() {
    try {
      // First try with the current window location (will work in most cases)
      const currentHost = window.location.hostname;
      const currentPort = "3000"; // Always use the backend port
      
      if (currentHost && currentHost !== "localhost" && currentHost !== "127.0.0.1") {
        API_BASE = `http://${currentHost}:${currentPort}`;
        API_URL = `${API_BASE}/api/graphs`;
        console.log(`Using current host: ${API_BASE}`);
        
        // Test if this address works
        const testResponse = await fetch(`${API_BASE}`, { 
          method: 'HEAD',
          headers: { 'Cache-Control': 'no-cache' }
        });
        
        if (testResponse.ok) {
          console.log(`Successfully connected to: ${API_BASE}`);
          return; // We've found a working address
        }
      }
      
      // If window location doesn't work, try the server info endpoint
      console.log("Trying to detect server address...");
      const response = await fetch(`${API_BASE}/api/serverinfo`);
      
      if (!response.ok) {
        throw new Error(`Failed to get server info: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success && result.ip) {
        // Update API URLs with actual server IP and port
        API_BASE = `http://${result.ip}:${result.port}`;
        API_URL = `${API_BASE}/api/graphs`;
        console.log(`Connected to server at: ${API_BASE}`);
      }
    } catch (error) {
      console.warn("Using default server address. Error:", error.message);
    }
  }
  
  // Try to update server address at startup
  updateServerAddress();
  
  // Create namespace for graph persistence functions
  window.graphPersistence = {};
  
  /**
   * Save the current graph to the database
   * @param {string} name - Name of the graph
   * @returns {Promise<Object>} - Result of the save operation
   */
  window.graphPersistence.saveGraph = async function(name) {
    if (!window.cy) {
      console.error("Cytoscape not initialized");
      return { success: false, message: "Editor not initialized" };
    }
    
    try {
      // Collect all the nodes (excluding halos, which will be recreated)
      const nodes = [];
      window.cy.nodes().forEach(node => {
        // Skip halo nodes as they're tied to antennas
        if (node.data('type') === 'antenna-halo') return;
        
        const nodeData = {
          id: node.id(),
          type: node.data('type'),
          x: Math.round(node.position('x')),
          y: Math.round(node.position('y'))
        };
        
        // Add antenna-specific properties
        if (node.data('type') === 'antenna') {
          nodeData.radius = node.data('radius');
          nodeData.haloId = node.data('haloId');
          nodeData.consumption = node.data('consumption') || 0;
        }
        
        nodes.push(nodeData);
      });
      
      // Collect all the edges
      const edges = [];
      window.cy.edges().forEach(edge => {
        edges.push({
          id: edge.id(),
          source: edge.source().id(),
          target: edge.target().id(),
          capacity: edge.data('capacity') || 1,
          distance: edge.data('distance') || 1,
          consumption: edge.data('consumption') || 100,
          thickness: edge.data('thickness') || 2
        });
      });
      
      // Create the graph data
      const graphData = {
        name: name || `Graph_${new Date().toISOString().slice(0, 10)}`,
        mode: window.graphEditor.activeMode,
        nodes: nodes,
        edges: edges,
        antennaSettings: {
          consumptionEnabled: window.graphEditor.antennaSettings.consumptionEnabled,
          consumptionRadiusEnabled: window.graphEditor.antennaSettings.consumptionRadiusEnabled,
          consumptionBase: window.graphEditor.antennaSettings.consumptionBase
        }
      };
      
      // Call the API to save the graph
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(graphData)
      });
      
      const result = await response.json();
      
      if (result.success) {
        console.log("Graph saved successfully:", result.data);
        return { success: true, data: result.data };
      } else {
        console.error("Failed to save graph:", result.message);
        return { success: false, message: result.message };
      }
    } catch (error) {
      console.error("Error saving graph:", error);
      return { success: false, message: error.message };
    }
  };
  
  /**
   * Load a graph from the database by ID
   * @param {string} graphId - ID of the graph to load
   * @returns {Promise<Object>} - Result of the load operation
   */
  window.graphPersistence.loadGraph = async function(graphId) {
    if (!window.cy) {
      console.error("Cytoscape not initialized");
      return { success: false, message: "Editor not initialized" };
    }
    
    try {
      // Call the API to get the graph
      const response = await fetch(`${API_URL}/${graphId}`);
      const result = await response.json();
      
      if (!result.success) {
        console.error("Failed to load graph:", result.message);
        return { success: false, message: result.message };
      }
      
      const graph = result.data;
      
      // Clear existing elements
      window.cy.elements().remove();
      
      // Set the active mode
      window.graphEditor.activeMode = graph.mode;
      
      // Update antenna settings
      if (graph.antennaSettings) {
        window.graphEditor.antennaSettings.consumptionEnabled = 
          graph.antennaSettings.consumptionEnabled || false;
        window.graphEditor.antennaSettings.consumptionRadiusEnabled = 
          graph.antennaSettings.consumptionRadiusEnabled || false;
        window.graphEditor.antennaSettings.consumptionBase = 
          graph.antennaSettings.consumptionBase || 0;
        
        // Update UI toggle for consumption if it exists
        const consumptionToggle = document.getElementById('antennaConsumptionToggle');
        if (consumptionToggle) {
          consumptionToggle.checked = window.graphEditor.antennaSettings.consumptionEnabled;
        }
        
        // Update UI toggle for radius-based consumption if it exists
        const radiusToggle = document.getElementById('antennaRadiusToggle');
        if (radiusToggle) {
          radiusToggle.checked = window.graphEditor.antennaSettings.consumptionRadiusEnabled;
          radiusToggle.disabled = !window.graphEditor.antennaSettings.consumptionEnabled;
        }
      }
      
      // Add nodes first
      graph.nodes.forEach(node => {
        // Add the node
        window.cy.add({
          group: 'nodes',
          data: {
            id: node.id,
            type: node.type,
            ...node // Include all other node properties
          },
          position: {
            x: node.x,
            y: node.y
          }
        });
        
        // If this is an antenna, also add its halo
        if (node.type === 'antenna' && node.haloId) {
          window.cy.add({
            group: 'nodes',
            data: {
              id: node.haloId,
              type: 'antenna-halo',
              radius: node.radius
            },
            position: {
              x: node.x,
              y: node.y
            },
            style: {
              'width': node.radius * 2,
              'height': node.radius * 2
            }
          });
        }
      });
      
      // Then add edges
      graph.edges.forEach(edge => {
        window.cy.add({
          group: 'edges',
          data: {
            id: edge.id,
            source: edge.source,
            target: edge.target,
            capacity: edge.capacity,
            distance: edge.distance,
            consumption: edge.consumption,
            thickness: edge.thickness
          }
        });
      });
      
      // Reset counters to prevent ID collisions on future additions
      window.graphEditor.resetCounters();
      
      // Extract highest number from each type of node
      window.cy.nodes().forEach(node => {
        const id = node.id();
        const type = node.data('type');
        
        // Skip halo nodes
        if (type === 'antenna-halo') return;
        
        // Extract the numeric part and update counters
        const match = id.match(/[A-Za-z]+(\d+)/);
        if (match && match[1]) {
          const num = parseInt(match[1]);
          
          switch (type) {
            case 'router':
              window.graphEditor.counters.router = Math.max(window.graphEditor.counters.router, num + 1);
              break;
            case 'antenna':
              window.graphEditor.counters.antenna = Math.max(window.graphEditor.counters.antenna, num + 1);
              break;
            case 'user':
              window.graphEditor.counters.user = Math.max(window.graphEditor.counters.user, num + 1);
              break;
            case 'server':
              window.graphEditor.counters.server = Math.max(window.graphEditor.counters.server, num + 1);
              break;
            case 'client':
              window.graphEditor.counters.client = Math.max(window.graphEditor.counters.client, num + 1);
              break;
            case 'vm':
              window.graphEditor.counters.vm = Math.max(window.graphEditor.counters.vm, num + 1);
              break;
            case 'storage':
              window.graphEditor.counters.storage = Math.max(window.graphEditor.counters.storage, num + 1);
              break;
            case 'network':
              window.graphEditor.counters.network = Math.max(window.graphEditor.counters.network, num + 1);
              break;
          }
        }
      });
      
      // Also update edge counter
      window.cy.edges().forEach(edge => {
        const id = edge.id();
        const match = id.match(/E(\d+)/);
        if (match && match[1]) {
          const num = parseInt(match[1]);
          window.graphEditor.counters.edge = Math.max(window.graphEditor.counters.edge, num + 1);
        }
      });
      
      // Fit the graph in the viewport
      window.cy.fit();
      
      // Make sure the createNewLevelBtn stays visible
      const createNewLevelBtn = document.getElementById("createNewLevelBtn");
      if (createNewLevelBtn) {
        createNewLevelBtn.style.display = "block";
      }
      
      // Update UI to match the loaded graph's mode (add/remove buttons)
      const mode = graph.mode;
      const editorButtonsContainer = document.querySelector(".editor-buttons");
      if (editorButtonsContainer) {
        // Remove existing dynamic buttons and antenna toggle
        const existingButtons = document.querySelectorAll(".dynamic-button");
        existingButtons.forEach(button => button.remove());
        
        const existingToggles = document.querySelectorAll(".antenna-toggle-container");
        existingToggles.forEach(toggle => toggle.remove());
        
        // Add buttons for the graph's mode
        const modeButtons = {
          "RV": [
            { text: "Ajouter Routeur", action: "ajouter-routeur" },
            { text: "Ajouter utilisateur", action: "ajouter-utilisateur" },
            { text: "Ajouter antenne", action: "ajouter-antenne" }
          ],
          "SC": [
            { text: "Ajouter utilisateur", action: "ajouter-utilisateur" },
            { text: "Ajouter antenne", action: "ajouter-antenne" }
          ],
          "Cloud": [
          ]
        };
        
        // Add buttons for the selected mode
        if (modeButtons[mode]) {
          modeButtons[mode].forEach(item => {
            const button = document.createElement("button");
            button.className = "dynamic-button";
            button.textContent = item.text;
            button.setAttribute("data-action", item.action);
            editorButtonsContainer.appendChild(button);
          });
        }
        
        // Add antenna consumption toggle if needed
        if (mode === "RV" || mode === "SC") {
          if (window.graphEditor && window.graphEditor.createAntennaConsumptionToggle) {
            window.graphEditor.createAntennaConsumptionToggle();
          }
        }

        if(mode === "RV"){
          if (window.graphEditor && window.graphEditor.addGlobalCapacityButton) {
            setTimeout(window.graphEditor.addGlobalCapacityButton, 100);
        }
        }
      }
      addSaveButton();
      console.log("Graph loaded successfully");
      return { success: true, data: graph };
    } catch (error) {
      console.error("Error loading graph:", error);
      return { success: false, message: error.message };
    }
  };
  
  /**
   * Fetch all graphs for a specific mode
   * @param {string} mode - Mode to filter graphs by (RV, SC, Cloud)
   * @returns {Promise<Object>} - Result containing the graphs
   */
  window.graphPersistence.fetchGraphs = async function(mode) {
    try {
      const response = await fetch(`${API_URL}?mode=${mode}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      const result = await response.json();
      return result;
    } catch (error) {
      console.error("Error fetching graphs:", error);
      return { success: false, message: error.message, data: [] };
    }
  };
  
  /**
   * Delete a graph by ID
   * @param {string} graphId - ID of the graph to delete
   * @returns {Promise<Object>} - Result of the delete operation
   */
  window.graphPersistence.deleteGraph = async function(graphId) {
    try {
      const response = await fetch(`${API_URL}/${graphId}`, {
        method: 'DELETE'
      });
      
      return await response.json();
    } catch (error) {
      console.error("Error deleting graph:", error);
      return { success: false, message: error.message };
    }
  };
  
  // Add a save button to the editor when it's initialized
  function addSaveButton() {
    console.log('Adding save button to editor');
    const editorButtonsContainer = document.querySelector(".editor-buttons");
    if (editorButtonsContainer && !document.getElementById("saveGraphBtn")) {
      const saveBtn = document.createElement("button");
      saveBtn.id = "saveGraphBtn";
      saveBtn.textContent = "Enregistrer le graphe";
      saveBtn.addEventListener("click", () => {
        // Prompt for graph name
        const name = prompt("Enter a name for this graph:", 
          `Graph_${window.graphEditor.activeMode}_${new Date().toISOString().slice(0, 10)}`);
        
        if (name) {
          window.graphPersistence.saveGraph(name)
            .then(result => {
              if (result.success) {
                alert(`Graphe "${name}" enregistré avec succès!`);
              } else {
                alert(`Échec de l'enregistrement du graphe: ${result.message}`);
              }
            });
        }
      });
      
      editorButtonsContainer.appendChild(saveBtn);
    }
  }
  
  const createNewLevelBtn = document.getElementById("createNewLevelBtn");
  if (createNewLevelBtn) {
    createNewLevelBtn.addEventListener('click', function() {
      // Add save button once the editor is initialized
      setTimeout(addSaveButton, 500);
    });
  }
  
  // Function to check connectivity and display server information
  function displayServerInfo() {
    const container = document.createElement('div');
    container.id = 'server-info';
    container.style.cssText = 'position: fixed; bottom: 10px; right: 10px; background: rgba(0,0,0,0.7); color: white; padding: 8px; border-radius: 4px; font-size: 12px; max-width: 300px;';
    
    const addressDisplay = document.createElement('div');
    addressDisplay.textContent = 'Server: Detecting...';
    container.appendChild(addressDisplay);
    
    document.body.appendChild(container);
    
    // Try to get server info
    fetch(`${API_BASE}/api/serverinfo`)
      .then(response => response.json())
      .then(data => {
        if (data.success && data.ip) {
          addressDisplay.innerHTML = `Server: <strong>http://${data.ip}:${data.port}</strong>`;
        }
      })
      .catch(error => {
        addressDisplay.textContent = `Server: ${API_BASE} (local)`;
      });
  }
  
  // Display server info after a short delay
  setTimeout(displayServerInfo, 1000);

  window.addSaveButton = addSaveButton;
});