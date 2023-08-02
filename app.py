import eventlet

from flask import Flask, redirect, render_template, request, url_for
from flask_socketio import SocketIO, join_room, rooms, close_room
from database.db import Database
from authentication.auth_tools import login_pipeline, update_passwords, hash_password

eventlet.monkey_patch()

app = Flask(__name__, static_folder='static')
HOST, PORT = 'localhost', 5000
global username, db, logged_in
username = 'default'
db = Database('database/straightface.db')
app.debug = True;
socketio = SocketIO(app, cors_allowed_origins="*", asynch_mode='eventlet')
app.config['SECRET'] = "secret"

funnyQueue = [] # Queue to store funny users info
seriousQueue = [] # Queue to store serious users info
activeUsers = {} # Dictionary to store all active users and their corresponding sid
connectedUsersNum = 0 # Number of total connected users

@app.route('/')  # Render index.html when website is first visited
def index():
    return render_template('index.html')


@app.route('/login')
def login_page():
    """
    Renders the login page when the user is at the `/login` endpoint.

    args:
        - None

    returns:
        - None
    """
    return render_template('login.html')


@app.route('/home', methods=['POST'])
def login():
    """
    Renders the home page when the user is at the `/home` endpoint with a POST request.

    args:
        - None

    returns:
        - None

    modifies:
        - sessions: adds a new session to the sessions object

    """
    username = request.form['username']
    password = request.form['password']
    if login_pipeline(username, password):
        logged_session()
        return render_template('home.html', username=username)
    else:
        print(f"Incorrect username ({username}) or password ({password}).")
        return render_template('index.html', errorMessage="Invalid username or password.")
    

def logged_session():
    global logged_in 
    logged_in = True


@app.route('/register')
def register_page():
    """
    Renders the register page when the user is at the `/register` endpoint.

    args:
        - None

    returns:
        - None
    """
    return render_template('register.html')


@app.route('/register', methods=['POST'])
def register():
    """
    Renders the index page when the user is at the `/register` endpoint with a POST request.

    args:
        - None

    returns:
        - None

    modifies:
        - passwords.txt: adds a new username and password combination to the file
        - database/straightface.db: adds a new user to the database
    """
    username = request.form['username']
    password = request.form['password']
    email = request.form['email']
    first_name = request.form['first_name']
    last_name = request.form['last_name']
    
    if username == "" or password == "" or email == "" or first_name == "" or last_name == "":
        return render_template('register.html', errorMessage="Please fill in all required fields.")
    else:      
        salt, key = hash_password(password)
        update_passwords(username, key, salt)
        db.add_new_user(username, key, email, first_name, last_name)
        return redirect(url_for('index'))

@app.route('/logout', methods=['POST'])
def logout():
    """
    Renders the index page when the user clicks 'Logout' button.

    args:
        - None

    returns:
        - None
    """
    return redirect(url_for('index'))

       
if __name__ == '__main__':
    socketio.run(app, host='localhost')
    
 

    
# @socketio.on('connect') # Display current queue numbers and connections
# def on_connect():
#     global connectedUsersNum
#     connectedUsersNum += 1
#     socketio.emit("increment_funny_queue", funnyQueue)
#     socketio.emit("increment_serious_queue", seriousQueue)
#     socketio.emit("change_user_count", connectedUsersNum)

        
# @socketio.on("user_join_funny") # User joins 'funny' team and is inserted into the waiting queue
# def handle_user_join_funny(username):
    
#     print(f"User {username} has joined the funny side!")
    
#     sid = request.sid
#     activeUsers[username] = sid
#     funnyQueue.append((username, sid))
#     attempt_pairing()
#     socketio.emit("increment_funny_queue", funnyQueue)
#     socketio.emit("increment_serious_queue", seriousQueue)         
    
# @socketio.on("user_join_serious") # User joins 'serious' team and is inserted into the waiting queue
# def handle_user_join_serious(username):
    
#     print(f"User {username} has joined the serious side!")
    
#     sid = request.sid
#     activeUsers[username] = sid
#     seriousQueue.append((username, sid))
#     attempt_pairing()
#     socketio.emit("increment_funny_queue", funnyQueue)
#     socketio.emit("increment_serious_queue", seriousQueue)        
        
# def attempt_pairing(): # Checking to see if there is atleast 1 funny and 1 serious user
    
#     if len(funnyQueue) >= 1 and len(seriousQueue) >= 1:
#         funnyUser = funnyQueue.pop(0)
#         seriousUser = seriousQueue.pop(0)
#         pair_users(funnyUser, seriousUser)
        

# def pair_users(funnyUser, seriousUser): # Pairs 1 funny and 1 serious user and puts them in a room
    
#     room = f"{funnyUser[1]}_{seriousUser[1]}_room"
    
#     join_room(room, funnyUser[1])
#     join_room(room, seriousUser[1])
    
#     print(f"Paired {funnyUser[0]} with {seriousUser[0]} in room: {room}")
#     socketio.emit("users_paired", room=room)
#     socketio.emit("display_funny_username", { "username" : funnyUser[0] }, room=room)
#     socketio.emit("display_serious_username", { "username" : seriousUser[0] }, room=room)
    
    
# @socketio.on("new_message") # Recieves new message from client and emits to all users in current room
# def handle_new_message(message):
#     print(f"New Message: {message}")
#     sid = request.sid
#     rooms_list = rooms(sid)
#     room = rooms_list[1]
#     username = None
    
#     for user in activeUsers:
#         if activeUsers[user] == request.sid:
#             username = user
#     socketio.emit("chat", {"message": message, "username": username}, room=room)
    

# @socketio.on("disconnect_user") # User clicks 'disconnectBtn' and the room is deleted
# def handle_user_disconnect():
#     sid = request.sid
#     rooms_list = rooms(sid)
#     room = rooms_list[1]
    
#     if sid in activeUsers:
#         del activeUsers[sid]
    
#     close_room(room, sid)    
#     socketio.emit("user_left", room=room)
#     print(f"User with sid {sid} has left. Room: {room} has been deleted.")
    

#@socketio.on("disconnect") # User exits out of StraightFace
#def handle_disconnect():
#    global connectedUsersNum
#    connectedUsersNum -= 1
#    socketio.emit("change_user_count", connectedUsersNum)
    
#    sid = request.sid
#    rooms_list = rooms(sid)
#    room = rooms_list[1]
    
#    if sid in activeUsers:
#        del activeUsers[sid]
    
#    close_room(room, sid)    
#    socketio.emit("user_left", room=room)
#    print(f"User with sid {sid} has left. Room: {room} has been deleted.")


    

    



    