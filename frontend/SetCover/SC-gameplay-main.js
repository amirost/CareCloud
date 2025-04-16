// SC-gameplay-main.js - Main entry point for the Set Cover game
import { initCytoscape } from './modules/SC-cytoscape-init.js';
import { initGameState } from './modules/SC-game-state.js';
import { initUIManager } from './modules/SC-ui-manager.js';
import { initGraphLoader } from './modules/SC-graph-loader.js';
import { initGamePhases } from './modules/SC-game-phases.js';
import { initEventHandlers } from './modules/SC-event-handlers.js';
import { initSolutionValidator } from './modules/SC-solution-validator.js';

/**
 * Initialize and connect all components of the Set Cover game
 */
async function initializeGame() {
  console.log("Initializing Set Cover game...");
  
  try {
    // Wait for graphSaverLoader.js if needed
    if (typeof window.graphPersistence === 'undefined') {
      console.log("Waiting for graph persistence module...");
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // Initialize core game state
    const gameState = initGameState();
    console.log("Game state initialized");
    
    // Initialize Cytoscape with custom options
    await initCytoscape(gameState, {
      containerId: 'cy',
      attachToWindow: true,
      onInit: (cy) => {
        console.log("Cytoscape initialized with", cy.nodes().length, "nodes");
      }
    });
    
    if (!gameState.cy) {
      throw new Error("Failed to initialize Cytoscape");
    }
    
    // Initialize UI manager
    const uiManager = initUIManager(gameState);
    
    // Initialize event handlers
    const eventHandlers = initEventHandlers(gameState, uiManager);
    
    // Initialize game phases
    const gamePhases = initGamePhases(gameState, uiManager, eventHandlers);
    
    const solutionValidator = initSolutionValidator(gameState, uiManager);
    gameState.solutionValidator = solutionValidator;
    solutionValidator.setupKeyboardHandlers();

    // Store game phases in gameState for access by other modules
    gameState.gamePhases = gamePhases;
    
    // Connect event handlers to game phases
    eventHandlers.setupEventHandlers(gamePhases);
    
    // Initialize graph loader
    const graphLoader = initGraphLoader(gameState, uiManager);
    
    // Set up UI event listeners
    uiManager.setupUIEventListeners(graphLoader, gamePhases);
    
    // Expose debug function for development
    window.debugSCGame = () => {
      console.group("Set Cover Game Debug");
      console.log("Game phase:", gameState.phase);
      console.log("Connected users:", gameState.connectedUsers.size);
      console.log("Active antennas:", gameState.activeAntennas.size);
      console.log("Minimum consumption:", gameState.minimumConsumption);
      console.log("Game components initialized:", {
        cytoscape: !!gameState.cy,
        gamePhases: !!gameState.gamePhases,
        eventHandlers: !!eventHandlers,
        uiManager: !!uiManager,
        graphLoader: !!graphLoader,
        solutionValidator: !!solutionValidator
      });
      console.groupEnd();
      return "Debug information logged to console";
    };
    
    // Load available levels
    graphLoader.fetchSCGraphs();
    console.log("Game initialization complete");
    
  } catch (error) {
    console.error("Error initializing game:", error);
    document.getElementById("graphList").innerHTML = 
      `<p>Error initializing game: ${error.message}</p>`;
  }
}

// Initialize game when DOM is ready
document.addEventListener("DOMContentLoaded", initializeGame);