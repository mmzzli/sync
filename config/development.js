module.exports = {
  typeorm: {
    name: 'default',
    type: 'mysql',
    host: process.env.DBHOST_ || 'localhost',
    port: process.env.DBPORT_ || 3306,
    username: process.env.SDBUSER_ || 'root',
    password: process.env.DBPWD_ || '`Str0ng!Passw0rd@2024',
    database: process.env.DBNAME_ || 'sync2',
    synchronize: true,
    logging: false,
    // uuidExtension: true,
    entities: ['dist/**/**/**.entity.js'],
    migrations: ['src/migrations/**/*.ts'],
    subscribers: ['src/subscribers/**/*.ts'],
    // entitySchemas: ['src/schema/**/*.json'],
    cli: {
      entitiesDir: 'src/**/**.entity.ts',
      migrationsDir: 'src/migrations',
      subscribersDir: 'src/subscribers',
    },
    uuidExtension: 'uuid-ossp', //pgcrypto
    charset: 'utf8mb4',
  },
  bsc: {
    apikey: process.env.BSC_APIKEY || 'VBABEJWKPJ9HRNX18WXWZHDUN2C22ENUYD',
  },
  rpc: {
    url: 'https://bsc.blockpi.network/v1/rpc/81fba11a108ca5e7e42724acd5114c643b387e46',
  },
  privateKey: process.env.PRIVATE_KEY || '',
};
