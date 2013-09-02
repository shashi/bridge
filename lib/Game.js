/**
 * This is the game class
 */
Game = function (game) {
    _.extend(this, game);
    this.secondTeam
        = _.difference(this.players, this.firstTeam);
    if (!this.hands) {
        this.hands = Bridge.distributeCards();
        this.save();
    }
    if (!this.currentBidder) {
        this.currentBidder = Meteor.userId();
        this.save();
    }
}

var self = this;

/**
 * extension to Game class
 */
_.extend(Game.prototype, {
    enterGame: function () {
        // check if there are already 4 players
        // check if teammates have been decided
        // add to appropriate team

        // use self.userId and profile here
    },
    teamUp: function(player1, player2) {
        // team up player1 player2
    },

    load: function() {
        Session.set("gameId", this._id);
    },

    bidWinner: function () {
        return this.getPlayer(this.highestBid().bidder);
    },

    save: function () {

        var gameobj = {
         name: this.name,
         state: this.state ? this.state : "OPEN",
         players: this.players ? this.players : [Meteor.userId()],
         firstTeam: this.firstTeam ? this.firstTeam : [],
         hands: this.hands ? this.hands : Bridge.distributeCards(),
         rounds: this.rounds ? this.rounds : [[]],
         wins: this.wins ? this.wins : [],
         currentBidder: this.currentBidder? this.currentBidder : Meteor.userId(),
         currentPlayer: this.currentPlayer ? this.currentPlayer : null,
         bids: this.bids ? this.bids : []
        };

        if (this._id) {
            return Games.update(this._id, {$set: gameobj});
        } else {
            id = Games.insert(gameobj);
            this._id = id;
            return Games.findOne(id);
        }
    },

    order: function () {
        // returns a circular ordering
        // must be called after all 4 players have joined
        this.secondTeam
            = _.difference(this.players, this.firstTeam);

        return [this.firstTeam[0], this.secondTeam[0],
                this.firstTeam[1], this.secondTeam[1]];
    },

    getPlayer: function (idx) {
        order = this.order();
        var user = Meteor.users.findOne({_id: order[idx]});
        user.hand = _.sortBy(this.hands[idx], Bridge.cardIterator);

        user.hand.width = user.hand.length * 30 + 31; // TODO: Put this in a constant
        user.hand.widthByTwo = (user.hand.length * 30 + 30) / 2; // TODO: Put this in a constant

        game = this;

        user.currentCard = function () {
            if (!game.rounds) return undefined;

            round = _.last(game.rounds);

            var card = _.find(round, function(card) {
                return card.owner == user._id;
            });
            return card;
        }

        if (this.firstTeam.indexOf(user._id) >= 0) {
            user.team = 0;
        } else if (this.secondTeam.indexOf(user._id) >= 0) {
            user.team = 1;
        } else {
            user.team = null;
        }

        return user;
    },

    playerInFront: function(playerId) {
        var order = this.order(),
            k = order.indexOf(playerId);

        k = (k + 2) % 4;
        return this.getPlayer(k);
    },

    playerToTheRight: function(playerId) {
        var order = this.order(),
            k = order.indexOf(playerId);

        k = (k + 3) % 4;
        return this.getPlayer(k);
    },

    playerToTheLeft: function(playerId) {
        var order = this.order(),
            k = order.indexOf(playerId);

        k = (k + 1) % 4;
        return this.getPlayer(k);
    },

    playerIndex: function(playerId) {
        return this.order().indexOf(playerId);
    },

    extendUser: function (user) {
        var idx = this.order().indexOf(user._id);
        return this.getPlayer(idx);
    },

    placeBid: function (bid) {
        if (this.state != "BIDDING") {
            throw "This is not the bidding phase, cant place bid.";
        }

        if (!Bridge.isPass(bid) && Bridge.bidIterator(bid) <= Bridge.bidIterator(this.highestBid())) {
            throw "Oops. You're trying to place a lower bid.";
        }

        if (Meteor.userId() != this.currentBidder) {
            throw "Oops. It's not your turn to bid.";
        }

        bid.bidder = this.playerIndex(Meteor.userId());
        bid.time = Date.now();
        this.bids.push(bid);
        var next = this.playerToTheLeft(Meteor.userId());

        // other consequences.
        if (this.bids.length >= 4) {
            last_three = this.bids.slice(-3, this.bids.length);
            if (_.all(last_three, Bridge.isPass)) {
                // Bidding is complete.
                this.state = "IN-GAME";
            }
        }

        this.currentBidder = next._id;

        this.save();
        console.log(this.bids);
    },

    getBids: function () {
        var bids = [];
        for (var i = 0; i < this.bids.length; i++) {
            bid = this.bids[i];
            bid.bidder = this.getPlayer(bid.bidder);
            bids.push(bid);
        }
        return bids;
        
    },
    highestBid: function () {
        var max = _.max(this.bids, Bridge.bidIterator);
        console.log("HIGHEST", max, this.bids);
        if (!max) max = PASS; // Sentinal

        return max;
    },

    trumpSuit: function () {
        return this.highestBid().suit;
    },
    teamsNotFormed: function () {
        var game = this;
        if (typeof(game.firstTeam) == 'undefined') {
            return true;
        } else if (game.firstTeam.length == 2) {
            return false;
        }
        game.firstTeam = []; // reset
        game.save();
        return true;
    },
    dropCard: function (card) {
        function indexOf(cards, card) {
            for(var i=0, l = cards.length; i < l; i++) {
                var c = cards[i];
                if (card.symbol == c.symbol && c.suit == card.suit) {
                    return i;
                }
            }
            return -1;
        }

        function deleteFromHand(user, card) {
            var idx = game.playerIndex(user._id);
            var i = indexOf(game.hands[idx], card);
            console.log("DELETING FROM HAND", game.hands[idx], card);
            if (i >= 0) {
                game.hands[idx].splice(i, 1);
                game.save();
            }
        }

        function hasSuit(cards, suit) {
            return _.any(cards, function (c) { return c.suit == suit; });
        }

        var user = this.extendUser(Meteor.user());
        var game = this;
        var newRound = (this.rounds[this.rounds.length - 1].length == 4);


        if (Template.game.currentlyPlaying()._id != Meteor.userId()) {
            throw "You cannot drop a card when it's not your turn to do so.";
        }

        if (indexOf(user.hand, card) < 0) {
            throw "You cannot drop a card that you don't have.";
        }

        if (!newRound &&
            this.currentSuit() != null &&
            this.currentSuit() != card.suit &&
            hasSuit(user.hand, this.currentSuit())) {

            throw "You have to drop a " + this.currentSuit() + " card as long as you have them.";
        }


        // Does my hand contain the current suit?

        card.owner = user._id;
        deleteFromHand(user, card);


        if (newRound) {
            this.rounds.push([]);
        }

        this.rounds[this.rounds.length - 1].push(card);

        if (this.rounds[this.rounds.length - 1].length == 4) {
            // round completed!
            var max_card = this.winningCard(this.rounds[this.rounds.length - 1]);

            var winner = this.getPlayer(this.playerIndex(max_card.owner));
            this.wins.push({winner: winner.team, card: max_card});
            this.currentPlayer = winner._id;
        } else {
            this.currentPlayer = this.playerToTheLeft(this.currentPlayer)._id;
        }

        this.save();
    },
    currentSuit: function () {
        var last_round = this.rounds[this.rounds.length - 1];
        if (last_round.length > 0) return last_round[0].suit;
        else return null;
    },

    getTeam: function (player) {
        if (this.firstTeam.indexOf(player._id) >= 0) {
            return 1;
        } else if (this.secondTeam.indexOf(player._id) >= 0) {
            return 0;
        }
    },

    winningCard: function (round) {
        var currentSuit = round[0].suit;
        var trumpSuit = this.trumpSuit();
        return _.max(round, function (c) {
            if (c.suit == trumpSuit) {
                return 13 + Bridge.symbols.indexOf(c.symbol);
            } else if (c.suit == currentSuit) {
                return Bridge.symbols.indexOf(c.symbol);
            } else {
                return -99;
            }
        });
    },

    lastCard: function () {
        var last_round = this.rounds[this.rounds.length - 1];
        if (last_round.length > 0) return last_round[last_round.length - 1];
        else return PASS;
    },

    sameTeam: function (player1, player2) {
        if (player1 == player2) {
            return true;
        } else if (this.firstTeam.indexOf(player1) >= 0 &&
                    this.firstTeam.indexOf(player2) >= 0) {
            return true;
        } else if (this.secondTeam.indexOf(player2) >= 0 &&
                    this.secondTeam.indexOf(player1) >= 0) {
            return true;
        }
        return false;
    },
    requiredBy: function (player, opponent) {
        var bid = this.highestBid(),
            bidderRequires = 6 + Number(bid.number),
            bidder = this.getPlayer(bid.bidder);

        console.log(player._id, bidder._id);
        if (this.sameTeam(player._id, bidder._id)) {
            return opponent ? 14 - bidderRequires : bidderRequires;
        } else {
            return opponent ? bidderRequires : 14 - bidderRequires;
        }
    }
});
