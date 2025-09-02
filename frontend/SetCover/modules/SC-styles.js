
export function createSCStyles(gameState) {
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
          'text-valign': 'bottom',
          'text-halign': 'center',
          'width': 40,
          'height': 40,
          'border-width': 1,
          'border-color': '#444',
          'shape': 'ellipse',

          'shadow-blur': 10,
          'shadow-color': '#000',
          'shadow-offset-x': 2,
          'shadow-offset-y': 2,
          'shadow-opacity': 1
        }
      },
      
      // Edge styling
      {
        selector: 'edge',
        style: {
          'width': 2,
          'line-color': '#ffffff',
          'opacity': 0.7,
          'curve-style': 'bezier'
        }
      },
      
      // Node type-specific styling
      {
        selector: 'node[type="user"]',
        style: {
          'background-image': '../../../icons/user_icon_white.png',
          
          'shape': function(ele) {
              // Si le nœud n'a pas encore de forme assignée, on lui en donne une.
              if (!ele.scratch('_shape')) {
                  ele.scratch('_shape', getRandomShape());
              }
              // On retourne la forme stockée pour que le style reste constant lors des redessins.
              return ele.scratch('_shape');
          },
          
          'background-fit': 'cover',
          'background-position-x': '50%',
          'background-position-y': '50%',
          'background-width': '60%',
          'background-height': '60%',
          'background-opacity': 1,
          'background-clip': 'none',
          'border-width': 10,
        }
      },
      {
        selector: 'node[type="antenna"]',
        style: {
          'background-color': '#222e24',
          'background-image': '../../../icons/antenna_icon_on_white.png',
          'shape': 'ellipse',
          'width': 50,
          'height': 50,
          'label': function(ele) {
            if (gameState && gameState.showConsumptionLabels) {
              return (ele.data('consumption') || 0) + ' W';
            }
            return '';
          },
          'color': '#FFFFFF',
          'text-outline-color': '#000000',
          'text-outline-width': 2,
          'font-weight': 'bold',
          'font-size': 12,
          'text-valign': 'bottom',
          'text-margin-y': 5,

          'background-position-x': '50%',
          'background-position-y': '50%',
          'background-width': '70%',
          'background-height': '70%',
          'background-opacity': 1,
          'background-clip': 'none'
        }
      },
      {
        selector: 'node[type="antenna-halo"]',
        style: {
          'background-color': '#FFE082',
          'background-opacity': 0.8,
          'border-width': 2,
          'shape': 'ellipse',
          'label': '',
          'z-index': 1,
          'events': 'no'
        }
      },
      
      
      // Inactive antenna styling
      {
        selector: 'node[type="antenna"][active="false"]',
        style: {
          'background-image': '../../../icons/antenna_icon_off_white.png',
          'background-color': '#aaaaaa',
          'opacity': 0.7
        }
      },
      
      // Inactive antenna halo
      {
        selector: 'node[type="antenna-halo"][active="false"]',
        style: {
          'background-opacity': 0,
          'opacity': 0,
          'visibility': 'hidden'
        }
      }
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
      
      // Connected user styling
      {
        selector: '.connected',
        style: {
          'border-width': 2,
          'border-color': '#8BC34A',
          'border-opacity': 1
        }
      },
      
      // Virtual edges (user-antenna connections)
      {
        selector: 'edge[virtual]',
        style: {
          'curve-style': 'bezier',
          'line-dash-pattern': [6, 3],
          'width': 3,
          //'target-arrow-shape': 'triangle',
          'target-arrow-color': function(ele) {
            return ele.style('line-color');
          },
          'cursor': 'pointer'
        }
      },
      
      {
        selector: 'edge[virtual]:hover',
        style: {
          'width': 5,
          'line-dash-pattern': [8, 2],
          'opacity': 1,
          'shadow-blur': 10,
          'shadow-color': '#FFC107',
          'shadow-opacity': 0.6,
          'z-index': 999
        }
      },
 
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
  
    
    return baseStyles.concat(gameplayStyles);
}
const nodeShapes = [
    'roundrectangle',
    /*'heptagon', 'octagon'*/
];

// Fonction qui retourne une forme aléatoire de la liste
function getRandomShape() {
    const randomIndex = Math.floor(Math.random() * nodeShapes.length);
    return nodeShapes[randomIndex];
}
export function setHaloVisibility(haloNode, isVisible) {
  if (!haloNode) return;

  const baseOpacity = isVisible ? 0.1 : 0;
  
  haloNode.style({
    'background-opacity': isVisible ? 0.1 : 0,
    'opacity': isVisible ? 0.5 : 0,
    'visibility': isVisible ? 'visible' : 'hidden'
  });

    
    haloNode.data('baseOpacity', baseOpacity);
}

export function highlightHaloOnHover(antennaNode) {
  if (!antennaNode) return;
  
  const haloId = antennaNode.data('haloId');
  if (!haloId) return;
  
  const haloNode = antennaNode.cy().getElementById(haloId);
  if (!haloNode || !haloNode.length) return;
  
  // Ne rien faire si le halo n'est pas visible
  if (haloNode.style('visibility') === 'hidden') return;
  
  // Augmenter l'opacité à 1 pour l'effet de survol
  haloNode.style('background-opacity', 1);
}

export function restoreHaloOpacity(antennaNode) {
  if (!antennaNode) return;
  
  const haloId = antennaNode.data('haloId');
  if (!haloId) return;
  
  const haloNode = antennaNode.cy().getElementById(haloId);
  if (!haloNode || !haloNode.length) return;
  
  // Ne rien faire si le halo n'est pas visible
  if (haloNode.style('visibility') === 'hidden') return;
  
  // Restaurer l'opacité de base stockée dans les données du nœud
  const baseOpacity = haloNode.data('baseOpacity') || 0.1;
  haloNode.style('background-opacity', baseOpacity);
}