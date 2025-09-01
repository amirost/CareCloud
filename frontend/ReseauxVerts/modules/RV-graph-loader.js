// RV-graph-loader.js - Handles fetching and loading graph data
import { initCytoscape } from './RV-cytoscape-init.js';

export function initGraphLoader(gameState, uiManager) {
    return {
        // Fetch and display RV graphs
        async fetchRVGraphs() {
            try {
                console.log("fetchRVGraphs called");
                uiManager.showGraphListLoading();
                
                // Try to use graphSaverLoader.js if available
                if (window.graphPersistence && window.graphPersistence.fetchGraphs) {
                    console.log("Using graphSaverLoader.fetchGraphs");
                    const result = await window.graphPersistence.fetchGraphs("RV");
                    
                    if (result.success && result.data.length > 0) {
                        // Filter to ensure only RV graphs are displayed
                        const rvGraphs = result.data.filter(graph => graph.mode === "RV");
                        
                        console.log(`Found ${rvGraphs.length} RV graphs`);
                        uiManager.displayGraphList(rvGraphs, this);
                    } else {
                        console.log("No RV graphs found");
                        document.getElementById("graphList").innerHTML = 
                            "<p>No Green Networks levels found. Create some in the Editor first!</p>";
                    }
                    uiManager.hideGraphListLoading();
                    return;
                }
                
                // Fallback to direct API call
                console.log("Using direct API call");
                const response = await fetch(`${gameState.API_URL}?mode=RV`);
                
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                
                const result = await response.json();
                
                if (result.success && result.data.length > 0) {
                    // Double-check that all graphs are RV mode
                    const rvGraphs = result.data.filter(graph => graph.mode === "RV");
                    
                    console.log(`Found ${rvGraphs.length} RV graphs`);
                    uiManager.displayGraphList(rvGraphs, this);
                } else {
                    console.log("No RV graphs found");
                    document.getElementById("graphList").innerHTML = 
                        "<p>No Green Networks levels found. Create some in the Editor first!</p>";
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
        async startGameplay(graphId) {
            console.log(`Starting gameplay with graph ID: ${graphId}`);
            gameState.reset();
            uiManager.updateStats();

            // Switch to gameplay view
            uiManager.showGameplay();
            
            // Reset game state
            gameState.reset();
            
            // Re-initialize Cytoscape because it was destroyed
            await initCytoscape(gameState, { attachToWindow: true });

            if (!gameState.cy) {
                console.error("Failed to re-initialize Cytoscape. Aborting.");
                alert("Erreur critique: Impossible de démarrer le moteur du jeu.");
                return;
            }
            
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
                            activeMode: "RV",
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
                        
                        // Verify it's an RV mode graph
                        if (graph.mode !== "RV") {
                            alert("Ce graphe n'est pas en mode RV. Veuillez sélectionner un graphe en mode RV.");
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
                
                // Verify it's an RV mode graph
                if (graph.mode !== "RV") {
                    alert("Ce graphe n'est pas en mode RV. Veuillez sélectionner un graphe en mode RV.");
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
            
            // Reset userPairs array to avoid duplicates
            gameState.userPairs = [];
            
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
                  consumption: node.consumption || 0
                },
                position: {
                  x: node.x,
                  y: node.y
                },
                grabbable: false 
              });
              
              // If this is an antenna, also add its halo
              if (node.type === 'antenna' && node.haloId) {
                gameState.cy.add({
                  group: 'nodes',
                  data: {
                    id: node.haloId,
                    type: 'antenna-halo',
                    radius: node.radius || 50
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
                  capacity: edge.capacity || 1,
                  distance: edge.distance || 1,
                  consumption: edge.consumption || 100,
                  thickness: edge.thickness || 2,
                  used: true
                }
              });
            });
            
            // Store minimum consumption if available
            gameState.minimumConsumption = graph.minimumConsumption || null;
            gameState.optimalPathSolution = graph.optimalPathSolution || []; 
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
                
                gameState.cy.zoomingEnabled(false);
                gameState.cy.panningEnabled(false);
                
                console.log("Initial view reset applied");
              }
            }, 100); // Small delay to ensure layout is applied
            
            // Color user nodes and organize them into pairs
            this.colorUsers();
            
            // Update stats
            uiManager.updateStats();

            // >>>>>>>>>>>>>>>>>>>>>>>>>>> LA CORRECTION EST ICI <<<<<<<<<<<<<<<<<<<<<<<<<<<
            // RE-ATTACH EVENT HANDLERS to the new Cytoscape instance. This is critical.
            if (gameState.eventHandlers && gameState.gamePhases) {
                console.log("Re-attaching event handlers to the new Cytoscape instance.");
                gameState.eventHandlers.setupEventHandlers(gameState.gamePhases);
            } else {
                console.error("Cannot re-attach event handlers: eventHandlers or gamePhases missing from gameState.");
            }
            // >>>>>>>>>>>>>>>>>>>>>>>>>>> FIN DE LA CORRECTION <<<<<<<<<<<<<<<<<<<<<<<<<<<
            
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
        
        // Color user nodes and organize them into pairs
        colorUsers() {
            // Get all user nodes
            const userNodes = gameState.cy.nodes('[type="user"]');
            
            // Sort nodes by ID
            const sortedUsers = userNodes.sort((a, b) => {
                const numA = parseInt(a.id().match(/\d+/)[0]);
                const numB = parseInt(b.id().match(/\d+/)[0]);
                return numA - numB;
            });
            
            // Group users into pairs and assign colors
            for (let i = 0; i < sortedUsers.length; i += 2) {
                const colorIndex = Math.floor(i / 2) % gameState.userColors.length;
                const color = gameState.userColors[colorIndex];
                
                // Color the first user
                sortedUsers[i].style('background-color', color);
                sortedUsers[i].style('border-color', '#444');
                sortedUsers[i].style('border-width', 1);
                
                // If there's a second user in the pair
                if (i + 1 < sortedUsers.length) {
                    sortedUsers[i + 1].style('background-color', color);
                    sortedUsers[i + 1].style('border-color', '#444');
                    sortedUsers[i + 1].style('border-width', 1);
                    
                    // Add the pair to userPairs array
                    gameState.userPairs.push({
                        color: color,
                        users: [sortedUsers[i].id(), sortedUsers[i + 1].id()],
                        connected: false
                    });
                } else {
                    // Handle odd number of users - single user gets own pair
                    gameState.userPairs.push({
                        color: color,
                        users: [sortedUsers[i].id()],
                        connected: false
                    });
                }
            }
            
            // Update total users count
            uiManager.setTotalUsers(sortedUsers.length);
        }
    };
}