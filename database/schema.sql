CREATE TABLE users (
    username VARCHAR(255) PRIMARY KEY NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL
);

CREATE TABLE funnyUsers (
    username VARCHAR(255) PRIMARY KEY NOT NULL,
    sessionID VARCHAR(255) NOT NULL
)

CREATE TABLE seriousUsers (
    username VARCHAR(255) PRIMARY KEY NOT NULL,
    sessionID VARCHAR(255) NOT NULL
)