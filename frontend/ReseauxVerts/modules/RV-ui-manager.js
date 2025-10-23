// RV-ui-manager.js - Handles UI elements and interactions

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
        restorePlayerSolutionBtn: document.getElementById("restorePlayerSolutionBtn"),
        toggleCapacityBtn: document.getElementById("toggleCapacityBtn"),
        popupMessage: document.getElementById("popup-message"),
        connectedCount: document.getElementById("connected-count"),
        totalUsers: document.getElementById("total-users"),
        consumption: document.getElementById("consumption"),
        // New UI elements for the gauge
        consumptionGauge: document.getElementById("consumption-gauge"),
        consumptionPercentage: document.getElementById("consumption-percentage")
    };
    
    return {

        initTooltip() {
            let tooltip = document.getElementById('game-tooltip');
            if (!tooltip) {
                tooltip = document.createElement('div');
                tooltip.id = 'game-tooltip';
                tooltip.className = 'game-tooltip';
                document.body.appendChild(tooltip);
            }
            // On stocke la référence dans l'objet ui pour y accéder plus tard si besoin
            // (Bien que l'accès direct via getElementById fonctionne aussi)
            if (!ui.gameTooltip) {
               ui.gameTooltip = tooltip;
            }
            console.log("Tooltip element initialized for RV mode.");
        },

        // NOUVELLE FONCTION : Pour afficher la bulle
        showTooltip(content, x, y) {
            let tooltip = document.getElementById('game-tooltip');
            if (!tooltip) return;
            tooltip.innerHTML = content;
            tooltip.style.left = `${x}px`;
            tooltip.style.top = `${y}px`;
            tooltip.classList.add('visible');
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

        // NOUVELLE FONCTION : Pour cacher la bulle
        hideTooltip() {
            let tooltip = document.getElementById('game-tooltip');
            if (!tooltip) return;
            tooltip.classList.remove('visible');
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
            // 1. D'abord, on retire l'ancienne classe d'animation.
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
          ui.connectedCount.textContent = gameState.connectedUsers.size;
          let totalConsumption = 0;
          
          // Si initialConsumption n'a pas encore été calculé pour ce niveau, on le fait.
          if (gameState.initialConsumption === 0 && gameState.cy) {
              let initialCalc = 0;
              // Calcul de la conso max des liens
              gameState.cy.edges(':not([virtual])').forEach(edge => {
                  initialCalc += edge.data('consumption') || 0;
              });
              // Calcul de la conso max des antennes (si activé)
              if (gameState.antennaSettings.consumptionEnabled) {
                  gameState.cy.nodes('[type="antenna"]').forEach(antenna => {
                      initialCalc += antenna.data('consumption') || 0;
                  });
              }
              gameState.initialConsumption = initialCalc;
              console.log(`Initial Consumption calculated for this level: ${gameState.initialConsumption}`);
          }
          
          // Maintenant, on calcule juste la consommation actuelle
          if (gameState.cy) {
              gameState.cy.edges(':not([virtual])').forEach(edge => {
                  if (edge.data('used')) {
                      totalConsumption += edge.data('consumption') || 0;
                  }
              });
              if (gameState.antennaSettings.consumptionEnabled) {
                  gameState.cy.nodes('[type="antenna"]').forEach(antenna => {
                      if (antenna.data('active')) {
                          totalConsumption += antenna.data('consumption') || 0;
                      }
                  });
              }
          }
          
          const maxConsumption = gameState.initialConsumption;
          ui.consumption.textContent = totalConsumption.toFixed(0);
          
          this.updateEnergySavingsGauge(totalConsumption, maxConsumption);
          
          this.updatePairButtons();
          
          // ... (logique d'aide contextuelle)
          
          if (gameState.solutionValidator) {
              gameState.solutionValidator.updateProgressIndicator();
          }
      },
        

        updateEnergySavingsGauge(currentConsumption, maxConsumption) {
            if (!ui.consumptionGauge || !ui.consumptionPercentage) return;

            const targetConsumption = gameState.minimumConsumption;

            // ** DÉBUT DES LOGS DE DÉBOGAGE **
            console.groupCollapsed('[Debug Jauge] - updateEnergySavingsGauge');
            console.log(`Valeur reçue : currentConsumption = ${currentConsumption}`);
            console.log(`Valeur reçue : maxConsumption = ${maxConsumption}`);
            console.log(`Cible chargée : targetConsumption = ${targetConsumption}`);
            // ** FIN DES LOGS DE DÉBOGAGE **

            // Si on n'a pas encore de cible, on utilise l'ancienne logique de couleur.
            if (targetConsumption === null || targetConsumption === undefined) {
                console.log("--> Décision : Pas de cible. Utilisation de la logique par défaut.");
                if (maxConsumption === 0) {
                    ui.consumptionGauge.style.width = "0%";
                    ui.consumptionPercentage.textContent = "N/A";
                    ui.consumptionGauge.style.backgroundColor = '#9e9e9e';
                    console.log("--> Résultat : Barre à 0% (maxConsumption est 0).");
                    console.groupEnd();
                    return;
                }
                const percentage = (currentConsumption / maxConsumption) * 100;
                ui.consumptionGauge.style.width = `${Math.min(100, percentage)}%`;
                ui.consumptionPercentage.textContent = `${Math.round(percentage)}% de la conso. max`;
                
                if (percentage <= 33) ui.consumptionGauge.style.backgroundColor = '#4CAF50';
                else if (percentage <= 66) ui.consumptionGauge.style.backgroundColor = '#FFC107';
                else ui.consumptionGauge.style.backgroundColor = '#F44336';

                console.log(`--> Résultat : Barre à ${percentage.toFixed(2)}% de largeur.`);
                console.groupEnd();
                return;
            }

            // --- NOUVELLE LOGIQUE DE COULEUR BASÉE SUR L'OBJECTIF ---
            console.log("--> Décision : Une cible existe. Utilisation de la logique basée sur l'objectif.");
            const widthPercentage = (currentConsumption / maxConsumption) * 100;
            ui.consumptionGauge.style.width = `${Math.min(100, widthPercentage)}%`;
            console.log(`Calcul de la largeur de la barre : (${currentConsumption} / ${maxConsumption}) * 100 = ${widthPercentage.toFixed(2)}%`);
            
            let color;
            // CAS 1 : On a atteint ou dépassé l'objectif (bravo !)
            if (currentConsumption <= targetConsumption) {
                console.log("--> Sous-décision : Consommation actuelle <= Cible. La barre sera verte.");
                color = '#4CAF50'; // Vert
                ui.consumptionPercentage.textContent = "Objectif atteint !";
            } 
            // CAS 2 : On est au-dessus de l'objectif.
            else {
                console.log("--> Sous-décision : Consommation actuelle > Cible. Calcul de la couleur orange/rouge.");
                const rangeAboveTarget = maxConsumption - targetConsumption;
                const distanceFromTarget = currentConsumption - targetConsumption;
                let severity = 0;
                if (rangeAboveTarget > 0) {
                    severity = Math.min(1, distanceFromTarget / rangeAboveTarget);
                }
                console.log(`Calcul de la "sévérité" : ${severity.toFixed(2)} (0=proche de l'objectif, 1=au max)`);

                const r = Math.round(255 + (244 - 255) * severity);
                const g = Math.round(193 + (67 - 193) * severity);
                const b = Math.round(7 + (54 - 7) * severity);
                color = `rgb(${r}, ${g}, ${b})`;
                
                const remainingEffort = distanceFromTarget.toFixed(0);
                ui.consumptionPercentage.textContent = `+${remainingEffort} W de l'objectif`;
            }

            ui.consumptionGauge.style.backgroundColor = color;
            console.log(`--> Résultat : Couleur appliquée = ${color}`);
            
            this.updateOptimalSolutionMarker(targetConsumption, maxConsumption);
            console.groupEnd();
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

            if (ui.toggleCapacityBtn) {
              ui.toggleCapacityBtn.addEventListener('click', () => {
                // 1. Inverser l'état dans gameState
                gameState.showCapacityLabels = !gameState.showCapacityLabels;

                // 2. Mettre à jour l'apparence du bouton en utilisant notre nouvelle fonction
                this.updateCapacityButtonUI();

                // 3. Forcer Cytoscape à redessiner les styles pour appliquer les changements
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
            let pairsContainer = document.getElementById('user-pairs-container');
            if (!pairsContainer) {
              return;
            }
            
            pairsContainer.innerHTML = '';
            
            gameState.userPairs.forEach((pair, index) => {
              const pairItem = document.createElement('div');
              // ... (le code de création de l'élément de la liste est inchangé)
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

              // ** LOGIQUE DE SURBRILLANCE BASÉE SUR LES UTILISATEURS **
              pairItem.addEventListener('mouseover', () => {
                if (!gameState.cy) return;

                // 1. Trouver les données du chemin en se basant sur les IDs des utilisateurs
                const [user1Id, user2Id] = pair.users;
                const completedPathData = gameState.completedPaths.find(p => 
                    p.path.includes(user1Id) && p.path.includes(user2Id)
                );
                
                // Si le chemin n'est pas (encore) connecté, on surligne juste les utilisateurs.
                if (!completedPathData || !completedPathData.path) {
                    const user1 = gameState.cy.getElementById(user1Id);
                    const user2 = gameState.cy.getElementById(user2Id);
                    if (user1) user1.addClass('highlighted-node');
                    if (user2) user2.addClass('highlighted-node');
                    return;
                }
                
                // 2. Surligner tous les NŒUDS du chemin (utilisateurs, antennes, routeurs)
                const nodeSelector = completedPathData.path.map(nodeId => `#${nodeId}`).join(', ');
                const pathNodes = gameState.cy.nodes(nodeSelector);
                pathNodes.addClass('highlighted-node');

                // 3. Surligner les ARÊTES qui connectent les nœuds du chemin
                const pathEdges = gameState.cy.collection();
                const pathNodeIds = completedPathData.path;
                for (let i = 0; i < pathNodeIds.length - 1; i++) {
                    const sourceNode = gameState.cy.getElementById(pathNodeIds[i]);
                    const targetNode = gameState.cy.getElementById(pathNodeIds[i+1]);
                    const edge = sourceNode.edgesWith(targetNode);
                    if (edge.length > 0) {
                        pathEdges.merge(edge);
                    }
                }
                pathEdges.addClass('highlighted-edge');
              });

              pairItem.addEventListener('mouseout', () => {
                if (!gameState.cy) return;
                // On retire les deux classes de tous les éléments.
                gameState.cy.elements().removeClass('highlighted-node highlighted-edge');
              });

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
      
      pairItem.classList.toggle('is-connected', pair.connected);
      // Update status
      const status = pairItem.querySelector('.pair-status');
      if (status) {
        status.className = 'pair-status'; // Reset classes
        
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
  },

          // ** NOUVELLE FONCTION POUR CRÉER LE TEXTE FLOTTANT **
        createFloatingText(text, targetElement, type = 'plus') {
            if (!targetElement) {
                console.error("Impossible de créer le texte flottant : élément cible manquant.");
                return;
            }

            // Créer l'élément de texte
            const textElement = document.createElement('div');
            textElement.className = 'floating-text';
            textElement.textContent = text;

            // Ajouter une classe pour la couleur (score-plus ou score-minus)
            if (type === 'plus') {
                textElement.classList.add('score-plus');
            } else if (type === 'minus') {
                textElement.classList.add('score-minus');
            }

            // Ajouter l'élément au body pour qu'il soit au-dessus de tout
            document.body.appendChild(textElement);

            // Positionner le texte au-dessus de l'élément cible
            const rect = targetElement.getBoundingClientRect();
            textElement.style.left = `${rect.left + rect.width / 2}px`;
            textElement.style.top = `${rect.top}px`;

            // Supprimer l'élément du DOM après la fin de l'animation (1.5s)
            setTimeout(() => {
                if (textElement.parentElement) {
                    textElement.parentElement.removeChild(textElement);
                }
            }, 1500);
        },
    };
}