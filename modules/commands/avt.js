module.exports.config = {
  name: "avt",
  version: "1.0.4",
  hasPermssion: 0,
  credits: "Mirai Team & Modified by DuyVuong",
  description: "Lấy, thay đổi hoặc xóa avatar người dùng hoặc nhóm",
  commandCategory: "Tiện ích",
  usePrefix: false,
  cooldowns: 0
};

const axios = require("axios");
const downloader = require('image-downloader');
const fse = require('fs-extra');

async function streamURL(url, mime = 'jpg') {
  const dest = `${__dirname}/cache/${Date.now()}.${mime}`;
  await downloader.image({ url, dest });
  setTimeout(() => fse.unlinkSync(dest), 60 * 1000);
  return fse.createReadStream(dest);
}

module.exports.run = async function({ api, event, args }) {
  const { threadID, messageID, messageReply, mentions } = event;

  // Thay đổi avatar nhóm bằng ảnh reply
  if (args[0] === "box" && args[1] === "new") {
    if (!messageReply || !messageReply.attachments || messageReply.attachments.length === 0) {
      return api.sendMessage("❌ Vui lòng reply một ảnh để đặt làm avatar nhóm!", threadID, messageID);
    }

    const attachment = messageReply.attachments[0];
    if (!attachment.url || !['photo', 'animated_image'].includes(attachment.type)) {
      return api.sendMessage("❌ Tin nhắn reply không chứa ảnh hợp lệ!", threadID, messageID);
    }

    try {
      const imageStream = await streamURL(attachment.url);
      await api.changeGroupImage(imageStream, threadID);
      return api.sendMessage("✅ Đã thay đổi avatar nhóm thành công!", threadID, messageID);
    } catch (error) {
      console.error(error);
      return api.sendMessage("❌ Không thể thay đổi avatar nhóm. API có thể yêu cầu quyền admin hoặc token không đủ quyền. Vui lòng thử lại!", threadID, messageID);
    }
  }

  // Xóa avatar nhóm
  if (args[0] === "box" && args[1] === "del") {
    try {
      await api.changeGroupImage(null, threadID);
      return api.sendMessage("✅ Đã xóa avatar nhóm thành công!", threadID, messageID);
    } catch (error) {
      console.error(error);
      return api.sendMessage("❌ Không thể xóa avatar nhóm. API có thể yêu cầu quyền admin hoặc token không đủ quyền. Vui lòng thử lại!", threadID, messageID);
    }
  }

  // Lấy avatar của box (nhóm)
  if (args[0] === "box" || args[0] === "nhóm") {
    try {
      const threadInfo = await api.getThreadInfo(threadID);
      if (!threadInfo.imageSrc) {
        return api.sendMessage("❌ Nhóm này không có ảnh đại diện", threadID, messageID);
      }
      const boxImage = await streamURL(threadInfo.imageSrc);
      return api.sendMessage({ 
        body: `🖼️ Avatar của nhóm:`, 
        attachment: boxImage 
      }, threadID, messageID);
    } catch (error) {
      return api.sendMessage("❌ Không thể lấy avatar nhóm", threadID, messageID);
    }
  }

  // Lấy avatar của chính người gửi lệnh
  if (!args[0] && !messageReply && Object.keys(mentions).length === 0) {
    const userID = event.senderID;
    try {
      const userImage = await streamURL(`https://graph.facebook.com/${userID}/picture?width=720&height=720&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`);
      return api.sendMessage({ 
        body: `🖼️ Avatar của bạn:`, 
        attachment: userImage 
      }, threadID, messageID);
    } catch (error) {
      return api.sendMessage("❌ Không thể lấy avatar của bạn", threadID, messageID);
    }
  }

  // Lấy avatar khi reply tin nhắn
  if (messageReply) {
    const uid = messageReply.senderID;
    try {
      const userInfo = await api.getUserInfo(uid);
      const name = userInfo[uid].name;
      const userImage = await streamURL(`https://graph.facebook.com/${uid}/picture?width=720&height=720&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`);
      return api.sendMessage({ 
        body: `🖼️ Avatar của ${name}:`, 
        attachment: userImage 
      }, threadID, messageID);
    } catch (error) {
      return api.sendMessage("❌ Không thể lấy avatar từ tin nhắn reply", threadID, messageID);
    }
  }

  // Lấy avatar khi tag người dùng
  if (Object.keys(mentions).length > 0) {
    for (const [id, name] of Object.entries(mentions)) {
      try {
        const userImage = await streamURL(`https://graph.facebook.com/${id}/picture?width=720&height=720&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`);
        await api.sendMessage({ 
          body: `🖼️ Avatar của ${name.replace('@', '')}:`, 
          attachment: userImage 
        }, threadID);
      } catch (error) {
        await api.sendMessage(`❌ Không thể lấy avatar của ${name.replace('@', '')}`, threadID);
      }
    }
    return;
  }

  // Lấy avatar từ UID hoặc link profile
  if (args[0]) {
    let uid = args[0];
    
    // Nếu là link Facebook
    if (args[0].includes("facebook.com")) {
      try {
        const response = await axios.get(`https://ffb.vn/api/tool/get-id-fb?idfb=${encodeURIComponent(args[0])}`);
        if (response.data.error !== 0) throw new Error(response.data.msg);
        uid = response.data.id;
      } catch (error) {
        return api.sendMessage("❌ Không thể lấy UID từ link này", threadID, messageID);
      }
    }

    // Kiểm tra UID hợp lệ
    if (!/^\d+$/.test(uid)) {
      return api.sendMessage("⚠️ UID không hợp lệ", threadID, messageID);
    }

    try {
      const userInfo = await api.getUserInfo(uid);
      const name = userInfo[uid]?.name || "Người dùng";
      const userImage = await streamURL(`https://graph.facebook.com/${uid}/picture?width=720&height=720&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`);
      return api.sendMessage({ 
        body: `🖼️ Avatar của ${name} (${uid}):`, 
        attachment: userImage 
      }, threadID, messageID);
    } catch (error) {
      return api.sendMessage("❌ Không thể lấy avatar từ UID này", threadID, messageID);
    }
  }

  return api.sendMessage("📌 Cách sử dụng:\n- avt: Lấy avatar của bạn\n- avt box: Lấy avatar nhóm\n- avt box new + reply ảnh: Đặt ảnh reply làm avatar nhóm\n- avt box del: Xóa avatar nhóm\n- avt + reply: Lấy avatar người reply\n- avt + @tag: Lấy avatar người được tag\n- avt + [UID/link]: Lấy avatar từ UID hoặc link", threadID, messageID);
};