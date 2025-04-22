// RV-gameplay-main.js - Main entry point for the RV game
import { initCytoscape } from './modules/RV-cytoscape-init.js';
import { initGameState } from './modules/RV-game-state.js';
import { initUIManager } from './modules/RV-ui-manager.js';
import { initGraphLoader } from './modules/RV-graph-loader.js';
import { initGamePhases } from './modules/RV-game-phases.js';
import { initEventHandlers } from './modules/RV-event-handlers.js';
import { initSolutionValidator } from './modules/RV-solution-validator.js';
import { initPathFinder } from './modules/RV-path-finder.js';
import { initCourseContent } from '../course-content.js';

// --- START: Resize Handling Logic ---

/**
 * Debounce function to limit the rate at which a function can fire.
 */
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

/**
 * Handles window resize events to update Cytoscape layout.
 */
function handleResize(gameState) {
  if (gameState && gameState.cy) {
    console.log("Resizing Cytoscape instance...");
    gameState.cy.resize();
    gameState.cy.fit(null, 100);
  } else {
    console.warn("handleResize called but gameState or gameState.cy is not available.");
  }
}

// --- END: Resize Handling Logic ---


/**
 * Initialize and connect all components of the RV game
 */
async function initializeGame() {
  console.log("Initializing Green Networks game...");

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
      attachToWindow: true, // Keep this if you need global cy access (less recommended)
      onInit: (cy) => {
        console.log("Cytoscape initialized with", cy.nodes().length, "nodes");
        // --- Add Resize Listener AFTER cy is initialized ---
        const debouncedResizeHandler = debounce(() => handleResize(gameState), 250); // 250ms delay
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

    // Initialize path finder for automated path finding
    const pathFinder = initPathFinder(gameState, uiManager);
    gameState.pathFinder = pathFinder;

    const courseContent = initCourseContent(gameState, uiManager);
    gameState.courseContentModule = courseContent;

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

    courseContent.setupCourseButton();
    
    // --- ADD LISTENER FOR NEW BUTTON ---
    const resetButton = document.getElementById('resetViewBtn');
    if (resetButton) {
      resetButton.addEventListener('click', () => {
        console.log("Reset View button clicked.");
        if (gameState.cy) {
          gameState.cy.zoomingEnabled(true);
          gameState.cy.panningEnabled(true);
          // Perform the fit
          gameState.cy.resize();
          gameState.cy.fit(null,);
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
    window.debugRVGame = () => {
      console.group("Green Networks Game Debug");
      console.log("Game phase:", gameState.phase);
      console.log("User pairs:", gameState.userPairs.length);
      console.log("Connected users:", gameState.connectedUsers.size);
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
    graphLoader.fetchRVGraphs();
    console.log("Game initialization complete");
   
  } catch (error) {
    console.error("Error initializing game:", error);
    // Display error more prominently if needed
    const errorContainer = document.getElementById('level-selection') || document.body; // Fallback to body
    const errorMsg = document.createElement('p');
    errorMsg.style.color = 'red';
    errorMsg.style.padding = '20px';
    errorMsg.textContent = `Fatal Error Initializing Game: ${error.message}. Please check console.`;
    errorContainer.prepend(errorMsg); // Add error message to the top
  }
}

// Initialize game when DOM is ready
document.addEventListener("DOMContentLoaded", initializeGame);