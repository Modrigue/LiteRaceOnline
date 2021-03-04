const STADIUM_W = 640;
const STADIUM_H = 360;

const DURATION_PREPARE_SCREEN = 3;  // in s
const DURATION_SCORES_SCREEN = 3;
const DURATION_GAME_OVER_SCREEN = 10;

const DEPLOY = true;
const PORT = DEPLOY ? (process.env.PORT || 13000) : 5500;

enum GameMode { BODYCOUNT, SURVIVOR }

// for tests purposes only
const FAST_TEST_ON = false;
const FAST_TEST_MODE = GameMode.SURVIVOR;
const FAST_TEST_NB_PLAYERS = 2;
const FAST_TEST_NB_ROUNDS = 15;
const FAST_TEST_HAS_TEAMS = false;


//////////////////////////////// GEOMETRY ENGINE //////////////////////////////


class Point2_S
{
    x: number;
    y: number;

    constructor(x: number, y: number)
    {
        this.x = x;
        this.y = y;
    }
}

class Segment_S
{
    private _points: Array<Point2_S>;
    public get points(): Array<Point2_S> { return this._points; }
    public set points(value: Array<Point2_S>) { this._points = value; }

    color: string = "";

    constructor(x1: number, y1: number, x2: number, y2: number, color: string)
    {
        this._points = new Array<Point2_S>(2);
        this._points[0] = new Point2_S(Math.round(x1), Math.round(y1));
        this._points[1] = new Point2_S(Math.round(x2), Math.round(y2));

        this.color = color;
    }
}

class Box_S
{
    private _points : Array<Point2_S>;
    public get points() : Array<Point2_S> { return this._points; }
    public set points(value : Array<Point2_S>) { this._points = value; }

    public color: string;
    
    constructor(x1: number, y1: number, x2: number, y2: number, color: string)
    {
        this._points = new Array<Point2_S>(2);
        this._points[0] = new Point2_S(Math.round(x1), Math.round(y1));
        this._points[1] = new Point2_S(Math.round(x2), Math.round(y2));

        this.color = color;
    }
}

class Disc_S
{
    private _center : Point2_S;
    public get center() : Point2_S { return this._center; }
    public set center(value : Point2_S) { this._center = value; }

    private _radius : number;
    public get radius() : number { return this._radius; }
    public set radius(value : number) { this._radius = value; }   

    public color: string;
    
    constructor(x: number, y: number, r: number, color: string = "white")
    {
        this._center = new Point2_S(x, y);
        this._radius = r;
        this.color = color;
    }
}

class LiteRay_S
{
    private _points: Array<Point2_S> = new Array<Point2_S>();
    public get points(): Array<Point2_S> { return this._points; }
    public set points(value: Array<Point2_S>) { this._points = value; }

    private _pointLastCollision: Point2_S = new Point2_S(-Infinity, -Infinity);
    public get pointLastCollision(): Point2_S { return this._pointLastCollision; }
    public set pointLastCollision(value: Point2_S) { this._pointLastCollision = value; }

    public color: string;
    public speed: number;
    public alive: boolean;

    // player controls
    up: boolean; down: boolean; left: boolean; right: boolean;
    action: boolean;
    fastTurn: boolean;

    constructor()
    {
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

    getLastPoint(): Point2_S
    {
        if (!this._points || this._points.length == 0)
            return new Point2_S(-Infinity, -Infinity);

        // get last point
        const nbPoints = this._points.length;
        const pointLast = this._points[nbPoints - 1];
        return pointLast;
    }

    addPoint(x: number, y: number): void
    {
        this._points.push(new Point2_S(x, y));
    }

    getNextPoint(): Point2_S
    {
        if (!this._points || this._points.length <= 1)
            return new Point2_S(-Infinity, -Infinity);

        const { dirx, diry }: { dirx: number, diry: number } = this.direction();
        if (dirx == -Infinity || diry == -Infinity)
            return new Point2_S(-Infinity, -Infinity);

        // get last point
        const pointLast = this.getLastPoint();

        const x: number = pointLast.x + this.speed * dirx;
        const y: number = pointLast.y + this.speed * diry;
        return new Point2_S(x, y);
    }

    extendsToNextPoint(): void
    {
        // fast turn: apply direct direction change if key control
        if (this.fastTurn)
        if (this.up || this.down || this.left || this.right)
        {
            const { dirx, diry }: { dirx: number, diry: number } = this.direction();

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

        const pointNext: Point2_S = this.getNextPoint();
        if (pointNext.x === -Infinity || pointNext.y === -Infinity)
            return;

        // extend last point
        const nbPoints = this._points.length;
        this._points[nbPoints - 1].x = pointNext.x;
        this._points[nbPoints - 1].y = pointNext.y;
    }

    extendsToModulo(): boolean
    {
        const pointLast = this.getLastPoint();
        if (pointLast.x < 0)
        {
            const dx = Math.min(1, Math.abs(0 - pointLast.x));
            this.addPoint(Infinity, Infinity); // hole
            this.addPoint(STADIUM_W, pointLast.y);
            this.addPoint(STADIUM_W - dx, pointLast.y);
            return true;
        }
        else if (pointLast.x > STADIUM_W)
        {
            const dx = Math.min(1, Math.abs(pointLast.x - STADIUM_W));
            this.addPoint(Infinity, Infinity); // hole
            this.addPoint(0, pointLast.y);
            this.addPoint(0 + dx, pointLast.y);
            return true;
        }
        else if (pointLast.y < 0)
        {
            const dy = Math.min(1, Math.abs(0 - pointLast.y));
            this.addPoint(Infinity, Infinity); // hole
            this.addPoint(pointLast.x, STADIUM_H);
            this.addPoint(pointLast.x, STADIUM_H - dy);
            return true;
        }
        else if (pointLast.y > STADIUM_H)
        {
            const dy = Math.min(1, Math.abs(pointLast.y - STADIUM_H));
            this.addPoint(Infinity, Infinity); // hole
            this.addPoint(pointLast.x, 0);
            this.addPoint(pointLast.x, 0 + 0 + dy);
            return true;
        }

        return false;
    }

    applyCollision()
    {
        if (this._pointLastCollision.x == -Infinity || this._pointLastCollision.y == -Infinity)
            return;

        const pointLast: Point2_S = this.getLastPoint();
        pointLast.x = this._pointLastCollision.x;
        pointLast.y = this._pointLastCollision.y;
    }

    reset()
    {
        this.points = new Array<Point2>();

        this._pointLastCollision.x = -Infinity;
        this._pointLastCollision.y = -Infinity;
    }

    direction(): { dirx: number, diry: number }
    {
        if (!this._points || this._points.length <= 1)
            return { dirx: -Infinity, diry: -Infinity };

        // get last segment
        const nbPoints = this._points.length;
        const pointLast = this._points[nbPoints - 1];
        const pointLastPrev = this._points[nbPoints - 2];

        // compute unit direction vector
        const dx: number = pointLast.x - pointLastPrev.x;
        const dy: number = pointLast.y - pointLastPrev.y;

        const dirx: number = Math.sign(dx);
        const diry: number = Math.sign(dy);
        return { dirx: dirx, diry: diry };
    }
}

function collideSegment(ray: LiteRay_S, x1: number, y1: number, x2: number, y2: number): boolean
{
    const pointLast: Point2_S = ray.getLastPoint();
    const xr = pointLast.x;
    const yr = pointLast.y;

    if (xr == -Infinity || yr == -Infinity)
        return false;

    for (let i = ray.speed - 1; i >= 0; i--)
    {
        const xrCur = xr - i * ray.direction().dirx;
        const yrCur = yr - i * ray.direction().diry;

        const collisionCur = pointOnSegment(xrCur, yrCur, x1, y1, x2, y2);
        if (collisionCur)
        {
            // store last collision point
            ray.pointLastCollision.x = xrCur - ray.direction().dirx;
            ray.pointLastCollision.y = yrCur - ray.direction().diry;
            return true;
        }
    }

    return false;
}

function collideBox(ray: LiteRay_S, box: Box_S): boolean
{
    const pointLast: Point2_S = ray.getLastPoint();
    const xr = pointLast.x;
    const yr = pointLast.y;

    if (xr == -Infinity || yr == -Infinity)
        return false;

    for (let i = ray.speed - 1; i >= 0; i--)
    {
        const xrCur = xr - i * ray.direction().dirx;
        const yrCur = yr - i * ray.direction().diry;

        const collisionCur = pointInBox(xrCur, yrCur, box);
        if (collisionCur)
        {
            // store last collision point
            ray.pointLastCollision.x = xrCur - ray.direction().dirx;
            ray.pointLastCollision.y = yrCur - ray.direction().diry;
            return true;
        }
    }

    return false;
}

function collideDisc(ray: LiteRay_S, disc: Disc_S): boolean
{
    const pointLast: Point2_S = ray.getLastPoint();
    const xr = pointLast.x;
    const yr = pointLast.y;

    if (xr == -Infinity || yr == -Infinity)
        return false;

    for (let i = ray.speed - 1; i >= 0; i--)
    {
        const xrCur = xr - i * ray.direction().dirx;
        const yrCur = yr - i * ray.direction().diry;

        const collisionCur = pointInDisc(xrCur, yrCur, disc);
        if (collisionCur)
        {
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
function pointOnSegment(x: number, y: number, x1: number, y1: number, x2: number, y2: number): boolean
{
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
    const isInBoundingBox: boolean =
        (xSegMin <= x && x <= xSegMax) && (ySegMin <= y && y <= ySegMax);
    if (!isInBoundingBox)
        return false;

    // point on segment iff. (yr - y1)/(y2 - y1) = (xr - x1)/(x2 - x1)
    // <=> (yr - y1)*(x2 - x1) = (xr - x1)*(y2 - y1) to avoid divisions by 0
    // <=> | (yr - y1)*(x2 - x1) - (xr - x1)*(y2 - y1) | < threshold to handle pixels
    const dist = Math.abs((y - y1) * (x2 - x1) - (x - x1) * (y2 - y1));

    return (dist <= STADIUM_H);
}

// returns true if point (x, y) is in box
function pointInBox(x: number, y: number, box: Box_S): boolean
{
    const xMin = Math.min(box.points[0].x, box.points[1].x);
    const xMax = Math.max(box.points[0].x, box.points[1].x);
    const yMin = Math.min(box.points[0].y, box.points[1].y);
    const yMax = Math.max(box.points[0].y, box.points[1].y);

    return (xMin <= x && x <= xMax && yMin <= y && y <= yMax);
}

// returns true if point (x, y) is in disc
function pointInDisc(x: number, y: number, disc: Disc_S): boolean
{
    const dist = Math.sqrt((x - disc.center.x)*(x- disc.center.x) + (y - disc.center.y)*(y - disc.center.y));
    return (dist <= disc.radius);
}

function collideRay(ray1: LiteRay_S, ray2: LiteRay_S): boolean
{
    const pointLast: Point2_S = ray1.getLastPoint();
    const xr = pointLast.x;
    const yr = pointLast.y;

    if (xr == -Infinity || yr == -Infinity)
        return false;

    const isOwnRay = (ray1 === ray2);

    // check collision with each segment
    let index = 0;
    let pointPrev = new Point2_S(-1, -1);
    for (const pointCur of ray2.points)
    {
        if (pointCur.x != Infinity && pointCur.y != Infinity
            && pointPrev.x != Infinity && pointPrev.y != Infinity)
        {
            // skip own ray current segment
            if (isOwnRay && index == ray2.points.length - 1)
                continue;

            if (index > 0)
            {
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

function computeDoubleCollision(ray1: LiteRay_S, ray2: LiteRay_S): void
{
    const pointLast1 = ray1.getLastPoint();
    const pointLast2 = ray2.getLastPoint();
    const dir1 = ray1.direction();
    const dir2 = ray2.direction();

    // horizontal face-to-face collision
    if (dir1.dirx == -dir2.dirx && dir1.diry == 0 && dir2.diry == 0)
    {
        const xMid = (ray2.speed*pointLast1.x + ray1.speed*pointLast2.x)/(ray1.speed + ray2.speed);
        if (xMid == Math.floor(xMid)) // same collision point
        {
            ray1.pointLastCollision.x = xMid - dir1.dirx;
            ray2.pointLastCollision.x = xMid - dir2.dirx
            ray1.pointLastCollision.y = pointLast1.y;
            ray2.pointLastCollision.y = pointLast2.y;
        }
        else
        {
            ray1.pointLastCollision.x = (dir1.dirx > 0) ? Math.floor(xMid) : Math.ceil(xMid);
            ray1.pointLastCollision.x = (dir2.dirx > 0) ? Math.floor(xMid) : Math.ceil(xMid);
            ray1.pointLastCollision.y = pointLast1.y;
            ray2.pointLastCollision.y = pointLast2.y;
        }
    }
    // vertical face-to-face collision
    else if (dir1.diry == -dir2.diry && dir1.dirx == 0 && dir2.dirx == 0)
    {
        const yMid = (ray2.speed*pointLast1.y + ray1.speed*pointLast2.y)/(ray1.speed + ray2.speed);
        if (yMid == Math.floor(yMid)) // same collision point
        {
            ray1.pointLastCollision.x = pointLast1.x;
            ray2.pointLastCollision.x = pointLast2.x;
            ray1.pointLastCollision.y = yMid - dir1.diry;
            ray2.pointLastCollision.y = yMid - dir2.diry
        }
        else
        {
            ray1.pointLastCollision.x = pointLast1.x;
            ray2.pointLastCollision.x = pointLast2.x;
            ray1.pointLastCollision.y = (dir1.diry > 0) ? Math.floor(yMid) : Math.ceil(yMid);
            ray1.pointLastCollision.y = (dir2.diry > 0) ? Math.floor(yMid) : Math.ceil(yMid);
        }
    }
    // straight angle collision
    else if (Math.abs(dir1.dirx) != Math.abs(dir2.dirx) && Math.abs(dir1.diry) != Math.abs(dir2.diry))
    {
        if (Math.abs(dir1.dirx) > 0 && Math.abs(dir2.dirx) == 0)
        {
            ray1.pointLastCollision.x = pointLast2.x - dir1.dirx;
            ray1.pointLastCollision.y = pointLast1.y;
            ray2.pointLastCollision.x = pointLast2.x;
            ray2.pointLastCollision.y = pointLast1.y - dir2.diry;
        }
        else if (Math.abs(dir1.diry) > 0 && Math.abs(dir2.diry) == 0)
        {
            ray1.pointLastCollision.x = pointLast1.x;
            ray1.pointLastCollision.y = pointLast2.y - dir1.diry;
            ray2.pointLastCollision.x = pointLast1.x - dir2.dirx;
            ray2.pointLastCollision.y = pointLast2.y;
        }
    }
}


///////////////////////////////////////////////////////////////////////////////


const express = require('express')
const app = express()
let io: any;


if (DEPLOY)
{
    app.use(express.static('.'));
    const http = require('http').Server(app);
    io = require('socket.io')(http);

    app.get('/', (req: any, res: any) => res.sendFile(__dirname + '../index.html'));

    http.listen(PORT, function () {
        console.log(`listening on port ${PORT}...`);
    });
}
else
{
    io = require('socket.io')(PORT)
    app.get('/', (req: any, res: any) => res.send('Hello World!'));
}

class Player_S extends LiteRay_S
{
    no: number = 0;
    name: string = "";

    room: string = "";
    team: string = "";
    ready: boolean = false;

    creator: boolean = false;

    score: number = 0;
    markForDead: boolean = false;
    killedBy: string = "";
    nbPointsInRound: number = 0;

    markForItem: boolean = false;

    frozen: boolean = false;
    frozenDateTime: number = 0;

    invincible: boolean = false;
    invincibleDateTime: number = 0;

    keyControl()
    {
        // if fast turn, handlded in extendsToNextPoint
        if (this.fastTurn)
            return;

        const { dirx, diry }: { dirx: number, diry: number } = this.direction();

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

enum ItemScope { NONE, ALL, PLAYER, ENEMIES, UNKNOWN };
enum ItemType { NONE, SPEED_INCREASE, SPEED_DECREASE, COMPRESSION,
    RESET, RESET_REVERSE, FREEZE, FAST_TURN, INVINCIBILITY, UNKNOWN };
class Item extends Disc_S
{
    scope = ItemScope.NONE;
    type = ItemType.NONE;
}

enum GameStatus
{
    NONE,
    SETUP,
    PLAYING
}

enum DisplayStatus_S
{
    NONE,
    PREPARE,
    POS_INIT,
    PLAYING,
    SCORES,
    GAME_OVER
}

class Game
{
    nbPlayersMax: number = 2;
    players: Map<string, Player_S> = new Map<string, Player_S>();
    hasTeams: boolean = false;

    mode: GameMode = GameMode.BODYCOUNT;
    stadium: Array<Segment_S> = new Array<Segment_S>();
    stadiumId: MAZE = MAZE.NONE;
    obstacles: Array<Box_S> = new Array<Box_S>();

    compressionInit: boolean = false;
    compressionSpeed: number = 0;
    compressionStartDateTime: number = 0;

    items = new Array<Item>();
    itemAppearedDateTime: number = 0;

    nbRounds: number = 10;
    roundNo: number = 0;
    roundStartDateTime: number = 0;
    resetOnKilled: boolean = false;

    password: string = "";
    status: GameStatus = GameStatus.NONE;
    displayStatus: DisplayStatus_S = DisplayStatus_S.NONE;
}

enum MAZE { NONE, MAZE_1, MAZE_2 };

let games = new Map<string, Game>();
let clientNo: number = 0;

// for fast test only
let gameTest = new Game();
setFastTestMode(FAST_TEST_ON);
function setFastTestMode(state: boolean): void
{
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


function connected(socket: any)
{
    console.log(`Client '${socket.id}' connected`);
    updateRoomsList();

    io.emit('gamesParams', { stadiumW: STADIUM_W, stadiumH: STADIUM_H, fastTestMode: FAST_TEST_ON });

    // create new room
    socket.on('createNewRoom', (params: { name: string, room: string, password: string }, response: any) => {
        const room = params.room;
        console.log(`Client '${socket.id}' - '${params.name}' asks to create room '${room}'`);

        // check if room has already been created
        if (games.has(room))
        {
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
    socket.on('joinRoom', (params: { name: string, room: string, password: string }, response: any) => {
        const room = params.room;

        // check if room exists
        if (!games.has(room))
        {
            response({
                error: `Room '${room}' does not exist. Please try another room.`
            });
            return;
        }

        // check password if existing
        let game = <Game>games.get(room);
        if (game.password && game.password.length > 0)
        {
            if (params.password.length == 0)
            {
                response({
                    error: `Room '${room}' is password-protected.`
                });
                return;
            }
            else if (params.password != game.password)
            {
                response({
                    error: `Wrong password for room '${room}'.`
                });
                return;
            }
        }

        // check nb. of players left
        const nbPlayersCur = game.players.size;
        const nbPlayersMax = game.nbPlayersMax;
        if (nbPlayersCur >= nbPlayersMax)
        {
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
        const enablePlay: boolean = (game.status == GameStatus.PLAYING);

        socket.join(room);
        updateRoomParams(room);
        updatePlayersList(room);
        updatePlayersParams(room);
        updateRoomsList();
        response({ room: room, enablePlay: enablePlay });
    });

    // max. nb. of players update
    socket.on('setRoomParams', (params: { nbPlayersMax: number, nbRounds: number, hasTeams: boolean, mode: string }, response: any) => {
        const room = getPlayerRoomFromId(socket.id);
        if (room.length == 0)
            return;

        // update on all room clients game setup page
        if (games.has(room))
        {
            const game = <Game>games.get(room);
            if (game.status != GameStatus.PLAYING)
            {
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
    socket.on('setPlayerParams', (params: { color: string, team: string, ready: boolean }, response: any) => {
        const room = getPlayerRoomFromId(socket.id);
        if (room.length == 0)
            return;
        if (!games.has(room))
            return;

        const game = <Game>games.get(room);
        if (game.players && game.players.has(socket.id))
        {
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
    socket.on('play', (params: any, response: any) => {
        const room = getPlayerRoomFromId(socket.id);

        if (room.length == 0)
            return;

        if (games.has(room))
        {
            const game = <Game>games.get(room);
            if (game.players.size < game.nbPlayersMax)
                return;

            switch (game.status)
            {
                case GameStatus.SETUP:
                    // start new game
                    console.log(`Client '${socket.id}' starts game '${room}'`);
                    game.status = GameStatus.PLAYING;
                    playNewGame(room);
                    break

                case GameStatus.PLAYING:
                    // join started game
                    console.log(`Client '${socket.id}' joins started game '${room}'`);
                    playNewGame(room);
                    break;

                default:
                    // for tests only
                    if (FAST_TEST_ON)
                    {
                        game.status = GameStatus.PLAYING;
                        playNewGame(room);
                    }
                    break;
            }
        }

        updateRoomsList();
    });

    // disconnection
    socket.on('disconnect', function ()
    {
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
        if (player.creator)
        {
            if (games.get(room)?.status == GameStatus.SETUP) {
                games.delete(room);
                console.log(`Creator '${player.name}' disconnected => Room '${room}' deleted`);
                updateRoomsList();
                kickAllPlayersFromRoom(room);
                return;
            }
        }

        // delete player in room
        const game = <Game>games.get(room);
        if (game.players !== null && game.players.has(socket.id))
            game.players.delete(socket.id);

        deleteEmptyRooms();
        updateRoomsList();
        updatePlayersList(room);
        updatePlayersParams(room);
    });

    socket.on('kickPlayer', (params: any, response: any) => {
        let player = getPlayerFromId(params.id);
        const room = getPlayerRoomFromId(params.id);

        if (!games.has(room))
            return;

        // delete player in room
        const game = <Game>games.get(room);
        if (game.players !== null && game.players.has(params.id))
        {
            game.players.delete(params.id);
            kickPlayerFromRoom(room, params.id);
        }

        updateRoomsList();
    });

    // user inputs
    socket.on('userCommands', (data: any) => {
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
    let roomsData = new Array<{ room: string, nbPlayersMax: number, nbPlayers: number, status: string }>();
    for (const [room, game] of games)
    {
        const nbPlayersCur = game.players?.size;
        let status: string = "";
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

function updatePlayersList(room: string)
{
    if (!games.has(room))
        return;

    const game = <Game>games.get(room);
    if (game.players === null)
        return;

    let playersData = new Array<{ id: string, name: string }>();
    for (const [id, player] of game.players)
        playersData.push({ id: id, name: player.name });

    io.to(room).emit('updatePlayersList', playersData);
}

function updateRoomParams(room: string) {
    if (!games.has(room))
        return
    const game = <Game>games.get(room);

    const modeStr = (game.mode == GameMode.SURVIVOR) ? "survivor" : "bodycount";

    io.to(room).emit('updateRoomParams',
        { room: room, nbPlayersMax: game.nbPlayersMax, nbRounds: game.nbRounds, hasTeams: game.hasTeams, mode: modeStr });
}

function updatePlayersParams(room: string) {
    if (!games.has(room))
        return

    const game = <Game>games.get(room);
    let playersParams = new Array<{ id: string, name: string, color: string, team: string, ready: boolean }>();
    for (const [id, player] of game.players)
        playersParams.push({ id: id, name: player.name, color: player.color, team: player.team, ready: player.ready });

    io.to(room).emit('updatePlayersParams', playersParams);
}


function kickPlayerFromRoom(room: string, id: string)
{
    if (!games.has(room))
        return

    io.to(room).emit('kickFromRoom', { room: room, id: id });
}

function kickAllPlayersFromRoom(room: string)
{
    io.to(room).emit('kickFromRoom', { room: room, id: "" });
}

function playNewGame(room: string) {
    if (!games.has(room))
        return;
    const game = <Game>games.get(room);

    game.roundNo = 0;
    game.displayStatus = DisplayStatus_S.PREPARE;

    // set prepare countdown
    for (let i = DURATION_PREPARE_SCREEN; i >= 0; i--)
    {
        setTimeout(() => {
            io.to(room).emit('prepareGame', { room: room, nbPlayersMax: game.nbPlayersMax,
                nbRounds: game.nbRounds, countdown: i, initDisplay: (i == DURATION_PREPARE_SCREEN) });

            // create players and start game
            if (i == 0)
            {
                newRound(room);
                
                let playerParams = Array<{ id: string, name: string, x1: number, y1: number, x2: number, y2: number, color: string }>();
                for (const [id, player] of game.players)
                {
                    player.score = player.nbPointsInRound = 0;
                    player.killedBy = "";

                    if (!game.hasTeams)
                        player.team = ""; // secure
        
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


function getNextPlayerNoInRoom(room: string): number
{
    if (!games.has(room))
        return -1;
    const game = <Game>games.get(room);

    let playerNo = 1;
    for (const [id, player] of game.players)
    {
        if (player.no <= 0)
            return playerNo;

        playerNo++;
    }

    return playerNo;
}

function initPlayersPositions(room: string): void
{
    if (!games.has(room))
        return;
    const game = <Game>games.get(room);

    // TODO: handle teams?

    const percent = Math.floor(100 * Math.random());
    const positioning: number = Math.floor(percent / 25) + 1;

    if (game.stadiumId == MAZE.NONE)  // vanilla stadium
    {
        switch (positioning)
        {
            case 1: // face to face
                {
                    const dy = 80;
                    const remain = (game.nbPlayersMax % 2);
                    for (const [id, player] of game.players)
                    {
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
                    for (const [id, player] of game.players)
                    {
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
                    for (const [id, player] of game.players)
                    {
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
                        else    // top /right
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
                    for (const [id, player] of game.players)
                    {
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
                        else    // top /right
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
    else    // predefined stadiums
    {
        switch(game.stadiumId)
        {
            case MAZE.MAZE_1:
                {
                    const dy = 4;
                    const dPosy = Math.round(STADIUM_H/32); 
                    const remain = (game.nbPlayersMax % 4);
                    for (const [id, player] of game.players)
                    {
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
            
            case MAZE.MAZE_2:
                {
                    let xLeft = 0;
                    let yTop = 0;
                    let xRight = STADIUM_W;
                    let yBottom = STADIUM_H;
    
                    if (STADIUM_W > STADIUM_H)
                    {
                        xLeft = STADIUM_W/2 - STADIUM_H/2;
                        xRight = STADIUM_W/2 + STADIUM_H/2;  
                    }
                    else if (STADIUM_W < STADIUM_H)
                    {
                        yTop = STADIUM_H/2 - STADIUM_W/2;
                        yBottom = STADIUM_H/2 + STADIUM_W/2;
                    }

                    const dxy = 4;
                    const dPos = Math.round(STADIUM_H/32); 
                    const remain = (game.nbPlayersMax % 4);
                    for (const [id, player] of game.players)
                    {
                        const dir = (player.no % 4); // right, left, up, bottom
                        const nbPlayersInPos = (0 < dir && dir <= remain || game.nbPlayersMax <= 4) ?
                            Math.ceil(game.nbPlayersMax / 4) : Math.floor(game.nbPlayersMax / 4);
                        const noPlayerInPos = Math.floor((player.no - 1) / 4) + 1;

                        let xStart = 0;
                        let yStart = 0;
                        let dx = 0;
                        let dy = 0;
                        switch (dir)
                        {
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
    for (const [id, player] of game.players)
    {
        player.alive = true;
        player.markForDead = false;
        player.killedBy = "";
        player.nbPointsInRound = 0;
        player.up = player.down = player.left = player.right = player.action = false;

        player.markForItem = false;
        player.fastTurn = false;
        player.frozen = false;
        player.frozenDateTime = 0;
        player.invincible = false;
        player.invincibleDateTime = 0;

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

function initPlayersSpeeds(room: string): void
{
    if (!games.has(room))
        return;
    const game = <Game>games.get(room);

    const percent = Math.floor(100 * Math.random());
    let speed = 1;
    if (percent >= 80)
        speed = 3;
    else if (percent >= 50)
        speed = 2;

    // mazes specific speeds
    switch(game.stadiumId)
    {
        case MAZE.MAZE_1:
            speed = (percent >= 50) ? 3 : 2;
            break;

        case MAZE.MAZE_2:
            speed = (percent >= 50) ? 2 : 1;
            break;
    }

    for (const [id, player] of game.players)
        player.speed = speed;
}

/////////////////////////////////////// LOOPS /////////////////////////////////

function serverLoop()
{
    // send players positions to clients
    for (const [room, game] of games)
    {
        if (game.status != GameStatus.PLAYING || game.displayStatus != DisplayStatus_S.PLAYING)
            continue;

        userInteraction(room);
        physicsLoop(room);
        gameLogic(room);

        // client render
        for (let [id, player] of game.players)
        {
            let color = player.color;
            if (player.frozen)
                color= "white";
            else if (player.invincible)
                color = getRandomElement(["violet", "indigo", "blue", "cyan", "green", "yellow", "orange", "red"]);

            io.to(room).emit('updatePlayersPositions', { id: id, points: player.points, color: color });
        }
    }
}

function gameLogic(room: string): void
{
    if (!games.has(room))
        return;
    const game = <Game>games.get(room);

    // create / delete random items
    generateItems(room);

    // update compression if started
    if (game.compressionInit)
        updateCompression(room);

    // init compression if delay passed / maze
    const delayCompressionMax = 90; // s
    const curDate = Date.now();
    const roundElapsedTime = curDate - game.roundStartDateTime; // ms
    if (((game.roundNo + 5) % 20 == 0) && game.stadiumId == MAZE.MAZE_1)
    {
        const delayCompression = 1.75; // s
        if (roundElapsedTime > delayCompression * 1000)
            initCompression(room, 1.25);
    }
    else if ((game.roundNo + 2) % 5 == 0)
    {
        const delayCompression = 3; // s
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
        if (Date.now() - player.frozenDateTime >= delayFrozen * 1000)
        {
            player.frozen = false;
            player.frozenDateTime = 0;
        }

    // cancel invincibility if delay passed
    const delayInvincibility = 5; // s
    for (const [id, player] of game.players)
        if (player.invincible)
        if (Date.now() - player.invincibleDateTime >= delayInvincibility * 1000)
        {
            player.invincible = false;
            player.invincibleDateTime = 0;
        }

    // display scores if round finished
    if (roundFinished(room))
        scoring(room);
}

function roundFinished(room: string): boolean
{
    // check remaining players / team
    if (!games.has(room))
        return false;
    const game = <Game>games.get(room);

    let nbPlayersOrTeamsAlive = 0;
    if (game.hasTeams)
    {
        let teamsAlive = new Array<string>();
        for (const [id, player] of game.players)
            if (player.alive) {
                if (!teamsAlive.includes(player.team))
                    teamsAlive.push(player.team);
            }

        nbPlayersOrTeamsAlive = teamsAlive.length;
    }
    else
    {
        for (const [id, player] of game.players)
            if (player.alive)
                nbPlayersOrTeamsAlive++;
    }

    const nbPlayersOrTeamsLast = (game.nbPlayersMax > 1) ? 1 : 0;
    return (nbPlayersOrTeamsAlive <= nbPlayersOrTeamsLast);
}

function physicsLoop(room: string): void
{
    if (!games.has(room))
        return;
    const game = <Game>games.get(room);
    //console.log(room, game.players);

    // extend to next point
    game.players.forEach((player) => {
        if (player.alive && !player.frozen)
            player.extendsToNextPoint();
    });

    // check for collisions
    game.players.forEach((player) => {

        if (player.alive)
            checkPlayerCollisions(player, room);
    });

    // check for double collisions
    for (const [id, player] of game.players)
    {
        if (player.markForDead)
        {
            // check if double collision
            const idKiller: string = player.killedBy;
            const hasKillerPlayer = (idKiller.length > 0 && idKiller != "WALL")
            let killer = null;
            if (hasKillerPlayer && game.players.has(idKiller))
                killer = <Player_S>game.players.get(idKiller);
            
            const isDoubleCollision = (killer != null) && killer.markForDead && (killer.killedBy == id);
            if (isDoubleCollision)
                computeDoubleCollision(<LiteRay_S>player, <LiteRay_S>killer);
        }
    }

    // apply collisions, deaths and items
    let itemTaken = false;
    for (const [id, player] of game.players)
    {
        if (player.markForDead)
        {
            player.applyCollision();
            player.alive = false;
            player.markForDead = false;

            //io.to(room).emit('collision', {id: id});
        }

        if (player.markForItem && game.items.length > 0)
        {
            const item = game.items[0];
            applyItemEffect(room, player, item);
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
}

function checkPlayerCollisions(player: Player_S, room: string = ""): void
{
    if (room == "")
        room = player.room;
    if (!games.has(player.room))
        return;
    const game = <Game>games.get(player.room);

    // players
    for (const [id, otherPlayer] of game.players)
    {
        if (!player.invincible)
        if (collideRay(player, <LiteRay_S>otherPlayer))
        {
            player.markForDead = true;
            player.killedBy = id;
            //console.log(`PLAYER ${player.no} COLLISION RAY`);
        }
    }

    // stadium
    for (const wall of game.stadium)
    {
        if (!player.markForDead && !player.invincible)
            if (collideSegment(player, wall.points[0].x, wall.points[0].y, wall.points[1].x, wall.points[1].y))
            {
                player.markForDead = true;
                player.killedBy = "WALL";
                //console.log(`PLAYER ${player.no} COLLISION WALL`);
            }
    }

    // obstacles
    for (const obstacle of game.obstacles)
    {
        if (!player.markForDead && !player.invincible)
            if (collideBox(player, obstacle))
            {
                player.markForDead = true;
                player.killedBy = "WALL";
                //console.log(`PLAYER ${player.no} COLLISION OBSTACLE`);
            }
    }

    // items
    let itemTaken = false;
    for (const item of game.items)
    {
        if (collideDisc(<LiteRay_S>player, <Disc_S>item))
        {
            player.markForItem = true;
            console.log(`PLAYER ${player.no} GET ITEM`);
        }
    }
    if (itemTaken)
        removeItem(room);
}

function userInteraction(room: string): void
{
    if (!games.has(room))
        return;
    const game = <Game>games.get(room);
    game.players.forEach((player) => { player.keyControl(); })
}

function scoring(room: string)
{
    if (!games.has(room))
        return;
    const game = <Game>games.get(room);

    // update players scores
    switch (game.mode)
    {
        case GameMode.BODYCOUNT:
            for (const [id, player] of game.players)
            {
                const idKiller: string = player.killedBy;

                const hasKillerPlayer = (idKiller.length > 0 && idKiller != "WALL")
                let killer = null;
                if (hasKillerPlayer && game.players.has(idKiller))
                    killer = <Player_S>game.players.get(idKiller);
                //console.log(`Player ${id}: killed by ${idKiller}`);

                if (idKiller == id) // suicide
                {
                    player.score = Math.max(player.score - 1, 0);
                    player.nbPointsInRound--;
                }
                else if (game.hasTeams && killer !== null && player.team == killer.team)
                {
                    killer.score = Math.max(player.score - 1, 0);
                    killer.nbPointsInRound--;
                }
                else if (idKiller == "WALL")
                {
                    // nop
                }
                else if (killer != null && idKiller.length > 0)
                {
                    killer.score++;
                    killer.nbPointsInRound++;
                }

                //console.log(`${player.name}: ${player.score} point(s)`);
            }
            break;

        case GameMode.SURVIVOR:
            if (game.hasTeams)
            {
                // get alive teams
                let teamsAlive = new Array<string>();
                for (const [id, player] of game.players)
                {
                    const team = player.team;
            
                    if (player.alive && !teamsAlive.includes(team))
                        teamsAlive.push(team);
                }

                // update alive team's 1st player score
                if (teamsAlive.length == 1)
                    for (const [id, player] of game.players)
                    {
                        if (player.team == teamsAlive[0])
                        {
                            player.score++;
                            player.nbPointsInRound++;
                            break;
                        }
                    }
            }
            else
            {
                for (const [id, player] of game.players)
                {
                    if (player.alive)
                    {
                        player.score++;
                        player.nbPointsInRound++;
                    }
                }
            }
            break;
    }

    // display scores
    game.displayStatus = DisplayStatus_S.SCORES;
    let scoreParams = new Array<{ id: string, team: string, score: number, nbKills: number }>();
    for (const [id, player] of game.players)
        scoreParams.push({ id: id, team: player.team, score: player.score, nbKills: player.nbPointsInRound });
    io.to(room).emit('displayScores', scoreParams);

    // check if player / teams have reached max. score
    // TODO: handle ex-aequo
    let winners = new Array<string>();

    if (game.hasTeams)
    {
        // compute teams' scores
        let teamsScores = new Map<string, number>();
        for (const [id, player] of game.players)
        {
            const team = player.team;

            if (!teamsScores.has(team))
                teamsScores.set(team, 0);

            teamsScores.set(team, <number>teamsScores.get(team) + player.score);
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

function newRound(room: string): void
{
    if (!games.has(room))
        return;

    const game = <Game>games.get(room);
    game.roundNo++;
    game.roundStartDateTime = Date.now();  
    console.log(`ROOM ${room} - ROUND ${game.roundNo}`);

    newStadium(room);
    initPlayersPositions(room);
    initPlayersSpeeds(room);
    game.resetOnKilled = (Math.floor(100 * Math.random()) >= 50);
    game.displayStatus = DisplayStatus_S.PLAYING;  
}

function newStadium(room: string): void
{
    if (!games.has(room))
        return;

    const game = <Game>games.get(room);
    game.stadium = new Array<Segment_S>();
    game.obstacles = new Array<Box_S>();
    game.items = new Array<Item>();
    game.compressionInit = false;

    let newStadiumId = MAZE.NONE;
    if (game.roundNo % 10 == 0)
        newStadiumId = MAZE.MAZE_2;
    else if (game.roundNo % 5 == 0)
        newStadiumId = MAZE.MAZE_1;
    
    game.stadiumId = newStadiumId;

    switch (game.stadiumId)
    {
        case MAZE.NONE:   // vanilla
            {
                const percentWallV = Math.floor(100 * Math.random());
                const percentWallH = Math.floor(100 * Math.random());
                const wallsV: boolean = (percentWallV >= 50);
                const wallsH: boolean = (percentWallH >= 50);;

                if (wallsV)
                {
                    game.stadium.push(new Segment_S(0, 0, 0, STADIUM_H, "darkgrey"));
                    game.stadium.push(new Segment_S(STADIUM_W, 0, STADIUM_W, 480, "darkgrey"));
                    game.stadium.push(new Segment_S(1, 0, 1, STADIUM_H, "grey"));
                    game.stadium.push(new Segment_S(STADIUM_W - 1, 0, STADIUM_W - 1, 480, "grey"));
                }

                if (wallsH)
                {
                    game.stadium.push(new Segment_S(0, 0, STADIUM_W, 0, "darkgrey"));
                    game.stadium.push(new Segment_S(0, STADIUM_H, STADIUM_W, STADIUM_H, "darkgrey"));
                    game.stadium.push(new Segment_S(0, 1, STADIUM_W, 1, "grey"));
                    game.stadium.push(new Segment_S(0, STADIUM_H - 1, STADIUM_W, STADIUM_H - 1, "grey"));
                }
            }
            break;

        case MAZE.MAZE_1:
            {   
                putWallsAround(game);
                const color = "LightGrey";

                const dx = Math.round(STADIUM_W / 2 / 8);
                const dy = Math.round(STADIUM_H / 2 / 8);
                
                // build per layer
                for (let i = 1; i <= 6; i++)
                {
                    if (i % 2 == 1) // gaps on vertical walls
                    {
                        const hGap = (1.5 - 0.5*Math.floor(i/2)) * dy;
                        
                        game.stadium.push(new Segment_S(i*dx, i*dy, STADIUM_W - i*dx,i*dy, color));
                        game.stadium.push(new Segment_S(i*dx, STADIUM_H - i*dy, STADIUM_W - i*dx, STADIUM_H - i*dy, color));
                        game.stadium.push(new Segment_S(i*dx, STADIUM_H/2 - hGap, i*dx, i*dy, color));
                        game.stadium.push(new Segment_S(i*dx, STADIUM_H/2 + hGap, i*dx, STADIUM_H - i*dy, color));
                        game.stadium.push(new Segment_S(STADIUM_W - i*dx, STADIUM_H/2 - hGap, STADIUM_W - i*dx, i*dy, color));
                        game.stadium.push(new Segment_S(STADIUM_W - i*dx, STADIUM_H/2 + hGap, STADIUM_W - i*dx, STADIUM_H - i*dy, color));
                    }
                    else    // gaps on horizontal walls
                    {
                        const wGap = (1.5 - 0.5*Math.floor((i-1)/2))*dx;

                        game.stadium.push(new Segment_S(i*dx, i*dy, i*dx, STADIUM_H-i*dy, color));
                        game.stadium.push(new Segment_S(STADIUM_W - i*dx, i*dy, STADIUM_W - i*dx, STADIUM_H-i*dy, color));
                        game.stadium.push(new Segment_S(i*dx, i*dy, STADIUM_W/2 - wGap, i*dy, color));
                        game.stadium.push(new Segment_S(STADIUM_W/2 + wGap, i*dy, STADIUM_W - i*dx, i*dy, color));
                        game.stadium.push(new Segment_S(i*dx, STADIUM_H - i*dy, STADIUM_W/2 - wGap, STADIUM_H - i*dy, color));
                        game.stadium.push(new Segment_S(STADIUM_W/2 + wGap, STADIUM_H - i*dy, STADIUM_W - i*dx, STADIUM_H - i*dy, color));
                    }
                }
                
                // last layer
                game.stadium.push(new Segment_S(7*dx, 7*dy, STADIUM_W - 7*dx, 7*dy, color));
                game.stadium.push(new Segment_S(7*dx, STADIUM_H - 7*dy, STADIUM_W - 7*dx, STADIUM_H - 7*dy, color));
            }
            break;
        
        case MAZE.MAZE_2:
            {   
                putWallsAround(game);
                const color = "LightGrey";

                let xMin = 0;
                let yMin = 0;
                let xMax = STADIUM_W;
                let yMax = STADIUM_H;

                if (STADIUM_W > STADIUM_H)
                {
                    xMin = STADIUM_W/2 - STADIUM_H/2;
                    xMax = STADIUM_W/2 + STADIUM_H/2;
                    game.stadium.push(new Segment_S(xMin, 0, xMin, STADIUM_H, color));
                    game.stadium.push(new Segment_S(xMax, 0, xMax, STADIUM_H, color));

                }
                else if (STADIUM_W < STADIUM_H)
                {
                    yMin = STADIUM_H/2 - STADIUM_W/2;
                    yMax = STADIUM_H/2 + STADIUM_W/2;
                    game.stadium.push(new Segment_S(0, yMin, STADIUM_W, xMax, color));
                    game.stadium.push(new Segment_S(0, yMin, STADIUM_W, xMax, color));
                }

                const w = Math.min(STADIUM_W, STADIUM_H);
                let dxy = Math.round(w / 2 / 8);
                const rGap = 2/3;

                // build per layer
                let xLeft = xMin;
                let xRight = xMax;
                let yTop = yMin;
                let yBottom = yMax;
                let wCur = w;
                for (let i = 1; i <= 4; i++)
                {
                    xLeft = xMin + i*dxy;
                    xRight = xMax - i*dxy;
                    yTop = yMin + i*dxy;
                    yBottom = yMax - i*dxy;
                    wCur = w - 2*i*dxy;

                    const wGap = (3 - 0.5*i) * dxy;
                    const rGapCur = (i % 2 == 1) ? rGap : (1 - rGap);

                    // top
                    game.stadium.push(new Segment_S(xLeft, yTop, xLeft + rGapCur*wCur - wGap/2, yTop, color));
                    game.stadium.push(new Segment_S(xLeft + rGapCur*wCur + wGap/2, yTop, xRight, yTop, color));
                    
                    // bottom
                    game.stadium.push(new Segment_S(xLeft, yBottom, xLeft + (1-rGapCur)*wCur - wGap/2, yBottom, color));
                    game.stadium.push(new Segment_S(xLeft + (1-rGapCur)*wCur + wGap/2, yBottom, xRight, yBottom, color));
                    
                    // left
                    game.stadium.push(new Segment_S(xLeft, yTop, xLeft, yTop + (1-rGapCur)*wCur - wGap/2, color));
                    game.stadium.push(new Segment_S(xLeft, yTop + (1-rGapCur)*wCur + wGap/2, xLeft, yBottom, color));
                    
                    // right
                    game.stadium.push(new Segment_S(xRight, yTop, xRight, yTop + rGapCur*wCur - wGap/2, color));
                    game.stadium.push(new Segment_S(xRight, yTop + rGapCur*wCur + wGap/2, xRight, yBottom, color));
                }
       
                // central walls

                const wWall1 = 0.35*wCur;
                game.stadium.push(new Segment_S((xLeft + xRight)/2, yTop, (xLeft + xRight)/2 - wWall1, yTop + wWall1, color));
                game.stadium.push(new Segment_S((xLeft + xRight)/2, yBottom, (xLeft + xRight)/2 + wWall1, yBottom - wWall1, color));
                game.stadium.push(new Segment_S(xLeft, (yTop + yBottom)/2, xLeft + wWall1, (yTop + yBottom)/2 + wWall1, color));
                game.stadium.push(new Segment_S(xRight, (yTop + yBottom)/2, xRight - wWall1, (yTop + yBottom)/2 - wWall1, color));

                const wWall2 = 0.2*wCur;
                game.stadium.push(new Segment_S((xLeft + xRight)/2 - dxy, yTop + dxy, (xLeft + xRight)/2 - dxy + wWall2, yTop + dxy + wWall2, color));
                game.stadium.push(new Segment_S((xLeft + xRight)/2 + dxy, yBottom - dxy, (xLeft + xRight)/2 + dxy - wWall2, yBottom - dxy - wWall2, color));
                game.stadium.push(new Segment_S(xLeft + dxy, (yTop + yBottom)/2 + dxy, xLeft + dxy + wWall2, (yTop + yBottom)/2 + dxy - wWall2, color));
                game.stadium.push(new Segment_S(xRight - dxy, (yTop + yBottom)/2 - dxy, xRight - dxy - wWall2, (yTop + yBottom)/2 - dxy + wWall2, color));
            }
            break;
    }

    sendStadium(room);
    sendObstacles(room);
    sendItems(room);
}

function putWallsAround(game: Game): void
{
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

function sendStadium(room: string): void
{
    if (!games.has(room))
        return;

    const game = <Game>games.get(room);
    let params = new Array<{ x1: number, y1: number, x2: number, y2: number, color: string }>();
    for (const wall of game.stadium)
        params.push({ x1: wall.points[0].x, y1: wall.points[0].y, x2: wall.points[1].x, y2: wall.points[1].y, color: wall.color });

    io.to(room).emit('stadium', params);
}

function newObstacles(room: string): void
{
    if (!games.has(room))
        return;
    const game = <Game>games.get(room);

    let obstacles = new Array<Box_S>();
    // create obstacles
    game.obstacles = obstacles;

    sendObstacles(room);
}

function generateItems(room: string): void
{
    if (!games.has(room))
        return;
    const game = <Game>games.get(room);

    const DURATION_ITEM = 5; // s
    if (game.items.length == 0)
    {
        const percentAppear = 100*Math.random();
        if (percentAppear >= 99)
        {
            // generate new item
            const itemPos = getNewItemPosition(room);
            if (itemPos.x == -Infinity || itemPos.y == -Infinity)
                return;
            const item = new Item(itemPos.x, itemPos.y, 20);

            // compute random type / scope
            const types: Array<ItemType> = [ItemType.SPEED_INCREASE, ItemType.SPEED_DECREASE, ItemType.COMPRESSION,
                ItemType.RESET, ItemType.RESET_REVERSE, ItemType.FAST_TURN,
                ItemType.FREEZE, ItemType.INVINCIBILITY, ItemType.UNKNOWN];
            item.type = getRandomElement(types);
            const scopes = geItemScopesGivenType(item.type);
            item.scope = getRandomElement(scopes);

            // generate item
            game.items.push(item);
            game.itemAppearedDateTime = Date.now();
            sendItems(room);
        }
    }
    else
    {
        // despawn item
        if (Date.now() - game.itemAppearedDateTime >= DURATION_ITEM*1000)
            removeItem(room);
    }
}

// compute random item position, not nearby players' current positions
function getNewItemPosition(room: string): Point2_S
{
    if (!games.has(room))
        return new Point2_S(-Infinity, -Infinity);
    const game = <Game>games.get(room);

    let x = STADIUM_W/2;
    let y = STADIUM_H/2;
    for (let i = 0; i < 100; i++)
    {
        x = 1/16*STADIUM_W + 7/8*STADIUM_W*Math.random();
        y = 1/16*STADIUM_H + 7/8*STADIUM_H*Math.random();
        
        let positionOk = true;
        for (const [id, player] of game.players)
        {
            const lastPoint = player.getLastPoint();
            if(distance(lastPoint.x, lastPoint.y, x, y) <= 80)
            {
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
function geItemScopesGivenType(type: ItemType): Array<ItemScope>
{
    let scopes: Array<ItemScope> = [ItemScope.PLAYER, ItemScope.ALL, ItemScope.ENEMIES];
    
    switch(type)
    {
        case ItemType.COMPRESSION:
            scopes = [ItemScope.ALL];
            break;
        
        case ItemType.FAST_TURN:
            scopes = [ItemScope.ALL, ItemScope.PLAYER];
            break;

        case ItemType.FREEZE:
            scopes = [ItemScope.ENEMIES];
            break;

        case ItemType.INVINCIBILITY:
            scopes = [ItemScope.PLAYER];
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

function removeItem(room: string): void
{
    if (!games.has(room))
        return;
    const game = <Game>games.get(room);

    game.items.pop();
    game.itemAppearedDateTime = 0;
    sendItems(room);
}

function applyItemEffect(room: string, playerGotItem: Player_S, item: Item): void
{
    if (!games.has(room) && true)
        return;
    const game = <Game>games.get(room);

    let scope = item.scope;
    let type = item.type;

    // specific items

    // unknown: get random type and scope
    if (item.type == ItemType.UNKNOWN)
    {
        scope = getRandomElement([ItemScope.PLAYER, ItemScope.ALL, ItemScope.ENEMIES]);

        const types: Array<ItemType> = [ItemType.SPEED_INCREASE, ItemType.SPEED_DECREASE, ItemType.COMPRESSION,
            ItemType.RESET, ItemType.RESET_REVERSE, ItemType.FAST_TURN,
            ItemType.FREEZE, ItemType.INVINCIBILITY];
        type = getRandomElement(types);
    }

    // compression: apply to all players
    if (type == ItemType.COMPRESSION)
    {
        if (!game.compressionInit)
        {
            initCompression(room);
            return;
        }
    }

    // apply item effect given scope
    switch(scope)
    {
        case ItemScope.PLAYER:
            applyItemEffectToPlayer(room, playerGotItem, type);
            break;

        case ItemScope.ALL:
            for (const [id, player] of game.players)
                applyItemEffectToPlayer(room, player, type);   
            break;

        case ItemScope.ENEMIES:
            if (game.hasTeams)
            {
                const team : string = playerGotItem.team;
                for (const [id, player] of game.players)
                    if (player.team != team)
                        applyItemEffectToPlayer(room, player, type);

            }
            else
                for (const [id, player] of game.players)
                    if (player !== playerGotItem)
                        applyItemEffectToPlayer(room, player, item.type);
            break;
    }
}

function applyItemEffectToPlayer(room: string, player: Player_S, type: ItemType): void
{
    if (!games.has(room) && true)
        return;
    const game = <Game>games.get(room);

    switch(type)
    {
        case ItemType.FAST_TURN:
            player.fastTurn = true;
            break;
        
        case ItemType.FREEZE:
            if (player.invincible)
            {
                player.invincible = false;
                player.invincibleDateTime = 0;
            }
            player.frozen = true;
            player.frozenDateTime = Date.now();
            break;

        case ItemType.INVINCIBILITY:
            if (player.frozen)
            {
                player.frozen = false;
                player.frozenDateTime = 0;
            }
            player.invincible = true;
            player.invincibleDateTime = Date.now();
            break;

        case ItemType.RESET:
        {
            const lastPoint = player.getLastPoint();
            const dir = player.direction();
            player.reset();
            player.addPoint(lastPoint.x, lastPoint.y);
            player.addPoint(lastPoint.x + dir.dirx, lastPoint.y + dir.diry);
            break;
        }

        case ItemType.RESET_REVERSE:
        {
            const lastPoint = player.getLastPoint();
            const dir = player.direction();
            player.reset();
            player.addPoint(lastPoint.x, lastPoint.y);
            player.addPoint(lastPoint.x - dir.dirx, lastPoint.y - dir.diry);
            break;
        }

        case ItemType.SPEED_DECREASE:
            player.speed = Math.max(player.speed - 1, 1);
            break;

        case ItemType.SPEED_INCREASE:
            player.speed++;
            break;
    }
}

function sendItems(room: string): void
{
    if (!games.has(room) && true)
        return;
    const game = <Game>games.get(room);

    let params = new Array<{ x: number, y: number, scope: string, type: string }>();
    for (const item of game.items)
    {
        // get scope
        let scopeStr = "";
        switch (item.scope)
        {
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
        switch (item.type)
        {
            case ItemType.SPEED_INCREASE:
                typeStr = "speed_increase";
                break;
        
            case ItemType.SPEED_DECREASE:
                typeStr = "speed_decrease";
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

            case ItemType.UNKNOWN:
                typeStr = "unknown";
                break;
        }

        params.push({ x: item.center.x, y: item.center.y, scope: scopeStr, type: typeStr });
    }

    io.to(room).emit('items', params);
}

function initCompression(room: string, speed: number = 2): void
{
    if (!games.has(room))
        return;
    const game = <Game>games.get(room);
    
    if (!game.compressionInit)
    {
        // create blocks
        let obstacles = new Array<Box_S>();

        // top, bottom, left, right
        const color: string = "lightgrey";
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

function updateCompression(room: string): void
{
    if (!games.has(room))
        return;
    const game = <Game>games.get(room);
    
    if (!game.compressionInit)
        return;
    
    // update blocks
    const speed = Math.round(game.compressionSpeed * Math.min(STADIUM_H, STADIUM_H) / 100); // pixels / s
    const elapsedTime = Date.now() - game.compressionStartDateTime;
    if (game.obstacles.length >= 4)
    {
        game.obstacles[0].points[1].y = Math.floor(speed * elapsedTime / 1000);
        game.obstacles[1].points[1].y = STADIUM_H - Math.floor(speed * elapsedTime / 1000);
        game.obstacles[2].points[1].x = Math.floor(speed * elapsedTime / 1000);
        game.obstacles[3].points[1].x = STADIUM_W - Math.floor(speed * elapsedTime / 1000);
    }

    sendObstacles(room);
}

function sendObstacles(room: string): void
{
    if (!games.has(room) && true)
        return;

    const game = <Game>games.get(room);
    let params = new Array<{ x1: number, y1: number, x2: number, y2: number, color: string }>();
    for (const obs of game.obstacles)
        params.push({ x1: obs.points[0].x, y1: obs.points[0].y, x2: obs.points[1].x, y2: obs.points[1].y, color: obs.color });

    io.to(room).emit('obstacles', params);
}

function gameOver(room: string, winners: Array<string>): void
{
    if (!games.has(room))
        return;
    const game = <Game>games.get(room);

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
function deleteEmptyRooms()
{
    for (const [room, game] of games)
        if (game.players == null || game.players.size == 0)
            games.delete(room);
}

function getPlayerFromId(id: string): Player_S
{
    for (const [room, game] of games)
        for (const [idCur, player] of game.players)
            if (idCur == id)
                return player;

    // not found, return empty player
    return new Player_S();
}

function getPlayerRoomFromId(id: string): string
{
    let player = getPlayerFromId(id);

    // if unregistered player, nop
    if (player.name.length == 0 || player.room.length == 0)
        return "";
    if (!games.has(player.room))
        return "";

    return player.room;
}

function getRandomElement<T>(array: Array<T>): T
{
    const nbElems = array.length;
    const index = Math.floor(nbElems*Math.random());

    return array[index];
}

function distance(x1: number, y1: number, x2: number, y2: number): number
{
    return Math.sqrt((x2 - x1)*(x2 - x1) + (y2 - y1)*(y2 - y1))
}