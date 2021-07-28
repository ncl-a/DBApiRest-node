'use strict'

class DBApiRest {


    #tableName = null;
    #connection = null;

    // db setting
    #host = null;
    #user = null;
    #password = null;
    #databaseName = null;


    constructor(host, user, password, database, tableName) {

        const mysql = require("mysql");

        // set setting
        this.#databaseName = database;
        this.#host = host;
        this.#password = password;
        this.#user = user;

        this.#connection = mysql.createConnection({
            host: this.#host,
            user: this.#user,
            password: this.#password,
            database: this.#databaseName
        });

        this.use(tableName);
    }

    // set table to use
    use(tableName) {
        if(!this.__checkTableName(tableName))
            return {result: false, description: "Use a correct table name"};
        else
            this.#tableName = tableName;

        return {result: true, description: "Table name setted"}
    }

    async __checkTable() {
        return await this.__checkTableName(this.#tableName);
    }

    async __checkTableName(tableName) {
        if(!this.__checkField(tableName))
            return false;
        else {

            // check if table exists
            try {
                let result = await this.__getTableOfDatabase();

                // for each record, check if it is equal to tableName
                let table_check = await new Promise((resolve) => {
                    result.forEach(element => {
                        if(element["Tables_in_" + this.#databaseName.toLocaleLowerCase()] == tableName)     // if there is one table name equals to tableName return true
                            resolve(true);
                    });
                    resolve(false);
                })
                
                return table_check;

            } catch (error) {
                return false;
            }
        }
        
        return true;
    }

    async __getTableOfDatabase() {
        return await new Promise((resolve, reject) => {   // take all tables name
            this.#connection.query("SHOW TABLES", (error, result, fields) => {        // execute the query

                if(error) throw error
    
                if(result != undefined)
                    resolve(result);
                else
                    reject(false);
            });
        });
    }

    // DEPRECATE
        // open connection
        // if(!this.__open())        // false: return false
        //     return {result: false, description: "Database can't open"};
    // open connection with database
    __open() {
        return new Promise((resolve, reject) => {

            try {
                this.#connection.connect((error) => {
                    if(error)
                        throw error;
        
                    resolve(true);

                    console.log("MySql Connected...");
                });
            } catch(error) {
                reject(false);
            }
        });
    }

    // DEPRECATE
    // close connection with database
    __close() {

        return new Promise((resolve, reject) => {
            try {
                this.#connection.end((error) => {
                    if(error)
                        throw error;
                    
                    resolve(true);
        
                    console.log("MySql Close...");
                });
            } catch(error) {
                reject(false);
            }
        });

        
    }

    // delete a resource
    async delete(id = null) {

        // check if there is a table name setted
        if((await this.__checkTable()) == false)
            return {result: false, description: "You must set a table name"};

        if(!this.__checkField(id))
            return {result: false, description: "You must use a correct id"}; 

        try {
            return await new Promise((resolve, reject) => {

                try {

                    // generate the array to delete
                    let delete_id = [];
                    delete_id = delete_id.concat(id);

                    // for each id in array, delete it
                    delete_id.forEach(async id => {

                        let pk_id = (await this.__getPKField()).Field;
                        let delete_query = "DELETE FROM `" + this.#tableName + "` WHERE `" + pk_id + "`=" + id;
                        this.#connection.query(delete_query, async (error, result, fields) => {        // execute the delete query
    
                            if(error) throw error
                            
                        });
                    });
                    
                    let description = "Successful deleted:";

                    for (let index = 0; index < delete_id.length; index++) {
                        const element = delete_id[index];
                        
                        description += " " + element + ";";
                    }

                    resolve({result: true, description: description});
    
                } catch(error) {
                    reject({result: false, description: "Error"});
                }
                
            });
        } catch (error) {
            return {result: false, description: "Error"};
        }
    }

    // update a resource
    async update(data = null) {
        // check if there is a table name setted
        if((await this.__checkTable()) == false)
            return {result: false, description: "You must set a table name"};

        if(!this.__checkField(data))
            return {result: false, description: "You must use correct data"}; 

        try {
            return await new Promise(async (resolve, reject) => {

                try {
    
                    let query = await this.__generateUpdateQuery(data);     // generate the update query

                    if(query == false)
                        resolve({result: false, description: "Error: choose an id or check data"});
                    else {
                        this.#connection.query(query, async (error, result, fields) => {        // execute the query
    
                            if(error) throw error
                
                            if(result != undefined)
                                resolve({result: result, description: "Successful: update"});
                            else
                                resolve({result: false, description: "Error: rows is undefined"});
                            
                        });
                    }
                    
                } catch(error) {
                    reject({result: false, description: "Error"});
                }
                
            });
        } catch (error) {
            return {result: false, description: "Error"};
        }
    }

    async __generateUpdateQuery(data = null) {

        // check if there is a table name setted
        if((await this.__checkTable()) == false)
            return false;

        // check data
        if(!this.__checkField(data))
            return false;
        
        // check if there is an id
        if(!this.__checkField(data.id))
            return false;

        try{

            // take column names to check data
            let column_names = await this.__getFieldNames();

            let query = "UPDATE `" + this.#tableName + "` SET ";

            let check = false;       // check if there is at least one field
            for (let index = 0; index < Object.keys(data).length; index++) {
                const element = Object.keys(data)[index];

                // check if data of index is a real column of the table
                if(!column_names.includes(element))     // if there isnt in the table, skip element
                    continue;

                // skip PK field
                if(element == (await this.__getPKField()).Field)
                    continue;
                
                query += "`" + element + "`=";
                query += "'" + data[element] + "'";

                // insert ,
                if(index+1 != Object.keys(data).length) {
                    query += ",";
                }

                // set check -> true (there is at least field)
                check = true;
            }

            query = query + " WHERE `" + (await this.__getPKField()).Field + "`=" + data.id;

            if(check == false)
                return false;

            return query;

        } catch(error) {
            // console.log(error);
            return false;
        }
    }

    // insert a new resource
    async create(data = null) {

        // check if there is a table name setted
        if((await this.__checkTable()) == false)
            return {result: false, description: "You must set a table name"};

        // check not null fields
        try {
            let check = await this.__checkDataIntegrity(data);
            if(check != null && check != undefined && check.result != undefined && check.result == false)
                return check;
    
        } catch (error) {
            return error;
        }

        try {
            return await new Promise(async (resolve, reject) => {

                try {
    
                    let query = await this.__generateInsertQuery(data);     // generate the insert query
    
                    this.#connection.query(query, async (error, result, fields) => {        // execute the query
    
                        if(error) throw error
            
                        if(result != undefined)
                            resolve({result: result, description: "Successful creation"});
                        else
                            resolve({result: false, description: "Error: rows is undefined"});
                        
                    });
    
    
                } catch(error) {
                    reject({result: false, description: "Error"});
                }
                
            });
        } catch (error) {
            return {result: false, description: "Error"};
        }
        
        
    }

    // return an array with the table field name
    async __getFieldNames() {
        // get table columns
        let table_columns = await this.__getInformationTable();
        let column_names = [];

        for (let index = 0; index < table_columns.length; index++) {
            const element = table_columns[index];

            if(this.__checkField(element.Field))
                column_names.push(element.Field);       // push field name
            
        }

        return column_names;
    }


    async __generateInsertQuery(data = null) {

        // check if there is a table name setted
        if((await this.__checkTable()) == false)
            return false;

        if(!this.__checkField(data))
            return false;

        try{

            let query = "INSERT INTO `" + this.#tableName + "`(";
            let end_query = " VALUES (";

            // take column names to check data
            let column_names = await this.__getFieldNames();

            for (let index = 0; index < Object.keys(data).length; index++) {
                const element = Object.keys(data)[index];

                // check if data of index is a real column of the table
                if(!column_names.includes(element))     // if there isnt in the table, skip element
                    continue
                
                query += "`" + element + "`";
                end_query += "'" + data[element] + "'";

                // insert ,
                if(index+1 != Object.keys(data).length) {
                    query += ",";
                    end_query += ",";
                }
            }

            return query + ")" + end_query + ")";

        } catch(error) {
            return false;
        }
    }

    // get information of table
    async __getInformationTable() {

        // check if there is a table name setted
        if((await this.__checkTable()) == false)
            return {result: false, description: "You must set a table name"};
    
        return await new Promise((resolve, reject) => {
            this.#connection.query("DESCRIBE `" + this.#tableName + "`", async (error, result, fields) => {        // execute the query
                try {
                    if(error) throw error

                    if(result != undefined)
                        resolve(result);
                    else
                        resolve({result: false, description: "Error in describe query"});

                } catch(error) {
                    reject({result: false, description: "Error in describe query"});
                }
            });
        });
    }

    // check table integrity
    async __checkDataIntegrity(data = null) {

        if(!this.__checkField(data))
            return {result: false, description: "Missing data"};

        // get table structure
        let result = await this.__getInformationTable();

        return new Promise((resolve, reject) => {
            
            // for each field passed check if it can null
            let final_result = {result: true, description: ""};    // output of method

            if(result === false)
                return {result: false, description: "Error in describe query"};

            // check data
            result.forEach(element => {     // for each data field, it is compared
                try {
                    let fieldCanBeNull = element.Null == 'NO' ? false : true;

                    if(element.Field == "id")   // if field is id, it is skipped
                        return;

                    // take value, if it can't be null and it is null return false
                    if(fieldCanBeNull == false && (data == null || data == undefined || data[(element.Field)] == null || data[(element.Field)] == undefined)) {
                        final_result.result != undefined ? final_result.result = false : null
                        
                        // Uppercase version:
                        // final_result.description != undefined ? final_result.description += element.Field.charAt(0).toUpperCase() + element.Field.slice(1) + " is a required field; " : null
                        
                        final_result.description != undefined ? final_result.description += element.Field + " is a required field; " : null
                        
                    }
                } catch (error) {
                    // console.log(error);
                    final_result = {result: false, description: "Check error"};
                }
            });

            // check if it have to invoke resolve o reject
            if(!this.__checkField(final_result) || final_result.result == false)
                reject(final_result);
            else
                resolve(final_result);
        });
        
    }

    // true if the field is not null and defined
    __checkField(field) {

        if(field == undefined || field == null)
            return false;
        else
            return true;
    }

    // replace foreign key with the value
    async __setForeignData(record = null) {

        // check if record is not null
        if(!this.__checkField(record)) {
            return {result: false, description: "You must use a correct record"}
        }

        // check if there is a table setted
        if((await this.__checkTable()) == false)
            return {result: false, description: "You must set a table name"}


        try {
            return await new Promise(async (resolve, reject) => {

                try {
                    // take information of foreign key
                    let fk_info = await this.__getFKInfo(this.#tableName);

                    // for each FK
                    for (let index = 0; index < fk_info.result.length; index++) {
                        const element = fk_info.result[index];
                        
                        if(this.__checkField(element.COLUMN_NAME)) {     // check the column that has a FK
                            if(this.__checkField(element.REFERENCED_TABLE_NAME)) {
                                if(this.__checkField(element.REFERENCED_COLUMN_NAME)) {
                                    // get record value based on data
                                    let tempConnection = new DBApiRest(this.#host, this.#user, this.#password, this.#databaseName);      // use a new obj to use db
                                    tempConnection.use(element.REFERENCED_TABLE_NAME);

                                    // take value to replace
                                    let select_query = "SELECT * FROM `" + element.REFERENCED_TABLE_NAME + "` WHERE `" + element.REFERENCED_COLUMN_NAME + "`=" + record[element.COLUMN_NAME];
                                    let replace_value = await tempConnection.__query(select_query);

                                    // replace id with values
                                    record[element.COLUMN_NAME] = replace_value.result[0];

                                }
                            }
                        }

                    }

                    // return record with replaced value
                    resolve(record);
    
                } catch(error) {
                    console.log(error);
                    reject({result: false, description: error});
                }
                
            });
        } catch (error) {
            return {result: false, description: error};
        }
    }

    // get all foreign references of a table
    async __getFKInfo(tableName = null) {

        if(!this.__checkField(tableName))       // set table name of the class if it is null
            tableName = this.#tableName;

        let tempConnection = new DBApiRest(this.#host, this.#user, this.#password, this.#databaseName);      // use a new obj to use db

        let getFkInfoQuery = "SELECT * FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE WHERE TABLE_NAME = '" + tableName + "' AND REFERENCED_TABLE_SCHEMA IS NOT NULL";

        return await tempConnection.__query(getFkInfoQuery);

    }

    // get the name of the field of PK column
    async __getPKField(tableName = null) {

        if(!this.__checkField(tableName))       // set table name of the class if it is null
            tableName = this.#tableName;

        return await new Promise((resolve, reject) => {
            this.#connection.query("DESCRIBE `" + tableName + "`", async (error, result, fields) => {        // execute the query
                try {
                    if(error) throw error

                    if(result != undefined) {

                        let pk = null;      // istance pk variable (it is the return)

                        // return only record with Key == 'PRI' (PK)
                        for (let index = 0; index < result.length; index++) {
                            const element = result[index];
                            
                            // check if is the PK field
                            if(this.__checkField(element.Key))
                                if(element.Key.toLocaleUpperCase().includes('PRI')) {
                                    pk = element;
                                    break;
                                }

                        }

                        // return default value if pk is null
                        if(!this.__checkField(pk))
                            pk = {Field: 'id'};

                        resolve(pk);
                    } else
                        resolve({result: false, description: "Error in describe query"});

                } catch(error) {
                    reject({result: false, description: "Error in describe query"});
                }
            });
        });
    }

    // execute a query
    async __query(query = null) {

        if(!this.__checkField(query))
            return false;

        try {
            return await new Promise(async (resolve, reject) => {

                try {
    
                    this.#connection.query(query, async (error, result, fields) => {        // execute the query
    
                        if(error) throw error
            
                        if(result != undefined)
                            resolve({result: result, description: "Successful"});
                        else
                            resolve({result: false, description: "Error: rows is undefined"});
                        
                    });
    
    
                } catch(error) {
                    reject({result: false, description: "Error:\n" + error});
                }
                
            });
        } catch (error) {
            return {result: false, description: "Error:\n" + error};
        }
    }

    // get data from database
    async read(id = null) {

        // check if there is a table name setted
        if((await this.__checkTable()) == false)
            return {result: false, description: "You must set a correct table name"}

        return new Promise((resolve, reject) => {

            try {
                let select = "";     // prepare the select query

                if(id === null) {       // if there isn't a particulare id
                    select = "SELECT * FROM " + this.#tableName;     // prepare the select query

                    this.#connection.query(select, async (error, result, fields) => {        // execute the query

                        if(error) throw error
            
                        for (let index = 0; index < result.length; index++) {
                            result[index] = await this.__setForeignData(result[index]);
                        }
                        

                        if(result != undefined)
                            resolve({result: result, description: "Successful"});
                        else
                            resolve({result: false, description: "Error: rows is undefined"});
                        
                    });

                } else if(id !== null && Number.isInteger(Number.parseInt(id))) {    // if param id is not null add where statement
                    select = "SELECT * FROM " + this.#tableName + " WHERE id = ?";

                    this.#connection.query(select, [id], async (error, result, fields) => {        // execute the query

                        if(error) throw error

                        for (let index = 0; index < result.length; index++) {
                            result[index] = await this.__setForeignData(result[index]);
                        }
            
                        if(result != undefined)
                            resolve({result: result, description: ""});
                        else
                            reject({result: false, description: "Error: rows is undefined"});
                        
                    });

                } else {
                    reject({result: false, description: "Error: id is not a number"});
                }

            } catch(error) {
                reject({result: false, description: "Error"});
            }
            
        });
    }
}

exports.DBApiRest = DBApiRest;
