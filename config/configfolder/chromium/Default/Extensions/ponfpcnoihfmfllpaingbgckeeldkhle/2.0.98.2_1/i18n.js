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
(function(a){function f(c){c.preventDefault();a.querySelector(".locales-codes span."+b).classList.remove("selected");a.querySelector("pre."+b).classList.remove("selected");b=this.className;this.classList.add("selected");a.querySelector("pre."+b).classList.add("selected")}var e={af:"Afrikaans",sq:"Albanian",am:"Amharic",ar:"Arabic",an:"Aragonese",hy:"Armenian",ast:"Asturian",az:"Azerbaijani",bn:"Bangla",eu:"Basque",be:"Belarusian",bs:"Bosnian",br:"Breton",bg:"Bulgarian",ca:"Catalan",ckb:"Central Kurdish",
zh:"Chinese","zh-HK":"Chinese (Hong Kong)","zh-CN":"Chinese (Simplified)","zh-TW":"Chinese (Traditional)",co:"Corsican",hr:"Croatian",cs:"Czech",da:"Danish",nl:"Dutch",en:"English","en-AU":"English (Australia)","en-CA":"English (Canada)","en-IN":"English (India)","en-NZ":"English (New Zealand)","en-ZA":"English (South Africa)","en-GB":"English (United Kingdom)","en-US":"English (United States)",eo:"Esperanto",et:"Estonian",fo:"Faroese",fil:"Filipino",fi:"Finnish",fr:"French","fr-CA":"French (Canada)",
"fr-FR":"French (France)","fr-CH":"French (Switzerland)",gl:"Galician",ka:"Georgian",de:"German","de-AT":"German (Austria)","de-DE":"German (Germany)","de-LI":"German (Liechtenstein)","de-CH":"German (Switzerland)",el:"Greek",gn:"Guarani",gu:"Gujarati",ha:"Hausa",haw:"Hawaiian",he:"Hebrew",hi:"Hindi",hu:"Hungarian",is:"Icelandic",id:"Indonesian",ia:"Interlingua",ga:"Irish",it:"Italian","it-IT":"Italian (Italy)","it-CH":"Italian (Switzerland)",ja:"Japanese",kn:"Kannada",kk:"Kazakh",km:"Khmer",ko:"Korean",
ku:"Kurdish",ky:"Kyrgyz",lo:"Lao",la:"Latin",lv:"Latvian",ln:"Lingala",lt:"Lithuanian",mk:"Macedonian",ms:"Malay",ml:"Malayalam",mt:"Maltese",mr:"Marathi",mn:"Mongolian",ne:"Nepali",no:"Norwegian",nb:"Norwegian Bokm\u00e5l",nn:"Norwegian Nynorsk",oc:"Occitan",or:"Odia",om:"Oromo",ps:"Pashto",fa:"Persian",pl:"Polish",pt:"Portuguese","pt-BR":"Portuguese (Brazil)","pt-PT":"Portuguese (Portugal)",pa:"Punjabi",qu:"Quechua",ro:"Romanian",mo:"Romanian (Moldova)",rm:"Romansh",ru:"Russian",gd:"Scottish Gaelic",
sr:"Serbian",sh:"Serbo-Croatian",sn:"Shona",sd:"Sindhi",si:"Sinhala",sk:"Slovak",sl:"Slovenian",so:"Somali",st:"Southern Sotho",es:"Spanish","es-AR":"Spanish (Argentina)","es-419":"Spanish (Latin America)","es-MX":"Spanish (Mexico)","es-ES":"Spanish (Spain)","es-US":"Spanish (United States)",su:"Sundanese",sw:"Swahili",sv:"Swedish",tg:"Tajik",ta:"Tamil",tt:"Tatar",te:"Telugu",th:"Thai",ti:"Tigrinya",to:"Tongan",tr:"Turkish",tk:"Turkmen",tw:"Twi",uk:"Ukrainian",ur:"Urdu",ug:"Uyghur",uz:"Uzbek",vi:"Vietnamese",
wa:"Walloon",cy:"Welsh",fy:"Western Frisian",xh:"Xhosa",yi:"Yiddish",yo:"Yoruba",zu:"Zulu"},g={ar:"Arabic",am:"Amharic",bg:"Bulgarian",bn:"Bengali",ca:"Catalan",cs:"Czech",da:"Danish",de:"German",el:"Greek",en:"English",en_GB:"English",en_US:"English",es:"Spanish",es_419:"Spanish",et:"Estonian",fa:"Persian",fi:"Finnish",fil:"Filipino",fr:"French",gu:"Gujarati",he:"Hebrew",hi:"Hindi",hr:"Croatian",hu:"Hungarian",id:"Indonesian",it:"Italian",ja:"Japanese",kn:"Kannada",ko:"Korean",lt:"Lithuanian",lv:"Latvian",
ml:"Malayalam",mr:"Marathi",ms:"Malay",nl:"Dutch",no:"Norwegian",pl:"Polish",pt_BR:"Portuguese",pt_PT:"Portuguese",ro:"Romanian",ru:"Russian",sk:"Slovak",sl:"Slovenian",sr:"Serbian",sv:"Swedish",sw:"Swahili",ta:"Tamil",te:"Telugu",th:"Thai",tr:"Turkish",uk:"Ukrainian",vi:"Vietnamese",zh_CN:"Chinese",zh_TW:"Chinese"},c=chrome.i18n.getMessage("locale_code"),d="function"===typeof chrome.i18n.getUILanguage?chrome.i18n.getUILanguage():!1,b=c;d&&(a.querySelector("#extension-locale").textContent=g[c]+" ("+
c+")",a.querySelector("#browser-locale").textContent="undefined"!==typeof e[d]?e[d]:d,a.querySelector("#locales-info").classList.remove("hidden"));a.querySelector("#instructions").textContent="en_US"===c?"a different language than English (en_US), click on it":"your language";a.querySelector(".locales-codes span."+b).classList.add("selected");a.querySelector("pre."+b).classList.add("selected");a.querySelectorAll(".locales-codes span").forEach(function(a){a.addEventListener("click",f)})})(document);