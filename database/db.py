import psycopg2, os
from authentication.auth_tools import hash_password

class Database:
    """
    A class that handles all database operations.

    args:
        - database_path: The path to the database file.

    attributes:
        - database_path: The path to the database file.
        - conn: The connection to the database.
        - cur: The cursor of the database.
    """
    
    def __init__(self) -> None:
        
        # dbname="straightface_db",
        # user="Berkley",
        # host="localhost",
        # port="5432",
        
        # database_url, sslmode='require'
        
        database_url = os.environ.get("DATABASE_URL")
        self.conn = psycopg2.connect(database_url, sslmode='require')
        self.cur = self.conn.cursor()
        
    # ------- Registration & Authentication -------
    
    def add_new_user(self, username: str, password_hash: str, salt: str, email: str, first_name: str, last_name: str) -> None:
        """
        Inserts a new user into the database.

        args:
            - username: The username of the user to insert.
            - password_hash: The password_hash of the user to insert.
            - email: The email of the user to insert.

        returns:
            - None
        """
        self.cur.execute(
            "INSERT INTO users (username, password_hash, salt, email, firstname, lastname) VALUES (%s, %s, %s, %s, %s, %s)",
            (username, password_hash, salt, email, first_name, last_name))
        self.conn.commit()
        
        
    def username_exists(self, username: str) -> bool:
        """
        Checks if a username exists in the postgres database.

        args:
            - username: A string of the username to check.

        returns:
            - True if the username exists, False if not.
        """
        try:
            self.cur.execute("SELECT 1 FROM users WHERE username = %s", (username,))
            return self.cur.fetchone() is not None
        except:
            return False
        
        
    def login_pipeline(self, username: str, password: str) -> bool:
        """
        Checks if a username and password combination is correct.

        args:
            - username: A string of the username to check.
            - password: A string of the password to check.

        returns:
            - True if the username and password combination is correct, False if not.
        """
        try:
            self.cur.execute("SELECT password_hash, salt FROM users WHERE username = %s", (username,))
            row = self.cur.fetchone()
            if row:
                stored_password_hash, salt = row
                hashed_password = hash_password(password, salt)
                return hashed_password[0] == stored_password_hash
            else:
                print("Invalid username or password: " + username + " " + password + " --- " + str(row))
                return False
        except psycopg2.Error as e:
            print("Error executing SQL query:", e)
            return False
    
        
    # ------- Getter Methods -------
    
    def get_all_user_information(self):
        """
        Gets all user information from the database.

        args:
            - None

        returns:
            - A list of all user information in the database.
        """
        self.cur.execute("SELECT * FROM users")
        return self.cur.fetchall()
        
        
    def get_password_hash_by_username(self, username: str):
        """
        Gets the password hash of a user from the database.

        args:
            - username: The username of the user whose password hash to get.

        returns:
            - The password hash for the user with the given username.
        """
        self.cur.execute(
            "SELECT password_hash FROM users WHERE username = %s", (username,))
        return self.cur.fetchone()
    
    
    def get_email_by_username(self, username: str):
        """
        Gets the email of a user from the database.

        args:
            - username: The username of the user whose email to get.

        returns:
            - The email for the user with the given username.
        """
        
        self.cur.execute(
            "SELECT email FROM users WHERE username = %s", (username,))
        
        result = self.cur.fetchone()

        if result is not None:
            email = result[0]
            return email
        else:
            return None


    def get_first_name_by_username(self, username: str):
        """
        Gets the first name of a user from the database.

        args:
            - username: The username of the user whose first name to get.

        returns:
            - The first name for the user with the given username.
        """
        self.cur.execute(
            "SELECT firstname FROM users WHERE username = %s", (username,))
        return self.cur.fetchone()


    def get_last_name_by_username(self, username: str):
        """
        Gets the last name of a user from the database.

        args:
            - username: The username of the user whose last name to get.

        returns:
            - The last name for the user with the given username.
        """
        self.cur.execute(
            "SELECT lastname FROM users WHERE username = %s", (username,))
        return self.cur.fetchone()
    
    # ------- Setter Methods -------
    
    def set_password_hash(self, username: str, new_password_hash: str):
        """
        Updates the password hash of a user in the database.

        args:
            - username: The username of the user to update.
            - new_password_hash: The new password hash of the user.

        returns:
            - None
        """
        self.cur.execute(
            "UPDATE users SET password_hash = %s WHERE username = %s", (new_password_hash, username))
        self.conn.commit()
        
        
    def set_email(self, username: str, new_email: str):
        """
        Updates the email of a user in the database.

        args:
            - username: The username of the user to update.
            - new_email: The new email of the user.

        returns:
            - None
        """
        self.cur.execute(
            "UPDATE users SET email = %s WHERE username = %s", (new_email, username))
        self.conn.commit()


    def set_first_name(self, username: str, new_first_name: str):
        """
        Updates the first name of a user in the database.

        args:
            - username: The username of the user to update.
            - new_first_name: The new first name of the user.

        returns:
            - None
        """
        self.cur.execute(
            "UPDATE users SET firstname = %s WHERE username = %s", (new_first_name, username))
        self.conn.commit()


    def set_last_name(self, username: str, new_last_name: str):
        """
        Updates the last name of a user in the database.

        args:
            - username: The username of the user to update.
            - new_last_name: The new last name of the user.

        returns:
            - None
        """
        self.cur.execute(
            "UPDATE users SET lastname = %s WHERE username = %s", (new_last_name, username))
        self.conn.commit()
            
            
    def addFunnyWin(self, username: str):
        self.cur.execute(
            "UPDATE users SET funnywins = funnywins + 1 WHERE username = %s", (username,))
        self.conn.commit()
        
    def addFunnyLoss(self, username: str):
        self.cur.execute(
            "UPDATE users SET funnylosses = funnylosses + 1 WHERE username = %s", (username,))
        self.conn.commit()
        
    def addSeriousWin(self, username: str):
        self.cur.execute(
            "UPDATE users SET seriouswins = seriouswins + 1 WHERE username = %s", (username,))
        self.conn.commit()
        
    def addSeriousLoss(self, username: str):
        self.cur.execute(
            "UPDATE users SET seriouslosses = seriouslosses + 1 WHERE username = %s", (username,))
        self.conn.commit()
        
    def getTotalMatches(self, username: str):
        self.cur.execute(
            "SELECT (funnywins + funnylosses + seriouswins + seriouslosses) as total_matches FROM users WHERE username = %s",
            (username,))
        result = self.cur.fetchone()

        if result:
            total_matches = result[0]
            return total_matches
        else:
            return 0
         
        
    def getFunnyRecord(self, username: str):
        self.cur.execute(
            "SELECT funnywins, funnylosses FROM users WHERE username = %s", (username,))
        result = self.cur.fetchone()

        if result:
            wins, losses = result
            record = f"{wins}-{losses}"
            return record
        else:
            return "0-0"
    
    
    def getSeriousRecord(self, username: str):
        self.cur.execute(
            "SELECT seriouswins, seriouslosses FROM users WHERE username = %s", (username,))
        result = self.cur.fetchone()
        
        if result:
            wins, losses = result
            record = f"{wins}-{losses}"
            return record
        else:
            return "0-0"