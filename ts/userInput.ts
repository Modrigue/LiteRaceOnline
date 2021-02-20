//import { canvas, socket } from "./client.js";

let justPressed: boolean = false;
let isDown: boolean = false;

//Event listeners for the arrow keys
function userInput(obj: any, canvas: HTMLCanvasElement)
{        
    canvas.addEventListener('keydown', function(e)
    {
        // prevents multiple simultaneous keys
        // TODO: temporization?
        if (isDown)
            return;
        
        isDown = true;

        switch(e.key)
        {
            case 'ArrowLeft':
                obj.left = true;
                obj.right = obj.up = obj.down = false;
                justPressed = true;
                break;

            case 'ArrowUp':
                obj.up = true;
                obj.left = obj.right = obj.down = false;
                justPressed = true;
                break;

            case "ArrowRight":
                obj.right = true;
                obj.left = obj.up = obj.down = false;
                justPressed = true;
                break;

            case "ArrowDown":
                obj.down = true;
                obj.left = obj.right = obj.up = false;
                justPressed = true;
                break;

            case ' ':
                obj.action = true;
                justPressed = true;
                break;
        }

        if (justPressed === true)
        {
            emitUserCommands(obj);
            justPressed = false;
        }
    });
    
    canvas.addEventListener('keyup', function(e)
    {
        isDown = false;

        switch(e.key)
        {
            case 'ArrowLeft':
                obj.left = false;
                break;

            case 'ArrowUp':
                obj.up = false;
                break;

            case "ArrowRight":
                obj.right = false;
                break;

            case "ArrowDown":
                obj.down = false;
                break;

            case ' ':
                obj.action = false;
                break;
        }

        emitUserCommands(obj);
    });    
}

function emitUserCommands(obj: any)
{
    let userCommands = {
        left: obj.left,
        up: obj.up,
        right: obj.right,
        down: obj.down,
        action: obj.action
    }
    
    socket.emit('userCommands', userCommands);
}
