// Cloud-gameplay-main.js - Main entry point for the cloud game
import { initCytoscape } from './modules/Cloud-cytoscape-init.js';
import { initGameState } from './modules/Cloud-game-state.js';
import { initUIManager } from './modules/Cloud-ui-manager.js';
import { initGraphLoader } from './modules/Cloud-graph-loader.js';
import { initGamePhases } from './modules/Cloud-game-phases.js';
import { initEventHandlers } from './modules/Cloud-event-handlers.js';
import { initSolutionValidator } from './modules/Cloud-solution-validator.js';
import { initPathFinder } from './modules/Cloud-path-finder.js';
import { initCourseContent } from '../course-content.js';
import { initTaskPlacement } from './modules/Cloud-task-placement.js';


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

/**
 * Initialize and connect all components of the Cloud game
 */
async function initializeGame() {
  console.log("Initializing Cloud game...");

  try {
    // Wait for graphSaverLoader.js if it's not ready yet
    if (typeof window.graphPersistence === 'undefined') {
      console.log("Waiting for graph persistence module...");
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Initialize core game state
    const gameState = initGameState();
    console.log("Game state initialized for Cloud mode");

    // Initialize Cytoscape with custom options
    await initCytoscape(gameState, {
      containerId: 'cy',
      attachToWindow: true,
      onInit: (cy) => {
        console.log("Cytoscape initialized with", cy.nodes().length, "nodes");
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
    uiManager.initTooltip();
    
    // Initialize the task placement popup manager and inject it into the uiManager
    const taskPlacementManager = initTaskPlacement(gameState, uiManager);
    uiManager.taskPlacement = taskPlacementManager;

    // Initialize event handlers
    const eventHandlers = initEventHandlers(gameState, uiManager);
    gameState.eventHandlers = eventHandlers;

    // Initialize game phases
    const gamePhases = initGamePhases(gameState, uiManager, eventHandlers);
    gameState.gamePhases = gamePhases;

    // Initialize solution validator
    const solutionValidator = initSolutionValidator(gameState, uiManager);
    gameState.solutionValidator = solutionValidator;
    solutionValidator.setupKeyboardHandlers();

    // Initialize path finder for automated solutions
    const pathFinder = initPathFinder(gameState, uiManager);
    gameState.pathFinder = pathFinder;

    // Initialize course content module
    const courseContent = initCourseContent(gameState, uiManager);
    gameState.courseContentModule = courseContent;

    // Connect event handlers to game phases
    eventHandlers.setupEventHandlers(gamePhases);

    // Initialize graph loader
    const graphLoader = initGraphLoader(gameState, uiManager);

    // Set up UI event listeners from the main UI manager
    uiManager.setupUIEventListeners(graphLoader, gamePhases);
    
    // Set up path finder buttons
    pathFinder.setupPathFinderButtons();

    // Set up course content button
    courseContent.setupCourseButton();

    // Set up the view reset button
    const resetButton = document.getElementById('resetViewBtn');
    if (resetButton) {
      resetButton.addEventListener('click', () => {
        if (gameState.cy) {
          gameState.cy.zoomingEnabled(true);
          gameState.cy.panningEnabled(true);
          gameState.cy.resize();
          gameState.cy.fit();
          gameState.cy.zoomingEnabled(false);
          gameState.cy.panningEnabled(false);
        }
      });
    }
    
    // Extend graphLoader to show start-of-level message
    const originalStartGameplay = graphLoader.startGameplay;
    graphLoader.startGameplay = function(graphId) {
      document.querySelector('.gameplay').style.visibility = 'visible';
      originalStartGameplay.call(this, graphId);
      setTimeout(() => {
        if (gameState.courseContentModule) {
          gameState.courseContentModule.showStartContent();
        }
      }, 1000);
    };
    
    // Extend solutionValidator to show end-of-level message on win
    if (solutionValidator) {
      const originalUpdateProgressIndicator = solutionValidator.updateProgressIndicator;
      solutionValidator.updateProgressIndicator = function() {
        originalUpdateProgressIndicator.apply(this, arguments);
        if (this.checkWinCondition()) {
          setTimeout(() => {
            if (gameState.courseContentModule) {
              gameState.courseContentModule.showEndContent();
            }
          }, 1500);
        }
      };
    }
    
    console.log("Level message system initialized");

    // Load available levels for Cloud mode
    graphLoader.fetchCloudGraphs();
    
    console.log("Game initialization complete");
   
  } catch (error) {
    console.error("Error initializing game:", error);
    const errorContainer = document.getElementById('level-selection') || document.body;
    const errorMsg = document.createElement('p');
    errorMsg.style.color = 'red';
    errorMsg.style.padding = '20px';
    errorMsg.textContent = `Fatal Error Initializing Game: ${error.message}. Please check console.`;
    errorContainer.prepend(errorMsg);
  }
}

// Initialize game when DOM is ready
document.addEventListener("DOMContentLoaded", initializeGame);