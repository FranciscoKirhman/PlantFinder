require('dotenv').config(); // Add this to the top to use dotenv for environment                                                                              variables
const express = require('express');
const oracledb = require('oracledb');
const cors = require('cors');

//Allowed origins for CORS

const allowedOrigins = [
  'https://franciscokirhman.github.io',

];

const corsOptions = {
  origin: function (origin, callback) {
    callback(null, true);
  },
};

// Use environment variables for credentials
const dbConfig = {
  user: "admin",
  password:"FKo56962182752",
  connectString: '(description= (retry_count=20)(retry_delay=3)(address=(protoco                                                                             l=tcps)(port=1522)(host=adb.sa-santiago-1.oraclecloud.com))(connect_data=(servic                                                                             e_name=gcb99637f1c00f0_speciesdb_high.adb.oraclecloud.com))(security=(ssl_server                                                                             _dn_match=yes)))' // Example: 'localhost/orcl'
};

// Initialize the application
const app = express();
app.use(cors(corsOptions)); // Enable CORS for all routes

const port = process.env.PORT || 3000; // The port the app will listen on


// Endpoint to fetch data from the Oracle database
app.get('/query', async (req, res) => {
  try {
    const rows = await fetchDataFromDB(req.query);
    // Send the query results back to the client
    res.json(rows);
  } catch (err) {
    console.error('Error during fetch:', err);
    // Send a more informative error message to the client
    res.status(500).send('Error occurred while fetching data:' +err.message);
  }
});


//Endpoint for autocomplete functionality
app.get('/autocomplete', async (req, res) => {
    const { column, prefix} = req.query;
    if (!column || !prefix) {
      return res.status(400).send('Column and prefix query parameters are requir                                                                             ed');
    }

    try {
        const result = await fetchDataFromDB({column, prefix }, true);
        res.json(result.map(row => row[column.toUpperCase()]));
    } catch (err) {
        console.error('Error during autocomplete:', err);
        res.status(500).send(`Autocomplete error: ${err.message}`);
    }
});


async function fetchDataFromDB(filters, isAutocomplete = false) {
    let connection;
    try {
        connection = await oracledb.getConnection(dbConfig);
        let query = 'SELECT * FROM SPECIES_DB WHERE 1=1';
        const filterValues = {};


        if (isAutocomplete) {
            const { column, prefix } = filters;
            query = `SELECT DISTINCT ${column} FROM SPECIES_DB WHERE LOWER(${col                                                                             umn}) LIKE LOWER(:prefix)`;
            filterValues.prefix = `${prefix}%`;

        } else {
            ['ID', 'SPECIFIC_EPITHET', 'GENUS', 'TYPE', 'ORIGIN', 'DISTRIBUTION_                                                                             NORTH', 'DISTRIBUTION_SOUTH'].forEach(filter => {
                if (filters[filter] !== undefined) {
                    query += ` AND ${filter} = :${filter}`;
                    filterValues[filter] = filters[filter];
                }
            });

           if (filters.ALTITUDINAL_INFERIOR!== undefined) {
               query += ` AND ALTITUDINAL_INFERIOR >= :ALTITUDINAL_INFERIOR`;
               filterValues.ALTITUDINAL_INFERIOR = filters.ALTITUDINAL_INFERIOR;

           }

           if (filters.ALTITUDINAL_SUPERIOR !== undefined) {
               query += ` AND ALTITUDINAL_SUPERIOR >= :ALTITUDINAL_SUPERIOR`;
               filterValues.ALTITUDINAL_SUPERIOR = filters.ALTITUDINAL_SUPERIOR;
           }


         if (filters.DISTRIBUTION !== undefined) {
             const distributionCodes = filters.DISTRIBUTION.split(',').map(s =>                                                                              s.trim());
             distributionCodes.forEach((code, index) => {
                 const paramName = `dist${index}`;
                 query += ` AND DISTRIBUTION LIKE :${paramName}`;
                 filterValues[paramName] = `%${code}%`;
             });

         }

     }


      console.log(`Executing query: ${query} with parameters:`, filterValues);

      const result = await connection.execute(query, filterValues, { outFormat:                                                                              oracledb.OUT_FORMAT_OBJECT });

      return result.rows;
  } catch (err) {
      console.error('Error in fetchDataFromDB:', err);
      throw err;
  } finally {
      if (connection) {
          await connection.close();

      }
  }
}

// Start the server on all network interfaces
app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on port ${port}`);
});
