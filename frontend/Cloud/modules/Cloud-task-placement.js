// Cloud-task-placement.js - Gère la pop-up de placement des tâches

export function initTaskPlacement(gameState, uiManager) {

    // --- DOM REFERENCES ---
    const popup = document.getElementById('task-placement-popup');
    const closeBtn = document.getElementById('close-task-placement-btn');
    const taskListContainer = document.getElementById('tasks-to-place-list');
    const phoneServersContainer = document.getElementById('phone-servers-container').querySelector('.server-group');
    const cloudServersContainer = document.getElementById('cloud-servers-container').querySelector('.server-group');
    const saveAndCloseBtn = document.getElementById('save-and-close-placement-btn');

    // --- POPUP STATE ---
    let currentContext = 'phone';
    let tasksForClientList = []; 
    let serverStates = {}; 
    let draggedTaskInfo = null;
    let pixelsPerUnit = 10;
    
    // --- DRAG & DROP LOGIC ---
    function handleDragStart(e, task, ownerId) {
        const target = e.target;
        if (!target.draggable) {
            e.preventDefault();
            return;
        }

        const originContainer = target.closest('.server-column-gameplay, .client-task-grid');
        const originServerId = originContainer && originContainer.classList.contains('server-column-gameplay') ? originContainer.dataset.serverId : null;

        draggedTaskInfo = { task, ownerId, element: target, origin: originServerId ? 'server' : 'queue', originServerId };
        setTimeout(() => target.classList.add('dragging'), 0);
    }

    function handleDragEnd() {
        if (draggedTaskInfo && draggedTaskInfo.element) {
            draggedTaskInfo.element.classList.remove('dragging');
        }
        draggedTaskInfo = null;
        document.querySelectorAll('.drop-valid, .drop-invalid').forEach(el => el.classList.remove('drop-valid', 'drop-invalid'));
    }

    function isDropValid(target, targetServerState) {
        if (!draggedTaskInfo) return false;

        if (target.id === 'tasks-to-place-list' || target.closest('#tasks-to-place-list')) {
            return draggedTaskInfo.origin === 'server';
        }

        if (targetServerState) {
            let futureLoad = targetServerState.currentLoad;
            if (draggedTaskInfo.originServerId !== targetServerState.data.id) {
                futureLoad += draggedTaskInfo.task.charge;
            }
            return futureLoad <= targetServerState.data.capacity;
        }
        return false;
    }

    function handleDragOver(e) {
        e.preventDefault();
        const dropTarget = e.currentTarget;
        const serverId = dropTarget.dataset.serverId;
        const serverState = serverStates[serverId];
        
        if (isDropValid(dropTarget, serverState)) {
            dropTarget.classList.add('drop-valid');
        } else {
            dropTarget.classList.add('drop-invalid');
        }
    }

    function handleDragLeave(e) {
        e.currentTarget.classList.remove('drop-valid', 'drop-invalid');
    }

    function handleDropOnServer(e) {
        e.preventDefault();
        const dropTarget = e.currentTarget;
        dropTarget.classList.remove('drop-valid', 'drop-invalid');

        const targetServerId = dropTarget.dataset.serverId;
        const targetServer = serverStates[targetServerId];

        if (!isDropValid(dropTarget, targetServer)) return;

        if (!targetServer.isOn) {
            targetServer.isOn = true;
        }
        
        let taskToMove = draggedTaskInfo.task;
        
        if (draggedTaskInfo.origin === 'queue') {
            const taskIndex = tasksForClientList.findIndex(t => t.id === taskToMove.id);
            if (taskIndex > -1) tasksForClientList.splice(taskIndex, 1);
        } else if (draggedTaskInfo.origin === 'server') {
            const originServer = serverStates[draggedTaskInfo.originServerId];
            const taskIndex = originServer.tasks.findIndex(t => t.id === taskToMove.id);
            if (taskIndex > -1) {
                originServer.tasks.splice(taskIndex, 1);
                originServer.currentLoad -= taskToMove.charge;
            }
        }

        if (!taskToMove.ownerId) {
            taskToMove.ownerId = draggedTaskInfo.ownerId;
        }
        
        targetServer.tasks.push(taskToMove);
        targetServer.currentLoad += taskToMove.charge;
        
        renderAll();
    }
    
    function handleDropOnQueue(e) {
        e.preventDefault();
        const queueList = e.currentTarget;
        queueList.classList.remove('drop-valid', 'drop-invalid');

        if (!isDropValid(queueList)) return;

        const taskToReturn = draggedTaskInfo.task;
        const originServer = serverStates[draggedTaskInfo.originServerId];
        const taskIndex = originServer.tasks.findIndex(t => t.id === taskToReturn.id);

        if (taskIndex > -1) {
            originServer.tasks.splice(taskIndex, 1);
            originServer.currentLoad -= taskToReturn.charge;
            
            taskToReturn.status = 'unplaced';
            tasksForClientList.push(taskToReturn);
        }
        renderAll();
    }

    // --- UI RENDERING FUNCTIONS ---
    
    function createTaskCard(task, ownerId) {
        const card = document.createElement('div');
        card.className = 'task-card';
        card.id = task.id;
        card.style.borderColor = task.color;
        
        let placementInfoHTML = '';
        if (task.status !== 'unplaced') {
            card.draggable = false;
            card.classList.add('is-placed-elsewhere');
            const location = task.status === 'placed_on_cloud' ? `sur ${task.location}` : 'sur Téléphone';
            placementInfoHTML = `<div class="placement-info">${location}</div>`;
        } else {
            card.draggable = true;
        }

        card.innerHTML = `
            <div class="task-card-header">
                <span>${task.name}</span>
                <span class="task-card-charge">${task.charge}</span>
            </div>
            ${placementInfoHTML}
        `;
        
        if (card.draggable) {
            card.addEventListener('dragstart', (e) => handleDragStart(e, task, ownerId));
            card.addEventListener('dragend', handleDragEnd);
        }
        return card;
    }
    
    function createTaskBlock(task) {
        const taskBlock = document.createElement('div');
        taskBlock.id = task.id;
        taskBlock.className = 'task-block';
        taskBlock.dataset.taskCharge = task.charge;
        taskBlock.draggable = true;
        taskBlock.style.backgroundColor = task.color;
        
        const chargeSpan = document.createElement('span');
        chargeSpan.className = 'task-charge-value';
        chargeSpan.textContent = task.charge;
        taskBlock.appendChild(chargeSpan);
        
        const ownerSpan = document.createElement('span');
        ownerSpan.textContent = `(${task.ownerId})`;
        ownerSpan.style.fontSize = '9px';
        taskBlock.appendChild(ownerSpan);

        taskBlock.style.height = `${task.charge * pixelsPerUnit}px`;
        taskBlock.style.backgroundSize = `100% ${pixelsPerUnit}px`;

        taskBlock.addEventListener('dragstart', (e) => handleDragStart(e, task, task.ownerId));
        taskBlock.addEventListener('dragend', handleDragEnd);
        
        return taskBlock;
    }

    function renderTasksToPlace() {
        taskListContainer.innerHTML = '';
        const tasksByOwner = tasksForClientList.reduce((acc, task) => {
            const ownerId = task.ownerId;
            if (!acc[ownerId]) acc[ownerId] = [];
            acc[ownerId].push(task);
            return acc;
        }, {});

        if (Object.keys(tasksByOwner).length === 0) {
            taskListContainer.innerHTML = `<p class="empty-state">Aucun client n'a de tâches à gérer.</p>`;
            return;
        }

        for (const clientId in tasksByOwner) {
            const client = gameState.clients.find(c => c.id === clientId);
            if (!client) continue;

            const group = document.createElement('div');
            group.className = 'client-task-group';
            const header = document.createElement('div');
            header.className = 'client-task-group-header';
            header.textContent = `Tâches de ${clientId}`;
            header.style.color = client.node.style('background-color');
            const grid = document.createElement('div');
            grid.className = 'client-task-grid';
            const tasks = tasksByOwner[clientId];
            if (tasks.length > 0) {
                tasks.forEach(task => grid.appendChild(createTaskCard(task, clientId)));
            } else {
                grid.innerHTML = `<p class="empty-state" style="font-size:12px; width: 100%; text-align: left;">Aucune tâche à placer.</p>`;
            }
            group.appendChild(header);
            group.appendChild(grid);
            taskListContainer.appendChild(group);
        }
    }

    function renderPlacementServers() {
        const containers = { phone: phoneServersContainer, cloud: cloudServersContainer };
        Object.values(containers).forEach(c => c.innerHTML = '');
    
        for (const serverId in serverStates) {
            const serverState = serverStates[serverId];
            const serverData = serverState.data;
            const container = serverData.isCloud ? containers.cloud : containers.phone;
            if (!container) continue;
    
            const serverWrapper = document.createElement('div');
            serverWrapper.className = 'server-wrapper-gameplay';
            serverWrapper.classList.toggle('is-off', !serverState.isOn && serverData.isCloud); // Griser seulement les serveurs cloud éteints
    
            const serverInfo = document.createElement('div');
            serverInfo.className = 'server-info-gameplay';
            serverInfo.textContent = `${serverData.name} (${serverState.currentLoad}/${serverData.capacity})`;
    
            const serverCol = document.createElement('div');
            serverCol.className = 'server-column-gameplay';
            serverCol.dataset.serverId = serverId;
            serverCol.style.height = `${serverData.capacity * pixelsPerUnit}px`;
            serverCol.style.backgroundSize = `100% ${pixelsPerUnit}px`;
            
            serverState.tasks.forEach(task => serverCol.appendChild(createTaskBlock(task)));
    
            serverCol.addEventListener('dragover', handleDragOver);
            serverCol.addEventListener('dragleave', handleDragLeave);
            serverCol.addEventListener('drop', handleDropOnServer);
    
            serverWrapper.appendChild(serverInfo);
            serverWrapper.appendChild(serverCol);

            // *** LA CORRECTION EST ICI ***
            // On n'ajoute le footer que si c'est un serveur Cloud
            if (serverData.isCloud) {
                const footer = document.createElement('div');
                footer.className = 'server-footer';

                const consumptionInfo = document.createElement('div');
                consumptionInfo.className = 'server-consumption-info';
                consumptionInfo.innerHTML = `Conso: <strong>${serverData.consumption || 0}W</strong>`;

                const powerBtn = document.createElement('button');
                powerBtn.className = 'power-toggle-btn';
                powerBtn.classList.toggle('is-on', serverState.isOn);
                powerBtn.classList.toggle('is-off', !serverState.isOn);
                powerBtn.textContent = serverState.isOn ? 'Éteindre' : 'Allumer';
                powerBtn.addEventListener('click', () => toggleServerPower(serverId));
                
                footer.appendChild(consumptionInfo);
                footer.appendChild(powerBtn);
                serverWrapper.appendChild(footer);
            }

            container.appendChild(serverWrapper);
        }
        updateCloudServerConsumptionDisplay();
    }
    
    function renderAll() {
        renderTasksToPlace();
        renderPlacementServers();
        updateGlobalConsumptionDisplay();
    }

    function toggleServerPower(serverId) {
        const server = serverStates[serverId];
        if (!server || !server.data.isCloud) return;

        if (server.isOn && server.tasks.length > 0) {
            uiManager.showNotification("Impossible d'éteindre un serveur qui contient des tâches.", "error");
            return;
        }

        // Mettre à jour l'état temporaire de la popup
        server.isOn = !server.isOn;

        // *** LA CORRECTION EST ICI ***
        // On met immédiatement à jour les données "officielles" sur le nœud Cytoscape
        const nodeToUpdate = gameState.cloudNode;
        if (nodeToUpdate && nodeToUpdate.length > 0) {
            let servers = nodeToUpdate.data('servers') || [];
            const serverIndex = servers.findIndex(s => s.id === serverId);
            if (serverIndex !== -1) {
                servers[serverIndex].isOn = server.isOn;
            }
            nodeToUpdate.data('servers', servers);
            console.log(`Updated server ${serverId} state on Cytoscape node to: ${server.isOn}`);
        }
        
        // Mettre à jour toute l'UI (popup ET jauge principale)
        renderAll();
        uiManager.updateStats();
    }

    function updateCloudServerConsumptionDisplay() {
        let currentCloudConsumption = 0;
        let maxCloudConsumption = 0;

        // On calcule les consos uniquement pour les serveurs cloud
        Object.values(serverStates).forEach(server => {
            if (server.data.isCloud) {
                maxCloudConsumption += server.data.consumption || 0;
                if (server.isOn) {
                    currentCloudConsumption += server.data.consumption || 0;
                }
            }
        });

        // On cible DIRECTEMENT l'affichage du cloud par son ID unique
        const display = document.getElementById('cloud-consumption-info-cloud-servers-container');
        if (display) {
            // On affiche seulement si des serveurs cloud existent
            if (maxCloudConsumption > 0 || currentContext === 'cloud') {
                display.innerHTML = `Conso Cloud: <strong>${currentCloudConsumption}W</strong> / ${maxCloudConsumption}W`;
            } else {
                display.innerHTML = '';
            }
        }
    }
    
    function updateGlobalConsumptionDisplay() {
        console.groupCollapsed("--- DEBUG: updateGlobalConsumptionDisplay (Popup) ---");

        if (!gameState.solutionValidator) {
            console.error("ERREUR: gameState.solutionValidator n'est pas disponible.");
            console.groupEnd();
            return;
        }

        // On appelle la fonction centrale qui est la source de vérité
        const totalCurrentConsumption = gameState.solutionValidator.getCurrentConsumption();
        const maxConsumption = gameState.initialConsumption;
        
        console.log(`Valeur finale obtenue de solutionValidator.getCurrentConsumption(): ${totalCurrentConsumption.toFixed(0)}W`);
        console.log(`Consommation maximale du niveau (initialConsumption): ${maxConsumption.toFixed(0)}W`);

        const display = document.getElementById('global-consumption-info');
        if (display) {
            display.innerHTML = `Conso Globale: <strong>${totalCurrentConsumption.toFixed(0)}W</strong> / ${maxConsumption.toFixed(0)}W`;
            console.log("Affichage mis à jour avec succès.");
        } else {
            console.error("ERREUR: Élément '#global-consumption-info' non trouvé dans le DOM !");
        }
        
        console.groupEnd();
    }

    function showPopup(clientId, context) {
        currentContext = context;
        tasksForClientList = [];
        serverStates = {};
        
        const clientsToShow = [];
        if (context === 'phone') {
            const client = gameState.clients.find(c => c.id === clientId);
            if (client) clientsToShow.push(client);
        } else {
            clientsToShow.push(...gameState.clients.filter(c => 
                gameState.completedPaths.some(p => p.path[0] === c.id && p.path.includes(gameState.cloudNode.id()))
            ));
        }

        if (context !== 'cloud' && clientsToShow.length === 0) {
             uiManager.showNotification("Client non trouvé.", "error");
             return;
        }
        
        clientsToShow.forEach(client => {
            const unplaced = JSON.parse(JSON.stringify(client.node.data('tasks') || []));
            unplaced.forEach(task => {
                task.status = 'unplaced';
                task.ownerId = client.id;
                if (!task.color) task.color = `hsl(${Math.random() * 360}, 70%, 50%)`;
                tasksForClientList.push(task);
            });
        });
    
        const serversToLoad = [];
        if (context === 'phone') {
            const phoneNode = gameState.cy.getElementById(`phone-${clientId}`);
            if (phoneNode) serversToLoad.push(...(phoneNode.data('servers') || []).map(s => ({...s, isCloud: false, owner: clientId})));
        }
        if (context === 'cloud') {
            if (gameState.cloudNode) serversToLoad.push(...(gameState.cloudNode.data('servers') || []).map(s => ({...s, isCloud: true})));
        }
    
        serversToLoad.forEach(serverData => {
            const existingTasks = JSON.parse(JSON.stringify(serverData.tasks || []));
            serverStates[serverData.id] = {
                data: serverData,
                tasks: existingTasks,
                currentLoad: existingTasks.reduce((sum, task) => sum + task.charge, 0),
                // Pour un serveur téléphone, isOn est toujours vrai et non pertinent
                isOn: serverData.isCloud ? (serverData.isOn !== false) : true,
            };
        });
    
        if (context === 'phone') {
            if (gameState.cloudNode && gameState.cloudNode.data('servers')) {
                gameState.cloudNode.data('servers').forEach(server => {
                    (server.tasks || []).forEach(task => {
                        if (task.ownerId === clientId) {
                            tasksForClientList.push({ ...task, status: 'placed_on_cloud', location: server.name });
                        }
                    });
                });
            }
        } else {
            clientsToShow.forEach(client => {
                const phoneNode = gameState.cy.getElementById(`phone-${client.id}`);
                if (phoneNode && phoneNode.data('servers')) {
                    phoneNode.data('servers').forEach(server => {
                        (server.tasks || []).forEach(task => {
                            if (task.ownerId === client.id) {
                                tasksForClientList.push({ ...task, status: 'placed_on_local' });
                            }
                        });
                    });
                }
            });
        }
    
        const maxCapacity = Math.max(...serversToLoad.map(s => s.capacity), 10);
        const containerHeight = phoneServersContainer.clientHeight || 400;
        const targetMaxHeight = containerHeight - 80;
        pixelsPerUnit = targetMaxHeight / maxCapacity;
    
        phoneServersContainer.parentElement.style.display = (context === 'phone') ? 'block' : 'none';
        cloudServersContainer.parentElement.style.display = (context === 'cloud') ? 'block' : 'none';
        
        const headerTitle = popup.querySelector('.modal-header h3');
        if(headerTitle) {
            headerTitle.textContent = context === 'phone' ? `Placement Local (${clientId})` : 'Placement Cloud';
        }

        ['phone-servers-container', 'cloud-servers-container'].forEach(id => {
            const container = document.getElementById(id);
            if(container) {
                const header = container.querySelector('h5');
                let display = header.querySelector('.cloud-consumption-info');
                if(!display) {
                    display = document.createElement('span');
                    display.className = 'cloud-consumption-info';
                    display.id = `cloud-consumption-info-${id}`;
                    header.appendChild(display);
                }
            }
        });

        popup.style.display = 'flex';
        renderAll();
        updateGlobalConsumptionDisplay();
    }

    function hidePopup() {
        popup.style.display = 'none';
    }

    function saveAndClose() {
        const allClientIdsInView = new Set(tasksForClientList.map(t => t.ownerId).filter(Boolean));
        
        allClientIdsInView.forEach(clientId => {
            if (!clientId) return;
            const client = gameState.clients.find(c => c.id === clientId);
            if (client && client.node) {
                const clientUnplacedTasks = tasksForClientList.filter(t => t.ownerId === clientId && t.status === 'unplaced');
                client.node.data('tasks', clientUnplacedTasks);
            }
        });
        
        Object.values(serverStates).forEach(serverState => {
            const ownerId = serverState.data.isCloud ? null : serverState.data.owner;
            const nodeToUpdate = serverState.data.isCloud ? gameState.cloudNode : gameState.cy.getElementById(`phone-${ownerId}`);
            if (!nodeToUpdate || nodeToUpdate.length === 0) return;
            
            let servers = nodeToUpdate.data('servers') || [];
            const serverIndex = servers.findIndex(s => s.id === serverState.data.id);
            
            if (serverIndex !== -1) {
                servers[serverIndex].tasks = serverState.tasks;
                servers[serverIndex].isOn = serverState.isOn;
            } else if (serverState.tasks.length > 0) {
                servers.push({ ...serverState.data, tasks: serverState.tasks, isOn: serverState.isOn });
            }
            nodeToUpdate.data('servers', servers);
        });
        
        uiManager.updateStats();
        hidePopup();
    }
    
    taskListContainer.addEventListener('dragover', handleDragOver);
    taskListContainer.addEventListener('dragleave', handleDragLeave);
    taskListContainer.addEventListener('drop', handleDropOnQueue);
    
    closeBtn.addEventListener('click', () => {
        if (confirm("Voulez-vous fermer sans sauvegarder les changements ?")) {
            hidePopup();
        }
    });
    saveAndCloseBtn.addEventListener('click', saveAndClose);

    return {
        show: showPopup,
        hide: hidePopup,
    };
}