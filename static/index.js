document.addEventListener("DOMContentLoaded", function() {

    const socket = io(); 
    let localStream;
    let remoteStream;
    let peerConnection;

    const servers = {
        iceServers:[
            {
                urls:['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302']
            }
        ]
    }

    document.getElementById("funnyBtn").addEventListener("click", function() { // Once User has chosen funny role, add them to funnyUsers Queue
        let username = document.getElementById("username").value;
        socket.emit("user_join_funny", username);
    });
    
    document.getElementById("seriousBtn").addEventListener("click", function() { // Once User has chosen serious role, add them to seriousUsers Queue
        let username = document.getElementById("username").value;
        socket.emit("user_join_serious", username);                
    });

    socket.on("increment_funny_queue", function(funnyQueue) { // Updating the funny queue counter and displaying it
        document.getElementById("funnyQueueNum").innerHTML = "Funny Queue: " + funnyQueue.length;
    });

    socket.on("increment_serious_queue", function(seriousQueue) { // Updating the serious queue counter and displaying it
        document.getElementById("seriousQueueNum").innerHTML = "Serious Queue: " + seriousQueue.length;
    });

    socket.on("users_paired", function() {
        document.getElementById("landingPage").style.display = "none"; // Hiding the landing page and displaying the video-chat page
        document.getElementById("video-chat").style.display = "block";
    
        navigator.mediaDevices.getUserMedia({ video: true, audio: false }) // Requesting access to user's camera and microphone
                .then(function (stream) {
                    localStream = stream;
                    funnyVideo.srcObject = localStream; // Set the video stream as the source for the <video> element
                })
                .catch(function (error) {
                    console.error('Error accessing camera:', error);
                });

        createOffer();
    });

    socket.on("display_funny_username", function(data) { // Displaying the funny username
        document.getElementById("funnyUsername").innerHTML = data["username"];
    });

    socket.on("display_serious_username", function(data) { // Displaying the serious username
        document.getElementById("seriousUsername").innerHTML = data["username"];
    });
           
    document.getElementById("disconnectBtn").addEventListener("click", function() { // When 'disconnectBtn' is clicked, it lets the server know, displays the landing-page, and stops the video stream
        socket.emit("disconnect_user")
    
        document.getElementById("landingPage").style.display = "block";
        document.getElementById("video-chat").style.display = "none";
    
        stopStream(); 
    });
    
    socket.on("user_left", function() { // When partner has left, diplay landing page and stop video/audio
        document.getElementById("landingPage").style.display = "block";
        document.getElementById("video-chat").style.display = "none";
    
        stopStream();
    });
    
    function stopStream() { // Stopping video/audio media feed
        if (localStream) {
            const tracks = localStream.getTracks();
            tracks.forEach(track => track.stop());
            localStream = null;
        }
    }
    
    document.getElementById("message").addEventListener("keyup", function(event) { // When user clicks 'enter' key, their message is sent to flask server and then returned to null
        if (event.key == "Enter") {
            let message = document.getElementById("message").value;
            socket.emit("new_message", message);
            document.getElementById("message").value = "";
        }
    });
    
    socket.on("chat", function (data) { // Recieves message from server and displays it to all users in a specific room
        let ul = document.getElementById("chat-messages");
        let li = document.createElement("li");
        li.style.listStyleType = "none";
        li.appendChild(document.createTextNode(data["username"] + ": " + data["message"]));
        ul.appendChild(li);
        ul.scrolltop = ul.scrollHeight;
    });

    function createOffer() {
        peerConnection = new RTCPeerConnection(servers);

        remoteStream = new MediaStream();
        document.getElementById("seriousVideo").srcObject = remoteStream;

        localStream.getTracks().forEach((track) => {
            peerConnection.addTrack(track, localStream);
        });

        peerConnection.ontrack = (event) => {
            event.streams[0].getTracks().forEach((track) => {
                remoteStream.addTrack(track); 
            });
        }

        peerConnection.onicecandidate = async (event) => {
            if (event.candidate) {
                console.log('New ICE candidate: ', event.candidate);
            }
        }

        let offer = peerConnection.createOffer();
        peerConnection.setLocalDescription(offer);

        console.log('Offer: ', offer);
    }

});




