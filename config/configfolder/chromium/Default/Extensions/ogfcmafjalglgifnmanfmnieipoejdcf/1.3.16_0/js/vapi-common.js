/*******************************************************************************

    uMatrix - a browser extension to block requests.
    Copyright (C) 2014-2018 The uMatrix/uBlock Origin authors

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see {http://www.gnu.org/licenses/}.

    Home: https://github.com/gorhill/uMatrix
*/

// For background page or non-background pages

'use strict';

/******************************************************************************/
/******************************************************************************/

(function(self) {

/******************************************************************************/

// https://bugs.chromium.org/p/project-zero/issues/detail?id=1225&desc=6#c10
if ( self.vAPI === undefined || self.vAPI.uMatrix !== true ) {
    self.vAPI = { uMatrix: true };
}

var vAPI = self.vAPI;
var chrome = self.chrome;

/******************************************************************************/

vAPI.setTimeout = vAPI.setTimeout || window.setTimeout.bind(window);

/******************************************************************************/

vAPI.webextFlavor = {
    major: 0,
    soup: new Set()
};

(function() {
    var ua = navigator.userAgent,
        flavor = vAPI.webextFlavor,
        soup = flavor.soup;
    var dispatch = function() {
        window.dispatchEvent(new CustomEvent('webextFlavor'));
    };

    // This is always true.
    soup.add('ublock');

    if ( /\bMobile\b/.test(ua) ) {
        soup.add('mobile');
    }

    // Asynchronous
    var async = self.browser instanceof Object &&
                typeof self.browser.runtime.getBrowserInfo === 'function';
    if ( async ) {
        self.browser.runtime.getBrowserInfo().then(function(info) {
            flavor.major = parseInt(info.version, 10) || 0;
            soup.add(info.vendor.toLowerCase())
                .add(info.name.toLowerCase());
            if ( flavor.major >= 53 ) { soup.add('user_stylesheet'); }
            if ( flavor.major >= 57 ) { soup.add('html_filtering'); }
            dispatch();
        });
    }

    // Synchronous
    var match = /Firefox\/([\d.]+)/.exec(ua);
    if ( match !== null ) {
        flavor.major = parseInt(match[1], 10) || 0;
        soup.add('mozilla')
            .add('firefox');
        if ( flavor.major >= 53 ) { soup.add('user_stylesheet'); }
        if ( flavor.major >= 57 ) { soup.add('html_filtering'); }
    } else {
        match = /OPR\/([\d.]+)/.exec(ua);
        if ( match !== null ) {
            var reEx = /Chrom(?:e|ium)\/([\d.]+)/;
            if ( reEx.test(ua) ) { match = reEx.exec(ua); }
            flavor.major = parseInt(match[1], 10) || 0;
            soup.add('opera').add('chromium');
        } else {
            match = /Chromium\/([\d.]+)/.exec(ua);
            if ( match !== null ) {
                flavor.major = parseInt(match[1], 10) || 0;
                soup.add('chromium');
            } else {
                match = /Chrome\/([\d.]+)/.exec(ua);
                if ( match !== null ) {
                    flavor.major = parseInt(match[1], 10) || 0;
                    soup.add('google').add('chromium');
                }
            }
        }
        // https://github.com/gorhill/uBlock/issues/3588
        if ( soup.has('chromium') && flavor.major >= 67 ) {
            soup.add('user_stylesheet');
        }
    }

    // Don't starve potential listeners
    if ( !async ) {
        vAPI.setTimeout(dispatch, 97);
    }
})();

/******************************************************************************/

// http://www.w3.org/International/questions/qa-scripts#directions

var setScriptDirection = function(language) {
    document.body.setAttribute(
        'dir',
        ['ar', 'he', 'fa', 'ps', 'ur'].indexOf(language) !== -1 ? 'rtl' : 'ltr'
    );
};

/******************************************************************************/

vAPI.download = function(details) {
    if ( !details.url ) {
        return;
    }

    var a = document.createElement('a');
    a.href = details.url;
    a.setAttribute('download', details.filename || '');
    a.dispatchEvent(new MouseEvent('click'));
};

/******************************************************************************/

vAPI.getURL = chrome.runtime.getURL;

/******************************************************************************/

vAPI.i18n = chrome.i18n.getMessage;

setScriptDirection(vAPI.i18n('@@ui_locale'));

/******************************************************************************/

vAPI.closePopup = function() {
    window.close();
};

/******************************************************************************/

// A localStorage-like object which should be accessible from the
// background page or auxiliary pages.
// This storage is optional, but it is nice to have, for a more polished user
// experience.

// https://github.com/gorhill/uBlock/issues/2824
//   Use a dummy localStorage if for some reasons it's not available.

// https://github.com/gorhill/uMatrix/issues/840
//   Always use a wrapper to seamlessly handle exceptions

vAPI.localStorage = {
    clear: function() {
        try {
            window.localStorage.clear();
        } catch(ex) {
        }
    },
    getItem: function(key) {
        try {
            return window.localStorage.getItem(key);
        } catch(ex) {
        }
        return null;
    },
    removeItem: function(key) {
        try {
            window.localStorage.removeItem(key);
        } catch(ex) {
        }
    },
    setItem: function(key, value) {
        try {
            window.localStorage.setItem(key, value);
        } catch(ex) {
        }
    }
};

/******************************************************************************/

})(this);

/******************************************************************************/
