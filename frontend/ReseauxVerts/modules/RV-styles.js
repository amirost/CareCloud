// RV-styles.js - Unified styling system for RV gameplay

/**
 * Creates and returns all styles needed for the Green Networks (RV) game
 * Combines base styles and gameplay-specific styles in a single module
 */
export function createRVStyles() {
    // Base styles for core elements
    const baseStyles = [
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
        selector: 'edge:not([virtual])',
        style: {
          'width': 20,
          'line-color': '#ffffff',
          'opacity': 1,
          'curve-style': 'straight',
          'edge-distances': 'node-position',
          'label': '',
          'font-size': 10,
          'text-rotation': 'autorotate',
          'text-background-color': '#fff',
          'text-background-opacity': 0.4,
          'text-background-padding': 2,
          'width': function(ele) {
            // Get the capacity value from edge data
            const capacity = ele.data('capacity') || 0;
            // Calculate width as 20 minus capacity, with a minimum of 1
            return Math.max(1, 17 + capacity * 1.5);
          },
          
        }
      },
      
      // Node type-specific styling
      {
        selector: 'node[type="router"]',
        style: {
          'background-color': '#8EB8FF',
          'shape': 'ellipse',
          'background-image': '../../../icons/router_icon.png',
          'background-fit': 'cover',
          'background-position-x': '50%',
          'background-position-y': '50%',
          'background-width': '30%',
          'background-height': '30%',
          'background-opacity': 1,
          'background-clip': 'none'
        }
      },
      {
        selector: 'node[type="user"]',
        style: {
          'background-color': '#FFA996',
          'shape': 'ellipse',
          'background-image': '../../../icons/user_icon.png',
          'shape': 'ellipse',
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
        selector: 'node[type="antenna"]',
        style: {
          'background-color': '#96D6A4',
          'background-image': '../../../icons/antenna_icon_on.png',
          'shape': 'ellipse',
          'width': 40,
          'height': 40,
          'background-position-x': '50%',
          'background-position-y': '50%',
          'background-width': '80%',
          'background-height': '80%',
          'background-opacity': 1,
          'background-clip': 'none'
        }
      },
      {
        selector: 'node[type="antenna-halo"]',
        style: {
          'background-color': '#FFE082',
          'background-opacity': 0.1,
          'border-width': 1,
          'shape': 'ellipse',
          'label': '',
          'z-index': 1,
          'events': 'no'
        }
      },
      
      // Edge capacity styling
      /*{
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
      }*/
    ];
  
    // Gameplay-specific styles for interaction states
    const gameplayStyles = [
      // Highlight available nodes
      {
        selector: '.available',
        style: {
          'border-width': 3,
          'border-color': '#ffff00',
          'border-opacity': 1,
          'background-opacity': 0.8,
          'shadow-blur': 10,
          'shadow-color': '#4CAF50',
          'shadow-opacity': 0.6
        }
      },
      
      // Highlight selected nodes
      {
        selector: '.selected',
        style: {
          'border-width': 4,
          'border-color': '#ffff00',
          'border-opacity': 1,
          'shadow-blur': 15,
          'shadow-color': '#FFC107',
          'shadow-opacity': 0.8
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
      
      // Connected user/antenna pairs
      {
        selector: '.connected',
        style: {
          'border-width': 2,
          'border-color': '#8BC34A',
          'border-opacity': 1
        }
      },
      
      // Virtual edges with parent (for bundled edges)
      {
        selector: 'edge[virtual][parent]',
        style: {
          'curve-style': 'unbundled-bezier',
          'control-point-distances': function(ele) { 
            return ele.data('offset') || 0;
          },
          'control-point-weights': [0.5],
          'width': 3,
          'line-dash-pattern': [6, 3],
          'z-index': 10
        }
      },
      
      // Virtual edges (user-antenna connections)
      {
        selector: 'edge[virtual]',
        style: {
          'curve-style': 'bezier',
          'line-dash-pattern': [6, 3],
          'width': 3,
        }
      },
      
      // Path edges
      {
        selector: 'edge.path',
        style: {
          'width': 4,
          'line-cap': 'round'
        }
      },
      
      // Parallel paths on the same edge
      {
        selector: 'edge[parallel]',
        style: {
          'curve-style': 'unbundled-bezier',
          'control-point-distances': function(ele) { 
            return ele.data('offset') || 0;
          },
          'control-point-weights': [0.5],
          'width': 2.5,
          'edge-distances': 'node-position',
          'source-endpoint': '0% 50%',
          'target-endpoint': '100% 50%'
        }
      },
      
      // Edges at capacity
      {
        selector: 'edge.at-capacity',
        style: {
          'border-width': 1,
          'border-color': '#FF5722',
          'border-opacity': 0.8
        }
      },
      
      // Successful connection
      {
        selector: '.path-complete',
        style: {
          'shadow-blur': 5,
          'shadow-color': '#4CAF50',
          'shadow-opacity': 0.5,
          'shadow-offset-x': 0,
          'shadow-offset-y': 0
        }
      },
      
      // Error state
      {
        selector: '.error',
        style: {
          'border-width': 3,
          'border-color': '#F44336',
          'border-opacity': 1,
          'shadow-blur': 10,
          'shadow-color': '#F44336',
          'shadow-opacity': 0.6
        }
      }
    ];
  
    // Return combined styles
    return baseStyles.concat(gameplayStyles);
  }