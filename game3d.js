const viewport = document.getElementById('gameViewport');
const playerHealthEl = document.getElementById('playerHealth');
const npcHealthEl = document.getElementById('npcHealth');
const playerHealthText = document.getElementById('playerHealthText');
const npcHealthText = document.getElementById('npcHealthText');
const npcDifficultyEl = document.getElementById('npcDifficulty');
const combatLog = document.getElementById('combatLog');
const difficultySelect = document.getElementById('difficultySelect');
const messageEl = document.getElementById('message');

const player = {
    health: 100,
    maxHealth: 100,
    energy: 100,
    isBlocking: false,
    isDodging: false,
};

const npc = {
    health: 100,
    maxHealth: 100,
    difficulty: 'normal',
    isFrozen: false,
    isBlocking: false,
};

let gameStarted = false;
let scene, camera, renderer;
let playerModel, npcModel;
let actionTimer = null;

function logMessage(text) {
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    entry.textContent = text;
    combatLog.prepend(entry);
}

function showMessage(text) {
    messageEl.textContent = text;
    messageEl.classList.add('show');
    clearTimeout(showMessage.timer);
    showMessage.timer = setTimeout(() => messageEl.classList.remove('show'), 900);
}

function updateHealthUI() {
    const playerPct = (player.health / player.maxHealth) * 100;
    const npcPct = (npc.health / npc.maxHealth) * 100;

    playerHealthEl.style.width = `${playerPct}%`;
    npcHealthEl.style.width = `${npcPct}%`;

    playerHealthText.textContent = `${Math.max(0, player.health)}/${player.maxHealth}`;
    npcHealthText.textContent = `${Math.max(0, npc.health)}/${npc.maxHealth}`;

    if (player.health <= 0) {
        player.health = 0;
        showMessage('Tu as perdu !');
        logMessage('Défaite : le PNJ t’a battu.');
    }

    if (npc.health <= 0) {
        npc.health = 0;
        showMessage('Tu as gagné !');
        logMessage('Victoire : tu as éliminé le PNJ.');
    }
}

function setDifficulty() {
    const diff = difficultySelect.value;
    npc.difficulty = diff;

    if (diff === 'facile') {
        npc.maxHealth = 90;
        npc.health = 90;
        npcDifficultyEl.textContent = 'Difficulté: Facile';
    } else if (diff === 'normal') {
        npc.maxHealth = 100;
        npc.health = 100;
        npcDifficultyEl.textContent = 'Difficulté: Normal';
    } else {
        npc.maxHealth = 120;
        npc.health = 120;
        npcDifficultyEl.textContent = 'Difficulté: Difficile';
    }

    updateHealthUI();
}

function resetGame() {
    player.health = 100;
    player.energy = 100;
    player.isBlocking = false;
    player.isDodging = false;

    npc.health = npc.maxHealth;
    npc.isFrozen = false;
    npc.isBlocking = false;

    playerModel.position.set(-3, 0.9, 0);
    npcModel.position.set(3, 0.9, 0);
    playerModel.rotation.y = 0.2;
    npcModel.rotation.y = Math.PI - 0.2;

    updateHealthUI();
    document.getElementById('playerEnergy').textContent = `Énergie: ${player.energy}/100`;
}

function randomBetween(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function animateHit(target, strength = 1) {
    const originalY = target.position.y;
    target.position.y = originalY + 0.35 * strength;
    target.rotation.z = 0.2 * strength;
    setTimeout(() => {
        target.position.y = originalY;
        target.rotation.z = 0;
    }, 120);
}

function playerAttack(type) {
    if (!gameStarted) {
        showMessage('Clique sur Démarrer');
        return;
    }
    if (player.health <= 0 || npc.health <= 0) return;

    let damage = 0;

    if (type === 'simple') {
        damage = randomBetween(8, 15);
    } else if (type === 'heavy') {
        if (player.energy < 35) {
            showMessage('Pas assez d’énergie !');
            logMessage('Tu n’as pas assez d’énergie pour un Heavy Attack.');
            return;
        }
        damage = randomBetween(20, 30);
        player.energy -= 35;
    }

    if (npc.isBlocking) {
        damage = Math.max(2, Math.floor(damage / 2));
        showMessage('Le PNJ a bloqué !');
        logMessage('Le PNJ a bloqué une partie de ton attaque.');
    }

    npc.health -= damage;
    if (npc.health < 0) npc.health = 0;

    updateHealthUI();
    logMessage(`Tu as infligé ${damage} dégâts.`);
    animateHit(npcModel, 1.4);
    document.getElementById('playerEnergy').textContent = `Énergie: ${player.energy}/100`;

    npcTurn();
}

function playerDodge() {
    if (!gameStarted) return;
    if (player.health <= 0 || npc.health <= 0) return;

    player.isDodging = true;
    showMessage('Tu esquives !');
    logMessage('Tu esquives l’attaque du PNJ.');
    animateHit(playerModel, 0.8);
    setTimeout(() => { player.isDodging = false; }, 500);
}

function playerBlock() {
    if (!gameStarted) return;
    player.isBlocking = true;
    showMessage('Blocage !');
    logMessage('Tu mets ta garde.');
    setTimeout(() => { player.isBlocking = false; }, 600);
}

function npcTurn() {
    if (npc.health <= 0 || player.health <= 0) return;
    if (npc.isFrozen) {
        logMessage('Le PNJ est gelé, il ne peut pas attaquer.');
        return;
    }

    clearTimeout(actionTimer);
    actionTimer = setTimeout(() => {
        if (player.health <= 0 || npc.health <= 0) return;

        let dmg = randomBetween(5, 14);
        if (npc.difficulty === 'facile') dmg = randomBetween(4, 10);
        if (npc.difficulty === 'difficile') dmg = randomBetween(10, 18);

        if (player.isDodging) {
            dmg = Math.max(0, Math.floor(dmg / 2));
            showMessage('Tu as évité !');
            logMessage('Le PNJ a frappé mais tu as esquivé.');
        }

        if (player.isBlocking) {
            dmg = Math.max(1, Math.floor(dmg / 2));
            showMessage('Blocage réussi !');
            logMessage('Tu as réduit les dégâts.');
        }

        player.health -= dmg;
        if (player.health < 0) player.health = 0;

        updateHealthUI();
        logMessage(`Le PNJ t’a infligé ${dmg} dégâts.`);
        animateHit(playerModel, 1.5);
        player.energy = Math.min(100, player.energy + 10);
        document.getElementById('playerEnergy').textContent = `Énergie: ${player.energy}/100`;
    }, 500);
}

function startCombat() {
    gameStarted = true;
    showMessage('Combat commencé !');
    logMessage('Le combat commence.');
    resetGame();
}

function healPlayer() {
    if (!gameStarted) {
        showMessage('Le combat n’a pas commencé');
        return;
    }
    player.health = Math.min(player.maxHealth, player.health + 20);
    updateHealthUI();
    logMessage('Commande tablette: Heal +20.');
}

function speedBoost() {
    if (!gameStarted) return;
    player.energy = Math.min(100, player.energy + 25);
    document.getElementById('playerEnergy').textContent = `Énergie: ${player.energy}/100`;
    logMessage('Commande tablette: Speed boost.');
}

function godMode() {
    if (!gameStarted) return;
    player.health = 100;
    updateHealthUI();
    logMessage('Commande tablette: God mode activé.');
}

function freezeNPC() {
    if (!gameStarted) return;
    npc.isFrozen = true;
    showMessage('PNJ gelé !');
    logMessage('Commande tablette: PNJ gelé.');
    setTimeout(() => {
        npc.isFrozen = false;
        logMessage('Le PNJ n’est plus gelé.');
    }, 2500);
}

function spawnNewNPC() {
    if (!gameStarted) return;
    npc.health = npc.maxHealth;
    npc.isFrozen = false;
    updateHealthUI();
    showMessage('Nouveau PNJ !');
    logMessage('Commande tablette: Nouveau PNJ généré.');
}

function killNPC() {
    if (!gameStarted) return;
    npc.health = 0;
    updateHealthUI();
    showMessage('PNJ éliminé !');
    logMessage('Commande tablette: PNJ tué.');
}

function createFighter(color, name) {
    const group = new THREE.Group();
    group.name = name;

    const bodyMat = new THREE.MeshStandardMaterial({ color });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x111827 });

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.1, 0.5), bodyMat);
    torso.position.y = 1.1;
    group.add(torso);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.35, 24, 24), new THREE.MeshStandardMaterial({ color: 0xf8fafc }));
    head.position.y = 2.0;
    group.add(head);

    const leftArm = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.9, 0.22), bodyMat);
    leftArm.position.set(-0.62, 1.2, 0);
    group.add(leftArm);

    const rightArm = leftArm.clone();
    rightArm.position.x = 0.62;
    group.add(rightArm);

    const leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.22, 1.0, 0.22), darkMat);
    leftLeg.position.set(-0.2, 0.3, 0);
    group.add(leftLeg);

    const rightLeg = leftLeg.clone();
    rightLeg.position.x = 0.2;
    group.add(rightLeg);

    group.position.y = 0.9;
    return group;
}

function setupThreeScene() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0b1120);
    scene.fog = new THREE.Fog(0x0b1120, 10, 25);

    camera = new THREE.PerspectiveCamera(50, viewport.clientWidth / viewport.clientHeight, 0.1, 100);
    camera.position.set(0, 5.5, 11);
    camera.lookAt(0, 1.5, 0);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(viewport.clientWidth, viewport.clientHeight);
    viewport.appendChild(renderer.domElement);

    const ambient = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(ambient);

    const dir = new THREE.DirectionalLight(0xffffff, 1.4);
    dir.position.set(5, 8, 3);
    scene.add(dir);

    const floor = new THREE.Mesh(
        new THREE.CylinderGeometry(6, 6, 0.5, 48),
        new THREE.MeshStandardMaterial({ color: 0x1f2937, metalness: 0.2, roughness: 0.9 })
    );
    floor.position.y = -0.25;
    scene.add(floor);

    const ring = new THREE.Mesh(
        new THREE.TorusGeometry(4.5, 0.12, 16, 100),
        new THREE.MeshStandardMaterial({ color: 0x60a5fa, emissive: 0x1d4ed8, emissiveIntensity: 0.5 })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = -0.05;
    scene.add(ring);

    const wall1 = new THREE.Mesh(new THREE.BoxGeometry(10, 2.5, 0.5), new THREE.MeshStandardMaterial({ color: 0x0f172a }));
    wall1.position.set(0, 1.2, -5.2);
    scene.add(wall1);

    const wall2 = wall1.clone();
    wall2.position.z = 5.2;
    scene.add(wall2);

    playerModel = createFighter(0x3b82f6, 'player');
    npcModel = createFighter(0xef4444, 'npc');
    playerModel.position.set(-3, 0.9, 0);
    npcModel.position.set(3, 0.9, 0);
    playerModel.rotation.y = 0.2;
    npcModel.rotation.y = Math.PI - 0.2;
    scene.add(playerModel);
    scene.add(npcModel);
}

function animateScene() {
    requestAnimationFrame(animateScene);
    const time = performance.now() * 0.001;

    if (playerModel) {
        playerModel.position.y = 0.9 + Math.sin(time * 3) * 0.05;
    }
    if (npcModel) {
        npcModel.position.y = 0.9 + Math.sin(time * 3 + 0.5) * 0.05;
    }

    renderer.render(scene, camera);
}

function resizeRenderer() {
    if (!renderer || !camera) return;
    camera.aspect = viewport.clientWidth / viewport.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(viewport.clientWidth, viewport.clientHeight);
}

window.addEventListener('resize', resizeRenderer);

document.getElementById('attackBtn').addEventListener('click', () => playerAttack('simple'));
document.getElementById('heavyBtn').addEventListener('click', () => playerAttack('heavy'));
document.getElementById('dodgeBtn').addEventListener('click', playerDodge);
document.getElementById('blockBtn').addEventListener('click', playerBlock);
document.getElementById('startBtn').addEventListener('click', startCombat);
document.getElementById('resetBtn').addEventListener('click', () => {
    gameStarted = false;
    resetGame();
    logMessage('Le combat a été réinitialisé.');
});
difficultySelect.addEventListener('change', () => {
    setDifficulty();
    resetGame();
});

document.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();
    if (key === 'a') playerAttack('simple');
    if (key === 'h') playerAttack('heavy');
    if (key === 'e') playerDodge();
    if (key === 'b') playerBlock();
    if (key === 'p') healPlayer();
    if (key === 's') speedBoost();
    if (key === 'g') godMode();
    if (key === 'f') freezeNPC();
    if (key === 'n') spawnNewNPC();
    if (key === 'k') killNPC();
});

setupThreeScene();
animateScene();
setDifficulty();
resetGame();
