require("dotenv").config();

const {
Client,
GatewayIntentBits,
ActionRowBuilder,
StringSelectMenuBuilder,
ButtonBuilder,
ButtonStyle,
ChannelType,
PermissionFlagsBits,
EmbedBuilder,
REST,
Routes,
SlashCommandBuilder
} = require("discord.js");

const client = new Client({
intents: [GatewayIntentBits.Guilds]
});

const ADMIN_ROLE = "Admin";
const LOG_CHANNEL = "mod-logs";

const categorias = [
{ label: "Soporte", value: "soporte" },
{ label: "Compra", value: "compra" },
{ label: "Bug", value: "bug" },
{ label: "Otro", value: "otro" }
];

client.once("ready", async () => {

console.log(`Bot listo como ${client.user.tag}`);

const commands = [
new SlashCommandBuilder()
.setName("panel")
.setDescription("Enviar panel de tickets")
].map(c => c.toJSON());

const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

try {

await rest.put(
Routes.applicationCommands(client.user.id),
{ body: commands }
);

console.log("Slash command /panel registrado");

} catch (err) {
console.error(err);
}

});

client.on("interactionCreate", async (interaction) => {

if (interaction.isChatInputCommand()) {

if (interaction.commandName === "panel") {

const menu = new StringSelectMenuBuilder()
.setCustomId("categoria_ticket")
.setPlaceholder("Selecciona categoría")
.addOptions(categorias);

const row = new ActionRowBuilder().addComponents(menu);

await interaction.reply({
content: "🎫 **Sistema de Tickets**\nSelecciona la categoría:",
components: [row]
});

}

}

if (interaction.isStringSelectMenu()) {

if (interaction.customId === "categoria_ticket") {

const categoria = interaction.values[0];

const prioridadMenu = new StringSelectMenuBuilder()
.setCustomId(`prioridad_${categoria}`)
.setPlaceholder("Selecciona importancia")
.addOptions([
{ label: "1 - Baja", value: "1" },
{ label: "2 - Media", value: "2" },
{ label: "3 - Alta", value: "3" }
]);

const row = new ActionRowBuilder().addComponents(prioridadMenu);

await interaction.reply({
content: "Selecciona la importancia del ticket",
components: [row],
ephemeral: true
});

}

if (interaction.customId.startsWith("prioridad_")) {

const categoria = interaction.customId.split("_")[1];
const prioridad = interaction.values[0];

let emoji = "🟢";
if (prioridad == 2) emoji = "🟡";
if (prioridad == 3) emoji = "🔴";

const guild = interaction.guild;

const canal = await guild.channels.create({
name: `${emoji}-${categoria}-${interaction.user.username}`,
type: ChannelType.GuildText,
permissionOverwrites: [
{
id: guild.id,
deny: [PermissionFlagsBits.ViewChannel]
},
{
id: interaction.user.id,
allow: [PermissionFlagsBits.ViewChannel]
}
]
});

const reclamar = new ButtonBuilder()
.setCustomId("reclamar")
.setLabel("Reclamar")
.setStyle(ButtonStyle.Success);

const cerrar = new ButtonBuilder()
.setCustomId("cerrar")
.setLabel("Cerrar")
.setStyle(ButtonStyle.Danger);

const row = new ActionRowBuilder().addComponents(reclamar, cerrar);

await canal.send({
content: `${emoji} Ticket creado por <@${interaction.user.id}>`,
components: [row]
});

await interaction.reply({
content: `Ticket creado: ${canal}`,
ephemeral: true
});

}

}

if (interaction.isButton()) {

const member = interaction.member;

if (!member.roles.cache.some(r => r.name === ADMIN_ROLE)) {
return interaction.reply({
content: "Solo admins pueden usar esto",
ephemeral: true
});
}

if (interaction.customId === "reclamar") {

await interaction.reply("Ticket reclamado por staff");

}

if (interaction.customId === "cerrar") {

await interaction.reply("Ticket cerrado. Enviando formulario...");

const canal = interaction.channel;

await canal.send("Escribe una valoración del **1 al 5** y un comentario:");

const filter = m => m.author.id === interaction.user.id;

const collected = await canal.awaitMessages({
filter,
max: 1,
time: 120000
});

if (!collected.first()) return;

const respuesta = collected.first().content;

const log = interaction.guild.channels.cache.find(
c => c.name === LOG_CHANNEL
);

if (log) {

const embed = new EmbedBuilder()
.setTitle("Feedback de Ticket")
.setDescription(respuesta)
.setColor("Green")
.setFooter({
text: `Usuario: ${interaction.user.tag}`
});

log.send({ embeds: [embed] });

}

setTimeout(() => canal.delete(), 5000);

}

}

});

client.login(process.env.TOKEN);
