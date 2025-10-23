// Cloud-graph-loader.js - Handles fetching and loading graph data
import { initCytoscape } from './Cloud-cytoscape-init.js';

export function initGraphLoader(gameState, uiManager) {
    return {
        // Fetch and display Cloud graphs
        async fetchCloudGraphs() {
            try {
                console.log("fetchCloudGraphs called");
                uiManager.showGraphListLoading();
                
                if (window.graphPersistence && window.graphPersistence.fetchGraphs) {
                    console.log("Using graphSaverLoader.fetchGraphs for CLOUD mode");
                    
                    const result = await window.graphPersistence.fetchGraphs("Cloud");
                    
                    if (result.success && result.data.length > 0) {
                        const cloudGraphs = result.data.filter(graph => graph.mode === "Cloud");
                        console.log(`Found ${cloudGraphs.length} Cloud graphs`);
                        uiManager.displayGraphList(cloudGraphs, this);
                    } else {
                        console.log("No Cloud graphs found");
                        document.getElementById("graphList").innerHTML = 
                            "<p>Aucun niveau de type Cloud trouvé. Créez-en dans l'éditeur !</p>";
                    }
                } else {
                    // Fallback to direct API call
                    console.log("Using direct API call");
                    const response = await fetch(`${gameState.API_URL}?mode=Cloud`);
                    
                    if (!response.ok) {
                        throw new Error(`HTTP error! Status: ${response.status}`);
                    }
                    
                    const result = await response.json();
                    
                    if (result.success && result.data.length > 0) {
                        const cloudGraphs = result.data.filter(graph => graph.mode === "Cloud");
                        console.log(`Found ${cloudGraphs.length} Cloud graphs`);
                        uiManager.displayGraphList(cloudGraphs, this);
                    } else {
                        console.log("No Cloud graphs found");
                        document.getElementById("graphList").innerHTML = 
                            "<p>No Green Networks levels found. Create some in the Editor first!</p>";
                    }
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

            uiManager.showGameplay();
            
            gameState.reset();
            
            await initCytoscape(gameState, { attachToWindow: true });

            if (!gameState.cy) {
                console.error("Failed to re-initialize Cytoscape. Aborting.");
                alert("Erreur critique: Impossible de démarrer le moteur du jeu.");
                return;
            }
            
            this.loadGraph(graphId);
        },
        
        // Load graph using graphSaverLoader if available, or directly from API
        async loadGraph(graphId) {
            try {
                console.log("Loading graph:", graphId);
                
                if (window.graphPersistence && window.graphPersistence.loadGraph) {
                    console.log("Using graphSaverLoader.loadGraph");
                    
                    if (!window.graphEditor) {
                        console.log("Creating graphEditor for compatibility");
                        window.graphEditor = {
                            activeMode: "Cloud",
                            antennaSettings: {
                                consumptionEnabled: false,
                                consumptionRadiusEnabled: false,
                                consumptionBase: 0,
                                defaultRadius: 50
                            },
                            counters: { router: 1, antenna: 1, user: 1, edge: 1 },
                            edgeDefaults: { capacity: 1, distance: 1, thickness: 2 },
                            calculateAntennaConsumption: function(radius) { return 0; },
                            calculateEdgeConsumption: function(baseConsumption, capacity, distance) { return baseConsumption * capacity * distance; },
                            hidePropertiesPanel: function() {},
                            resetCounters: function() {
                                this.counters.router = 1; this.counters.antenna = 1; this.counters.user = 1; this.counters.edge = 1;
                            },
                            selectedElement: null,
                            createPropertiesPanel: function() { return { style: {} }; },
                            createAntennaConsumptionToggle: function() {}
                        };
                    }
                    
                    const result = await window.graphPersistence.loadGraph(graphId);
                    
                    if (result.success) {
                        console.log("Graph loaded successfully via graphSaverLoader");
                        const graph = result.data;
                        
                        if (graph.mode !== "Cloud") {
                            alert("Ce graphe n'est pas en mode Cloud. Veuillez sélectionner un graphe en mode Cloud.");
                            return;
                        }
                        this.renderGraph(graph);
                    } else {
                        alert(`Échec du chargement du graphe: ${result.message}`);
                    }
                    return;
                }
                
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
                
                if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
                
                const result = await response.json();
                
                if (!result.success) {
                    alert(`Échec du chargement du graphe: ${result.message}`);
                    return;
                }
                
                const graph = result.data;
                
                if (graph.mode !== "Cloud") {
                    alert("Ce graphe n'est pas en mode Cloud. Veuillez sélectionner un graphe en mode Cloud.");
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
            gameState.cy.elements().remove();
            gameState.userPairs = [];
            gameState.clients = [];

            graph.nodes.forEach(node => {
                // *** LA CORRECTION EST ICI ***
                // On s'assure que la consommation est bien lue pour chaque serveur
                const serversData = (node.servers || []).map(server => ({
                    id: server.id,
                    name: server.name,
                    capacity: server.capacity,
                    consumption: server.consumption || 0, // S'assurer qu'il y a une valeur par défaut
                    tasks: server.tasks || [],
                    isOn: server.isOn !== false 
                }));

                const nodeData = {
                    id: node.id, type: node.type, userType: node.userType, parentId: node.parentId,
                    radius: node.radius, haloId: node.haloId, consumption: node.consumption,
                    active: true, 
                    servers: serversData, // On utilise les données nettoyées
                    tasks: node.tasks || []
                };

                gameState.cy.add({ group: 'nodes', data: nodeData, position: { x: node.x, y: node.y }, grabbable: false });
                
                if (node.type === 'antenna' && node.haloId) {
                    gameState.cy.add({
                        group: 'nodes', data: { id: node.haloId, type: 'antenna-halo', radius: node.radius || 50 },
                        position: { x: node.x, y: node.y }, style: { 'width': (node.radius || 50) * 2, 'height': (node.radius || 50) * 2 }
                    });
                }
                
                if (node.type === 'cloud') {
                    gameState.cloudNode = gameState.cy.getElementById(node.id);
                }
            });

            graph.edges.forEach(edge => {
              gameState.cy.add({
                group: 'edges',
                data: {
                  id: edge.id, source: edge.source, target: edge.target, capacity: edge.capacity || 1,
                  distance: edge.distance || 1, consumption: edge.consumption || 100,
                  thickness: edge.thickness || 2, used: true
                }
              });
            });

            if (graph.antennaSettings) gameState.antennaSettings = graph.antennaSettings;
            gameState.minimumConsumption = graph.minimumConsumption || null;
            gameState.optimalPathSolution = graph.optimalPathSolution || []; 
            gameState.optimalAntennaSet = graph.optimalAntennaSet || [];
            gameState.courseContent = graph.courseContent || null;
            gameState.loadedGraphId = graph._id;

            gameState.cy.nodes('[type="antenna"]').forEach(a => gameState.activeAntennas.add(a.id()));
            
            this.processUsers(); 

            let calculatedInitialConsumption = 0;
            gameState.cy.edges(':not([virtual])').forEach(edge => {
                calculatedInitialConsumption += edge.data('consumption') || 0;
            });
            if (gameState.antennaSettings.consumptionEnabled) {
                gameState.cy.nodes('[type="antenna"]').forEach(antenna => {
                    calculatedInitialConsumption += antenna.data('consumption') || 0;
                });
            }
            // On ajoute aussi la conso max des serveurs
            gameState.cy.nodes().forEach(node => {
                (node.data('servers') || []).forEach(server => {
                    calculatedInitialConsumption += server.consumption || 0;
                });
            });
            gameState.initialConsumption = calculatedInitialConsumption;

            gameState.cy.fit();
            setTimeout(() => {
              if (gameState.cy) {
                gameState.cy.resize();
                gameState.cy.fit();
              }
            }, 100);
            
            if (graph.edges && graph.edges.some(edge => (edge.capacity || 1) !== 1)) {
                gameState.showCapacityLabels = true;
            }
            
            uiManager.updateStats();
            uiManager.updateCapacityButtonUI();

            if (gameState.eventHandlers && gameState.gamePhases) {
                gameState.eventHandlers.setupEventHandlers(gameState.gamePhases);
            }
            
            if (gameState.gamePhases && gameState.gamePhases.startPhase1) {
                gameState.gamePhases.startPhase1();
            }
        },

        processUsers() {
            gameState.userPairs = [];
            gameState.clients = [];

            const userNodes = gameState.cy.nodes('node[type="user"]');
            const pairingUsers = [];

            userNodes.forEach(user => {
                if (user.data('userType') === 'cloud') {
                    gameState.clients.push({
                        id: user.id(), node: user, tasks: user.data('tasks') || []
                    });
                } else {
                    pairingUsers.push(user);
                }
            });

            const sortedPairingUsers = pairingUsers.sort((a, b) => {
                const numA = parseInt(a.id().match(/\d+/)[0] || 0);
                const numB = parseInt(b.id().match(/\d+/)[0] || 0);
                return numA - numB;
            });
            
            for (let i = 0; i < sortedPairingUsers.length; i += 2) {
                const colorIndex = Math.floor(i / 2) % gameState.userColors.length;
                const color = gameState.userColors[colorIndex];
                
                sortedPairingUsers[i].style('background-color', color);
                
                if (i + 1 < sortedPairingUsers.length) {
                    sortedPairingUsers[i + 1].style('background-color', color);
                    gameState.userPairs.push({
                        color: color,
                        users: [sortedPairingUsers[i].id(), sortedPairingUsers[i + 1].id()],
                        connected: false
                    });
                }
            }

            let colorIndexOffset = Math.ceil(sortedPairingUsers.length / 2);
            
            gameState.clients.forEach((client, index) => {
                const colorIndex = (colorIndexOffset + index) % gameState.userColors.length;
                const color = gameState.userColors[colorIndex];
                
                client.node.style('background-color', color);
                client.node.data('pairColor', color);
            });
            
            uiManager.setTotalUsers(pairingUsers.length);
        }
    };
}