/* Some stuff for testing how often events occur with golden cookies.
 *
 * Test results:
 * chain cookie: 4669
 * click frenzy: 17126
 * frenzy: 486311
 * frenzy + click frenzy: 5637
 * frenzy + multiply cookies: 212863
 * multiply cookies: 273394
 * 
 * chain cookie: 45551
 * click frenzy: 172003
 * frenzy: 4863045
 * frenzy + click frenzy: 56710
 * frenzy + multiply cookies: 2126508
 * multiply cookies: 2736183
 */

var testResults = {};
var lastTestCookie = '';
function choose(arr) {return arr[Math.floor(Math.random()*arr.length)];}
chooseTest = function() {
	// Code taken directly from Cookie Clicker's source code, with the parts about wrath cookies removed
	var list=[];
	list.push('frenzy','multiply cookies');
	if (Math.random()<0.01) list.push('chain cookie');
	if (Math.random()<0.05) list.push('click frenzy');
	if (lastTestCookie!='' && Math.random()<0.8 && list.indexOf(lastTestCookie)!=-1) list.splice(list.indexOf(lastTestCookie),1);//80% chance to force a different one
	var choice=choose(list);
	var delay = (5+Math.floor(Math.random()*10))*60 / 4;
	if(delay < 144 && lastTestCookie == 'frenzy') {
		switch(choice) {
		case "multiply cookies":
			testResults['frenzy + multiply cookies']++;
			break;
		case "click frenzy":
			testResults['frenzy + click frenzy']++;
			break;
		default:
			testResults[choice]++;
		}
	} else {
			testResults[choice]++;
	}
	lastTestCookie = choice;
	return choice;
}

function conductTest(num) {
	testResults = {'frenzy': 0, 'multiply cookies': 0, 'frenzy + multiply cookies': 0, 'click frenzy': 0, 'frenzy + click frenzy': 0, 'chain cookie': 0};
	lastTestCookie = '';

	for(var count=0; count < num; count++) {
		chooseTest();
	}
	console.log(testResults);
}