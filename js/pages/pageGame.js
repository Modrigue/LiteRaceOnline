"use strict";
socket.on('prepareGame', (params) => {
    //(<HTMLParagraphElement>document.getElementById('gameTitle')).innerText
    //    = `Game ${params.room} - ${params.nbPlayersMax} players - ${params.nbRounds} rounds`;
    setVisible("pageWelcome", false);
    setVisible("pageGameSetup", false);
    setVisible("pageGame", true);
    nbRounds = params.nbRounds;
    winners = new Array();
    canvas.focus();
    displayStatus = DisplayStatus.PREPARE;
    if (params.countdown > 0)
        imgPrepareCountdown.src = `./img/texts/${params.countdown}.png`;
    if (params.initDisplay)
        requestAnimationFrame(renderOnly);
});
socket.on('createPlayers', (params) => {
    PLAYERS = new Map();
    for (const playerParams of params) {
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
socket.on('updatePlayersPositions', (params) => {
    //console.log("updateplayers positions:", params);
    if (!PLAYERS.has(params.id))
        return;
    let player = PLAYERS.get(params.id);
    player.points = params.points;
    player.color = params.color;
});
//# sourceMappingURL=pageGame.js.map