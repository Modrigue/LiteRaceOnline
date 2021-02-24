"use strict";
//////////////////////////////////// EVENTS ///////////////////////////////////
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
            const teamsEnabled = document.getElementById('gameHasTeams').checked;
            const divPlayerTeam = divPlayersList.children.item(4 * indexPlayerCur + 2);
            divPlayerTeam.id = `setup_player_team_${playerData.id}`;
            divPlayerTeam.children.item(0).disabled = (disableParam || !teamsEnabled);
            // player ready
            const divPlayerReady = divPlayersList.children.item(4 * indexPlayerCur + 3);
            divPlayerReady.id = `setup_player_ready_${playerData.id}`;
            divPlayerReady.children.item(0).disabled = disableParam;
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
            inputPlayerColor.value = '#6666ff';
            inputPlayerColor.disabled = true;
            inputPlayerColor.addEventListener('change', sendPlayerParams);
            divPlayerColor.appendChild(inputPlayerColor);
            divPlayersList.appendChild(divPlayerColor);
            // team
            const divPlayerTeam = document.createElement('div');
            const selectPlayerTeam = document.createElement('select');
            for (let i = 1; i <= 2; i++) {
                let option = document.createElement('option');
                option.value = `Team ${i}`;
                option.textContent = `Team ${i}`;
                selectPlayerTeam.appendChild(option);
            }
            selectPlayerTeam.selectedIndex = -1;
            selectPlayerTeam.disabled = true;
            selectPlayerTeam.addEventListener('change', sendPlayerParams);
            divPlayerTeam.appendChild(selectPlayerTeam);
            divPlayersList.appendChild(divPlayerTeam);
            // ready
            const divPlayerReady = document.createElement('div');
            const checkboxReady = document.createElement('input');
            checkboxReady.type = "checkbox";
            checkboxReady.textContent = "Ready";
            checkboxReady.disabled = true;
            checkboxReady.addEventListener('change', sendPlayerParams);
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
    // update teams checkbox
    const checkboxHasTeams = document.getElementById('gameHasTeams');
    if (checkboxHasTeams.disabled)
        checkboxHasTeams.checked = params.hasTeams;
    // update player own team selector and ready checkbox
    const divPlayerTeam = document.getElementById(`setup_player_team_${selfID}`);
    if (divPlayerTeam && divPlayerTeam !== undefined) {
        (divPlayerTeam === null || divPlayerTeam === void 0 ? void 0 : divPlayerTeam.children.item(0)).disabled = !params.hasTeams;
        if (!params.hasTeams)
            (divPlayerTeam === null || divPlayerTeam === void 0 ? void 0 : divPlayerTeam.children.item(0)).selectedIndex = -1;
    }
    // WARNING: duplicated code
    const divPlayerReady = document.getElementById(`setup_player_ready_${selfID}`);
    if (divPlayerReady && divPlayerReady !== undefined) {
        // get player color
        const divPlayerColor = document.getElementById(`setup_player_color_${selfID}`);
        const color = (divPlayerColor === null || divPlayerColor === void 0 ? void 0 : divPlayerColor.children.item(0)).value;
        const hasTeam = ((divPlayerTeam === null || divPlayerTeam === void 0 ? void 0 : divPlayerTeam.children.item(0)).selectedIndex >= 0);
        (divPlayerReady === null || divPlayerReady === void 0 ? void 0 : divPlayerReady.children.item(0)).disabled = (!hasTeam && params.hasTeams) || (color == "#00000");
    }
    // if no teams, disable and reset teams selectors
    if (!params.hasTeams) {
        for (const divPlayerTeam of divPlayersList.querySelectorAll("[id^='setup_player_team_']")) {
            divPlayerTeam.children.item(0).disabled = true;
            divPlayerTeam.children.item(0).selectedIndex = -1;
        }
    }
    updatePlayButton();
});
// send player params
function sendPlayerParams() {
    const teamsEnabled = document.getElementById('gameHasTeams').checked;
    // get player color
    const divPlayerColor = document.getElementById(`setup_player_color_${selfID}`);
    const color = (divPlayerColor === null || divPlayerColor === void 0 ? void 0 : divPlayerColor.children.item(0)).value;
    // get player team
    const divPlayerTeam = document.getElementById(`setup_player_team_${selfID}`);
    const team = teamsEnabled ? (divPlayerTeam === null || divPlayerTeam === void 0 ? void 0 : divPlayerTeam.children.item(0)).value : "";
    const hasTeam = ((divPlayerTeam === null || divPlayerTeam === void 0 ? void 0 : divPlayerTeam.children.item(0)).selectedIndex >= 0);
    // get player ready
    const divPlayerReady = document.getElementById(`setup_player_ready_${selfID}`);
    (divPlayerReady === null || divPlayerReady === void 0 ? void 0 : divPlayerReady.children.item(0)).disabled = (!hasTeam && teamsEnabled) || (color == "#00000");
    const ready = (divPlayerReady === null || divPlayerReady === void 0 ? void 0 : divPlayerReady.children.item(0)).checked;
    socket.emit('setPlayerParams', { color: color, team: team, ready: ready }, (response) => { });
}
// update player params
socket.on('updatePlayersParams', (params) => {
    const teamsEnabled = document.getElementById('gameHasTeams').checked;
    for (const playerParams of params) {
        const id = playerParams.id;
        // update player name color
        let divPlayerName = document.getElementById(`setup_player_name_${id}`);
        (divPlayerName === null || divPlayerName === void 0 ? void 0 : divPlayerName.children.item(0)).style.color = playerParams.color;
        let divPlayerTeam = document.getElementById(`setup_player_team_${id}`);
        (divPlayerTeam === null || divPlayerTeam === void 0 ? void 0 : divPlayerTeam.children.item(0)).style.color = playerParams.color;
        // update player color
        let divPlayerColor = document.getElementById(`setup_player_color_${id}`);
        if (id != selfID)
            (divPlayerColor === null || divPlayerColor === void 0 ? void 0 : divPlayerColor.children.item(0)).value = playerParams.color;
        // get player team
        if (!teamsEnabled) {
            (divPlayerTeam === null || divPlayerTeam === void 0 ? void 0 : divPlayerTeam.children.item(0)).disabled = true;
            (divPlayerTeam === null || divPlayerTeam === void 0 ? void 0 : divPlayerTeam.children.item(0)).selectedIndex = -1;
            ;
        }
        else if (id != selfID)
            (divPlayerTeam === null || divPlayerTeam === void 0 ? void 0 : divPlayerTeam.children.item(0)).value = playerParams.team;
        const hasTeam = ((divPlayerTeam === null || divPlayerTeam === void 0 ? void 0 : divPlayerTeam.children.item(0)).selectedIndex >= 0);
        // get player ready
        let divPlayerReady = document.getElementById(`setup_player_ready_${id}`);
        (divPlayerReady === null || divPlayerReady === void 0 ? void 0 : divPlayerReady.children.item(0)).disabled = (id != selfID) || (!hasTeam && teamsEnabled) || (playerParams.color == "#00000");
        if (id != selfID)
            (divPlayerReady === null || divPlayerReady === void 0 ? void 0 : divPlayerReady.children.item(0)).checked = playerParams.ready;
    }
    updatePlayButton();
});
socket.on('displaySetup', (response) => {
    document.getElementById('gameSetupTitle').innerText
        = `Game ${response.room} setup`;
    setVisible("pageWelcome", false);
    setVisible("pageGameSetup", true);
    setVisible("pageGame", false);
    setEnabled("gameNbPlayers", creator);
    setEnabled("gameNbRounds", creator);
    setEnabled("buttonPlay", false);
    document.getElementById('buttonPlay').innerText = "START GAME";
    // reset ready checkboxes if option set
    if (response.resetReady) {
        const divPlayersList = document.getElementById('playersList');
        for (const divPlayerReady of divPlayersList.querySelectorAll("[id^='setup_player_ready_']"))
            divPlayerReady.children.item(0).checked = false;
    }
});
////////////////////////////////////// GUI ////////////////////////////////////
function onRoomParamChanged() {
    // number input: limit nb. of characters to max length
    if (this.type == "number")
        if (this.value.length > this.maxLength)
            this.value = this.value.slice(0, this.maxLength);
    // update max. nb. players in room
    const imputNbPlayers = document.getElementById('gameNbPlayers');
    const inputNbRounds = document.getElementById('gameNbRounds');
    const inputHasTeams = document.getElementById('gameHasTeams');
    if (!imputNbPlayers.disabled && !inputNbRounds.disabled) {
        const nbPlayersMax = parseInt(imputNbPlayers.value);
        const nbRounds = parseInt(inputNbRounds.value);
        if (nbPlayersMax == 0 || nbRounds == 0)
            return; // nop
        const hasTeams = inputHasTeams.checked;
        socket.emit('setRoomParams', { nbPlayersMax: nbPlayersMax, nbRounds: nbRounds, hasTeams: hasTeams }, (response) => { });
    }
}
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
    // get current players teams if option set
    let teamsCorrect = true;
    const teamsEnabled = document.getElementById('gameHasTeams').checked;
    if (teamsEnabled) {
        let teams = new Array();
        let teamFilled = true;
        for (const divPlayerTeam of divPlayersList.querySelectorAll("[id^='setup_player_team_']")) {
            const team = divPlayerTeam.children.item(0).value;
            if (team && team.length > 0) {
                if (!teams.includes(team))
                    teams.push(team);
            }
            else
                teamFilled = false;
        }
        teamsCorrect = ((teams.length >= 2) && teamFilled);
        if (nbPlayersMax == 1)
            teamsCorrect = ((teams.length >= 1) && teamFilled);
    }
    // get ready states
    let ready = true;
    for (const divPlayerReady of divPlayersList.querySelectorAll("[id^='setup_player_ready_']"))
        ready && (ready = divPlayerReady.children.item(0).checked);
    setEnabled("buttonPlay", nbPlayersCorrect && teamsCorrect && ready);
}
function onPlay() {
    socket.emit('play', null, (response) => { });
}
//# sourceMappingURL=pageSetup.js.map