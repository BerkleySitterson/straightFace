import sqlite3
import datetime as dt

class Database:
    """
    A class that handles all database operations.

    args:
        - database_path: The path to the database file.

    attributes:
        - database_path: The path to the database file.
        - connection: The connection to the database.
        - cursor: The cursor of the database.
    """
    
    def __init__(self, database_path: str = "straightface.db") -> None:
        self.database_path = database_path
        self.connection = sqlite3.connect(database_path)
        self.cursor = self.connection.cursor()
        
    # -----------------------------------------------------------------
    # ------------------------- Users ---------------------------------
    # -----------------------------------------------------------------
    
    def add_new_user(self, username: str, password_hash: str, email: str, first_name: str, last_name: str) -> None:
        """
        Inserts a new user into the database.

        args:
            - username: The username of the user to insert.
            - password_hash: The password_hash of the user to insert.
            - email: The email of the user to insert.

        returns:
            - None
        """
        self.cursor.execute(
            "INSERT INTO users (username, password_hash, email, first_name, last_name) VALUES (?, ?, ?, ?, ?)",
            (username, password_hash, email, first_name, last_name))
        self.connection.commit()
        
    # ------- Getter Methods -------
    
    def get_all_user_information(self):
        """
        Gets all user information from the database.

        args:
            - None

        returns:
            - A list of all user information in the database.
        """
        self.cursor.execute("SELECT * FROM users")
        return self.cursor.fetchall()
    

        
    
    def get_password_hash_by_username(self, username: str):
        """
        Gets the password hash of a user from the database.

        args:
            - username: The username of the user whose password hash to get.

        returns:
            - The password hash for the user with the given username.
        """
        self.cursor.execute(
            "SELECT password_hash FROM users WHERE username = ?", (username,))
        return self.cursor.fetchone()
    
    def get_email_by_username(self, username: str):
        """
        Gets the email of a user from the database.

        args:
            - username: The username of the user whose email to get.

        returns:
            - The email for the user with the given username.
        """
        self.cursor.execute(
            "SELECT email FROM users WHERE username = ?", (username,))
        return self.cursor.fetchone()

    def get_first_name_by_username(self, username: str):
        """
        Gets the first name of a user from the database.

        args:
            - username: The username of the user whose first name to get.

        returns:
            - The first name for the user with the given username.
        """
        self.cursor.execute(
            "SELECT first_name FROM users WHERE username = ?", (username,))
        return self.cursor.fetchone()

    def get_last_name_by_username(self, username: str):
        """
        Gets the last name of a user from the database.

        args:
            - username: The username of the user whose last name to get.

        returns:
            - The last name for the user with the given username.
        """
        self.cursor.execute(
            "SELECT last_name FROM users WHERE username = ?", (username,))
        return self.cursor.fetchone()
    
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
        self.cursor.execute(
            "UPDATE users SET password_hash = ? WHERE username = ?", (new_password_hash, username))
        self.connection.commit()
        
    def set_email(self, username: str, new_email: str):
        """
        Updates the email of a user in the database.

        args:
            - username: The username of the user to update.
            - new_email: The new email of the user.

        returns:
            - None
        """
        self.cursor.execute(
            "UPDATE users SET email = ? WHERE username = ?", (new_email, username))
        self.connection.commit()

    def set_first_name(self, username: str, new_first_name: str):
        """
        Updates the first name of a user in the database.

        args:
            - username: The username of the user to update.
            - new_first_name: The new first name of the user.

        returns:
            - None
        """
        self.cursor.execute(
            "UPDATE users SET first_name = ? WHERE username = ?", (new_first_name, username))
        self.connection.commit()

    def set_last_name(self, username: str, new_last_name: str):
        """
        Updates the last name of a user in the database.

        args:
            - username: The username of the user to update.
            - new_last_name: The new last name of the user.

        returns:
            - None
        """
        self.cursor.execute(
            "UPDATE users SET last_name = ? WHERE username = ?", (new_last_name, username))
        self.connection.commit()
        
    # ----------------------------------------------------------------------
    # ------------------------- funnyUsers ---------------------------------
    # ----------------------------------------------------------------------
    
    def add_funny_user(self, username: str, sessionID: str):
        """
        Inserts a new user into the funnyUsers database.

        args:
            - username: The username of the user to insert.
            - sessionID: The session ID or 'sid' of the user to insert

        returns:
            - None
        """
        self.cursor.execute(
            "INSERT INTO funnyUsers (username, sessionID) VALUES (?, ?)",
            (username, sessionID))
        self.connection.commit()
        
    def add_serious_user(self, username: str, sessionID: str):
        """
        Inserts a new user into the seriousUsers database.

        args:
            - username: The username of the user to insert.
            - sessionID: The session ID or 'sid' of the user to insert

        returns:
            - None
        """
        self.cursor.execute(
            "INSERT INTO seriousUsers (username, sessionID) VALUES (?, ?)",
            (username, sessionID))
        self.connection.commit()
        
    # ------- Getter Methods -------
    
    def get_all_seriousUser_information(self):
        """
        Gets all user information from the seriousUsers table.

        args:
            - None

        returns:
            - A list of all user information in the seriousUsers database.
        """
        self.cursor.execute("SELECT * FROM seriousUsers")
        return self.cursor.fetchall()
    
    def get_all_funnyUser_information(self):
        """
        Gets all user information from the funnyUsers table.

        args:
            - None

        returns:
            - A list of all user information in the funnyUsers database.
        """
        self.cursor.execute("SELECT * FROM funnyUsers")
        return self.cursor.fetchall()
    
    def get_seriousUsers_length(self):
        """
        Gets the length of the seriousUsers table.

        args:
            - None

        returns:
            - A list of all user information in the funnyUsers database.
        """
        self.cursor.execute("SELECT COUNT(*) FROM funnyUsers")
        count = self.cursor.fetchone()[0]
        return count