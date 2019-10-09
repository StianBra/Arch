(function($) {
    'use strict';

    /**
     * Super simple, performance-wise and minimal tooltip utility.
     * This "tooltip tool" saves on DOM nodes and event handlers, since it:
     * 1) Uses delegates, so 1 event handler for unlimited amount of dynamically added tooltips in the UI. #performance
     * 2) Does not require extra DOM elements (e.g. total # of DOM elements < low = performance improvement)
     * 3) Its clever enough to reposition tooltips properly, w/o adding extra dependencies (except for jQuery UI, which
     * we already have), e.g. better then CSS :hover + .tooltip { display: block; }
     * 4) Its minimal. < 200 lines of code.
     *
     * Note: Uses jQuery UI's position() to position the tooltip on top or bottom, if out of viewport. By default -
     * would, try to position below the target element.
     */

    /**
     * How to use:
     * 1) Add "simpletip" class name to any element in the DOM
     * 2) To set the content of the tooltip, pass an attribute w/ the text named `data-simpletip`
     * Example:
     * ```<a href="#" data-simpletip="Hello world!">Mouse over me</a>```
     *
     * Optionally, you can control:
     * A) The wrapper in which the tooltip should try to fit in (and position on top/bottom, depending on whether there
     * is enough space) by passing a selector that matches a parent of the element in attribute named
     * `data-simpletipwrapper`
     * Example:
     * ```<a href="#" data-simpletip="Hey!" data-simpletipwrapper="#call-block">Mouse over me</a>```
     *
     * B) Change the default position to be "above" (top) of the element, instead of bottom/below by passing attribute
     * `data-simpletipposition="top"`
     * Example:
     * ```<a href="#" data-simpletip="Hey! Show on top, if I fit" data-simpletipposition="top">Mouse over me</a>```
     *
     * C) Manually add extra top/bottom offset by passing `data-simpletipoffset="10"`
     * Example:
     * ```<a href="#" data-simpletip="Hey! +/-20px offset for this tip." data-simpletipoffset="20">Mouse over me</a>```
     *
     * D) Add any custom styling to tooltip by `data-simpletip-style='"max-width":"200px"'`
     * Example:
     * ```<a href="#" data-simpletip="Hey! custom styling." data-simpletip-style='"width":"200px"'>Mouse over me</a>```
     */


    var $template = $(
        '<div class="dark-direct-tooltip simpletip-tooltip">' +
            '<i class="small-icon icons-sprite tooltip-arrow"></i>' +
            '<span></span>' +
        '</div>'
    );
    var $currentNode;

    $(document.body).rebind('mouseenter.simpletip', '.simpletip', function () {
        var $this = $(this);
        if ($currentNode) {
            $currentNode.remove();
            $currentNode = null;
        }

        if ($this.is('.deactivated') || $this.parent().is('.deactivated')) {
            return false;
        }

        var contents = $this.attr('data-simpletip');
        if (contents) {
            var $node = $template.clone();
            contents = escapeHTML(contents).replace(/\[BR\]/g, '<br>')
                .replace(/\[I\]/g, '<i>').replace(/\[\/I\]/g, '</i>')
                .replace(/\[B\]/g, '<b>').replace(/\[\/B\]/g, '</b>')
                .replace(/\[U\]/g, '<u>').replace(/\[\/U\]/g, '</u>');
            $('span', $node).safeHTML(contents);
            $('body').append($node);

            $currentNode = $node;
            var wrapper = $this.attr('data-simpletipwrapper') || "";
            if (wrapper) {
                wrapper += ",";
            }

            var customStyle = $this.data('simpletip-style');
            if (customStyle) {
                $currentNode.css(customStyle);
            }

            var my = "center top";
            var at = "center bottom";
            if ($this.attr('data-simpletipposition') === "top") {
                my = "center bottom";
                at = "center top";
            }
            $node.position({
                of: $this,
                my: my,
                at: at,
                collision: "flipfit",
                within: $this.parents('.ps-container,' + wrapper + 'body').first(),
                using: function(obj, info) {
                        var vertClass = info.vertical !== "top" ? "t" : "b";
                        var horizClass = info.horizontal !== "left" ? "l" : "r";
                        this.classList.remove(
                            "simpletip-v-t", "simpletip-v-b", "simpletip-h-l", "simpletip-h-r"
                        );
                        this.classList.add("simpletip-h-" + horizClass, "simpletip-v-" + vertClass, "visible");

                        var topOffset = 0;
                        if (vertClass === "t") {
                            topOffset = -6;
                        }
                        if ($this.attr('data-simpletipoffset')) {
                            var offset = parseInt($this.attr('data-simpletipoffset'), 10);
                            if (vertClass === "t") {
                                topOffset += offset * -1;
                            }
                            else {
                                topOffset += offset;
                            }
                        }

                        $(this).css({
                            left: obj.left + 'px',
                            top: obj.top + topOffset + 'px'
                        });
                    }
            });

            // Calculate Arrow position
            var $tooltipArrow = $node.find('.tooltip-arrow');

            $tooltipArrow.position({
                of: $this,
                my: my,
                at: at,
                collision: "none",
                using: function(obj) {
                        $(this).css({
                            left: obj.left + 'px'
                        });
                    }
            });
        }
    });
    $(document.body).rebind('mouseleave.simpletip', '.simpletip', function (e) {

        var close = function _closeSimpleTip() {
            if ($currentNode) {
                $currentNode.remove();
            }
            $currentNode = null;
        };

        // Prevent blinking when mouse is hover on black triangle.
        var $toElem = $(e.toElement || e.relatedTarget);
        if ($toElem.is('i.small-icon.icons-sprite.tooltip-arrow')) {
            $toElem.rebind('mouseleave', function() {
                close();
            });
        }
        else {
            close();
        }
    });
})(jQuery);
