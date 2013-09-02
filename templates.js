if(Meteor.isClient) {
    Template.singlepage.loadedGame = function () {
        return Session.get("gameId");
    }

    // Game List
    Template.gameList.games = function () {
        return Games.find();
    };

    Template.gameListItem.canJoin = function () {
        try {
            return this.players.length < 4  // this here is the game. btw.
                    && !(this.players.indexOf(Meteor.userId()) >= 0);
        } catch (e) {
            return false;
        }
    };

    Template.gameListItem.canPlay = function () {
        return (this.players.indexOf(Meteor.userId()) >= 0);
    };

    Template.gameListItem.events({
        "click .join-btn": function() {
            var game = this;
            if (game.players.length >= 4) {
                alert("Oops, looks like there are already 4 players in this game.");
                return false;
            }

            if (Meteor.userId()) {
                game.players.push(Meteor.userId());
                if (game.players.length == 4) {
                    game.state = "BIDDING";
                }
                game.save(); // <-- RACE!
            } else {
                alert("You need to be logged in to access this stuff.");
                return false;
            }

            Session.set("gameId", this._id);
        },
        "click .play-btn": function() {
            Session.set("gameId", this._id);
        }
    });

    Template.createGame.events({
        "click .create": function () {
            var name = $("#gameName").val();
            if (name) {
                var newgame = new Game({name: name});
                newgame.save();
            } else {
                alert("Enter a valid name for the game.");
            }

            return false;
        }
    });

    Template.game.game = function () {
         return Games.findOne({_id: Session.get("gameId")});
    };

    Template.game.players = function () {
        var playerobjs = [],
            game = Template.game.game(); // XXX: WHAT THE HELL.

        for (var i=0; i < game.players.length; i++) {
            var user = Meteor.users.findOne({_id: game.players[i]});
            if (!user) {
                alert("Invalid user in the game? " + game.players[i]);
                return;
            }
            playerobjs.push(user);
        }
        return playerobjs;
    };

    Template.game.notSelf = function (id) {
        return Meteor.userId() != id;
    };

    Template.game.teamsNotFormed = function (id) {
        return Template.game.game().teamsNotFormed();
    };

    Template.game.created = function () {
        var game = Games.findOne(Session.get("gameId"));
    };

    Template.game.events({
        "click .exit": function () { Session.set("gameId", null); },
        "click .pick-team": function () {
            var game = Template.game.game();
            if (Template.game.notSelf(this._id)) {
                team1 = [Meteor.userId(), this._id];
                game.firstTeam = team1;
                game.save();
            }
        },
        "click .hand.active .card": function () {
            var game = Template.game.game();
            try {
                game.dropCard(this);
            } catch (e) {
                $(".msg").text(e);
            }
        }
    });

    Template.game.north = function () {
        var game = Template.game.game();
        return game.playerInFront(Template.game.south()._id);
    };

    Template.game.south = function () {
        // FIXME: Watch.
        var game = Template.game.game();
        return game.extendUser(Meteor.user());
    };

    Template.game.east = function () {
        var game = Template.game.game();
        return game.playerToTheRight(Template.game.south()._id);
    };

    Template.game.west = function () {
        var game = Template.game.game();
        return game.playerToTheLeft(Template.game.south()._id);
    };

    Template.game.myTeam = function () {
        var members = [],
            game = Template.game.game(),
            player = game.extendUser(this.Meteor.user()),
            teamNumber = player.team,
            team = [];

        if (teamNumber == 0) {
            team = game.firstTeam;
        } else if (teamNumber == 1) {
            team = game.secondTeam;
        }

        for(var i=0; i < team.length; i++) {
            var u = game.extendUser(Meteor.users.findOne({_id: team[i]}));
            members.push(u);
        }
        return members;
    };

    Template.game.theOtherTeam = function () {
        var members = [],
            game = Template.game.game(),
            player = game.extendUser(this.Meteor.user()),
            teamNumber = player.team,
            team = [];

        if (teamNumber == 0) {
            team = game.secondTeam;
        } else if (teamNumber == 1) {
            team = game.firstTeam;
        }

        for(var i=0; i < team.length; i++) {
            var u = game.extendUser(Meteor.users.findOne({_id: team[i]}));
            members.push(u);
        }
        return members;
    };

    Template.game.stillOpen = function () {
        var game = Template.game.game();
        return game.players.length != 4 || game.teamsNotFormed();
    };

    Template.game.finishedBidding = function () {
        return !(["OPEN", "BIDDING"].indexOf(Template.game.game().state) > 0);
    };

    Template.game.currentlyBidding = function () {
        var game = Template.game.game();
        return Meteor.users.findOne(
            {_id: game.currentBidder}
        );
    };

    Template.game.myTurnToBid = function () {
        return Template.game.currentlyBidding()._id == Meteor.userId();
    };

    Template.game.currentRound = function () {
        var game = Template.game.game();

        function getCard(user) {
            var card = _.find(game.rounds[game.rounds.length - 1], function(card) {
                return card.owner == user._id;
            });
        }

        return {
            north: getCard(Template.game.north()),
            west:  getCard(Template.game.west()),
            east:  getCard(Template.game.east()),
            south: getCard(Template.game.south())
        }
    };

    Template.game.myTurnToPlay = function () {
        var current = Template.game.currentlyPlaying();
        game = Template.game.game();

        if (current) {
            return current._id == Meteor.userId();
        } else {
            return false; // no one's turn.
        }
    };

    Template.game.currentlyPlaying = function () {
        var game = Template.game.game();

        if (!game.currentPlayer && game.state == "IN-GAME") {
            game.currentPlayer = game.bidWinner()._id;
            game.save();
        }

        return Meteor.users.findOne(
            {_id: game.currentPlayer }
        );
    };

    Template.bidInput.getAvailableBids = function () {
        var game = Template.game.game();
        var max_iter = Bridge.bidIterator(game.highestBid());
        console.log(max_iter);
        bids = Bridge.getBids();

        function iconOf(suit) {
            return {heart: "♥",
                    diamond: "♦",
                    club: "♣",
                    spade: "♠",
                    notrump: "no-trump"}[suit];
        }

        return _.map(
                _.reject(bids,
                    function (b) { return Bridge.bidIterator(b) <= max_iter; }
                ),
                function (bid) {
                    bid.suit_icon = iconOf(bid.suit);
                    return bid;
                });
    };

    Template.bidInput.events({
        "click .bid-btn": function () {
            var bidv = $("#bid-select").val();
            if (bidv == "pass") {
                Template.game.game().placeBid(PASS);
                return;
            }
            bidv = bidv.split("-");
            var bid = {number: bidv[0], suit: bidv[1]};
            Template.game.game().placeBid(bid);
        }
    });

    $(document).ready(function () {
        var debug = $("#debug");
        debug.html(Template.card({suit: "spade", symbol: "A"}));
    });

    Template.wins.myTeamsWins = function () {
        var game = Template.game.game(), player = game.extendUser(Meteor.user());
        return _.where(game.wins, {winner: player.team});
    };

    Template.wins.theOtherTeamsWins = function () {
        var game = Template.game.game(), player = game.extendUser(Meteor.user());
        // XXX: srsly?
        return _.where(game.wins, {winner: player.team ^ 1});
    };

    Template.wins.myTeamRequires = function () {
        var game = Template.game.game();
        return game.requiredBy(Meteor.user());
    };

    Template.wins.theOtherTeamRequires = function () {
        var game = Template.game.game();
        return game.requiredBy(Meteor.user(), true);
    };

    Template.wins.myTeamHasWon = function () {
        return Template.wins.myTeamsWins().length;
    };

    Template.wins.theOtherTeamHasWon = function () {
        return Template.wins.theOtherTeamsWins().length;
    };
}
