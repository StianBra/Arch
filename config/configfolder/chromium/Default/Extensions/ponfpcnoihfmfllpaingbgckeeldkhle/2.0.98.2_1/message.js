/*
##
##	Enhancer for YouTube™ | Chrome Extension
##	========================================
##
##	Author: Maxime RF <https://www.mrfdev.com>
##
##	This file is protected by copyright laws and international copyright
##	treaties, as well as other intellectual property laws and treaties.
##
##	All rights not expressly granted to you are retained by the author.
##	Read the license.txt file for more details.
##
##	If it's not enough clear for you Baris Derin, you have no rights to use my work,
##	neither as-is nor modified! Improve your coding logic instead of using others work!
##
##	© MRFDEV.com - All Rights Reserved
##
*/
(function(b){function c(){var a={};a[this.dataset.pref]=Date.now();chrome.storage.local.set(a)}chrome.storage.local.get({date:0},function(a){30>Math.round((Date.now()-a.date)/864E5)&&(b.querySelector("#note-old-users").style.display="none")});b.querySelectorAll(".pref").forEach(function(a){a.addEventListener("click",c);a.addEventListener("contextmenu",c)})})(document);