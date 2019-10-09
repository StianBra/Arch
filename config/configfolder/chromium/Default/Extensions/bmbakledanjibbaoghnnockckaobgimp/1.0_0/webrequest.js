chrome.webRequest.onBeforeRequest.addListener(
  function(details) {
    return {redirectUrl: details.url.substring(43)};
  },
  {urls: ["*://steamcommunity.com/linkfilter/*"]},
  ["blocking"]
);
