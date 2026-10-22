require('dotenv').config();
const production = process.env.NODE_ENV === 'production';
const secret = process.env.SESSION_SECRET || '';
if (secret.length < 32 || secret === 'replace-with-at-least-32-random-characters') throw new Error('Set SESSION_SECRET to a unique random value of at least 32 characters.');
if (!process.env.DATABASE_URL) throw new Error('Set DATABASE_URL in .env.');
module.exports = { production, port: Number(process.env.PORT || 3000), databaseUrl: process.env.DATABASE_URL, sessionSecret: secret, trustProxy: process.env.TRUST_PROXY === 'true' };
