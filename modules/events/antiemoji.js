const fs = require("fs-extra");
const { resolve } = require("path");

class AntiEmoji {
  constructor(config) {
    this.config = config;
  }

  async run({ api, event, Threads }) {
    const { threadID, author, logMessageData, logMessageType } = event;
    const { getCurrentUserID, sendMessage, changeThreadEmoji } = api;
    const path = resolve(__dirname, "cache", "antiemoji.json");

    if (!threadID || logMessageType !== "log:thread-icon") return;

    // Tạo file nếu chưa có
    fs.ensureFileSync(path);
    let data = {};
    try {
      data = JSON.parse(fs.readFileSync(path, "utf8").trim() || "{}");
    } catch (e) {
      return console.error("❌ Lỗi đọc file:", e.message);
    }

    const threadData = data[threadID] || { emojiEnabled: true, emoji: "👍" };
    const isBot = author === getCurrentUserID();
    if (isBot) return;

    const qtv = await Threads.getInfo(threadID).then(t => t.adminIDs.map(e => e.id));
    const isQTV = qtv.includes(author);

    if (isQTV) {
      threadData.emoji = logMessageData.thread_icon || logMessageData.thread_quick_reaction_emoji || "👍";
      threadData.emojiEnabled = true; // bật lại
      data[threadID] = threadData;
      fs.writeFileSync(path, JSON.stringify(data, null, 2));
      return;
    }

    // Nếu thành viên thường mà emojiEnabled đang bật
    if (threadData.emojiEnabled) {
      changeThreadEmoji(threadData.emoji, threadID, err => {
        if (!err) sendMessage(`⚠️ Bạn không có quyền đổi emoji nhóm. Đã đổi lại ${threadData.emoji}`, threadID);
      });
    }
  }
}

module.exports = new AntiEmoji({
  name: "antiemoji",
  eventType: ["log:thread-icon"],
  version: "1.2.0",
  credits: "dgk",
  description: "Chỉ QTV mới được đổi emoji nhóm",
});
