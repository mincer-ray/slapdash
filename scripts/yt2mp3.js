const fs = require('fs');
const readline = require('readline');
const ytdl = require('ytdl-core');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const ffmpeg = require('fluent-ffmpeg');
ffmpeg.setFfmpegPath(ffmpegPath);

const toMp3 = (url, name, database) => {
  let start = Date.now();

  let stream = ytdl(url, {
    quality: 'highestaudio',
  });
  
  return ytdl.getInfo(url, {
    quality: 'highestaudio',
  }).then((data) => {
    const totalTime = parseInt(data.player_response.videoDetails.lengthSeconds, 10);

    database.ref(`jobs/${name}`).set({
      name: data.player_response.videoDetails.title,
      progress: '0%',
    })
    
    return new Promise((resolve, reject) => {
      ffmpeg(stream)
        .audioBitrate(128)
        .save(`${__dirname}/../output/${name}.mp3`)
        .on('progress', (p) => {
          const progressString = convertTime(p, totalTime);
          database.ref(`jobs/${name}`).set({
            name: data.player_response.videoDetails.title,
            progress: progressString,
          })         

          logText(progressString);
        })
        .on('end', () => {
          fs.rename(`${__dirname}/../output/${name}.mp3`, `${__dirname}/../output/${name}_finished.mp3`, (err) => {
            if (err) console.log(err);
          });
          console.log(`\ndone, thanks - ${(Date.now() - start) / 1000}s`)
          setTimeout(() => {
            fs.unlink(`${__dirname}/../output/${name}_finished.mp3`, (err) => {
              if (err) console.log(err);
            });
          }, 600000);
          resolve();
        });
    });
  });
}

const logText = (text) => {
  console.log('PROGRESS', text);
  // readline.cursorTo(process.stdout, 0);
  // process.stdout.write(text);
}

const convertTime = (p, totalTime) => {
  const timeData = p.timemark.split('.')[0].split(':');
  let convertedTime = 0;
  convertedTime = convertedTime + parseInt(timeData[2]);
  convertedTime = convertedTime + parseInt(timeData[1]) * 60;
  convertedTime = convertedTime + parseInt(timeData[0]) * 60 * 60;
  const timeMark = parseInt(p.timemark, 10);
  const progressString = `${Math.floor((convertedTime / totalTime) * 100)}%`;

  return progressString;
}

module.exports = toMp3;