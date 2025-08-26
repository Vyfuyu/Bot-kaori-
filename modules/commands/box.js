const totalPath = __dirname + '/data/totalChat.json';
const _24hours = 86400000;
const fs = require("fs-extra");
const axios = require("axios");

module.exports.config = {
    name: "box",
    version: "2.1.4",
    hasPermssion: 0,
    credits: "không biết, fix lại Tobi, updated by Grok",
    description: "Xem thông tin thread/user",
    commandCategory: "Tiện ích",
    usages: "[thread/user]",
    cooldowns: 5,
    images: [],
    dependencies: {
        "axios": "",
        "fs-extra": ""
    }
};

module.exports.handleEvent = async ({ api, event }) => {
    if (!fs.existsSync(totalPath)) fs.writeFileSync(totalPath, JSON.stringify({}));
    let totalChat = JSON.parse(fs.readFileSync(totalPath));
    if (!totalChat[event.threadID]) return;
    if (Date.now() - totalChat[event.threadID].time > (_24hours * 2)) {
        let sl = (await api.getThreadInfo(event.threadID)).messageCount;
        totalChat[event.threadID] = {
            time: Date.now() - _24hours,
            count: sl,
            ytd: sl - totalChat[event.threadID].count
        };
        fs.writeFileSync(totalPath, JSON.stringify(totalChat, null, 2));
    }
};

module.exports.run = async function({ api, event, args, Users, Threads }) {
    const { threadID, messageID, senderID, type, mentions, messageReply } = event;
    const moment = require("moment-timezone");
    const gio = moment.tz("Asia/Ho_Chi_Minh").format("HH:mm:ss");

    if (args.length == 0) {
        return api.sendMessage(
            `[ BOX SETTINGS - Hướng Dẫn Sử Dụng ]\n───────────────\n` +
            `|› ${global.config.PREFIX}${this.config.name} qtv [@Tag] -> Thêm người được tag trở thành QTV\n` +
            `|› ${global.config.PREFIX}${this.config.name} image [Reply] -> Thay đổi ảnh box\n` +
            `|› ${global.config.PREFIX}${this.config.name} name -> Lấy tên nhóm\n` +
            `|› ${global.config.PREFIX}${this.config.name} id -> Lấy id box\n` +
            `|› ${global.config.PREFIX}${this.config.name} info -> Xem info box\n` +
            `|› ${global.config.PREFIX}${this.config.name} namebox -> Thay đổi tên box\n` +
            `|› ${global.config.PREFIX}${this.config.name} emoji -> Thay đổi emoji của box\n` +
            `|› ${global.config.PREFIX}${this.config.name} user [@tag] -> Lấy thông tin người được tag\n` +
            `|› ${global.config.PREFIX}${this.config.name} new -> Tạo nhóm với người được tag\n` +
            `|› ${global.config.PREFIX}${this.config.name} setnameall -> Đổi tên all thành viên\n` +
            `|› ${global.config.PREFIX}${this.config.name} rdcolor -> Đổi màu tin nhắn nhóm\n` +
            `|› ${global.config.PREFIX}${this.config.name} setname -> Đổi tên thành viên nhóm`,
            threadID, messageID
        );
    }

    if (args[0] == "setname") {
        const name = args.slice(1).join(" ");
        if (!name) return api.sendMessage("[ MODE ] - Vui lòng nhập tên mới", threadID, messageID);
        if (event.type == "message_reply") {
            return api.changeNickname(name, threadID, messageReply.senderID);
        } else {
            const mention = Object.keys(event.mentions)[0];
            if (!mention) return api.changeNickname(name, threadID, senderID);
            return api.changeNickname(name.replace(event.mentions[mention], ""), threadID, mention);
        }
    }

    if (args[0] == "rdcolor") {
        const colors = [
            '196241301102133', '169463077092846', '2442142322678320', '234137870477637',
            '980963458735625', '175615189761153', '2136751179887052', '2058653964378557',
            '2129984390566328', '174636906462322', '1928399724138152', '417639218648241',
            '930060997172551', '164535220883264', '370940413392601', '205488546921017',
            '809305022860427'
        ];
        const randomColor = colors[Math.floor(Math.random() * colors.length)];
        try {
            await api.changeThreadColor(randomColor, threadID);
            return api.sendMessage("[ MODE ] - Đã đổi màu tin nhắn nhóm", threadID, messageID);
        } catch (e) {
            console.error(e);
            return api.sendMessage("[ MODE ] - Không thể đổi màu nhóm", threadID, messageID);
        }
    }

    if (args[0] == "setnameall") {
        try {
            const threadInfo = await api.getThreadInfo(threadID);
            const name = args.slice(1).join(" ");
            if (!name) return api.sendMessage("[ MODE ] - Vui lòng nhập tên mới", threadID, messageID);
            const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
            for (const id of threadInfo.participantIDs) {
                await delay(3000);
                await api.changeNickname(name, threadID, id);
            }
            return api.sendMessage("[ MODE ] - Đã đổi tên tất cả thành viên", threadID, messageID);
        } catch (e) {
            console.error(e);
            return api.sendMessage("[ MODE ] - Lỗi khi đổi tên tất cả thành viên", threadID, messageID);
        }
    }

    if (args[0] == "new") {
        try {
            const id = [senderID];
            for (const key of Object.keys(event.mentions)) id.push(key);
            const groupTitle = event.body.slice(event.body.indexOf("|") + 2);
            if (!groupTitle) return api.sendMessage("[ MODE ] - Vui lòng cung cấp tên nhóm", threadID, messageID);
            await api.createNewGroup(id, groupTitle);
            return api.sendMessage(`[ MODE ] - Đã tạo nhóm ${groupTitle}`, threadID, messageID);
        } catch (e) {
            console.error(e);
            return api.sendMessage("[ MODE ] - Lỗi khi tạo nhóm mới", threadID, messageID);
        }
    }

    if (args[0] == "id") {
        return api.sendMessage(threadID, threadID, messageID);
    }

    if (args[0] == "name") {
        try {
            const nameThread = global.data.threadInfo.get(threadID).threadName || 
                (await Threads.getData(threadID)).threadInfo.threadName;
            return api.sendMessage(nameThread || "Không có tên nhóm", threadID, messageID);
        } catch (e) {
            console.error(e);
            return api.sendMessage("[ MODE ] - Lỗi khi lấy tên nhóm", threadID, messageID);
        }
    }

    if (args[0] == "namebox") {
        const content = args.slice(1).join(" ") || (event.messageReply && event.messageReply.body);
        if (!content) return api.sendMessage("[ MODE ] - Vui lòng nhập tên nhóm mới", threadID, messageID);
        try {
            await api.setTitle(content, threadID);
            return api.sendMessage(`[ MODE ] - Đã đổi tên nhóm thành ${content}`, threadID, messageID);
        } catch (e) {
            console.error(e);
            return api.sendMessage("[ MODE ] - Lỗi khi đổi tên nhóm", threadID, messageID);
        }
    }

    if (args[0] == "emoji") {
        const emoji = args[1] || (event.messageReply && event.messageReply.body);
        if (!emoji) return api.sendMessage("[ MODE ] - Vui lòng nhập emoji mới", threadID, messageID);
        try {
            await api.changeThreadEmoji(emoji, threadID);
            return api.sendMessage(`[ MODE ] - Đã đổi emoji nhóm thành ${emoji}`, threadID, messageID);
        } catch (e) {
            console.error(e);
            return api.sendMessage("[ MODE ] - Lỗi khi đổi emoji nhóm", threadID, messageID);
        }
    }

    if (args[0] == "me" && args[1] == "qtv") {
        try {
            const threadInfo = await api.getThreadInfo(threadID);
            const isBotAdmin = threadInfo.adminIDs.some(el => el.id == api.getCurrentUserID());
            if (!isBotAdmin) return api.sendMessage("[ MODE ] - Bot chưa được cấp QTV", threadID, messageID);
            if (!global.config.ADMINBOT.includes(senderID)) return api.sendMessage("[ MODE ] - Bạn không được phép sử dụng lệnh này", threadID, messageID);
            await api.changeAdminStatus(threadID, senderID, true);
            return api.sendMessage("[ MODE ] - Đã cấp QTV cho bạn", threadID, messageID);
        } catch (e) {
            console.error(e);
            return api.sendMessage("[ MODE ] - Lỗi khi cấp QTV", threadID, messageID);
        }
    }

    if (args[0] == "qtv") {
        try {
            let namee = args[1] || (event.messageReply && event.messageReply.senderID) || Object.keys(event.mentions)[0];
            if (!namee) return api.sendMessage("[ MODE ] - Vui lòng cung cấp ID hoặc tag người dùng", threadID, messageID);
            const threadInfo = await api.getThreadInfo(threadID);
            const isBotAdmin = threadInfo.adminIDs.some(el => el.id == api.getCurrentUserID());
            const isSenderAdmin = threadInfo.adminIDs.some(el => el.id == senderID);
            if (!isSenderAdmin) return api.sendMessage("[ MODE ] - Bạn không phải QTV nhóm", threadID, messageID);
            if (!isBotAdmin) return api.sendMessage("[ MODE ] - Bot chưa được cấp QTV", threadID, messageID);
            const isAdmin = threadInfo.adminIDs.some(el => el.id == namee);
            await api.changeAdminStatus(threadID, namee, !isAdmin);
            return api.sendMessage(`[ MODE ] - Đã ${isAdmin ? "xóa" : "cấp"} QTV cho ${await Users.getNameUser(namee)}`, threadID, messageID);
        } catch (e) {
            console.error(e);
            return api.sendMessage("[ MODE ] - Lỗi khi thay đổi trạng thái QTV", threadID, messageID);
        }
    }

    if (args[0] == "image") {
        if (event.type !== "message_reply") return api.sendMessage("[ MODE ] - Bạn phải reply một ảnh", threadID, messageID);
        if (!event.messageReply.attachments || event.messageReply.attachments.length == 0) return api.sendMessage("[ MODE ] - Bạn phải reply một ảnh", threadID, messageID);
        if (event.messageReply.attachments.length > 1) return api.sendMessage("[ MODE ] - Bạn chỉ có thể reply một ảnh", threadID, messageID);
        const attachmentUrl = event.messageReply.attachments[0].url;
        if (!attachmentUrl || attachmentUrl === "null") return api.sendMessage("[ MODE ] - URL của ảnh không hợp lệ", threadID, messageID);
        
        try {
            const response = await axios({
                method: "get",
                url: attachmentUrl,
                responseType: "stream"
            });
            const callback = () => api.changeGroupImage(fs.createReadStream(__dirname + "/cache/1.png"), threadID, () => fs.unlinkSync(__dirname + "/cache/1.png"));
            response.data.pipe(fs.createWriteStream(__dirname + '/cache/1.png')).on('close', () => callback());
        } catch (e) {
            console.error(e);
            return api.sendMessage("[ MODE ] - Không thể tải ảnh, vui lòng thử lại!", threadID, messageID);
        }
    }

    if (args[0] == "info") {
        try {
            if (!fs.existsSync(totalPath)) fs.writeFileSync(totalPath, JSON.stringify({}));
            let totalChat = JSON.parse(fs.readFileSync(totalPath));
            let threadInfo = await api.getThreadInfo(args[1] || threadID);
            let timeByMS = Date.now();
            let threadMem = threadInfo.participantIDs.length;
            let gendernam = [], gendernu = [], nope = [];
            for (let user of threadInfo.userInfo) {
                if (user.gender == "MALE") gendernam.push(user.name);
                else if (user.gender == "FEMALE") gendernu.push(user.name);
                else nope.push(user.name);
            }
            let adminName = [];
            for (const admin of threadInfo.adminIDs) {
                adminName.push(await Users.getNameUser(admin.id));
            }
            let nam = gendernam.length, nu = gendernu.length, qtv = threadInfo.adminIDs.length, sl = threadInfo.messageCount;
            let icon = threadInfo.emoji, threadName = threadInfo.threadName, id = threadInfo.threadID;
            let pd = threadInfo.approvalMode ? "bật" : "tắt";
            if (!totalChat[id]) {
                totalChat[id] = { time: timeByMS, count: sl, ytd: 0 };
                fs.writeFileSync(totalPath, JSON.stringify(totalChat, null, 2));
            }
            let mdtt = Math.floor(Math.random() * 101);
            let preCount = totalChat[id].count || 0, ytd = totalChat[id].ytd || 0;
            let hnay = ytd ? (sl - preCount) : "chưa có thống kê";
            let hqua = ytd ? ytd : "chưa có thống kê";
            if (timeByMS - totalChat[id].time > _24hours) {
                if (timeByMS - totalChat[id].time > (_24hours * 2)) {
                    totalChat[id] = { time: timeByMS - _24hours, count: sl, ytd: sl - preCount };
                    fs.writeFileSync(totalPath, JSON.stringify(totalChat, null, 2));
                }
                let getHour = Math.ceil((timeByMS - totalChat[id].time - _24hours) / 3600000);
                mdtt = ytd ? ((((hnay) / ((hqua / 24) * getHour))) * 100).toFixed(0) : 100;
                mdtt += "%";
            }
            const messageBody = {
                body: `⭐️ Box: ${threadName || "không có"}\n🎮 ID: ${id}\n📱 Phê duyệt: ${pd}\n🐰 Emoji: ${icon || "👍"}\n📌 Thông tin: ${threadMem} thành viên\nSố tv nam 🧑‍🦰: ${nam} thành viên\nSố tv nữ 👩‍🦰: ${nu} thành viên\n🕵️‍♂️ QTV:\n${adminName.join('\n')}\n💬 Tổng: ${sl} tin nhắn\n📈 Mức tương tác: ${mdtt}\n🌟 Tổng tin nhắn hôm qua: ${hqua}\n🌟 Tổng tin nhắn hôm nay: ${hnay}\n⠀⠀⠀ ⠀ ⠀ 『${gio}』`
            };
            if (!threadInfo.imageSrc) return api.sendMessage(messageBody, threadID, messageID);
            const response = await axios({
                method: "get",
                url: threadInfo.imageSrc,
                responseType: "stream"
            });
            const callback = () => api.sendMessage({
                ...messageBody,
                attachment: fs.createReadStream(__dirname + '/cache/1.png')
            }, threadID, () => fs.unlinkSync(__dirname + '/cache/1.png'), messageID);
            response.data.pipe(fs.createWriteStream(__dirname + '/cache/1.png')).on('close', () => callback());
        } catch (e) {
            console.error(e);
            return api.sendMessage(`❎ Không thể lấy thông tin nhóm của bạn!\n${e.message}`, threadID, messageID);
        }
    }

    if (args[0] == "user") {
        try {
            let uid = type == "message_reply" ? messageReply.senderID : 
                     args.join().includes('@') ? Object.keys(mentions)[0] : senderID;
            if (!uid) return api.sendMessage("[ MODE ] - Không thể xác định người dùng", threadID, messageID);
            let data = await api.getUserInfo(uid);
            if (!data[uid]) throw new Error("Không thể lấy thông tin người dùng");
            let { profileUrl, gender, isFriend } = data[uid];
            let name = await Users.getNameUser(uid);
            const messageBody = {
                body: `👤 Tên: ${name}\n🐧 UID: ${uid}\n🙆‍♀️ Trạng thái: ${isFriend ? "đã kết bạn với bot" : "chưa kết bạn với bot"}\n🦋 Giới tính: ${gender == 2 ? 'nam' : gender == 1 ? 'nữ' : 'UNKNOWN'}\n🏝 Profile: ${profileUrl}`
            };
            const imageUrl = `https://graph.facebook.com/${uid}/picture?height=750&width=750&access_token=1073911769817594|aa417da57f9e260d1ac1ec4530b417de`;
            try {
                const response = await axios({
                    method: "get",
                    url: imageUrl,
                    responseType: "stream"
                });
                const callback = () => api.sendMessage({
                    ...messageBody,
                    attachment: fs.createReadStream(__dirname + "/cache/1.png")
                }, threadID, () => fs.unlinkSync(__dirname + "/cache/1.png"), messageID);
                response.data.pipe(fs.createWriteStream(__dirname + '/cache/1.png')).on('close', () => callback());
            } catch (e) {
                console.error(e);
                return api.sendMessage({
                    ...messageBody,
                    body: `${messageBody.body}\n⚠️ Không thể tải ảnh đại diện`
                }, threadID, messageID);
            }
        } catch (e) {
            console.error(e);
            return api.sendMessage(`❎ Không thể lấy thông tin người dùng!\n${e.message}`, threadID, messageID);
        }
    }
};