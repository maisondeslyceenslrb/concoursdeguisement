const DATABASE_URL = "https://concours-de-deguisement-default-rtdb.europe-west1.firebasedatabase.app";

let voterId = localStorage.getItem('concours_voter_id');
if (!voterId) {
    voterId = 'voter_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('concours_voter_id', voterId);
}

const listeEquipes = document.getElementById('liste-equipes');
const msgFerme = document.getElementById('message-ferme');
let equipesChargees = false;

// 1. On charge les équipes UNE SEULE FOIS pour économiser le serveur
async function chargerEquipesInitiales() {
    try {
        const response = await fetch(`${DATABASE_URL}/config/equipes.json`);
        const equipes = await response.json();
        if (equipes) {
            genererListeEquipes(equipes);
            equipesChargees = true;
        }
    } catch (e) { console.error("Erreur chargement équipes:", e); }
}

// 2. On vérifie le statut (Ouvert/Fermé) moins souvent (toutes les 20 sec)
async function verifierStatut() {
    try {
        const response = await fetch(`${DATABASE_URL}/config/status.json`);
        const status = await response.json();

        if (status === 'fermé') {
            listeEquipes.style.opacity = "0.3";
            listeEquipes.style.pointerEvents = "none";
            if(msgFerme) msgFerme.style.display = "block";
        } else {
            listeEquipes.style.opacity = "1";
            listeEquipes.style.pointerEvents = "auto";
            if(msgFerme) msgFerme.style.display = "none";
        }
    } catch (e) { console.error("Erreur statut:", e); }
}

function genererListeEquipes(equipesObj) {
    listeEquipes.innerHTML = '';
    const ordreSauvegarde = JSON.parse(localStorage.getItem('concours_ordre'));
    let IDs = Object.keys(equipesObj);

    if (ordreSauvegarde) {
        IDs = ordreSauvegarde.filter(id => equipesObj[id]);
        Object.keys(equipesObj).forEach(id => { if (!IDs.includes(id)) IDs.push(id); });
    }

    IDs.forEach((id, index) => {
        const li = document.createElement('li');
        li.setAttribute('data-id', id);
        li.innerHTML = `<span class="rank">${index + 1}</span><span class="name">${equipesObj[id]}</span><span class="drag-handle">☰</span>`;
        listeEquipes.appendChild(li);
    });
    initSortable();
}

function initSortable() {
    new Sortable(listeEquipes, {
        animation: 150,
        handle: '.drag-handle',
        onEnd: mettreAJourClassement
    });
}

function mettreAJourClassement() {
    const items = listeEquipes.querySelectorAll('li');
    let nouveauClassement = [];
    items.forEach((item, index) => {
        item.querySelector('.rank').innerText = index + 1;
        nouveauClassement.push(item.getAttribute('data-id'));
    });
    localStorage.setItem('concours_ordre', JSON.stringify(nouveauClassement));

    // Envoi par FETCH (Mode "Hit and Run" : pas de connexion persistante)
    fetch(`${DATABASE_URL}/votes/${voterId}.json`, {
        method: 'PUT',
        body: JSON.stringify({ classement: nouveauClassement, heure: Date.now() })
    });
}

// LANCEMENT
chargerEquipesInitiales();
verifierStatut();
setInterval(verifierStatut, 20000); // 20 secondes suffit largement