const { Message, EmbedBuilder } = require('discord.js');
// const { logToDatabase } = require('../dashboard/log_to_database');
const blacklist = require('../../lists/blacklist');
const res = new (require('rss-parser'))();
const sleep = require("timers/promises").setTimeout;
const fetch = require('node-fetch');

const path = require('path');
/**
 * @param {Message} message 
 */
module.exports = async (message, client) => {
    /**
     * This blacklist focuses on common "self-promo" type links like 'youtube.com' and 'twitch.tv'. We still allow these links to be posted in the "CONTENT SHARE" section and other specific channels. Users with the rank 5 or verified role are immune to this  
     */
    if (message?.deleted) return;

    let reason = 'Contains link';
    const timestamp = new Date().getTime();

    const member = message?.member;

    let found = false;

    // if a message contains a youtube channel url, get the channel id and see if the channel's name is the same as the author's
    // this is for the movies-tv-music and memes-and-media channel only, as they allow all ranks to post links unchecked
    function detectURLs(message) {
        var urlRegex = /(((https?:\/\/)|(www\.))[^\s]+)/g;
        return message.match(urlRegex)
    }

    if (message?.channel.id === process.env.MOVIE_CHAN || message?.channel.id === process.env.MEDIA_CHAN) {
        const username = message?.author?.username.toLowerCase();
        const displayName = message?.member?.displayName.toLowerCase();

        // if the url is a youtube channel url, we can get the channel's name from the channels rss feed and see if it matches the message author's username
        if (message?.content?.toLowerCase().includes('youtube.com/channel/')) {
            const urlInStr = detectURLs(message?.content) || [`${message?.content}`];
            const splitStr = urlInStr[0].split('/');
            const channelId = splitStr[splitStr.length - 1];

            const resolve = await res.parseURL(`https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`)

            if (resolve && resolve.title.toLowerCase() === username || resolve.title.toLowerCase() === displayName) {
                member?.send({
                    content: `${process.env.BOT_DENY} You cannot post your own channel link in #${message?.channel.name}`
                }).catch(err => console.error(`${path.basename(__filename)} There was a problem sending a message to a user. This usually happens when the target has DMs disabled: `, err));

                setTimeout(() => { message?.delete().catch(err => console.error(`${path.basename(__filename)} There was a problem deleting a message: `, err)) }, 600);
                await sleep(300);
            }
        }

        // if the url is a video url, we can check the video author's name in the embed json data and see if it matches the message author's username
        if (message?.content?.toLowerCase().includes('youtube.com/watch') || message?.content?.toLowerCase().includes('youtu.be/')) {
            const urlInStr = detectURLs(message?.content) || [`https://${message?.content}`];
            const replace = urlInStr[0].replace('www.', ''); ``

            const resolve = await fetch(`https://www.youtube.com/oembed?url=${replace}&format=json`);
            const response = await resolve.json();

            if (response && response.author_name.toLowerCase() === username || response.author_name.toLowerCase() === displayName) {
                member?.send({
                    content: `${process.env.BOT_DENY} You cannot post your own channel link in #${message?.channel.name}`
                }).catch(err => console.error(`${path.basename(__filename)} There was a problem sending a message to a user. This usually happens when the target has DMs disabled: `, err));

                setTimeout(() => { message?.delete().catch(err => console.error(`${path.basename(__filename)} There was a problem deleting a message: `, err)) }, 600);
                await sleep(300);
            }
        }

        // if the url is a twitch channel url, we can get the channel's name ur; and see if it matches the message author's username
        if (message?.content.toLowerCase().includes('twitch.tv/')) {
            const splitStr = message?.content?.split('/');
            const twitchUser = splitStr[splitStr.length - 1];

            if (twitchUser && twitchUser.toLowerCase() === username || twitchUser.toLowerCase() === displayName) {
                member?.send({
                    content: `${process.env.BOT_DENY} You cannot post your own channel link in #${message?.channel.name}`
                }).catch(err => console.error(`${path.basename(__filename)} There was a problem sending a message to a user. This usually happens when the target has DMs disabled: `, err));

                setTimeout(() => { message?.delete().catch(err => console.error(`${path.basename(__filename)} There was a problem deleting a message: `, err)) }, 600);
                await sleep(300);
            }
        }
    }

    for (var i in blacklist.promo) {
        if (message?.content.toLowerCase().includes(blacklist.promo[i].toLowerCase())) {
            if (i >= 0 && i <= 2) reason = 'Unverified user link';
            if (i >= 3 && i <= 13) reason = 'Self promotion link';
            if (i >= 14 && i <= 21) reason = 'Shortened link';
            found = true;
        }
    }

    for (var e in blacklist.noLinkChannels) {
        if (found && (message?.channel.id === blacklist.noLinkChannels[e] || message?.channel.parentId === blacklist.noLinkChannels[e]) && !message?.content.includes('tenor.com') && !message?.author.bot) {
            if (member?.id !== process.env.OWNER_ID && !message?.member?.roles?.cache.has(process.env.RANK5_ROLE) && !message?.member?.roles?.cache.has(process.env.VERIFIED_ROLE) && !message?.member?.roles?.cache.has(process.env.BOOST_ROLE)) {
                member?.send({
                    content: `${process.env.BOT_DENY} You must be rank 5 to post links in #${message?.channel.name}. You have been timedout for 60 seconds to prevent spamming`
                }).catch(err => console.error(`${path.basename(__filename)} There was a problem sending a message to a user. This usually happens when the target has DMs disabled: `, err));

                setTimeout(() => {
                    // If channel is a thread, we delete the entire thread, or we just delete the message
                    if (message?.author.id === message?.channel.ownerId) {
                        message?.channel.delete().catch(err => console.error(`${path.basename(__filename)} There was a problem deleting a thread channel: `, err))
                    } else {
                        message?.delete().catch(err => console.error(`${path.basename(__filename)} There was a problem deleting a message: `, err))
                    }
                }, 600);

                member?.timeout(60000, `${reason}`).catch(err => console.error(`${path.basename(__filename)} There was a problem adding a timeout: `, err));

                let msgContent = message?.content || ` `;
                if (message?.content.length > 1000) msgContent = message?.content.slice(0, 1000) + '...' || ` `;

                // logToDatabase(message?.author?.id, message?.author?.tag, message?.channel.name, reason, msgContent, timestamp, reason);

                await sleep(300);
            }
        }
    }
}