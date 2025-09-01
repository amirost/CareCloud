// server.js

require('dotenv/config');

const express = require('express');
const cors = require('cors'); 
const os = require('os');
const { connectDatabase } = require('../database');
const {
    createGraph,
    getAllGraphs,
    getGraphById,
    findGraphByName, // ** IMPORT DE LA NOUVELLE FONCTION **
    updateGraph,
    deleteGraph,
} = require('./crud');

const app = express();
const port = process.env.PORT || 8080;


// Middleware pour lire le JSON
app.use(express.json());
app.use(cors());

// Add a new route to get server information
app.get('/api/serverinfo', (req, res) => {
    const networkInterfaces = os.networkInterfaces();
    let ipAddress = null;
    
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
app.post('/api/graphs', createGraph);
app.get('/api/graphs', getAllGraphs);
app.get('/api/graphs/find', findGraphByName); // ** AJOUT DE LA NOUVELLE ROUTE **
app.get('/api/graphs/:id', getGraphById);
app.put('/api/graphs/:id', updateGraph);
app.delete('/api/graphs/:id', deleteGraph);
app.patch('/api/graphs/:id', updateGraph);

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