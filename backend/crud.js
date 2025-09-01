// crud.js

const Graph = require('./models/graphModel');

// Create a new graph
async function createGraph(req, res) {
    try {
        const graphData = req.body;
        const newGraph = new Graph(graphData);
        await newGraph.save();
        res.status(201).json({
            success: true,
            data: newGraph,
            message: 'Graph created successfully'
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
}

// Get all graphs
async function getAllGraphs(req, res) {
    try {
        // Filter by game type if provided
        const filter = {};
        if (req.query.mode) {
            filter.mode = req.query.mode;
        }
        
        const graphs = await Graph.find(filter);
        res.status(200).json({
            success: true,
            count: graphs.length,
            data: graphs
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
}

// Get a graph by ID
async function getGraphById(req, res) {
    try {
        const graph = await Graph.findById(req.params.id);
        if (!graph) {
            return res.status(404).json({
                success: false,
                message: 'Graph not found'
            });
        }
        res.status(200).json({
            success: true,
            data: graph
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
}

// ** NOUVELLE FONCTION AJOUTÉE **
// Find a graph by name and mode
async function findGraphByName(req, res) {
    try {
        const { name, mode } = req.query;

        if (!name || !mode) {
            return res.status(400).json({ 
                success: false, 
                message: 'Name and mode query parameters are required' 
            });
        }

        // Search for a graph that matches both name and mode
        const graph = await Graph.findOne({ name, mode });

        // It's not an error if not found, we just return null data
        if (!graph) {
            return res.status(200).json({ 
                success: true, 
                data: null,
                message: 'No graph found with that name and mode'
            });
        }

        // If found, return the graph data
        res.status(200).json({ 
            success: true, 
            data: graph 
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server error while finding graph by name',
            error: error.message
        });
    }
}


// Update a graph
async function updateGraph(req, res) {
    try {
        const graph = await Graph.findByIdAndUpdate(
            req.params.id,
            req.body,
            {
                new: true,
                runValidators: true
            }
        );
        if (!graph) {
            return res.status(404).json({
                success: false,
                message: 'Graph not found'
            });
        }
        res.status(200).json({
            success: true,
            data: graph,
            message: 'Graph updated successfully'
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
}

// Delete a graph
async function deleteGraph(req, res) {
    try {
        const graph = await Graph.findByIdAndDelete(req.params.id);
        if (!graph) {
            return res.status(404).json({
                success: false,
                message: 'Graph not found'
            });
        }
        res.status(200).json({
            success: true,
            message: 'Graph deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
}

async function updateMinimumConsumption(req, res) {
    try {
      const { id } = req.params;
      const { minimumConsumption } = req.body;
      
      const graph = await Graph.findByIdAndUpdate(
        id,
        { minimumConsumption },
        { new: true, runValidators: true }
      );
      
      if (!graph) {
        return res.status(404).json({
          success: false,
          message: 'Graph not found'
        });
      }
      
      res.status(200).json({
        success: true,
        data: graph,
        message: 'Minimum consumption updated successfully'
      });
    }
    catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
}

module.exports = {
    createGraph,
    getAllGraphs,
    getGraphById,
    findGraphByName, // ** EXPORT DE LA NOUVELLE FONCTION **
    updateGraph,
    deleteGraph,
};