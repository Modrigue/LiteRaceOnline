const STADIUM_W = 640;
const STADIUM_H = 360;

const DURATION_PREPARE_SCREEN = 2;  // in s
const DURATION_SCORES_SCREEN = 3;
const DURATION_GAME_OVER_SCREEN = 10;

const DEPLOY = true;
const PORT = DEPLOY ? (process.env.PORT || 13000) : 5500;

const FAST_TEST_MODE = false;


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
    private _points : Array<Point2_S>;
    public get points() : Array<Point2_S> { return this._points; }
    public set points(value : Array<Point2_S>) { this._points = value; }
    
    constructor(x1: number, y1: number, x2: number, y2: number, color: string)
    {
        this._points = new Array<Point2_S>(2);
        this._points[0] = new Point2_S(x1, y1);
        this._points[1] = new Point2_S(x2, y2);
    }
}

class LiteRay_S
{
    private _points : Array<Point2_S> = new Array<Point2_S>();
    public get points() : Array<Point2_S> { return this._points; }
    public set points(value : Array<Point2_S>) { this._points = value; }
    
    public color: string;
    public speed: number;
    public alive: boolean;

    // player controls
    up: boolean; down: boolean; left: boolean; right: boolean;
    action: boolean;

    constructor()
    {
        this.color = "#8888ff";
        this.speed = 1;

        this.up = false;
        this.down = false;
        this.left = false;
        this.right = false;
        this.action = false;

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

        const {dirx, diry}: {dirx: number, diry: number} = this.direction();
        if (dirx == -Infinity || diry == -Infinity)
            return new Point2_S(-Infinity, -Infinity);

        // get last point
        const pointLast = this.getLastPoint();

        const x: number = pointLast.x + this.speed*dirx;
        const y: number = pointLast.y + this.speed*diry;
        return new Point2_S(x, y);
    }

    extendsToNextPoint(): void
    {
        if (!this._points || this._points.length == 0)
            return;

        const pointNext: Point2_S = this.getNextPoint();
        if (pointNext.x === -Infinity || pointNext.y === -Infinity)
            return;

        // extend last point
        const nbPoints = this._points.length;
        this._points[nbPoints - 1].x = pointNext.x;
        this._points[nbPoints - 1].y = pointNext.y;
    }

    direction(): {dirx: number, diry: number}
    {
        if (!this._points || this._points.length <= 1)
            return {dirx: -Infinity, diry: -Infinity};

        // get last segment
        const nbPoints = this._points.length;
        const pointLast = this._points[nbPoints - 1];
        const pointLastPrev = this._points[nbPoints - 2];

        // compute unit direction vector
        const dx: number = pointLast.x - pointLastPrev.x;
        const dy: number = pointLast.y - pointLastPrev.y;

        const dirx: number = Math.sign(dx);
        const diry: number = Math.sign(dy);
        return {dirx: dirx, diry: diry};
    }

    keyControl()
    {
        const {dirx, diry}: {dirx: number, diry: number} = this.direction();

        // get last segment
        const nbPoints = this._points.length;
        const pointLast = this._points[nbPoints - 1];


        if(this.up && diry == 0)
            this.addPoint(pointLast.x, pointLast.y - this.speed);
        else if(this.down && diry == 0)
            this.addPoint(pointLast.x, pointLast.y + this.speed);
        else if(this.left && dirx == 0)
            this.addPoint(pointLast.x - this.speed, pointLast.y);
            else if(this.right && dirx == 0)
            this.addPoint(pointLast.x + this.speed, pointLast.y);
    }
}

function collideSegment(ray: LiteRay_S, x1: number, y1: number, x2: number, y2: number): boolean
{
    const pointLast: Point2_S = ray.getLastPoint();
    const xr = pointLast.x;
    const yr = pointLast.y;

    if (xr == -Infinity || yr == -Infinity)
        return false;
    
    // check if last point is in bounding box
    const xSegMin = Math.min(x1, x2);
    const xSegMax = Math.max(x1, x2);
    const ySegMin = Math.min(y1, y2);
    const ySegMax = Math.max(y1, y2);
    const isInBoundingBox: boolean =
        (xSegMin <= xr && xr <= xSegMax) && (ySegMin <= yr && yr <= ySegMax);
    if (!isInBoundingBox)
        return false;

    // check if last ray point is on segment
    // point on segment iff. (yr - y1)/(y2 - y1) = (xr - x1)/(x2 - x1)
    // <=> (yr - y1)*(x2 - x1) = (xr - x1)*(y2 - y1) to avoir divisions by 0
    // <=> | (yr - y1)*(x2 - x1) - (xr - x1)*(y2 - y1) | < threshold to handle pixels
    const dist = Math.abs((yr - y1)*(x2 - x1) - (xr - x1)*(y2 - y1));
    
    return (dist <= 480 /* canvas height */);
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
        // skip own ray current segment
        if (isOwnRay && index == ray2.points.length - 1)
            continue;

        if (index > 0)
        {
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


const express = require('express')
const app = express()
let io: any;


if (DEPLOY)
{
    app.use(express.static('.'));
    const http = require('http').Server(app);
    io = require('socket.io')(http);
    
    app.get('/', (req: any, res: any) => res.sendFile(__dirname + '../index.html'));
    
    http.listen(PORT, function(){
        console.log(`listening on port ${PORT}...`);
    })
}
else
{
    io = require('socket.io')(PORT)
    app.get('/', (req: any, res: any) => res.send('Hello World!'))
}

class Player_S extends LiteRay_S
{
    no: number = 0;
    name: string = "";

    room: string = "";
    team: string = "";
    ready: boolean = false;

    creator:  boolean = false;

    score: number = 0;
    killedBy: string = "";
    nbKillsInRound: number = 0;
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

class Game_S
{
    nbPlayersMax: number = 2;
    players: Map<string, Player_S> = new Map<string, Player_S>();
    stadium: Array<Segment_S> = new Array<Segment_S>();

    nbRounds: number = 10;
    round: number = 0;

    password: string = "";
    status: GameStatus = GameStatus.NONE;
    displayStatus: DisplayStatus_S = DisplayStatus_S.NONE;
}

let games = new Map<string, Game_S>();
let clientNo: number = 0;

// for fast test only
let gameTest = new Game_S();
if (FAST_TEST_MODE)
{
    gameTest.nbPlayersMax = 2;
    gameTest.nbRounds = 3;
    games.set("TEST", gameTest);
}

io.on('connection', connected);
setInterval(serverLoop, 1000/60);


//////////////////////////////// RECEIVE EVENTS ///////////////////////////////


function connected(socket: any)
{
    console.log(`Client '${socket.id}' connected`);
    updateRoomsList();

    io.emit('gamesParams', {stadiumW: STADIUM_W, stadiumH: STADIUM_H, fastTestMode: FAST_TEST_MODE});
    
    // create new room
    socket.on('createNewRoom', (params: {name: string, room: string, password: string}, response: any) =>
    {
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
    socket.on('joinRoom', (params: {name: string, room: string, password: string}, response: any) =>
    {
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
        let game = <Game_S>games.get(room);
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
        player.no =  getNextPlayerNoInRoom(room);
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
    socket.on('setRoomParams', (params: {nbPlayersMax: number, nbRounds: number}, response: any) => {
        const room = getPlayerRoomFromId(socket.id);
        if (room.length == 0)
            return;

        // update on all room clients game setup page
        if (games.has(room))
        {
            const game = <Game_S>games.get(room);
            if (game.status != GameStatus.PLAYING)
            {
                game.nbPlayersMax = params.nbPlayersMax;
                game.nbRounds = params.nbRounds;
                updateRoomParams(room);
            }
        }

        updateRoomsList();
    });

    // player parameters update
    socket.on('setPlayerParams', (params: {color: string, team: string, ready: boolean}, response: any) => {
        const room = getPlayerRoomFromId(socket.id);
        if (room.length == 0)
            return;
        if (!games.has(room))
            return;

        const game = <Game_S>games.get(room);
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
            const game = <Game_S>games.get(room);
            if (game.players.size < game.nbPlayersMax)
                return;

            switch (game.status)
            {
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
                    game.status = GameStatus.PLAYING;
                    playNewGame(room);
            }
        }

        updateRoomsList();
    });

    // disconnection
    socket.on('disconnect', function()
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
            if (games.get(room)?.status == GameStatus.SETUP)
            {
                games.delete(room);
                console.log(`Creator '${player.name}' disconnected => Room '${room}' deleted`);
                updateRoomsList();
                kickAllPlayersFromRoom(room);
                return;
            }
        }

        // delete player in room
        const game = <Game_S>games.get(room);
        if (game.players !== null && game.players.has(socket.id))
            game.players.delete(socket.id);

        //deleteEmptyRooms();
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
        const game = <Game_S>games.get(room);
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


function updateRoomsList()
{
    let roomsData = new Array<{room: string, nbPlayersMax: number, nbPlayers: number, status: string}>();
    for (const [room, game] of games)
    {
        const nbPlayersCur = game.players?.size;
        let status: string = "";
        switch (game.status)
        {
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

        roomsData.push({room: room, nbPlayersMax: game.nbPlayersMax, nbPlayers: nbPlayersCur, status: status});
    }

    io.emit('roomsList', roomsData);
}

function updatePlayersList(room: string)
{
    if (!games.has(room))
        return;
    
    const game = <Game_S>games.get(room);
    if (game.players === null)
        return;

    let playersData = new Array<{id: string, name: string}>();
    for (const [id, player] of game.players)
        playersData.push({id: id, name: player.name});

    io.to(room).emit('updatePlayersList', playersData);
}

function updateRoomParams(room: string)
{
    if (!games.has(room))
        return

    const game = <Game_S>games.get(room);
    io.to(room).emit('updateRoomParams',
        {room: room, nbPlayersMax: game.nbPlayersMax, nbRounds: game.nbRounds});
}

function updatePlayersParams(room: string)
{
    if (!games.has(room))
        return

    const game = <Game_S>games.get(room);
    let playersParams = new Array<{id: string, name: string, color: string, team: string, ready: boolean}>();
    for (const [id, player] of game.players)
        playersParams.push({id: id, name: player.name, color: player.color, team: player.team, ready: player.ready}); 

    io.to(room).emit('updatePlayersParams', playersParams);
}


function kickPlayerFromRoom(room: string, id: string)
{
    if (!games.has(room))
        return

    io.to(room).emit('kickFromRoom', {room: room, id: id});
}

function kickAllPlayersFromRoom(room: string)
{
    io.to(room).emit('kickFromRoom', {room: room, id: ""});
}

function playNewGame(room: string)
{
    if (!games.has(room))
        return;
    
    const game = <Game_S>games.get(room);
    game.round = 0;
    game.displayStatus = DisplayStatus_S.PREPARE;
    newRound(room);

    game.round = 0;
    io.to(room).emit('prepareGame', {room: room, nbPlayersMax: game.nbPlayersMax, nbRounds : game.nbRounds});

    // create players
    setTimeout(() => {
        let playerParams = Array<{id: string, name: string, x1: number, y1: number, x2: number, y2: number, color: string}>();
        for (const [id, player] of game.players)
        {
            player.score = player.nbKillsInRound = 0;
            player.killedBy = "";

            playerParams.push({id: id, name: player.name, x1: player.points[0].x, y1: player.points[0].y,
                x2: player.points[1].x, y2: player.points[1].y, color: player.color});
        }

        io.to(room).emit('createPlayers', playerParams);
        game.displayStatus = DisplayStatus_S.PLAYING;
    }, DURATION_PREPARE_SCREEN*1000);
}


function getNextPlayerNoInRoom(room: string): number
{
    if (!games.has(room))
        return -1;
    const game = <Game_S>games.get(room);

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
    const game = <Game_S>games.get(room);

    const yDiff = 80;

    for (const [id, player] of game.players)
    {
        const side = (player.no % 2 == 0) ? 2 : 1; // TODO: handle teams
        const nbPlayersInSide = (side == 1) ?
            Math.ceil(game.nbPlayersMax / 2) :
            Math.floor(game.nbPlayersMax / 2);
        const noPlayerInTeam = Math.floor((player.no - 1) / 2) + 1;

        const xStart = (side == 1) ? 50 : STADIUM_W - 50;
        let yMin = (nbPlayersInSide % 2 == 0) ?
            STADIUM_H/2 - (Math.floor(nbPlayersInSide/2) - 0.5)*yDiff :
            STADIUM_H/2 - Math.floor(nbPlayersInSide/2)*yDiff;
        const yStart = yMin + (noPlayerInTeam - 1)*yDiff;
        //console.log('PLAYER ', (player.no, noPlayerInTeam, yMin, xStart, yStart);

        const dx = (side == 1) ? 1 : -1;
        
        player.points = new Array<Point2>();
        player.addPoint(xStart, yStart);
        player.addPoint(xStart + dx, yStart);

        player.alive = true;
        player.killedBy = "";
        player.nbKillsInRound = 0;
        player.up = player.down = player.left = player.right = player.action = false;
        
        // for fast test only
        if (FAST_TEST_MODE)
        {
            const playersColors = ["#ffff00", "#8888ff", "#ff0000", "#00ff00"];
            const playersNames = ["Player 1", "Player 2 long name", "Player 3", "Player 4"];
            player.color = playersColors[player.no - 1];
            player.name = playersNames[player.no - 1];
        }
    }    
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

        for (let [id, player] of game.players)
        {
            io.to(room).emit('updatePlayersPositions', {
                id: id,
                points: player.points
            });
        }
    }
}

function gameLogic(room: string): void
{
    // check remaining players
    if (!games.has(room))
    return;
    const game = <Game_S>games.get(room);

    let nbPlayersAlive = 0;
    for (const [id, player] of game.players)
        if (player.alive)
            nbPlayersAlive++;

    const nbPlayersLast = (game.nbPlayersMax > 1) ? 1 : 0; // TODO: handle teams
    if (nbPlayersAlive <= nbPlayersLast)
        scoring(room);
}

function physicsLoop(room: string): void
{
    if (!games.has(room))
        return;
    const game = <Game_S>games.get(room);
    //console.log(room, game.players);

    // extend to next point
    game.players.forEach((player) => {
        if (player.alive)
            player.extendsToNextPoint();
            
    });

    // check for collisions
    game.players.forEach((player) => {

        if (player.alive)
        {
            for (const [id, otherPlayer] of game.players)
            {
                if (collideRay(player, <LiteRay_S>otherPlayer))
                {
                    player.alive = false;
                    player.killedBy = id;
                    //console.log("COLLISION RAY");
                }   
            }

            for (const wall of game.stadium)
            {
                if (player.alive)
                if (collideSegment(player, wall.points[0].x, wall.points[0].y, wall.points[1].x, wall.points[1].y))
                {
                    player.alive = false;
                    player.killedBy = "WALL";
                    //console.log("COLLISION WALL");
                }   
            }
        }
    });
}

function userInteraction(room: string): void
{
    if (!games.has(room))
        return;      
    const game = <Game_S>games.get(room);
    game.players.forEach((player) => { player.keyControl(); })
}

function scoring(room: string)
{
    if (!games.has(room))
        return;      
    const game = <Game_S>games.get(room);

    // update players scores
    for (const [id, player] of game.players)
    {
        const idKiller : string = player.killedBy;
        //console.log(`Player ${id}: killed by ${idKiller}`);

        if (idKiller == id) // suicide
        {
            player.score = Math.max(player.score - 1, 0);
            player.nbKillsInRound--;
        }
        else if (idKiller == "WALL")
        {
            // nop
        }
        else if (idKiller.length > 0)
        {
            if (game.players.has(idKiller))
            {
                (<Player_S>game.players.get(idKiller)).score++;
                (<Player_S>game.players.get(idKiller)).nbKillsInRound++;
            }
        }
        
        //console.log(`${player.name}: ${player.score} point(s)`);
    }
    
    // display scores
    game.displayStatus = DisplayStatus_S.SCORES;
    let scoreParams = new Array<{id: string, score: number, nbKills: number}>();
    for (const [id, player] of game.players)
        scoreParams.push({id: id, score: player.score, nbKills: player.nbKillsInRound});
    io.to(room).emit('displayScores', scoreParams);

    // check if players have reached max. score
    // TODO: handle ex-aequo
    let winners = new Array<string>();
    for (const [id, player] of game.players)
        if (player.score >= game.nbRounds)
            winners.push(id);

    if (winners.length == 0)
        setTimeout(() => { newRound(room); }, DURATION_SCORES_SCREEN*1000);
    else
        gameOver(room, winners);
}

function newRound(room: string): void
{
    if (!games.has(room))
        return;
        
    const game = <Game_S>games.get(room);
    game.round++;
    console.log(`ROOM ${room} - ROUND ${game.round}`);

    newStadium(room);
    initPlayersPositions(room);
    game.displayStatus = DisplayStatus_S.PLAYING;
}

function newStadium(room: string): void
{
    if (!games.has(room))
        return;

    const game = <Game_S>games.get(room);
    game.stadium = new Array<Segment_S>();

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

function sendStadium(room: string): void
{
    if (!games.has(room))
        return;

    const game = <Game_S>games.get(room);
    let stadiumParams = new Array<{x1: number, y1: number, x2: number, y2: number}>();
    for (const wall of game.stadium)
        stadiumParams.push({x1: wall.points[0].x, y1: wall.points[0].y, x2: wall.points[1].x, y2: wall.points[1].y});

    io.to(room).emit('stadium', stadiumParams);
}

function gameOver(room: string, winners: Array<string>): void
{
    if (!games.has(room))
        return;
    const game = <Game_S>games.get(room);

    //  display game over screen
    game.displayStatus = DisplayStatus_S.GAME_OVER;
    io.to(room).emit('gameOver', winners);

    // go back to setup page
    setTimeout(() => {
        game.status = GameStatus.SETUP;
        for (const [id, player] of game.players)
            player.ready = false;

        io.to(room).emit('displaySetup', {room: room, resetReady: true});
    }, DURATION_GAME_OVER_SCREEN*1000); 
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