async function playAudio(sound: HTMLAudioElement, volume: number = 1)
{
    try
    {
        sound.volume = volume;
        await sound.play();
    }
    catch(err)
    {
      //
    }
}