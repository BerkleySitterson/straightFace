document.addEventListener("DOMContentLoaded", function() {
    const socket = io(); 
    let mediaStream;

    document.getElementById("funnyBtn").addEventListener("click", function() { // Once User has chosen funny role, add them to funnyUsers Queue
        let username = document.getElementById("username").value;
        socket.emit("user_join_funny", username);
    });
    
    document.getElementById("seriousBtn").addEventListener("click", function() { // Once User has chosen serious role, add them to seriousUsers Queue
        let username = document.getElementById("username").value;
        socket.emit("user_join_serious", username);                
    });
    
    socket.on("users_paired", (roomName) => {
        pairing_complete(roomName);
    });
    
    function pairing_complete(roomName) {
        document.getElementById("landingPage").style.display = "none"; // Hiding the landing page and displaying the video-chat page
        document.getElementById("video-chat").style.display = "block";
    
        navigator.mediaDevices.getUserMedia({ video: true }) // Requesting access to user's camera and microphone
                .then(function (stream) {
                    mediaStream = stream;
                    seriousVideo.srcObject = stream; // Set the video stream as the source for the <video> element
                })
                .catch(function (error) {
                    console.error('Error accessing camera:', error);
                });
    }
    
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
        if (mediaStream) {
            const tracks = mediaStream.getTracks();
            tracks.forEach(track => track.stop());
            mediaStream = null;
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

});




