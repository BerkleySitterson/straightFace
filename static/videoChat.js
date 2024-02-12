/**
 * @fileoverview This file contains the client-side code for the video-chat, face detection, and round logic for the application.
 * 
 * @description Main functionality of this file includes managing the video and audio feeds, smile detection, timer control, and ending the round.
 * 
 * @author Berkley Sitterson
 * 
 * @requires socket.io.js - https://cdnjs.cloudflare.com/ajax/libs/socket.io/4.7.0/socket.io.js
 * @requires face-api.js - https://cdnjs.cloudflare.com/ajax/libs/face-api.js/0.22.2/face-api.js
 *
 */

let localStream, countdownInterval, detectionInterval, remoteUsername, myID, targetID, room;
let tracksReceieved = 0;

const protocol = window.location.protocol;
const socket = io(protocol + '//' + document.domain + ':' + location.port, {autoConnect: true});
const mediaConstraints = { audio: true, video: true };
const funnyVideo = document.getElementById("funnyVideo");
const seriousVideo = document.getElementById("seriousVideo");
const searchBtn = document.getElementById("searchBtn");
const screenShareBtn = document.getElementById("screenShareBtn");

navigator.mediaDevices.getUserMedia(mediaConstraints) // Playing Video/Audio after user has accepted permissions based on role
    .then((stream) => {
        handleLocalStream(stream);
});

/**
 * @description If user has accepted video/audio permissions, set local stream and play media feeds. Based on what role the user has chosen.
 * @param {MediaStream} stream - The video and audio feed of the current user
 * @throws {Exception} Throws an exception if the user has not accepted video/audio permissions
 */
function handleLocalStream(stream) {
    try {
        localStream = stream;
        if (role === "funny") {
            funnyVideo.srcObject = localStream;
            funnyVideo.muted = true;
            funnyVideo.play();
        } else {
            seriousVideo.srcObject = localStream;
            seriousVideo.muted = true;
            seriousVideo.play();
        }
    } catch(Exception)  {
        console.log("Error getting Video or Audio: " + Exception);
    }
};
    

searchBtn.addEventListener("click", () => { // If user has accepted permissions and clicks search, emit event to find new player
    try {
        if (localStream.getVideoTracks().length > 0 && localStream.getAudioTracks().length > 0) {
            searchBtn.disabled = true;
            document.getElementById("timer").textContent = "";
            socket.emit("find_new_player");
        }
    } catch (Exception) {
        console.log('Error: Video or Audio not detected: ' + Exception.toString());
    }
});

socket.on("set_round_data", (data) => { // Set round data and display remote username
    if (role === "funny") {
        remoteUsername = data['seriousUsername'];
        console.log("Role is " + role + " and remote username is " + remoteUsername);
        document.getElementById("seriousUsername").textContent = remoteUsername;
    } else {
        remoteUsername = data['funnyUsername'];
        console.log("Role is " + role + " and remote username is " + remoteUsername);
        document.getElementById("funnyUsername").textContent = remoteUsername;
    }
    room = data['room'];
});

// Smile Detection using Face-API.js

async function detectSmile() { // Detect smile using face-api.js

    console.log('detectSmile() executing...');
    try {

        Promise.all([
            faceapi.nets.tinyFaceDetector.loadFromUri('../static/models'),
            faceapi.nets.faceExpressionNet.loadFromUri('../static/models')
        ]);

        console.log('Models Loaded');

        const canvas = await faceapi.createCanvasFromMedia(seriousVideo);          
        document.body.append(canvas);

        const vwWidth = 45;
        const vhHeight = 30; 
        const displaySize = { width: vwWidth * window.innerWidth / 100, height: vhHeight * window.innerHeight / 100 };

        await faceapi.matchDimensions(canvas, displaySize);
        
        const options = await new faceapi.TinyFaceDetectorOptions();            
        const canvasContext = await canvas.getContext('2d', { willReadFrequently: true });
        console.log('Commencing Face Detection');
        detectionInterval = setInterval(async () => {
            try {
                let detections = await faceapi.detectAllFaces(seriousVideo, options).withFaceExpressions();
                await canvasContext.clearRect(0, 0, canvas.width, canvas.height);

                if (detections && detections[0] && detections[0].expressions.happy >= 0.99) {
                    console.log('Happy Emotion Detected');
                    updateSmileIndicator(Math.floor(100));
                    socket.emit("userSmiled", room, remoteUsername);           
                } else {
                    updateSmileIndicator(detections[0].expressions.happy * 100);
                }
            }
            catch (Exception) {
                console.log('Detection Error!:' + Exception.toString())
            }                
        }, 80)
    }
    catch (Exception) {
        console.log('Canvas Error!:' + Exception.toString());
    }
}

socket.on('startRound', () => { // Start round and timer
    console.log('Starting Round');

    startTimer();

    try {
        if (role === "serious") {
            detectSmile();
        } 
    } catch (Exception) {
        console.log("Error Starting Round: " + Exception.toString());
    }

});

function startTimer() { // Start timer and emit event to start round on backend
    const timer = document.getElementById('timer');
    const countdownDuration = 59;
    
    const startTime = new Date().getTime();
    
    updateCountdown();
    
    countdownInterval = setInterval(updateCountdown, 1000);

    function updateCountdown() {
        const currentTime = new Date().getTime();
        const elapsedTime = (currentTime - startTime) / 1000;
        const remainingTime = countdownDuration - elapsedTime;
    
        if (remainingTime > 0) {
            timer.innerText = remainingTime.toFixed(0);  
        } else {
            socket.emit('timerComplete', room);
        }
        }
}

socket.on('endRound', function () { // End round and reset variables
    try {
        const timer = document.getElementById('timer');
        const funnyTracks = funnyVideo.srcObject.getTracks();
        const seriousTracks = seriousVideo.srcObject.getTracks();

        clearInterval(countdownInterval);
        clearInterval(detectionInterval);   

        funnyTracks[0].stop();
        seriousTracks[0].stop();

        room = "";
        targetID = "";

        myPeerConnection.close();
        tracksReceieved = 0;
        searchBtn.disabled = false;
        timer.textContent = "1:00";
 
        if (role === "funny") {
            document.getElementById("seriousUsername").textContent = "Waiting for Player...";
        } else {
            document.getElementById("funnyUsername").textContent = "Waiting for Player...";
        }
        
    } catch (e) {
        console.log("Error ending round w/ funny win: " + e.toString());
    }
});

const shareScreen = async () => { // Share screen feature
    const mediaStream = await getLocalScreenCaptureStream();
    const screenTrack = mediaStream.getVideoTracks()[0];

    if (screenTrack) {
        console.log('Replacing video stream with screen track');
        replaceTrack(screenTrack);
    }
};

const getLocalScreenCaptureStream = async () => {
    try {
        const constraints = { video: { cursor: 'always' }, audio: false };
        const screenCaptureStream = await navigator.mediaDevices.getDisplayMedia(constraints);
    
        return screenCaptureStream;
        } catch (error) {
        console.error('failed to get local screen', error);
        }
};

const replaceTrack = (newTrack) => {
    localStream.removeTrack(localStream.getVideoTracks()[0]);
    localStream.addTrack(newTrack);
    const sender = myPeerConnection.getSenders().find(sender =>
        sender.track.kind === newTrack.kind 
    );
    
    if (!sender) {
        console.warn('failed to find sender');
    
        return;
    }
    
    sender.replaceTrack(newTrack);
}

document.getElementById("disconnectBtn").addEventListener("click", function() { 
    socket.emit("disconnect_user", room);
});



socket.on("user_left", function() { // User has left, reset variables, and close peer connection
    try {
        const funnyTracks = funnyVideo.srcObject.getTracks();
        const seriousTracks = seriousVideo.srcObject.getTracks();

        funnyTracks[0].stop();
        seriousTracks[0].stop();

        myPeerConnection.close();
    } catch (e) {
        console.log("No tracks detected: " + e.toString());
    }
});

function updateSmileIndicator(smileIntensity) {
    const smileBar = document.querySelector('.smile-bar');
    smileBar.style.height = `${smileIntensity}%`;
}