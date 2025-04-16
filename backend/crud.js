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
        if (req.query.gameType) {
            filter.gameType = req.query.gameType;
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
    updateGraph,
    deleteGraph,
    updateMinimumConsumption
};