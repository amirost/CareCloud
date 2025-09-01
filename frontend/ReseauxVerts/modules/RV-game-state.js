// rv-game-state.js - Manages the game state and constants

export function initGameState() {
    // Game state variables
    const gameState = {
        // Cytoscape instance
        cy: null,
        
        // Game phases
        phase: 1,
        
        // User tracking
        selectedUser: null,
        selectedUserColor: null,
        currentUserPair: 0,
        userPairs: [],
        connectedUsers: new Set(),
        
        // Network tracking
        usedLinks: new Map(), // Map of edge IDs to array of colors using that link
        currentPath: null,
        completedPaths: [],

        showCapacityLabels: false,

        // ** AJOUTS POUR LA CORRECTION **
        initialConsumption: 0,     // Consommation si tous les liens sont utilisés
        minimumConsumption: null,  // Consommation cible (solution optimale)
        applyingSolution: false,
        // Reset game state
        reset: function() {
            this.phase = 1;
            this.selectedUser = null;
            this.selectedUserColor = null;
            this.currentUserPair = null;
            this.connectedUsers = new Set();
            this.usedLinks = new Map();
            this.currentPath = null;
            this.completedPaths = [];
            this.showCapacityLabels = false; 
            this.applyingSolution = false;

            // ** CORRECTION IMPORTANTE **
            // Réinitialiser les valeurs de consommation pour la barre de stats
            this.initialConsumption = 0;
            this.minimumConsumption = null;
        }
    };
    
    // Array of 20 distinct colors for user pairs
    gameState.userColors = [
        "#cc3838", "#1bb3a9", "#cc9e33", "#0e6d8f", "#2b2d9b", 
        "#b43c1e", "#217e72", "#c16f2e", "#b79137", "#1e3842",
        "#ff7cd9", "#9a81a8", "#8bbde5", "#6f9fcc", "#ff95aA",
        "#c40058", "#3f0084", "#210070", "#2034bb", "#1996bd"
    ];
    
    // API URL for fetching graphs
    gameState.API_URL = "http://localhost:3000/api/graphs";
    
    return gameState;
}