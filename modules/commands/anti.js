module.exports.config = {
  name: "anti",
  version: "4.1.5",
  hasPermssion: 1,
  credits: "BraSL",
  description: "Anti change Box chat vip pro",
  commandCategory: "Quản Trị Viên",
  usages: "anti dùng để bật tắt",
  cooldowns: 5,
  images: [],
  dependencies: {
    "fs-extra": "",
  },
};
const { readdirSync, readFileSync, writeFileSync, existsSync, unlinkSync } = require("fs-extra");
const path = require('path');
const fs = require('fs');
const request = require('request');
const axios = require('axios');
const FormData = require('form-data');
module.exports.handleReply = async function ({ api, event, args, handleReply, Threads }) {
  const { senderID, threadID, messageID, messageReply } = event;
  const { author, permssion } = handleReply;
  const Tm = (require('moment-timezone')).tz('Asia/Ho_Chi_Minh').format('HH:mm:ss || DD/MM/YYYY');
  const pathData = global.anti;
  const dataAnti = JSON.parse(readFileSync(pathData, "utf8"));

  if(author !== senderID ) return api.sendMessage(`❎ Bạn không phải người dùng lệnh`,threadID);

var number = event.args.filter(i=> !isNaN(i))
 for (const num of number){
  switch (num) {
    case "1": {
      if (permssion < 1)
        return api.sendMessage(
          "⚠️ Bạn không đủ quyền hạn để sử dụng lệnh này",
          threadID,
          messageID
        );
      var NameBox = dataAnti.boxname;
      const antiImage = NameBox.find(
        (item) => item.threadID === threadID
      );
      if (antiImage) {
        dataAnti.boxname = dataAnti.boxname.filter((item) => item.threadID !== threadID);
        api.sendMessage(
          "☑️ Tắt thành công chế độ anti đổi tên box ",
          threadID,
          messageID
        );
      } else {
        var threadName = (await api.getThreadInfo(event.threadID)).threadName;
        dataAnti.boxname.push({
          threadID,
          name: threadName
        })
        api.sendMessage(
          "☑️ Bật thành công chế độ anti đổi tên box",
          threadID,
          messageID
        );
      }
      writeFileSync(pathData, JSON.stringify(dataAnti, null, 4));
      break;
    }
    case "2": {
      if (permssion < 1)
        return api.sendMessage("⚠️ Bạn không đủ quyền hạn để sử dụng lệnh này", threadID, messageID);

      const index = dataAnti.boximage.findIndex(i => i.threadID === threadID);

      if (index !== -1) {
        dataAnti.boximage.splice(index, 1);
        api.sendMessage("✅ Tắt thành công chế độ anti đổi ảnh box", threadID, messageID);
      } else {
        try {
          const { imageSrc } = await api.getThreadInfo(threadID);
          if (!imageSrc)
            return api.sendMessage("❌ Nhóm chưa có ảnh đại diện!", threadID, messageID);

          const dir = path.join(__dirname, 'cache');
          const imgPath = path.join(dir, `${threadID}_boximage.jpg`);
          if (!fs.existsSync(dir)) fs.mkdirSync(dir);

          fs.writeFileSync(imgPath, (await axios.get(imageSrc, { responseType: 'arraybuffer' })).data);

          const form = new FormData();
          form.append('reqtype', 'fileupload');
          form.append('fileToUpload', fs.createReadStream(imgPath));

          const { data: url } = await axios.post('https://catbox.moe/user/api.php', form, {
            headers: form.getHeaders()
          });

          fs.unlinkSync(imgPath);
          dataAnti.boximage.push({ threadID, url });
          api.sendMessage("✅ Bật thành công chế độ anti đổi ảnh box", threadID, messageID);

        } catch {
          api.sendMessage("Đã xảy ra lỗi!", threadID, messageID);
        }
      }

      fs.writeFileSync(pathData, JSON.stringify(dataAnti, null, 4));
      break;
    }

    case "3": {
      if (permssion < 1)
        return api.sendMessage(
          "⚠️ Bạn không đủ quyền hạn để sử dụng lệnh này",
          threadID,
          messageID
        );
      const NickName = dataAnti.antiNickname.find(
        (item) => item.threadID === threadID
      );

      if (NickName) {
        dataAnti.antiNickname = dataAnti.antiNickname.filter((item) => item.threadID !== threadID);
        api.sendMessage(
          "☑️ Tắt thành công chế độ anti đổi biệt danh",
          threadID,
          messageID
        );
      } else {
        const nickName = (await api.getThreadInfo(event.threadID)).nicknames
        dataAnti.antiNickname.push({
          threadID,
          data: nickName
        });
        api.sendMessage(
          "☑️ Bật thành công chế độ anti đổi biệt danh",
          threadID,
          messageID
        );
      }
      writeFileSync(pathData, JSON.stringify(dataAnti, null, 4));
      break;
    }
    case "4": {
      if (permssion < 1)
        return api.sendMessage(
          "⚠️ Bạn không đủ quyền hạn để sử dụng lệnh này",
          threadID,
          messageID
        );
      const antiout = dataAnti.antiout;
      if (antiout[threadID] == true) {
        antiout[threadID] = false;
        api.sendMessage(
          "☑️ Tắt thành công chế độ anti out",
          threadID,
          messageID
        );
      } else {
        antiout[threadID] = true;
        api.sendMessage(
          "☑️ Bật thành công chế độ anti out",
          threadID,
          messageID
        );
      }
      writeFileSync(pathData, JSON.stringify(dataAnti, null, 4));
      break;
    }
case "5": {
  const filepath = path.join(process.cwd(), 'modules', 'events', 'cache', 'antiemoji.json');
  let data = JSON.parse(fs.readFileSync(filepath, 'utf8'));

  if (!data.hasOwnProperty(threadID)) {
    data[threadID] = { emojiEnabled: true };
  } else {
    data[threadID].emojiEnabled = !data[threadID].emojiEnabled;
  }

  let emoji = "";
  try {
    let threadInfo = await api.getThreadInfo(threadID);
    emoji = threadInfo.emoji;
  } catch (error) {
    console.error("Error fetching thread emoji status:", error);
  }

  if (data[threadID].emojiEnabled) {
    data[threadID].emoji = emoji;
  }

  fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf8');

  const statusMessage = data[threadID].emojiEnabled ? "Bật" : "Tắt";
  api.sendMessage(`☑️ ${statusMessage} thành công chế độ anti emoji`, threadID, messageID);
  break;
}
case "6": {
                    const filepath = path.join(__dirname, 'data', 'antitheme.json');
                    let data = JSON.parse(fs.readFileSync(filepath, 'utf8'));
                    let theme = "";
                    try {
                        const threadInfo = await Threads.getInfo(threadID);
                        theme = threadInfo.threadTheme.id;
                    } catch (error) {
                        console.error("Error fetching thread theme:", error);
                    }
                    if (!data.hasOwnProperty(threadID)) {
                        data[threadID] = {
                            themeid: theme || "",
                            themeEnabled: true
                        };
                        fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf8');
                    } else {
                        data[threadID].themeEnabled = !data[threadID].themeEnabled;
                        if (data[threadID].themeEnabled) {
                            data[threadID].themeid = theme || "";
                        }
                        fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf8');
                    }
                    const statusMessage = data[threadID].themeEnabled ? "Bật" : "Tắt";
                    api.sendMessage(`☑️ ${statusMessage} thành công chế độ anti theme`, threadID, messageID);
                    break;
                }

  case "7": {
  const dataAnti = __dirname + '/data/antiqtv.json';
 const info = await api.getThreadInfo(event.threadID);
 if (!info.adminIDs.some(item => item.id == api.getCurrentUserID())) 
 return api.sendMessage('❎ Bot cần quyền quản trị viên để có thể thực thi lệnh', event.threadID, event.messageID);
 let data = JSON.parse(fs.readFileSync(dataAnti));
 const { threadID, messageID } = event;
 if (!data[threadID]) {
 data[threadID] = true;
 api.sendMessage(`☑️ Bật thành công chế độ anti qtv`, threadID, messageID);
 } else {
 data[threadID] = false;
 api.sendMessage(`☑️ Tắt thành công chế độ anti qtv`, threadID, messageID);
 }
 fs.writeFileSync(dataAnti, JSON.stringify(data, null, 4));
 break;
}
   case "8": {
  const dataAnti = __dirname + '/data/antijoin.json';
  const info = await api.getThreadInfo(event.threadID);
  const { threadID, messageID } = event;

  // Đọc dữ liệu từ file
  let data = JSON.parse(fs.readFileSync(dataAnti));

  // Kiểm tra và cập nhật dữ liệu
  if (!data[threadID]) {
    data[threadID] = true;
    api.sendMessage(`☑️ Bật thành công chế độ anti thêm thành viên vào nhóm`, threadID, messageID);
  } else {
    data[threadID] = false;
    api.sendMessage(`☑️ Tắt thành công chế độ anti thêm thành viên vào nhóm`, threadID, messageID);
  }

  // Ghi dữ liệu trở lại file
  fs.writeFileSync(dataAnti, JSON.stringify(data, null, 4));
  break;
}
case "9": {
  if (permssion < 1) {
    return api.sendMessage("⚠️ Bạn không đủ quyền hạn để sử dụng lệnh này", threadID, messageID);
  }

  const pathResendData = path.join(__dirname, 'data', 'resend.json');
  let resendConfig = {};

  try {
    if (fs.existsSync(pathResendData)) {
      const fileContent = fs.readFileSync(pathResendData, 'utf8');
      if (fileContent && fileContent.trim()) {
        resendConfig = JSON.parse(fileContent);
      }
    }
  } catch (err) {
    console.error("❌ Lỗi đọc file resend.json:", err.message);
    resendConfig = {};
  }
  
  var threadName = (await api.getThreadInfo(threadID)).threadName || "Không xác định";
  
  // Kiểm tra nếu đã có cấu hình cho thread này hay chưa
  if (!resendConfig[threadID]) {
    // Nếu chưa có cấu hình, tạo mới với trạng thái bật
    resendConfig[threadID] = {
      unsendLog: true
    };
    api.sendMessage(`☑️ Đã bật chống gỡ tin nhắn cho nhóm: ${threadName}`, threadID, messageID);
  } else {
    // Nếu đã có cấu hình, đổi trạng thái
    if (!resendConfig[threadID].hasOwnProperty('unsendLog')) {
      resendConfig[threadID].unsendLog = true;
    } else {
      resendConfig[threadID].unsendLog = !resendConfig[threadID].unsendLog;
    }
    
    const status = resendConfig[threadID].unsendLog ? "bật" : "tắt";
    api.sendMessage(`☑️ Đã ${status} chống gỡ tin nhắn cho nhóm: ${threadName}`, threadID, messageID);
  }

  try {
    fs.writeFileSync(pathResendData, JSON.stringify(resendConfig, null, 4), 'utf8');
  } catch (err) {
    console.error("❌ Lỗi ghi file resend.json:", err.message);
    return api.sendMessage("❌ Đã xảy ra lỗi khi lưu cấu hình", threadID, messageID);
  }

  break;
}



case "10": {
  const info = await Threads.getInfo(threadID);
  if (!info.adminIDs.some(item => item.id == api.getCurrentUserID())) 
    return api.sendMessage('⚠️ Bot cần quyền quản trị viên nhóm', threadID, messageID);

  // Đường dẫn đến thư mục data và file antispam.json
  const dataDir = path.join(__dirname, 'data');
  const antiSpamPath = path.join(dataDir, 'antispam.json');

  // Tạo thư mục data nếu chưa tồn tại
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  // Tạo file antispam.json nếu chưa tồn tại
  if (!fs.existsSync(antiSpamPath)) {
    fs.writeFileSync(antiSpamPath, JSON.stringify([], null, 4), 'utf-8');
  }

  // Đọc dữ liệu hiện tại từ file antispam.json
  let antiData = [];
  try {
    const fileContent = fs.readFileSync(antiSpamPath, 'utf-8');
    if (fileContent) {
      antiData = JSON.parse(fileContent);
    }
  } catch (err) {
    console.error('Lỗi đọc file antispam.json:', err.message);
    return api.sendMessage('❌ Đã xảy ra lỗi khi đọc file cấu hình anti spam', threadID, messageID);
  }

  // Kiểm tra trạng thái anti spam cho threadID
  let threadEntry = antiData.find(entry => entry.threadID === threadID);
  if (threadEntry) {
    // Tắt chế độ anti spam: Xóa threadID khỏi antiData
    antiData = antiData.filter(entry => entry.threadID !== threadID);
    try {
      fs.writeFileSync(antiSpamPath, JSON.stringify(antiData, null, 4), 'utf-8');
      api.sendMessage('✅ Đã tắt chế độ chống spam', threadID, messageID);
    } catch (err) {
      console.error('Lỗi ghi file antispam.json:', err.message);
      return api.sendMessage('❌ Đã xảy ra lỗi khi lưu cấu hình anti spam', threadID, messageID);
    }
  } else {
    // Bật chế độ anti spam: Thêm threadID vào antiData với cấu hình ngưỡng
    antiData.push({
      threadID: threadID,
      status: true,
      usersSpam: {},
      config: {
        maxMessages: 5, // Số tin nhắn tối đa
        timeWindow: 2500 // Khoảng thời gian (ms)
      }
    });
    try {
      fs.writeFileSync(antiSpamPath, JSON.stringify(antiData, null, 4), 'utf-8');
      api.sendMessage('✅ Đã bật chế độ chống spam (5 tin nhắn trong 2.5 giây)', threadID, messageID);
    } catch (err) {
      console.error('Lỗi ghi file antispam.json:', err.message);
      return api.sendMessage('❌ Đã xảy ra lỗi khi lưu cấu hình anti spam', threadID, messageID);
    }
  }
  break;
}
case "11": {
  const info = await Threads.getInfo(threadID);
  if (!info.adminIDs.some(item => item.id == api.getCurrentUserID())) 
    return api.sendMessage('⚠️ Bot cần quyền quản trị viên nhóm', threadID, messageID);

  // Đường dẫn đến thư mục data và file antiTagAll.json
  const dataDir = path.join(__dirname, 'data');
  const antiTagAllPath = path.join(dataDir, 'antiTagAll.json');

  // Tạo thư mục data nếu chưa tồn tại
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  // Tạo file antiTagAll.json nếu chưa tồn tại
  if (!fs.existsSync(antiTagAllPath)) {
    fs.writeFileSync(antiTagAllPath, JSON.stringify([], null, 4), 'utf-8');
  }

  // Đọc dữ liệu hiện tại từ file antiTagAll.json
  let antiTagAllData = [];
  try {
    const fileContent = fs.readFileSync(antiTagAllPath, 'utf-8');
    if (fileContent) {
      antiTagAllData = JSON.parse(fileContent);
    }
  } catch (err) {
    console.error('Lỗi đọc file antiTagAll.json:', err.message);
    return api.sendMessage('❌ Đã xảy ra lỗi khi đọc file cấu hình chống tag all', threadID, messageID);
  }

  // Kiểm tra trạng thái chống tag all cho threadID
  let threadEntry = antiTagAllData.find(entry => entry.threadID === threadID);
  if (threadEntry) {
    // Tắt chế độ chống tag all: Xóa threadID khỏi antiTagAllData
    antiTagAllData = antiTagAllData.filter(entry => entry.threadID !== threadID);
    try {
      fs.writeFileSync(antiTagAllPath, JSON.stringify(antiTagAllData, null, 4), 'utf-8');
      api.sendMessage('✅ Đã tắt chế độ chống tag all', threadID, messageID);
    } catch (err) {
      console.error('Lỗi ghi file antiTagAll.json:', err.message);
      return api.sendMessage('❌ Đã xảy ra lỗi khi lưu cấu hình chống tag all', threadID, messageID);
    }
  } else {
    // Bật chế độ chống tag all: Thêm threadID vào antiTagAllData
    antiTagAllData.push({
      threadID: threadID,
      status: true
    });
    try {
      fs.writeFileSync(antiTagAllPath, JSON.stringify(antiTagAllData, null, 4), 'utf-8');
      api.sendMessage('✅ Đã bật chế độ chống tag all', threadID, messageID);
    } catch (err) {
      console.error('Lỗi ghi file antiTagAll.json:', err.message);
      return api.sendMessage('❌ Đã xảy ra lỗi khi lưu cấu hình chống tag all', threadID, messageID);
    }
  }
  break;
}
    case "12": {
      const antiImage = dataAnti.boximage.find(
        (item) => item.threadID === threadID
      );
      const antiBoxname = dataAnti.boxname.find(
        (item) => item.threadID === threadID
      );
      const antiNickname = dataAnti.antiNickname.find(
        (item) => item.threadID === threadID
      );
      return api.sendMessage(`[ CHECK ANTI BOX ]\n────────────────────\n|› 1. anti namebox: ${antiBoxname ? "bật" : "tắt"}\n|› 2. anti imagebox: ${antiImage ? "bật" : "tắt" }\n|› 3. anti nickname: ${antiNickname ? "bật" : "tắt"}\n|› 4. anti out: ${dataAnti.antiout[threadID] ? "bật" : "tắt"}\n────────────────────\n|› Trên kia là các trạng thái của từng anti`, threadID);
      break;
    }
    default: {
      return api.sendMessage(`❎ Số bạn chọn không có trong lệnh`, threadID);
      }
    }
  }
};






module.exports.run = async ({ api, event, Threads }) => {
  const { threadID, messageID, senderID } = event;
  const { PREFIX = global.config.PREFIX } = (await Threads.getData(threadID)).data || {};

  // Đường dẫn file
  const dataDir = path.join(__dirname, 'data');
  const files = {
    anti: global.anti,
    emoji: path.join(dataDir, 'antiemoji.json'),
    theme: path.join(dataDir, 'antitheme.json'),
    qtv: path.join(dataDir, 'antiqtv.json'),
    join: path.join(dataDir, 'antijoin.json'),
    resend: path.join(dataDir, 'resend.json'),
    spam: path.join(dataDir, 'antispam.json'),
    tagall: path.join(dataDir, 'antiTagAll.json')
  };

  // Tạo thư mục và file
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  Object.values(files).forEach(file => {
    if (!fs.existsSync(file)) fs.writeFileSync(file, JSON.stringify(file === files.spam || file === files.tagall ? [] : {}, null, 2));
  });

  // Đọc dữ liệu
  const data = {};
  Object.entries(files).forEach(([key, file]) => {
    try {
      data[key] = JSON.parse(fs.readFileSync(file));
    } catch {}
  });

  // Trạng thái
  const s = {
    boxname: data.anti?.boxname?.some(item => item.threadID === threadID) || false,
    boximage: data.anti?.boximage?.some(item => item.threadID === threadID) || false,
    nickname: data.anti?.antiNickname?.some(item => item.threadID === threadID) || false,
    out: data.anti?.antiout?.[threadID] || false,
    emoji: data.emoji?.[threadID]?.emojiEnabled || false,
    theme: data.theme?.[threadID]?.themeEnabled || false,
    qtv: data.qtv?.[threadID] || false,
    join: data.join?.[threadID] || false,
    unsend: data.resend?.[threadID] || false,
    spam: data.spam?.find(item => item.threadID == threadID)?.status || false,
    tagall: data.tagall?.find(item => item.threadID == threadID)?.status || false
  };

  // Gửi menu
  api.sendMessage(
    `📍ANTI\n` +
    `▸ 1. Namebox: ${s.boxname ? "✅" : "❎"} Cấm đổi tên\n` +
    `▸ 2. Image: ${s.boximage ? "✅" : "❎"} Cấm đổi ảnh\n` +
    `▸ 3. Nick: ${s.nickname ? "✅" : "❎"} Cấm đổi nick\n` +
    `▸ 4. Out: ${s.out ? "✅" : "❎"} Cấm rời nhóm\n` +
    `▸ 5. Emoji: ${s.emoji ? "✅" : "❎"} Cấm đổi emoji\n` +
    `▸ 6. Theme: ${s.theme ? "✅" : "❎"} Cấm đổi theme\n` +
    `▸ 7. Qtv: ${s.qtv ? "✅" : "❎"} Cấm đổi QTV\n` +
    `▸ 8. Join: ${s.join ? "✅" : "❎"} Cấm thêm người\n` +
    `▸ 9. Unsend: ${s.unsend ? "✅" : "❎"} Gửi tin gỡ\n` +
    `▸ 10. Spam: ${s.spam ? "✅" : "❎"} Cấm spam\n` +
    `▸ 11. Tag all: ${s.tagall ? "✅" : "❎"} Cấm tag @all\n` +
    `👉🏼 Reply 1-11 bật/tắt`,
    threadID,
    (error, info) => {
      if (!error) global.client.handleReply.push({
        name: this.config.name,
        messageID: info.messageID,
        author: senderID
      });
    },
    messageID
  );
};



module.exports.handleEvent = async function ({ api, event, Threads, Users }) {
  const { threadID, senderID, messageID, type, body, attachments } = event;
  if (senderID === api.getCurrentUserID()) return;

  const dataDir = path.join(__dirname, 'data');
  const cacheDir = path.join(__dirname, 'cache');
  const antiSpamPath = path.join(dataDir, 'antispam.json');
  const resendPath = path.join(dataDir, 'resend.json');
  const antiTagAllPath = path.join(dataDir, 'antiTagAll.json');

  // Đảm bảo thư mục và file tồn tại
  for (const dir of [dataDir, cacheDir]) if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  for (const file of [antiSpamPath, resendPath, antiTagAllPath]) if (!fs.existsSync(file)) fs.writeFileSync(file, file.includes('resend') ? '{}' : '[]', 'utf-8');

  // Đọc dữ liệu
  let antiData = JSON.parse(fs.readFileSync(antiSpamPath, 'utf-8'));
  let resendData = JSON.parse(fs.readFileSync(resendPath, 'utf-8'));
  let antiTagAllData = JSON.parse(fs.readFileSync(antiTagAllPath, 'utf-8'));

  const isAdmin = async () => {
    const adminIDs = (await Threads.getInfo(threadID)).adminIDs.map(e => e.id);
    const adminBot = global.config.ADMINBOT || [];
    return adminBot.includes(senderID) || adminIDs.includes(senderID);
  };

  // --- Anti Spam ---
  const spamEntry = antiData.find(e => e.threadID === threadID);
if (spamEntry?.status && !(await isAdmin())) {
    const maxMessages = 3; // Set to 3 messages
    const timeWindow = 2000; // Set to 2 seconds (2000ms)

    spamEntry.usersSpam = spamEntry.usersSpam || {};
    const user = spamEntry.usersSpam[senderID] || { count: 0, start: Date.now() };
    
    // Increment count for both text messages and stickers
    const isSticker = message.sticker; // Check if message contains a sticker
    if (message.body || isSticker) {
        user.count++;
    }

    const elapsed = Date.now() - user.start;

    if (elapsed < timeWindow && user.count > maxMessages) {
        const botIsAdmin = (await Threads.getInfo(threadID)).adminIDs.some(e => e.id === api.getCurrentUserID());
        if (!botIsAdmin) {
            return api.sendMessage('⚠️ Bot cần quyền quản trị viên để kick người dùng', threadID);
        }

        const { name } = await Users.getData(senderID);
        api.removeUserFromGroup(senderID, threadID);
        api.sendMessage(`Đã kick ${name} vì spam quá ${maxMessages} tin (bao gồm văn bản hoặc sticker) trong ${timeWindow / 1000}s`, threadID);
        user.count = 0;
        user.start = Date.now();
    }

    spamEntry.usersSpam[senderID] = user;
    fs.writeFileSync(antiSpamPath, JSON.stringify(antiData, null, 2), 'utf-8');
}

  // --- Anti Tag All ---
  const tagEntry = antiTagAllData.find(e => e.threadID === threadID);
  const tagAllRegex = /@moinguoi|@mọi người|@all/i;

  if (tagEntry?.status && type === 'message' && body && tagAllRegex.test(body) && !(await isAdmin())) {
    const botIsAdmin = (await Threads.getInfo(threadID)).adminIDs.some(e => e.id === api.getCurrentUserID());
    if (!botIsAdmin) return api.sendMessage('⚠️ Bot cần quyền quản trị viên để kick người dùng', threadID);

    const { name } = await Users.getData(senderID);
    api.removeUserFromGroup(senderID, threadID);
    api.sendMessage(`Đã kick ${name} vì tag all (@moinguoi)`, threadID);
  }

  // --- Resend (gỡ tin nhắn) ---
  // --- Resend (gỡ tin nhắn) ---
if (resendData[threadID]?.unsendLog) {
  global.logMessage = global.logMessage || new Map();

  if (type !== 'message_unsend') {
    global.logMessage.set(messageID, {
      msgBody: body || '',
      attachment: attachments || []
    });
  } else {
    const message = global.logMessage.get(messageID);
    if (!message) return;

    const userName = await Users.getNameUser(senderID);
    const msg = {
      body: `${userName} vừa gỡ ${message.attachment.length || '1'} nội dung.${message.msgBody ? `\nNội dung: ${message.msgBody}` : ''}`,
      attachment: [],
      mentions: [{ tag: userName, id: senderID }]
    };

    let index = 0;
    for (const att of message.attachment) {
      index++;
      let ext = 'bin';
      if (att.type === 'photo') ext = 'jpg';
      else if (att.type === 'video') ext = 'mp4';
      else if (att.type === 'audio') ext = 'mp3';
      else if (att.type === 'file') {
        const parts = att.url.split('.');
        ext = parts[parts.length - 1] || 'bin';
      }

      const filePath = path.join(cacheDir, `${index}_${Date.now()}.${ext}`);
      try {
        const res = await axios.get(att.url, { responseType: 'arraybuffer' });
        fs.writeFileSync(filePath, res.data);
        msg.attachment.push(fs.createReadStream(filePath));
      } catch {
        msg.body += `\n⚠️ Không tải được tệp ${index}`;
      }
    }

    api.sendMessage(msg, threadID, (err) => {
      if (err) return console.error('Lỗi resend:', err.message);
      for (const file of msg.attachment) {
        try {
          fs.unlinkSync(file.path);
        } catch (e) {
          console.error('Lỗi xóa file:', e.message);
        }
      }
    });
  }
}
};