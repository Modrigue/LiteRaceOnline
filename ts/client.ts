let STADIUM_W_CLIENT = 640;
let STADIUM_H_CLIENT = 360;

const DEPLOY_CLIENT: boolean = true;

const imgPrepare: HTMLImageElement = new Image();
const imgScores: HTMLImageElement = new Image();
const imgGameOver: HTMLImageElement = new Image();
imgPrepare.src = "./img/prepare_to_race.png";
imgScores.src = "./img/scores.png";
imgGameOver.src = "./img/game_over.png";

let socket: any;
if (DEPLOY_CLIENT)
    socket = io.connect();
else
    socket = io.connect(`http://localhost:${PORT}`);

// player params
let selfID: string;
let creator: boolean = false;
let reconnecting: boolean = false;

class Player extends LiteRay
{
    name: string = "";
    score: number = 0;
    nbKillsInRound: number = 0;
}

const canvas = <HTMLCanvasElement>document.getElementById("gameCanvas");
const ctx = <CanvasRenderingContext2D>canvas.getContext("2d");
canvas.width = STADIUM_W_CLIENT;
canvas.height = STADIUM_H_CLIENT;

let PLAYERS = new Map<string, Player>();
let STADIUM = new Array<Segment>();
let displayStatus: DisplayStatus = DisplayStatus.NONE;
let nbRounds: number = 0;
let winners = new Array<string>();

joinTestRoom();
function joinTestRoom()
{
    socket.emit('joinRoom', {name: "TEST", room: "TEST", password: ""}, (response: any) => {});
    socket.emit('setPlayerParams', {color: "#ffff00", team: "TEST", ready: true}, (response: any) => {});
    socket.emit('play', null, (response: any) => {});  
}

socket.on('connect', () => {
    selfID = socket.id;
});

socket.on('gamesParams', (params: {stadiumW: number, stadiumH: number, fastTestMode: boolean}) => {
    STADIUM_W_CLIENT = params.stadiumW;
    STADIUM_H_CLIENT = params.stadiumH;

    canvas.width = STADIUM_W_CLIENT;
    canvas.height = STADIUM_H_CLIENT;

    // for test purposes only
    //if (params.fastTestMode)
    //    joinTestRoom();
});


socket.on('stadium', (params: Array<{x1: number, y1: number, x2: number, y2: number}>) => {
    STADIUM = new Array<Segment>();
    for (const coords of params)
    {
        const newWall: Segment = new Segment(coords.x1, coords.y1, coords.x2, coords.y2, "darkgrey");
        STADIUM.push(newWall);
    }

    displayStatus = DisplayStatus.PLAYING;
});

socket.on('displayScores', (params: Array<{id: string, score: number, nbKills: number}>) => {
    //console.log("displayScores", params);
    for (const data of params)
    {
        if (!PLAYERS.has(data.id))
            return;
        let player = <Player>PLAYERS.get(data.id);

        player.score = data.score;
        player.nbKillsInRound = data.nbKills;
    }

    displayStatus = DisplayStatus.SCORES;
});

socket.on('gameOver', (params: Array<string>) => {
    //console.log("gameOver", params);
    winners = new Array<string>();
    for (const id of params)
        if (PLAYERS.has(id))
            winners.push((<Player>PLAYERS.get(id)).name);

    displayStatus = DisplayStatus.GAME_OVER;
});