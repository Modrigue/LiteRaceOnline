"use strict";
const STADIUM_W = 640;
const STADIUM_H = 360;
const DURATION_PREPARE_SCREEN = 3; // in s
const DURATION_SCORES_SCREEN = 2.5;
const DURATION_GAME_OVER_SCREEN = 10;
const DURATION_PLAYER_INIT = 0.4;
const RADIUS_PLAYER_INIT = 100;
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
const FAST_TEST_NB_ROUNDS = 15;
const FAST_TEST_HAS_TEAMS = false;
// TODO: refactor in separate files
//////////////////////////////// GEOMETRY ENGINE //////////////////////////////
class Point2_S {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
}
class Segment_S {
    constructor(x1, y1, x2, y2, color = "black") {
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
    constructor(x, y, r, color = "white") {
        this._center = new Point2_S(x, y);
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
        this.fastTurn = false;
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
        // fast turn: apply direct direction change if key control
        if (this.fastTurn)
            if (this.up || this.down || this.left || this.right) {
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
                this.up = this.down = this.left = this.right = false;
                return;
            }
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
            this.addPoint(STADIUM_W + 1, pointLast.y);
            this.addPoint(STADIUM_W + 1 - dx, pointLast.y);
            return true;
        }
        else if (pointLast.x > STADIUM_W) {
            const dx = Math.min(1, Math.abs(pointLast.x - STADIUM_W));
            this.addPoint(Infinity, Infinity); // hole
            this.addPoint(-1, pointLast.y);
            this.addPoint(-1 + dx, pointLast.y);
            return true;
        }
        else if (pointLast.y < 0) {
            const dy = Math.min(1, Math.abs(0 - pointLast.y));
            this.addPoint(Infinity, Infinity); // hole
            this.addPoint(pointLast.x, STADIUM_H + 1);
            this.addPoint(pointLast.x, STADIUM_H + 1 - dy);
            return true;
        }
        else if (pointLast.y > STADIUM_H) {
            const dy = Math.min(1, Math.abs(pointLast.y - STADIUM_H));
            this.addPoint(Infinity, Infinity); // hole
            this.addPoint(pointLast.x, -1);
            this.addPoint(pointLast.x, -1 + dy);
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
    removeSegment(segment) {
        // get segment points index in player's segments
        let index = -1;
        let pointPrev = new Point2_S(-Infinity, -Infinity);
        for (const point of this._points) {
            if (pointPrev.x == segment.points[0].x && pointPrev.y == segment.points[0].y
                && point.x == segment.points[1].x && point.y == segment.points[1].y)
                break; // points found
            pointPrev.x = point.x;
            pointPrev.y = point.y;
            index++;
        }
        if (index < 0)
            return;
        //console.log("remove player segment", index);
        const nbPlayerSegments = this._points.length - 1;
        // if segment is player's last, reset segment to head
        if (index == nbPlayerSegments - 1 && this.alive) {
            const lastPoint = this.getLastPoint();
            const dir = this.direction();
            // insert hole
            this._points.splice(index + 1, 0, new Point2_S(-Infinity, -Infinity));
            this.addPoint(lastPoint.x, lastPoint.y);
            this.addPoint(lastPoint.x + dir.dirx, lastPoint.y + dir.diry);
        }
        // else if player player is first segment, delete first point
        else if (index == 0)
            this._points.shift();
        // else insert hole between segment points
        else if (index < this._points.length - 1)
            this._points.splice(index + 1, 0, new Point2_S(-Infinity, -Infinity));
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
function collideDisc(ray, disc) {
    const pointLast = ray.getLastPoint();
    const xr = pointLast.x;
    const yr = pointLast.y;
    if (xr == -Infinity || yr == -Infinity)
        return false;
    for (let i = ray.speed - 1; i >= 0; i--) {
        const xrCur = xr - i * ray.direction().dirx;
        const yrCur = yr - i * ray.direction().diry;
        const collisionCur = pointInDisc(xrCur, yrCur, disc);
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
    const dist = Math.sqrt((x - disc.center.x) * (x - disc.center.x) + (y - disc.center.y) * (y - disc.center.y));
    return (dist <= disc.radius);
}
function collideRay(ray1, ray2) {
    let collidedSegments = new Array();
    const pointLast = ray1.getLastPoint();
    const xr = pointLast.x;
    const yr = pointLast.y;
    if (xr == -Infinity || yr == -Infinity)
        return collidedSegments;
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
                    collidedSegments.push(new Segment_S(pointPrev.x, pointPrev.y, pointCur.x, pointCur.y));
            }
        }
        pointPrev.x = pointCur.x;
        pointPrev.y = pointCur.y;
        index++;
    }
    return collidedSegments;
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
        this.markForItem = false;
        this.frozen = false;
        this.frozenDateTime = 0;
        this.invincible = false;
        this.invincibleDateTime = 0;
        this.jumping = false;
        this.jumpingDateTime = 0;
        this.jumpingPoint = new Point2_S(-Infinity, -Infinity);
        this.jumpingDirection = { dirx: 0, diry: 0 };
        this.boosting = false;
        this.boostingDateTime = 0;
        this.bulldozing = false;
        this.bulldozingDateTime = 0;
        this.itemsTaken = new Array();
    }
    jumpToNextPoint() {
        if (this.jumpingPoint.x === -Infinity || this.jumpingPoint.y === -Infinity)
            return;
        this.jumpingPoint.x += this.speed * this.jumpingDirection.dirx;
        this.jumpingPoint.y += this.speed * this.jumpingDirection.diry;
    }
    keyControl() {
        // if fast turn, handlded in extendsToNextPoint
        if (this.fastTurn || this.jumping)
            return;
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
        // apply item action
        if (this.action) {
            applyPlayerItemAction(this.room, this);
            this.action = false;
        }
    }
}
var ItemScope;
(function (ItemScope) {
    ItemScope[ItemScope["NONE"] = 0] = "NONE";
    ItemScope[ItemScope["ALL"] = 1] = "ALL";
    ItemScope[ItemScope["PLAYER"] = 2] = "PLAYER";
    ItemScope[ItemScope["ENEMIES"] = 3] = "ENEMIES";
    ItemScope[ItemScope["UNKNOWN"] = 4] = "UNKNOWN";
})(ItemScope || (ItemScope = {}));
;
var ItemType;
(function (ItemType) {
    ItemType[ItemType["NONE"] = 0] = "NONE";
    ItemType[ItemType["SPEED_INCREASE"] = 1] = "SPEED_INCREASE";
    ItemType[ItemType["SPEED_DECREASE"] = 2] = "SPEED_DECREASE";
    ItemType[ItemType["COMPRESSION"] = 3] = "COMPRESSION";
    ItemType[ItemType["RESET"] = 4] = "RESET";
    ItemType[ItemType["RESET_REVERSE"] = 5] = "RESET_REVERSE";
    ItemType[ItemType["FREEZE"] = 6] = "FREEZE";
    ItemType[ItemType["FAST_TURN"] = 7] = "FAST_TURN";
    ItemType[ItemType["INVINCIBILITY"] = 8] = "INVINCIBILITY";
    ItemType[ItemType["JUMP"] = 9] = "JUMP";
    ItemType[ItemType["BOOST"] = 10] = "BOOST";
    ItemType[ItemType["BULLDOZER"] = 11] = "BULLDOZER";
    ItemType[ItemType["UNKNOWN"] = 12] = "UNKNOWN";
})(ItemType || (ItemType = {}));
;
class Item extends Disc_S {
    constructor() {
        super(...arguments);
        this.scope = ItemScope.NONE;
        this.type = ItemType.NONE;
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
    DisplayStatus_S[DisplayStatus_S["INIT_POSITIONS"] = 2] = "INIT_POSITIONS";
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
        this.stadiumId = MAZE.NONE;
        this.obstacles = new Array();
        this.bulldozedWalls = new Array();
        this.bulldozedPlayersSegments = new Map();
        this.bulldozerFirstItemTaken = false;
        this.compressionInit = false;
        this.compressionSpeed = 0;
        this.compressionStartDateTime = 0;
        this.items = new Array();
        this.itemAppearedDateTime = 0;
        this.nbRounds = 10;
        this.roundNo = 0;
        this.roundInitDateTime = 0;
        this.roundStartDateTime = 0;
        this.resetOnKilled = false;
        this.password = "";
        this.status = GameStatus.NONE;
        this.displayStatus = DisplayStatus_S.NONE;
    }
}
var MAZE;
(function (MAZE) {
    MAZE[MAZE["NONE"] = 0] = "NONE";
    MAZE[MAZE["MAZE_INSIDE_1"] = 1] = "MAZE_INSIDE_1";
    MAZE[MAZE["MAZE_INSIDE_2"] = 2] = "MAZE_INSIDE_2";
    MAZE[MAZE["MAZE_OUTSIDE_1"] = 3] = "MAZE_OUTSIDE_1";
})(MAZE || (MAZE = {}));
;
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
                    break;
                case GameStatus.PLAYING:
                    // join started game
                    console.log(`Client '${socket.id}' joins started game '${room}'`);
                    playNewGame(room);
                    break;
                default:
                    // for tests only
                    if (FAST_TEST_ON) {
                        game.status = GameStatus.PLAYING;
                        playNewGame(room);
                    }
                    break;
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
        // no input if player jumping
        if (player.jumping) {
            player.left = player.up = player.right = player.down = false;
            player.action = false;
            return;
        }
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
            // create players for clients and start game
            if (i == 0) {
                let playerParams = Array();
                for (const [id, player] of game.players) {
                    player.score = player.nbPointsInRound = 0;
                    player.killedBy = "";
                    player.itemsTaken = new Array();
                    if (!game.hasTeams)
                        player.team = ""; // secure
                    // for fast test only
                    if (FAST_TEST_ON) {
                        const playersColors = ["#ffff00", "#4444ff", "#ff4444", "#00ff00", "#ffff88", "#8888ff", "#ff8888", "#88ff88"];
                        player.color = playersColors[(player.no - 1) % playersColors.length];
                        player.name = `Player ${player.no}`;
                        if (FAST_TEST_HAS_TEAMS)
                            player.team = (player.no % 2 == 1) ? "Team 1" : "Team 2";
                    }
                    playerParams.push({ id: id, name: player.name, color: player.color });
                }
                io.to(room).emit('createPlayers', playerParams);
                newRound(room);
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
    const percent = Math.floor(100 * Math.random());
    let positioning = Math.floor(percent / 25) + 1;
    // foce reverse around for outside mazes
    if (game.stadiumId == MAZE.MAZE_OUTSIDE_1)
        positioning = 4;
    // prevent around if high speed
    else if (game.roundNo % 10 == 6 && positioning == 3)
        positioning = 2;
    // init positions
    if (game.stadiumId == MAZE.NONE
        || game.stadiumId == MAZE.MAZE_OUTSIDE_1) {
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
                        else // top / bottom
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
            case MAZE.MAZE_INSIDE_1:
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
            case MAZE.MAZE_INSIDE_2:
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
        // reset items data
        player.markForItem = false;
        player.fastTurn = false;
        player.frozen = false;
        player.frozenDateTime = 0;
        player.invincible = false;
        player.invincibleDateTime = 0;
        player.jumping = false;
        player.jumpingDateTime = 0;
        player.boosting = false;
        player.boostingDateTime = 0;
        player.bulldozing = false;
        player.bulldozingDateTime = 0;
        player.itemsTaken = new Array();
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
    // set high speed every 10 rounds
    if (game.roundNo % 10 == 6)
        speed = 5;
    // mazes specific speeds
    switch (game.stadiumId) {
        case MAZE.MAZE_INSIDE_1:
            speed = (percent >= 50) ? 3 : 2;
            break;
        case MAZE.MAZE_INSIDE_2:
            speed = (percent >= 50) ? 2 : 1;
            break;
        case MAZE.MAZE_OUTSIDE_1:
            speed = 1;
            break;
    }
    for (const [id, player] of game.players)
        player.speed = speed;
}
/////////////////////////////////////// LOOPS /////////////////////////////////
function serverLoop() {
    // send players positions to clients
    for (const [room, game] of games) {
        if (game.status != GameStatus.PLAYING)
            continue;
        switch (game.displayStatus) {
            case DisplayStatus_S.INIT_POSITIONS:
                displayInitPositions(room);
                break;
            case DisplayStatus_S.PLAYING:
                // game loop
                userInteraction(room);
                physicsLoop(room);
                gameLogic(room);
                // client render
                for (let [id, player] of game.players) {
                    let color = player.color;
                    // special colors given player's state
                    if (player.frozen)
                        color = "white";
                    else if (player.invincible)
                        color = getRandomElement(["violet", "indigo", "blue", "cyan", "green", "yellow", "orange", "red"]);
                    else if (player.bulldozing)
                        color = getRandomElement(["violet", "indigo", "blue", "cyan", "green", "yellow", "orange", "red", "white"]);
                    else if (player.boosting)
                        color = getRandomElement([player.color, "dimgray", "grey"]);
                    io.to(room).emit('updatePlayersPositions', { id: id, points: player.points, color: color });
                }
                break;
        }
    }
}
function displayInitPositions(room) {
    if (!games.has(room))
        return;
    const game = games.get(room);
    if (game.players === null || game.players.size == 0)
        return;
    const elapsedTimeInit = Date.now() - game.roundInitDateTime; // ms
    // get player with current number
    let initParams = new Array();
    const noCur = Math.floor(elapsedTimeInit / (DURATION_PLAYER_INIT * 1000)) + 1;
    let playerCur = null;
    let idCur = "";
    for (let i = 1; i <= noCur; i++) {
        let playerWithNo = null;
        let idWithNo = "";
        for (let [id, player] of game.players)
            if (player.no == i) {
                playerWithNo = player;
                idWithNo = id;
                break;
            }
        if (playerWithNo == null)
            continue;
        if (i == noCur) {
            playerCur = playerWithNo;
            idCur = idWithNo;
        }
        else if (i < noCur) {
            // add already positionned player
            const startPoint = playerWithNo.points[0];
            initParams.push({ id: idWithNo, x: startPoint.x, y: startPoint.y, r: 1, color: playerWithNo.color });
        }
    }
    // get current player's start point and current radius
    if (playerCur !== null) {
        const elapsedTimePlayerInit = Date.now() - game.roundInitDateTime - DURATION_PLAYER_INIT * (playerCur.no - 1) * 1000; // ms
        const startPoint = playerCur.points[0];
        let r = (elapsedTimePlayerInit < DURATION_PLAYER_INIT * 1000) ?
            RADIUS_PLAYER_INIT - RADIUS_PLAYER_INIT * (elapsedTimePlayerInit / (DURATION_PLAYER_INIT * 1000)) : 1;
        //console.log(noCur, elapsedTimePlayerInit);
        initParams.push({ id: idCur, x: startPoint.x, y: startPoint.y, r: r, color: playerCur.color });
    }
    io.to(room).emit('initPlayersPositions', initParams);
}
function gameLogic(room) {
    if (!games.has(room))
        return;
    const game = games.get(room);
    // create / delete random items
    updateItems(room);
    // update compression if started
    if (game.compressionInit)
        updateCompression(room);
    // init compression if delay passed / maze
    const delayCompressionMax = 75; // s
    const curDate = Date.now();
    const roundElapsedTime = curDate - game.roundStartDateTime; // ms
    if ((game.roundNo % 30 == 20) && game.stadiumId == MAZE.MAZE_INSIDE_1) {
        const delayCompression = 2.5; // s
        if (roundElapsedTime > delayCompression * 1000)
            initCompression(room, 1.2);
    }
    else if (game.roundNo % 5 == 3) {
        const delayCompression = 3 + 3 * Math.random(); // s
        if (roundElapsedTime > delayCompression * 1000)
            initCompression(room);
    }
    else if (!game.compressionInit) // force compression after max. delay
     {
        if (roundElapsedTime > delayCompressionMax * 1000)
            initCompression(room);
    }
    // un-freeze frozen players if delay passed
    const delayFrozen = 4; // s
    for (const [id, player] of game.players)
        if (player.frozen)
            if (Date.now() - player.frozenDateTime >= delayFrozen * 1000) {
                player.frozen = false;
                player.frozenDateTime = 0;
            }
    // finish invincibility if delay passed
    const delayInvincibility = 5; // s
    for (const [id, player] of game.players)
        if (player.invincible)
            if (Date.now() - player.invincibleDateTime >= delayInvincibility * 1000) {
                player.invincible = false;
                player.invincibleDateTime = 0;
            }
    // finish bulldozer if delay passed
    const delayBulldozer = 6; // s
    for (const [id, player] of game.players)
        if (player.bulldozing)
            if (Date.now() - player.bulldozingDateTime >= delayBulldozer * 1000) {
                player.bulldozing = false;
                player.bulldozingDateTime = 0;
            }
    // finish jump if delay passed
    const delayJump = 0.5; // s
    for (const [id, player] of game.players)
        if (player.jumping)
            if (Date.now() - player.jumpingDateTime >= delayJump * 1000) {
                // landing
                player.addPoint(player.jumpingPoint.x, player.jumpingPoint.y);
                player.addPoint(player.jumpingPoint.x + player.speed * player.jumpingDirection.dirx, player.jumpingPoint.y + player.speed * player.jumpingDirection.diry);
                // reset jump properties
                player.jumping = false;
                player.jumpingDateTime = 0;
                player.jumpingDirection = { dirx: 0, diry: 0 };
                player.jumpingPoint.x = -Infinity;
                player.jumpingPoint.y = -Infinity;
            }
    // finish boost if delay passed
    const delayBoost = 5; // s
    for (const [id, player] of game.players)
        if (player.boosting)
            if (Date.now() - player.boostingDateTime >= delayBoost * 1000) {
                // back to previous speed
                player.speed = Math.max(Math.round(player.speed / 2), 1);
                // reset boost properties
                player.boosting = false;
                player.boostingDateTime = 0;
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
    // extend / jump to next point
    game.players.forEach((player) => {
        if (player.alive && !player.frozen && !player.jumping)
            player.extendsToNextPoint();
        else if (player.alive && player.jumping)
            player.jumpToNextPoint();
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
    // apply collisions, deaths and items
    let itemTaken = false;
    for (const [id, player] of game.players) {
        if (player.markForDead) {
            player.applyCollision();
            player.alive = false;
            player.markForDead = false;
            //io.to(room).emit('collision', {id: id});
        }
        if (player.markForItem && game.items.length > 0) {
            const item = game.items[0];
            applyItemTaken(room, player, item);
            itemTaken = true;
            player.markForItem = false;
        }
    }
    if (itemTaken)
        removeItem(room);
    // remove dead players' rays if option enabled
    if (game.resetOnKilled)
        game.players.forEach((player) => {
            if (!player.alive)
                player.reset();
        });
    // remove bulldozed walls
    if (game.bulldozedWalls && game.bulldozedWalls.length > 0) {
        for (const wall of game.bulldozedWalls) {
            if (game.stadium.includes(wall))
                game.stadium.forEach((segment, index) => {
                    if (segment === wall)
                        game.stadium.splice(index, 1);
                });
        }
        sendStadium(room);
        game.bulldozedWalls = new Array();
    }
    // remove bulldozed players' segments
    if (game.bulldozedPlayersSegments && game.bulldozedPlayersSegments.size > 0) {
        for (const [id, player] of game.players) {
            if (game.bulldozedPlayersSegments.has(id)) {
                const collidedSegments = game.bulldozedPlayersSegments.get(id);
                for (const segment of collidedSegments)
                    player.removeSegment(segment);
            }
        }
        game.bulldozedPlayersSegments = new Map();
    }
}
function checkPlayerCollisions(player, room = "") {
    if (room == "")
        room = player.room;
    if (!games.has(player.room))
        return;
    const game = games.get(player.room);
    // no collisions / items taken if jumping
    if (player.jumping)
        return;
    // if player boosting, 1 chance out of 2 to collide
    const boostingCollides = (100 * Math.random() > 50);
    // check deadly collisions if player not invicible / boosting
    const checkCollisions = !(player.invincible || (player.boosting && !boostingCollides));
    // players
    for (const [id, otherPlayer] of game.players) {
        if (!checkCollisions)
            continue;
        const collidedSegments = collideRay(player, otherPlayer);
        if (collidedSegments && collidedSegments.length > 0) {
            if (player.bulldozing) {
                // if player bulldozing, add wall to bulldozed walls list
                if (!game.bulldozedPlayersSegments.has(id))
                    game.bulldozedPlayersSegments.set(id, collidedSegments);
            }
            else {
                player.markForDead = true;
                player.killedBy = id;
                //console.log(`PLAYER ${player.no} COLLISION RAY`);
            }
        }
    }
    // stadium
    for (const wall of game.stadium) {
        if (checkCollisions && !player.markForDead)
            if (collideSegment(player, wall.points[0].x, wall.points[0].y, wall.points[1].x, wall.points[1].y)) {
                if (player.bulldozing) {
                    // if player bulldozing, add wall to bulldozed walls list
                    if (!game.bulldozedWalls.includes(wall))
                        game.bulldozedWalls.push(wall);
                }
                else {
                    player.markForDead = true;
                    player.killedBy = "WALL";
                    //console.log(`PLAYER ${player.no} COLLISION WALL`);
                }
            }
    }
    // obstacles
    for (const obstacle of game.obstacles) {
        if (checkCollisions && !player.markForDead)
            if (collideBox(player, obstacle)) {
                player.markForDead = true;
                player.killedBy = "WALL";
                //console.log(`PLAYER ${player.no} COLLISION OBSTACLE`);
            }
    }
    // items
    let itemTaken = false;
    for (const item of game.items) {
        if (collideDisc(player, item)) {
            player.markForItem = true;
            console.log(`PLAYER ${player.no} GET ITEM`);
        }
    }
    if (itemTaken)
        removeItem(room);
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
    game.roundInitDateTime = Date.now();
    console.log(`ROOM ${room} - ROUND ${game.roundNo}`);
    // prepare new round data
    newStadium(room);
    initPlayersPositions(room);
    initPlayersSpeeds(room);
    game.resetOnKilled = (Math.floor(100 * Math.random()) >= 50);
    // display players' positions
    game.displayStatus = DisplayStatus_S.INIT_POSITIONS;
    // start round
    setTimeout(() => {
        io.to(room).emit('startRound', null);
        game.roundStartDateTime = Date.now();
        game.displayStatus = DisplayStatus_S.PLAYING;
    }, (game.nbPlayersMax * DURATION_PLAYER_INIT + 0.2) * 1000);
}
function newStadium(room) {
    if (!games.has(room))
        return;
    const game = games.get(room);
    game.stadium = new Array();
    game.bulldozedWalls = new Array();
    game.bulldozerFirstItemTaken = false;
    game.obstacles = new Array();
    game.items = new Array();
    game.compressionInit = false;
    // set maze every 5 rounds
    let newStadiumId = MAZE.NONE;
    switch (game.roundNo % 15) {
        case 5:
            newStadiumId = MAZE.MAZE_INSIDE_1;
            break;
        case 10:
            newStadiumId = MAZE.MAZE_OUTSIDE_1;
            break;
        case 0:
            newStadiumId = MAZE.MAZE_INSIDE_2;
            break;
    }
    // create stadium walls
    game.stadiumId = newStadiumId;
    switch (game.stadiumId) {
        case MAZE.NONE: // vanilla
            {
                const percentWallV = Math.floor(100 * Math.random());
                const percentWallH = Math.floor(100 * Math.random());
                const wallsV = (percentWallV >= 50);
                const wallsH = (percentWallH >= 50);
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
        case MAZE.MAZE_INSIDE_1:
            {
                putWallsAround(game);
                const colors = ["DimGray", "Gray", "DarkGray", "Silver", "LightGrey", "Gainsboro"];
                const dx = Math.round(STADIUM_W / 2 / 8);
                const dy = Math.round(STADIUM_H / 2 / 8);
                // build per layer
                for (let i = 1; i <= 6; i++) {
                    const color = colors[i - 1];
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
                const color = "white";
                game.stadium.push(new Segment_S(7 * dx, 7 * dy, STADIUM_W - 7 * dx, 7 * dy, color));
                game.stadium.push(new Segment_S(7 * dx, STADIUM_H - 7 * dy, STADIUM_W - 7 * dx, STADIUM_H - 7 * dy, color));
            }
            break;
        case MAZE.MAZE_INSIDE_2:
            {
                putWallsAround(game);
                let xMin = 0;
                let yMin = 0;
                let xMax = STADIUM_W;
                let yMax = STADIUM_H;
                const color = "white";
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
                const colors = ["Gray", "DarkGray", "LightGrey", "Gainsboro"];
                // build per layer
                let xLeft = xMin;
                let xRight = xMax;
                let yTop = yMin;
                let yBottom = yMax;
                let wCur = w;
                for (let i = 1; i <= 4; i++) {
                    const color = colors[i - 1];
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
        case MAZE.MAZE_OUTSIDE_1:
            putWallsAround(game);
            const w = Math.min(STADIUM_W, STADIUM_H);
            const xc = STADIUM_W / 2;
            const yc = STADIUM_H / 2;
            // start on top and take it as reference for rotation
            for (let a = 0; a < 2 * Math.PI; a += Math.PI / 2) {
                // 1st layer: cross
                let color = "LightGrey";
                let dxT1 = 0;
                let dyT1 = -80;
                let dxy1 = rotate(dxT1, dyT1, a);
                let dxT1a = -40;
                let dyT1a = -120;
                let dxy1a = rotate(dxT1a, dyT1a, a);
                let dxT1b = +40;
                let dyT1b = -120;
                let dxy1b = rotate(dxT1b, dyT1b, a);
                game.stadium.push(new Segment_S(xc + dxy1.dx, yc + dxy1.dy, xc + dxy1a.dx, yc + dxy1a.dy, color));
                game.stadium.push(new Segment_S(xc + dxy1.dx, yc + dxy1.dy, xc + dxy1b.dx, yc + dxy1b.dy, color));
                // 2nd layers
                color = "DarkGray";
                let dxT2a = dxT1a - 20;
                let dyT2a = dyT1a - 20;
                let dxy2a = rotate(dxT2a, dyT2a, a);
                let dxT2aa = dxT2a - 20;
                let dyT2aa = dyT2a + 20;
                let dxy2aa = rotate(dxT2aa, dyT2aa, a);
                let dxT2ab = dxT2a + 20;
                let dyT2ab = dyT2a - 20;
                let dxy2ab = rotate(dxT2ab, dyT2ab, a);
                game.stadium.push(new Segment_S(xc + dxy2aa.dx, yc + dxy2aa.dy, xc + dxy2ab.dx, yc + dxy2ab.dy, color));
                let dxT2b = dxT1b + 20;
                let dyT2b = dyT1b - 20;
                let dxy2b = rotate(dxT2b, dyT2b, a);
                let dxT2ba = dxT2b + 20;
                let dyT2ba = dyT2b + 20;
                let dxy2ba = rotate(dxT2ba, dyT2ba, a);
                let dxT2bb = dxT2b - 20;
                let dyT2bb = dyT2b - 20;
                let dxy2bb = rotate(dxT2bb, dyT2bb, a);
                game.stadium.push(new Segment_S(xc + dxy2ba.dx, yc + dxy2ba.dy, xc + dxy2bb.dx, yc + dxy2bb.dy, color));
                // 3rd layer
                color = "Gray";
                let dxT3a = 0;
                let dyT3a = -280;
                let dxy3a = rotate(dxT3a, dyT3a, a);
                let dxT3b = 160;
                let dyT3b = -120;
                let dxy3b = rotate(dxT3b, dyT3b, a);
                game.stadium.push(new Segment_S(xc + dxy3a.dx, yc + dxy3a.dy, xc + dxy3b.dx, yc + dxy3b.dy, color));
                // 4th layer
                color = "DimGray";
                let dxT4a = 0;
                let dyT4a = -360;
                let dxy4a = rotate(dxT4a, dyT4a, a);
                let dxT4b = -140;
                let dyT4b = -220;
                let dxy4b = rotate(dxT4b, dyT4b, a);
                game.stadium.push(new Segment_S(xc + dxy4a.dx, yc + dxy4a.dy, xc + dxy4b.dx, yc + dxy4b.dy, color));
            }
            break;
    }
    sendStadium(room);
    sendObstacles(room);
    sendItems(room);
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
function updateItems(room) {
    if (!games.has(room))
        return;
    const game = games.get(room);
    // first item in inside maze?
    let firstItemInInsideMaze = false;
    const isInsideMaze = (game.stadiumId == MAZE.MAZE_INSIDE_1 || game.stadiumId == MAZE.MAZE_INSIDE_2);
    if (isInsideMaze && !game.bulldozerFirstItemTaken)
        firstItemInInsideMaze = true;
    const delayItem = 5 + 4 * Math.random(); // s
    if (game.items.length == 0) {
        const percentAppear = 100 * Math.random();
        if (percentAppear >= 99 || firstItemInInsideMaze) {
            // generate new item
            const itemPos = getNewItemPosition(room);
            if (itemPos.x == -Infinity || itemPos.y == -Infinity)
                return;
            const item = new Item(itemPos.x, itemPos.y, 20);
            // compute random type
            const types = [ItemType.SPEED_INCREASE, ItemType.SPEED_DECREASE, ItemType.COMPRESSION,
                ItemType.RESET, ItemType.RESET_REVERSE, ItemType.FAST_TURN, ItemType.FREEZE,
                ItemType.INVINCIBILITY, ItemType.JUMP, ItemType.BOOST, ItemType.BULLDOZER,
                ItemType.UNKNOWN];
            item.type = getRandomElement(types);
            // set first item as bulldozer in mazes
            if (game.stadiumId != MAZE.NONE && !game.bulldozerFirstItemTaken)
                item.type = ItemType.BULLDOZER;
            // get random corresponding scope
            const scopes = geItemScopesGivenType(item.type);
            item.scope = getRandomElement(scopes);
            // generate item
            game.items.push(item);
            game.itemAppearedDateTime = Date.now();
            sendItems(room);
        }
    }
    else {
        // leave item if first item in inside maze
        if (firstItemInInsideMaze)
            return;
        // unspawn item
        if (Date.now() - game.itemAppearedDateTime >= delayItem * 1000)
            removeItem(room);
    }
}
// compute random item position, not nearby players' current positions
function getNewItemPosition(room) {
    if (!games.has(room))
        return new Point2_S(-Infinity, -Infinity);
    const game = games.get(room);
    // default
    let x = STADIUM_W / 2;
    let y = STADIUM_H / 2;
    // spawn first item at center for inside mazes
    const isInsideMaze = (game.stadiumId == MAZE.MAZE_INSIDE_1 || game.stadiumId == MAZE.MAZE_INSIDE_2);
    if (isInsideMaze && !game.bulldozerFirstItemTaken)
        return new Point2_S(x, y);
    for (let i = 0; i < 100; i++) {
        x = 1 / 16 * STADIUM_W + 7 / 8 * STADIUM_W * Math.random();
        y = 1 / 16 * STADIUM_H + 7 / 8 * STADIUM_H * Math.random();
        let positionOk = true;
        for (const [id, player] of game.players) {
            const lastPoint = player.getLastPoint();
            if (distance(lastPoint.x, lastPoint.y, x, y) <= 80) {
                positionOk = false;
                break;
            }
        }
        if (positionOk)
            break;
    }
    return new Point2_S(x, y);
}
// compute (random?) scope given type
function geItemScopesGivenType(type) {
    let scopes = [ItemScope.PLAYER, ItemScope.ALL, ItemScope.ENEMIES];
    switch (type) {
        case ItemType.COMPRESSION:
            scopes = [ItemScope.ALL];
            break;
        case ItemType.FAST_TURN:
            scopes = [ItemScope.ALL, ItemScope.PLAYER];
            break;
        case ItemType.FREEZE:
            scopes = [ItemScope.ENEMIES];
            break;
        case ItemType.BULLDOZER:
        case ItemType.INVINCIBILITY:
            scopes = [ItemScope.PLAYER];
            break;
        case ItemType.BOOST:
        case ItemType.JUMP:
            scopes = [ItemScope.PLAYER, ItemScope.ALL];
            break;
        case ItemType.RESET:
        case ItemType.RESET_REVERSE:
            scopes = [ItemScope.ALL, ItemScope.ENEMIES];
            break;
        case ItemType.UNKNOWN:
            scopes = [ItemScope.UNKNOWN];
            break;
    }
    return scopes;
}
function removeItem(room) {
    if (!games.has(room))
        return;
    const game = games.get(room);
    game.items.pop();
    game.itemAppearedDateTime = 0;
    sendItems(room);
}
function applyItemTaken(room, playerGotItem, item) {
    if (!games.has(room) && true)
        return;
    const game = games.get(room);
    let scope = item.scope;
    let type = item.type;
    // specific items
    // mazes: mark 1st bulldozer taken
    if (game.stadiumId != MAZE.NONE && !game.bulldozerFirstItemTaken
        && item.type == ItemType.BULLDOZER)
        game.bulldozerFirstItemTaken = true;
    // unknown: get random type and scope
    if (item.type == ItemType.UNKNOWN) {
        scope = getRandomElement([ItemScope.PLAYER, ItemScope.ALL, ItemScope.ENEMIES]);
        const types = [ItemType.SPEED_INCREASE, ItemType.SPEED_DECREASE, ItemType.COMPRESSION,
            ItemType.RESET, ItemType.RESET_REVERSE, ItemType.FAST_TURN,
            ItemType.FREEZE, ItemType.INVINCIBILITY];
        type = getRandomElement(types);
    }
    // specific items
    switch (type) {
        case ItemType.COMPRESSION:
            if (!game.compressionInit)
                initCompression(room);
            return;
    }
    // apply item effect given scope
    switch (scope) {
        case ItemScope.PLAYER:
            applyItemTakenToPlayer(room, playerGotItem, type);
            break;
        case ItemScope.ALL:
            for (const [id, player] of game.players)
                applyItemTakenToPlayer(room, player, type);
            break;
        case ItemScope.ENEMIES:
            if (game.hasTeams) {
                const team = playerGotItem.team;
                for (const [id, player] of game.players)
                    if (player.team != team)
                        applyItemTakenToPlayer(room, player, type);
            }
            else
                for (const [id, player] of game.players)
                    if (player !== playerGotItem)
                        applyItemTakenToPlayer(room, player, item.type);
            break;
    }
}
function applyItemTakenToPlayer(room, player, type) {
    if (!games.has(room) && true)
        return;
    const game = games.get(room);
    switch (type) {
        case ItemType.FAST_TURN:
            player.fastTurn = true;
            break;
        case ItemType.FREEZE:
            if (player.invincible) {
                player.invincible = false;
                player.invincibleDateTime = 0;
            }
            if (player.bulldozing) {
                player.bulldozing = false;
                player.bulldozingDateTime = 0;
            }
            player.frozen = true;
            player.frozenDateTime = Date.now();
            break;
        case ItemType.INVINCIBILITY:
            if (player.frozen) {
                player.frozen = false;
                player.frozenDateTime = 0;
            }
            player.invincible = true;
            player.invincibleDateTime = Date.now();
            break;
        case ItemType.BULLDOZER:
            if (player.frozen) {
                player.frozen = false;
                player.frozenDateTime = 0;
            }
            player.bulldozing = true;
            player.bulldozingDateTime = Date.now();
            break;
        // actionnable items
        case ItemType.BOOST:
        case ItemType.JUMP:
            player.itemsTaken.push(type);
            break;
        case ItemType.RESET:
            {
                const lastPoint = player.getLastPoint();
                const dir = player.direction();
                player.reset();
                if (player.alive) {
                    player.addPoint(lastPoint.x, lastPoint.y);
                    player.addPoint(lastPoint.x + dir.dirx, lastPoint.y + dir.diry);
                }
                break;
            }
        case ItemType.RESET_REVERSE:
            {
                const lastPoint = player.getLastPoint();
                const dir = player.direction();
                player.reset();
                if (player.alive) {
                    player.addPoint(lastPoint.x, lastPoint.y);
                    player.addPoint(lastPoint.x - dir.dirx, lastPoint.y - dir.diry);
                }
                break;
            }
        case ItemType.SPEED_DECREASE:
            const decSpeed = player.boosting ? 2 : 1;
            if (player.alive)
                player.speed = Math.max(player.speed - decSpeed, decSpeed);
            break;
        case ItemType.SPEED_INCREASE:
            const incSpeed = player.boosting ? 2 : 1;
            if (player.alive)
                player.speed += incSpeed;
            break;
    }
}
function applyPlayerItemAction(room, player) {
    if (!games.has(room) && true)
        return;
    const game = games.get(room);
    if (player.itemsTaken === null || player.itemsTaken.length == 0)
        return;
    if (!player.alive)
        return;
    // cannot apply same item again
    const lastType = player.itemsTaken[player.itemsTaken.length - 1];
    if ((lastType == ItemType.BOOST && player.boosting)
        || (lastType == ItemType.JUMP && player.jumping))
        return;
    const type = player.itemsTaken.pop();
    //console.log(`PLAYER ${player.no} activates item ${type.toString()}`);
    switch (type) {
        case ItemType.BOOST:
            player.speed *= 2;
            player.boostingDateTime = Date.now();
            player.boosting = true;
            break;
        case ItemType.JUMP:
            const lastPoint = player.getLastPoint();
            player.jumpingPoint.x = lastPoint.x;
            player.jumpingPoint.y = lastPoint.y;
            player.jumpingDirection = player.direction();
            player.addPoint(Infinity, Infinity); // hole
            player.jumpingDateTime = Date.now();
            player.jumping = true;
            break;
    }
}
function sendItems(room) {
    if (!games.has(room) && true)
        return;
    const game = games.get(room);
    let params = new Array();
    for (const item of game.items) {
        // get scope
        let scopeStr = "";
        switch (item.scope) {
            case ItemScope.PLAYER:
                scopeStr = "player";
                break;
            case ItemScope.ALL:
                scopeStr = "all";
                break;
            case ItemScope.ENEMIES:
                scopeStr = "enemies";
                break;
            case ItemScope.UNKNOWN:
                scopeStr = "unknown";
                break;
        }
        // get type
        let typeStr = "";
        switch (item.type) {
            case ItemType.SPEED_INCREASE:
                typeStr = "speed_increase";
                break;
            case ItemType.SPEED_DECREASE:
                typeStr = "speed_decrease";
                break;
            case ItemType.BOOST:
                typeStr = "boost";
                break;
            case ItemType.BULLDOZER:
                typeStr = "bulldozer";
                break;
            case ItemType.COMPRESSION:
                typeStr = "compression";
                break;
            case ItemType.RESET:
                typeStr = "reset";
                break;
            case ItemType.RESET_REVERSE:
                typeStr = "reset_reverse";
                break;
            case ItemType.FREEZE:
                typeStr = "freeze";
                break;
            case ItemType.FAST_TURN:
                typeStr = "fast_turn";
                break;
            case ItemType.INVINCIBILITY:
                typeStr = "invincibility";
                break;
            case ItemType.JUMP:
                typeStr = "jump";
                break;
            case ItemType.UNKNOWN:
                typeStr = "unknown";
                break;
        }
        params.push({ x: item.center.x, y: item.center.y, scope: scopeStr, type: typeStr });
    }
    io.to(room).emit('items', params);
}
function initCompression(room, speed = 2) {
    if (!games.has(room))
        return;
    const game = games.get(room);
    if (!game.compressionInit) {
        // create blocks
        let obstacles = new Array();
        // top, bottom, left, right
        const color = "lightgrey";
        obstacles.push(new Box_S(0, 0, STADIUM_W, 0, color));
        obstacles.push(new Box_S(0, STADIUM_H, STADIUM_W, STADIUM_H, color));
        obstacles.push(new Box_S(0, 0, 0, STADIUM_H, color));
        obstacles.push(new Box_S(STADIUM_W, 0, STADIUM_W, STADIUM_H, color));
        game.obstacles = obstacles;
        game.compressionInit = true;
        game.compressionSpeed = speed;
        game.compressionStartDateTime = Date.now();
    }
    sendObstacles(room);
}
function updateCompression(room) {
    if (!games.has(room))
        return;
    const game = games.get(room);
    if (!game.compressionInit)
        return;
    // update blocks
    const speed = Math.round(game.compressionSpeed * Math.min(STADIUM_H, STADIUM_H) / 100); // pixels / s
    const elapsedTime = Date.now() - game.compressionStartDateTime;
    if (game.obstacles.length >= 4) {
        game.obstacles[0].points[1].y = Math.floor(speed * elapsedTime / 1000);
        game.obstacles[1].points[1].y = STADIUM_H - Math.floor(speed * elapsedTime / 1000);
        game.obstacles[2].points[1].x = Math.floor(speed * elapsedTime / 1000);
        game.obstacles[3].points[1].x = STADIUM_W - Math.floor(speed * elapsedTime / 1000);
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
function getRandomElement(array) {
    const nbElems = array.length;
    const index = Math.floor(nbElems * Math.random());
    return array[index];
}
function distance(x1, y1, x2, y2) {
    return Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1));
}
function rotate(dx, dy, angle) {
    let dxRot = Math.round(Math.cos(angle) * dx - Math.sin(angle) * dy);
    let dyRot = Math.round(Math.sin(angle) * dx + Math.cos(angle) * dy);
    return { dx: dxRot, dy: dyRot };
}
//# sourceMappingURL=server.js.map