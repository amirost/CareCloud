// SC-graph-loader.js - Handles fetching and loading graph data for Set Cover
import { setHaloVisibility } from './SC-styles.js';
import { initCytoscape } from './SC-cytoscape-init.js'; // <-- AJOUT DE L'IMPORT

export function initGraphLoader(gameState, uiManager) {
    return {
        // Fetch and display SC graphs
        async fetchSCGraphs() {
            try {
                console.log("fetchSCGraphs called");
                uiManager.showGraphListLoading();
                
                // Try to use graphSaverLoader.js if available
                if (window.graphPersistence && window.graphPersistence.fetchGraphs) {
                    console.log("Using graphSaverLoader.fetchGraphs");
                    const result = await window.graphPersistence.fetchGraphs("SC");
                    
                    if (result.success && result.data.length > 0) {
                        // Filter to ensure only SC graphs are displayed
                        const scGraphs = result.data.filter(graph => graph.mode === "SC");
                        
                        console.log(`Found ${scGraphs.length} SC graphs`);
                        uiManager.displayGraphList(scGraphs, this);
                    } else {
                        console.log("No SC graphs found");
                        document.getElementById("graphList").innerHTML = 
                            "<p>No Set Cover levels found. Create some in the Editor first!</p>";
                    }
                    uiManager.hideGraphListLoading();
                    return;
                }
                
                // Fallback to direct API call
                console.log("Using direct API call");
                const response = await fetch(`${gameState.API_URL}?mode=SC`);
                
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                
                const result = await response.json();
                
                if (result.success && result.data.length > 0) {
                    // Double-check that all graphs are SC mode
                    const scGraphs = result.data.filter(graph => graph.mode === "SC");
                    
                    console.log(`Found ${scGraphs.length} SC graphs`);
                    uiManager.displayGraphList(scGraphs, this);
                } else {
                    console.log("No SC graphs found");
                    document.getElementById("graphList").innerHTML = 
                        "<p>No Set Cover levels found. Create some in the Editor first!</p>";
                }
                uiManager.hideGraphListLoading();
            } catch (error) {
                console.error("Error fetching graphs:", error);
                document.getElementById("graphList").innerHTML = 
                    "<p>Error loading levels. Please try again.</p>";
                uiManager.hideGraphListLoading();
            }
        },
        
        // Start gameplay with the selected graph
        async startGameplay(graphId) { // <-- PASSAGE EN ASYNC
            console.log(`Starting gameplay with graph ID: ${graphId}`);
            
            gameState.reset();
           
            // Switch to gameplay view
            uiManager.showGameplay();
            
            // Reset game state
            gameState.reset();
            
            // **LA CORRECTION EST ICI**
            // Re-initialize Cytoscape as it was destroyed
            await initCytoscape(gameState, { attachToWindow: true });

            if (!gameState.cy) {
                console.error("Failed to re-initialize Cytoscape. Aborting.");
                alert("Erreur critique: Impossible de démarrer le moteur du jeu.");
                return;
            }
             uiManager.updateStats();
             uiManager.clearUserPanel();
            // Load the graph into the new instance
            this.loadGraph(graphId);
        },
        
        // Load graph using graphSaverLoader if available, or directly from API
        async loadGraph(graphId) {
            try {
                console.log("Loading graph:", graphId);
                
                // Try to use graphSaverLoader.js if available
                if (window.graphPersistence && window.graphPersistence.loadGraph) {
                    console.log("Using graphSaverLoader.loadGraph");
                    
                    // Make sure graphEditor exists before loading
                    if (!window.graphEditor) {
                        console.log("Creating graphEditor for compatibility");
                        window.graphEditor = {
                            activeMode: "SC",
                            antennaSettings: {
                                consumptionEnabled: false,
                                consumptionRadiusEnabled: false,
                                consumptionBase: 0,
                                defaultRadius: 50
                            },
                            counters: {
                                router: 1,
                                antenna: 1,
                                user: 1,
                                edge: 1
                            },
                            edgeDefaults: {
                                capacity: 1,
                                distance: 1,
                                thickness: 2
                            },
                            calculateAntennaConsumption: function(radius) {
                                return 0;
                            },
                            calculateEdgeConsumption: function(baseConsumption, capacity, distance) {
                                return baseConsumption * capacity * distance;
                            },
                            hidePropertiesPanel: function() {},
                            resetCounters: function() {
                                this.counters.router = 1;
                                this.counters.antenna = 1;
                                this.counters.user = 1;
                                this.counters.edge = 1;
                            },
                            selectedElement: null,
                            createPropertiesPanel: function() {
                                return { style: {} };
                            },
                            createAntennaConsumptionToggle: function() {}
                        };
                    }
                    
                    const result = await window.graphPersistence.loadGraph(graphId);
                    
                    if (result.success) {
                        console.log("Graph loaded successfully via graphSaverLoader");
                        const graph = result.data;
                        
                        // Verify it's an SC mode graph
                        if (graph.mode !== "SC") {
                            alert("Ce graphe n'est pas en mode SC. Veuillez sélectionner un graphe en mode SC.");
                            return;
                        }
                        
                        this.renderGraph(graph);
                    } else {
                        alert(`Échec du chargement du graphe: ${result.message}`);
                    }
                    return;
                }
                
                // Fallback to direct API call
                console.log("Using direct API call for graph loading");
                await this.loadGraphDirectly(graphId);
            } catch (error) {
                console.error("Error in loadGraph:", error);
                alert("Échec du chargement du graphe: " + (error.message || "Unknown error"));
            }
        },
        
        // Load graph directly from API
        async loadGraphDirectly(graphId) {
            try {
                console.log(`Direct API call to load graph: ${graphId}`);
                const response = await fetch(`${gameState.API_URL}/${graphId}`);
                
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                
                const result = await response.json();
                
                if (!result.success) {
                    alert(`Échec du chargement du graphe: ${result.message}`);
                    return;
                }
                
                const graph = result.data;
                
                // Verify it's an SC mode graph
                if (graph.mode !== "SC") {
                    alert("Ce graphe n'est pas en mode SC. Veuillez sélectionner un graphe en mode SC.");
                    return;
                }
                
                console.log("Graph loaded successfully via direct API");
                this.renderGraph(graph);
            } catch (error) {
                console.error("Error loading graph directly:", error);
                alert("Erreur lors du chargement du graphe. Veuillez réessayer");
            }
        },
        
        // Render the graph in Cytoscape
        renderGraph(graph) {
            console.log("Rendering graph with", graph.nodes.length, "nodes and", graph.edges.length, "edges");
  
            // IMPORTANT: Clear existing elements before rendering new graph
            gameState.cy.elements().remove();
            console.log("Cleared existing elements");
            
            // Add nodes first
            graph.nodes.forEach(node => {
              // Add the node
              gameState.cy.add({
                group: 'nodes',
                data: {
                  id: node.id,
                  type: node.type,
                  radius: node.radius || 50,
                  haloId: node.haloId || null,
                  consumption: node.consumption || 0,
                  active: true // All antennas start as active
                },
                position: {
                  x: node.x,
                  y: node.y
                },
                grabbable: false 
              });
              
              // If this is an antenna, also add its halo
              if (node.type === 'antenna' && node.haloId) {
                const isActive = node.active !== false;
          
                gameState.cy.add({
                  group: 'nodes',
                  data: {
                    id: node.haloId,
                    type: 'antenna-halo',
                    radius: node.radius || 50,
                    active: true // Halo is active when antenna is active
                  },
                  position: {
                    x: node.x,
                    y: node.y
                  },
                  style: {
                    'width': (node.radius || 50) * 2,
                    'height': (node.radius || 50) * 2
                  }
                });
                
                // Puis récupérer le nœud halo ajouté pour définir sa visibilité
                const haloNode = gameState.cy.getElementById(node.haloId);
                if (haloNode && haloNode.length > 0) {
                  setHaloVisibility(haloNode, isActive);
                }
                
                // Add antenna to active antennas if it's active
                if (isActive) {
                  gameState.activeAntennas.add(node.id);
                }
              }
            });
            
            // Then add edges
            graph.edges.forEach(edge => {
              gameState.cy.add({
                group: 'edges',
                data: {
                  id: edge.id,
                  source: edge.source,
                  target: edge.target,
                  thickness: edge.thickness || 2
                }
              });
            });
            
            // Store minimum consumption if available
            gameState.minimumConsumption = graph.minimumConsumption || null;
            gameState.optimalAntennaSet = graph.optimalAntennaSet || []; 
            gameState.courseContent = graph.courseContent || null;
            gameState.loadedGraphId = graph._id;
            
            console.log("Graph loaded with minimum consumption:", gameState.minimumConsumption);
            
            // Fit the graph in the viewport with padding
            gameState.cy.fit();
            
            // Force an initial fit with padding for better visibility
            setTimeout(() => {
              if (gameState.cy) {
                // Enable zoom and pan temporarily for the fit operation
                gameState.cy.zoomingEnabled(true);
                gameState.cy.panningEnabled(true);
                
                // Perform the fit
                gameState.cy.resize();
                gameState.cy.fit();
                
                // Disable zoom and pan if needed for gameplay
                gameState.cy.zoomingEnabled(false);
                gameState.cy.panningEnabled(false);
                
                console.log("Initial view reset applied");
              }
            }, 100); // Small delay to ensure layout is applied
            
            // Color user nodes
            this.colorUsers();
            
            // Update stats
            uiManager.updateStats();
            
            // **LA CORRECTION EST ICI**
            // Re-attach event handlers to the new Cytoscape instance
            if (gameState.eventHandlers && gameState.gamePhases) {
                console.log("Re-attaching event handlers to the new Cytoscape instance for SC mode.");
                gameState.eventHandlers.setupEventHandlers(gameState.gamePhases);
            } else {
                console.error("Cannot re-attach event handlers: eventHandlers or gamePhases missing from gameState.");
            }

            // Start the game with Phase 1
            try {
                if (gameState.gamePhases && typeof gameState.gamePhases.startPhase1 === 'function') {
                    console.log("Using existing game phases to start Phase 1");
                    gameState.gamePhases.startPhase1();
                } else {
                    console.error("Critical error: gamePhases not found on gameState, cannot start the game.");
                    alert("Erreur critique: Impossible de démarrer la logique du jeu.");
                }
            } catch (error) {
                console.error("Error starting game phases:", error);
                alert("Erreur lors du démarrage du jeu. Veuillez rafraîchir la page.");
            }
        },
        
        // Color user nodes with individual colors
        colorUsers() {
            // Get all user nodes
            const userNodes = gameState.cy.nodes('[type="user"]');
            
            // Assign a unique color to each user
            userNodes.forEach((userNode, index) => {
                const colorIndex = index % gameState.userColors.length;
                const color = gameState.userColors[colorIndex];
                
                userNode.style('background-color', color);
                userNode.style('border-color', '#444');
                userNode.style('border-width', 1);
            });
            
            // Update total users count
            uiManager.setTotalUsers(userNodes.length);
            
        },
        
        // Precalculate which users each antenna can cover
        precalculateAntennaCoverage() {
            // Clear existing coverage data
            gameState.antennaUsers.clear();
            
            // For each antenna, determine which users it can cover
            gameState.cy.nodes('[type="antenna"]').forEach(antenna => {
                const antennaId = antenna.id();
                
                // Create a new set for this antenna
                if (!gameState.antennaUsers.has(antennaId)) {
                    gameState.antennaUsers.set(antennaId, new Set());
                }
                
                // Check which users are in range
                gameState.cy.nodes('[type="user"]').forEach(user => {
                    if (gameState.gamePhases && gameState.gamePhases.eventHandlers && 
                        gameState.gamePhases.eventHandlers.canAntennaReachUser) {
                        if (gameState.gamePhases.eventHandlers.canAntennaReachUser(antenna, user)) {
                            gameState.antennaUsers.get(antennaId).add(user.id());
                        }
                    } else {
                        // Fallback distance calculation
                        const userPos = user.position();
                        const antennaPos = antenna.position();
                        const radius = antenna.data('radius') || 50;
                        const distance = Math.sqrt(
                            Math.pow(userPos.x - antennaPos.x, 2) + 
                            Math.pow(userPos.y - antennaPos.y, 2)
                        );
                        
                        if (distance <= radius) {
                            gameState.antennaUsers.get(antennaId).add(user.id());
                        }
                    }
                });
                
                console.log(`Antenna ${antennaId} can cover ${gameState.antennaUsers.get(antennaId).size} users`);
            });
        }
    };
}