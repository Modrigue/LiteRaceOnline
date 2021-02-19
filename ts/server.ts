const DEPLOY = true;
const PORT = DEPLOY ? (process.env.PORT || 13000) : 5500;

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

class Player_S
{
    score: number = 0;
    no: number = 0;
    name: string = "";

    room: string = "";
    color: string = "#0000ff";
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

    nbRounds: number = 3;

    password: string = "";
    status: GameStatus = GameStatus.NONE;
}

let games = new Map<string, Game_S>();
let clientNo: number = 0;

io.on('connection', connected);


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
        const game = <Game_S>games.get(room);
        if (game.players !== null && game.players.has(params.id))
        {
            game.players.delete(params.id);
            kickPlayerFromRoom(room, params.id);
        }

        updateRoomsList();
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

    const game = <Game_S>games.get(room);
    io.to(room).emit('playGame', {room: room, nbPlayersMax: game.nbPlayersMax, nbRounds : game.nbRounds});
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