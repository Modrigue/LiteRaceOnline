"use strict";
const STADIUM_W = 640;
const STADIUM_H = 480;
const DURATION_PREPARE_SCREEN = 2; // in s
const DURATION_SCORES_SCREEN = 3; // in s
const DEPLOY = true;
const PORT = DEPLOY ? (process.env.PORT || 13000) : 5500;
//////////////////////////////// GEOMETRY ENGINE //////////////////////////////
class Point2_S {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
}
class Segment_S {
    constructor(x1, y1, x2, y2, color) {
        this._points = new Array(2);
        this._points[0] = new Point2_S(x1, y1);
        this._points[1] = new Point2_S(x2, y2);
    }
    get points() { return this._points; }
    set points(value) { this._points = value; }
}
class LiteRay_S {
    constructor() {
        this._points = new Array();
        this.color = "white";
        this.speed = 1;
        this.up = false;
        this.down = false;
        this.left = false;
        this.right = false;
        this.action = false;
        this.alive = false;
    }
    get points() { return this._points; }
    set points(value) { this._points = value; }
    getLastPoint() {
        if (!this._points || this._points.length == 0)
            return new Point2_S(-Infinity, -Infinity);
        // get last point
        const nbPoints = this._points.length;
        const pointLast = this._points[nbPoints - 1];
        return pointLast;
    }
    addPoint(x, y) {
        this._points.push(new Point2_S(x, y));
    }
    getNextPoint() {
        if (!this._points || this._points.length <= 1)
            return new Point2_S(-Infinity, -Infinity);
        const { dirx, diry } = this.direction();
        if (dirx == -Infinity || diry == -Infinity)
            return new Point2_S(-Infinity, -Infinity);
        // get last point
        const pointLast = this.getLastPoint();
        const x = pointLast.x + this.speed * dirx;
        const y = pointLast.y + this.speed * diry;
        return new Point2_S(x, y);
    }
    extendsToNextPoint() {
        if (!this._points || this._points.length == 0)
            return;
        const pointNext = this.getNextPoint();
        if (pointNext.x === -Infinity || pointNext.y === -Infinity)
            return;
        // extend last point
        const nbPoints = this._points.length;
        this._points[nbPoints - 1].x = pointNext.x;
        this._points[nbPoints - 1].y = pointNext.y;
    }
    direction() {
        if (!this._points || this._points.length <= 1)
            return { dirx: -Infinity, diry: -Infinity };
        // get last segment
        const nbPoints = this._points.length;
        const pointLast = this._points[nbPoints - 1];
        const pointLastPrev = this._points[nbPoints - 2];
        // compute unit direction vector
        const dx = pointLast.x - pointLastPrev.x;
        const dy = pointLast.y - pointLastPrev.y;
        const dirx = Math.sign(dx);
        const diry = Math.sign(dy);
        return { dirx: dirx, diry: diry };
    }
    keyControl() {
        const { dirx, diry } = this.direction();
        // get last segment
        const nbPoints = this._points.length;
        const pointLast = this._points[nbPoints - 1];
        if (this.up && diry == 0)
            this.addPoint(pointLast.x, pointLast.y - this.speed);
        else if (this.down && diry == 0)
            this.addPoint(pointLast.x, pointLast.y + this.speed);
        else if (this.left && dirx == 0)
            this.addPoint(pointLast.x - this.speed, pointLast.y);
        else if (this.right && dirx == 0)
            this.addPoint(pointLast.x + this.speed, pointLast.y);
    }
}
function collideSegment(ray, x1, y1, x2, y2) {
    const pointLast = ray.getLastPoint();
    const xr = pointLast.x;
    const yr = pointLast.y;
    if (xr == -Infinity || yr == -Infinity)
        return false;
    // check if last point is in bounding box
    const xSegMin = Math.min(x1, x2);
    const xSegMax = Math.max(x1, x2);
    const ySegMin = Math.min(y1, y2);
    const ySegMax = Math.max(y1, y2);
    const isInBoundingBox = (xSegMin <= xr && xr <= xSegMax) && (ySegMin <= yr && yr <= ySegMax);
    if (!isInBoundingBox)
        return false;
    // check if last ray point is on segment
    // point on segment iff. (yr - y1)/(y2 - y1) = (xr - x1)/(x2 - x1)
    // <=> (yr - y1)*(x2 - x1) = (xr - x1)*(y2 - y1) to avoir divisions by 0
    // <=> | (yr - y1)*(x2 - x1) - (xr - x1)*(y2 - y1) | < threshold to handle pixels
    const dist = Math.abs((yr - y1) * (x2 - x1) - (xr - x1) * (y2 - y1));
    return (dist <= 480 /* canvas height */);
}
function collideRay(ray1, ray2) {
    const pointLast = ray1.getLastPoint();
    const xr = pointLast.x;
    const yr = pointLast.y;
    if (xr == -Infinity || yr == -Infinity)
        return false;
    const isOwnRay = (ray1 === ray2);
    // check collision with each segment
    let index = 0;
    let pointPrev = new Point2_S(-1, -1);
    for (const pointCur of ray2.points) {
        // skip own ray current segment
        if (isOwnRay && index == ray2.points.length - 1)
            continue;
        if (index > 0) {
            const collide = collideSegment(ray1, pointPrev.x, pointPrev.y, pointCur.x, pointCur.y);
            if (collide)
                return true;
        }
        pointPrev.x = pointCur.x;
        pointPrev.y = pointCur.y;
        index++;
    }
    return false;
}
///////////////////////////////////////////////////////////////////////////////
const express = require('express');
const app = express();
let io;
if (DEPLOY) {
    app.use(express.static('.'));
    const http = require('http').Server(app);
    io = require('socket.io')(http);
    app.get('/', (req, res) => res.sendFile(__dirname + '../index.html'));
    http.listen(PORT, function () {
        console.log(`listening on port ${PORT}...`);
    });
}
else {
    io = require('socket.io')(PORT);
    app.get('/', (req, res) => res.send('Hello World!'));
}
class Player_S extends LiteRay_S {
    constructor() {
        super(...arguments);
        this.score = 0;
        this.no = 0;
        this.name = "";
        this.room = "";
        this.team = "";
        this.ready = false;
        this.creator = false;
        this.killedBy = "";
    }
}
var GameStatus;
(function (GameStatus) {
    GameStatus[GameStatus["NONE"] = 0] = "NONE";
    GameStatus[GameStatus["SETUP"] = 1] = "SETUP";
    GameStatus[GameStatus["PLAYING"] = 2] = "PLAYING";
})(GameStatus || (GameStatus = {}));
var DisplayStatus_S;
(function (DisplayStatus_S) {
    DisplayStatus_S[DisplayStatus_S["NONE"] = 0] = "NONE";
    DisplayStatus_S[DisplayStatus_S["PREPARE"] = 1] = "PREPARE";
    DisplayStatus_S[DisplayStatus_S["POS_INIT"] = 2] = "POS_INIT";
    DisplayStatus_S[DisplayStatus_S["PLAYING"] = 3] = "PLAYING";
    DisplayStatus_S[DisplayStatus_S["SCORES"] = 4] = "SCORES";
})(DisplayStatus_S || (DisplayStatus_S = {}));
class Game_S {
    constructor() {
        this.nbPlayersMax = 2;
        this.players = new Map();
        this.stadium = new Array();
        this.nbRounds = 15;
        this.round = 0;
        this.password = "";
        this.status = GameStatus.NONE;
        this.displayStatus = DisplayStatus_S.NONE;
    }
}
let games = new Map();
let clientNo = 0;
let gameTest = new Game_S();
gameTest.nbPlayersMax = 2;
games.set("TEST", gameTest);
io.on('connection', connected);
setInterval(serverLoop, 1000 / 60);
//////////////////////////////// RECEIVE EVENTS ///////////////////////////////
function connected(socket) {
    console.log(`Client '${socket.id}' connected`);
    updateRoomsList();
    const room = 1;
    //const nbPlayersReady = getNbPlayersReadyInRoom(room);
    // create new room
    socket.on('createNewRoom', (params, response) => {
        const room = params.room;
        console.log(`Client '${socket.id}' - '${params.name}' asks to create room '${room}'`);
        // check if room has already been created
        if (games.has(room)) {
            response({
                error: `Room '${room}' already exists. Please enter another room name.`
            });
            return;
        }
        // ok, create room
        let creator = new Player_S();
        creator.creator = true;
        creator.name = params.name;
        creator.room = room;
        let newGame = new Game_S();
        newGame.players.set(socket.id, creator);
        newGame.password = params.password;
        newGame.status = GameStatus.SETUP;
        games.set(room, newGame);
        creator.no = 1;
        socket.join(room);
        // send updated rooms list to all clients
        updateRoomsList();
        response({ room: room });
        updateRoomParams(room);
        updatePlayersList(room);
    });
    // join room
    socket.on('joinRoom', (params, response) => {
        const room = params.room;
        // check if room exists
        if (!games.has(room)) {
            response({
                error: `Room '${room}' does not exist. Please try another room.`
            });
            return;
        }
        // check password if existing
        let game = games.get(room);
        if (game.password && game.password.length > 0) {
            if (params.password.length == 0) {
                response({
                    error: `Room '${room}' is password-protected.`
                });
                return;
            }
            else if (params.password != game.password) {
                response({
                    error: `Wrong password for room '${room}'.`
                });
                return;
            }
        }
        // check nb. of players left
        const nbPlayersCur = game.players.size;
        const nbPlayersMax = game.nbPlayersMax;
        if (nbPlayersCur >= nbPlayersMax) {
            response({
                error: `Room '${room}' is full. Please try another room.`
            });
            return;
        }
        // ok, create player and join room
        let player = new Player_S();
        player.name = params.name;
        player.room = room;
        player.no = getNextPlayerNoInRoom(room);
        game.players.set(socket.id, player);
        // enable play button if game already on
        const enablePlay = (game.status == GameStatus.PLAYING);
        socket.join(room);
        updateRoomParams(room);
        updatePlayersList(room);
        updatePlayersParams(room);
        updateRoomsList();
        response({ room: room, enablePlay: enablePlay });
    });
    // max. nb. of players update
    socket.on('setRoomParams', (params, response) => {
        const room = getPlayerRoomFromId(socket.id);
        if (room.length == 0)
            return;
        // update on all room clients game setup page
        if (games.has(room)) {
            const game = games.get(room);
            if (game.status != GameStatus.PLAYING) {
                game.nbPlayersMax = params.nbPlayersMax;
                game.nbRounds = params.nbRounds;
                updateRoomParams(room);
            }
        }
        updateRoomsList();
    });
    // player parameters update
    socket.on('setPlayerParams', (params, response) => {
        const room = getPlayerRoomFromId(socket.id);
        if (room.length == 0)
            return;
        if (!games.has(room))
            return;
        const game = games.get(room);
        if (game.players && game.players.has(socket.id)) {
            let player = getPlayerFromId(socket.id);
            if (player.name.length == 0)
                return;
            player.color = params.color;
            player.team = params.team;
            player.ready = params.ready;
            updatePlayersParams(room);
        }
    });
    // start play
    socket.on('play', (params, response) => {
        const room = getPlayerRoomFromId(socket.id);
        if (room.length == 0)
            return;
        if (games.has(room)) {
            const game = games.get(room);
            if (game.players.size < game.nbPlayersMax)
                return;
            switch (game.status) {
                case GameStatus.SETUP:
                    // start new game
                    console.log(`Client '${socket.id}' starts game '${room}'`);
                    game.status = GameStatus.PLAYING;
                    playGame(room);
                case GameStatus.PLAYING:
                    // join started game
                    console.log(`Client '${socket.id}' joins started game '${room}'`);
                    playGame(room);
                default:
                    // for tests only
                    game.status = GameStatus.PLAYING;
                    playGame(room);
            }
        }
        updateRoomsList();
    });
    // disconnection
    socket.on('disconnect', function () {
        var _a;
        console.log(`Client '${socket.id}' disconnected`);
        // if creator player in setup page, kick all players in room and delete room
        let player = getPlayerFromId(socket.id);
        // if unregistered player, nop
        if (player.name.length == 0 || player.room.length == 0)
            return;
        if (!games.has(player.room))
            return;
        const room = player.room;
        // if creator at game setup, delete room and kick all players in room
        if (player.creator) {
            if (((_a = games.get(room)) === null || _a === void 0 ? void 0 : _a.status) == GameStatus.SETUP) {
                games.delete(room);
                console.log(`Creator '${player.name}' disconnected => Room '${room}' deleted`);
                updateRoomsList();
                kickAllPlayersFromRoom(room);
                return;
            }
        }
        // delete player in room
        const game = games.get(room);
        if (game.players !== null && game.players.has(socket.id))
            game.players.delete(socket.id);
        //deleteEmptyRooms();
        updateRoomsList();
        updatePlayersList(room);
        updatePlayersParams(room);
    });
    socket.on('kickPlayer', (params, response) => {
        let player = getPlayerFromId(params.id);
        const room = getPlayerRoomFromId(params.id);
        if (!games.has(room))
            return;
        // delete player in room
        const game = games.get(room);
        if (game.players !== null && game.players.has(params.id)) {
            game.players.delete(params.id);
            kickPlayerFromRoom(room, params.id);
        }
        updateRoomsList();
    });
    // user inputs
    socket.on('userCommands', (data) => {
        let player = getPlayerFromId(socket.id);
        const room = getPlayerRoomFromId(socket.id);
        if (!games.has(room) || !player)
            return;
        player.left = data.left;
        player.up = data.up;
        player.right = data.right;
        player.down = data.down;
        player.action = data.action;
    });
}
////////////////////////////////// SEND EVENTS ////////////////////////////////
function updateRoomsList() {
    var _a;
    let roomsData = new Array();
    for (const [room, game] of games) {
        const nbPlayersCur = (_a = game.players) === null || _a === void 0 ? void 0 : _a.size;
        let status = "";
        switch (game.status) {
            case GameStatus.PLAYING:
                status = "Playing";
                break;
            case GameStatus.SETUP:
                status = "Waiting";
                break;
            default:
                status = "";
                break;
        }
        roomsData.push({ room: room, nbPlayersMax: game.nbPlayersMax, nbPlayers: nbPlayersCur, status: status });
    }
    io.emit('roomsList', roomsData);
}
function updatePlayersList(room) {
    if (!games.has(room))
        return;
    const game = games.get(room);
    if (game.players === null)
        return;
    let playersData = new Array();
    for (const [id, player] of game.players)
        playersData.push({ id: id, name: player.name });
    io.to(room).emit('updatePlayersList', playersData);
}
function updateRoomParams(room) {
    if (!games.has(room))
        return;
    const game = games.get(room);
    io.to(room).emit('updateRoomParams', { room: room, nbPlayersMax: game.nbPlayersMax, nbRounds: game.nbRounds });
}
function updatePlayersParams(room) {
    if (!games.has(room))
        return;
    const game = games.get(room);
    let playersParams = new Array();
    for (const [id, player] of game.players)
        playersParams.push({ id: id, name: player.name, color: player.color, team: player.team, ready: player.ready });
    io.to(room).emit('updatePlayersParams', playersParams);
}
function kickPlayerFromRoom(room, id) {
    if (!games.has(room))
        return;
    io.to(room).emit('kickFromRoom', { room: room, id: id });
}
function kickAllPlayersFromRoom(room) {
    io.to(room).emit('kickFromRoom', { room: room, id: "" });
}
function playGame(room) {
    if (!games.has(room))
        return;
    const game = games.get(room);
    game.round = 0;
    game.displayStatus = DisplayStatus_S.PREPARE;
    newRound(room);
    io.to(room).emit('prepareGame', { room: room, nbPlayersMax: game.nbPlayersMax, nbRounds: game.nbRounds });
    // create players
    setTimeout(() => {
        let playerParams = Array();
        for (const [id, player] of game.players) {
            playerParams.push({ id: id, name: player.name, x1: player.points[0].x, y1: player.points[0].y,
                x2: player.points[1].x, y2: player.points[1].y, color: player.color });
        }
        io.to(room).emit('createPlayers', playerParams);
        game.displayStatus = DisplayStatus_S.PLAYING;
    }, DURATION_PREPARE_SCREEN * 1000);
}
function getNextPlayerNoInRoom(room) {
    if (!games.has(room))
        return -1;
    const game = games.get(room);
    let playerNo = 1;
    for (const [id, player] of game.players) {
        if (player.no <= 0)
            return playerNo;
        playerNo++;
    }
    return playerNo;
}
function initPlayersPositions(room) {
    if (!games.has(room))
        return;
    const game = games.get(room);
    const yDiff = 80;
    for (const [id, player] of game.players) {
        const side = (player.no % 2 == 0) ? 2 : 1; // TODO: handle teams
        const nbPlayersInSide = (side == 1) ?
            Math.ceil(game.nbPlayersMax / 2) :
            Math.floor(game.nbPlayersMax / 2);
        const noPlayerInTeam = Math.floor((player.no - 1) / 2) + 1;
        const xStart = (side == 1) ? 50 : STADIUM_W - 50;
        let yMin = (nbPlayersInSide % 2 == 0) ?
            STADIUM_H / 2 - (Math.floor(nbPlayersInSide / 2) - 0.5) * yDiff :
            STADIUM_H / 2 - Math.floor(nbPlayersInSide / 2) * yDiff;
        const yStart = yMin + (noPlayerInTeam - 1) * yDiff;
        //console.log('PLAYER ', (player.no, noPlayerInTeam, yMin, xStart, yStart);
        const dx = (side == 1) ? 1 : -1;
        player.points = new Array();
        player.addPoint(xStart, yStart);
        player.addPoint(xStart + dx, yStart);
        player.alive = true;
        player.killedBy = "";
        player.up = player.down = player.left = player.right = player.action = false;
        // for tests only
        const playersColors = ["yellow", "dodgerblue", "red", "lightgreen"];
        const playersNames = ["Player 1", "Player 2 long name", "Player 3", "Player 4"];
        player.color = playersColors[player.no - 1];
        player.name = playersNames[player.no - 1];
    }
}
/////////////////////////////////////// LOOPS /////////////////////////////////
function serverLoop() {
    // send players positions to clients
    for (const [room, game] of games) {
        if (game.status != GameStatus.PLAYING || game.displayStatus != DisplayStatus_S.PLAYING)
            continue;
        userInteraction(room);
        physicsLoop(room);
        gameLogic(room);
        for (let [id, player] of game.players) {
            io.to(room).emit('updatePlayersPositions', {
                id: id,
                points: player.points
            });
        }
    }
}
function gameLogic(room) {
    // check remaining players
    if (!games.has(room))
        return;
    const game = games.get(room);
    let nbPlayersAlive = 0;
    for (const [id, player] of game.players)
        if (player.alive)
            nbPlayersAlive++;
    const nbPlayersLast = (game.nbPlayersMax > 1) ? 1 : 0; // TODO: handle teams
    if (nbPlayersAlive <= nbPlayersLast)
        scoring(room);
}
function physicsLoop(room) {
    if (!games.has(room))
        return;
    const game = games.get(room);
    //console.log(room, game.players);
    // extend to next point
    game.players.forEach((player) => {
        if (player.alive)
            player.extendsToNextPoint();
    });
    // check for collisions
    game.players.forEach((player) => {
        if (player.alive) {
            for (const [id, otherPlayer] of game.players) {
                if (collideRay(player, otherPlayer)) {
                    player.alive = false;
                    player.killedBy = id;
                    //console.log("COLLISION RAY");
                }
            }
            for (const wall of game.stadium) {
                if (player.alive)
                    if (collideSegment(player, wall.points[0].x, wall.points[0].y, wall.points[1].x, wall.points[1].y)) {
                        player.alive = false;
                        player.killedBy = "WALL";
                        //console.log("COLLISION WALL");
                    }
            }
        }
    });
}
function userInteraction(room) {
    if (!games.has(room))
        return;
    const game = games.get(room);
    game.players.forEach((player) => { player.keyControl(); });
}
function scoring(room) {
    if (!games.has(room))
        return;
    const game = games.get(room);
    // update players scores
    for (const [id, player] of game.players) {
        const idKiller = player.killedBy;
        //console.log(`Player ${id}: killed by ${idKiller}`);
        if (idKiller == id) // suicide
            player.score = Math.max(player.score - 1, 0);
        else if (idKiller == "WALL") {
            // nop
        }
        else if (idKiller.length > 0) {
            if (game.players.has(idKiller))
                game.players.get(idKiller).score++;
        }
        //console.log(`${player.name}: ${player.score} point(s)`);
    }
    // display scores
    game.displayStatus = DisplayStatus_S.SCORES;
    let scoreParams = new Array();
    for (const [id, player] of game.players)
        scoreParams.push({ id: id, score: player.score });
    io.to(room).emit('displayScores', scoreParams);
    setTimeout(() => { newRound(room); }, DURATION_SCORES_SCREEN * 1000);
}
function newRound(room) {
    if (!games.has(room))
        return;
    const game = games.get(room);
    game.round++;
    console.log(`ROOM ${room} - ROUND ${game.round}`);
    newStadium(room);
    initPlayersPositions(room);
    game.displayStatus = DisplayStatus_S.PLAYING;
}
function newStadium(room) {
    if (!games.has(room))
        return;
    const game = games.get(room);
    game.stadium = new Array();
    let wall1 = new Segment_S(0, 0, 0, STADIUM_H, "darkgrey");
    let wall2 = new Segment_S(STADIUM_W, 0, STADIUM_W, 480, "darkgrey");
    let wall3 = new Segment_S(0, 0, STADIUM_W, 0, "darkgrey");
    let wall4 = new Segment_S(0, STADIUM_H, STADIUM_W, STADIUM_H, "darkgrey");
    game.stadium.push(wall1);
    game.stadium.push(wall2);
    game.stadium.push(wall3);
    game.stadium.push(wall4);
    sendStadium(room);
}
function sendStadium(room) {
    if (!games.has(room))
        return;
    const game = games.get(room);
    let stadiumParams = new Array();
    for (const wall of game.stadium)
        stadiumParams.push({ x1: wall.points[0].x, y1: wall.points[0].y, x2: wall.points[1].x, y2: wall.points[1].y });
    io.to(room).emit('stadium', stadiumParams);
}
////////////////////////////////////// HELPERS ////////////////////////////////
// delete empty rooms
function deleteEmptyRooms() {
    for (const [room, game] of games)
        if (game.players == null || game.players.size == 0)
            games.delete(room);
}
function getPlayerFromId(id) {
    for (const [room, game] of games)
        for (const [idCur, player] of game.players)
            if (idCur == id)
                return player;
    // not found, return empty player
    return new Player_S();
}
function getPlayerRoomFromId(id) {
    let player = getPlayerFromId(id);
    // if unregistered player, nop
    if (player.name.length == 0 || player.room.length == 0)
        return "";
    if (!games.has(player.room))
        return "";
    return player.room;
}
//# sourceMappingURL=server.js.map