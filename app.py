import eventlet

from flask import Flask, redirect, render_template, request, url_for
from flask_socketio import SocketIO, join_room, rooms, close_room, emit
from database.db import Database
from authentication.auth_tools import login_pipeline, update_passwords, hash_password

eventlet.monkey_patch()

app = Flask(__name__, static_folder='static')
HOST, PORT = 'localhost', 5000
global username, db, logged_in
username = 'default'
db = Database('database/straightface.db')
app.debug = True
socketio = SocketIO(app, cors_allowed_origins="*", asynch_mode='eventlet')
app.config['SECRET'] = "secret"

funnyQueue = [] # Queue to store funny users info
seriousQueue = [] # Queue to store serious users info
activeUsers = {} # Dictionary to store all active users and their corresponding sid

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
    global username;
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
    
@app.route('/videoChat')
def videoChat():
    """
    Renders the register page when the user is at the `/register` endpoint.

    args:
        - None

    returns:
        - None
    """
    return render_template('videoChat.html')
    
    

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

@socketio.on("user_join_funny") # User joins 'funny' team and is inserted into the waiting queue
def handle_user_join_funny():
    
    print(f"User {username} has joined the funny side!")
    
    sid = request.sid
    activeUsers[username] = sid
    funnyQueue.append((username, sid))
    attempt_pairing()
    emit("increment_funny_queue", funnyQueue) # Only used for testing purposes
    emit("increment_serious_queue", seriousQueue) 
    
@socketio.on("user_join_serious") # User joins 'serious' team and is inserted into the waiting queue
def handle_user_join_serious():
    
    print(f"User {username} has joined the serious side!")
    
    sid = request.sid
    activeUsers[username] = sid
    seriousQueue.append((username, sid))
    attempt_pairing()
    emit("increment_funny_queue", funnyQueue) # Only used for testing purposes
    emit("increment_serious_queue", seriousQueue)        
        
def attempt_pairing(): # Checking to see if there is atleast 1 funny and 1 serious user
    
    if len(funnyQueue) >= 1 and len(seriousQueue) >= 1:
        funnyUser = funnyQueue.pop(0)
        seriousUser = seriousQueue.pop(0)
        pair_users(funnyUser, seriousUser)
        

def pair_users(funnyUser, seriousUser): # Pairs 1 funny and 1 serious user and puts them in a room
    
    room = f"{funnyUser[1]}_{seriousUser[1]}_room"
    
    join_room(room, funnyUser[1])
    join_room(room, seriousUser[1])
    
    print(f"Paired {username} with {username} in room: {room}")
    socketio.emit("users_paired", room=room)
       
if __name__ == '__main__':
    socketio.run(app, host='localhost') 