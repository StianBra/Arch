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
(function(){var h=document.createElement("script");h.textContent="("+function(b,f){if(!b.documentElement.hasAttribute("enhancer-for-youtube")){var e=JSON.parse(localStorage.getItem("enhancer-for-youtube")||'{"theme":"default","customtheme":""}');if("custom"===e.theme){var c=b.createElement("style");c.type="text/css";c.id="enhancer-for-youtube-theme";c.textContent=e.customtheme;b.head?b.head.appendChild(c):b.documentElement.addEventListener("load",function g(a){b.head&&(b.documentElement.removeEventListener("load",
g,!0),b.head.appendChild(c))},!0)}else if("default"!==e.theme){var a=b.createElement("link");a.id="enhancer-for-youtube-theme-variables";a.rel="stylesheet";a.href=f+"/vendor/themes/"+e.theme;var d=b.createElement("link");d.id="enhancer-for-youtube-theme";d.rel="stylesheet";d.href=f+"/vendor/themes/youtube-deep-dark.material.css";b.head?(b.head.appendChild(a),b.head.appendChild(d)):b.documentElement.addEventListener("load",function g(c){b.head&&(b.documentElement.removeEventListener("load",g,!0),b.head.appendChild(a),
b.head.appendChild(d))},!0)}b.documentElement.setAttribute("enhancer-for-youtube","")}}.toString()+')(document,"'+chrome.extension.getURL("resources")+'")';document.documentElement.appendChild(h);chrome.runtime.onMessage.addListener(function(b,f,e){"enhancerforyoutube:preference-changed"!==b.message||"theme"!==b.name&&"customtheme"!==b.name||chrome.storage.local.get({customtheme:"",theme:"default"},function(c){var a=document.head.querySelector("#enhancer-for-youtube-theme-variables"),d=document.head.querySelector("#enhancer-for-youtube-theme");
switch(b.name){case "customtheme":d&&document.head.removeChild(d);a&&document.head.removeChild(a);""!==c.customtheme&&(a=document.createElement("style"),a.type="text/css",a.id="enhancer-for-youtube-theme",a.textContent=c.customtheme,document.head.appendChild(a));break;case "theme":!d||"default"!==c.theme&&"custom"!==c.theme&&"STYLE"!==d.nodeName||(document.head.removeChild(d),d=!1),!a||"default"!==c.theme&&"custom"!==c.theme||document.head.removeChild(a),"custom"===c.theme?(a=document.createElement("style"),
a.type="text/css",a.id="enhancer-for-youtube-theme",a.textContent=c.customtheme,document.head.appendChild(a)):"default"!==c.theme&&(a?a.href=chrome.extension.getURL("resources")+"/vendor/themes/"+c.theme:(a=document.createElement("link"),a.id="enhancer-for-youtube-theme-variables",a.rel="stylesheet",a.href=chrome.extension.getURL("resources")+"/vendor/themes/"+c.theme,document.head.appendChild(a)),d||(d=document.createElement("link"),d.id="enhancer-for-youtube-theme",d.rel="stylesheet",d.href=chrome.extension.getURL("resources")+
"/vendor/themes/youtube-deep-dark.material.css",document.head.appendChild(d)))}})})})();