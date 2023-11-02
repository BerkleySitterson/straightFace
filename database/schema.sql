CREATE TABLE users (
    username VARCHAR(255) PRIMARY KEY NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    funny_wins INT NOT NULL DEFAULT 0,
    funny_loss INT NOT NULL DEFAULT 0,
    serious_wins INT NOT NULL DEFAULT 0,
    serious_loss INT NOT NULL DEFAULT 0
);