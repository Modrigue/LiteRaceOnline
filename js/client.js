"use strict";
let STADIUM_W_CLIENT = 640;
let STADIUM_H_CLIENT = 360;
const DEPLOY_CLIENT = true;
const imgPrepare = new Image();
let imgPrepareCountdown = new Image();
const imgScores = new Image();
const imgGameOver = new Image();
imgPrepare.src = "./img/texts/prepare_to_race.png";
imgScores.src = "./img/texts/scores.png";
imgGameOver.src = "./img/texts/game_over.png";
let socket;
if (DEPLOY_CLIENT)
    socket = io.connect();
else
    socket = io.connect(`http://localhost:${PORT}`);
// player params
let selfID;
let creator = false;
let reconnecting = false;
class Player extends LiteRay {
    constructor() {
        super(...arguments);
        this.name = "";
        this.score = 0;
        this.nbKillsInRound = 0;
        this.team = "";
    }
}
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
canvas.width = STADIUM_W_CLIENT;
canvas.height = STADIUM_H_CLIENT;
let PLAYERS = new Map();
let PLAYERS_INIT = new Map();
let STADIUM = new Array();
let OBSTACLES = new Array();
let ITEMS = new Array();
let displayStatus = DisplayStatus.NONE;
let nbRounds = 0;
let winners = new Array();
joinTestRoom();
function joinTestRoom() {
    socket.emit('joinRoom', { name: "TEST", room: "TEST", password: "" }, (response) => { });
    socket.emit('setPlayerParams', { color: "#ffff00", team: "", ready: true }, (response) => { });
    socket.emit('play', null, (response) => { });
}
socket.on('connect', () => {
    selfID = socket.id;
});
socket.on('gamesParams', (params) => {
    STADIUM_W_CLIENT = params.stadiumW;
    STADIUM_H_CLIENT = params.stadiumH;
    onResize();
    canvas.width = STADIUM_W_CLIENT;
    canvas.height = STADIUM_H_CLIENT;
    // for test purposes only
    //if (params.fastTestMode)
    //    joinTestRoom();
});
socket.on('stadium', (params) => {
    STADIUM = new Array();
    for (const data of params) {
        const newWall = new Segment(data.x1, data.y1, data.x2, data.y2, data.color);
        STADIUM.push(newWall);
    }
});
socket.on('obstacles', (params) => {
    OBSTACLES = new Array();
    for (const data of params) {
        const newObstacle = new Box(data.x1, data.y1, data.x2, data.y2, data.color);
        OBSTACLES.push(newObstacle);
    }
});
socket.on('items', (params) => {
    ITEMS = new Array();
    for (const data of params) {
        const item = new Disc(data.x, data.y, 20);
        const imgScope = new Image();
        const imgType = new Image();
        imgScope.src = `./img/items/scopes/item_scope_${data.scope}.png`;
        imgType.src = `./img/items/types/item_type_${data.type}.png`;
        item.images.push(imgScope);
        item.images.push(imgType);
        ITEMS.push(item);
    }
});
socket.on('displayScores', (params) => {
    //console.log("displayScores", params);
    for (const data of params) {
        if (!PLAYERS.has(data.id))
            return;
        let player = PLAYERS.get(data.id);
        player.score = data.score;
        player.nbKillsInRound = data.nbKills;
        player.team = data.team;
    }
    displayStatus = DisplayStatus.SCORES;
});
socket.on('gameOverPlayers', (params) => {
    //console.log("gameOverPlayers", params);
    winners = new Array();
    for (const id of params)
        if (PLAYERS.has(id))
            winners.push(PLAYERS.get(id).name);
    displayStatus = DisplayStatus.GAME_OVER;
});
socket.on('gameOverTeams', (params) => {
    //console.log("gameOverTeams", params);
    winners = new Array();
    for (const team of params)
        winners.push(team);
    displayStatus = DisplayStatus.GAME_OVER;
});
// event sounds
let soundCollision;
socket.on('collision', (params) => {
    const volume = (params.id == selfID) ? 1 : 0.5;
    playAudio(soundCollision, volume);
});
//# sourceMappingURL=client.js.map