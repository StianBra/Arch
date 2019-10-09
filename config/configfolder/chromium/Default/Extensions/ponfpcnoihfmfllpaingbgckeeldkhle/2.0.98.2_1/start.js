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
(function(){var b=document.createElement("script");b.textContent="("+function(a,b){if(!window.EnhancerForYouTube){var f=JSON.parse(localStorage.getItem("enhancer-for-youtube")||'{"theme":"default","customtheme":""}');if("custom"===f.theme){var c=a.createElement("style");c.type="text/css";c.id="enhancer-for-youtube-theme";c.textContent=f.customtheme;a.head?a.head.appendChild(c):a.documentElement.addEventListener("load",function g(b){a.head&&(a.documentElement.removeEventListener("load",g,!0),a.head.appendChild(c))},
!0)}else if("default"!==f.theme){var d=a.createElement("link");d.id="enhancer-for-youtube-theme-variables";d.rel="stylesheet";d.href=b+"/vendor/themes/"+f.theme;var e=a.createElement("link");e.id="enhancer-for-youtube-theme";e.rel="stylesheet";e.href=b+"/vendor/themes/youtube-deep-dark.material.css";a.head?(a.head.appendChild(d),a.head.appendChild(e)):a.documentElement.addEventListener("load",function g(b){a.head&&(a.documentElement.removeEventListener("load",g,!0),a.head.appendChild(d),a.head.appendChild(e))},
!0)}a.documentElement.setAttribute("enhancer-for-youtube","")}}.toString()+')(document,"'+chrome.extension.getURL("resources")+'")';document.documentElement.appendChild(b)})();