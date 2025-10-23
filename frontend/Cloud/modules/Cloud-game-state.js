// rv-game-state.js - Manages the game state and constants

export function initGameState() {
    const gameState = {
        cy: null,
        phase: 1,
        
        // --- PROPRIÉTÉS HÉRITÉES DE RV ---
        selectedUser: null,
        selectedUserColor: null,
        currentUserPair: 0,
        userPairs: [], // Pour les utilisateurs en paires
        connectedUsers: new Set(),
        usedLinks: new Map(),
        currentPath: null,
        completedPaths: [],
        playerSolutionBackup: null,
        showCapacityLabels: false,
        applyingSolution: false,
        connectionTarget: 'user',
        
        clients: [], // Pour stocker les données des clients cloud (tâches, etc.)
        cloudNode: null, // Référence au nœud Cloud principal
        
        // Propriétés de niveau
        antennaSettings: { consumptionEnabled: false },
        activeAntennas: new Set(),
        initialConsumption: 0,
        minimumConsumption: null,
        optimalPathSolution: [],
        optimalAntennaSet: [],
        
        reset: function() {
            this.phase = 1;
            this.selectedUser = null;
            this.selectedUserColor = null;
            this.currentUserPair = null;
            this.userPairs = [];
            this.connectedUsers = new Set();
            this.usedLinks = new Map();
            this.currentPath = null;
            this.completedPaths = [];
            this.playerSolutionBackup = null;
            this.showCapacityLabels = false; 
            this.applyingSolution = false;
            this.connectionTarget = 'user';

            this.clients = [];
            this.cloudNode = null;
            
            this.antennaSettings = { consumptionEnabled: false };
            this.activeAntennas = new Set();
            // `initialConsumption` et `minimumConsumption` ne sont pas réinitialisés ici
        },
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