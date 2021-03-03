"use strict";
window.onload = function () {
    window.addEventListener("resize", onResize);
    onResize();
    // start on welcome page
    setVisible("pageGameSetup", false);
    const userName = document.getElementById('userName');
    userName.addEventListener('input', updateWelcomeGUI);
    userName.focus();
    // welcome page
    const radioJoin = document.getElementById('radioJoinRoom');
    const radioCreate = document.getElementById('radioCreateRoom');
    radioJoin.addEventListener('change', selectJoinRoom);
    radioCreate.addEventListener('change', selectCreateRoom);
    const joinRoomName = document.getElementById('joinRoomName');
    const createRoomName = document.getElementById('createRoomName');
    const passwordRoom = document.getElementById('password');
    joinRoomName.addEventListener('input', updateWelcomeGUI);
    createRoomName.addEventListener('input', updateWelcomeGUI);
    joinRoomName.addEventListener('keydown', (e) => onRoomInputKeyDown(e));
    createRoomName.addEventListener('keydown', (e) => onRoomInputKeyDown(e));
    passwordRoom.addEventListener('keydown', (e) => onRoomInputKeyDown(e));
    const buttonSubmit = document.getElementById('buttonSubmit');
    buttonSubmit.addEventListener('click', onSubmit);
    // game setup page
    const inputNbPlayers = document.getElementById('gameNbPlayers');
    inputNbPlayers.addEventListener('input', onRoomParamsChanged);
    const inputNbRounds = document.getElementById('gameNbRounds');
    inputNbRounds.addEventListener('input', onRoomParamsChanged);
    const inputHasTeams = document.getElementById('gameHasTeams');
    inputHasTeams.addEventListener('input', onRoomParamsChanged);
    const selectMode = document.getElementById('gameMode');
    selectMode.addEventListener('change', onRoomParamsChanged);
    // game page
    const buttonPlay = document.getElementById('buttonPlay');
    buttonPlay.addEventListener('click', onPlay);
};
// initialize sounds
window.addEventListener("DOMContentLoaded", (event) => {
    soundCollision = document.getElementById('soundCollision');
});
function updateWelcomeGUI() {
    const userName = document.getElementById('userName');
    const nameEmpty = (userName.value === null || userName.value.length == 0);
    const mode = getSelectedRoomMode();
    // join room items
    document.getElementById('radioJoinRoom').disabled = nameEmpty;
    const joinRoomName = document.getElementById('joinRoomName');
    joinRoomName.disabled = nameEmpty || (mode == "create");
    // create room items
    document.getElementById('radioCreateRoom').disabled = nameEmpty;
    const createRoomName = document.getElementById('createRoomName');
    createRoomName.disabled = nameEmpty || (mode == "join");
    let room = getSelectedRoomName();
    const roomReady = !(nameEmpty || room.length == 0);
    document.getElementById('buttonSubmit').disabled = !roomReady;
    document.getElementById('password').disabled = !roomReady;
}
function selectJoinRoom() {
    updateWelcomeGUI();
    const joinRoomName = document.getElementById('joinRoomName');
    if (!joinRoomName.disabled)
        joinRoomName.focus();
}
function selectCreateRoom() {
    updateWelcomeGUI();
    const createRoomName = document.getElementById('createRoomName');
    if (!createRoomName.disabled)
        createRoomName.focus();
}
function onRoomInputKeyDown(e) {
    switch (e.key) {
        case 'Enter':
            onSubmit();
            break;
    }
}
function getSelectedRoomMode() {
    // get selected mode
    const radiosMode = document.querySelectorAll('input[name="radioJoinCreateRoom"]');
    for (const radioMode of radiosMode)
        if (radioMode.checked)
            return radioMode.value;
    // not found
    return "";
}
function getSelectedRoomName() {
    let room = "";
    const joinRoomName = document.getElementById('joinRoomName');
    const createRoomName = document.getElementById('createRoomName');
    const mode = getSelectedRoomMode();
    switch (mode) {
        case "join":
            room = joinRoomName.value;
            break;
        case "create":
            room = createRoomName.value;
            break;
    }
    return room;
}
//////////////////////////////////// DOM HELPERS //////////////////////////////
// keep ratio at resize
function onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const ratioStadium = STADIUM_W_CLIENT / STADIUM_H_CLIENT;
    const ratioWindow = w / h;
    if (w * STADIUM_H_CLIENT == h * STADIUM_W_CLIENT) // equal ratios
     {
        canvas.style.left = "0";
        canvas.style.top = "0";
        canvas.style.width = `${window.innerWidth.toString()}px`;
        canvas.style.height = `${window.innerHeight.toString()}px`;
    }
    else if (ratioWindow > ratioStadium) // width too big
     {
        const wNew = Math.round(h * ratioStadium);
        const leftNew = Math.round(w / 2 - wNew / 2);
        canvas.style.left = `${leftNew}px`;
        canvas.style.top = "0";
        canvas.style.height = `${h}px`;
        canvas.style.width = `${wNew}px`;
    }
    else if (ratioWindow < ratioStadium) // height too big
     {
        const hNew = Math.round(w / ratioStadium);
        const topNew = Math.round(h / 2 - hNew / 2);
        canvas.style.left = "0";
        canvas.style.top = `${topNew}px`;
        canvas.style.width = `${w}px`;
        canvas.style.height = `${hNew}px`;
    }
}
function setVisible(id, status) {
    let elem = document.getElementById(id);
    elem.style.display = status ? "block" : "none";
}
function setEnabled(id, status) {
    let elem = document.getElementById(id);
    if (!elem || elem === undefined)
        return;
    elem.disabled = !status;
}
function removeAllChildren(parent) {
    if (parent === null || parent === undefined)
        return;
    while (parent.firstChild) {
        parent.removeChild(parent.firstChild);
    }
}
//# sourceMappingURL=interface.js.map