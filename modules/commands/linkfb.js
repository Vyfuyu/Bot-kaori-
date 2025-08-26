const axios = require("axios");

// Load access token from global.config and validate
const ACCESS_TOKEN = global.tokens.EAAD6V7;
if (!ACCESS_TOKEN) {
  throw new Error("Access token is missing. Please ensure ACCESSTOKEN is defined in global.config (e.g., in index.js or config.json).");
}

module.exports.config = {
  name: "linkfb",
  version: "1.2.0",
  hasPermssion: 0,
  credits: "ThanhTùngGPT & Modified by DuyVuong",
  description: "Lấy link Facebook, UID và ngày tạo tài khoản",
  commandCategory: "Tiện ích",
  usages: "[uid | link] hoặc reply tin nhắn hoặc tag",
  cooldowns: 5
};

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString("vi-VN", {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID, messageReply, mentions } = event;
  let input = args[0];
  let uid;

  // Xử lý khi tag người dùng
  if (Object.keys(mentions).length > 0) {
    const targetID = Object.keys(mentions)[0];
    const name = mentions[targetID].replace("@", "");
    uid = targetID;
    
    try {
      const res = await axios.get(`https://graph.facebook.com/${uid}?fields=created_time&access_token=${ACCESS_TOKEN}`);
      const data = res.data;
      
      const creationDate = data.created_time ? formatDate(data.created_time) : "Không xác định";
      
      return api.sendMessage(
        `👤 Tên: ${name}\n🔗 Link FB: https://facebook.com/${uid}\n🆔 UID: ${uid}\n📅 Ngày tạo: ${creationDate}`,
        threadID,
        messageID
      );
    } catch (error) {
      return api.sendMessage(
        `👤 Tên: ${name}\n🔗 Link FB: https://facebook.com/${uid}\n🆔 UID: ${uid}\n📅 Ngày tạo: Không xác định`,
        threadID,
        messageID
      );
    }
  }

  // Xử lý khi reply tin nhắn
  if (messageReply) {
    uid = messageReply.senderID;
    try {
      const [userInfo, creationInfo] = await Promise.all([
        api.getUserInfo(uid),
        axios.get(`https://graph.facebook.com/${uid}?fields=created_time&access_token=${ACCESS_TOKEN}`)
      ]);
      
      const name = userInfo[uid].name;
      const creationDate = creationInfo.data.created_time ? formatDate(creationInfo.data.created_time) : "Không xác định";
      
      return api.sendMessage(
        `👤 Tên: ${name}\n🔗 Link FB: https://facebook.com/${uid}\n🆔 UID: ${uid}\n📅 Ngày tạo: ${creationDate}`,
        threadID,
        messageID
      );
    } catch (error) {
      return api.sendMessage(
        `🔗 Link FB: https://facebook.com/${uid}\n🆔 UID: ${uid}\n📅 Ngày tạo: Không xác định`,
        threadID,
        messageID
      );
    }
  }

  // Xử lý khi nhập UID hoặc link
  if (input) {
    // Nếu là link Facebook
    if (input.includes("facebook.com")) {
      try {
        // Lấy UID từ link
        const res = await axios.get(`https://graph.facebook.com/v17.0/?id=${encodeURIComponent(input)}&access_token=${ACCESS_TOKEN}`);
        uid = res.data.id;
        if (!uid) throw new Error("Không tìm thấy UID");
        
        // Lấy thông tin tài khoản
        const accountInfo = await axios.get(`https://graph.facebook.com/${uid}?fields=name,created_time&access_token=${ACCESS_TOKEN}`);
        const name = accountInfo.data.name || "Không xác định";
        const creationDate = accountInfo.data.created_time ? formatDate(accountInfo.data.created_time) : "Không xác định";
        
        return api.sendMessage(
          `👤 Tên: ${name}\n🔗 Link FB: https://facebook.com/${uid}\n🆔 UID: ${uid}\n📅 Ngày tạo: ${creationDate}`,
          threadID,
          messageID
        );
      } catch (error) {
        return api.sendMessage("❌ Không thể lấy thông tin từ link này. Link có thể không hợp lệ hoặc bị chặn.", threadID, messageID);
      }
    } 
    // Nếu là UID
    else if (/^\d+$/.test(input)) {
      uid = input;
      try {
        const [userInfo, creationInfo] = await Promise.all([
          api.getUserInfo(uid),
          axios.get(`https://graph.facebook.com/${uid}?fields=created_time&access_token=${ACCESS_TOKEN}`)
        ]);
        
        const name = userInfo[uid]?.name || "Không xác định";
        const creationDate = creationInfo.data.created_time ? formatDate(creationInfo.data.created_time) : "Không xác định";
        
        return api.sendMessage(
          `👤 Tên: ${name}\n🔗 Link FB: https://facebook.com/${uid}\n🆔 UID: ${uid}\n📅 Ngày tạo: ${creationDate}`,
          threadID,
          messageID
        );
      } catch (error) {
        return api.sendMessage(
          `🔗 Link FB: https://facebook.com/${uid}\n🆔 UID: ${uid}\n📅 Ngày tạo: Không xác định`,
          threadID,
          messageID
        );
      }
    } else {
      return api.sendMessage("❌ Đầu vào không hợp lệ. Vui lòng nhập UID, link Facebook hoặc reply/tag người cần kiểm tra.", threadID, messageID);
    }
  }

  // Nếu không có tham số, lấy thông tin của chính mình
  uid = event.senderID;
  try {
    const [userInfo, creationInfo] = await Promise.all([
      api.getUserInfo(uid),
      axios.get(`https://graph.facebook.com/${uid}?fields=created_time&access_token=${ACCESS_TOKEN}`)
    ]);
    
    const name = userInfo[uid].name;
    const creationDate = creationInfo.data.created_time ? formatDate(creationInfo.data.created_time) : "Không xác định";
    
    return api.sendMessage(
      `👤 Tên: ${name}\n🔗 Link FB: https://facebook.com/${uid}\n🆔 UID: ${uid}\n📅 Ngày tạo: ${creationDate}`,
      threadID,
      messageID
    );
  } catch (error) {
    return api.sendMessage(
      `🔗 Link FB: https://facebook.com/${uid}\n🆔 UID: ${uid}\n📅 Ngày tạo: Không xác định`,
      threadID,
      messageID
    );
  }
};