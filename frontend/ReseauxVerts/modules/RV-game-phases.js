// RV-game-phases.js - Manages game phases and gameplay logic

export function initGamePhases(gameState, uiManager, eventHandlers) {
    // Initialize gamePhases object
    const gamePhases = {
        // Phase 1: Select a user
// Fixed startPhase1 function for RV-game-phases.js

startPhase1() {
    console.log("Starting phase 1");
    
    // Set the phase
    gameState.phase = 1;
    console.log("Set phase to:", gameState.phase);
    
    // Reset selection state
    gameState.selectedUser = null;
    gameState.selectedUserColor = null;
    gameState.currentUserPair = null; // No current pair until user selection
    
    // Clear any existing highlights
    gameState.cy.nodes().removeClass('available selected');
    
    // Check if all pairs are connected
    const allConnected = gameState.userPairs.every(pair => pair.connected);
    
    if (allConnected) {
        // All pairs are connected, move to phase 5
        console.log("All pairs connected, moving to phase 5");
        this.startPhase5();
        return;
    }
    
    // Update popup message
    uiManager.setPopupMessage("Sélectionez un utilisateur pour commencer une connexion");
    
    // Highlight ALL unconnected users (not just from next pair)
    gameState.userPairs.forEach(pair => {
        if (!pair.connected) {
            pair.users.forEach(userId => {
                // Only highlight users that aren't already connected
                if (!gameState.connectedUsers.has(userId)) {
                    const userNode = gameState.cy.getElementById(userId);
                    if (userNode) {
                        console.log("Highlighting user node:", userId);
                        userNode.addClass('available');
                    } else {
                        console.error(`User node ${userId} not found`);
                    }
                }
            });
        }
    });
    
    // Force Cytoscape to redraw
    gameState.cy.style().update();
    
    // Create or update pair-specific reset buttons
    uiManager.createUserPairButtons();
},
        
        // Handle user selection in phase 1
// Fix for handleUserSelection in RV-game-phases.js
handleUserSelection(userNode) {
    if (gameState.phase !== 1) {
        console.log(`Cannot select user in phase ${gameState.phase}`);
        return;
    }
    
    console.log(`User selection attempt: ${userNode.id()}, type: ${userNode.data('type')}`);
    
    // Make sure we have user pairs available
    if (!gameState.userPairs.length) {
        console.error("No user pairs available");
        return;
    }
    
    const userId = userNode.id();
    
    // Already connected or wrong type
    if (userNode.data('type') !== 'user' || gameState.connectedUsers.has(userId)) {
        console.log("User selection failed - already connected or not a user node");
        return;
    }
    
    // Find which pair this user belongs to
    let foundPairIndex = -1;
    
    for (let i = 0; i < gameState.userPairs.length; i++) {
        const pair = gameState.userPairs[i];
        if (pair.users.includes(userId) && !pair.connected) {
            foundPairIndex = i;
            break;
        }
    }
    
    if (foundPairIndex === -1) {
        console.log("User not found in any unconnected pair");
        return;
    }
    
    // Set the current pair index
    gameState.currentUserPair = foundPairIndex;
    console.log(`Selected pair index: ${gameState.currentUserPair}`);
    
    // Set the selected user
    gameState.selectedUser = userId;
    gameState.selectedUserColor = userNode.style('background-color');
    
    // Highlight the selected user
    gameState.cy.nodes().removeClass('selected available');
    userNode.addClass('selected');
    
    // Update pair buttons to show "in progress" for this pair
    uiManager.updatePairButtons();
    
    // Move to phase 2
    this.startPhase2();
},

// Reset pair function with color format handling

resetPair(pairIndex) {
    if (pairIndex < 0 || pairIndex >= gameState.userPairs.length) {
        console.error(`Invalid pair index: ${pairIndex}`);
        return;
    }
    
    const pair = gameState.userPairs[pairIndex];
    console.log(`Completely resetting pair ${pairIndex}: ${pair.users.join(', ')} with color ${pair.color}`);
    
    // Get the pair's color
    const pairColor = pair.color;
    
    // STEP 1: Reset the pair data
    // -------------------------------
    // Mark the pair as not connected
    pair.connected = false;
    
    // Remove users from connectedUsers
    pair.users.forEach(userId => {
        gameState.connectedUsers.delete(userId);
        console.log(`Removed ${userId} from connected users list`);
    });
    
    // If this was the active pair, clear selection state
    if (gameState.currentUserPair === pairIndex) {
        console.log(`Clearing active pair state`);
        gameState.selectedUser = null;
        gameState.selectedUserColor = null;
        gameState.currentUserPair = null;
        gameState.currentPath = null;
    }
    
    // STEP 2: Remove visual elements
    // -------------------------------
    // Find all virtual edges connected to these users (antenna connections)
    console.log(`Finding user-antenna connections for pair ${pairIndex}`);
    pair.users.forEach(userId => {
        const userEdges = gameState.cy.edges().filter(edge => 
            edge.data('virtual') && (edge.source().id() === userId || edge.target().id() === userId)
        );
        
        console.log(`Found ${userEdges.length} virtual edges for user ${userId}`);
        userEdges.remove();
    });
    
    // STEP 3: Clear color from usedLinks and remove related visualizations
    // --------------------------------------------------------------------
    console.log(`Removing color ${pairColor} from all usedLinks`);
    
    // Define a function to check if a color matches our pair color in any format
    function colorsMatch(color1, color2) {
        // Create a temporary div to convert color formats
        const tempDiv = document.createElement('div');
        tempDiv.style.color = color1;
        document.body.appendChild(tempDiv);
        const computedColor1 = window.getComputedStyle(tempDiv).color;
        tempDiv.style.color = color2;
        const computedColor2 = window.getComputedStyle(tempDiv).color;
        document.body.removeChild(tempDiv);
        
        return computedColor1 === computedColor2;
    }
    
    // Create a copy of the keys and entries to avoid modification during iteration
    const edgesToProcess = [];
    gameState.usedLinks.forEach((colorList, edgeId) => {
        edgesToProcess.push([edgeId, colorList]);
    });
    
    edgesToProcess.forEach(([edgeId, colorList]) => {
        // Check if any color in the list matches our pair color
        const hasMatchingColor = colorList.some(color => {
            // Quick check for exact match
            if (color === pairColor) return true;
            
            // Try to match rgb vs hex format
            if (color.startsWith('rgb') && pairColor.startsWith('#')) {
                return colorsMatch(color, pairColor);
            }
            
            if (pairColor.startsWith('rgb') && color.startsWith('#')) {
                return colorsMatch(pairColor, color);
            }
            
            return false;
        });
        
        if (hasMatchingColor) {
            console.log(`Edge ${edgeId} used color matching ${pairColor}, removing`);
            
            // Remove all parallel edges that might visually represent this connection
            gameState.cy.edges().filter(edge => 
                (edge.data('parent') === edgeId || edge.id().startsWith(`inner-${edgeId}`))
            ).remove();
            
            // Remove any matching color from the usedLinks entry
            const newColorList = colorList.filter(color => {
                // Keep colors that don't match
                if (color === pairColor) return false;
                if ((color.startsWith('rgb') && pairColor.startsWith('#')) || 
                    (pairColor.startsWith('rgb') && color.startsWith('#'))) {
                    return !colorsMatch(color, pairColor);
                }
                return true;
            });
            
            if (newColorList.length === 0) {
                // No colors left, remove the entry
                gameState.usedLinks.delete(edgeId);
                console.log(`Removed edge ${edgeId} from usedLinks (no colors left)`);
            } else {
                // Update with filtered list
                gameState.usedLinks.set(edgeId, newColorList);
                console.log(`Updated colors for edge ${edgeId}: ${newColorList}`);
                
                // Recreate the visualization for remaining colors
                const edge = gameState.cy.getElementById(edgeId);
                if (edge) {
                    eventHandlers.updateEdgeVisualization(edge);
                }
            }
        }
    });
    
    // STEP 4: Clear any remaining visual elements that might have been missed
    // ----------------------------------------------------------------------
    // Just delete all edges that match our color or have parent edges that used this color
    gameState.cy.edges().filter(edge => {
        const color = edge.style('line-color');
        if (color === pairColor) return true;
        if ((color.startsWith('rgb') && pairColor.startsWith('#')) || 
            (pairColor.startsWith('rgb') && color.startsWith('#'))) {
            return colorsMatch(color, pairColor);
        }
        return false;
    }).remove();
    
    // Clear any highlighting on nodes
    gameState.cy.nodes().removeClass('selected available');
    
    console.log(`Reset of pair ${pairIndex} complete`);
    console.log(`Current usedLinks:`, Object.fromEntries(gameState.usedLinks));
    
    // Update stats
    uiManager.updateStats();
    
    // Go back to phase 1
    this.startPhase1();
},
        
        // Phase 2: Connect to antenna
        startPhase2() {
            gameState.phase = 2;
            
            // Update popup message
            uiManager.setPopupMessage("Connectez-le à une antenne proche");
            
            // Highlight antennas that can reach the selected user
            eventHandlers.highlightAvailableAntennas();
        },
        
        // Handle antenna selection in phase 2
        handleAntennaSelection(antennaNode) {
            if (gameState.phase !== 2) return;
            
            // Check if this is an antenna and it's available (in range)
            if (antennaNode.data('type') === 'antenna' && antennaNode.hasClass('available')) {
                const userNode = gameState.cy.getElementById(gameState.selectedUser);
                
                // Create a virtual edge between user and antenna
                const edgeId = `virtual-edge-${gameState.selectedUser}-${antennaNode.id()}`;
                
                gameState.cy.add({
                    group: 'edges',
                    data: {
                        id: edgeId,
                        source: gameState.selectedUser,
                        target: antennaNode.id(),
                        virtual: true
                    },
                    style: {
                        'line-color': gameState.selectedUserColor,
                        'width': 3
                    }
                });
                
                // Mark the first user as connected
                gameState.connectedUsers.add(gameState.selectedUser);
                
                // Remove highlights
                gameState.cy.nodes().removeClass('available');
                
                // Move to phase 3
                this.startPhase3(antennaNode);
            }
        },
        
        // Phase 3: Trace route to second user
        startPhase3(startAntenna) {
            gameState.phase = 3;
            
            // Update popup message
            uiManager.setPopupMessage("Tracez la route en sélectionnant des routeurs jusqu'à connecter l'utilisateur de la même couleur");
            
            // Store the current path
            gameState.currentPath = {
                start: startAntenna.id(),
                current: startAntenna.id(),
                route: [startAntenna.id()],
                edges: []
            };
            
            // Highlight available next hops (adjacent routers)
            eventHandlers.highlightNextHops();
        },
        
        // Handle path selection in phase 3
        handlePathSelection(node) {
            if (gameState.phase !== 3) return;
            
            const nodeType = node.data('type');
            // If it's a router, add it to the path
            if (nodeType === 'router' && node.hasClass('available')) {
                this.addRouterToPath(node);
            } 
            // If it's an antenna, check if it can reach the second user
            else if (nodeType === 'antenna' && node.hasClass('available')) {
                
                this.connectToSecondAntenna(node);
            }
        },
        
        // Add a router to the current path
        addRouterToPath(routerNode) {
            const currentNode = gameState.cy.getElementById(gameState.currentPath.current);

            // Find the edge connecting current node to the router
            const connectingEdge = currentNode.edgesWith(routerNode)[0];

            if (!connectingEdge) return;
            
            // Add this edge to the used links
            const edgeId = connectingEdge.id();
            if (!gameState.usedLinks.has(edgeId)) {
                gameState.usedLinks.set(edgeId, []);
            }

            const colorList = gameState.usedLinks.get(edgeId);
            colorList.push(gameState.selectedUserColor);

            // Update the edge visualization
            eventHandlers.updateEdgeVisualization(connectingEdge);

            // Add the router to the path
            gameState.currentPath.route.push(routerNode.id());
            gameState.currentPath.current = routerNode.id();
            gameState.currentPath.edges.push(connectingEdge.id());

            // Remove highlights and highlight next hops
            gameState.cy.nodes().removeClass('available');
            eventHandlers.highlightNextHops();
            
        },
        
        // Connect to the second antenna and user
        connectToSecondAntenna(antennaNode) {
            const currentNode = gameState.cy.getElementById(gameState.currentPath.current);
            
            // Find the edge connecting current node to the antenna
            const connectingEdge = currentNode.edgesWith(antennaNode)[0];
            
            if (!connectingEdge) return;
            
            // Add this edge to the used links
            const edgeId = connectingEdge.id();
            if (!gameState.usedLinks.has(edgeId)) {
                gameState.usedLinks.set(edgeId, []);
            }
            
            const colorList = gameState.usedLinks.get(edgeId);
            colorList.push(gameState.selectedUserColor);
            
            // Update the edge visualization
            eventHandlers.updateEdgeVisualization(connectingEdge);
            
            // Add the antenna to the path
            gameState.currentPath.route.push(antennaNode.id());
            gameState.currentPath.edges.push(connectingEdge.id());
            
            // Get the second user
            const secondUserId = eventHandlers.getSecondUserId();
            
            if (secondUserId && eventHandlers.canAntennaReachUser(antennaNode, secondUserId)) {
                // Create virtual edge to the second user
                const edgeId = `virtual-edge-${antennaNode.id()}-${secondUserId}`;
                
                gameState.cy.add({
                    group: 'edges',
                    data: {
                        id: edgeId,
                        source: antennaNode.id(),
                        target: secondUserId,
                        virtual: true
                    },
                    style: {
                        'line-color': gameState.selectedUserColor,
                        'width': 3
                    }
                });
                
                // Mark the second user as connected
                gameState.connectedUsers.add(secondUserId);
                
                // Mark the current pair as fully connected
                gameState.userPairs[gameState.currentUserPair].connected = true;
                
                // Remove highlights
                gameState.cy.nodes().removeClass('available selected');
                
                // Update stats
                uiManager.updateStats();
                
                // Go to next pair or phase 5
                this.startPhase1();
            }
        },
        
        // Phase 5: Optimization
        startPhase5() {
            gameState.phase = 5;
            
            // Update popup
            uiManager.setPopupMessage("Tous les utilisateurs sont connectés ! Maintenant, optimisez en désactivant les liens inutilisés pour économiser de l'énergie");
            
            // Highlight edges that can be toggled
           /* gameState.cy.edges().forEach(edge => {
                if (!edge.data('virtual') && !gameState.usedLinks.has(edge.id())) {
                    edge.addClass('unused');
                }
            });*/
        },
        
        // Toggle an edge on/off in the optimization phase
        toggleEdge(edge) {
            if (gameState.phase !== 5 || edge.data('virtual')) return;
            
            if (!gameState.usedLinks.has(edge.id())) {
                // Can turn off only if not used
                edge.data('used', !edge.data('used'));
                
                if (edge.data('used')) {
                    edge.removeClass('unused');
                } else {
                    edge.addClass('unused');
                }
                
                // Update consumption
                uiManager.updateStats();
            }
        },
        
        // Reset the game
        resetGame() {
            // Remove all virtual edges
            gameState.cy.edges('[virtual]').remove();
            
            // Reset edge states
            gameState.cy.edges().forEach(edge => {
                edge.data('used', true);
                edge.removeClass('unused');
            });
            
            // Reset node states
            gameState.cy.nodes().removeClass('available selected');
            
            // Reset pair connection status
            gameState.userPairs.forEach(pair => {
                pair.connected = false;
            });
            
            // Reset game state
            gameState.reset();
            
            // Update stats
            uiManager.updateStats();
            
            // Start from phase 1
            this.startPhase1();
        }
    };
    
    // Set up Cytoscape event handlers if they weren't provided
    if (eventHandlers && eventHandlers.setupEventHandlers) {
        eventHandlers.setupEventHandlers(gamePhases);
    }
    
    return gamePhases;
}