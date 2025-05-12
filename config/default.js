const config = {
  typeorm: {
    name: 'default',
    type: 'mysql',
    host: process.env.DBHOST_ || 'localhost',
    port: process.env.DBPORT_ || 3306,
    username: process.env.SDBUSER_ || 'root',
    password: process.env.DBPWD_ || 'm123456!@~',
    database: process.env.DBNAME_ || 'sync',
    synchronize: true,
    logging: true,
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
    apikey: process.env.BSC_APIKEY || '',
  },
  rpc: {
    url: 'https://bsc.blockpi.network/v1/rpc/cb875e94899d9a9114a3ddd4a2b624215d407ab7',
  },
  privateKey: process.env.PRIVATE_KEY || '',
};

module.exports = config;
