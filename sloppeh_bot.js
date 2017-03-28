const fs = require("fs");
const Discord = require("discord.js");
const client = new Discord.Client();

const printDebug = false;
// Get Bot Token
const token = fs.readFileSync("bot.token", {encoding:'utf8'});

// Load sounds file config
const sounds = require("./sounds.js");

function debuglog() {
    if (printDebug) {
        console.log.apply(console, arguments);
    }
}

function cleanup(msg) {
    if (msg.guild && msg.guild.voiceConnection) {
        msg.guild.voiceConnection.disconnect("cleanup");
    }
}

function playSound(msg, soundFile) {
    var user = msg.author;
    if (msg.guild && msg.guild.available) {
        console.log("Sloppying it up in " + msg.guild.name + " (" + msg.guild.id + ")"); 
        // Actually in a guild/server, let's sloppy it up
        if (msg.guild.voiceConnection) {
            if (!msg.guild.voiceConnection.speaking) {
                console.log("Closing busted session.");
                msg.guild.voiceConnection.disconnect("cleanup");
            }
            console.log("Whoops! We are already being sloppy in here.");
            return;
        }
        
        var voiceChannels = [];
        // Make a list of available voice channels.
        for (let [id, channel] of msg.guild.channels) {
            console.log({channel: channel['name'], joinable: channel['joinable'], speakable: channel['speakable']});
            if (channel.type == "voice" && channel.joinable && channel.speakable) {
                voiceChannels.push(channel);
                if (channel.members.has(user.id)) {
                    // This is the channel with the user in it! Use this one!
                    voiceChannels = [channel];
                    break;
                }
            }
        }
        if (voiceChannels.length > 0) {
            // We have a channel(s) we can speak in, use the first one found.
            var channel = voiceChannels[0];
            channel.join().then(connection => {
                connection.on("debug", debuglog);
                console.log("Connected to voice channel " + channel.name + " (" + channel.id + ")" + " playing " + soundFile);
                var dispatcher = connection.playFile(soundFile).on("debug", debuglog).once("end", reason => {
                    console.log("Played file!");
                    if (reason != "cleanup") {
                        connection.disconnect();
                    }
                });
                /*client.setTimeout(function() {
                    if (!printDebug) {return;}
                    console.log("Timeout for " + soundFile);
                    console.log(connection);
                    console.log(dispatcher);
                }, 5000);*/
            }).catch(err => {
                if (channel.connection) {
                    channel.connection.disconnect();
                }
                console.error(err);
            });
        } else {
            console.log("No voice channels available");
        }
    }
}

// This is for bot related commands
var commands = {
    "!clean": cleanup,
};

client.on("message", msg => {
    for (var cmd in commands) {
        if (msg.content.startsWith(cmd)) {
            commands[cmd](msg);
        }
    }
    for (var soundCmd in sounds) {
        if (msg.content.startsWith(soundCmd)) {
            playSound(msg, sounds[soundCmd]);
            break;
        }
    }
});

client.on("ready", () => {
    console.log("Client has received ready event.");
    if (client.guilds && client.guilds.size) {
        console.log("Currently idling in:");
        for (let [id, guild] of client.guilds) {
            console.log("\t" + guild.name + " " + id);
        }
        console.log("");
    }
    // Let's check for any voiceConnection and close it.
    if (client.voiceConnections && client.voiceConnections.size) {
        console.log(client.voiceConnections);
        console.log("Closing all open voice connections.");
        for (let [id, voiceConnection] of client.voiceConnections) {
            voiceConnection.disconnect();
        }
    }
});

client.login(token);
