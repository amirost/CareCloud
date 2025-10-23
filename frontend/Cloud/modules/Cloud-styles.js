// Cloud-styles.js - Unified styling system for Cloud gameplay

// La fonction setHaloVisibility est utile pour les antennes
window.setHaloVisibility = function(haloNode, isVisible) {
  if (!haloNode) return;
  haloNode.style({
    'background-opacity': isVisible ? 0.1 : 0,
    'visibility': isVisible ? 'visible' : 'hidden'
  });
}

const nodeShapes = [
    'roundrectangle',
];

function getRandomShape() {
    const randomIndex = Math.floor(Math.random() * nodeShapes.length);
    return nodeShapes[randomIndex];
}


// On passe gameState en paramètre pour accéder à l'état du jeu
export function createCloudStyles(gameState) {
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
          'shape': 'ellipse' 
        }
      },
      
      // Default edge styling for PHYSICAL links
      {
        selector: 'edge:not([virtual])',
        style: {
          'line-color': '#ffffff',
          'opacity': 1,
          'curve-style': 'straight',
          'edge-distances': 'node-position',
          'width': function(ele) {
            const capacity = ele.data('capacity') || 0;
            return Math.max(1, 17 + capacity * 1.5);
          },
          'label': function(ele) {
            if (gameState && gameState.showCapacityLabels) {
              return 'capacité : ' + (ele.data('capacity') || 0);
            }
            return '';
          },
          'font-size': 12,
          'font-weight': 'bold',
          'color': '#FFFF00',
          'text-outline-color': '#000000',
          'text-outline-width': 2,
          'text-background-color': '#333333',
          'text-background-opacity': 0.9,
          'text-background-padding': 3,
          'text-background-shape': 'round-rectangle',
          'text-rotation': 'autorotate',
          'text-margin-y': function(ele) {
            let isUsed = false;
            if (gameState && gameState.usedLinks && gameState.usedLinks.has(ele.id())) {
              const linkInfo = gameState.usedLinks.get(ele.id());
              const colors = Array.isArray(linkInfo) ? linkInfo : (linkInfo ? linkInfo.colors : null);
              if (colors && colors.length > 0) {
                isUsed = true;
              }
            }
            return isUsed ? -25 : 0;
          },
        }
      },
      
      // Node type-specific styling from RV
      {
        selector: 'node[type="router"]',
        style: {
          'background-color': '#3e619c',
          'shape': 'ellipse',
          'background-image': '../../../icons/router_icon_white.png',
          'background-position-x': '50%', 'background-position-y': '50%',
          'background-width': '80%', 'background-height': '80%',
          'background-opacity': 1, 'background-clip': 'none',
          'width': 50, 'height': 50,
        }
      },
      {
        selector: 'node[type="user"]', // Style par défaut pour les utilisateurs (sera surchargé)
        style: {
          'background-color': 'data(pairColor)', // On lit la couleur depuis les données
          'shape': getRandomShape,
          'background-image': '../../../icons/user_icon.png', // Icône par défaut
          'background-fit': 'cover', 'background-position-x': '50%', 'background-position-y': '50%',
          'background-width': '60%', 'background-height': '60%',
          'background-opacity': 1, 'background-clip': 'none',
        }
      },
      {
        selector: 'node[type="antenna"]',
        style: {
          'background-color': '#222e24',
          'background-image': '../../../icons/antenna_icon_on_white.png',
          'shape': 'ellipse', 'width': 50, 'height': 50,
          'background-position-x': '50%', 'background-position-y': '50%',
          'background-width': '70%', 'background-height': '70%',
          'background-opacity': 1, 'background-clip': 'none'
        }
      },
      {
        selector: 'node[type="antenna-halo"]',
        style: {
          'background-color': '#FFE082', 'background-opacity': 0.1, 'border-width': 1,
          'shape': 'ellipse', 'label': '', 'z-index': 1, 'events': 'no'
        }
      },

      // --- STYLES SPÉCIFIQUES AJOUTÉS POUR LE MODE CLOUD ---
      {
        selector: 'node[type="cloud"]',
        style: {
          'shape': 'round-rectangle',
          'background-color': '#d0e1f9',
          'width': 80, 'height': 60,
          'border-width': 2, 'border-color': '#4d648d',
          //'background-image': '../../../icons/cloud_icon.png',
          'background-fit': 'contain', 'background-height': '60%', 'background-width': '60%'
        }
      },
      {
        selector: 'node[userType="cloud"]', // Utilisateurs qui se connectent au cloud
        style: {
          //'background-image': '../../../icons/user_cloud_icon.png' // Surcharge l'icône par défaut
        }
      },
      {
        selector: 'node[type="phone-config"]',
        style: {
          'shape': 'ellipse', 'background-color': '#FFFFFF',
          'width': 25, 'height': 25, 'border-width': 2, 'border-color': '#283655',
          //'background-image': '../../../icons/phone_icon.png',
          'background-fit': 'contain', 'background-height': '70%', 'background-width': '70%',
          'label': ''
        }
      },
      {
        selector: 'node[type="task-creator"]',
        style: {
          'shape': 'ellipse', 'background-color': '#FFFFFF',
          'width': 25, 'height': 25, 'border-width': 2, 'border-color': '#d08159',
          //'background-image': '../../../icons/task_icon.png',
          'background-fit': 'contain', 'background-height': '70%', 'background-width': '70%',
          'label': ''
        }
      }
    ];
    
    // Gameplay-specific styles for interaction states (identiques à RV)
    const gameplayStyles = [
      { selector: '.available', style: { 'border-width': 3, 'border-color': '#ffff00', 'border-opacity': 1, 'background-opacity': 0.8, 'shadow-blur': 10, 'shadow-color': '#4CAF50', 'shadow-opacity': 0.6 } },
      { selector: '.selected', style: { 'border-width': 4, 'border-color': '#ffff00', 'border-opacity': 1, 'shadow-blur': 15, 'shadow-color': '#FFC107', 'shadow-opacity': 0.8 } },
      { selector: '.unused', style: { 'opacity': 0.3, 'line-style': 'dashed' } },
      { selector: '.connected', style: { 'border-width': 2, 'border-color': '#8BC34A', 'border-opacity': 1 } },
      { selector: 'edge[virtual]', style: { 'curve-style': 'bezier', 'line-dash-pattern': [6, 3], 'width': 3, 'label': '' } },
      { selector: 'edge[virtual][parent]', style: { 'curve-style': 'unbundled-bezier', 'control-point-distances': function(ele) { return ele.data('offset') || 0; }, 'control-point-weights': [0.5], 'width': 3, 'line-dash-pattern': [6, 3], 'z-index': 10, 'label': '' } },
      {
        selector: '.highlighted-node',
        style: {
          'outline-width': 4,
          'outline-color': '#FFD700',
          'outline-style': 'solid',
          'z-index': 1000,
        }
      },
      {
        selector: '.highlighted-edge',
        style: {
          'width': 8,
          'line-color': '#FFD700',
          'opacity': 1,
          'z-index': 999
        }
      },
      { selector: 'edge.path', style: { 'width': 4, 'line-cap': 'round' } },
      { selector: 'edge.at-capacity', style: { 'border-width': 1, 'border-color': '#FF5722', 'border-opacity': 0.8 } },
      { selector: '.path-complete', style: { 'shadow-blur': 5, 'shadow-color': '#4CAF50', 'shadow-opacity': 0.5, 'shadow-offset-x': 0, 'shadow-offset-y': 0 } },
      { selector: '.error', style: { 'border-width': 3, 'border-color': '#F44336', 'border-opacity': 1, 'shadow-blur': 10, 'shadow-color': '#F44336', 'shadow-opacity': 0.6 } },
      {
        selector: 'node[type="antenna"][active="false"]',
        style: {
          'background-image': '../../../icons/antenna_icon_off_white.png'
        }
      },
    ];
  
    return baseStyles.concat(gameplayStyles);
}