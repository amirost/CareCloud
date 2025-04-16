// SC-game-phases.js - Manages game phases and gameplay logic for Set Cover
import { setHaloVisibility } from './SC-styles.js';


export function initGamePhases(gameState, uiManager, eventHandlers) {
    // Initialize gamePhases object
    const gamePhases = {
        // Phase 1: Select a user
        startPhase1() {
            console.log("Starting phase 1");
            
            // Set the phase
            gameState.phase = 1;
            console.log("Set phase to:", gameState.phase);
            
            // Reset selection state
            gameState.selectedUser = null;
            gameState.selectedUserColor = null;
            
            // Clear any existing highlights
            gameState.cy.nodes().removeClass('available selected');
            
            // Check if all users are connected
            const allConnected = this.areAllUsersConnected();
            
            if (allConnected) {
                // All users are connected, move to phase 3 (optimization)
                console.log("All users connected, moving to phase 3");
                this.startPhase3();
                return;
            }
            
            // Update popup message
            uiManager.setPopupMessage("Sélectionez un utilisateur");
            
            // Highlight unconnected users
            gameState.cy.nodes('[type="user"]').forEach(userNode => {
                if (!gameState.connectedUsers.has(userNode.id())) {
                    userNode.addClass('available');
                }
            });
            
            // Force Cytoscape to redraw
            gameState.cy.style().update();
            
            // Update user status in UI
            uiManager.updateUserItems();
        },
        
        // Check if all users are connected
        areAllUsersConnected() {
            const totalUsers = gameState.cy.nodes('[type="user"]').length;
            return gameState.connectedUsers.size === totalUsers;
        },
        
        // Handle user selection in phase 1
        handleUserSelection(userNode) {
            if (gameState.phase !== 1) {
                console.log(`Cannot select user in phase ${gameState.phase}`);
                return;
            }
            
            const userId = userNode.id();
            
            // Already connected
            if (gameState.connectedUsers.has(userId)) {
                console.log("User already connected");
                return;
            }
            
            // Set the selected user
            gameState.selectedUser = userId;
            gameState.selectedUserColor = userNode.style('background-color');
            
            // Highlight the selected user
            gameState.cy.nodes().removeClass('selected available');
            userNode.addClass('selected');
            
            // Update UI
            uiManager.updateUserItems();
            
            // Move to phase 2
            this.startPhase2();
        },
        
        // Phase 2: Select an antenna to connect to
        startPhase2() {
            gameState.phase = 2;
            
            // Update popup message
            uiManager.setPopupMessage("Connectez l'utilisateur à une antenne proche");
            
            // Highlight antennas that can reach the selected user
            eventHandlers.highlightAvailableAntennas();
        },
        
        // Handle antenna selection in phase 2
        handleAntennaSelection(antennaNode) {
            if (gameState.phase !== 2) return;
            
            // Check if this antenna is available (in range)
            if (antennaNode.hasClass('available')) {
                const userId = gameState.selectedUser;
                const antennaId = antennaNode.id();
                
                // Create a virtual edge between user and antenna
                eventHandlers.createVirtualConnection(userId, antennaId, gameState.selectedUserColor);
                
                // Mark the user as connected
                gameState.connectedUsers.add(userId);
                
                // Mark the antenna as active
                gameState.activeAntennas.add(antennaId);
                
                // Set antenna node data
                antennaNode.data('active', true);
                
                // Also set active state for antenna halo if it exists
                const haloId = antennaNode.data('haloId');
                if (haloId) {
                    const haloNode = gameState.cy.getElementById(haloId);
                    if (haloNode.length > 0) {
                        haloNode.data('active', true);
                    }
                }
                
                // Add this user to the antenna's coverage list
                if (!gameState.antennaUsers.has(antennaId)) {
                    gameState.antennaUsers.set(antennaId, new Set());
                }
                gameState.antennaUsers.get(antennaId).add(userId);
                
                // Remove highlights
                gameState.cy.nodes().removeClass('available selected');
                
                // Update stats
                uiManager.updateStats();
                
                // Back to phase 1 to select another user
                this.startPhase1();
            }
        },
        
        // Phase 3: Optimization - turn off unused antennas
        startPhase3() {
            gameState.phase = 3;
            
            // Update popup message
            uiManager.setPopupMessage("Optimisez l'énergie en éteignant les antennes non utilisées");
            
            // Update UI
            uiManager.updateUserItems();
            uiManager.updateStats();
        },
        
        // Toggle antenna state (on/off) in phase 3
        toggleAntennaState(antennaNode) {
            if (gameState.phase !== 3) return;
            
            const antennaId = antennaNode.id();
            
            // Check if antenna has connected users
            if (gameState.antennaUsers.has(antennaId) && 
                gameState.antennaUsers.get(antennaId).size > 0) {
                
                const currentState = antennaNode.data('active');
                const newState = !currentState;
                
                // You can't turn off an antenna with active connections unless there's redundancy
                if (currentState === true && newState === false) {
                    // Check if turning off would disconnect any users
                    const coveredUsers = gameState.antennaUsers.get(antennaId);
                    
                    // Check each user to see if they would remain connected
                    let canTurnOff = true;
                    coveredUsers.forEach(userId => {
                        let hasAlternativeCoverage = false;
                        
                        // Look for another active antenna covering this user
                        gameState.cy.nodes('[type="antenna"]').forEach(otherAntenna => {
                            if (otherAntenna.id() !== antennaId && 
                                otherAntenna.data('active') === true && 
                                eventHandlers.canAntennaReachUser(otherAntenna, gameState.cy.getElementById(userId))) {
                                hasAlternativeCoverage = true;
                            }
                        });
                        
                        if (!hasAlternativeCoverage) {
                            canTurnOff = false;
                        }
                    });
                    
                    if (!canTurnOff) {
                        console.log("Cannot turn off antenna - would disconnect users");
                        // Show temporary warning
                        antennaNode.addClass('error');
                        setTimeout(() => {
                            antennaNode.removeClass('error');
                        }, 1000);
                        return;
                    }
                }
                
                // Update antenna state
                antennaNode.data('active', newState);
                
                // Update activeAntennas set
                if (newState) {
                    gameState.activeAntennas.add(antennaId);
                } else {
                    gameState.activeAntennas.delete(antennaId);
                }
                
                // Update halo state as well
                const haloId = antennaNode.data('haloId');
                if (haloId) {
                    const haloNode = gameState.cy.getElementById(haloId);
                    if (haloNode.length > 0) {
                        haloNode.data('active', newState);
                        
                        setHaloVisibility(haloNode, newState);
                    }
                }
                
                // Update stats
                uiManager.updateStats();
            }
        },
        
        // Reset a user connection
        resetUserConnection(userId) {
            if (!gameState.connectedUsers.has(userId)) {
                console.log(`User ${userId} is not connected`);
                return;
            }
            
            // Remove the user from connected users
            gameState.connectedUsers.delete(userId);
            
            // Find and remove any virtual edges for this user
            gameState.cy.edges().filter(edge => 
                edge.data('virtual') && edge.source().id() === userId
            ).forEach(edge => {
                const antennaId = edge.target().id();
                
                // Remove this user from the antenna's coverage
                if (gameState.antennaUsers.has(antennaId)) {
                    gameState.antennaUsers.get(antennaId).delete(userId);
                    
                    // If antenna no longer covers any users, it can be turned off
                    if (gameState.antennaUsers.get(antennaId).size === 0) {
                        const antennaNode = gameState.cy.getElementById(antennaId);
                        if (antennaNode.length > 0) {
                            // Only suggest turning it off visually if it's not used
                            antennaNode.addClass('unused');
                        }
                    }
                }
                
                // Remove the edge
                edge.remove();
            });
            
            // Reset user node appearance
            const userNode = gameState.cy.getElementById(userId);
            if (userNode.length > 0) {
                userNode.removeClass('connected selected');
            }
            
            // If we're in phase 3, go back to phase 1
            if (gameState.phase === 3) {
                this.startPhase1();
            } else {
                // Update stats and UI
                uiManager.updateStats();
                uiManager.updateUserItems();
            }
        },
        
        // Recalculate which antennas are active based on connections
        recalculateActiveAntennas() {
            // Clear active antennas
            gameState.activeAntennas.clear();
            
            // Mark antennas as active if they have connections
            gameState.antennaUsers.forEach((users, antennaId) => {
                if (users.size > 0) {
                    gameState.activeAntennas.add(antennaId);
                    
                    // Update antenna node data
                    const antennaNode = gameState.cy.getElementById(antennaId);
                    if (antennaNode.length > 0) {
                        antennaNode.data('active', true);
                        
                        // Update halo state as well
                        const haloId = antennaNode.data('haloId');
                        if (haloId) {
                            const haloNode = gameState.cy.getElementById(haloId);
                            if (haloNode.length > 0) {
                                haloNode.data('active', true);
                            }
                        }
                    }
                }
            });
        },
        
        // Reset the game
        resetGame() {
            // Remove all virtual edges
            gameState.cy.edges('[virtual]').remove();
            
            // Reset antenna states
            gameState.cy.nodes('[type="antenna"]').forEach(antenna => {
                antenna.data('active', true);
                antenna.removeClass('available selected unused error');
                
                // Reset halo state
                const haloId = antenna.data('haloId');
                if (haloId) {
                    const haloNode = gameState.cy.getElementById(haloId);
                    if (haloNode.length > 0) {
                        haloNode.data('active', true);
                        setHaloVisibility(haloNode, true);
                    }
                }
            });
            
            // Reset user nodes
            gameState.cy.nodes('[type="user"]').forEach(user => {
                user.removeClass('available selected connected');
            });
            
            // Reset game state
            gameState.reset();
            
            // Repopulate active antennas so all are initially active
            gameState.cy.nodes('[type="antenna"]').forEach(antenna => {
                gameState.activeAntennas.add(antenna.id());
            });
            
            // Update stats
            uiManager.updateStats();
            
            // Start from phase 1
            this.startPhase1();
        }
    };
    
    return gamePhases;
}