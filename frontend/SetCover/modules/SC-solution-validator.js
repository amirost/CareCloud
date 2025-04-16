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
        // Only allow saving in phase 3 and if all users are connected
        if (gameState.phase !== 3) {
          uiManager.showNotification("Connectez tous les utilisateurs avant d'enregistrer la solution", "error");
          return;
        }
        
        const areAllUsersConnected = this.areAllUsersConnected();
        if (!areAllUsersConnected) {
          uiManager.showNotification("Tous les utilisateurs doivent être connectés pour enregistrer la solution", "error");
          return;
        }
        
        const currentConsumption = this.getCurrentConsumption();
        uiManager.showSolutionSaveDialog(currentConsumption, (confirmed) => {
          if (confirmed) {
            this.saveMinimumConsumption(gameState.loadedGraphId, currentConsumption);
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
      
      async saveMinimumConsumption(graphId, minimumConsumption) {
        try {
          const response = await fetch(`${gameState.API_URL}/${graphId}/minimumConsumption`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ minimumConsumption })
          });
          
          const result = await response.json();
          
          if (result.success) {
            console.log('Solution saved successfully');
            // Update local game state
            gameState.minimumConsumption = minimumConsumption;
            // Show success message
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
        
        // Check win condition
        if (this.checkWinCondition()) {
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