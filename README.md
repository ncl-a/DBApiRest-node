# DBApiRest
Javascript class for NodeJS that allows you to interface with a MySQL database using the CRUD model

# What to install?
- mysql (npm i mysql)

# How to initialize?
const HOST = "127.0.0.1";
const USER = "root";
const PASSWORD = "";
const DATABASE = "dbName";

const DBApiRest = new (require('./DBApiRest')).DBApiRest(HOST, USER, PASSWORD, DATABASE);   // you can add table name after DATABASE

# Set table
await DBApiRest.use("tableName");


# CRUD:
# Create
await DBApiRest.create({...}); // in {} insert fields

# Read
await DBApiRest.read();     // you can read a particular record using .read(id)

# Update
await DBApiRest.update({...}); // in {} insert fields

# Delete
await DBApiRest.delete(id);   // you can delete more than one record using .delete([id1, id2, ...])

