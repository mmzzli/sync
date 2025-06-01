module.exports = {
  typeorm: {
    name: 'default',
    type: 'mysql',
    host: process.env.DBHOST_ || '127.0.0.1',
    port: process.env.DBPORT_ || 3306,
    username: process.env.SDBUSER_ || 'root',
    password: process.env.DBPWD_ || 'm123456!@~',
    database: process.env.DBNAME_ || 'sync',
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
    url: 'https://distinguished-skilled-orb.bsc.quiknode.pro/5b0fd2381287a3b4740485017d18874932a1bec1/',
  },
  privateKey: process.env.PRIVATE_KEY || '',
};
