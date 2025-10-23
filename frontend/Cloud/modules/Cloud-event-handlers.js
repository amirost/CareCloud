// RV-event-handlers.js - Handles Cytoscape events and interactions

export function initEventHandlers(gameState, uiManager) {
    const eventHandlers = {
        // Setup Cytoscape event handlers
        setupEventHandlers(gamePhases) {
            if (!gameState.cy) {
                console.error("Cannot set up event handlers: Cytoscape instance not initialized");
                return;
            }
            
            console.log("Setting up CLOUD event handlers with game phases");
            
            gameState.cy.removeListener('tap');
            
            // --- GESTION DES CLICS SUR LES NŒUDS ---
            gameState.cy.on('tap', 'node', function(event) {
                const node = event.target;
                
                if (node.data('type') === 'antenna-halo') return;
                
                const nodeType = node.data('type');
                const userType = node.data('userType');

                console.log(`Node clicked: ${node.id()}, Type: ${nodeType}, UserType: ${userType}, Phase: ${gameState.phase}`);
                
                 if (nodeType === 'task-creator') {
                    const clientNode = gameState.cy.getElementById(node.data('parentId'));
                    if (clientNode.length > 0) {
                        console.groupCollapsed(`[Info Tâches] Clic sur l'icône de ${clientNode.id()}`);
                        console.log("Nœud client trouvé :", clientNode.data());
                        console.log("Tâches associées (depuis node.data('tasks')) :", clientNode.data('tasks'));
                        console.groupEnd();
                        uiManager.showTaskInfoPopup(clientNode);
                    }
                    if (gameState.currentPath) {
                        gameState.currentPath = null;
                        gameState.cy.elements().unselect(); // Nettoyage visuel
                        console.log("Pending connection cancelled.");
                    }
                    return;
                }

                // CAS 2: Clic sur un NŒUD TÉLÉPHONE -> OUVRE LE PLACEMENT LOCAL
                if (nodeType === 'phone-config') {
                    const clientNode = gameState.cy.getElementById(node.data('parentId'));
                    if (clientNode.length > 0) {
                        uiManager.showTaskPlacementPopup(clientNode.id(), 'phone');
                    }
                    if (gameState.currentPath) {
                        gameState.currentPath = null;
                        gameState.cy.elements().unselect();
                        console.log("Pending connection cancelled.");
                    }
                    return;
                }
                
                // CAS 3: Clic sur le NŒUD CLOUD -> OUVRE LE PLACEMENT GLOBAL
                if (nodeType === 'cloud') {
                    uiManager.showTaskPlacementPopup(null, 'cloud'); // null = pas de client pré-sélectionné
                    if (gameState.currentPath) {
                        gameState.currentPath = null;
                        gameState.cy.elements().unselect();
                        console.log("Pending connection cancelled.");
                    }
                    return;
                }

                // --- Actions qui dépendent des phases de jeu (logique de connexion) ---
                
                const handlers = {
                    1: () => gamePhases.handleUserSelection(node),
                    2: () => gamePhases.handleAntennaSelection(node),
                    3: () => gamePhases.handlePathSelection(node),
                    5: () => { // Phase d'optimisation
                        if (nodeType === 'antenna' && gameState.antennaSettings.consumptionEnabled) {
                            gamePhases.toggleAntennaState(node);
                        }
                    }
                };
                
                if (handlers[gameState.phase]) {
                    handlers[gameState.phase]();
                }
            });
            
            gameState.cy.removeListener('mouseover', 'edge');
            gameState.cy.removeListener('mouseout', 'edge');

            // Mouse over event pour les liens
            gameState.cy.on('mouseover', 'edge', function(event) {
                const edge = event.target;
                
                if (edge.data('virtual')) {
                    return;
                }

                const capacity = edge.data('capacity') || 0;
                const consumption = edge.data('consumption') || 0;

                const content = `
                    <div class="tooltip-info">
                        <span>Capacité:</span>
                        <span>${capacity}</span>
                    </div>
                    <div class="tooltip-info">
                        <span>Conso.:</span>
                        <span>${consumption.toFixed(0)} W</span>
                    </div>
                `;

                const posX = event.originalEvent.clientX;
                const posY = event.originalEvent.clientY;
                
                uiManager.showTooltip(content, posX, posY);
            });

            // Mouse out event pour les liens
            gameState.cy.on('mouseout', 'edge', function(event) {
                uiManager.hideTooltip();
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
            
            gameState.cy.nodes('[type="antenna"]').forEach(antenna => {
                const antennaPos = antenna.position();
                const radius = antenna.data('radius') || 50;
                
                const distance = Math.sqrt(
                    Math.pow(userPos.x - antennaPos.x, 2) + 
                    Math.pow(userPos.y - antennaPos.y, 2)
                );
                
                if (distance <= radius) {
                    antenna.addClass('available');
                }
            });
        },
        
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
            
            const connectedEdges = currentNode.connectedEdges().filter(edge => {
                const edgeId = edge.id();
                const usedCount = gameState.usedLinks.has(edgeId) ? gameState.usedLinks.get(edgeId).length : 0;
                return usedCount < edge.data('capacity');
            });
            
            connectedEdges.forEach(edge => {
                const otherNode = edge.source().id() === gameState.currentPath.current ? edge.target() : edge.source();
                
                if (otherNode.data('type') === 'router' && !gameState.currentPath.route.includes(otherNode.id())) {
                    otherNode.addClass('available');
                }
                
                if (gameState.connectionTarget === 'user') {
                    if (otherNode.data('type') === 'antenna') {
                        const secondUserId = eventHandlers.getSecondUserId();
                        if (secondUserId && eventHandlers.canAntennaReachUser(otherNode, secondUserId)) {
                            otherNode.addClass('available');
                        }
                    }
                } else if (gameState.connectionTarget === 'cloud') {
                    if (otherNode.data('type') === 'router') {
                        const neighbors = otherNode.neighborhood('node');
                        if (neighbors.some(n => n.id() === gameState.cloudNode.id())) {
                            otherNode.addClass('available');
                        }
                    }
                }
            });
        },
        
        getSecondUserId() {
            const currentPair = gameState.userPairs[gameState.currentUserPair];
            if (!currentPair || currentPair.users.length < 2) return null;
            
            return currentPair.users.find(id => id !== gameState.selectedUser);
        },

        createVirtualConnection(sourceId, targetId, color) {
            const edgeId = `virtual-edge-${sourceId}-${targetId}`;
            if (gameState.cy.getElementById(edgeId).length > 0) return;

            gameState.cy.add({
                group: 'edges',
                data: { id: edgeId, source: sourceId, target: targetId, virtual: true },
                style: { 'line-color': color, width: 3 }
            });
        },
        
        updateEdgeVisualization(edge) {
            const edgeId = edge.id();
            const colorList = gameState.usedLinks.get(edgeId);

            if (!colorList || colorList.length === 0) {
                gameState.cy.edges(`[parent = "${edgeId}"]`).remove();
                return;
            }

            edge.data('used', true);
            gameState.cy.edges(`[parent = "${edgeId}"]`).remove();

            const sourceId = edge.source().id();
            const targetId = edge.target().id();
            const edgeCount = colorList.length;
            
            const edgesToAdd = [];
            
            for (let i = 0; i < edgeCount; i++) {
                const virtualEdgeId = `inner-${edgeId}-${i}`;
                let offset = 0;
                if (edgeCount > 1) {
                    offset = 20 * (i - (edgeCount - 1) / 2);
                }
                
                edgesToAdd.push({
                    group: 'edges',
                    data: { id: virtualEdgeId, source: sourceId, target: targetId, virtual: true, parent: edgeId, offset: offset }
                });
            }

            const addedEdges = gameState.cy.add(edgesToAdd);
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
        },

        refreshAllEdgeVisuals() {
            console.log("%c[Visuals] Rafraîchissement global de la visualisation des liens...", "font-weight: bold; color: teal;");
            gameState.cy.edges('[virtual][parent]').remove();
            gameState.usedLinks.forEach((linkInfo, edgeId) => {
                const edge = gameState.cy.getElementById(edgeId);
                if (edge.length > 0) {
                    this.updateEdgeVisualization(edge);
                }
            });
        },
    };
    
    return eventHandlers;
}