/// <reference path="../PartialViews/table.html" />
/// <reference path="ui.js" />
/// <reference path="../Scripts/jquery-2.0.2.js" />
/// <reference path="dataAccess.js" />
/// <reference path="../Scripts/class.js" />
/// <reference path="persister.js" />

var Chat = Chat || {};

Chat.controller = (function () {
    var Access = Class.create({
        init: function (persister) {
            this.persister = persister;
            this.tabCounter = 1;
        },

        loadUI: function (selector) {
            this.selector = selector;

            if (this.persister.isLoggedIn()) {
                this.loadChat(selector);
            }

            this.atachUIHandlers("body");
            this.getChannels();
            this.loadJoinedChatsTabs();
        },

        loadLogin: function (selector) {
            $(selector).load("../PartialViews/login.html");
        },

        loadRegister: function (selector) {
            $(selector).load("../PartialViews/register.html");
        },

        loadChat: function (selector) {
            $(selector).load("../PartialViews/chat.html");

            $("#menu").prepend('<li><span>Hello, ' + this.persister.getNickname() + '</span><a href="#" id="logout-button">Logout</a></li>');
            $("#go-register").parent().attr("style", "display:none");
            $("#go-login").parent().attr("style", "display:none");
        },

        atachUIHandlers: function (selector) {
            var wrapper = $(selector);
            var self = this;

            // load login form
            wrapper.on("click", "#go-login", function () {
                self.loadLogin(self.selector);
            });

            // load register form
            wrapper.on("click", "#go-register", function () {
                self.loadRegister(self.selector);
            });

            // login
            wrapper.on("click", "#login-button", function () {
                var username = $(selector + " #login-username").val();
                var password = $(selector + " #login-password").val();

                self.persister.user.login(username, password)
                    .then(function (data) {
                        self.loadChat(self.selector);
                        self.loadJoinedChatsTabs();
                    }, function (err) {
                        $("#login-reg-errors").html(err.responseJSON.Message);
                    });

                return false;
            });

            // register user
            wrapper.on("click", "#register-button", function () {
                var username = $(selector + " #reg-username").val();
                var nickname = $(selector + " #reg-nickname").val();
                var password = $(selector + " #reg-password").val();

                self.persister.user.register(username, nickname, password)
                    .then(function () {
                        self.loadChat(self.selector);
                    }, function (err) {
                        $("#login-reg-errors").html(err.responseJSON.Message);
                    });
                return false;
            });

            // logout
            wrapper.on("click", "#logout-button", function () {
                self.persister.user.logout()
                    .then(function () {
                        self.loadLogin(self.selector);
                        $("#go-register").parent().removeAttr("style");
                        $("#go-login").parent().removeAttr("style");
                        $("#menu").children().first().remove();
                    }, function (err) {
                        $("#chat-errors").html(err.responseJSON.Message);
                        $("#errors-dialog").dialog();
                    });

                return false;
            });

            // create chat
            var count = 0;
            wrapper.on("click", "#add_tab", function () {
                $("#dialog").dialog("open");
                $("#ui-id-1").text("Create channel");
                $("#tab_title").attr('readonly', false);
                var addButton = $(".ui-dialog-buttonset").children().first();
                addButton.attr("id", "addButton");
                count++;
                if (count == 1) {
                    wrapper.on("click", "#addButton", function (parameters) {
                        var name = $("#tab_title").val();
                        var pass = $("#tab_content").val();
                        self.persister.channels.create(name, pass)
                            .then(function (data) {
                                self.addTab(name);
                                var containerId = self.findChatBoxId();
                                self.loadChatBox(name, containerId);
                                $("#tab_title").val("");
                                $("#tab_content").val("");
                            }, function (err) {
                                $("#chat-errors").html(err.responseJSON.Message);
                                $("#errors-dialog").dialog();
                            });

                        return false;
                    });
                }
                return false;
            });

            // join chat
            var countJoin = 0;
            wrapper.on("click", "#update-area li a", function (parameters) {
                var name = $(this).text();
                self.persister.channels.getChannel(name)
                    .then(function (data) {
                        if (!data.hasPassword) {
                            self.persister.channels.join(name, "")
                                .then(function (data) {
                                    self.addTab(name);
                                    var containerId = self.findChatBoxId();
                                    self.loadChatBox(name, containerId);
                                }, function (err) {
                                    $("#chat-errors").html(err.responseJSON.Message);
                                    $("#errors-dialog").dialog();
                                });
                        }
                        else {
                            $("#dialog").dialog("open");
                            $("#ui-id-1").text("Add password");
                            $("#tab_title").val(name);
                            $("#tab_title").attr('readonly', true);
                            var joinButton = $(".ui-dialog-buttonset").children().first();
                            joinButton.attr("id", "joinButton");
                            countJoin++;                            
                            if (countJoin == 1) {
                                wrapper.on("click", "#joinButton", function (parameters) {
                                    var name = $("#tab_title").val();
                                    var pass = $("#tab_content").val();
                                    self.persister.channels.join(name, pass)
                                        .then(function (data) {
                                            self.addTab(name);
                                            var containerId = self.findChatBoxId();
                                            self.loadChatBox(name, containerId);
                                            $("#tab_title").val("");
                                            $("#tab_content").val("");
                                        }, function (err) {
                                            $("#chat-errors").html(err.responseJSON.Message);
                                            $("#errors-dialog").dialog();
                                        });

                                    return false;
                                });
                            }
                        }                        
                    }, function (err) {
                        $("#chat-errors").html(err.responseJSON.Message);
                        $("#errors-dialog").dialog();
                    });

                return false;
            });
                       
            // load users in chatroom
            wrapper.on("click", "#tabs li a", function (ev) {
                $("#tabs li").attr("channel-selected", false);
                var channelName = $(this).text();
                $(this).parent().attr("channel-selected", true);
                // this.findChatBox();
                self.persister.channels.getUsers(channelName)
                    .then(function (data) {
                        var users = "";
                        for (var i = 0; i < data.length; i++) {
                            users += '<li>' + data[i].nickname + '</li>';
                        }
                        $("#list-of-people").html(users);
                    }, function (err) {
                        $("#chat-errors").html(err.responseJSON.Message);
                        $("#errors-dialog").dialog();
                    });
                return false;
            });

            // get channel history
            wrapper.on("click", "#get_history", function (ev) {
                var channelName = self.findChannelName();
                self.persister.channels.getHistory(channelName)
                    .then(function (data) {
                       // var chatBox = $()
                        var boxId = self.findChatBoxId();
                        var fullDate = data[0].dateTime;
                        var index = fullDate.indexOf('T');
                        var date = fullDate.substring(0, index);
                        var history = "<strong>From " +  date + "</strong><br />";
                        for (var i = 0; i < data.length; i++) {
                            fullDate = data[i].dateTime;
                            var curIndex = fullDate.indexOf('T');
                            var curDate = fullDate.substring(0, curIndex);
                            if (curDate !== date) {
                                history += "<strong>From " + curDate + "</strong><br />";
                            }
                            date = curDate;
                            lastIndex = fullDate.lastIndexOf(":");
                            history += data[i].author + ": " + data[i].content + " - " +
                                fullDate.substring(curIndex + 1, lastIndex) + "<br />";
                        }
                        $("#" + boxId).html(history);
                    }, function (err) {
                        $("#chat-errors").html(err.responseJSON.Message);
                        $("#errors-dialog").dialog();
                    });
                return false;
            });

            // send message
            wrapper.on("click", "#chat-button", function () {
                var message = $("#chat-input").val();
                if (message != null && message != "") {
                    var channelName = self.findChannelName();
                    var boxId = self.findChatBoxId();
                    var oldscrollHeight = $("#" + boxId)[0].scrollHeight;
                    self.persister.channels.sendMessage(channelName, self.persister.getNickname() + ": " + message).then(function () {
                        var newscrollHeight = $("#" + boxId)[0].scrollHeight;
                        if (newscrollHeight > oldscrollHeight) {
                            $("#" + boxId).scrollTop($("#" + boxId)[0].scrollHeight);
                        }
                        $("#chat-input").val("");
                    }, function (err) {
                        $("#chat-errors").html(err.responseJSON.Message);
                        $("#errors-dialog").dialog();
                    });

                    return false;
                }
            });

            //send message with press Enter
            wrapper.on("keyup", function (e) {
                if ((e.keyCode || e.charCode) === 13) {
                    var message = $("#chat-input").val();
                    if (message != null && message != "") {
                        var channelName = self.findChannelName();
                        var boxId = self.findChatBoxId();
                        var oldscrollHeight = $("#" + boxId)[0].scrollHeight;
                        self.persister.channels.sendMessage(channelName, self.persister.getNickname() + ": " + message)
                        .then(function () {
                            var newscrollHeight = $("#" + boxId)[0].scrollHeight;
                            if (newscrollHeight > oldscrollHeight) {
                                $("#" + boxId).scrollTop($("#" + boxId)[0].scrollHeight);
                            }                           
                            $("#chat-input").val("");
                        }, function (err) {
                            $("#chat-errors").html(err.responseJSON.Message);
                            $("#errors-dialog").dialog();
                        });
                        return false;
                    }
                }

            });


            // Exit channel
            wrapper.on("click", "#tabs ul li span", function (parameters) {
                var boxId = $(this).parent('li').attr("aria-controls");
                $("#" + boxId).remove();
                var name = $(this).prev().text();
                self.persister.channels.exitChannel(name)
                    .then(function (data) {
                        self.unloadChatBox(name);
                    }, function (err) {
                        $("#chat-errors").html(err.responseJSON.Message);
                        $("#errors-dialog").dialog();
                    });
                return false;
            });
        },

        addTab: function (clicked) {
            var tabTitle = $("#tab_title"),
                    tabContent = $("#tab_content"),
                    tabTemplate = "<li #{selected}><a href='#{href}'>#{label}</a> <span class='ui-icon ui-icon-close' role='presentation'>Remove Tab</span></li>";
            var tabs = $("#tabs").tabs();
            $("#tabs li").attr("channel-selected", false);
            var label = clicked || "Tab " + tabCounter,
                id = "tabs-" + this.tabCounter,
                selected = "channel-selected=true",
                li = $(tabTemplate.replace(/#\{href\}/g, "#" + id).replace(/#\{label\}/g, label).replace(/#\{selected\}/g, selected)),
                tabContentHtml = tabContent.val() || "Tab " + this.tabCounter + " content.";

            tabs.find(".ui-tabs-nav").append(li);
            tabs.append("<div id='" + id + "'></div>");
            tabs.tabs("refresh");
            this.tabCounter++;

            return false;
        },

        getChannels: function () {
            var self = this;
            setInterval(function () {
                self.persister.channels.getAll()
                    .then(function (data) {
                        var channelsHtml = "";
                        for (var i = 0; i < data.length; i++) {
                            channelsHtml += '<li><a href"#" >' + data[i].name + '</a></li>';
                        }
                        $("#update-area").html(channelsHtml);
                    });
            }, 1000);
        },

        loadJoinedChatsTabs: function () {
            var self = this;
            this.persister.channels.getAll()
                .then(function (data) {
                    for (var i = 0; i < data.length; i++) {
                        var users = data[i].users;
                        for (var j = 0; j < users.length; j++) {
                            if (users[j] == self.persister.getNickname()) {
                                self.addTab(data[i].name);
                                var containerId = self.findChatBoxId();
                                self.loadChatBox(data[i].name, containerId);
                                break;
                            }
                        }
                    }
                });
        },

        loadChatBox: function (channelName, id) {
            var pubnub = PUBNUB.init({
                publish_key: 'pub-c-5093de55-5a92-4b74-9522-d10c4c129dcc',
                subscribe_key: 'sub-c-20837058-05f4-11e3-991c-02ee2ddab7fe',
            });

            pubnub.subscribe({
                channel: channelName,
                callback: function (message) {
                    // Received a message --> print it in the page
                    document.getElementById(id).innerHTML += message + '<br/>';
                }
            });
        },

        unloadChatBox: function (channelName) {
            var pubnub = PUBNUB.init({
                publish_key: 'pub-c-5093de55-5a92-4b74-9522-d10c4c129dcc',
                subscribe_key: 'sub-c-20837058-05f4-11e3-991c-02ee2ddab7fe',
            });
            pubnub.unsubscribe({
                channel: channelName
            });
        },

        findChannelName: function(){
            var boxes = $("#tabs ul li");
            var channelName;
            for (var i = 0; i < boxes.length; i++) {
                if (boxes[i].getAttribute("channel-selected") == "true") {
                    channelName = boxes[i].children[0].innerHTML;
                }
            }
            return channelName;
        },

        findChatBoxId: function () {
            var list = $("#tabs li");
            var id = "";
            for (var i = 0; i < list.length; i++) {
                if (list[i].getAttribute("channel-selected") == "true") {
                    id = list[i].getAttribute("aria-controls");
                }
            }

            return id;
        }
    });

    return {
        get: function (dataPersister) {
            return new Access(dataPersister);
        }
    };
}());