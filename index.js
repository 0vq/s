require("dotenv").config();
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const { Client } = require("discord.js-selfbot-v13");
const { v4: uuidv4 } = require("uuid");
const client = new Client();

const savedText = process.env.SAVED_TEXT || "Saved Messages";
const minDelay = parseInt(process.env.MIN_DELAY, 10) || 500;
const maxDelay = parseInt(process.env.MAX_DELAY, 10) || 2000;

const allowedExtensions = [
  ".mp4",
  ".avi",
  ".mov",
  ".mkv",
  ".flv",
  ".wmv",
  ".webm",
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".mp3",
  ".wav",
  ".ogg",
  ".flac",
  ".m4a",
  ".txt",
  ".json",
  ".html",
  ".css",
  ".js",
  ".ts",
  ".jsx",
  ".tsx",
  ".java",
  ".c",
  ".cpp",
  ".h",
  ".cs",
  ".py",
  ".rb",
  ".php",
  ".go",
  ".rs",
  ".swift",
  ".kt",
  ".dart",
  "webp",
];

if (!savedText) {
  console.error(
    "No text has been defined to save the messages. Please check the .env file."
  );
  process.exit(1);
}

(async () => {
  client.on("ready", async () => {
    console.log(`${client.user.username} is ready!`);
  });

  client.on("messageCreate", async (message) => {
    if (message.author.id === client.user.id) {
      if (message.content.toLowerCase() === ".save") {
        console.log("Starting message collection...");
        const messages = await fetchAndLogMessages(
          message,
          "saved_history.txt"
        );
        console.log("Message collection completed.");
        await saveMessages(messages);
        await message.delete();
        console.log(".save message deleted.");
      }
    }
  });

  async function fetchAndLogMessages(message, fileName) {
    const channel = message.channel;
    let folderName =
      channel.type === "GUILD_TEXT"
        ? "guild-" + channel.guild.name + "-" + channel.name
        : "dm-" + channel.recipient?.username;
    if (channel.type === "GROUP_DM") {
      folderName = "group-" + channel.name;
    }

    const baseDir = path.join(__dirname, "channel_history");
    const channelDir = path.join(
      baseDir,
      folderName.replace(/[^a-zA-Z0-9-]/g, "_")
    );
    const historyPath = path.join(channelDir, fileName);
    const attachmentDir = path.join(channelDir, "attachments");

    fs.mkdirSync(channelDir, { recursive: true });
    fs.mkdirSync(attachmentDir, { recursive: true });

    let allMessages = [];
    let lastId;
    let messageCount = 0;

    console.log("Starting message search...");
    while (true) {
      const options = { limit: 100, before: lastId };
      const messages = await channel.messages.fetch(options);
      if (messages.size === 0) break;

      messages.forEach((msg) => {
        allMessages.push(msg);
        fs.appendFileSync(historyPath, `${msg.author.tag}: ${msg.content}\n`);
        msg.attachments.forEach(async (attachment) => {
          const url = attachment.url.split("?")[0];
          const extension = path.extname(url).toLowerCase();
          if (allowedExtensions.includes(extension)) {
            const attachmentPath = path.join(
              attachmentDir,
              `${uuidv4()}${extension}`
            );
            const response = await axios({
              method: "get",
              url: attachment.url,
              responseType: "stream",
            });
            response.data.pipe(fs.createWriteStream(attachmentPath));
          }
        });
      });

      messageCount += messages.size;
      lastId = messages.last().id;

      console.log(
        `Collection in progress... Processed ${messageCount} messages so far.`
      );
    }

    console.log("Message search completed.");
    return allMessages;
  }

  async function saveMessages(messages) {
    console.log(`Saving ${messages.length} messages...`);

    messages.forEach((msg) => {
      if (msg.author.id !== client.user.id) return;
      fs.appendFileSync(
        "saved_messages.txt",
        `Message from ${msg.author.tag}: ${msg.content}\n`
      );
    });

    console.log("Messages saved successfully.");
  }

  async function delayRandom(min = 500, max = 2000) {
    const delayTime = Math.floor(Math.random() * (max - min + 1) + min);
    return new Promise((resolve) => setTimeout(resolve, delayTime));
  }

  client.login(process.env.DISCORD_TOKEN);
})();
