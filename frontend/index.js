// index.js - Main application initialization and UI coordination

document.addEventListener("DOMContentLoaded", () => {
  // Set up main navigation buttons for game selection
  const mainButtons = document.querySelectorAll(".game-button");

  mainButtons.forEach(button => {
    button.addEventListener("click", function() {
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

  // Initialize Course Editor
  window.app.initCourseEditor = function() {
    console.log("Initializing course editor");
    
    // Load course-content.js script dynamically if needed
    if (typeof window.courseEditor === 'undefined') {
      // First ensure CSS files are loaded
      const cssFiles = [
        'styles/components/course-editor.css',
        'styles/components/course-popup.css'
      ];
      
      cssFiles.forEach(cssFile => {
        if (!document.querySelector(`link[href="${cssFile}"]`)) {
          const link = document.createElement('link');
          link.rel = 'stylesheet';
          link.href = cssFile;
          document.head.appendChild(link);
          console.log(`Loaded CSS: ${cssFile}`);
        }
      });
      
      // Then load the script as a module
      import('./course-content.js')
        .then(module => {
          console.log("Course content module loaded successfully");
          
          // The module export will automatically create window.courseEditor
          if (window.courseEditor) {
            if (!window.courseEditor.isInitialized) {
              window.courseEditor.init();
            }
            console.log("Course editor initialized from module");
          } else {
            console.error("Course editor not available after module load");
          }
        })
        .catch(error => {
          console.error("Failed to load course content module:", error);
          
          // Fallback to traditional script loading
          const script = document.createElement('script');
          script.src = 'course-content.js';
          script.type = 'module';
          script.onload = function() {
            console.log("Course editor script loaded via fallback");
            if (window.courseEditor && !window.courseEditor.isInitialized) {
              window.courseEditor.init();
            }
          };
          document.head.appendChild(script);
        });
    } else if (window.courseEditor) {
      // If already loaded, just initialize if needed
      if (!window.courseEditor.isInitialized) {
        window.courseEditor.init();
      }
      console.log("Course editor already available");
    }
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
      
      // Initialize Cytoscape if needed
      if (window.cytoscapeEditor && !window.cytoscapeEditor.isInitialized) {
        window.cytoscapeEditor.initCytoscape();
      }
      
      // Show cytoscape container
      cyContainer.style.display = "block";
      
      // Initialize course editor
      window.app.initCourseEditor();
      
      // Show buttons for the selected mode
      if (window.graphEditor) {
          window.graphEditor.resetCounters();
          showModeButtons(modeSelector.value); 
      }
      addSaveButton();
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
        
        // On ne fait QUE recharger la liste. ON N'APPELLE PAS showModeButtons.
        if (graphListContainer.style.display === "block") {
            fetchGraphs(modeSelector.value, elements);
        }
        
        // On nettoie les boutons au cas où ils seraient déjà affichés
        const existingButtons = document.querySelectorAll(".dynamic-button, .antenna-toggle-container, #saveGraphBtn, .capacity-all-button");
        existingButtons.forEach(button => button.remove());
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
      graphList.innerHTML = ''; 
      
      graphs.forEach(graph => {
          const listItem = document.createElement("li");
          listItem.textContent = graph.name;
          listItem.setAttribute("data-id", graph._id);
          listItem.addEventListener("click", () => {
              console.log(`Selected graph: ${graph.name} with ID: ${graph._id}`);
              
              graphListContainer.style.display = "none";
              cyContainer.style.display = "block";
              
              if (window.cytoscapeEditor && !window.cytoscapeEditor.isInitialized) {
                  window.cytoscapeEditor.initCytoscape();
              }
              
              loadSelectedGraphAndShowButtons(graph);
          });
          graphList.appendChild(listItem);
      });
  }

function loadSelectedGraphAndShowButtons(graph) {
    if (!window.graphPersistence || !window.graphPersistence.loadGraph) return;

    window.graphPersistence.loadGraph(graph._id)
      .then(result => {
        if (result.success) {
          console.log(`Graph "${graph.name}" loaded successfully`);
          
          const modeSelector = document.getElementById("modeSelector");
          modeSelector.value = graph.mode;
          
          // >>> CORRECTION : On appelle showModeButtons ICI <<<
          // Uniquement APRÈS avoir chargé le graphe
          showModeButtons(graph.mode);
          addSaveButton();

          window.app.initCourseEditor();
        } else {
          // ...
        }
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

          // Initialize the course editor after loading the graph
          window.app.initCourseEditor();
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
    showModeButtons(mode);
  }
  
  // Store button configurations for each mode
  const modeButtons = {
    "RV": [
      { text: "Ajouter Routeur", action: "ajouter-routeur" },
      { text: "Ajouter Utilisateur", action: "ajouter-utilisateur" },
      { text: "Ajouter Antenne", action: "ajouter-antenne" }
    ],
    "SC": [
      { text: "Ajouter Utilisateur", action: "ajouter-utilisateur" },
      { text: "Ajouter Antenne", action: "ajouter-antenne" }
    ],
    "Cloud": [
    ]
  };

  // Function to display mode-specific buttons
  function showModeButtons(mode) {
    const editorButtonsContainer = document.querySelector(".editor-buttons");
    if (!editorButtonsContainer) return;
    
    // Remove any existing dynamic buttons
    const existingButtons = document.querySelectorAll(".dynamic-button");
    existingButtons.forEach(button => button.remove());
    
    // Remove any existing antenna toggle containers
    const existingToggles = document.querySelectorAll(".antenna-toggle-container");
    existingToggles.forEach(toggle => toggle.remove());
    
    // Store active mode
    if (window.graphEditor) {
      window.graphEditor.activeMode = mode;
    }
    
    // Create and add buttons for the selected mode
    if (modeButtons[mode]) {
      modeButtons[mode].forEach(item => {
        const button = document.createElement("button");
        button.className = "dynamic-button";
        button.textContent = item.text;
        button.setAttribute("data-action", item.action);
        
        editorButtonsContainer.appendChild(button);
      });
    }
    
    // Create antenna consumption toggle for RV and SC modes
    if ((mode === "RV" || mode === "SC") && window.graphEditor && window.graphEditor.createAntennaConsumptionToggle) {
      window.graphEditor.createAntennaConsumptionToggle();
    }

    // Add the Course Editor button
    const courseEditorBtn = document.createElement("button");
    courseEditorBtn.id = "courseEditorBtn";
    courseEditorBtn.className = "dynamic-button";
    courseEditorBtn.innerHTML = '<i class="fas fa-book"></i> Course Editor';
    courseEditorBtn.style.backgroundColor = "#9C27B0"; // Purple to distinguish it
    
    courseEditorBtn.addEventListener("click", function() {
      // Check if course editor is initialized
      if (window.courseEditor) {
        window.courseEditor.toggleCourseEditor();
      } else {
        // Try to initialize it
        if (typeof window.app !== 'undefined' && window.app.initCourseEditor) {
          window.app.initCourseEditor();
          // Delay toggling to allow initialization
          setTimeout(function() {
            if (window.courseEditor) window.courseEditor.toggleCourseEditor();
          }, 100);
        } else {
          alert("Course editor not available. Please refresh the page and try again.");
        }
      }
    });
    
    editorButtonsContainer.appendChild(courseEditorBtn);

    // Add the global capacity button for RV mode
    if (mode === "RV" && window.graphEditor && window.graphEditor.addGlobalCapacityButton) {
      window.graphEditor.addGlobalCapacityButton();
    }
    
    // Add save button
    addSaveButton();
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
  
  // Add a save button to the editor
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
  
  // Initialize the application
  window.app.initUI();
});