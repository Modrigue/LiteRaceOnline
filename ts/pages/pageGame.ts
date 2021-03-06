socket.on('prepareGame', (params: {room: string, nbPlayersMax: string, nbRounds: number, countdown: number, initDisplay: boolean}) => {

    //(<HTMLParagraphElement>document.getElementById('gameTitle')).innerText
    //    = `Game ${params.room} - ${params.nbPlayersMax} players - ${params.nbRounds} rounds`;

    setVisible("pageWelcome", false);
    setVisible("pageGameSetup", false);
    setVisible("pageGame", true);

    nbRounds = params.nbRounds;
    winners = new Array<string>();

    canvas.focus();
    displayStatus = DisplayStatus.PREPARE;

    if (params.countdown > 0)
        imgPrepareCountdown.src = `./img/texts/${params.countdown}.png`;

    if (params.initDisplay)
        requestAnimationFrame(renderOnly);
});

socket.on('createPlayers', (params: Array<{id: string, name: string, color: string}>) => {
    //console.log(params);
    PLAYERS = new Map<string, Player>();
    for (const playerParams of params)
    {
        let player = new Player(playerParams.color);
        player.name = playerParams.name;

        if (playerParams.id === selfID)
            userInput(player, canvas);

        PLAYERS.set(playerParams.id, player);
    }
});

socket.on('initPlayersPositions', (params: Array<{id: string, x: number, y: number, r: number, color: string}>) => {
    //console.log("initPlayersPositions", params);

    PLAYERS_INIT = new Map<string, Disc>();
    for (const playerParams of params)
    {
        let positionDisc = new Disc(playerParams.x, playerParams.y, playerParams.r, playerParams.color);
        PLAYERS_INIT.set(playerParams.id, positionDisc);
    }

    displayStatus = DisplayStatus.INIT_POSITIONS;
});

socket.on('startRound', (params: any) => {
    //console.log("startRound");

    // clear previous traces
    for (const [id, player] of PLAYERS)
    {
        player.points = new Array<Point2>();
    }

    displayStatus = DisplayStatus.PLAYING;
});

socket.on('updatePlayersPositions', (params: {id: string, points: Array<Point2>, color: string}) => {
    //console.log("updateplayers positions:", params);
    if (!PLAYERS.has(params.id))
        return;

    let player = <Player>PLAYERS.get(params.id);
    player.points = params.points;
    player.color = params.color;
});