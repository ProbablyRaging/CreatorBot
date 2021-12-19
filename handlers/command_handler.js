const { perms } = require('../validation/permissions');
const { client } = require('discord.js');
const { promisify } = require('util');
const { glob } = require('glob');
const PG = promisify(glob);
const ascii = require('ascii-table')

module.exports = async (client) => {
    const table = new ascii('Commands loaded!');

    commandsArr = [];

    (await PG(`${process.cwd()}/commands/*/*.js`)).map(async (file) => {
        const command = require(file);

        if (!command.name)
            return table.addRow(file.split('/')[7], `Failed!`, `Missing command name!`)

        if (!command.description)
            return table.addRow(command.name, `Failed!`, `Missing command description!`)

        if (command.permission) {
            if (perms.includes(command.permission))
                command.defaultPermission = false;
            else
                return table.addRow(command.name, `Failed!`, `Invalid permissions!`)
        }

        client.commands.set(command.name, command);
        commandsArr.push(command);

        await table.addRow(command.name, `Command loaded successfully!`);
    });
    // console.log(table.toString()); // use to check if commands loaded without error

    // permissions check
    client.on('ready', async () => {
        const mainGuild = await client.guilds.cache.get(process.env.GUILD_ID);

        mainGuild.commands.set(commandsArr).then(async (command) => {
            const Roles = (commandName) => {
                const cmdPerms = commandsArr.find((c) => c.name === commandName).permission;
                if (!cmdPerms) return null;

                return mainGuild.roles.cache.filter((r) => r.permissions.has(cmdPerms));
            }

            const fullPermissions = command.reduce((accumulator, r) => {
                const roles = Roles(r.name);
                if (!roles) return accumulator;

                const permissions = roles.reduce((a, r) => {
                    return [...a, { id: r.id, type: 'ROLE', permission: true }]
                }, []);

                return [...accumulator, { id: r.id, permissions }]
            }, []);

            await mainGuild.commands.permissions.set({ fullPermissions })
        });
    });
}