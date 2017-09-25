'use strict';

// Setup express and create our app.
var express = require('express');
var http = require('http');

var app = express();

var bodyParser = require('body-parser');

app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(bodyParser.json());

var firebaseAdmin = require("firebase-admin");

firebaseAdmin.initializeApp({
  credential: firebaseAdmin.credential.cert(require("./xmas-club-firebase-config.json")),
  databaseURL: "https://xmas-club.firebaseio.com"
});

var router = express.Router();

router.get("/", (req, res, next) => {

  var calculateScores = require("./calculate-scores");
  calculateScores(req, res, firebaseAdmin.database());
  
});

app.use('/calculate-scores', router);

var r2 = express.Router();
r2.get("/", (req, res, next) => {

  console.log('Log -', new Date());
  res.status(200).json({ message: 'Success' });
});

app.use('/log', r2);

// Error handler
app.use(function (err, req, res, next) {
  res.status(err.status || 500);
  res.json({
    message: err.message,
    error: err
  });
  next(err);
});

var server = http.createServer(app)

setImmediate(() => {
  var ip = process.env.IP || '0.0.0.0';
  var port = process.env.PORT || 4000;
  var env = process.env.NODE_ENV || 'development';

  server.listen(port, ip, () => {
    console.log('Express server listening on %s:%d, in %s mode', ip, port, env)
  })
});
