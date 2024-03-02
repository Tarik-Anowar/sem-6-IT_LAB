import pg from 'pg';

const DataBase = new pg.Client({
    user: "postgres",
    host: 'localhost',
    database: 'Chat-App',
    password: "Tarik#cr7",
    port: 5432,
});

DataBase.connect()
    .then(() => console.log('Connected to PostgreSQL'))
    .catch(err => console.error('Error connecting to PostgreSQL:', err));
export default DataBase;