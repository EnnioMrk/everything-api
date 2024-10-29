import db from "./responses.sqlite" with { "type": "sqlite" };

//insert responses table
db.query('CREATE TABLE IF NOT EXISTS responses (prompt TEXT PRIMARY KEY, response TEXT)');