/* CardGame
 *
 * Reasoning about a deck of cards.
 */
CardGame = {};

CardGame.suits = "club diamond heart spade".split(" ");
CardGame.symbols = "2 3 4 5 6 7 8 9 10 J Q K A".split(" ");

CardGame.deck = function () {
    var cards = [];

    for (var i=0; i< 4; i++) {
        for (var j=0; j < 13; j++) {
            card = {suit: Bridge.suits[i],
                    symbol: Bridge.symbols[j]}
            cards.push(card);
        }
    }
    return cards;
}

CardGame.cardIterator = function (card) {

    var s = CardGame.suits.indexOf(card.suit),
        n = CardGame.symbols.indexOf(card.symbol);

    return s * 13 + n;
}


/* Bridge
 * 
 * things specific to Bridge
 */
Bridge = {};
Bridge = _.extend(CardGame, Bridge); // extend CardGame

Bridge.bidSuitOrder = "club diamond heart spade notrump".split(" ");
Bridge.getBids = function() {
    var bids = [];
    for(var i=1; i <= 7; i++) {
        for(var j=0; j < 5; j++) {
            bids.push({suit: Bridge.bidSuitOrder[j], number: i});
        }
    }
    return bids;
};

Bridge.bidIterator = function(bid) {
    return bid.number * 5 + Bridge.bidSuitOrder.indexOf(bid.suit);
};

Bridge.isPass = function (bid) {
    return Bridge.bidIterator(bid) == Bridge.bidIterator(PASS);
};
Bridge.distributeCards = function () {
    var cards = _.shuffle(CardGame.deck());
    var hands = [];
    for (var i=0; i < 4; i++) {
        var hand = cards.splice(0, 13);
        hands.push(_.sortBy(hand, Bridge.cardIterator));
    }

    return hands;
}
