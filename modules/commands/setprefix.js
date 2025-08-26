const fs = require('fs').promises;
const moment = require('moment-timezone');

module.exports.config = {
    name: "setprefix",
    version: "1.0.3",
    hasPermssion: 1,
    credits: "Mirai Team & mod by Grok",
    description: "Đặt lại prefix của nhóm và cập nhật biệt danh bot với trạng thái thuê",
    commandCategory: "Quản Trị Viên",
    usages: "[prefix/reset]",
    cooldowns: 0,
    images: [],
};

// Đường dẫn file thuebot.json từ lệnh rt
const dataDir = __dirname + '/data';
const dataPath = dataDir + '/thuebot.json';

// Hàm đọc dữ liệu thuê bot
async function loadRentData() {
    try {
        const data = await fs.readFile(dataPath, 'utf8');
        return JSON.parse(data);
    } catch (e) {
        console.error("Lỗi khi đọc file thuebot.json:", e);
        return [];
    }
}

// Hàm cập nhật biệt danh bot, tích hợp trạng thái thuê
async function updateNickname(api, threadID, prefix, botName, rentData) {
    const currentThreadRentInfo = rentData.find(item => item.t_id == threadID);
    let nickname = `『 ${prefix} 』 ⪼ ${botName}`;

    if (currentThreadRentInfo) {
        const now = new Date();
        const endTime = new Date(
            currentThreadRentInfo.time_end.split('/').reverse().join('/')
        );
        const timeLeft = endTime.getTime() - now.getTime();

        if (timeLeft > 0) {
            const endDateFormatted = moment(endTime)
                .tz("Asia/Ho_Chi_Minh")
                .format("DD/MM/YYYY");
            nickname += ` | Hạn: ĐANG THUÊ (${endDateFormatted})`;
        } else {
            nickname += ` | Hạn: Hết hạn`;
        }
    }

    try {
        await api.changeNickname(nickname, threadID, api.getCurrentUserID());
    } catch (error) {
        console.error(`Lỗi khi đổi biệt danh trong nhóm ${threadID}:`, error);
        api.sendMessage(
            "❌ Bot không đủ quyền để đổi biệt danh trong nhóm này.",
            threadID
        );
    }
}

module.exports.handleEvent = async function ({ api, event, client }) {
    const { threadID, body } = event;
    const { PREFIX } = global.config;

    let threadSetting = global.data.threadData.get(threadID) || {};
    let prefix = threadSetting.PREFIX || PREFIX;

    const triggerWords = ["prefix", "prefix bot là gì", "quên prefix r", "dùng sao"];
    if (triggerWords.includes(body.toLowerCase())) {
        const msg = `🔍 ${global.config.BOTNAME || "BOT DongDev👾"} - Prefix của nhóm là: ${prefix}`;
        api.sendMessage(
            { body: msg, attachment: global.khanhdayr?.splice(0, 1) || [] },
            threadID,
            (err, info) => {
                if (!err) {
                    setTimeout(() => api.unsendMessage(info.messageID), 10000);
                }
            }
        );
    }
};

module.exports.handleReaction = async function ({ api, event, Threads, handleReaction }) {
    if (event.userID !== handleReaction.author) return;

    try {
        const { threadID, messageID } = event;
        let data = (await Threads.getData(threadID)).data || {};
        data.PREFIX = handleReaction.PREFIX;

        await Threads.setData(threadID, { data });
        global.data.threadData.set(threadID, data);

        // Tải dữ liệu thuê bot
        const rentData = await loadRentData();

        // Cập nhật biệt danh với trạng thái thuê
        await updateNickname(
            api,
            threadID,
            handleReaction.PREFIX,
            global.config.BOTNAME || "BOT DongDev👾",
            rentData
        );

        api.unsendMessage(handleReaction.messageID);
        api.sendMessage(
            `☑️ Prefix nhóm đã đổi thành: ${handleReaction.PREFIX}`,
            threadID,
            messageID
        );
    } catch (e) {
        console.error("Lỗi trong handleReaction:", e);
        api.sendMessage(
            "❌ Đã xảy ra lỗi khi đổi prefix. Vui lòng thử lại.",
            event.threadID,
            event.messageID
        );
    }
};

module.exports.run = async ({ api, event, args, Threads }) => {
    const { threadID, messageID, senderID } = event;

    // Kiểm tra quyền admin
    if (!global.config.ADMINBOT.includes(senderID)) {
        const threadInfo = await api.getThreadInfo(threadID);
        if (!threadInfo.adminIDs.some(id => id.id === senderID)) {
            return api.sendMessage(
                "❌ Chỉ admin bot hoặc admin nhóm mới có thể sử dụng lệnh này!",
                threadID,
                messageID
            );
        }
    }

    if (!args[0]) {
        return api.sendMessage(
            "⚠️ Vui lòng nhập prefix mới hoặc 'reset' để đặt lại mặc định",
            threadID,
            messageID
        );
    }

    const prefix = args[0].trim();
    if (!prefix) {
        return api.sendMessage(
            "⚠️ Vui lòng nhập prefix hợp lệ",
            threadID,
            messageID
        );
    }

    // Tải dữ liệu thuê bot
    const rentData = await loadRentData();
    const botName = global.config.BOTNAME || "BOT DongDev👾";

    if (prefix === "reset") {
        let data = (await Threads.getData(threadID)).data || {};
        data.PREFIX = global.config.PREFIX;

        await Threads.setData(threadID, { data });
        global.data.threadData.set(threadID, data);

        // Cập nhật biệt danh với trạng thái thuê
        await updateNickname(api, threadID, global.config.PREFIX, botName, rentData);

        api.sendMessage(
            `☑️ Prefix đã reset về mặc định: ${global.config.PREFIX}`,
            threadID,
            messageID
        );
    } else {
        api.sendMessage(
            `📝 Bạn yêu cầu set prefix mới: ${prefix}\n👉 Reaction tin nhắn này để xác nhận`,
            threadID,
            (err, info) => {
                if (!err) {
                    global.client.handleReaction.push({
                        name: "setprefix",
                        messageID: info.messageID,
                        author: senderID,
                        PREFIX: prefix
                    });
                    setTimeout(() => api.unsendMessage(info.messageID), 10000);
                }
            },
            messageID
        );
    }
};