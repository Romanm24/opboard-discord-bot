// deploy-commands.js
// Registers slash commands GLOBALLY (works in every server the bot is added to).
// Global registration takes up to ~1 hour to propagate the first time you run it
// or whenever you add/change a command — that's normal, just wait.
require('dotenv').config();
const { REST, Routes, SlashCommandBuilder } = require('discord.js');

const commands = [
  new SlashCommandBuilder()
    .setName('board-setup')
    .setDescription('Post the live squad sign-up board in this channel.'),
  new SlashCommandBuilder()
    .setName('board-reset')
    .setDescription('Clear all sign-ups and start a fresh board (admin or board-admin role only).'),
  new SlashCommandBuilder()
    .setName('board-remove')
    .setDescription('Remove someone from their slot or leader spot (admin or board-admin role only).')
    .addUserOption((opt) =>
      opt.setName('user').setDescription('Who to remove from the board').setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName('board-set-admin-role')
    .setDescription('Choose a role that can reset the board or remove people (Manage Server required).')
    .addRoleOption((opt) =>
      opt.setName('role').setDescription('The role to grant board-management rights to').setRequired(true)
    ),
].map((c) => c.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    if (!process.env.CLIENT_ID) {
      console.error('Missing CLIENT_ID in .env — see README.md.');
      process.exit(1);
    }
    console.log('Registering GLOBAL slash commands (this can take up to ~1hr to appear everywhere)...');
    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: commands }
    );
    console.log('Done. /board-setup and /board-reset will appear in every server the bot is in.');
  } catch (err) {
    console.error(err);
  }
})();
