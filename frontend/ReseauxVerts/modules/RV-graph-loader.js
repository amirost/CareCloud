// RV-graph-loader.js - Handles fetching and loading graph data

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
                        console.log(`Found ${result.data.length} graphs`);
                        uiManager.displayGraphList(result.data, this);
                    } else {
                        console.log("No graphs found");
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
                    console.log(`Found ${result.data.length} graphs`);
                    uiManager.displayGraphList(result.data, this);
                } else {
                    console.log("No graphs found");
                    document.getElementById("graphList").innerHTML = 
                        "<p>Aucun niveau trouvé. Créez-en d'abord dans l'éditeur !</p>";
                }
                uiManager.hideGraphListLoading();
            } catch (error) {
                console.error("Error fetching graphs:", error);
                document.getElementById("graphList").innerHTML = 
                    "<p>Erreur lors du chargement des niveaux. Veuillez réessayer</p>";
                uiManager.hideGraphListLoading();
            }
        },
        
        // Start gameplay with the selected graph
        startGameplay(graphId) {
            console.log(`Starting gameplay with graph ID: ${graphId}`);
            
            // Switch to gameplay view
            uiManager.showGameplay();
            
            // Reset game state
            gameState.reset();
            
            // Set window.cy to make it accessible to graphSaverLoader.js if needed
            window.cy = gameState.cy;
            
            // Load the graph
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
            
            // Start the game with Phase 1 - Use a safer approach
            try {
                // If we already have game phases properly initialized, use that
                if (gameState.gamePhases && typeof gameState.gamePhases.startPhase1 === 'function') {
                    console.log("Using existing game phases");
                    gameState.gamePhases.startPhase1();
                } else {
                    // Fallback: Import game phases module again (should be avoided if possible)
                    console.log("Game phases not found in game state, importing again");
                    import('./RV-game-phases.js').then(({ initGamePhases }) => {
                        // Use temporary event handlers if needed
                        const tempEventHandlers = {
                            highlightAvailableAntennas: () => {
                                const userNode = gameState.cy.getElementById(gameState.selectedUser);
                                if (!userNode) return;
                                
                                const userPos = userNode.position();
                                gameState.cy.nodes('[type="antenna"]').forEach(antenna => {
                                    const antennaPos = antenna.position();
                                    const radius = antenna.data('radius') || 50;
                                    const distance = Math.sqrt(
                                        Math.pow(userPos.x - antennaPos.x, 2) + 
                                        Math.pow(userPos.y - antennaPos.y, 2)
                                    );
                                    if (distance <= radius) {
                                        antenna.addClass('available');
                                    }
                                });
                            },
                            highlightNextHops: () => {
                                // Simplified version
                                if (!gameState.currentPath || !gameState.currentPath.current) return;
                                
                                const currentNode = gameState.cy.getElementById(gameState.currentPath.current);
                                if (!currentNode) return;
                                
                                currentNode.connectedEdges().forEach(edge => {
                                    const otherNode = edge.source().id() === gameState.currentPath.current ? 
                                        edge.target() : edge.source();
                                    
                                    if (otherNode.data('type') === 'router' && 
                                        !gameState.currentPath.route.includes(otherNode.id())) {
                                        otherNode.addClass('available');
                                    }
                                });
                            }
                        };
                        
                        const tempGamePhases = initGamePhases(gameState, uiManager, tempEventHandlers);
                        tempGamePhases.startPhase1();
                    }).catch(err => {
                        console.error("Error initializing game phases:", err);
                    });
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