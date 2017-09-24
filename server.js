'use strict';

// Setup express and create our app.
var express = require('express');

var app = express();

var bodyParser = require('body-parser');

console.log('[APP] Starting server initialization');

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

// Error handler
app.use(function (err, req, res, next) {
  res.status(err.status || 500);
  res.json({
    message: err.message,
    error: err
  });
  next(err);
});


app.listen(process.env.NODE_PORT);
console.log('[SERVER] Listening on port ' + process.env.NODE_PORT);

