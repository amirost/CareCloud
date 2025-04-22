// graph-editor.js - Manages graph parameters, modes, and non-cytoscape functionality

document.addEventListener("DOMContentLoaded", () => {
    // DOM Elements
    const editorButtonsContainer = document.querySelector(".editor-buttons");
    const modeSelector = document.getElementById("modeSelector");
    const createNewLevelBtn = document.getElementById("createNewLevelBtn");
    const cyContainer = document.getElementById("cy");

    // Graph Parameters (used by cytoscape-editor.js)
    window.graphEditor = {
        // Counters for generating sequential IDs
        counters: {
            router: 1,
            antenna: 1,
            user: 1,
            server: 1,
            connection: 1,
            client: 1,
            vm: 1,
            storage: 1,
            network: 1,
            edge: 1
        },
        
        // Active mode and action
        activeMode: null,
        activeAction: null,
        
        // Antenna parameters
        antennaSettings: {
            consumptionEnabled: false,
            consumptionRadiusEnabled: false,
            consumptionBase: 0, // Default base consumption value when enabled
            defaultRadius: 50
        },
        
        // Edge default parameters
        edgeDefaults: {
            capacity: 1,
            distance: 1,
            thickness: 10 // Modifié de 2 à 10
        },
        
        // Properties panel state
        propertiesPanel: null,
        selectedElement: null,
        
        // Calculate consumption for different elements
        calculateEdgeConsumption: function(baseConsumption, capacity, distance) {
            return baseConsumption * capacity * distance;
        },
        
        calculateAntennaConsumption: function(radius) {
            if (!this.antennaSettings.consumptionEnabled) return 0;
            else{
                if(this.antennaSettings.consumptionRadiusEnabled)
                    return (this.antennaSettings.consumptionBase * radius);
                else return (this.antennaSettings.consumptionBase);
            }
        },
        
        // Utility functions for properties panel
        createPropertiesPanel: function() {
            if (!this.propertiesPanel) {
                this.propertiesPanel = document.createElement('div');
                this.propertiesPanel.className = 'properties-panel';
                document.body.appendChild(this.propertiesPanel);
            }
            return this.propertiesPanel;
        },
        
        hidePropertiesPanel: function() {
            if (this.propertiesPanel) {
                this.propertiesPanel.style.display = 'none';
            }
            this.selectedElement = null;
        },
        
        // Reset counters
        resetCounters: function() {
            for (let key in this.counters) {
                this.counters[key] = 1;
            }
        },
        
        // Exposed createAntennaConsumptionToggle function for external access
        createAntennaConsumptionToggle: function() {
            // Only add for RV or SC mode
            if (this.activeMode !== "RV" && this.activeMode !== "SC") return;
            
            // Remove existing antenna toggles to prevent duplicates
            const existingToggles = document.querySelectorAll(".antenna-toggle-container");
            existingToggles.forEach(toggle => toggle.remove());
            
            const toggleContainer = document.createElement('div');
            toggleContainer.className = 'antenna-toggle-container';
            
            // Basic consumption toggle
            const toggleLabel = document.createElement('label');
            toggleLabel.textContent = 'Consommation des antennes:';
            toggleLabel.className = 'antenna-toggle-label';
            toggleContainer.appendChild(toggleLabel);
            
            const toggle = document.createElement('input');
            toggle.type = 'checkbox';
            toggle.id = 'antennaConsumptionToggle';
            toggle.checked = this.antennaSettings.consumptionEnabled;
            toggle.addEventListener('change', () => {
                this.antennaSettings.consumptionEnabled = toggle.checked;
                
                // Update all antennas
                if (window.cytoscapeEditor && window.cytoscapeEditor.updateAntennaConsumption) {
                    window.cytoscapeEditor.updateAntennaConsumption();
                }
                
                // Update the selected antenna if one is currently selected
                if (this.selectedElement && 
                    this.selectedElement.data && 
                    this.selectedElement.data('type') === 'antenna' &&
                    window.cytoscapeEditor && 
                    window.cytoscapeEditor.refreshNodeProperties) {
                    window.cytoscapeEditor.refreshNodeProperties(this.selectedElement);
                }
            });
            toggleContainer.appendChild(toggle);
            
            // Find editor buttons container
            if (editorButtonsContainer) {
                editorButtonsContainer.appendChild(toggleContainer);
            }
        },

        // Fonction pour définir la capacité de tous les liens au nombre de paires d'utilisateurs
        setAllEdgesCapacity: function() {
            if (!window.cy) {
                console.error("Cytoscape n'est pas initialisé");
                return;
            }
            
            // Compter le nombre de paires d'utilisateurs
            const userNodes = window.cy.nodes().filter(node => node.data('type') === 'user');
            const pairCount = Math.ceil(userNodes.length / 2);
            
            console.log(`Définition de la capacité de tous les liens à ${pairCount}`);
            
            // Si aucun utilisateur, ne rien faire
            if (pairCount === 0) {
                alert("Aucun utilisateur trouvé dans le graphe");
                return;
            }
            
            // Mettre à jour tous les liens
            const edges = window.cy.edges();
            let updatedCount = 0;
            
            edges.forEach(edge => {
                // Mettre à jour la capacité
                edge.data('capacity', pairCount);
                
                // Recalculer la consommation
                const distance = edge.data('distance') || 1;
                const baseConsumption = edge.data('baseConsumption') || 100;
                const consumption = window.graphEditor.calculateEdgeConsumption(
                    baseConsumption, pairCount, distance
                );
                edge.data('consumption', consumption);
                
                updatedCount++;
            });
            
            // Afficher un message de confirmation
            alert(`Capacité définie à ${pairCount} pour ${updatedCount} liens`);
        },

        // Fonction pour ajouter le bouton de capacité globale
        addGlobalCapacityButton: function() {
            const editorButtonsContainer = document.querySelector(".editor-buttons");
            if (!editorButtonsContainer) return;
            
            // Vérifier si le bouton existe déjà pour éviter les doublons
            const existingButton = document.querySelector(".capacity-all-button");
            if (existingButton) return;
            
            // Créer le bouton seulement pour les modes RV et SC
            const mode = window.graphEditor.activeMode;
            if (mode === "RV" || mode === "SC") {
                const capacityButton = document.createElement("button");
                capacityButton.className = "dynamic-button capacity-all-button";
                capacityButton.textContent = "Définir capacité de tous les liens";
                capacityButton.addEventListener("click", () => {
                    window.graphEditor.setAllEdgesCapacity();
                });
                
                editorButtonsContainer.appendChild(capacityButton);
                console.log("Bouton de capacité globale ajouté");
            }
        }
    };

    // Store button configurations for each mode
    const modeButtons = {
        "RV": [
            { text: "Ajouter Routeur", action: "ajouter-routeur" },
            { text: "Ajouter Utilisateur", action: "ajouter-utilisateur" },
            { text: "Ajouter Antenne", action: "ajouter-antenne" }
        ],
        "SC":[
            { text: "Ajouter Utilisateur", action: "ajouter-utilisateur" },
            { text: "Ajouter Antenne", action: "ajouter-antenne" }
        ],
        "Cloud": [

        ]
    };
    
    window.graphEditor.addCourseEditorButton = function() {
        const editorButtonsContainer = document.querySelector(".editor-buttons");
        if (!editorButtonsContainer || document.getElementById("courseEditorBtn")) {
          return; // Container not found or button already exists
        }
        
        const courseEditorBtn = document.createElement("button");
        courseEditorBtn.id = "courseEditorBtn";
        courseEditorBtn.className = "dynamic-button";
        courseEditorBtn.innerHTML = '<i class="fas fa-book"></i> Course Editor';
        courseEditorBtn.style.backgroundColor = "#9C27B0"; // Purple to distinguish it
        
        // Add a direct click handler that uses our course-content.js module
        courseEditorBtn.addEventListener("click", function() {
          console.log("Course editor button clicked");
          
          // If course-content.js hasn't been loaded yet, load it dynamically
          if (!window.courseEditor) {
            console.log("Loading course editor script dynamically");
            
            // Create script element
            const script = document.createElement('script');
            script.src = 'course-content.js';
            script.type = 'module';
            
            // Set onload handler to open editor after loading
            script.onload = function() {
              console.log("Course editor script loaded");
              if (window.courseEditor) {
                if (!window.courseEditor.isInitialized) {
                  window.courseEditor.init();
                }
                window.courseEditor.toggleCourseEditor();
              } else {
                alert("Course editor failed to initialize. Please check console.");
              }
            };
            
            script.onerror = function() {
              console.error("Failed to load course editor script");
              alert("Could not load course editor. Please refresh and try again.");
            };
            
            // Add script to head
            document.head.appendChild(script);
          } else {
            // If already loaded, just toggle it
            if (!window.courseEditor.isInitialized) {
              window.courseEditor.init();
            }
            window.courseEditor.toggleCourseEditor();
          }
        });
        
        editorButtonsContainer.appendChild(courseEditorBtn);
        console.log("Course editor button added with improved handler");
    };

    // Function to display mode-specific buttons
    function showModeButtons(mode) {
        // Remove any existing dynamic buttons
        const existingButtons = document.querySelectorAll(".dynamic-button");
        existingButtons.forEach(button => button.remove());
        
        // Remove any existing antenna toggle containers
        const existingToggles = document.querySelectorAll(".antenna-toggle-container");
        existingToggles.forEach(toggle => toggle.remove());
        
        // Store active mode
        window.graphEditor.activeMode = mode;
        
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
        if (mode === "RV" || mode === "SC") {
            window.graphEditor.createAntennaConsumptionToggle();
        }

        // Ajouter le bouton de capacité globale
        window.graphEditor.addGlobalCapacityButton();

        window.graphEditor.addCourseEditorButton();
    }

    // Add event listener for "Create New Level" button
    createNewLevelBtn.addEventListener("click", () => {
        const selectedMode = modeSelector.value;
        console.log(`Creating new level for mode: ${selectedMode}`);
        
        // Reset counters
        window.graphEditor.resetCounters();
        
        // Show the buttons specific to the selected mode
        showModeButtons(selectedMode);
        
        // Show the Cytoscape container
        cyContainer.style.display = "block";
        
        // Initialize Cytoscape if initCytoscape is available
        if (window.cytoscapeEditor && window.cytoscapeEditor.initCytoscape) {
            window.cytoscapeEditor.initCytoscape();
        }
        
        // Make sure createNewLevelBtn stays visible
        createNewLevelBtn.style.display = "block";
    });

    // Update available buttons when mode selection changes
    modeSelector.addEventListener("change", () => {
        console.log(`Mode changed to: ${modeSelector.value}`);
        
        // Clear the current graph if Cytoscape is initialized
        if (window.cy) {
            window.cy.elements().remove();
            
            // Reset counters
            window.graphEditor.resetCounters();
        }
        
        // Show the buttons specific to the selected mode
        showModeButtons(modeSelector.value);
    });
    
    // Attach event listener for dynamic buttons
    editorButtonsContainer.addEventListener('click', (event) => {
        const button = event.target.closest('.dynamic-button');
        if (button) {
            const action = button.getAttribute('data-action');
            
            // Update active action
            window.graphEditor.activeAction = 
                (window.graphEditor.activeAction === action) ? null : action;
                
            // Remove active class from all buttons
            document.querySelectorAll('.dynamic-button').forEach(btn => {
                btn.classList.remove('active');
            });
            
            // Add active class to the clicked button if active
            if (window.graphEditor.activeAction) {
                button.classList.add('active');
            }
            
            console.log("Active action:", window.graphEditor.activeAction);
            
            // Notify cytoscape-editor if available
            if (window.cytoscapeEditor && window.cytoscapeEditor.handleModeChange) {
                window.cytoscapeEditor.handleModeChange();
            }
        }
    });
});