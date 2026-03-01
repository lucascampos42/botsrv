"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const child_process_1 = require("child_process");
const util_1 = require("util");
const dotenv = __importStar(require("dotenv"));
const pm2 = __importStar(require("pm2"));
dotenv.config();
const { DISCORD_TOKEN, ADMIN_ID, LOG_CHANNEL_ID } = process.env;
if (!DISCORD_TOKEN || !ADMIN_ID || !LOG_CHANNEL_ID) {
    console.error("Missing required environment variables: DISCORD_TOKEN, ADMIN_ID, or LOG_CHANNEL_ID");
    process.exit(1);
}
const client = new discord_js_1.Client({
    intents: [
        discord_js_1.GatewayIntentBits.Guilds,
        discord_js_1.GatewayIntentBits.GuildMessages,
        discord_js_1.GatewayIntentBits.MessageContent,
    ],
});
const execAsync = (0, util_1.promisify)(child_process_1.exec);
/**
 * Helper function to execute shell commands asynchronously.
 * @param command The shell command to execute.
 * @returns A promise that resolves to the stdout of the command.
 */
async function executeCommand(command) {
    try {
        const { stdout, stderr } = await execAsync(command);
        if (stderr) {
            console.error(`[EXEC WARN] ${command}: ${stderr}`);
        }
        return stdout;
    }
    catch (error) {
        console.error(`[EXEC ERROR] ${command}:`, error);
        throw error;
    }
}
client.on('ready', () => {
    console.log(`Bot logged in as ${client.user?.tag}`);
    // Set up PM2 Bus listener for exceptions
    pm2.connect(function (err) {
        if (err) {
            console.error("PM2 Connect Error:", err);
            process.exit(2);
        }
        pm2.launchBus(function (err, bus) {
            if (err) {
                console.error("PM2 launchBus Error:", err);
                return;
            }
            console.log("Listening to PM2 process:exception events...");
            bus.on('process:exception', async function (packet) {
                const appName = packet.process.name;
                const errorData = packet.data.message || packet.data.stack || JSON.stringify(packet.data);
                try {
                    const channel = await client.channels.fetch(LOG_CHANNEL_ID);
                    if (channel && channel.isTextBased()) {
                        await channel.send(`🚨 **ALERTA DE ERRO NO PM2** 🚨\n**App:** ${appName}\n**Erro:**\n\`\`\`text\n${errorData.substring(0, 1500)}\n\`\`\``);
                    }
                }
                catch (e) {
                    console.error("Failed to send PM2 error alert to Discord:", e);
                }
            });
        });
    });
});
client.on('messageCreate', async (message) => {
    // Ignore messages from bots
    if (message.author.bot)
        return;
    // Security check: Only allow the ADMIN_ID to execute commands
    if (message.author.id !== ADMIN_ID)
        return;
    const args = message.content.trim().split(/ +/);
    const command = args.shift()?.toLowerCase();
    if (!command)
        return;
    if (command === '!status') {
        try {
            const rawOutput = await executeCommand('pm2 jlist');
            const processes = JSON.parse(rawOutput);
            if (!processes || processes.length === 0) {
                await message.reply("Nenhum processo PM2 rodando no momento.");
                return;
            }
            let statusMessage = "**Lista de Processos PM2:**\n\n";
            for (const proc of processes) {
                const name = proc.name;
                const status = proc.pm2_env.status;
                const cpu = proc.monit ? proc.monit.cpu : 0;
                const memory = proc.monit ? (proc.monit.memory / (1024 * 1024)).toFixed(2) : 0;
                let emoji = '⚪';
                if (status === 'online')
                    emoji = '🟢';
                else if (status === 'stopped')
                    emoji = '🔴';
                else if (status === 'errored')
                    emoji = '❌';
                statusMessage += `${emoji} **${name}** - Status: ${status} | CPU: ${cpu}% | RAM: ${memory} MB\n`;
            }
            await message.reply(statusMessage);
        }
        catch (error) {
            console.error(error);
            await message.reply("Ocorreu um erro ao buscar o status dos processos.");
        }
    }
    else if (command === '!restart') {
        const appName = args[0];
        if (!appName) {
            await message.reply("Por favor, informe o nome do processo. Uso: `!restart <nome>`");
            return;
        }
        if (!/^[a-zA-Z0-9_-]+$/.test(appName) && appName !== 'all') {
            await message.reply("Nome de processo inválido. Use apenas letras, números, traços e underlines.");
            return;
        }
        try {
            await executeCommand(`pm2 restart ${appName}`);
            await message.reply(`Processo **${appName}** reiniciado com sucesso!`);
        }
        catch (error) {
            console.error(error);
            await message.reply(`Falha ao reiniciar o processo **${appName}**. Verifique se o nome está correto.`);
        }
    }
    else if (command === '!logs') {
        const appName = args[0];
        if (!appName) {
            await message.reply("Por favor, informe o nome do processo. Uso: `!logs <nome>`");
            return;
        }
        if (!/^[a-zA-Z0-9_-]+$/.test(appName) && appName !== 'all') {
            await message.reply("Nome de processo inválido. Use apenas letras, números, traços e underlines.");
            return;
        }
        try {
            const output = await executeCommand(`pm2 logs ${appName} --lines 15 --nostream`);
            // Limpa caracteres de escape do PM2 (cores e formatação do terminal)
            const cleanOutput = output.replace(/\x1B\[\d+m/g, '').trim();
            if (!cleanOutput) {
                await message.reply(`Nenhum log encontrado para **${appName}**.`);
                return;
            }
            // O Discord tem um limite de 2000 caracteres por mensagem
            const logSnippet = cleanOutput.length > 1900
                ? cleanOutput.slice(-1900)
                : cleanOutput;
            await message.reply(`Logs para **${appName}**:\n\`\`\`text\n${logSnippet}\n\`\`\``);
        }
        catch (error) {
            console.error(error);
            await message.reply(`Falha ao buscar logs do processo **${appName}**.`);
        }
    }
});
client.login(DISCORD_TOKEN);
