"use strict";
//import { canvas, socket } from "./client.js";
let justPressed = false;
let isDown = false;
//Event listeners for the arrow keys
function userInput(obj, canvas) {
    canvas.addEventListener('keydown', function (e) {
        // prevents multiple simultaneous keys
        // TODO: temporization?
        if (isDown)
            return;
        isDown = true;
        switch (e.key) {
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
        if (justPressed) {
            emitUserCommands(obj);
            justPressed = false;
            // prevent scrolling
            e.preventDefault();
            return false;
        }
    });
    canvas.addEventListener('keyup', function (e) {
        isDown = false;
        let hasReleasedKey = false;
        switch (e.key) {
            case 'ArrowLeft':
                hasReleasedKey = true;
                obj.left = false;
                break;
            case 'ArrowUp':
                hasReleasedKey = true;
                obj.up = false;
                break;
            case "ArrowRight":
                hasReleasedKey = true;
                obj.right = false;
                break;
            case "ArrowDown":
                hasReleasedKey = true;
                obj.down = false;
                break;
            case ' ':
                hasReleasedKey = true;
                obj.action = false;
                break;
        }
        emitUserCommands(obj);
        // prevent scrolling
        if (hasReleasedKey) {
            e.preventDefault();
            return false;
        }
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