// cytoscape-properties-manager.js - Handles properties panel for nodes and edges

document.addEventListener("DOMContentLoaded", () => {
  // Ensure namespace exists
  window.cytoscapeEditor = window.cytoscapeEditor || {};

  // --- REFERENCES TO SERVER EDITOR POPUP ELEMENTS ---
  const serverEditorPopup = document.getElementById('server-editor-popup');
  const serverEditorTitle = document.getElementById('server-editor-title');
  const closeServerEditorBtn = document.getElementById('close-server-editor-btn');
  const serverDisplayArea = document.getElementById('server-display-area');

    // Form elements
  const serverIdInput = document.getElementById('server-id-input');
  const serverNameInput = document.getElementById('server-name-input');
  const serverCapacityInput = document.getElementById('server-capacity-input');
  const serverConsumptionGroup = document.getElementById('server-consumption-group');
  const serverConsumptionInput = document.getElementById('server-consumption-input');
  const saveServerBtn = document.getElementById('save-server-btn');
  const deleteServerBtn = document.getElementById('delete-server-btn');
  const clearFormBtn = document.getElementById('clear-server-form-btn');
  const saveAndCloseBtn = document.getElementById('save-and-close-server-editor-btn');

  const taskEditorPopup = document.getElementById('task-editor-popup');
  const taskEditorTitle = document.getElementById('task-editor-title');
  const closeTaskEditorBtn = document.getElementById('close-task-editor-btn');
  const taskDisplayArea = document.getElementById('task-display-area');
  const taskIdInput = document.getElementById('task-id-input');
  const taskNameInput = document.getElementById('task-name-input');
  const taskChargeInput = document.getElementById('task-charge-input');
  const saveTaskBtn = document.getElementById('save-task-btn');
  const deleteTaskBtn = document.getElementById('delete-task-btn');
  const clearTaskFormBtn = document.getElementById('clear-task-form-btn');
  const saveAndCloseTaskBtn = document.getElementById('save-and-close-task-editor-btn');

  
  // Keep track of the node being edited
  let activeNodeForServerEditing = null;
  let tempServers = [];

  let activeNodeForTaskEditing = null;
  let tempTasks = [];
  
  // Create properties manager
  window.cytoscapeEditor.propertiesManager = {
    showEdgeProperties: function(edge) {
      if (!edge || !edge.isEdge()) return;
      if (window.graphEditor.selectedElement && window.graphEditor.selectedElement.id() !== edge.id()) {
        window.graphEditor.selectedElement.unselect();
      }
      window.graphEditor.selectedElement = edge;
      const panel = window.graphEditor.createPropertiesPanel();
      panel.innerHTML = '';
      const title = document.createElement('h3');
      title.textContent = `Propriétés: ${edge.id()}`;
      panel.appendChild(title);
      this.createCapacityControl(panel, edge);
      this.createDistanceControl(panel, edge);
      this.createBaseConsumptionControl(panel, edge);
      this.createConsumptionDisplay(panel, edge.data('consumption'));
      this.createThicknessControl(panel, edge);
      this.createCloseButton(panel);
      panel.style.display = 'block';
    },

    createBaseConsumptionControl: function(panel, edge) {
      const label = document.createElement('label');
      label.textContent = 'Consommation de base:';
      panel.appendChild(label);
      const input = document.createElement('input');
      input.type = 'number';
      input.min = '0';
      input.id = 'prop-base-consumption';
      input.value = edge.data('baseConsumption') || 100;
      panel.appendChild(input);
      input.addEventListener('input', () => this.updateEdgeConsumptionFromPanel(panel, edge));
    },
    
    createCapacityControl: function(panel, edge) {
      const label = document.createElement('label');
      label.textContent = 'Capacité:';
      panel.appendChild(label);
      const input = document.createElement('input');
      input.type = 'number';
      input.min = '1';
      input.id = 'prop-capacity';
      input.value = edge.data('capacity');
      panel.appendChild(input);
      input.addEventListener('input', () => this.updateEdgeConsumptionFromPanel(panel, edge));
      const button = document.createElement('button');
      button.className = 'auto-capacity-btn';
      button.textContent = 'Capacité selon nombre utilisateurs';
      button.addEventListener('click', () => {
        const userNodes = window.cy.nodes('[type="user"]');
        const pairCount = Math.ceil(userNodes.length / 2);
        input.value = pairCount > 0 ? pairCount : 1;
        input.dispatchEvent(new Event('input'));
      });
      panel.appendChild(document.createElement('br'));
      panel.appendChild(button);
    },
    
    createDistanceControl: function(panel, edge) {
      const label = document.createElement('label');
      label.textContent = 'Distance:';
      panel.appendChild(label);
      const input = document.createElement('input');
      input.type = 'number';
      input.min = '1';
      input.id = 'prop-distance';
      input.value = edge.data('distance');
      panel.appendChild(input);
      input.addEventListener('input', () => this.updateEdgeConsumptionFromPanel(panel, edge));
    },
    
    updateEdgeConsumptionFromPanel(panel, edge) {
        const capacity = parseInt(panel.querySelector('#prop-capacity').value) || 1;
        const distance = parseInt(panel.querySelector('#prop-distance').value) || 1;
        const baseConsumption = parseInt(panel.querySelector('#prop-base-consumption').value) || 100;
        edge.data({ 'capacity': capacity, 'distance': distance, 'baseConsumption': baseConsumption });
        const newConsumption = window.graphEditor.calculateEdgeConsumption(baseConsumption, capacity, distance);
        edge.data('consumption', newConsumption);
        const display = panel.querySelector('.consumption-display');
        if (display) {
            display.textContent = `Consommation: ${newConsumption.toFixed(0)} watts`;
        }
    },

    createThicknessControl: function(panel, edge) {
      const label = document.createElement('label');
      label.textContent = 'Epaisseur:';
      panel.appendChild(label);
      const value = document.createElement('span');
      value.textContent = edge.data('thickness');
      value.className = 'thickness-value';
      panel.appendChild(value);
      const slider = document.createElement('input');
      slider.type = 'range';
      slider.min = '1';
      slider.max = '10';
      slider.value = edge.data('thickness');
      slider.addEventListener('input', () => {
        const thickness = parseInt(slider.value);
        window.cytoscapeEditor.edgeManager.updateEdgeThickness(edge, thickness);
        value.textContent = thickness;
      });
      panel.appendChild(slider);
    },
    
    showNodeProperties: function(node) {
      if (!node || !node.isNode()) return;
      if (window.graphEditor.selectedElement && window.graphEditor.selectedElement.id() !== node.id()) {
        window.graphEditor.selectedElement.unselect();
      }
      window.graphEditor.selectedElement = node;
      const panel = window.graphEditor.createPropertiesPanel();
      panel.innerHTML = '';
      const title = document.createElement('h3');
      title.textContent = `Propriétés: ${node.id()}`;
      panel.appendChild(title);
      const typeDisplay = document.createElement('div');
      typeDisplay.textContent = `Type: ${node.data('type')}`;
      panel.appendChild(typeDisplay);
      if (node.data('type') === 'antenna') {
        this.createAntennaControls(panel, node);
      }
      if (node.data('type') === 'cloud' || node.data('type') === 'phone-config') {
        this.createServerEditButton(panel, node);
      }
      this.createCloseButton(panel);
      panel.style.display = 'block';
    },

    createServerEditButton: function(panel, node) {
        const editButton = document.createElement('button');
        editButton.textContent = 'Modifier les Serveurs';
        editButton.className = 'action-button';
        editButton.addEventListener('click', () => {
            this.showServerEditorPopup(node);
        });
        const closeButton = panel.querySelector('button');
        if (closeButton) {
            panel.insertBefore(editButton, closeButton);
        } else {
            panel.appendChild(editButton);
        }
    },

    showServerEditorPopup: function(node) {
        activeNodeForServerEditing = node;
        serverEditorTitle.textContent = `Éditeur de Serveurs pour ${node.id()}`;
        tempServers = JSON.parse(JSON.stringify(node.data('servers') || []));

        if (node.data('type') === 'cloud') {
            serverConsumptionGroup.style.display = 'block';
        } else {
            serverConsumptionGroup.style.display = 'none';
        }
        
        this.clearServerForm();
        this.renderServersInEditor();
        serverEditorPopup.style.display = 'flex';
    },

renderServersInEditor: function() {
        // Vider la zone d'affichage avant de redessiner
        serverDisplayArea.innerHTML = '';

        // Récupérer les serveurs depuis la variable temporaire
        const servers = tempServers;

        // Si il n'y a pas de serveurs, afficher un message et arrêter
        if (servers.length === 0) {
            serverDisplayArea.innerHTML = '<p class="empty-state">Aucun serveur configuré. Ajoutez-en un !</p>';
            return;
        }

        // Trouver la capacité maximale pour calculer l'échelle des hauteurs
        const maxCapacity = Math.max(...servers.map(s => s.capacity), 10); // 10 de base pour éviter de diviser par zéro

        // Créer un bloc visuel pour chaque serveur
        servers.forEach(server => {
            const serverBlock = document.createElement('div');
            serverBlock.className = 'server-block';
            serverBlock.dataset.serverId = server.id;

            // Calculer la hauteur du bloc en pourcentage par rapport au plus grand serveur
            const heightPercentage = (server.capacity / maxCapacity) * 90; // 90% pour laisser de la place au texte en haut
            serverBlock.style.height = `${heightPercentage}%`;

            // Créer l'étiquette d'information (nom, capacité, consommation)
            const info = document.createElement('div');
            info.className = 'server-block-info';
            
            // Construire le HTML de l'étiquette
            let infoHTML = `<strong>${server.name}</strong><br>(${server.capacity})`;
            
            // Ajouter la consommation uniquement si on édite un nœud de type 'cloud'
            if (activeNodeForServerEditing && activeNodeForServerEditing.data('type') === 'cloud') {
                infoHTML += `<br><small>${server.consumption || 0}W</small>`;
            }
            info.innerHTML = infoHTML;
            
            serverBlock.appendChild(info);

            // Ajouter l'écouteur de clic pour permettre l'édition
            serverBlock.addEventListener('click', () => this.selectServerForEditing(server));

            // Ajouter le bloc de serveur à la zone d'affichage
            serverDisplayArea.appendChild(serverBlock);
        });
    },

    selectServerForEditing: function(server) {
        serverNameInput.value = server.name;
        serverCapacityInput.value = server.capacity;
        serverIdInput.value = server.id; // Stocker l'ID dans le champ caché

        if (activeNodeForServerEditing.data('type') === 'cloud') {
            serverConsumptionInput.value = server.consumption || 0;
        }
        
        saveServerBtn.textContent = 'Mettre à jour';
        deleteServerBtn.style.display = 'block'; // Afficher le bouton supprimer

        // Mettre en évidence le bloc sélectionné
        document.querySelectorAll('.server-block').forEach(b => b.classList.remove('selected'));
        document.querySelector(`.server-block[data-server-id="${server.id}"]`).classList.add('selected');
    },

    clearServerForm: function() {
        serverNameInput.value = '';
        serverCapacityInput.value = '';
        serverIdInput.value = ''; // Vider l'ID caché
        serverConsumptionInput.value = '';
        
        saveServerBtn.textContent = 'Ajouter';
        deleteServerBtn.style.display = 'none'; // Cacher le bouton supprimer
        document.querySelectorAll('.server-block').forEach(b => b.classList.remove('selected'));
        serverNameInput.focus();
    },


    saveOrUpdateServer: function() {
        const name = serverNameInput.value.trim();
        const capacity = parseInt(serverCapacityInput.value);
        const id = serverIdInput.value;
        // ** LIRE LA CONSOMMATION **
        const consumption = parseInt(serverConsumptionInput.value) || 0;

        if (!name || !capacity || capacity <= 0) {
            alert("Veuillez entrer un nom et une capacité valide.");
            return;
        }

        if (id) { // Mise à jour
            const server = tempServers.find(s => s.id === id);
            if (server) {
                server.name = name;
                server.capacity = capacity;
                if (activeNodeForServerEditing.data('type') === 'cloud') {
                    server.consumption = consumption;
                }
            }
        } else { // Ajout
            const newServer = {
                id: `srv-${Date.now()}`,
                name: name,
                capacity: capacity
            };
            if (activeNodeForServerEditing.data('type') === 'cloud') {
                newServer.consumption = consumption;
            }
            tempServers.push(newServer);
        }
        
        this.renderServersInEditor();
        this.clearServerForm();
    },

    deleteSelectedServer: function() {
        const id = serverIdInput.value;
        if (!id) return;
        
        console.groupCollapsed(`[Delete] Tentative de suppression du serveur ID: ${id}`);
        if (confirm("Êtes-vous sûr de vouloir supprimer ce serveur ?")) {
            tempServers = tempServers.filter(s => s.id !== id);
            console.log("Serveur supprimé. Nouvel état de `tempServers`:", JSON.parse(JSON.stringify(tempServers)));
            this.renderServersInEditor();
            this.clearServerForm();
        } else {
            console.log("--> Suppression annulée par l'utilisateur.");
        }
        console.groupEnd();
    },

    saveServersToNode: function() {
        if (!activeNodeForServerEditing) return;
        
        // On sauvegarde la copie temporaire sur le noeud Cytoscape
        activeNodeForServerEditing.data('servers', tempServers);
        console.log(`Serveurs sauvegardés sur le nœud ${activeNodeForServerEditing.id()}:`, tempServers);
        
        this.hideServerEditorPopup();
    },

    hideServerEditorPopup: function() {
        serverEditorPopup.style.display = 'none';
        activeNodeForServerEditing = null;
        tempServers = [];
    },
    
    showTaskEditorPopup: function(node) {
        activeNodeForTaskEditing = node; // `node` est l'icône 'task-creator'
        taskEditorTitle.textContent = `Éditeur de Tâches pour ${node.data('parentId')}`;

        // ** LA CORRECTION EST ICI **
        // On récupère le VRAI nœud parent (l'utilisateur) pour lire ses tâches
        const parentNode = window.cy.getElementById(node.data('parentId'));
        if (parentNode) {
            tempTasks = JSON.parse(JSON.stringify(parentNode.data('tasks') || []));
        } else {
            tempTasks = [];
        }
        
        this.clearTaskForm();
        this.renderTasksInEditor();
        taskEditorPopup.style.display = 'flex';
    },

    renderTasksInEditor: function() {
        taskDisplayArea.innerHTML = '';
        if (tempTasks.length === 0) {
            taskDisplayArea.innerHTML = '<p class="empty-state">Aucune tâche définie.</p>';
            return;
        }

        const maxCharge = Math.max(...tempTasks.map(t => t.charge), 10);

        tempTasks.forEach(task => {
            const taskBlock = document.createElement('div');
            taskBlock.className = 'task-block-item';
            taskBlock.dataset.taskId = task.id;
            
            // On sépare la création des éléments pour plus de clarté
            const nameEl = document.createElement('strong');
            nameEl.textContent = task.name || 'Sans nom';
            const chargeEl = document.createElement('span');
            chargeEl.textContent = `(${task.charge})`;
            
            taskBlock.appendChild(nameEl);
            taskBlock.appendChild(chargeEl);
            
            // La hauteur est proportionnelle à la charge
            const heightPercentage = (task.charge / maxCharge) * 90; // 90% pour laisser de l'espace
            taskBlock.style.height = `${heightPercentage}%`;

            taskBlock.style.backgroundColor = `hsl(${task.charge * 15 % 360}, 70%, 50%)`;
            taskBlock.addEventListener('click', () => this.selectTaskForEditing(task));
            taskDisplayArea.appendChild(taskBlock);
        });
    },

    selectTaskForEditing: function(task) {
        taskNameInput.value = task.name;
        taskChargeInput.value = task.charge;
        taskIdInput.value = task.id;
        saveTaskBtn.textContent = 'Mettre à jour';
        deleteTaskBtn.style.display = 'block';
        document.querySelectorAll('.task-block-item').forEach(b => b.classList.remove('selected'));
        document.querySelector(`.task-block-item[data-task-id="${task.id}"]`).classList.add('selected');
    },
    
    clearTaskForm: function() {
        taskNameInput.value = '';
        taskChargeInput.value = '';
        taskIdInput.value = '';
        saveTaskBtn.textContent = 'Ajouter';
        deleteTaskBtn.style.display = 'none';
        document.querySelectorAll('.task-block-item').forEach(b => b.classList.remove('selected'));
        taskChargeInput.focus();
    },

    saveOrUpdateTask: function() {
        const name = taskNameInput.value.trim(); // Lire le nom
        const charge = parseInt(taskChargeInput.value);
        const id = taskIdInput.value;

        if (!name || !charge || charge <= 0) {
            alert("Veuillez entrer un nom et une charge de travail valide.");
            return;
        }

        if (id) { // Mise à jour
            const task = tempTasks.find(t => t.id === id);
            if (task) {
                task.name = name;
                task.charge = charge;
            }
        } else { // Ajout
            tempTasks.push({
                id: `task-${Date.now()}`,
                name: name,
                charge: charge
            });
        }
        this.renderTasksInEditor();
        this.clearTaskForm();
    },

    deleteSelectedTask: function() {
        const id = taskIdInput.value;
        if (!id) return;
        if (confirm("Êtes-vous sûr de vouloir supprimer cette tâche ?")) {
            tempTasks = tempTasks.filter(t => t.id !== id);
            this.renderTasksInEditor();
            this.clearTaskForm();
        }
    },

    saveTasksToNode: function() {
        if (!activeNodeForTaskEditing) return;

        const parentNode = window.cy.getElementById(activeNodeForTaskEditing.data('parentId'));
        if (parentNode) {
            parentNode.data('tasks', tempTasks);
            console.log(`Tâches sauvegardées sur le nœud PARENT ${parentNode.id()}:`, tempTasks);
        }
        
        this.hideTaskEditorPopup();
    },

    hideTaskEditorPopup: function() {
        taskEditorPopup.style.display = 'none';
        activeNodeForTaskEditing = null;
        tempTasks = [];
    },
    createAntennaControls: function(panel, antennaNode) {
      const graphEditor = window.graphEditor;
      const baseConsumptionLabel = document.createElement('label');
      baseConsumptionLabel.textContent = 'Consommation de base:';
      panel.appendChild(baseConsumptionLabel);
      const baseConsumptionInput = document.createElement('input');
      baseConsumptionInput.type = 'number';
      baseConsumptionInput.min = '0';
      baseConsumptionInput.id = 'prop-antenna-base-consumption';
      baseConsumptionInput.value = antennaNode.data('consumptionBase') || 0;
      panel.appendChild(baseConsumptionInput);
      const radiusConsumptionContainer = document.createElement('div');
      radiusConsumptionContainer.className = 'checkbox-container';
      const radiusConsumptionLabel = document.createElement('label');
      radiusConsumptionLabel.textContent = 'Consommation selon rayon:';
      radiusConsumptionContainer.appendChild(radiusConsumptionLabel);
      const radiusConsumptionToggle = document.createElement('input');
      radiusConsumptionToggle.type = 'checkbox';
      radiusConsumptionToggle.id = 'prop-antenna-radius-enabled';
      radiusConsumptionToggle.checked = antennaNode.data('consumptionRadiusEnabled') || false;
      radiusConsumptionContainer.appendChild(radiusConsumptionToggle);
      panel.appendChild(radiusConsumptionContainer);
      const radiusLabel = document.createElement('label');
      radiusLabel.textContent = 'Rayon:';
      panel.appendChild(radiusLabel);
      const radiusValue = document.createElement('span');
      radiusValue.textContent = antennaNode.data('radius');
      radiusValue.className = 'radius-value';
      panel.appendChild(radiusValue);
      const radiusSlider = document.createElement('input');
      radiusSlider.type = 'range';
      radiusSlider.min = '10';
      radiusSlider.max = '200';
      radiusSlider.id = 'prop-antenna-radius';
      radiusSlider.value = antennaNode.data('radius');
      panel.appendChild(radiusSlider);
      this.createConsumptionDisplay(panel, antennaNode.data('consumption'));
      const updateFunction = () => this.updateAntennaConsumptionFromPanel(panel, antennaNode);
      baseConsumptionInput.addEventListener('input', updateFunction);
      radiusSlider.addEventListener('input', updateFunction);
      radiusConsumptionToggle.addEventListener('change', updateFunction);
      const consumptionToggle = document.getElementById('antennaConsumptionToggle');
      if(consumptionToggle) {
        consumptionToggle.addEventListener('change', updateFunction);
      }
    },
    
    updateAntennaConsumptionFromPanel(panel, antennaNode) {
        const baseConsumption = parseInt(panel.querySelector('#prop-antenna-base-consumption').value) || 0;
        const radius = parseInt(panel.querySelector('#prop-antenna-radius').value) || 50;
        const isRadiusEnabled = panel.querySelector('#prop-antenna-radius-enabled').checked;
        antennaNode.data('consumptionBase', baseConsumption);
        antennaNode.data('consumptionRadiusEnabled', isRadiusEnabled);
        antennaNode.data('radius', radius);
        const haloNode = window.cy.getElementById(antennaNode.data('haloId'));
        if (haloNode) {
            haloNode.style({ 'width': radius * 2, 'height': radius * 2 });
        }
        const isConsumptionGloballyEnabled = window.graphEditor.antennaSettings.consumptionEnabled;
        let newConsumption = 0;
        if (isConsumptionGloballyEnabled) {
            if (isRadiusEnabled) {
                newConsumption = baseConsumption * radius;
            } else {
                newConsumption = baseConsumption;
            }
        }
        antennaNode.data('consumption', newConsumption);
        const consumptionDisplay = panel.querySelector('.consumption-display');
        if (consumptionDisplay) {
            consumptionDisplay.textContent = `Consommation: ${newConsumption.toFixed(0)} watts`;
        }
        const radiusValue = panel.querySelector('.radius-value');
        if(radiusValue) {
            radiusValue.textContent = radius;
        }
    },
    
    createConsumptionDisplay: function(panel, consumption) {
      const consumptionDisplay = document.createElement('div');
      consumptionDisplay.className = 'consumption-display';
      consumptionDisplay.textContent = `Consommation: ${consumption} watts`;
      panel.appendChild(consumptionDisplay);
      return consumptionDisplay;
    },
    
    createCloseButton: function(panel) {
      const closeButton = document.createElement('button');
      closeButton.textContent = 'Fermer';
      closeButton.addEventListener('click', window.graphEditor.hidePropertiesPanel);
      panel.appendChild(closeButton);
      return closeButton;
    }
  };
  
  // Event listeners for the server editor popup
  closeServerEditorBtn.addEventListener('click', () => {
    // On demande confirmation si on ferme sans sauvegarder
    if (confirm("Annuler les modifications et fermer ?")) {
        window.cytoscapeEditor.propertiesManager.hideServerEditorPopup();
    }
  });

  saveAndCloseBtn.addEventListener('click', () => {
    window.cytoscapeEditor.propertiesManager.saveServersToNode();
  });

  // Écouteurs pour le formulaire
  saveServerBtn.addEventListener('click', () => {
    window.cytoscapeEditor.propertiesManager.saveOrUpdateServer();
  });
  
  deleteServerBtn.addEventListener('click', () => {
    window.cytoscapeEditor.propertiesManager.deleteSelectedServer();
  });

  clearFormBtn.addEventListener('click', () => {
    window.cytoscapeEditor.propertiesManager.clearServerForm();
  });

  closeTaskEditorBtn.addEventListener('click', () => {
    if (confirm("Annuler les modifications et fermer ?")) {
        window.cytoscapeEditor.propertiesManager.hideTaskEditorPopup();
    }
  });
  saveAndCloseTaskBtn.addEventListener('click', () => {
    window.cytoscapeEditor.propertiesManager.saveTasksToNode();
  });
  saveTaskBtn.addEventListener('click', () => {
    window.cytoscapeEditor.propertiesManager.saveOrUpdateTask();
  });
  deleteTaskBtn.addEventListener('click', () => {
    window.cytoscapeEditor.propertiesManager.deleteSelectedTask();
  });
  clearTaskFormBtn.addEventListener('click', () => {
    window.cytoscapeEditor.propertiesManager.clearTaskForm();
  });

  window.cytoscapeEditor.refreshNodeProperties = function(node) {
    if (!node || !node.data) return;
    window.cytoscapeEditor.propertiesManager.showNodeProperties(node);
  };
});