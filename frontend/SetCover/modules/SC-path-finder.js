// SC-path-finder.js - Handles automated antenna optimization for the SC game

export function initPathFinder(gameState, uiManager) {
    return {
        // Set up event listeners for path-finder buttons
        setupPathFinderButtons() {
            // Apply optimal solution button
            const applyOptimalBtn = document.getElementById('applyOptimalBtn');
            if (applyOptimalBtn) {
                applyOptimalBtn.addEventListener('click', () => {
                    this.applyOptimalSolution();
                });
                console.log("Optimal solution button initialized");
            } else {
                console.warn("Optimal solution button not found");
            }
        },
        
        // Apply the saved optimal solution if one exists
        applyOptimalSolution() {
            // Check if a minimum consumption value exists (indicating an optimal solution)
            if (gameState.minimumConsumption === null || gameState.minimumConsumption === undefined) {
                uiManager.showNotification("Aucune solution optimale enregistrée pour ce niveau", "error");
                return;
            }
            
            console.log(`Applying optimal solution with consumption: ${gameState.minimumConsumption}`);
            
            // Start by resetting the game
            if (gameState.gamePhases && gameState.gamePhases.resetGame) {
                gameState.gamePhases.resetGame();
            }
            
            // First activate all antennas and make sure we have an initial state
            this.activateAllAntennas();
            
            // Then try to determine which antennas must be turned on to cover all users
            this.findMinimalAntennaSet();
            
            // Compare current consumption with minimum consumption
            const currentConsumption = this.getCurrentConsumption();
            console.log(`Current consumption: ${currentConsumption}, Target: ${gameState.minimumConsumption}`);
            
            // Check if we've achieved the optimal consumption
            if (Math.abs(currentConsumption - gameState.minimumConsumption) < 0.01) {
                uiManager.showNotification("Solution optimale appliquée avec succès!", "success");
            } else {
                uiManager.showNotification("La solution appliquée n'est pas optimale. Des ajustements manuels peuvent être nécessaires.", "warning");
            }
        },
        
        // Activate all antennas as a starting point
        activateAllAntennas() {
            gameState.cy.nodes('[type="antenna"]').forEach(antenna => {
                antenna.data('active', true);
                
                // Add to active antennas set
                gameState.activeAntennas.add(antenna.id());
                
                // Update halo visibility
                const haloId = antenna.data('haloId');
                if (haloId) {
                    const haloNode = gameState.cy.getElementById(haloId);
                    if (haloNode && haloNode.length) {
                        haloNode.data('active', true);
                        // Use the imported function if available
                        if (gameState.gamePhases && gameState.gamePhases.eventHandlers) {
                            // Try to use the setHaloVisibility function from SC-styles.js
                            try {
                                const setHaloVisibility = (halo, visible) => {
                                    halo.style({
                                        'background-opacity': visible ? 0.1 : 0,
                                        'opacity': visible ? 0.5 : 0,
                                        'visibility': visible ? 'visible' : 'hidden'
                                    });
                                    halo.data('baseOpacity', visible ? 0.1 : 0);
                                };
                                setHaloVisibility(haloNode, true);
                            } catch (error) {
                                console.error("Error setting halo visibility:", error);
                            }
                        }
                    }
                }
            });
            
            // Make sure each user is connected to at least one active antenna
            gameState.cy.nodes('[type="user"]').forEach(user => {
                this.connectUserToNearestAntenna(user);
            });
            
            // Update stats
            uiManager.updateStats();
        },
        
        // Connect a user to the nearest antenna
        connectUserToNearestAntenna(userNode) {
            // Get user position
            const userPos = userNode.position();
            
            // Find nearest active antenna
            let nearestAntenna = null;
            let shortestDistance = Infinity;
            
            gameState.cy.nodes('[type="antenna"][active]').forEach(antenna => {
                const antennaPos = antenna.position();
                const radius = antenna.data('radius') || 50;
                
                // Calculate distance between user and antenna
                const distance = Math.sqrt(
                    Math.pow(userPos.x - antennaPos.x, 2) + 
                    Math.pow(userPos.y - antennaPos.y, 2)
                );
                
                // Check if user is in range of this antenna
                if (distance <= radius && distance < shortestDistance) {
                    shortestDistance = distance;
                    nearestAntenna = antenna;
                }
            });
            
            // If no antenna is in range, we can't connect this user
            if (!nearestAntenna) {
                console.error(`No active antenna in range for user ${userNode.id()}`);
                return false;
            }
            
            // Connect user to the nearest antenna with a virtual edge
            const edgeId = `virtual-edge-${userNode.id()}-${nearestAntenna.id()}`;
            
            // Check if the edge already exists
            const existingEdge = gameState.cy.getElementById(edgeId);
            if (existingEdge.length > 0) {
                return true; // Already connected
            }
            
            // Get a user color from a pre-defined list or generate one
            const colorIndex = parseInt(userNode.id().match(/\d+/)[0]) % gameState.userColors.length;
            const color = gameState.userColors[colorIndex];
            
            // Create a virtual edge
            gameState.cy.add({
                group: 'edges',
                data: {
                    id: edgeId,
                    source: userNode.id(),
                    target: nearestAntenna.id(),
                    virtual: true
                },
                style: {
                    'line-color': color,
                    'width': 3
                }
            });
            
            // Mark the user as connected
            gameState.connectedUsers.add(userNode.id());
            
            // Add this user to the antenna's coverage list
            if (!gameState.antennaUsers.has(nearestAntenna.id())) {
                gameState.antennaUsers.set(nearestAntenna.id(), new Set());
            }
            gameState.antennaUsers.get(nearestAntenna.id()).add(userNode.id());
            
            return true;
        },
        
        // Find a minimal set of antennas that cover all users
        findMinimalAntennaSet() {
            // First, we need to determine which users are covered by which antennas
            const userCoverage = new Map(); // Maps user IDs to sets of antenna IDs
            
            // Calculate all the antennas that can reach each user
            gameState.cy.nodes('[type="user"]').forEach(user => {
                const userId = user.id();
                const userPos = user.position();
                
                // Create a set to hold antennas that cover this user
                userCoverage.set(userId, new Set());
                
                // Check which antennas cover this user
                gameState.cy.nodes('[type="antenna"]').forEach(antenna => {
                    const antennaPos = antenna.position();
                    const radius = antenna.data('radius') || 50;
                    
                    // Calculate distance between user and antenna
                    const distance = Math.sqrt(
                        Math.pow(userPos.x - antennaPos.x, 2) + 
                        Math.pow(userPos.y - antennaPos.y, 2)
                    );
                    
                    // Check if user is in range of this antenna
                    if (distance <= radius) {
                        userCoverage.get(userId).add(antenna.id());
                    }
                });
            });
            
            // Now we need to find a minimum set of antennas that cover all users
            // We'll use a greedy algorithm: 
            // At each step, pick the antenna that covers the most uncovered users
            
            const usersToConnect = new Set(userCoverage.keys()); // All users that need to be covered
            const selectedAntennas = new Set(); // Antennas we select to keep active
            
            // Keep selecting antennas until all users are covered
            while (usersToConnect.size > 0) {
                // Find the antenna that covers the most uncovered users
                let bestAntenna = null;
                let bestCoverage = 0;
                
                gameState.cy.nodes('[type="antenna"]').forEach(antenna => {
                    const antennaId = antenna.id();
                    
                    // Count how many uncovered users this antenna would cover
                    let coverageCount = 0;
                    
                    usersToConnect.forEach(userId => {
                        if (userCoverage.get(userId).has(antennaId)) {
                            coverageCount++;
                        }
                    });
                    
                    // Check if this is the best antenna so far
                    if (coverageCount > bestCoverage) {
                        bestCoverage = coverageCount;
                        bestAntenna = antenna;
                    }
                });
                
                // If we found a good antenna, select it
                if (bestAntenna && bestCoverage > 0) {
                    const antennaId = bestAntenna.id();
                    selectedAntennas.add(antennaId);
                    
                    // Remove the covered users from the list of users to connect
                    usersToConnect.forEach(userId => {
                        if (userCoverage.get(userId).has(antennaId)) {
                            usersToConnect.delete(userId);
                        }
                    });
                } else {
                    // No antenna can cover the remaining users, this shouldn't happen
                    console.error("Could not find antennas to cover all users");
                    break;
                }
            }
            
            // Now, turn off all antennas that weren't selected
            gameState.cy.nodes('[type="antenna"]').forEach(antenna => {
                const antennaId = antenna.id();
                
                if (!selectedAntennas.has(antennaId)) {
                    // Turn off this antenna
                    antenna.data('active', false);
                    gameState.activeAntennas.delete(antennaId);
                    
                    // Also update the halo visibility
                    const haloId = antenna.data('haloId');
                    if (haloId) {
                        const haloNode = gameState.cy.getElementById(haloId);
                        if (haloNode && haloNode.length) {
                            haloNode.data('active', false);
                            // Try to use the setHaloVisibility function
                            try {
                                const setHaloVisibility = (halo, visible) => {
                                    halo.style({
                                        'background-opacity': visible ? 0.1 : 0,
                                        'opacity': visible ? 0.5 : 0,
                                        'visibility': visible ? 'visible' : 'hidden'
                                    });
                                    halo.data('baseOpacity', visible ? 0.1 : 0);
                                };
                                setHaloVisibility(haloNode, false);
                            } catch (error) {
                                console.error("Error setting halo visibility:", error);
                            }
                        }
                    }
                }
            });
            
            // Remove any virtual connections to turned-off antennas
            gameState.cy.edges('[virtual]').forEach(edge => {
                const targetId = edge.target().id();
                const antennaNode = gameState.cy.getElementById(targetId);
                
                // If the target is an antenna and it's inactive, remove this edge
                if (antennaNode && antennaNode.data('type') === 'antenna' && antennaNode.data('active') === false) {
                    edge.remove();
                }
            });
            
            // Reconnect users to their nearest active antennas
            gameState.cy.nodes('[type="user"]').forEach(user => {
                // Remove existing connections first
                gameState.cy.edges().filter(edge => 
                    edge.data('virtual') && edge.source().id() === user.id()
                ).remove();
                
                // Remove user from connectedUsers set
                gameState.connectedUsers.delete(user.id());
                
                // Connect user to nearest active antenna
                this.connectUserToNearestAntenna(user);
            });
            
            // Update stats
            uiManager.updateStats();
        },
        
        // Calculate current consumption
        getCurrentConsumption() {
            let totalConsumption = 0;
            
            // Add consumption from active antennas only
            if (gameState.cy) {
                gameState.cy.nodes('[type="antenna"]').forEach(antenna => {
                    if (antenna.data('active') !== false) {
                        totalConsumption += antenna.data('consumption') || 100;
                    }
                });
            }
            
            return totalConsumption;
        }
    };
}