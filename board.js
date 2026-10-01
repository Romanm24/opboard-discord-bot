// board.js
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { SQUADS, totalFilled, totalCore } = require('./squads');

function slotLabel(squadKey, index) {
  if (squadKey === 'echo') {
    return index < 5 ? `FOB/Base Def ${index + 1}` : `QRF ${index - 4}`;
  }
  return `Slot ${index + 1}`;
}

function buildBoardEmbed(state) {
  const filled = totalFilled(state);
  const core = totalCore();

  const embed = new EmbedBuilder()
    .setTitle('WARDOGS Tournament Practice — Sign-Up')
    .setDescription(
      `**${filled} / ${core}** signed up\n` +
      `Tap a button below to join a squad. Tap **Leave** to release your slot.\n\n` +
      `Command is the net of squad leaders — no separate Command squad. ` +
      `Alpha/Bravo (Assault) and Delta (Support) each carry one embedded medic. ` +
      `Echo is the combined FOB/Base Defense + QRF element.`
    )
    .setColor(0xce161b);

  for (const s of SQUADS) {
    const names = state.squads[s.key];
    const filledCount = names.filter(Boolean).length;
    const leaderId = state.leaders ? state.leaders[s.key] : null;
    const leaderLine = s.key !== 'bench'
      ? `\nLeader: ${leaderId ? `<@${leaderId}>` : '*open*'}`
      : '';

    const lines = names.map((uid, i) => {
      const label = slotLabel(s.key, i);
      return uid ? `✅ ${label} — <@${uid}>` : `⬜ ${label} — open`;
    });

    embed.addFields({
      name: `${s.name} — ${filledCount}/${s.size}`,
      value: `*${s.role}*${leaderLine}\n${lines.join('\n')}`,
      inline: false,
    });
  }

  embed.setFooter({ text: 'Built with OpBoard · practice rollout' });
  embed.setTimestamp(new Date());

  return embed;
}

function buildBoardComponents() {
  // Discord allows max 5 buttons per row, 5 rows max.
  // Row per 4-5 squads of "Join X" buttons, plus a Leave row.
  const rows = [];
  let current = new ActionRowBuilder();
  let count = 0;

  for (const s of SQUADS) {
    if (count === 5) {
      rows.push(current);
      current = new ActionRowBuilder();
      count = 0;
    }
    current.addComponents(
      new ButtonBuilder()
        .setCustomId(`join:${s.key}`)
        .setLabel(`Join ${s.name}`)
        .setStyle(ButtonStyle.Secondary)
    );
    count++;
  }
  rows.push(current);

  const leaveRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('leave').setLabel('Leave my slot').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('leader-menu').setLabel('Set as squad leader').setStyle(ButtonStyle.Primary)
  );
  rows.push(leaveRow);

  return rows;
}

module.exports = { buildBoardEmbed, buildBoardComponents, slotLabel };
