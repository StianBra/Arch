/*******************************************************************************

    uMatrix - a browser extension to block requests.
    Copyright (C) 2015-present Raymond Hill

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

    Home: https://github.com/gorhill/uBlock
*/

'use strict';

/******************************************************************************/
/******************************************************************************/

µMatrix.logger = (function() {

    let LogEntry = function(details) {
        this.init(details);
    };

    LogEntry.prototype.init = function(details) {
        this.tstamp = Date.now();
        this.details = JSON.stringify(details);
    };

    let buffer = null;
    let lastReadTime = 0;
    let writePtr = 0;

    // After 60 seconds without being read, a buffer will be considered
    // unused, and thus removed from memory.
    let logBufferObsoleteAfter = 30 * 1000;

    let janitor = function() {
        if (
            buffer !== null &&
            lastReadTime < (Date.now() - logBufferObsoleteAfter)
        ) {
            buffer = null;
            writePtr = 0;
            api.ownerId = undefined;
            api.enabled = false;
        }
        if ( buffer !== null ) {
            vAPI.setTimeout(janitor, logBufferObsoleteAfter);
        }
    };

    let api = {
        enabled: false,
        ownerId: undefined,
        writeOne: function(details) {
            if ( buffer === null ) { return; }
            if ( writePtr === buffer.length ) {
                buffer.push(new LogEntry(details));
            } else {
                buffer[writePtr].init(details);
            }
            writePtr += 1;
        },
        readAll: function(ownerId) {
            this.ownerId = ownerId;
            this.enabled = true;
            if ( buffer === null ) {
                buffer = [];
                vAPI.setTimeout(janitor, logBufferObsoleteAfter);
            }
            let out = buffer.slice(0, writePtr);
            writePtr = 0;
            lastReadTime = Date.now();
            return out;
        },
    };

    return api;
})();

/******************************************************************************/
