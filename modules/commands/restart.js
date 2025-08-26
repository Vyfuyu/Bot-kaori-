module.exports.config = {
	name: "khoidong",
	version: "1.0.0",
	hasPermssion: 3,
	credits: "Mirai Team",
	description: "Khởi Động Lại Bot.",
	commandCategory: "Admin",
	usePrefix: false,
	cooldowns: 0
        };
module.exports.run = ({event, api}) =>api.sendMessage("LAG QUÁ CHỜ NHI ĐI KHỞI ĐỘNG LẠI MÁY NHA MỌI NGƯỜI",event.threadID, () =>process.exit(1))
