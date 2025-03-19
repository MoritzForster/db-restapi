/*
 * Main entry point for the REST API application.
 * This file sets up the Express server, defines API routes, and connects to the database.
 */

import { Configuration } from "./config"; // Import configuration utilities
import express, { Request, Response, NextFunction } from 'express'; // Import Express framework
import pg from 'pg'; // Import PostgreSQL client
import path from 'path'; // Import path utilities for file resolution
var config: any; // Global configuration object

// Function to execute SQL queries
async function executeQuery(sql: string) {
    // Connect to the PostgreSQL database
    let dbClient = new pg.Client(config.sqlConfig);
    await dbClient.connect();

    // Execute the SQL query
    const response = await dbClient.query(sql);

    // Disconnect from the database
    await dbClient.end();

    // Return the rows from the query result
    return response.rows;
}

// Main function to initialize the application
async function main() {
    // Load configuration from a JSON file
    let configFileName: string = Configuration.setConfigurationFilename('config.json');
    config = Configuration.readFileAsJSON(configFileName);

    // Retrieve environment variables for user and system information
    let userId: string = eval("process.env." + config.env.system_user); 
    let computerId: string = eval("process.env." + config.env.system_name); 
    console.log(`Hello ${userId} on system ${computerId}`);

    // Set up SQL configuration using environment variables
    config.sqlConfig.database = eval("process.env." + config.env.dbname); 
    config.sqlConfig.user = eval("process.env." + config.env.dbuser); 
    config.sqlConfig.password = eval("process.env." + config.env.dbpw); 

    const port: number = 4000; 
    const app: express.Application = express(); // Create an Express application

    // Middleware to log incoming requests
    app.use((req: Request, res: Response, next: NextFunction) => {
        console.log(`${req.method} ${req.path}`); // Log HTTP method and path
        next(); // Pass control to the next middleware
    });

    // Serve the API documentation page on the root route
    app.get('/', (req: Request, res: Response) => {
        res.sendFile(path.join(__dirname, '../public/index.html')); // Serve the index.html file
    });

    // Serve static files (e.g., CSS, JS, images) from the "public" directory
    app.use(express.static('public'));

    // Create a router for API endpoints
    const apiRouter = express.Router();

    // Middleware specific to the API router
    apiRouter.use((req: Request, res: Response, next: NextFunction) => {
        console.log("API router specific middleware!"); // Log middleware activity
        res.header('Access-Control-Allow-Origin', '*'); // Allow cross-origin requests
        next(); // Pass control to the next middleware
    });

    // Route to fetch torque data
    apiRouter.get('/torque', async (req: Request, res: Response) => {
        var apiResponse: object = {}; 
        var start = req.query.start ? req.query.start : new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(); // Default to 24 hours ago
        var end = req.query.end ? req.query.end : new Date().toISOString(); // Default to now
        try {
            let sqlCommand: string = 
                `SELECT 
                    torque1,
                    torque2,
                    torque3,
                    torque4,
                    timestamp
                FROM robot3data WHERE timestamp BETWEEN '${start}' AND '${end}'`; // Query torque data
            console.log(sqlCommand); // Log the SQL command
            apiResponse = await executeQuery(sqlCommand); // Execute the query
        } catch (err) {
            console.log('Error at Database command' + err); // Log errors
        }
        console.log(apiResponse); // Log the response
        res.json(apiResponse); // Send the response as JSON
    });

    // Route to fetch runtime data
    apiRouter.get('/runtime', async (req: Request, res: Response) => {
        var apiResponse: object = {}; 
        var start = req.query.start ? req.query.start : new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(); // Default to 24 hours ago
        var end = req.query.end ? req.query.end : new Date().toISOString(); // Default to now
        try {
            let sqlCommand: string = 
                `WITH running_intervals AS (
                    SELECT 
                        timestamp AS start_time,
                        LEAD(timestamp) OVER (ORDER BY timestamp) AS end_time,
                        running
                    FROM robot3data
                    WHERE timestamp BETWEEN '${start}' AND '${end}'
                )
                SELECT 
                    SUM(EXTRACT(EPOCH FROM (end_time - start_time))) AS total_runtime
                FROM running_intervals
                WHERE running = true AND end_time IS NOT NULL`; // Query runtime data
            console.log(sqlCommand); // Log the SQL command
            apiResponse = await executeQuery(sqlCommand); // Execute the query
        } catch (err) {
            console.log('Error at Database command' + err); // Log errors
        }
        console.log(apiResponse); // Log the response
        res.json(apiResponse); // Send the response as JSON
    });

    // Route to fetch total parts produced
    apiRouter.get('/parts', async (req: Request, res: Response) => {
        var apiResponse: object = {}; 
        var start = req.query.start ? req.query.start : new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(); // Default to 24 hours ago
        var end = req.query.end ? req.query.end : new Date().toISOString(); // Default to now
        try {
            let sqlCommand: string =
                `SELECT 
                COUNT(DISTINCT(partcount)) AS total_parts
                FROM robot3data
                WHERE timestamp BETWEEN '${start}' AND '${end}'`; // Query total parts
            console.log(sqlCommand); // Log the SQL command
            apiResponse = await executeQuery(sqlCommand); // Execute the query
        } catch (err) {
            console.log('Error at Database command' + err); // Log errors
        }
        console.log(apiResponse); // Log the response
        res.json(apiResponse); // Send the response as JSON
    });

    // Route to fetch violations with timestamps
    apiRouter.get('/violations', async (req: Request, res: Response) => {
        var apiResponse: object = {}; 
        var start = req.query.start ? req.query.start : new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(); // Default to 24 hours ago
        var end = req.query.end ? req.query.end : new Date().toISOString(); // Default to now
        try {
            let sqlCommand: string = 
                `SELECT 
                    timestamp,
                    violation
                FROM robot3data
                WHERE violation = true AND timestamp BETWEEN '${start}' AND '${end}'`; // Query violations
            console.log(sqlCommand); // Log the SQL command
            apiResponse = await executeQuery(sqlCommand); // Execute the query
        } catch (err) {
            console.log('Error at Database command' + err); // Log errors
        }
        console.log(apiResponse); // Log the response
        res.json(apiResponse); // Send the response as JSON
    });

    // Use the API router for the defined routes
    app.use(apiRouter);

    // Another router for additional API routes
    const apiRouter2 = express.Router();

    // Middleware specific to the second API router
    apiRouter2.use((req: Request, res: Response, next: NextFunction) => {
        console.log("API router specific middleware!"); // Log middleware activity
        next(); // Pass control to the next middleware
    });

    // Route to fetch filtered data
    apiRouter2.get('/filter', async (req: Request, res: Response) => {
        var apiResponse: object = {}; 
        try {
            let sqlCommand: string = `SELECT * FROM robot3data LIMIT ${req.query.last}`;
            console.log(sqlCommand); // Log the SQL command
            apiResponse = await executeQuery(sqlCommand); // Execute the query
        } catch (err) {
            console.log('Error at Database command' + err); // Log errors
        }
        console.log(apiResponse); // Log the response
        res.json(apiResponse); // Send the response as JSON
    });

    // Use the second API router for the defined routes
    app.use(apiRouter2);

    // Start the server and listen on the specified port
    app.listen(port, () => { 
        console.log(`Hello Seattle, I'm listening! (on port ${port})`); // Log server start
    });
}

// Call the main function to start the application
main();