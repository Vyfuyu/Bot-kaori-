module.exports.config = {
  name: "capnhat",
  version: "1.0.0",
  hasPermssion: 1,
  credits: "Vdang",// lão Quyền chỉ cho code chứ chưa tham khảo code này bao giờ, mod theo cảm nhận của bản thân đéo thay credits của bố con thằng cu nào hết
  description: "Làm mới danh sách quản trị viên",
  commandCategory: "Admin",
  usages: "để trống/threadID",
  cooldowns: 5,
  usePrefix: false
};
module.exports.run = async function ({ event, args, api, Threads }) { 
const moment = require("moment-timezone");//D/MM/YYYY
	var gio = moment.tz("Asia/Ho_Chi_Minh").format("D/MM/YYYY || HH:mm:ss");
const hours = moment.tz('Asia/Ho_Chi_Minh').format('HHmm');
const t = process.uptime() + global.config.UPTIME;
const h = Math.floor(t / (60 * 60));
const p = Math.floor((t % (60 * 60)) / 60);
const s = Math.floor(t % 60);
let timeStart = Date.now();
const { threadID } = event;
const targetID = args[0] || event.threadID;
var threadInfo = await api.getThreadInfo(targetID);
let threadName = threadInfo.threadName;
let qtv = threadInfo.adminIDs.length;
await Threads.setData(targetID , { threadInfo });
global.data.threadInfo.set(targetID , threadInfo);
return api.sendMessage(`✅ Đã làm mới danh sách quản trị viên nhóm thành công!\n───────────────\n🏘️ Box: ${threadName}\n🔎 ID: ${targetID}\n───────────────\n📌 Cập nhật thành công ${qtv} quản trị viên nhóm!\n───────────────\n⏰ Time on:${h}:${p}:${s}\n⏱️ ${gio}`, threadID);
}
