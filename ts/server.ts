const DEPLOY = true;
const PORT = DEPLOY ? (process.env.PORT || 13000) : 5500;


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
        this.color = "white";
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
    score: number = 0;
    no: number = 0;
    name: string = "";

    room: string = "";
    team: string = "";
    ready: boolean = false;

    creator:  boolean = false;
}

enum GameStatus
{
    NONE,
    SETUP,
    PLAYING
}

class Game_S
{
    nbPlayersMax: number = 2;
    players: Map<string, Player_S> = new Map<string, Player_S>();
    stadium: Array<Segment_S> = new Array<Segment_S>();

    nbRounds: number = 15;

    password: string = "";
    status: GameStatus = GameStatus.NONE;
}

let games = new Map<string, Game_S>();
let clientNo: number = 0;

let gameTest = new Game_S();
gameTest.nbPlayersMax = 1;
games.set("TEST", gameTest);

io.on('connection', connected);
setInterval(serverLoop, 1000/60);


//////////////////////////////// RECEIVE EVENTS ///////////////////////////////


function connected(socket: any)
{
    console.log(`Client '${socket.id}' connected`);
    updateRoomsList();

    const room = 1;
    //const nbPlayersReady = getNbPlayersReadyInRoom(room);
    
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
        creator.no = 0;

        let newGame = new Game_S();
        newGame.players.set(socket.id, creator);
        newGame.password = params.password;
        newGame.status = GameStatus.SETUP;
        games.set(room, newGame);
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
        player.no = game.players.size;

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
            switch (game.status)
            {
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
                    playGame(room);
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

function playGame(room: string)
{
    if (!games.has(room))
        return

    newStadium(room);
    
    const game = <Game_S>games.get(room);
    io.to(room).emit('playGame', {room: room, nbPlayersMax: game.nbPlayersMax, nbRounds : game.nbRounds});
    
    // TODO: init players position at each round
    let playerParams = Array<{id: string, x1: number, y1: number, x2: number, y2: number, color: string}>();
    for (const [id, player] of game.players)
    {
        player.addPoint(20, 240);
        player.addPoint(21, 240);
        player.alive = true;
        playerParams.push({id: id, x1: player.points[0].x, y1: player.points[0].y,
            x2: player.points[1].x, y2: player.points[1].y, color: player.color});
    }
    io.to(room).emit('createPlayers', playerParams);
}


/////////////////////////////////////// LOOPS /////////////////////////////////

function serverLoop()
{
    userInteraction();
    physicsLoop();

    // send players positions to clients
    for (const [room, game] of games)
    {
        //if (gameIsOn.get(room))
        {
            gameLogic(room);
            for (let [id, player] of game.players)
            {
                io.to(room).emit('updatePlayersPositions', {
                    id: id,
                    points: player.points
                });
            }
        }
        // else
        // {
        //     //
        // }
    }
}

function gameLogic(room: string): void
{
    // check remaining players
}

function physicsLoop(): void
{
    for (const [room, game] of games)
    {
        //console.log(room, game.players);
        // extend to next point
        game.players.forEach((player) => {
            if (player.alive)
                player.extendsToNextPoint();
                
        });

        // check for collisions
        game.players.forEach((player) => {
            for (const [id, ray] of game.players)
            {
                if (player.alive)
                if (collideRay(player, <LiteRay_S>ray))
                {
                    player.alive = false;
                    console.log("COLLISION RAY");
                }   
            }

            for (const wall of game.stadium)
            {
                if (player.alive)
                if (collideSegment(player, wall.points[0].x, wall.points[0].y, wall.points[1].x, wall.points[1].y))
                {
                    player.alive = false;
                    console.log("COLLISION WALL");
                }   
            }
        })
    }
}

function userInteraction(): void
{
    for (const [room, game] of games)
    {
        game.players.forEach((player) => { player.keyControl(); })
    }
}

function newStadium(room: string): void
{
    if (!games.has(room))
        return;

    const game = <Game_S>games.get(room);
    game.stadium = new Array<Segment_S>();

    let wall1 = new Segment_S(10, 0, 10, 480, "darkgrey");
    let wall2 = new Segment_S(630, 0, 630, 480, "darkgrey");
    let wall3 = new Segment_S(0, 10, 640, 10, "darkgrey");
    let wall4 = new Segment_S(0, 400, 640, 400, "darkgrey");

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