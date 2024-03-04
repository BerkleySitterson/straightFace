import eventlet
import queue
import os

from flask import Flask, render_template, request, session
from flask_socketio import SocketIO, join_room, emit
from database.db import Database
from authentication.auth_tools import hash_password

eventlet.monkey_patch()

app = Flask(__name__, static_folder='static')
global db
db = Database()
app.config['SECRET_KEY'] = 'secret_key'
socketio = SocketIO(app, cors_allowed_origins="*", asynch_mode='eventlet')
PORT = int(os.environ.get('PORT', 5000))
HOST = '0.0.0.0'
app.debug = True 

funnyQueue = queue.Queue()
seriousQueue = queue.Queue()



def is_logged_in():
    """
    Check if a user is logged in.

    Returns:
        bool: True if the user is logged in, False otherwise.
    """
    username = session.get("username")
    if username and username != "Anonymous":
        return True
    else:
        return False



@app.route('/')
def index():
    """
    Render the appropriate template based on whether the user is logged in or not.

    Returns:
        str: Rendered HTML template.
    """
    username = session.get("username")
    
    if is_logged_in():
        return render_template('home.html', username=username)
    else:
        return render_template('index.html')



@app.route('/login')
def login_page():
    """
    Render the login page.

    Returns:
        str: Rendered HTML template for the login page.
    """
    return render_template('login.html')



@app.route('/home', methods=['POST'])
def login():
    """
    Handle user login requests.

    Returns:
        str: Rendered HTML template for the home page if login is successful,
             otherwise, render the login page with an error message.
    """
    username = request.form['username']
    password = request.form['password']
    
    if db.login_pipeline(username, password):
        session["username"] = username
        return render_template('home.html', username=username)
    else:
        return render_template('login.html', errMsg="Invalid Username or Password")



@app.route('/register')
def register_page():
    """
    Render the registration page.

    Returns:
        str: Rendered HTML template for the registration page.     
    """
    return render_template('register.html')



@app.route('/register', methods=['POST'])
def register():
    """
    Handle user registration requests.

    Returns:
        str: Rendered HTML template for the home page if registration and login are successful,
             otherwise, render the registration page with an error message or the index page.        
    """
    data = request.form
    username = data.get('username', '')
    password = data.get('password', '')
    email = data.get('email', '')
    first_name = data.get('first_name', '')
    last_name = data.get('last_name', '')

    if any(value == '' for value in [username, password, email, first_name, last_name]):
        return render_template('register.html', errMsg="Please make sure all fields are complete.")
    else:
        password_hash, salt = hash_password(password)
        db.add_new_user(username, password_hash, salt, email, first_name, last_name)
        
        if db.login_pipeline(username, password):
            session["username"] = username
            return render_template('home.html', username=username)
        else:
            return render_template('index.html')



@app.route('/account')
def account_page():
    """
    Render the account page with corresponding data.

    Returns:
        str: Rendered HTML template for the account page with username, email, totalMatches, funnyWL, and seriousWL.
    """
    username = session.get("username")
    email = db.get_email_by_username(username)
    totalMatches = db.getTotalMatches(username)
    funnyWL = db.getFunnyRecord(username)
    seriousWL = db.getSeriousRecord(username)
    
    if username is not None:
        return render_template('account.html', username=username, email=email, totalMatches=totalMatches, funnyWL=funnyWL, seriousWL=seriousWL)
    else:
        return render_template('account.html', username="Please log in or sign up")



@app.route('/videoChat_funny')
def videoChatFunny():
    """
    Render the video chat page for funny role.

    Returns:
        str: Rendered HTML template for the video chat page.
    """
    if is_logged_in():
        username = session["username"]
    else:
        session["username"] = "Anonymous"
        username = session["username"]
    
    session["role"] = "funny"
    role = session["role"]
    return render_template('video-chat.html', funnyUsername=username, seriousUsername="Waiting for Player...", role=role)



@app.route('/videoChat_serious')
def videoChatSerious():
    """
    Render the video chat page for serious role.

    Returns:
        str: Rendered HTML template for the video chat page.
    """
    if not is_logged_in():
        session["username"] = "Anonymous"
    
    username = session["username"]
    
    session["role"] = "serious"
    role = session["role"]
    return render_template('video-chat.html', seriousUsername=username, funnyUsername="Waiting for Player...", role=role)



@app.route('/logout')
def logout():
    """
    Handle user logout requests.

    Returns:
        str: Rendered HTML template for the index page.
    """
    username = session.get("username")

    if username is not None:
        session.pop('username', None)
    return render_template('index.html')



@app.route('/leave_video_chat')
def leave_video_chat():
    """
    Handle leaving the video chat.

    Returns:
        str: Rendered HTML template for the home page or index page based on user login status.
    """
    if is_logged_in():
        username = session["username"]
        funnyRecord = db.getFunnyRecord(username)
        seriousRecord = db.getSeriousRecord(username)
        return render_template('home.html', username=username, funnyWL=funnyRecord, seriousWL=seriousRecord)
    else:
        return render_template('index.html')



@socketio.on("find_new_player")
def findNewPlayer():
    """
    Find a new player for the video chat session.

    This function is triggered when a player requests to find a new player to start a video chat session.

    Returns:
        None
    """
    username = session["username"]
    role = session["role"]
    sid = request.sid
    
    user = {'username': username, 'sid': sid}
    
    if role == "funny":
        funnyQueue.put(user)
    else:
        seriousQueue.put(user)
    
    if funnyQueue.qsize() and seriousQueue.qsize():
        funnyUser = funnyQueue.get()
        seriousUser = seriousQueue.get()
        pair_users(funnyUser, seriousUser)



def pair_users(funnyUser, seriousUser):
    """
    Pair two users for a video chat session.

    This function creates a room for the paired users, joins them to the room, and emits events to set round data and notify the users that they are paired.

    Args:
        funnyUser (dict): Dictionary containing information about the funny role user.
        seriousUser (dict): Dictionary containing information about the serious role user.

    Returns:
        None
    """
    room = f"{funnyUser['sid']}_{seriousUser['sid']}_room"
    
    join_room(room, funnyUser['sid'])
    join_room(room, seriousUser['sid'])
    
    if funnyUser['sid'] == request.sid:
        targetID = seriousUser['sid']    
    else:
        targetID = funnyUser['sid']
    
    funnyUsername = funnyUser['username']
    seriousUsername = seriousUser['username']
    
    emit("set_round_data", {"funnyUsername": funnyUsername, "seriousUsername": seriousUsername, "room": room}, room=room)
    emit("users_paired", {"myID": request.sid, "targetID": targetID})



@socketio.on("data")
def handleSignaling(msg):
    """
    Handle signaling messages for WebRTC communication.

    This function processes incoming signaling messages and emits corresponding events based on the message type.

    Args:
        msg (Object): JSON Object containing the signaling message.

    Returns:
        None
    """
    msg_type = msg["type"]
    target = msg["target"]
    
    if msg_type == "video-offer":
        emit("handleVideoOfferMsg", msg, to=target)
    elif msg_type == "new-ice-candidate":
        emit("handleNewIceCandidateMsg", msg, to=target)
    elif msg_type == "video-answer":
        emit("handleVideoAnswerMsg", msg, to=target)



@socketio.on("startingRound")
def handleStartRound(room):
    """
    Handle the start of a new round in the game.

    Args:
        room (str): The room identifier for the round.

    Returns:
        None
    """
    emit("startRound", room=room)  



@socketio.on("userSmiled")
def handleUserSmile(room, remoteUsername):
    """
    Handle a user smiling during the game round.

    Args:
        room (str): The room identifier for the round.
        remoteUsername (str): The username of the remote user who smiled.

    Returns:
        None
    """
    username = session["username"]
    db.addFunnyWin(remoteUsername)
    db.addSeriousLoss(username)
    emit("endRoundFunnyWin", room=room)



@socketio.on("timerComplete")
def handleTimerComplete(room):
    """
    Handle the completion of the timer during the game round.

    Args:
        room (str): The room identifier for the round.

    Returns:
        None
    """
    username = session["username"]
    role = session["role"]
    if role == "funny":
        db.addFunnyLoss(username)
    elif role == "serious":
        db.addSeriousWin(username)
    emit("endRoundSeriousWin", room=room)



@socketio.on("disconnect_user")
def handle_user_disconnect(room):
    """
    Handle a user disconnecting from the game round.

    Args:
        room (str): The room identifier for the round.

    Returns:
        None
    """
    emit("user_left", room=room)



@socketio.on("disconnect")
def handle_disconnect():
    """
    Handle a user disconnecting from the server.

    Returns:
        None
    """
    username = session["username"]
    session.pop('username', None)
    try:
        db.remove_user_from_queues(username)
    except:
        print(f"User { username } not found in any queues.")



if __name__ == '__main__':
    socketio.run(app, host=HOST, port=PORT)