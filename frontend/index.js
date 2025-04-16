// index.js - Main application initialization and UI coordination

document.addEventListener("DOMContentLoaded", () => {
  const mainButtons = document.querySelectorAll(".game-button");

  mainButtons.forEach(button => {
      button.addEventListener("click", function () {
          const gameUrl = this.getAttribute("data-game");
          if (gameUrl) {
              window.location.href = gameUrl;
          }
      });
    });



  // Create namespace for application functions
  window.app = window.app || {};
  
  // Initialize UI components
  window.app.initUI = () => {
    // DOM Element references
    const elements = {
      body: document.querySelector("body"),
      mainContainer: document.querySelector(".main-container"),
      cyContainer: document.getElementById("cy"),
      graphListContainer: document.getElementById("graphListContainer"),
      modeSelector: document.getElementById("modeSelector"),
      editorModeBtn: document.getElementById("editorModeBtn"),
      createNewLevelBtn: document.getElementById("createNewLevelBtn"),
      backHomeBtn: document.getElementById("BackHomeBtn"),
      graphList: document.getElementById("graphList"),
      graphListLoading: document.getElementById("graphListLoading")
    };
    
    // Attach event listeners
    attachEventListeners(elements);
    
    // Export elements for other modules
    window.app.elements = elements;
    
    // Export the fetchGraphs function to be used in other scripts if needed
    window.fetchGraphs = (gameMode) => fetchGraphs(gameMode, elements);
  };
  
  // Function to attach event listeners to UI elements
  function attachEventListeners(elements) {
    const {
      mainContainer, 
      cyContainer, 
      graphListContainer, 
      modeSelector, 
      editorModeBtn, 
      createNewLevelBtn, 
      backHomeBtn
    } = elements;
    
    // Show graph list when clicking Editor Mode
    editorModeBtn.addEventListener("click", () => {
      // Hide main container
      mainContainer.style.display = "none";
      
      // Show mode selector and related buttons
      modeSelector.style.display = "block";
      createNewLevelBtn.style.display = "block";
      backHomeBtn.style.display = "block";
      
      // HIDE the editor mode button when in editor mode
      editorModeBtn.style.display = "none";
      
      // Show graph list container
      graphListContainer.style.display = "block";
      
      // Fetch graphs for the current mode using the graph-persistence module
      if (window.graphPersistence && window.graphPersistence.fetchGraphs) {
        fetchGraphs(modeSelector.value, elements);
      }
    });

    // Show graph editor when clicking Create New Level
    createNewLevelBtn.addEventListener("click", () => {
      // Hide graph list
      graphListContainer.style.display = "none";
      
      // Keep the button visible - don't hide it
      createNewLevelBtn.style.display = "block";
    });

    // Return to home
    backHomeBtn.addEventListener("click", () => {
      // Show main container
      mainContainer.style.display = "flex";
      
      // Hide everything else
      cyContainer.style.display = "none";
      graphListContainer.style.display = "none";
      
      // Show ONLY the editor mode button, hide all others
      editorModeBtn.style.display = "block";
      modeSelector.style.display = "none";
      createNewLevelBtn.style.display = "none";
      backHomeBtn.style.display = "none";
      
      // Remove any dynamic buttons and toggles
      const existingButtons = document.querySelectorAll(".dynamic-button");
      existingButtons.forEach(button => button.remove());
      
      const existingToggles = document.querySelectorAll(".antenna-toggle-container");
      existingToggles.forEach(toggle => toggle.remove());
      
      // Hide save button if it exists
      const saveButton = document.getElementById("saveGraphBtn");
      if (saveButton) {
        saveButton.style.display = "none";
      }
    });

    // Event listener for mode selector change - reload graphs when mode changes
    modeSelector.addEventListener("change", () => {
      console.log(`Mode changed to: ${modeSelector.value}`);
      
      // Clear the current graph if Cytoscape is initialized
      if (window.cy) {
        window.cy.elements().remove();
        
        // Reset counters
        if (window.graphEditor) {
          window.graphEditor.resetCounters();
        }
      }
      
      // Update buttons based on the selected mode
      if (window.graphEditor) {
        const mode = modeSelector.value;
        
        // Remove existing buttons
        const existingButtons = document.querySelectorAll(".dynamic-button");
        existingButtons.forEach(button => button.remove());
        
        // Remove existing antenna toggle containers
        const existingToggles = document.querySelectorAll(".antenna-toggle-container");
        existingToggles.forEach(toggle => toggle.remove());
        
        // Get mode-specific buttons
        const editorButtonsContainer = document.querySelector(".editor-buttons");
        if (editorButtonsContainer) {
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
            } else if (typeof createAntennaConsumptionToggle === 'function') {
              createAntennaConsumptionToggle();
            }
          }
        }
        
        // Update active mode
        window.graphEditor.activeMode = mode;
      }
      
      // If the graph list is visible, reload graphs for the new mode
      if (graphListContainer.style.display === "block") {
        fetchGraphs(modeSelector.value, elements);
      }
    });
  }
  
  // Function to fetch and display graphs from the database
  async function fetchGraphs(gameMode, elements) {
    const { graphList, graphListLoading } = elements;
    
    try {
      graphListLoading.style.display = "block";
      graphList.innerHTML = "";
      
      // Use the graph-persistence module to fetch graphs
      const data = await window.graphPersistence.fetchGraphs(gameMode);
      
      if (data.success && data.data.length > 0) {
        displayGraphList(data.data, elements);
        graphListLoading.style.display = "none";
      } else {
        // No graphs found
        graphList.innerHTML = "<p>Aucun graphe de ce mode trouvé.</p>";
        graphListLoading.style.display = "none";
      }
    } catch (error) {
      console.error("Error fetching graphs:", error);
      graphList.innerHTML = "<p>Error loading graphs. Please try again.</p>";
      graphListLoading.style.display = "none";
    }
  }
  
  // Function to display the list of graphs
  function displayGraphList(graphs, elements) {
    const { graphList, graphListContainer, cyContainer } = elements;
    
    graphs.forEach(graph => {
      const listItem = document.createElement("li");
      listItem.textContent = graph.name;
      listItem.setAttribute("data-id", graph._id);
      listItem.addEventListener("click", () => {
        console.log(`Selected graph: ${graph.name} with ID: ${graph._id}`);
        
        // Hide graph list container
        graphListContainer.style.display = "none";
        
        // Show cytoscape container
        cyContainer.style.display = "block";
        
        // Make sure "Créer un niveau" button stays visible
        const createNewLevelBtn = document.getElementById("createNewLevelBtn");
        if (createNewLevelBtn) {
          createNewLevelBtn.style.display = "block";
        }
        
        // Initialize Cytoscape if needed
        if (window.cytoscapeEditor && !window.cytoscapeEditor.isInitialized) {
          window.cytoscapeEditor.initCytoscape();
        }
        
        // Load the selected graph
        loadSelectedGraph(graph);
      });
      
      graphList.appendChild(listItem);
    });
  }
  
  // Function to load a selected graph
  function loadSelectedGraph(graph) {
    if (!window.graphPersistence || !window.graphPersistence.loadGraph) return;
    
    window.graphPersistence.loadGraph(graph._id)
      .then(result => {
        if (result.success) {
          console.log(`Graph "${graph.name}" loaded successfully`);
          
          // Update mode selector to match the graph's mode
          const modeSelector = document.getElementById("modeSelector");
          modeSelector.value = graph.mode;
          
          // Show buttons for this mode
          updateUIForGraphMode(graph.mode);


        } else {
          console.error(`Failed to load graph: ${result.message}`);
          alert(`Failed to load graph: ${result.message}`);
        }
      })
      .catch(error => {
        console.error("Error loading graph:", error);
        alert("Error loading graph. Please try again.");
      });
  }
  
  // Function to update UI for the graph mode
  function updateUIForGraphMode(mode) {
    if (!window.graphEditor) return;
    
    window.graphEditor.activeMode = mode;
    
    // Remove existing buttons
    const existingButtons = document.querySelectorAll(".dynamic-button");
    existingButtons.forEach(button => button.remove());
    
    // Remove existing antenna toggle containers
    const existingToggles = document.querySelectorAll(".antenna-toggle-container");
    existingToggles.forEach(toggle => toggle.remove());
    
    // Create mode-specific buttons
    const editorButtonsContainer = document.querySelector(".editor-buttons");
    if (!editorButtonsContainer) return;
    
    // Get button configurations
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
    
    // Add mode-specific buttons
    if (modeButtons[mode]) {
        modeButtons[mode].forEach(item => {
            const button = document.createElement("button");
            button.className = "dynamic-button";
            button.textContent = item.text;
            button.setAttribute("data-action", item.action);
            editorButtonsContainer.appendChild(button);
        });
    }
    
    // Add antenna consumption toggle if in RV or SC mode
    if (mode === "RV" || mode === "SC") {
        if (window.graphEditor && window.graphEditor.createAntennaConsumptionToggle) {
            window.graphEditor.createAntennaConsumptionToggle();
        } else if (typeof addAntennaToggleIfNeeded === 'function') {
            addAntennaToggleIfNeeded(mode, editorButtonsContainer);
        }
    }
    
    if(mode === "RV"){
      if (window.graphEditor && window.graphEditor.addGlobalCapacityButton) {
        window.graphEditor.addGlobalCapacityButton();
    }
    }

  }
  
  // Update selected antenna properties if one is currently selected
  function updateSelectedAntennaIfNeeded() {
    if (!window.graphEditor || !window.graphEditor.selectedElement || 
        !window.graphEditor.selectedElement.data || 
        window.graphEditor.selectedElement.data('type') !== 'antenna' ||
        !window.cytoscapeEditor || 
        !window.cytoscapeEditor.refreshNodeProperties) return;
    
    window.cytoscapeEditor.refreshNodeProperties(window.graphEditor.selectedElement);
  }
  
  // Initialize the application
  window.app.initUI();
});