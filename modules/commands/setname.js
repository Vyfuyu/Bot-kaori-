const fs = require('fs');

module.exports.config = {
  name: 'setname',
  version: '2.3.0',
  hasPermssion: 0,
  credits: 'DC-Nam & ChatGPT',
  description: 'Thay đổi, kiểm tra, xử lý biệt danh trong nhóm hoặc tên nhóm (box)',
  commandCategory: 'Quản Trị Viên',
  usages: '[biệt danh mới|check|box tên nhóm mới]',
  cooldowns: 0,
};

const pendingChecks = {};

module.exports.run = async function ({ api, event, args }) {
  const { threadID, senderID, messageReply, mentions, type, messageID } = event;

  // CHẾ ĐỘ ĐỔI TÊN NHÓM (BOX)
  if (args[0] && args[0].toLowerCase() === 'box') {
    const threadInfo = await api.getThreadInfo(threadID);
    const isSenderAdmin = threadInfo.adminIDs.some(e => e.id == senderID);

    if (!isSenderAdmin) {
      return api.sendMessage('⚠️ Chỉ quản trị viên mới được đổi tên nhóm.', threadID, messageID);
    }

    const newName = args.slice(1).join(' ').trim();
    if (!newName) return api.sendMessage('⚠️ Vui lòng nhập tên nhóm mới.', threadID, messageID);

    try {
      await api.setTitle(newName, threadID);
      return api.sendMessage(`✅ Đã đổi tên nhóm thành: ${newName}`, threadID, messageID);
    } catch (err) {
      return api.sendMessage('❌ Không thể đổi tên nhóm.', threadID, messageID);
    }
  }

  // CHẾ ĐỘ CHECK
  if (args[0] && args[0].toLowerCase() === 'check') {
    const threadInfo = await api.getThreadInfo(threadID);
    const allMembers = threadInfo.participantIDs;
    const nicknames = threadInfo.nicknames || {};

    // 1. CHECK BIỆT DANH NGƯỜI BỊ REPLY
    if (type === 'message_reply') {
      const targetID = messageReply.senderID;
      const nick = nicknames[targetID] || null;
      return api.sendMessage(nick
        ? `💻 Biệt danh của người này là: "${nick}"`
        : `⚠️ Người này chưa có biệt danh trong nhóm.`, threadID, messageID);
    }

    // 2. CHECK BIỆT DANH NGƯỜI ĐƯỢC TAG
    if (Object.keys(mentions).length > 0) {
      const targetID = Object.keys(mentions)[0];
      const nick = nicknames[targetID] || null;
      return api.sendMessage(nick
        ? `💳 Biệt danh của người được tag là: "${nick}"`
        : `⚠️ Người được tag chưa có biệt danh trong nhóm.`, threadID, messageID);
    }

    // 3. DANH SÁCH THÀNH VIÊN CHƯA CÓ BIỆT DANH
    const threadUsers = threadInfo.userInfo.filter(u => allMembers.includes(u.id) && u.type === 'User');
    const noNick = threadUsers.filter(u => !nicknames[u.id]);

    if (noNick.length === 0) {
      return api.sendMessage('✅ Tất cả thành viên đều đã có biệt danh.', threadID);
    }

    const list = noNick.map((user, i) => `${i + 1}. ${user.name} (${user.id})`).join('\n');
    pendingChecks[threadID] = noNick.map(user => user.id);

    return api.sendMessage(
      `📋 Danh sách thành viên chưa có biệt danh:\n✅ ${threadUsers.length - noNick.length}/${threadUsers.length} đã có biệt danh\n❌ ${noNick.length} chưa có:\n${list}\n\n↩️ Reply số để tag\n✴️ Reply "all" để kick toàn bộ\n🔖 Reply "tag" để tag tất cả`,
      threadID, (err, info) => {
        pendingChecks[`${threadID}_msg`] = info.messageID;
      }
    );
  }

  // CHẾ ĐỘ SET BIỆT DANH
  const rawInput = args.join(' ');
  let targetID = senderID;
  let targetName = '';

  // Xác định người đặt biệt danh
  if (type === 'message_reply') {
    targetID = messageReply.senderID;
    targetName = messageReply.senderName;
  } else if (Object.keys(mentions).length > 0) {
    targetID = Object.keys(mentions)[0];
    targetName = mentions[targetID];
  }

  // Loại bỏ tên người bị tag/reply khỏi chuỗi biệt danh
  const newName = rawInput.replace(targetName, '').trim();

  api.changeNickname(
    newName,
    threadID,
    targetID,
    err => {
      if (err) {
        return api.sendMessage('❌ Không thể đổi biệt danh. Nhóm có thể đang bật liên kết.', threadID);
      } else {
        return api.sendMessage(
          `${newName ? '✅ Đã đổi biệt danh thành: ' + newName : '🔄 Đã gỡ biệt danh'}`,
          threadID
        );
      }
    }
  );
};

module.exports.handleReply = async function ({ api, event }) {
  const { threadID, body } = event;
  const list = pendingChecks[threadID];

  if (!list) return;

  if (body.toLowerCase() === 'all') {
    for (const uid of list) {
      try {
        await api.removeUserFromGroup(uid, threadID);
      } catch (e) {
        console.log(`Không thể kick: ${uid}`);
      }
    }
    delete pendingChecks[threadID];
    return api.sendMessage(`🚫 Đã kick ${list.length} thành viên chưa có biệt danh.`, threadID);
  }

  if (body.toLowerCase() === 'tag') {
    const mentions = list.map(id => ({ id, tag: '❗' }));
    return api.sendMessage({ body: `📌 Tag toàn bộ chưa có biệt danh:`, mentions }, threadID);
  }

  const index = parseInt(body);
  if (!isNaN(index) && index > 0 && index <= list.length) {
    const tagID = list[index - 1];
    return api.sendMessage({ body: `🔔 Thành viên số ${index}:`, mentions: [{ id: tagID, tag: '❗' }] }, threadID);
  }

  return api.sendMessage('⚠️ Sai cú pháp. Reply số, "tag", hoặc "all".', threadID);
};
