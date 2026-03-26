// 1. CONFIGURATION
const DATABASE_URL = "https://concours-de-deguisement-default-rtdb.europe-west1.firebasedatabase.app";

// Identifiant unique du votant
let voterId = localStorage.getItem('concours_voter_id');
if (!voterId) {
    voterId = 'voter_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('concours_voter_id', voterId);
}

const listeEquipes = document.getElementById('liste-equipes');
const msgFerme = document.getElementById('message-ferme');
let sortableInstance = null;
let equipesChargees = false;

// 2. CHARGEMENT DE LA CONFIG (Équipes + Statut)
async function chargerConfig() {
    try {
        const response = await fetch(`${DATABASE_URL}/config.json`);
        const config = await response.json();

        if (!config) return;

        // A. Gestion du Statut (Ouvert/Fermé)
        if (config.status === 'fermé') {
            listeEquipes.style.opacity = "0.4";
            listeEquipes.style.pointerEvents = "none";
            if(msgFerme) msgFerme.style.display = "block";
        } else {
            listeEquipes.style.opacity = "1";
            listeEquipes.style.pointerEvents = "auto";
            if(msgFerme) msgFerme.style.display = "none";
        }

        // B. Chargement initial des équipes
        if (!equipesChargees && config.equipes) {
            genererListeEquipes(config.equipes);
            equipesChargees = true;
        }
    } catch (e) {
        console.error("Erreur de config:", e);
    }
}

function genererListeEquipes(equipesObj) {
    listeEquipes.innerHTML = '';
    
    // On regarde si l'utilisateur a déjà un ordre enregistré localement
    const ordreSauvegarde = JSON.parse(localStorage.getItem('concours_ordre'));
    let IDsAafficher = Object.keys(equipesObj);

    // Si on a un ordre sauvegardé, on trie les IDs selon cet ordre
    if (ordreSauvegarde) {
        // On ne garde que les IDs qui existent encore dans la base
        IDsAafficher = ordreSauvegarde.filter(id => equipesObj[id]);
        // On ajoute les éventuelles nouvelles équipes à la fin
        Object.keys(equipesObj).forEach(id => {
            if (!IDsAafficher.includes(id)) IDsAafficher.push(id);
        });
    }

    IDsAafficher.forEach((id, index) => {
        const li = document.createElement('li');
        li.setAttribute('data-id', id);
        li.innerHTML = `
            <span class="rank">${index + 1}</span>
            <span class="name">${equipesObj[id]}</span>
            <span class="drag-handle">☰</span>
        `;
        listeEquipes.appendChild(li);
    });

    // Activer SortableJS une fois la liste créée
    initSortable();
}

// 3. DEPLACER ET ENVOYER
function initSortable() {
    sortableInstance = new Sortable(listeEquipes, {
        animation: 150,
        handle: '.drag-handle',
        ghostClass: 'sortable-ghost',
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

    // Sauvegarde locale pour l'affichage
    localStorage.setItem('concours_ordre', JSON.stringify(nouveauClassement));

    // Envoi Firebase REST (Zéro limite de connexions)
    fetch(`${DATABASE_URL}/votes/${voterId}.json`, {
        method: 'PUT',
        body: JSON.stringify({
            classement: nouveauClassement,
            heure: Date.now()
        })
    });
}

// Vérifier le statut toutes les 5 secondes (pour bloquer le vote en direct)
setInterval(chargerConfig, 5000);
chargerConfig();