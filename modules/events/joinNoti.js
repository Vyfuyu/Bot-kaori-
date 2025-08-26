module.exports.config = {
	name: "joinNoti",
	eventType: ["log:subscribe"],
	version: "1.0.1",
	credits: "Mirai Team",
	description: "Thông báo bot hoặc người vào nhóm có random gif/ảnh/video",
	dependencies: {
		"fs-extra": "",
		"path": "",
		"pidusage": ""
	}
};

let _0 = x=>x<10?'0'+x:x;
let time_str = time=>(d=>`${_0(d.getHours())}:${_0(d.getMinutes())}:${_0(d.getSeconds())} - ${_0(d.getDate())}/${_0(d.getMonth()+1)}/${d.getFullYear()} (Thứ ${d.getDay()==0?'Chủ Nhật':d.getDay()+1})`)(new Date(time));

module.exports.onLoad = function () {
    const { existsSync, mkdirSync } = global.nodemodule["fs-extra"];
    const { join } = global.nodemodule["path"];

	const path = join(__dirname, "cache", "joinGif");
	if (!existsSync(path)) mkdirSync(path, { recursive: true });	

	const path2 = join(__dirname, "cache", "joinGif", "randomgif");
    if (!existsSync(path2)) mkdirSync(path2, { recursive: true });

    return;
}

module.exports.run = async function({ api, event, Users, Threads}) {
    const { join } = global.nodemodule["path"];
    const { createReadStream, existsSync, mkdirSync, readdirSync } = global.nodemodule["fs-extra"];
    const fs = global.nodemodule["fs-extra"];
    const moment = require("moment-timezone");
	const { threadID } = event;
    
    ////////////////////////////////////////////////////////
    const thread = global.data.threadData.get(threadID) || {};
    if (typeof thread["joinNoti"] != "undefined" && thread["joinNoti"] == false) return;
    ///////////////////////////////////////////////////////

    // Nếu bot được thêm vào nhóm
    if (event.logMessageData.addedParticipants.some(i => i.userFbId == api.getCurrentUserID())) {
        const threadInfo = await api.getThreadInfo(threadID);
        const prefix = (await Threads.getData(String(threadID))).data?.PREFIX || global.config.PREFIX;
        const threadMem = threadInfo.participantIDs.length;
        const threadName = threadInfo.threadName || "Không rõ";
        const icon = threadInfo.emoji || "👍";
        const id = threadInfo.threadID;

        const gendernam = [];
        const gendernu = [];

        for (const u of threadInfo.userInfo) {
            if (u.gender == "MALE") gendernam.push(u.name);
            else if (u.gender == "FEMALE") gendernu.push(u.name);
        }

        const nam = gendernam.length;
        const nu = gendernu.length;
        const qtv = threadInfo.adminIDs.length;

        let listad_msg = '';
        for (const admin of threadInfo.adminIDs) {
            try {
                const infoUsers = await Users.getInfo(admin.id);
                listad_msg += `• ${infoUsers.name},\n`;
            } catch {
                listad_msg += `• ${admin.id},\n`;
            }
        }

        api.changeNickname(`『 ${prefix} 』 ⪼ ${global.config.BOTNAME || "Bé Ly"}`, threadID, api.getCurrentUserID());

        api.sendMessage("🔄 Đang kết nối...", threadID, async (err, info) => {
            if (!err) {
                await new Promise(r => setTimeout(r, 9000));
                await api.unsendMessage(info.messageID);
            }
        });

        setTimeout(() => {
            api.sendMessage("✅ Kết nối tới nhóm thành công", threadID, async (err, info) => {
                if (!err) {
                    await new Promise(r => setTimeout(r, 30000));
                    await api.unsendMessage(info.messageID);
                }
            });
        }, 10000);

        setTimeout(async () => {
            const timeNow = moment.tz("Asia/Ho_Chi_Minh").format("DD/MM/YYYY | HH:mm:ss");
            const message = `𝐋𝐨𝐚𝐝 𝐓𝐡𝐚̀𝐧𝐡 𝐂𝐨̂𝐧𝐠 𝐓𝐨à𝐧 𝐁𝐨̣̂ 𝐃𝐚𝐭𝐚 𝐂𝐡𝐨 𝐍𝐡𝐨́𝐦\n\n` +
                          `𝐓𝐞̂𝐧 𝐧𝐡𝐨́𝐦: ${threadName},\n𝐔𝐈𝐃 𝐧𝐡𝐨́𝐦: ${id},\n𝐄𝐦𝐨𝐣𝐢 𝐧𝐡𝐨́𝐦: ${icon},\n` +
                          `𝐓𝐨̂̉𝐧𝐠 𝐭𝐡𝐚̀𝐧𝐡 𝐯𝐢𝐞̂𝐧: ${threadMem},\n𝐍𝐚𝐦: ${nam}, 𝐍𝐮̛̃: ${nu}, 𝐐𝐓𝐕: ${qtv},\n` +
                          `𝐃𝐚𝐧𝐡 𝐬𝐚́𝐜𝐡 𝐐𝐓𝐕:\n${listad_msg}────────────────────\n⏰ Bây giờ là: ${timeNow}\n` +
                          `⚠️ Tin nhắn sẽ tự động gỡ sau 60 giây`;

            const sent = await api.sendMessage(message, threadID);
            setTimeout(() => api.unsendMessage(sent.messageID), 60000);
        }, 12000);

        return;
    }

    // Nếu người khác được thêm vào nhóm
    try {
        let thread_data = await Threads.getData(threadID);
        
        if (!!thread_data) {
            let send = msg=>api.sendMessage(msg, threadID);
            let asnn = thread_data.data.auto_set_nickname;

            if (!!asnn && !!asnn.all) {
                let time_join = time_str(Date.now()+25200000);
                for (let {
                    fullName,
                    firstName,
                    userFbId: id,
                } of event.logMessageData.addedParticipants) {
                    try {
                        let name_set = asnn.all.replace(/\${full_name}/g, fullName).replace(/\${short_name}/g, firstName).replace(/\${time_join}/g, time_join);
                        
                        await new Promise(resolve=>api.changeNickname(name_set, threadID, id, (err, res)=>resolve()));
                    } catch {};
                }
                
                send(`Đã set biệt danh cho TVM`);
            }
        }
        
        let { threadName, participantIDs } = await api.getThreadInfo(threadID);
        const time = moment.tz("Asia/Ho_Chi_Minh").format(" HH:mm:ss - DD/MM/YYYY");
        const hours = moment.tz("Asia/Ho_Chi_Minh").format("HH");
        var thu = moment.tz('Asia/Ho_Chi_Minh').format('dddd');
        
        if (thu == 'Sunday') thu = 'Chủ Nhật'
        if (thu == 'Monday') thu = 'Thứ Hai'
        if (thu == 'Tuesday') thu = 'Thứ Ba'
        if (thu == 'Wednesday') thu = 'Thứ Tư'
        if (thu == "Thursday") thu = 'Thứ Năm'
        if (thu == 'Friday') thu = 'Thứ Sáu'
        if (thu == 'Saturday') thu = 'Thứ Bảy'
        
        const threadData = global.data.threadData.get(parseInt(threadID)) || {};
        
        var mentions = [], nameArray = [], memLength = [], iduser = [], i = 0;
        
        for (let id in event.logMessageData.addedParticipants) {
            const userName = event.logMessageData.addedParticipants[id].fullName; 
            iduser.push(event.logMessageData.addedParticipants[id].userFbId.toString());
            nameArray.push(userName);
            mentions.push({ tag: userName, id: event.senderID });
            memLength.push(participantIDs.length - i++);
            console.log(userName)
        }
        memLength.sort((a, b) => a - b);
        
        let msg;
        (typeof threadData.customJoin == "undefined") ? msg = "‎[ 𝐓𝐡𝐚̀𝐧𝐡 𝐯𝐢𝐞̂𝐧 𝐯𝐚̀𝐨 𝐧𝐡𝐨́𝐦 ]\n─────────────────\n🎊Xin chào con vợ {name}.\n🎀Chào mừng con vợ đã đến với  box {threadName}.\n👤{type} là thành viên thứ {soThanhVien} của nhóm\n🎀 {type} được thêm bởi: {author}\n─────────────────\n⏰ Thời gian:{time}\n📆 Vào buổi {session} {thu}\n📌 Vào nhóm nhớ Giới Thiệu Tên + Năm sinh và nói biệt danh muốn đặt để quản trị Viên set cho nhé 🥰\n🦑 Nhớ tương tác không sẽ bị kick ra khỏi đảo nhaa 🍀" : msg = threadData.customJoin;
        
        var getData = await Users.getData(event.author)
        var nameAuthor = typeof getData.name == "undefined" ? "Người dùng tự vào" : getData.name
        
        msg = msg
            .replace(/\{iduser}/g, iduser.join(', '))
            .replace(/\{name}/g, nameArray.join(', '))
            .replace(/\{type}/g, (memLength.length > 1) ?  'Các bạn': 'Bạn')
            .replace(/\{soThanhVien}/g, memLength.join(', '))
            .replace(/\{author}/g, nameAuthor)
            .replace(/\{idauthor}/g, event.author)
            .replace(/\{threadName}/g, threadName)
            .replace(/\{thu}/g, thu)
            .replace(/\{session}/g, hours <= 10 ? "sáng" : 
                hours > 10 && hours <= 12 ? "trưa" :
                hours > 12 && hours <= 18 ? "chiều" : "tối")
            .replace(/\{time}/g, time);
        
        // Sửa lỗi api.sendMessage
        for (const participant of event.logMessageData.addedParticipants) {
            await api.shareContact(`${msg}`, participant.userFbId, threadID);
        }
        
    } catch (e) { 
        return console.log(e) 
    }
}