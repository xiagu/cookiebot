/* TODO:
 * 	 Update Golden Cookie autoclick to take into account time to next GC
 *   Related: make min of that or time to next golden cookie in case of lucky ?
 *	 Make cheatyBuy computations less expensive in general... somehow
 *	 Fix trying to buy the Golden Cookie upgrades ASAP (makes resets dumb now that the count is maintained)
 *   When taking into account the Lucky cookie minimum, consider how long until the next Golden Cookie and the chances of being a Lucky.
 *   Handle the Grandmapocalypse Wrath cookies in predictions and computations
 */

/* for manually stopping intervals later, if you want to do that */
var goldenCookieInterval;
var cheatyBuyTimeout;
var buyElderPledgeTimeout;
var keepBuying = true;
/* for timing CPS */
var start;
var oldCE;

var ID_LUCKY_DAY = 52,
	ID_SERENDIPITY = 53,
	ID_ELDER_PLEDGE = 74,
	ID_GET_LUCKY = 86,
	ID_SACRIFICIAL_ROLLING_PINS = 87;

function everything() { 
	/* Give CM a little time to load */
	/* Fix Get_True_CPI, the one included in Cookie Monster is both unused and broken  (as of Cookie Monster 1.35.04, approximately) */
	Get_True_CPI = function(e, t) {
	    var n = 0;
	    var r = 0;
	    var i = 0;
	    if (t == "ob") {
	        n = Seconds_Left(e, "ob");
	        r = Game.ObjectsById[e].price;
	        i = hold_is[e]
	    }
	    if (t == "up") {
	        n = Seconds_Left(e, "up");
	        r = Game.UpgradesById[e].basePrice;
	        for (var s = 0; s < upgrade_count; s++) {
	            if (_cup(s, e, false)) {
	                i = Manage_Tooltip(s, e, false, true);
	                break
	            }
	        }
	    }
	    var o = r / i;
	    Game.ObjectsById.forEach(function (s, u) {
	        var a = s.price;
	        var f = hold_is[u];
	        var l = Seconds_Left(u, "ob");
	        if (l < n && (t == "up" || u != e)) {
	            var c = n - l;
	            var h = f * c;
	            var d = r - a + h;
	            var v = d / i;
	            if (v > o) {
	                o = v
	            }
	        } else {}
	    });
	    return o
	}

	/* Measure true CPS, including golden cookie contributions */
	start = new Date();
	oldCE = Game.cookiesEarned;
	cpsMeasure = function() {
		var date = new Date();
		avg = formatNum((Game.cookiesEarned - oldCE) * 1000 / (date.getTime() - start.getTime()));
		var realCps = gcbank(0)[0];
		estimate = formatNum(realCps + goldenCookieCps(realCps,Game.cookies));
		console.log("Running average CPS since " + start.toLocaleTimeString() + " = " + avg + " \tEstimated CPS: " + estimate);
		setTimeout(cpsMeasure, 10000);
	}
	cpsMeasure(); /* Start */

	goldenCookieInterval = setInterval(function () { if(Game.goldenCookie.life > 0) { Game.goldenCookie.click(); } }, 1000);

	parseCMNums = function(str) { return parseFloat(str.replace(/[, *]/g,'')); }

	/* Todo: Modify gcbank to take into account time until next GC, and upgrades. */
	gcbank = function(income) {
		gcfactor = 0;
		if(Game.UpgradesById[ID_SERENDIPITY].bought) { gcfactor = 12000; }
		else if(Game.UpgradesById[ID_LUCKY_DAY].bought) { gcfactor = 6000; }
		else { return 0; }
		if(Game.UpgradesById[ID_GET_LUCKY].bought) { gcfactor *= 7; }
		
		Game.CalculateGains(); // recalc to avoid errors in computation
		trueFrenzy = Game.frenzy > 0 ? Game.frenzyPower : 1;
		realCps = Game.cookiesPs / trueFrenzy; // CpS unmodified by frenzy
		realIncome = income / trueFrenzy;
		return [realCps, (realCps+realIncome)*gcfactor, realIncome];
	}

	goldenCookieCps = function(cps, bank) {
		interval = 570; // average time in seconds for a golden cookie to appear
		if(Game.UpgradesById[ID_LUCKY_DAY].bought) interval /= 2.0;
		if(Game.UpgradesById[ID_SERENDIPITY].bought) interval /= 2.0;

		payoff = 0;
		if(Game.UpgradesById[ID_GET_LUCKY].bought) {
			// these percentages calculated from a sample of 10 million golden cookies
			// now they can overlap
			payoff += .00456545455 * 3228721333325.41 // chain cookie (average)
			payoff += .01719354545 * 0 // click frenzy
			payoff += .48630509091 * 6 * cps * 77 // frenzy
			payoff += .00566790909 * 0 // frenzy + click frenzy
			payoff += .21267009091 * ( Math.min(.1*bank, 8400*cps) + 13 ) // frenzy + multiply cookies
			payoff += .27359790909 * ( Math.min(.1*bank, 1200*cps) + 13 ) // multiply cookies
		} else {
			// these percentages taken from the wiki, in theory should be accurate
			payoff += .4900417 * 6 * cps * 77 // frenzy
			payoff += .4900417 * ( Math.min(.1*bank, 1200*cps) + 13 ) // multiply cookies
			payoff += .016625 * 0 // click frenzy
			payoff += .0032916 * 3228721333325.41 // chain cookie (average)
		}
		payoff /= interval;

		return payoff;
	}

	cheatyBuy = function() {
		min = Number.MAX_VALUE;
		savedName = "";
		savedPrice = Number.MAX_VALUE;
		savedIncome = 0; 
		savedTime = 0; // seconds until we can buy
		/* Check items to buy */
		for(var i=0; i<Game.ObjectsN; i++) {
			name = Game.ObjectsById[i].name;
			value = Get_True_CPI(i, "ob");
			income = hold_is[i];
			if(value < min || (value == min && Game.ObjectsById[i].price < savedPrice)) {
				savedName = name;
				min = value;
				savedObject = Game.ObjectsById[i];
				savedIncome = income;
				savedPrice = savedObject.price;
				savedTime = hold_tc[i];
			}
		}
		/* Check available upgrades */
		Game.UpgradesInStore.forEach(function (t, n) {
			id = t.id;
			name = t.name;
			income = 0;
			switch(id) {
			/* Golden cookie upgrades, Elder Pledge and Sacrificial Rolling Pins */
			case ID_LUCKY_DAY: // Lucky Day
				value = 100;
				break;
			case ID_SERENDIPITY: // Serendipity
				value = 500; // made up values to try to price it right
				break;
			case ID_GET_LUCKY: // Get Lucky
				value = 1000;
				break;
			case ID_ELDER_PLEDGE:
			case ID_SACRIFICIAL_ROLLING_PINS:
				value = Number.MIN_VALUE;
				break;
			default:
			   	// Instead of showing the tooltip and regexping it we call Cookie Monster's internal computation functions to get the income
				value = Get_True_CPI(id, "up");
				for (var s = 0; s < upgrade_count; s++) {
	            	if (_cup(s, t.id, false)) {
		                income = Manage_Tooltip(s, t.id, false, true);
	                	break;
            		}
        		}
			}
			if(value < min || (value == min && t.basePrice < savedPrice)) {
				savedName = name;
				savedObject = t;
				savedIncome = income;
				min = value;
				savedPrice = t.basePrice;
				savedTime = Seconds_Left(t.id, "up");
			}
	    });

	    // console.log(savedObject);
		var bank = gcbank(savedIncome);
		var realCps = bank[0];
		var reqBank = bank[1];
		var realIncome = bank[2];
		
		myCookies = Game.cookies;
		willBuy = ( (myCookies - savedPrice) >= reqBank ) ||
			( (Game.goldenCookie.delay / Game.fps) * (realCps+realIncome) - savedPrice > 0 ) ||
			// ( (reqBank > myCookies) && (reqBank - myCookies) / realCps > (reqBank - myCookies + savedPrice) / (realCps + realIncome) );
			( realIncome + goldenCookieCps(realCps+realIncome, myCookies - savedPrice) > goldenCookieCps(realCps, myCookies) );
		console.log( formatNum(myCookies - savedPrice) + " remaining, need more than " + formatNum(reqBank) + "\t will buy [" + savedObject.id + "] " + savedObject.name + ": " + willBuy);

		if(willBuy)
			savedObject.buy();

		if(keepBuying) {	
			if(savedTime == 0)
				if(willBuy == false)
					waitTime = 5; // don't spam when we are building bank for GCs
				else
					waitTime = 0.25; // check faster to use up bank faster if we have surplus
			else 
				waitTime = Math.min(Math.max(savedTime / 2.0, 0.5), 1800); // check at least once every 30 minutes
			console.log("Checking again in " + formatTime(waitTime, null));
			clearTimeout(cheatyBuyTimeout); // just in case we want to restart the timer, for instance, some big change happened
			cheatyBuyTimeout = setTimeout(function() { cheatyBuy(); }, waitTime*1000);
		}
	}
	cheatyBuy();

	/* Autobuy elder pledges */
	buyElderPledge = function () {
		if(Game.UpgradesById[ID_ELDER_PLEDGE].bought == 0 && Game.UpgradesById[ID_ELDER_PLEDGE].unlocked == 1) {
			Game.UpgradesById[ID_ELDER_PLEDGE].buy();
		}
		buyElderPledgeTimeout = setTimeout(function() { buyElderPledge(); }, Game.pledgeT / Game.fps);
	}
	buyElderPledge();

}

/* Install CookieMonster, then once it's loaded run our script */
function install() {
	var jA = document.createElement('script');
	jA.setAttribute('type', 'text/javascript');
	jA.setAttribute('src', 'http://ajax.googleapis.com/ajax/libs/jquery/1.10.2/jquery.min.js');
	jA.onload = function() { 
		var jB = document.createElement('script'); 
		jB.setAttribute('type', 'text/javascript'); 
		jB.setAttribute('src', 'http://pastebin.com/raw.php?i=2KRNm8Gm'); 
		$(jB).load(everything);
		document.body.appendChild(jB); 
	}; 
	document.body.appendChild(jA); 
}

install();