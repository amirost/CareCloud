// SC-gameplay-main.js - Main entry point for the Set Cover game
import { initCytoscape } from './modules/SC-cytoscape-init.js';
import { initGameState } from './modules/SC-game-state.js';
import { initUIManager } from './modules/SC-ui-manager.js';
import { initGraphLoader } from './modules/SC-graph-loader.js';
import { initGamePhases } from './modules/SC-game-phases.js';
import { initEventHandlers } from './modules/SC-event-handlers.js';
import { initSolutionValidator } from './modules/SC-solution-validator.js';
import { initPathFinder } from './modules/SC-path-finder.js';

function debounce(func, wait, immediate) {
  let timeout;
  return function executedFunction() {
    const context = this;
    const args = arguments;
    const later = function() {
      timeout = null;
      if (!immediate) func.apply(context, args);
    };
    const callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) func.apply(context, args);
  };
}

function handleResize(gameState) {
  if (gameState && gameState.cy) {
    console.log("Resizing Cytoscape instance...");
    gameState.cy.resize();
    gameState.cy.fit(null, 50); // Fit with 50px padding
  } else {
    console.warn("handleResize called but gameState or gameState.cy is not available.");
  }
}

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
        // Add resize handler
        const debouncedResizeHandler = debounce(() => handleResize(gameState), 250);
        window.addEventListener('resize', debouncedResizeHandler);
        console.log("Resize listener added for Cytoscape.");
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

    // Initialize path finder for automated antenna optimization
    const pathFinder = initPathFinder(gameState, uiManager);
    gameState.pathFinder = pathFinder;

    // Store game phases in gameState for access by other modules
    gameState.gamePhases = gamePhases;
    
    // Connect event handlers to game phases
    eventHandlers.setupEventHandlers(gamePhases);
    
    // Initialize graph loader
    const graphLoader = initGraphLoader(gameState, uiManager);
    
    // Set up UI event listeners
    uiManager.setupUIEventListeners(graphLoader, gamePhases);
    
    // Set up path finder buttons
    pathFinder.setupPathFinderButtons();
    
    const resetButton = document.getElementById('resetViewBtn');
    if (resetButton) {
      resetButton.addEventListener('click', () => {
        console.log("Reset View button clicked.");
        if (gameState.cy) {
          // Enable zoom and pan temporarily for the fit operation
          gameState.cy.zoomingEnabled(true);
          gameState.cy.panningEnabled(true);
          
          // Perform the fit
          gameState.cy.resize();
          gameState.cy.fit();
          
          // Re-disable if needed for gameplay
          gameState.cy.zoomingEnabled(false);
          gameState.cy.panningEnabled(false);
        } else {
          console.error("Cannot reset view, Cytoscape instance not found.");
        }
      });
      console.log("Reset View button listener added.");
    } else {
      console.warn("Reset View button (resetViewBtn) not found in the DOM.");
    }

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
        solutionValidator: !!solutionValidator,
        pathFinder: !!pathFinder
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