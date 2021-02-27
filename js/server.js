"use strict";
const STADIUM_W = 600;
const STADIUM_H = 360;
const DURATION_PREPARE_SCREEN = 3; // in s
const DURATION_SCORES_SCREEN = 3;
const DURATION_GAME_OVER_SCREEN = 10;
const DEPLOY = true;
const PORT = DEPLOY ? (process.env.PORT || 13000) : 5500;
var GameMode;
(function (GameMode) {
    GameMode[GameMode["BODYCOUNT"] = 0] = "BODYCOUNT";
    GameMode[GameMode["SURVIVOR"] = 1] = "SURVIVOR";
})(GameMode || (GameMode = {}));
// for tests purposes only
const FAST_TEST_ON = false;
const FAST_TEST_MODE = GameMode.SURVIVOR;
const FAST_TEST_NB_PLAYERS = 4;
const FAST_TEST_NB_ROUNDS = 3;
const FAST_TEST_HAS_TEAMS = false;
//////////////////////////////// GEOMETRY ENGINE //////////////////////////////
class Point2_S {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
}
class Segment_S {
    constructor(x1, y1, x2, y2, color) {
        this.color = "";
        this._points = new Array(2);
        this._points[0] = new Point2_S(x1, y1);
        this._points[1] = new Point2_S(x2, y2);
        this.color = color;
    }
    get points() { return this._points; }
    set points(value) { this._points = value; }
}
class LiteRay_S {
    constructor() {
        this._points = new Array();
        this._pointLastCollision = new Point2_S(-Infinity, -Infinity);
        this.color = "#6666ff";
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
    get pointLastCollision() { return this._pointLastCollision; }
    set pointLastCollision(value) { this._pointLastCollision = value; }
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
        // check if last point is in stadium
        if (this.extendsToModulo())
            return;
        const pointNext = this.getNextPoint();
        if (pointNext.x === -Infinity || pointNext.y === -Infinity)
            return;
        // extend last point
        const nbPoints = this._points.length;
        this._points[nbPoints - 1].x = pointNext.x;
        this._points[nbPoints - 1].y = pointNext.y;
    }
    extendsToModulo() {
        const pointLast = this.getLastPoint();
        if (pointLast.x < 0) {
            const dx = Math.min(1, Math.abs(0 - pointLast.x));
            this.addPoint(Infinity, Infinity); // hole
            this.addPoint(STADIUM_W, pointLast.y);
            this.addPoint(STADIUM_W - dx, pointLast.y);
            return true;
        }
        else if (pointLast.x > STADIUM_W) {
            const dx = Math.min(1, Math.abs(pointLast.x - STADIUM_W));
            this.addPoint(Infinity, Infinity); // hole
            this.addPoint(0, pointLast.y);
            this.addPoint(0 + dx, pointLast.y);
            return true;
        }
        else if (pointLast.y < 0) {
            const dy = Math.min(1, Math.abs(0 - pointLast.y));
            this.addPoint(Infinity, Infinity); // hole
            this.addPoint(pointLast.x, STADIUM_H);
            this.addPoint(pointLast.x, STADIUM_H - dy);
            return true;
        }
        else if (pointLast.y > STADIUM_H) {
            const dy = Math.min(1, Math.abs(pointLast.y - STADIUM_H));
            this.addPoint(Infinity, Infinity); // hole
            this.addPoint(pointLast.x, 0);
            this.addPoint(pointLast.x, 0 + 0 + dy);
            return true;
        }
        return false;
    }
    applyCollision() {
        if (this._pointLastCollision.x == -Infinity || this._pointLastCollision.y == -Infinity)
            return;
        const pointLast = this.getLastPoint();
        pointLast.x = this._pointLastCollision.x;
        pointLast.y = this._pointLastCollision.y;
    }
    reset() {
        this.points = new Array();
        this._pointLastCollision.x = -Infinity;
        this._pointLastCollision.y = -Infinity;
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
    for (let i = ray.speed - 1; i >= 0; i--) {
        const xrCur = xr - i * ray.direction().dirx;
        const yrCur = yr - i * ray.direction().diry;
        const collisionCur = pointOnSegment(xrCur, yrCur, x1, y1, x2, y2);
        if (collisionCur) {
            // store last collision point
            ray.pointLastCollision.x = xrCur - ray.direction().dirx;
            ray.pointLastCollision.y = yrCur - ray.direction().diry;
            return true;
        }
    }
    return false;
}
// returns true if point (x, y) is on segment
// TODO: use Bresenham's algorithm or SAT?
function pointOnSegment(x, y, x1, y1, x2, y2) {
    // check if horizontal / vertical segments
    if (y1 == y2)
        return (y == y1 && Math.min(x1, x2) <= x && x <= Math.max(x1, x2));
    else if (x1 == x2)
        return (x == x1 && Math.min(y1, y2) <= y && y <= Math.max(y1, y2));
    // check if last point is in bounding box
    const xSegMin = Math.min(x1, x2);
    const xSegMax = Math.max(x1, x2);
    const ySegMin = Math.min(y1, y2);
    const ySegMax = Math.max(y1, y2);
    const isInBoundingBox = (xSegMin <= x && x <= xSegMax) && (ySegMin <= y && y <= ySegMax);
    if (!isInBoundingBox)
        return false;
    // point on segment iff. (yr - y1)/(y2 - y1) = (xr - x1)/(x2 - x1)
    // <=> (yr - y1)*(x2 - x1) = (xr - x1)*(y2 - y1) to avoid divisions by 0
    // <=> | (yr - y1)*(x2 - x1) - (xr - x1)*(y2 - y1) | < threshold to handle pixels
    const dist = Math.abs((y - y1) * (x2 - x1) - (x - x1) * (y2 - y1));
    return (dist <= STADIUM_H);
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
        if (pointCur.x != Infinity && pointCur.y != Infinity
            && pointPrev.x != Infinity && pointPrev.y != Infinity) {
            // skip own ray current segment
            if (isOwnRay && index == ray2.points.length - 1)
                continue;
            if (index > 0) {
                const collide = collideSegment(ray1, pointPrev.x, pointPrev.y, pointCur.x, pointCur.y);
                if (collide)
                    return true;
            }
        }
        pointPrev.x = pointCur.x;
        pointPrev.y = pointCur.y;
        index++;
    }
    return false;
}
function computeDoubleCollision(ray1, ray2) {
    const pointLast1 = ray1.getLastPoint();
    const pointLast2 = ray2.getLastPoint();
    const dir1 = ray1.direction();
    const dir2 = ray2.direction();
    // horizontal face-to-face collision
    if (dir1.dirx == -dir2.dirx && dir1.diry == 0 && dir2.diry == 0) {
        const xMid = (ray2.speed * pointLast1.x + ray1.speed * pointLast2.x) / (ray1.speed + ray2.speed);
        if (xMid == Math.floor(xMid)) // same collision point
         {
            ray1.pointLastCollision.x = xMid - dir1.dirx;
            ray2.pointLastCollision.x = xMid - dir2.dirx;
            ray1.pointLastCollision.y = pointLast1.y;
            ray2.pointLastCollision.y = pointLast2.y;
        }
        else {
            ray1.pointLastCollision.x = (dir1.dirx > 0) ? Math.floor(xMid) : Math.ceil(xMid);
            ray1.pointLastCollision.x = (dir2.dirx > 0) ? Math.floor(xMid) : Math.ceil(xMid);
            ray1.pointLastCollision.y = pointLast1.y;
            ray2.pointLastCollision.y = pointLast2.y;
        }
    }
    // vertical face-to-face collision
    else if (dir1.diry == -dir2.diry && dir1.dirx == 0 && dir2.dirx == 0) {
        const yMid = (ray2.speed * pointLast1.y + ray1.speed * pointLast2.y) / (ray1.speed + ray2.speed);
        if (yMid == Math.floor(yMid)) // same collision point
         {
            ray1.pointLastCollision.x = pointLast1.x;
            ray2.pointLastCollision.x = pointLast2.x;
            ray1.pointLastCollision.y = yMid - dir1.diry;
            ray2.pointLastCollision.y = yMid - dir2.diry;
        }
        else {
            ray1.pointLastCollision.x = pointLast1.x;
            ray2.pointLastCollision.x = pointLast2.x;
            ray1.pointLastCollision.y = (dir1.diry > 0) ? Math.floor(yMid) : Math.ceil(yMid);
            ray1.pointLastCollision.y = (dir2.diry > 0) ? Math.floor(yMid) : Math.ceil(yMid);
        }
    }
    // straight angle collision
    else if (Math.abs(dir1.dirx) != Math.abs(dir2.dirx) && Math.abs(dir1.diry) != Math.abs(dir2.diry)) {
        if (Math.abs(dir1.dirx) > 0 && Math.abs(dir2.dirx) == 0) {
            ray1.pointLastCollision.x = pointLast2.x - dir1.dirx;
            ray1.pointLastCollision.y = pointLast1.y;
            ray2.pointLastCollision.x = pointLast2.x;
            ray2.pointLastCollision.y = pointLast1.y - dir2.diry;
        }
        else if (Math.abs(dir1.diry) > 0 && Math.abs(dir2.diry) == 0) {
            ray1.pointLastCollision.x = pointLast1.x;
            ray1.pointLastCollision.y = pointLast2.y - dir1.diry;
            ray2.pointLastCollision.x = pointLast1.x - dir2.dirx;
            ray2.pointLastCollision.y = pointLast2.y;
        }
    }
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
        this.no = 0;
        this.name = "";
        this.room = "";
        this.team = "";
        this.ready = false;
        this.creator = false;
        this.score = 0;
        this.markForDead = false;
        this.killedBy = "";
        this.nbPointsInRound = 0;
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
    DisplayStatus_S[DisplayStatus_S["GAME_OVER"] = 5] = "GAME_OVER";
})(DisplayStatus_S || (DisplayStatus_S = {}));
class Game {
    constructor() {
        this.nbPlayersMax = 2;
        this.players = new Map();
        this.hasTeams = false;
        this.mode = GameMode.BODYCOUNT;
        this.stadium = new Array();
        this.nbRounds = 10;
        this.round = 0;
        this.resetOnKilled = false;
        this.password = "";
        this.status = GameStatus.NONE;
        this.displayStatus = DisplayStatus_S.NONE;
    }
}
let games = new Map();
let clientNo = 0;
// for fast test only
let gameTest = new Game();
setFastTestMode(FAST_TEST_ON);
function setFastTestMode(state) {
    if (!state)
        return;
    gameTest.mode = FAST_TEST_MODE;
    gameTest.nbPlayersMax = FAST_TEST_NB_PLAYERS;
    gameTest.nbRounds = FAST_TEST_NB_ROUNDS;
    gameTest.hasTeams = FAST_TEST_HAS_TEAMS;
    games.set("TEST", gameTest);
}
io.on('connection', connected);
setInterval(serverLoop, 1000 / 60);
//////////////////////////////// RECEIVE EVENTS ///////////////////////////////
function connected(socket) {
    console.log(`Client '${socket.id}' connected`);
    updateRoomsList();
    io.emit('gamesParams', { stadiumW: STADIUM_W, stadiumH: STADIUM_H, fastTestMode: FAST_TEST_ON });
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
        let newGame = new Game();
        newGame.players.set(socket.id, creator);
        newGame.password = params.password; // TODO: hash password
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
        //player.color = '#' + Math.random().toString(16).substr(2,6); // random color
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
                game.hasTeams = params.hasTeams;
                game.mode = (params.mode == "survivor") ? GameMode.SURVIVOR : GameMode.BODYCOUNT;
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
                    playNewGame(room);
                case GameStatus.PLAYING:
                    // join started game
                    console.log(`Client '${socket.id}' joins started game '${room}'`);
                    playNewGame(room);
                default:
                    // for tests only
                    if (FAST_TEST_ON) {
                        game.status = GameStatus.PLAYING;
                        playNewGame(room);
                    }
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
        deleteEmptyRooms();
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
    const modeStr = (game.mode == GameMode.SURVIVOR) ? "survivor" : "bodycount";
    io.to(room).emit('updateRoomParams', { room: room, nbPlayersMax: game.nbPlayersMax, nbRounds: game.nbRounds, hasTeams: game.hasTeams, mode: modeStr });
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
function playNewGame(room) {
    if (!games.has(room))
        return;
    const game = games.get(room);
    game.round = 0;
    newRound(room);
    game.displayStatus = DisplayStatus_S.PREPARE;
    game.round = 0;
    io.to(room).emit('prepareGame', { room: room, nbPlayersMax: game.nbPlayersMax, nbRounds: game.nbRounds });
    // create players
    setTimeout(() => {
        let playerParams = Array();
        for (const [id, player] of game.players) {
            player.score = player.nbPointsInRound = 0;
            player.killedBy = "";
            playerParams.push({
                id: id, name: player.name, x1: player.points[0].x, y1: player.points[0].y,
                x2: player.points[1].x, y2: player.points[1].y, color: player.color
            });
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
    // TODO: handle teams?
    const percent = Math.floor(100 * Math.random());
    const positioning = Math.floor(percent / 25) + 1;
    switch (positioning) {
        case 1: // face to face
            {
                const dy = 80;
                const remain = (game.nbPlayersMax % 2);
                for (const [id, player] of game.players) {
                    const side = (player.no % 2); // left / right
                    const nbPlayersInSide = (0 < side && side <= remain) ?
                        Math.ceil(game.nbPlayersMax / 2) : Math.floor(game.nbPlayersMax / 2);
                    const noPlayerInSide = Math.floor((player.no - 1) / 2) + 1;
                    const xStart = (side == 1) ? 50 : STADIUM_W - 50;
                    let yMin = (nbPlayersInSide % 2 == 0) ?
                        STADIUM_H / 2 - (Math.floor(nbPlayersInSide / 2) - 0.5) * dy :
                        STADIUM_H / 2 - Math.floor(nbPlayersInSide / 2) * dy;
                    const yStart = yMin + (noPlayerInSide - 1) * dy;
                    //console.log('PLAYER ', player.no, noPlayerInSide, yMin, xStart, yStart);
                    const dx = (side == 1) ? 1 : -1;
                    player.reset();
                    player.addPoint(xStart, yStart);
                    player.addPoint(xStart + dx, yStart);
                }
                break;
            }
        case 2: // reverse face to face
            {
                const dy = 2;
                const remain = (game.nbPlayersMax % 2);
                for (const [id, player] of game.players) {
                    const side = (player.no % 2); // left / right
                    const nbPlayersInSide = (0 < side && side <= remain) ?
                        Math.ceil(game.nbPlayersMax / 2) : Math.floor(game.nbPlayersMax / 2);
                    const noPlayerInSide = Math.floor((player.no - 1) / 2) + 1;
                    const xStart = STADIUM_W / 2;
                    let yMin = (nbPlayersInSide % 2 == 0) ?
                        STADIUM_H / 2 - (Math.floor(nbPlayersInSide / 2) - 0.5) * dy :
                        STADIUM_H / 2 - Math.floor(nbPlayersInSide / 2) * dy;
                    const yStart = yMin + (noPlayerInSide - 1) * dy;
                    //console.log('PLAYER ', player.no, noPlayerInSide, yMin, xStart, yStart);
                    const dx = (side == 1) ? -1 : 1;
                    player.reset();
                    player.addPoint(xStart, yStart);
                    player.addPoint(xStart + dx, yStart);
                }
                break;
            }
        case 3: // around
            {
                const dxy = 80;
                const remain = (game.nbPlayersMax % 4);
                for (const [id, player] of game.players) {
                    const side = (player.no % 4); // left / right / top / bottom
                    const nbPlayersInSide = (0 < side && side <= remain || game.nbPlayersMax <= 4) ?
                        Math.ceil(game.nbPlayersMax / 4) : Math.floor(game.nbPlayersMax / 4);
                    const noPlayerInSide = Math.floor((player.no - 1) / 4) + 1;
                    if (side == 1 || side == 2) // left / right
                     {
                        const xStart = (side == 1) ?
                            STADIUM_W / 2 - (STADIUM_H / 2 - 20) : STADIUM_W / 2 + (STADIUM_H / 2 - 20);
                        let yMin = (nbPlayersInSide % 2 == 0) ?
                            STADIUM_H / 2 - (Math.floor(nbPlayersInSide / 2) - 0.5) * dxy :
                            STADIUM_H / 2 - Math.floor(nbPlayersInSide / 2) * dxy;
                        const yStart = yMin + (noPlayerInSide - 1) * dxy;
                        const dx = (side == 1) ? 1 : -1;
                        player.reset();
                        player.addPoint(xStart, yStart);
                        player.addPoint(xStart + dx, yStart);
                    }
                    else // top /right
                     {
                        let xMin = (nbPlayersInSide % 2 == 0) ?
                            STADIUM_W / 2 - (Math.floor(nbPlayersInSide / 2) - 0.5) * dxy :
                            STADIUM_W / 2 - Math.floor(nbPlayersInSide / 2) * dxy;
                        const xStart = xMin + (noPlayerInSide - 1) * dxy;
                        const yStart = (side == 3) ?
                            STADIUM_H / 2 - (STADIUM_H / 2 - 20) : STADIUM_H / 2 + (STADIUM_H / 2 - 20);
                        const dy = (side == 3) ? 1 : -1;
                        player.reset();
                        player.addPoint(xStart, yStart);
                        player.addPoint(xStart, yStart + dy);
                    }
                    //console.log('PLAYER ', player.no, side, noPlayerInSide, nbPlayersInSide);
                }
                break;
            }
        case 4: // reverse around
            {
                const dxy = 2 * Math.ceil(game.nbPlayersMax / 4);
                const remain = (game.nbPlayersMax % 4);
                for (const [id, player] of game.players) {
                    const side = (player.no % 4); // left / right / top / bottom
                    const nbPlayersInSide = (0 < side && side <= remain || game.nbPlayersMax <= 4) ?
                        Math.ceil(game.nbPlayersMax / 4) : Math.floor(game.nbPlayersMax / 4);
                    const noPlayerInSide = Math.floor((player.no - 1) / 4) + 1;
                    if (side == 1 || side == 2) // left / right
                     {
                        const xStart = (side == 1) ?
                            STADIUM_W / 2 - dxy / 2 : STADIUM_W / 2 + dxy / 2;
                        let yMin = (nbPlayersInSide % 2 == 0) ?
                            STADIUM_H / 2 - (Math.floor(nbPlayersInSide / 2) - 0.5) * dxy :
                            STADIUM_H / 2 - Math.floor(nbPlayersInSide / 2) * dxy;
                        const yStart = yMin + (noPlayerInSide - 1) * dxy;
                        const dx = (side == 1) ? -1 : 1;
                        player.reset();
                        player.addPoint(xStart, yStart);
                        player.addPoint(xStart + dx, yStart);
                    }
                    else // top /right
                     {
                        let xMin = (nbPlayersInSide % 2 == 0) ?
                            STADIUM_W / 2 - (Math.floor(nbPlayersInSide / 2) - 0.5) * dxy :
                            STADIUM_W / 2 - Math.floor(nbPlayersInSide / 2) * dxy;
                        const xStart = xMin + (noPlayerInSide - 1) * dxy;
                        const yStart = (side == 3) ?
                            STADIUM_H / 2 - dxy / 2 : STADIUM_H / 2 + dxy / 2;
                        const dy = (side == 3) ? -1 : 1;
                        player.reset();
                        player.addPoint(xStart, yStart);
                        player.addPoint(xStart, yStart + dy);
                    }
                    //console.log('PLAYER ', player.no, side, noPlayerInSide, nbPlayersInSide);
                }
                break;
            }
    }
    // finalization
    for (const [id, player] of game.players) {
        player.alive = true;
        player.markForDead = false;
        player.killedBy = "";
        player.nbPointsInRound = 0;
        player.up = player.down = player.left = player.right = player.action = false;
        // for fast test only
        if (FAST_TEST_ON) {
            const playersColors = ["#ffff00", "#4444ff", "#ff4444", "#00ff00", "#ffff88", "#8888ff", "#ff8888", "#88ff88"];
            player.color = playersColors[(player.no - 1) % playersColors.length];
            player.name = `Player ${player.no}`;
            if (FAST_TEST_HAS_TEAMS)
                player.team = (player.no % 2 == 1) ? "Team 1" : "Team 2";
        }
    }
}
function initPlayersSpeeds(room) {
    if (!games.has(room))
        return;
    const game = games.get(room);
    const percent = Math.floor(100 * Math.random());
    let speed = 1;
    if (percent >= 80)
        speed = 3;
    else if (percent >= 50)
        speed = 2;
    for (const [id, player] of game.players)
        player.speed = speed;
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
        // client render
        for (let [id, player] of game.players)
            io.to(room).emit('updatePlayersPositions', { id: id, points: player.points });
    }
}
function gameLogic(room) {
    // display scores if round finished
    if (!games.has(room))
        return;
    const game = games.get(room);
    if (roundFinished(room))
        scoring(room);
}
function roundFinished(room) {
    // check remaining players / team
    if (!games.has(room))
        return false;
    const game = games.get(room);
    let nbPlayersOrTeamsAlive = 0;
    if (game.hasTeams) {
        let teamsAlive = new Array();
        for (const [id, player] of game.players)
            if (player.alive) {
                if (!teamsAlive.includes(player.team))
                    teamsAlive.push(player.team);
            }
        nbPlayersOrTeamsAlive = teamsAlive.length;
    }
    else {
        for (const [id, player] of game.players)
            if (player.alive)
                nbPlayersOrTeamsAlive++;
    }
    const nbPlayersOrTeamsLast = (game.nbPlayersMax > 1) ? 1 : 0;
    return (nbPlayersOrTeamsAlive <= nbPlayersOrTeamsLast);
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
                    player.markForDead = true;
                    player.killedBy = id;
                    //console.log(`PLAYER ${player.no} COLLISION RAY`);
                }
            }
            for (const wall of game.stadium) {
                if (!player.markForDead)
                    if (collideSegment(player, wall.points[0].x, wall.points[0].y, wall.points[1].x, wall.points[1].y)) {
                        player.markForDead = true;
                        player.killedBy = "WALL";
                        //console.log(`PLAYER ${player.no} COLLISION WALL`);
                    }
            }
        }
    });
    // check for double collisions
    for (const [id, player] of game.players) {
        if (player.markForDead) {
            // check if double collision
            const idKiller = player.killedBy;
            const hasKillerPlayer = (idKiller.length > 0 && idKiller != "WALL");
            let killer = null;
            if (hasKillerPlayer && game.players.has(idKiller))
                killer = game.players.get(idKiller);
            const isDoubleCollision = (killer != null) && killer.markForDead && (killer.killedBy == id);
            if (isDoubleCollision)
                computeDoubleCollision(player, killer);
        }
    }
    // apply collisions and deaths
    for (const [id, player] of game.players) {
        if (player.markForDead) {
            player.applyCollision();
            player.alive = false;
            player.markForDead = false;
        }
    }
    // remove dead players' rays if option enabled
    if (game.resetOnKilled)
        game.players.forEach((player) => {
            if (!player.alive)
                player.reset();
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
    switch (game.mode) {
        case GameMode.BODYCOUNT:
            for (const [id, player] of game.players) {
                const idKiller = player.killedBy;
                const hasKillerPlayer = (idKiller.length > 0 && idKiller != "WALL");
                let killer = null;
                if (hasKillerPlayer && game.players.has(idKiller))
                    killer = game.players.get(idKiller);
                //console.log(`Player ${id}: killed by ${idKiller}`);
                if (idKiller == id) // suicide
                 {
                    player.score = Math.max(player.score - 1, 0);
                    player.nbPointsInRound--;
                }
                else if (game.hasTeams && killer !== null && player.team == killer.team) {
                    killer.score = Math.max(player.score - 1, 0);
                    killer.nbPointsInRound--;
                }
                else if (idKiller == "WALL") {
                    // nop
                }
                else if (killer != null && idKiller.length > 0) {
                    killer.score++;
                    killer.nbPointsInRound++;
                }
                //console.log(`${player.name}: ${player.score} point(s)`);
            }
            break;
        case GameMode.SURVIVOR:
            if (game.hasTeams) {
                // get alive teams
                let teamsAlive = new Array();
                for (const [id, player] of game.players) {
                    const team = player.team;
                    if (player.alive && !teamsAlive.includes(team))
                        teamsAlive.push(team);
                }
                // update alive team's 1st player score
                if (teamsAlive.length == 1)
                    for (const [id, player] of game.players) {
                        if (player.team == teamsAlive[0]) {
                            player.score++;
                            player.nbPointsInRound++;
                            break;
                        }
                    }
            }
            else {
                for (const [id, player] of game.players) {
                    if (player.alive) {
                        player.score++;
                        player.nbPointsInRound++;
                    }
                }
            }
            break;
    }
    // display scores
    game.displayStatus = DisplayStatus_S.SCORES;
    let scoreParams = new Array();
    for (const [id, player] of game.players)
        scoreParams.push({ id: id, team: player.team, score: player.score, nbKills: player.nbPointsInRound });
    io.to(room).emit('displayScores', scoreParams);
    // check if player / teams have reached max. score
    // TODO: handle ex-aequo
    let winners = new Array();
    if (game.hasTeams) {
        // compute teams' scores
        let teamsScores = new Map();
        for (const [id, player] of game.players) {
            const team = player.team;
            if (!teamsScores.has(team))
                teamsScores.set(team, 0);
            teamsScores.set(team, teamsScores.get(team) + player.score);
        }
        for (const [team, score] of teamsScores)
            if (score >= game.nbRounds)
                winners.push(team);
    }
    else {
        for (const [id, player] of game.players)
            if (player.score >= game.nbRounds)
                winners.push(id);
    }
    if (winners.length == 0)
        setTimeout(() => { newRound(room); }, DURATION_SCORES_SCREEN * 1000);
    else
        gameOver(room, winners);
}
function newRound(room) {
    if (!games.has(room))
        return;
    const game = games.get(room);
    game.round++;
    console.log(`ROOM ${room} - ROUND ${game.round}`);
    newStadium(room);
    initPlayersPositions(room);
    initPlayersSpeeds(room);
    game.resetOnKilled = (Math.floor(100 * Math.random()) >= 50);
    game.displayStatus = DisplayStatus_S.PLAYING;
}
function newStadium(room) {
    if (!games.has(room))
        return;
    const game = games.get(room);
    game.stadium = new Array();
    const percentWallV = Math.floor(100 * Math.random());
    const percentWallH = Math.floor(100 * Math.random());
    const wallsV = (percentWallV >= 50);
    const wallsH = (percentWallH >= 50);
    ;
    if (wallsV) {
        let wallLeft1 = new Segment_S(0, 0, 0, STADIUM_H, "darkgrey");
        let wallRight1 = new Segment_S(STADIUM_W, 0, STADIUM_W, 480, "darkgrey");
        let wallLeft2 = new Segment_S(1, 0, 1, STADIUM_H, "grey");
        let wallRight2 = new Segment_S(STADIUM_W - 1, 0, STADIUM_W - 1, 480, "grey");
        game.stadium.push(wallLeft1);
        game.stadium.push(wallRight1);
        game.stadium.push(wallLeft2);
        game.stadium.push(wallRight2);
    }
    if (wallsH) {
        let wallTop1 = new Segment_S(0, 0, STADIUM_W, 0, "darkgrey");
        let wallBottom1 = new Segment_S(0, STADIUM_H, STADIUM_W, STADIUM_H, "darkgrey");
        let wallTop2 = new Segment_S(0, 1, STADIUM_W, 1, "grey");
        let wallBottom2 = new Segment_S(0, STADIUM_H - 1, STADIUM_W, STADIUM_H - 1, "grey");
        game.stadium.push(wallTop1);
        game.stadium.push(wallBottom1);
        game.stadium.push(wallTop2);
        game.stadium.push(wallBottom2);
    }
    sendStadium(room);
}
function sendStadium(room) {
    if (!games.has(room))
        return;
    const game = games.get(room);
    let stadiumParams = new Array();
    for (const wall of game.stadium)
        stadiumParams.push({ x1: wall.points[0].x, y1: wall.points[0].y, x2: wall.points[1].x, y2: wall.points[1].y, color: wall.color });
    io.to(room).emit('stadium', stadiumParams);
}
function gameOver(room, winners) {
    if (!games.has(room))
        return;
    const game = games.get(room);
    //  display game over screen
    game.displayStatus = DisplayStatus_S.GAME_OVER;
    if (game.hasTeams)
        io.to(room).emit('gameOverTeams', winners);
    else
        io.to(room).emit('gameOverPlayers', winners);
    // go back to setup page
    setTimeout(() => {
        game.status = GameStatus.SETUP;
        for (const [id, player] of game.players)
            player.ready = false;
        io.to(room).emit('displaySetup', { room: room, resetReady: true });
    }, DURATION_GAME_OVER_SCREEN * 1000);
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