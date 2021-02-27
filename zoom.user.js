// ==UserScript==
// @name         Zoom
// @version      1.0
// @description  Zoom script
// @author       You
// @match        https://zoom.us/wc/*
// @match        https://*.zoom.us/wc/*
// @grant        none
// @run-at       document-start
// @downloadURL
// ==/UserScript==

var config = {
    "dingOnLeave": true,
    "autoLeaveAtXPeople": 10,
    "autoLeaveEnabled": false,
    "breakoutRoomsAutoJoinEnabled": true,
    "breakoutRoomsAutoJoinDelay": 5,
    "breakoutRoomsAutoLeaveEnabled": true,
    "breakoutRoomsAutoLeaveDelay": 8
};











"use strict";

var script = document.createElement("script");
script.setAttribute("src", "https://cdnjs.cloudflare.com/ajax/libs/dat-gui/0.7.6/dat.gui.min.js");
script.addEventListener("load", function(e){initDatGUI();});
document.head.appendChild(script);



var gui;
var autoLeaveFolder;
var autoLeaveEnabledButton;
var breakoutRoomsFolder;
var breakoutRoomsAutoJoinFolder;
var breakoutRoomsAutoJoinEnabledButton;
var breakoutRoomsAutoLeaveFolder;
var breakoutRoomsAutoLeaveEnabledButton;
var inBreakoutRoom = false;

function updateOnOffButton(button, on) {
    button.name(on?"Enabled":"Disabled");
}

function initDatGUI() {
    gui = new dat.GUI();
    gui.add(config,"dingOnLeave").name("Ding on Leave?");
    autoLeaveFolder = gui.addFolder("Autoleave Meeting");
    autoLeaveFolder.add(config, "autoLeaveAtXPeople", 1, 100).name("Min People");
    autoLeaveEnabledButton = autoLeaveFolder.add(config, "autoLeaveEnabled").onChange(function(newValue) {updateOnOffButton(autoLeaveEnabledButton, newValue);});
    updateOnOffButton(autoLeaveEnabledButton, config.autoLeaveEnabled);
    autoLeaveFolder.open();
    breakoutRoomsFolder = gui.addFolder("Breakout Rooms");
    breakoutRoomsAutoJoinFolder = breakoutRoomsFolder.addFolder("Autojoin Breakout Rooms");
    breakoutRoomsAutoJoinEnabledButton = breakoutRoomsAutoJoinFolder.add(config, "breakoutRoomsAutoJoinEnabled").onChange(function(newValue) {updateOnOffButton(breakoutRoomsAutoJoinEnabledButton, newValue);});
    updateOnOffButton(breakoutRoomsAutoJoinEnabledButton, config.breakoutRoomsAutoJoinEnabled);
    breakoutRoomsAutoJoinFolder.add(config, "breakoutRoomsAutoJoinDelay", 0, 60).name("Delay");
    breakoutRoomsAutoJoinFolder.open();
    breakoutRoomsAutoLeaveFolder = breakoutRoomsFolder.addFolder("Autoleave Breakout Rooms");
    breakoutRoomsAutoLeaveEnabledButton = breakoutRoomsAutoLeaveFolder.add(config, "breakoutRoomsAutoLeaveEnabled").onChange(function(newValue) {updateOnOffButton(breakoutRoomsAutoLeaveEnabledButton, newValue);});
    updateOnOffButton(breakoutRoomsAutoLeaveEnabledButton, config.breakoutRoomsAutoLeaveEnabled);
    breakoutRoomsAutoLeaveFolder.add(config, "breakoutRoomsAutoLeaveDelay", 0, 60).name("Delay");
    breakoutRoomsAutoLeaveFolder.open();
    breakoutRoomsFolder.open();
}

var checkInterval = 0.1;

var leaveMeetingASAP = false;

var participantsOnLastCheck = 0;

var lastBreakoutRoomJoin;
var lastBreakoutRoomLeave;
var lastBreakoutRoomChange;
lastBreakoutRoomJoin = lastBreakoutRoomLeave = lastBreakoutRoomChange = 0;

var alertUIContainer;
var alertUI;
var breakoutRoomIndicator;

function createAlertUI(){
    alertUIContainer = document.createElement("div");
    alertUI = document.createElement("div");
    breakoutRoomIndicator = document.createElement("div");
    alertUIContainer.id = "alertUIContainer";
    alertUI.id = "alertUI";
    breakoutRoomIndicator.id = "breakoutRoomIndicator";
    alertUIContainer.style.position = "fixed";
    alertUIContainer.style.width = "100%";
    alertUIContainer.style.height = "auto";
    alertUIContainer.style.top = "0";
    alertUIContainer.style.left = "100";
    alertUIContainer.style.textAlign = "left";
    alertUIContainer.style.color = "#fff";
    alertUIContainer.style.fontFamily = "monospace";
    alertUIContainer.style.fontWeight = "bold";
    alertUIContainer.style.fontSize = "20px";
    alertUIContainer.style.lineHeight = "1.8";
    alertUIContainer.style.textShadow = "0px 0px 9px #000, 0px 0px 10px #000";
    alertUIContainer.style.pointerEvents = "none";
    alertUIContainer.style.zIndex = "+9999";
    alertUIContainer.appendChild(alertUI);
    alertUIContainer.appendChild(breakoutRoomIndicator);
    document.body.appendChild(alertUIContainer);
}

function setBreakoutRoomStatus(inRoom) {
    if(inRoom == inBreakoutRoom) return;
    playTacoBell();
    if(inRoom) {
        lastBreakoutRoomJoin = lastBreakoutRoomChange = Date.now();
        breakoutRoomIndicator.innerText = "["+new Date().toLocaleTimeString() + "] Breakout Room Status: IN A ROOM";
        breakoutRoomIndicator.style.color = "orange";
    } else {
        lastBreakoutRoomLeave = lastBreakoutRoomChange = Date.now();
        breakoutRoomIndicator.innerText = "["+new Date().toLocaleTimeString() + "] Breakout Room Status: NOT IN A ROOM";
        breakoutRoomIndicator.style.color = "limegreen";
    }
    inBreakoutRoom = inRoom;
}

function scriptLog(alertMessage) {
    alertUI.innerText = "["+new Date().toLocaleTimeString() + "] " + alertMessage;
    alertUI.style.color = "#FFF";
}

function scriptWarning(alertMessage) {
    alertUI.innerText = "["+new Date().toLocaleTimeString() + "] " + alertMessage;
    alertUI.style.color = "red";
}

createAlertUI();

scriptLog("Zoom script enabled!");
setBreakoutRoomStatus(false);

function checkParticipants() {
    var participantsElement = document.querySelector("#wc-footer > div > div.footer__btns-container > button > div > div.footer-button__participants-icon > span > span");
    if(participantsElement==null) {
        console.warn("Participants span missing!");
        return;
    }
    var participants = parseInt(participantsElement.innerText);

    if(config.dingOnLeave && participantsOnLastCheck>participants) {
        playDingNoise();
    }
    participantsOnLastCheck = participants;

    if(config.autoLeaveEnabled && participants <= config.leaveAtXPeople) {
        leaveMeetingASAP = true;
    }

    if(leaveMeetingASAP) {
        leaveMeeting();
    }
}

window.playDingNoise = function() {
    playNoise("//www.myinstants.com/media/sounds/ding-sound-effect_2.mp3");
};

window.playBuzzer = function() {
    playNoise("//www.myinstants.com/media/sounds/wrong-answer-sound-effect.mp3");
};

window.playTacoBell = function() {
    playNoise("//www.myinstants.com/media/sounds/taco-bell-bong-sfx.mp3");
};

window.playNoise = function(url) {
    var player = document.createElement("audio");
    player.src = url;
    player.volume = 1;
    player.preload = "auto";
    player.play();
};


window.leaveMeeting = function() {
    if(document.querySelector(".leave-meeting-options__btn--danger")!=null) {
        document.querySelector(".leave-meeting-options__btn--danger").click();
    }
    if(document.querySelector(".footer__leave-btn")!=null) {
        document.querySelector(".footer__leave-btn").click();
    }
};

setInterval(checkParticipants, checkInterval*1000);


function joinOrLeaveBreakout() {
    var changeTextElement = document.querySelector("div.loading-layer.loading-layer--reset-webclient.loading-layer--bo-room > div > p.loading-layer__bo-room-desc--no-bold");
    if(changeTextElement != null && changeTextElement.innerText == "Returning to Main Session...") {
        setBreakoutRoomStatus(false);
        return;
    } else if (changeTextElement != null && changeTextElement.innerText.startsWith("Joining")) {
        setBreakoutRoomStatus(true);
        return;
    }
    var titles = document.querySelectorAll("div.zm-modal-body > div.zm-modal-body-title");
    for (var i=0;i<titles.length;i++) {
        if(titles[i].innerText=="Breakout Rooms") {
            var button = titles[i].parentElement.parentElement.querySelector("button.zm-btn.zm-btn-legacy.zm-btn--primary.zm-btn__outline--blue") || titles[i].parentElement.parentElement.querySelector("button.zmu-btn.zm-btn-legacy.zmu-btn--primary.zmu-btn__outline--blue");
            if(button.innerText=="Join") {
                setBreakoutRoomStatus(true);
                setTimeout(function(){setBreakoutRoomStatus(true); button.click(); },config.breakoutRoomsAutoJoinDelay*1000);
            }
            else {
                setBreakoutRoomStatus(false);
                setTimeout(function(){setBreakoutRoomStatus(false); button.click(); },config.breakoutRoomsAutoLeaveDelay*1000);
            }
        }
    }
}

setInterval(joinOrLeaveBreakout,5);
