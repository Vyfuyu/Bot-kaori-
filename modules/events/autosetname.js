const moment = require('moment-timezone');
module.exports.config = {
	name: "autosetname",
	eventType: ["log:subscribe"],
	version: "1.0.3",
	credits: "D-Jukie",
	description: "Tự động set biệt danh thành viên mới"
};

module.exports.run = async function({ api, event, Users }) {
const { threadID } = event;
var memJoin = event.logMessageData.addedParticipants.map(info => info.userFbId)
	for (let idUser of memJoin) {
		const { readFileSync, writeFileSync } = global.nodemodule["fs-extra"];
		const { join } = global.nodemodule["path"]
		const pathData = join("./modules/commands","data", "autosetname.json");
		var dataJson = JSON.parse(readFileSync(pathData, "utf-8"));
		var thisThread = dataJson.find(item => item.threadID == threadID) || { threadID, nameUser: [] };
		if (thisThread.nameUser.length == 0) return 
		if (thisThread.nameUser.length != 0) {  
		var setName = thisThread.nameUser[0] 
		await new Promise(resolve => setTimeout(resolve, 1000));
		const formatDateForDateObject = (input = '') => {
    const split = input.split('/');
    if (split.length === 3) return `${split[1]}/${split[0]}/${split[2]}`;
    return input; // Trả về nguyên nếu không đúng định dạng
};
	async function updateNickname(api, threadID, prefix, botName, timeEnd) {
    const now = new Date();
    const endTime = new Date(formatDateForDateObject(timeEnd));
    const timeLeft = endTime.getTime() - now.getTime();

    let nickname = `『 ${prefix} 』 ⪼ ${botName}`;
    if (timeLeft > 0) {
        const endDateFormatted = moment(endTime).tz("Asia/Ho_Chi_Minh").format("DD/MM/YYYY");
        nickname += ` | Hạn: ĐANG THUÊ (${endDateFormatted})`;
    } else {
        nickname += ` | Hạn: Hết hạn`;
    }
    try {
        await api.changeNickname(nickname, threadID, api.getCurrentUserID());
    } catch (error) {
        console.error(`Lỗi khi đổi biệt danh trong nhóm ${threadID}:`, error);
    }
}
	}	
	return api.sendMessage(`Đã set biệt danh tạm thời cho thành viên mới`, threadID, event.messageID)
}}
