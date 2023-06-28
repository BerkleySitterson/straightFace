# StraightFace: Video-Chat Roulette Web App

## A video-chat app where 2 users are paired randomly and one of them must make the other one laugh built using Flask/SocketIO/WebRTC/OpenCV.

StraightFace takes its own twist on modern video-chat roulette applications. Instead of just calling somone, the goal is to make your opponent laugh, or be the one trying to stay serious. It utilizes SocketIO to pair users, WebRTC to establish a video connection, and OpenCV to detect if the user is smiling or laughing.

## Features

-**Random Pairing**: Users are randomly matched with another user for a one-on-one video call.
-**Video Calling**: The app utilizes WebRTC technology to enable real-time video and audio communication between the paired users.
-**Entertainment Challenge**: One user is tasked with making the other user smile or laugh during the call, adding an element of fun and spontaneity.
-**Chat Functionality**: If the user does not posess a camera, they can use the chat feature to communicate.
-**Flask/SocketIO Backend**: Flask and Socket.IO are used to create the web server and handle real-time communication between clients.
-**Smile/Laugh Detection**: The OpenCV library is used for video processing and facial expression recognition to determine if the challenge is successfully met.

## Installation

To run this app on your own machine, follow the steps below:

1. Clone this repository - 'git clone https://github.com/BerkleySitterson/straightFace'

2. Install the required dependencies- 'pip install -r requirements.txt'

3. Start the local server- 'python app.py'

4. Open in your browser- 'http://localhost:5000'

5. Enjoy!

## Contributing

Contributions are welcome! If you find any issues or have suggestions for improvements, please open an issue or submit a pull request to the repository.

## License

N/A



