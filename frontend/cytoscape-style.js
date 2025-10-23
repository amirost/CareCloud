// Updated cytoscape-style.js with less saturated colors and yellow halos

// Cytoscape style configuration for network visualization
const cytoscapeStyle = [
  // Default node styling
  {
    selector: 'node',
    style: {
      'background-color': '#888',
      'label': 'data(id)',
      'color': '#fff',
      'text-outline-color': '#222',
      'text-outline-width': 1,
      'font-size': 12,
      'text-valign': 'center',
      'text-halign': 'center',
      'width': 40,
      'height': 40,
      'border-width': 1,
      'border-color': '#444',
      'shape': 'ellipse' 
      
    }
  },
  
  // Default edge styling - using thickness from data
  {
    selector: 'edge',
    style: {
      'width': 'data(thickness)',
      'line-color': '#ffffff',  // White edges
      'opacity': 0.7,           // Semi-transparent
      'curve-style': 'bezier',
      'label': function(ele) {
        return 'C:' + ele.data('capacity') + ' D:' + ele.data('distance');
      },
      'font-size': 10,
      'text-rotation': 'autorotate',
      'text-background-color': '#fff',
      'text-background-opacity': 0.4,
      'text-background-padding': 2
    }
  },
  
  // Node type-specific styling
  {
    selector: 'node[type="router"]',
    style: {
      'background-color': '#8EB8FF',  // Less saturated blue for routers
      'shape': 'ellipse',
      'width': 50,
      'height': 50,
    }
  },
  {
    selector: 'node[type="user"]',
    style: {
      //'background-color': '#FFA996',  // Less saturated red for users
      'background-image': '../icons/user_icon.png',
      'shape': 'roundrectangle',
      'background-fit': 'cover',
      'background-position-x': '50%',
      'background-position-y': '50%',
      'background-width': '60%',
      'background-height': '60%',
      'background-opacity': 1,
      'background-clip': 'none'
    }
  },
  {
    selector: 'node[type="user"][colorGroup="0"]',
    style: {
      'background-color': '#FFA996'
    }
  },
  {
    selector: 'node[type="user"][colorGroup="1"]',
    style: {
      'background-color': '#FFD166'
    }
  },
  {
    selector: 'node[type="user"][colorGroup="2"]',
    style: {
      'background-color': '#06D6A0'
    }
  },
  {
    selector: 'node[type="user"][colorGroup="3"]',
    style: {
      'background-color': '#118AB2'
    }
  },
  {
    selector: 'node[type="antenna"]',
    style: {
      'background-color': '#96D6A4',  // Less saturated green for antennas
      'shape': 'ellipse',
      'width': 50,
      'height': 50,
    }
  },
  {
    selector: 'node[type="antenna-halo"]',
    style: {
      'background-color': '#FFE082',  // Yellow for antenna halos
      'background-opacity': 0.3,
      'border-width': 0,
      'shape': 'ellipse',
      'label': '',  // No label for halos
      'z-index': 1,  // Below the actual antenna node
      'events': 'no'  // Make halos non-interactive
    }
  },
  

  {
    selector: 'node[type="cloud"]',
    style: {
      'shape': 'round-rectangle',
      'background-color': '#d0e1f9', // Un bleu très clair
      'width': 80, // Plus grand que les autres
      'height': 60,
      'border-width': 2,
      'border-color': '#4d648d',
      'background-image': '../icons/cloud_icon.png', // Vous devrez créer cette icône
      'background-fit': 'contain',
      'background-height': '60%',
      'background-width': '60%'
    }
  },

  {
    selector: 'node[userType="cloud"]', // Style pour les utilisateurs qui se connectent au cloud
    style: {
        'background-image': '../icons/user_cloud_icon.png' // Une icône différente
    }
  },

  {
    selector: 'node[type="phone-config"]',
    style: {
      'shape': 'ellipse',
      'background-color': '#FFFFFF',
      'width': 25,
      'height': 25,
      'border-width': 2,
      'border-color': '#283655',
      'background-image': '../icons/phone_icon.png', // Vous devrez créer cette icône
      'background-fit': 'contain',
      'background-height': '70%',
      'background-width': '70%',
      'label': ''
    }
  },

  {
    selector: 'node[type="task-creator"]',
    style: {
      'shape': 'ellipse',
      'background-color': '#FFFFFF',
      'width': 25,
      'height': 25,
      'border-width': 2,
      'border-color': '#d08159',
      'background-image': '../icons/task_icon.png', // Ou une icône de point d'exclamation
      'background-fit': 'contain',
      'background-height': '70%',
      'background-width': '70%',
      'label': ''
    }
  },
  // Edge capacity styling - different colors based on capacity with same white transparent base
  {
    selector: 'edge[capacity = 1]',
    style: {
      'line-color': '#ffffff',
      'opacity': 0.4
    }
  },
  {
    selector: 'edge[capacity = 2]',
    style: {
      'line-color': '#ffffff',
      'opacity': 0.6
    }
  },
  {
    selector: 'edge[capacity = 3]',
    style: {
      'line-color': '#ffffff',
      'opacity': 0.8
    }
  },
  {
    selector: 'edge[capacity >= 4]',
    style: {
      'line-color': '#ffffff',
      'opacity': 1.0
    }
  },
  
  // Highlight styles for selection
  {
    selector: ':selected',
    style: {
      'background-color': '#D5F1EE',  // Lighter selection color
      'line-color': '#80CBC4',
      'border-width': 3,
      'border-color': '#26A69A',
      'border-opacity': 1 // Make sure selected border is visible
    }
  },
  // Highlight available nodes
{
  selector: '.available',
  style: {
    'border-width': 3,
    'border-color': '#4CAF50',
    'border-opacity': 1,
    'background-opacity': 0.8
  }
},

// Highlight selected nodes
{
  selector: '.selected',
  style: {
    'border-width': 4,
    'border-color': '#FFC107',
    'border-opacity': 1
  }
},

// Unused edges in optimization phase
{
  selector: '.unused',
  style: {
    'opacity': 0.3,
    'line-style': 'dashed'
  }
},

// Virtual edges (user-antenna connections)
{
  selector: 'edge[virtual]',
  style: {
    'curve-style': 'bezier',
    'line-dash-pattern': [6, 3]
  }
}
];

// Make styles globally available
window.cytoscapeStyle = cytoscapeStyle;