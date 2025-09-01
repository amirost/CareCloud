// SC-game-phases.js - Manages game phases and gameplay logic for Set Cover
import { setHaloVisibility } from './SC-styles.js';

export function initGamePhases(gameState, uiManager, eventHandlers) {
    // Initialize gamePhases object
    const gamePhases = {
        // Phase 1: Select a user
        startPhase1() {
            console.log("Phase 1: Start");
            gameState.phase = 1;
            console.log("Phase set to:", gameState.phase);

            gameState.selectedUser = null;
            gameState.selectedUserColor = null;

            gameState.cy.nodes().removeClass('available selected');

            // Check if all users are connected (uses global connectedUsers Set)
            const allConnected = this.areAllUsersConnected();
            if (allConnected) {
                console.log("Phase 1: All users connected, moving to phase 3");
                this.startPhase3();
                return;
            }

            uiManager.setPopupMessage("Sélectionez un utilisateur <img src='../../../icons/user_icon.png' class='inline-icon'> pour commencer une connexion");

            // Highlight unconnected users (based on global connectedUsers Set)
            gameState.cy.nodes('[type="user"]').forEach(userNode => {
                if (!gameState.connectedUsers.has(userNode.id())) {
                    userNode.addClass('available');
                }
            });

            gameState.cy.style().update(); // Force redraw if necessary
            uiManager.updateUserItems();
        },

        areAllUsersConnected() {
            const totalUsers = gameState.cy.nodes('[type="user"]').length;
            const connectedCount = gameState.connectedUsers.size; // Uses global connectedUsers Set
            console.log(`areAllUsersConnected: ${connectedCount}/${totalUsers} (using global connectedUsers Set)`);
            return connectedCount === totalUsers;
        },

        handleUserSelection(userNode) {
            if (gameState.phase !== 1) {
                console.log(`handleUserSelection: Cannot select user in phase ${gameState.phase}`);
                return;
            }

            const userId = userNode.id();
            // Note: If user is already in gameState.connectedUsers, they can still be selected.
            // The logic in handleAntennaSelection will handle "moving" the connection.
            if (gameState.connectedUsers.has(userId)) {
                console.log(`handleUserSelection: User ${userId} already has an active connection (in global connectedUsers). Will allow re-selection to change antenna.`);
            }


            gameState.selectedUser = userId;
            gameState.selectedUserColor = userNode.style('background-color');
            console.log(`handleUserSelection: User ${userId} selected.`);

            gameState.cy.nodes().removeClass('selected available');
            userNode.addClass('selected');

            uiManager.updateUserItems();
            this.startPhase2();
        },

        // Phase 2: Select an antenna to connect to
        startPhase2() {
            console.log("Phase 2: Start");
            gameState.phase = 2;
            console.log("Phase set to:", gameState.phase);
            uiManager.setPopupMessage("Connectez l'utilisateur à une antenne <img src='../../../icons/antenna_icon_on.png' class='inline-icon'> proche");
            // highlightAvailableAntennas calculates range on-the-fly and adds a CSS class.
            // It does NOT modify gameState.antennaUsers.
            eventHandlers.highlightAvailableAntennas();
        },

        handleAntennaSelection(antennaNode) {
            if (gameState.phase !== 2) {
                console.log(`handleAntennaSelection: Cannot select antenna in phase ${gameState.phase}`);
                return;
            }

            if (antennaNode.hasClass('available')) { // 'available' class means in range
                const userId = gameState.selectedUser;
                const newAntennaId = antennaNode.id();

                if (!userId) {
                    console.error("handleAntennaSelection: No user selected!");
                    this.startPhase1(); // Go back if state is inconsistent
                    return;
                }

                console.log(`handleAntennaSelection: User ${userId} attempting to connect to antenna ${newAntennaId}`);

                // 1. Clean up user's old connection from gameState.antennaUsers (if any)
                // gameState.antennaUsers stores active connections per antenna.
                gameState.antennaUsers.forEach((userSet, oldAntennaId) => {
                    if (userSet.has(userId)) { // If the user was in this oldAntenna's set
                        userSet.delete(userId); // Remove them
                        console.log(`[CLEANUP_LOG] User ${userId} removed from old antenna ${oldAntennaId} in antennaUsers.`);
                        const oldEdgeId = `virtual-edge-${userId}-${oldAntennaId}`;
                        const oldEdge = gameState.cy.getElementById(oldEdgeId);
                        if (oldEdge.length > 0) {
                            oldEdge.remove();
                            console.log(`[CLEANUP_LOG] Removed old virtual edge ${oldEdgeId}.`);
                        }
                        // If oldAntennaId's userSet is now empty, its 'active' (on/off) state
                        // is still managed manually by the user in phase 3.
                        if (userSet.size === 0) {
                            console.log(`[CLEANUP_LOG] Antenna ${oldAntennaId} now has no active connections in antennaUsers.`);
                        }
                    }
                });

                // 2. Create the new visual connection
                eventHandlers.createVirtualConnection(userId, newAntennaId, gameState.selectedUserColor);

                const userNode = gameState.cy.getElementById(userId);
                if (userNode.length > 0) {
                    const cyContainer = document.getElementById('cy'); 
                    const tempTarget = document.createElement('div');
                    const pos = userNode.renderedPosition();
                    const containerRect = cyContainer.getBoundingClientRect();
                    tempTarget.style.position = 'absolute';
                    tempTarget.style.left = `${containerRect.left + pos.x}px`;
                    tempTarget.style.top = `${containerRect.top + pos.y}px`;
                    document.body.appendChild(tempTarget);

                    uiManager.createFloatingText('Connecté !', tempTarget, 'plus');
                    
                    setTimeout(() => document.body.removeChild(tempTarget), 10);
                }

                // 3. Update gameState.antennaUsers for the new active connection
                if (!gameState.antennaUsers.has(newAntennaId)) {
                    gameState.antennaUsers.set(newAntennaId, new Set());
                }
                gameState.antennaUsers.get(newAntennaId).add(userId);
                console.log(`[CONNECTION_LOG] User ${userId} is NOW ACTIVELY CONNECTED to antenna ${newAntennaId} (in antennaUsers). Users on this antenna:`, Array.from(gameState.antennaUsers.get(newAntennaId)));

                // 4. Update gameState.connectedUsers (the global Set)
                gameState.connectedUsers.add(userId);
                console.log(`[CONNECTION_LOG] User ${userId} added to global connectedUsers Set. Total globally connected: ${gameState.connectedUsers.size}`);


                // 5. Manage state of the newly connected antenna (turn it ON, make halo visible)
                antennaNode.data('active', true); // Mark antenna itself as ON
                gameState.activeAntennas.add(newAntennaId); // Add to set of ON antennas

                const haloId = antennaNode.data('haloId');
                if (haloId) {
                    const haloNode = gameState.cy.getElementById(haloId);
                    if (haloNode.length > 0) {
                        haloNode.data('active', true);
                        setHaloVisibility(haloNode, true); // Make sure halo is visible
                    }
                }

                gameState.cy.nodes().removeClass('available selected');
                uiManager.updateStats();
                this.startPhase1(); // Go back to select another user or proceed to phase 3
            } else {
                console.log(`handleAntennaSelection: Antenna ${antennaNode.id()} is not available (not in range or other condition) for user ${gameState.selectedUser}.`);
            }
        },

        // Phase 3: Optimization - turn off unused antennas
        startPhase3() {
            console.log("Phase 3: Start");
            gameState.phase = 3;
            console.log("Phase set to:", gameState.phase);
            uiManager.setPopupMessage("Optimisez l'énergie en éteignant les antennes qui n'ont pas d'utilisateurs connectés.");
            uiManager.updateUserItems(); // Reflects all users are connected
            uiManager.updateStats();
        },

        toggleAntennaState(antennaNode) {
            if (gameState.phase !== 3) return;

            const antennaId = antennaNode.id();
            const usersConnected = gameState.antennaUsers.get(antennaId)?.size || 0;
            const isActive = antennaNode.data('active');

            if (isActive && usersConnected > 0) {
                uiManager.showNotification("Vous ne pouvez pas éteindre une antenne avec des utilisateurs connectés.", "error");
                antennaNode.addClass('error');
                setTimeout(() => antennaNode.removeClass('error'), 1000);
                return;
            }

            // ** LA LIGNE SUIVANTE A ÉTÉ SUPPRIMÉE CAR ELLE CAUSAIT L'ERREUR **
            // const userNode = gameState.cy.getElementById(userId); // <-- CETTE LIGNE EST SUPPRIMÉE

            const newActiveState = !antennaNode.data('active');

            // On fait l'animation seulement si on est en train d'ÉTEINDRE l'antenne
            if (newActiveState === false) {
                const gaugeBar = document.getElementById('consumption-gauge');
                if (gaugeBar) {
                    const tempTarget = document.createElement('div');
                    const gaugeRect = gaugeBar.getBoundingClientRect();
                    tempTarget.style.position = 'absolute';
                    tempTarget.style.left = `${gaugeRect.right}px`; 
                    tempTarget.style.top = `${gaugeRect.top}px`;
                    document.body.appendChild(tempTarget);

                    const consumptionSaved = antennaNode.data('consumption') || 0;
                    uiManager.createFloatingText(`-${consumptionSaved.toFixed(0)} W`, tempTarget, 'minus');

                    setTimeout(() => document.body.removeChild(tempTarget), 10);
                }
            }
            
            antennaNode.data('active', newActiveState);
            if (newActiveState) {
                gameState.activeAntennas.add(antennaId);
            } else {
                gameState.activeAntennas.delete(antennaId);
            }
            this.updateAntennaAppearance(antennaNode, newActiveState);
            uiManager.updateStats();
        },

        updateAntennaAppearance(antennaNode, isActive) {
            if (!antennaNode || antennaNode.length === 0) return;
            
            // Appliquer le style directement sur le nœud
            if (isActive) {
                antennaNode.style({
                    'background-image': '../../../icons/antenna_icon_on_white.png',
                    //'background-color': '#222e24',
                    //'opacity': 1
                });
            } else {
                antennaNode.style({
                    'background-image': '../../../icons/antenna_icon_off_white.png',
                    //'background-color': '#222e24',
                    //'opacity': 1
                });
            }

            // Mettre à jour le halo associé
            const haloNode = gameState.cy.getElementById(antennaNode.data('haloId'));
            if (haloNode.length > 0) {
                setHaloVisibility(haloNode, isActive);
            }
        },
        
        // ** VERSION CORRIGÉE **
        resetUserConnection(userId) {
            console.log(`resetUserConnection: Attempting to reset connection for user ${userId}.`);
            let userWasActivelyConnected = false;

            // 1. Remove user from gameState.antennaUsers (active connections per antenna)
            gameState.antennaUsers.forEach((userSet, antennaId) => {
                if (userSet.has(userId)) {
                    userSet.delete(userId);
                    userWasActivelyConnected = true; // Mark that we found an active connection
                    console.log(`[DISCONNECTION_LOG] User ${userId} REMOVED from antenna ${antennaId} in antennaUsers.`);
                    const edgeId = `virtual-edge-${userId}-${antennaId}`;
                    const edge = gameState.cy.getElementById(edgeId);
                    if (edge.length > 0) {
                        edge.remove();
                        console.log(`[DISCONNECTION_LOG] Removed virtual edge ${edgeId}.`);
                    }
                    if (userSet.size === 0) {
                         console.log(`[DISCONNECTION_LOG] Antenna ${antennaId} now has no active connections in antennaUsers.`);
                    }
                }
            });

            // 2. Remove user from gameState.connectedUsers (the global Set)
            if (userWasActivelyConnected) {
                gameState.connectedUsers.delete(userId);
                console.log(`[DISCONNECTION_LOG] User ${userId} removed from global connectedUsers Set. Total globally connected: ${gameState.connectedUsers.size}`);
            }

            const userNode = gameState.cy.getElementById(userId);
            if (userNode.length > 0) {
                userNode.removeClass('connected selected');
            }

            // 3. **LOGIQUE CLÉ**: On quitte la phase d'optimisation en rallumant toutes les antennes
            console.log("User disconnected. Re-activating all antennas and returning to connection phase.");
            gameState.cy.nodes('[type="antenna"]').forEach(antennaNode => {
                if (antennaNode.data('active') === false) { // On ne rallume que celles qui étaient éteintes
                    antennaNode.data('active', true);
                    gameState.activeAntennas.add(antennaNode.id());
                    this.updateAntennaAppearance(antennaNode, true);
                }
            });

            // 4. Always go back to phase 1 to re-evaluate UI and game state
            this.startPhase1();
            uiManager.updateStats();
        },

        recalculateActiveAntennas() {
            console.log("recalculateActiveAntennas: Syncing gameState.activeAntennas with node data('active').");
            const currentActive = new Set(gameState.activeAntennas);
            gameState.activeAntennas.clear();
            let changesMade = false;

            gameState.cy.nodes('[type="antenna"]').forEach(antennaNode => {
                const antennaId = antennaNode.id();
                const isActiveData = antennaNode.data('active');

                if (isActiveData) {
                    gameState.activeAntennas.add(antennaId);
                    if (!currentActive.has(antennaId)) changesMade = true;
                } else {
                    if (currentActive.has(antennaId)) changesMade = true;
                }

                // On met aussi à jour l'apparence, au cas où
                this.updateAntennaAppearance(antennaNode, isActiveData);
            });
            if (changesMade) {
                console.log("recalculateActiveAntennas: gameState.activeAntennas was modified:", Array.from(gameState.activeAntennas));
            } else {
                console.log("recalculateActiveAntennas: gameState.activeAntennas was already in sync with node data.");
            }
            uiManager.updateStats();
        },

        resetGame() {
            console.log("Resetting game state...");
            const savedMinimumConsumption = gameState.minimumConsumption;

            gameState.cy.edges('[virtual]').remove();

            gameState.cy.nodes('[type="antenna"]').forEach(antenna => {
                antenna.data('active', true); 
                antenna.removeClass('available selected unused error');
                this.updateAntennaAppearance(antenna, true);
            });

            gameState.cy.nodes('[type="user"]').forEach(user => {
                user.removeClass('available selected connected');
            });

            gameState.reset(); 

            gameState.minimumConsumption = savedMinimumConsumption;

            // After gameState.reset(), activeAntennas is empty. Repopulate based on default state (all active).
            gameState.cy.nodes('[type="antenna"]').forEach(antenna => {
                gameState.activeAntennas.add(antenna.id());
            });
            console.log("Game reset. Initial gameState.activeAntennas:", Array.from(gameState.activeAntennas));
            console.log("Game reset. Initial gameState.antennaUsers (active connections per antenna):", gameState.antennaUsers); // Should be empty Map
            console.log("Game reset. Initial gameState.connectedUsers (global set of connected users):", gameState.connectedUsers); // Should be empty Set

            uiManager.updateStats();
            this.startPhase1();
        }
    };

    return gamePhases;
}