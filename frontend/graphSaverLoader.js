document.addEventListener("DOMContentLoaded", () => {
  // Start with a default that assumes same-machine
  let API_BASE = "http://localhost:3000";
  let API_URL = `${API_BASE}/api/graphs`;
  
  // Function to detect and update server address
  async function updateServerAddress() {
    try {
      const frontendHost = window.location.hostname;

      // CASE 1: If frontend is on localhost, force API to localhost.
      if (frontendHost === 'localhost' || frontendHost === '127.0.0.1') {
        console.log("Frontend is on localhost. Forcing API connection to localhost.");
        API_BASE = "http://localhost:3000";
        API_URL = `${API_BASE}/api/graphs`;
        
        await fetch(API_BASE, { method: 'HEAD', headers: { 'Cache-Control': 'no-cache' } });
        console.log(`Successfully connected to API at: ${API_BASE}`);
        return;
      }

      // CASE 2: If frontend is on a network host, try API on the same host.
      console.log(`Frontend is on a network host (${frontendHost}). Trying to connect to API on the same host.`);
      API_BASE = `http://${frontendHost}:3000`;
      API_URL = `${API_BASE}/api/graphs`;
      
      const testResponse = await fetch(API_BASE, { method: 'HEAD', headers: { 'Cache-Control': 'no-cache' } });
      
      if (testResponse.ok) {
        console.log(`Successfully connected to API at: ${API_BASE}`);
        return;
      } else {
        throw new Error(`Failed to connect to API on host ${frontendHost}`);
      }

    } catch (error) {
      console.warn("Could not auto-detect server address. Falling back to default 'http://localhost:3000'. Error:", error.message);
      API_BASE = "http://localhost:3000";
      API_URL = `${API_BASE}/api/graphs`;
    }
  }
  
  // Try to update server address at startup
  updateServerAddress();
  
  // Create namespace for graph persistence functions
  window.graphPersistence = {};
  
    async function findGraphByName(name, mode) {
    try {
      const response = await fetch(`${API_URL}/find?name=${encodeURIComponent(name)}&mode=${mode}`);
      if (!response.ok) {
        return null; 
      }
      const result = await response.json();
      if (result.success && result.data) {
        return result.data;
      }
      return null;
    } catch (error) {
      console.error("Error finding graph by name:", error);
      return null;
    }
  }

  window.graphPersistence.saveGraph = async function(name) {
    if (!window.cy) {
      return { success: false, message: "Editor not initialized" };
    }
    
    try {
      // Collect all the nodes
      const nodes = [];
      window.cy.nodes().forEach(node => {
        if (node.data('type') === 'antenna-halo') return;
        
        const nodeData = {
          id: node.id(),
          type: node.data('type'),
          x: Math.round(node.position('x')),
          y: Math.round(node.position('y')),
          userType: node.data('userType'),
          parentId: node.data('parentId')
        };
        

        // On s'assure de sauvegarder TOUTES les données pertinentes de l'antenne
        if (node.data('type') === 'antenna') {
          nodeData.radius = node.data('radius');
          nodeData.haloId = node.data('haloId');
          nodeData.consumption = node.data('consumption') || 0;
          nodeData.consumptionBase = node.data('consumptionBase') || 0;
          nodeData.consumptionRadiusEnabled = node.data('consumptionRadiusEnabled') || false;
        }

        if (node.data('servers')) {
          // On reconstruit le tableau pour garantir que toutes les propriétés sont présentes
          nodeData.servers = node.data('servers').map(server => ({
            id: server.id,
            name: server.name,
            capacity: server.capacity,
            consumption: server.consumption || 0 // On ajoute une valeur par défaut de 0 si absente
          }));
        }
        
        if (node.data('tasks')) {
          nodeData.tasks = node.data('tasks').map(task => ({
            id: task.id,
            name: task.name,
            charge: task.charge
          }));
        }
        nodes.push(nodeData);
      });
      
      const edges = [];
      window.cy.edges().forEach(edge => {
        edges.push({ id: edge.id(), source: edge.source().id(), target: edge.target().id(), capacity: edge.data('capacity') || 1, distance: edge.data('distance') || 1, consumption: edge.data('consumption') || 100, thickness: edge.data('thickness') || 2 });
      });
      
      const graphCourseContent = window.cy?.courseContent || null;
  
      const graphData = {
        name: name,
        mode: window.graphEditor.activeMode,
        nodes: nodes,
        edges: edges,
        courseContent: graphCourseContent,
        antennaSettings: window.graphEditor.antennaSettings
      };

      const existingGraph = await findGraphByName(name, graphData.mode);

      let response;
      if (existingGraph) {
        console.log(`Graph "${name}" already exists with ID ${existingGraph._id}. Updating it.`);
        response = await fetch(`${API_URL}/${existingGraph._id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(graphData)
        });
      } else {
        console.log(`Graph "${name}" does not exist. Creating a new one.`);
        response = await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(graphData)
        });
      }
      
      const result = await response.json();
      
      if (result.success) {
        console.log("Graph saved/updated successfully:", result.data);
        return { success: true, data: result.data };
      } else {
        console.error("Failed to save/update graph:", result.message);
        return { success: false, message: result.message };
      }
    } catch (error) {
      console.error("Error saving/updating graph:", error);
      return { success: false, message: error.message };
    }
  };
  
  window.graphPersistence.loadGraph = async function(graphId) {
    if (!window.cy) {
      console.error("Cytoscape not initialized");
      return { success: false, message: "Editor not initialized" };
    }
    
    try {
      const response = await fetch(`${API_URL}/${graphId}`);
      const result = await response.json();
      
      if (!result.success) {
        console.error("Failed to load graph:", result.message);
        return { success: false, message: result.message };
      }
      
      const graph = result.data;
      
      window.cy.elements().remove();
      window.graphEditor.activeMode = graph.mode;

      if (graph.courseContent) {
        window.cy.courseContent = graph.courseContent;
      } else {
        window.cy.courseContent = null;
      }
      
      if (graph.antennaSettings) {
        window.graphEditor.antennaSettings.consumptionEnabled = graph.antennaSettings.consumptionEnabled || false;
        window.graphEditor.antennaSettings.consumptionRadiusEnabled = graph.antennaSettings.consumptionRadiusEnabled || false;
        window.graphEditor.antennaSettings.consumptionBase = graph.antennaSettings.consumptionBase || 0;
        
        const consumptionToggle = document.getElementById('antennaConsumptionToggle');
        if (consumptionToggle) {
          consumptionToggle.checked = window.graphEditor.antennaSettings.consumptionEnabled;
        }
        
        const radiusToggle = document.getElementById('antennaRadiusToggle');
        if (radiusToggle) {
          radiusToggle.checked = window.graphEditor.antennaSettings.consumptionRadiusEnabled;
          radiusToggle.disabled = !window.graphEditor.antennaSettings.consumptionEnabled;
        }
      }
      
      graph.nodes.forEach(node => {
        window.cy.add({
          group: 'nodes',
          data: { id: node.id, type: node.type, ...node },
          position: { x: node.x, y: node.y }
        });
        
        if (node.type === 'antenna' && node.haloId) {
          window.cy.add({
            group: 'nodes',
            data: { id: node.haloId, type: 'antenna-halo', radius: node.radius },
            position: { x: node.x, y: node.y },
            style: { 'width': node.radius * 2, 'height': node.radius * 2 }
          });
        }
      });
      
      graph.edges.forEach(edge => {
        window.cy.add({
          group: 'edges',
          data: { id: edge.id, source: edge.source, target: edge.target, capacity: edge.capacity, distance: edge.distance, consumption: edge.consumption, thickness: edge.thickness }
        });
      });
      
      const userColors = [
            "#cc3838", "#1bb3a9", "#cc9e33", "#0e6d8f", "#2b2d9b", 
            "#b43c1e", "#217e72", "#c16f2e", "#b79137", "#1e3842",
            "#ff7cd9", "#9a81a8", "#8bbde5", "#6f9fcc", "#ff95aA",
            "#c40058", "#3f0084", "#210070", "#2034bb", "#1996bd"
      ];

      if (graph.mode === "RV") {
        const userNodes = window.cy.nodes('[type="user"]');
        const sortedUsers = userNodes.sort((a, b) => {
            const numA = parseInt(a.id().match(/\d+/)[0] || 0);
            const numB = parseInt(b.id().match(/\d+/)[0] || 0);
            return numA - numB;
        });
        for (let i = 0; i < sortedUsers.length; i += 2) {
            const colorIndex = Math.floor(i / 2) % userColors.length;
            const color = userColors[colorIndex];
            sortedUsers[i].style('background-color', color);
            if (i + 1 < sortedUsers.length) {
                sortedUsers[i + 1].style('background-color', color);
            }
        }
      } else if (graph.mode === "SC") {
        const userNodes = window.cy.nodes('[type="user"]');
        const sortedUsers = userNodes.sort((a, b) => {
            const numA = parseInt(a.id().match(/\d+/)[0] || 0);
            const numB = parseInt(b.id().match(/\d+/)[0] || 0);
            return numA - numB;
        });
        sortedUsers.forEach((userNode, index) => {
            const colorIndex = index % userColors.length;
            const color = userColors[colorIndex];
            userNode.style('background-color', color);
        });
      } else if (graph.mode === "Cloud") {
        const pairingUsers = window.cy.nodes('[userType="pairing"]');
        const cloudUsers = window.cy.nodes('[userType="cloud"]');

        // Colorer les paires
        const sortedPairingUsers = pairingUsers.sort((a, b) => (parseInt(a.id().match(/\d+/)[0] || 0) - parseInt(b.id().match(/\d+/)[0] || 0)));
        for (let i = 0; i < sortedPairingUsers.length; i += 2) {
            const color = userColors[Math.floor(i / 2) % userColors.length];
            sortedPairingUsers[i].style('background-color', color);
            if (i + 1 < sortedPairingUsers.length) {
                sortedPairingUsers[i + 1].style('background-color', color);
            }
        }
              // Colorer les clients cloud individuellement (avec une autre palette de couleurs ou en décalant l'index)
        cloudUsers.forEach((userNode, index) => {
            const colorIndex = (pairingUsers.length / 2 + index) % userColors.length;
            const color = userColors[colorIndex];
            userNode.style('background-color', color);
        });
      }

      window.graphEditor.resetCounters();
      
      window.cy.nodes().forEach(node => {
        const id = node.id();
        const type = node.data('type');
        if (type === 'antenna-halo') return;
        
        // On utilise une expression régulière plus générique pour l'ID
        const match = id.match(/^[A-Za-z]+(\d+)$/);
        if (match && match[1]) {
          const num = parseInt(match[1]);
          
          // On mappe le préfixe de l'ID au nom du compteur
          const prefix = id.charAt(0).toLowerCase();
          const counterMap = {
            'r': 'router', 'a': 'antenna', 'u': 'user', 'c': 'cloud'
          };
          const counterKey = counterMap[prefix];
          if (counterKey && window.graphEditor.counters[counterKey]) {
            window.graphEditor.counters[counterKey] = Math.max(window.graphEditor.counters[counterKey], num + 1);
          }
        }
      });
      
      window.cy.edges().forEach(edge => {
        const id = edge.id();
        const match = id.match(/E(\d+)/);
        if (match && match[1]) {
          const num = parseInt(match[1]);
          window.graphEditor.counters.edge = Math.max(window.graphEditor.counters.edge, num + 1);
        }
      });
      
      window.cy.fit();
      
      const createNewLevelBtn = document.getElementById("createNewLevelBtn");
      if (createNewLevelBtn) {
        createNewLevelBtn.style.display = "block";
      }
      
      const mode = graph.mode;
      const editorButtonsContainer = document.querySelector(".editor-buttons");
      if (editorButtonsContainer) {
        const existingButtons = document.querySelectorAll(".dynamic-button");
        existingButtons.forEach(button => button.remove());
        const existingToggles = document.querySelectorAll(".antenna-toggle-container");
        existingToggles.forEach(toggle => toggle.remove());
        
        const modeButtons = {
          "RV": [ { text: "Ajouter Routeur", action: "ajouter-routeur" }, { text: "Ajouter utilisateur", action: "ajouter-utilisateur" }, { text: "Ajouter antenne", action: "ajouter-antenne" } ],
          "SC": [ { text: "Ajouter utilisateur", action: "ajouter-utilisateur" }, { text: "Ajouter antenne", action: "ajouter-antenne" } ],
          "Cloud": []
        };
        
        if (modeButtons[mode]) {
          modeButtons[mode].forEach(item => {
            const button = document.createElement("button");
            button.className = "dynamic-button";
            button.textContent = item.text;
            button.setAttribute("data-action", item.action);
            editorButtonsContainer.appendChild(button);
          });
        }
        
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
  
  window.graphPersistence.fetchGraphs = async function(mode) {
    try {
      const response = await fetch(`${API_URL}?mode=${mode}`);
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error("Error fetching graphs:", error);
      return { success: false, message: error.message, data: [] };
    }
  };
  
  window.graphPersistence.deleteGraph = async function(graphId) {
    try {
      const response = await fetch(`${API_URL}/${graphId}`, { method: 'DELETE' });
      return await response.json();
    } catch (error) {
      console.error("Error deleting graph:", error);
      return { success: false, message: error.message };
    }
  };
  
  window.graphPersistence.updateCourseContent = async function(graphId, courseContent) {
    try {
      const response = await fetch(`${API_URL}/${graphId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseContent })
      });
      const result = await response.json();
      if (result.success) {
        return { success: true, data: result.data };
      } else {
        return { success: false, message: result.message };
      }
    } catch (error) {
      console.error("Error updating course content:", error);
      return { success: false, message: error.message };
    }
  };
  
  function addSaveButton() {
    const editorButtonsContainer = document.querySelector(".editor-buttons");
    if (editorButtonsContainer && !document.getElementById("saveGraphBtn")) {
      const saveBtn = document.createElement("button");
      saveBtn.id = "saveGraphBtn";
      saveBtn.textContent = "Enregistrer le graphe";
      saveBtn.addEventListener("click", () => {
        const name = prompt("Enter a name for this graph:", `Graph_${window.graphEditor.activeMode}_${new Date().toISOString().slice(0, 10)}`);
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
  
  function displayServerInfo() {
    const container = document.createElement('div');
    container.id = 'server-info';
    container.style.cssText = 'position: fixed; bottom: 10px; right: 10px; background: rgba(0,0,0,0.7); color: white; padding: 8px; border-radius: 4px; font-size: 12px; max-width: 300px;';
    const addressDisplay = document.createElement('div');
    addressDisplay.textContent = 'Server: Detecting...';
    container.appendChild(addressDisplay);
    document.body.appendChild(container);
    
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
  
  setTimeout(displayServerInfo, 1000);
  window.addSaveButton = addSaveButton;
});