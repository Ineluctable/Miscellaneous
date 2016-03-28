// ==UserScript==
// @name        BT MetaSearch
// @description Searches across multiple sources at once.
// @namespace   BlackNullerNS
// @include     file:///*/btsearch.html*
// @include     http*://blacknuller.github.io/btsearch.html*
// @version     1.6.8
// @grant	 GM_xmlhttpRequest
// @grant	 GM_setValue
// @grant	 GM_getValue
// @require	 https://ajax.googleapis.com/ajax/libs/jquery/2.1.4/jquery.min.js
// @require	 https://cdnjs.cloudflare.com/ajax/libs/twitter-bootstrap/3.3.5/js/bootstrap.min.js
// @require  https://cdnjs.cloudflare.com/ajax/libs/jquery.sticky/1.0.1/jquery.sticky.min.js
// ==/UserScript==

"use strict";

//window.console = {
//    log: function () {},
//    warn: function () {},
//    error: function () {}
//};

/*
 * jQuery Tiny Pub/Sub
 * https://github.com/cowboy/jquery-tiny-pubsub
 *
 * Copyright (c) 2013 "Cowboy" Ben Alman
 * Licensed under the MIT license.
 */

(function ($) {

    var o = $({});

    $.subscribe = function () {
        //console.log("Subscribed", arguments[0]);
        o.on.apply(o, arguments);
    };

    $.unsubscribe = function () {
        //console.log("Unsubscribed", arguments[0]);
        o.off.apply(o, arguments);
    };

    $.publish = function () {
        //console.log("Fired event", arguments[0]);
        return o.trigger.apply(o, arguments);
    };

}(jQuery));


var SearchEngine = function () {
    var self = this;

    self.sources = {};
    self.sourceCallbacks = {};
    self.pageId = false;
    self.categories = {};
    self.timeout = 8000;
    self.protocols = ["http", "https", "ftp", "magnet", "ed2k"];
    self.resolutions = ["480p","576p","720p","1080p","1080i"];
    self.all = "all";
    self.favorites = "favorites";

    self.nonAlphaNumericRegex = /^[^\u00BF-\u1FFF\u2C00-\uD7FF\w]+$/;
	self.matchNonAlphaNumericRegex = /[^\u00BF-\u1FFF\u2C00-\uD7FF\w]+/g;
	self.matchFirstNonDigit = /[^\d]/;
	self.yearRegexSimple = /(([\ ]{1}|^)(19|20)[\d]{2}([\ ]{1}|$))/g;
	self.yearRegexAdvanced = /(([\ ]{1}|^)(19|20)[\d]{2}\-(19|20)[\d]{2}([\ ]{1}|$)|([\ ]{1}|^)\-(19|20)[\d]{2}([\ ]{1}|$)|([\ ]{1}|^)(19|20)[\d]{2}\-([\ ]{1}|$)|([\ ]{1}|^)(19|20)[\d]{2}([\ ]{1}|$))/g;
	self.imgTagRegex = /<img /g;
	self.dashRegex = /\-/g;
    self.queryRegex = /\{query\}/g;
    self.spacesRegex = /[ ]+/g;

    document.head.innerHTML = "\
		<meta charset=\"utf-8\">\
		<title>BT MetaSearch</title>\
		<link rel=\"shortcut icon\" href=\"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAC5UlEQVQ4jXXR708SARgH8HsVoCjceQfIAYeKKZ5wdxC4stbWqq2t/gF9LW985Zt64Rs4r/EmzCN90dZW/4D/gD9w06mYiIIoWmqCwUZGq7XpC3XfXjQ3s/G8fZ7v58XzJUKhUElVVYyNjUFVVcTjcYiiGCKujSiKoat3qqpiYGCgRIyOjqJQKKBYLKJYLKJcLkMQhMh1QBCESKlUwuHhIY6OjlAoFBCLxUAoioL19XVkMhmsra0hl8vVBPL5PFKpFNLpNNLpNKLRKAhZljE9PY2pqSkkEgnMz8/XBFZWVjA7O4uZmRnMzc0hHA6D6Ovrg6IoGBkZgSzLUBSlJnC5j0QikGUZ/f39ICY8QVRsXTjmPPjOefHLFagJ/HYFccx5UbHzOOa8mPAEQYzzfuxSLPYYBw5MTlTb/DWBY6eAL+YWfKbt+EzbMd4pghjvvoV8kw07lA17DIeqU6wJVNv82Dc58Yl2IE+xGHdLIOJu/3mOYrFNsdijOVSdPvRI0n9AjyRFqi1+7DFObJEstigb4m7fOfGK95WyRis2SSt2KTtKlna8vPNgjed5/WWY53m9HLyfKlvd2CZZbBibsWGw4LU3UCKed/smt4wsUg0m5IxWHFAOfHMFzt7cfZR9FuiJPvUHourth9mKK3h2QDmw0WjGusGCrKEZL7p9k0SvIAzlae58tcGMlN6E7QYLjkgOP5kOnNr8OGUl/KDb8ZXkkG+0It1gxnI9gzzTcn5PEIYISZKYdy1d+8l6Ggs6Elm9GTt6CwqNVpQNNpQNNhw2NmNbb0JGb8ZiHYVkPY23zs59SZKYvw/yiIMJS+vJkpbCopZEUksio6OxVccgq6OxWcdgVdeEBS2JJR2FhKX1pMcjDv7z5V6PMPSB6yhn9JaL5A0jljUkkhoSyxojFjVGfNRQyNaZLt47Osq9HmHoekuXXbNPvOJw+Ca/EGvjK6qjA2N2F2JtfEVxexced3uHBUFgr2b+ALrXp0Lde/kOAAAAAElFTkSuQmCC\">\
	";

	var searchLink = document.createElement("link");
	searchLink.setAttribute("rel", "search");
	searchLink.setAttribute("type", "application/opensearchdescription+xml");
	$.each({
		"BT": "http://pastebin.com/raw.php?i=9qX0S4kh",
		"BT: Music": "http://pastebin.com/raw.php?i=WNgesQLe",
		"BT: Music FLAC": "http://pastebin.com/raw.php?i=kSia7hEU",
		"BT: Movies": "http://pastebin.com/raw.php?i=0HcBtLLY",
		"BT: TV": "http://pastebin.com/raw.php?i=hdpjxFh4",
		"BT: Magazines": "http://pastebin.com/raw.php?i=b75J8dpe",
		"BT: E-Books": "http://pastebin.com/raw.php?i=NKVLw6zT",
		"BT: Fiction": "http://pastebin.com/raw.php?i=rVYh6uyy",
		"BT: Audiobooks": "http://pastebin.com/raw.php?i=B5Q2X5F0",
		"BT: E-Learning": "http://pastebin.com/raw.php?i=9D2zZdiq",
		"BT: Comics": "http://pastebin.com/raw.php?i=dkBDPSGj",
		"BT: Windows Apps": "http://pastebin.com/raw.php?i=9hzeBKvh",
		"BT: Music Video": "http://pastebin.com/raw.php?i=dCjap9da",
		"BT: Documentaries": "http://pastebin.com/raw.php?i=xhSAM84F",
		"BT: Movies Blu-rays": "http://pastebin.com/raw.php?i=5p2eEUbt",
		"BT: Movies Remuxes": "http://pastebin.com/raw.php?i=4f0xB4w8",
		"BT: Movies 1080p": "http://pastebin.com/raw.php?i=3UzVniLr",
		"BT: Movies 720p": "http://pastebin.com/raw.php?i=5U0Yr40C",
		"BT: Movies DVD": "http://pastebin.com/raw.php?i=JsdRX4bb",
		"BT: XXX": "http://pastebin.com/raw.php?i=A2vzTfcC",
		"BT: PC Games": "http://pastebin.com/raw.php?i=G1kaLhVJ"
	}, function(title, href){
		var link = searchLink.cloneNode(false);
		link.setAttribute("title", title);
		link.setAttribute("href", href);
		document.head.appendChild(link);
	});

    self.customCSS = document.createElement("style");
	self.customCSS.textContent = "\
        td { font-size: 90%; } \
        h2 { margin-top: 0; margin-bottom: 14px; } \
        #container { min-width: 980px; margin-top: 18px; } \
        #sidebar .btn-group { display:block; } \
        #search-buttons > div { display:block; margin-bottom:3px; } \
        #search-buttons > div::after { display: table; clear:both; content: \" \" } \
        #sticky > div { margin-bottom: 14px; } \
        #search { margin-bottom: 18px; width:100%; padding-right: 22px; } \
        #searchclear { position: absolute; right: 5px; top: 0; bottom: 0; height: 14px; margin: auto; font-size: 14px; cursor: pointer; color: #ccc; } \
        #searchclear:hover { color: #999; } \
		#app-buttons > * { margin-right:6px; } \
        #main .panel:last-of-type { margin-bottom:20px; } \
        .dropdown-menu { padding-left: 7px; padding-right: 7px; } \
        .dropdown-menu button { margin:0 1px 2px 0; } \
        #category-favorites > div { display: block; margin: 0 0 12px 0; }\
        .torrent-table { margin:0; } \
        .torrent-table tr:first-child td { border-top:0; } \
        .torrent-table td { font-size: 95%; padding: 2px !important; } \
        .torrent-group { padding-left: 0; } \
        .icon { background-position: left center; background-repeat: no-repeat; padding-left: 22px; } \
        .icon.link-icon { display: inline-block; margin-bottom: -3px; margin-right:8px; width: 16px; height: 16px; padding-left: 0; } \
        .btn:focus { outline: none; } \
        button.icon { border-radius: 0; border:0; width: 22px; background-position: center center; padding-left: 0; } \
        .failed { background-color: #c00; color: #fff } \
        .result-panel { margin-bottom: 10px; }\
        .result-panel > .panel-heading { padding:6px 8px; cursor: pointer; } \
        .result-panel > .panel-body { padding:0; } \
        .result-panel > .panel-body > table { margin:0; } \
        .result-panel > .panel-body td { padding:5px 8px; } \
        .result-panel > .panel-body td:first-child { width: 80%; word-break: break-all; -webkit-hyphens: auto; -moz-hyphens: auto; hyphens: auto; } \
        .result-panel > .panel-body td:last-child:not(:only-child) { text-align: center; } \
        .result-panel > .panel-body td:not(:first-child):not(:last-child) { text-align: center; color: #999; } \
        .result-panel .label { display: inline-block; margin:0; } \
        .result-panel .tr-title { font-weight:bold; }\
        #no-results::before { content: \"No results: \"; margin-right: 10px; } \
        .panel > .close { padding: 3px 12px; } \
        .panel-primary > .close { color: white; } \
        .cover { padding-left: 90px !important; background-size: 80px auto; background-position: left center; background-repeat: no-repeat; } \
        #source-buttons { margin-bottom:18px; line-height:200%; }\
        #source-buttons > .btn-group { margin-right: 5px; }\
        #source-buttons ul { line-height:150%; }\
        #source-buttons .dropdown-menu a { display:inline-block; font-size: 80%; margin-top:10px; }\
    ";
	document.head.appendChild(self.customCSS);
	self.customCSS = $(self.customCSS);

    self.layout = $(
        '<div class="container" id="container">' +
            '<div class="row">' +
                '<div class="col-md-3 pull-left" id="sidebar">' +
                    '<div id="sticky">' +
                        '<div class="btn-group">' +
                            '<input type="text" class="form-control" id="search">' +
                            '<span id="searchclear" class="glyphicon glyphicon-remove-circle"></span>' +
                        '</div>' +
                        '<div id="search-buttons"></div>' +
                        '<div id="app-buttons"></div>' +
                    '</div>' +
                '</div>' +
                '<div class="col-md-9 pull-right" id="main"></div>' +
            '</div>' +
        '</div>'
    );

    self.input = $('input', self.layout).first();

    self.buttons = $('#search-buttons', self.layout);

    self.mainColumn = $(self.layout[0].firstChild.lastChild)
        .on('click', '.close', function (e) {
            e.stopPropagation(e);
            $(this.parentNode).slideUp("fast", function () {
                $(this).remove();
                if ($('.close', self.mainColumn).length === 0) {
                    resetContent();
                }
            });
        })
        .on('click', '.panel-title > a', function (e) {
            e.stopPropagation();
        })
        .on('click', '.result-panel > .panel-heading', function () {
            $(this.nextElementSibling).slideToggle("fast");
        });

    $('#searchclear', self.layout)
        .on("click", function (e) {
            e.stopPropagation();

            if (self.input.val() === "") {
                resetContent();
            } else {
                self.input.val('');
            }

            self.input.val('').focus();
            document.location.hash = " ";
        });

    self.div = $(document.createElement("div"));
    self.span = $(document.createElement("span"));
    self.table = $(document.createElement("table")).addClass("table");
    self.tableStriped = self.table.clone().addClass("table-striped");
    self.tr = $(document.createElement("tr"));
    self.td = $(document.createElement("td"));
    self.trtd = self.tr.clone().append(self.td.clone());
    self.h2 = $(document.createElement("h2"));
    self.h4 = $(document.createElement("h4"));
    self.a = $(document.createElement("a"));
    self.ab = self.a.clone().attr("target", "_blank");

    self.iconLink = self.ab.clone().addClass("icon");
    self.iconBtn = $('<button type="button" class="btn btn-default btn-xs icon">&nbsp;</button>');
    self.categoryBtn = $('<div class="btn-group btn-group-xs"><button class="btn btn-primary"></button><button class="btn btn-primary dropdown-toggle" data-toggle="dropdown"><span class="caret"></span></button><div class="dropdown-menu"></div></div>');
    self.resultPanel = $('<div class="panel panel-primary result-panel"><div class="panel-heading"><h4 class="panel-title"></h4></div><div class="panel-body"></div></div>');
    self.closeBtn = $('<button type="button" class="close">&times;</button>');
    self.failAlert = $('<div class="alert alert-danger alert-dismissible errors"></div>').append(self.closeBtn.clone());
    self.warningAlert = $('<div id="no-results" class="alert alert-warning alert-dismissible"></div>').append(self.closeBtn.clone());

    self.header = null;
    self.content = null;

    self.persistentData = null;
    self.persistentDataId = "search-persistent-data";

    $.subscribe('source-added', function (e, id) {
        console.log("Added", id);

        if (sourceIsEnabled(id)) {
            self.enableSource(id);
        }
    });

    $.subscribe('source-enabled', function (e, id, data) {
        console.log("Enabled", id);

        data.url[self.favorites] = data.url[Object.keys(data.url)[0]];

        self.sources[id] = $.extend(data, {
            name: id,
            iconCss: $(document.createElement('style'))
                .text('.icon-' + id + ' { background-image:url("' + data.icon + '"); }')
                .insertAfter(self.customCSS)
        });

        var btn, btnId, categories = Object.keys(data.url),
            disabledCategories = getDisabledCategories(id);

        for (var i = 0, len = categories.length; i < len; i++) {
            btnId = id + '__' + categories[i];
            if (disabledCategories.indexOf(categories[i]) === -1) {
                if ($('#' + btnId).length === 0) {
                    btn = self.iconBtn
                        .clone()
                        .addClass('icon-' + id)
                        .attr('id', btnId)
                        .attr('title', id)
                        .data('src', self.sources[id]);
                    categories[i] === self.favorites ? btn.appendTo(getCategoryGroup(categories[i])[0].firstChild) : btn.appendTo(getCategoryGroup(categories[i])[0].lastChild);
                }
            } else {
                $('#' + btnId).remove();
            }
        }

        self.buttons.children(':not(:has("button.icon"))').remove();

        if ("onEnable" in self.sources[id]) {
            self.sources[id].onEnable();
        }
    });

    $.subscribe('source-disabled', function (e, id) {
        console.log("Disabled", arguments);

        $('button.icon-' + id, self.buttons).remove();
        self.buttons.children(':not(:has("button.icon"))').fadeOut(200, function () {
            $(this).remove();
        });
        self.sources[id].iconCss.remove();

        delete self.sources[id];
    });

    self.renderPage = function () {
        $('<link rel="stylesheet" type="text/css">')
            .prependTo(document.head)
            .attr('href', 'https://maxcdn.bootstrapcdn.com/bootstrap/3.3.5/css/bootstrap.min.css').load(function () {

                self.buttons
                    .on('click', '.icon', onSourceButtonClick)
                    .on('click', '> div > button:first-of-type', onCategoryButtonClick);

                resetContent();

                $.publish("layout-ready");

                $(document.body).empty().append(self.layout);

                $(function () {
                    var sticky = $('#sticky', self.layout);
                    if ($(window).height() > sticky.height()) {
                        sticky
                            .width(sticky.width())
                            .css("paddingBottom", "20px")
                            .sticky({topSpacing: 18});
                    }
                    self.input.select();
                });

                $(window).on('beforeunload', function () {
                    var data = getPersistentData();
                    $.publish("persistent-save", [data]);
                    GM_setValue(self.persistentDataId, data);
                });

                $.publish("page-rendered");
            });
    };

    var resetContent = function () {
        self.mainColumn.empty();
        self.header = self.h2.clone().hide().appendTo(self.mainColumn);
        self.content = self.div.clone().attr("id", "content").appendTo(self.mainColumn);
        $.publish("after-content-reset");
    };

    var getEnabledSources = function () {
        return self.getPersistentValue("enabledSources", []);
    };

    var sourceIsEnabled = function(id){
        return getEnabledSources().indexOf(id) !== -1;
    };

    var getDisabledCategories = function(name){
        var disabledCategories = self.getPersistentValue("disabledCategories", {});
        return name ? (name in disabledCategories ? disabledCategories[name] : []) : disabledCategories;
    };

    var getCategoryGroup = function (name) {
        var group = self.buttons.children('#category-' + name);

        if (group.length > 0) {
            return group;
        } else {
            var catTitle = (name in self.categories) ? self.categories[name] : name;

            group = self.categoryBtn
                .clone()
                .data("category", name)
                .data("categoryTitle", catTitle)
                .attr("id", "category-" + name);

            group[0].firstChild.textContent = catTitle;

            if (name === self.favorites) {
                group.removeClass("btn-group");
                $(group[0].lastChild).removeClass("dropdown-menu").prependTo(group);
                $(group[0].lastChild).remove();
                group.prependTo(self.buttons);
            } else {
                group.appendTo(self.buttons);
            }

            return group;
        }
    };

    self.addSource = function (id, callback) {
        if (id in self.sourceCallbacks) {
            console.warn(id + ' source is already registered, skipping to avoid overwriting.');
            return;
        }

        self.sourceCallbacks[id] = callback;

        $.publish('source-added', [id, callback]);
    };

    self.enableSource = function (id) {

        console.log("Enabling source " + id);

        var data = self.sourceCallbacks[id]();

        if (!('url' in data) || typeof data.url !== 'object') {
            console.warn('URL definition for ' + id + ' is missing or incorrect, skipping.');
            return;
        }

        var enabledSources = getEnabledSources();

        if (enabledSources.indexOf(id) === -1) {
            enabledSources.push(id);
        }

        $.publish('source-enabled', [id, data]);
    };

    self.disableSource = function (id) {
        console.log("Disabling source " + id);

        var enabledSources = getEnabledSources();
        enabledSources.splice(enabledSources.indexOf(id), 1);

        $.publish('source-disabled', [id]);
    };

    var onCategoryButtonClick = function () {
        var btn = $(this);
        window.scrollTo(0, 0);
        resetContent();

        self.pageId = Date.now();

        self.header
            .html(btn.text() + ' / <i>' + self.input.val() + '</i>')
            .show();

        var buttons = $(".icon", btn.parent());
        var category = btn.parent().data("category");

        $.publish("batch-request", [category, buttons]);

        buttons.each(function () {
            self.sendRequest($(this).data("src"), category, self.input.val());
        });
    };

    var onSourceButtonClick = function (e) {
        e.stopPropagation();

        window.scrollTo(0, 0);

        if (self.pageId) {
            resetContent();
            self.pageId = false;
        }

        var btn = $(this);
        var category = btn.parent().parent().data("category");

        $.publish("single-request", [btn, category]);

        self.sendRequest(btn.data("src"), category, self.input.val());
    };

    self.sendRequest = function (src, category, query, retry) {
        if (typeof src === "string") {
            if (src in self.sources) {
                src = self.sources[src];
            } else {
                console.warn("Unrecognized source", src);
                return false;
            }
        }

        if (!(category in src.url)) {
            console.warn("No " + category + " category found:", src.url);
            return;
        }

		query = query.trim();

        var i = 0, len = 0,
            method = ("method" in src) ? src.method : "GET",
            url = typeof src.url[category] === "string" ? [src.url[category]] : src.url[category].slice(),
            context = {
                valid: true,
                src: src,
                url: url,
                retry: !!retry,
                pageId: self.pageId,
                category: category,
                categoryTitle: (category in self.categories) ? self.categories[category] : category,
                originalQuery: query,
                query: query.replace(self.matchNonAlphaNumericRegex, ' ').replace(self.spacesRegex, ' ').trim()
            };

        if ("onPrepareQuery" in src) {
            if (Array.isArray(src.onPrepareQuery)) {
                for (i = 0, len = src.onPrepareQuery.length; i < len; i++) {
                    src.onPrepareQuery[i](context);
                }
            } else {
                src.onPrepareQuery(context);
            }
        }

		var urlen = context.url.length;

        for (i = 0; i < urlen; i++) {
            if (context.url[i].indexOf("{query}") > -1) {
                context.url[i] = context.url[i].replace(self.queryRegex, context.query);
            } else {
                context.url[i] += context.query;
            }
            context.url[i] = context.url[i].replace(self.spacesRegex, '%20');
        }

        for (i = 0; i < urlen; i++) {
            var requestData = {
                method: method,
                url: context.url[i],
                context: context,
                timeout: self.timeout,
                onload: onRequestSuccess,
                onerror: onRequestFail,
                ontimeout: onRequestTimeout
            };

            if ("onHttpRequest" in src) {
                if (src.onHttpRequest(requestData) === false) {
                    continue;
                }
            }

            console.log(requestData.method, requestData.url);

            GM_xmlhttpRequest(requestData);
        }
    };

    var onRequestSuccess = function (response) {
        if (typeof response !== "object" || !("context" in response)) {
            self.showFailAlert({});
            return;
        }

        if (isOutOfDate(response)) return;

        var i, data, html,
            src = response.context.src,
            originalQuery = response.context.originalQuery,
            pageId = response.context.pageId;

        $.publish('request-finish', [response]);

        if ("onValidate" in src) {
            response.context.valid = src.onValidate(response);
        }

        if (response.finalUrl !== null && response.finalUrl.indexOf("/login") !== -1) {
            response.context.valid = "login needed";
        }

        if (response.context.valid === false || typeof response.context.valid === "string" || !("finalUrl" in response) || typeof response.finalUrl !== "string") {
            self.showFailAlert(response, response.context.valid);
            return;
        }

        if (typeof src.onParse === "function") {
            data = src.onParse(response);
            if (data === null) return;
        } else if (typeof src.onParse === "object") {
            if ("prepare" in src.onParse) {
                html = src.onParse.prepare(response);
            } else {
                html = response.responseText;
            }

            html = self.replaceImages(html);

            try {
                html = $(html);
            } catch (e) {
                console.error("Parsing failed", response.responseText);
                self.showFailAlert(response, "unexpected content");
                return;
            }

            if ('cleanup' in src.onParse) {
                for (i = 0; i < src.onParse.cleanup.length; i++) {
                    $(src.onParse.cleanup[i], html).remove();
                }
            }

            data = $(src.onParse.row, html);
        } else {
            console.error("No parse configuration found for " + src.name, response);
            return;
        }

        if ('onFilter' in src) {
            var filters = Array.isArray(src.onFilter) ? src.onFilter : [src.onFilter];
            for (i = 0; i < filters.length; i++) {
                data = filters[i](data, response);
            }
        }

        var table = self.tableStriped.clone();

        var renderFunction = 'onRender' in src ? src.onRender : renderResults;
        renderFunction(data, table, response);

        var categoryTitle = response.context.categoryTitle;
        var searchUrl = ("searchUrl" in response.context) ? response.context.searchUrl : response.finalUrl;
        var resultLink = self.iconLink.clone()
            .attr("href", searchUrl)
            .addClass('icon-' + src.name);

        if (table[0].childElementCount > 0) {
            var panel = self.resultPanel.clone()
                .addClass('panel-src-' + src.name);

            resultLink.html(src.name + (pageId ? '' : ' / ' + categoryTitle + ' / <i>' + originalQuery + '</i>'));

            if ("length" in data) {
                resultLink.append(' (' + data.length + ')');
            }

            panel[0].firstChild.firstChild.appendChild(resultLink[0]);
            panel.prepend(self.closeBtn.clone());
            panel[0].lastChild.appendChild(table[0]);

            (!response.context.pageId || response.context.retry)
                ? panel.prependTo(self.content)
                : panel.appendTo(self.content);
        } else {
            var noResults = $('#no-results');
            var alert = noResults.length === 0
                ? self.warningAlert.clone().insertBefore(self.content)
                : noResults.first();

            resultLink
                .addClass("link-icon")
                .attr("title", src.name)
                .appendTo(alert);
        }
    };

    var renderResults = function (data, table, response) {
        var src = response.context.src;
		var i = 0, len = 0;

        data.each(function () {
            var n, nlen, context, that = $(this);
            var tr = self.tr.clone();
            var text = "", td, el, elen;
            var texts = [], link = "", linkTest = "", link_prepend = "";
            var freeleech = false, vod = false;

            for (i = 0, len = src.onParse.sel.length; i < len; i++) {
                context = that;
                text = link = link_prepend = "";
                freeleech = vod = false;
                td = self.td.clone();

                if ("class" in src.onParse.sel[i]) {
                    td.addClass(src.onParse.sel[i].class);
                }

                if ("width" in src.onParse.sel[i]) {
                    td.width(src.onParse.sel[i].width);
                }

                if ("align" in src.onParse.sel[i]) {
                    td.css("textAlign", src.onParse.sel[i].align);
                }

                if ("cleanup" in src.onParse.sel[i]) {
                    context = context.clone();
                    for (n = 0, nlen = src.onParse.sel[i].cleanup.length; n < nlen; n++) {
                        $(src.onParse.sel[i].cleanup[n], context).remove();
                    }
                }

                if (typeof src.onParse.sel[i].text === "function") {
                    el = src.onParse.sel[i].text(context);
                } else {
                    el = $(src.onParse.sel[i].text, context);
                }

                if (typeof el === "string") {
                    text = el;
                } else if (el instanceof jQuery) {
					elen = el.length;
                    if (elen === 0) {
                        td.appendTo(tr);
                        continue;
                    } else if (elen === 1) {
                        text = el.text();
                        if (link === "" && el.prop("tagName") === "A") {
                            link = el.attr("href");
                        }
                    } else {
                        texts = [];
                        for (n = 0; n < elen; n++) {
                            texts.push(el.eq(n).text());
                        }
                        text = texts.join(" - ");
                    }
                }

                text = text.trim();

                if (text === "") {
                    td.appendTo(tr);
                    continue;
                }

                if ("freeleech" in src.onParse.sel[i]) {
                    if (typeof src.onParse.sel[i].freeleech === "function") {
                        freeleech = src.onParse.sel[i].freeleech(context);
                    } else {
                        freeleech = $(src.onParse.sel[i].freeleech, context).length > 0;
                    }
                }

                if ("vod" in src.onParse.sel[i]) {
                    if (typeof src.onParse.sel[i].vod === "function") {
                        vod = src.onParse.sel[i].vod(context);
                    } else {
                        vod = $(src.onParse.sel[i].vod, context).length > 0;
                    }
                }

                if ("link" in src.onParse.sel[i]) {
                    if (typeof src.onParse.sel[i].link === "function") {
                        link = src.onParse.sel[i].link(context);
                    } else {
                        link = $(src.onParse.sel[i].link, context);
                    }
                }

                if (link instanceof jQuery) {
                    linkTest = link.attr("href");
                    if (typeof linkTest === "string") {
                        link = linkTest;
                    } else if (link[0].textContent.indexOf("http") === 0) {
                        link = link[0].textContent;
                    }
                }

                if (typeof link === "string" && link !== "") {
                    if (self.protocols.indexOf(link.split(":")[0]) === -1) {
                        if ("link_prepend" in src.onParse.sel[i]) {
                            link_prepend = src.onParse.sel[i].link_prepend;
                        } else if ("link_prepend" in src.onParse) {
                            link_prepend = src.onParse.link_prepend;
                        }
                    }
                    if (link_prepend !== "") {
                        link = link_prepend + link;
                    }
                    td.html('<a href="' + link + '"' + (("noblank" in src.onParse.sel[i] && src.onParse.sel[i].noblank) ? '' : ' target="_blank"') + '>' + text + '</a>');
                } else {
                    td.html(text);
                }

                if (freeleech) {
                    td.append(' <span class="label label-success">Freeleech</span>');
                } else if (vod) {
                    td.append(' <span class="label label-warning">VOD</span>');
                }

                td.appendTo(tr);
            }

            tr.appendTo(table);
        });
    };

    var isOutOfDate = function (response) {
        return (typeof response !== "object" || !("context" in response) || !("pageId" in response.context) || self.pageId !== response.context.pageId);
    };

    self.showFailAlert = function (response, msg) {
        if (isOutOfDate(response)) return;

        var errors = $('.errors', self.layout);
        var alert = errors.length === 0
            ? self.failAlert.clone().insertBefore(self.content)
            : errors.first();

        if (!("context" in response)) {
            if (!msg) msg = "(error)";
            return alert.append(msg + '&nbsp;&nbsp; ');
        }

        var url = "finalUrl" in response ? response.finalUrl : null;
        var srcName = response.context.src.name;
        var categoryTitle = response.context.pageId ? null : response.context.categoryTitle;

        var target = 'target="_blank"';

        if (url === null) {
            if ("url" in response.context && response.context.url.length > 0) {
                url = response.context.url[0];
            } else {
                url = "javascript:alert('Domain not resolved.');";
                target = '';
            }
            msg = 'domain error';
        }

        if (!msg) msg = "error";

        return alert.append('<a href="' + url + '" ' + target + ' class="icon icon-' + srcName + '">' + srcName + (categoryTitle ? ' / ' + categoryTitle + ' / <i>' + self.input.val() + '</i>' : '') + '</a>&nbsp;(', msg, ')&nbsp;&nbsp; ');
    };

    var onRequestFail = function (response) {
        console.log(response);
        $.publish('request-finish', [response]);
        self.showFailAlert(response, "http request failed");
    };

    var retryTimedOutRequest = function () {
        var context = $(this).data("context");
        self.sendRequest(context.src, context.category, context.query, true);
        $(this).replaceWith('retried');
    };

    var onRequestTimeout = function (response) {
        console.log(response);
        $.publish('request-finish', [response]);
        var retry;
        if ("context" in response) {
            retry = $('<a href="javascript:void(0)" title="click to retry" class="timeout-link">timeout</a>')
                .data("context", response.context)
                .on("click", retryTimedOutRequest);
        } else {
            retry = "timeout";
        }

        self.showFailAlert(response, retry);
    };

    var getPersistentData = function () {
        if (!self.persistentData || typeof self.persistentData !== "object") {
            self.persistentData = GM_getValue(self.persistentDataId, {});
            if (!self.persistentData || typeof self.persistentData !== "object") {
                console.log("Invalid persistent data, resetting.");
                self.persistentData = {};
            }
        }

        return self.persistentData;
    };

    self.getPersistentValue = function (key, def) {
        if (typeof key === "string") {
            var persistentData = getPersistentData();

            if (!(key in persistentData)) {
                persistentData[key] = def;
            }

            return persistentData[key];
        }
    };

    self.setPersistentValue = function (key, value) {
        if (typeof key === "string") {
            var persistentData = getPersistentData();

            persistentData[key] = value;

            return value;
        }
    };

    self.humanizeSize = function (size) {
        size = parseInt(size);
        var i = Math.floor(Math.log(size) / Math.log(1024));
        return (size / Math.pow(1024, i)).toFixed(2) * 1 + ' ' + ['B', 'KB', 'MB', 'GB', 'TB'][i];
    };

    self.requireAllWords = function (data, response) {
        if (typeof response.context.src.onParse !== "object") {
            return data;
        }

        var words = response.context.query.toLowerCase().split(' ');
        var wordsLen = words.length;
        var sel = response.context.src.onParse.sel[0].text;
        var isFunction = typeof sel === "function";

        return data.filter(function () {
            var text;
            if (isFunction) {
                text = sel($(this));
                if (text instanceof jQuery) {
                    text = text.text();
                } else if (text instanceof HTMLElement) {
                    text = text.textContent;
                } else if (typeof text !== "string") {
                    return true;
                }
                text = text.toLowerCase();
            } else {
                text = $(sel, this)[0].textContent.toLowerCase();
            }

            for (var i = 0; i < wordsLen; i++) {
                if (text.indexOf(words[i]) === -1) {
                    return false;
                }
            }

            return true;
        });
    };

	self.filter3dMovies = function (data, response) {
		if (response.context.category.indexOf("movies") === 0 && response.context.category !== "movies_dvd" && response.context.category !== "movies_3d") {
			return data.filter(function(){
				return this.textContent.indexOf('3D') === -1;
			});
		} else {
			return data;
		}
	};

    self.extractResolution = function (context) {
        for (var i = 0; i < self.resolutions.length; i++) {
            if (context.query.indexOf(self.resolutions[i]) !== -1) {
                context.query = context.query.replace(self.resolutions[i], "").replace(self.spacesRegex, ' ').trim();
                return self.resolutions[i];
            }
        }

        return null;
    };

    self.extractGazelleResolution = function (context) {
        var res = self.extractResolution(context);

        if (res) {
            for (var i = 0; i < context.url.length; i++) {
                context.url[i] += "&resolution=" + res;
            }
        }
    };

    self.extractYear = function (context, simple) {
        var re = simple ? self.yearRegexSimple : self.yearRegexAdvanced;
        var year = context.query.match(re);

        if (year && year.length > 0) {
            year = year[year.length - 1].trim();
            context.query = context.query.replace(new RegExp(year.replace(self.dashRegex, '\\\-'), "g"), '').replace(self.spacesRegex, ' ').trim();
        } else {
            year = null;
        }

        return year;
    };

    self.replaceImages = function (text) {
        return text.replace(self.imgTagRegex, '<meta ');
    };

    self.extractGazelleYear = function (context) {
        var year = self.extractYear(context);

        if (year) {
            for (var i = 0, len = context.url.length; i < len; i++) {
                context.url[i] += "&year=" + year;
            }
        }
    };




    ////// SETTINGS

    $.subscribe("layout-ready", function(){
		$("#app-buttons", self.layout)
			.append($('<button type="button" class="btn btn-default btn-xs"><span class="glyphicon glyphicon-cog"></span></button>').on("click", renderConfigPage))
			.append('<a class="btn btn-default btn-xs" href="https://greasyfork.org/en/scripts/12013-bt-metasearch" role="button" target="_blank"><span class="glyphicon glyphicon-globe"></span></a>');
    });

    var renderConfigPage = function () {
        resetContent();

		if (self.pageId === "Settings") {
			self.pageId = false;
			return;
		}

        self.pageId = "Settings";
        self.header.text(self.pageId).show();

        var sourceKeys = Object.keys(self.sourceCallbacks).sort(function (a, b) {
                return a.toLowerCase().localeCompare(b.toLowerCase());
            }),
            srcButtons = self.div.clone().attr("id", "source-buttons").appendTo(self.content),
            btnStub = $('<div class="btn-group"><button type="button" class="btn btn-xs"></button><button type="button" class="btn btn-xs dropdown-toggle" data-toggle="dropdown"><span class="caret"></span></button><ul class="dropdown-menu"></ul></div>'),
            disabledCategories = getDisabledCategories(),
            btn, buttonClass,
            enabled = false,
            partially = false;

        for (var i = 0, len = sourceKeys.length; i < len; i++) {
            enabled = sourceIsEnabled(sourceKeys[i]);
            partially = (sourceKeys[i] in disabledCategories);

            btn = btnStub.clone();
            btn[0].firstChild.textContent = btn[0].dataset.src = sourceKeys[i];
            buttonClass = enabled ? (partially ? "btn-warning" : "btn-success") : "btn-danger";
            btn.children('button').addClass(buttonClass);

            srcButtons.append(btn);

            if (enabled) {
                showSourceConfigBox(sourceKeys[i]);
            }
        }

        $(".btn-group > button:first-child", srcButtons).on("click", function () {
            var name = this.parentNode.dataset.src;
            sourceIsEnabled(name) ? self.disableSource(name) : self.enableSource(name);
        });

        srcButtons.on("change", "input", function () {
            var group = $(this).closest(".btn-group");
            var srcName = group[0].dataset.src;
            var checkboxes = $('input[type="checkbox"]', group);
            var total = checkboxes.length;
            var unchecked = checkboxes.filter(":not(:checked)").length;
            var disabled = getDisabledCategories(srcName);

            if (this.checked) {
                if (disabled.indexOf(this.name) !== -1) {
                    disabledCategories[srcName].splice(disabledCategories[srcName].indexOf(this.name), 1);
                    if (disabledCategories[srcName].length === 0) {
                        delete disabledCategories[srcName];
                    }
                }
                self.enableSource(srcName);
            } else {
                if (disabled.indexOf(this.name) === -1) {
                    if (!(srcName in disabledCategories)) {
                        disabledCategories[srcName] = [];
                    }
                    disabledCategories[srcName].push(this.name);
                }
                total === unchecked
                    ? self.disableSource(srcName)
                    : self.enableSource(srcName);
            }
        });

        $(".btn-group", srcButtons).on("show.bs.dropdown", function () {
            if (this.lastChild.textContent === "") {
                var data = self.sourceCallbacks[this.textContent]();
                var cats = Object.keys(data.url);
                cats.unshift(self.favorites);

                var disabled = this.textContent in disabledCategories ? disabledCategories[this.textContent] : [];
                var catsHTML = '';
                for (var i = 0, len = cats.length; i < len; i++) {
                    catsHTML += '<label class="checkbox-inline"><input type="checkbox" name="' + cats[i] + '"' + (disabled.indexOf(cats[i]) === -1 ? ' checked="checked"' : '') + '> ' + (cats[i] in self.categories ? self.categories[cats[i]] : cats[i]) + '</label><br>';
                }
                //if ("website" in data && data.website) {
                //    catsHTML += '<a href="' + data.website + '" target="_blank">Visit website</a>';
                //}
                this.lastChild.innerHTML = catsHTML;
            }
        });

        $(".dropdown-menu", srcButtons).on("click", function (e) {
            e.stopPropagation();
        });
    };

    var showSourceConfigBox = function (name, buttons) {
        if (!("config" in self.sources[name])) return;

        var box = $("#config-" + name);

        if (box.length === 0) {
            box = $('<div id="config-' + name + '" class="panel panel-default"><div class="panel-heading">' + name + '</div><div class="panel-body"></div></div>')
                .insertAfter($("#source-buttons", self.content));

            $(box[0].lastChild)
                .empty()
                .append(self.sources[name].config());
        }
    };

    $.subscribe("source-disabled", function (e, id) {
        if (self.pageId === "Settings") {
            $('#source-buttons', self.content).children('[data-src="' + id + '"]').children("button").addClass("btn-danger").removeClass("btn-success btn-warning");
            $("#config-" + id, self.content).remove();
        }
    });

    $.subscribe("source-enabled", function (e, id, data) {
        if (self.pageId === "Settings") {
            var className = getDisabledCategories(id).length > 0 ? "btn-warning" : "btn-success";
            $('#source-buttons', self.content).children('[data-src="' + id + '"]').children("button").removeClass("btn-danger btn-warning btn-success").addClass(className);
            showSourceConfigBox(id);
        }
    });

    /////// PERSISTENT CONTENT

    var loadPersistentContent = function () {
        if (self.getPersistentValue("query", "")) {
            self.input.val(self.getPersistentValue("query", ""));
        }

        if (self.getPersistentValue("content", "")) {

            self.mainColumn.html(self.getPersistentValue("content", ""));

            $(".timeout-link", self.mainColumn).replaceWith("timeout");

            self.header = $('h2', self.mainColumn);
            if (self.header.length === 0) {
                self.header = self.h2.clone().hide().appendTo(self.mainColumn)
            } else {
                self.header = self.header.first();
            }

            self.content = $('#content', self.mainColumn);
            if (self.content.length === 0) {
                self.content = self.div.clone().attr("id", "content").appendTo(self.mainColumn);
            } else {
                self.content = self.content.first();
            }

            if (self.header.css("display") !== "none") {
                self.pageId = true;
            }
            if (self.header.text() === "Settings") {
                renderConfigPage();
            }
        }
    };

    $.subscribe('layout-ready', loadPersistentContent);

    $.subscribe('persistent-save', function (e, data) {
        data.query = self.input.val().trim();
        data.content = self.mainColumn.html();
    });


    //////// PROGRESS BAR

    var progressBar = null;
    var progressFiller = null;
    var progressSteps = 0;
    var progressStyleSuccess = "progress-bar-success";
    var progressStyleInProcess = "progress-bar-warning";

    var initProgressBar = function () {
        progressBar = $(".progress", self.mainColumn);
        if (progressBar.length === 0) {
            progressBar = $('<div class="progress pull-right"><div class="progress-bar"></div></div>').prependTo(self.mainColumn);
        } else {
            progressBar = progressBar.first();
        }
        progressFiller = $(progressBar[0].firstChild);
        resetProgressBar(true);
    };

    var resetProgressBar = function (hide) {
        if (hide) {
            progressBar.hide();
        }

        progressFiller
            .width(0)
            .data("step", 0)
            .removeClass(progressStyleSuccess)
            .addClass(progressStyleInProcess)
            .text("0%");
        progressSteps = 0;
    };

    var startProgressCount = function (event, category, buttons) {
        resetProgressBar();

        progressSteps = 0;
        buttons.each(function () {
            var src = $(this).data('src');
            if (category in src.url) {
                progressSteps += typeof src.url[category] === "string" ? 1 : src.url[category].length;
            }
        });

        progressBar.show();
    };

    var incrementProgressBar = function (event, response) {
        if ("context" in response && isOutOfDate(response)) return;

        var step = progressFiller.data("step");
        step++;

        if (step === progressSteps) {
            progressFiller
                .width('100%')
                .removeClass(progressStyleInProcess)
                .addClass(progressStyleSuccess)
                .text(step + '/' + step);
//				setTimeout(resetProgressBar, 3000);
        } else {
            var width = (100 / progressSteps * step).toFixed(2);
            if (width > 100) width = 100;
            progressFiller
                .text(step + '/' + progressSteps)
                .width(width + '%')
                .data("step", step);
        }
    };


    self.customCSS.append("\
        .progress { width:120px; margin-top: 7px; margin-bottom:0; }\
        .progress-bar { width:0px; transition: none; }\
    ");

    $.subscribe('layout-ready after-content-reset', initProgressBar);
    $.subscribe('batch-request', startProgressCount);
    $.subscribe('request-finish', incrementProgressBar);


    ///////// HASH NAVIGATION

    var parseQueryString = function (queryString) {
        var params = {}, queries, temp, i, l;

        // Split into key/value pairs
        queries = queryString.split("&");

        // Convert the array of strings into an object
        for (i = 0, l = queries.length; i < l; i++) {
            temp = queries[i].split('=');
            params[temp[0]] = temp[1];
        }

        return params;
    };

    $.subscribe("layout-ready", function(){
        if (document.location.hash.trim().length > 1 && document.location.hash !== self.getPersistentValue("hash", "#")) {
            resetContent();
        }
    });

    $.subscribe("page-rendered", function(){
        if (document.location.hash.trim().length > 1 && document.location.hash !== self.getPersistentValue("hash", "#")) {
            var params = parseQueryString(document.location.hash.slice(1));
            if ("q" in params && params.q.trim() !== "") {
                self.input.val(params.q.replace(/\+/g, ' '));

                if ("cat" in params) {
                    if ("src" in params) {
                        $("#" + params.src + "__" + params.cat).click();
                    } else {
                        $("#category-" + params.cat).children('button').first().click();
                    }
                } else if ("src" in params) {
                    $("#" + params.src + "__" + self.all).click();
                }
            }
            self.setPersistentValue("hash", document.location.hash);
        }
    });

    $.subscribe("batch-request", function (e, category) {
        document.location.hash = "#cat=" + (category === self.favorites ? self.all : category) + "&q=" + self.input.val();
        self.setPersistentValue("hash", document.location.hash);
    });

    $.subscribe("single-request", function(e, btn, category){
        document.location.hash = "#cat=" + (category === self.favorites ? self.all : category) + "&src=" + btn.data("src").name + "&q=" + self.input.val();
        self.setPersistentValue("hash", document.location.hash);
    });
};

var bt = new SearchEngine();

/*
 onHttpRequest(requestData): {}.abort()
 onValidate(response): bool|string
 onParse(response)|object: collection|array
 onFilter(data, response): collection|array
 onRender(data, table): void
 */

bt.categories = {
    all: "Everywhere",
    favorites: "Favorites",
    music: "Music",
    music_flac: "Music / FLAC",
    movies: "Movies",
//		movies_hd: "Movies: HD",
    movies_1080: "Movies / 1080p",
    movies_720: "Movies / 720p",
    movies_remux: "Movies / Remuxes",
    movies_bluray: "Movies / Blu-rays",
    movies_dvd: "Movies / DVD",
    mvids: "MVids",
    docs: "Docs",
    tv: "TV",
    elearning: "E-Learning",
    ebooks: "E-Books",
    games_pc: "Games / PC",
    mags: "Magazines",
    abooks: "Audiobooks",
    fiction: "Fiction",
    comics: "Comics",
    apps_win: "Apps / Win",
    xxx: "XXX"
};

bt.addSource("WCD", function () {
    var wcd = "https://what.cd/ajax.php?action=browse&searchstr={query}";

    return {
        website: "https://what.cd/",
        url: {
            all: wcd,
            music: wcd + "&filter_cat[1]=1",
            music_flac: wcd + "&filter_cat[1]=1&format=FLAC",
            //		music_mp3: wcd + "&filter_cat[1]=1&format=AAC|MP3",
            elearning: wcd + "&filter_cat[3]=1&filter_cat[4]=1&filter_cat[5]=1&filter_cat[7]=1",
            mags: wcd + "&filter_cat[3]=1",
            ebooks: wcd + "&filter_cat[3]=1",
            fiction: wcd + "&filter_cat[3]=1",
            abooks: wcd + "&filter_cat[4]=1",
            comics: wcd + "&filter_cat[7]=1",
            apps_win: wcd + "&filter_cat[2]=1"
        },
        onPrepareQuery: bt.extractGazelleYear,
        onParse: function (response) {
            try {
                var data = JSON.parse(response.responseText);
            } catch (e) {
                bt.showFailAlert(response);
                return null;
            }

            if (!('status' in data) || data.status !== 'success' || !('response' in data) || !('results' in data.response)) {
                bt.showFailAlert(response, "unexpected data");
                return null;
            }

            return data.response.results;
        },
        onFilter: function (data, response) {
            var words = response.context.query.toLowerCase().split(' ');

            response.context.searchUrl = response.finalUrl.replace('ajax.php?action=browse', 'torrents.php?action=basic');

            return data.filter(function (value) {
                for (var i = 0, l = words.length; i < l; i++) {
                    if ((('artist' in value && value.artist.toLowerCase().indexOf(words[i]) === -1) || !('artist' in value)) && value.groupName.toLowerCase().indexOf(words[i]) === -1) {
                        return false;
                    }
                }

                return true;
            });
        },
        onRender: function (data, table) {
            var nl, group, torrent, groupTable, groupTableHTML, torRow, tr, n, score, cue, ed = "", media = "", link, artist;

            var torrentGroupHeader = bt.trtd.clone();
            $(torrentGroupHeader[0].firstChild).append(
                bt.h4.clone().addClass("torrent-group")
            );

            for (var i = 0, l = data.length; i < l; i++) {
				ed = ""; media = "";
                group = data[i];
                link = "https://what.cd/torrents.php?id=" + group.groupId;

                if ("torrents" in group) {
                    artist = (group.artist === 'Various Artists')
                        ? 'Various Artists'
                        : bt.ab.clone().attr("href", "https://what.cd/artist.php?id=" + group.torrents[0].artists[0].id).html(group.artist);

                    tr = torrentGroupHeader.clone();
                    tr[0].firstChild.setAttribute("colspan", "3");
                    $(tr[0].firstChild.firstChild).append(
                        artist,
                        " - ",
                        bt.ab.clone().attr("href", link).html(group.groupName),
                        ' [' + group.groupYear + '] [' + group.releaseType + ']'
                    );

                    if (group.cover) {
                        $(tr[0].firstChild)
                            .addClass('cover')
                            .css('backgroundImage', 'url(' + group.cover + ')');
                    }

                    groupTableHTML = "";
                    for (n = 0, nl = group.torrents.length; n < nl; n++) {
                        torrent = group.torrents[n];

                        if (ed !== torrent.remasterTitle || media !== torrent.media) {
                            ed = torrent.remasterTitle;
                            media = torrent.media;
                            groupTableHTML += '<tr><td colspan="3" class="tr-title">' + (ed ? ed : "Original Release") + ' ' + torrent.remasterCatalogueNumber + ' ' + (torrent.remasterYear ? torrent.remasterYear : "") + ' / ' + media + "</td></tr>";
                        }

                        score = torrent.hasLog ? ' / Log (' + torrent.logScore + '%)' : '';
                        cue = torrent.hasCue ? ' / Cue' : '';

                        groupTableHTML += '<tr><td><a href="https://what.cd/torrents.php?torrentid=' + torrent.torrentId + '" target="_blank">' + torrent.format + ' / ' + torrent.encoding + score + cue + '</a>' + (torrent.isFreeleech ? ' <span class="label label-success">Freeleech</span>' : '') + '</td><td>' + torrent.seeders + '</td><td><a href="https://what.cd/torrents.php?action=download&id=' + torrent.torrentId + '">' + bt.humanizeSize(torrent.size) + '</a></td></tr>';
                    }

                    groupTable = bt.table.clone()
                        .addClass("torrent-table")
                        .html(groupTableHTML);

                    torRow = bt.tr.clone().append(bt.td.clone().attr("colspan", "3"));
                    torRow[0].firstChild.appendChild(groupTable[0]);

                    table.append(tr, torRow);
                } else {
                    table.append('<tr><td><a href="' + link + '" target="_blank">' + group.groupName + '</a></td><td>' + group.seeders + '</td><td><a href="https://what.cd/torrents.php?action=download&id=' + group.torrentId + '">' + bt.humanizeSize(group.size) + '</a></td></tr>');
                }
            }
        },
        icon: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAA10lEQVQ4je2SwarDIBRE8//f4kJXyU6SLwghCjE0Fl8a66sR9Aemq4YaF+32wRuYzR3u4Q7cqvrXIUopCCGZX9l5TilFsdx2LR6/D8QYEWMsACklpJTgvUfXdTmEEIJt2+D9fvgM2ENACDtCCLi7e5ZXhBBYa2Gt/VjBOQfnXAkwxsCYH3DO835v4pxjXVfcbmsJWJYLlsvy8QKtNfRVlwAxCkzTdPgMUGrGrGYoNUNKkQMYY6jrGn3fQ4gRoxAFQEoJKSWGYUDTNGCM5VUZY1//QbH8t/UEwLRIVSICXlgAAAAASUVORK5CYII="
    };
});

bt.addSource("MUT", function () {
    var mut = "https://mutracker.org/ajax.php?action=browse&searchstr={query}";

    return {
        url: {
            all: mut,
            music: mut + "&filter_cat[1]=1",
            music_flac: mut + "&filter_cat[1]=1&format=FLAC",
            abooks: mut + "&filter_cat[3]=1"
            //		mvids: mut + "&filter_cat[4]=1"
        },
        onPrepareQuery: bt.extractGazelleYear,
        onParse: function (response) {
            try {
                var data = JSON.parse(response.responseText);
            } catch (e) {
                bt.showFailAlert(response);
                return null;
            }

            if (!('status' in data) || data.status !== 'success' || !('response' in data) || !('results' in data.response)) {
                bt.showFailAlert(response, "unexpected data");
                return null;
            }

            return data.response.results;
        },
        onFilter: function (data, response) {
            var words = response.context.query.toLowerCase().split(' ');

            response.context.searchUrl = response.finalUrl.replace('ajax.php?action=browse', 'torrents.php?action=basic');

            return data.filter(function (value) {
                if ('artist' in value && value.artist === 'Various Artists') {
                    return false;
                }

                for (var i = 0, l = words.length; i < l; i++) {
                    if ((('artist' in value && value.artist.toLowerCase().indexOf(words[i]) === -1) || !('artist' in value)) && value.groupName.toLowerCase().indexOf(words[i]) === -1) {
                        return false;
                    }
                }

                return true;
            });
        },
        onRender: function (data, table) {
            $.each(data, function (index, group) {
                var torrent, n, nl, score, cue, ed = "", media = "";
                var link = 'https://mutracker.org/torrents.php?id=' + group.groupId;

                if ('torrents' in group) {
                    var artist = (group.artist === 'Various Artists') ? 'Various Artists' : '<a href="https://mutracker.org/artist.php?id=' + group.torrents[0].artists[0].id + '" target="_blank">' + group.artist + '</a>';
                    var tr = $('<tr><td><h4 class="torrent-group">' + artist + ' - <a href="' + link + '" target="_blank">' + group.groupName + '</a> [' + group.groupYear + '] [' + group.releaseType + ']</h4></td></tr>');

                    if (group.cover) {
                        $(tr[0].firstChild)
                            .addClass('cover')
                            .css('backgroundImage', 'url(' + group.cover + ')');
                    }

                    var groupTable = bt.table.clone().addClass("torrent-table");
                    var groupTableHTML = "";
                    for (n = 0, nl = group.torrents.length; n < nl; n++) {
                        torrent = group.torrents[n];

                        if (ed !== torrent.remasterTitle || media !== torrent.media) {
                            ed = torrent.remasterTitle;
                            media = torrent.media;
                            groupTable.append('<tr><td colspan=3><b>' + (ed ? ed : "Original Release") + ' ' + torrent.remasterCatalogueNumber + ' ' + (torrent.remasterYear ? torrent.remasterYear : "") + ' / ' + media + '</b></td></tr>');
                        }

                        score = torrent.hasLog ? ' / Log (' + torrent.logScore + '%)' : '';
                        cue = torrent.hasCue ? ' / Cue' : '';

                        groupTableHTML += '<tr><td><a href="https://mutracker.org/torrents.php?torrentid=' + torrent.torrentId + '" target="_blank">' + torrent.format + ' / ' + torrent.encoding + score + cue + '</a>' + (torrent.isFreeleech ? ' <span class="label label-success">Freeleech</span>' : '') + '</td><td>' + torrent.seeders + '</td><td><a href="https://mutracker.org/torrents.php?action=download&id=' + torrent.torrentId + '">' + bt.humanizeSize(torrent.size) + '</a></td></tr>';
                    }
                    groupTable.html(groupTableHTML);

                    var torRow = bt.tr.clone().append(bt.td.clone().append(groupTable));

                    table.append(tr, torRow);
                } else {
                    table.append('<tr><td><a href="' + link + '" target="_blank">' + group.groupName + '</a></td><td>' + group.seeders + '</td><td><a href="https://mutracker.org/torrents.php?action=download&id=' + group.torrentId + '">' + bt.humanizeSize(group.size) + '</a></td></tr>');
                }

            });
        },
        icon: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAACEklEQVQ4jXWTQWsTYRCGv1BEpBSRFkpIzO6MP0BEJJQQRPwBHiRn8eKlCAludgZ6FJEQsMS02XkP/QEePPYsnoqIJw9FRHoIPXiQUEooRcrnYXfTJiaHgV2+b5/33XdmnPe+cLXaSaUmCPcUdCigkYBGavxdjfBqlx/M3nf5w+ZOaVUQ7qnRhYJ9WjROK3s3/qugftxZW5kCbO6UVsXos4K9gEZi1I0QVpsIik0ExciCDTHeVuOTDLQfddeXJ4DUMns1+hUhrM7anPo9oyMFezHe9t4XXGyVxxn1JEJYbTTcUpzQlhjdnQsZUF1BYzW6iBBWXa4uRl3vfSHqri8r+Gem8rE9oPosREG9LKOeU9APBfvIgo38QtQPSIxei/HvDP5JLHzyAu7apQv2YvTFKfhcjU+bCIqzSo2GW4otfC6gkYJ97qaVlEsKGgvo2CnobB5AwDdjhM8uu8Pf2rh9ZxrAQ6egQwX7dlKp5R/HCW0J6E9m80ATfvryvbt+GWT4MD9zaoSrbdFB5ZaAh2q8Py9A731BjXbz4F0eiBqf5i6ifkCLZiFtO50p+FyT4J6bIR4tUvXeF2IEjwQ8VLCXhN5MJjHurK2o8X7uREG9dlKpNREUW0m51B5QPRVJ90KMPuSZTJYp7qytKKiXLsyCZQKfC/ht6135xn/bOAloULmvoJ4YfxXQsYCHYnQgRt154/0PBlstS7WYQZMAAAAASUVORK5CYII="
    };
});

bt.addSource("Spotify", function () {

    var marketKey = "Spotify_Market";
    var marketValue = bt.getPersistentValue(marketKey, "");

    return {
        url: {
            music: "https://api.spotify.com/v1/search?type=artist,album&limit=50&q={query}"
        },
        onEnable: function () {
            if (bt.customCSS.text().indexOf(".panel-src-Spotify") !== -1) return;

            bt.customCSS.append("\
				.panel-src-Spotify > .panel-body a {\
					border:0;\
					border-radius:6px;\
					position:relative;\
					display:inline-block;\
					margin:0 8px 4px 0;\
					overflow:hidden;\
					color:#fff;\
					padding:20px 10px;\
					text-align:center;\
					font-size:90%;\
					font-weight: 600 !important;\
					background-repeat:no-repeat;\
					background-size:cover;\
					color:#fff;\
					width:150px;\
					height:150px;\
					min-height:150px;\
					word-break:normal !important;\
				}\
				.panel-src-Spotify > .panel-body a:hover {\
					text-decoration:none;\
				}\
				.panel-src-Spotify > .panel-body span {\
					padding:3px 5px;\
					background-color:rgba(0,0,0,0.6);\
					border-radius:5px;\
				}\
				.panel-src-Spotify > .panel-body a:hover span {\
					background-color:rgba(0,0,0,0.8);\
				}\
				.panel-src-Spotify > .panel-body a:focus {\
					outline:none;\
				}\
				.panel-src-Spotify > .panel-body a:hover > span {\
					bottom:2px;\
				}\
			");
        },
        onPrepareQuery: function (context) {
            bt.extractYear(context);
            var market = bt.getPersistentValue(marketKey, "");

            if (market !== "") {
                for (var i = 0, l = context.url.length; i < l; i++) {
                    context.url[i] += "&market=" + market;
                    console.log(context.url[i]);
                }
            }
        },
        onParse: function (response) {
            try {
                var data = JSON.parse(response.responseText);
            } catch (e) {
                console.error("Unexpected Spotify response", response.responseText);
                bt.showFailAlert(response, "unexpected response");
                return null;
            }

            if (!('albums' in data) && !('artist' in data)) {
                bt.showFailAlert(response, "unexpected data");
                return null;
            }

            response.context.searchUrl = "https://play.spotify.com/search/" + encodeURIComponent(response.context.query);

            return data;
        },
        onFilter: function (data) {
            var filter = ["karaoke", "reproduction", "in the style of", "lullaby versions of", " tribute to "];
            var filterLen = filter.length;
            data.albums.items = data.albums.items.filter(function (album) {
                var a = album.name.toLowerCase();
                for (var i = 0; i < filterLen; i++) {
                    if (a.indexOf(filter[i]) !== -1) {
                        return false;
                    }
                }
                return true;
            });

            return data;
        },
        onRender: function (data, table) {
            var dataTypes = ["albums", "artists"];

            var releaseTypes = {
                artist: "Artists",
                album: "Albums",
                single: "Singles",
                compilation: "Compilations"
            };

            for (var i = 0, l = dataTypes.length; i < l; i++) {
                $.each(data[dataTypes[i]].items, function (index, item) {
                    if (!("images" in item)) return;
                    var trhead, td;

                    var type = item.type === "album" ? item.album_type : item.type;

                    td = $(".spotify-type-" + type, table);

                    if (td.length === 0) {
                        var typeTitle = type in releaseTypes ? releaseTypes[type] : type;

                        trhead = bt.tr.clone().append(bt.td.clone().addClass("tr-title").text(typeTitle));

                        (type === "album" || type === "artist") ? trhead.prependTo(table) : trhead.appendTo(table);

                        td = $(bt.trtd.clone().insertAfter(trhead)[0].firstChild).addClass("spotify-covers spotify-type-" + type);
                    }

                    var link = bt.ab.clone()
                        .attr("href", item.external_urls.spotify)
                        .appendTo(td);

                    if (item.images.length === 0) {
                        link.css("border", "1px solid #ccc");
                    } else {
                        var img = item.type === "artist" ? 2 : 1;
                        link.css("backgroundImage", "url(" + item.images[img].url + ")");
                    }

                    bt.span.clone()
                        .text(item.name)
                        .appendTo(link);

                });
            }

        },
        config: function () {
            var markets = ["AD", "AR", "AU", "BE", "BG", "BO", "BR", "CL", "CO", "CR", "CY", "CZ", "DK", "DO", "EC", "EE", "ES", "FI", "FR", "GB", "GR", "GT", "HK", "HN", "HU", "IE", "IS", "IT", "LI", "LT", "LU", "LV", "MC", "MT", "MY", "NI", "NL", "NO", "NZ", "PA", "PE", "PH", "PL", "PT", "PY", "RO", "SE", "SG", "SI", "SK", "SV", "TR", "TW", "UY"];

            var select = $('<select class="form-control btn btn-xs"><option value="">Any</option></select>')
                .on("change", function () {
                    bt.setPersistentValue(marketKey, $(this).val());
                });

            var current, opt = $(document.createElement('option'));

            for (var i = 0, l = markets.length; i < l; i++) {
                current = opt.clone().text(markets[i]).appendTo(select);
                if (markets[i] === marketValue) {
                    current.prop("selected", 1);
                }
            }

            return $('<div class="form-inline">Select your country:</div>').append(' ', select);
        },
        icon: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAACiElEQVQ4jW2Ty0vUcRTFPwOtWkSblq0iaFOroCBrrEWQPahFtchFhbSQkAgqXaSlNs5vZtTB52ho5QNUwtGZdB6/eeQrm2bS1KjILBLmvxg5Lb4DpXTg8P1yOffec78P2IHW9K7S3owj3Jd15PtzbPXn2OrLOvK9GUe4Nb2rdKd+GzoXHKmBNTT0CY2soNerhqMraHgFDa6hzgVH6r/J7bNs9n9Er7JoZBkF19DUF8OJNTS6jAZy6MUS6phnc1uyf4bU8yx6mUMjq2jiK4quI/snsjdQ5Dsa/4yGl1B/Bj3PIv8MxoknjjOQQ52z6F4LulqJSi+hY6fRibOo7DqqqEZP+9Cr92aU3kXUk0WeOE58ScKBDCqvRmB45DgqvYhOnUcHD/+NAzp5EVkTqHsR+ZKEsWzybbOoex51JFBwHYV+oMlvaHoDRX+hqQ0UsFHFY1Nk7z4UyCBPkjyeOAV/2ti6VoX2H9jeEdCZK+hhGxpaQi8+oNYYanuLvHEKuKMUmpOoawGV3UR36tHTQdQ8idxj6GE7ulzxt9hdL+peQC0pZMUo4IqS9yWQP4V6FpE7iB51oSoPuu9HjcPmaodXUaUb3apF7bOoOYGaouRpnCbkTSD/W3TuJtq9B5VcMm7O3kCHjprOJReQFUIdc6jZRt4EaowQon4cpzeNrCjyp42ga84camAe9bxDHTOovAaV3TYaK4Z8aVQ/jhOAhjBJy0buCPLGkC+OWmzD1uLqT5m53RFk2aghTHLba3wS4ndTDLmmi6II8kSNMytiYq5p5I6jJyF+//c/1E2SdNtG6JpCz96Y1TWFXMXOdZM7Ou/EgzGctUFCdRPka4MUaoMUivtQzVhx5n/wB92/wL8+YspgAAAAAElFTkSuQmCC"
    };
});

bt.addSource("WFL", function () {
    var wfl = "https://www.waffles.fm/browse.php?q={query}";

    return {
        url: {
            all: wfl,
            music: wfl + ' (FLAC OR MP3 OR AAC)',
            music_flac: wfl + ' FLAC',
            fiction: wfl + "&c86=1",
            mags: wfl + "&c87=1",
            ebooks: wfl + "&c86=1&c87=1",
            abooks: wfl + "&c89=1&c90=1",
            comics: wfl + "&c88=1",
            apps_win: wfl + "&c83=1",
            elearning: wfl + "&c89=1&c90=1&c88=1&c86=1&c87=1&c93=1"
        },
        onParse: {
            row: "#browsetable > tbody > tr:not(:first-child)",
            link_prepend: "https://www.waffles.fm",
            sel: [
                {text: "> td:eq(1) a[href*='/details.php']:eq(0)"},
                {text: "> td:eq(7)"},
                {text: "> td:eq(5)", link: "a[href*='/download.php']:eq(0)", noblank: true}
            ]
        },
        icon: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAP0lEQVQ4jWNgGF5g3969/9ExSZqxAaINgRlQU1UFxzADCLoMl+34AIoh2GzHh3EaMOoCClwAM4QUTFTiogsAAK9ZxAOBV0RTAAAAAElFTkSuQmCC"
    };
});

bt.addSource("XBT", function () {
    var xbt = "https://xbtmusic.org/torrents-search.php?s=i&b=d&cat=0&active=0&page=0&own=&mode=2&search_pedrovia={query}";

    return {
        url: {
            all: xbt,
            music: xbt,
            music_flac: xbt,
            mvids: [xbt + "&cat=29", xbt + "&cat=201"],
            docs: xbt + "&cat=134",
            abooks: xbt + "&cat=54"
        },
        onParse: {
            cleanup: ["td.small a"],
            row: "table.submain > tbody > tr",
            link_prepend: "https://xbtmusic.org",
            sel: [
                {text: "a[href*='/torrents-details.php?id=']:eq(0)"},
                {text: "> td:eq(2) > table:eq(0) > tbody > tr > td:eq(1) > span:eq(0)"},
                {
                    text: function (context) {
                        return $("> td:eq(2) > table:eq(0) > tbody > tr > td:eq(0)", context).text().split('in')[0];
                    },
                    link: function (context) {
                        var id = $("a[href*='/torrents-details.php?id=']:eq(0)", context).attr('href').split('id=')[1].split(bt.matchFirstNonDigit)[0];
                        return '/download.php?id=' + id;
                    },
                    noblank: true
                }
            ]
        },
        icon: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAB/0lEQVQ4jZWTP4jacBTHf6Xc0g539jqVdiiloy4OAYlHklpiIFAswSSo8cCocVCiiEhdghgQhPNstboG63WyDuJSoX/QoYtDdBBKC4Wj6+nQSrkOr0vvqNwdNd/1vc97j++Xh9AlAoDt5XJpA4Cty+pXqtlsUrIs9xVFOZUkCViW/R6NRg9M07z7b99oNLJdgPP5PK8oCmQymZf1ev2Jqqr7NE1/wnEcAoHAV9M07yOEEMdxdZqmF9Vq9fAcNk3zJsuyxxRFAc/znwuFwrOzmiRJH10uF+RyuXcIISSK4ojjONB1/fn5AMMwdgmC+GW328HhcIDb7YZIJHILIYS63e4ejuOnDMP87vV6D8bj8Z3BYPAYAK6tXSCK4jGGYYBhGDAM81NV1Z2/ht5gGOaEJEnQNM2PEEKz2cwFANfXPGi32y5Zlo8kSTpqtVqPzjYAgC0cDi+cTieoqvo0nU6/4TgOisXii42SAYBtQRBOcBwHwzD4eDzeJQhi0Wg0Dv9PI4Tm8/kuSZI/PB4P9Pv9hwCw1el0LsZ4lWq1mo+iKPD5fB/WjNtUwWDwvdfrBU3TCMuwruv7JEmCLMtty3CpVAoLggCJROKLpZ8YDof2ZDL5yu/3QyqVer1are5tBE4mE7pSqVSz2ey3UCj0Vtd12tLJ0+mUKZfLe7FY7LYV7g8x5uX55Jg5HQAAAABJRU5ErkJggg=="
    };
});

bt.addSource("FL", function () {
    var filelist = "https://filelist.ro/browse.php?searchin=1&sort=0&incldead=1&search={query}";

    return {
        url: {
            all: filelist,
            music: filelist + "&cat=11",
            music_flac: filelist + " FLAC&cat=11",
            movies: filelist,
            movies_bluray: filelist + "&cat=20",
            movies_remux: filelist + " REMUX",
            movies_1080: [filelist + " 1080p&cat=4", filelist + " 1080p&cat=19", filelist + " 1080p&cat=15"],
            movies_720: [filelist + " 720p&cat=4", filelist + " 720p&cat=19", filelist + " 720p&cat=15"],
            movies_dvd: [filelist + "&cat=2", filelist + "&cat=3"],
            docs: filelist + " documentary&searchin=0",
            ebooks: [filelist + "&cat=16", filelist + "&cat=18"],
            mags: filelist + "&cat=16",
            tv: [filelist + "&cat=15&sort=2", filelist + "&cat=21&sort=2", filelist + "&cat=14&sort=2"],
            elearning: filelist,
            apps_win: filelist + "&cat=8",
            mvids: filelist + "&cat=12",
            xxx: filelist + "&searchin=0&cat=7"
        },
        onParse: {
            row: ".torrentrow",
            link_prepend: "https://filelist.ro/",
            sel: [
                {
                    text: "a[href*='details.php?id=']:eq(0)",
                    freeleech: "meta[alt='FreeLeech']"
                },
                {text: "> .torrenttable:eq(8)"},
                {text: "> .torrenttable:eq(6)", link: "a[href*='download.php']:eq(0)", noblank: true}
            ]
        },
        onFilter: [bt.filter3dMovies, function(data, response){
			if (response.context.category === "movies_bluray") {
				return data.filter(function(){
					return this.textContent.toLowerCase().indexOf('remux') === -1;
				});
			} else {
				return data;
			}
		}],
        icon: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAUUlEQVQ4jWPQaVn6nxLMoNOy9L+Orj55eBgaoOkT/V9+0VUUDBMjyQBkRRQboJZSQ7wBMMXIzifJAOXqeRiKsYnhjQVsitEDdhCngwE0gAIMAOcx0Mby0F1/AAAAAElFTkSuQmCC"
    };
});

bt.addSource("PTP", function () {
    var ptpMovies = "https://tls.passthepopcorn.me/torrents.php?action=advanced&filter_cat[1]=1&filter_cat[2]=1&filter_cat[3]=1&order_by=relevance&grouping=1&searchstr={query}";

    return {
        url: {
            all: "https://tls.passthepopcorn.me/torrents.php?action=basic&order_by=relevance&grouping=1&searchstr={query}",
            movies: ptpMovies,
//			movies_hd: ptpMovies + "&resolution=anyhd",
            movies_dvd: ptpMovies + "&format[]=DVD5&format[]=DVD9&grouping=0",
            movies_bluray: ptpMovies + "&format[]=BD25&format[]=BD50&grouping=0",
            movies_remux: ptpMovies + "&remastertitle=Remux",
            movies_720: ptpMovies + "&resolution=720p",
            movies_1080: ptpMovies + "&resolution=anyhd",
            docs: ptpMovies + "&taglist=documentary",
            mvids: "https://tls.passthepopcorn.me/torrents.php?action=advanced&order_by=relevance&filter_cat[5]=1&searchstr={query}",
            tv: "https://tls.passthepopcorn.me/torrents.php?action=advanced&order_by=relevance&filter_cat[3]=1&searchstr={query}"
        },
        onPrepareQuery: [bt.extractGazelleYear, bt.extractGazelleResolution],
        onParse: function (response) {
            // If redirected to a single search result
            if (response.finalUrl.indexOf('torrents.php?id=') !== -1) {
                var html = $(bt.replaceImages(response.responseText));

                $('.torrent-info-link span', html).remove();

                var torrents = [];

                $(".group_torrent_header", html).each(function () {
                    var row = $(this);
                    var cols = row.children();
                    var href = $("a[title='Permalink']", row).first().attr('href');

                    var title = $(".torrent-info-link", row);
					var seeding = title.hasClass("torrent-info-link--user-seeding");
					title = title.first().text();

                    torrents.push({
                        Title: '<a href="' + href + '"' + (seeding ? ' class="torrent-info-link--user-seeding"' : '') + '>' + title + '</a>',
                        TorrentId: href.split("torrentid=")[1],
                        Size: cols.eq(1).text(),
                        Seeders: cols.eq(3).text()
                    });
                });

                return [{
                    GroupId: response.finalUrl.split('?id=')[1].split(bt.matchFirstNonDigit)[0],
                    Title: html.find('h2.page__title').first().text().split(' [')[0],
                    Year: html.find('h2.page__title').first().text().split(' [')[1].split(']')[0],
                    Cover: $('meta.sidebar-cover-image', html).length > 0 ? $('meta.sidebar-cover-image', html).first().attr('src') : null,
                    GroupingQualities: [{
                        Torrents: torrents
                    }]
                }];
            }

            if (response.responseText.indexOf('coverViewJsonData[ 0 ] =') === -1) {
                return [];
            }

            var data = response.responseText.split('coverViewJsonData[ 0 ] =')[1].trim().split('var movieViewManager')[0].trim().slice(0, -1);

            try {
                return JSON.parse(data).Movies;
            } catch (e) {
                console.warn("PTP JSON parsing failed.", data);
                return [];
            }
        },
        onEnable: function(){
            if (bt.customCSS.text().indexOf('.torrent-info-link--user-seeding') === -1) {
                bt.customCSS.append(' .torrent-info-link--user-seeding {font-weight:bold;color:darkorange} ');
            }
        },
        onRender: function (movies, table) {
            var groupTable, groupTableHTML, torrent, tr;

            for (var i = 0, ml = movies.length; i < ml; i++) {
                tr = '<tr><td><h4 class="torrent-group"><a href="https://tls.passthepopcorn.me/torrents.php?id=' + movies[i].GroupId + '" target="_blank">' + movies[i].Title + '</a> [' + movies[i].Year + ']</a></td></tr>';

                if (movies[i].Cover) {
                    tr = $(tr);
                    $(tr[0].firstChild)
                        .addClass('cover')
                        .css('backgroundImage', 'url(' + movies[i].Cover + ')');
                }

                if (!('GroupingQualities' in movies[i])) return;

                var groups = movies[i].GroupingQualities;
                groupTable = bt.table.clone().addClass("torrent-table");

                groupTableHTML = "";
                for (var g = 0, gl = groups.length; g < gl; g++) {
                    if ('CategoryName' in groups[g]) {
                        groupTableHTML += '<tr><td colspan=3><b>' + groups[g].CategoryName + ' / ' + groups[g].QualityName + '</b></td></tr>';
                    }

                    for (var n = 0, nl = groups[g].Torrents.length; n < nl; n++) {
                        torrent = groups[g].Torrents[n];

                        var title = bt.span.clone().html(torrent.Title);
                        var a = title.children('a').first();
                        a.attr("target", "_blank");
                        a.attr("href", "https://tls.passthepopcorn.me/" + a.attr("href"));

                        groupTableHTML += '<tr><td>' + title.html() + '</td><td>' + torrent.Seeders + '</td><td><a href="https://tls.passthepopcorn.me/torrents.php?action=download&id=' + torrent.TorrentId + '">' + torrent.Size + '</a></td></tr>';
                    }
                }
                groupTable.html(groupTableHTML);

                var torRow = bt.tr.clone().append(bt.td.clone().append(groupTable));

                table.append(tr, torRow);
            }
        },
        icon: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAXElEQVQ4jWNgYGD4TyFm+A8D5LCpYwDlXqhJ+/9/S9r//6/T/n/+m/GfgYHhf+/98v/plzr+p91a+T/t7bX/DAwM/9O2PPuf1nb6f1rGnv8T0w6OGjDMDBjheQEA+80xL75IvfsAAAAASUVORK5CYII="
    };
});

bt.addSource("bB", function () {
    var bb = "https://baconbits.org/torrents.php?action=basic&searchstr={query}";

    return {
        url: {
            all: bb,
            music: bb + "&filter_cat[1]=1",
            music_flac: bb + "&filter_cat[1]=1",
            movies: bb + "&filter_cat[9]=1",
            movies_1080: bb + "&filter_cat[9]=1",
            movies_720: bb + "&filter_cat[9]=1",
            docs: bb + "&filter_cat[9]=1&filter_cat[10]=1",
            tv: bb + "&filter_cat[10]=1",
            apps_win: bb + "&filter_cat[2]=1",
            mags: bb + "&filter_cat[6]=1",
            games_pc: bb + "&filter_cat[11]=1",
            comics: bb + "&filter_cat[7]=1",
            ebooks: bb + "&filter_cat[3]=1",
            abooks: bb + "&filter_cat[4]=1",
            fiction: bb + "&filter_cat[3]=1",
            elearning: bb + "&filter_cat[3]=1&filter_cat[4]=1&filter_cat[5]=1&filter_cat[6]=1&filter_cat[7]=1&filter_cat[13]=1&filter_cat[14]=1"
        },
        onParse: {
            cleanup: [".tags"],
            row: "#torrent_table tr.torrent",
            link_prepend: "https://baconbits.org/",
            sel: [
                {
                    cleanup: ["> td:eq(1) > span:eq(0)"],
                    text: "> td:eq(1)",
                    link: "a[title='View Torrent']:eq(0)"
//                    freeleech: "strong:contains('Freeleech!')"
                },
                {text: "> td:eq(7)"},
                {text: "> td:eq(4)", link: "a[href*='action=download']:eq(0)", noblank: true}
            ]
        },
		resolution: null,
        onPrepareQuery: function(context){
            var year = bt.extractYear(context);

            if (year) {
                for (var i = 0, l = context.url.length; i < l; i++) {
                    context.url[i] += "&action=advanced&torrentname={query}&filelist=" + year;
                }
            }

			context.src.resolution = bt.extractResolution(context);
        },
        onFilter: [bt.filter3dMovies, function (data, response) {
			if (response.context.category === "music_flac") {
				data = data.filter(function(){
					return this.textContent.indexOf('FLAC') !== -1;
				});
			}

			if (response.context.category === "movies_1080") response.context.src.resolution = "1080p";
			if (response.context.category === "movies_720") response.context.src.resolution = "720p";

			if (response.context.src.resolution) {
				response.context.query += " " + response.context.src.resolution;
				response.context.src.resolution = null;
				return bt.requireAllWords(data, response);
			} else {
				return data;
			}
		}],
        icon: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAkUlEQVQ4jaWSMRLEMAgDlZ/zNEr/SinuGIMCyd2kUIENKxgAyeONkAMDmPUXwABSdAcJE0zFGaIgS38oxWtVNSCTtw1YizSrEgjFbAO64gxR0Dd/AzQ51IHSewV07T50Vke4mbXtptvC5ZCmDXVbMIDuXvR0H+7+AUSg1xYQBeV8ROJ0srmbzgxT4QRSs58Bk06645TcxPnwywAAAABJRU5ErkJggg=="
    };
});

bt.addSource("BTN", function () {
    return {
        url: {
            all: "https://broadcasthe.net/torrents.php?searchstr=",
            tv: "https://broadcasthe.net/torrents.php?searchstr=",
            docs: "https://broadcasthe.net/torrents.php?searchstr="
        },
        onHttpRequest: function (requestData) {
            var btnKey = bt.getPersistentValue("BTN_KEY", "").trim();

            var data = {
                method: "getTorrents",
                params: [btnKey, {"Resolution": ["720p", "1080p", "1080i"]}, 50],
                id: Date.now()
            };

            if (requestData.context.query) {
                if (requestData.context.category === "docs") {
                    bt.extractYear(requestData.context);
                    bt.extractResolution(requestData.context);
                    data.params[1] = requestData.context.query;
                } else {
                    bt.extractYear(requestData.context);

                    var res = bt.extractResolution(requestData.context);
                    if (res) {
                        data.params[1].Resolution = res;
                    }

                    data.params[1].Series = '%' + requestData.context.query.trim().replace(bt.spacesRegex, '%') + '%';
                }
            }

            $.extend(requestData, {
                method: "POST",
                url: "http://api.btnapps.net/",
                headers: {'Content-Type': 'application/json'},
                data: JSON.stringify(data)
            });

            console.log("BTN request data", JSON.stringify(requestData));
        },
        onParse: function (response) {
            console.log("BTN response data");
            console.log(response.statusText, JSON.stringify(response.responseHeaders));
            console.log(response.responseText);

            try {
                var data = JSON.parse(response.responseText);
            } catch (e) {
                bt.showFailAlert(response);
                return null;
            }

            if (typeof data !== "object" || !("result" in data) || data.result === null || !("results" in data.result)) {
                if ("error" in data && data.error !== null && "message" in data.error) {
                    bt.showFailAlert(response, data.error.message);
                    return null;
                } else {
                    console.warn("Unexpected data from BTN", data, response);
                    return [];
                }
            }

            var num = parseInt(data.result.results);

            response.context.searchUrl = "https://broadcasthe.net/torrents.php?searchstr=" + encodeURIComponent(response.context.query);

            if (num === 0) {
                return [];
            } else {
                data = data.result.torrents;
                data = Object.keys(data).map(function (k) {
                    return data[k];
                });
                return data;
            }
        },
        onRender: function (torrents, table, response) {
            var title, rows = "";

            for (var i = 0, tl = torrents.length; i < tl; i++) {
                title = '<a href="https://broadcasthe.net/torrents.php?id=' + torrents[i].GroupID + '&torrentid=' + torrents[i].TorrentID + '" target="_blank">' + torrents[i].ReleaseName + '.' + torrents[i].Container.toLowerCase() + '</a>';

                if (response.context.category === "docs") {
                    title = '<a href="https://broadcasthe.net/series.php?id=' + torrents[i].SeriesID + '" target="_blank">' + torrents[i].Series + '</a> - ' + title;
                }

                rows += '<tr><td>' + title + '</td><td>' + torrents[i].Seeders + '</td><td><a href="' + torrents[i].DownloadURL + '">' + bt.humanizeSize(torrents[i].Size) + '</a></td></tr>';
            }

            table.html(rows);
        },
        config: function () {
            var form = $('<div class="form-inline"><div class="form-group">Enter your API key from <a href="https://broadcasthe.net/user.php?action=edit#section5.editprofile" target="_blank" style="text-decoration:underline;">here</a>:</div></form>');
            var input = $('<input type="text" class="form-control input-sm" style="width:250px">').val(bt.getPersistentValue("BTN_KEY"));
            var btn = $('<button type="submit" class="btn btn-primary btn-sm">Save</button>')
                .on("click", function () {
                    bt.setPersistentValue("BTN_KEY", input.val().trim());
                    alert("Saved!");
                });

            form
                .append(' ', btn)
                .children().first().append(' ', input);

            return form;
        },
        icon: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAACi0lEQVQ4jY1R3UuTcRQ+6d73/Z0TQh83XtSFXRt0UYyIatClUFer/8A+pi5fP1abydtgGhNsa1u5D/dOpxOmmIHSxSILES3FVTBtWlohdBF4VUSoO13MKYYfPfC7eXiec57fcwD2QHH8c4Xc9enaXppdIaIfTlDs4x/S51jS50/9n0tfKjX0fD0HACAF3xspOMMUnGHxJG0CAJD6lozQs3xsR68cmS3H7oXv1DW/bogvnpc8E0byjjN5x1k8nDDJ+txJ6s6uUvfCD0nPntnuDk6T0DNZimYY9cxPOTJbLrW9NJI7xeROsWhNmSCQKSU9s5LXzC6Dnj60tb1jugXDacZwOqcEZ2oAACTnkJGcQ0zOIRbaU1NeN3UFw+k1DKdZ6Zjybw5QfJPvKPCGhX8yC1pSBgCQ7vYZyd7LZO9l0RQ35ZV8AH2TExvaRQAAKLG0HBWesV/kGWPR/rq1MFSq7ThN9RGm+giLusiFAo9to7fRM8boGVtFNXocDt/wlqM7xehO8UHXSMNmLLO5WK7266LG3wvmdizQdH/Qgu4UY9sLxvrOswCVlRK6hlfINczC+axzv0sLbfABuYZZuIZ/Q2NnSb6De/3PSRtgbE6uQG3kyK7u2nbE5v5F0gZYNCffbl3BHr+KjsQ6ORKs2BP9hSK3QRs1KHcSHnQkGB2JnNSUuL49mk1Poi3GaIvlRGNsWlFDl0WVr0xU+cqU+mCFaIhOYmMsR7YYC1tXCkAr2r7BrMmKGhpBNcRUF2KsC+eEGloTamgN1XAuz4VYqOFXUBmknf9oNhfLVn+TqAl8QWuAaeOhNcDCGvgmVz92gaYZ9isaQNOKDDcfXVQsXlW+5W00WLyXQPs3ch5/AabcHAKs7QdQAAAAAElFTkSuQmCC"
    };
});

bt.addSource("BMTV", function () {
    var q = "https://www.bitmetv.org/browse.php?incldead=1&search={query}";

    return {
        url: {
            all: q,
            tv: q,
            docs: q + "&cat=101"
        },
        onParse: {
            row: "form[action*='/browse.php']:last ~ table:last > tbody > tr:gt(0)",
            link_prepend: "https://www.bitmetv.org/",
            sel: [
                {text: "> td:eq(1) a[href*='details.php']:eq(0)"},
                {text: "> td:eq(8)"},
                {text: "> td:eq(6)", link: "a[href*='download.php']:eq(0)", noblank: true}
            ]
        },
        onFilter: bt.requireAllWords,
        icon: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAACgklEQVQ4jW2TP2gjRxTGF7NccQgX4nBxmFQprzpMikO4CCKFESlCquAqiCvMVsGkOBYVZiuxpDBLikOoCIMLs1xhBhfL4MIMLsTi4lhciEGFGLY4BhVicWEEvytG3gshxceb9/H+z3tBPM749bchw5OIyVSQjDPS8wxxmSMLhbz2ULea8nOFKhTiIic9z0jGKcHph5jh+4jTDzHJOENcCO9YKOSNQs9KzMLSrBvcymEWFlkoxGVOPEoIhienxKOE9Dwjv5I+Y+Edbe1o1g3No4f94rC1xcwNslBMpoJgMhXoWUn1YKg+V1Rzg1s5mscNm6cNzdOzbLx8DlZb9J0miE4iwp3wf7H/3X77jkcxqlCt3tntYOaGIBkl9N8dsN99RbgT8monpPf2gMFhj+j345Y7/mVA9lfa6oPDHmZhCfRdia0tx4c93rwIefMiRN8omseG8ka13PFhj+wsbvXkjwi3cgTqVlM9GKIfewxehgxehpSFYrPt/ZmLfjhg8udpq8vpBFtbgudppz/1iXZDol0foHn0Q0veHbT8f218BTcaMzeIoz5pt0Pa7VAVcvsTDfJk2PL/tnErh11agvyTxCwt6qiP6HYQ3Q7mWuLWDc26ofo7bXn59vtWunWDrZ3fg+rBoI766L0Oes8HsLXF1hZ3q1pedL0sj/q4lfN7kH2coO801c99qtfewG4DuLXfRL3XoXr9DeYsRs9K9KwkSMcp4iKnnJXYpfW91RazsNilv4HN06bt2cwN5X3lK1xafwuTqSD7OPGrvIVZ+BbM0lLeV8hCkV9JynufSPyTM3wfEcRnCfEoQVzkvpKts5kb1K0m/yQRl98qlFdye7kp+bXiK0Aav3PRm9FxAAAAAElFTkSuQmCC"
    };
});

bt.addSource("MoreThanTV", function () {
    var q = "https://www.morethan.tv/ajax.php?action=browse&order_by=time&searchsubmit=1&searchstr={query}";

    return {
        url: {
            all: q,
            tv: q + "&filter_cat[2]=1",
            docs: q + "&taglist=documentary"
        },
        onPrepareQuery: function(context){
            var i,
                len = context.url.length,
                res = bt.extractResolution(context);

            if (res) {
                for (i = 0; i < len; i++) {
                    context.url[i] += "&encoding=" + res;
                }
            }

            var year = bt.extractYear(context);

            if (year) {
                for (i = 0; i < len; i++) {
                    context.url[i] += "&filelist=" + year;
                }
            }
        },
        onParse: function (response) {
            try {
                var data = JSON.parse(response.responseText);
            } catch (e) {
                bt.showFailAlert(response);
                return null;
            }

            if (!('status' in data) || data.status !== 'success' || !('response' in data) || !('results' in data.response)) {
                bt.showFailAlert(response, "unexpected data");
                return null;
            }

            response.context.searchUrl = response.finalUrl.replace("ajax.php?action=browse", "torrents.php?action=basic");

            return data.response.results;
        },
        onRender: function (torrents, table) {
            var title, rows = "";

            for (var i = 0, l = torrents.length; i < l; i++) {
                title = '<a href="https://www.morethan.tv/torrents.php?id=' + torrents[i].groupId + '&torrentid=' + torrents[i].torrentId + '" target="_blank">' + torrents[i].groupName + '</a>';

                if (torrents[i].fileCount > 1) {
                    title += ' (' + torrents[i].fileCount + ' files)';
                }

                if (torrents[i].isFreeleech) {
                    title += ' <span class="label label-success">Freeleech</span>';
                }

                rows += '<tr><td>' + title + '</td><td>' + torrents[i].seeders + '</td><td><a href="https://www.morethan.tv/torrents.php?action=download&id=' + torrents[i].torrentId + '">' + bt.humanizeSize(torrents[i].size) + '</a></td></tr>';
            }

            table.html(rows);
        },
        icon: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAABZ0lEQVQ4jcWTu0qDYQyGA4qCDuJisV/S/m8c3HTwCgQXL6CTizg4eAAPQ1EQHAV1ETxUsF/i2FVw0UEEN2/B2c0bcPgcfv9ixVMnX3iHF5KHhBAiIroImPSAbQs4MMHmZ8egGxZ0ywWHzlhxrs42yuUBIiKyERmLIVuLgh0Luu6c1XOYbhX2gG0TbEbRBRPcu2gywbMzJmi/VBrcJeqjLuSsDy6aPOC4m762TOAumixos5MsuHHR9D8AYzRcNHUaL0RENlqZes83PwEWTfDkoimH5dPEgJpzVnfR5JzV/7xCDKgVMBN9dNF0MlQZ/hOgKHTBy4d1Wu06xuV3gFbR0CzrTHv09/wroFmqqDEaxmg0SxUtcmTd+/UK3agDcETUXyPq6QrAeuuiKYqe0UUZ45Gxmn8ZVkyw/JWj6JKxzjnjKj+pvnqoTtMuUW8M2bwJ3BnnUfTsK5voqQccO+POWK89VKeJiN4AsErg8gM6/z4AAAAASUVORK5CYII="
    };
});

bt.addSource("Shellife", function () {
    return {
        url: {
            music: "http://shellife.eu/browse.php?search=",
            music_flac: "http://shellife.eu/browse.php?search="
        },
        onParse: {
            cleanup: ["div[id]", ".grey"],
            row: "tr.torrent_row",
            link_prepend: "http://shellife.eu/",
            sel: [
                {
                    text: "> td:eq(1) > a:lt(2)",
                    link: function (context) {
                        var id = $("a[href*='download.php']:eq(0)", context).attr("href").split("id=")[1];
                        return "details.php?id=" + id;
                    }
                },
                {text: "> td:eq(6)"},
                {text: "> td:eq(4)", link: "a[href*='download.php']:eq(0)", noblank: true}
            ]
        },
        onFilter: bt.requireAllWords,
        icon: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAACa0lEQVQ4jX3T30+ScRTHcf+o5u9ya866q5gXrhunde9aaTNbd66L/FUiQ6eVzhzamKDiRK1Jlg9oGCCoCPLIo/gAGvAYukH5fXfVhRM71+e8trPzOUUUKCEE+Xwet3sdk2mCgYEhNE0r1EpRoWFJcmIyTbAirbIdDPHd7cG9/gMhxP+BbDbLyPAoTpebeOKIVDpDKpUhmTzGH9gim81eDeRyOfr6jHxZlpD3FNJpjUzmBE37RSZzgqIckMvlCgNCCEymCRYWlwjuhNnwbxI7VPmZypBOp0mnNaLK/tUrRKMKwyNjyHsKscM4oXAEjzfAQUwlkTxG3lNQ1fjVgNk8iXvdgxpPsn9wyHYwxIrkwuPdQI0nicXUgsMARUII3r0fIbwrE08cEZGj+DYCLH+V0OuNtLW9QK83sLW1RT7/uzDQ0fkaf2CbiBwlFI7g9fnp6emlquom1dU19BmMLMx/xuFY5vz8z2Wgq/sNG/5NdkK7bAdDeH1+GhoeUFlxndKScpqaHrG25mbGNkckIl9Yp0gIweDgWzxeP8GdMPKeQnhXprHxIeVllRRfK6Gy4gazs3PYbHP4fP6LAIDVOsWMzU5EjnKoJlDjSdrbX1JeWkFpcRl379zD4VjGbv+E07l6+QqadsLjJy309w/xbcWFohzQ3PyUWzW30elq6XjVhX1+Eat1mkBgs3CQJEmiru4+Ol0t9fUNtD57Tq/ewPDIKBMfzZjNFiyWac7Ozi4D/xCXy0VraxsGwwDNLa306g10dHbzYWycmZlZolHlUh4uPJMQAk3TMJsnGRsbx2AwYrFOsbTk4PT0tGCY/gKeZ3zk0q3/+QAAAABJRU5ErkJggg=="
    };
});

bt.addSource("HDB", function () {
    var hdb = "https://hdbits.org/browse.php?descriptions=0&search={query}";

    return {
        url: {
            all: hdb,
            movies: hdb + "&c1=1",
            movies_remux: hdb + "&c1=1&m5=1",
            movies_bluray: hdb + "&c1=1&m1=1",
//			movies_hd: hdb + "&c1=1&m4=1&m3=1&m6=1",
            movies_720: hdb + "+720p&c1=1&m4=1&m3=1&m6=1",
            movies_1080: hdb + "+1080p&c1=1&m4=1&m3=1&m6=1",
            tv: hdb + "&c2=1",
            mvids: hdb + "&c4=1",
            xxx: [hdb + "&c7=1", hdb + "&descriptions=1&c7=1"],
            docs: hdb + "&c3=1"
        },
        onParse: {
            row: "#torrent-list > tbody > tr",
            link_prepend: "https://hdbits.org",
            sel: [
                {
                    text: "> td:eq(2) a:eq(0)",
                    freeleech: "a.fl"
                },
                {text: "> td:eq(7)"},
                {text: "> td:eq(5)", link: "a[href*='download.php']:eq(0)", noblank: true}
            ]
        },
        onFilter: bt.filter3dMovies,
        icon: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAACHklEQVQ4jaXK30tacRjH8e+/pxd5sysFJe2mq3MCNdpFKAOz4ao1KtlKS5JOVh7H1DUNsUiLmtEWrV21iwYL8tfxR7CVvHexw2ltYzddvPg8z/N5RKr0iYcQa8Vj1oofuMs/5/8T8dwhDyGi6RJLmTJK/pBoeldXQskfspgps5gps16osF6ooGwdEE2X7hHhjQKpYgWtc014o2DQOtekiu9JFSvc3N5ycVnjstpE61zztvzR+BNT8SyJ3B7Ndpfn8SxTuma7SyK3RyK3T7PdNe5r+X2+/7gh+rrIVDyLGI+oLKe3abQ6jEdUXZJGq8Nyevt+t6ASjKicnX9l9+iM8QUV4Z9dIZLM0+v1qGttQ6/XI5LME0nmqWtt/LMrhuLBCcefz/HPriBGnkUJKxlqjRYjE1FDrdEirGT+2ZWOTtk9OmVkIooYCswxHVOp1jWGAnOGal1jOqb+1XmevqTa0HiVyDIUmEMMjk4Sml/lqtZkcHTScFVrEppfJTS/SqvTZTH5DiVd4MvFN0qVE+NPOL1B3IEZYslNnMNj9A8H6R8OEktu4g7M4A7MoOZ2UHM7KG+2ePJiCac3iNM7Rr83iLDKPmyyD5vsxyr7sEl+bJIPq+zHKul3fbfJ/l+/ks9I8WjwMQ8hLC43fTrLgJ4uD30uD3edx2AZ0PsBNxaXG2F2yJgdMia7hNkhY7brs13G7JAwGTcZk0PCbJcw/eYnDKTjHv2fDS0AAAAASUVORK5CYII="
    };
});


bt.addSource("BS", function () {
    var bs = "http://bitspyder.net/browse.php?incldead=1&scope=0&search={query}";

    return {
        url: {
            all: bs,
            elearning: bs,
            docs: bs + "&c42=1",
            abooks: bs + "&c40=1",
            mags: bs + "&c57=1",
            ebooks: bs
        },
        onParse: {
            row: "tr.alt1,tr.alt2",
            link_prepend: "http://bitspyder.net/",
            sel: [
                {text: "a.altlink6"},
                {text: "> td:eq(2)"},
                {
                    text: "font[color='#A52A2A']:eq(0)",
                    link: function(context){
                        var link = context[0].firstElementChild.nextElementSibling.firstElementChild;
                        var id = link.getAttribute("href").split("id=")[1].split("&")[0];
                        return "download.php/" + id + "/" + link.textContent.trim().replace(bt.spacesRegex, "%20") + ".torrent";
                    }
                }
            ]
        },
        onPrepareQuery: function (context) {
            context.query = context.query.split(' ');
            for (var i = 0, l = context.query.length; i < l; i++) {
                context.query[i] = encodeURIComponent('+') + context.query[i];
            }
            context.query = context.query.join('%20');
        },
        icon: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAC8UlEQVQ4jY2TS2hUdxSHzzAMQxAJIS0uXLkSXLjJwkUrpbiaRRdBLkokCRY7NFgIpe2mNpSAAW0RRMEHKhIhRAouxEdpRAzBjEnzaJtJnExyX//7njv3Pffeco3ycxENPhBcHM45cL4PzoFDRJQjolylUmljjPVrmjakKMoAY6yXMcZJknRIkqR+xtigLMsjoigen5+fb3/N0evCNLUvkzRdz7LMT9P/zSRJ1TiOWavVYkEQqEEQNFzXDZvNpq7KwsH3BZXbF7ONF9jQ63hem0K2/jeSNEUcx4iiCEEQwPd9NL0A0vTd8bcE6yUqrs0/rmYbz5E+GUNy7xTif+4hThJEUYQwDOH7PlzXRdP1sDL3WFc5atsSNAd37a6t1pFlGWpXy1g+2w19ehxRGL4FO44D225iuc5DGvp835bA+XHPPkFmyLJnaNRnYCxPIgx8hGGIIAjged4r2Eaj0UBNYFj77eDmHcBR3vl57wFJ0ZGmKeIkQasVfxC2LAtrsoanZ/oHwFGewFHeGv7iK1mzkCQJWq3WB2HTNGEYBnimo3pu4CeUqUDgKK+e7j4i6Y2PgnVdh6CaWLrw/TBKVCRwlGdnD39Tl1Q4jgPP8+D7m/tHUYQoiraOaNs2LMvCqsCwcPXE7+CojVCmgnj52x+WVnmIogie38yKokBVVWiaBlVVwRiDJEngeR5z/y5h9vrJi1YvbSOUqFgb/eXXxWoNPM9DlmWoqgrDMGCaJizLgmVZMAwDmqZBEATMzC1gauz8eNBDHYQSFdcufTe4WF2BICtQdBNGw4btuHA8H64fwvUD2I4H025CUjTMLv6HmRunrnllaid0USEa/GR3ffzkeeHO5QfCxOgcP3mrKlTur4uzE0ye/UuSZ/6sy9N3qvLDmwvi/SuPlsdGRpWhz/ajREUiohy6qIBe2oYytaOHOtBHnfEx2oE+2ok+2omj9Cn6qBM91IEe6sDXtB1dVABHeXrjKXJElANH+Tfjj3f6d+dfAuBCuhI2QTSDAAAAAElFTkSuQmCC"
    };
});

bt.addSource("BitMe", function () {
    var bitme = "http://www.bitme.org/browse.php?incldead=1&search={query}";

    return {
        url: {
            all: bitme,
            elearning: bitme,
            ebooks: bitme,
            abooks: bitme + "&cat=2",
            docs: bitme + "&cat=5",
            mags: bitme + "&cat=6"
        },
        onParse: {
            row: "form ~ table:eq(0) tr:not(:first-child)",
            link_prepend: "http://www.bitme.org/",
            sel: [
                {text: "a[href*='details.php']:eq(0)"},
                {text: "> td:eq(8)"},
                {text: "> td:eq(6)", link: "a[href*='download.php']:eq(0)", noblank: true}
            ]
        },
        onFilter: bt.requireAllWords,
        icon: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAABU0lEQVQ4ja2SO4oCQRCGy4YBdYwMDFQQmWgmdEJPYC74CA08hUfxDHqDnmhAMBoxMBENFMHAwAcTfhssttu4C6Jb0ND14Ku/u0pEhA+P8K5ZABFBKYVSCq01aZqilDJx4Mm3APfgaDQyd4BqtfrU9VcFmUzGUnC3crn8GsBxHKPgZ1GlUnkNcO9eLBbRWnO9XlFK4TiO9aQ/Ae+YAXy8B4VCgUajQS6XMwnf9wmCwIyuXq8TBAFhGOL7Ptls9gHodDoAjMdjRIRWqwXAer02wP1+b8nvdrsPQLvdNolarcZsNgNguVwawPF4JEkSPM/D8zxc130Aer0ep9OJKIrY7XbEcUySJJaCzWZDmqasVisWi4UN6Pf7nM9nwjAEYDgcorVmu91aCubzOa7rks/n7U8cDAbA9zaWSiVEhMPhwOVyMYW32w2AyWTCdDql2Wz+zxi/AECKPay4236DAAAAAElFTkSuQmCC"
    };
});

bt.addSource("TGZ", function () {
    var tgz = "https://thegeeks.bz/browse.php?incldead=1&nonboolean=1&titleonly=1&search={query}";

    return {
        url: {
            all: tgz,
            elearning: tgz,
            docs: tgz + " -pdf -ebook -mp3 -m4a -aac",
            ebooks: tgz + " -xvid -pdtv -hdtv -avi -mp4 -wmv -mkv -dvd",
            abooks: tgz + " AND (audiobook OR mp3 OR m4a OR aac OR flac OR ogg)&nonboolean=3"
        },
        onParse: {
            row: "tr.ttable",
            link_prepend: "https://thegeeks.bz/",
            sel: [
                {
                    text: "a[href*='details.php']:eq(0)",
                    freeleech: "font[color='blue']:contains('FREE')"
                },
                {text: "> td:eq(8)"},
                {text: "> td:eq(6)", link: "a[href*='download.php']:eq(0)", noblank: true}
            ]
        },
        onPrepareQuery: function (context) {
            if (context.category === "abooks") {
                context.query = context.query.split(' ').join(' AND ');
            }
        },
        icon: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAwUlEQVQ4jdWSvWoCURBGT1zSiJUmzfbiU6QOkt4qkFcQ3ymdWq4h2ucFRAI+hEsarTw2t7gs+3NJZ/E133xzhrlzAUyRDWICxoqbYr8RUDWyhKl3BCjAKfgc/EcwB2fgPgXQpgF4SAHk4DdYgltwGNU+UgCrSn0DfoLH1BXK4F/Bc0WXOoBgLzQ/RN5PzTtkTYBRFDr9B/AWhZZ1t+8CFJUrfIF/4C84TwEILjr+AeBLG0BwDb6CT2FaHxyD7+AuZG4TCI/1JWS7dwAAAABJRU5ErkJggg=="
    };
});

bt.addSource("BIB", function () {
    var bib = "https://bibliotik.me/torrents/?search={query}";

    return {
        url: {
            all: bib,
            elearning: bib,
            ebooks: bib + "&cat[]=2&cat[]=5",
            mags: bib + "&cat[]=6&cat[]=7",
            apps_win: bib + "&cat[]=1",
            abooks: bib + "&cat[]=3",
            comics: bib + "&cat[]=4"
        },
        onParse: {
            cleanup: ['time', '.taglist'],
            row: "#torrents_table > tbody > tr",
            link_prepend: "https://bibliotik.me",
            sel: [
                {text: "> td:has(a[href*='/torrents/']):eq(0)", link: "a[href*='/torrents/']:eq(0)"},
                {text: "a[href*='peers']:eq(0)"},
                {
                    text: function (context) {
                        return $("> .t_files_size_added", context).text().split(',')[1].trim();
                    },
                    link: "a[href*='download']:eq(0)",
                    noblank: true
                }
            ]
        },
        icon: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAACBElEQVQ4jc3S/0sacRzHcf9JaQsysASLQXSjCUkM+mE0yV+MNO4c2qF2cp5CzptekF4fd2eepR4M2hiFI2Kt7W947qeofaX9the8fnw/fnjzCgT++6iqSqGgYhgGrVaL0cjnwcc7Oxmyioym1ajVqnQ6bZrNFt5xj0O7S7FY/D0mywqyrKAoCrValXK5jG23aTRes18/otsVpNMZWtbBj4DVttlMJEhvp1FkGcOoYpoNhBA4jovrOgwGHoVCAdvuIIS4A/b2NDY2XpBMJslms+TzeTRN40jY1Ot1TNNkNBqhqipCHOG6Ls4bh8Dx6ZiVpxKpVIpKxWC/XqfRaJDP5yiVSlQqbYQQjMdjXmWz5HI5+v0+hqHjeR6BWCzG7GyIUChENBolHo9jWRYnJx4Vo4qulxkOh2xtpdjdzeM4DrquU6tWORkMCFxc3XAoerxMJJmenmZmKsjCwgKbmwk+vP/I6XBIs9mk1bJwHZfJZILv+/i+j2maBM4vv3DbdxeX7BY1wnNzLEXnKZU20PUykiQRi8WQliXiq6tkMhl6vR7X19d3T7wPTa6+YrUFU48eEwwGkSSJSCRCJBJhfi7Ms5UVnq+tsb6+/usO7kMXVzd44zM6b/uUtApb29uEw2EiszM8WVxkeWnp76u8j9320+dvjM/OOeh0KRvGw2f9J/SfgZ/zHe4g1eDb0gaxAAAAAElFTkSuQmCC"
    };
});

bt.addSource("AHD", function () {
    var ahd = "https://awesome-hd.net/torrents.php?action=advanced&order_by=time&order_way=desc&groupname={query}";

    return {
        url: {
            all: ahd,
            movies: ahd,
            movies_1080: ahd + "&resolution=1080p",
            movies_720: ahd + "&resolution=720p",
            movies_remux: ahd + "&media=Blu-ray",
            tv: ahd,
            docs: ahd
        },
        onPrepareQuery: [bt.extractGazelleYear, bt.extractGazelleResolution],
        onParse: {
            row: "#torrent_table tr.group, #torrent_table tr.torrent",
            link_prepend: "https://awesome-hd.net/",
            sel: [
                { text: "a[title='View Torrent']:eq(0)" },
                {
                    text: "> td:eq(4):contains('.'), > td:eq(5):contains('.')",
                    link: "a[href*='action=download']:eq(0)",
                    noblank: true
                }
            ]
        },
        icon: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAADQElEQVQ4jWVTzU8iBxydW7P7LyjE00IQ2dXElfbS1thGo+tuovFiNV4k7mqtSlFXERawig6gkQ9nBhE7I6PyYQtoXNPwbeSgBw5GDiR7IWL0YuJhQzDm9dAsWe1L3u29l/zye48gHiGXy9WFw2EHy7JZt9tddLvdRZZls+Fw2JHL5eoe68vI5/NPfD7f6uLiYonjOEQiEYRCIQSDQUQiEWxubmJhYaHk8XhW8/n8kwfmQqHwlGGYGEmS4DgOqVQK29vb4Hm+zKOjI3g8HphMJlit1lihUHhaDggEAg6SJO83NjYQj8exv78Pl8uFeDyO4+NjrK2tYW9vD4lEAizLwmQy3W9tbTnKN8/NzZVomsbBwQFSqRQcDgf8fj/u7u5QKpUQDAZht9uRSCRweHgIhmEwOztbOj8/ryN2d3dtS0tL8Pl8SKfTsNvtoCgKNzc3uLy8xMXFBW5vb+F0OmG1WpFOpxEIBLC8vIydnR0bYbFYshRFIRKJwOl0giRJnJ2d4fr6GisrKzCbzbi6ukI2m4XJZAJFUYhGo2AYBkajMUsMDAwUjUYjeJ6HRqOB1+tFKpVCLBYDz/PgOA7RaBTJZBJ+vx9arfbLR6BQKIpEa2trsb+/H2azGTRNg6ZpGAwGqNVq6HQ66HQ6TE9PQ6/Xg6Io0DQNi8UChUKB5ubmItHZ2Znt6OjA8PAwvF4fRkdH0dfXh7fv3sFmd0Cr/QCaccK1vg5+axt/siwGh4bQ3t6Otra2LKFSqWwymQwtLS04OPwHPT096OnthVL5O/4OhTE4NIRp9QxUqnGMj0/gr2AI3d2/QCQSYWxszEacnJzUVlVVlSQSCShmDa/fvAFpXoLVvgrGtY6J91OYeD+F+vp6yGQy6P+YR9NPP6OioqJ0enr6X7WVSqVNIpHca2fnUVNTA7FYjO9/+BFTGh26e/swqdZiYHAYb3/9DVrDPBrk8vuRkRHH1wP6pqur6+PLBjnEYjFEIhGqq6vxskGOF7W1kH/7XZmy58/x6tXrh1X+EjI5ObkoFAo/CwQCCIXCBxQIBKisrPysVKmW/zemr5HJZJ5pNBp9Y2NjUiqVfpJKpZ+ampqSMzMzhkwm8+yx/l/wGTPXxmfuPQAAAABJRU5ErkJggg=="
    };
});

bt.addSource("TehC", function () {
    var tehc = "https://tehconnection.eu/torrents.php?action=advanced&torrentname={query}";

    return {
        url: {
            all: "https://tehconnection.eu/torrents.php?action=basic&searchstr={query}",
            movies: tehc,
            movies_1080: tehc + "&bitrate=1080p",
            movies_720: tehc + "&bitrate=720p",
            movies_dvd: tehc + "&format=DVDR",
            movies_bluray: tehc + "&format=AVC&media=Blu-ray",
            docs: tehc + "&searchtags=Documentary"
        },
        onPrepareQuery: function (context) {
            var i,
                len = context.url.length,
                year = bt.extractYear(context, true),
                res = bt.extractResolution(context);

            if (year && year.length === 4) {
                for (i = 0; i < len; i++) {
                    context.url[i] += "&year=" + year;
                }
            }

            if (res) {
                for (i = 0; i < len; i++) {
                    context.url[i] += "&bitrate=" + res;
                }
            }
        },
        onParse: function (response) {
            var result = [];
            var html = $(response.responseText.replace(bt.imgTagRegex, '<meta '));
            var groups = $("#browse_torrent_table", html).find(".group");

            groups.each(function () {
				var link = $("a", this).first();

                var group = {
                    groupName: link.text(),
                    groupURL: link.attr('href'),
                    groupYear: link.next().text(),
                    torrents: []
                };

                $(this).nextUntil(".group").each(function () {
                    var cols = $(this).children();
                    var links = cols.eq(1).find("a");
                    group.torrents.push({
                        title: links.eq(2).text(),
                        url: links.eq(2).attr("href"),
                        download: links.eq(0).attr("href"),
                        size: cols.eq(4).text(),
                        seeders: cols.eq(6).text()
                    });
                });

                result.push(group);
            });

            return result;
        },
        onRender: function (movies, table) {
			var movie, groupHeader, groupTable, torrents, torrentsLen, torrentTableHTML;
            var host = "https://tehconnection.eu";

            for (var i = 0, len = movies.length; i < len; i++) {
				movie = movies[i];

                if (!('torrents' in movie)) continue;

                torrents = movie.torrents;
				torrentsLen = torrents.length;

				if (torrentsLen === 0) continue;

				torrentTableHTML = "";
                for (var n = 0; n < torrentsLen; n++) {
                    torrentTableHTML += '<tr><td><a href="' + host + torrents[n].url + '" target="_blank">' + torrents[n].title + '</a></td><td>' + torrents[n].seeders + '</td><td><a href="' + host + torrents[n].download + '">' + torrents[n].size + '</a></td></tr>';
                }

				groupHeader = '<h4 class="torrent-group"><a href="' + host + movie.groupURL + '" target="_blank">' + movie.groupName + '</a> [' + movie.groupYear + ']</a><h4>';
				groupHeader = bt.tr.clone().append(bt.td.clone().html(groupHeader));

                groupTable = bt.table.clone().addClass("torrent-table").html(torrentTableHTML);
				groupTable = bt.tr.clone().append(bt.td.clone().append(groupTable));

                table.append(groupHeader, groupTable);
            }
        },
        icon: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAABGElEQVQ4jbWRsSuFYRTGXzdJBpTtWu7wpVt3eN/f72M1GJTBwmS2moxkkjBgMSopi8FkUDJabP4MJQuiKNdy6SPfjRtPneWc8zw95zkh/AfUTF1Ql9RlYDGlNBZCqJSSsizrB1bVG7VZUk/qboxx5BMZmFMf3heBB+BY3QTW1X3guiD0CmyEELqCulYgXgBTZS5TSkk9KuyfBTUH7oH5r4RGo9FTq9V6v8loArgFxt97H+HEGIfVbeC2YPkROGgF2Tb9afWleGurmgXbK6UCwKh6p57HGCdDCN0hhEpKKQF76nPR9reo1+tDZbNqtdrXlvynyPN8QD0ETtX81wLqDrClzgBXHQm03jnbkUBKaVA9AS47OuGneANZLXB8s+ETIwAAAABJRU5ErkJggg=="
    };
});

bt.addSource("HDT", function () {
    var hdt = "https://hd-torrents.org/torrents.php?active=0&options=0&search={query}";

    return {
        url: {
            all: hdt,
            movies: hdt + "&category[]=1&category[]=2&category[]=5&category[]=3",
            movies_1080: hdt + "&category[]=5",
            movies_720: hdt + "&category[]=3",
            movies_remux: hdt + "&category[]=2",
            movies_bluray: hdt + "&category[]=1",
            music: hdt + "&category[]=44",
            music_flac: hdt + "&category[]=44",
            docs: hdt + "&genre[]=Documentary",
            tv: hdt + "&category[]=59&category[]=60&category[]=30&category[]=38",
            mvids: hdt + "&category[]=61&category[]=62&category[]=57&category[]=45",
            xxx: hdt + "&options=3&category[]=58&category[]=48&category[]=47"
        },
        onParse: {
            row: "table.mainblockcontenttt > tbody > tr:has(a[href*='download.php'])",
            link_prepend: "https://hd-torrents.org/",
            sel: [
                {text: "a:eq(1)"},
                {text: "> td:eq(9)"},
                {text: "> td:eq(7)", link: "a[href*='download.php']:eq(0)", noblank: true}
            ]
        },
        onValidate: function (response) {
            return response.responseText.indexOf("You're not authorized to view this Torrents") === -1 ? true : "login needed";
        },
        onFilter: bt.filter3dMovies,
        icon: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAABrklEQVQ4jbXTvWoqcRDG4dldP/6uH2RdMVUgzSoiilFWMZusrgS0UkFIkUqICqa0CNFLiKVgZeENeAPe3C/VEcSkOJycgbcbnuadEfml4R/yy0A8HieTyWDbNrZtk06nsSyLq6srLMtCKfUzkMvl6Pf7tFotOp0Ovu9zf39PtVqlUqngui5BEHBzc3MJGIZBu91G0zR0XUdE0DQNEcGyLK6vrxERdF0nCILTzglQSlEul1FK8f7+jojw8vLCfD5nt9ux2Wz4+PhARPB9n0gkcg7EYjHq9TqmabJer0kkEkynU5bLJZPJBBHh8/OTWq3G3d3dJWCaJr7vYxgGx+OR/X7P4XBgNpsxHo8REYbDId1ul1wuRzgc/h4wTZPtdkssFuP5+ZnpdMpgMEBEeHt7o1Qq4TjO90Cj0UApxWq1QkTodDqMRiMWiwWTyYTX11c0TaNYLBIKhc6BUCjE09MTmqaRSqUQEaLRKEopHMchn8+fmmk2m5ctiAiFQoHRaMTj4yNBEPDw8IDnebiui+u6eJ5Hr9fj9vb250tMJpNks1kymczZRf6JaZr/+Rf+Nl8Ccia4Vb4rGwAAAABJRU5ErkJggg=="
    };
});

bt.addSource("HDS", function () {
    var hds = "https://hdsky.me/torrents.php?incldead=0&spstate=0&inclbookmarked=0&search_area=0&search_mode=0&search={query}";

    return {
        url: {
            all: hds,
            movies: hds + "&cat401=1&cat410=1&cat405=1",
            movies_1080: hds + "&cat401=1&cat405=1&medium7=1&medium5=1&medium11=1&standard1=1&standard2=1",
            movies_720: hds + "&cat401=1&cat405=1&medium7=1&medium5=1&medium11=1&standard3=1",
            movies_remux: hds + "&cat401=1&cat405=1&medium3=1",
            movies_bluray: hds + "&cat401=1&cat405=1&medium1=1&medium12=1",
            movies_dvd: hds + "&cat401=1&cat405=1&medium6=1",
            docs: hds + "&cat404=1",
            tv: hds + "&cat402=1&cat403=1",
            mvids: hds + "&cat406=1",
            music: hds + "&cat408=1",
            music_flac: hds + "&cat408=1&audiocodec1=1&audiocodec2=1"
        },
        onParse: {
            row: "table.torrents tr.progresstr",
            link_prepend: "https://hdsky.me/",
            sel: [
                {
                    text: "> td:eq(1) a:eq(0)",
                    freeleech: ".pro_free"
                },
                {text: "> td:eq(5)"},
                {text: "> td:eq(4)", link: "a[href*='download.php']:eq(0)", noblank: true}
            ]
        },
		onFilter: bt.filter3dMovies,
        icon: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAADEElEQVQ4jYXT3U+bBRTH8aNu082XVXhKWTcYbJPS0lf68rRlA+xITEbihYkx8QXBrTOVDkrfaeimnQM13mniXOTG6IgyYHSFvoAt6xAMQ/13vPt64QxsF3qSc3k+OeckP5HH64CIHPqfPigiTz0xJwffdjQOzAeNf1Ui3VSjbu7HnBTDVjZiTspjVu5eNlD4yMjdkJmv32z9XkRe3A+Zb18yMR80sB51UYt7qCfclMZsbKZVVsNW8iEDK6NmlkNmFi6b+PKtzjkReVZE5NBFf+Pnc0ETC6EuqgkPazEX9ZSHalylnvJQidgpjBopjlnIhy0sjzpYHlcREZ2IyOFhr+6728EulkbNVJMqtaRKPe2hlvKymfGxFu2mNG6hPGHl5+Aplq84uDfhRURaRUSODPt0s3MfmlkcNdJ89AU2p85Sz6i0NLzEN0MW2rUvc7pJw08hKz8M6ylEnKzE/YjIyX8Av272TtjKUriLNkXDr9letq+eo6NZ4dsRGxMX2rk3bsFwTKEU62Y16mI1eXYPGPHrZheu2MiPmWlTNLyia+CMrgGjXsuti3Yig+2Uozb6OnWsZ9wUY26K6XP7gF7d7HzYRj5ipU3RsJPrZ+vjPjqaFW6OWIi9bqASt2NrVVhNmKkkVMqTTwB3xmwUojbaFA0PbwzwW66fjmaFW5fs9JlOEDA1YdRrKUTNlONOiinf48BixMFq3M6PoTP88cUgO5++Sj7dw8aUj6WYm6Wog/tZlbWUi1LCzUrSswcEe/WzixEHhaiVStLM7sxr7NwIsPVJH7vTAepZP7+kuqlf9bKe8bCW9lHK7D3x8BsO7Vf5uItiwsFG1sv29QEeTgfYyvWzOxOgnu2hOunkwTUf5aSd9UwPK5O9iEiLiMgzInIhH3NSSrnYuh5gZ3qA3ZkA27l+fv/sPBtTXmqTTh5c87ISN1Gb6qP3lFIXEc2/WdA2PXcgN2hsZEg9wZDawvvqcd7zHOcD/0nedR1jWNUz4tXzjltPl/bInyLSJSJP70/k849uMohI53/0aRFRHm0ufwPkeZfm3qXqFQAAAABJRU5ErkJggg=="
    };
});

bt.addSource("BHD", function () {
	// NB: Spaces should be replaced with % signs, otherwise search works for an exact phrase

    var bhd = "https://beyondhd.me/browse.php?incldead=1&searchin=title&search={query}";

    return {
        url: {
            all: bhd,
            movies: bhd + "&c50=1&c77=1&c75=1&c49=1&c94=1&c61=1&c78=1&c86=1&c37=1&c54=1&c17=1",
            movies_1080: bhd + "&c50=1&c77=1&c86=1&c94=1",
            movies_720: bhd + "&c75=1&c78=1&c54=1",
            movies_remux: bhd + "%25remux&c50=1&c77=1&c75=1&c49=1&c94=1&c61=1&c78=1&c86=1&c37=1&c54=1&c17=1",
            movies_bluray: bhd + "&c37=1",
            docs: bhd + "&c50=1&c83=1&c77=1&c75=1&c49=1&c94=1&c61=1&c78=1&c86=1&c37=1&c54=1&c17=1",
            tv: bhd + "&c40=1&c44=1&c48=1&c89=1&c46=1&c45=1",
            mvids: bhd + "&c55=1&c56=1&c42=1",
            music: bhd + "&c36=1&c69=1",
            music_flac: bhd + "&c36=1"
        },
        onParse: {
            row: "table.torrenttable > tbody > tr:gt(0)",
            link_prepend: "https://beyondhd.me/",
            sel: [
                {text: "a[href*='details.php']:eq(0)"},
                {text: "> td:eq(9)"},
                {text: "> td:eq(7)", link: "a[href*='download.php']:eq(0)", noblank: true}
            ]
        },
		onPrepareQuery: function(context){
            context.query = context.query.replace(bt.spacesRegex, "%25");
		},
		onFilter: bt.filter3dMovies,
        icon: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAB5ElEQVQ4jYWTz2sTQRTH39mDqCdB8P/wVjJDsTeP4g+I6M7OFKGBXqqnYjKrp0JPUgv2oj2EzKSlWsjBQmcOi2KaQ0sDgrSyxdimdNEqKUnj8+LG7A/pg3eb7+c78+Z9ARI1kl+4kHNUnjjq1dj48jcubZNL+9ot2nu3p1fPJ8/HijJ1izD1mTKNlGmkbrUnpOkJz6LwLHLPBFyam5ninKOKA+HfHnWrJ88WNk4jQNRuyRZTzkkxZRrliw/dmh/0kwDhWXSluQMAANfuly8RplpZgLdm9/Qw7PzOAghpDtj0yjkgTLlZYso0Hv/qIiLi05eNNMCzyKXJA3H0EmUabxRWcP3jHta397G+vY+fdkOMqh12sLkTDjoCcmkqQBwVRI4R5H/1pXUcuw2Xpg5Z759XWymxbbRwcsZPzME2gDh6NQl4Mvc+Baj5QXoGnlmG3ANVSALemB1ERNxoHvRrftCP5pABEDCSL1+mTB8NA762f+K82sJRt3oipOnNLm5iO+zEf0Pa72LKXgQAAOKo8Uh893ENhVwbbGK0ypMzPs4ubv5zL5mH8W109POsVR7OwpD7XGYeiFOZIEwfDkG68TDZH6JkCmcksnyVssoUYWrtulg64tLucWnWXWke8dK7K8nzfwBqE0A4H4ujDAAAAABJRU5ErkJggg=="
    };
});

bt.addSource("TorViet", function () {
    var torviet = "http://torviet.com/torrents.php?incldead=0&search_area=0&search_mode=0&search={query}";

    return {
        url: {
            all: torviet,
            music: [torviet + "&sltCategory=5&sltSubCategory=126", torviet + "&sltCategory=5&sltSubCategory=130"],
            music_flac: torviet + "&sltCategory=5&sltSubCategory=126",
            //		music_mp3: torviet + "&sltCategory=5&sltSubCategory=130",
            movies: torviet + "&sltCategory=2",
            movies_1080: torviet + "&sltCategory=2&sltSubCategory=125",
            movies_720: torviet + "&sltCategory=2&sltSubCategory=124",
            movies_remux: torviet + " REMUX&sltCategory=2&sltSubCategory=127",
            movies_bluray: torviet + "&sltCategory=2&sltSubCategory=127",
            docs: [torviet + "&sltCategory=3&sltSubCategory=0&sltGenre=62", torviet + "&sltCategory=2&sltSubCategory=0&sltGenre=32"],
            tv: torviet + "&sltCategory=3&sltSubCategory=128",
            elearning: torviet + "&sltCategory=6",
            ebooks: torviet + "&sltCategory=6&sltSubCategory=112",
            abooks: torviet + "&sltCategory=6&sltSubCategory=117",
            mags: torviet + "&sltCategory=6&sltSubCategory=112",
            apps_win: torviet + "&sltCategory=4&sltSubCategory=76",
            mvids: torviet + "&sltCategory=5&sltSubCategory=92",
            games_pc: torviet + "&sltCategory=1&sltSubCategory=7"
        },
        onParse: {
            row: "#idtorrent table.torrents > tbody > tr:not(:first-child)",
            link_prepend: "http://torviet.com",
            sel: [
                {
                    text: ".torrentname a:eq(0)",
                    freeleech: ".pro_free"
                },
                {text: "> td:eq(4)"},
                {text: "> td:eq(3)", link: "a[href*='download.php']:eq(0)", noblank: true}
            ]
        },
		onFilter: [bt.filter3dMovies],
        icon: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAADrUlEQVQ4jSXDe1DTBQDA8d//nP5B1x1pKCZwHV1xZ3/4R2eXCk5Ep1mKYR4QkIJLmURWdl6P8zSujjcRggaBD8YGIspwsKEww7En22SMjZccrzWGiMTz9+0PP3cf4VCeLuzoH49vJ1YYF5OqzaTWWjl520ZmvZ20W72k3Hg1qcZG4l8WDpSZ2FvSsyIpeKyJ++1RlHAwr1PxSXmPeLzKQvItOyeVT/nqrgt5ixu52kN6o5u0Bjepyn4OVzuJvdrL7jILHxUZxd15eosgLehaPFphIqnGRrrCgexOH/IWNzltHr7VDZLV6iWj2UOy0o20ug9JpZ3YP63sLDYRU/QEYX9+FzkKK+M+P9MzAXyBAMPTfnI0bn7RD/GTfojMlkGO1fVzqMbJvuu97Cm3sbvUREyJAeFAfheJ14xcUfexJoroh3z8qBlAP+JnZOYFw4F57rim0Q1MMeyfx+N7QeptJx8WGth+pRNhb+5D4gsNyBV2VtdEHvRPkVrv4tnMSzxTz/H6/8Plm+fphJ+llVUutT7lSI0ZaYWFmIJ/ECS/diAtNiCvc7C6JqLum0TW5GJ89iUDkwE8vgXMz+awjvqYXVgi446Dj6ts7C83E1PQjRB7WYu0+AmZNTZcE3P8bRghpc7JPcc4rvE5nGPPuXzfS6N5DMvoDKkKO9IKK/tKjcQWdCO8J7/P+xc6iP+9m2NlZqSlJo5XO0i43stnVb3sLDbxQZGJHYVGYkp6OHjVyK6Cbnbk6tl+qQMh/GQjEWc05N9zsby8iNYxzsLSMjrrMI9so5ytd1D5eIjSR4OcV9nxTs1yUWVj2886on/QIGxNU/GOvI2MChNrooh3IoD/xSJa+wSOkQC9wzN4J2dZWlmlwTiKKIrIa81EX3hA9PdqhNATCiJOt7Lr4kNWVtdYXl7G7JmmqWcM52gA52gA+8i/WAcmuKZ1IYoiOTctvCVvIVzejBAsrSX4cCOvH2miq9ONwTDMuQoDeQ0OVF1eTpUb6LSM0KwfJD63i7udHnIVZkJOtxAqa0ZYH1e1GCRREBRXT9BeJcEJzYTJ2ok4107UeR3vftdB1Dc6tmZrCc9uJyyrnc1nNITK1GyWNSGs21OpCJLUiUESBev2qwhJUbPxSw1bZRois9qI+lpLVE47b2e3seXsq5tlrWzKVIsbvrhhFdbH5kasjysxBMVc57VPbxHyuZI3Tih5M0XFlnQV4RkNRGY2EJnRwJZTKjalKwlNq2djcnX/hoTibf8Dg6DZMEdjmwAAAAAASUVORK5CYII="
    };
});

bt.addSource("MAM", function () {
    var mam = "https://www.myanonamouse.net/tor/js/loadSearch.php?tor[text]={query}&tor[srchIn]=0&tor[fullTextType]=old&tor[author]=&tor[series]=&tor[narrator]=&tor[searchType]=all&tor[searchIn]=torrents&tor[cat][]=0&tor[hash]=&tor[sortType]=default&tor[startNumber]=0";

    return {
        url: {
            all: mam,
            elearning: mam,
            abooks: "https://www.myanonamouse.net/tor/js/loadSearch.php?tor[text]={query}&tor[srchIn]=0&tor[fullTextType]=old&tor[author]=&tor[series]=&tor[narrator]=&tor[searchType]=all&tor[searchIn]=torrents&tor[cat][]=39&tor[cat][]=49&tor[cat][]=50&tor[cat][]=83&tor[cat][]=51&tor[cat][]=97&tor[cat][]=40&tor[cat][]=41&tor[cat][]=106&tor[cat][]=42&tor[cat][]=52&tor[cat][]=98&tor[cat][]=54&tor[cat][]=55&tor[cat][]=43&tor[cat][]=99&tor[cat][]=84&tor[cat][]=44&tor[cat][]=56&tor[cat][]=137&tor[cat][]=45&tor[cat][]=57&tor[cat][]=85&tor[cat][]=87&tor[cat][]=119&tor[cat][]=88&tor[cat][]=58&tor[cat][]=59&tor[cat][]=46&tor[cat][]=47&tor[cat][]=53&tor[cat][]=89&tor[cat][]=100&tor[cat][]=108&tor[cat][]=48&tor[cat][]=111&tor[cat][]=126&tor[cat][]=0&tor[hash]=&tor[sortType]=default&tor[startNumber]=0",
            ebooks: "https://www.myanonamouse.net/tor/js/loadSearch.php?tor[text]={query}&tor[srchIn]=0&tor[fullTextType]=old&tor[author]=&tor[series]=&tor[narrator]=&tor[searchType]=all&tor[searchIn]=torrents&tor[cat][]=60&tor[cat][]=71&tor[cat][]=72&tor[cat][]=90&tor[cat][]=73&tor[cat][]=101&tor[cat][]=62&tor[cat][]=63&tor[cat][]=107&tor[cat][]=64&tor[cat][]=74&tor[cat][]=102&tor[cat][]=76&tor[cat][]=77&tor[cat][]=65&tor[cat][]=103&tor[cat][]=115&tor[cat][]=91&tor[cat][]=66&tor[cat][]=78&tor[cat][]=138&tor[cat][]=67&tor[cat][]=80&tor[cat][]=92&tor[cat][]=118&tor[cat][]=94&tor[cat][]=120&tor[cat][]=95&tor[cat][]=81&tor[cat][]=82&tor[cat][]=68&tor[cat][]=69&tor[cat][]=75&tor[cat][]=96&tor[cat][]=104&tor[cat][]=109&tor[cat][]=70&tor[cat][]=112&tor[cat][]=0&tor[hash]=&tor[sortType]=default&tor[startNumber]=0",
            mags: "https://www.myanonamouse.net/tor/js/loadSearch.php?tor[text]={query}&tor[srchIn]=0&tor[fullTextType]=old&tor[author]=&tor[series]=&tor[narrator]=&tor[searchType]=all&tor[searchIn]=torrents&tor[cat][]=79&tor[cat][]=0&tor[hash]=&tor[sortType]=default&tor[startNumber]=0",
            fiction: "https://www.myanonamouse.net/tor/js/loadSearch.php?tor[text]={query}&tor[srchIn]=0&tor[fullTextType]=old&tor[author]=&tor[series]=&tor[narrator]=&tor[searchType]=all&tor[searchIn]=torrents&tor[cat][]=60&tor[cat][]=71&tor[cat][]=72&tor[cat][]=90&tor[cat][]=61&tor[cat][]=73&tor[cat][]=101&tor[cat][]=62&tor[cat][]=63&tor[cat][]=107&tor[cat][]=64&tor[cat][]=74&tor[cat][]=102&tor[cat][]=76&tor[cat][]=77&tor[cat][]=65&tor[cat][]=103&tor[cat][]=115&tor[cat][]=91&tor[cat][]=66&tor[cat][]=78&tor[cat][]=138&tor[cat][]=67&tor[cat][]=79&tor[cat][]=80&tor[cat][]=92&tor[cat][]=118&tor[cat][]=94&tor[cat][]=120&tor[cat][]=95&tor[cat][]=81&tor[cat][]=82&tor[cat][]=68&tor[cat][]=69&tor[cat][]=75&tor[cat][]=96&tor[cat][]=104&tor[cat][]=109&tor[cat][]=70&tor[cat][]=112&tor[cat][]=0&tor[hash]=&tor[sortType]=default&tor[startNumber]=0",
            comics: "https://www.myanonamouse.net/tor/js/loadSearch.php?tor[text]={query}&tor[srchIn]=0&tor[fullTextType]=old&tor[author]=&tor[series]=&tor[narrator]=&tor[searchType]=all&tor[searchIn]=torrents&tor[cat][]=61&tor[cat][]=0&tor[hash]=&tor[sortType]=default&tor[startNumber]=0"
        },
        onParse: {
            cleanup: ["a[href*='filelistLink']"],
            row: "tr:gt(0)",
            link_prepend: "https://www.myanonamouse.net",
            sel: [
                {text: "a.title:eq(0)"},
                {text: "> td:eq(6) > p:eq(0)"},
                {
                    text: function(context){
                        return $("> td:eq(4)", context).text().replace('[', '').replace(']', '').trim();
                    }
                }
            ]
        },
        onValidate: function (response) {
            response.context.searchUrl = response.finalUrl.replace("/tor/js/loadSearch.php", "/tor/browse.php");
            return true;
        },
        icon: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAADWUlEQVQ4jQXBW2hbZQDA8aPrJXVr7VBonZ3Tdr2lJ4m1N18E9VEQZE70wVdfh/jmg/gggsqGq+KYax3VydqC9uLWNnR26dbck+Z2cjvJSWbZGAWFbUhnzvd9yd/fTxN7OnbhJHZpAHvPiV0dxjb6aGy2QbCVRrQNtdNCzd+FsNyIshORG6LmPYLYdKDVtp/B3mrH9rVTM/qQezoYXTxeb+XhdgckNUhr2P6j2KYLabmwI8cRNxzIUBuauOFABh2ocDP1UCfs9eNbfIPZL99i7rsPWL7yEXf93ZBx0Ci7qZdc2OEe5K0m6ulmNLXTjEo0g6VxEO1k/sd3WZg9xQP/cWo7GquXxjh37iy710Y5MHrAGkDkdOxwFyLahqbiXRyE2lm73M2V798keO11uNtLw3qB8OopAr7ficaz+EMZNq9PU93WoTqILHoQWTeaqHgQJZ2/dz38mx2Bvwag2svuxjtEEvcoV+5jmiamWaZUfcif3gX2fT00TBcq50ETphNR1sEahrKTRsnJo5vteFdnSBlVisUi+Xwe0zQxDAN/pEL86msQfxZZHEcT20cQ0WMoU0eVXGCcoDzfwfnz01y4OMPS0hKVSoVAIMDMzAzTF66yPPs2jWgrsvAqmtrVEPHDiLwbWdSh8Dxb8++zthknmUyysrJCLBbD6/USCoUIR9P8Ovct/+z00CiPoQnjGKLQjyy4kMURKPcRWXuPSOI+1Tt7lEolDMPANE0sq0z5zgO8f1ziUXSQRsGDJoseZNGFNN3InI7Ku3mcHuTWb6eJxjPc3glgGBl8vpuks1W8Kz9wb9sNBQ8qM4qmCjqy6MaOvIi92Y699TSN9CC11HNcn/+Yi7NLWJbF8uo6c78skF5xQe4kMjqMzIyjqcIoIuXE9rYh/S2o8CFUsJP9oIvFs918cuZDvvj6Mp9+9g2fn9FJLJ7gP18HKniIWqwXTRVeQSSd2FsOVKIJlXsCtduOnRrH2hjCXOvn568m2PpJp7IxwP6tl1GxbkSmAzs9giazHmR2FDvyEiJ6GJF5CpEZop4dp26MQ6gH/E0QdKBiQzSMSVRqApmaRKWm0GzDhTI81PNTiPQYIj2BMqZQxhgq4cJeb0EGWlDhJxG3j6LSU9STE9STk9QTE/wPUBjwW9wnwmsAAAAASUVORK5CYII="
    };
});

bt.addSource("BitHQ", function () {
    var bithq = "https://www.bithq.org/search.php?incldead=1&in=original&options=AND&search={query}";

    return {
        url: {
            all: bithq,
            movies: bithq,
            movies_bluray: [bithq + " BD25", bithq + " BD50", bithq + " blu-ray"],
            movies_dvd: bithq + " DVD",
            docs: [bithq + "&c50=1", bithq + " documentary&in=both&c66=1"],
            mvids: bithq + "&c52=1&c66=1",
            apps_win: bithq + "&c54=1&c61=1&c7=1",
            tv: bithq
        },
        onParse: {
            row: "#content table.main ~ table > tbody > tr:has(a[href*='download.php'])",
            link_prepend: "https://www.bithq.org/",
            sel: [
                {
                    text: "a[href*='details.php']:eq(0)",
                    freeleech: "meta[src*='goodies']"
                },
                {text: "> td:eq(6)"},
                {text: "> td:eq(4)", link: "a[href*='download.php']:eq(0)", noblank: true}
            ]
        },
		onFilter: bt.filter3dMovies,
        icon: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAcUlEQVQ4ja2TUQ7AIAhDufrOtDvtGu5nNchobZaZNAbEF1IxImJ0C3l1fpzXiFwIVUDNQwug0vOFp3CJIasDC6A82AJ2AiDHE5CDL/oXoNqmqgBmHDOaAuyh6gDqSS2A6uAFZIButzxgH0fkjacSE3oDN8hc4OGDrZMAAAAASUVORK5CYII="
    };
});

bt.addSource("PS", function () {
    var ps = "https://polishsource.cz/browse.php?incldead=1&scene=0&pl=0&sub=&search_in=title&search={query}";

    return {
        url: {
            all: ps,
            movies: ps + "&c12=1&c11=1&c4=1&c43=1",
            movies_1080: ps + " 1080&c11=1",
            movies_720: ps + " 720p&c11=1",
            movies_remux: ps + " REMUX&c43=1",
            movies_bluray: ps + "&c43=1",
            movies_dvd: ps + "&c4=1",
            docs: ps + "&sub=Documentary",
            music: ps + "&c42=1",
            music_flac: ps + " FLAC&c42=1",
            //		music_mp3: ps + "+MP3&c42=1",
            mvids: ps + " x264&c42=1",
            tv: ps + "&c39=1",
            elearning: ps + "&c5=1",
            ebooks: ps + "&c5=1",
            abooks: ps + " audiobook&search_in=both&c5=1",
            mags: ps + "&c5=1",
            apps_win: ps + "&c18=1",
            games_pc: ps + "&c8=1",
            xxx: ps + "&c13=1"
        },
        onParse: {
            row: "#restable tr:gt(0)",
            link_prepend: "https://polishsource.cz/",
            sel: [
                {text: "a[href*='details.php']:eq(0)"},
                {text: "> td:eq(7)"},
                {text: "> td:eq(4)", link: "a[href*='downloadssl.php']:eq(0)", noblank: true}
            ]
        },
		onFilter: function(data, response){
			if (response.context.category === "movies_bluray") {
				return data.filter(function(){
					return this.textContent.toLowerCase().indexOf('remux') === -1;
				});
			} else {
				return data;
			}
		},
        icon: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAA7klEQVQ4jc2SoQvCQBjFv//H/2H2/QHrWzEIi0OwLM0gWETbhmHpMDqLQVhcOQwXxCCXNpYGGyw+0x3oubK0B6+9+937+D4iIvJWKcaY1GPLiUZ5Nl9gQoDN8QIu5JfX2zMsJ4IXxHi9KyhxIU1AwnIAQNv1X2FneUBZNwCAsm7AhURZN8MARVfywxRt1wMA9qfb8AgK8HpXukHb9Xo8pYTl/wF58dQBLiSu9we8INZhL4h1E5YVJoALafxgORFsdwfb3RlNDICq/QvwwxS/GtxCwnL4oXkXLCv0allW6EYTu8TRACKi2XyBMSYi+gCLK3pfts+WcAAAAABJRU5ErkJggg=="
    };
});

bt.addSource("CG", function () {
    var cg = "https://cinemageddon.net/browse.php?search={query}";

    return {
        url: {
            all: cg,
            movies: cg,
            movies_1080: cg + " 1080",
            movies_720: cg + " 720p",
            movies_remux: cg + " REMUX",
            movies_bluray: [cg + " BD25", cg + " BD50"],
            movies_dvd: cg + " DVD-R",
            docs: cg + "&c15=1",
            music: cg + "&c11=1",
            elearning: cg + "&c19=1&c5=1",
            ebooks: cg + "&c19=1"
        },
        onParse: {
            cleanup: [".torrenttable span"],
            row: ".torrenttable:last > tbody > tr",
            link_prepend: "https://cinemageddon.net/",
            sel: [
                {text: "a[href*='details.php']:eq(0)"},
                {text: "> td:eq(6)"},
                {text: "> td:eq(4)", link: "a[href*='download.php']:eq(0)", noblank: true}
            ]
        },
        icon: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAACkklEQVQ4jX2Ty0tUcRTHz3V0dBrvXB29M5RajulcnFuTw/WnXAkryFdFiWGhQQgFwdCDCKJatAgjcRHVKsqGpOxB9F70AF0Y9QdEi6JdEFS0CqLXvXxajGWhtfhuzoEP53vO+Yr/LMvQxhXUmCbdSv1Wh+OgLAvTMFgaEyZ2CV5ursS/ncZ/lmWwZxnxeBzXdXFdl5aWFhobGzEMA7tKuLXnHwAvJ/h3mvj+NMtAt/0bopTCsix0XUclhIcH/gPwchr+3cxfEKUUyWSScDhMW70wulV4cVz4OjYvYBby42mWwR6bAk2jrq4OXdeJhIS1tnBovfDggPDl/LyAWcjbm70Y4UIqSjUGVscYXBMnWlpAbaVwcJ3w5Ijw+ZzwamQOQPCumOzbVEVVucarEcG/p/An+/jwcCf24hKc2vwkI/3C5ub5APfbqF8UYke78Hx4pnYxiP+ok6nTnRRowuIKIVAghMPhuRa+P95IVbSIHe3C9OE/elfjvBxfSyAQwDRNEokEqVRqFvBtTHh/RvBuJMgsEZxaYWSL8Ho079fLaVzYvZBIJEI6ncZxHFpbW5FPZ/PnuZ4V9nYI3cuFUDA/4sqksL9LGN2S9xwJabSlyonFYjiOg+u6yLE+YUOTEA0LwWAQwzAwTRPDMAgGgxQXCWULhMpIgOFtMfzJPoazq4hGo3kLhYWF6LpOdXU1lmVh2zYNDQ2YpkltpTCxp4ybR5v4eMnCGy/Bu1GHP72dayd6KQ0VIQ319di2TSaTQSmFUopUKoVhGHQuE96dEbzLZXg5bXah1xbiT/UzPbYNaZlZxq8Q/Xrh4uJihlYKb07OnwFvIor/uAfpaW6mQym6ZtSeTpOsqaGkSDg1+PfbztF4iJ/rnQNd64LE/gAAAABJRU5ErkJggg=="
    };
});

bt.addSource("KG", function () {
    var kg = "https://karagarga.in/browse.php?search_type=title&incldead=&search={query}";

    return {
        url: {
            all: kg,
            movies: kg + "&cat=1",
            movies_1080: kg + "&hdrip=2",
            movies_720: kg + "&hdrip=1",
            movies_bluray: kg + "&hdrip=3",
            movies_dvd: kg + "&dvdr=1",
            docs: kg + "&genre=20",
            music: kg + "&cat=2",
            elearning: kg + "&cat=3",
            ebooks: kg + "&genre=41",
            abooks: kg + "&genre=40",
            comics: kg + "&genre=42"
        },
        onParse: {
            cleanup: ["#browse tr:has(a[href*='down.php']) span:not(:first-child)"],
            row: "#browse tr:has(a[href*='down.php'])",
            link_prepend: "https://karagarga.in/",
            sel: [
                {
                    text: function (context) {
                        var cols = context.children();
                        var year = cols.eq(3);
                        var genre = cols.eq(0).find("meta");

                        if (genre.length === 2) {
                            var src = genre.eq(1).attr('src');
                            if (~src.indexOf('hdrip720')) year.append(' [720p]');
                            else if (~src.indexOf('hdrip1080')) year.append(' [1080p]');
                            else if (~src.indexOf('dvdr')) year.append(' [DVD-R]');
                            else if (~src.indexOf('bluray')) year.append(' [Blu-ray]');
                        }

                        return cols.slice(1,4);
                    },
                    link: "a[href*='details.php']:eq(0)",
                    freeleech: function(context){
                        return context.hasClass("featuredrow");
                    }
                },
                {text: "> td:eq(12)"},
                {text: "> td:eq(10)", link: "a[href*='down.php']:eq(0)", noblank: true}
            ]
        },
        onPrepareQuery: function (context) {
            var i,
				len = context.url.length,
				year = bt.extractYear(context, true),
				res = bt.extractResolution(context);

            if (res === "720p") {
                for (i = 0; i < len; i++) {
                    context.url[i] += "&hdrip=1";
                }
            } else if (res === "1080p" || res === "1080i") {
                for (i = 0; i < len; i++) {
                    context.url[i] += "&hdrip=2";
                }
            }

            context.query = context.query.trim().split(' ');
            for (i = 0, len = context.query.length; i < len; i++) {
                context.query[i] = encodeURIComponent('+') + context.query[i];
            }
            context.query = context.query.join('%20');

            if (year) {
                context.query += "%20" + year;
            }
        },
//		onFilter: bt.requireAllWords,
        icon: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAACoElEQVQ4jeWSXUiTcRjF/5PCi0F00Wpgr1t7dR84F5MitQVddDFlOpTUGiRR4cqREKTJmLA1FssKTZ2hNslkaxJTl9MYKyd+ZMtZutShJI3elabvmm2jRSpPNyaJRHTduX7Oj/NwDkL/h8Lh8B6dVtsgl8u7xsbGcv/J7PF4dspkMg+VSoX4+HhISEgAuVzu9ng8BX/zUkiS5CkUCheGYUCn04FCoYBAIFjHcRxEoqNrDoejdPNarVbHTU9Oik3t7VUqpdKWm5P7KTU1FXAcBwaDATQaDdKPpBORSIQWCoWY0Wh0XygU2o0QQmhubk6Sn5f3gcPhAJvDBhaLBUwmE5hMJmAYBomMROByuaDX643bcvb09FTIZLJZoVAIPB4P+Hw+sFgswDAMMAwDPAmH5ORkYLPZ6/Pz84e2AcRi8deUlBRIS0sDiUSyrFKpeo+JRKt8Ph8yMzPWCgsLvUqlstPn8x3v6rDUkCTJIwhC7JuaylGr1XEoKysrJpVKCYfDcTkYDO5CCCGn06kymUx3zWazESFE6evurnvS2alpa22ubze2ND1oaWoJBAIHEUII9dntOoIgkn4likQiNIPB0GW1WnUWi6WuvrbWVHzq5GdD7Z2nVou5dXRo6Nq3YHA/Qoiy5ZXFxUWqy+XasdG9TFlZOSqVZH8/V3zGv7CwcHgDvtfneyvp7bGVT3u9W3cw7naXB/z+jMGB55eqKsr788UnfjQ3NjwkSZL7p50ghBB6/MikL5NfcJ89XfClrOT8uyulJVPGe4aOaq1mcNjlkndotc77Ot0zb//AzfcTE0Xh5WV2LBZL3ARkCgWrt29ct0WXlui/41dWVg68evni6uuRkbJGjWa439ja9nF2tmjcbtfZqm+98c/MZNdcVLh+As9+Owd6H2u5AAAAAElFTkSuQmCC"
    };
});

bt.addSource("TSH", function () {
    var tsh = "https://torrentshack.me/torrents.php?searchstr={query}";

    return {
        url: {
            all: tsh,
            movies: tsh + "&filter_cat[960]=1&filter_cat[300]=1&filter_cat[320]=1&filter_cat[400]=1&filter_cat[970]=1&filter_cat[350]=1&filter_cat[982]=1&filter_cat[983]=1",
            movies_1080: tsh + "+1080&filter_cat[960]=1&filter_cat[300]=1&filter_cat[982]=1",
            movies_720: tsh + "+720&filter_cat[960]=1&filter_cat[300]=1&filter_cat[982]=1",
            movies_bluray: tsh + "&filter_cat[970]=1",
            movies_remux: tsh + "&filter_cat[320]=1",
            movies_dvd: tsh + "&filter_cat[350]=1",
            tv: tsh + "&filter_cat[600]=1&filter_cat[700]=1&filter_cat[981]=1&filter_cat[980]=1",
            docs: tsh + "&action=advanced&description=documentary",
            music: tsh + "&filter_cat[450]=1&filter_cat[480]=1&filter_cat[984]=1&filter_cat[985]=1",
            music_flac: tsh + "&filter_cat[480]=1&filter_cat[985]=1",
            //		music_mp3: tsh + "&filter_cat[450]=1&filter_cat[984]=1",
            mvids: tsh + "&filter_cat[500]=1",
            apps_win: tsh + "&filter_cat[100]=1",
            games_pc: tsh + "&filter_cat[200]=1",
            elearning: tsh + "&filter_cat[180]=1&filter_cat[800]=1",
            ebooks: tsh + "&filter_cat[180]=1"
        },
        onParse: {
            cleanup: [".count_files"],
            row: "#torrent_table tr.torrent",
            link_prepend: "https://torrentshack.me/",
            sel: [
                {text: "a[href*='torrents.php?torrentid=']:eq(0)"},
                {text: "> td:eq(6)"},
                {
                    text: function (context) {
                        return $("> .size", context).text().trim().split(" ").slice(0, 2).join(" "); // buggy html at TSH
                    },
                    link: "a[href*='action=download']:eq(0)",
                    noblank: true
                }
            ]
        },
		onFilter: bt.filter3dMovies,
        icon: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAACRklEQVQ4jU2TS3LjOBBEqfYcRiLAmQgC0K4tfn0yqk/jFiECtMWP3DPbluUrvVmAYvQCEQCDVZVZmRntTIncF0idk5gCYXKELtcjVR2+qQypD0idI3TNVmdIVRI9CqQqiVXBzpTsTI5UJYl+XooO7PQLsSoQumRnaqTOifUzkdQ5sSqQpiLeVwhdkpiC9m2mdTOnfkKqErE0lfqwNpI6J5IqUNjqgq2uSHTFyQ20/oLtJ2w/0bqZfxZkO1OvzYRZGsQ6C3tQJa2/0PXjOt26mbO/0nYD0lQLvRqRFkjzQrQ1z0hTkagS2w+c/cDZT1h/xforZz/x0494/0HrRxKVI9KC7b58LPGASCtaN2P9eyjuJ1o/hsl+5KefeXUDZ3/F9hPCHIj3FVIfiERaBaj9QNd/rLxtP2HdiPVX7seIe7Phdgzn8U5USRTrjNP7R4DsLguFAN26C62b+Woi7s0T9+aJzybidnzidtwsKpgA5dWFqedFvvOC5vQ20HaB0u244fPHN2SakeiKWFVEsSqC7n4MkN1I14/L9qfA242c+ol7s+F3Ey3OfCbRFdHDhbaf/ii4YJcFdt2MdTPWX/k6fuN2fEKal9XeUbx42vYTbTeEn/thbXD202KqgXuz4ev4FyKt1sxEUh+QaYZ7/zfo3ge9WzfjL/9h33/Rvf3i1V35/BHxu4lCTkwWnBirArkvECpDqIw4/U5ispA6FdCJtOBvUyPSOuTBVOzU94BA6HKBU/O4r2FRJcIclhDlSFMFEy20ha75H69lPsKUP3Y4AAAAAElFTkSuQmCC"
    };
});

bt.addSource("RarBG", function () {
    var rarbg = "https://rarbg.to/torrents.php?search={query}";

    return {
        url: {
            all: rarbg,
            movies: rarbg + "&category=14;48;17;44;45;42;46",
            movies_1080: rarbg + "&category=44",
            movies_720: rarbg + "&category=45",
            movies_bluray: rarbg + "&category=42",
            movies_remux: rarbg + "&category=46",
            tv: rarbg + "&category=41",
            docs: [rarbg + " documentary&category=movies", rarbg + "&category=18;41"],
            music: rarbg + "&category=23;25",
            music_flac: rarbg + "&category=25",
            //		music_mp3: rarbg + "&category=23",
            elearning: rarbg + "&category=35",
            ebooks: rarbg + "&category=35",
            xxx: rarbg + "&category=4",
            games_pc: rarbg + "&category=27;28",
            apps_win: rarbg + "&category=33"
        },
        onParse: {
            row: ".lista2t tr.lista2",
            link_prepend: "https://rarbg.to",
            sel: [
                {text: "td:eq(1) a:eq(0)"},
                {text: "> td:eq(4)"},
                {
                    text: "> td:eq(3)",
                    link: function (context) {
                        var link = context[0].firstElementChild.nextElementSibling.firstElementChild;
                        var id = link.getAttribute("href").split("/").pop();
                        return '/download.php?id=' + id + '&f=' + encodeURIComponent(link.textContent.trim()) + '.torrent';
                    },
                    noblank: true
                }
            ]
        },
        onValidate: function (response) {
            return response.finalUrl.indexOf('/bot_check.php') === -1 ? true : "captcha";
        },
		onFilter: bt.requireAllWords,
        icon: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAABs0lEQVQ4jYWTP4jXMBiGK3IIde5cHG6wi1MRp04u2TNKxoNsQjaR4HAIhduy3FREDqFznBwyZxSyOBXH4CBC4RCR54a2P+9PDwPv8r0fT96PLymAB0ANvAHeA6c7OgGO194bKoAXwBf+f34Bb4Gj24DXwM+QMtJEpL0pZSPGJULKG+hsF+BjplWBTgdata8xZIBL4OndBDHT6YDQAdMnQsyEmDEuIfQCVjYyLylOdgHCBIQJuDFtcf/mDNJGhAlIG8nLJO92AdIE5C3ANM0ou9R1f0ig7gfYgHWREDM+TJg+Io2nU57Bp20bT+4BeKTxCD3SyGGRWGRd3FKd7m8hTDTCUXc9rXQINVB3PXXX0wjHNM3b7ce7gNEnysZQNgZtRwC0HSkbQ9UahB62BJ+BRzuASNloylqhzdI8zzOtsP/qK/j6GNcAgaKWFJVEGQfwB7iMaaJqFOXqucFvEAUcHQDDGCjKjqLskLoH+MHywX67wVNUi1dUAh8iwHfgVQG8BGLOMzEmQkxMUwb4usY8A4gpHfyUJoBvgCzWpmfAOXABfAQ+AM9X7/H68j6t3gUwrP7DKzy0Ezk+OKScAAAAAElFTkSuQmCC"
    };
});

bt.addSource("TL", function () {
    var tl = "https://www.torrentleech.org/torrents/browse/index/query/{query}";

    return {
        url: {
            all: tl,
            movies: tl + "/categories/1,8,9,10,11,12,13,14,15,29,35",
            movies_1080: tl + " 1080p/categories/13,14,35",
            movies_720: tl + " 720p/categories/13,14,35",
            movies_bluray: tl + " (AVC OR VC-1 OR BD25 OR BD50 OR COMPLETE OR M2TS OR ISO) -x264 -re-encode -re-encoded -bdremux -remux -3D -720p/categories/13,14,35",
            movies_remux: tl + " (REMUX OR BDREMUX)/categories/13,14,35",
            movies_dvd: tl + "/categories/12",
            docs: tl + "/categories/29",
            tv: tl + "/categories/27,32,35",
            mvids: tl + "/categories/16",
            elearning: tl + "/categories/5",
            games_pc: tl + "/categories/17",
            apps_win: tl + "/categories/6,23,33",
            ebooks: tl + "/categories/5"
        },
        onParse: {
            row: "#torrenttable > tbody > tr",
            link_prepend: "https://www.torrentleech.org",
            sel: [
                {text: "a:eq(1)"},
                {text: "> td:eq(6)"},
                {text: "> td:eq(4)", link: "a[href*='/download/']:eq(0)", noblank: true}
            ]
        },
        onValidate: function (response) {
            return response.responseText.indexOf('/user/account/signup') === -1 ? true : "login needed";
        },
        onFilter: [bt.requireAllWords, bt.filter3dMovies, function (data, response) {
            if (["elearning", "ebooks"].indexOf(response.context.category) !== -1) {
                return data;
            } else {
                return bt.requireAllWords(data, response);
            }
        }],
        icon: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAACfUlEQVQ4jaXST0jTcRjH8edQaWB5EG+GkhCY6aFmp2Qzm6bhRZBE0BnRoUsGm3oYLNOyCZqVKRNBMEHm9OBaEoontUMF9kcwEiwmsgIHkr9995sb/N4dRhODvPTAc/nA8+Lh4RH+s+TvwOv1UlVVhdPpTGU+nw+32017ezsWiwWHwwGAYRj7gN/vZ2BgALfbja5HycrKSgEul4vlnWFmt1082DiLiBAKhVBK7QN9fX3EE3H24ntEdYXI/nJ2u53X2528CDVxcz4DEWFxcZFwOJwEvF4vHR0dxON7xPZiRJSGiJCWlobH48FmszEesvHw2zmuPjqOiDA1NcXW1lYSqK2tRY/p6DGdqK5Y+7LG5KSXpeUl8vLyqKioYHCzEsfXk1y6m4aIMDY2RjAYTAIFBQWoaAQVjfDjZwh3j5v6+uvYHXZEhKKiIp4Gy/4NtLa2kp2dTURpvHv/lsamRkQEEaGuro78/HyeBM3/BgByc3OJKI3V1c8poK2tjZ2dHQoLC3kWvHw4YDKZUFHFrvaLrq5ORISFhQUASktLeb5ZcThQUlJCNKqIKI2XAT8igqZpANTU1DC0WX04kJOTQ0RpaJFdlt8spW7Q399PeXk5Pd/Pc2shgwu2Y4gIo6OjBwER4eOnD8z4Z/AMe3jc38er2QAiQmZmJreXT3DlXjqnLUcQEUZGRvaBRCJBQ0MDIkJLyx2qr1VTVlZG843m1CbW++mcqTzKqYtJYHx8PPlIhmGg6zrr6+tYrdbUwJ82mUyYzeYDWXFxMfPz88lXNgyDRCJBOBxmZWWFiYkJuru7cTqd9Pb24vP5mJubY3p6msHBQYaGhggEAmxsbKCU4jcmF8IcHBr/0wAAAABJRU5ErkJggg=="
    };
});

bt.addSource("AR", function () {
    var ar = "https://alpharatio.cc/torrents.php?action=basic&searchstr={query}";

    return {
        url: {
            all: ar,
            movies: ar + "&filter_cat[6]=1&filter_cat[7]=1&filter_cat[8]=1&filter_cat[9]=1",
            movies_1080: ar + " 1080p&filter_cat[7]=1&filter_cat[9]=1",
            movies_720: ar + " 720p&filter_cat[7]=1&filter_cat[9]=1",
            movies_bluray: ar + " COMPLETE&filter_cat[7]=1",
            movies_remux: ar + " REMUX&filter_cat[7]=1",
            docs: ar + "&filter_cat[1]=1&filter_cat[2]=1&filter_cat[3]=1&filter_cat[6]=1&filter_cat[7]=1&filter_cat[24]=1",
            tv: ar + "&filter_cat[2]=1&filter_cat[3]=1&filter_cat[5]=1",
            mvids: ar + "&filter_cat[11]=1",
            elearning: ar + "&filter_cat[21]=1&filter_cat[22]=1&filter_cat[24]=1",
            ebooks: ar + "&filter_cat[21]=1",
            abooks: ar + "&filter_cat[22]=1",
            games_pc: ar + "&filter_cat[12]=1",
            apps_win: ar + "&filter_cat[16]=1",
            music: ar + "&filter_cat[23]=1",
            music_flac: ar + " FLAC&filter_cat[23]=1",
            xxx: ar + "&filter_cat[10]=1&filter_cat[20]=1"
        },
        onParse: {
            row: "#torrent_table tr.torrent",
            link_prepend: "https://alpharatio.cc/",
            sel: [
                {text: ".group_info > a:eq(0)"},
                {text: "> td:eq(7)"},
                {text: "> td:eq(5)", link: "a[href*='action=download']:eq(0)", noblank: true}
            ]
        },
		onFilter: bt.filter3dMovies,
        icon: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAACO0lEQVQ4jWNgoCV4euep7PTNv1Lv3n0mR1DxqlWrmK/evq117e5d1du3Hylfv3tXraF7fS+H27H/BdWLF9y581jl2bNnXDgNuH37kbJz0+ZD3GXnvjHXPPrPkbbtP2vO1f+suVf/Mxc+/s9SduW/XNWJxztO3fDA6xKrtmMnGdq//xdVD/2vGbDvgVfK9kOMHr/+C+ql/Gds/fxfqObGuydPngjjNMC54+BBxtZP/7nsVv6fMOd4+YZtJ0IYPT795zJZ+p81/8R/xqYP/7fvO+iF0wCntoMHGFs+/Bd2nv7tyZMnMs+ePeNSDz5xl9n96X+29J3/GVs+/V+7eWcITgMc2w4eYGz99D89o30dTKxj0oFGFts9/5kanvznrb716cGDB5J4DWBo+/J/856TAfdevhRft/dMaEbP6tksuaf/M1T9+9+/+kgJ3kC0bTxwjLH18/9dRy+4bTt+1dOz68BO56bt+1mqHv1iiPj7v6Tz6EScmh/euqXEG3f5O0Pr5/87Dp9Fia6cmXsnM5T9+y/qff7d8+fPRbEaUNq6vY8h6d9/hrav/+cu35yKLHfh6m1txsoH/xnCf/+fMO9AIYrGx48fc+7Zc8SR3+PSJ4aSv/8Z2n/+r+lf1Hbv3j15qBLGM2fOGCkV77zHUPbvv1rUmTtHTpy1gBuwbvuxUNWkZXdVk/fcVSnbc1elbPdd1cwld12LZu9hYGBguH73rppOzpLrqsXb7qqW7b2rGrrzrpb/gutIFgwgAACAXCA9/NcOuQAAAABJRU5ErkJggg=="
    };
});

bt.addSource("DS", function () {
	// NB: Search in multiple categories at once doesn't work
    var ds = "https://www.dvdseed.eu/browse2.php?wheresearch=1&incldead=1&search={query}";

    return {
        url: {
            all: ds,
            movies: ds,
            movies_1080: ds + " 1080p&kopia_reencode=1",
            movies_720: ds + " 720p",
            movies_bluray: ds + "&pkat_bd25=1&pkat_bd50=1&kopia_clone=1&kopia_modify=1&kopia_custom=1",
            movies_dvd: ds + "&pkat_dvd5=1&pkat_dvd9=1&kopia_clone=1&kopia_modify=1&kopia_custom=1",
            tv: [ ds + "&c74=1", ds + "&c31=1" ],
            mvids: [ ds + "&c6=1", "https://www.dvdseed.eu/browse.php?id=3&t=3&c5=1&wheresearch=1&incldead=1&search=" ],
            docs: ds + "&c69=1",
            abooks: ds + "&c98=1",
            apps_win: ds + "&c27=1",
            music: ds + "&c91=1",
            music_flac: ds + "&c91=1",
            xxx: ds + "&c9=1"
        },
        onParse: {
            row: "#torrentable tr:gt(0)",
            link_prepend: "https://www.dvdseed.eu/",
            sel: [
                {
                    text: "a[href*='details.php']:eq(0)",
                    freeleech: "meta[src*='/free.png']"
                },
                {text: "> td:eq(6)"},
                {text: "> td:eq(5)", link: "a[href*='download.php']:eq(0)", noblank: true}
            ]
        },
        onFilter: function (data, response) {
            if (["movies","movies_1080","movies_720","movies_bluray","movies_dvd","tv"].indexOf(response.context.category) !== -1) {
				var stoplist = ["dtsflac","3d1.png","audiobook","music.png","porn.png"];
				var stoplistLength = stoplist.length;
	            return data.filter(function(){
					var html = this.innerHTML;
					for (var i = 0; i < stoplistLength; i++) {
						if (html.indexOf(stoplist[i]) !== -1) {
							return false;
						}
					}
	                return true;
	            });
			} else {
				return data;
			}
        },
        icon: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAADYElEQVQ4jZXTzU+TBwCA8TcZ9ON9W1r5yACHglABEfmmfCgiieKmuFnoLKW80FqIbM7FjMOyiTDcYXWJh2FxTqqFQCUM2ehaKK5I8DA34/y4sECG240hySK4ZM5Jnh2227LDDr88f8EjrD6F8J15co55/5fwnXlWn4KwvPo7/cGbvNbWSUbpftLKTaTusrBll+Wf1pNSYSF+dyti1Sni6j4hXvbyfu8odxcfIXy3sERlez+R+TLV+6vp93q56ruKz+fD5xvENzTE4OAA3d1n2FFYhq68Damun/TmC3R4phDe9HyPovYKytwjWK1Wrk9dZ3JygkDQz/R0mOXlZdb/XGf18WNcLhdxydkoTR4iLMMY3gogqBv8KF79lHijGVuDDddHZ6mtqyOr7BWKqm18fO48KysrPHv2B8FggLQd5Yi1l1FYx1BaxxAkx9coq06z5+VabkzfYGF+gQabDY3xGOq8Jsy2Fn5cXGR1bY3OD7p4MS0PsW4ApW0clc2PoJEDiMY2jh518uS3J9y/f4/qfftQJOZiKKqmp/ciS78scfvb2+SVViBVvIOm8SvU8gSqxgCCZBkmpuB1ujq7eL7+nIc/PeSzvj5cLhfXRkfxeC4jN8mUlpQhanREJBWjKLCjOtiDujGAIJr6MJTU4Ha7mZv7gXsPHvDNrVvMzs7iOuvCad7JlfYsJs5sI/RhBuNdmbQ35xJV2IDa5kdItFwgLz+L1IztZOeXkJ1vJDvfyPbcQuITNnLxxBbGTxuoMcZQvFVDYWYMW41VaM1etI4wgt4RIsbqRTp8Ca3pElEmD1GH+9Ad6iEyIYcv3k1muH0TOSkq4nQRxMTGIuWZEetH0DpnEDTOGf42i67lJhtaZ9E7w+hlP+oCO8dNBsIdScyc2kj4vUSunXwJc2UKUnEzkn0KIaFlDI0jjNYxjdYxg9Y5jd4+ib5hFHFvNxsyKylM12Mxamjdo2XkjWjGT8SiS9qGyjKCcPzcKInOL5HkIFJzCMkeQiv70daPoCpqJTkllZwkFQVJL7DboKDXIjLojCJ6cxab7EMIcz8vcdIdIK55BLHRj9joR2MdQzriIzL9AG/vjWZAVjHcpMInq3FbRGpKN1NS48TtCyEAeEN3/3PbhJ3yv6SZOjnU8TmPfl3jL7D9OQgYKA4vAAAAAElFTkSuQmCC"
    };
});

bt.addSource("EBZ", function () {
    var ebz = "http://elbitz.net/browse.php?incldead=1&typ=0&search={query}";

    return {
        url: {
            all: ebz,
            elearning: ebz,
            docs: ebz + "&c10=1",
            ebooks: ebz,
            mags: ebz + "&c16=1",
            abooks: ebz + "&c6=1"
        },
        onParse: {
            row: "tr:not(:has('tr')):has(a[href*='download.php'])",
            sel: [
                {text: "a[href*='details.php']:eq(0)"},
                {text: "> td:eq(6)"},
                {text: "> td:eq(5)", link: "a[href*='download.php']:eq(0)", noblank: true}
            ]
        },
        icon: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAABrElEQVQ4jWNgQAO3b99mX7NyempyvO0RazOuH+bG7H+x4R07loWh62W4evWUQViw7lVcmmDYwoTj192719VQNJ85s9/G0VboAyHN5sbsfxvqkhegaH769I6sm6PEK0K2+ngpPZg1o6nmzJkzrCgGVJSGr0DXEB6qf/nQvo3et2/fZsfwKzJ48uS2DHpgRYWbnH/37i4/Xo0wsGnTolh028+c2W9z+PBWj4QYyxNhwbpXseFD+zZ6MzAwMDBMn1pXj6zZzVHi1bt37/gd7UTe4QuTixcPmzMwMDAwTJxQ2Y4s4eOl9ODBgweSFibsf3Bpjo2yOLVq1SpmBgYGBoali/oKkSWtzbh+vHx5T7ymMnYpNs1pSY4H7969KwcPg/OnDlqhK+rpKuxjYGBgvHr1tOGZM/ttYPjWrcuaGIG4atUq5kA/jVuocc7+Z9aMphq4MwmBXdtXhGJzrp+36r26moQFPV2FfT1dhX1zZrVWPnhwQxGrIZ3tuZOJScb21oKf9+xcE4DVK/3dJb3EGOLmKPHq7du3fFhdcvjwVo/YSNNzhAw5cmCbJwMDAwMAh9dGMcvzkAcAAAAASUVORK5CYII="
    };
});

bt.addSource("Traum", function () {
    var traum = "http://lib.it.cx/?find=";

    return {
        url: {
            all: traum,
            elearning: traum,
            ebooks: traum,
            fiction: traum
        },
        onParse: {
            row: "tr:has(a[href*='epub']):not(:has('tr'))",
            link_prepend: "http://lib.it.cx",
            sel: [
                {text: "a:eq(0)", noblank: true},
                {text: "> td:last"}
            ]
        },
        icon: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAM0lEQVQ4jWPo3v7gPyWYoXv7g/9y2ZvJwoPIAGwYm2KsYYAN4DIAq+JRA0YNoKkBxCZbAF6fe55MSrHNAAAAAElFTkSuQmCC"
    };
});

bt.addSource("Genesis_NonFiction", function () {
    var gen = "http://gen.lib.rus.ec/search.php?open=0&view=simple&column=def&req=";

    return {
        url: {
            all: gen,
            elearning: gen,
            ebooks: gen
        },
        onParse: {
            prepare: function (response) {
                if (response.responseText.indexOf('<table width=100% cellspacing=1') === -1) {
                    return "<table></table>";
                }

                var html = response.responseText.replace(bt.imgTagRegex, '<meta ').split('<table width=100% cellspacing=1')[1];
                html = '<table width=100% cellspacing=1' + html;
                html = html.split('</table')[0];
                html += '</table>';

                return html;
            },
            row: "tr:gt(0)",
            link_prepend: "http://gen.lib.rus.ec/",
            sel: [
                {text: "a[href*='book/']:eq(0), > td:eq(8)"},
                {text: "> td:eq(7)", link: "a[href*='/get.php']:eq(0)", noblank: true}
            ]
        },
        icon: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAABkElEQVQ4jaWTvUtbYRSHXV5KpgydxEkcOohUkESNF6RaDIhoqYNDl4o6aNvBj6VIktdrFBFNU100BGnFKIIZxIA2JVkUvSZim8SP+JmIzvdfeDokm2Ju6PDjwBkeznkOp0TXs/xPSp5qZu4zSF+I+fUokViyeICuZ/nwNYCwOhA1DjpHVooHaIkUY4u/mFndY8i7YxwQ3o/z0blB6+cfvO3186Z7gfYvy3yaDHJ6fVEYkHnIUNU1h1BUhOLOVxVhk0hfyNgK679jiGoHJmWM8jYPrzo8mJVxfob2jDuIxJKkrm6JxE/Y2j1me/8vB4mz5wFaIoW9x0+pfZoXNhfC4kRYZD5OhFViH1h6foLhb5uIOomwSYRNRdS78sn1zE3uwis09vlz4urzU1hdiFoHok7y+v1cYUBgR6PynZfB2U0C2xqHqUuO03f8SV+TTJ8bk6jrWU5vblkLa/RPBHnZME4wemTsCiPeMObmyZwLizPnwyqJxB//xZOAYPSIspYpRIOKSVGpaPcw+n2ruF8wmn/uAT7c5N64IAAAAABJRU5ErkJggg=="
    };
});

bt.addSource("Genesis_Fiction", function () {
    var genf = "http://gen.lib.rus.ec/foreignfiction/?s=";

    return {
        url: {
            all: genf,
            elearning: genf,
            ebooks: genf,
            fiction: genf
        },
        onParse: {
            row: "tr:has(a[href*='foreignfiction/get.php'])",
            sel: [
                {text: "> td:eq(0), > td:eq(2)"},
                {text: "a[href*='/get.php']:eq(0)", link: "a[href*='/get.php']:eq(0)", noblank: true}
            ]
        },
        icon: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAABh0lEQVQ4jY2SoYvUQRiGP5bjwiGyiBhETIssDPx+M88DhxgMIodcMBhNBoNc8i8QDCKHwWAQMZjEICIGg+G4dEkOEcMhYhARk4gsIrLIWmZlXXfX+2DSzPvOM++8EQumlHIaaCJiadG5maNeVkfqCBgAW8CNnPO6enihuJRyXh2ODaYX8EvdA279I845n1K/q9tt254ALgC31d0qnDR6No3dV7/UA2/Vm+par9c7WM276ou6/yqldGAS+6j6YQ72UN1VH1eKj8A59e4Yuwu8nvfmKexBzjkDV4GXkVJaVrf3I1aHOef1iAjgnvom1Gv7FI9KKVdqVhfVIXAm1D31obqhPlW/zUHfjIho23ZV/aFuREUZjLEiIlJKy7WBm+NcgEcR0Wma5hjw6U941WAHeBARnVmlaprmSEQsqSu1C1sxWe22bVeBr+pn9X5t4cqUT6d+4buU0qFZ7esCl4AnwKC+8XnN5Xgp5Xq9pD+L8q+p37oG3FHf1wx+llLO/lc8a9Q+cHLe/m9CrdD4hthLEQAAAABJRU5ErkJggg=="
    };
});

bt.addSource("HDClub", function () {
    var hdclub = "http://hdclub.org/browse.php?incldead=1&stype=and&search={query}";

    return {
        url: {
            all: hdclub,
            movies: hdclub + "&c70=1&c71=1",
            movies_1080: hdclub + "&cr2=1&c70=1&c71=1",
            movies_720: hdclub + "&cr1=1&c70=1&c71=1",
            movies_remux: hdclub + "&cr3=1&c70=1&c71=1",
            movies_bluray: hdclub + "&cr4=1&c70=1&c71=1",
            music: hdclub + "&c81=1",
            music_flac: hdclub + "&c81=1",
            tv: hdclub + "&c64=1",
            mvids: hdclub + "&c68=1",
            docs: hdclub + "&c78=1"
        },
        onParse: {
            cleanup: ["a[href*='&snatched']"],
            row: "#highlighted > tr",
            link_prepend: "http://hdclub.org/",
            sel: [
                {
                    text: "a[href*='details.php']:eq(0)",
                    freeleech: "meta[src*='free']"
                },
                {text: "> td:eq(-3)"},
                {
                    cleanup: ["> td:last b"],
                    text: "> td:last",
                    link: function (context) {
                        var link = $("a[href*='details.php']:eq(0)", context);
                        var id = link.attr("href").split("id=").pop().split("&")[0];
                        return 'download.php?id=' + id;
                    },
                    noblank: true
                }
            ]
        },
        onPrepareQuery: function (context) {
            var i,
				len = context.url.length,
				year = bt.extractYear(context, true);

            if (year && year.length === 4) {
                for (i = 0; i < len; i++) {
                    context.url[i] += "&dsearch=" + year;
                }
            }

            var res = bt.extractResolution(context);

            if (res === "720p") {
                for (i = 0; i < len; i++) {
                    context.url[i] += "&cr1=1";
                }
            } else if (res === "1080p" || res === "1080i") {
                for (i = 0; i < len; i++) {
                    context.url[i] += "&cr2=1";
                }
            }
        },
        onFilter: bt.filter3dMovies,
        icon: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAABJUlEQVQ4jc2TMYrCYBCFJxEEDWkS7SWFwRNEcgMba2s9gT94A49gE0hShdT2qRMDOYCFpbESK8H222JZ2cVdFbexeNXAN2/ezIiu6/xH8j4AEbktivypG4BpmjeAZrNJu93GMAw6nQ62bWPbNo1G4woREaHb7VKWJa7rfi8wnU5JkoQwDKnrmv1+z+FwYLvdMhqNvtwIpmlyPB7p9/s/bCqlKIoCx3EYDod4nofv+6xWK87nM47jIIPBgDRNuVwurNdroigijmOCICBNU7Is+zWDuq6ZzWavAVqtFqfTiclkcn+E+XxOnueMx2OUUiilWCwWVFXFbrfDsqznQlwul2w2G/I8pygKoiii1+t9Nnq0RsMw7t7CU4ek6zqapl31pr/wqj4A0+pxDcsltyEAAAAASUVORK5CYII="
    };

});

bt.addSource("BlueBird", function () {
    var bird = "http://bluebird-hd.org/browse.php?incldead=1&stype=and&search={query}";

    return {
        url: {
            all: bird,
            movies: bird + "&c1=1&c2=1",
            movies_1080: bird + "&c1=1&c2=1&cr3=1&cr5=1",
            movies_720: bird + "&c1=1&c2=1&cr4=1&cr6=1",
            movies_remux: bird + "&c1=1&c2=1&cr2=1",
            movies_bluray: bird + "&c1=1&c2=1&cr1=1",
            music: bird + "&cr7=1",
            music_flac: bird + "&cr7=1",
            tv: bird + "&c6=1",
            mvids: bird + "&c4=1",
            docs: bird + "&c3=1",
            xxx: bird + "&c7=1"
        },
        onParse: {
            cleanup: ["a[href*='&snatched']"],
            row: "#highlighted > tr",
            link_prepend: "http://bluebird-hd.org/",
            sel: [
                {text: "a[href*='details.php']:eq(0)"},
                {text: "> td:eq(-3)"},
                {text: "> td:last", link: "a[href*='download.php']:eq(0)", noblank: true}
            ]
        },
        onPrepareQuery: function (context) {
            var i,
				len = context.url.length,
				year = bt.extractYear(context, true);

            if (year && year.length === 4) {
                for (i = 0; i < len; i++) {
                    context.url[i] += "&dsearch=" + year;
                }
            }

            var res = bt.extractResolution(context);

            if (res === "720p") {
                for (i = 0; i < len; i++) {
                    context.url[i] += "&cr4=1&cr6=1";
                }
            } else if (res === "1080p" || res === "1080i") {
                for (i = 0; i < len; i++) {
                    context.url[i] += "&cr3=1&cr5=1";
                }
            }
        },
        onFilter: bt.filter3dMovies,
        icon: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAC20lEQVQ4jY3IS0zTdwDA8Z+LO3gZiUumiS8ooqWlhE2lrDWxlocmUBSjpfpnUdSAAVFidOWPKxYw5VUKRmtbCxUwlgJFYbUKCOhkPoIv4pOoyWJ2miZbNEu223cHk2WLienhc/mI0OVRjM4z6D196NzBmOg9Ida5AvgHhxG6Y63kvPiT7Nn3ZD9/F6P3bHj1F2vbAojU6ib0E0/JiN4n43KMovfRjT/h29YOhLq8Ck3HEBpvmFTf4EfUngGS3f2oTn+g9gyg8Q6SFoiwqroBkbSjhG8afay0uVDIzSjkln8lVDWTYj9BeqOXNQ1e0ht9pNWfIsHaRHy1k5SSQ4jUwmKsF8ZZf8zJfEspC4vKWVhUzgKpjK+kMuqvTNE/+ytdM69w33qMPTrFns4Bkg/8gKJAQqRttnD04iT6ChmRtpa5WiNz0418ttrA5xmZeH9+yPmZl+xp97PL5aPU3Y1taIJSf4jEnE0IVbaJushP7D3RSc5BmXxrLQVyPdtsDeRUWAk+mKUlMoFYvAKhSEEkqNlwUMYxehvtFgmhysyl5sI4zePTdNx9Tt+z10R/ecvN3/+m98Es/hv3ONoTRixOYk5iCmLRcpR5Zhyjt9EX7kSk5m3FNjRJgd1J4mYJpbkYpbkYlWU38SYLS3LNxJsszDfk8uX6PBZkbUJqcmMbvsbqrUWIVduLsYbHMMgO5m00E5cvEZcv8UXeDuJMEnLfJfy3HtF69Q51w5PIAyNUha9ibu9EYSpEaL7bx66eYXTHT7GoooZllbUsq6xlaaWdpZV29g+OUT8xzfc/Xqeif4R9wSgFniCJRxwod5YhlCWHUJ/sJbmtB1X7uf9rO8cKZxcrnV0oW7tJdvWgdHWT1HIW9clevj5ch9AcOY42Ms2a8NQn3PiPD6eNTKNtOI1Ir3GS9eQPjDNvMD78LWZZz96hawsgvP0XyfT1YQiNYQiOxCY0hjEwhOPsef4BcnJ19Gval0YAAAAASUVORK5CYII="
    };
});

bt.addSource("Rutor", function () {
    var rutor = "http://rutor.org/search/";

    return {
        url: {
            all: rutor,
            movies: [rutor + "0/1/100/0/", rutor + "0/5/100/0/", rutor + "0/7/100/0/"],
            movies_1080: rutor + "0/0/100/0/1080p ",
            movies_720: rutor + "0/0/100/0/720p ",
            movies_remux: rutor + "0/0/300/0/remux|bdremux ",
            movies_bluray: rutor + "0/0/310/0/bdinfo -bdremux -remux -hdtv -bdrip ",
            movies_dvd: rutor + "0/0/300/0/dvd|dvd5|dvd9|dvdr ",
            music: rutor + "0/2/100/0/",
            music_flac: rutor + "0/2/100/0/FLAC ",
            mvids: rutor + "0/2/300/0/-mp3 -flac -ape -aac -alac ",
            tv: rutor + "0/0/300/0/720p|1080p ",
            docs: [rutor + "0/12/100/0/", rutor + "0/6/100/0/"],
            games_pc: rutor + "0/8/100/0/",
            apps_win: rutor + "0/9/100/0/",
            elearning: rutor,
            ebooks: rutor + "0/0/300/0/pdf|epub|fb2|djvu|chm|mobi|doc ",
            fiction: rutor + "0/0/300/0/pdf|epub|fb2|djvu|chm|mobi|doc ",
            abooks: rutor + "0/11/300/0/flac|mp3 ",
            comics: rutor + "0/0/300/0/CBZ|CBR ",
            mags: rutor + "0/0/100/0/PDF "
        },
        onParse: {
            row: "#index > table:eq(0) > tbody > tr:gt(0)",
            link_prepend: "http://rutor.org",
            sel: [
                {text: "a[href*='/torrent/']:eq(0)"},
                {text: "> td:last > span:eq(0)"},
                {text: "> td:eq(-2)", link: "a[href*='/download/']:eq(0)", noblank: true}
            ]
        },
        onFilter: [bt.filter3dMovies,bt.requireAllWords],
        icon: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAClklEQVQ4jZXSS0hUcRTH8TPXe//Xmes0apqWJQxZDBUFhhSUEbRoFUUSRBC0CFr0WLWqRWLtgloKRVowBJq06IFOr+mhmTXKWD6oHHMcNJsevmbGx9W+LVyEaEW/9TkfDoefyF+S+lrF9Iifv838MTPxo0TqSoje2cJU/Nj/IdOxrby/6KbK48Cfo9Fx3ondv/HfiD1awVjIonm/cFd0gpJGeEcmnWc20HTI4HvAxB4+vjg0k9zHjxfCgw0aDZJOdLeTb2UGoVyd8NFCYrVFBIoN4nVCIrp+PoJdyqca4Y5X8VQMBk654ItirN4kmmvwUoTBGg/RCxnUmorOCg17IH8OmZ1ZRbhS8CuNp6IRO2GBrZgd0xm65OKHOBgRjXe7FKlXbhpNHb84aD6rwcQyJPW5mHC5okYUbQ6TN8VOItezebxHMfnRYuqIyZRoxHwGY+0eWpeb1IlOuNwi1rNu7orBKoN7mk6XQ6NL0mgUk5AYhEoV9ocMEmUmQ6UuUs8tWrJ0HiqDVP2S33+YaMzjkVejRRQD+YrEfkVyu4uPotNels7IEzfJF06+XLMIaornawwSrTnzH9l12qRedAYrPNjTGUwOWcxUKnoPOhjtdgEGHSctGkSn7YDO61DJfGA44KJpbzrDb3K4u80kWGrSX69I9Cq6rpq0XXQxHc0jsNpFX2XWwi6Mfs6hr8Hi1mYnD0XntaQTEJ0GQ+O+GNwSRXO5l07/JuKhpQuBxp6dPDtncEXSeCYGraLzVoQ2EVpFCIrOZdG4cbiAie7cxdsYb/FQvcLi9ko3jwo9BAszCXpzeVKUx/21BVT7VtJ+08f4vVWLA3Z/JqmIm+T7bJKRfMYjhUxFVzMRLSLV52NywMfP70Xzln8BusiizCnLlwcAAAAASUVORK5CYII="
    };
});

bt.addSource("AvaxHome", function () {
    var q = "http://avxsearch.se/search?q={query}";

    return {
        url: {
            all: q,
            movies: q + "&c=54",
            movies_1080: q + " 1080p&c=54",
            movies_720: q + " 720p&c=54",
            movies_remux: q + " remux&c=54",
            movies_bluray: q + " m2ts&c=54",
            movies_dvd: [q + " DVD&c=54", q + " DVD5&c=54", q + " DVD9&c=54"],
            music: [q + " mp3&c=2", q + " flac&c=2", q + "&c=568"],
            music_flac: [q + " flac&c=2", q + " flac&c=568"],
            mvids: [q + " video&c=2", q + "&c=54"],
            docs: q + " documentary",
            games_pc: q + "&c=3",
            apps_win: q + "&c=10",
            elearning: q,
            ebooks: q + "&c=5",
            fiction: q + "&c=5",
            abooks: q + " mp3&c=5",
            comics: q + "&c=665",
            mags: [q + "&c=6", q + "&c=151"]
        },
        onParse: {
            row: ".article",
            sel: [
                {text: "a.title-link:eq(0)"}
            ]
        },
        onFilter: [bt.filter3dMovies,bt.requireAllWords],
        icon: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAABRElEQVQ4jbWTsc2DMBBGPQCIElHQIFEwAKJgBmTJe4DEFImURYA1PAJM4A2c0s37K5+SEKQ0vyWL6t4933co9U8HpRTzNHIcO8exY63lOHZ+Ks7SBKUU3j/lOucE9FNxCAHvn9IZwDmHtfYSQpYmAgDw/klTVxg9EEIAEMAJkqUJTV3R1NUboO9amrrCOUcI4dKCssgxepAC75+ifRz711nIUMsip+9a5mmk71qyNBHtqA6Iwckidn/cb/RdS1nkxCcZPTBPI9ZagcThngDbumD0QFnkcuNgszRhnkYx+oyUpq7Y1oV5GmnqirLI5fsK2tZFAG+LFTt8WkRohBg9SEJvMTZ1RZYmPO43HvcbRg8S37YuYhABzrnzMsUu8zQyTyNGDxJtWeQopdjWhRDC9TpHk7hQr6kYPZzVLw6vN+7It3/gD44Pszjh7GJmAAAAAElFTkSuQmCC"
    };
});

bt.addSource("Adamsfile", function () {
    var adam = "http://adamsfile.com/search.php?s_string={query}&s_year=&albumsSearchSubmit=&s_genre=&s_mediatype=&s_type=";

    return {
        url: {
            all: adam,
            music: adam,
            music_flac: adam
        },
        onParse: {
            cleanup: [".alb_data", ".urating"],
            row: ".albums > tbody > tr",
            link_prepend: "http://adamsfile.com/",
            sel: [
                {text: "> td:eq(0)", link: "a[href*='details.php']:eq(0)"},
                {text: "> td:eq(1)", link: "a[href^='ftp://dl.adamsfile.com/']:eq(0)"}
            ]
        },
        onFilter: bt.requireAllWords,
        icon: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAABLklEQVQ4jbWTvYrCUBBGJ2tlsWxvQItUFkKKbRfyHCGFASGiIKRbbuNtLX2PFDb3AUKQFKl9AYtgk7CWVmcLUcTssvizA8M3DMzhm4EREVmLCHfmWkSEj/Sd7rDTUGihtdXQr5cWn5Z1ggjdYYc397WhWlt4ntXQKxdPAPz7Cn8c8gmAB1OwbZuiKDgcDiRJgjHmNkAcxxRFQbvdZrFY3Abo9/ucYrfbobU+A/I8B6Cua4IgQERYLpfUdc1+v2cymRwdXA5d1vP5HKUUWZZhjCEMQ8qyxHVdBoMBtm3/DhiNRpRlyXQ6ZbPZYIxBKUWaps0b/ASIooiqqtBas91uMcbgOA5VVbFarUiShPF4fAR4nofv+1zXYRiilCKKonOv1+sxm82I4xjHcZBH3/kbU+6yqUfzIN0AAAAASUVORK5CYII="
    };
});

bt.addSource("SCC", function () {
    var scc = "https://sceneaccess.eu/";

    return {
        url: {
            all: [
                scc + "browse?method=1&search=",
                scc + "nonscene?method=1&search=",
                scc + "spam?method=1&search=",
                scc + "archive?method=1&search=",
                scc + "foreign?method=1&search="
            ],
            movies: [
                scc + "browse?method=2&c8=8&c22=22&c7=7&search=",
                scc + "nonscene?method=2&c41=41&c42=42&c43=43&search=",
                scc + "archive?method=2&c4=4&search=",
                scc + "foreign?method=2&c31=31&c32=32&c30=30&search="
            ],
            movies_1080: [
                scc + "browse?method=2&c22=22&search={query} 1080 264",
                scc + "nonscene?method=2&c41=41&search={query} 1080 264",
                scc + "archive?method=2&c4=4&search={query} 1080 264",
                scc + "foreign?method=2&c32=32&search={query} 1080 264"
            ],
            movies_720: [
                scc + "browse?method=2&c22=22&search={query} 720 264",
                scc + "nonscene?method=2&c41=41&search={query} 720 264",
                scc + "archive?method=2&c4=4&search={query} 720 264",
                scc + "foreign?method=2&c32=32&search={query} 720 264"
            ],
            movies_bluray: [
                scc + "browse?method=2&c22=22&search={query} COMPLETE",
                scc + "archive?method=2&c4=4&search={query} COMPLETE"
            ],
            movies_dvd: [
                scc + "browse?method=2&c8=8&search=",
                scc + "foreign?method=2&c31=31&search="
            ],
            movies_remux: scc + "nonscene?method=2&c4=4&search={query} REMUX",
            tv: [
                scc + "browse?method=2&c27=27&search=",
                scc + "nonscene?method=2&c44=44&search=",
                scc + "archive?method=2&c26=26&search=",
                scc + "foreign?method=2&c34=34&search="
            ],
            docs: [
                scc + "browse?method=1&c8=8&c22=22&c7=7&c27=27&c17=17&c11=11&search=",
                scc + "nonscene?method=1&search=",
                scc + "foreign?method=1&search="
            ],
            games_pc: [
                scc + "browse?method=2&c3=3&search=",
                scc + "archive?method=2&c29=29&search="
            ],
            apps_win: scc + "spam?method=2&c2=2&search=",
            music: scc + "spam?method=2&c40=40&c13=13&search=",
            music_flac: scc + "spam?method=2&c40=40&search=",
            //		music_mp3: scc + "spam?method=2&c13=13&search=",
            mvids: scc + "spam?method=2&c15=15&search=",
            xxx: scc + "xxx?method=1&search="
        },
        onParse: {
            cleanup: [".ttr_size a"],
            row: "#torrents-table tr.tt_row",
            link_prepend: "https://sceneaccess.eu/",
            sel: [
                {
                    text: "> .ttr_name a:eq(0)",
                    freeleech: "span:contains('Free leech.')"
                },
                {text: "> .ttr_seeders"},
                {text: "> .ttr_size", link: "a[href*='.torrent']:eq(0)", noblank: true}
            ]
        },
		onFilter: bt.filter3dMovies,
        icon: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAACfklEQVQ4jZXQyS/jcRzG8e//4UDSWFsS+y+EICHUkkgvloM4OAgHJ1WxJFycRELjTESNNUhHpwxVdNTUWGpiYpAOUarRQWNX7zlMKo3LmCd5HZ7P4XN4hBBC6EJD+R/63FyuDw8RQggxGBbGe40lJTGZkYFdq+XG6WS5rg4xGB7Oe0ykp3NkMKAvKMCgUuFcWmK1oQExGBWF33B8PINyOYE3P2tLC06z+bVb6utx6PUInUKB32R2Nju9vVibmxmOj2dUktBFR6NTKPii0XBzespIYiI6hQJjWRmPXi/iQ0wMgYwlJfienjgxmbA2NfGxqIjxlBS+trVxubfHkcHAeGoqtrY2AMRobCxvXe3vs9ffz6fiYpyLixhVKg6Gh9kfGuL27Ayvw4HX4fj7YDwhgUDmqioAXKurTGdmstPdjdtm42RhgaOZGexdXfjjXl9HTEkSgdbq63GtrABwc3LCkV6PpbaWzyoVa2o1662t3Lnd2Ds7mZIkxFBQEIFmCws51OlwW60AWGpqGIuIwLO1he/xEYD7iwtGZDKMSiViLDiYVyEhfNNoMJeWMhYczPH0NPaODsZlMmZzcpjLy2O+sJAfWi1Tcjmr1dWISZkMv+nISDbUajYbG7FUVODZ3OTl+Znf29tc7uxwYbNhkCQWlEpMBQUY09IQ+vBwAs1nZfG9vR3HwAB7PT14Dw54vrvj8eoKz8YGs5LET62W88VFZpOTEUa5nLfm4uKwVVaynJ/PvcuFo68Pu0aDXa3m18DA6xa3x8eI+ZgY3rKVl+M2mXi6vuZfEUIIYY6NJZBVqcSzvIzHYuHF58P38MCDy4V3dxePxcL5zAynExMIIcQfr3ecgShZoxMAAAAASUVORK5CYII="
    };
});

bt.addSource("TPB", function () {
    var q = "https://thepiratebay.se/search/{query}";

    return {
        url: {
            all: q,
            music: [ q + "/0/99/101", q + "/0/99/104" ],
            music_flac: q + "/0/99/104",
            movies: [q + "/0/99/201", q + "/0/99/202"],
            movies_bluray: q + " avc/0/99/200",
            movies_remux: q + " remux/0/99/200",
            movies_1080: q + " 1080p/0/99/207",
            movies_720: q + " 720p/0/99/207",
            movies_dvd: q + "/0/99/202",
            tv: [q + "/0/3/205", "/0/3/208"],
            docs: q,
            mvids: q + "/0/3/203",
            apps_win: q + "/0/3/301",
            games_pc: q + "/0/3/401",
            elearning: q,
            ebooks: q + "/0/99/601",
            abooks: q + "/0/99/102",
            fiction: q + "/0/99/601",
            mags: q + "/0/3/601",
            comics: q + "/0/3/602",
            xxx: q + "/0/3/500"
        },
        onParse: {
            row: "#searchResult > tbody > tr",
            link_prepend: "https://thepiratebay.se",
            sel: [
                {text: "a[href*='/torrent/']:eq(0)"},
                {text: "> td:eq(-2)"},
                {
                    text: function(context){
                        var details = context.find(".detDesc").first();
                        if (details.length === 1 && ~details.text().indexOf(", Size ")) {
                            return details.text().split(", Size ")[1].split(",")[0].trim();
                        } else {
                            return $(context[0].lastElementChild.previousElementSibling.previousElementSibling);
                        }
                    },
                    link: "a[href^='magnet:']:eq(0)",
                    noblank: true
                }
            ]
        },
        onFilter: [bt.filter3dMovies, function (data, response) {
            if (response.context.category === "movies_bluray") {
	            return data.filter(function(){
                    return this.textContent.toLowerCase().indexOf("remux") === -1;
	            });
			} else {
				return data;
			}
        }],
        icon: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAACLklEQVQ4jZWTMUiqYRSGT/04haTpEoEagYLhWgRJ+je5hmC/DtbgFoEuQmOBGIFrDbmphVKSg9AQkSC0KkI0uAjSEoS4qfjcIe5fN4t77wsvfPCd7zmc850jfNF4PP6rP0t+H56enggEAvj9fjY3N7+1qqqoqsrl5eUkoFQqISL/5GAwOAkol8t6gMFgYHp6GovFgslkQlEUFEVhamoKESEcDv8M8Hg8NJtNotEolUqF5+dnYrEYlUqFdDqNiKBp2iTg+voaEWFlZYVut4umadjtdlwuF0tLSzQaDVKpFCJCKBSaBJyfn+slzM7OTtRtNBpRFEVPMhgMfgaICHa7nZmZGUQEp9OJwWDQ75aXlz8ArVaLeDzO2dmZnmF1dZVgMMjCwgIiQjQaZX19HbPZjIjg9/sZj8eMRiPk/v4eEeHw8JBMJkM+n6darVIsFikUCuTzeXK5HFdXV5TLZW5ubuh2u5yenhKJRJCDgwOdurGxwc7ODplMhkajwXA41Jv19vZGvV4nm81ydHSExWLB5/Mht7e37O3t4fP5uLi4IJlMYrVaERGsVitra2ssLi4yPz+P1+tF0zRUVcXtduNyud6b+PLygslkwuFwoKoqoVCIWCzGyckJx8fHbG1t4Xa78Xq97O/vY7PZ2N3d5eHh4R3Q7/eZm5sjkUjQ6/W+7hcAvV6PWq3G9vY2IsLj4+PHN45GI+7u7nh9ff328Wd1Oh0CgQDtdvvPOfgffV7pXz5OoYc083dvAAAAAElFTkSuQmCC"
    };
});

bt.addSource("RuTracker", function () {
    var tru = "http://rutracker.org/forum/tracker.php?nm={query}";
    var truMovies = "&f=100,101,1235,124,1543,1576,1577,1666,1670,187,1900,208,209,2090,2091,2092,2093,212,2198,2199,22,2200,2201,2220,2221,2258,2339,2343,2365,2459,312,313,376,4,484,505,521,539,572,7,709,822,905,93,930,934,941";
    var truDocs = "&f=103,1114,1280,1327,1453,1467,1468,1469,1475,2076,2107,2112,2123,2159,2160,2168,2176,2177,2178,2323,2380,249,251,2538,294,314,46,500,552,56,670,671,672,752,821,851,876,97,98";
    var truFiction = "&f=2039,2041,2042,2043,2044,2045,2047,2080,2193,2355,2356,2357,2474";
    var truMvids = "&f=1107,1121,1122,1141,1142,1174,1189,1227,1228,1455,1775,1777,1781,1782,1783,1787,1788,1789,1790,1791,1792,1793,1794,1795,1812,1886,1887,1912,1913,1990,2088,2089,2241,2261,2262,2263,2264,2271,2304,2305,2306,2351,2352,2377,2378,2379,2383,2384,2426,2507,2508,2509,2510,2529,2530,2531,2532,2534,431,442,445,475,655,702,983,984,986,988";
    var truAbooks = "&f=1036,1279,1501,1580,2152,2165,2324,2325,2326,2327,2328,2342,2387,2388,2389,2413,399,400,401,402,403,490,499,525,530,574,695,716";
    var truGamesPC = "&f=1008,1098,127,128,139,2067,2115,2117,2118,2119,2142,2143,2145,2146,2147,2155,2187,2203,2204,2225,2226,2227,2228,2385,240,2415,246,2478,2479,2480,2481,2482,2483,2484,2485,2533,278,5,50,51,52,53,54,55,635,637,642,643,644,645,646,647,649,650,761,900,959,960,961,962";
    var truAppsWin = "&f=1012,1013,1014,1016,1018,1019,1021,1025,1027,1028,1029,1030,1031,1032,1033,1034,1035,1038,1039,1040,1041,1042,1051,1052,1053,1054,1055,1056,1057,1058,1060,1061,1062,1063,1064,1065,1066,1067,1068,1071,1073,1079,1080,1081,1082,1083,1084,1085,1086,1087,1088,1089,1090,1091,1092,1192,1193,1199,1204,1503,1507,1508,1509,1510,1511,1512,1513,1514,1515,1516,1517,1526,1536,1636,2077,2153";
    var truComics = "&f=2461,2462,2463,2464,2465,2473,862";

    return {
        url: {
            all: tru,
            music: tru + " lossless|MP3|AAC|OGG|FLAC|APE|ALAC|WV",
            music_flac: tru + " lossless|FLAC|APE|ALAC|WV",
            //		music_mp3: tru + "+MP3|AAC|OGG",
            movies: tru + truMovies,
            movies_1080: tru + " 1080p -remux -bdremux -disc" + truMovies,
            movies_720: tru + " 720p -remux -bdremux -disc" + truMovies,
            movies_remux: tru + " remux|bdremux" + truMovies,
            movies_bluray: tru + " \"blu ray\" | bluray -DVD -DVD5 -DVD9 -rip -remux -bdremux" + truMovies,
            movies_dvd: tru + " DVD|DVD5|DVD9" + truMovies,
            tv: tru + " 720p|1080p",
            mvids: tru + truMvids,
            games_pc: tru + truGamesPC,
            apps_win: tru + truAppsWin,
            docs: tru + truDocs,
            elearning: tru,
            ebooks: tru + " PDF|EPUB|MOBI|CHM|DJVU|FB2",
            abooks: tru + truAbooks,
            mags: tru + " PDF",
            comics: tru + truComics,
            fiction: tru + truFiction
        },
        onEnable: function () {
            $(bt.mainColumn).on('click', 'a[href^="http://dl.rutracker.org/"]', function () {
                $('<form target="_blank" method="post" action="' + $(this).attr("href") + '"></form>')
                    .appendTo(document.body)
                    .submit()
                    .remove();
                return false;
            });
        },
        onParse: {
            row: "#tor-tbl > tbody > tr:not(:has('td.pad_12'))",
            link_prepend: "http://rutracker.org/forum/",
            sel: [
                {text: "a.tLink"},
                {text: ".seedmed"},
                {
                    text: function (context) {
                        var size = context.children().eq(-5)[0].firstElementChild.textContent;
                        return bt.humanizeSize(size);
                    },
                    link: "> td.tor-size > a",
                    noblank: true
                }
            ]
        },
		onFilter: bt.filter3dMovies,
        icon: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAACH0lEQVQ4jY3SQUiTcRjH8d3roG90CCIUAqG6dbDLdBEEkxJCaCJFBEmNdtohgkTC0xhBhxa8GsTrsBe6CCIFkeJhh4RZr4zXMLZ373/vH5R3L68l0xeCsW+HcGuZ6Q/+t+f5/Hl4nlDokKytreG6LofV7YvneexlaWkJx3HY2to6OmRZFruZt3wffsyfKZfLSCkPhoQQ+L5PEAR4F0dwlQiuEsHruQHA+Pg4lmX9G5BS0mg0WF5eZvX2o2azq0T4+eET0egAqqr+f4w7Zi++76OqKpvd15q/76SnUVWVhYWFdmB9fZ03m8956TzhqXWX/nwHALqus9o7zM67HACBNo9t28zNzbUDudzvgv58R9tL2Q8BmJx8TTjcx73RUQqFArquI4RoIZVKhXq9zuWVE83m7MYzABKJBMc7b3L67CRDI4skkh8xTZNsNtsChBAAPPh6hemNdHOEcLiP8xeucuzkCzrPfEbpqjD/3sMwDGZmZlqA53lsb2+j6zqzs7N82zUAiMfjDI0sonRVULpdlG4XgFgsxsrKlxZgmiaapjE1NUUmk2FiYoJarUY0OoDjOJzqcTl3qcqt+z94NR0gpcQwjBbg+z6lUgkhBKVSCV3XyeVypFIppJRErvtYdr3tGvet8u+Uy2WKxSKFQoEgCBgcHCQej5NMJhkbGzsc2IthGKTTaTRNo1gsIqXEtm2q1erRACEE+Xz+4NsPhUK/ACWu6h+j7c7tAAAAAElFTkSuQmCC"
    };
});

bt.addSource("BTScene", function () {
    var a = "http://www.btsdl.cc/advanced-search.php?term[EXACT]={query}";
    var bydate = "http://www.btsdl.cc/results.php?q={query}&order=1&category=";

    return {
        url: {
            all: a,
            movies: a + "&advcat=1",
            movies_1080: a + " 1080p&advcat=1",
            movies_720: a + " 720p&advcat=1",
            movies_remux: a + " REMUX&advcat=1",
            movies_bluray: [ a + " bluray avc&advcat=1", a + " blu-ray avc&advcat=1", a + " BD25&advcat=1", a + " BD50&advcat=1" ],
            movies_dvd: a + " DVD-R&advcat=1",
            tv: bydate + "series",
            docs: a + "&advcat=1",
            music: a + "&advcat=3",
            music_flac: a + " FLAC&advcat=3",
            mvids: [a + " 720p&advcat=3", a + " 1080p&advcat=3", a + " video&advcat=3", a + " videos&advcat=3", a + " videoclips&advcat=3", a + "&advcat=1"],
            games_pc: a + "&advcat=4",
            apps_win: bydate + "software",
            elearning: [a + "&advcat=7", a + "&advcat=9" ],
            mags: bydate + "ebooks",
            ebooks: a + "&advcat=9",
            fiction: a + "&advcat=9",
            abooks: a + "&advcat=7",
            comics: a + "&advcat=9",
            xxx: a + "&advcat=8"
        },
        onParse: {
            row: "h1 ~ .tor > tbody > tr:gt(0)",
            link_prepend: "http://www.btsdl.cc",
            sel: [
                {text: "> .tname > a:eq(0)"},
                {text: "> .tseeds"},
                {
                    text: "> .tsize",
                    link: function(context){
                        var id = context.find("a").first().attr("href").split("-tf").pop().split(".")[0];
                        return "/torrentdownload.php?id=" + id;
                    }
                }
            ]
        },
        onFilter: [bt.filter3dMovies, function (data, response) {
            if (response.context.category === "movies_bluray") {
                return data.filter(function () {
                    return this.textContent.toLowerCase().indexOf("remux") === -1;
                });
            } else if (response.context.category === "apps_win") {
                return data.filter(function () {
                    return this.textContent.indexOf("Windows") !== -1;
                });
            } else if (response.context.category === "comics") {
                return data.filter(function () {
                    return this.textContent.indexOf("Comics") !== -1;
                });
            } else if (response.context.category === "abooks") {
                return data.filter(function () {
                    return this.textContent.indexOf("Audio Books") !== -1;
                });
            } else if (response.context.category === "games_pc") {
                return data.filter(function () {
                    return this.textContent.indexOf("Pc Games") !== -1;
                });
            } else {
                return data;
            }
        }],
        icon: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAChklEQVQ4jWWSPUvzUBiG0yRtRQjaoSgKkugkguIkDV0cioM4uIij6A9w8YMOzoKurl0qRtpJsIuj6CIUpCD4QYaC1EEEoWqSc9J4vYM0vsXhhjOc534uHi4ll8uRy+WwbRvbtikUClxeXiKEQEoZRwjB4+MjhUKBfD5Pd07RNI1ukskkGxsbfHx8IKUkDMOenJ+fMzQ0xP8ziqIoKIqCruuMjo7SaDSQUtLpdHoipeTu7o7p6WlUVSWRSKAoSi/B2toavu8TRRFhGBJFUZxOp0MURRwcHJBOp0kmkz8Eqqqiqiq6rlOtVgnDMP78/f0dE3Tf1WqVdDqNpmmoqtpbcHp6ihCip6C7PQgCarUaW1tbDA4Oout6b4GmaRSLxT8EYRgSBAH39/eMj48zPDzMwMDA3wJd11laWvpTIISg2WxydnaGYRgsLi5imibdOSWbzZLNZunv78eyLFzXxfM82u02rVaLRqOB67q8v7/jOA7NZpPt7e1fgt3dXfb399nc3CSfz1Mul7m9vaVer/Pw8MDb2xtBEPRI5TgOqVTqp2B2dpaVlRWurq64vr7m+fmZz89PgiDA8zyEEPi+H7sghGB5efmX4Onpib29PWZmZpiamsJ1Xb6+vhBCEIYhQgg8z4u3t9ttcrnc7w1ubm7Y2dlhYmKCw8NDWq0WUspYpjAMe/BfXl7iIyYSCZTJyUkMw6BYLFKr1bi4uKBSqeB5XiyR7/ucnJxwfHyM4zhkMhl0Xf8xsa+vj7m5OUqlEpVKhdXVVY6OjmKhpJTU63VGRkYwDINMJhNrnEqlUObn5ymVSqyvr2PbNgsLC7y+vhIEQUxQLpexLAvLsjBNE9M0sSyLsbEx/gHNcZ7/5OeniAAAAABJRU5ErkJggg=="
    };
});

bt.addSource("YouTube", function () {
    var q = "https://m.youtube.com/results?ajax=1&tsp=1&q={query}";

    return {
        url: {
            all: q,
            docs: q,
            music: q,
            movies: q,
            mvids: q,
            games_pc: q
        },
        onHttpRequest: function (requestData) {
            requestData.headers = {
                'User-Agent': 'Mozilla/5.0 (Linux; Android 5.1.1; Nexus 5 Build/LMY48B; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/43.0.2357.65 Mobile Safari/537.36'
            };
        },
        onParse: function(response){
            try {
                var data = JSON.parse(response.responseText.slice(response.responseText.indexOf("{")));
            } catch (e) {
                bt.showFailAlert(response, "unexpected data");
                return null;
            }

            if (!data || !("result" in data) || data.result !== 'ok') {
                bt.showFailAlert(response, "unexpected data");
                return null;
            }

            if ("content" in data && "search_results" in data.content && "contents" in data.content.search_results) {
                return data.content.search_results.contents;
            }

            return [];
        },
        onRender: function (data, table) {
            var video, rows = "", id;
            console.log(data);
            for (var i = 0, len = data.length; i < len; i++) {
                video = data[i];

                switch (video.item_type) {
                    case "compact_video":
                        rows += '<tr><td><a href="https://youtube.com' + video.endpoint.url + '" data-video-id="' + video.encrypted_id + '" target="_blank" class="youtube-link">' + video.title.runs[0].text + '</a></td><td>' + video.length.runs[0].text + '</td><td style="width:20%;text-align:right;">' + video.short_byline.runs[0].text + '</td></tr>';
                        break;
                    case "compact_playlist":
                        rows += '<tr><td><a href="https://youtube.com' + video.endpoint.url + '" data-playlist-id="' + video.playlist_id + '" target="_blank" class="youtube-link">' + video.title.runs[0].text + '</a></td><td style="white-space:nowrap;">' + (video.video_count_short.runs.length ? video.video_count_short.runs[0].text : "no") + ' videos </td><td style="width:20%;text-align:right;">[PLAYLIST]</td></tr>';
                        break;
                    case "compact_channel":
                        rows += '<tr><td><a href="https://youtube.com' + video.endpoint.url + '" data-user-id="' + video.endpoint.url.split("/").pop() + '" target="_blank" class="youtube-link">' + video.title.runs[0].text + '</a></td><td style="white-space:nowrap;">' + (video.video_count.runs.length ? video.video_count.runs[0].text : "no videos") + '</td><td style="width:20%;text-align:right;">[CHANNEL]</td></tr>';
                        break;
                }
            }

            table.html(rows);
        },
        /*
        onParse: {
            row: "ol.item-section > li:has(a[href*='watch?v='])",
            link_prepend: "https://www.youtube.com",
            sel: [
                {
                    text: "h3 > .yt-uix-tile-link",
                    class: "youtube-link",
                    vod: ".yt-badge-ypc"
                },
				{text: ".video-time"},
				{text: ".yt-lockup-byline > .g-hovercard", width:"20%"}
            ]
        },
        */
        onEnable: function(){
            $(bt.mainColumn).on('click', '.youtube-link', function (e) {
                var id, a = $(this), td = $(this.parentNode);
                var iframe = td.children("iframe");
                if (iframe.length > 0) {
                    iframe.remove();
                } else {
                    bt.mainColumn.find("iframe").remove();

                    var url = "https://www.youtube.com/embed/";
                    if (id = a.data("video-id")) {
                        url += id + "?autoplay=1";
                    } else if (id = a.data("playlist-id")) {
                        url += "?listType=playlist&autoplay=1&iv_load_policy=3&list=" + id;
                    } else if (id = a.data("user-id")) {
                        url += "?listType=user_uploads&autoplay=1&iv_load_policy=3&list=" + id;
                    } else {
                        return;
                    }

                    td.append('<iframe width="560" height="315" src="' + url + '" frameborder="0" allowfullscreen style="display:block;margin-top:10px;"></iframe>');
                }

                e.preventDefault();
                e.stopPropagation();
                return false;
            });
        },
        onFilter: function(data, response){
            response.context.searchUrl = "https://www.youtube.com/results?q=" + encodeURIComponent(response.context.query);

            if (response.context.category === "mvids" || response.context.category === "docs") {
                return data.filter(function (v) {
                    if (!~v.item_type.indexOf("compact_")) {
                        return false;
                    }

                    var title = v.title.runs[0].text.toLowerCase();

                    return !(~title.indexOf("audio") || ~title.indexOf("lyric") || ~title.indexOf("album"));
                });
            }

            return data;
        },
        icon: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAArklEQVQ4jWNgGDTgia7a/Ke66v+JwU901ebDNV7VFuV5qK32nxx8Q12El+Gepup/SjDDbXWV/5Rghuuqyv+xYRjAJQ/DDFeUlf5jw8jgxYMHWNVcUVb6z3BRUek/NowMLigqfcWljuGsvOJ/bPj/////r3n6nMUlD8MMp2QV/lOCGY5Jy/+nBDPsFxXlOSwp958cvF9UlAeeIg+IyTQeEJf9TwzeLy4zeSCyG3YAAIY9jDwMQOfNAAAAAElFTkSuQmCC"
    };
});

bt.addSource("Vimeo", function () {
    var q = "https://vimeo.com/search?q={query}";

    return {
        url: {
            all: q,
            movies: q,
            music: q + "&category=9",
            docs: q + "&category=117&duration=long",
            mvids: q + "&category=9"
        },
        onParse: {
            row: "li[data-result-id]",
            link_prepend: "https://vimeo.com",
            sel: [
                {
                    text: ".title",
                    link: "a.js-result_url",
                    class: "vimeo-link",
                    vod: ".overlay_vod"
                },
                {text:".clip_duration"},
                {
                    text:".display_name",
                    align:"right",
                    width:"20%"
                }
            ]
        },
        onEnable: function () {
            $(bt.mainColumn).on('click', '.vimeo-link > a', function (e) {
                e.preventDefault();
                e.stopPropagation();

                var a = $(this);
                var td = $(this.parentNode);
                var iframe = td.children("iframe");
                if (iframe.length > 0) {
                    iframe.remove();
                } else {
                    bt.mainColumn.find("iframe").remove();
                    var href = a.attr("href");
                    var id = href.split("vimeo.com/")[1].split("?")[0].split("/")[0]; // just in case
                    td.append('<iframe src="https://player.vimeo.com/video/'+ id +'?autoplay=1&color=ffffff&title=0&byline=0&portrait=0&badge=0" width="560" height="315" frameborder="0" style="display:block;margin-top:10px;" allowfullscreen></iframe>');
                }

                return false;
            });
        },
        icon: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAA/0lEQVQ4jaWTvw2CQBTGGYQQF2ACJsAFmMAJmMAJnMAJ7LQgFBQ0mlDYEGJjYSLxggLhMKIBzWd15E7+RPQlr3n5vt/7czlJXhJdsaLTyL5gSCpWdJKXRJd+MfMQaYhBc5NGTQCoToxNUgIA5oeirpt+Dlq+AAC0fMHwsiZAX6c4Fk/wwbp+xmx/EwGam9Qd+DC8DKafI6BVP4CNaXiZIDT9vBZ21RtH5LuxO5h+XteOxbP7iCP7gunuKohVJxbWm2xpP0Bfp8K4vNmOHv3PyLLtoAGtoDrxd4BFeBfMbJU2bSuAf9ZNUnaaOwFD8t/PRCR5RcaKFZHh5nMor8j4DUIXDtllgAeRAAAAAElFTkSuQmCC"
    };
});

bt.addSource("Layer13", function () {
    var q = "https://layer13.net/browse?q={query}";

    return {
        url: {
            all: q,
            movies: q + " @section X264|DVDR|MDVDR|BLURAY|MBLURAY|XVID|SVCD|VCD|SUBPACK",
            movies_1080: q + " 1080p @section X264",
            movies_720: q + " 720p @section X264",
            movies_bluray: q + " @section BLURAY|MBLURAY",
            movies_dvd: q + " @section DVDR|MDVDR",
            music: q + " @section MP3|FLAC",
            music_flac: q + " @section FLAC",
            docs: q + " @section TV|X264|DVDR|MDVDR|BLURAY|MBLURAY",
            tv: q + " @section TV",
            mvids: q + " @section -MP3 -FLAC",
            elearning: q + " @section TUTORIAL|EBOOK|BOOKWARE|APPS|TV",
            mags: q + " @section EBOOK",
            ebooks: q + " @section EBOOK",
            abooks: q + " @section AUDIOBOOK",
            fiction: q + " @section EBOOK",
            comics: q + " @section EBOOK",
            apps_win: q + " @section 0DAY|UTILS",
            games_pc: q + " @section GAMES|DOX",
            xxx: q + " @section XXX|iMGSET"
        },
        onParse: {
            row: ".rlsname",
            link_prepend: "https://layer13.net/",
            sel: [
                {
                    text: function(context){
                        var text = context[0].firstElementChild.textContent + context[0].firstElementChild.nextElementSibling.textContent;
                        var nuked = context[0].previousElementSibling.textContent;
                        if (~nuked.indexOf("NUKED") && !~nuked.indexOf("UnNUKED")) {
                            text = "<s>" + text + "</s>";
                        }
                        return text;
                    },
                    link: "> a:first-child",
                    width: "50%"
                },
                {
                    text: "> i",
                    width: "50%"
                }
            ]
        },
        icon: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAB4UlEQVQ4ja3T30tTUQDAcf+XHoSohwRbUGgPM4UVtDCYe2hMGDEzxGvSvZeo6UrDhczCjIljuVnsMCa2LB9iPWRMi3l2ZyFFWEE/JGL+eIhe5NtDdK+Xwgw68Hk4v75wHk5V1f8aK5+eIYtZCrOJbclilnfLM9guvyjfpVSMM52L7FipGLcihdlhMumwTWNTLeurZTbWFokMdJBJh5nK9nFvst88YwaSCZ2tgqePsbG2yJeVeQwpMKRAUbwkEzqTmTDJhE7+0aAViI10sRWbFQwpeP82T+XrAm9eP8SQwtwfvXWO2EiXFciKEEPRdhObFWod1ayvlnmcH8VxoBpDCq5HzyLuXGAo2k5WhKzAxLjK1f6Azaulab5/+8DTJ3FKC2kMKcy91O3zTIyrViAe66Qn5PvNr/dHBjrMtd6en+KxTisQ7j2FpnnQNA8zD4apP7wXTfPQ3X2SVPIyDUdq0HUPnz8+R9c96LqHmzfOWIHBawEUxW0zP5dirjDF/VwMQwp8PieKcsLGDPRd8REMuggGXeyr2cXSyxyGFNTV76GxaT+GFIyNRWhrO2pjBi5d9OL3O/H7nRhS0Nra8EeBgIuDh3abczOgqs20tNTh/Qeq2mz/D+7jDrbltvvL39z5+AF7afMCxr5a3AAAAABJRU5ErkJggg=="
    };
});

bt.addSource("Kickass", function () {
    var q = "https://kat.cr/usearch/{query}";

    return {
        url: {
            all: q + "/?rss=1",
            movies: q + " category:movies/?rss=1",
            movies_1080: q + " 1080p category:movies/?rss=1",
            movies_720: q + " 720p category:movies/?rss=1",
            movies_bluray: q + " 1080p AVC OR VC-1 OR VC1 OR BluRay OR Blu-ray OR COMPLETE -remux -x264 category:movies/?rss=1",
            movies_remux: q + " remux category:movies/?rss=1",
            movies_dvd: q + " NTSC OR PAL OR DVD -DVDrip -DVDScr -HDRip -BDRip -x264 -xvid -divx -\"dvd rip\" -720p -1080p -1080i -avi -mkv -HD category:movies/?rss=1",
            music: q + " category:music/?rss=1",
            music_flac: q + " category:lossless/?rss=1",
            docs: q + " category:documentary/?rss=1",
            tv: q + " category:tv/?rss=1",
            mvids: [q + " category:music-videos/?rss=1", q + " category:concerts/?rss=1"],
            elearning: q + " category:books/?rss=1",
            mags: q + " category:magazines/?rss=1",
            ebooks: q + " -CBR -CBZ -MP3 -audiobook -\"audio book\" category:books/?rss=1",
            abooks: q + " category:audio-books/?rss=1",
            fiction: q + " category:fiction/?rss=1",
            comics: q + " category:comics/?rss=1",
            apps_win: q + " category:windows/?rss=1",
            games_pc: q + " category:pc-games/?rss=1",
            xxx: q + " category:xxx/?rss=1"
        },
        onValidate: function(response){
            response.context.searchUrl = response.finalUrl.replace("/?rss=1", "");
            return true;
        },
        onParse: {
            row: "item",
            sel: [
                {
                    text: "title",
                    link: "guid"
                },
                {
                    text: "torrent\\:seeds"
                },
                {
                    text: function(context){
                        return bt.humanizeSize(context.children("torrent\\:contentLength").first().text());
                    },
                    link: function(context){
                        return context.children("enclosure").first().attr("url");
                    },
                    noblank: true
                }
            ]
        },
        icon: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAACP0lEQVQ4jY2S30uTYRTHn7/Bi4JwERgRWELJnMGYm6Gjd5JkuhzOrTVrbQOHTR1FM40aaxPWcJUr57aLtjFsYpQwsknSD6grqcxhJQkmOrIaQ520fbtY73i3NeoLn4vnfM85D+dwCPkjiYSz87al7adWIeikY73aer/bLt9kxvTqOo+l7+QiyZexi3oeDugQDujgtEoT3iHFNv0OB3Tw2OXJgPNcin5rT/MN2eIWYXlJ8K4yPXlfi//F0ndiOdtAJeUaHnpVyGfp40sAwPfYYoEXcp1Fi7C8JDOXqjYy7lJi3KXEhFuFmUdmTE9cRXIrAQB4/2YMtM9EJmZLCSGEGLS174JOGYJOGSb9PSimV1O3QOcFnTJ0tFVdy2xbXTPnc0jgc0gQGlXj9fQ9rC7PZQsX52fwbe0zHvu6Qef5HBKcaWWbCSGEaOSciPdmM5h8+vAMAJCIx5Dv0UiOH8iMIG2q6HdZG8Hk65fZzO/RF8j3XNZG3DE1QHikNLPEel4Za2hAiGETlWVtZQEAMD/7BMMmCg9GO3P8blX1Ss4hadoPRR0DdaCJvn0KAEinU9jciCP+YxVMX9ywvz+ngUiwu/KGgZu2GfmwGfnw2NuxndwAAKzHluB3ngftXeg4vF5wyoQQcoraOzJ4kQuakcFWjLn1sF0WZGNXdFUpisfi/bUBIYSIRWUhUw8H5t7qAi5pKn+JeKVNRYtpUTUsRZfy4NZ1PRs0iuZ9Czz2LtY/i5k6xmfpxdSeyFHOjopiOb8BYYfsxcx4u9YAAAAASUVORK5CYII="
    };
});

bt.renderPage();
