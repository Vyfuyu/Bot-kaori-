const fs = require("fs");
const path = require("path");
const axios = require("axios");
const moment = require("moment-timezone");

module.exports.config = {
  name: "adc",
  version: "6.0.0",
  hasPermssion: 3,
  credits: "ĐÉO CÓ",
  description: "Tải code từ link raw bất kỳ và xuất ra link Dpaste",
  commandCategory: "Admin",
  usages: "[tên file] (reply link raw)",
  cooldowns: 0,
  usePrefix: false
};

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID, senderID, messageReply, type } = event;
  const isAdmin = global.config.NDH.includes(senderID);
  const filename = args[0];
  const filepath = path.join(__dirname, `${filename}.js`);
  const replyText = type === "message_reply" ? messageReply.body : null;

  // ❌ Không phải admin
  if (!isAdmin) {
    const name = global.data.userName.get(senderID);
    const thread = await api.getThreadInfo(threadID);
    const time = moment.tz("Asia/Ho_Chi_Minh").format("HH:mm:ss | DD/MM/YYYY");
    return api.sendMessage(
      `📌 Box: ${thread.threadName}\n👤 ${name}\n📎 Dùng lệnh: adc\n🕒 ${time}\n🔗 https://facebook.com/${senderID}`,
      global.config.NDH
    );
  }

  // ✅ Nếu không reply link → xuất link dpaste từ file
  if (fs.existsSync(filepath) && !replyText) {
    const content = fs.readFileSync(filepath, "utf8");
    if (!content || content.trim().length < 3)
      return api.sendMessage(`⚠️ File "${filename}.js" không có nội dung.`, threadID, messageID);
    try {
      const form = new URLSearchParams();
      form.append("content", content);
      form.append("syntax", "js");
      form.append("expiry_days", "7");

      const res = await axios.post("https://dpaste.com/api/v2/", form.toString(), {
        headers: { "Content-Type": "application/x-www-form-urlencoded" }
      });

      return api.sendMessage(`${res.data.trim()}.txt`, threadID, messageID);
    } catch (e) {
      const detail = e.response?.data || e.message;
      return api.sendMessage(`❎ Lỗi tạo link Dpaste:\n${typeof detail === "object" ? JSON.stringify(detail) : detail}`, threadID, messageID);
    }
  }

  // ❎ Không có tên và không có reply → báo sai cú pháp
  if (!filename && !replyText)
    return api.sendMessage(`❎ Vui lòng nhập tên file và reply link raw code`, threadID, messageID);

  // ✅ Nếu có reply link → lưu file
  const urlMatch = replyText?.match(/https?:\/\/[^\s]+/g);
  if (!urlMatch || !urlMatch[0].startsWith("http"))
    return api.sendMessage("❎ Không tìm thấy link hợp lệ.", threadID, messageID);

  let url = urlMatch[0];
  if (/^https:\/\/dpaste\.com\/[a-zA-Z0-9]+$/.test(url)) url += ".txt"; // hỗ trợ dpaste

  try {
    const { data } = await axios.get(url);
    fs.writeFileSync(filepath, data, "utf8");
    delete require.cache[require.resolve(filepath)];
    require(filepath);
    return api.sendMessage(`✅ Đã lưu code vào ${filename}.js`, threadID, messageID);
  } catch (e) {
    return api.sendMessage("❎ Lỗi tải code từ link:\n" + e.message, threadID, messageID);
  }
};