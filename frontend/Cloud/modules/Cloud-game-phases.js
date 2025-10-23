// RV-game-phases.js - Manages game phases and gameplay logic

export function initGamePhases(gameState, uiManager, eventHandlers) {
    const gamePhases = {
        
        startPhase1() {
            console.log("Starting phase 1");
            
            gameState.phase = 1;
            
            gameState.selectedUser = null;
            gameState.selectedUserColor = null;
            gameState.currentUserPair = null; 
            
            gameState.cy.nodes().removeClass('available selected');
            
            const allPairsConnected = gameState.userPairs.every(pair => pair.connected);
            
            if (allPairsConnected) {
                console.log("All pairs connected, moving to phase 5");
                this.startPhase5();
                return;
            }
            
            uiManager.setPopupMessage("Sélectionez un utilisateur <img src='../../../icons/user_icon.png' class='inline-icon' > pour commencer une connexion");

            // Surligner tous les utilisateurs non connectés (pairing et cloud)
            gameState.cy.nodes('node[type="user"]').forEach(user => {
                if (!gameState.connectedUsers.has(user.id())) {
                    user.addClass('available');
                }
            });
            
            gameState.cy.style().update();
            uiManager.createUserPairButtons();
        },
        
        handleUserSelection(userNode) {
            if (gameState.phase !== 1) {
                console.log(`Cannot select user in phase ${gameState.phase}`);
                return;
            }
            
            const userId = userNode.id();
            const userType = userNode.data('userType');
        
            if (gameState.connectedUsers.has(userId)) {
                if (userType === 'cloud') {
                     console.log("Cloud client already connected.");
                     return;
                }
            }
        
            if (userType === 'pairing') {
                console.log(`User selection attempt: ${userId}, type: pairing`);
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
                
                gameState.currentUserPair = foundPairIndex;
                gameState.connectionTarget = 'user'; 
            
            } else if (userType === 'cloud') {
                console.log(`User selection attempt: ${userId}, type: cloud`);
                gameState.connectionTarget = 'cloud';
                gameState.currentUserPair = null;
            }
        
            gameState.selectedUser = userId;
            gameState.selectedUserColor = userNode.style('background-color');
            
            gameState.cy.nodes().removeClass('selected available');
            userNode.addClass('selected');
            
            uiManager.updatePairButtons();
            this.startPhase2();
        },

        resetPair(pairIndex) {
            if (pairIndex < 0 || pairIndex >= gameState.userPairs.length) return;
            
            const pair = gameState.userPairs[pairIndex];
            const pairColor = pair.color;
            
            pair.connected = false;
            pair.users.forEach(userId => gameState.connectedUsers.delete(userId));
            if (gameState.currentUserPair === pairIndex) {
                gameState.selectedUser = null;
                gameState.selectedUserColor = null;
                gameState.currentUserPair = null;
                gameState.currentPath = null;
            }

            gameState.completedPaths = gameState.completedPaths.filter(pathData => pathData.color !== pairColor);
            
            pair.users.forEach(userId => {
                gameState.cy.edges(`[source = "${userId}"], [target = "${userId}"]`).filter('[virtual]').remove();
            });
            
            function colorsMatch(c1, c2) {
                const div = document.createElement('div');
                div.style.color = c1; document.body.appendChild(div);
                const comp1 = window.getComputedStyle(div).color;
                div.style.color = c2;
                const comp2 = window.getComputedStyle(div).color;
                document.body.removeChild(div);
                return comp1 === comp2;
            }
            
            gameState.usedLinks.forEach((linkInfo, edgeId) => {
                const colorList = Array.isArray(linkInfo) ? linkInfo : (linkInfo ? linkInfo.colors : null);
                if (!colorList) return;
                const newColorList = colorList.filter(c => !colorsMatch(c, pairColor));
                if (newColorList.length === 0) {
                    gameState.usedLinks.delete(edgeId);
                } else {
                    if (Array.isArray(linkInfo)) gameState.usedLinks.set(edgeId, newColorList);
                    else { linkInfo.colors = newColorList; linkInfo.count = newColorList.length; }
                }
            });
            
            gameState.cy.edges().forEach(edge => {
                edge.data('used', true);
                edge.removeClass('unused');
            });

            if (eventHandlers && eventHandlers.refreshAllEdgeVisuals) {
                eventHandlers.refreshAllEdgeVisuals();
            }
            
            gameState.cy.nodes().removeClass('selected available');
            uiManager.updateStats();
            this.startPhase1();
        },

        resetCloudConnection(clientId) {
            console.log(`Resetting cloud connection for client: ${clientId}`);

            // Cas 1: Annuler une connexion en cours
            if (gameState.selectedUser === clientId && gameState.currentPath) {
                this.cancelCurrentPath();
                return;
            }

            // Cas 2: Déconnecter un client déjà connecté
            const pathDataIndex = gameState.completedPaths.findIndex(p => p.path[0] === clientId && p.path.includes(gameState.cloudNode.id()));
            if (pathDataIndex === -1) {
                console.warn(`No completed path found for client ${clientId} to reset.`);
                return;
            }

            const [pathData] = gameState.completedPaths.splice(pathDataIndex, 1);
            const clientColor = pathData.color;

            // Retirer les tâches de ce client des serveurs du cloud
            if (gameState.cloudNode && gameState.cloudNode.data('servers')) {
                const clientNode = gameState.clients.find(c => c.id === clientId)?.node;
                if(clientNode) {
                    const tasksToReturn = [];
                    const servers = gameState.cloudNode.data('servers');
                    servers.forEach(server => {
                        const tasksKept = [];
                        (server.tasks || []).forEach(task => {
                            if (task.ownerId === clientId) {
                                tasksToReturn.push(task);
                            } else {
                                tasksKept.push(task);
                            }
                        });
                        server.tasks = tasksKept;
                    });
                    
                    // Remettre les tâches dans la liste du client
                    const currentTasks = clientNode.data('tasks') || [];
                    clientNode.data('tasks', currentTasks.concat(tasksToReturn));
                }
            }

            // Nettoyer les liens et arêtes
            this.cleanupPath(pathData.path, clientColor);

            gameState.connectedUsers.delete(clientId);
            
            uiManager.updateStats();
            this.startPhase1();
        },

        // *** NOUVELLE FONCTION UTILITAIRE POUR ANNULER UN CHEMIN EN COURS ***
        cancelCurrentPath() {
            if (!gameState.currentPath) return;

            console.log("Cancelling in-progress path...");
            // Nettoyer les arêtes déjà tracées
            this.cleanupPath(gameState.currentPath.route, gameState.selectedUserColor);

            gameState.currentPath = null;
            gameState.selectedUser = null;
            
            uiManager.updateStats();
            this.startPhase1();
        },
        
        // *** NOUVELLE FONCTION UTILITAIRE POUR NETTOYER UN CHEMIN ***
        cleanupPath(nodeIds, color) {
            // Supprimer les arêtes virtuelles du chemin
            for (let i = 0; i < nodeIds.length - 1; i++) {
                const source = nodeIds[i];
                const target = nodeIds[i+1];
                gameState.cy.edges(`[source = "${source}"][target = "${target}"],[source = "${target}"][target = "${source}"]`).filter('[virtual]').remove();
            }
        
            // Retirer la couleur des liens physiques
            gameState.usedLinks.forEach((colorList, edgeId) => {
                const index = colorList.indexOf(color);
                if (index > -1) {
                    colorList.splice(index, 1);
                    if (colorList.length === 0) {
                        gameState.usedLinks.delete(edgeId);
                    }
                    eventHandlers.updateEdgeVisualization(gameState.cy.getElementById(edgeId));
                }
            });
        },
        
        startPhase2() {
            gameState.phase = 2;
            uiManager.setPopupMessage("Connectez-le à une antenne <img src='../../../icons/antenna_icon_on.png' class='inline-icon'> proche");
            eventHandlers.highlightAvailableAntennas();
        },
        
        handleAntennaSelection(antennaNode) {
            if (gameState.phase !== 2) return;
            
            if (antennaNode.hasClass('available')) {
                const userNode = gameState.cy.getElementById(gameState.selectedUser);
                eventHandlers.createVirtualConnection(gameState.selectedUser, antennaNode.id(), gameState.selectedUserColor);
                
                // On ne marque pas encore l'utilisateur comme "connecté", seulement la première étape est faite.
                
                gameState.cy.nodes().removeClass('available');
                this.startPhase3(antennaNode);
            }
        },
        
        startPhase3(startAntenna) {
            gameState.phase = 3;
            
            uiManager.setPopupMessage("Tracez la route en sélectionnant des routeurs <img src='../../../icons/router_icon_white.png' class='inline-icon'> jusqu'à la destination");
            
            gameState.currentPath = {
                start: startAntenna.id(),
                current: startAntenna.id(),
                route: [startAntenna.id()],
                edges: []
            };
            
            eventHandlers.highlightNextHops();
        },
        
        handlePathSelection(node) {
            if (gameState.phase !== 3) return;
        
            if (node.hasClass('available')) {
                const nodeType = node.data('type');
        
                if (nodeType === 'router') {
                    this.addRouterToPath(node);
                    
                    if (gameState.connectionTarget === 'cloud') {
                        const isFinalRouter = node.neighborhood('node').some(n => n.id() === gameState.cloudNode.id());
                        if (isFinalRouter) {
                            this.connectToSecondAntenna(gameState.cloudNode);
                        }
                    }
                } else if (nodeType === 'antenna' && gameState.connectionTarget === 'user') {
                    this.connectToSecondAntenna(node);
                }
            }
        },
        
        addRouterToPath(routerNode) {
            const currentNode = gameState.cy.getElementById(gameState.currentPath.current);
            const connectingEdge = currentNode.edgesWith(routerNode)[0];
            if (!connectingEdge) return;
            
            const edgeId = connectingEdge.id();
            if (!gameState.usedLinks.has(edgeId)) {
                gameState.usedLinks.set(edgeId, []);
            }
            gameState.usedLinks.get(edgeId).push(gameState.selectedUserColor);
            eventHandlers.updateEdgeVisualization(connectingEdge);

            gameState.currentPath.route.push(routerNode.id());
            gameState.currentPath.current = routerNode.id();
            gameState.currentPath.edges.push(connectingEdge.id());

            gameState.cy.nodes().removeClass('available');
            eventHandlers.highlightNextHops();
        },
        
        connectToSecondAntenna(endNode) {
            const currentNode = gameState.cy.getElementById(gameState.currentPath.current);
            
            if (endNode.data('type') !== 'cloud') {
                const connectingEdge = currentNode.edgesWith(endNode)[0];
                if (!connectingEdge) return;
                const edgeId = connectingEdge.id();
                if (!gameState.usedLinks.has(edgeId)) gameState.usedLinks.set(edgeId, []);
                gameState.usedLinks.get(edgeId).push(gameState.selectedUserColor);
                eventHandlers.updateEdgeVisualization(connectingEdge);
                gameState.currentPath.edges.push(edgeId);
            }
            
            gameState.currentPath.route.push(endNode.id());
        
            let finalPath;
        
            if (endNode.data('type') === 'antenna') {
                const secondUserId = eventHandlers.getSecondUserId();
                if (secondUserId && eventHandlers.canAntennaReachUser(endNode, secondUserId)) {
                    eventHandlers.createVirtualConnection(endNode.id(), secondUserId, gameState.selectedUserColor);
                    finalPath = [gameState.selectedUser, ...gameState.currentPath.route, secondUserId];
                    gameState.connectedUsers.add(secondUserId);
                    gameState.userPairs[gameState.currentUserPair].connected = true;
                }
            } else if (endNode.data('type') === 'cloud') {
                finalPath = [gameState.selectedUser, ...gameState.currentPath.route];
                eventHandlers.createVirtualConnection(currentNode.id(), endNode.id(), gameState.selectedUserColor);
            }
            
            if (finalPath) {
                gameState.completedPaths.push({ color: gameState.selectedUserColor, path: finalPath });
            }
        
            gameState.connectedUsers.add(gameState.selectedUser);
            
            const cyContainer = document.getElementById('cy'); 
            const tempTarget = document.createElement('div');
            const pos = endNode.renderedPosition();
            const containerRect = cyContainer.getBoundingClientRect();
            tempTarget.style.position = 'absolute';
            tempTarget.style.left = `${containerRect.left + pos.x}px`;
            tempTarget.style.top = `${containerRect.top + pos.y}px`;
            document.body.appendChild(tempTarget);
            uiManager.createFloatingText('Connecté !', tempTarget, 'plus');
            setTimeout(() => document.body.removeChild(tempTarget), 10);
        
            gameState.cy.nodes().removeClass('available selected');
            uiManager.updateStats();
            this.startPhase1();
        },
        
        startPhase5() {
            gameState.phase = 5;
            uiManager.setPopupMessage("Tous les utilisateurs sont connectés ! Maintenant, optimisez en désactivant les liens inutilisés pour économiser de l'énergie");
        },
        
        toggleEdge(edge) {
            if (gameState.phase !== 5 || edge.data('virtual')) return;
            
            if (!gameState.usedLinks.has(edge.id())) {
                const isCurrentlyUsed = edge.data('used');
                if (isCurrentlyUsed) {
                    edge.data('used', false);
                    edge.addClass('unused');
                    const gaugeBar = document.getElementById('consumption-gauge');
                    if (gaugeBar) {
                        const tempTarget = document.createElement('div');
                        const gaugeRect = gaugeBar.getBoundingClientRect();
                        tempTarget.style.position = 'absolute';
                        tempTarget.style.left = `${gaugeRect.right}px`; 
                        tempTarget.style.top = `${gaugeRect.top}px`;
                        document.body.appendChild(tempTarget);
                        const consumptionSaved = edge.data('consumption') || 0;
                        uiManager.createFloatingText(`-${consumptionSaved.toFixed(0)} W`, tempTarget, 'minus');
                        setTimeout(() => document.body.removeChild(tempTarget), 10);
                    }
                    uiManager.updateStats();
                } else {
                    edge.data('used', true);
                    edge.removeClass('unused');
                    uiManager.updateStats();
                }
            }
        },
        
        resetGame() {
            console.log("Resetting game state...");
            const savedMinimumConsumption = gameState.minimumConsumption;

            gameState.cy.edges('[virtual]').remove();
            gameState.cy.edges(':not([virtual])').forEach(edge => {
                edge.data('used', true);
                edge.removeClass('unused');
            });
            gameState.cy.nodes().removeClass('available selected');
            gameState.userPairs.forEach(pair => pair.connected = false);
            
            gameState.reset();
            gameState.minimumConsumption = savedMinimumConsumption;

            if (gameState.antennaSettings.consumptionEnabled) {
                gameState.cy.nodes('[type="antenna"]').forEach(antenna => {
                    antenna.data('active', true);
                    gameState.activeAntenas.add(antenna.id());
                    this.updateAntennaAppearance(antenna, true);
                });
            }

            if (eventHandlers && eventHandlers.refreshAllEdgeVisuals) {
                eventHandlers.refreshAllEdgeVisuals();
            }

            uiManager.updateStats();
            uiManager.updateCapacityButtonUI();
            this.startPhase1();
        },

        toggleAntennaState(antennaNode) {
            if (gameState.phase !== 5 || !gameState.antennaSettings.consumptionEnabled) return;

            const antennaId = antennaNode.id();
            const isActive = antennaNode.data('active');

            let isAntennaInUse = false;
            for (const pathData of gameState.completedPaths) {
                if (pathData.path.includes(antennaId)) {
                    isAntennaInUse = true;
                    break;
                }
            }

            if (isActive && isAntennaInUse) {
                uiManager.showNotification("Cette antenne est utilisée par un chemin et ne peut être éteinte.", "error");
                return;
            }
            
            const newActiveState = !isActive;

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
                gameState.activeAntenas.add(antennaId);
            } else {
                gameState.activeAntenas.delete(antennaId);
            }
            
            this.updateAntennaAppearance(antennaNode, newActiveState);
            uiManager.updateStats();
        },

        updateAntennaAppearance(antennaNode, isActive) {
            if (!antennaNode || antennaNode.length === 0) return;
            
            if (isActive) {
                antennaNode.style('background-image', '../../../icons/antenna_icon_on_white.png');
            } else {
                antennaNode.style('background-image', '../../../icons/antenna_icon_off_white.png');
            }

            const haloNode = gameState.cy.getElementById(antennaNode.data('haloId'));
            if (haloNode.length > 0) {
                if (window.setHaloVisibility) {
                    window.setHaloVisibility(haloNode, isActive);
                }
            }
        },
    };
    
    return gamePhases;
}