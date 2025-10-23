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
    
    if (typeof window.courseEditor === 'undefined') {
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
        }
      });
      
      import('./course-content.js')
        .then(module => {
          if (window.courseEditor && !window.courseEditor.isInitialized) {
            window.courseEditor.init();
          }
        })
        .catch(error => {
          console.error("Failed to load course content module:", error);
        });
    } else if (window.courseEditor && !window.courseEditor.isInitialized) {
      window.courseEditor.init();
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
      mainContainer.style.display = "none";
      modeSelector.style.display = "block";
      createNewLevelBtn.style.display = "block";
      backHomeBtn.style.display = "block";
      editorModeBtn.style.display = "none";
      graphListContainer.style.display = "block";
      
      if (window.graphPersistence && window.graphPersistence.fetchGraphs) {
        fetchGraphs(modeSelector.value, elements);
      }
    });

    // Show graph editor when clicking Create New Level
    createNewLevelBtn.addEventListener("click", () => {
      graphListContainer.style.display = "none";
      createNewLevelBtn.style.display = "block";
      
      if (window.cytoscapeEditor && !window.cytoscapeEditor.isInitialized) {
        window.cytoscapeEditor.initCytoscape();
      }
      
      cyContainer.style.display = "block";
      window.app.initCourseEditor();
      
      // On appelle la fonction centralisée de graph-editor.js
      if (window.graphEditor && window.graphEditor.showModeButtons) {
          window.graphEditor.resetCounters();
          window.graphEditor.showModeButtons(modeSelector.value); 
      }
      addSaveButton();
    });

    // Return to home
    backHomeBtn.addEventListener("click", () => {
      mainContainer.style.display = "flex";
      cyContainer.style.display = "none";
      graphListContainer.style.display = "none";
      editorModeBtn.style.display = "block";
      modeSelector.style.display = "none";
      createNewLevelBtn.style.display = "none";
      backHomeBtn.style.display = "none";
      
      const existingElements = document.querySelectorAll(".dynamic-button, .antenna-toggle-container, #saveGraphBtn, .capacity-all-button");
      existingElements.forEach(el => el.remove());
    });

    // Event listener for mode selector change - reload graphs when mode changes
    modeSelector.addEventListener("change", () => {
        if (graphListContainer.style.display === "block") {
            fetchGraphs(modeSelector.value, elements);
        }
        
        const existingElements = document.querySelectorAll(".dynamic-button, .antenna-toggle-container, #saveGraphBtn, .capacity-all-button");
        existingElements.forEach(el => el.remove());
    });
  }
  
  // Function to fetch and display graphs from the database
  async function fetchGraphs(gameMode, elements) {
    const { graphList, graphListLoading } = elements;
    
    try {
      graphListLoading.style.display = "block";
      graphList.innerHTML = "";
      
      const data = await window.graphPersistence.fetchGraphs(gameMode);
      
      if (data.success && data.data.length > 0) {
        displayGraphList(data.data, elements);
      } else {
        graphList.innerHTML = "<p>Aucun graphe de ce mode trouvé.</p>";
      }
    } catch (error) {
      console.error("Error fetching graphs:", error);
      graphList.innerHTML = "<p>Error loading graphs. Please try again.</p>";
    } finally {
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
          
          // On appelle la fonction centralisée de graph-editor.js
          if (window.graphEditor && window.graphEditor.showModeButtons) {
            window.graphEditor.showModeButtons(graph.mode);
          }
          addSaveButton();
          window.app.initCourseEditor();
        } else {
          console.error(`Failed to load graph: ${result.message}`);
          alert(`Failed to load graph: ${result.message}`);
        }
      });
  }
  
  // Add a save button to the editor
  function addSaveButton() {
    const editorButtonsContainer = document.querySelector(".editor-buttons");
    if (editorButtonsContainer && !document.getElementById("saveGraphBtn")) {
      const saveBtn = document.createElement("button");
      saveBtn.id = "saveGraphBtn";
      saveBtn.textContent = "Enregistrer le graphe";
      saveBtn.addEventListener("click", () => {
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