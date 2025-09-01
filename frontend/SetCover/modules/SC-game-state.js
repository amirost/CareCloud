// SC-game-state.js - Manages the game state and constants for Set Cover mode

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

        /**
         * @type {Set<string>}
         * Set of all user IDs that have at least one active connection to any antenna.
         */
        connectedUsers: new Set(), // Reste tel quel pour les connexions globales

        /**
         * @type {Map<string, Set<string>>}
         * RÔLE CLARIFIÉ : Maps antenna IDs to a Set of user IDs that are
         * EXPLICITLY AND CURRENTLY CONNECTED to that specific antenna.
         * This is the source of truth for which users are connected to which antenna.
         */
        antennaUsers: new Map(),   // Utilisé pour les connexions actives par antenne

        // Antenna tracking
        activeAntennas: new Set(), // Antennas manually turned ON

        // ** AJOUTS POUR LA CORRECTION **
        initialConsumption: 0,     // Consommation si toutes les antennes sont allumées
        minimumConsumption: null,  // Consommation cible (solution optimale)
        applyingSolution: false, // Pour savoir si une solution auto est en cours d'application
        // Reset game state
        reset: function() {
            this.phase = 1;
            this.selectedUser = null;
            this.selectedUserColor = null;
            this.connectedUsers = new Set();
            this.antennaUsers = new Map();
            this.activeAntennas = new Set();
            
            // ** CORRECTION IMPORTANTE **
            // Réinitialiser les valeurs de consommation pour la barre de stats
            this.initialConsumption = 0;
            this.minimumConsumption = null;
            this.applyingSolution = false;
            console.log("gameState reset: all tracking states and consumption values cleared.");
        },

        // Array of 20 distinct colors for users
        userColors:[
        "#cc3838", "#1bb3a9", "#cc9e33", "#0e6d8f", "#2b2d9b", 
        "#b43c1e", "#217e72", "#c16f2e", "#b79137", "#1e3842",
        "#ff7cd9", "#9a81a8", "#8bbde5", "#6f9fcc", "#ff95aA",
        "#c40058", "#3f0084", "#210070", "#2034bb", "#1996bd"
        ],

        // API URL for fetching graphs
        API_URL: "http://localhost:3000/api/graphs"
    };

    return gameState;
}