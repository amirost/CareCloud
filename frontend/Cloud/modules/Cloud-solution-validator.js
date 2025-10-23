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
      
      // ** NOUVEAU : On récupère aussi l'état des antennes **
      const activeAntennaIds = gameState.antennaSettings.consumptionEnabled 
          ? Array.from(gameState.activeAntennas) 
          : undefined; // On ne sauvegarde `undefined` si la fonction n'est pas active

      uiManager.showSolutionSaveDialog(currentConsumption, (confirmed) => {
        if (confirmed) {
          this.saveOptimalSolution(gameState.loadedGraphId, currentConsumption, currentPaths, activeAntennaIds);
        }
      });
    },
    
getCurrentConsumption() {
      console.groupCollapsed("--- DEBUG: solutionValidator.getCurrentConsumption() ---");
      let totalConsumption = 0;
      
      if (gameState.cy) {
        // a) Consommation des liens utilisés
        let linksConsumption = 0;
        gameState.cy.edges(':not([virtual])').forEach(edge => {
          if (edge.data('used')) {
            linksConsumption += edge.data('consumption') || 0;
          }
        });
        totalConsumption += linksConsumption;
        console.log(`1. Consommation Liens: ${linksConsumption.toFixed(0)}W`);
        
        // b) Consommation des antennes actives
        let antennasConsumption = 0;
        if (gameState.antennaSettings.consumptionEnabled) {
          gameState.cy.nodes('[type="antenna"]').forEach(antenna => {
            if (antenna.data('active')) {
              antennasConsumption += antenna.data('consumption') || 0;
            }
          });
        }
        totalConsumption += antennasConsumption;
        console.log(`2. Consommation Antennes: ${antennasConsumption.toFixed(0)}W`);

        // c) Consommation des serveurs actifs (uniquement Cloud)
        let cloudServersConsumption = 0;
        if (gameState.cloudNode && gameState.cloudNode.data('servers')) {
            console.log("Analyse des serveurs sur gameState.cloudNode...");
            gameState.cloudNode.data('servers').forEach(server => {
                if(server.isOn) {
                    const consumption = server.consumption || 0;
                    cloudServersConsumption += consumption;
                    console.log(` -> Serveur Cloud '${server.name}' est ON. Ajout de ${consumption}W.`);
                } else {
                    console.log(` -> Serveur Cloud '${server.name}' est OFF.`);
                }
            });
        } else {
            console.log("Aucun serveur Cloud trouvé sur gameState.cloudNode.");
        }
        totalConsumption += cloudServersConsumption;
        console.log(`3. Consommation Serveurs Cloud: ${cloudServersConsumption.toFixed(0)}W`);
      }
      
      console.log(`TOTAL FINAL: ${totalConsumption.toFixed(0)}W`);
      console.groupEnd();
      return totalConsumption;
    },
    
    async saveOptimalSolution(graphId, minimumConsumption, optimalPathSolution, optimalAntennaSet) {
      if (!graphId) { /* ... */ }

      try {
        const body = { 
            minimumConsumption, 
            optimalPathSolution 
        };
        // On ajoute le set d'antennes au corps de la requête SEULEMENT s'il est défini
        if (optimalAntennaSet !== undefined) {
            body.optimalAntennaSet = optimalAntennaSet;
        }

        const response = await fetch(`${gameState.API_URL}/${graphId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
        
        const result = await response.json();
        
        if (response.ok && result.success) {
          // Mettre à jour l'état local avec les nouvelles données
          gameState.minimumConsumption = result.data.minimumConsumption;
          gameState.optimalPathSolution = result.data.optimalPathSolution;
          // On met à jour l'état des antennes de la solution si elle est renvoyée
          gameState.optimalAntennaSet = result.data.optimalAntennaSet; 
          uiManager.showNotification('Solution enregistrée avec succès!');
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