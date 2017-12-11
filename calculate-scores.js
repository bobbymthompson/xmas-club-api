var request = require("request");
var _ = require("underscore");

module.exports = function (req, res, db) {

  db.ref("weeks").once("value", function (weeksSnapshot) {

    var dateToCalculateScoreFor = null;

    var weekObj;
    if (dateToCalculateScoreFor) {

      // var weekObj = _.find(weeksSnapshot.val(), (week) => {

      //   var weekDate = new Date(week.dueDate);


      //   week.dueDate
      // });
    } else {

      weekObj = _.last(weeksSnapshot.val());
    }

    console.log(`Updating scores for week: ${weekObj.week}`);

    var week = weekObj.week;
    request(`http://xmasclubscorer.azurewebsites.net/api/gameresults/${week}`, function (error, response, body) {

      var gameResults = JSON.parse(body);

      db.ref(`/scorecards/${week}`).once("value", function (scorecardsSnapshot) {

        var updatedScorecards = [];

        var scorecards = _.values(scorecardsSnapshot.val());

        for (var scorecard of scorecards) {

          scorecard.score = 0;

          /* Keep track of the previous pick for use in over/unders. */
          let previousPick = null;

          for (var pick of scorecard.picks) {

            /* Use the previous picks teams when it is an over/under. */
            if (pick.isOverUnder && pick.team1.toLowerCase() == 'over' && pick.team2.toLowerCase() == 'under') {
              pick.team1 = previousPick.team1;
              pick.team2 = previousPick.team2;
            }

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

                } else {

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
                    } else {

                      /* The underdog lost, check the spread. */
                      if ((game.team2.score + spread) >= game.team1.score) {
                        correct = true;
                      }
                    }
                  }
                }

                if (correct) {
                  scorecard.score++;
                }
              }
            }

            previousPick = pick;
          }

          updateScores(db, scorecard);

          updatedScorecards.push({
            nickname: scorecard.nickname,
            score: scorecard.score
          })
        }

        res.status(200).json(updatedScorecards);

      });
    });
  });
};

function updateScores(db, scorecard) {

  db.ref(`/scores/${scorecard.nickname}/weeklyScores`).once("value").then((scoresSnapshot) => {

    var foundScore;
    scoresSnapshot.forEach(function (score) {
      var key = score.key;
      var data = score.val();

      if (data.week == scorecard.week) {
        foundScore = {
          key: key,
          score: data.score
        };
      }
    });

    if (foundScore) {
      console.log(`Updating scores - User: ${scorecard.nickname} - Key: ${foundScore.key} - Score: ${scorecard.score}`);

      db.ref(`/scores/${scorecard.nickname}/weeklyScores/${foundScore.key}/`).update({
        total: scorecard.score
      });

    } else {
      console.log(`Inserting into scores - User: ${scorecard.nickname} - Score: ${scorecard.score}`);

      db.ref(`/scores/${scorecard.nickname}/weeklyScores/`).push({
        week: scorecard.week,
        score: 0,
        total: scorecard.score,
      });
    }
  });
}
