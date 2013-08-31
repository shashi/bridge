if (Meteor.isServer) {
	// tests for ordering iterator of cards
	var spadeA = Bridge.cardIterator({suit: 'spade', symbol: 'A'}),
	    spade2 = Bridge.cardIterator({suit: 'spade', symbol: '2'}),
	    heartA = Bridge.cardIterator({suit: 'heart', symbol: 'A'}),
	    heart2 = Bridge.cardIterator({suit: 'heart', symbol: '2'}),
	    heartJ = Bridge.cardIterator({suit: 'heart', symbol: 'J'});

	var testCounter = 0, totalTests = 0;
	function test(condition, desc) {

		if (condition) {
			console.log("PASSED", desc);
			testCounter += 1;
		} else {
			console.log("FAILED", desc);
		}
		totalTests += 1;
		return condition;
	}

	console.log("TESTING: CARD ORDERING");
	test(spadeA > spade2, "Same suit order");
	test(heartA > heartJ, "Same suit order");
	test(spadeA > heartA, "Different suit ordering");
	test(spadeA > heart2, "Different suit ordering");

	// tests for ordering iterator of bids
	var spade1 = Bridge.bidIterator({suit: 'spade', number: 1}),
	    spade2 = Bridge.bidIterator({suit: 'spade', number: 2}),
	    heart1 = Bridge.bidIterator({suit: 'heart', number: 1}),
	    notrump1 = Bridge.bidIterator({suit: 'notrump', number: 1}),
	    heart2 = Bridge.bidIterator({suit: 'heart', number: 2});

	console.log("TESTING: BID ORDERING");
	console.log("THIS SHOULD BE ORDERED", heart1, spade1, notrump1, heart2, spade2);
	test(spade1 < spade2, "Same suit ordering in bids");
	test(notrump1 > spade1, "Notrump ordering");
	test(spade1 > heart1, "1 spades vs hearts 1");

	console.log(testCounter + " tests out of " + totalTests + " tests passed.");
}

