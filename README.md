# Automating Cookie Clicker
This is a collection of scripts I originally wrote to automate different parts of Cookie Clicker, and eventually turned into an entire auto-playing script. 

The script calculates some information itself, but most of it is based on information provided by another extremely useful script, [Cookie Monster](https://cookieclicker.wikia.com/wiki/Cookie_Monster_%28JavaScript_Add-on%29).

This script does **NOT** manipulate any game information, hack in cookies, reduce spawn times of Golden Cookies, or anything like that. It's purely in the interest of optimizing play speed within the constraints of the game.

## Features
* Auto-buys the most cost-efficient buildings and upgrades. It takes into account the opportunity cost of saving up for the more expensive ones, too.
* Auto-clicks Golden Cookies (and Wrath Cookies too)
* Auto-buys important upgrades that have no strict monetary value, like the Golden Cookie upgrades. After the update making GC clicks not reset, this makes running the script on reset games a little silly, because it prioritizes them the highest and they'll show up after a single click.
* Auto-buys the Elder Pledge, once it's available.
* Doesn't buy things if they would drop the bank below the minimum for lucky cookies, or frenzy lucky cookies if Get Lucky has been purchased

## Usage
Copy the contents of [cookiestuff.js](https://github.com/Xiagu/cookiebot/raw/master/cookiestuff.js) into your browser's JavaScript console (F12 in most browsers, Ctrl+Shift+K in Firefox) and run it.