const { Telegraf } = require('telegraf');
const env = require('../env.json');

const bot = new Telegraf(env.config.telegram_token);

module.exports = bot;
