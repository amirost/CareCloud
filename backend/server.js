require('dotenv/config');

const express = require('express');
const cors = require('cors'); 
const os = require('os'); // Add this for network interface information
const { connectDatabase } = require('../database');
const {
    createGraph,
    getAllGraphs,
    getGraphById,
    updateGraph,
    deleteGraph,
    updateMinimumConsumption 
} = require('./crud'); // Import des fonctions CRUD

const app = express();
const port = process.env.PORT || 8080;


// Middleware pour lire le JSON
app.use(express.json());
app.use(cors());

// Add a new route to get server information
app.get('/api/serverinfo', (req, res) => {
    // Get all network interfaces
    const networkInterfaces = os.networkInterfaces();
    let ipAddress = null;
    
    // Find the first non-internal IPv4 address
    Object.keys(networkInterfaces).forEach((interfaceName) => {
        networkInterfaces[interfaceName].forEach((iface) => {
            if (iface.family === 'IPv4' && !iface.internal) {
                ipAddress = ipAddress || iface.address;
            }
        });
    });
    
    res.json({
        success: true,
        ip: ipAddress || req.headers.host.split(':')[0],
        port: port
    });
});

// Routes API
app.post('/api/graphs', createGraph);      // Créer un graphe
app.get('/api/graphs', getAllGraphs);      // Récupérer tous les graphes
app.get('/api/graphs/:id', getGraphById);  // Récupérer un graphe par ID
app.put('/api/graphs/:id', updateGraph);   // Mettre à jour un graphe
app.delete('/api/graphs/:id', deleteGraph);// Supprimer un graphe
app.patch('/api/graphs/:id/minimumConsumption', updateMinimumConsumption);

// Test de connexion
app.get('/', (req, res) => {
    res.send("Hello from Node API");
});

// Connexion à la base de données
(async () => {
    await connectDatabase();
})();

// Lancer le serveur
app.listen(port, '0.0.0.0', () => {
    // Get server's IP addresses for easier connection
    const networkInterfaces = os.networkInterfaces();
    const addresses = [];
    
    Object.keys(networkInterfaces).forEach((interfaceName) => {
        networkInterfaces[interfaceName].forEach((iface) => {
            if (iface.family === 'IPv4' && !iface.internal) {
                addresses.push(iface.address);
            }
        });
    });
    
    console.log(`Server is running on http://0.0.0.0:${port}`);
    console.log(`Connect from other devices using:`);
    addresses.forEach(address => {
        console.log(`http://${address}:${port}`);
    });
});