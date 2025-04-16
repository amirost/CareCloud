// RV-solution-validator.js - Handles solution validation and win conditions

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
      const currentConsumption = this.getCurrentConsumption();
      uiManager.showSolutionSaveDialog(currentConsumption, (confirmed) => {
        if (confirmed) {
          this.saveMinimumConsumption(gameState.loadedGraphId, currentConsumption);
        }
      });
    },
    
    getCurrentConsumption() {
      let totalConsumption = 0;
      
      // Add consumption from all links
      if (gameState.cy) {
        gameState.cy.edges().forEach(edge => {
          if (!edge.data('virtual') && edge.data('used')) {
            totalConsumption += edge.data('consumption') || 0;
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
          uiManager.showNotification('Solution saved successfully!');
        } else {
          console.error('Failed to save solution:', result.message);
          uiManager.showNotification('Failed to save solution!', 'error');
        }
      } catch (error) {
        console.error('Error saving solution:', error);
        uiManager.showNotification('Error saving solution!', 'error');
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
      
      // Calculer les économies actuelles
      let savingsPercentage = 0;
      if (maxConsumption > targetConsumption) {
          savingsPercentage = ((maxConsumption - currentConsumption) / (maxConsumption - targetConsumption)) * 100;
          savingsPercentage = Math.max(0, Math.min(100, savingsPercentage));
      }
      
      // Ne pas créer un nouvel indicateur, mais utiliser celui existant (la jauge)
      uiManager.updateEnergySavingsGauge(currentConsumption, maxConsumption);
      
      // Check win condition
      if (this.checkWinCondition()) {
          uiManager.showLevelCompleteMessage();
      }
  }
  };
}