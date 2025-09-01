// SC-path-finder.js - Handles automated antenna optimization for the SC game

import { setHaloVisibility } from './SC-styles.js';

export function initPathFinder(gameState, uiManager) {
    return {
        // Met en place les écouteurs d'événements pour les boutons
        setupPathFinderButtons() {
            // Bouton pour la solution optimale SAUVEGARDÉE
            const applyOptimalBtn = document.getElementById('applyOptimalBtn');
            if (applyOptimalBtn) {
                applyOptimalBtn.addEventListener('click', () => {
                    this.applyOptimalSolution();
                });
                console.log("Optimal solution button initialized for SC");
            } else {
                console.warn("Button with ID 'applyOptimalBtn' not found.");
            }

            // Bouton pour la solution GLOUTONNE
            const applyGreedyBtn = document.getElementById('applyGreedyBtn');
            if (applyGreedyBtn) {
                applyGreedyBtn.addEventListener('click', () => {
                    this.applyGreedySolution();
                });
                console.log("Greedy solution button initialized for SC");
            } else {
                console.warn("Button with ID 'applyGreedyBtn' not found.");
            }
        },
        
        // Applique la solution optimale SAUVEGARDÉE
        applyOptimalSolution() {
            if (!gameState.optimalAntennaSet || gameState.optimalAntennaSet.length === 0) {
                uiManager.showNotification("Aucune solution optimale enregistrée pour ce niveau", "error");
                return;
            }
            
            const savedMinimumConsumption = gameState.minimumConsumption;
            
            if (gameState.gamePhases && gameState.gamePhases.resetGame) {
                gameState.gamePhases.resetGame();
            }
            gameState.applyingSolution = true;
            gameState.minimumConsumption = savedMinimumConsumption;

            const optimalAntennas = new Set(gameState.optimalAntennaSet);
            this.applyAntennaSet(optimalAntennas);
            
            uiManager.showNotification("Solution optimale appliquée avec succès!", "success");
            
            setTimeout(() => {
                gameState.applyingSolution = false;
                console.log("Flag 'applyingSolution' set to false.");
            }, 3000);
        },
        
        // Applique la solution GLOUTONNE calculée
        applyGreedySolution() {
            
            const savedMinimumConsumption = gameState.minimumConsumption;
            const minimalAntennaSet = this.calculateGreedySet();
            
            if (!minimalAntennaSet || minimalAntennaSet.size === 0) {
                uiManager.showNotification("L'algorithme glouton n'a trouvé aucune solution.", "error");
                gameState.applyingSolution = false;
                return;
            }
            
            if (gameState.gamePhases && gameState.gamePhases.resetGame) {
                gameState.gamePhases.resetGame();
            }
            gameState.applyingSolution = true;
            gameState.minimumConsumption = savedMinimumConsumption;

            this.applyAntennaSet(minimalAntennaSet);
            
            uiManager.showNotification("Solution gloutonne appliquée!", "info");
            
            setTimeout(() => {
                gameState.applyingSolution = false;
                console.log("Flag 'applyingSolution' set to false.");
            }, 3000);
        },

        // Fonction pour appliquer un ensemble d'antennes (factorise le code)
        applyAntennaSet(antennaSet) {
            console.log("Applying antenna set:", antennaSet);
            // Met à jour l'état visuel de chaque antenne
            gameState.cy.nodes('[type="antenna"]').forEach(antennaNode => {
                const isActive = antennaSet.has(antennaNode.id());
                antennaNode.data('active', isActive);
                if (gameState.gamePhases && gameState.gamePhases.updateAntennaAppearance) {
                    gameState.gamePhases.updateAntennaAppearance(antennaNode, isActive);
                }
            });
            
            // Met à jour l'état global
            gameState.activeAntennas = antennaSet;
            
            // Reconnecte les utilisateurs en suivant la nouvelle logique de densité
            this.reconnectUsersToSet(antennaSet); 
            
            // Met à jour les stats et passe à la phase d'optimisation
            uiManager.updateStats();
            if (gameState.gamePhases) {
                gameState.gamePhases.startPhase3();
            }
        },

        // Fonction de calcul de l'algorithme glouton (Set Cover)
        calculateGreedySet() {
            console.log("Starting greedy algorithm calculation...");
            
            if (!gameState.eventHandlers || !gameState.eventHandlers.canAntennaReachUser) {
                console.error("Greedy Error: 'canAntennaReachUser' is missing.");
                return null;
            }

            // 1. Définir l'univers des utilisateurs à couvrir
            const usersToCover = new Set(gameState.cy.nodes('[type="user"]').map(u => u.id()));
            const selectedAntennas = new Set();
            
            // 2. Calculer la portée potentielle de chaque antenne une bonne fois pour toutes
            const antennaCoverageMap = new Map();
            gameState.cy.nodes('[type="antenna"]').forEach(antenna => {
                const usersInRange = new Set();
                gameState.cy.nodes('[type="user"]').forEach(user => {
                    if (gameState.eventHandlers.canAntennaReachUser(antenna, user)) {
                        usersInRange.add(user.id());
                    }
                });
                antennaCoverageMap.set(antenna.id(), usersInRange);
            });

            // 3. Boucle principale de l'algorithme
            while (usersToCover.size > 0) {
                let bestAntennaId = null;
                let maxNewUsersCovered = -1;

                // 3a. Trouver l'antenne qui couvre le plus d'utilisateurs NON ENCORE couverts
                antennaCoverageMap.forEach((usersInRange, antennaId) => {
                    if (selectedAntennas.has(antennaId)) return;

                    const newCoverage = new Set([...usersInRange].filter(userId => usersToCover.has(userId)));
                    
                    if (newCoverage.size > maxNewUsersCovered) {
                        maxNewUsersCovered = newCoverage.size;
                        bestAntennaId = antennaId;
                    }
                });

                // 3b. Gérer le cas où aucune solution n'est possible
                if (bestAntennaId === null) {
                    console.error("Greedy Error: Could not cover all users. Remaining:", Array.from(usersToCover));
                    break; 
                }

                // 3c. Sélectionner la meilleure antenne et mettre à jour les utilisateurs couverts
                selectedAntennas.add(bestAntennaId);
                const usersNowCovered = antennaCoverageMap.get(bestAntennaId);
                usersNowCovered.forEach(userId => usersToCover.delete(userId));
                
                console.log(`Greedy Step: Chose ${bestAntennaId}, covered ${maxNewUsersCovered} new users. Left: ${usersToCover.size}`);
            }
            
            return selectedAntennas;
        },
        
        // Reconnecte les utilisateurs à un ensemble d'antennes en se basant sur la DENSITÉ
        reconnectUsersToSet(activeAntennaSet) {
            // Nettoyage initial
            gameState.cy.edges('[virtual]').remove();
            gameState.connectedUsers.clear();
            gameState.antennaUsers.clear();
            
            if (!gameState.eventHandlers || !gameState.eventHandlers.canAntennaReachUser) {
                console.error("Reconnect Error: 'canAntennaReachUser' is missing.");
                return;
            }

            // Étape 1 : Pré-calculer la "valeur" de chaque antenne active (combien d'utilisateurs elle couvre au total)
            const antennaUserCount = new Map();
            activeAntennaSet.forEach(antennaId => {
                const antennaNode = gameState.cy.getElementById(antennaId);
                if (antennaNode.length === 0) return;

                let count = 0;
                gameState.cy.nodes('[type="user"]').forEach(userNode => {
                    if (gameState.eventHandlers.canAntennaReachUser(antennaNode, userNode)) {
                        count++;
                    }
                });
                antennaUserCount.set(antennaId, count);
            });
            console.log("Antenna density calculated:", antennaUserCount);

            // Étape 2 : Pour chaque utilisateur, trouver sa meilleure antenne en se basant sur la "valeur" calculée.
            gameState.cy.nodes('[type="user"]').forEach(userNode => {
                const userId = userNode.id();
                let bestAntennaId = null;
                let maxUsersInBestAntenna = -1;

                // Trouver toutes les antennes actives à portée de cet utilisateur
                const availableAntennas = [];
                activeAntennaSet.forEach(antennaId => {
                    const antennaNode = gameState.cy.getElementById(antennaId);
                    if (antennaNode.length > 0 && gameState.eventHandlers.canAntennaReachUser(antennaNode, userNode)) {
                        availableAntennas.push(antennaId);
                    }
                });

                // Parmi ces antennes disponibles, choisir celle qui a la plus grande "valeur" (densité)
                availableAntennas.forEach(antennaId => {
                    const userCount = antennaUserCount.get(antennaId) || 0;
                    if (userCount > maxUsersInBestAntenna) {
                        maxUsersInBestAntenna = userCount;
                        bestAntennaId = antennaId;
                    }
                });
                
                // Étape 3 : Connecter l'utilisateur à la meilleure antenne trouvée
                if (bestAntennaId) {
                    const color = userNode.style('background-color');
                    if (gameState.eventHandlers.createVirtualConnection) {
                       gameState.eventHandlers.createVirtualConnection(userId, bestAntennaId, color);
                    }

                    gameState.connectedUsers.add(userId);
                    if (!gameState.antennaUsers.has(bestAntennaId)) {
                        gameState.antennaUsers.set(bestAntennaId, new Set());
                    }
                    gameState.antennaUsers.get(bestAntennaId).add(userId);
                } else {
                    console.warn(`User ${userId} could not be connected to any antenna in the provided set.`);
                }
            });
        }
    };
}