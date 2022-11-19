const express = require('express');
const morgan = require('morgan');
const path = require('path');

const fs = require('fs');

const crypto = require('crypto');

const yt2mp3 = require('./scripts/yt2mp3');

const firebase = require('firebase-admin')
// init firebase

let config = null;
console.log(process.env.NODE_ENV)
if (process.env.NODE_ENV === 'production') {
  config = JSON.parse(process.env.SECRETS)
} else {
  config = require('./config/slapdash-admin.json');
}
console.log(config);

// Initialize the app with a service account, granting admin privileges
firebase.initializeApp({
  credential: firebase.credential.cert(config),
  databaseURL: config.databaseURL,
});

const database = firebase.database()

const app = express();
const port = process.env.PORT || 3000;

app.use(morgan('combined'));

app.use('/public', express.static(__dirname + '/public'));
app.use('/output', express.static(__dirname + '/output'));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

app.get('/yt2mp3', (req, res) => {
  const url = req.query.url;
  const id = crypto.createHash('md5').update(url).digest("hex");
  yt2mp3(url, id, database).then((data) => {
    console.log('finished');
  });
  
  res.send(id);
});

app.get('/status', (req, res) => {
  const id = req.query.id;

  if (fs.existsSync(__dirname + '/output/' + id + '_finished.mp3')) {
    database.ref(`jobs/${id}`).once('value').then((val) => {
      fs.rename(`${__dirname}/output/${id}_finished.mp3`, `${__dirname}/output/${val.val().name}.mp3`, (err) => {
        if (err) console.log(err);
        res.send(val.val().name);
      });
    });
  } else {
    database.ref(`jobs/${id}`).once('value').then((val) => {
      try {
        res.send(val.val().progress);
      } catch (err) {
        res.send(err.message);
      }
    });
  }
});

app.listen(port, () => console.log(`Multitool listening on port ${port}!`))