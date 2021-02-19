"use strict";
const DEPLOY_CLIENT = true;
let socket;
if (DEPLOY_CLIENT)
    socket = io.connect();
else
    socket = io.connect(`http://localhost:${PORT}`);
// player params
let selfID;
let creator = false;
let reconnecting = false;
/////////////////////////// INTERACTION WITH SERVER ///////////////////////////
socket.on('connect', () => {
    selfID = socket.id;
});
//////////////////////////////// WELCOME PAGE ////////////////////////////////
function onSubmit() {
    const userName = document.getElementById('userName').value;
    if (userName === null || userName.length == 0) {
        alert('Please enter your name');
        return;
    }
    const room = getSelectedRoomName();
    if (room === null || room.length == 0) {
        alert('Please enter a name for the room');
        return;
    }
    const password = document.getElementById('password').value;
    const mode = getSelectedRoomMode();
    switch (mode) {
        case 'join':
            socket.emit('joinRoom', { name: userName, room: room, password: password }, (response) => {
                if (response.error) {
                    alert(response.error);
                    //(<HTMLSelectElement>document.getElementById('joinRoomName')).selectedIndex = -1;
                    return;
                }
                else if (response.room) {
                    // ok, go to game setup page
                    document.getElementById('gameSetupTitle').innerText
                        = `Game ${response.room} setup`;
                    setVisible("pageWelcome", false);
                    setVisible("pageGameSetup", true);
                    setVisible("pageGame", false);
                    setEnabled("gameNbPlayers", false);
                    setEnabled("gameNbRounds", false);
                    setEnabled("buttonPlay", false);
                    document.getElementById('buttonPlay').innerText
                        = response.enablePlay ? "JOIN GAME" : "START GAME";
                    reconnecting = response.enablePlay;
                }
            });
            break;
        case 'create':
            socket.emit('createNewRoom', { name: userName, room: room, password: password }, (response) => {
                if (response.error) {
                    alert(response.error);
                    return;
                }
                else if (response.room) {
                    // ok, go to game setup page in creator mode
                    document.getElementById('gameSetupTitle').innerText
                        = `Game ${response.room} setup`;
                    setVisible("pageWelcome", false);
                    setVisible("pageGameSetup", true);
                    setVisible("pageGame", false);
                    setEnabled("gameNbPlayers", true);
                    setEnabled("gameNbRounds", true);
                    setEnabled("buttonPlay", false);
                    creator = true;
                }
            });
            break;
    }
}
socket.on('roomsList', (params) => {
    let roomsData = params.sort((a, b) => a.room.localeCompare(b.room)); // sort alphabetically
    // update room selector
    const roomSelect = document.getElementById("joinRoomName");
    while (roomSelect.options.length > 0)
        roomSelect.remove(0);
    for (const roomData of roomsData) {
        let option = document.createElement('option');
        option.value = roomData.room;
        option.textContent =
            `${roomData.room} - ${roomData.nbPlayers}/${roomData.nbPlayersMax} players - ${roomData.status}`;
        roomSelect.appendChild(option);
    }
    roomSelect.selectedIndex = -1;
});
/////////////////////////////// GAME SETUP PAGE ///////////////////////////////
socket.on('kickFromRoom', (params) => {
    if (params.id.length == 0 /* all */ || params.id == selfID) {
        if (params.id == selfID)
            alert(`You've been kicked from room '${params.room}'`);
        // return to welcome page
        document.getElementById('gameSetupTitle').innerText = `Welcome`;
        document.getElementById('joinRoomName').selectedIndex = -1;
        setVisible("pageWelcome", true);
        setVisible("pageGameSetup", false);
    }
    updatePlayButton();
});
function onNumberInput() {
    // limit nb. of characters to max length
    if (this.value.length > this.maxLength)
        this.value = this.value.slice(0, this.maxLength);
    // update max. nb. players in room
    const imputNbPlayers = document.getElementById('gameNbPlayers');
    const inputNbRounds = document.getElementById('gameNbRounds');
    if (!imputNbPlayers.disabled && !inputNbRounds.disabled) {
        const nbPlayersMax = parseInt(imputNbPlayers.value);
        const nbRounds = parseInt(inputNbRounds.value);
        if (nbPlayersMax == 0 || nbRounds == 0)
            return; // nop
        socket.emit('setRoomParams', { nbPlayersMax: nbPlayersMax, nbRounds: nbRounds }, (response) => { });
    }
}
socket.on('updatePlayersList', (params) => {
    const divPlayersList = document.getElementById('playersList');
    if (divPlayersList.children && divPlayersList.children.length > 0) {
        let indexPlayerCur = 1;
        for (const playerData of params) {
            // update player name
            const divPlayerName = divPlayersList.children.item(4 * indexPlayerCur);
            divPlayerName.id = `setup_player_name_${playerData.id}`;
            divPlayerName.children.item(0).textContent = playerData.name;
            // enable own player options
            let disableParam = true;
            if (playerData.id == selfID) {
                divPlayerName.style.fontWeight = "bold";
                disableParam = false;
            }
            // player color
            const divPlayerColor = divPlayersList.children.item(4 * indexPlayerCur + 1);
            divPlayerColor.id = `setup_player_color_${playerData.id}`;
            divPlayerColor.children.item(0).disabled = disableParam;
            // player team
            const divPlayerTeam = divPlayersList.children.item(4 * indexPlayerCur + 2);
            divPlayerTeam.id = `setup_player_team_${playerData.id}`;
            divPlayerTeam.children.item(0).disabled = disableParam;
            // player ready
            const divPlayerReady = divPlayersList.children.item(4 * indexPlayerCur + 3);
            divPlayerReady.id = `setup_player_ready_${playerData.id}`;
            indexPlayerCur++;
        }
        // empty remaining player divs        
        const nbPlayersMax = Math.floor(divPlayersList.children.length / 4) - 1;
        if (indexPlayerCur < nbPlayersMax + 1)
            for (let i = indexPlayerCur; i < nbPlayersMax + 1; i++) {
                // player name
                const divPlayerName = divPlayersList.children.item(4 * i);
                divPlayerName.id = "";
                divPlayerName.children.item(0).textContent = "...";
                // player color
                const divPlayerColor = divPlayersList.children.item(4 * i + 1);
                divPlayerColor.id = "";
                divPlayerColor.children.item(0).disabled = true;
                // player team
                const divPlayerTeam = divPlayersList.children.item(4 * i + 2);
                divPlayerTeam.id = "";
                divPlayerTeam.children.item(0).selectedIndex = -1;
                divPlayerTeam.children.item(0).disabled = true;
                // player ready
                const divPlayerReady = divPlayersList.children.item(4 * i + 3);
                divPlayerReady.id = "";
                divPlayerReady.children.item(0).checked = false;
                divPlayerReady.children.item(0).disabled = true;
            }
    }
    updatePlayButton();
});
socket.on('updateRoomParams', (params) => {
    // update nb. players max
    const nbPlayersMax = params.nbPlayersMax;
    const selectNbPlayers = document.getElementById('gameNbPlayers');
    if (selectNbPlayers.disabled)
        selectNbPlayers.value = nbPlayersMax.toString();
    const divPlayersList = document.getElementById('playersList');
    let nbPlayersCur = Math.floor(divPlayersList.children.length / 4) - 1;
    if (nbPlayersCur < nbPlayersMax)
        for (let i = nbPlayersCur + 1; i <= nbPlayersMax; i++) {
            // name
            const divPlayerName = document.createElement('div');
            const labelPlayerName = document.createElement('label');
            labelPlayerName.textContent = "...";
            divPlayerName.classList.add('center');
            divPlayerName.appendChild(labelPlayerName);
            divPlayersList.appendChild(divPlayerName);
            // color
            const divPlayerColor = document.createElement('div');
            const inputPlayerColor = document.createElement('input');
            inputPlayerColor.type = "color";
            inputPlayerColor.value = "#0000ff";
            inputPlayerColor.disabled = true;
            inputPlayerColor.addEventListener('change', setPlayerParams);
            divPlayerColor.appendChild(inputPlayerColor);
            divPlayersList.appendChild(divPlayerColor);
            // team
            const divPlayerTeam = document.createElement('div');
            const selectPlayerTeam = document.createElement('select');
            for (let i = 1; i <= 2; i++) {
                let option = document.createElement('option');
                option.value = i.toString();
                option.textContent = `Team ${i}`;
                selectPlayerTeam.appendChild(option);
            }
            selectPlayerTeam.selectedIndex = -1;
            selectPlayerTeam.disabled = true;
            selectPlayerTeam.addEventListener('change', setPlayerParams);
            divPlayerTeam.appendChild(selectPlayerTeam);
            divPlayersList.appendChild(divPlayerTeam);
            // ready
            const divPlayerReady = document.createElement('div');
            const checkboxReady = document.createElement('input');
            checkboxReady.type = "checkbox";
            checkboxReady.textContent = "Ready";
            checkboxReady.disabled = true;
            checkboxReady.addEventListener('change', setPlayerParams);
            divPlayerReady.appendChild(checkboxReady);
            divPlayersList.appendChild(divPlayerReady);
        }
    else if (nbPlayersCur > nbPlayersMax) {
        // remove and kick last overnumerous connected players
        while (nbPlayersCur > nbPlayersMax) {
            const divPlayerName = divPlayersList.children.item(4 * nbPlayersCur);
            const divPlayerColor = divPlayersList.children.item(4 * nbPlayersCur + 1);
            const divPlayerTeam = divPlayersList.children.item(4 * nbPlayersCur + 2);
            const divPlayerReady = divPlayersList.children.item(4 * nbPlayersCur + 3);
            // kick player if connected in room
            const playerIdPrefix = 'setup_player_name_';
            if (divPlayerName.id && divPlayerName.id.startsWith(playerIdPrefix)) {
                const id = divPlayerName.id.replace(playerIdPrefix, "");
                //console.log("kick player", id);
                socket.emit('kickPlayer', { id: id }, (response) => { });
            }
            divPlayersList.removeChild(divPlayerReady);
            divPlayersList.removeChild(divPlayerTeam);
            divPlayersList.removeChild(divPlayerColor);
            divPlayersList.removeChild(divPlayerName);
            nbPlayersCur = Math.floor(divPlayersList.children.length / 4) - 1;
        }
    }
    // update nb. rounds
    const selectNbRounds = document.getElementById('gameNbRounds');
    if (selectNbRounds.disabled)
        selectNbRounds.value = params.nbRounds.toString();
    updatePlayButton();
});
// send player params
function setPlayerParams() {
    // get player color
    const divPlayerColor = document.getElementById(`setup_player_color_${selfID}`);
    const color = (divPlayerColor === null || divPlayerColor === void 0 ? void 0 : divPlayerColor.children.item(0)).value;
    // get player team
    const divPlayerTeam = document.getElementById(`setup_player_team_${selfID}`);
    const team = (divPlayerTeam === null || divPlayerTeam === void 0 ? void 0 : divPlayerTeam.children.item(0)).value;
    const hasTeam = ((divPlayerTeam === null || divPlayerTeam === void 0 ? void 0 : divPlayerTeam.children.item(0)).selectedIndex >= 0);
    // get player ready
    const divPlayerReady = document.getElementById(`setup_player_ready_${selfID}`);
    const ready = (divPlayerReady === null || divPlayerReady === void 0 ? void 0 : divPlayerReady.children.item(0)).checked;
    (divPlayerReady === null || divPlayerReady === void 0 ? void 0 : divPlayerReady.children.item(0)).disabled = !hasTeam;
    socket.emit('setPlayerParams', { color: color, team: team, ready: ready }, (response) => { });
}
// update player params
socket.on('updatePlayersParams', (params) => {
    // setup page
    for (const playerParams of params) {
        const id = playerParams.id;
        if (id == selfID)
            continue; // nop
        // update player color
        let divPlayerColor = document.getElementById(`setup_player_color_${id}`);
        (divPlayerColor === null || divPlayerColor === void 0 ? void 0 : divPlayerColor.children.item(0)).value = playerParams.color;
        // get player team
        let divPlayerTeam = document.getElementById(`setup_player_team_${id}`);
        (divPlayerTeam === null || divPlayerTeam === void 0 ? void 0 : divPlayerTeam.children.item(0)).value = playerParams.team;
        // get player ready
        let divPlayerReady = document.getElementById(`setup_player_ready_${id}`);
        (divPlayerReady === null || divPlayerReady === void 0 ? void 0 : divPlayerReady.children.item(0)).checked = playerParams.ready;
    }
    updatePlayButton();
    // game page
    let team1Div = document.getElementById('gameTeam1');
    let team2Div = document.getElementById('gameTeam2');
    // remove former players params
    removeAllChildren(team1Div);
    removeAllChildren(team2Div);
    // set players params
    team1Div.textContent = "Team 1:";
    team2Div.textContent = "Team 2:";
    for (const playerParams of params) {
        let playerText = document.createElement('span');
        playerText.textContent = " " + playerParams.name;
        playerText.style.color = playerParams.color;
        if (playerParams.team == "1")
            team1Div.appendChild(playerText);
        else if (playerParams.team == "2")
            team2Div.appendChild(playerText);
    }
});
function updatePlayButton() {
    if (!creator && !reconnecting) {
        setEnabled("buttonPlay", false);
        return;
    }
    // get max. nb. players
    const imputNbPlayers = document.getElementById('gameNbPlayers');
    const nbPlayersMax = parseInt(imputNbPlayers.value);
    // get current nb. players
    let nbPlayers = 0;
    const divPlayersList = document.getElementById('playersList');
    for (const divPlayer of divPlayersList.children) {
        const playerIdPrefix = 'setup_player_name_';
        if (divPlayer.id && divPlayer.id.startsWith(playerIdPrefix))
            nbPlayers++;
    }
    const nbPlayersCorrect = (nbPlayers == nbPlayersMax);
    // get current players teams
    let hasTeam1 = false;
    let hasTeam2 = false;
    let teamFilled = true;
    for (const divPlayerTeam of divPlayersList.querySelectorAll("[id^='setup_player_team_']")) {
        const team = divPlayerTeam.children.item(0).value;
        if (team == "1")
            hasTeam1 = true;
        else if (team == "2")
            hasTeam2 = true;
        else
            teamFilled = false;
    }
    let teamsCorrect = (hasTeam1 && hasTeam2 && teamFilled);
    if (nbPlayersMax == 1)
        teamsCorrect = ((hasTeam1 || hasTeam2) && teamFilled);
    // get ready states
    let ready = true;
    for (const divPlayerReady of divPlayersList.querySelectorAll("[id^='setup_player_ready_']"))
        ready && (ready = divPlayerReady.children.item(0).checked);
    setEnabled("buttonPlay", nbPlayersCorrect && teamsCorrect && ready);
}
function onPlay() {
    socket.emit('play', null, (response) => { });
}
/////////////////////////////////// GAME PAGE /////////////////////////////////
socket.on('playGame', (params) => {
    document.getElementById('gameTitle').innerText
        = `Game ${params.room} - ${params.nbPlayersMax} players - ${params.nbRounds} rounds`;
    setVisible("pageWelcome", false);
    setVisible("pageGameSetup", false);
    setVisible("pageGame", true);
});
//# sourceMappingURL=client.js.map