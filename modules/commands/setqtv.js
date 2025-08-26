module.exports.config = {
    name: "setqtv",
    version: "1.0.0",
    hasPermssion: 1, // 1: Quản trị viên nhóm
    credits: "DongDev",
    description: "Thêm hoặc xóa quản trị viên nhóm.",
    commandCategory: "Quản Trị Viên",
    usages: "setqtv add [tag/reply] | setqtv rm [tag/reply]",
    cooldowns: 5,
    usePrefix: false
};

module.exports.run = async function ({ api, event, args, permssion, Users }) {
    const { threadID, messageID, mentions } = event;
    const moment = require("moment-timezone");
    const gio = moment.tz("Asia/Ho_Chi_Minh").format("DD/MM/YYYY - HH:mm:ss");

    // Kiểm tra quyền hạn của người dùng (chỉ QTV nhóm trở lên mới được dùng lệnh setqtv)
    if (permssion < 1) {
        return api.sendMessage("⚠️ Bạn cần quyền Quản trị viên nhóm trở lên để sử dụng lệnh này.", threadID, messageID);
    }

    const subCommand = args[0]; // Lấy đối số đầu tiên (add/rm)

    // Nếu không có đối số (chỉ gõ setqtv), hiển thị hướng dẫn
    if (!subCommand) {
        return api.sendMessage(
            `[ HƯỚNG DẪN SỬ DỤNG LỆNH SETQTV ]\n────────────────────\n` +
            `📝 ${global.config.PREFIX}setqtv add [tag/reply]: Thêm người dùng làm quản trị viên nhóm.\n` +
            `📝 ${global.config.PREFIX}setqtv rm [tag/reply]: Gỡ quyền quản trị viên của người dùng.\n\n` +
            `⏰ Thời gian: ${gio}\n` +
            `────────────────────\n` +
            `💡 Ghi chú: Bot phải là quản trị viên nhóm để thực hiện lệnh này.`,
            threadID,
            messageID
        );
    }

    const targetIDs = []; // Mảng chứa ID của người dùng cần thao tác

    // Xác định ID của người dùng từ reply hoặc tag
    if (event.type === "message_reply") {
        targetIDs.push(event.messageReply.senderID);
    } else if (Object.keys(mentions).length > 0) {
        targetIDs.push(...Object.keys(mentions));
    } else if (args[1] && !isNaN(args[1])) { // Nếu có ID được cung cấp trực tiếp sau lệnh con
        targetIDs.push(args[1]);
    }

    // Nếu không có đối tượng để thao tác (trừ trường hợp muốn xem hướng dẫn)
    if (targetIDs.length === 0) {
        return api.sendMessage(`⚠️ Vui lòng tag hoặc reply người bạn muốn ${subCommand === "add" ? "thêm" : "xóa"} quản trị viên.`, threadID, messageID);
    }

    // Lấy thông tin nhóm và kiểm tra quyền của bot ĐÚNG LÚC CẦN THIẾT
    const threadInfo = await api.getThreadInfo(threadID);
    const botID = api.getCurrentUserID();
    const botIsAdmin = threadInfo.adminIDs.some(admin => admin.id === botID);


    switch (subCommand) {
        case "add": {
            if (!botIsAdmin) {
                return api.sendMessage("⚠️ Bot hiện không phải là quản trị viên của nhóm. Vui lòng cấp quyền quản trị viên cho bot để thêm quản trị viên.", threadID, messageID);
            }

            let successCount = 0;
            let failedCount = 0;
            const addedNames = [];

            for (const id of targetIDs) {
                try {
                    await api.changeAdminStatus(threadID, id, true);
                    const name = (await Users.getNameUser(id));
                    addedNames.push(name);
                    successCount++;
                } catch (e) {
                    failedCount++;
                    console.error(`Lỗi khi thêm QTV ${id}:`, e);
                }
            }

            if (successCount > 0) {
                api.sendMessage(`☑️ Đã thêm ${successCount} người dùng vào làm quản trị viên nhóm: ${addedNames.join(", ")}`, threadID, messageID);
            }
            if (failedCount > 0) {
                api.sendMessage(`⚠️ Không thể thêm ${failedCount} người dùng vào làm quản trị viên nhóm (có thể họ đã là QTV hoặc có lỗi xảy ra).`, threadID, messageID);
            }
            break;
        }
        case "rm":
        case "remove": {
            if (!botIsAdmin) {
                return api.sendMessage("⚠️ Bot hiện không phải là quản trị viên của nhóm. Vui lòng cấp quyền quản trị viên cho bot để gỡ quản trị viên.", threadID, messageID);
            }

            let successCount = 0;
            let failedCount = 0;
            const removedNames = [];

            for (const id of targetIDs) {
                try {
                    await api.changeAdminStatus(threadID, id, false);
                    const name = (await Users.getNameUser(id));
                    removedNames.push(name);
                    successCount++;
                } catch (e) {
                    failedCount++;
                    console.error(`Lỗi khi gỡ QTV ${id}:`, e);
                }
            }

            if (successCount > 0) {
                api.sendMessage(`☑️ Đã gỡ quyền quản trị viên của ${successCount} người dùng: ${removedNames.join(", ")}`, threadID, messageID);
            }
            if (failedCount > 0) {
                api.sendMessage(`⚠️ Không thể gỡ quyền quản trị viên của ${failedCount} người dùng (có thể họ không phải QTV hoặc có lỗi xảy ra).`, threadID, messageID);
            }
            break;
        }
        default:
            // Hướng dẫn sử dụng nếu cú pháp không đúng (ví dụ: setqtv abc)
            return api.sendMessage("⚠️ Sai cú pháp. Vui lòng dùng:\n- `setqtv add [tag/reply]` để thêm QTV\n- `setqtv rm [tag/reply]` để xóa QTV", threadID, messageID);
    }
};