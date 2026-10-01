// index.js
require('dotenv').config();
const {
  Client,
  GatewayIntentBits,
  StringSelectMenuBuilder,
  ActionRowBuilder,
} = require('discord.js');
const { SQUADS, squadByKey, getGuildState, updateGuildState } = require('./squads');
const { buildBoardEmbed, buildBoardComponents } = require('./board');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
});

// A person can manage the board (reset it, remove someone) if they have the
// server's real Manage Server permission, OR hold the role this server's
// admins designated with /board-set-admin-role — lets you delegate this to a
// squad leader or mod without handing them full server admin.
function canManageBoard(interaction, state) {
  if (interaction.memberPermissions?.has('ManageGuild')) return true;
  if (state.boardAdminRoleId && interaction.member?.roles?.cache?.has(state.boardAdminRoleId)) return true;
  return false;
}

// ---- helper: refresh the live board message after any state change ----
async function refreshBoardMessage(guild, state) {
  if (!state.channelId || !state.messageId) return;
  try {
    const channel = await guild.channels.fetch(state.channelId);
    const message = await channel.messages.fetch(state.messageId);
    await message.edit({
      embeds: [buildBoardEmbed(state)],
      components: buildBoardComponents(),
    });
  } catch (err) {
    console.error('Could not refresh board message (was it deleted?):', err.message);
  }
}

client.on('interactionCreate', async (interaction) => {
  try {
    // ---- Slash commands ----
    if (interaction.isChatInputCommand()) {
      if (interaction.commandName === 'board-setup') {
        const state = getGuildState(interaction.guildId);
        const message = await interaction.channel.send({
          embeds: [buildBoardEmbed(state)],
          components: buildBoardComponents(),
        });
        updateGuildState(interaction.guildId, (s) => {
          s.channelId = interaction.channelId;
          s.messageId = message.id;
        });
        await interaction.reply({ content: 'Board posted above ⬆️', ephemeral: true });
        return;
      }

      if (interaction.commandName === 'board-reset') {
        const state = getGuildState(interaction.guildId);
        if (!canManageBoard(interaction, state)) {
          await interaction.reply({ content: "You need Manage Server permission, or the board-admin role, to do that.", ephemeral: true });
          return;
        }
        const fresh = updateGuildState(interaction.guildId, (s) => {
          for (const sq of SQUADS) s.squads[sq.key] = new Array(sq.size).fill(null);
          for (const key of Object.keys(s.leaders)) s.leaders[key] = null;
        });
        await refreshBoardMessage(interaction.guild, fresh);
        await interaction.reply({ content: 'Board reset.', ephemeral: true });
        return;
      }

      if (interaction.commandName === 'board-remove') {
        const state = getGuildState(interaction.guildId);
        if (!canManageBoard(interaction, state)) {
          await interaction.reply({ content: "You need Manage Server permission, or the board-admin role, to do that.", ephemeral: true });
          return;
        }
        const target = interaction.options.getUser('user', true);
        let found = false;
        const updated = updateGuildState(interaction.guildId, (s) => {
          for (const sq of SQUADS) {
            const i = s.squads[sq.key].indexOf(target.id);
            if (i !== -1) {
              s.squads[sq.key][i] = null;
              found = true;
            }
          }
          for (const key of Object.keys(s.leaders)) {
            if (s.leaders[key] === target.id) {
              s.leaders[key] = null;
              found = true;
            }
          }
        });
        if (!found) {
          await interaction.reply({ content: `${target.username} isn't currently signed up for a slot or leading a squad.`, ephemeral: true });
          return;
        }
        await refreshBoardMessage(interaction.guild, updated);
        await interaction.reply({ content: `Removed ${target.username} from the board.`, ephemeral: true });
        return;
      }

      if (interaction.commandName === 'board-set-admin-role') {
        if (!interaction.memberPermissions?.has('ManageGuild')) {
          await interaction.reply({ content: "Only someone with Manage Server permission can set this.", ephemeral: true });
          return;
        }
        const role = interaction.options.getRole('role', true);
        updateGuildState(interaction.guildId, (s) => {
          s.boardAdminRoleId = role.id;
        });
        await interaction.reply({ content: `Members with the **${role.name}** role can now reset the board or remove people, in addition to anyone with Manage Server.`, ephemeral: true });
        return;
      }
    }

    // ---- Buttons ----
    if (interaction.isButton()) {
      const state = getGuildState(interaction.guildId);
      const userId = interaction.user.id;

      if (interaction.customId.startsWith('join:')) {
        const squadKey = interaction.customId.split(':')[1];
        const meta = squadByKey(squadKey);
        const slots = state.squads[squadKey];

        // already in this squad?
        if (slots.includes(userId)) {
          await interaction.reply({ content: `You're already signed up for ${meta.name}.`, ephemeral: true });
          return;
        }
        // remove from any other squad first (one slot per person)
        for (const s of SQUADS) {
          const idx = state.squads[s.key].indexOf(userId);
          if (idx !== -1) state.squads[s.key][idx] = null;
        }
        const openIndex = slots.indexOf(null);
        if (openIndex === -1) {
          await interaction.reply({ content: `${meta.name} is full.`, ephemeral: true });
          return;
        }
        const updated = updateGuildState(interaction.guildId, (s) => {
          // re-apply removal + assignment against the freshest saved state
          for (const sq of SQUADS) {
            const i = s.squads[sq.key].indexOf(userId);
            if (i !== -1) s.squads[sq.key][i] = null;
          }
          const freeIdx = s.squads[squadKey].indexOf(null);
          if (freeIdx !== -1) s.squads[squadKey][freeIdx] = userId;
        });
        await refreshBoardMessage(interaction.guild, updated);
        await interaction.reply({ content: `Signed up for **${meta.name}**.`, ephemeral: true });
        return;
      }

      if (interaction.customId === 'leave') {
        let found = false;
        const updated = updateGuildState(interaction.guildId, (s) => {
          for (const sq of SQUADS) {
            const i = s.squads[sq.key].indexOf(userId);
            if (i !== -1) {
              s.squads[sq.key][i] = null;
              found = true;
            }
          }
          for (const key of Object.keys(s.leaders)) {
            if (s.leaders[key] === userId) s.leaders[key] = null;
          }
        });
        if (!found) {
          await interaction.reply({ content: "You're not currently signed up for a slot.", ephemeral: true });
          return;
        }
        await refreshBoardMessage(interaction.guild, updated);
        await interaction.reply({ content: 'Released your slot.', ephemeral: true });
        return;
      }

      if (interaction.customId === 'leader-menu') {
        const options = SQUADS.filter((s) => s.key !== 'bench').map((s) => ({
          label: s.name,
          description: s.role.slice(0, 90),
          value: s.key,
        }));
        const row = new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId('leader-select')
            .setPlaceholder('Choose a squad to lead')
            .addOptions(options)
        );
        await interaction.reply({ content: 'Which squad are you leading?', components: [row], ephemeral: true });
        return;
      }
    }

    // ---- Select menu (leader assignment) ----
    if (interaction.isStringSelectMenu() && interaction.customId === 'leader-select') {
      const squadKey = interaction.values[0];
      const meta = squadByKey(squadKey);
      const updated = updateGuildState(interaction.guildId, (s) => {
        s.leaders[squadKey] = interaction.user.id;
      });
      await refreshBoardMessage(interaction.guild, updated);
      await interaction.update({ content: `You're set as **${meta.name}**'s squad leader.`, components: [] });
      return;
    }
  } catch (err) {
    console.error('Interaction error:', err);
    if (interaction.isRepliable() && !interaction.replied) {
      await interaction.reply({ content: 'Something went wrong — try again.', ephemeral: true }).catch(() => {});
    }
  }
});

client.login(process.env.DISCORD_TOKEN);
