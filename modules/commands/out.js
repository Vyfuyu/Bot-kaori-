module.exports.config = {
  name: "out",
  version: "1.0.0",
  hasPermssion: 2,
  credits: "DũngUwU",
  description: "out box",
  commandCategory: "Admin",
  usePrefix:true,
  usages: "[tid]",
  cooldowns: 3
};

module.exports.run = async function({ api, event, args }) {
  const permission = ["100083174347639"];
  if (!permission.includes(event.senderID))
  return api.sendMessage("⚠️Xin lỗi! lệnh này chỉ admin mới dùng được", event.threadID, event.messageID);
  var id;
  if (!args.join("")) {
    id = event.threadID;
  } else {
    id = parseInt(args.join(" "));
  }
  return api.sendMessage('𝐓𝐮𝐚̂𝐧 𝐥𝐞̣̂𝐧𝐡 𝐜𝐮𝐧𝐠 𝐜𝐡𝐮̉ 💌', id, () => api.removeUserFromGroup(api.getCurrentUserID(), id))
}