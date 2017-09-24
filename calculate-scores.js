var request = require("request");
var _ = require ("underscore");

module.exports = function (req, res, db) {
  
    db.ref("weeks").once("value", function(weeksSnapshot) {

      var dateToCalculateScoreFor = null;

      var weekObj;
      if (dateToCalculateScoreFor) {
        
        // var weekObj = _.find(weeksSnapshot.val(), (week) => {

        //   var weekDate = new Date(week.dueDate);


        //   week.dueDate
        // });
      } else { 

        weekObj =_.last(weeksSnapshot.val());
      }

      console.log(`Updating scores for week: ${weekObj.week}`);

      var week = weekObj.week;
      request(`http://xmasclubscorer.azurewebsites.net/api/gameresults/${week}`, function(error, response, body) {
        
        var gameResults = JSON.parse(body);

        db.ref(`/scorecards/${week}`).once("value", function(scorecardsSnapshot) {
        
          var scorecards = _.values(scorecardsSnapshot.val());

          for (var scorecard of scorecards) {

            scorecard.score = 0;

            for (var pick of scorecard.picks) {

              var game = _.find(gameResults, (game) => {
                return (game.team1.name.toLowerCase() == pick.team1.toLowerCase()) && (game.team2.name.toLowerCase() == pick.team2.toLowerCase())
              });

              if (!game) {
                console.log(`Unable to find a game for teams. Team1: '${pick.team1}' - Team2: '${pick.team2}' - Spread: '${pick.spread}' - Type: '${pick.pickType}'`);
              } else {

                /* Set the home team on this pick. */
                pick.homeTeam = game.homeTeam;

                if (game.status == "Complete") {

                  var correct = false;

                  var spread = parseFloat(pick.spread);
                  if (isNaN(spread)) {
                    /* The spread is a 'PICK' */
                    spread = 0;
                  }

                  if (pick.isOverUnder) {

                    var totalScore = game.team1.score + game.team2.score;

                    if (spread) {

                      if (pick.selectedPick == "Team1") {
                        if (totalScore >= spread) {
                          correct = true;
                        }
                      } else if (pick.selectedPick == "Team2") {
                        if (totalScore <= spread) {
                          correct = true;
                        }
                      }
                    }

                  }
                  else {

                    if (pick.selectedPick == "Team1") {

                      if (game.winner == "Team1") {

                        if (game.team1.score >= (game.team2.score + spread)) {
                          correct = true;
                        }
                      }

                    } else if (pick.selectedPick == "Team2") {

                      if (game.winner == "Team2") {
                        /* The underdog was picked and they won. */
                        correct = true;
                      }
                      else {

                        /* The underdog lost, check the spread. */
                        if ((game.team2.score + spread) >= game.team1.score) {
                          correct = true;
                        }
                      }
                    }

                    if (correct) {
                      scorecard.score++;
                    }
                  }
                }
              }
            }

            updateScores(db, scorecard);
          }

          res.status(200).json(scorecards);    

        });
      });
    });
};

function updateScores(db, scorecard) {

  db.ref(`/scores/${scorecard.nickname}/weeklyScores`).once("value").then((scoresSnapshot) => {
            
    var foundScore = _.find(scoresSnapshot.val(), score => score.week === scorecard.week);
    if (foundScore) {
      console.log(`Updating scores - User: ${scorecard.nickname} - Score: ${scorecard.score}`);

      //update

    } else {
      console.log(`Inserting into scores - User: ${scorecard.nickname} - Score: ${scorecard.score}`);

      //push
    }
  });
}
