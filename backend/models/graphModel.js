const mongoose = require('mongoose');

// Schema for nodes in the graph
const nodeSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: ['router', 'user', 'antenna'] 
  },
  x: {
    type: Number,
    required: true
  },
  y: {
    type: Number,
    required: true
  },
  // antenna radius
  radius: {
    type: Number,
    default: null
  },

  // Reference to halo node ID for antennas
  haloId: {
    type: String,
    default: null
  },

  // Node consumption (primarily for antennas)
  consumption: {
    type: Number,
    default: 0
  }
});

// Schema for edges in the graph
const edgeSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true
  },
  
  source: {
    type: String,
    required: true
  },
  target: {
    type: String,
    required: true
  },

  // capacity of links (number of routes that can support)
  capacity: {
    type: Number,
    required: true,
    default: 1
  },

  // distance (maybe can be used later)
  distance: {
    type: Number,
    required: true,
    default: 1
  },

  // Energy consumption
  baseConsumption: {
    type: Number,
    required: true,
    default: 100 // Default consumption (capacity * distance * 100)
  },
  thickness: {
    type: Number,
    default: 10
  }
});

const graphSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  
  mode: {
    type: String,
    required: true,
    enum: ['RV', 'SC', 'Cloud']
  },
  nodes: [nodeSchema],
  edges: [edgeSchema],

  minimumConsumption: {
    type: Number,
    default: null
  },
  
  antennaSettings: {
    consumptionEnabled: {
      type: Boolean,
      default: false
    },
    consumptionRadiusEnabled: {
      type: Boolean,
      default: false
    },
    consumptionBase: {
      type: Number,
      default: 0
    }
  },
  metrics: {
    totalCapacity: {
      type: Number,
      default: 0
    },
    totalConsumption: {
      type: Number,
      default: 0
    }
  },

  courseContent:{
    title:{
      type : String,
      default : ''
    },
    content:{
      type:String,
      default:''
    },
    images: [{
      path: String,
      caption: String
    }]
  },
  
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

graphSchema.pre('save', function(next) {
  
  this.updatedAt = Date.now();
  
  // Calculate total capacity and consumption
  let totalCapacity = 0;
  let totalConsumption = 0;
  
  // Calculate from edges
  this.edges.forEach(edge => {
    totalCapacity += edge.capacity || 0;
    totalConsumption += edge.consumption || 0;
  });
  
  // Add antenna consumption if enabled
  if (this.antennaSettings.consumptionEnabled) {
    this.nodes.forEach(node => {
      if (node.type === 'antenna') {
        totalConsumption += node.consumption || 0;
      }
    });
  }
  
  // Update metrics
  this.metrics.totalCapacity = totalCapacity;
  this.metrics.totalConsumption = totalConsumption;
  
  // Ensure course content has default values if missing
  if (this.courseContent) {
    if (this.courseContent.title === undefined) this.courseContent.title = '';
    if (this.courseContent.content === undefined) this.courseContent.content = '';
    if (!Array.isArray(this.courseContent.images)) this.courseContent.images = [];
  }
  
  next();
});

graphSchema.statics.fromCytoscape = function(cy, name, mode, antennaSettings) {
  const nodes = [];
  const edges = [];
  
  // Extract nodes
  cy.nodes().forEach(node => {
    // Skip halo nodes, they'll be recreated
    if (node.data('type') === 'antenna-halo') return;
    
    const nodeData = {
      id: node.id(),
      type: node.data('type'),
      x: node.position('x'),
      y: node.position('y')
    };
    
    // Add antenna-specific properties
    if (node.data('type') === 'antenna') {
      nodeData.radius = node.data('radius');
      nodeData.haloId = node.data('haloId');
      nodeData.consumption = node.data('consumption') || 0;
    }
    
    nodes.push(nodeData);
  });
  
  // Extract edges
  cy.edges().forEach(edge => {
    edges.push({
      id: edge.id(),
      source: edge.source().id(),
      target: edge.target().id(),
      capacity: edge.data('capacity') || 1,
      distance: edge.data('distance') || 1,
      consumption: edge.data('consumption') || 100,
      thickness: edge.data('thickness') || 2
    });
  });
  
  // Create the graph data
  return {
    name,
    mode,
    nodes,
    edges,
    antennaSettings: antennaSettings || {
      consumptionEnabled: false,
      consumptionBase: 0
    }
  };
};

// Helper method to convert to cytoscape format
graphSchema.methods.toCytoscape = function() {
  const elements = [];
  
  // Add nodes
  this.nodes.forEach(node => {
    const nodeElement = {
      group: 'nodes',
      data: {
        id: node.id,
        type: node.type
      },
      position: {
        x: node.x,
        y: node.y
      }
    };
    
    // Handle antenna-specific properties
    if (node.type === 'antenna') {
      nodeElement.data.radius = node.radius;
      nodeElement.data.haloId = node.haloId;
      nodeElement.data.consumption = node.consumption;
      
      // Also create the halo node
      elements.push({
        group: 'nodes',
        data: {
          id: node.haloId,
          type: 'antenna-halo',
          radius: node.radius
        },
        position: {
          x: node.x,
          y: node.y
        },
        style: {
          'width': node.radius * 2,
          'height': node.radius * 2
        }
      });
    }
    
    elements.push(nodeElement);
  });
  
  // Add edges
  this.edges.forEach(edge => {
    elements.push({
      group: 'edges',
      data: {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        capacity: edge.capacity,
        distance: edge.distance,
        consumption: edge.consumption,
        thickness: edge.thickness
      }
    });
  });
  
  return elements;
};

const Graph = mongoose.model('Graph', graphSchema);

module.exports = Graph;