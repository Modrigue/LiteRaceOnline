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

            let index = 0;
            ctx.font = "24px Arial";
            for (const [id, player] of PLAYERS)
            {
                const yText = 160 + 30*index;

                // name
                ctx.fillStyle = player.color;
                ctx.textAlign = "right";
                ctx.fillText(`${player.name}`, STADIUM_W_CLIENT/2 - 100, yText);

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

            break;
    }
}