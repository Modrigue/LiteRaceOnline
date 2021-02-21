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
            ctx.fillText("PREPARE TO RACE!", 640/2, 200);
            break;

        case DisplayStatus.PLAYING:
            PLAYERS.forEach((player) => { player.draw(ctx); })
            STADIUM.forEach((wall) => { wall.draw(ctx); })

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
                ctx.fillText("★  SCORES  ★", 640/2, 40);
                ctx.fillText(`Match in ${nbRounds} points`, 640/2, 80);
            }
            else if (displayStatus == DisplayStatus.GAME_OVER)
            {
                ctx.fillText("★  GAME OVER  ★", 640/2, 40);

                let winnersStr = "";
                for (const winner of winners)
                    winnersStr += ` ${winner}`; 

                ctx.fillText(`Winners: ${winnersStr}`, 640/2, 80);
            }

            let index = 0;
            ctx.font = "24px Arial";
            for (const [id, player] of PLAYERS)
            {
                ctx.fillStyle = player.color;
                ctx.textAlign = "right";
                ctx.fillText(`${player.name}  `, 640/2, 160 + 40*index);

                ctx.textAlign = "left";
                const nbKillsStr: string = (player.nbKillsInRound > 0) ?
                    `+${player.nbKillsInRound}` : player.nbKillsInRound.toString();
                ctx.fillText(`  ${player.score} point(s)   (${nbKillsStr})`, 640/2, 160 + 40*index);
                index++;
            }

            break;
    }
}