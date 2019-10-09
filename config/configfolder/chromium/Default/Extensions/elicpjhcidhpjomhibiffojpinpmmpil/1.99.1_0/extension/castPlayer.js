var l64
var l64 = l64 || {};

l64.castPlayer = {};
l64.castPlayer.curPlayItem = {};
l64.castPlayer.CAST_EXTENSION_IDS = ["boadgeojelhgndaghljhdicfkmllpafd", "dliochdbjfkdbacpmhlcpmleaejidimm", "hfaagokkkhdbgiakmmlclaapfelnkoah", "fmfcbgogabcbclcofgocippekhfcmgfj", "enhhojjnijigcajfphajepfemndkmdlo"];
l64.castPlayer.BASE_URL = "https://videodownloaderultimate.com/chromecast/",
//l64.castPlayer.BASE_URL = "http://localhost/vdu/extension/test.html",
l64.castPlayer.castExtensionAvailable = false;
l64.castPlayer.castExtensionAvailableCheckCnt = 0;

l64.castPlayer.t = {
	install : chrome.i18n.getMessage("idcc1"), 
	enable : chrome.i18n.getMessage("idcc2")
	};
 
l64.castPlayer.injectInfo = function (tabId) {
    setTimeout(function () {
        var code = "document.body.setAttribute('data-l64videoinfo', '" + JSON.stringify(l64.castPlayer.curPlayItem) + "');";
        code += 'document.dispatchEvent(new CustomEvent("l64videoinfo", { "detail": ' + JSON.stringify(l64.castPlayer.curPlayItem) + ' })); ';
        chrome.tabs.executeScript(tabId, {
            code: code
        });
    }, 5);
};

l64.castPlayer.infoInject = function (tabId, changeInfo, tab) {
    if (changeInfo.status == "complete" && tab.url.match(l64.castPlayer.BASE_URL)) {
        l64.castPlayer.injectInfo(tabId);
        //chrome.tabs.onUpdated.removeListener(l64.castPlayer.infoInject);
        return;
    }
};

l64.castPlayer.startPlayback = function () {
    if (l64.castPlayer.curPlayItem) {		
        chrome.tabs.query({ url: l64.castPlayer.BASE_URL + "*" }, function (result) {
            if (result && result.length) {
                chrome.tabs.update(result[0].id, { active: true, highlighted: true });				
                l64.castPlayer.injectInfo(result[0].id);
            } else {
                chrome.tabs.create({ url: l64.castPlayer.BASE_URL, active: true }, function (tab) {                
                });
            }
        });
    }
};


l64.castPlayer.playURI = function (item) {
    l64.castPlayer.curPlayItem = item;	
	l64.castPlayer.startPlayback();	 
};

chrome.tabs.onUpdated.addListener(l64.castPlayer.infoInject);