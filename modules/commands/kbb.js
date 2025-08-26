const cooldownTime = 60000; // 1 phút
const minBet = 10000;     // Mức cược tối thiểu: 10.000 VNĐ
const maxBet = 100000;    // Mức cược tối đa: 100.000 VNĐ

const cooldowns = new Map();

// Ánh xạ lựa chọn với emoji tương ứng
const choicesEmoji = {
    "kéo": "✌️", // Kéo
    "búa": "✊", // Búa
    "bao": "✋"  // Bao
};

module.exports.config = {
    name: "kbb",
    version: "1.0.0",
    hasPermssion: 0,
    credits: "hehe",
    description: "Chơi game Kéo Búa Bao có cược xu",
    commandCategory: "Game",
    usages: "[kéo/búa/bao] [số tiền/all]",
    cooldowns: 5
};

module.exports.run = async function ({ api, event, args, Currencies }) {
    const { threadID, messageID, senderID } = event;
    const playerChoice = args[0]?.toLowerCase();

    // Kiểm tra lựa chọn của người chơi
    if (!["kéo", "búa", "bao"].includes(playerChoice)) {
        return api.sendMessage(
            "⚠️ Cú pháp sai!\nDùng: keobuabao [kéo/búa/bao] [số tiền cược]\nVí dụ: keobuabao búa 50000\nHoặc: keobuabao kéo all",
            threadID,
            messageID
        );
    }

    const moneyData = await Currencies.getData(senderID);
    const userMoney = moneyData.money;

    let betAmount;
    if (args[1]?.toLowerCase() === "all") {
        // Nếu người chơi cược 'all', số tiền cược sẽ là số tiền user có nhưng không quá maxBet
        betAmount = Math.min(userMoney, maxBet); 
        
        if (betAmount < minBet) {
            return api.sendMessage(`⚠️ Bạn cần ít nhất ${minBet} xu để cược (hoặc số tiền của bạn quá ít để cược 'all').`, threadID, messageID);
        }
    } else {
        betAmount = parseInt(args[1]);
        if (isNaN(betAmount) || betAmount <= 0) {
            return api.sendMessage(
                "⚠️ Số tiền cược không hợp lệ.\nDùng: keobuabao [kéo/búa/bao] [số tiền cược]\nVí dụ: keobuabao búa 50000",
                threadID,
                messageID
            );
        }
        if (betAmount < minBet) {
            return api.sendMessage(`⚠️ Mức cược tối thiểu là ${minBet} xu.`, threadID, messageID);
        }
        if (betAmount > maxBet) {
            return api.sendMessage(`⚠️ Mức cược tối đa là ${maxBet} xu.`, threadID, messageID);
        }
        if (userMoney < betAmount) {
            return api.sendMessage(`💸 Bạn không đủ tiền. Hiện có: ${userMoney} xu.`, threadID, messageID);
        }
    }

    // Kiểm tra cooldown
    const now = Date.now();
    const lastPlayed = cooldowns.get(senderID) || 0;
    if (now - lastPlayed < cooldownTime) {
        const remainingSeconds = Math.ceil((cooldownTime - (now - lastPlayed)) / 1000);
        return api.sendMessage(`🕒 Bạn cần đợi ${remainingSeconds} giây nữa mới được chơi tiếp.`, threadID, messageID);
    }

    // Lựa chọn ngẫu nhiên của bot
    const botChoices = ["kéo", "búa", "bao"];
    const botChoice = botChoices[Math.floor(Math.random() * botChoices.length)];

    // Lấy emoji tương ứng
    const playerEmoji = choicesEmoji[playerChoice];
    const botEmoji = choicesEmoji[botChoice];

    let resultMsg = `Bạn chọn: ${playerEmoji} **${playerChoice.toUpperCase()}**\nBot chọn: ${botEmoji} **${botChoice.toUpperCase()}**\n\n`;

    if (playerChoice === botChoice) {
        resultMsg += "🤝 HÒA! Bạn không mất tiền và không nhận thêm tiền.";
    } else if (
        (playerChoice === "kéo" && botChoice === "bao") ||
        (playerChoice === "búa" && botChoice === "kéo") ||
        (playerChoice === "bao" && botChoice === "búa")
    ) {
        await Currencies.increaseMoney(senderID, betAmount);
        resultMsg += `🎉 CHÚC MỪNG! Bạn THẮNG và nhận được +${betAmount} xu!`;
    } else {
        await Currencies.decreaseMoney(senderID, betAmount);
        resultMsg += `💔 TIẾC QUÁ! Bạn THUA và bị trừ -${betAmount} xu.`;
    }

    cooldowns.set(senderID, now);

    return api.sendMessage(resultMsg, threadID, messageID);
};