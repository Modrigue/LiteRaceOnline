"use strict";
const STADIUM_W = 640;
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
const FAST_TEST_NB_PLAYERS = 2;
const FAST_TEST_NB_ROUNDS = 12;
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
        this._points[0] = new Point2_S(Math.round(x1), Math.round(y1));
        this._points[1] = new Point2_S(Math.round(x2), Math.round(y2));
        this.color = color;
    }
    get points() { return this._points; }
    set points(value) { this._points = value; }
}
class Box_S {
    constructor(x1, y1, x2, y2, color) {
        this._points = new Array(2);
        this._points[0] = new Point2_S(Math.round(x1), Math.round(y1));
        this._points[1] = new Point2_S(Math.round(x2), Math.round(y2));
        this.color = color;
    }
    get points() { return this._points; }
    set points(value) { this._points = value; }
}
class Disc_S {
    constructor(x, y, r, color) {
        this._center = new Point2(x, y);
        this._radius = r;
        this.color = color;
    }
    get center() { return this._center; }
    set center(value) { this._center = value; }
    get radius() { return this._radius; }
    set radius(value) { this._radius = value; }
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
        // disabled: diagonals too easy -> future bonus?
        // apply direction change if key control
        // if (this.up || this.down || this.left || this.right)
        // {
        //     const { dirx, diry }: { dirx: number, diry: number } = this.direction();
        //     // get last segment
        //     const nbPoints = this._points.length;
        //     const pointLast = this._points[nbPoints - 1];
        //     if (this.up && diry == 0)
        //         this.addPoint(pointLast.x, pointLast.y - this.speed);
        //     else if (this.down && diry == 0)
        //         this.addPoint(pointLast.x, pointLast.y + this.speed);
        //     else if (this.left && dirx == 0)
        //         this.addPoint(pointLast.x - this.speed, pointLast.y);
        //     else if (this.right && dirx == 0)
        //         this.addPoint(pointLast.x + this.speed, pointLast.y);
        //     this.up = this.down = this.left = this.right = false;
        //     return;
        // }
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
function collideBox(ray, box) {
    const pointLast = ray.getLastPoint();
    const xr = pointLast.x;
    const yr = pointLast.y;
    if (xr == -Infinity || yr == -Infinity)
        return false;
    for (let i = ray.speed - 1; i >= 0; i--) {
        const xrCur = xr - i * ray.direction().dirx;
        const yrCur = yr - i * ray.direction().diry;
        const collisionCur = pointInBox(xrCur, yrCur, box);
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
// returns true if point (x, y) is in box
function pointInBox(x, y, box) {
    const xMin = Math.min(box.points[0].x, box.points[1].x);
    const xMax = Math.max(box.points[0].x, box.points[1].x);
    const yMin = Math.min(box.points[0].y, box.points[1].y);
    const yMax = Math.max(box.points[0].y, box.points[1].y);
    return (xMin <= x && x <= xMax && yMin <= y && y <= yMax);
}
// returns true if point (x, y) is in disc
function pointInDisc(x, y, disc) {
    const dist = Math.sqrt((x - disc.center.x) * (y - disc.center.y) + (y - disc.center.y) * (y - disc.center.y));
    return (dist <= this.radius);
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
    keyControl() {
        const { dirx, diry } = this.direction();
        // get last segment
        const nbPoints = this.points.length;
        const pointLast = this.points[nbPoints - 1];
        let hasChangedDirection = true;
        if (this.up && diry == 0)
            this.addPoint(pointLast.x, pointLast.y - this.speed);
        else if (this.down && diry == 0)
            this.addPoint(pointLast.x, pointLast.y + this.speed);
        else if (this.left && dirx == 0)
            this.addPoint(pointLast.x - this.speed, pointLast.y);
        else if (this.right && dirx == 0)
            this.addPoint(pointLast.x + this.speed, pointLast.y);
        else
            hasChangedDirection = false;
        // check collision at direction changed
        if (hasChangedDirection)
            checkPlayerCollisions(this);
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
        this.stadiumId = "0";
        this.obstacles = new Array();
        this.compressedBlocksInit = false;
        this.compressedBlocksDateTime = 0;
        this.nbRounds = 10;
        this.roundNo = 0;
        this.roundStartDateTime = 0;
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
    game.roundNo = 0;
    game.displayStatus = DisplayStatus_S.PREPARE;
    // set prepare countdown
    for (let i = DURATION_PREPARE_SCREEN; i >= 0; i--) {
        setTimeout(() => {
            io.to(room).emit('prepareGame', { room: room, nbPlayersMax: game.nbPlayersMax,
                nbRounds: game.nbRounds, countdown: i, initDisplay: (i == DURATION_PREPARE_SCREEN) });
            // create players and start game
            if (i == 0) {
                newRound(room);
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
            }
        }, (DURATION_PREPARE_SCREEN - i) * 1000);
    }
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
    if (game.stadiumId == "0") // vanilla stadium
     {
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
    }
    else // predefined stadiums
     {
        switch (game.stadiumId) {
            case "1":
                {
                    const dy = 4;
                    const dPosy = Math.round(STADIUM_H / 32);
                    const remain = (game.nbPlayersMax % 4);
                    for (const [id, player] of game.players) {
                        const pos = (player.no % 4);
                        const bottomTop = (player.no % 2); // 0: bottom, 1: top
                        const leftRight = Math.floor((player.no % 4) / 2); // 0: left, 1: right
                        const nbPlayersInPos = (0 < pos && pos <= remain || game.nbPlayersMax <= 4) ?
                            Math.ceil(game.nbPlayersMax / 4) : Math.floor(game.nbPlayersMax / 4);
                        const noPlayerInPos = Math.floor((player.no - 1) / 4) + 1;
                        const xStart = STADIUM_W / 2;
                        let yMin = (bottomTop == 1) ? dPosy : STADIUM_H - dPosy;
                        yMin -= (nbPlayersInPos % 2 == 0) ?
                            (Math.floor(nbPlayersInPos / 2) - 0.5) * dy :
                            Math.floor(nbPlayersInPos / 2) * dy;
                        const yStart = yMin + (noPlayerInPos - 1) * dy;
                        //console.log('PLAYER ', player.no, noPlayerInSide, yMin, xStart, yStart);
                        const dx = (leftRight == 1) ? 1 : -1;
                        player.reset();
                        player.addPoint(xStart, yStart);
                        player.addPoint(xStart + dx, yStart);
                    }
                }
                break;
            case "2":
                {
                    let xLeft = 0;
                    let yTop = 0;
                    let xRight = STADIUM_W;
                    let yBottom = STADIUM_H;
                    if (STADIUM_W > STADIUM_H) {
                        xLeft = STADIUM_W / 2 - STADIUM_H / 2;
                        xRight = STADIUM_W / 2 + STADIUM_H / 2;
                    }
                    else if (STADIUM_W < STADIUM_H) {
                        yTop = STADIUM_H / 2 - STADIUM_W / 2;
                        yBottom = STADIUM_H / 2 + STADIUM_W / 2;
                    }
                    const dxy = 4;
                    const dPos = Math.round(STADIUM_H / 32);
                    const remain = (game.nbPlayersMax % 4);
                    for (const [id, player] of game.players) {
                        const dir = (player.no % 4); // right, left, up, bottom
                        const nbPlayersInPos = (0 < dir && dir <= remain || game.nbPlayersMax <= 4) ?
                            Math.ceil(game.nbPlayersMax / 4) : Math.floor(game.nbPlayersMax / 4);
                        const noPlayerInPos = Math.floor((player.no - 1) / 4) + 1;
                        let xStart = 0;
                        let yStart = 0;
                        let dx = 0;
                        let dy = 0;
                        switch (dir) {
                            case 1: // right
                                {
                                    xStart = xLeft + dPos;
                                    let yMin = yTop + dPos;
                                    yMin -= (nbPlayersInPos % 2 == 0) ?
                                        (Math.floor(nbPlayersInPos / 2) - 0.5) * dxy :
                                        Math.floor(nbPlayersInPos / 2) * dxy;
                                    yStart = yMin + (noPlayerInPos - 1) * dxy;
                                    dx = 1;
                                    break;
                                }
                            case 2: // left
                                {
                                    xStart = xRight - dPos;
                                    let yMin = yBottom - dPos;
                                    yMin -= (nbPlayersInPos % 2 == 0) ?
                                        (Math.floor(nbPlayersInPos / 2) - 0.5) * dxy :
                                        Math.floor(nbPlayersInPos / 2) * dxy;
                                    yStart = yMin + (noPlayerInPos - 1) * dxy;
                                    dx = -1;
                                    break;
                                }
                            case 3: // up
                                {
                                    let xMin = xLeft + dPos;
                                    xMin -= (nbPlayersInPos % 2 == 0) ?
                                        (Math.floor(nbPlayersInPos / 2) - 0.5) * dxy :
                                        Math.floor(nbPlayersInPos / 2) * dxy;
                                    xStart = xMin + (noPlayerInPos - 1) * dxy;
                                    yStart = yBottom - dPos;
                                    dy = -1;
                                    break;
                                }
                            case 0: // bottom
                                {
                                    let xMin = xRight - dPos;
                                    xMin -= (nbPlayersInPos % 2 == 0) ?
                                        (Math.floor(nbPlayersInPos / 2) - 0.5) * dxy :
                                        Math.floor(nbPlayersInPos / 2) * dxy;
                                    xStart = xMin + (noPlayerInPos - 1) * dxy;
                                    yStart = yTop + dPos;
                                    dy = 1;
                                    break;
                                }
                        }
                        player.reset();
                        player.addPoint(xStart, yStart);
                        player.addPoint(xStart + dx, yStart + dy);
                    }
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
    // mazes specific speeds
    switch (game.stadiumId) {
        case "1":
            speed = (percent >= 50) ? 3 : 2;
            break;
        case "2":
            speed = (percent >= 50) ? 2 : 1;
            break;
    }
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
    if (!games.has(room))
        return;
    const game = games.get(room);
    // create compressing blocks if delay passed
    if ((game.roundNo + 2) % 5 == 0) {
        const delayCompression = 3; // s
        const curDate = Date.now();
        const roundElapsedTime = curDate - game.roundStartDateTime; // ms
        if (roundElapsedTime > delayCompression * 1000)
            applyCompressingBlocks(room);
    }
    // display scores if round finished
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
        if (player.alive)
            checkPlayerCollisions(player, room);
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
function checkPlayerCollisions(player, room = "") {
    if (room == "")
        room = player.room;
    if (!games.has(player.room))
        return;
    const game = games.get(player.room);
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
    for (const obstacle of game.obstacles) {
        if (!player.markForDead)
            if (collideBox(player, obstacle)) {
                player.markForDead = true;
                player.killedBy = "WALL";
                //console.log(`PLAYER ${player.no} COLLISION OBSTACLE`);
            }
    }
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
    game.roundNo++;
    game.roundStartDateTime = Date.now();
    console.log(`ROOM ${room} - ROUND ${game.roundNo}`);
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
    game.obstacles = new Array();
    game.compressedBlocksInit = false;
    let newStadiumId = "0";
    if (game.roundNo % 10 == 0)
        newStadiumId = "2";
    else if (game.roundNo % 5 == 0)
        newStadiumId = "1";
    game.stadiumId = newStadiumId;
    switch (game.stadiumId) {
        case "0": // vanilla
            {
                const percentWallV = Math.floor(100 * Math.random());
                const percentWallH = Math.floor(100 * Math.random());
                const wallsV = (percentWallV >= 50);
                const wallsH = (percentWallH >= 50);
                ;
                if (wallsV) {
                    game.stadium.push(new Segment_S(0, 0, 0, STADIUM_H, "darkgrey"));
                    game.stadium.push(new Segment_S(STADIUM_W, 0, STADIUM_W, 480, "darkgrey"));
                    game.stadium.push(new Segment_S(1, 0, 1, STADIUM_H, "grey"));
                    game.stadium.push(new Segment_S(STADIUM_W - 1, 0, STADIUM_W - 1, 480, "grey"));
                }
                if (wallsH) {
                    game.stadium.push(new Segment_S(0, 0, STADIUM_W, 0, "darkgrey"));
                    game.stadium.push(new Segment_S(0, STADIUM_H, STADIUM_W, STADIUM_H, "darkgrey"));
                    game.stadium.push(new Segment_S(0, 1, STADIUM_W, 1, "grey"));
                    game.stadium.push(new Segment_S(0, STADIUM_H - 1, STADIUM_W, STADIUM_H - 1, "grey"));
                }
            }
            break;
        case "1": // maze 1
            {
                putWallsAround(game);
                const color = "LightGrey";
                const dx = Math.round(STADIUM_W / 2 / 8);
                const dy = Math.round(STADIUM_H / 2 / 8);
                // build per layer
                for (let i = 1; i <= 6; i++) {
                    if (i % 2 == 1) // gaps on vertical walls
                     {
                        const hGap = (1.5 - 0.5 * Math.floor(i / 2)) * dy;
                        game.stadium.push(new Segment_S(i * dx, i * dy, STADIUM_W - i * dx, i * dy, color));
                        game.stadium.push(new Segment_S(i * dx, STADIUM_H - i * dy, STADIUM_W - i * dx, STADIUM_H - i * dy, color));
                        game.stadium.push(new Segment_S(i * dx, STADIUM_H / 2 - hGap, i * dx, i * dy, color));
                        game.stadium.push(new Segment_S(i * dx, STADIUM_H / 2 + hGap, i * dx, STADIUM_H - i * dy, color));
                        game.stadium.push(new Segment_S(STADIUM_W - i * dx, STADIUM_H / 2 - hGap, STADIUM_W - i * dx, i * dy, color));
                        game.stadium.push(new Segment_S(STADIUM_W - i * dx, STADIUM_H / 2 + hGap, STADIUM_W - i * dx, STADIUM_H - i * dy, color));
                    }
                    else // gaps on horizontal walls
                     {
                        const wGap = (1.5 - 0.5 * Math.floor((i - 1) / 2)) * dx;
                        game.stadium.push(new Segment_S(i * dx, i * dy, i * dx, STADIUM_H - i * dy, color));
                        game.stadium.push(new Segment_S(STADIUM_W - i * dx, i * dy, STADIUM_W - i * dx, STADIUM_H - i * dy, color));
                        game.stadium.push(new Segment_S(i * dx, i * dy, STADIUM_W / 2 - wGap, i * dy, color));
                        game.stadium.push(new Segment_S(STADIUM_W / 2 + wGap, i * dy, STADIUM_W - i * dx, i * dy, color));
                        game.stadium.push(new Segment_S(i * dx, STADIUM_H - i * dy, STADIUM_W / 2 - wGap, STADIUM_H - i * dy, color));
                        game.stadium.push(new Segment_S(STADIUM_W / 2 + wGap, STADIUM_H - i * dy, STADIUM_W - i * dx, STADIUM_H - i * dy, color));
                    }
                }
                // last layer
                game.stadium.push(new Segment_S(7 * dx, 7 * dy, STADIUM_W - 7 * dx, 7 * dy, color));
                game.stadium.push(new Segment_S(7 * dx, STADIUM_H - 7 * dy, STADIUM_W - 7 * dx, STADIUM_H - 7 * dy, color));
            }
            break;
        case "2": // maze 2
            {
                putWallsAround(game);
                const color = "LightGrey";
                let xMin = 0;
                let yMin = 0;
                let xMax = STADIUM_W;
                let yMax = STADIUM_H;
                if (STADIUM_W > STADIUM_H) {
                    xMin = STADIUM_W / 2 - STADIUM_H / 2;
                    xMax = STADIUM_W / 2 + STADIUM_H / 2;
                    game.stadium.push(new Segment_S(xMin, 0, xMin, STADIUM_H, color));
                    game.stadium.push(new Segment_S(xMax, 0, xMax, STADIUM_H, color));
                }
                else if (STADIUM_W < STADIUM_H) {
                    yMin = STADIUM_H / 2 - STADIUM_W / 2;
                    yMax = STADIUM_H / 2 + STADIUM_W / 2;
                    game.stadium.push(new Segment_S(0, yMin, STADIUM_W, xMax, color));
                    game.stadium.push(new Segment_S(0, yMin, STADIUM_W, xMax, color));
                }
                const w = Math.min(STADIUM_W, STADIUM_H);
                let dxy = Math.round(w / 2 / 8);
                const rGap = 2 / 3;
                // build per layer
                let xLeft = xMin;
                let xRight = xMax;
                let yTop = yMin;
                let yBottom = yMax;
                let wCur = w;
                for (let i = 1; i <= 4; i++) {
                    xLeft = xMin + i * dxy;
                    xRight = xMax - i * dxy;
                    yTop = yMin + i * dxy;
                    yBottom = yMax - i * dxy;
                    wCur = w - 2 * i * dxy;
                    const wGap = (3 - 0.5 * i) * dxy;
                    const rGapCur = (i % 2 == 1) ? rGap : (1 - rGap);
                    // top
                    game.stadium.push(new Segment_S(xLeft, yTop, xLeft + rGapCur * wCur - wGap / 2, yTop, color));
                    game.stadium.push(new Segment_S(xLeft + rGapCur * wCur + wGap / 2, yTop, xRight, yTop, color));
                    // bottom
                    game.stadium.push(new Segment_S(xLeft, yBottom, xLeft + (1 - rGapCur) * wCur - wGap / 2, yBottom, color));
                    game.stadium.push(new Segment_S(xLeft + (1 - rGapCur) * wCur + wGap / 2, yBottom, xRight, yBottom, color));
                    // left
                    game.stadium.push(new Segment_S(xLeft, yTop, xLeft, yTop + (1 - rGapCur) * wCur - wGap / 2, color));
                    game.stadium.push(new Segment_S(xLeft, yTop + (1 - rGapCur) * wCur + wGap / 2, xLeft, yBottom, color));
                    // right
                    game.stadium.push(new Segment_S(xRight, yTop, xRight, yTop + rGapCur * wCur - wGap / 2, color));
                    game.stadium.push(new Segment_S(xRight, yTop + rGapCur * wCur + wGap / 2, xRight, yBottom, color));
                }
                // central walls
                const wWall1 = 0.35 * wCur;
                game.stadium.push(new Segment_S((xLeft + xRight) / 2, yTop, (xLeft + xRight) / 2 - wWall1, yTop + wWall1, color));
                game.stadium.push(new Segment_S((xLeft + xRight) / 2, yBottom, (xLeft + xRight) / 2 + wWall1, yBottom - wWall1, color));
                game.stadium.push(new Segment_S(xLeft, (yTop + yBottom) / 2, xLeft + wWall1, (yTop + yBottom) / 2 + wWall1, color));
                game.stadium.push(new Segment_S(xRight, (yTop + yBottom) / 2, xRight - wWall1, (yTop + yBottom) / 2 - wWall1, color));
                const wWall2 = 0.2 * wCur;
                game.stadium.push(new Segment_S((xLeft + xRight) / 2 - dxy, yTop + dxy, (xLeft + xRight) / 2 - dxy + wWall2, yTop + dxy + wWall2, color));
                game.stadium.push(new Segment_S((xLeft + xRight) / 2 + dxy, yBottom - dxy, (xLeft + xRight) / 2 + dxy - wWall2, yBottom - dxy - wWall2, color));
                game.stadium.push(new Segment_S(xLeft + dxy, (yTop + yBottom) / 2 + dxy, xLeft + dxy + wWall2, (yTop + yBottom) / 2 + dxy - wWall2, color));
                game.stadium.push(new Segment_S(xRight - dxy, (yTop + yBottom) / 2 - dxy, xRight - dxy - wWall2, (yTop + yBottom) / 2 - dxy + wWall2, color));
            }
            break;
    }
    sendStadium(room);
    sendObstacles(room);
}
function putWallsAround(game) {
    // left
    game.stadium.push(new Segment_S(0, 0, 0, STADIUM_H, "darkgrey"));
    game.stadium.push(new Segment_S(1, 0, 1, STADIUM_H, "grey"));
    // right
    game.stadium.push(new Segment_S(STADIUM_W, 0, STADIUM_W, 480, "darkgrey"));
    game.stadium.push(new Segment_S(STADIUM_W - 1, 0, STADIUM_W - 1, 480, "grey"));
    // top
    game.stadium.push(new Segment_S(0, 0, STADIUM_W, 0, "darkgrey"));
    game.stadium.push(new Segment_S(0, 1, STADIUM_W, 1, "grey"));
    // bottom
    game.stadium.push(new Segment_S(0, STADIUM_H, STADIUM_W, STADIUM_H, "darkgrey"));
    game.stadium.push(new Segment_S(0, STADIUM_H - 1, STADIUM_W, STADIUM_H - 1, "grey"));
}
function sendStadium(room) {
    if (!games.has(room))
        return;
    const game = games.get(room);
    let params = new Array();
    for (const wall of game.stadium)
        params.push({ x1: wall.points[0].x, y1: wall.points[0].y, x2: wall.points[1].x, y2: wall.points[1].y, color: wall.color });
    io.to(room).emit('stadium', params);
}
function newObstacles(room) {
    if (!games.has(room))
        return;
    const game = games.get(room);
    let obstacles = new Array();
    // create obstacles
    game.obstacles = obstacles;
    sendObstacles(room);
}
function applyCompressingBlocks(room) {
    if (!games.has(room))
        return;
    const game = games.get(room);
    if (!game.compressedBlocksInit) {
        // create blocks
        let obstacles = new Array();
        // top, bottom, left, right
        const color = "lightgrey";
        obstacles.push(new Box_S(0, 0, STADIUM_W, 0, color));
        obstacles.push(new Box_S(0, STADIUM_H, STADIUM_W, STADIUM_H, color));
        obstacles.push(new Box_S(0, 0, 0, STADIUM_H, color));
        obstacles.push(new Box_S(STADIUM_W, 0, STADIUM_W, STADIUM_H, color));
        game.obstacles = obstacles;
        game.compressedBlocksInit = true;
        game.compressedBlocksDateTime = Date.now();
    }
    else {
        // update blocks
        const speedRef = 2;
        const speed = Math.round(speedRef * Math.min(STADIUM_H, STADIUM_H) / 100); // pixels / s
        const elapsedTime = Date.now() - game.compressedBlocksDateTime;
        if (game.obstacles.length >= 4) {
            game.obstacles[0].points[1].y = Math.floor(speed * elapsedTime / 1000);
            game.obstacles[1].points[1].y = STADIUM_H - Math.floor(speed * elapsedTime / 1000);
            game.obstacles[2].points[1].x = Math.floor(speed * elapsedTime / 1000);
            game.obstacles[3].points[1].x = STADIUM_W - Math.floor(speed * elapsedTime / 1000);
        }
    }
    sendObstacles(room);
}
function sendObstacles(room) {
    if (!games.has(room) && true)
        return;
    const game = games.get(room);
    let params = new Array();
    for (const obs of game.obstacles)
        params.push({ x1: obs.points[0].x, y1: obs.points[0].y, x2: obs.points[1].x, y2: obs.points[1].y, color: obs.color });
    io.to(room).emit('obstacles', params);
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