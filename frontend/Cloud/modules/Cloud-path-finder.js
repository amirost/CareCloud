// RV-path-finder.js - Handles automated path finding for the RV game

export function initPathFinder(gameState, uiManager) {
    
    function backupPlayerSolution() {
        const usedLinksBackup = new Map();
        gameState.usedLinks.forEach((colors, edgeId) => {
            usedLinksBackup.set(edgeId, [...colors]);
        });

        const physicalEdgesState = {};
        gameState.cy.edges(':not([virtual])').forEach(edge => {
            physicalEdgesState[edge.id()] = edge.data('used');
        });

        // ** NOUVEAU : Sauvegarde de l'état des antennes **
        const activeAntennasBackup = new Set(gameState.activeAntennas);

        gameState.playerSolutionBackup = {
            usedLinks: usedLinksBackup,
            connectedUsers: new Set(gameState.connectedUsers),
            completedPaths: JSON.parse(JSON.stringify(gameState.completedPaths)),
            userPairs: JSON.parse(JSON.stringify(gameState.userPairs)),
            physicalEdgesState: physicalEdgesState,
            activeAntennas: activeAntennasBackup // On ajoute la sauvegarde
        };
        console.log("Player solution backed up (deep copy):", gameState.playerSolutionBackup);
        uiManager.showRestoreButton(true);
    }

    return {
        // Set up event listeners for path-finder buttons
        setupPathFinderButtons() {

            const restoreBtn = document.getElementById('restorePlayerSolutionBtn');
            if (restoreBtn) {
                restoreBtn.addEventListener('click', () => this.restorePlayerSolution());
            }

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
            backupPlayerSolution();
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
                //this.optimizeUnusedLinks();
            } else if (allConnected) {
                uiManager.showNotification("Toutes les paires d'utilisateurs sont maintenant connectées", "success");
                // If all users are connected, optimize by turning off unused links
                //this.optimizeUnusedLinks();
                gameState.gamePhases.startPhase5();
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
                    //this.optimizeUnusedLinks();
                    gameState.gamePhases.startPhase5();
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
                        //this.optimizeUnusedLinks();
                        gameState.gamePhases.startPhase5();
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
                    //this.optimizeUnusedLinks();
                    gameState.gamePhases.startPhase5();
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
                    //this.optimizeUnusedLinks();
                    gameState.gamePhases.startPhase5();
                }
            } else {
                uiManager.showNotification("Impossible de connecter la paire d'utilisateurs", "error");
            }
        },
        
        // Apply the saved optimal solution if one exists
    applyOptimalSolution() {
            if (!gameState.optimalPathSolution || gameState.optimalPathSolution.length === 0) {
                uiManager.showNotification("Aucune solution optimale enregistrée pour ce niveau.", "error");
                return;
            }
            console.log("%c--- Application de la Solution Optimale ---", "color: blue; font-size: 16px; font-weight: bold;");
            console.log("------------------Antenna settings loaded from graph data:", gameState.antennaSettings);

            backupPlayerSolution();
            if (gameState.gamePhases) {
                gameState.gamePhases.resetGame();
            }
            console.log("***************Antenna settings loaded from graph data:", gameState.antennaSettings);

            gameState.applyingSolution = true;
            // 
            // Vider les états pour reconstruire à partir de la solution
            gameState.usedLinks.clear();
            gameState.completedPaths = [];
            gameState.connectedUsers.clear();

            // Reconstruire l'état des CHEMINS en se basant sur la solution
            gameState.optimalPathSolution.forEach(solutionPath => {
                const { color, path } = solutionPath;
                if (!path || path.length < 2) return;

                const user1Id = path[0];
                const user2Id = path[path.length - 1];
                gameState.connectedUsers.add(user1Id);
                gameState.connectedUsers.add(user2Id);
                const pair = gameState.userPairs.find(p => p.users.includes(user1Id));
                if (pair) pair.connected = true;

                this.connectUserToAntenna(gameState.cy.getElementById(path[0]), gameState.cy.getElementById(path[1]), color);
                this.connectUserToAntenna(gameState.cy.getElementById(path[path.length - 1]), gameState.cy.getElementById(path[path.length - 2]), color);

                for (let i = 1; i < path.length - 2; i++) {
                    const sourceNode = gameState.cy.getElementById(path[i]);
                    const targetNode = gameState.cy.getElementById(path[i + 1]);
                    if (sourceNode && targetNode) {
                        const edge = sourceNode.edgesWith(targetNode).filter(e => !e.data('virtual')).first();
                        if (edge.length > 0) {
                            const edgeId = edge.id();
                            if (!gameState.usedLinks.has(edgeId)) {
                                gameState.usedLinks.set(edgeId, []);
                            }
                            gameState.usedLinks.get(edgeId).push(color);
                        }
                    }
                }
            });
            gameState.completedPaths = gameState.optimalPathSolution;

            // LOGS ET LOGIQUE POUR LES LIENS ET ANTENNES
            console.groupCollapsed('[Solution] Optimisation des liens et antennes');

            // 1. Optimiser les liens physiques
            this.optimizeUnusedLinks();
            
            // 2. Optimiser les antennes
            if (gameState.antennaSettings.consumptionEnabled) {
                if (gameState.optimalAntennaSet && gameState.optimalAntennaSet.length > 0) {
                    console.log("Configuration d'antennes sauvegardée (depuis la BDD) trouvée:", gameState.optimalAntennaSet);
                    const optimalAntennas = new Set(gameState.optimalAntennaSet);
                    const usedAntennas = [];
                    const unusedAntennas = [];
                    
                    // On vide l'état des antennes actives avant de le reconstruire
                    gameState.activeAntennas.clear();
                    
                    gameState.cy.nodes('[type="antenna"]').forEach(antenna => {
                        const antennaId = antenna.id();
                        const shouldBeActive = optimalAntennas.has(antennaId);
                        
                        antenna.data('active', shouldBeActive);
                        
                        if (shouldBeActive) {
                            gameState.activeAntennas.add(antennaId);
                            usedAntennas.push(antennaId);
                        } else {
                            unusedAntennas.push(antennaId);
                        }
                        if (gameState.gamePhases) {
                            gameState.gamePhases.updateAntennaAppearance(antenna, shouldBeActive);
                        }
                    });
                    
                    console.log(`Antennes utilisées (${usedAntennas.length}):`, usedAntennas);
                    console.log(`Antennes non utilisées (${unusedAntennas.length}):`, unusedAntennas);
                } else {
                    console.log("Aucune configuration d'antennes sauvegardée. Toutes les antennes restent allumées.");
                }
            } else {
                console.log("La consommation des antennes n'est pas activée pour ce niveau.");
            }
            console.groupEnd();

            // Finaliser l'affichage
            if (gameState.eventHandlers) {
                gameState.eventHandlers.refreshAllEdgeVisuals();
            }
            uiManager.updateStats();
            uiManager.showNotification("Solution optimale appliquée avec succès !", "success");

            console.groupCollapsed('[Solution] Valeurs de consommation');
            console.log(`Consommation Maximale (initiale) : ${gameState.initialConsumption.toFixed(0)} W`);
            console.log(`Consommation Optimale (cible) : ${gameState.minimumConsumption.toFixed(0)} W`);
            console.groupEnd();
            
            if (gameState.gamePhases) {
                gameState.gamePhases.startPhase5();
            }
            setTimeout(() => { gameState.applyingSolution = false; }, 100);
        },

        restorePlayerSolution() {
            if (!gameState.playerSolutionBackup) {
                uiManager.showNotification("Aucune solution à restaurer.", "info");
                return;
            }
            console.log("Restoring player solution...");

            // 1. Restaurer les données
            gameState.usedLinks = gameState.playerSolutionBackup.usedLinks;
            gameState.connectedUsers = gameState.playerSolutionBackup.connectedUsers;
            gameState.completedPaths = gameState.playerSolutionBackup.completedPaths;
            gameState.userPairs = gameState.playerSolutionBackup.userPairs;
            gameState.activeAntennas = gameState.playerSolutionBackup.activeAntennas; // Restaure les antennes actives
            console.log("antennes de merdde ", gameState.activeAntennas);
            // 2. Nettoyer l'affichage
            gameState.cy.edges('[virtual]').remove();

            // 3. Redessiner
            const { physicalEdgesState } = gameState.playerSolutionBackup;
            if (physicalEdgesState) {
                gameState.cy.edges(':not([virtual])').forEach(edge => {
                    const savedState = physicalEdgesState[edge.id()];
                    edge.data('used', savedState !== undefined ? savedState : true);
                    edge.toggleClass('unused', savedState === false);
                });
            }

            if(gameState.antennaSettings.consumptionEnabled) {
                gameState.cy.nodes('[type="antenna"]').forEach(antenna => {
                    const isActive = gameState.activeAntennas.has(antenna.id());
                    antenna.data('active', isActive);
                    if(gameState.gamePhases) gameState.gamePhases.updateAntennaAppearance(antenna, isActive);
                });
            }
            
            // Redessiner les liens user-antenne et parallèles
            gameState.completedPaths.forEach(pathData => { /* ... (code inchangé) ... */ });
            if (gameState.eventHandlers) {
                gameState.eventHandlers.refreshAllEdgeVisuals();
            }

            // 4. Finaliser
            uiManager.updateStats();
            if (gameState.gamePhases) gameState.gamePhases.startPhase1(); 
            uiManager.showRestoreButton(false);
            gameState.playerSolutionBackup = null;
        },

        
        // Helper method to connect a user pair
        connectUserPair(user1, user2, pair, pairIndex) {
            console.log(`Connecting pair ${pairIndex}: ${user1.id()} -> ${user2.id()}`);
            
            const bestAntennaForUser1 = this.findBestAntenna(user1, user2);
            
            if (!bestAntennaForUser1) {
                console.error("No antenna in range for first user");
                return false;
            }
            
            this.connectUserToAntenna(user1, bestAntennaForUser1, pair.color);
            
            const user2Pos = user2.position();
            const antennaPos = bestAntennaForUser1.position();
            const radius = bestAntennaForUser1.data('radius') || 50;
            const distance = Math.sqrt(
                Math.pow(user2Pos.x - antennaPos.x, 2) + 
                Math.pow(user2Pos.y - antennaPos.y, 2)
            );
            
            let finalPath = [];

            if (distance <= radius) {
                console.log(`Both users can connect to the same antenna: ${bestAntennaForUser1.id()}`);
                this.connectUserToAntenna(user2, bestAntennaForUser1, pair.color);
                finalPath = [user1.id(), bestAntennaForUser1.id(), user2.id()];
            } else {
                const bestAntennaForUser2 = this.findBestAntenna(user2, user1);
                if (!bestAntennaForUser2) {
                    console.error("No antenna in range for second user");
                    return false;
                }
                
                this.connectUserToAntenna(user2, bestAntennaForUser2, pair.color);
                const pathResult = this.findShortestPath(bestAntennaForUser1, bestAntennaForUser2);
                
                if (!pathResult || pathResult.length === 0) {
                    console.error("No valid path found between antennas");
                    return false;
                }
                
                this.createPathConnections(pathResult, pair.color);
                
                const physicalPathNodeIds = pathResult.nodes().map(node => node.id());
                finalPath = [user1.id(), ...physicalPathNodeIds, user2.id()];
            }

            if (finalPath.length > 0) {
                gameState.completedPaths.push({
                    color: pair.color,
                    path: finalPath
                });
                console.log(`Pathfinder stored completed path:`, finalPath);
            }

            // ** LA CORRECTION EST ICI **
            // AFFICHER LE TEXTE FLOTTANT SUR LE DEUXIÈME UTILISATEUR
            const secondUserNode = user2; // C'est notre cible
            if (secondUserNode.length > 0) {
                const cyContainer = document.getElementById('cy'); 
                const tempTarget = document.createElement('div');
                const pos = secondUserNode.renderedPosition();
                const containerRect = cyContainer.getBoundingClientRect();
                tempTarget.style.position = 'absolute';
                tempTarget.style.left = `${containerRect.left + pos.x}px`;
                tempTarget.style.top = `${containerRect.top + pos.y}px`;
                document.body.appendChild(tempTarget);

                uiManager.createFloatingText('Connecté !', tempTarget, 'plus');
                
                setTimeout(() => document.body.removeChild(tempTarget), 10);
            }

            // Mark the pair as connected
            pair.connected = true;
            gameState.connectedUsers.add(user1.id());
            gameState.connectedUsers.add(user2.id());
            
            return true;
        },
        
        // Find the nearest antenna to a user that is in range
        findBestAntenna(userNode, destinationUserNode = null) {
            const inRangeAntennas = this.findAllAntennasInRange(userNode);
            
            if (inRangeAntennas.length === 0) {
                return null;
            }
            
            if (inRangeAntennas.length === 1) {
                return inRangeAntennas[0];
            }
            
            if (destinationUserNode) {
                const destinationAntennas = this.findAllAntennasInRange(destinationUserNode);
                
                if (destinationAntennas.length > 0) {
                    let bestSourceAntenna = null;
                    let shortestPathLength = Infinity;
                    
                    for (const sourceAntenna of inRangeAntennas) {
                        for (const destAntenna of destinationAntennas) {
                            if (sourceAntenna.id() === destAntenna.id()) {
                                return sourceAntenna;
                            }
                            
                            const path = this.findShortestPath(sourceAntenna, destAntenna);
                            
                            if (path && path.length > 0) {
                                const pathLength = path.filter(ele => ele.isEdge()).length;
                                
                                if (pathLength < shortestPathLength) {
                                    shortestPathLength = pathLength;
                                    bestSourceAntenna = sourceAntenna;
                                }
                            }
                        }
                    }
                    
                    if (bestSourceAntenna) {
                        return bestSourceAntenna;
                    }
                }
            }
            
            let bestAntenna = null;
            let bestScore = -Infinity;
            
            for (const antenna of inRangeAntennas) {
                let score = 0;
                
                const userPos = userNode.position();
                const antennaPos = antenna.position();
                const radius = antenna.data('radius') || 50;
                const distance = Math.sqrt(
                    Math.pow(userPos.x - antennaPos.x, 2) + 
                    Math.pow(userPos.y - antennaPos.y, 2)
                );
                
                const distanceScore = 1 - (distance / radius);
                score += distanceScore;
                
                const antennaId = antenna.id();
                if (gameState.antennaUsers && gameState.antennaUsers.has(antennaId)) {
                    score += 2;
                }
                
                const connectedEdges = antenna.connectedEdges().length;
                score += Math.min(2, connectedEdges / 3);
                
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
                
                if (distance <= radius) {
                    inRangeAntennas.push(antenna);
                }
            });
            
            return inRangeAntennas;
        },
        
        // Connect a user to an antenna with a virtual edge
        connectUserToAntenna(userNode, antennaNode, color) {
            const edgeId = `virtual-edge-${userNode.id()}-${antennaNode.id()}`;
            
            const existingEdge = gameState.cy.getElementById(edgeId);
            if (existingEdge.length > 0) {
                console.log(`Edge ${edgeId} already exists`);
                return existingEdge;
            }
            
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
                        // 1. Ignore virtual links (user-antenna connections)
                        if (edge.data('virtual')) {
                            return Infinity; // This link is not part of the physical network
                        }

                        // 2. Check if the link is at full capacity
                        const edgeId = edge.id();
                        const capacity = edge.data('capacity') || 1;
                        
                        const currentUsage = gameState.usedLinks.has(edgeId) 
                            ? gameState.usedLinks.get(edgeId).length 
                            : 0;
                        
                        // If the link is full, it's impassable for this search
                        if (currentUsage >= capacity) {
                            return Infinity; 
                        }

                        // 3. If the link is usable, it has a weight of 1.
                        // Since all usable links have the same weight, the algorithm
                        // will find the path with the fewest links.
                        return 1; 
                    }
                });
                
                // Get the path from start to end
                const pathToEnd = dijkstra.pathTo(endNode);

                if (pathToEnd.length === 0) {
                    console.warn(`No path found from ${startNode.id()} to ${endNode.id()}. This might be due to full capacity links.`);
                }
                
                return pathToEnd;
            } catch (error) {
                console.error("Error finding shortest path:", error);
                return null;
            }
        },
        
        // Create connections along a path with a specific color
        createPathConnections(path, color) {
            if (!path || path.length < 2) {
                console.error("Invalid path provided");
                return;
            }
            
            const pathEdges = path.filter(ele => ele.isEdge());
            
            pathEdges.forEach(edge => {
                const edgeId = edge.id();
                
                if (!gameState.usedLinks.has(edgeId)) {
                    gameState.usedLinks.set(edgeId, []);
                }
                
                const colorList = gameState.usedLinks.get(edgeId);
                colorList.push(color);
                
                edge.data('used', true);
                
                if (gameState.eventHandlers && 
                    gameState.eventHandlers.updateEdgeVisualization) {
                    try {
                        gameState.eventHandlers.updateEdgeVisualization(edge);
                    } catch (error) {
                        console.warn("Couldn't access updateEdgeVisualization, using fallback...");
                        this.fallbackEdgeVisualization(edge, color);
                    }
                } else {
                    this.fallbackEdgeVisualization(edge, color);
                }
            });
        },
        
        // Fallback method to visualize edges when the event handler isn't available
        fallbackEdgeVisualization(edge, color) {
            const edgeId = edge.id();
            edge.data('used', true);
            
            try {
                const sourceId = edge.source().id();
                const targetId = edge.target().id();
                const virtualEdgeId = `overlay-${edgeId}-${Math.round(Math.random() * 10000)}`;
                
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
                
            } catch (error) {
                console.warn(`Could not create overlay, applying highlight to original edge ${edgeId}`, error);
                edge.addClass('path');
                try {
                    edge.style('line-color', color);
                } catch (styleError) {
                    console.error('Failed to apply even basic styling', styleError);
                }
            }
        },
        
        // Optimize by turning off unused links
        optimizeUnusedLinks() {
            console.log("Optimizing by turning off unused links");
            
            gameState.cy.edges().forEach(edge => {
                if (!edge.data('virtual') && !gameState.usedLinks.has(edge.id())) {
                    edge.data('used', false);
                    edge.addClass('unused');
                }
            });
            
            uiManager.updateStats();
            
            if (gameState.gamePhases && typeof gameState.gamePhases.startPhase5 === 'function') {
                gameState.gamePhases.startPhase5();
            } else {
                gameState.phase = 5;
                uiManager.setPopupMessage("Tous les utilisateurs sont connectés ! Optimisez en désactivant les liens inutilisés");
            }
        }
    };
}