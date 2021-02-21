"use strict";
const STADIUM_W_CLIENT = 640;
const STADIUM_H_CLIENT = 360;
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
class Player extends LiteRay {
    constructor() {
        super(...arguments);
        this.name = "";
        this.score = 0;
        this.nbKillsInRound = 0;
    }
}
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
canvas.width = STADIUM_W_CLIENT;
canvas.height = STADIUM_H_CLIENT;
let PLAYERS = new Map();
let STADIUM = new Array();
let displayStatus = DisplayStatus.NONE;
let nbRounds = 0;
let winners = new Array();
// for test purposes only
//joinTestRoom();
function joinTestRoom() {
    socket.emit('joinRoom', { name: "TEST", room: "TEST", password: "" }, (response) => { });
    socket.emit('setPlayerParams', { color: "yellow", team: "TEST", ready: true }, (response) => { });
    onPlay();
}
socket.on('connect', () => {
    selfID = socket.id;
});
socket.on('stadium', (params) => {
    STADIUM = new Array();
    for (const coords of params) {
        const newWall = new Segment(coords.x1, coords.y1, coords.x2, coords.y2, "darkgrey");
        STADIUM.push(newWall);
    }
    displayStatus = DisplayStatus.PLAYING;
});
socket.on('displayScores', (params) => {
    console.log("displayScores", params);
    for (const data of params) {
        if (!PLAYERS.has(data.id))
            return;
        let player = PLAYERS.get(data.id);
        player.score = data.score;
        player.nbKillsInRound = data.nbKills;
    }
    displayStatus = DisplayStatus.SCORES;
});
socket.on('gameOver', (params) => {
    //console.log("gameOver", params);
    winners = new Array();
    for (const id of params)
        if (PLAYERS.has(id))
            winners.push(PLAYERS.get(id).name);
    displayStatus = DisplayStatus.GAME_OVER;
});
//# sourceMappingURL=client.js.map