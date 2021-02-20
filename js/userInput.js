"use strict";
//import { canvas, socket } from "./client.js";
let justPressed = false;
//Event listeners for the arrow keys
function userInput(obj, canvas) {
    canvas.addEventListener('keydown', function (e) {
        switch (e.key) {
            case 'ArrowLeft':
                obj.left = true;
                justPressed = true;
                break;
            case 'ArrowUp':
                obj.up = true;
                justPressed = true;
                break;
            case "ArrowRight":
                obj.right = true;
                justPressed = true;
                break;
            case "ArrowDown":
                obj.down = true;
                justPressed = true;
                break;
            case ' ':
                obj.action = true;
                justPressed = true;
                break;
        }
        if (justPressed === true) {
            emitUserCommands(obj);
            justPressed = false;
        }
    });
    canvas.addEventListener('keyup', function (e) {
        switch (e.key) {
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
function emitUserCommands(obj) {
    let userCommands = {
        left: obj.left,
        up: obj.up,
        right: obj.right,
        down: obj.down,
        action: obj.action
    };
    socket.emit('userCommands', userCommands);
}
//# sourceMappingURL=userInput.js.map