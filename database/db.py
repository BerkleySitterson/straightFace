import sqlite3

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
        
    def remove_user_from_queues(self, username: str, role: str):
        """

        Args:
            username (str): _description_
        """
        if (role == "funny"):
            self.cursor.execute(
                "DELETE FROM funny_queue WHERE username = ?", (username,))
            self.connection.commit()
        else:
            self.cursor.execute(
                "DELETE FROM serious_queue WHERE username = ?", (username,))
            self.connection.commit()
            
    def addFunnyWin(self, username: str):
        self.cursor.execute(
            "UPDATE users SET funny_wins = funny_wins + 1 WHERE username = ?", (username,))
        self.connection.commit()
        
    def addFunnyLoss(self, username: str):
        self.cursor.execute(
            "UPDATE users SET funny_loss = funny_loss + 1 WHERE username = ?", (username,))
        self.connection.commit()
        
    def addSeriousWin(self, username: str):
        self.cursor.execute(
            "UPDATE users SET serious_wins = serious_wins + 1 WHERE username = ?", (username,))
        self.connection.commit()
        
    def addSeriousLoss(self, username: str):
        self.cursor.execute(
            "UPDATE users SET serious_loss = serious_loss + 1 WHERE username = ?", (username,))
        self.connection.commit()
        
    def getTotalFunnyMatches(self, username: str):
        self.cursor.execute(
            "SELECT funny_wins, funny_loss FROM users WHERE username = ?", (username,))
        result = self.cursor.fetchone()
        
        if result:
            wins, losses = result
            total = wins + losses
            return total
        else:
            return 0
        
    def getTotalSeriousMatches(self, username: str):
        self.cursor.execute(
            "SELECT serious_wins, serious_loss FROM users WHERE username = ?", (username,))
        result = self.cursor.fetchone()
        
        if result:
            wins, losses = result
            total = wins + losses
            return total
        else:
            return 0
        
        
        
    def getFunnyRecord(self, username: str):
        self.cursor.execute(
            "SELECT funny_wins, funny_loss FROM users WHERE username = ?", (username,))
        result = self.cursor.fetchone()

        if result:
            wins, losses = result
            record = f"{wins}-{losses}"
            return record
        else:
            return "0-0"
    
    def getSeriousRecord(self, username: str):
        self.cursor.execute(
            "SELECT serious_wins, serious_loss FROM users WHERE username = ?", (username,))
        result = self.cursor.fetchone()
        
        if result:
            wins, losses = result
            record = f"{wins}-{losses}"
            return record
        else:
            return "0-0"
        
    def calculateFunnyRatio(self, username: str):
        self.cursor.execute(
            "SELECT funny_wins, funny_loss FROM users WHERE username = ?", (username,))
        result = self.cursor.fetchone()
        
        if result:
            wins, losses = result
            ratio = (wins / (wins + losses)) * 100
            return f"{ratio}%"
        else:
            return "0%"
        
    def calculateSeriousRatio(self, username: str):
        self.cursor.execute(
            "SELECT serious_wins, serious_loss FROM users WHERE username = ?", (username,))
        result = self.cursor.fetchone()
        
        if result:
            wins, losses = result
            ratio = (wins / (wins + losses)) * 100
            return f"{ratio}%"
        else:
            return "0%"