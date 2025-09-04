// SC-ui-manager.js - Handles UI elements and interactions for Set Cover game
import { setHaloVisibility } from './SC-styles.js';

export function initUIManager(gameState) {
    // DOM Elements
    const ui = {
        levelSelection: document.getElementById("level-selection"),
        gameplay: document.getElementById("gameplay"),
        graphList: document.getElementById("graphList"),
        graphListLoading: document.getElementById("graphListLoading"),
        backHomeBtn: document.getElementById("backHomeBtn"),
        returnToLevelsBtn: document.getElementById("returnToLevelsBtn"),
        homeBtn: document.getElementById("homeBtn"),
        resetBtn: document.getElementById("resetBtn"),
        toggleConsumptionBtn: document.getElementById("toggleConsumptionBtn"),
        popupMessage: document.getElementById("popup-message"),
        connectedCount: document.getElementById("connected-count"),
        totalUsers: document.getElementById("total-users"),
        consumption: document.getElementById("consumption"),
        consumptionGauge: document.getElementById("consumption-gauge"),
        consumptionPercentage: document.getElementById("consumption-percentage"),
        userItemsContainer: document.getElementById("user-items-container"),
        restorePlayerSolutionBtn: document.getElementById("restorePlayerSolutionBtn"),

        gameTooltip: null
    };
    
    return {
        initTooltip() {
            let tooltip = document.getElementById('game-tooltip');
            if (!tooltip) {
                tooltip = document.createElement('div');
                tooltip.id = 'game-tooltip';
                tooltip.className = 'game-tooltip';
                document.body.appendChild(tooltip); // On l'ajoute au body pour qu'elle soit au-dessus de tout
            }
            ui.gameTooltip = tooltip;
            console.log("Tooltip element initialized.");
        },

        // NOUVELLE FONCTION : Pour afficher la bulle
        showTooltip(content, x, y) {
            if (!ui.gameTooltip) return;
            ui.gameTooltip.innerHTML = content;
            // On positionne la bulle en fonction des coordonnées de la souris
            ui.gameTooltip.style.left = `${x}px`;
            ui.gameTooltip.style.top = `${y}px`;
            ui.gameTooltip.classList.add('visible');
        },

        // NOUVELLE FONCTION : Pour cacher la bulle
        hideTooltip() {
            if (!ui.gameTooltip) return;
            ui.gameTooltip.classList.remove('visible');
        },

        showRestoreButton(show) {
            if (ui.restorePlayerSolutionBtn) {
                // On utilise 'flex' car c'est le display par défaut de .tool-button
                ui.restorePlayerSolutionBtn.style.display = show ? 'flex' : 'none';
            }
        },
        // Display the list of graphs
        displayGraphList(graphs, graphLoader) {
            ui.graphList.innerHTML = "";
            
            graphs.forEach(graph => {
                const listItem = document.createElement("li");
                listItem.className = "graph-list-item";
                
                // Format date
                const date = new Date(graph.createdAt);
                const formattedDate = date.toLocaleDateString();
                
                // Build item content
                const content = `
                    <div class="graph-info">
                        <div class="graph-name">${graph.name}</div>
                        <div class="graph-date">Créé le : ${formattedDate}</div>
                    </div>
                    <button class="play-button" data-id="${graph._id}">Jouer</button>
                `;
                
                listItem.innerHTML = content;
                
                // Add click handler for the Play button
                const playButton = listItem.querySelector(".play-button");
                playButton.addEventListener("click", () => {
                    graphLoader.startGameplay(graph._id);
                });
                
                ui.graphList.appendChild(listItem);
            });
        },
        
        // Switch from level selection to gameplay
        showGameplay() {
            ui.levelSelection.style.display = "none";
            ui.gameplay.style.display = "block";
        },
        
        // Switch from gameplay to level selection
        showLevelSelection() {
            ui.gameplay.style.display = "none";
            ui.levelSelection.style.display = "block";
            
            // Clear Cytoscape container
            if (gameState.cy) {
                gameState.cy.destroy();
                gameState.cy = null;
                window.cy = null; 
            }
            
            // Reset game state
            gameState.reset();
        },
        
        // Set popup message
        setPopupMessage(message) {
            ui.popupMessage.classList.remove('popup-update-animation');
            
            // 2. On met à jour le contenu.
            ui.popupMessage.innerHTML = message;

            // 3. On force le "reflow" du navigateur.
            void ui.popupMessage.offsetWidth;

            // 4. On ré-applique la NOUVELLE classe pour lancer l'animation.
            ui.popupMessage.classList.add('popup-update-animation');
        },
        
        // Update game statistics
        updateStats() {
            // Update connected users count
            ui.connectedCount.textContent = gameState.connectedUsers.size;
            
            // Update active antennas count
            //ui.activeAntennas.textContent = gameState.activeAntennas.size;
            
            // Calculate current consumption based on active antennas only
            let totalConsumption = 0;
            let initialConsumption = 0;
            
            // Calculate consumption from all antennas (for initial max value)
            if (gameState.cy) {
                gameState.cy.nodes('[type="antenna"]').forEach(antenna => {
                    const antennaConsumption = antenna.data('consumption') || 100;
                    initialConsumption += antennaConsumption;
                    
                    // Only count consumption for active antennas
                    if (antenna.data('active')) {
                        totalConsumption += antennaConsumption;
                    }
                });
            }
            
            // Store initial consumption if not already set
            if (!gameState.initialConsumption && initialConsumption > 0) {
                gameState.initialConsumption = initialConsumption;
            }
            
            // Use stored initial value if available
            const maxConsumption = gameState.initialConsumption || initialConsumption;

            if(ui.consumption) {
                ui.consumption.textContent = totalConsumption.toFixed(0);
            }            
            // Update the energy savings gauge
            this.updateEnergySavingsGauge(totalConsumption, maxConsumption);
            
            // Update user status items
            this.updateUserItems();
            
            // --- DÉBUT DE LA LOGIQUE D'AIDE CONTEXTUELLE CORRIGÉE ---
            
            const isWin = gameState.solutionValidator ? gameState.solutionValidator.checkWinCondition() : false;
            const areAllUsersConnected = gameState.solutionValidator ? gameState.solutionValidator.areAllUsersConnected() : false;

            // Condition 1 & 2 : On n'a pas gagné, mais tous les utilisateurs sont bien connectés.
            if (!isWin && areAllUsersConnected) {
                
                // Condition 3 : On vérifie s'il reste des antennes qui pourraient être éteintes.
                let canTurnOffMoreAntennas = false;
                gameState.cy.nodes('[type="antenna"]').forEach(antennaNode => {
                    const antennaId = antennaNode.id();
                    const isActive = antennaNode.data('active');
                    const usersOnThisAntenna = gameState.antennaUsers.get(antennaId)?.size || 0;

                    // Une antenne peut être éteinte si elle est active MAIS qu'elle n'a aucun utilisateur.
                    if (isActive && usersOnThisAntenna === 0) {
                        canTurnOffMoreAntennas = true;
                    }
                });

                // Si on ne peut plus éteindre d'antennes, c'est le moment d'afficher l'aide.
                if (!canTurnOffMoreAntennas) {
                    this.setPopupMessage("Vous êtes proche ! Essayez une autre combinaison d'antennes en cliquant sur <bold style=\"color: #ffffffff; border: 0px solid #ffffffff; border-radius: 5px; padding: 2px 4px; background: rgba(223, 86, 86, 0.9);\">Déconnecter</bold> pour un déconnecter un utilisateur");
                }
                // Sinon (s'il reste des antennes à éteindre), le message par défaut de la phase 3 ("Optimisez...") reste affiché, ce qui est correct.
            }

            // --- FIN DE LA LOGIQUE D'AIDE CONTEXTUELLE ---
            
            // Check win condition and update progress if solution validator exists
            if (gameState.solutionValidator) {
                gameState.solutionValidator.updateProgressIndicator();
            }
        },
        
        updateEnergySavingsGauge(currentConsumption, maxConsumption) {
            if (!ui.consumptionGauge || !ui.consumptionPercentage) return;

            const targetConsumption = gameState.minimumConsumption;

            // Si on n'a pas encore de cible, on utilise l'ancienne logique de couleur.
            if (targetConsumption === null || targetConsumption === undefined) {
                if (maxConsumption === 0) {
                    ui.consumptionGauge.style.width = "0%";
                    ui.consumptionPercentage.textContent = "N/A";
                    ui.consumptionGauge.style.backgroundColor = '#9e9e9e'; // Gris
                    return;
                }
                const percentage = (currentConsumption / maxConsumption) * 100;
                ui.consumptionGauge.style.width = `${Math.min(100, percentage)}%`;
                ui.consumptionPercentage.textContent = `${Math.round(percentage)}% de la conso. max`;
                
                if (percentage <= 33) ui.consumptionGauge.style.backgroundColor = '#4CAF50'; // Vert
                else if (percentage <= 66) ui.consumptionGauge.style.backgroundColor = '#FFC107'; // Jaune/Ambre
                else ui.consumptionGauge.style.backgroundColor = '#F44336'; // Rouge
                
                return;
            }

            // --- NOUVELLE LOGIQUE DE COULEUR BASÉE SUR L'OBJECTIF ---
            const widthPercentage = (currentConsumption / maxConsumption) * 100;
            ui.consumptionGauge.style.width = `${Math.min(100, widthPercentage)}%`;
            
            let color;
            // CAS 1 : On a atteint ou dépassé l'objectif (bravo !)
            if (currentConsumption <= targetConsumption) {
                color = '#4CAF50'; // Vert
                ui.consumptionPercentage.textContent = "Objectif atteint !";
            } 
            // CAS 2 : On est au-dessus de l'objectif.
            else {
                // On calcule à quel point on est "loin" de l'objectif.
                // "Plage d'erreur" = (conso. max - objectif)
                const rangeAboveTarget = maxConsumption - targetConsumption;
                // "Écart" = (conso. actuelle - objectif)
                const distanceFromTarget = currentConsumption - targetConsumption;

                let severity = 0; // 0 = tout près de l'objectif, 1 = au max de la conso
                if (rangeAboveTarget > 0) {
                    severity = Math.min(1, distanceFromTarget / rangeAboveTarget);
                }

                // Interpolation de couleur entre Jaune (proche de l'objectif) et Rouge (loin)
                // Jaune: (255, 193, 7) -> #FFC107
                // Rouge: (244, 67, 54) -> #F44336
                const r = Math.round(255 + (244 - 255) * severity); // de 255 à 244
                const g = Math.round(193 + (67 - 193) * severity);  // de 193 à 67
                const b = Math.round(7 + (54 - 7) * severity);      // de 7 à 54
                color = `rgb(${r}, ${g}, ${b})`;
                
                const remainingEffort = distanceFromTarget.toFixed(0);
                ui.consumptionPercentage.textContent = `+${remainingEffort} W de l'objectif`;
            }

            ui.consumptionGauge.style.backgroundColor = color;
            
            // Afficher le marqueur de l'objectif (code inchangé)
            this.updateOptimalSolutionMarker(targetConsumption, maxConsumption);
        },

        updateOptimalSolutionMarker(targetConsumption, maxConsumption) {
                    const gaugeTrack = document.querySelector('.gauge-track');
                    if (!gaugeTrack) return;

                    // Chercher le conteneur principal du marqueur
                    let container = document.getElementById('optimal-marker-container');
                    
                    // S'il n'existe pas, on le crée avec tous ses enfants
                    if (!container) {
                        container = document.createElement('div');
                        container.id = 'optimal-marker-container';
                        container.className = 'optimal-marker-container';

                        // 1. Créer le label "Objectif"
                        const label = document.createElement('div');
                        label.className = 'optimal-marker-label';
                        label.textContent = 'Optimale';
                        
                        // 2. Créer la flèche
                        const arrow = document.createElement('div');
                        arrow.className = 'optimal-marker-arrow';

                        // 3. Créer la ligne blanche
                        const line = document.createElement('div');
                        line.id = 'optimal-marker-line'; // ID spécifique pour la ligne
                        
                        // Ajouter les éléments au conteneur
                        container.appendChild(label);
                        container.appendChild(arrow);
                        container.appendChild(line);

                        // S'assurer que le parent est bien positionné
                        gaugeTrack.style.position = 'relative';
                        gaugeTrack.appendChild(container);
                    }

                    // Mettre à jour la position du conteneur entier
                    if (maxConsumption > 0) {
                        const markerPercentage = (targetConsumption / maxConsumption) * 100;
                        // On centre le conteneur sur la position cible.
                        // Le `transform` dans le CSS s'occupera de le décaler correctement.
                        container.style.left = `${Math.min(100, markerPercentage)}%`;
                        container.title = `Objectif Optimal: ${targetConsumption.toFixed(0)} W`;
                        container.style.display = 'flex'; // Afficher le conteneur
                    } else {
                        container.style.display = 'none'; // Cacher s'il n'y a pas de conso max
                    }
        },
        
        // Set total users count
        setTotalUsers(count) {
            ui.totalUsers.textContent = count;
        },
        
        clearUserPanel() {
            if (ui.userItemsContainer) {
                ui.userItemsContainer.innerHTML = '';
                console.log("User items panel cleared.");
            }
        },
        
        // Create user items in the sidebar
        createUserItems() {
            if (!ui.userItemsContainer) return;
            
            // Clear existing items
            ui.userItemsContainer.innerHTML = '';
            
            // Create an item for each user
            gameState.cy.nodes('[type="user"]').forEach(userNode => {
                const userId = userNode.id();
                const userColor = userNode.style('background-color');
                
                const userItem = document.createElement('div');
                userItem.className = 'user-item';
                userItem.setAttribute('data-user-id', userId);

                if (gameState.connectedUsers.has(userId)) {
                    userItem.classList.add('is-connected');
                }
                
                // Add status class if connected or selected
                if (gameState.connectedUsers.has(userId)) {
                    userItem.classList.add('connected');
                } else if (gameState.selectedUser === userId) {
                    userItem.classList.add('selected');
                }
                
                // Color indicator
                const colorIndicator = document.createElement('div');
                colorIndicator.className = 'color-indicator';
                colorIndicator.style.backgroundColor = userColor;
                
                // User info
                const userInfo = document.createElement('div');
                userInfo.className = 'user-info';
                
                // User ID
                const userIdElement = document.createElement('div');
                userIdElement.textContent = userId;
                
                // Status
                const status = document.createElement('div');
                status.className = 'user-status';
                
                if (gameState.connectedUsers.has(userId)) {
                    status.textContent = 'Connecté';
                    status.classList.add('connected');
                } else if (gameState.selectedUser === userId) {
                    status.textContent = 'Sélectionné';
                    status.classList.add('selected');
                } else {
                    status.textContent = 'Déconnecté';
                    status.classList.add('disconnected');
                }
                
                userInfo.appendChild(userIdElement);
                userInfo.appendChild(status);
                
                // Reset button - only enabled if user is connected
                const resetBtn = document.createElement('button');
                resetBtn.className = 'user-reset-btn';
                resetBtn.textContent = 'Déconnecter';
                resetBtn.disabled = !gameState.connectedUsers.has(userId);
                
                resetBtn.addEventListener('click', (event) => {
                    event.stopPropagation(); // Prevent propagation
                    
                    if (gameState.gamePhases && gameState.gamePhases.resetUserConnection) {
                        gameState.gamePhases.resetUserConnection(userId);
                    }
                });
                
                // Add components to item
                userItem.appendChild(colorIndicator);
                userItem.appendChild(userInfo);
                userItem.appendChild(resetBtn);
                
                // Add click handler for the whole item (for selection in phase 1)
                userItem.addEventListener('click', () => {
                    if (gameState.phase === 1 && !gameState.connectedUsers.has(userId)) {
                        const userNode = gameState.cy.getElementById(userId);
                        if (userNode && gameState.gamePhases && gameState.gamePhases.handleUserSelection) {
                            gameState.gamePhases.handleUserSelection(userNode);
                        }
                    }
                });
                
                ui.userItemsContainer.appendChild(userItem);
            });
        },
        
        // Update user items status
        updateUserItems() {
            // Create items if they don't exist
            if (!ui.userItemsContainer.children.length) {
                this.createUserItems();
                return;
            }
            
            // Update existing items
            Array.from(ui.userItemsContainer.children).forEach(item => {
                const userId = item.getAttribute('data-user-id');

                item.classList.toggle('is-connected', gameState.connectedUsers.has(userId));

                // Update status class
                item.classList.remove('connected', 'selected');
                
                if (gameState.connectedUsers.has(userId)) {
                    item.classList.add('connected');
                } else if (gameState.selectedUser === userId) {
                    item.classList.add('selected');
                }
                
                // Update status text
                const statusElement = item.querySelector('.user-status');
                if (statusElement) {
                    statusElement.className = 'user-status';
                    
                    if (gameState.connectedUsers.has(userId)) {
                        statusElement.textContent = 'Connecté';
                        statusElement.classList.add('connected');
                    } else if (gameState.selectedUser === userId) {
                        statusElement.textContent = 'Sélectionné';
                        statusElement.classList.add('selected');
                    } else {
                        statusElement.textContent = 'Déconnecté';
                        statusElement.classList.add('disconnected');
                    }
                }
                
                // Update reset button
                const resetBtn = item.querySelector('.user-reset-btn');
                if (resetBtn) {
                    resetBtn.disabled = !gameState.connectedUsers.has(userId);
                }
            });
        },
        
        // Create antenna toggle controls in the second part of sidebar
        createAntennaToggles() {
            // Only available in phase 3
            if (gameState.phase !== 3) return;
            
            // Create antenna toggle section if it doesn't exist
            let antennaContainer = ui.userItemsContainer.querySelector('.antenna-items-container');
            if (!antennaContainer) {
                antennaContainer = document.createElement('div');
                antennaContainer.className = 'antenna-items-container';
                
                const title = document.createElement('div');
                title.className = 'antenna-title';
                title.textContent = 'Antennes';
                antennaContainer.appendChild(title);
                
                ui.userItemsContainer.appendChild(antennaContainer);
            } else {
                // Clear existing items
                const title = antennaContainer.querySelector('.antenna-title');
                antennaContainer.innerHTML = '';
                antennaContainer.appendChild(title);
            }
            
            // Create an item for each antenna
            gameState.cy.nodes('[type="antenna"]').forEach(antennaNode => {
                const antennaId = antennaNode.id();
                const isActive = antennaNode.data('active') !== false;
                
                // Get list of users covered by this antenna
                const coveredUsers = gameState.antennaUsers.has(antennaId) 
                    ? Array.from(gameState.antennaUsers.get(antennaId))
                    : [];
                
                const antennaItem = document.createElement('div');
                antennaItem.className = `antenna-item ${isActive ? 'active' : 'inactive'}`;
                antennaItem.setAttribute('data-antenna-id', antennaId);
                
                // Antenna icon
                const antennaIcon = document.createElement('div');
                antennaIcon.className = 'antenna-icon';
                antennaIcon.innerHTML = '<i class="fas fa-broadcast-tower"></i>';
                
                // Antenna info
                const antennaInfo = document.createElement('div');
                antennaInfo.className = 'antenna-info';
                
                // Antenna ID
                const antennaIdElement = document.createElement('div');
                antennaIdElement.className = 'antenna-id';
                antennaIdElement.textContent = antennaId;
                
                // Coverage info
                const coverageInfo = document.createElement('div');
                coverageInfo.className = 'antenna-coverage';
                coverageInfo.textContent = `Couvre ${coveredUsers.length} utilisateurs`;
                
                antennaInfo.appendChild(antennaIdElement);
                antennaInfo.appendChild(coverageInfo);
                
                // Toggle switch
                const toggleSwitch = document.createElement('div');
                toggleSwitch.className = `antenna-toggle ${isActive ? 'active' : ''}`;
                
                // Add click handler for the toggle
                toggleSwitch.addEventListener('click', (event) => {
                    event.stopPropagation();
                    
                    if (gameState.gamePhases && gameState.gamePhases.toggleAntennaState) {
                        gameState.gamePhases.toggleAntennaState(antennaNode);
                        
                        // Update the toggle appearance
                        const isNowActive = antennaNode.data('active') !== false;
                        toggleSwitch.className = `antenna-toggle ${isNowActive ? 'active' : ''}`;
                        antennaItem.className = `antenna-item ${isNowActive ? 'active' : 'inactive'}`;

                        // Also update antenna and halo appearance directly to ensure consistency
                        const haloId = antennaNode.data('haloId');
                        if (haloId) {
                            const haloNode = gameState.cy.getElementById(haloId);
                            if (haloNode.length > 0) {
                                // Utiliser la fonction setHaloVisibility
                                setHaloVisibility(haloNode, isNowActive);
                            }
                        }
                    }
                });
                
                // Add components to item
                antennaItem.appendChild(antennaIcon);
                antennaItem.appendChild(antennaInfo);
                antennaItem.appendChild(toggleSwitch);
                
                antennaContainer.appendChild(antennaItem);
            });
        },
        
        // Set up UI event listeners
        setupUIEventListeners(graphLoader, gamePhases) {
            // Navigate to home
            ui.backHomeBtn.addEventListener("click", () => {
                window.location.href = "../index.html";
            });
            
            ui.homeBtn.addEventListener("click", () => {
                window.location.href = "../index.html";
            });
            
            // Return to level selection
            ui.returnToLevelsBtn.addEventListener("click", () => {
                this.showLevelSelection();
            });
            
            // Reset the current game
            ui.resetBtn.addEventListener("click", () => {
                gamePhases.resetGame();
                this.updateConsumptionButtonUI();
            });

            if (ui.toggleConsumptionBtn) {
              ui.toggleConsumptionBtn.addEventListener('click', () => {
                // 1. Inverser l'état
                gameState.showConsumptionLabels = !gameState.showConsumptionLabels;

                // 2. Mettre à jour l'apparence du bouton
                this.updateConsumptionButtonUI();

                // 3. Forcer Cytoscape à redessiner
                if (gameState.cy) {
                  gameState.cy.style().update();
                }
              });
            }
        },
        
        // Loading indicators
        showGraphListLoading() {
            ui.graphListLoading.style.display = "block";
        },
        
        hideGraphListLoading() {
            ui.graphListLoading.style.display = "none";
        },
        
        // Solution dialog methods
        showSolutionSaveDialog(consumption, callback) {
            // Create dialog element
            const dialog = document.createElement('div');
            dialog.className = 'solution-dialog';
            
            const content = document.createElement('div');
            content.className = 'solution-dialog-content';
            
            const title = document.createElement('h3');
            title.textContent = 'Enregistrer la solution';
            
            const message = document.createElement('p');
            message.textContent = `Voulez-vous enregistrer la consommation actuelle (${consumption.toFixed(1)} watts) comme solution optimale pour ce niveau?`;
            
            const buttonContainer = document.createElement('div');
            buttonContainer.className = 'solution-dialog-buttons';
            
            const confirmButton = document.createElement('button');
            confirmButton.textContent = 'Enregistrer';
            confirmButton.className = 'solution-confirm-btn';
            confirmButton.addEventListener('click', () => {
                document.body.removeChild(dialog);
                callback(true);
            });
            
            const cancelButton = document.createElement('button');
            cancelButton.textContent = 'Annuler';
            cancelButton.className = 'solution-cancel-btn';
            cancelButton.addEventListener('click', () => {
                document.body.removeChild(dialog);
                callback(false);
            });
            
            buttonContainer.appendChild(confirmButton);
            buttonContainer.appendChild(cancelButton);
            
            content.appendChild(title);
            content.appendChild(message);
            content.appendChild(buttonContainer);
            dialog.appendChild(content);
            
            document.body.appendChild(dialog);
        },
        
        // Show notification message
        showNotification(message, type = 'success') {
            const notification = document.createElement('div');
            notification.className = `notification ${type}`;
            notification.textContent = message;
            
            document.body.appendChild(notification);
            
            // Remove notification after 3 seconds
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
                }
            }, 3000);
        },
        
        // Show level complete message
        showLevelCompleteMessage() {

             this.hideTooltip();
            // Avoid showing multiple times
            if (document.querySelector('.level-complete-message')) {
                return;
            }
            
            const message = document.createElement('div');
            message.className = 'level-complete-message';
            
            const content = document.createElement('div');
            content.className = 'level-complete-content';
            
            const title = document.createElement('h2');
            title.textContent = 'Niveau Terminé !';
            
            const subtitle = document.createElement('p');
            subtitle.textContent = 'Vous avez trouvé la solution optimale !';
            
            const continueButton = document.createElement('button');
            continueButton.textContent = 'Continuer';
            continueButton.addEventListener('click', () => {
                document.body.removeChild(message);
            });
            
            content.appendChild(title);
            content.appendChild(subtitle);
            content.appendChild(continueButton);
            message.appendChild(content);
            
            document.body.appendChild(message);
            
            // Add celebration effects
            this.showCelebrationEffects();
        },
        
        // Show celebration effects (confetti)
        showCelebrationEffects() {
            // Create confetti container
            const confettiContainer = document.createElement('div');
            confettiContainer.className = 'confetti-container';
            document.body.appendChild(confettiContainer);
            
            // Add confetti elements
            for (let i = 0; i < 100; i++) {
                const confetti = document.createElement('div');
                confetti.className = 'confetti';
                confetti.style.left = `${Math.random() * 100}%`;
                confetti.style.animationDelay = `${Math.random() * 3}s`;
                confetti.style.backgroundColor = `hsl(${Math.random() * 360}, 100%, 50%)`;
                confettiContainer.appendChild(confetti);
            }
            
            // Remove after animation completes
            setTimeout(() => {
                if (document.body.contains(confettiContainer)) {
                    document.body.removeChild(confettiContainer);
                }
            }, 5000);
        },
        
        createFloatingText(text, targetElement, type = 'plus') {
            if (!targetElement) {
                console.error("Impossible de créer le texte flottant : élément cible manquant.");
                return;
            }
            const textElement = document.createElement('div');
            textElement.className = 'floating-text';
            textElement.textContent = text;
            if (type === 'plus') {
                textElement.classList.add('score-plus');
            } else if (type === 'minus') {
                textElement.classList.add('score-minus');
            }
            document.body.appendChild(textElement);
            const rect = targetElement.getBoundingClientRect();
            textElement.style.left = `${rect.left + rect.width / 2}px`;
            textElement.style.top = `${rect.top}px`;
            setTimeout(() => {
                if (textElement.parentElement) {
                    textElement.parentElement.removeChild(textElement);
                }
            }, 1500);
        },

        updateConsumptionButtonUI() {
            if (!ui.toggleConsumptionBtn) return;

            if (gameState.showConsumptionLabels) {
                ui.toggleConsumptionBtn.classList.add('active');
                ui.toggleConsumptionBtn.innerHTML = '<i class="fas fa-bolt"></i> Masquer Consommation';
            } else {
                ui.toggleConsumptionBtn.classList.remove('active');
                ui.toggleConsumptionBtn.innerHTML = '<i class="fas fa-bolt"></i> Afficher Consommation';
            }
        },
    };
}