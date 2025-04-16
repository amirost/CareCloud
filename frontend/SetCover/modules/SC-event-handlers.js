// SC-event-handlers.js - Handles Cytoscape events and interactions for Set Cover mode
import { highlightHaloOnHover, restoreHaloOpacity } from './SC-styles.js';


export function initEventHandlers(gameState, uiManager) {
    const eventHandlers = {
        // Setup Cytoscape event handlers
        setupEventHandlers(gamePhases) {
            if (!gameState.cy) {
                console.error("Cannot set up event handlers: Cytoscape instance not initialized");
                return;
            }
            
            console.log("Setting up Cytoscape event handlers with game phases");
            
            // Remove any existing event handlers to prevent duplicates
            gameState.cy.removeListener('tap');
            gameState.cy.removeListener('mouseover');
            gameState.cy.removeListener('mouseout');
            
            // Node click event
            gameState.cy.on('tap', 'node', function(event) {
                const node = event.target;
                
                // Skip clicks on halo nodes
                if (node.data('type') === 'antenna-halo') return;
                
                console.log(`Node clicked: ${node.id()}, type: ${node.data('type')}, phase: ${gameState.phase}`);
                
                // Handle node click based on current phase
                const handlers = {
                    1: () => {
                        console.log("Handling phase 1 click");
                        if (node.data('type') === 'user') {
                            gamePhases.handleUserSelection(node);
                        }
                    },
                    2: () => {
                        console.log("Handling phase 2 click");
                        if (node.data('type') === 'antenna') {
                            gamePhases.handleAntennaSelection(node);
                        }
                    },
                    3: () => {
                        console.log("Handling phase 3 click");
                        if (node.data('type') === 'antenna') {
                            gamePhases.toggleAntennaState(node);
                        }
                    }
                };
                
                // Execute the appropriate handler for the current phase
                if (handlers[gameState.phase]) {
                    handlers[gameState.phase]();
                } else {
                    console.log(`No handler for phase ${gameState.phase}`);
                }
            });
            // Mouse over event for antennas - highlight halo
            gameState.cy.on('mouseover', 'node[type="antenna"]', function(event) {
                const antennaNode = event.target;
                highlightHaloOnHover(antennaNode);
            });
            
            // Mouse out event for antennas - restore halo opacity
            gameState.cy.on('mouseout', 'node[type="antenna"]', function(event) {
                const antennaNode = event.target;
                restoreHaloOpacity(antennaNode);
            });

            // Edge click event - reset user connection if clicking on virtual edge
            gameState.cy.on('tap', 'edge[virtual]', function(event) {
                const edge = event.target;
                console.log(`Virtual edge clicked: ${edge.id()}`);
                
                // Obtenir l'ID de l'utilisateur depuis l'arête (l'arête va de l'utilisateur vers l'antenne)
                const userId = edge.source().id();
                
                // Vérifier que c'est bien un utilisateur
                if (edge.source().data('type') === 'user') {
                    console.log(`Resetting connection for user ${userId}`);
                    
                        // En phases 1 ou 2, réinitialiser directement
                        if (gamePhases.resetUserConnection) {
                            gamePhases.resetUserConnection(userId);
                        }
                    
                }
            });
            console.log("Event handlers successfully set up");
        },
        
        // Helper function to check if an antenna can reach a user
        canAntennaReachUser(antennaNode, userNode) {
            if (!antennaNode || !userNode) {
                return false;
            }
            
            const userPos = userNode.position();
            const antennaPos = antennaNode.position();
            const radius = antennaNode.data('radius') || 50;
            
            const distance = Math.sqrt(
                Math.pow(userPos.x - antennaPos.x, 2) + 
                Math.pow(userPos.y - antennaPos.y, 2)
            );
            
            return distance <= radius;
        },
        
        // Highlight antennas that can reach the selected user
        highlightAvailableAntennas() {
            if (!gameState.selectedUser) {
                console.error("Cannot highlight antennas: No user selected");
                return;
            }
            
            const userNode = gameState.cy.getElementById(gameState.selectedUser);
            if (!userNode) {
                console.error(`User node with ID ${gameState.selectedUser} not found`);
                return;
            }
            
            // Find antennas that cover this user
            gameState.cy.nodes('[type="antenna"]').forEach(antenna => {
                if (this.canAntennaReachUser(antenna, userNode)) {
                    antenna.addClass('available');
                    console.log(`Highlighted antenna ${antenna.id()} as available`);
                }
            });
        },
        
        // Get all users covered by an antenna
        getUsersCoveredByAntenna(antennaNode) {
            if (!antennaNode || antennaNode.data('type') !== 'antenna') {
                return [];
            }
            
            const coveredUsers = [];
            gameState.cy.nodes('[type="user"]').forEach(userNode => {
                if (this.canAntennaReachUser(antennaNode, userNode)) {
                    coveredUsers.push(userNode.id());
                }
            });
            
            return coveredUsers;
        },
        
        // Create a virtual edge for user-antenna connection
        createVirtualConnection(userId, antennaId, color) {
            const edgeId = `virtual-edge-${userId}-${antennaId}`;
            
            // Check if the edge already exists
            const existingEdge = gameState.cy.getElementById(edgeId);
            if (existingEdge.length > 0) {
                return existingEdge;
            }
            
            // Create a new virtual edge
            const edge = gameState.cy.add({
                group: 'edges',
                data: {
                    id: edgeId,
                    source: userId,
                    target: antennaId,
                    virtual: true
                },
                style: {
                    'line-color': color
                }
            });
            
            return edge;
        }
    };
    
    // Self-reference for methods that need to call other methods in this object
    return eventHandlers;
}