document.addEventListener('DOMContentLoaded', () => {
    // --- DÉFINITION DES DONNÉES DES NIVEAUX (INCHANGÉ) ---
    const LEVELS = [
        {
            title: "Le Puzzle de Placement", objective: "Placez les tâches dans l'ordre dans les serveurs.", mode: 'Placement',
            introduction: { title: "Bienvenue, Opérateur !", text: "Votre mission est de gérer la charge des serveurs.\n\n1. Prenez les tâches (blocs) de la file d'attente, toujours dans l'ordre.\n2. Glissez-les sur les serveurs (colonnes) pour les placer.\n3. Chaque serveur a une capacité (hauteur) limitée.\n4. Chaque serveur allumé consomme de l'énergie. Gardez un œil sur la jauge pour ne pas dépasser le seuil autorisé.\n\nBonne chance !" },
            tasks: [{ id: 't1', charge: 5 }, { id: 't2', charge: 8 }, { id: 't3', charge: 6 }],
            servers: [ { id: 's1', name: 'Serveur A', capacity: 15, baseConsumption: 20, execConsumption: 10 }, { id: 's2', name: 'Serveur B', capacity: 15, baseConsumption: 20, execConsumption: 10 } ],
            energyThreshold: 100
        },
        {
            title: "Optimisation de l'Espace", objective: "Placez les tâches dans l'ordre sans dépasser le seuil d'énergie.", mode: 'Placement',
            tasks: [{ id: 't4', charge: 7 }, { id: 't5', charge: 5 }, { id: 't6', charge: 4 }, { id: 't7', charge: 8 }, { id: 't8', charge: 1 }, { id: 't9', charge: 5 }],
            servers: [ { id: 's3', name: 'Éco', capacity: 10, baseConsumption: 10, execConsumption: 10, color: 'var(--accent-success)' }, { id: 's4', name: 'Standard', capacity: 20, baseConsumption: 20, execConsumption: 10, color: 'var(--accent-info)' }, { id: 's5', name: 'Perf', capacity: 25, baseConsumption: 30, execConsumption: 10, color: 'var(--accent-perf)' } ],
            energyThreshold: 30
        },
        {
            title: "L'Algorithme : First Fit", objective: "Placez les tâches dans l'ordre en appliquant 'First Fit'.", mode: 'Placement', algorithm: 'first-fit',
            algorithmDescription: { title: "Stratégie : First Fit", text: "L'algorithme 'First Fit' est simple et rapide. Pour chaque tâche, parcourez les serveurs de gauche à droite et placez la tâche dans le *premier* serveur qui a assez d'espace disponible." },
            tasks: [{ id: 't10', charge: 4 }, { id: 't11', charge: 5 }, { id: 't12', charge: 12 }, { id: 't13', charge: 6 }, { id: 't14', charge: 5 }, { id: 't15', charge: 5 }],
            servers: [ { id: 's6', name: 'Petit', capacity: 9, baseConsumption: 10, execConsumption: 10 }, { id: 's7', name: 'Moyen', capacity: 11, baseConsumption: 10, execConsumption: 10 }, { id: 's8', name: 'Gros', capacity: 20, baseConsumption: 10, execConsumption: 10 } ],
            energyThreshold: 30
        },
        {
            title: "L'Algorithme : Best Fit", objective: "Placez les tâches dans l'ordre en appliquant 'Best Fit'.", mode: 'Placement', algorithm: 'best-fit',
            algorithmDescription: { title: "Stratégie : Best Fit", text: "L'algorithme 'Best Fit' vise à optimiser l'espace. Pour chaque tâche, examinez *tous* les serveurs disponibles et placez la tâche dans celui où il restera le *plus petit espace libre possible*." },
            tasks: [{ id: 't16', charge: 8 }, { id: 't17', charge: 12 }, { id: 't18', charge: 7 }, { id: 't19', charge: 5 }, { id: 't20', charge: 3 }, { id: 't21', charge: 1 }, { id: 't22', charge: 2 }],
            servers: [ { id: 's9', name: 'Rack 20U', capacity: 20, baseConsumption: 10, execConsumption: 10 }, { id: 's10', name: 'Rack 18U', capacity: 18, baseConsumption: 10, execConsumption: 10 }, { id: 's11', name: 'Rack 15U', capacity: 15, baseConsumption: 10, execConsumption: 10 } ],
            energyThreshold: 30
        },
        {
            title: "L'Algorithme : FFD", objective: "Prenez les tâches triées et placez-les avec 'First Fit'.", mode: 'Placement', algorithm: 'ffd',
            algorithmDescription: { title: "Stratégie : First Fit Decreasing (FFD)", text: "FFD est une version améliorée de 'First Fit'. La première étape est de *trier les tâches de la plus grande à la plus petite*. Ensuite, appliquez l'algorithme 'First Fit' simple sur les tâches triées. Cela permet souvent d'obtenir une bien meilleure répartition." },
            tasks: [{ id: 't23', charge: 7 }, { id: 't24', charge: 12 }, { id: 't25', charge: 3 }, { id: 't26', charge: 10 }, { id: 't27', charge: 2 }].sort((a, b) => b.charge - a.charge),
            servers: [ { id: 's12', name: 'Rack 15U', capacity: 15, baseConsumption: 10, execConsumption: 10 }, { id: 's13', name: 'Rack 20U', capacity: 20, baseConsumption: 10, execConsumption: 10 } ],
            energyThreshold: 20
        },
        {
            title: "La Synthèse", objective: "Traiter toutes les tâches en 8 exécutions ou moins.", mode: 'Execution',
            introduction: { title: "Mode Exécution Activé", text: "Les règles changent ! Vous devez maintenant traiter les tâches.\n\n1. Vous ne pouvez placer que **3 tâches par tour**.\n2. Une fois vos tâches placées, cliquez sur **'Lancer l'Exécution'** pour les traiter.\n3. Chaque serveur réduit la charge des tâches qu'il héberge grâce à sa **Puissance**.\n4. Les tâches terminées disparaissent. Celles qui ne le sont pas restent sur le serveur.\n5. L'objectif est de vider la file d'attente et les serveurs en utilisant le moins d'exécutions possible." },
            tasks: [{ id: 't28', charge: 15 }, { id: 't29', charge: 1 }, { id: 't30', charge: 12 }, { id: 't31', charge: 3 }, { id: 't32', charge: 20 }, { id: 't33', charge: 2 }],
            servers: [ { id: 's14', name: 'Éco', capacity: 25, baseConsumption: 10, execConsumption: 10, power: 1, color: 'var(--accent-success)'}, { id: 's15', name: 'Standard', capacity: 25, baseConsumption: 20, execConsumption: 10, power: 3, color: 'var(--accent-info)'}, { id: 's16', name: 'Perf', capacity: 25, baseConsumption: 25, execConsumption: 10, power: 5, color: 'var(--accent-perf)'} ],
            energyThreshold: 45, maxExecutions: 8,
        },
            // --- NOUVEAUX NIVEAUX AJOUTÉS À LA FIN ---
{ // NOUVEAU NIVEAU 7 - Le Piège du First Fit
    title: "Contre-Exemple : First Fit",
    objective: "L'algorithme semble échouer. Trouvez la solution optimale.",
    mode: 'Placement',
    algorithmDescription: {
        title: "Le Piège du First Fit",
        text: "Parfois, la solution la plus rapide n'est pas la meilleure. 'First Fit' place les tâches dans le premier espace disponible, même si ce n'est pas le meilleur choix à long terme. Dans cet exemple, l'algorithme va utiliser 4 serveurs alors qu'il est possible d'en utiliser seulement 3 en optimisant l'ordre."
    },
    tasks: [
        { id: 't1', charge: 3 },
        { id: 't2', charge: 2 },
        { id: 't3', charge: 4 },
        { id: 't4', charge: 1 },
        { id: 't5', charge: 6 },
        { id: 't6', charge: 5 },
        { id: 't7', charge: 8 },
        { id: 't8', charge: 3 }
    ],
    servers: [
        { id: 's1', name: 'Petit Rack', capacity: 8, baseConsumption: 10, execConsumption: 10 },
        { id: 's2', name: 'Petit Rack', capacity: 10, baseConsumption: 10, execConsumption: 10 },
        { id: 's3', name: 'Petit Rack', capacity: 15, baseConsumption: 10, execConsumption: 10 },
        { id: 's4', name: 'Petit Rack', capacity: 15, baseConsumption: 10, execConsumption: 10 }
    ],
    energyThreshold: 30 // Forcer l'utilisation de 3 serveurs max
},
{ // NOUVEAU NIVEAU X - Le Piège du Best Fit
    title: "Contre-Exemple : Best Fit",
    objective: "L'algorithme semble échouer. Trouvez la solution optimale.",
    mode: 'Placement',
    algorithmDescription: {
        title: "Le Piège du Best Fit",
        text: "Même l'algorithme 'Best Fit', qui cherche à remplir le plus possible chaque serveur avant d'en ouvrir un nouveau, peut échouer. Dans cet exemple, il va utiliser 4 serveurs, alors qu'il est possible d'en utiliser seulement 3 en optimisant l'ordre."
    },
    tasks: [
        { id: 't1', charge: 5 },
        { id: 't2', charge: 3 },
        { id: 't3', charge: 5 },
        { id: 't4', charge: 1 },
        { id: 't5', charge: 7 },
        { id: 't6', charge: 8 }
    ],
    servers: [
        { id: 's1', name: 'Petit Rack', capacity: 10, baseConsumption: 10, execConsumption: 10 },
        { id: 's2', name: 'Petit Rack', capacity: 10, baseConsumption: 10, execConsumption: 10 },
        { id: 's3', name: 'Petit Rack', capacity: 10, baseConsumption: 10, execConsumption: 10 },
        { id: 's4', name: 'Petit Rack', capacity: 10, baseConsumption: 10, execConsumption: 10 }
    ],
    energyThreshold: 30 // Forcer l'utilisation de 3 serveurs max
},
        
    ];

    // --- SÉLECTION DES ÉLÉMENTS DU DOM (INCHANGÉ) ---
    const levelSelector = document.getElementById('level-selector');
    const serversArea = document.getElementById('servers-area');
    const taskQueue = document.getElementById('task-queue');
    const levelTitle = document.getElementById('level-title');
    const infoBtn = document.getElementById('info-btn');
    const levelObjective = document.getElementById('level-objective');
    const currentEnergy = document.getElementById('current-energy');
    const maxEnergy = document.getElementById('max-energy');
    const energyMeter = document.getElementById('energy-meter');
    const energyGaugeFill = document.getElementById('energy-gauge-fill');
    const executionInfo = document.getElementById('execution-info');
    const currentExecutions = document.getElementById('current-executions');
    const maxExecutions = document.getElementById('max-executions');
    const currentPlacements = document.getElementById('current-placements');
    const executeBtn = document.getElementById('execute-btn');
    const resetBtn = document.getElementById('reset-btn');
    const modeSwitchContainer = document.getElementById('algorithm-mode-switch');
    const modeToggle = document.getElementById('mode-toggle');
    const execConsumptionToggle = document.getElementById('exec-consumption-toggle');
    const modalOverlay = document.getElementById('modal-overlay');
    const modalContent = document.getElementById('modal-content');
    const modalTitle = document.getElementById('modal-title');
    const modalMessage = document.getElementById('modal-message');
    const modalNextBtn = document.getElementById('modal-next-btn');
    const modalRetryBtn = document.getElementById('modal-retry-btn');
    const infoModalOverlay = document.getElementById('info-modal-overlay');
    const infoModalContent = document.getElementById('info-modal-content');
    const infoModalTitle = document.getElementById('info-modal-title');
    const infoModalText = document.getElementById('info-modal-text');
    const infoModalCloseBtn = document.getElementById('info-modal-close-btn');
    let currentLevelIndex = 0;
    let gameState = {};
    let draggedElement = null;
    let isExecConsumptionActive = false;

    // --- FONCTIONS DE LOGIQUE ---
    function initGame() {
        levelSelector.innerHTML = '';
        LEVELS.forEach((level, index) => {
            const btn = document.createElement('button');
            btn.classList.add('level-btn');
            btn.textContent = `Niv ${index + 1}`;
            btn.dataset.level = index;
            if (index === 0) btn.classList.add('active');
            btn.addEventListener('click', () => loadLevel(index));
            levelSelector.appendChild(btn);
        });
        loadLevel(0);
        resetBtn.addEventListener('click', () => loadLevel(currentLevelIndex));
        executeBtn.addEventListener('click', handleExecution);
        execConsumptionToggle.addEventListener('change', (e) => {
            isExecConsumptionActive = e.target.checked;
            updateInfoPanel();
            renderBoard();
        });
        modalNextBtn.addEventListener('click', () => {
            modalOverlay.classList.add('hidden');
            if (currentLevelIndex < LEVELS.length - 1) {
                loadLevel(currentLevelIndex + 1);
            }
        });
        modalRetryBtn.addEventListener('click', () => {
            modalOverlay.classList.add('hidden');
            loadLevel(currentLevelIndex);
        });
        infoBtn.addEventListener('click', () => {
            const desc = gameState.level.algorithmDescription;
            if (desc) showInfoPopup(desc);
        });
        infoModalCloseBtn.addEventListener('click', hideInfoPopup);
        infoModalOverlay.addEventListener('click', (e) => {
            if (e.target === infoModalOverlay) hideInfoPopup();
        });
    }

    function loadLevel(levelIndex) {
        currentLevelIndex = levelIndex;
        const level = LEVELS[levelIndex];
        document.querySelectorAll('.level-btn').forEach(btn => {
            btn.classList.toggle('active', parseInt(btn.dataset.level) === levelIndex);
        });
        const maxCapacityInLevel = Math.max(...level.servers.map(s => s.capacity));
        const containerHeight = serversArea.clientHeight;
        const targetMaxHeight = (containerHeight - 40 - 50) * 0.9;
        const pixelsPerUnit = targetMaxHeight / maxCapacityInLevel;
        gameState = {
            level,
            servers: level.servers.map(s => ({ ...s, tasks: [] })),
            tasksInQueue: level.tasks.map(t => ({...t})),
            placementsThisTurn: 0,
            executions: 0,
            pixelsPerUnit
        };
        execConsumptionToggle.checked = false;
        isExecConsumptionActive = false;
        setupUIForLevel(level);
        renderBoard();
        updateInfoPanel();
        const popupContent = level.introduction || level.algorithmDescription;
        if (popupContent) {
            showInfoPopup(popupContent);
        }
    }

    // NOUVELLE FONCTION POUR L'ANIMATION
    function triggerConsumptionAnimation(server, chargeReduced, bottomOffset) {
        const serverWrapper = document.getElementById(server.id).parentElement;
        if (!serverWrapper) return;
        
        const effect = document.createElement('div');
        effect.className = 'consumption-effect';
        effect.style.height = `${chargeReduced * gameState.pixelsPerUnit}px`;
        effect.style.bottom = `${bottomOffset}px`;

        serverWrapper.appendChild(effect);
        
        effect.addEventListener('animationend', () => {
            effect.remove();
        });
    }

    // MODIFICATION MAJEURE DE CETTE FONCTION
    function handleExecution() {
        if (gameState.level.mode !== 'Execution' || gameState.placementsThisTurn === 0) return;

        const totalConsumption = calculateTotalConsumption();
        if (totalConsumption > gameState.level.energyThreshold) {
            showWinLossModal(false, "Surcharge Critique !", `L'exécution a échoué. La consommation de ${totalConsumption}W dépasse le seuil de ${gameState.level.energyThreshold}W.`);
            return;
        }

        gameState.executions++;

        // 1. Déclencher les animations
        gameState.servers.forEach(server => {
            let power = server.power;
            let bottomOffset = 0;
            
            for (const task of server.tasks) {
                if (power <= 0) break;
                
                const chargeToReduce = Math.min(task.charge, power);
                
                if (chargeToReduce > 0) {
                    // La position de l'effet est au-dessus de la partie non consommée de la tâche
                    const effectBottom = bottomOffset + (task.charge - chargeToReduce) * gameState.pixelsPerUnit;
                    triggerConsumptionAnimation(server, chargeToReduce, effectBottom);
                }
                
                power -= chargeToReduce;
                bottomOffset += task.charge * gameState.pixelsPerUnit;
            }
        });

        // 2. Mettre à jour l'état du jeu après la fin de l'animation
        setTimeout(() => {
            gameState.servers.forEach(server => {
                let power = server.power;
                if (power <= 0 || server.tasks.length === 0) return;

                const tasksToKeep = [];
                for (const task of server.tasks) {
                    if (power <= 0) {
                        tasksToKeep.push(task);
                        continue;
                    }
                    const chargeToReduce = Math.min(task.charge, power);
                    task.charge -= chargeToReduce;
                    power -= chargeToReduce;
                    if (task.charge > 0) {
                        tasksToKeep.push(task);
                    }
                }
                server.tasks = tasksToKeep;
            });

            gameState.placementsThisTurn = 0;
            renderBoard();
            updateInfoPanel();
            checkWinCondition();
        }, 500); // Correspond à la durée de l'animation en CSS
    }

    // Le reste du code est identique et correct
    function setupUIForLevel(level) { levelTitle.textContent = level.title; levelObjective.textContent = level.objective; maxEnergy.textContent = `${level.energyThreshold}W`; const isExecutionMode = level.mode === 'Execution'; executionInfo.style.display = isExecutionMode ? 'flex' : 'none'; executeBtn.style.display = isExecutionMode ? 'block' : 'none'; if (isExecutionMode) { maxExecutions.textContent = level.maxExecutions; } modeSwitchContainer.style.display = level.algorithm ? 'flex' : 'none'; infoBtn.classList.toggle('hidden', !level.algorithmDescription); modeToggle.checked = true; }
    function renderBoard() { serversArea.innerHTML = ''; taskQueue.innerHTML = ''; gameState.servers.forEach(server => { const serverWrapper = document.createElement('div'); serverWrapper.className = 'server-wrapper'; const serverInfo = document.createElement('div'); serverInfo.className = 'server-info'; const serverLoad = server.tasks.reduce((sum, task) => sum + task.charge, 0); serverInfo.innerHTML = `<span class="name">${server.name}</span><br><span class="usage">${serverLoad} / ${server.capacity}</span>`; const serverCol = document.createElement('div'); serverCol.id = server.id; serverCol.className = 'server-column'; const serverHeight = server.capacity * gameState.pixelsPerUnit; serverCol.style.height = `${serverHeight}px`; serverCol.style.backgroundSize = `100% ${gameState.pixelsPerUnit}px`; if(server.color) serverCol.style.borderColor = server.color; server.tasks.forEach(task => { const taskBlock = createTaskElement(task, true, server); serverCol.appendChild(taskBlock); }); addDropListeners(serverCol); const consumptionInfo = document.createElement('div'); consumptionInfo.className = 'server-consumption'; consumptionInfo.innerHTML = `Consommation: <strong>${server.baseConsumption}W</strong>`; serverWrapper.appendChild(serverInfo); serverWrapper.appendChild(serverCol); serverWrapper.appendChild(consumptionInfo); serversArea.appendChild(serverWrapper); }); gameState.tasksInQueue.forEach((task, index) => { let isDraggable = (index === 0); if (gameState.level.mode === 'Execution' && gameState.placementsThisTurn >= 3) { isDraggable = false; } const taskBlock = createTaskElement(task, isDraggable, null); taskQueue.appendChild(taskBlock); }); addDropListeners(taskQueue); }
    function createTaskElement(task, isDraggable, server = null) { const taskBlock = document.createElement('div'); taskBlock.id = task.id; taskBlock.className = 'task-block'; taskBlock.draggable = isDraggable; if (!isDraggable) { taskBlock.classList.add('non-draggable'); } const chargeSpan = document.createElement('span'); chargeSpan.className = 'task-charge-value'; chargeSpan.textContent = task.charge; taskBlock.appendChild(chargeSpan); if (server && isExecConsumptionActive) { const consumption = task.charge * server.execConsumption; const consumptionSpan = document.createElement('span'); consumptionSpan.className = 'task-consumption-info'; consumptionSpan.textContent = `+${consumption}W`; taskBlock.appendChild(consumptionSpan); } taskBlock.style.height = `${task.charge * gameState.pixelsPerUnit}px`; taskBlock.style.backgroundSize = `100% ${gameState.pixelsPerUnit}px`; taskBlock.style.backgroundColor = `hsl(${task.charge * 15 % 360}, 70%, 50%)`; taskBlock.addEventListener('dragstart', handleDragStart); taskBlock.addEventListener('dragend', handleDragEnd); return taskBlock; }
    function calculateTotalConsumption() { const activeServers = gameState.servers.filter(s => s.tasks.length > 0); let total = activeServers.reduce((sum, s) => sum + s.baseConsumption, 0); if (isExecConsumptionActive) { activeServers.forEach(server => { const occupiedLoad = server.tasks.reduce((sum, task) => sum + task.charge, 0); total += occupiedLoad * server.execConsumption; }); } return total; }
    function updateInfoPanel() { const totalConsumption = calculateTotalConsumption(); currentEnergy.textContent = `${totalConsumption}W`; const percentage = (totalConsumption / gameState.level.energyThreshold) * 100; energyGaugeFill.style.width = `${Math.min(percentage, 100)}%`; energyMeter.classList.toggle('over-limit', totalConsumption > gameState.level.energyThreshold); if (gameState.level.mode === 'Execution') { currentExecutions.textContent = gameState.executions; currentPlacements.textContent = gameState.placementsThisTurn; executeBtn.disabled = gameState.placementsThisTurn === 0; } }
    function showInfoPopup(content) { if (!content) return; infoModalTitle.textContent = content.title; infoModalText.innerHTML = content.text.replace(/\n/g, '<br>'); infoModalOverlay.classList.remove('hidden'); }
    function hideInfoPopup() { infoModalOverlay.classList.add('hidden'); }
    function handleDrop(e) { e.preventDefault(); const dropTarget = e.currentTarget.classList.contains('server-column') ? e.currentTarget : taskQueue; dropTarget.classList.remove('drop-valid', 'drop-invalid'); if (!isDropValid(dropTarget)) return; const taskId = e.dataTransfer.getData('text/plain'); const task = findTaskById(taskId); removeTaskFromOrigin(taskId); if (dropTarget.id === 'task-queue') { gameState.tasksInQueue.unshift(task); } else { const server = gameState.servers.find(s => s.id === dropTarget.id); server.tasks.push(task); if (gameState.level.mode === 'Execution') { gameState.placementsThisTurn++; } } renderBoard(); updateInfoPanel(); checkWinCondition(); }
    function isDropValid(dropTarget) { if (!draggedElement) return false; const taskId = draggedElement.id; const task = findTaskById(taskId); if (draggedElement.parentElement.id === 'task-queue') { const firstTaskInQueue = gameState.tasksInQueue[0]; if (!firstTaskInQueue || task.id !== firstTaskInQueue.id) return false; if (gameState.level.mode === 'Execution' && gameState.placementsThisTurn >= 3) return false; } if (dropTarget.id === 'task-queue') return true; const server = gameState.servers.find(s => s.id === dropTarget.id); const currentLoad = server.tasks.reduce((sum, t) => sum + t.charge, 0); if (currentLoad + task.charge > server.capacity) return false; if (gameState.level.algorithm && modeToggle.checked) { switch (gameState.level.algorithm) { case 'first-fit': case 'ffd': const firstValidServer = gameState.servers.find(s => s.tasks.reduce((sum, t) => sum + t.charge, 0) + task.charge <= s.capacity ); return firstValidServer ? server.id === firstValidServer.id : false; case 'best-fit': let bestServer = null; let minRemainingSpace = Infinity; gameState.servers.forEach(s => { const currentLoad = s.tasks.reduce((sum, t) => sum + t.charge, 0); if (currentLoad + task.charge <= s.capacity) { const remainingSpace = s.capacity - (currentLoad + task.charge); if (remainingSpace < minRemainingSpace) { minRemainingSpace = remainingSpace; bestServer = s; } } }); return bestServer ? server.id === bestServer.id : false; } } return true; }
    function checkWinCondition() { const level = gameState.level; const totalConsumption = calculateTotalConsumption(); if (level.mode === 'Placement') { if (gameState.tasksInQueue.length > 0) return; if (totalConsumption <= level.energyThreshold) { showWinLossModal(true, 'Victoire !', 'Configuration optimale trouvée. Tous les systèmes sont stables.'); } else { showWinLossModal(false, 'Défaite...', `La consommation d'énergie (${totalConsumption}W) dépasse le seuil autorisé de ${level.energyThreshold}W.`); } } else if (level.mode === 'Execution') { const tasksOnServers = gameState.servers.reduce((count, s) => count + s.tasks.length, 0); if (gameState.tasksInQueue.length === 0 && tasksOnServers === 0) { showWinLossModal(true, "Mission Accomplie !", `Toutes les tâches ont été traitées en ${gameState.executions} exécutions.`); return; } if (gameState.executions >= level.maxExecutions && (gameState.tasksInQueue.length > 0 || tasksOnServers > 0)) { showWinLossModal(false, "Temps Écoulé", `Vous avez dépassé le nombre maximum de ${level.maxExecutions} exécutions.`); return; } } }
    function handleDragStart(e) { if (!e.target.draggable) { e.preventDefault(); return; } draggedElement = e.target; e.dataTransfer.setData('text/plain', e.target.id); setTimeout(() => e.target.classList.add('dragging'), 0); }
    function handleDragEnd(e) { if(draggedElement) draggedElement.classList.remove('dragging'); draggedElement = null; document.querySelectorAll('.drop-valid, .drop-invalid').forEach(el => el.classList.remove('drop-valid', 'drop-invalid')); }
    function addDropListeners(element) { element.addEventListener('dragover', handleDragOver); element.addEventListener('dragleave', handleDragLeave); element.addEventListener('drop', handleDrop); }
    function handleDragOver(e) { e.preventDefault(); const dropTarget = e.currentTarget.classList.contains('server-column') ? e.currentTarget : taskQueue; if (isDropValid(dropTarget)) { dropTarget.classList.add('drop-valid'); dropTarget.classList.remove('drop-invalid'); } else { dropTarget.classList.add('drop-invalid'); dropTarget.classList.remove('drop-valid'); } }
    function handleDragLeave(e) { e.currentTarget.classList.remove('drop-valid', 'drop-invalid'); }
    function findTaskById(taskId) { let task = gameState.tasksInQueue.find(t => t.id === taskId); if (task) return task; for (const server of gameState.servers) { task = server.tasks.find(t => t.id === taskId); if (task) return task; } return null; }
    function removeTaskFromOrigin(taskId) { let taskIndex = gameState.tasksInQueue.findIndex(t => t.id === taskId); if (taskIndex > -1) { gameState.tasksInQueue.splice(taskIndex, 1); return; } for (const server of gameState.servers) { taskIndex = server.tasks.findIndex(t => t.id === taskId); if (taskIndex > -1) { server.tasks.splice(taskIndex, 1); return; } } }
    function showWinLossModal(isVictory, title, message) { modalTitle.textContent = title; modalMessage.textContent = message; modalContent.className = isVictory ? 'victory' : 'defeat'; modalNextBtn.style.display = isVictory ? 'inline-block' : 'none'; modalOverlay.classList.remove('hidden'); }

    initGame();
});