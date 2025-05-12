const config = {
  typeorm: {
    name: 'default',
    type: 'mysql',
    host: process.env.DBHOST_ || '8.162.248.50',
    port: process.env.DBPORT_ || 33308,
    username: process.env.SDBUSER_ || 'admin',
    password: process.env.DBPWD_ || 'lTW0VBSjCX6YpY6G9f0F',
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
};

module.exports = config;
