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
    imgPrepareCountdown.src = `./img/${params.countdown}.png`;

    if (params.initDisplay)
        requestAnimationFrame(renderOnly);
});

socket.on('createPlayers', (params: Array<{id: string, name: string, x1: number, y1: number, x2: number, y2: number, color: string}>) => {

    PLAYERS = new Map<string, Player>();
    for (const playerParams of params)
    {
        let player = new Player(playerParams.color);
        player.name = playerParams.name;
        player.addPoint(playerParams.x1, playerParams.y1);
        player.addPoint(playerParams.x2, playerParams.y2);

        if (playerParams.id === selfID)
            userInput(player, canvas);

        PLAYERS.set(playerParams.id, player);
    }

    displayStatus = DisplayStatus.PLAYING;
});

socket.on('updatePlayersPositions', (params: {id: string, points: Array<Point2>}) => {
    //console.log("updateplayers positions:", params);
    if (!PLAYERS.has(params.id))
        return;

    let player = <Player>PLAYERS.get(params.id);
    player.points = params.points;
});