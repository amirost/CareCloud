// SC-solution-validator.js - Handles solution validation and win conditions

export function initSolutionValidator(gameState, uiManager) {
    return {
      setupKeyboardHandlers() {
        document.addEventListener('keydown', (event) => {
          // 's' key to save solution
          if (event.key === 's' || event.key === 'S') {
            this.handleSaveSolution();
          }
        });
        
        console.log("Solution validator keyboard handlers initialized");
      },
      
      handleSaveSolution() {
          if (gameState.phase !== 3 || !this.areAllUsersConnected()) {
              uiManager.showNotification("Connectez tous les utilisateurs et soyez en phase d'optimisation pour enregistrer.", "error");
              return;
          }
          
          const currentConsumption = this.getCurrentConsumption();
          // NOUVEAU : Récupérer la liste des antennes actives
          const activeAntennaIds = Array.from(gameState.activeAntennas);

          uiManager.showSolutionSaveDialog(currentConsumption, (confirmed) => {
            if (confirmed) {
              // NOUVEAU : On utilise une nouvelle fonction pour plus de clarté
              this.saveOptimalSolution(gameState.loadedGraphId, currentConsumption, activeAntennaIds);
            }
          });
      },
      
      areAllUsersConnected() {
        const userNodes = gameState.cy.nodes('[type="user"]');
        return gameState.connectedUsers.size === userNodes.length;
      },
      
      getCurrentConsumption() {
        let totalConsumption = 0;
        
        // Add consumption from active antennas only
        if (gameState.cy) {
          gameState.cy.nodes('[type="antenna"]').forEach(antenna => {
            if (antenna.data('active') !== false) {
              totalConsumption += antenna.data('consumption') || 100;
            }
          });
        }
        
        return totalConsumption;
      },
      
      async saveOptimalSolution(graphId, minimumConsumption, optimalAntennaSet) {
              try {
                  // ---- LA CORRECTION EST ICI ----
                  // On utilise la route PATCH générique sur le graphe, pas une route spécifique
                  const response = await fetch(`${gameState.API_URL}/${graphId}`, {
                      method: 'PATCH',
                      headers: {
                          'Content-Type': 'application/json'
                      },
                      // On envoie les deux informations
                      body: JSON.stringify({ 
                          minimumConsumption, 
                          optimalAntennaSet 
                      })
                  });
                
                  const result = await response.json();
                
                  if (response.ok && result.success) {
                      console.log('Solution saved successfully');
                      // Mettre à jour l'état local
                      gameState.minimumConsumption = minimumConsumption;
                      gameState.optimalAntennaSet = optimalAntennaSet; // NOUVEAU
                      uiManager.showNotification('Solution enregistrée avec succès!');
                  } else {
                      console.error('Failed to save solution:', result.message);
                      uiManager.showNotification("Échec de l'enregistrement de la solution!", 'error');
                  }
              } catch (error) {
                  console.error('Error saving solution:', error);
                  uiManager.showNotification("Erreur lors de l'enregistrement de la solution!", 'error');
              }
          },
      
      checkWinCondition() {
        if (gameState.minimumConsumption === null) {
          return false;
        }
        
        const currentConsumption = this.getCurrentConsumption();
        return Math.abs(currentConsumption - gameState.minimumConsumption) < 0.01; // Allow small float differences
      },
      
      updateProgressIndicator() {
        if (gameState.minimumConsumption === null) {
            return;
        }
        
        const currentConsumption = this.getCurrentConsumption();
        const targetConsumption = gameState.minimumConsumption;
        const maxConsumption = gameState.initialConsumption || 0;
        
        // Calculate energy savings percentage
        let savingsPercentage = 0;
        if (maxConsumption > targetConsumption) {
            savingsPercentage = ((maxConsumption - currentConsumption) / (maxConsumption - targetConsumption)) * 100;
            savingsPercentage = Math.max(0, Math.min(100, savingsPercentage));
        }
        
        // Update the energy savings gauge
        uiManager.updateEnergySavingsGauge(currentConsumption, maxConsumption);
        
        console.log("solution appliqué automatiquement : ", gameState.applyingSolution);
        // Check win condition
        if (this.checkWinCondition() && !gameState.applyingSolution) {
          
            uiManager.showLevelCompleteMessage();
        }
      },
      
      isValidSolution() {
        // A valid solution must have all users connected
        if (!this.areAllUsersConnected()) {
          return false;
        }
        
        // Check if all connections are through active antennas
        let allConnectionsValid = true;
        
        gameState.cy.edges('[virtual]').forEach(edge => {
          const antennaId = edge.target().id();
          const antennaNode = gameState.cy.getElementById(antennaId);
          
          if (!antennaNode || antennaNode.data('active') === false) {
            allConnectionsValid = false;
          }
        });
        
        return allConnectionsValid;
      }
    };
}