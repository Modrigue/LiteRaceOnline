"use strict";
window.onload = function () {
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
    inputNbPlayers.addEventListener('input', onNumberInput);
    const inputNbRounds = document.getElementById('gameNbRounds');
    inputNbRounds.addEventListener('input', onNumberInput);
    // game page
    const buttonPlay = document.getElementById('buttonPlay');
    buttonPlay.addEventListener('click', onPlay);
};
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
function setVisible(id, status) {
    let elem = document.getElementById(id);
    elem.style.display = status ? "block" : "none";
}
function setEnabled(id, status) {
    let elem = document.getElementById(id);
    elem.disabled = !status;
}
function removeAllChildren(parent) {
    while (parent.firstChild) {
        parent.removeChild(parent.firstChild);
    }
}
//# sourceMappingURL=interface.js.map