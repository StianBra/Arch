/*******************************************************************************

    uMatrix - a browser extension to black/white list requests.
    Copyright (C) 2014-present Raymond Hill

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

/* global punycode, uDom, uMatrixScopeWidget */
/* jshint esnext: true, bitwise: false */

'use strict';

/******************************************************************************/
/******************************************************************************/

(function() {

/******************************************************************************/
/******************************************************************************/

// Stuff which is good to do very early so as to avoid visual glitches.

(function() {
    var paneContentPaddingTop = vAPI.localStorage.getItem('paneContentPaddingTop'),
        touchDevice = vAPI.localStorage.getItem('touchDevice');

    if ( typeof paneContentPaddingTop === 'string' ) {
        document.querySelector('.paneContent').style.setProperty(
            'padding-top',
            paneContentPaddingTop
        );
    }
    if ( touchDevice === 'true' ) {
        document.body.setAttribute('data-touch', 'true');
    } else {
        document.addEventListener('touchstart', function onTouched(ev) {
            document.removeEventListener(ev.type, onTouched);
            document.body.setAttribute('data-touch', 'true');
            vAPI.localStorage.setItem('touchDevice', 'true');
            resizePopup();
        });
    }
})();

var popupWasResized = function() {
    document.body.setAttribute('data-resize-popup', '');
};

var resizePopup = (function() {
    var timer;
    var fix = function() {
        timer = undefined;
        var doc = document;
        // Manually adjust the position of the main matrix according to the
        // height of the toolbar/matrix header.
        var paddingTop = (doc.querySelector('.paneHead').clientHeight + 2) + 'px',
            paneContent = doc.querySelector('.paneContent');
        if ( paddingTop !== paneContent.style.paddingTop ) {
            paneContent.style.setProperty('padding-top', paddingTop);
            vAPI.localStorage.setItem('paneContentPaddingTop', paddingTop);
        }
        document.body.classList.toggle(
            'hConstrained',
            window.innerWidth < document.body.clientWidth
        );
        popupWasResized();
    };
    return function() {
        if ( timer !== undefined ) {
            clearTimeout(timer);
        }
        timer = vAPI.setTimeout(fix, 97);
    };
})();

/******************************************************************************/
/******************************************************************************/

// Must be consistent with definitions in matrix.js
var Dark      = 0x80;
var Red       = 1;
var Green     = 2;
var DarkRed   = Dark | Red;
var DarkGreen = Dark | Green;

var matrixSnapshot = {};
var groupsSnapshot = [];
var allHostnamesSnapshot = 'do not leave this initial string empty';

var matrixCellHotspots = null;

var matrixHeaderPrettyNames = {
    'all': '',
    'cookie': '',
    'css': '',
    'image': '',
    'media': '',
    'script': '',
    'xhr': '',
    'frame': '',
    'other': ''
};

var firstPartyLabel = '';
var blacklistedHostnamesLabel = '';

var expandosIdGenerator = 1;
var nodeToExpandosMap = (function() {
    if ( typeof window.Map === 'function' ) {
        return new window.Map();
    }
})();

var expandosFromNode = function(node) {
    if (
        node instanceof HTMLElement === false &&
        typeof node.nodeAt === 'function'
    ) {
        node = node.nodeAt(0);
    }
    if ( nodeToExpandosMap ) {
        var expandosId = node.getAttribute('data-expandos');
        if ( !expandosId ) {
            expandosId = '' + (expandosIdGenerator++);
            node.setAttribute('data-expandos', expandosId);
        }
        var expandos = nodeToExpandosMap.get(expandosId);
        if ( expandos === undefined ) {
            nodeToExpandosMap.set(expandosId, (expandos = Object.create(null)));
        }
        return expandos;
    }
    return node;
};

/******************************************************************************/
/******************************************************************************/

function getUserSetting(setting) {
        return matrixSnapshot.userSettings[setting];
    }

function setUserSetting(setting, value) {
    matrixSnapshot.userSettings[setting] = value;
    vAPI.messaging.send('popup.js', {
        what: 'userSettings',
        name: setting,
        value: value
    });
}

/******************************************************************************/

function getUISetting(setting) {
    var r = vAPI.localStorage.getItem(setting);
    if ( typeof r !== 'string' ) {
        return undefined;
    }
    return JSON.parse(r);
}

function setUISetting(setting, value) {
    vAPI.localStorage.setItem(
        setting,
        JSON.stringify(value)
    );
}

/******************************************************************************/

function updateMatrixSnapshot() {
    matrixSnapshotPoller.pollNow();
}

/******************************************************************************/

// For display purpose, create four distinct groups of rows:
// 0th: literal "1st-party" row
// 1st: page domain's related
// 2nd: whitelisted
// 3rd: graylisted
// 4th: blacklisted

function getGroupStats() {

    // Try to not reshuffle groups around while popup is opened if
    // no new hostname added.
    var latestDomainListSnapshot = Object.keys(matrixSnapshot.rows).sort().join();
    if ( latestDomainListSnapshot === allHostnamesSnapshot ) {
        return groupsSnapshot;
    }
    allHostnamesSnapshot = latestDomainListSnapshot;

    // First, group according to whether at least one node in the domain
    // hierarchy is white or blacklisted
    var pageDomain = matrixSnapshot.domain;
    var rows = matrixSnapshot.rows;
    var anyTypeOffset = matrixSnapshot.headerIndices.get('*');
    var hostname, domain;
    var row, color, count, groupIndex;
    var domainToGroupMap = {};

    // These have hard-coded position which cannot be overriden
    domainToGroupMap['1st-party'] = 0;
    domainToGroupMap[pageDomain] = 1;

    // 1st pass: domain wins if it has an explicit rule or a count
    for ( hostname in rows ) {
        if ( rows.hasOwnProperty(hostname) === false ) {
            continue;
        }
        if ( hostname === '*' || hostname === '1st-party' ) {
            continue;
        }
        domain = rows[hostname].domain;
        if ( domain === pageDomain || hostname !== domain ) {
            continue;
        }
        row = rows[domain];
        color = row.temporary[anyTypeOffset];
        if ( color === DarkGreen ) {
            domainToGroupMap[domain] = 2;
            continue;
        }
        if ( color === DarkRed ) {
            domainToGroupMap[domain] = 4;
            continue;
        }
        count = row.counts[anyTypeOffset];
        if ( count !== 0 ) {
            domainToGroupMap[domain] = 3;
            continue;
        }
    }
    // 2nd pass: green wins
    for ( hostname in rows ) {
        if ( rows.hasOwnProperty(hostname) === false ) {
            continue;
        }
        row = rows[hostname];
        domain = row.domain;
        if ( domainToGroupMap.hasOwnProperty(domain) ) {
            continue;
        }
        color = row.temporary[anyTypeOffset];
        if ( color === DarkGreen ) {
            domainToGroupMap[domain] = 2;
        }
    }
    // 3rd pass: gray with count wins
    for ( hostname in rows ) {
        if ( rows.hasOwnProperty(hostname) === false ) {
            continue;
        }
        row = rows[hostname];
        domain = row.domain;
        if ( domainToGroupMap.hasOwnProperty(domain) ) {
            continue;
        }
        color = row.temporary[anyTypeOffset];
        count = row.counts[anyTypeOffset];
        if ( color !== DarkRed && count !== 0 ) {
            domainToGroupMap[domain] = 3;
        }
    }
    // 4th pass: red wins whatever is left
    for ( hostname in rows ) {
        if ( rows.hasOwnProperty(hostname) === false ) {
            continue;
        }
        row = rows[hostname];
        domain = row.domain;
        if ( domainToGroupMap.hasOwnProperty(domain) ) {
            continue;
        }
        color = row.temporary[anyTypeOffset];
        if ( color === DarkRed ) {
            domainToGroupMap[domain] = 4;
        }
    }
    // 5th pass: gray wins whatever is left
    for ( hostname in rows ) {
        if ( rows.hasOwnProperty(hostname) === false ) {
            continue;
        }
        domain = rows[hostname].domain;
        if ( domainToGroupMap.hasOwnProperty(domain) ) {
            continue;
        }
        domainToGroupMap[domain] = 3;
    }

    // Last pass: put each domain in a group
    var groups = [ {}, {}, {}, {}, {} ];
    var group;
    for ( hostname in rows ) {
        if ( rows.hasOwnProperty(hostname) === false ) {
            continue;
        }
        if ( hostname === '*' ) {
            continue;
        }
        domain = rows[hostname].domain;
        groupIndex = domainToGroupMap[domain];
        group = groups[groupIndex];
        if ( group.hasOwnProperty(domain) === false ) {
            group[domain] = {};
        }
        group[domain][hostname] = true;
    }

    groupsSnapshot = groups;

    return groups;
}

/******************************************************************************/

// helpers

function getTemporaryColor(hostname, type) {
    return matrixSnapshot.rows[hostname].temporary[matrixSnapshot.headerIndices.get(type)];
}

function getPermanentColor(hostname, type) {
    return matrixSnapshot.rows[hostname].permanent[matrixSnapshot.headerIndices.get(type)];
}

function addCellClass(cell, hostname, type) {
    var cl = cell.classList;
    cl.add('matCell');
    cl.add('t' + getTemporaryColor(hostname, type).toString(16));
    cl.add('p' + getPermanentColor(hostname, type).toString(16));
}

/******************************************************************************/

// This is required for when we update the matrix while it is open:
// the user might have collapsed/expanded one or more domains, and we don't
// want to lose all his hardwork.

function getCollapseState(domain) {
    var states = getUISetting('popupCollapseSpecificDomains');
    if ( typeof states === 'object' && states[domain] !== undefined ) {
        return states[domain];
    }
    return matrixSnapshot.collapseAllDomains === true;
}

function toggleCollapseState(elem) {
    if ( elem.ancestors('#matHead.collapsible').length > 0 ) {
        toggleMainCollapseState(elem);
    } else {
        toggleSpecificCollapseState(elem);
    }
    popupWasResized();
}

function toggleMainCollapseState(uelem) {
    var matHead = uelem.ancestors('#matHead.collapsible').toggleClass('collapsed');
    var collapsed = matrixSnapshot.collapseAllDomains = matHead.hasClass('collapsed');
    uDom('#matList .matSection.collapsible').toggleClass('collapsed', collapsed);
    setUserSetting('popupCollapseAllDomains', collapsed);

    var specificCollapseStates = getUISetting('popupCollapseSpecificDomains') || {};
    var domains = Object.keys(specificCollapseStates);
    var i = domains.length;
    var domain;
    while ( i-- ) {
        domain = domains[i];
        if ( specificCollapseStates[domain] === collapsed ) {
            delete specificCollapseStates[domain];
        }
    }
    setUISetting('popupCollapseSpecificDomains', specificCollapseStates);
}

function toggleSpecificCollapseState(uelem) {
    // Remember collapse state forever, but only if it is different
    // from main collapse switch.
    var section = uelem.ancestors('.matSection.collapsible').toggleClass('collapsed'),
        domain = expandosFromNode(section).domain,
        collapsed = section.hasClass('collapsed'),
        mainCollapseState = matrixSnapshot.collapseAllDomains === true,
        specificCollapseStates = getUISetting('popupCollapseSpecificDomains') || {};
    if ( collapsed !== mainCollapseState ) {
        specificCollapseStates[domain] = collapsed;
        setUISetting('popupCollapseSpecificDomains', specificCollapseStates);
    } else if ( specificCollapseStates[domain] !== undefined ) {
        delete specificCollapseStates[domain];
        setUISetting('popupCollapseSpecificDomains', specificCollapseStates);
    }
}

/******************************************************************************/

// Update count value of matrix cells(s)

function updateMatrixCounts() {
    var matCells = uDom('.matrix .matRow.rw > .matCell'),
        i = matCells.length,
        matRow, matCell, count, counts,
        headerIndices = matrixSnapshot.headerIndices,
        rows = matrixSnapshot.rows,
        expandos;
    while ( i-- ) {
        matCell = matCells.nodeAt(i);
        expandos = expandosFromNode(matCell);
        if ( expandos.hostname === '*' || expandos.reqType === '*' ) {
            continue;
        }
        matRow = matCell.parentNode;
        counts = matRow.classList.contains('meta') ? 'totals' : 'counts';
        count = rows[expandos.hostname][counts][headerIndices.get(expandos.reqType)];
        if ( count === expandos.count ) { continue; }
        expandos.count = count;
        matCell.textContent = cellTextFromCount(count);
    }
}

function cellTextFromCount(count) {
    if ( count === 0 ) { return '\u00A0'; }
    if ( count < 100 ) { return count; }
    return '99+';
}

/******************************************************************************/

// Update color of matrix cells(s)
// Color changes when rules change

function updateMatrixColors() {
    var cells = uDom('.matrix .matRow.rw > .matCell').removeClass(),
        i = cells.length,
        cell, expandos;
    while ( i-- ) {
        cell = cells.nodeAt(i);
        expandos = expandosFromNode(cell);
        addCellClass(cell, expandos.hostname, expandos.reqType);
    }
    popupWasResized();
}

/******************************************************************************/

// Update behavior of matrix:
// - Whether a section is collapsible or not. It is collapsible if:
//   - It has at least one subdomain AND
//   - There is no explicit rule anywhere in the subdomain cells AND
//   - It is not part of group 3 (blacklisted hostnames)

function updateMatrixBehavior() {
    matrixList = matrixList || uDom('#matList');
    var sections = matrixList.descendants('.matSection');
    var i = sections.length;
    var section, subdomainRows, j, subdomainRow;
    while ( i-- ) {
        section = sections.at(i);
        subdomainRows = section.descendants('.l2:not(.g4)');
        j = subdomainRows.length;
        while ( j-- ) {
            subdomainRow = subdomainRows.at(j);
            subdomainRow.toggleClass('collapsible', subdomainRow.descendants('.t81,.t82').length === 0);
        }
        section.toggleClass('collapsible', subdomainRows.filter('.collapsible').length > 0);
    }
}

/******************************************************************************/

// handle user interaction with filters

function getCellAction(hostname, type, leaning) {
    var temporaryColor = getTemporaryColor(hostname, type);
    var hue = temporaryColor & 0x03;
    // Special case: root toggle only between two states
    if ( type === '*' && hostname === '*' ) {
        return hue === Green ? 'blacklistMatrixCell' : 'whitelistMatrixCell';
    }
    // When explicitly blocked/allowed, can only graylist
    var saturation = temporaryColor & 0x80;
    if ( saturation === Dark ) {
        return 'graylistMatrixCell';
    }
    return leaning === 'whitelisting' ? 'whitelistMatrixCell' : 'blacklistMatrixCell';
}

function handleFilter(button, leaning) {
    // our parent cell knows who we are
    let cell = button.ancestors('div.matCell'),
        expandos = expandosFromNode(cell),
        type = expandos.reqType,
        desHostname = expandos.hostname;
    // https://github.com/gorhill/uMatrix/issues/24
    // No hostname can happen -- like with blacklist meta row
    if ( desHostname === '' ) { return; }
    let request = {
        what: getCellAction(desHostname, type, leaning),
        srcHostname: matrixSnapshot.scope,
        desHostname: desHostname,
        type: type
    };
    vAPI.messaging.send('default', request, updateMatrixSnapshot);
}

function handleWhitelistFilter(button) {
    handleFilter(button, 'whitelisting');
}

function handleBlacklistFilter(button) {
    handleFilter(button, 'blacklisting');
}

/******************************************************************************/

var matrixRowPool = [];
var matrixSectionPool = [];
var matrixGroupPool = [];
var matrixRowTemplate = null;
var matrixList = null;

var startMatrixUpdate = function() {
    matrixList =  matrixList || uDom('#matList');
    matrixList.detach();
    var rows = matrixList.descendants('.matRow');
    rows.detach();
    matrixRowPool = matrixRowPool.concat(rows.toArray());
    var sections = matrixList.descendants('.matSection');
    sections.detach();
    matrixSectionPool = matrixSectionPool.concat(sections.toArray());
    var groups = matrixList.descendants('.matGroup');
    groups.detach();
    matrixGroupPool = matrixGroupPool.concat(groups.toArray());
};

var endMatrixUpdate = function() {
    // https://github.com/gorhill/httpswitchboard/issues/246
    // If the matrix has no rows, we need to insert a dummy one, invisible,
    // to ensure the extension pop-up is properly sized. This is needed because
    // the header pane's `position` property is `fixed`, which means it doesn't
    // affect layout size, hence the matrix header row will be truncated.
    if ( matrixSnapshot.rowCount <= 1 ) {
        matrixList.append(createMatrixRow().css('visibility', 'hidden'));
    }
    updateMatrixBehavior();
    matrixList.css('display', '');
    matrixList.appendTo('.paneContent');
};

var createMatrixGroup = function() {
    var group = matrixGroupPool.pop();
    if ( group ) {
        return uDom(group).removeClass().addClass('matGroup');
    }
    return uDom(document.createElement('div')).addClass('matGroup');
};

var createMatrixSection = function() {
    var section = matrixSectionPool.pop();
    if ( section ) {
        return uDom(section).removeClass().addClass('matSection');
    }
    return uDom(document.createElement('div')).addClass('matSection');
};

var createMatrixRow = function() {
    var row = matrixRowPool.pop();
    if ( row ) {
        row.style.visibility = '';
        row = uDom(row);
        row.descendants('.matCell').removeClass().addClass('matCell');
        row.removeClass().addClass('matRow');
        return row;
    }
    if ( matrixRowTemplate === null ) {
        matrixRowTemplate = uDom('#templates .matRow');
    }
    return matrixRowTemplate.clone();
};

/******************************************************************************/

function renderMatrixHeaderRow() {
    var matHead = uDom('#matHead.collapsible');
    matHead.toggleClass('collapsed', matrixSnapshot.collapseAllDomains === true);
    var cells = matHead.descendants('.matCell'), cell, expandos;
    cell = cells.nodeAt(0);
    expandos = expandosFromNode(cell);
    expandos.reqType = '*';
    expandos.hostname = '*';
    addCellClass(cell, '*', '*');
    cell = cells.nodeAt(1);
    expandos = expandosFromNode(cell);
    expandos.reqType = 'cookie';
    expandos.hostname = '*';
    addCellClass(cell, '*', 'cookie');
    cell = cells.nodeAt(2);
    expandos = expandosFromNode(cell);
    expandos.reqType = 'css';
    expandos.hostname = '*';
    addCellClass(cell, '*', 'css');
    cell = cells.nodeAt(3);
    expandos = expandosFromNode(cell);
    expandos.reqType = 'image';
    expandos.hostname = '*';
    addCellClass(cell, '*', 'image');
    cell = cells.nodeAt(4);
    expandos = expandosFromNode(cell);
    expandos.reqType = 'media';
    expandos.hostname = '*';
    addCellClass(cell, '*', 'media');
    cell = cells.nodeAt(5);
    expandos = expandosFromNode(cell);
    expandos.reqType = 'script';
    expandos.hostname = '*';
    addCellClass(cell, '*', 'script');
    cell = cells.nodeAt(6);
    expandos = expandosFromNode(cell);
    expandos.reqType = 'xhr';
    expandos.hostname = '*';
    addCellClass(cell, '*', 'xhr');
    cell = cells.nodeAt(7);
    expandos = expandosFromNode(cell);
    expandos.reqType = 'frame';
    expandos.hostname = '*';
    addCellClass(cell, '*', 'frame');
    cell = cells.nodeAt(8);
    expandos = expandosFromNode(cell);
    expandos.reqType = 'other';
    expandos.hostname = '*';
    addCellClass(cell, '*', 'other');
    uDom('#matHead .matRow').css('display', '');
}

/******************************************************************************/

function renderMatrixCellDomain(cell, domain) {
    var expandos = expandosFromNode(cell);
    expandos.hostname = domain;
    expandos.reqType = '*';
    addCellClass(cell.nodeAt(0), domain, '*');
    var contents = cell.contents();
    contents.nodeAt(0).textContent = domain === '1st-party' ?
        firstPartyLabel :
        punycode.toUnicode(domain);
    contents.nodeAt(1).textContent = ' ';
}

function renderMatrixCellSubdomain(cell, domain, subomain) {
    var expandos = expandosFromNode(cell);
    expandos.hostname = subomain;
    expandos.reqType = '*';
    addCellClass(cell.nodeAt(0), subomain, '*');
    var contents = cell.contents();
    contents.nodeAt(0).textContent = punycode.toUnicode(subomain.slice(0, subomain.lastIndexOf(domain)-1)) + '.';
    contents.nodeAt(1).textContent = punycode.toUnicode(domain);
}

function renderMatrixMetaCellDomain(cell, domain) {
    var expandos = expandosFromNode(cell);
    expandos.hostname = domain;
    expandos.reqType = '*';
    addCellClass(cell.nodeAt(0), domain, '*');
    var contents = cell.contents();
    contents.nodeAt(0).textContent = '\u2217.' + punycode.toUnicode(domain);
    contents.nodeAt(1).textContent = ' ';
}

function renderMatrixCellType(cell, hostname, type, count) {
    var node = cell.nodeAt(0),
        expandos = expandosFromNode(node);
    expandos.hostname = hostname;
    expandos.reqType = type;
    expandos.count = count;
    addCellClass(node, hostname, type);
    node.textContent = cellTextFromCount(count);
}

function renderMatrixCellTypes(cells, hostname, countName) {
    var counts = matrixSnapshot.rows[hostname][countName];
    var headerIndices = matrixSnapshot.headerIndices;
    renderMatrixCellType(cells.at(1), hostname, 'cookie', counts[headerIndices.get('cookie')]);
    renderMatrixCellType(cells.at(2), hostname, 'css', counts[headerIndices.get('css')]);
    renderMatrixCellType(cells.at(3), hostname, 'image', counts[headerIndices.get('image')]);
    renderMatrixCellType(cells.at(4), hostname, 'media', counts[headerIndices.get('media')]);
    renderMatrixCellType(cells.at(5), hostname, 'script', counts[headerIndices.get('script')]);
    renderMatrixCellType(cells.at(6), hostname, 'xhr', counts[headerIndices.get('xhr')]);
    renderMatrixCellType(cells.at(7), hostname, 'frame', counts[headerIndices.get('frame')]);
    renderMatrixCellType(cells.at(8), hostname, 'other', counts[headerIndices.get('other')]);
}

/******************************************************************************/

function makeMatrixRowDomain(domain) {
    var matrixRow = createMatrixRow().addClass('rw');
    var cells = matrixRow.descendants('.matCell');
    renderMatrixCellDomain(cells.at(0), domain);
    renderMatrixCellTypes(cells, domain, 'counts');
    return matrixRow;
}

function makeMatrixRowSubdomain(domain, subdomain) {
    var matrixRow = createMatrixRow().addClass('rw');
    var cells = matrixRow.descendants('.matCell');
    renderMatrixCellSubdomain(cells.at(0), domain, subdomain);
    renderMatrixCellTypes(cells, subdomain, 'counts');
    return matrixRow;
}

function makeMatrixMetaRowDomain(domain) {
    var matrixRow = createMatrixRow().addClass('rw');
    var cells = matrixRow.descendants('.matCell');
    renderMatrixMetaCellDomain(cells.at(0), domain);
    renderMatrixCellTypes(cells, domain, 'totals');
    return matrixRow;
}

/******************************************************************************/

function renderMatrixMetaCellType(cell, count) {
    // https://github.com/gorhill/uMatrix/issues/24
    // Don't forget to reset cell properties
    var node = cell.nodeAt(0),
        expandos = expandosFromNode(node);
    expandos.hostname = '';
    expandos.reqType = '';
    expandos.count = count;
    cell.addClass('t1');
    node.textContent = cellTextFromCount(count);
}

function makeMatrixMetaRow(totals) {
    var headerIndices = matrixSnapshot.headerIndices,
        matrixRow = createMatrixRow().at(0).addClass('ro'),
        cells = matrixRow.descendants('.matCell'),
        contents = cells.at(0).addClass('t81').contents(),
        expandos = expandosFromNode(cells.nodeAt(0));
    expandos.hostname = '';
    expandos.reqType = '*';
    contents.nodeAt(0).textContent = ' ';
    contents.nodeAt(1).textContent = blacklistedHostnamesLabel.replace(
        '{{count}}',
        totals[headerIndices.get('*')].toLocaleString()
    );
    renderMatrixMetaCellType(cells.at(1), totals[headerIndices.get('cookie')]);
    renderMatrixMetaCellType(cells.at(2), totals[headerIndices.get('css')]);
    renderMatrixMetaCellType(cells.at(3), totals[headerIndices.get('image')]);
    renderMatrixMetaCellType(cells.at(4), totals[headerIndices.get('media')]);
    renderMatrixMetaCellType(cells.at(5), totals[headerIndices.get('script')]);
    renderMatrixMetaCellType(cells.at(6), totals[headerIndices.get('xhr')]);
    renderMatrixMetaCellType(cells.at(7), totals[headerIndices.get('frame')]);
    renderMatrixMetaCellType(cells.at(8), totals[headerIndices.get('other')]);
    return matrixRow;
}

/******************************************************************************/

function computeMatrixGroupMetaStats(group) {
    var headerIndices = matrixSnapshot.headerIndices,
        anyTypeIndex = headerIndices.get('*'),
        n = headerIndices.size,
        totals = new Array(n),
        i = n;
    while ( i-- ) {
        totals[i] = 0;
    }
    var rows = matrixSnapshot.rows, row;
    for ( var hostname in rows ) {
        if ( rows.hasOwnProperty(hostname) === false ) {
            continue;
        }
        row = rows[hostname];
        if ( group.hasOwnProperty(row.domain) === false ) {
            continue;
        }
        if ( row.counts[anyTypeIndex] === 0 ) {
            continue;
        }
        totals[0] += 1;
        for ( i = 1; i < n; i++ ) {
            totals[i] += row.counts[i];
        }
    }
    return totals;
}

/******************************************************************************/

// Compare hostname helper, to order hostname in a logical manner:
// top-most < bottom-most, take into account whether IP address or
// named hostname

function hostnameCompare(a,b) {
    // Normalize: most significant parts first
    if ( !a.match(/^\d+(\.\d+){1,3}$/) ) {
        var aa = a.split('.');
        a = aa.slice(-2).concat(aa.slice(0,-2).reverse()).join('.');
    }
    if ( !b.match(/^\d+(\.\d+){1,3}$/) ) {
        var bb = b.split('.');
        b = bb.slice(-2).concat(bb.slice(0,-2).reverse()).join('.');
    }
    return a.localeCompare(b);
}

/******************************************************************************/

function makeMatrixGroup0SectionDomain() {
    return makeMatrixRowDomain('1st-party').addClass('g0 l1');
}

function makeMatrixGroup0Section() {
    var domainDiv = createMatrixSection();
    expandosFromNode(domainDiv).domain = '1st-party';
    makeMatrixGroup0SectionDomain().appendTo(domainDiv);
    return domainDiv;
}

function makeMatrixGroup0() {
    // Show literal "1st-party" row only if there is 
    // at least one 1st-party hostname
    if ( Object.keys(groupsSnapshot[1]).length === 0 ) {
        return;
    }
    var groupDiv = createMatrixGroup().addClass('g0');
    makeMatrixGroup0Section().appendTo(groupDiv);
    groupDiv.appendTo(matrixList);
}

/******************************************************************************/

function makeMatrixGroup1SectionDomain(domain) {
    return makeMatrixRowDomain(domain)
        .addClass('g1 l1');
}

function makeMatrixGroup1SectionSubomain(domain, subdomain) {
    return makeMatrixRowSubdomain(domain, subdomain)
        .addClass('g1 l2');
}

function makeMatrixGroup1SectionMetaDomain(domain) {
    return makeMatrixMetaRowDomain(domain).addClass('g1 l1 meta');
}

function makeMatrixGroup1Section(hostnames) {
    var domain = hostnames[0];
    var domainDiv = createMatrixSection()
        .toggleClass('collapsed', getCollapseState(domain));
    expandosFromNode(domainDiv).domain = domain;
    if ( hostnames.length > 1 ) {
        makeMatrixGroup1SectionMetaDomain(domain)
            .appendTo(domainDiv);
    }
    makeMatrixGroup1SectionDomain(domain)
        .appendTo(domainDiv);
    for ( var i = 1; i < hostnames.length; i++ ) {
        makeMatrixGroup1SectionSubomain(domain, hostnames[i])
            .appendTo(domainDiv);
    }
    return domainDiv;
}

function makeMatrixGroup1(group) {
    var domains = Object.keys(group).sort(hostnameCompare);
    if ( domains.length ) {
        var groupDiv = createMatrixGroup().addClass('g1');
        makeMatrixGroup1Section(Object.keys(group[domains[0]]).sort(hostnameCompare))
            .appendTo(groupDiv);
        for ( var i = 1; i < domains.length; i++ ) {
            makeMatrixGroup1Section(Object.keys(group[domains[i]]).sort(hostnameCompare))
                .appendTo(groupDiv);
        }
        groupDiv.appendTo(matrixList);
    }
}

/******************************************************************************/

function makeMatrixGroup2SectionDomain(domain) {
    return makeMatrixRowDomain(domain)
        .addClass('g2 l1');
}

function makeMatrixGroup2SectionSubomain(domain, subdomain) {
    return makeMatrixRowSubdomain(domain, subdomain)
        .addClass('g2 l2');
}

function makeMatrixGroup2SectionMetaDomain(domain) {
    return makeMatrixMetaRowDomain(domain).addClass('g2 l1 meta');
}

function makeMatrixGroup2Section(hostnames) {
    var domain = hostnames[0];
    var domainDiv = createMatrixSection()
        .toggleClass('collapsed', getCollapseState(domain));
    expandosFromNode(domainDiv).domain = domain;
    if ( hostnames.length > 1 ) {
        makeMatrixGroup2SectionMetaDomain(domain).appendTo(domainDiv);
    }
    makeMatrixGroup2SectionDomain(domain)
        .appendTo(domainDiv);
    for ( var i = 1; i < hostnames.length; i++ ) {
        makeMatrixGroup2SectionSubomain(domain, hostnames[i])
            .appendTo(domainDiv);
    }
    return domainDiv;
}

function makeMatrixGroup2(group) {
    var domains = Object.keys(group).sort(hostnameCompare);
    if ( domains.length) {
        var groupDiv = createMatrixGroup()
            .addClass('g2');
        makeMatrixGroup2Section(Object.keys(group[domains[0]]).sort(hostnameCompare))
            .appendTo(groupDiv);
        for ( var i = 1; i < domains.length; i++ ) {
            makeMatrixGroup2Section(Object.keys(group[domains[i]]).sort(hostnameCompare))
                .appendTo(groupDiv);
        }
        groupDiv.appendTo(matrixList);
    }
}

/******************************************************************************/

function makeMatrixGroup3SectionDomain(domain) {
    return makeMatrixRowDomain(domain)
        .addClass('g3 l1');
}

function makeMatrixGroup3SectionSubomain(domain, subdomain) {
    return makeMatrixRowSubdomain(domain, subdomain)
        .addClass('g3 l2');
}

function makeMatrixGroup3SectionMetaDomain(domain) {
    return makeMatrixMetaRowDomain(domain).addClass('g3 l1 meta');
}

function makeMatrixGroup3Section(hostnames) {
    var domain = hostnames[0];
    var domainDiv = createMatrixSection()
        .toggleClass('collapsed', getCollapseState(domain));
    expandosFromNode(domainDiv).domain = domain;
    if ( hostnames.length > 1 ) {
        makeMatrixGroup3SectionMetaDomain(domain).appendTo(domainDiv);
    }
    makeMatrixGroup3SectionDomain(domain)
        .appendTo(domainDiv);
    for ( var i = 1; i < hostnames.length; i++ ) {
        makeMatrixGroup3SectionSubomain(domain, hostnames[i])
            .appendTo(domainDiv);
    }
    return domainDiv;
}

function makeMatrixGroup3(group) {
    var domains = Object.keys(group).sort(hostnameCompare);
    if ( domains.length) {
        var groupDiv = createMatrixGroup()
            .addClass('g3');
        makeMatrixGroup3Section(Object.keys(group[domains[0]]).sort(hostnameCompare))
            .appendTo(groupDiv);
        for ( var i = 1; i < domains.length; i++ ) {
            makeMatrixGroup3Section(Object.keys(group[domains[i]]).sort(hostnameCompare))
                .appendTo(groupDiv);
        }
        groupDiv.appendTo(matrixList);
    }
}

/******************************************************************************/

function makeMatrixGroup4SectionDomain(domain) {
    return makeMatrixRowDomain(domain)
        .addClass('g4 l1');
}

function makeMatrixGroup4SectionSubomain(domain, subdomain) {
    return makeMatrixRowSubdomain(domain, subdomain)
        .addClass('g4 l2');
}

function makeMatrixGroup4Section(hostnames) {
    var domain = hostnames[0];
    var domainDiv = createMatrixSection();
    expandosFromNode(domainDiv).domain = domain;
    makeMatrixGroup4SectionDomain(domain)
        .appendTo(domainDiv);
    for ( var i = 1; i < hostnames.length; i++ ) {
        makeMatrixGroup4SectionSubomain(domain, hostnames[i])
            .appendTo(domainDiv);
    }
    return domainDiv;
}

function makeMatrixGroup4(group) {
    var domains = Object.keys(group).sort(hostnameCompare);
    if ( domains.length === 0 ) {
        return;
    }
    var groupDiv = createMatrixGroup().addClass('g4');
    createMatrixSection()
        .addClass('g4Meta')
        .toggleClass('g4Collapsed', !!matrixSnapshot.collapseBlacklistedDomains)
        .appendTo(groupDiv);
    makeMatrixMetaRow(computeMatrixGroupMetaStats(group), 'g4')
        .appendTo(groupDiv);
    makeMatrixGroup4Section(Object.keys(group[domains[0]]).sort(hostnameCompare))
        .appendTo(groupDiv);
    for ( var i = 1; i < domains.length; i++ ) {
        makeMatrixGroup4Section(Object.keys(group[domains[i]]).sort(hostnameCompare))
            .appendTo(groupDiv);
    }
    groupDiv.appendTo(matrixList);
}

/******************************************************************************/

var makeMenu = function() {
    var groupStats = getGroupStats();

    if ( Object.keys(groupStats).length === 0 ) { return; }

    // https://github.com/gorhill/httpswitchboard/issues/31
    if ( matrixCellHotspots ) {
        matrixCellHotspots.detach();
    }

    renderMatrixHeaderRow();

    startMatrixUpdate();
    makeMatrixGroup0(groupStats[0]);
    makeMatrixGroup1(groupStats[1]);
    makeMatrixGroup2(groupStats[2]);
    makeMatrixGroup3(groupStats[3]);
    makeMatrixGroup4(groupStats[4]);
    endMatrixUpdate();

    uMatrixScopeWidget.init(
        matrixSnapshot.domain,
        matrixSnapshot.hostname,
        matrixSnapshot.scope
    );
    updateMatrixButtons();
    resizePopup();
    recipeManager.fetch();
};

/******************************************************************************/

// Do all the stuff that needs to be done before building menu et al.

function initMenuEnvironment() {
    document.body.style.setProperty(
        'font-size',
        getUserSetting('displayTextSize')
    );
    uDom.nodeFromId('version').textContent = matrixSnapshot.appVersion || '';
    document.body.classList.toggle(
        'colorblind',
        getUserSetting('colorBlindFriendly')
    );
    document.body.classList.toggle(
        'noTooltips',
        getUserSetting('noTooltips')
    );

    var prettyNames = matrixHeaderPrettyNames;
    var keys = Object.keys(prettyNames);
    var i = keys.length;
    var cell, key, text;
    while ( i-- ) {
        key = keys[i];
        cell = uDom('#matHead .matCell[data-req-type="'+ key +'"]');
        text = vAPI.i18n(key + 'PrettyName');
        cell.text(text);
        prettyNames[key] = text;
    }

    firstPartyLabel = uDom('[data-i18n="matrix1stPartyLabel"]').text();
    blacklistedHostnamesLabel = uDom('[data-i18n="matrixBlacklistedHostnames"]').text();
}

/******************************************************************************/

function scopeChangeHandler(ev) {
    let newScope = ev.detail.scope;
    if ( !newScope || matrixSnapshot.scope === newScope ) { return; }
    matrixSnapshot.scope = newScope;
    matrixSnapshot.tMatrixModifiedTime = undefined;
    updateMatrixSnapshot();
    dropDownMenuHide();
}

/******************************************************************************/

function updateMatrixSwitches() {
    var count = 0,
        enabled,
        switches = matrixSnapshot.tSwitches;
    for ( var switchName in switches ) {
        if ( switches.hasOwnProperty(switchName) === false ) { continue; }
        enabled = switches[switchName];
        if ( enabled && switchName !== 'matrix-off' ) {
            count += 1;
        }
        uDom('#mtxSwitch_' + switchName).toggleClass('switchTrue', enabled);
    }
    uDom.nodeFromId('mtxSwitch_https-strict').classList.toggle(
        'relevant',
        matrixSnapshot.hasMixedContent
    );
    uDom.nodeFromId('mtxSwitch_no-workers').classList.toggle(
        'relevant',
        matrixSnapshot.hasWebWorkers
    );
    uDom.nodeFromId('mtxSwitch_referrer-spoof').classList.toggle(
        'relevant',
        matrixSnapshot.has3pReferrer
    );
    uDom.nodeFromId('mtxSwitch_noscript-spoof').classList.toggle(
        'relevant',
        matrixSnapshot.hasNoscriptTags
    );
    uDom.nodeFromSelector('#buttonMtxSwitches .fa-icon-badge').textContent =
        count.toLocaleString();
    uDom.nodeFromSelector('#mtxSwitch_matrix-off .fa-icon-badge').textContent =
        matrixSnapshot.blockedCount.toLocaleString();
    document.body.classList.toggle('powerOff', switches['matrix-off']);
}

function toggleMatrixSwitch(ev) {
    if ( ev.target.localName === 'a' ) { return; }
    var elem = ev.currentTarget;
    var pos = elem.id.indexOf('_');
    if ( pos === -1 ) { return; }
    var switchName = elem.id.slice(pos + 1);
    var request = {
        what: 'toggleMatrixSwitch',
        switchName: switchName,
        srcHostname: matrixSnapshot.scope
    };
    vAPI.messaging.send('popup.js', request, updateMatrixSnapshot);
}

/******************************************************************************/

function updatePersistButton() {
    var diffCount = matrixSnapshot.diff.length;
    var button = uDom('#buttonPersist');
    button.contents()
          .filter(function(){return this.nodeType===3;})
          .first()
          .text(diffCount > 0 ? '\uf13e' : '\uf023');
    button.descendants('.fa-icon-badge').text(diffCount > 0 ? diffCount : '');
    var disabled = diffCount === 0;
    button.toggleClass('disabled', disabled);
    uDom('#buttonRevertScope').toggleClass('disabled', disabled);
}

/******************************************************************************/

function persistMatrix() {
    var request = {
        what: 'applyDiffToPermanentMatrix',
        diff: matrixSnapshot.diff
    };
    vAPI.messaging.send('popup.js', request, updateMatrixSnapshot);
}

/******************************************************************************/

// rhill 2014-03-12: revert completely ALL changes related to the
// current page, including scopes.

function revertMatrix() {
    var request = {
        what: 'applyDiffToTemporaryMatrix',
        diff: matrixSnapshot.diff
    };
    vAPI.messaging.send('popup.js', request, updateMatrixSnapshot);
}

/******************************************************************************/

// Buttons which are affected by any changes in the matrix

function updateMatrixButtons() {
    uMatrixScopeWidget.update(matrixSnapshot.scope);
    updateMatrixSwitches();
    updatePersistButton();
}

/******************************************************************************/

function buttonReloadHandler(ev) {
    vAPI.messaging.send('default', {
        what: 'forceReloadTab',
        tabId: matrixSnapshot.tabId,
        bypassCache: ev.ctrlKey || ev.metaKey || ev.shiftKey
    });
}

/******************************************************************************/

let recipeManager = (function() {
    let recipes = [];
    let reScopeAlias = /(^|\s+)_(\s+|$)/g;

    function createEntry(name, ruleset, parent) {
        let li = document.querySelector('#templates li.recipe')
                         .cloneNode(true);
        li.querySelector('.name').textContent = name;
        li.querySelector('.ruleset').textContent = ruleset;
        if ( parent ) {
            parent.appendChild(li);
        }
        return li;
    }

    function apply(ev) {
        if (
            ev.target.classList.contains('expander') ||
            ev.target.classList.contains('name')
        ) {
            ev.currentTarget.classList.toggle('expanded');
            return;
        }
        if (
            ev.target.classList.contains('importer') === false &&
            ev.target.classList.contains('committer') === false
        ) {
            return;
        }
        let root = ev.currentTarget;
        let ruleset = root.querySelector('.ruleset');
        let commit = ev.target.classList.contains('committer');
        vAPI.messaging.send(
            'popup.js',
            {
                what: 'applyRecipe',
                ruleset: ruleset.textContent,
                commit: commit
            },
            updateMatrixSnapshot
        );
        root.classList.remove('mustImport');
        if ( commit ) {
            root.classList.remove('mustCommit');
        }
        //dropDownMenuHide();
    }

    function show(details) {
        let root = document.querySelector('#dropDownMenuRecipes .dropdown-menu');
        let ul = document.createElement('ul');
        for ( let recipe of details.recipes ) {
            let li = createEntry(
                recipe.name,
                recipe.ruleset.replace(reScopeAlias, '$1' + details.scope + '$2'),
                ul
            );
            li.classList.toggle('mustImport', recipe.mustImport === true);
            li.classList.toggle('mustCommit', recipe.mustCommit === true);
            li.addEventListener('click', apply);
        }
        root.replaceChild(ul, root.querySelector('ul'));
        dropDownMenuShow(uDom.nodeFromId('buttonRecipes'));
    }

    function beforeShow() {
        if ( recipes.length === 0 ) { return; }
        vAPI.messaging.send(
            'popup.js',
            {
                what: 'fetchRecipeCommitStatuses',
                scope: matrixSnapshot.scope,
                recipes: recipes
            },
            show
        );
    }

    function fetch() {
        let onResponse = function(response) {
            recipes = Array.isArray(response) ? response : [];
            let button = uDom.nodeFromId('buttonRecipes');
            if ( recipes.length === 0 ) {
                button.classList.add('disabled');
                return;
            }
            button.classList.remove('disabled');
            button.querySelector('.fa-icon-badge').textContent = recipes.length;
        };

        let desHostnames = [];
        for ( let hostname in matrixSnapshot.rows ) {
            if ( matrixSnapshot.rows.hasOwnProperty(hostname) === false ) {
                continue;
            }
            let row = matrixSnapshot.rows[hostname];
            if ( row.domain === matrixSnapshot.domain ) { continue; }
            if ( row.counts[0] !== 0 || row.domain === hostname ) {
                desHostnames.push(hostname);
            }
        }

        vAPI.messaging.send('popup.js',
            {
                what: 'fetchRecipes',
                srcHostname: matrixSnapshot.hostname,
                desHostnames: desHostnames
            },
            onResponse
        );
    }

    return {
        fetch: fetch,
        show: beforeShow,
        apply: apply
    };
})();

/******************************************************************************/

function revertAll() {
    vAPI.messaging.send(
        'popup.js',
        { what: 'revertTemporaryMatrix' },
        updateMatrixSnapshot
    );
}

/******************************************************************************/

function mouseenterMatrixCellHandler(ev) {
    matrixCellHotspots.appendTo(ev.target);
}

function mouseleaveMatrixCellHandler() {
    matrixCellHotspots.detach();
}

/******************************************************************************/

function gotoExtensionURL(ev) {
    var url = uDom(ev.currentTarget).attr('data-extension-url');
    if ( url ) {
        vAPI.messaging.send('popup.js', {
            what: 'gotoExtensionURL',
            url: url,
            shiftKey: ev.shiftKey
        });
    }
    dropDownMenuHide();
    vAPI.closePopup();
}

/******************************************************************************/

function dropDownMenuShow(button) {
    var menuOverlay = document.getElementById(button.getAttribute('data-dropdown-menu'));
    var butnRect = button.getBoundingClientRect();
    var viewRect = document.body.getBoundingClientRect();
    var butnNormalLeft = butnRect.left / (viewRect.width - butnRect.width);
    menuOverlay.classList.add('show');
    var menu = menuOverlay.querySelector('.dropdown-menu');
    var menuRect = menu.getBoundingClientRect();
    var menuLeft = butnNormalLeft * (viewRect.width - menuRect.width);
    menu.style.top = butnRect.bottom + 'px';
    if ( menuOverlay.classList.contains('dropdown-menu-centered') === false ) {
        menu.style.left = menuLeft.toFixed(0) + 'px';
    }
}

function dropDownMenuHide() {
    uDom('.dropdown-menu-capture').removeClass('show');
}

/******************************************************************************/

var onMatrixSnapshotReady = function(response) {
    if ( response === 'ENOTFOUND' ) {
        uDom.nodeFromId('noTabFound').textContent =
            vAPI.i18n('matrixNoTabFound');
        document.body.classList.add('noTabFound');
        return;
    }

    // Now that tabId and pageURL are set, we can build our menu
    initMenuEnvironment();
    makeMenu();

    // After popup menu is built, check whether there is a non-empty matrix
    if ( matrixSnapshot.url === '' ) {
        uDom('#matHead').remove();
        uDom('#toolbarContainer').remove();

        // https://github.com/gorhill/httpswitchboard/issues/191
        uDom('#noNetTrafficPrompt').text(vAPI.i18n('matrixNoNetTrafficPrompt'));
        uDom('#noNetTrafficPrompt').css('display', '');
    }

    // Create a hash to find out whether the reload button needs to be
    // highlighted.
    // TODO:
};

/******************************************************************************/

var matrixSnapshotPoller = (function() {
    var timer = null;

    var preprocessMatrixSnapshot = function(snapshot) {
        if ( Array.isArray(snapshot.headerIndices) ) {
            snapshot.headerIndices = new Map(snapshot.headerIndices);
        }
        return snapshot;
    };

    var processPollResult = function(response) {
        if ( typeof response !== 'object' ) {
            return;
        }
        if (
            response.mtxContentModified === false &&
            response.mtxCountModified === false &&
            response.pMatrixModified === false &&
            response.tMatrixModified === false
        ) {
            return;
        }
        matrixSnapshot = preprocessMatrixSnapshot(response);

        if ( response.mtxContentModified ) {
            makeMenu();
            return;
        }
        if ( response.mtxCountModified ) {
            updateMatrixCounts();
        }
        if (
            response.pMatrixModified ||
            response.tMatrixModified ||
            response.scopeModified
        ) {
            updateMatrixColors();
            updateMatrixBehavior();
            updateMatrixButtons();
        }
    };

    var onPolled = function(response) {
        processPollResult(response);
        pollAsync();
    };

    var pollNow = function() {
        unpollAsync();
        vAPI.messaging.send('popup.js', {
            what: 'matrixSnapshot',
            tabId: matrixSnapshot.tabId,
            scope: matrixSnapshot.scope,
            mtxContentModifiedTime: matrixSnapshot.mtxContentModifiedTime,
            mtxCountModifiedTime: matrixSnapshot.mtxCountModifiedTime,
            mtxDiffCount: matrixSnapshot.diff.length,
            pMatrixModifiedTime: matrixSnapshot.pMatrixModifiedTime,
            tMatrixModifiedTime: matrixSnapshot.tMatrixModifiedTime,
        }, onPolled);
    };

    var poll = function() {
        timer = null;
        pollNow();
    };

    var pollAsync = function() {
        if ( timer !== null ) {
            return;
        }
        if ( document.defaultView === null ) {
            return;
        }
        timer = vAPI.setTimeout(poll, 1414);
    };

    var unpollAsync = function() {
        if ( timer !== null ) {
            clearTimeout(timer);
            timer = null;
        }
    };

    (function() {
        let tabId = matrixSnapshot.tabId;

        // If no tab id yet, see if there is one specified in our URL
        if ( tabId === undefined ) {
            var matches = window.location.search.match(/(?:\?|&)tabId=([^&]+)/);
            if ( matches !== null ) {
                tabId = parseInt(matches[1], 10);
                // No need for logger button when embedded in logger
                uDom('[data-extension-url="logger-ui.html"]').remove();
            }
        }

        var snapshotFetched = function(response) {
            if ( typeof response === 'object' ) {
                matrixSnapshot = preprocessMatrixSnapshot(response);
            }
            onMatrixSnapshotReady(response);
            pollAsync();
        };

        vAPI.messaging.send('popup.js', {
            what: 'matrixSnapshot',
            tabId: tabId
        }, snapshotFetched);
    })();

    return {
        pollNow: pollNow
    };
})();

/******************************************************************************/

// Below is UI stuff which is not key to make the menu, so this can
// be done without having to wait for a tab to be bound to the menu.

// We reuse for all cells the one and only cell hotspots.
uDom('#whitelist').on('click', function() {
        handleWhitelistFilter(uDom(this));
        return false;
    });
uDom('#blacklist').on('click', function() {
        handleBlacklistFilter(uDom(this));
        return false;
    });
uDom('#domainOnly').on('click', function() {
        toggleCollapseState(uDom(this));
        return false;
    });
matrixCellHotspots = uDom('#cellHotspots').detach();
uDom('body')
    .on('mouseenter', '.matCell', mouseenterMatrixCellHandler)
    .on('mouseleave', '.matCell', mouseleaveMatrixCellHandler);
window.addEventListener('uMatrixScopeWidgetChange', scopeChangeHandler);
uDom('#buttonMtxSwitches').on('click', function(ev) {
    dropDownMenuShow(ev.target);
});
uDom('[id^="mtxSwitch_"]').on('click', toggleMatrixSwitch);
uDom('#buttonPersist').on('click', persistMatrix);
uDom('#buttonRevertScope').on('click', revertMatrix);

uDom('#buttonRecipes').on('click', function() {
    recipeManager.show();
});

uDom('#buttonRevertAll').on('click', revertAll);
uDom('#buttonReload').on('click', buttonReloadHandler);
uDom('.extensionURL').on('click', gotoExtensionURL);
uDom('body').on('click', '.dropdown-menu-capture', dropDownMenuHide);

uDom('#matList').on('click', '.g4Meta', function(ev) {
    matrixSnapshot.collapseBlacklistedDomains =
        ev.target.classList.toggle('g4Collapsed');
    setUserSetting(
        'popupCollapseBlacklistedDomains',
        matrixSnapshot.collapseBlacklistedDomains
    );
});

/******************************************************************************/

})();
