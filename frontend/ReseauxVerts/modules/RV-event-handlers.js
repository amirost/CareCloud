// RV-event-handlers.js - Handles Cytoscape events and interactions

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
                        gamePhases.handleUserSelection(node);
                    },
                    2: () => {
                        console.log("Handling phase 2 click");
                        gamePhases.handleAntennaSelection(node);
                    },
                    3: () => {
                        console.log("Handling phase 3 click");
                        gamePhases.handlePathSelection(node);
                    }
                };
                
                // Execute the appropriate handler for the current phase
                if (handlers[gameState.phase]) {
                    handlers[gameState.phase]();
                } else {
                    console.log(`No handler for phase ${gameState.phase}`);
                }
            });
            
            // Edge click event in phase 5 (optimization)
            gameState.cy.on('tap', 'edge', function(event) {
                const edge = event.target;
                console.log(`Edge clicked: ${edge.id()}, phase: ${gameState.phase}`);
                
                if (gameState.phase === 5) {
                    gamePhases.toggleEdge(edge);
                }
            });
            
            console.log("Event handlers successfully set up");
        },
        
        // Helper function to check if an antenna can reach a user
        canAntennaReachUser(antennaNode, userId) {
            const userNode = gameState.cy.getElementById(userId);
            if (!userNode) {
                console.error(`User node with ID ${userId} not found`);
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
            
            const userPos = userNode.position();
            
            // Find antennas that cover this user
            gameState.cy.nodes('[type="antenna"]').forEach(antenna => {
                const antennaPos = antenna.position();
                const radius = antenna.data('radius') || 50;
                
                const distance = Math.sqrt(
                    Math.pow(userPos.x - antennaPos.x, 2) + 
                    Math.pow(userPos.y - antennaPos.y, 2)
                );
                
                if (distance <= radius) {
                    antenna.addClass('available');
                    console.log(`Highlighted antenna ${antenna.id()} as available`);
                }
            });
        },
        
        // Highlight routers and antennas that can be the next hop
        highlightNextHops() {
            if (!gameState.currentPath || !gameState.currentPath.current) {
                console.error("Cannot highlight next hops: Current path not set");
                return;
            }
            
            const currentNode = gameState.cy.getElementById(gameState.currentPath.current);
            if (!currentNode) {
                console.error(`Node with ID ${gameState.currentPath.current} not found`);
                return;
            }
            
            // Get connected nodes
            const connectedEdges = currentNode.connectedEdges().filter(edge => {
                // Check if the edge has unused capacity
                const edgeId = edge.id();
                const usedCount = gameState.usedLinks.has(edgeId) ? 
                    gameState.usedLinks.get(edgeId).length : 0;
                
                return usedCount < edge.data('capacity');
            });
            
            // Highlight connected routers that aren't already in the path
            connectedEdges.forEach(edge => {
                const otherNode = edge.source().id() === gameState.currentPath.current ? 
                    edge.target() : edge.source();
                
                // Only highlight routers that aren't already in the path
                if (otherNode.data('type') === 'router' && 
                    !gameState.currentPath.route.includes(otherNode.id())) {
                    otherNode.addClass('available');
                    console.log(`Highlighted router ${otherNode.id()} as available`);
                }
                
                // Also highlight antennas that could reach the second user
                if (otherNode.data('type') === 'antenna') {
                    // Check if this antenna can reach the second user
                    const secondUserId = eventHandlers.getSecondUserId();
                    if (secondUserId && eventHandlers.canAntennaReachUser(otherNode, secondUserId)) {
                        otherNode.addClass('available');
                        console.log(`Highlighted antenna ${otherNode.id()} as available for second user`);
                    }
                }
            });
        },
        
        // Get the ID of the second user in the current pair
        getSecondUserId() {
            const currentPair = gameState.userPairs[gameState.currentUserPair];
            if (!currentPair || currentPair.users.length < 2) return null;
            
            return currentPair.users.find(id => id !== gameState.selectedUser);
        },
        
        // Update edge visualization for parallel paths
// Update edge visualization for parallel paths
// Updated updateEdgeVisualization function to properly display parallel edges
updateEdgeVisualization(edge) {
    const edgeId = edge.id();
    const colorList = gameState.usedLinks.get(edgeId);

    if (!colorList || colorList.length === 0) {
        // Remove existing virtual edges if the color list is empty
        gameState.cy.edges(`[parent = "${edgeId}"]`).remove();
        return;
    }

    // Mark the original edge as used
    edge.data('used', true);

    // Remove existing virtual edges for this parent edge before adding new ones
    gameState.cy.edges(`[parent = "${edgeId}"]`).remove();

    const sourceId = edge.source().id();
    const targetId = edge.target().id();
    const edgeCount = colorList.length;
    
    // Calculate the right offset based on number of parallel edges
    const edgesToAdd = [];
    
    // Create multiple virtual edges with different control points
    for (let i = 0; i < edgeCount; i++) {
        const virtualEdgeId = `inner-${edgeId}-${i}`;
        
        // Calculate offset value - make it proportional to the number of edges
        // This creates a spread pattern for the edges
        let offset = 0;
        if (edgeCount > 1) {
            // Spread edges evenly, centered around the original path
            offset = 20 * (i - (edgeCount - 1) / 2);
        }
        
        edgesToAdd.push({
            group: 'edges',
            data: {
                id: virtualEdgeId,
                source: sourceId,
                target: targetId,
                virtual: true,
                parent: edgeId,
                offset: offset // Store offset for styling
            }
        });
    }

    // Add all new virtual edges at once
    const addedEdges = gameState.cy.add(edgesToAdd);

    // Now, style each edge with its color and apply the curve settings
    addedEdges.forEach((virtualEdge, index) => {
        const color = colorList[index];
        
        virtualEdge.style({
            'line-color': color,
            'width': 3,
            'curve-style': 'unbundled-bezier',
            'control-point-distances': [virtualEdge.data('offset')],
            'control-point-weights': [0.5],
            'z-index': 10,
            'opacity': 0.8
        });
    });
}
    };
    
    // Self-reference for methods that need to call other methods in this object
    return eventHandlers;
}