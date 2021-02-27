//////////////////////////////////// EVENTS ///////////////////////////////////


socket.on('kickFromRoom', (params: {room: string, id: string}) => {
    if (params.id.length == 0 /* all */ || params.id == selfID)
    {
        if (params.id == selfID)
            alert(`You've been kicked from room '${params.room}'`);

        // return to welcome page
        (<HTMLParagraphElement>document.getElementById('gameSetupTitle')).innerText = `Welcome`;
        (<HTMLSelectElement>document.getElementById('joinRoomName')).selectedIndex = -1;
        setVisible("pageWelcome", true);
        setVisible("pageGameSetup", false);
    }

    updatePlayButton();
});

socket.on('updatePlayersList', (params: Array<{id: string, name: string}>) => {

    const divPlayersList = <HTMLDivElement>document.getElementById('playersList');    
    if (divPlayersList.children && divPlayersList.children.length > 0)
    {
        let indexPlayerCur = 1;
        
        for (const playerData of params)
        {
            // update player name
            const divPlayerName = <HTMLDivElement>divPlayersList.children.item(4*indexPlayerCur);
            divPlayerName.id = `setup_player_name_${playerData.id}`;
            (<HTMLLabelElement>divPlayerName.children.item(0)).textContent = playerData.name;

            // enable own player options
            let disableParam: boolean = true;
            if (playerData.id == selfID)
            {
                divPlayerName.style.fontWeight = "bold";
                disableParam = false;
            }
                
            // player color
            const divPlayerColor = <HTMLDivElement>divPlayersList.children.item(4*indexPlayerCur + 1);
            divPlayerColor.id = `setup_player_color_${playerData.id}`;
            (<HTMLInputElement>divPlayerColor.children.item(0)).disabled = disableParam;

            // player team
            const teamsEnabled = (<HTMLInputElement>document.getElementById('gameHasTeams')).checked;
            const divPlayerTeam = <HTMLDivElement>divPlayersList.children.item(4*indexPlayerCur + 2);
            divPlayerTeam.id = `setup_player_team_${playerData.id}`;
            (<HTMLSelectElement>divPlayerTeam.children.item(0)).disabled = (disableParam || !teamsEnabled);

            // player ready
            const divPlayerReady = <HTMLDivElement>divPlayersList.children.item(4*indexPlayerCur + 3);
            divPlayerReady.id = `setup_player_ready_${playerData.id}`;
            (<HTMLInputElement>divPlayerReady.children.item(0)).disabled = disableParam;
            
            indexPlayerCur++;
        }

        // empty remaining player divs        
        const nbPlayersMax = Math.floor(divPlayersList.children.length/4) - 1;
        if (indexPlayerCur < nbPlayersMax + 1)
            for (let i = indexPlayerCur; i < nbPlayersMax + 1; i++)
            {
                // player name
                const divPlayerName = <HTMLDivElement>divPlayersList.children.item(4*i);
                divPlayerName.id = "";
                (<HTMLLabelElement>divPlayerName.children.item(0)).textContent ="...";

                // player color
                const divPlayerColor = <HTMLDivElement>divPlayersList.children.item(4*i + 1);
                divPlayerColor.id = "";
                (<HTMLInputElement>divPlayerColor.children.item(0)).disabled = true;

                // player team
                const divPlayerTeam = <HTMLDivElement>divPlayersList.children.item(4*i + 2);
                divPlayerTeam.id = "";
                (<HTMLSelectElement>divPlayerTeam.children.item(0)).selectedIndex = -1;
                (<HTMLSelectElement>divPlayerTeam.children.item(0)).disabled = true;

                // player ready
                const divPlayerReady = <HTMLDivElement>divPlayersList.children.item(4*i + 3);
                divPlayerReady.id = "";
                (<HTMLInputElement>divPlayerReady.children.item(0)).checked = false;
                (<HTMLInputElement>divPlayerReady.children.item(0)).disabled = true;
            }
    }

    updatePlayButton();
});

socket.on('updateRoomParams', (params: {room: string, nbPlayersMax: number, nbRounds: number, hasTeams: boolean, mode: string}) => {

    // update nb. players max

    const nbPlayersMax = params.nbPlayersMax;
    const selectNbPlayers = <HTMLInputElement>document.getElementById('gameNbPlayers');
    if (selectNbPlayers.disabled)
        selectNbPlayers.value = nbPlayersMax.toString();
        
    const divPlayersList = <HTMLDivElement>document.getElementById('playersList');
    let nbPlayersCur = Math.floor(divPlayersList.children.length / 4) - 1;

    if (nbPlayersCur < nbPlayersMax)
        for (let i = nbPlayersCur + 1; i <= nbPlayersMax; i++)
        {
            // name
            const divPlayerName = <HTMLDivElement>document.createElement('div');
            const labelPlayerName = <HTMLLabelElement>document.createElement('label');
            labelPlayerName.textContent = "...";
            divPlayerName.classList.add('center');
            divPlayerName.appendChild(labelPlayerName);
            divPlayersList.appendChild(divPlayerName);

            // color
            const divPlayerColor = <HTMLDivElement>document.createElement('div');
            const inputPlayerColor = <HTMLInputElement>document.createElement('input');
            inputPlayerColor.type = "color";
            inputPlayerColor.value = '#6666ff';
            inputPlayerColor.disabled = true;
            inputPlayerColor.addEventListener('change', sendPlayerParams);
            divPlayerColor.appendChild(inputPlayerColor);
            divPlayersList.appendChild(divPlayerColor);

            // team
            const divPlayerTeam = <HTMLDivElement>document.createElement('div');
            const selectPlayerTeam = <HTMLSelectElement>document.createElement('select');
            for (let i = 1; i <= 2; i++)
            {
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
            const divPlayerReady = <HTMLDivElement>document.createElement('div');
            const checkboxReady = <HTMLInputElement>document.createElement('input');
            checkboxReady.type = "checkbox";
            checkboxReady.textContent = "Ready";
            checkboxReady.disabled = true;
            checkboxReady.addEventListener('change', sendPlayerParams);
            divPlayerReady.appendChild(checkboxReady);
            divPlayersList.appendChild(divPlayerReady);
        }
    else if (nbPlayersCur > nbPlayersMax)
    {
        // remove and kick last overnumerous connected players
        while (nbPlayersCur > nbPlayersMax)
        {
            const divPlayerName  = <HTMLDivElement>divPlayersList.children.item(4*nbPlayersCur);
            const divPlayerColor = <HTMLDivElement>divPlayersList.children.item(4*nbPlayersCur + 1);
            const divPlayerTeam  = <HTMLDivElement>divPlayersList.children.item(4*nbPlayersCur + 2);
            const divPlayerReady = <HTMLDivElement>divPlayersList.children.item(4*nbPlayersCur + 3);

            // kick player if connected in room
            const playerIdPrefix = 'setup_player_name_';
            if (divPlayerName.id && divPlayerName.id.startsWith(playerIdPrefix))
            {
                const id: string = divPlayerName.id.replace(playerIdPrefix, "");
                //console.log("kick player", id);
                socket.emit('kickPlayer', {id: id}, (response: any) => {});
            }

            divPlayersList.removeChild(divPlayerReady);
            divPlayersList.removeChild(divPlayerTeam);
            divPlayersList.removeChild(divPlayerColor);
            divPlayersList.removeChild(divPlayerName);
            nbPlayersCur = Math.floor(divPlayersList.children.length / 4) - 1;
        }
    }

    // update nb. rounds
    const inputNbRounds = <HTMLInputElement>document.getElementById('gameNbRounds');
    if (inputNbRounds.disabled)
        inputNbRounds.value = params.nbRounds.toString();

    // update teams checkbox
    const checkboxHasTeams = <HTMLInputElement>document.getElementById('gameHasTeams');
    if (checkboxHasTeams.disabled)
        checkboxHasTeams.checked = params.hasTeams;

    // update game mode
    const selectMode = <HTMLSelectElement>document.getElementById('gameMode');
    if (selectMode.disabled)
        selectMode.value = params.mode;

    // update player own team selector and ready checkbox
    const divPlayerTeam = document.getElementById(`setup_player_team_${selfID}`);
    if (divPlayerTeam && divPlayerTeam !== undefined)
    {
        (<HTMLSelectElement>divPlayerTeam?.children.item(0)).disabled = !params.hasTeams;
        if(!params.hasTeams)
            (<HTMLSelectElement>divPlayerTeam?.children.item(0)).selectedIndex = -1;
    }
    // WARNING: duplicated code
    const divPlayerReady = document.getElementById(`setup_player_ready_${selfID}`);  
    if (divPlayerReady && divPlayerReady !== undefined)
    {
        // get player color
        const divPlayerColor = document.getElementById(`setup_player_color_${selfID}`);
        const color = (<HTMLInputElement>divPlayerColor?.children.item(0)).value;

        const hasTeam: boolean = ((<HTMLSelectElement>divPlayerTeam?.children.item(0)).selectedIndex >= 0);
        (<HTMLInputElement>divPlayerReady?.children.item(0)).disabled = (!hasTeam && params.hasTeams) || (color == "#00000");
    }

    // if no teams, disable and reset teams selectors
    if (!params.hasTeams)
    {
        for (const divPlayerTeam of divPlayersList.querySelectorAll("[id^='setup_player_team_']"))
        {
            (<HTMLSelectElement>divPlayerTeam.children.item(0)).disabled = true;
            (<HTMLSelectElement>divPlayerTeam.children.item(0)).selectedIndex = -1;
        }
    }

    updatePlayButton();
});

// send player params
function sendPlayerParams()
{
    const teamsEnabled = (<HTMLInputElement>document.getElementById('gameHasTeams')).checked;

    // get player color
    const divPlayerColor = document.getElementById(`setup_player_color_${selfID}`);
    const color = (<HTMLInputElement>divPlayerColor?.children.item(0)).value;

    // get player team
    const divPlayerTeam = document.getElementById(`setup_player_team_${selfID}`);
    const team = teamsEnabled ? (<HTMLInputElement>divPlayerTeam?.children.item(0)).value : "";
    const hasTeam: boolean = ((<HTMLSelectElement>divPlayerTeam?.children.item(0)).selectedIndex >= 0);

    // get player ready
    const divPlayerReady = document.getElementById(`setup_player_ready_${selfID}`);
    (<HTMLInputElement>divPlayerReady?.children.item(0)).disabled = (!hasTeam && teamsEnabled) || (color == "#00000");
    const ready = (<HTMLInputElement>divPlayerReady?.children.item(0)).checked;

    socket.emit('setPlayerParams', {color: color, team: team, ready: ready}, (response: any) => {});
}

// update player params
socket.on('updatePlayersParams', (params:  Array<{id: string, name: string, color: string, team: string, ready: boolean}>) => {

    const teamsEnabled = (<HTMLInputElement>document.getElementById('gameHasTeams')).checked;
    for (const playerParams of params)
    {
        const id = playerParams.id; 

        // update player name color
        let divPlayerName = document.getElementById(`setup_player_name_${id}`);
        (<HTMLInputElement>divPlayerName?.children.item(0)).style.color = playerParams.color;

        let divPlayerTeam = document.getElementById(`setup_player_team_${id}`);
        (<HTMLInputElement>divPlayerTeam?.children.item(0)).style.color = playerParams.color;

        // update player color
        let divPlayerColor = document.getElementById(`setup_player_color_${id}`);
        if (id != selfID)
            (<HTMLInputElement>divPlayerColor?.children.item(0)).value = playerParams.color;

        // get player team
        if (!teamsEnabled)
        {
            (<HTMLSelectElement>divPlayerTeam?.children.item(0)).disabled = true;
            (<HTMLSelectElement>divPlayerTeam?.children.item(0)).selectedIndex = -1;;
        }
        else if (id != selfID)
            (<HTMLSelectElement>divPlayerTeam?.children.item(0)).value = playerParams.team;
        const hasTeam: boolean = ((<HTMLSelectElement>divPlayerTeam?.children.item(0)).selectedIndex >= 0);

        // get player ready
        let divPlayerReady = document.getElementById(`setup_player_ready_${id}`);        
        (<HTMLInputElement>divPlayerReady?.children.item(0)).disabled = (id != selfID) || (!hasTeam && teamsEnabled) || (playerParams.color == "#00000");
        if (id != selfID)
            (<HTMLInputElement>divPlayerReady?.children.item(0)).checked = playerParams.ready;
    }
    updatePlayButton();
});

socket.on('displaySetup', (response: {room: string, resetReady: boolean}) => {
    
    (<HTMLParagraphElement>document.getElementById('gameSetupTitle')).innerText
        = `Game ${response.room} setup`;
    setVisible("pageWelcome", false);
    setVisible("pageGameSetup", true);
    setVisible("pageGame", false);

    setEnabled("gameNbPlayers", creator);
    setEnabled("gameNbRounds", creator);
    setEnabled("gameMode", creator);
    setEnabled("buttonPlay", false);
    (<HTMLButtonElement>document.getElementById('buttonPlay')).innerText = "START GAME";

    // reset ready checkboxes if option set
    if (response.resetReady)
    {
        const divPlayersList = <HTMLDivElement>document.getElementById('playersList');
        for (const divPlayerReady of divPlayersList.querySelectorAll("[id^='setup_player_ready_']"))
            (<HTMLInputElement>divPlayerReady.children.item(0)).checked = false;
    }
});


////////////////////////////////////// GUI ////////////////////////////////////


function onRoomParamsChanged(): void
{    
    // number input: limit nb. of characters to max length
    if (this.type == "number")
    if (this.value.length > this.maxLength)
        this.value = this.value.slice(0, this.maxLength);

    // update max. nb. players in room
    const imputNbPlayers = <HTMLInputElement>document.getElementById('gameNbPlayers');
    const inputNbRounds = <HTMLInputElement>document.getElementById('gameNbRounds');
    const inputHasTeams = <HTMLInputElement>document.getElementById('gameHasTeams');
    const selectMode = <HTMLSelectElement>document.getElementById('gameMode');

    if (!imputNbPlayers.disabled && !inputNbRounds.disabled)
    {
        const nbPlayersMax = <number>parseInt(imputNbPlayers.value);
        const nbRounds = <number>parseInt(inputNbRounds.value);
        if (nbPlayersMax == 0 || nbRounds == 0)
            return; // nop

        const hasTeams = inputHasTeams.checked;
        const mode: string = selectMode.value;

        socket.emit('setRoomParams', {nbPlayersMax: nbPlayersMax, nbRounds: nbRounds, hasTeams: hasTeams, mode: mode}, (response: any) => {});
    }
}

function updatePlayButton()
{
    if (!creator && !reconnecting)
    {
        setEnabled("buttonPlay", false);
        return;
    }

    // get max. nb. players
    const imputNbPlayers = <HTMLInputElement>document.getElementById('gameNbPlayers');
    const nbPlayersMax = <number>parseInt(imputNbPlayers.value);

    // get current nb. players
    let nbPlayers: number = 0;
    const divPlayersList = <HTMLDivElement>document.getElementById('playersList');
    for (const divPlayer of divPlayersList.children)
    {
        const playerIdPrefix = 'setup_player_name_';
        if (divPlayer.id && divPlayer.id.startsWith(playerIdPrefix))
            nbPlayers++;
    }
    const nbPlayersCorrect: boolean = (nbPlayers == nbPlayersMax);

    // get current players teams if option set
    let teamsCorrect: boolean = true;
    const teamsEnabled = (<HTMLInputElement>document.getElementById('gameHasTeams')).checked;
    if (teamsEnabled)
    {
        let teams = new Array<string>();
        let teamFilled: boolean = true;
        for (const divPlayerTeam of divPlayersList.querySelectorAll("[id^='setup_player_team_']"))
        {
            const team = (<HTMLSelectElement>divPlayerTeam.children.item(0)).value;
            if (team && team.length > 0)
            {
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
    let ready: boolean = true;
    for (const divPlayerReady of divPlayersList.querySelectorAll("[id^='setup_player_ready_']"))
        ready &&= (<HTMLInputElement>divPlayerReady.children.item(0)).checked;

    setEnabled("buttonPlay", nbPlayersCorrect && teamsCorrect && ready);
}

function onPlay()
{
    socket.emit('play', null, (response: any) => {});
}