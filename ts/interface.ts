window.onload = function()
{
    // start on welcome page
    setVisible("pageGameSetup", false);

    const userName = <HTMLInputElement>document.getElementById('userName');
    userName.addEventListener('input', updateWelcomeGUI)
    userName.focus();

    // welcome page

    const radioJoin = <HTMLInputElement>document.getElementById('radioJoinRoom');
    const radioCreate = <HTMLInputElement>document.getElementById('radioCreateRoom');
    radioJoin.addEventListener('change', selectJoinRoom);
    radioCreate.addEventListener('change', selectCreateRoom);

    const joinRoomName = <HTMLSelectElement>document.getElementById('joinRoomName');
    const createRoomName = <HTMLInputElement>document.getElementById('createRoomName');
    const passwordRoom = <HTMLInputElement>document.getElementById('password');
    joinRoomName.addEventListener('input', updateWelcomeGUI);
    createRoomName.addEventListener('input', updateWelcomeGUI);
    joinRoomName.addEventListener('keydown', (e) => onRoomInputKeyDown(e));
    createRoomName.addEventListener('keydown', (e) => onRoomInputKeyDown(e));
    passwordRoom.addEventListener('keydown', (e) => onRoomInputKeyDown(e));

    const buttonSubmit = <HTMLButtonElement>document.getElementById('buttonSubmit');
    buttonSubmit.addEventListener('click', onSubmit);

    // game setup page

    const inputNbPlayers = <HTMLInputElement>document.getElementById('gameNbPlayers');
    inputNbPlayers.addEventListener('input', onNumberInput);
    const inputNbRounds = <HTMLInputElement>document.getElementById('gameNbRounds');
    inputNbRounds.addEventListener('input', onNumberInput);

    // game page
    const buttonPlay = <HTMLButtonElement>document.getElementById('buttonPlay');
    buttonPlay.addEventListener('click', onPlay);
}

function updateWelcomeGUI()
{
    const userName = <HTMLInputElement>document.getElementById('userName');
    const nameEmpty: boolean = (userName.value === null || userName.value.length == 0);
    const mode: string = getSelectedRoomMode();

    // join room items
    (<HTMLInputElement>document.getElementById('radioJoinRoom')).disabled = nameEmpty;
    const joinRoomName = <HTMLSelectElement>document.getElementById('joinRoomName');
    joinRoomName.disabled = nameEmpty || (mode == "create");

    // create room items
    (<HTMLInputElement>document.getElementById('radioCreateRoom')).disabled = nameEmpty;
    const createRoomName = <HTMLInputElement>document.getElementById('createRoomName');
    createRoomName.disabled = nameEmpty || (mode == "join");

    let room: string = getSelectedRoomName();
    const roomReady: boolean = !(nameEmpty || room.length == 0);
    (<HTMLButtonElement>document.getElementById('buttonSubmit')).disabled = !roomReady;
    (<HTMLInputElement>document.getElementById('password')).disabled = !roomReady;
}

function selectJoinRoom()
{
    updateWelcomeGUI();
    const joinRoomName = <HTMLSelectElement>document.getElementById('joinRoomName');

    if (!joinRoomName.disabled)
        joinRoomName.focus();
}

function selectCreateRoom()
{
    updateWelcomeGUI();
    const createRoomName = <HTMLInputElement>document.getElementById('createRoomName');

    if (!createRoomName.disabled)
        createRoomName.focus();
}

function onRoomInputKeyDown(e: any)
{
    switch(e.key)
    {
        case 'Enter':
            onSubmit();
            break;
    }
}

function getSelectedRoomMode(): string
{
    // get selected mode
    const radiosMode = <NodeListOf<HTMLInputElement>>document.querySelectorAll('input[name="radioJoinCreateRoom"]');
    for (const radioMode of radiosMode)
        if (radioMode.checked)
            return radioMode.value;

    // not found
    return "";
}

function getSelectedRoomName(): string
{
    let room: string = "";

    const joinRoomName = <HTMLSelectElement>document.getElementById('joinRoomName');
    const createRoomName = <HTMLInputElement>document.getElementById('createRoomName');
    const mode: string = getSelectedRoomMode();
    switch(mode)
    {
        case "join":
            room = joinRoomName.value;
            break;

        case "create":
            room = createRoomName.value;
            break;
    }

    return room;
}

function setVisible(id: string, status: boolean): void
{
    let elem: HTMLElement = <HTMLElement>document.getElementById(id);
    elem.style.display = status ? "block" : "none";
}

function setEnabled(id: string, status: boolean): void
{
    let elem: any = document.getElementById(id);
    elem.disabled = !status;
}

function removeAllChildren(parent: any): void
{
    while (parent.firstChild)
    {
        parent.removeChild(parent.firstChild);
    }
}