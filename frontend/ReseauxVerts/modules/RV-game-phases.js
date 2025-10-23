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
    uiManager.setPopupMessage("Sélectionez un utilisateur <img src='../../../icons/user_icon.png' class='inline-icon' > pour commencer une connexion");

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
    const pairColor = pair.color;
    console.log(`Completely resetting pair ${pairIndex}: ${pair.users.join(', ')} with color ${pairColor}`);
    
    
    // STEP 1: Reset the pair's high-level state.
    // ------------------------------------------------------------------
    pair.connected = false;
    pair.users.forEach(userId => {
        gameState.connectedUsers.delete(userId);
        console.log(`Removed ${userId} from connected users list`);
    });
    if (gameState.currentUserPair === pairIndex) {
        console.log(`Clearing active pair state`);
        gameState.selectedUser = null;
        gameState.selectedUserColor = null;
        gameState.currentUserPair = null;
        gameState.currentPath = null;
    }

    // NOUVELLE ÉTAPE : Nettoyer `completedPaths`
    // ------------------------------------------------------------------
    const initialCompletedPathsCount = gameState.completedPaths.length;
    gameState.completedPaths = gameState.completedPaths.filter(pathData => pathData.color !== pairColor);
    if (gameState.completedPaths.length < initialCompletedPathsCount) {
        console.log(`Removed path with color ${pairColor} from gameState.completedPaths.`);
    }
    
    // STEP 2: Remove user-to-antenna virtual edges.
    // ------------------------------------------------------------------
    console.log(`Finding user-antenna connections for pair ${pairIndex}`);
    pair.users.forEach(userId => {
        const userEdges = gameState.cy.edges().filter(edge => 
            edge.data('virtual') && (edge.source().id() === userId || edge.target().id() === userId)
        );
        console.log(`Found ${userEdges.length} virtual edges for user ${userId}`);
        userEdges.remove();
    });
    
    // STEP 3: Clean the `usedLinks` data structure.
    // ------------------------------------------------------------------
    console.log(`Removing color ${pairColor} from all usedLinks arrays`);
    
    function colorsMatch(color1, color2) {
        const tempDiv = document.createElement('div');
        tempDiv.style.color = color1;
        document.body.appendChild(tempDiv);
        const computedColor1 = window.getComputedStyle(tempDiv).color;
        tempDiv.style.color = color2;
        const computedColor2 = window.getComputedStyle(tempDiv).color;
        document.body.removeChild(tempDiv);
        return computedColor1 === computedColor2;
    }
    
    // Iterate over every link in the usedLinks map.
    gameState.usedLinks.forEach((linkInfo, edgeId) => {
        const colorList = Array.isArray(linkInfo) ? linkInfo : (linkInfo ? linkInfo.colors : null);
        if (!colorList) return;

        const newColorList = colorList.filter(colorInList => !colorsMatch(colorInList, pairColor));

        if (newColorList.length === 0) {
            gameState.usedLinks.delete(edgeId);
        } else {
            if (Array.isArray(linkInfo)) {
                gameState.usedLinks.set(edgeId, newColorList);
            } else {
                linkInfo.colors = newColorList;
                linkInfo.count = newColorList.length;
            }
        }
    });
    // Reset edge states
    gameState.cy.edges().forEach(edge => {
        edge.data('used', true);
        edge.removeClass('unused');
    });
    // STEP 4: Force a global visual refresh.
    // ------------------------------------------------------------------
    if (eventHandlers && eventHandlers.refreshAllEdgeVisuals) {
        console.log("Triggering global visual refresh.");
        eventHandlers.refreshAllEdgeVisuals();
    } else {
        console.error("La fonction refreshAllEdgeVisuals n'a pas été trouvée ! Visuals may be inconsistent.");
    }

    // DEBUGGING: Log the final state of usedLinks to confirm it's clean.
    console.log("State of `usedLinks` after reset logic:", new Map(gameState.usedLinks));
    
    // STEP 5: Final UI cleanup and state transition.
    // ------------------------------------------------------------------
    gameState.cy.nodes().removeClass('selected available');
    
    console.log(`Reset of pair ${pairIndex} complete`);
    
    uiManager.updateStats();
    this.startPhase1();
},
        
        // Phase 2: Connect to antenna
        startPhase2() {
            gameState.phase = 2;
            
            // Update popup message
            uiManager.setPopupMessage("Connectez-le à une antenne <img src='../../../icons/antenna_icon_on.png' class='inline-icon'> proche");
            
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
            uiManager.setPopupMessage("Tracez la route en sélectionnant des routeurs <img src='../../../icons/router_icon_white.png' class='inline-icon'> jusqu'à connecter l'utilisateur de la même couleur");
            
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
                
                const fullPath = [
                    gameState.selectedUser, 
                    ...gameState.currentPath.route, 
                    secondUserId
                ];
                gameState.completedPaths.push({
                    color: gameState.selectedUserColor,
                    path: fullPath
                });
                console.log('Saved completed path:', fullPath);

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
                                const secondUserNode = gameState.cy.getElementById(secondUserId);
                if (secondUserNode.length > 0) {
                    // On récupère le conteneur du graphe pour le positionnement
                    const cyContainer = document.getElementById('cy'); 
                    // On crée un div temporaire à la position du noeud
                    const tempTarget = document.createElement('div');
                    const pos = secondUserNode.renderedPosition();
                    const containerRect = cyContainer.getBoundingClientRect();
                    tempTarget.style.position = 'absolute';
                    tempTarget.style.left = `${containerRect.left + pos.x}px`;
                    tempTarget.style.top = `${containerRect.top + pos.y}px`;
                    document.body.appendChild(tempTarget);

                    uiManager.createFloatingText('Connecté !', tempTarget, 'plus');
                    
                    // On supprime le div temporaire après un court instant
                    setTimeout(() => document.body.removeChild(tempTarget), 10);
                }
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
                const isCurrentlyUsed = edge.data('used');
                
                // On ne fait l'action que si on est en train de DÉSACTIVER (passer de used=true à used=false)
                if (isCurrentlyUsed) {
                    edge.data('used', false);
                    edge.addClass('unused');

                    // ** LA CORRECTION EST ICI **
                    // 1. Récupérer l'élément de la jauge
                    const gaugeBar = document.getElementById('consumption-gauge');
                    
                    if (gaugeBar) {
                        // 2. Créer un élément cible temporaire positionné à la fin de la barre de la jauge
                        const tempTarget = document.createElement('div');
                        const gaugeRect = gaugeBar.getBoundingClientRect();
                        
                        // On le positionne à la fin de la barre (bord droit)
                        tempTarget.style.position = 'absolute';
                        tempTarget.style.left = `${gaugeRect.right}px`; 
                        tempTarget.style.top = `${gaugeRect.top}px`;
                        
                        document.body.appendChild(tempTarget);

                        // 3. Appeler le texte flottant sur cette cible temporaire
                        const consumptionSaved = edge.data('consumption') || 0;
                        uiManager.createFloatingText(`-${consumptionSaved.toFixed(0)} W`, tempTarget, 'minus');

                        // 4. Supprimer la cible temporaire
                        setTimeout(() => document.body.removeChild(tempTarget), 10);
                    }
                    
                    // Mettre à jour les statistiques (ce qui va rétrécir la barre)
                    uiManager.updateStats();

                } else {
                    // Si on réactive un lien, on met juste à jour
                    edge.data('used', true);
                    edge.removeClass('unused');
                    uiManager.updateStats();
                }
            }
        },
        
        // Reset the game
        resetGame() {
            console.log("Resetting game state...");
            
            const savedMinimumConsumption = gameState.minimumConsumption;

            // Nettoyage visuel et des données
            gameState.cy.edges('[virtual]').remove();
            gameState.cy.edges(':not([virtual])').forEach(edge => {
                edge.data('used', true);
                edge.removeClass('unused');
            });
            gameState.cy.nodes().removeClass('available selected');
            gameState.userPairs.forEach(pair => {
                pair.connected = false;
            });

            // Réinitialise les données de progression du joueur
            gameState.reset();
            
            // Restaure les propriétés du NIVEAU
            gameState.minimumConsumption = savedMinimumConsumption;

            // Réinitialise l'état visuel à "tout est allumé"
            if (gameState.antennaSettings.consumptionEnabled) {
                gameState.cy.nodes('[type="antenna"]').forEach(antenna => {
                    antenna.data('active', true);
                    gameState.activeAntennas.add(antenna.id()); // Repeupler le set
                    this.updateAntennaAppearance(antenna, true);
                });
            }

            if (eventHandlers && eventHandlers.refreshAllEdgeVisuals) {
                eventHandlers.refreshAllEdgeVisuals();
            }

            // ** LA CORRECTION EST ICI **
            // On appelle updateStats UNE SEULE FOIS, à la toute fin,
            // quand l'état visuel et les données sont 100% synchronisés.
            uiManager.updateStats();
            
            uiManager.updateCapacityButtonUI();
            this.startPhase1();
        },

        toggleAntennaState(antennaNode) {
            // Cette fonction ne s'exécute qu'en phase 5 si la conso des antennes est activée
            if (gameState.phase !== 5 || !gameState.antennaSettings.consumptionEnabled) return;

            const antennaId = antennaNode.id();
            const isActive = antennaNode.data('active');

            // Vérifier si l'antenne est utilisée par un chemin
            let isAntennaInUse = false;
            for (const pathData of gameState.completedPaths) {
                if (pathData.path.includes(antennaId)) {
                    isAntennaInUse = true;
                    break;
                }
            }

            // On ne peut pas éteindre une antenne en cours d'utilisation
            if (isActive && isAntennaInUse) {
                uiManager.showNotification("Cette antenne est utilisée par un chemin et ne peut être éteinte.", "error");
                return;
            }
            
            const newActiveState = !isActive;

            // Animation "-X W" uniquement quand on éteint
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
            
            // Mise à jour des données
            antennaNode.data('active', newActiveState);
            if (newActiveState) {
                gameState.activeAntennas.add(antennaId);
            } else {
                gameState.activeAntennas.delete(antennaId);
            }
            
            // Mise à jour visuelle (on a besoin d'une fonction pour ça)
            this.updateAntennaAppearance(antennaNode, newActiveState);
            
            // Mise à jour des stats
            uiManager.updateStats();
        },

        updateAntennaAppearance(antennaNode, isActive) {
            if (!antennaNode || antennaNode.length === 0) return;
            
            // Appliquer le style directement sur le nœud
            if (isActive) {
                antennaNode.style('background-image', '../../../icons/antenna_icon_on_white.png');
            } else {
                antennaNode.style('background-image', '../../../icons/antenna_icon_off_white.png');
            }
            // Mettre à jour le halo (on a besoin de la fonction setHaloVisibility)
            const haloNode = gameState.cy.getElementById(antennaNode.data('haloId'));
            if (haloNode.length > 0) {
                // Pour cela, il nous faut setHaloVisibility dans RV-styles.js
                if (window.setHaloVisibility) {
                    window.setHaloVisibility(haloNode, isActive);
                }
            }
        },
    
    };
    
    // Set up Cytoscape event handlers if they weren't provided
    if (eventHandlers && eventHandlers.setupEventHandlers) {
        eventHandlers.setupEventHandlers(gamePhases);
    }
    
    return gamePhases;
}