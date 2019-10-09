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
(function(){chrome.storage.local.get({customtheme:"",quality1:"hd1080",selectquality:!1,theme:"default"},function(c){var a=document.createElement("script");a.textContent="("+function(b){if(!window.EnhancerForYouTube&&(localStorage.setItem("enhancer-for-youtube",JSON.stringify(b)),b.selectquality)){var a=Date.now();localStorage["yt-player-quality"]='{"data":"'+b.quality1+'","expiration":'+(a+2592E6)+',"creation":'+a+"}"}}.toString()+")("+JSON.stringify(c)+")";document.head.appendChild(a)})})();