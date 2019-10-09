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
(function(){document.title="Enhancer for YouTube\u2122";var a=document.createElement("iframe");a.setAttribute("id","detached-player");a.setAttribute("allow","accelerometer;autoplay;encrypted-media;gyroscope;picture-in-picture");a.setAttribute("allowfullscreen","");a.setAttribute("src","https://www.youtube.com/embed/"+document.location.href.split("/detached_player/")[1]);a.addEventListener("DOMContentLoaded",function(){document.title=a.contentDocument.title});a.addEventListener("load",function(){var f=
a.contentDocument.createElement("script");f.textContent="("+function(a){var c=document.querySelector(".html5-video-player"),f=document.querySelector(".ytp-title-text"),g=document.querySelector(".ytp-right-controls");c&&"DIV"===c.nodeName&&f&&c.addEventListener("onStateChange",function(a){window.top.document.title=f.textContent});if(c&&("Win32"===a||"Win64"===a)&&g&&!g.querySelector(".efy-ytp-always-on-top")){var h,b=document.createElement("div");a=document.createElement("div");var k=document.createElement("span"),
d=document.createElement("button"),e=document.createElementNS("http://www.w3.org/2000/svg","svg"),l=document.createElementNS("http://www.w3.org/2000/svg","g"),m=document.createElementNS("http://www.w3.org/2000/svg","path"),n=g.querySelector('button:not([style*="display"])');k.className="ytp-tooltip-text";k.textContent="Always on top \ud83d\uddd7";a.appendChild(k);a.className="ytp-tooltip-text-wrapper";b.appendChild(a);b.className="ytp-bottom";b.style.display="none";c.appendChild(b);d.className="ytp-button efy-ytp-always-on-top";
d.addEventListener("click",function(){document.dispatchEvent(new Event("efyt-always-on-top"))});d.addEventListener("mouseenter",function(a){n.dispatchEvent(new Event("mouseover"));n.dispatchEvent(new Event("mouseout"));h||(h=c.querySelector(".ytp-tooltip"));h&&""!==h.style.top&&(a=a.target.getBoundingClientRect(),b.classList.add("ytp-tooltip"),b.style.display="block",b.style.top=h.style.top,b.style.left=a.left+a.width/2-b.getBoundingClientRect().width/2+"px")});d.addEventListener("mouseleave",function(){b.style.display=
"none";b.classList.remove("ytp-tooltip")});e.setAttributeNS(null,"version","1.1");e.setAttributeNS(null,"viewBox","0 0 36 36");e.setAttributeNS(null,"height","100%");e.setAttributeNS(null,"width","100%");l.setAttributeNS(null,"transform","translate(-47.625 -104.52)");m.setAttributeNS(null,"d","m56.625 121.65 4.4981 4.3876-3.0658 3.1409-1.0972 1.1241 1.1221 1.0946 4.163-4.2651 4.5005 4.3899 1.0972-1.1242 2.1922-2.2459-2.2515-2.1961 2.4228-2.4822.0023.002 1.1245 1.0969 3.2918-3.3725-7.8717-7.6782-3.2918 3.3725 1.1245 1.0968.0023.002-2.4228 2.4823-2.2515-2.1961-2.1921 2.2459zm2.2218-.0264 1.0972-1.1242 2.2484 2.1932.45208-.46318.000756.00079 4.1629-4.265-1.1221-1.0946-.0023-.002 1.0972-1.1241 5.6226 5.4845-1.0972 1.1241-1.1245-1.0969-4.1629 4.265.000756.00076-.45208.46318 2.2484 2.1931-1.0972 1.1242z");
m.setAttributeNS(null,"fill","#fff");d.appendChild(e);e.appendChild(l);l.appendChild(m);g.insertBefore(d,g.firstChild)}}.toString()+')("'+window.navigator.platform+'")';a.contentDocument.head.appendChild(f);a.contentDocument.addEventListener("efyt-always-on-top",function(a){try{chrome.runtime.sendMessage({enhancerforyoutube:"always-on-top"})}catch(c){}})},{once:!0});document.body.appendChild(a)})();