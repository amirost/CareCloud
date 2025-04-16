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
        
        // Reset game state
        reset: function() {
            this.phase = 1;
            this.selectedUser = null;
            this.selectedUserColor = null;
            this.currentUserPair = null;
            this.connectedUsers = new Set();
            this.usedLinks = new Map();
            this.currentPath = null;
        }
    };
    
    // Array of 20 distinct colors for user pairs
    gameState.userColors = [
        '#FF6B6B', '#4ECDC4', '#FFD166', '#118AB2', '#5E60CE', 
        '#E76F51', '#2A9D8F', '#F4A261', '#E9C46A', '#264653',
        '#FFAFCC', '#CDB4DB', '#BDE0FE', '#A2D2FF', '#FFC8DD',
        '#F72585', '#7209B7', '#3A0CA3', '#4361EE', '#4CC9F0'
    ];
    
    // API URL for fetching graphs
    gameState.API_URL = "http://localhost:3000/api/graphs";
    
    return gameState;
}