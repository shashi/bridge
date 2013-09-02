// The Games collection
//
Games = new Meteor.Collection("games",
    {transform: function(game) {return new Game(game)}}
);

var PASS = {suit: "pass", number: ""};
// Access rules
Games.allow({
    insert: function () {
        return true;
    },
    update: function () {
        return true; // <-- FIXME!!
    }
});
