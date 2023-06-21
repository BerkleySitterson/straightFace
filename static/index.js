document.addEventListener("DOMContentLoaded", function() { // Ensuring the HTML files are loaded in before JS file in browser
    
    if (window.location.pathname === '/funnyPage.html') { // Starts the video capture once the user is redirected to videoChat.html
        startFunnyVideoCapture();
    }

    function startFunnyVideoCapture() { // Function to start capturing video feed
        var videoElement = document.getElementById('funnyVideo');

        navigator.mediaDevices.getUserMedia({ video: true }) // Requesting access to user's camera
          .then(function (stream) {
            videoElement.srcObject = stream; // Set the video stream as the source for the <video> element
          })
          .catch(function (error) {
            console.error('Error accessing camera:', error);
        });
    }


    if (window.location.pathname === '/seriousPage.html') { // Starts the video capture once the user is redirected to videoChat.html
        startSeriousVideoCapture();
    }

    function startSeriousVideoCapture() { // Function to start capturing video feed
        var videoElement = document.getElementById('seriousVideo');

        navigator.mediaDevices.getUserMedia({ video: true }) // Requesting access to user's camera
          .then(function (stream) {
            videoElement.srcObject = stream; // Set the video stream as the source for the <video> element
          })
          .catch(function (error) {
            console.error('Error accessing camera:', error);
        });
    }




    

});




