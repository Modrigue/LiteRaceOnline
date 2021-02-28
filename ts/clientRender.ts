function renderOnly(): void
{
    renderLoop();
    requestAnimationFrame(renderOnly);
}

function renderLoop(): void
{
    ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);

    switch (displayStatus)
    {
        case DisplayStatus.PREPARE:
            ctx.textAlign = "center";
            ctx.font = "48px Arial";;
            ctx.fillStyle = "white";
            const imgW = 0.5*STADIUM_W_CLIENT;
            const imgH = imgW*imgPrepare.height/imgPrepare.width;
            ctx.drawImage(imgPrepare, STADIUM_W_CLIENT/2 - imgW/2, STADIUM_H_CLIENT/2 - imgH/2, imgW, imgH);
            break;

        case DisplayStatus.PLAYING:

            drawStadiumBounds();

            PLAYERS.forEach((player) => { player.draw(ctx); })
            STADIUM.forEach((wall) => { wall.draw(ctx); })
            OBSTACLES.forEach((obstacle) => { obstacle.draw(ctx); })

            //// display players' infos
            //userInterface();
            break;

        case DisplayStatus.SCORES:
        case DisplayStatus.GAME_OVER:
            ctx.textAlign = "center";
            ctx.font = "32px Arial";
            ctx.fillStyle = "white";

            ctx.font = "24px Arial";
            if (displayStatus == DisplayStatus.SCORES)
            {
                const imgW = 0.3*STADIUM_W_CLIENT;
                const imgH = imgW*imgScores.height/imgScores.width;
                ctx.drawImage(imgScores, STADIUM_W_CLIENT/2 - imgW/2, 40 - imgH/2, imgW, imgH);
                ctx.fillText(`Match in ${nbRounds} points`, STADIUM_W_CLIENT/2, 100);
            }
            else if (displayStatus == DisplayStatus.GAME_OVER)
            {
                const imgW = 0.5*STADIUM_W_CLIENT;
                const imgH = imgW*imgGameOver.height/imgGameOver.width;
                ctx.drawImage(imgGameOver, STADIUM_W_CLIENT/2 - imgW/2, 40 - imgH/2, imgW, imgH);

                let winnersStr = "";
                for (const winner of winners)
                    winnersStr += ` ${winner}`; 

                ctx.fillText(`Winners: ${winnersStr}`, STADIUM_W_CLIENT/2, 100);
            }

            // adapt display given teams

            let hasTeams = false;
            for (const [id, player] of PLAYERS)
                if (player.team && player.team.length > 0)
                {
                    hasTeams = true;
                    break;
                }

            if (hasTeams)
                displayTeamsScores();
            else
                displayPlayersScores();

            break;
    }
}

function displayPlayersScores()
{
    // look for top score(s)
    let scoreMax: number = 0;
    let scoreMaxPlayers = new Array<string>();
    for (const [id, player] of PLAYERS)
    {
        const scoreCur = player.score;
        if (scoreCur > scoreMax)
        {
            scoreMax = scoreCur;
            scoreMaxPlayers = [id];
        }
        else if (scoreCur == scoreMax && scoreMax > 0)
            scoreMaxPlayers.push(id);
    }
    if (scoreMaxPlayers.length == PLAYERS.size)
        scoreMaxPlayers = new Array<string>();

    // display name, score, nb. kills

    let hasTeams = false;

    let index = 0;
    ctx.font = "24px Arial";
    for (const [id, player] of PLAYERS)
    {
        const yText = 160 + 30*index;

        // name
        ctx.fillStyle = player.color;
        ctx.textAlign = "right";
        const nameStr = scoreMaxPlayers.includes(id) ? `♛ ${player.name}` : player.name
        ctx.fillText(nameStr, STADIUM_W_CLIENT/2 - 100, yText);

        // score
        ctx.textAlign = "center";
        ctx.fillText(`${player.score} point(s)`, STADIUM_W_CLIENT/2, yText);

        // kills
        ctx.textAlign = "left";
        const nbKillsStr: string = (player.nbKillsInRound > 0) ?
            `+${player.nbKillsInRound}` : player.nbKillsInRound.toString();
        ctx.fillText(`(${nbKillsStr})`, STADIUM_W_CLIENT/2 + 100, yText);
        index++;
    }
}

function drawStadiumBounds()
{
    ctx.strokeStyle = "#880088";
    ctx.setLineDash([5, 5]);
    ctx.strokeRect(0, 0, STADIUM_W_CLIENT, STADIUM_H_CLIENT);
    ctx.setLineDash([]);
}

function displayTeamsScores()
{
    // get scores and nb. kills per teams
    let teamsData = new Map<string, TeamData>();
    for (const [id, player] of PLAYERS)
    {
        const team = player.team;

        if (!teamsData.has(team))
            teamsData.set(team, new TeamData());
        const teamDataCur = <TeamData>teamsData.get(team);

        if (teamDataCur.color.length == 0)
        teamDataCur.color += player.color;
        
        teamDataCur.score += player.score;
        teamDataCur.nbKillsInRound += player.nbKillsInRound;
    }

    // look for top score(s)
    let scoreMax: number = 0;
    let scoreMaxTeams = new Array<string>();
    for (const [team, teamData] of teamsData)
    {
        const scoreCur = teamData.score;
        if (scoreCur > scoreMax)
        {
            scoreMax = scoreCur;
            scoreMaxTeams = [team];
        }
        else if (scoreCur == scoreMax && scoreMax > 0)
            scoreMaxTeams.push(team);
    }
    if (scoreMaxTeams.length == teamsData.size)
        scoreMaxTeams = new Array<string>();

    // display team, score, nb. kills
    let index = 0;
    ctx.font = "24px Arial";
    for (const [team, teamData] of teamsData)
    {
        const yText = 160 + 30*index;

        // name
        ctx.fillStyle = teamData.color;
        ctx.textAlign = "right";
        const teamStr = scoreMaxTeams.includes(team) ? `♛ ${team}` : team
        ctx.fillText(teamStr, STADIUM_W_CLIENT/2 - 100, yText);

        // score
        ctx.textAlign = "center";
        ctx.fillText(`${teamData.score} point(s)`, STADIUM_W_CLIENT/2, yText);

        // kills
        ctx.textAlign = "left";
        const nbKillsStr: string = (teamData.nbKillsInRound > 0) ?
            `+${teamData.nbKillsInRound}` : teamData.nbKillsInRound.toString();
        ctx.fillText(`(${nbKillsStr})`, STADIUM_W_CLIENT/2 + 100, yText);
        index++;
    }
}