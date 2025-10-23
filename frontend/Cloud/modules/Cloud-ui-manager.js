// Cloud-ui-manager.js - Handles UI elements and interactions for Cloud gameplay

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
        toggleCapacityBtn: document.getElementById("toggleCapacityBtn"),
        popupMessage: document.getElementById("popup-message"),
        connectedCount: document.getElementById("connected-count"),
        totalUsers: document.getElementById("total-users"),
        consumption: document.getElementById("consumption"),
        consumptionGauge: document.getElementById("consumption-gauge"),
        consumptionPercentage: document.getElementById("consumption-percentage"),
        userPairsContainer: document.getElementById('user-pairs-container'),
        restorePlayerSolutionBtn: document.getElementById("restorePlayerSolutionBtn"),

        taskInfoPopup: document.getElementById('task-info-popup'),
        taskInfoTitle: document.getElementById('task-info-title'),
        taskInfoDisplayArea: document.getElementById('task-info-display-area'),
        closeTaskInfoBtn: document.getElementById('close-task-info-btn'),

        gameTooltip: null
    };
    
    return {
        taskPlacement: null,

        initTooltip() {
            let tooltip = document.getElementById('game-tooltip');
            if (!tooltip) {
                tooltip = document.createElement('div');
                tooltip.id = 'game-tooltip';
                tooltip.className = 'game-tooltip';
                document.body.appendChild(tooltip);
            }
            ui.gameTooltip = tooltip;
        },

        showTooltip(content, x, y) {
            if (!ui.gameTooltip) return;
            ui.gameTooltip.innerHTML = content;
            ui.gameTooltip.style.left = `${x}px`;
            ui.gameTooltip.style.top = `${y}px`;
            ui.gameTooltip.classList.add('visible');
        },

        hideTooltip() {
            if (!ui.gameTooltip) return;
            ui.gameTooltip.classList.remove('visible');
        },

        showRestoreButton(show) {
            if (ui.restorePlayerSolutionBtn) {
                ui.restorePlayerSolutionBtn.style.display = show ? 'flex' : 'none';
            }
        },
        
        updateCapacityButtonUI() {
            if (!ui.toggleCapacityBtn) return;
            if (gameState.showCapacityLabels) {
                ui.toggleCapacityBtn.classList.add('active');
                ui.toggleCapacityBtn.innerHTML = '<i class="fas fa-tag"></i> Masquer Capacités';
            } else {
                ui.toggleCapacityBtn.classList.remove('active');
                ui.toggleCapacityBtn.innerHTML = '<i class="fas fa-tag"></i> Afficher Capacités';
            }
        },

        showGraphListLoading() {
            if (ui.graphListLoading) ui.graphListLoading.style.display = "block";
        },

        hideGraphListLoading() {
            if (ui.graphListLoading) ui.graphListLoading.style.display = "none";
        },

        displayGraphList(graphs, graphLoader) {
            ui.graphList.innerHTML = "";
            graphs.forEach(graph => {
                const listItem = document.createElement("li");
                listItem.className = "graph-list-item";
                const date = new Date(graph.createdAt);
                const formattedDate = date.toLocaleDateString();
                listItem.innerHTML = `
                    <div class="graph-info">
                        <div class="graph-name">${graph.name}</div>
                        <div class="graph-date">Créé le : ${formattedDate}</div>
                    </div>
                    <button class="play-button" data-id="${graph._id}">Jouer</button>
                `;
                listItem.querySelector(".play-button").addEventListener("click", () => {
                    graphLoader.startGameplay(graph._id);
                });
                ui.graphList.appendChild(listItem);
            });
        },
        
        showGameplay() {
            ui.levelSelection.style.display = "none";
            ui.gameplay.style.display = "block";
        },
        
        showLevelSelection() {
            ui.gameplay.style.display = "none";
            ui.levelSelection.style.display = "block";
            if (gameState.cy) {
                gameState.cy.destroy();
                gameState.cy = null;
                window.cy = null;
            }
            gameState.reset();
        },
        
        setPopupMessage(message) {
            ui.popupMessage.classList.remove('popup-update-animation');
            ui.popupMessage.innerHTML = message;
            void ui.popupMessage.offsetWidth;
            ui.popupMessage.classList.add('popup-update-animation');
        },
        
        updateStats() {
          if (!gameState.solutionValidator) {
            console.warn("updateStats called before solutionValidator is initialized.");
            return;
          }

          ui.connectedCount.textContent = gameState.connectedUsers.size;
          
          const totalConsumption = gameState.solutionValidator.getCurrentConsumption();
          
          const maxConsumption = gameState.initialConsumption;
          ui.consumption.textContent = totalConsumption.toFixed(0);
          this.updateEnergySavingsGauge(totalConsumption, maxConsumption);
          this.updatePairButtons();
          
          gameState.solutionValidator.updateProgressIndicator();
        },
        
        updateEnergySavingsGauge(currentConsumption, maxConsumption) {
            if (!ui.consumptionGauge || !ui.consumptionPercentage) return;
            const targetConsumption = gameState.minimumConsumption;

            if (targetConsumption === null || targetConsumption === undefined) {
                if (maxConsumption === 0) {
                    ui.consumptionGauge.style.width = "0%";
                    ui.consumptionPercentage.textContent = "N/A";
                    ui.consumptionGauge.style.backgroundColor = '#9e9e9e';
                    this.updateOptimalSolutionMarker(null, maxConsumption);
                    return;
                }
                const percentage = (currentConsumption / maxConsumption) * 100;
                ui.consumptionGauge.style.width = `${Math.min(100, percentage)}%`;
                ui.consumptionPercentage.textContent = `${Math.round(percentage)}% de la conso. max`;
                if (percentage <= 33) ui.consumptionGauge.style.backgroundColor = '#4CAF50';
                else if (percentage <= 66) ui.consumptionGauge.style.backgroundColor = '#FFC107';
                else ui.consumptionGauge.style.backgroundColor = '#F44336';
                this.updateOptimalSolutionMarker(null, maxConsumption);
                return;
            }
            
            const VISUAL_TARGET_POSITION = 30;
            let visualWidthPercentage;

            if (currentConsumption <= targetConsumption) {
                visualWidthPercentage = VISUAL_TARGET_POSITION;
            } else {
                const optimizationRange = maxConsumption - targetConsumption;
                const progressInBuffer = currentConsumption - targetConsumption;
                const visualBufferRange = 100 - VISUAL_TARGET_POSITION;
                if (optimizationRange > 0) {
                    visualWidthPercentage = VISUAL_TARGET_POSITION + (progressInBuffer / optimizationRange) * visualBufferRange;
                } else {
                    visualWidthPercentage = (currentConsumption > targetConsumption) ? 100 : VISUAL_TARGET_POSITION;
                }
            }

            ui.consumptionGauge.style.width = `${Math.min(100, Math.max(0, visualWidthPercentage))}%`;

            let color;
            if (currentConsumption <= targetConsumption) {
                color = '#4CAF50';
                ui.consumptionPercentage.textContent = "Objectif atteint !";
            } else {
                const optimizationRange = maxConsumption - targetConsumption;
                const distanceFromTarget = currentConsumption - targetConsumption;
                const severity = (optimizationRange > 0) ? Math.min(1, distanceFromTarget / optimizationRange) : 1;
                const r = Math.round(255 + (244 - 255) * severity);
                const g = Math.round(193 + (67 - 193) * severity);
                const b = Math.round(7 + (54 - 7) * severity);
                color = `rgb(${r}, ${g}, ${b})`;
                ui.consumptionPercentage.textContent = `+${distanceFromTarget.toFixed(0)} W de l'objectif`;
            }
            ui.consumptionGauge.style.backgroundColor = color;
            this.updateOptimalSolutionMarker(targetConsumption, maxConsumption, VISUAL_TARGET_POSITION);
        },

        updateOptimalSolutionMarker(targetConsumption, maxConsumption, visualPosition = null) {
          const gaugeTrack = document.querySelector('.gauge-track');
          if (!gaugeTrack) return;
          let container = document.getElementById('optimal-marker-container');
          if (!container) {
              container = document.createElement('div');
              container.id = 'optimal-marker-container';
              container.className = 'optimal-marker-container';
              container.innerHTML = `<div class="optimal-marker-label">Objectif</div><div class="optimal-marker-arrow"></div><div id="optimal-marker-line"></div>`;
              gaugeTrack.style.position = 'relative';
              gaugeTrack.appendChild(container);
          }
          if (targetConsumption === null || targetConsumption === undefined || maxConsumption === 0) {
              container.style.display = 'none';
              return;
          }
          const markerPositionPercentage = (visualPosition !== null) ? visualPosition : (targetConsumption / maxConsumption) * 100;
          container.style.left = `${Math.min(100, markerPositionPercentage)}%`;
          container.title = `Objectif Optimal: ${targetConsumption.toFixed(0)} W`;
          container.style.display = 'flex';
        },
        
        setTotalUsers(count) {
            if (ui.totalUsers) ui.totalUsers.textContent = count;
        },
        
        clearUserPanel() {
            if (ui.userPairsContainer) ui.userPairsContainer.innerHTML = '';
        },

        showTaskInfoPopup(clientNode) {
            const tasks = clientNode.data('tasks') || [];
            ui.taskInfoTitle.textContent = `Tâches de ${clientNode.id()}`;
            ui.taskInfoDisplayArea.innerHTML = '';
            
            if (tasks.length === 0) {
                ui.taskInfoDisplayArea.innerHTML = '<p class="empty-state">Aucune tâche définie pour ce client.</p>';
            } else {
                tasks.forEach(task => {
                    const taskBlock = document.createElement('div');
                    taskBlock.className = 'task-block-item';
                    taskBlock.innerHTML = `<strong>${task.name || 'Tâche'}</strong><span>(${task.charge})</span>`;
                    taskBlock.style.height = `${task.charge * 5}px`;
                    taskBlock.style.backgroundColor = `hsl(${task.charge * 15 % 360}, 70%, 50%)`;
                    ui.taskInfoDisplayArea.appendChild(taskBlock);
                });
            }
            ui.taskInfoPopup.style.display = 'flex';
        },

        hideTaskInfoPopup() {
            ui.taskInfoPopup.style.display = 'none';
        },

        showTaskPlacementPopup(clientId, context) {
            if (this.taskPlacement) {
                this.taskPlacement.show(clientId, context);
            } else {
                console.error("Task Placement Manager is not initialized.");
            }
        },

        createUserPairButtons() {
            if (!ui.userPairsContainer) return;
            ui.userPairsContainer.innerHTML = '';
            
            // Afficher les paires
            gameState.userPairs.forEach((pair, index) => {
                const pairItem = document.createElement('div');
                pairItem.className = 'user-pair-item';
                pairItem.setAttribute('data-pair-index', index);
                if (pair.connected) {
                    pairItem.classList.add('is-connected');
                }
                const colorIndicator = document.createElement('div');
                colorIndicator.className = 'pair-color-indicator';
                colorIndicator.style.backgroundColor = pair.color;
                const pairInfo = document.createElement('div');
                pairInfo.className = 'pair-info';
                const userIds = document.createElement('div');
                userIds.textContent = pair.users.join(' → ');
                const status = document.createElement('div');
                status.className = 'pair-status';
                if (pair.connected) {
                    status.textContent = 'Connecté';
                    status.classList.add('connected');
                } else if (gameState.selectedUser && pair.users.includes(gameState.selectedUser)) {
                    status.textContent = 'En cours';
                    status.classList.add('in-progress');
                } else {
                    status.textContent = 'Déconnecté';
                    status.classList.add('disconnected');
                }
                pairInfo.appendChild(userIds);
                pairInfo.appendChild(status);
                const resetBtn = document.createElement('button');
                resetBtn.className = 'pair-reset-btn';
                resetBtn.textContent = 'Rerouter';
                resetBtn.setAttribute('data-pair-index', index);
                if (!pair.connected && !(gameState.selectedUser && pair.users.includes(gameState.selectedUser))) {
                    resetBtn.disabled = true;
                }
                resetBtn.addEventListener('click', (event) => {
                    event.stopPropagation();
                    const pairIndex = parseInt(resetBtn.getAttribute('data-pair-index'));
                    if (gameState.gamePhases && gameState.gamePhases.resetPair) {
                        gameState.gamePhases.resetPair(pairIndex);
                        this.updatePairButtons();
                    }
                });
                pairItem.appendChild(colorIndicator);
                pairItem.appendChild(pairInfo);
                pairItem.appendChild(resetBtn);
                ui.userPairsContainer.appendChild(pairItem);
            });
        
            // Afficher les connexions au Cloud
            gameState.clients.forEach(client => {
                const isConnectedToCloud = gameState.completedPaths.some(p => p.path[0] === client.id && p.path.includes(gameState.cloudNode.id()));
                
                const clientItem = document.createElement('div');
                clientItem.className = 'user-pair-item';
                if (isConnectedToCloud) {
                    clientItem.classList.add('is-connected');
                }
        
                const colorIndicator = document.createElement('div');
                colorIndicator.className = 'pair-color-indicator';
                colorIndicator.style.backgroundColor = client.node.style('background-color');
        
                const pairInfo = document.createElement('div');
                pairInfo.className = 'pair-info';
                const userIds = document.createElement('div');
                userIds.textContent = `${client.id} → Cloud`;
                const status = document.createElement('div');
                status.className = 'pair-status';
        
                if (isConnectedToCloud) {
                    status.textContent = 'Connecté';
                    status.classList.add('connected');
                } else if (gameState.selectedUser === client.id) {
                    status.textContent = 'En cours';
                    status.classList.add('in-progress');
                } else {
                    status.textContent = 'Déconnecté';
                    status.classList.add('disconnected');
                }
                
                pairInfo.appendChild(userIds);
                pairInfo.appendChild(status);
                
                const resetBtn = document.createElement('button');
                resetBtn.className = 'pair-reset-btn';
                resetBtn.textContent = 'Rerouter'; // *** CORRECTION 1 : Changement du texte ***
                resetBtn.disabled = !isConnectedToCloud && gameState.selectedUser !== client.id;
                resetBtn.addEventListener('click', (event) => {
                    // *** CORRECTION 2 : Appel de la nouvelle fonction de reset ***
                    if (gameState.gamePhases && gameState.gamePhases.resetCloudConnection) {
                        gameState.gamePhases.resetCloudConnection(client.id);
                    }
                });
        
                clientItem.appendChild(colorIndicator);
                clientItem.appendChild(pairInfo);
                clientItem.appendChild(resetBtn);
                ui.userPairsContainer.appendChild(clientItem);
            });
        },
  
        updatePairButtons() {
            if (!ui.userPairsContainer) return;
            this.createUserPairButtons();
        },

        setupUIEventListeners(graphLoader, gamePhases) {
            ui.backHomeBtn.addEventListener("click", () => { window.location.href = "../index.html"; });
            ui.homeBtn.addEventListener("click", () => { window.location.href = "../index.html"; });
            ui.returnToLevelsBtn.addEventListener("click", () => { this.showLevelSelection(); });
            ui.resetBtn.addEventListener("click", () => { gamePhases.resetGame(); });
            if (ui.toggleCapacityBtn) {
              ui.toggleCapacityBtn.addEventListener('click', () => {
                gameState.showCapacityLabels = !gameState.showCapacityLabels;
                this.updateCapacityButtonUI();
                if (gameState.cy) {
                  gameState.cy.style().update();
                }
              });
            }
            ui.closeTaskInfoBtn.addEventListener('click', () => this.hideTaskInfoPopup());
        },
        
        showNotification(message, type = 'success') {
            const notification = document.createElement('div');
            notification.className = `notification ${type}`;
            notification.textContent = message;
            document.body.appendChild(notification);
            setTimeout(() => {
              if (document.body.contains(notification)) {
                document.body.removeChild(notification);
              }
            }, 3000);
        },
        
        showLevelCompleteMessage() {
            this.hideTooltip();
            if (document.querySelector('.level-complete-message')) return;
            const message = document.createElement('div');
            message.className = 'level-complete-message';
            const content = document.createElement('div');
            content.className = 'level-complete-content';
            const title = document.createElement('h2');
            title.textContent = 'Niveau terminé !';
            const subtitle = document.createElement('p');
            subtitle.textContent = 'Vous avez trouvé la solution optimale !';
            const continueButton = document.createElement('button');
            continueButton.textContent = 'Continue';
            continueButton.addEventListener('click', () => {
              document.body.removeChild(message);
            });
            content.appendChild(title);
            content.appendChild(subtitle);
            content.appendChild(continueButton);
            message.appendChild(content);
            document.body.appendChild(message);
            this.showCelebrationEffects();
        },
        
        showCelebrationEffects() {
            const confettiContainer = document.createElement('div');
            confettiContainer.className = 'confetti-container';
            document.body.appendChild(confettiContainer);
            for (let i = 0; i < 100; i++) {
              const confetti = document.createElement('div');
              confetti.className = 'confetti';
              confetti.style.left = `${Math.random() * 100}%`;
              confetti.style.animationDelay = `${Math.random() * 3}s`;
              confetti.style.backgroundColor = `hsl(${Math.random() * 360}, 100%, 50%)`;
              confettiContainer.appendChild(confetti);
            }
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
        }
    };
}