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
      const currentPaths = gameState.completedPaths || [];

      uiManager.showSolutionSaveDialog(currentConsumption, (confirmed) => {
        if (confirmed) {
          this.saveOptimalSolution(gameState.loadedGraphId, currentConsumption, currentPaths);
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
    
async saveOptimalSolution(graphId, minimumConsumption, optimalPathSolution) {
      if (!graphId) {
        console.error('Cannot save solution: No graph ID loaded.');
        uiManager.showNotification('Error: No level ID found!', 'error');
        return;
      }

      try {
        console.log(`Saving optimal solution for graph ${graphId}...`);
        
        // ---- LA CORRECTION EST ICI ----
        // On utilise l'endpoint général du graphe, pas le sous-endpoint.
        const response = await fetch(`${gameState.API_URL}/${graphId}`, { // Changé de `${gameState.API_URL}/${graphId}/minimumConsumption`
          method: 'PATCH', // PATCH est parfait pour une mise à jour partielle.
          headers: {
            'Content-Type': 'application/json'
          },
          // Le body contient les champs à mettre à jour.
          body: JSON.stringify({ 
            minimumConsumption, 
            optimalPathSolution 
          })
        });
        
        const result = await response.json();
        
        if (response.ok && result.success) {
          console.log('Solution saved successfully:', result.data);
          
          // Mettre à jour l'état local avec les nouvelles données renvoyées par le serveur
          gameState.minimumConsumption = result.data.minimumConsumption;
          gameState.optimalPathSolution = result.data.optimalPathSolution;
          
          uiManager.showNotification('Solution saved successfully!');
        } else {
          console.error('Failed to save solution:', result.message || 'Unknown error');
          uiManager.showNotification(`Failed to save solution: ${result.message || 'Check console.'}`, 'error');
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
      if (this.checkWinCondition() && !gameState.applyingSolution) {
          uiManager.showLevelCompleteMessage();
      }
  }
  };
}