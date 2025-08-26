const path = __dirname + '/kiemtra/';
const moment = require('moment-timezone');
const fs = require('fs-extra');

module.exports.config = {
  name: "check",
  version: "1.0.2",
  hasPermssion: 0,
  credits: "DungUwU && Nghĩa",
  description: "Check tương tác ngày/tuần/toàn bộ",
  commandCategory: "Tiện ích",
  usages: "[all/week/day/reset/lọc/box]",
  cooldowns: 0,
  dependencies: {
    "fs-extra": "",
    "moment-timezone": ""
  }
};

module.exports.onLoad = () => {
  if (!fs.existsSync(path) || !fs.statSync(path).isDirectory()) {
    fs.mkdirSync(path, { recursive: true });
  }
  setInterval(() => {
    const today = moment.tz("Asia/Ho_Chi_Minh").day();
    const checkttData = fs.readdirSync(path);
    checkttData.forEach(file => {
      try {
        const fileData = JSON.parse(fs.readFileSync(path + file));
        if (fileData.time != today) {
          setTimeout(() => {
            const currentData = JSON.parse(fs.readFileSync(path + file));
            if (currentData.time != today) {
              currentData.day = currentData.day.map(item => ({ ...item, count: 0 }));
              if (today == 1) {
                currentData.week = currentData.week.map(item => ({ ...item, count: 0 }));
              }
              currentData.time = today;
              fs.writeFileSync(path + file, JSON.stringify(currentData, null, 4));
            }
          }, 60 * 1000);
        }
      } catch (e) {
        fs.unlinkSync(path + file);
      }
    });
  }, 60 * 1000);
};

module.exports.handleEvent = async function ({ api, event, Threads }) {
  try {
    if (!event.isGroup) return;
    if (global.client.sending_top) return;
    const { threadID, senderID } = event;
    const today = moment.tz("Asia/Ho_Chi_Minh").day();

    let threadData;
    const filePath = path + threadID + '.json';
    if (!fs.existsSync(filePath)) {
      threadData = {
        total: [],
        week: [],
        day: [],
        time: today,
        last: { time: today, day: [], week: [] }
      };
      fs.writeFileSync(filePath, JSON.stringify(threadData, null, 4));
    } else {
      threadData = JSON.parse(fs.readFileSync(filePath));
    }

    const threadInfo = await api.getThreadInfo(threadID);
    if (threadInfo.isGroup && threadInfo.participantIDs) {
      const UserIDs = threadInfo.participantIDs;
      for (const user of UserIDs) {
        if (!threadData.last) threadData.last = { time: today, day: [], week: [] };
        if (!threadData.last.week.find(item => item.id == user)) {
          threadData.last.week.push({ id: user, count: 0 });
        }
        if (!threadData.last.day.find(item => item.id == user)) {
          threadData.last.day.push({ id: user, count: 0 });
        }
        if (!threadData.total.find(item => item.id == user)) {
          threadData.total.push({ id: user, count: 0 });
        }
        if (!threadData.week.find(item => item.id == user)) {
          threadData.week.push({ id: user, count: 0 });
        }
        if (!threadData.day.find(item => item.id == user)) {
          threadData.day.push({ id: user, count: 0 });
        }
      }
    }

    if (threadData.time != today) {
      global.client.sending_top = true;
      setTimeout(() => global.client.sending_top = false, 5 * 60 * 1000);
      threadData.day = threadData.day.map(item => ({ ...item, count: 0 }));
      if (today == 1) {
        threadData.week = threadData.week.map(item => ({ ...item, count: 0 }));
      }
      threadData.time = today;
    }

    const userData_week_index = threadData.week.findIndex(e => e.id == senderID);
    const userData_day_index = threadData.day.findIndex(e => e.id == senderID);
    const userData_total_index = threadData.total.findIndex(e => e.id == senderID);

    if (userData_total_index == -1) {
      threadData.total.push({ id: senderID, count: 1 });
    } else {
      threadData.total[userData_total_index].count++;
    }
    if (userData_week_index == -1) {
      threadData.week.push({ id: senderID, count: 1 });
    } else {
      threadData.week[userData_week_index].count++;
    }
    if (userData_day_index == -1) {
      threadData.day.push({ id: senderID, count: 1 });
    } else {
      threadData.day[userData_day_index].count++;
    }

    const participantIDs = threadInfo.participantIDs.map(id => id.toString());
    ['day', 'week', 'total'].forEach(t => {
      threadData[t] = threadData[t].filter(item => participantIDs.includes(item.id.toString()));
    });

    fs.writeFileSync(filePath, JSON.stringify(threadData, null, 4));
  } catch (e) {
    console.error(e);
  }
};

module.exports.run = async function ({ api, event, args, Users, Threads }) {
  await new Promise(resolve => setTimeout(resolve, 500));
  const { threadID, messageID, senderID, mentions } = event;
  const filePath = path + threadID + '.json';

  if (!fs.existsSync(filePath)) {
    return api.sendMessage("⚠️ Chưa có dữ liệu tương tác", threadID, messageID);
  }

  const threadData = JSON.parse(fs.readFileSync(filePath));
  const query = args[0] ? args[0].toLowerCase() : '';

  if (query == 'box') {
    let body_ = event.args[0].replace(exports.config.name, '')+'box info';
    let args_ = body_.split(' ');
    
    arguments[0].args = args_.slice(1);
    arguments[0].event.args = args_;
    arguments[0].event.body = body_;
    
    return require('./box.js').run(...Object.values(arguments));
  } else if (query == 'reset') {
    const threadInfo = await Threads.getData(threadID);
    if (!threadInfo.threadInfo.adminIDs.some(item => item.id == senderID)) {
      return api.sendMessage('❎ Bạn không đủ quyền hạn để sử dụng lệnh này', threadID, messageID);
    }
    fs.unlinkSync(filePath);
    return api.sendMessage(`✅ Đã xóa toàn bộ dữ liệu đếm tương tác của nhóm`, threadID, messageID);
  } else if (query == 'lọc') {
    const threadInfo = await api.getThreadInfo(threadID);
    if (!threadInfo.adminIDs.some(e => e.id == senderID)) {
      return api.sendMessage("❎ Bạn không có quyền sử dụng lệnh này", threadID, messageID);
    }
    if (!threadInfo.isGroup) {
      return api.sendMessage("❎ Chỉ có thể sử dụng trong nhóm", threadID, messageID);
    }
    if (!threadInfo.adminIDs.some(e => e.id == api.getCurrentUserID())) {
      return api.sendMessage("⚠️ Bot cần quyền quản trị viên", threadID, messageID);
    }
    if (!args[1] || isNaN(args[1])) {
      return api.sendMessage("⚠️ Vui lòng nhập số tin nhắn tối thiểu", threadID, messageID);
    }
    const minCount = +args[1];
    const allUser = threadInfo.participantIDs;
    const id_rm = [];
    for (const user of allUser) {
      if (user == api.getCurrentUserID()) continue;
      const userData = threadData.total.find(e => e.id == user);
      if (!userData || userData.count <= minCount) {
        await new Promise(resolve => setTimeout(async () => {
          try {
            await api.removeUserFromGroup(user, threadID);
            id_rm.push(user);
          } catch (e) {
            console.error(e);
          }
          resolve();
        }, 1000));
      }
    }
    return api.sendMessage(
      `✅ Đã xóa ${id_rm.length} thành viên có dưới ${minCount} tin nhắn\n\n${id_rm.map(($, i) => `${i + 1}. ${global.data.userName.get($) || 'Facebook User'}\n`).join('')}`,
      threadID, messageID
    );
  }

  const rankedData = threadData.total.sort((a, b) => b.count - a.count).map((item, i) => ({
    rank: i + 1,
    id: item.id,
    count: item.count
  }));

  let header = '', body = '', footer = '', msg = '', count = 1, storage = [];
  let data = [];

  if (query == 'all' || query == '-a') {
    header = '[ Check Tất Cả Tin Nhắn ]\n';
    data = threadData.total;
  } else if (query == 'week' || query == '-w') {
    header = '[ Check Tin Nhắn Tuần ]\n';
    data = threadData.week;
  } else if (query == 'day' || query == '-d') {
    header = '[ Check Tin Nhắn Ngày ]\n';
    data = threadData.day;
  } else {
    data = threadData.total;
  }

  for (const item of data) {
    const userName = await Users.getNameUser(item.id) || 'Facebook User';
    storage.push({ ...item, name: userName });
  }

  const check = ['all', '-a', 'week', '-w', 'day', '-d'].includes(query);
  if (!check && Object.keys(mentions).length > 0) {
    storage = storage.filter(e => mentions.hasOwnProperty(e.id));
  }

  storage.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

  if (!check || Object.keys(mentions).length > 0 || event.type == 'message_reply') {
    const UID = event.messageReply ? event.messageReply.senderID : Object.keys(mentions)[0] || senderID;
    const userRank = rankedData.find(e => e.id == UID)?.rank || 'Chưa có dữ liệu';
    const userTotal = threadData.total.find(e => e.id == UID)?.count || 0;
    const userTotalWeek = threadData.week.find(e => e.id == UID)?.count || 0;
    const userRankWeek = threadData.week.sort((a, b) => b.count - a.count).findIndex(e => e.id == UID) + 1;
    const userTotalDay = threadData.day.find(e => e.id == UID)?.count || 0;
    const userRankDay = threadData.day.sort((a, b) => b.count - a.count).findIndex(e => e.id == UID) + 1;
    const nameUID = storage.find(e => e.id == UID)?.name || 'Facebook User';
    const threadInfo = await api.getThreadInfo(threadID);
    const nameThread = threadInfo.threadName || 'Nhóm chat';
    const permission = global.config.ADMINBOT.includes(UID) ? 'Admin Bot' :
                      global.config.NDH.includes(UID) ? 'Người Thuê Bot' :
                      threadInfo.adminIDs.some(i => i.id == UID) ? 'Quản Trị Viên' : 'Thành Viên';
    const target = UID == senderID ? 'Bạn' : nameUID;

    const totalMessagesDay = threadData.day.reduce((a, b) => a + b.count, 0);
    const totalMessagesWeek = threadData.week.reduce((a, b) => a + b.count, 0);
    const totalMessagesAll = threadData.total.reduce((a, b) => a + b.count, 0);

    body = `[ ${nameThread} ]\n\n` +
           `👤 Tên: ${nameUID}\n` +
           `🎖️ Chức Vụ: ${permission}\n` +
           `📝 Profile: https://www.facebook.com/profile.php?id=${UID}\n` +
           `──────────────────\n` +
           `💬 Tin Nhắn Trong Ngày: ${userTotalDay.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}\n` +
           `📊 Tỉ Lệ Tương Tác Ngày: ${totalMessagesDay ? ((userTotalDay / totalMessagesDay) * 100).toFixed(2) : 0}%\n` +
           `🥇 Hạng Trong Ngày: ${userRankDay}\n` +
           `──────────────────\n` +
           `💬 Tin Nhắn Trong Tuần: ${userTotalWeek.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}\n` +
           `📊 Tỉ Lệ Tương Tác Tuần: ${totalMessagesWeek ? ((userTotalWeek / totalMessagesWeek) * 100).toFixed(2) : 0}%\n` +
           `🥈 Hạng Trong Tuần: ${userRankWeek}\n` +
           `──────────────────\n` +
           `💬 Tổng Tin Nhắn: ${userTotal.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}\n` +
           `📊 Tỉ Lệ Tương Tác Tổng: ${totalMessagesAll ? ((userTotal / totalMessagesAll) * 100).toFixed(2) : 0}%\n` +
           `🏆 Hạng Tổng: ${userRank}\n\n` +
           `📌 Thả cảm xúc '❤️' để xem tổng tin nhắn của toàn bộ thành viên`;
  } else {
    body = storage.map(item => `${count++}. ${item.name} - ${item.count.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")} Tin Nhắn`).join('\n');

  }

  msg = `${header}\n${body}${footer}`;
  if (query == 'all' || query == '-a') {
    msg += `\n📊 Bạn hiện đang đứng ở hạng: ${rankedData.find(e => e.id == senderID)?.rank || 'Chưa có dữ liệu'}\n` +
           `💬 Tổng tin nhắn: ${threadData.total.reduce((a, b) => a + b.count, 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}\n` +
           `Reply (phản hồi) tin nhắn này theo số thứ tự để xóa thành viên ra khỏi nhóm.\n` +
           `${global.config.PREFIX}check lọc + số tin nhắn để xóa thành viên ra khỏi nhóm.\n` +
           `${global.config.PREFIX}check reset -> reset lại toàn bộ dữ liệu tin nhắn.\n` +
           `${global.config.PREFIX}check box -> xem thông tin nhóm`;
  }

  return api.sendMessage(msg, threadID, (error, info) => {
    if (error) {
      console.error(error);
      return api.sendMessage("⚠️ Đã xảy ra lỗi khi thực hiện lệnh, vui lòng thử lại sau!", threadID);
    }
    if (query == 'all' || query == '-a') {
      global.client.handleReply.push({
        name: this.config.name,
        messageID: info.messageID,
        tag: 'locmen',
        thread: threadID,
        author: senderID,
        storage
      });
    }
    global.client.handleReaction.push({
      name: this.config.name,
      messageID: info.messageID,
      sid: senderID
    });
  }, messageID);
};

module.exports.handleReply = async function ({ api, event, handleReply, Threads }) {
  try {
    const { senderID, threadID, messageID, body } = event;
    const threadInfo = await Threads.getData(threadID);
    if (!threadInfo.threadInfo.adminIDs.some(item => item.id == api.getCurrentUserID())) {
      return api.sendMessage('❎ Bot cần quyền quản trị viên!', threadID, messageID);
    }
    if (!threadInfo.threadInfo.adminIDs.some(item => item.id == senderID)) {
      return api.sendMessage('❎ Bạn không đủ quyền hạn để lọc thành viên!', threadID, messageID);
    }

    const split = body.split(" ").filter(id => !isNaN(id));
    if (split.length === 0) {
      return api.sendMessage(`⚠️ Vui lòng nhập số thứ tự hợp lệ`, threadID, messageID);
    }

    const msg = [];
    let count_err_rm = 0;
    for (const index of split) {
      const id = handleReply.storage[index - 1]?.id;
      if (id) {
        try {
          await api.removeUserFromGroup(id, threadID);
          msg.push(`${index}. ${global.data.userName.get(id) || 'Facebook User'}`);
        } catch (e) {
          count_err_rm++;
          console.error(e);
        }
      }
    }

    return api.sendMessage(
      `✅ Đã xóa ${split.length - count_err_rm} người dùng thành công\n❎ Thất bại ${count_err_rm}\n\n${msg.join('\n')}`,
      threadID, messageID
    );
  } catch (e) {
    console.error(e);
    return api.sendMessage('⚠️ Đã xảy ra lỗi khi xóa thành viên', threadID, messageID);
  }
};

module.exports.handleReaction = async function ({ event, api, Users, handleReaction }) {
  try {
    if (event.userID != handleReaction.sid || event.reaction != "❤") return;
    const filePath = path + event.threadID + '.json';
    const data = JSON.parse(fs.readFileSync(filePath));
    const sort = data.total.sort((a, b) => b.count - a.count);
    const msg = `[ Tất Cả Tin Nhắn ]\n\n${sort.map(($, i) => `${i + 1}. ${global.data.userName.get($.id) || 'Facebook User'} - ${$.count.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")} tin.`).join('\n')}\n\n` +
                `💬 Tổng tin nhắn: ${data.total.reduce((s, $) => s + $.count, 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}\n` +
                `📊 Bạn hiện đang đứng ở hạng: ${sort.findIndex($ => $.id == event.userID) + 1}\n\n` +
                `📌 Reply stt để xóa thành viên ra khỏi nhóm.\n${global.config.PREFIX}check lọc [số tin nhắn] để xóa thành viên dưới "số tin nhắn".\n${global.config.PREFIX}check reset -> reset lại toàn bộ dữ liệu tin nhắn.\n${global.config.PREFIX}check box -> xem thông tin nhóm.`;

    api.unsendMessage(handleReaction.messageID);
    return api.sendMessage(msg, event.threadID, (err, info) => {
      if (err) {
        console.error(err);
        return api.sendMessage("⚠️ Đã xảy ra lỗi khi thực hiện lệnh", event.threadID);
      }
      global.client.handleReply.push({
        name: this.config.name,
        messageID: info.messageID,
        tag: 'locmen',
        thread: event.threadID,
        author: event.userID,
        storage: sort
      });
    });
  } catch (e) {
    console.error(e);
    return api.sendMessage("⚠️ Đã xảy ra lỗi khi xử lý phản ứng", event.threadID);
  }
};