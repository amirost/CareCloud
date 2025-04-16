// rv-ui-manager.js - Handles UI elements and interactions

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
        consumption: document.getElementById("consumption"),
        // New UI elements for the gauge
        consumptionGauge: document.getElementById("consumption-gauge"),
        consumptionPercentage: document.getElementById("consumption-percentage")
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
          
          // Calculate current consumption
          let totalConsumption = 0;
          let initialConsumption = 0;
          
          // Add consumption from all links (for initial max value)
          if (gameState.cy) {
              gameState.cy.edges().forEach(edge => {
                  if (!edge.data('virtual')) {
                      initialConsumption += edge.data('consumption') || 0;
                      
                      // Only add consumption for used links in current value
                      if (edge.data('used')) {
                          totalConsumption += edge.data('consumption') || 0;
                      }
                  }
              });
          }
          
          // Store initial consumption if not already set
          if (!gameState.initialConsumption && initialConsumption > 0) {
              gameState.initialConsumption = initialConsumption;
          }
          
          // Use stored initial value if available
          const maxConsumption = gameState.initialConsumption || initialConsumption;
          
          // Update consumption display
          ui.consumption.textContent = totalConsumption.toFixed(0);
          
          // Update the energy savings gauge
          this.updateEnergySavingsGauge(totalConsumption, maxConsumption);
          
          // Update pair buttons to reflect current state
          this.updatePairButtons();
          
          // Check win condition and update progress if solution validator exists
          if (gameState.solutionValidator) {
              gameState.solutionValidator.updateProgressIndicator();
          }
      },
        
      updateEnergySavingsGauge(currentConsumption, maxConsumption) {
        if (!ui.consumptionGauge || !ui.consumptionPercentage) return;
        
        // Vérifier si une solution minimale a été enregistrée
        const minimumConsumption = gameState.minimumConsumption;
        
        if (minimumConsumption === null || minimumConsumption === undefined) {
            // Aucune solution enregistrée - afficher message d'information
            ui.consumptionGauge.style.width = "0%";
            ui.consumptionGauge.style.backgroundColor = "#9e9e9e"; // Gris
            ui.consumptionPercentage.textContent = "Enregistrez une solution (touche 's')";
            
            // Modifier le titre de la jauge
            const gaugeLabel = document.querySelector('.gauge-label span:first-child');
            if (gaugeLabel) {
                gaugeLabel.textContent = "Économie d'énergie";
            }
            
            return;
        }
        
        // Calculer le pourcentage d'économie d'énergie
        // Formule: (maxConsumption - currentConsumption) / (maxConsumption - minimumConsumption) * 100
        let savingsPercentage = 0;
        if (maxConsumption > minimumConsumption) {
            savingsPercentage = Math.max(0, Math.min(100, 
                ((maxConsumption - currentConsumption) / (maxConsumption - minimumConsumption)) * 100
            ));
        }
        
        // Arrondir pour l'affichage
        const roundedPercentage = Math.round(savingsPercentage);
        
        // Mettre à jour la largeur de la jauge (0% = vide, 100% = plein)
        ui.consumptionGauge.style.width = `${roundedPercentage}%`;
        
        // Mettre à jour le texte du pourcentage
        ui.consumptionPercentage.textContent = `${roundedPercentage}% d'économie`;
        
        // Modifier le titre de la jauge
        const gaugeLabel = document.querySelector('.gauge-label span:first-child');
        if (gaugeLabel) {
            gaugeLabel.textContent = "Économie d'énergie";
        }
        
        // Changer la couleur en fonction du niveau d'économie
        if (savingsPercentage >= 90) {
            ui.consumptionGauge.style.backgroundColor = '#4CAF50'; // Vert
        } else if (savingsPercentage >= 60) {
            ui.consumptionGauge.style.backgroundColor = '#8BC34A'; // Vert clair
        } else if (savingsPercentage >= 40) {
            ui.consumptionGauge.style.backgroundColor = '#FFEB3B'; // Jaune
        } else if (savingsPercentage >= 20) {
            ui.consumptionGauge.style.backgroundColor = '#FFC107'; // Ambre
        } else {
            ui.consumptionGauge.style.backgroundColor = '#FF5722'; // Orange/Rouge
        }
    },
        // Set total users count
        setTotalUsers(count) {
          if (ui.totalUsers) {
              ui.totalUsers.textContent = count;
          } else {
              console.warn("Element totalUsers not found in the DOM");
          }
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

        showSolutionSaveDialog(consumption, callback) {
            // Create dialog element
            const dialog = document.createElement('div');
            dialog.className = 'solution-dialog';
            
            const content = document.createElement('div');
            content.className = 'solution-dialog-content';
            
            const title = document.createElement('h3');
            title.textContent = 'Save Solution';
            
            const message = document.createElement('p');
            message.textContent = `Do you want to save the current consumption (${consumption.toFixed(1)} watts) as the optimal solution for this level?`;
            
            const buttonContainer = document.createElement('div');
            buttonContainer.className = 'solution-dialog-buttons';
            
            const confirmButton = document.createElement('button');
            confirmButton.textContent = 'Save';
            confirmButton.className = 'solution-confirm-btn';
            confirmButton.addEventListener('click', () => {
              document.body.removeChild(dialog);
              callback(true);
            });
            
            const cancelButton = document.createElement('button');
            cancelButton.textContent = 'Cancel';
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
            title.textContent = 'Level Complete!';
            
            const subtitle = document.createElement('p');
            subtitle.textContent = 'You found the optimal solution!';
            
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
            
            // Add celebration effects
            this.showCelebrationEffects();
          },
          
          showCelebrationEffects() {
            // Create confetti or other celebration effects
            const confettiContainer = document.createElement('div');
            confettiContainer.className = 'confetti-container';
            document.body.appendChild(confettiContainer);
            
            // Add some simple confetti elements
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
          
          updateProgressIndicator(current, target) {
            // Only create/update if not exists
            let indicator = document.getElementById('progress-indicator');
            
            if (!indicator) {
              indicator = document.createElement('div');
              indicator.id = 'progress-indicator';
              indicator.className = 'progress-indicator';
              
              const label = document.createElement('div');
              label.className = 'progress-label';
              label.textContent = 'Target:';
              
              const value = document.createElement('div');
              value.className = 'progress-value';
              value.id = 'progress-value';
              
              indicator.appendChild(label);
              indicator.appendChild(value);
              
              // Add to stats container
              document.querySelector('.game-stats-container').appendChild(indicator);
            }
            
            // Update the indicator value
            const valueDisplay = document.getElementById('progress-value');
            if (valueDisplay) {
              const difference = current - target;
              
              valueDisplay.textContent = `${target.toFixed(1)} W (${difference > 0 ? '+' : ''}${difference.toFixed(1)} W)`;
              
              // Change color based on proximity
              if (Math.abs(difference) < 0.1) {
                valueDisplay.className = 'progress-value perfect';
              } else if (Math.abs(difference) < target * 0.05) {
                valueDisplay.className = 'progress-value close';
              } else if (Math.abs(difference) < target * 0.1) {
                valueDisplay.className = 'progress-value nearby';
              } else {
                valueDisplay.className = 'progress-value far';
              }
            }
          },

          // Create user pair reset buttons
          createUserPairButtons() {
            // Utiliser directement le conteneur de paires d'utilisateurs existant
            let pairsContainer = document.getElementById('user-pairs-container');
            if (!pairsContainer) {
              console.error("Container des paires d'utilisateurs non trouvé");
              return;
            }
            
            // Effacer les boutons existants
            pairsContainer.innerHTML = '';
            
            // Créer un bouton pour chaque paire
            gameState.userPairs.forEach((pair, index) => {
              const pairItem = document.createElement('div');
              pairItem.className = 'user-pair-item';
              pairItem.setAttribute('data-pair-index', index);
              
              // Indicateur de couleur
              const colorIndicator = document.createElement('div');
              colorIndicator.className = 'pair-color-indicator';
              colorIndicator.style.backgroundColor = pair.color;
              
              // Informations sur la paire
              const pairInfo = document.createElement('div');
              pairInfo.className = 'pair-info';
              
              // IDs des utilisateurs
              const userIds = document.createElement('div');
              userIds.textContent = pair.users.join(' → ');
              
              // Statut
              const status = document.createElement('div');
              status.className = 'pair-status';
              if (pair.connected) {
                status.textContent = 'Connecté';
                status.classList.add('connected');
              } 
              else if (gameState.selectedUser && pair.users.includes(gameState.selectedUser)) {
                status.textContent = 'En cours';
                status.classList.add('in-progress');
              } 
              else {
                status.textContent = 'Déconnecté';
                status.classList.add('disconnected');
              }
              
              pairInfo.appendChild(userIds);
              pairInfo.appendChild(status);
              
              // Bouton de réinitialisation
              const resetBtn = document.createElement('button');
              resetBtn.className = 'pair-reset-btn';
              resetBtn.textContent = 'Reset';
              resetBtn.setAttribute('data-pair-index', index);
              
              // Le bouton doit être désactivé si la paire n'est pas connectée et pas en cours
              if (!pair.connected && !(gameState.selectedUser && pair.users.includes(gameState.selectedUser))) {
                resetBtn.disabled = true;
              }
              
              resetBtn.addEventListener('click', (event) => {
                event.stopPropagation(); // Empêcher la propagation
                const pairIndex = parseInt(resetBtn.getAttribute('data-pair-index'));
                
                if (pairIndex >= 0 && pairIndex < gameState.userPairs.length) {
                  // Appeler la fonction de réinitialisation pour cette paire spécifique
                  if (gameState.gamePhases && gameState.gamePhases.resetPair) {
                    gameState.gamePhases.resetPair(pairIndex);
                    
                    // Mettre à jour l'interface après la réinitialisation
                    this.updatePairButtons();
                  }
                }
              });
              
              // Assembler l'élément
              pairItem.appendChild(colorIndicator);
              pairItem.appendChild(pairInfo);
              pairItem.appendChild(resetBtn);
              
              pairsContainer.appendChild(pairItem);
            });
          },
  
  // Update the status of pair buttons
  updatePairButtons() {
    const pairsContainer = document.getElementById('user-pairs-container');
    if (!pairsContainer) return;
    
    // Update each pair item
    gameState.userPairs.forEach((pair, index) => {
      const pairItem = pairsContainer.querySelector(`[data-pair-index="${index}"]`);
      if (!pairItem) return;
      
      // Update status
      const status = pairItem.querySelector('.pair-status');
      if (status) {
        status.className = 'pair-status'; // Reset classes
        
        if (pair.connected) {
          status.textContent = 'Connected';
          status.classList.add('connected');
        } 
        else if (gameState.selectedUser && pair.users.includes(gameState.selectedUser)) {
          status.textContent = 'In progress';
          status.classList.add('in-progress');
        } 
        else {
          status.textContent = 'Disconnected';
          status.classList.add('disconnected');
        }
      }
      
      // Update reset button
      const resetBtn = pairItem.querySelector('.pair-reset-btn');
      if (resetBtn) {
        if (pair.connected || (gameState.selectedUser && pair.users.includes(gameState.selectedUser))) {
          resetBtn.disabled = false;
        } else {
          resetBtn.disabled = true;
        }
      }
    });
  }
    };
}