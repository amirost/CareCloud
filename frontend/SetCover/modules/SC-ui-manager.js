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
        popupMessage: document.getElementById("popup-message"),
        connectedCount: document.getElementById("connected-count"),
        totalUsers: document.getElementById("total-users"),
        activeAntennas: document.getElementById("active-antennas"),
        totalAntennas: document.getElementById("total-antennas"),
        consumptionGauge: document.getElementById("consumption-gauge"),
        consumptionPercentage: document.getElementById("consumption-percentage"),
        userItemsContainer: document.getElementById("user-items-container")
    };
    
    return {
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
                        <div class="graph-date">Created: ${formattedDate}</div>
                    </div>
                    <button class="play-button" data-id="${graph._id}">Play</button>
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
            }
            
            // Reset game state
            gameState.reset();
        },
        
        // Set popup message
        setPopupMessage(message) {
            ui.popupMessage.textContent = message;
        },
        
        // Update game statistics
        updateStats() {
            // Update connected users count
            ui.connectedCount.textContent = gameState.connectedUsers.size;
            
            // Update active antennas count
            ui.activeAntennas.textContent = gameState.activeAntennas.size;
            
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
            
            // Update the energy savings gauge
            this.updateEnergySavingsGauge(totalConsumption, maxConsumption);
            
            // Update user status items
            this.updateUserItems();
            
            // Check win condition and update progress if solution validator exists
            if (gameState.solutionValidator) {
                gameState.solutionValidator.updateProgressIndicator();
            }
        },
        
        // Update energy savings gauge
        updateEnergySavingsGauge(currentConsumption, maxConsumption) {
            if (!ui.consumptionGauge || !ui.consumptionPercentage) return;
            
            // Check if minimum consumption has been recorded
            const minimumConsumption = gameState.minimumConsumption;
            
            if (minimumConsumption === null || minimumConsumption === undefined) {
                // No solution recorded yet - show info message
                ui.consumptionGauge.style.width = "0%";
                ui.consumptionGauge.style.backgroundColor = "#9e9e9e"; // Grey
                ui.consumptionPercentage.textContent = "Enregistrez une solution (touche 's')";
                
                // Update gauge label
                const gaugeLabel = document.querySelector('.gauge-label span:first-child');
                if (gaugeLabel) {
                    gaugeLabel.textContent = "Économie d'énergie";
                }
                
                return;
            }
            
            // Calculate energy savings percentage
            // Formula: (maxConsumption - currentConsumption) / (maxConsumption - minimumConsumption) * 100
            let savingsPercentage = 0;
            if (maxConsumption > minimumConsumption) {
                savingsPercentage = Math.max(0, Math.min(100, 
                    ((maxConsumption - currentConsumption) / (maxConsumption - minimumConsumption)) * 100
                ));
            }
            
            // Round for display
            const roundedPercentage = Math.round(savingsPercentage);
            
            // Update gauge width
            ui.consumptionGauge.style.width = `${roundedPercentage}%`;
            
            // Update percentage text
            ui.consumptionPercentage.textContent = `${roundedPercentage}% d'économie`;
            
            // Update gauge label
            const gaugeLabel = document.querySelector('.gauge-label span:first-child');
            if (gaugeLabel) {
                gaugeLabel.textContent = "Économie d'énergie";
            }
            
            // Change color based on energy savings level
            if (savingsPercentage >= 90) {
                ui.consumptionGauge.style.backgroundColor = '#4CAF50'; // Green
            } else if (savingsPercentage >= 60) {
                ui.consumptionGauge.style.backgroundColor = '#8BC34A'; // Light green
            } else if (savingsPercentage >= 40) {
                ui.consumptionGauge.style.backgroundColor = '#FFEB3B'; // Yellow
            } else if (savingsPercentage >= 20) {
                ui.consumptionGauge.style.backgroundColor = '#FFC107'; // Amber
            } else {
                ui.consumptionGauge.style.backgroundColor = '#FF5722'; // Orange/Red
            }
        },
        
        // Set total users count
        setTotalUsers(count) {
            ui.totalUsers.textContent = count;
        },
        
        // Set total antennas count
        setTotalAntennas(count) {
            ui.totalAntennas.textContent = count;
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
                resetBtn.textContent = 'Reset';
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
            });
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
            // Avoid showing multiple times
            if (document.querySelector('.level-complete-message')) {
                return;
            }
            
            const message = document.createElement('div');
            message.className = 'level-complete-message';
            
            const content = document.createElement('div');
            content.className = 'level-complete-content';
            
            const title = document.createElement('h2');
            title.textContent = 'Niveau Terminé!';
            
            const subtitle = document.createElement('p');
            subtitle.textContent = 'Vous avez trouvé la solution optimale!';
            
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
        }
    };
}