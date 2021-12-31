require("dotenv").config();
const selfRoleReactions = require("../../objects/selfRoleReactions");

module.exports = {
    name: "messageReactionAdd",
    async execute(reaction, user, client) {
        // We don't care if a bot reacts
        if (user.bot) {
            return;
        }

        if (reaction.partial) {
            try {
                await reaction.fetch();
            } catch (error) {
                console.error("Could not fetch the message from the reaction:", error);
                return;
            }
        }

        let message = reaction.message;
        // We only listen for reactions in the self-roles channel
        if (process.env.SELFROLE_CHAN === message.channel.id) {
            let emoji = reaction.emoji;
            const guild = client.guilds.cache.get(process.env.GUILD_ID);
            const member = guild.members.cache.find(member => member.id === user.id);
            if (member) {
                for (let reactionKey in selfRoleReactions) {
                    if (selfRoleReactions.hasOwnProperty(reactionKey)) {
                        let selfRoleMessage = selfRoleReactions[reactionKey];
                        // Check if we have the right message from self-roles
                        if (selfRoleMessage.messageId === message.id) {
                            for (let roleIdKey in selfRoleMessage.roleIds) {
                                if (selfRoleMessage.roleIds.hasOwnProperty(roleIdKey)) {
                                    let roleId = selfRoleMessage.roleIds[roleIdKey];
                                    if (roleIdKey === emoji.name) {
                                        // TODO : Do we need to find the role here? We're removing the roleId - so surely we can just add that?
                                        // const role = guild.roles.cache.find(role => role.id === roleId);
                                        // member?.roles.add(role);
                                        member?.roles.add(roleId);
                                    } else if (selfRoleMessage.exclusive) {
                                        message.reactions.resolve(roleIdKey).users.remove(member?.id);
                                        member?.roles.remove(roleId);
                                    }
                                }
                            }
                            break;
                        }
                    }
                }
            }
        }
    }
};