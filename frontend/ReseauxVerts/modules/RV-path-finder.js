// RV-path-finder.js - Handles automated path finding for the RV game

export function initPathFinder(gameState, uiManager) {
    return {
        // Set up event listeners for path-finder buttons
        setupPathFinderButtons() {
            // Find all shortest paths button
            const findAllPathsBtn = document.getElementById('findAllPathsBtn');
            if (findAllPathsBtn) {
                findAllPathsBtn.addEventListener('click', () => {
                    this.findAllShortestPaths();
                });
            }
            
            // Find next shortest path button
            const findNextPathBtn = document.getElementById('findNextPathBtn');
            if (findNextPathBtn) {
                findNextPathBtn.addEventListener('click', () => {
                    this.findNextShortestPath();
                });
            }
            
            // Apply optimal solution button
            const applyOptimalBtn = document.getElementById('applyOptimalBtn');
            if (applyOptimalBtn) {
                applyOptimalBtn.addEventListener('click', () => {
                    this.applyOptimalSolution();
                });
            }
            
            console.log("Path finder buttons initialized");
        },
        
        // Find and connect all user pairs using the shortest paths
        findAllShortestPaths() {
            // These path finding functions should work in any phase to continue existing connections
            
            // First, check if there's an in-progress path that needs to be completed
            if (gameState.currentPath && gameState.currentPath.current && gameState.currentUserPair !== null) {
                console.log("There's an in-progress path. Completing it first...");
                // Complete the current path first
                this.findNextShortestPath();
                
                // After completing the in-progress path, continue with the rest
                console.log("Now finding paths for remaining pairs...");
            }
            
            // Check if any connections already exist
            const hasExistingConnections = gameState.connectedUsers.size > 0;
            let pairsAlreadyConnected = 0;
            
            // Count how many pairs are already connected
            gameState.userPairs.forEach(pair => {
                if (pair.connected) {
                    pairsAlreadyConnected++;
                }
            });
            
            // Only reset the game if no connections exist yet
            if (!hasExistingConnections && gameState.gamePhases && gameState.gamePhases.resetGame) {
                console.log("No existing connections found, starting from scratch");
                gameState.gamePhases.resetGame();
            } else if (pairsAlreadyConnected > 0) {
                console.log(`Keeping ${pairsAlreadyConnected} existing connections and adding remaining paths`);
            }
            
            console.log("Finding shortest paths for remaining unconnected user pairs");
            
            // Flag to track if all pairs were successfully connected
            let allConnected = true;
            let processedPairs = 0;
            
            // Process each user pair
            gameState.userPairs.forEach((pair, pairIndex) => {
                // Skip already connected pairs
                if (pair.connected) {
                    console.log(`Pair ${pairIndex} already connected, skipping`);
                    return;
                }
                
                processedPairs++;
                
                // Only process pairs with exactly 2 users
                if (pair.users.length !== 2) {
                    console.log(`Skipping pair ${pairIndex} with ${pair.users.length} users (expected 2)`);
                    return;
                }
                
                const [user1Id, user2Id] = pair.users;
                const user1 = gameState.cy.getElementById(user1Id);
                const user2 = gameState.cy.getElementById(user2Id);
                
                if (!user1 || !user2) {
                    console.error(`Cannot find users with IDs ${user1Id} and/or ${user2Id}`);
                    allConnected = false;
                    return;
                }
                
                // Try to connect this pair
                const connected = this.connectUserPair(user1, user2, pair, pairIndex);
                if (!connected) {
                    allConnected = false;
                }
            });
            
            // Update UI
            uiManager.updateStats();
            
            // Provide feedback to the user
            if (processedPairs === 0) {
                uiManager.showNotification("Toutes les paires sont déjà connectées", "success");
                this.optimizeUnusedLinks();
            } else if (allConnected) {
                uiManager.showNotification("Toutes les paires d'utilisateurs sont maintenant connectées", "success");
                // If all users are connected, optimize by turning off unused links
                this.optimizeUnusedLinks();
            } else {
                uiManager.showNotification("Certaines paires n'ont pas pu être connectées", "error");
            }
        },
        
        // Find and connect only the next unconnected user pair
        findNextShortestPath() {
            // Allow this to work in any phase to complete in-progress connections
            
            console.log("Finding shortest path for next connection");
            
            // If there's an in-progress path, continue from the current point
            if (gameState.currentPath && gameState.currentPath.current && gameState.currentUserPair !== null) {
                console.log(`Continuing in-progress path from ${gameState.currentPath.current}`);
                
                const currentPair = gameState.userPairs[gameState.currentUserPair];
                const currentNode = gameState.cy.getElementById(gameState.currentPath.current);
                
                if (!currentNode || !currentNode.length) {
                    console.error(`Cannot find current node: ${gameState.currentPath.current}`);
                    uiManager.showNotification("Erreur: Point actuel non trouvé", "error");
                    return;
                }
                
                // Find the other user in the pair (the one not selected)
                const selectedUserId = gameState.selectedUser;
                const otherUserId = currentPair.users.find(id => id !== selectedUserId);
                
                if (!otherUserId) {
                    console.error("Cannot find the other user in the pair");
                    uiManager.showNotification("Erreur: Impossible de trouver l'autre utilisateur de la paire", "error");
                    return;
                }
                
                const otherUser = gameState.cy.getElementById(otherUserId);
                if (!otherUser) {
                    console.error(`Cannot find user with ID ${otherUserId}`);
                    uiManager.showNotification("Erreur: Utilisateur non trouvé", "error");
                    return;
                }
                
                // Find best antenna for the other user
                const bestAntennaForOther = this.findBestAntenna(otherUser);
                
                if (!bestAntennaForOther) {
                    console.error("No antenna in range for the other user");
                    uiManager.showNotification("Aucune antenne à portée du second utilisateur", "error");
                    return;
                }
                
                // Connect other user to its best antenna
                this.connectUserToAntenna(otherUser, bestAntennaForOther, currentPair.color);
                
                // Find shortest path from current node to the other user's antenna
                const path = this.findShortestPath(currentNode, bestAntennaForOther);
                
                if (!path || path.length < 2) {
                    console.error("No valid path found to complete the connection");
                    uiManager.showNotification("Impossible de trouver un chemin pour compléter la connexion", "error");
                    return;
                }
                
                // Create path connections
                this.createPathConnections(path, currentPair.color);
                
                // Mark the pair as connected
                currentPair.connected = true;
                gameState.connectedUsers.add(selectedUserId);
                gameState.connectedUsers.add(otherUserId);
                
                // Reset path state
                gameState.selectedUser = null;
                gameState.selectedUserColor = null;
                gameState.currentUserPair = null;
                gameState.currentPath = null;
                
                // Update UI
                uiManager.updateStats();
                uiManager.showNotification("Paire connectée avec succès", "success");
                
                // Check if all pairs are now connected
                const allConnected = gameState.userPairs.every(pair => pair.connected);
                if (allConnected) {
                    uiManager.showNotification("Toutes les paires sont connectées!", "success");
                    this.optimizeUnusedLinks();
                }
                
                return;
            }
            
            // If a user is already selected but no path has been started yet
            else if (gameState.selectedUser && gameState.currentUserPair !== null) {
                console.log(`Continuing existing path for user ${gameState.selectedUser}`);
                
                // The current pair is already being processed
                const currentPair = gameState.userPairs[gameState.currentUserPair];
                
                // Find the other user in the pair (the one not selected)
                const otherUserId = currentPair.users.find(id => id !== gameState.selectedUser);
                if (!otherUserId) {
                    console.error("Cannot find the other user in the pair");
                    uiManager.showNotification("Erreur: Impossible de trouver l'autre utilisateur de la paire", "error");
                    return;
                }
                
                const otherUser = gameState.cy.getElementById(otherUserId);
                if (!otherUser) {
                    console.error(`Cannot find user with ID ${otherUserId}`);
                    uiManager.showNotification("Erreur: Utilisateur non trouvé", "error");
                    return;
                }
                
                // Find nearest antenna to the selected user
                const selectedUser = gameState.cy.getElementById(gameState.selectedUser);
                const bestAntenna = this.findBestAntenna(selectedUser, otherUser);
                
                if (!bestAntenna) {
                    console.error("No antenna in range for the selected user");
                    uiManager.showNotification("Aucune antenne à portée de l'utilisateur sélectionné", "error");
                    return;
                }
                
                // Connect user to antenna
                this.connectUserToAntenna(selectedUser, bestAntenna, currentPair.color);
                
                // Check if the best antenna can also reach the other user
                const otherUserPos = otherUser.position();
                const antennaPos = bestAntenna.position();
                const radius = bestAntenna.data('radius') || 50;
                const distance = Math.sqrt(
                    Math.pow(otherUserPos.x - antennaPos.x, 2) + 
                    Math.pow(otherUserPos.y - antennaPos.y, 2)
                );
                
                // If both users can connect to the same antenna, that's optimal!
                if (distance <= radius) {
                    console.log(`Both users can connect to the same antenna: ${bestAntenna.id()}`);
                    
                    // Connect other user to the same antenna
                    this.connectUserToAntenna(otherUser, bestAntenna, currentPair.color);
                    
                    // Mark the pair as connected
                    currentPair.connected = true;
                    gameState.connectedUsers.add(selectedUser.id());
                    gameState.connectedUsers.add(otherUser.id());
                    
                    // Reset selection state
                    gameState.selectedUser = null;
                    gameState.selectedUserColor = null;
                    gameState.currentUserPair = null;
                    
                    // Update UI
                    uiManager.updateStats();
                    uiManager.showNotification("Paire connectée avec succès", "success");
                    
                    // Check if all pairs are now connected
                    const allConnected = gameState.userPairs.every(pair => pair.connected);
                    if (allConnected) {
                        uiManager.showNotification("Toutes les paires sont connectées!", "success");
                        this.optimizeUnusedLinks();
                    }
                    
                    return;
                }
                
                // If we need different antennas, find best antenna for other user
                const bestAntennaForOther = this.findBestAntenna(otherUser, selectedUser);
                
                if (!bestAntennaForOther) {
                    console.error("No antenna in range for the other user");
                    uiManager.showNotification("Aucune antenne à portée du second utilisateur", "error");
                    return;
                }
                
                // Connect other user to its best antenna
                this.connectUserToAntenna(otherUser, bestAntennaForOther, currentPair.color);
                
                // Find shortest path between the two antennas
                const path = this.findShortestPath(bestAntenna, bestAntennaForOther);
                
                if (!path || path.length < 2) {
                    console.error("No valid path found between antennas");
                    uiManager.showNotification("Impossible de trouver un chemin entre les antennes", "error");
                    return;
                }
                
                // Create path connections
                this.createPathConnections(path, currentPair.color);
                
                // Mark the pair as connected
                currentPair.connected = true;
                gameState.connectedUsers.add(selectedUser.id());
                gameState.connectedUsers.add(otherUser.id());
                
                // Reset selection state
                gameState.selectedUser = null;
                gameState.selectedUserColor = null;
                gameState.currentUserPair = null;
                
                // Update UI
                uiManager.updateStats();
                uiManager.showNotification("Paire connectée avec succès", "success");
                
                // Check if all pairs are now connected
                const allConnected = gameState.userPairs.every(pair => pair.connected);
                if (allConnected) {
                    uiManager.showNotification("Toutes les paires sont connectées!", "success");
                    this.optimizeUnusedLinks();
                }
                
                return;
            }
            
            // If no user is selected, find the next unconnected pair
            const nextPairIndex = gameState.userPairs.findIndex(pair => !pair.connected);
            
            if (nextPairIndex === -1) {
                console.log("All pairs are already connected");
                uiManager.showNotification("Toutes les paires sont déjà connectées", "success");
                return;
            }
            
            const nextPair = gameState.userPairs[nextPairIndex];
            console.log(`Found next unconnected pair: ${nextPairIndex}`);
            
            // Only process pairs with exactly 2 users
            if (nextPair.users.length !== 2) {
                console.log(`Skipping pair ${nextPairIndex} with ${nextPair.users.length} users (expected 2)`);
                uiManager.showNotification("Impossible de connecter des paires incomplètes", "error");
                return;
            }
            
            const [user1Id, user2Id] = nextPair.users;
            const user1 = gameState.cy.getElementById(user1Id);
            const user2 = gameState.cy.getElementById(user2Id);
            
            if (!user1 || !user2) {
                console.error(`Cannot find users with IDs ${user1Id} and/or ${user2Id}`);
                uiManager.showNotification("Erreur: Utilisateurs non trouvés", "error");
                return;
            }
            
            // Try to connect this pair
            const connected = this.connectUserPair(user1, user2, nextPair, nextPairIndex);
            
            // Update UI
            uiManager.updateStats();
            
            if (connected) {
                uiManager.showNotification("Paire connectée avec succès", "success");
                
                // Check if all pairs are now connected
                const allConnected = gameState.userPairs.every(pair => pair.connected);
                if (allConnected) {
                    uiManager.showNotification("Toutes les paires sont connectées!", "success");
                    this.optimizeUnusedLinks();
                }
            } else {
                uiManager.showNotification("Impossible de connecter la paire d'utilisateurs", "error");
            }
        },
        
        // Apply the saved optimal solution if one exists
        applyOptimalSolution() {
            // This function resets everything regardless of phase
            
            // Check if a minimum consumption value exists (indicating an optimal solution)
            if (gameState.minimumConsumption === null || gameState.minimumConsumption === undefined) {
                uiManager.showNotification("Aucune solution optimale enregistrée pour ce niveau", "error");
                return;
            }
            
            console.log(`Applying optimal solution with consumption: ${gameState.minimumConsumption}`);
            
            // For optimal solution, we always reset and start from scratch
            if (gameState.gamePhases && gameState.gamePhases.resetGame) {
                gameState.gamePhases.resetGame();
            }
            
            // Start by finding all shortest paths (complete solution)
            this.findAllShortestPaths();
            
            // Then optimize to match the minimum consumption
            this.optimizeUnusedLinks();
            
            // Compare current consumption with minimum consumption
            const currentConsumption = gameState.solutionValidator.getCurrentConsumption();
            console.log(`Current consumption: ${currentConsumption}, Target: ${gameState.minimumConsumption}`);
            
            // Check if we've achieved the optimal consumption
            if (Math.abs(currentConsumption - gameState.minimumConsumption) < 0.01) {
                uiManager.showNotification("Solution optimale appliquée avec succès!", "success");
            } else {
                uiManager.showNotification("La solution appliquée n'est pas optimale. Des ajustements manuels peuvent être nécessaires.", "warning");
            }
        },
        
        // Helper method to connect a user pair
        connectUserPair(user1, user2, pair, pairIndex) {
            console.log(`Connecting pair ${pairIndex}: ${user1.id()} -> ${user2.id()}`);
            
            // Find best antenna for user1, considering the destination user2
            const bestAntennaForUser1 = this.findBestAntenna(user1, user2);
            
            if (!bestAntennaForUser1) {
                console.error("No antenna in range for first user");
                return false;
            }
            
            // Connect user1 to best antenna
            this.connectUserToAntenna(user1, bestAntennaForUser1, pair.color);
            
            // Check if the selected antenna can also reach user2
            const user2Pos = user2.position();
            const antennaPos = bestAntennaForUser1.position();
            const radius = bestAntennaForUser1.data('radius') || 50;
            const distance = Math.sqrt(
                Math.pow(user2Pos.x - antennaPos.x, 2) + 
                Math.pow(user2Pos.y - antennaPos.y, 2)
            );
            
            // If both users can connect to the same antenna, that's optimal!
            if (distance <= radius) {
                console.log(`Both users can connect to the same antenna: ${bestAntennaForUser1.id()}`);
                this.connectUserToAntenna(user2, bestAntennaForUser1, pair.color);
                
                // Mark the pair as connected
                pair.connected = true;
                gameState.connectedUsers.add(user1.id());
                gameState.connectedUsers.add(user2.id());
                
                return true;
            }
            
            // If we need different antennas, find best antenna for user2
            const bestAntennaForUser2 = this.findBestAntenna(user2, user1);
            
            if (!bestAntennaForUser2) {
                console.error("No antenna in range for second user");
                return false;
            }
            
            // Connect user2 to its best antenna
            this.connectUserToAntenna(user2, bestAntennaForUser2, pair.color);
            
            // Find shortest path between the two antennas
            const path = this.findShortestPath(bestAntennaForUser1, bestAntennaForUser2);
            
            if (!path || path.length < 2) {
                console.error("No valid path found between antennas");
                return false;
            }
            
            // Create path connections
            this.createPathConnections(path, pair.color);
            
            // Mark the pair as connected
            pair.connected = true;
            gameState.connectedUsers.add(user1.id());
            gameState.connectedUsers.add(user2.id());
            
            return true;
        },
        
        // Find the nearest antenna to a user that is in range
        findBestAntenna(userNode, destinationUserNode = null) {
            // Get all antennas in range of this user
            const inRangeAntennas = this.findAllAntennasInRange(userNode);
            
            // If no antennas are in range, return null
            if (inRangeAntennas.length === 0) {
                return null;
            }
            
            // If only one antenna is in range, return it
            if (inRangeAntennas.length === 1) {
                return inRangeAntennas[0];
            }
            
            // If we know the destination user, find the antenna that leads to the shortest path
            if (destinationUserNode) {
                // Get antennas in range of the destination user
                const destinationAntennas = this.findAllAntennasInRange(destinationUserNode);
                
                if (destinationAntennas.length > 0) {
                    // Find the pair of antennas (one from each user) with the shortest path between them
                    let bestSourceAntenna = null;
                    let bestDestAntenna = null;
                    let shortestPathLength = Infinity;
                    
                    for (const sourceAntenna of inRangeAntennas) {
                        for (const destAntenna of destinationAntennas) {
                            // If it's the same antenna, this is the best possible case!
                            if (sourceAntenna.id() === destAntenna.id()) {
                                return sourceAntenna; // Immediate return - can't get better than this
                            }
                            
                            // Find path length between these two antennas
                            const path = this.findShortestPath(sourceAntenna, destAntenna);
                            
                            if (path && path.length > 0) {
                                // Count the number of edges in the path as a measure of path length
                                const pathLength = path.filter(ele => ele.isEdge()).length;
                                
                                // Check if this is the shortest path so far
                                if (pathLength < shortestPathLength) {
                                    shortestPathLength = pathLength;
                                    bestSourceAntenna = sourceAntenna;
                                    bestDestAntenna = destAntenna;
                                }
                            }
                        }
                    }
                    
                    // Return the best source antenna if found
                    if (bestSourceAntenna) {
                        return bestSourceAntenna;
                    }
                }
            }
            
            // If we reach here, either:
            // 1. We don't know the destination user
            // 2. No path exists between any pair of antennas
            // In these cases, use a weighted approach considering multiple factors
            
            let bestAntenna = null;
            let bestScore = -Infinity;
            
            for (const antenna of inRangeAntennas) {
                // Start with base score
                let score = 0;
                
                // Factor 1: Distance - closer is better (-1 to +1)
                const userPos = userNode.position();
                const antennaPos = antenna.position();
                const radius = antenna.data('radius') || 50;
                const distance = Math.sqrt(
                    Math.pow(userPos.x - antennaPos.x, 2) + 
                    Math.pow(userPos.y - antennaPos.y, 2)
                );
                
                // Normalize distance score: 0 (at edge of range) to 1 (at center)
                const distanceScore = 1 - (distance / radius);
                score += distanceScore;
                
                // Factor 2: Existing connections - prefer antennas already used by other users (+2)
                const antennaId = antenna.id();
                if (gameState.antennaUsers && gameState.antennaUsers.has(antennaId)) {
                    score += 2;
                }
                
                // Factor 3: Network centrality - prefer antennas with more connections (+0 to +2)
                const connectedEdges = antenna.connectedEdges().length;
                score += Math.min(2, connectedEdges / 3); // Cap at 2 points
                
                // Update best score
                if (score > bestScore) {
                    bestScore = score;
                    bestAntenna = antenna;
                }
            }
            
            return bestAntenna;
        },

        findAllAntennasInRange(userNode) {
            const inRangeAntennas = [];
            const userPos = userNode.position();
            
            gameState.cy.nodes('[type="antenna"]').forEach(antenna => {
                const antennaPos = antenna.position();
                const radius = antenna.data('radius') || 50;
                
                const distance = Math.sqrt(
                    Math.pow(userPos.x - antennaPos.x, 2) + 
                    Math.pow(userPos.y - antennaPos.y, 2)
                );
                
                // Check if user is in range of this antenna
                if (distance <= radius) {
                    inRangeAntennas.push(antenna);
                }
            });
            
            return inRangeAntennas;
        },
        
        // Connect a user to an antenna with a virtual edge
        connectUserToAntenna(userNode, antennaNode, color) {
            const edgeId = `virtual-edge-${userNode.id()}-${antennaNode.id()}`;
            
            // Check if edge already exists
            const existingEdge = gameState.cy.getElementById(edgeId);
            if (existingEdge.length > 0) {
                console.log(`Edge ${edgeId} already exists`);
                return existingEdge;
            }
            
            // Create a new virtual edge
            const edge = gameState.cy.add({
                group: 'edges',
                data: {
                    id: edgeId,
                    source: userNode.id(),
                    target: antennaNode.id(),
                    virtual: true
                },
                style: {
                    'line-color': color,
                    'width': 3
                }
            });
            
            return edge;
        },
        
        // Find the shortest path between two nodes using Cytoscape's algorithm
        findShortestPath(startNode, endNode) {
            try {
                // Use Cytoscape's built-in dijkstra algorithm
                const dijkstra = gameState.cy.elements().dijkstra({
                    root: startNode,
                    directed: false,
                    weight: function(edge) {
                        // Use edge capacity as a factor in path weight
                        // Higher capacity edges should be preferred
                        const capacity = edge.data('capacity') || 1;
                        const distance = edge.data('distance') || 1;
                        
                        // Used edges should be preferred over unused ones
                        // because they're already part of other paths
                        const isUsed = gameState.usedLinks.has(edge.id());
                        const usedFactor = isUsed ? 0.5 : 1;
                        
                        // Weight formula: distance / capacity * usedFactor
                        // This prioritizes high-capacity links and reuses existing paths
                        return (distance / capacity) * usedFactor;
                    }
                });
                
                // Get the path from start to end
                const pathToEnd = dijkstra.pathTo(endNode);
                
                // Filter out nodes, keep just the path structure
                return pathToEnd;
            } catch (error) {
                console.error("Error finding shortest path:", error);
                return null;
            }
        },
        
        // Create connections along a path with a specific color
        createPathConnections(path, color) {
            // Ensure we have a valid path
            if (!path || path.length < 2) {
                console.error("Invalid path provided");
                return;
            }
            
            // Extract just the edges from the path
            const pathEdges = path.filter(ele => ele.isEdge());
            
            // For each edge in the path
            pathEdges.forEach(edge => {
                const edgeId = edge.id();
                
                // Add this edge to the usedLinks map
                if (!gameState.usedLinks.has(edgeId)) {
                    gameState.usedLinks.set(edgeId, []);
                }
                
                const colorList = gameState.usedLinks.get(edgeId);
                colorList.push(color);
                
                // Mark the edge as used
                edge.data('used', true);
                
                // Update edge visualization - FIX: Access the event handler directly
                if (gameState.gamePhases && 
                    gameState.gamePhases.eventHandlers) {
                    try {
                        gameState.gamePhases.eventHandlers.updateEdgeVisualization(edge);
                    } catch (error) {
                        // If the above path doesn't work, try fallback methods
                        console.warn("Couldn't access updateEdgeVisualization via gamePhases.eventHandlers, using fallback...");
                        this.fallbackEdgeVisualization(edge, color);
                    }
                } else {
                    // Fallback method to visualize edges if the event handler isn't available
                    this.fallbackEdgeVisualization(edge, color);
                }
            });
        },
        
        // Fallback method to visualize edges when the event handler isn't available
        fallbackEdgeVisualization(edge, color) {
            // Instead of creating complex parallel edges, just mark the original edge
            // and apply a simpler styling approach
            const edgeId = edge.id();
            
            // First, make sure the edge is marked as used for consumption calculations
            edge.data('used', true);
            
            // Create a simple overlay edge without complex styling properties
            try {
                // Create a simpler edge visualization with basic properties
                const sourceId = edge.source().id();
                const targetId = edge.target().id();
                const virtualEdgeId = `overlay-${edgeId}-${Math.round(Math.random() * 10000)}`;  // Unique ID
                
                gameState.cy.add({
                    group: 'edges',
                    data: {
                        id: virtualEdgeId,
                        source: sourceId,
                        target: targetId,
                        virtual: true
                    }
                }).style({
                    'line-color': color,
                    'width': 3,
                    'z-index': 9,
                    'opacity': 0.7,
                    'line-style': 'solid'
                });
                
                console.log(`Created simple overlay for edge ${edgeId} with color ${color}`);
            } catch (error) {
                // If even the simple overlay fails, just style the original edge
                console.warn(`Could not create overlay, applying highlight to original edge ${edgeId}`, error);
                
                // Add a class to the original edge to show it's used
                edge.addClass('path');
                
                // Simple direct style change that's less likely to cause issues
                try {
                    edge.style('line-color', color);
                } catch (styleError) {
                    console.error('Failed to apply even basic styling, edge will use default style', styleError);
                }
            }
        },
        
        // Optimize by turning off unused links
        optimizeUnusedLinks() {
            console.log("Optimizing by turning off unused links");
            
            // Set all edges to off first
            gameState.cy.edges().forEach(edge => {
                if (!edge.data('virtual') && !gameState.usedLinks.has(edge.id())) {
                    edge.data('used', false);
                    edge.addClass('unused');
                }
            });
            
            // Update stats
            uiManager.updateStats();
            
            // Enter phase 5 (optimization phase)
            if (gameState.gamePhases && typeof gameState.gamePhases.startPhase5 === 'function') {
                gameState.gamePhases.startPhase5();
            } else {
                gameState.phase = 5;
                uiManager.setPopupMessage("Tous les utilisateurs sont connectés ! Optimisez en désactivant les liens inutilisés");
            }
        }
    };
}