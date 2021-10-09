drop database if exists ImageHosting;

create database "ImageHosting"
    with 
    owner = postgres
    encoding = 'UTF8'
    LC_COLLATE = 'English_United States.1252'
    LC_CTYPE = 'English_United States.1252'
    TABLESPACE = pg_default
    CONNECTION LIMIT = -1;
	
-- create user table
create table Users(
	id bigint not null,
	username varchar(255) not null,
	password varchar(255) not null,
	email varchar(255) not null,
	primary key(id)
);

CREATE TABLE "session" (
  "sid" varchar NOT NULL COLLATE "default",
        "sess" json NOT NULL,
        "expire" timestamp(6) NOT NULL
)
WITH (OIDS=FALSE);

ALTER TABLE "session" ADD CONSTRAINT "session_pkey"
PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE;
