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
                connection.playFile(soundFile).on("debug", debuglog).once("end", reason => {
                    console.log("Played file!");
                    if (reason != "cleanup") {
                        connection.disconnect();
                    }
                });
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
        }
    }
});

client.on("ready", () => {
    console.log("Client has received ready event.");
});

client.login(token);
