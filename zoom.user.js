// ==UserScript==
// @name         Zoom
// @version      1.0
// @description  Zoom script
// @author       You
// @match        https://zoom.us/wc/*
// @match        https://*.zoom.us/wc/*
// @grant        none
// @run-at       document-start
// @downloadURL  https://github.com/jM1pOpJhre-mJaMOFOMt/zoom/raw/main/zoom.user.js
// ==/UserScript==


var config = {
    "autoLeaveAtXPeople": 10,
    "autoLeaveEnabled": false,
    "autoLeaveDisableInBreakoutRooms": true,
    "breakoutRoomsAutoJoinEnabled": true,
    "breakoutRoomsAutoJoinDelay": 5,
    "breakoutRoomsAutoLeaveEnabled": true,
    "breakoutRoomsAutoLeaveDelay": 8,
    "showLogs": false
};

var possibleSounds = {
    "None": "",
    "Ding": "//www.myinstants.com/media/sounds/ding-sound-effect_2.mp3",
    "Taco Bell": "//www.myinstants.com/media/sounds/taco-bell-bong-sfx.mp3",
    "Buzzer": "//www.myinstants.com/media/sounds/wrong-answer-sound-effect.mp3",
    "Vine Boom": "//www.myinstants.com/media/sounds/vine-boom.mp3"
};




config.otherLeaveNoise = possibleSounds.Ding;
config.breakoutRoomsJoinNoise = possibleSounds.None;
config.breakoutRoomsLeaveNoise = possibleSounds.None;







"use strict";

var script = document.createElement("script");
script.setAttribute("src", "https://cdnjs.cloudflare.com/ajax/libs/dat-gui/0.7.6/dat.gui.min.js");
script.addEventListener("load", function(e){initDatGUI();});
document.head.appendChild(script);


const style = document.createElement('style');
style.textContent = ".dg select{color:black;} #wc-footer,.speaker-bar-container__video-frame,.join-dialog,.speaker-active-container__video-frame,.speaker-view,.speaker-bar-container__horizontal-view-wrap,.gallery-video-container__main-view,.gallery-video-container__wrap,.main-layout{background:transparent !important;} body{background:/*url(https://i.imgur.com/HllNVoe.png)*/#83604F !important;}";
document.head.append(style);


var gui;
var autoLeaveFolder;
var autoLeaveEnabledButton;
var breakoutRoomsFolder;
var breakoutRoomsAutoJoinFolder;
var breakoutRoomsAutoJoinEnabledButton;
var breakoutRoomsAutoLeaveFolder;
var breakoutRoomsAutoLeaveEnabledButton;
var inBreakoutRoom = false;
var breakoutRoomsStarting = false;

function updateOnOffButton(button, on) {
    button.name(on?"Enabled":"Disabled");
}

function initDatGUI() {
    gui = new dat.GUI();
    gui.add(config,"otherLeaveNoise").options(possibleSounds).name("Noise on leave");
    autoLeaveFolder = gui.addFolder("Autoleave Meeting");
    autoLeaveFolder.add(config, "autoLeaveAtXPeople", 1, 100).name("Min People");
    autoLeaveEnabledButton = autoLeaveFolder.add(config, "autoLeaveEnabled").onChange(function(newValue) {updateOnOffButton(autoLeaveEnabledButton, newValue);});
    updateOnOffButton(autoLeaveEnabledButton, config.autoLeaveEnabled);
    autoLeaveFolder.add(config, "autoLeaveDisableInBreakoutRooms").name("Not in Breakouts");
    autoLeaveFolder.open();
    breakoutRoomsFolder = gui.addFolder("Breakout Rooms");
    breakoutRoomsAutoJoinFolder = breakoutRoomsFolder.addFolder("Autojoin Breakout Rooms");
    breakoutRoomsAutoJoinEnabledButton = breakoutRoomsAutoJoinFolder.add(config, "breakoutRoomsAutoJoinEnabled").onChange(function(newValue) {updateOnOffButton(breakoutRoomsAutoJoinEnabledButton, newValue);});
    updateOnOffButton(breakoutRoomsAutoJoinEnabledButton, config.breakoutRoomsAutoJoinEnabled);
    breakoutRoomsAutoJoinFolder.add(config, "breakoutRoomsAutoJoinDelay", 0, 60).name("Delay");
    breakoutRoomsAutoJoinFolder.add(config, "breakoutRoomsJoinNoise", 0, 60).options(possibleSounds).name("Noise");
    breakoutRoomsAutoJoinFolder.open();
    breakoutRoomsAutoLeaveFolder = breakoutRoomsFolder.addFolder("Autoleave Breakout Rooms");
    breakoutRoomsAutoLeaveEnabledButton = breakoutRoomsAutoLeaveFolder.add(config, "breakoutRoomsAutoLeaveEnabled").onChange(function(newValue) {updateOnOffButton(breakoutRoomsAutoLeaveEnabledButton, newValue);});
    updateOnOffButton(breakoutRoomsAutoLeaveEnabledButton, config.breakoutRoomsAutoLeaveEnabled);
    breakoutRoomsAutoLeaveFolder.add(config, "breakoutRoomsAutoLeaveDelay", 0, 60).name("Delay");
    breakoutRoomsAutoLeaveFolder.add(config, "breakoutRoomsLeaveNoise", 0, 60).options(possibleSounds).name("Noise");
    breakoutRoomsAutoLeaveFolder.open();
    breakoutRoomsFolder.open();
    gui.add(config,"showLogs").name("Show logs").onChange(function(newValue){logsContainer.style.visibility=newValue?"visible":"hidden";});
}

var checkInterval = 0.1;

var leaveMeetingASAP = false;

var participantsOnLastCheck = 0;

var lastBreakoutRoomJoin;
var lastBreakoutRoomLeave;
var lastBreakoutRoomChange;
lastBreakoutRoomJoin = lastBreakoutRoomLeave = lastBreakoutRoomChange = 0;

window.playNoise = function(url) {
    if(url==null||url=="")return;
    var player = document.createElement("audio");
    player.src = url;
    player.volume = 1;
    player.preload = "auto";
    player.play();
};

var alertUIContainer;
var alertUI;
var breakoutRoomIndicator;
var participantsIndicator;
var logsContainer;

function createAlertUI(){
    alertUIContainer = document.createElement("div");
    alertUI = document.createElement("div");
    breakoutRoomIndicator = document.createElement("div");
    participantsIndicator = document.createElement("div");
    logsContainer = document.createElement("div");
    alertUIContainer.id = "alertUIContainer";
    alertUI.id = "alertUI";
    breakoutRoomIndicator.id = "breakoutRoomIndicator";
    participantsIndicator.id = "participantsIndicator";
    alertUIContainer.style.position = "fixed";
    alertUIContainer.style.width = "100%";
    alertUIContainer.style.height = "auto";
    alertUIContainer.style.top = "0";
    logsContainer.style.marginTop="25";
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
    logsContainer.style.visibility=config.showLogs?"visible":"hidden";
    alertUIContainer.appendChild(alertUI);
    alertUIContainer.appendChild(breakoutRoomIndicator);
    alertUIContainer.appendChild(participantsIndicator);
    alertUIContainer.appendChild(logsContainer);
    document.body.appendChild(alertUIContainer);
}

function setBreakoutRoomStatus(inRoom) {
    if(inRoom == inBreakoutRoom && document.querySelector("#breakoutRoomIndicator").innerText!="") return;
    if(inRoom) {
        breakoutRoomsStarting = false;
        playNoise(config.breakoutRoomsJoinNoise);
        lastBreakoutRoomJoin = lastBreakoutRoomChange = Date.now();
        breakoutRoomIndicator.innerText = "["+new Date().toLocaleTimeString() + "] Breakout Room Status: IN A ROOM";
        breakoutRoomIndicator.style.color = "orange";
        scriptLog("Breakout Room Status: IN A ROOM");
    } else {
        if(lastBreakoutRoomChange != 0) {
            playNoise(config.breakoutRoomsLeaveNoise);
        }
        lastBreakoutRoomLeave = lastBreakoutRoomChange = Date.now();
        breakoutRoomIndicator.innerText = "["+new Date().toLocaleTimeString() + "] Breakout Room Status: NOT IN A ROOM"+(breakoutRoomsStarting?" (Breakout Rooms Starting)":"");
        breakoutRoomIndicator.style.color = "limegreen";
        scriptLog("Breakout Room Status: NOT IN A ROOM"+(breakoutRoomsStarting?" (Breakout Rooms Starting)":""));
    }
    inBreakoutRoom = inRoom;
}

function scriptLogMain(alertMessage) {
    alertUI.innerText = "["+new Date().toLocaleTimeString() + "] " + alertMessage;
    alertUI.style.color = "#FFF";
    scriptLog(alertMessage);
}

function scriptLog(alertMessage) {
    var newLog = document.createElement("div");
    newLog.innerText = "["+new Date().toLocaleTimeString() + "] " + alertMessage;
    newLog.style.color="#FFF";
    logsContainer.prepend(newLog);
}

function scriptWarningMain(alertMessage) {
    alertUI.innerText = "["+new Date().toLocaleTimeString() + "] " + alertMessage;
    alertUI.style.color = "orange";
    scriptWarning(alertMessage);
}

function scriptWarning(alertMessage) {
    var newLog = document.createElement("div");
    newLog.innerText = "["+new Date().toLocaleTimeString() + "] " + alertMessage;
    newLog.style.color="orange";
    logsContainer.prepend(newLog);
    console.warn(alertMessage);
}

function scriptLogParticipants(alertMessage) {
    scriptLog(alertMessage);
}

function scriptLogParticipantsUp(oldP, newP) {
    participantsIndicator.innerText = "["+new Date().toLocaleTimeString() + "] Participants: "+newP+(oldP!=-1?" ("+oldP+" -> "+newP+")":"");
    participantsIndicator.style.color = "limegreen";
    scriptLog("Participants: "+newP+(oldP!=-1?" ("+oldP+" -> "+newP+")":""));
}

function scriptLogParticipantsDown(oldP, newP) {
    participantsIndicator.innerText = "["+new Date().toLocaleTimeString() + "] Participants: "+newP+(oldP!=-1?" ("+oldP+" -> "+newP+")":"");
    participantsIndicator.style.color = "orange";
    scriptLog("Participants: "+newP+(oldP!=-1?" ("+oldP+" -> "+newP+")":""));
}

function scriptWarningParticipants(alertMessage) {
    participantsIndicator.innerText = "["+new Date().toLocaleTimeString() + "] "+alertMessage;
    participantsIndicator.style.color = "orange";
    scriptWarning(alertMessage);
}

createAlertUI();

scriptLogMain("Zoom script enabled!");

setBreakoutRoomStatus(false);

function checkParticipants() {
    var participantsElement = document.querySelector("#wc-footer > div > div.footer__btns-container > button > div > div.footer-button__participants-icon > span > span");
    if(participantsElement==null || isNaN(participantsElement.innerText)) {
        if(participantsOnLastCheck == -1)return;
        scriptWarningParticipants("Participants number missing!");
        participantsOnLastCheck = -1;
        return;
    }

    var participants = parseInt(participantsElement.innerText);

    if (participantsOnLastCheck < participants) {
        scriptLogParticipantsUp(participantsOnLastCheck, participants);
    } else if (participantsOnLastCheck > participants) {
        scriptLogParticipantsDown(participantsOnLastCheck, participants);
        playNoise(config.otherLeaveNoise);
    }



    if(config.autoLeaveEnabled && participants <= config.leaveAtXPeople && !(config.autoLeaveDisableInBreakoutRooms && inBreakoutRoom)) {
        leaveMeetingASAP = true;
    }

    if(leaveMeetingASAP && !(config.autoLeaveDisableInBreakoutRooms && inBreakoutRoom)) {
        leaveMeeting();
    }

    participantsOnLastCheck = participants;
}

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
    var toastElement = document.querySelector("#zmu-toast-container > div:last-child > div > div > span");
    if(toastElement != null && toastElement.innerText == "You are now in the main session") {
        setBreakoutRoomStatus(false);
    } else if (toastElement != null && toastElement.innerText.startsWith("You are now in a Breakout Room: ")) {
        setBreakoutRoomStatus(true);
    }
    var titles = document.querySelectorAll("div.zm-modal-body > div.zm-modal-body-title");
    for (var i=0;i<titles.length;i++) {
        if(titles[i].innerText=="Breakout Rooms") {
            var button = titles[i].parentElement.parentElement.querySelector("button.zm-btn.zm-btn-legacy.zm-btn--primary.zm-btn__outline--blue") || titles[i].parentElement.parentElement.querySelector("button.zmu-btn.zm-btn-legacy.zmu-btn--primary.zmu-btn__outline--blue");
            if(button.innerText=="Join") {
                breakoutRoomsStarting = true;
                //setBreakoutRoomStatus(true);
                setTimeout(function(){/*setBreakoutRoomStatus(true);*/ button.click(); },config.breakoutRoomsAutoJoinDelay*1000);
            }
            else {
                //setBreakoutRoomStatus(false);
                setTimeout(function(){/*setBreakoutRoomStatus(false);*/ button.click(); },config.breakoutRoomsAutoLeaveDelay*1000);
            }
        }
    }
}

setInterval(joinOrLeaveBreakout,0);
