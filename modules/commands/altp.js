module.exports.config = {
    name: "altp",
    version: "4.0.2", // Cập nhật version để đánh dấu các thay đổi mới nhất
    hasPermssion: 0,
    credits: "Niio-team (Vtuan) - Enhanced by D-Jukie & ChatGPT", // Thêm credits
    description: "Game Ai Là Triệu Phú với trợ giúp cân bằng và không lặp câu hỏi.",
    commandCategory: "Game",
    usages: "altp",
    cooldowns: 0,
};

const fs = require("fs");
const path = require("path");

// Bảng tiền thưởng 15 câu
const PRIZE_MONEY = [
    10000, 20000, 30000, 50000, 100000,
    200000, 360000, 600000, 800000, 1500000,
    2500000, 3500000, 5000000, 8000000, 12000000
];

// Hàm hiển thị câu hỏi
function showQuestion(question, questionNum, totalMoney, helps, api, event, handleReply) {
    const currentPrize = PRIZE_MONEY[questionNum - 1].toLocaleString();
    const safeHaven = questionNum >= 5 ? PRIZE_MONEY[4].toLocaleString() : "0";

    let helpText = "TRỢ GIÚP (chọn số):\n";
    if (!helps.used1) helpText += "1. 50/50\n";
    if (!helps.used2) helpText += "2. Trường quay\n";
    if (!helps.used3) helpText += "3. Khán giả\n";
    if (!helps.used4) helpText += "4. Gọi người nhà\n";

    const message = `
🎯 CÂU ${questionNum} - ${currentPrize} VND
${question.cauhoi}

A: ${question.A}
B: ${question.B}
C: ${question.C}
D: ${question.D}

${helpText}
⏳ Mốc an toàn: ${safeHaven} VND
    `;

    api.sendMessage(message, event.threadID, (err, info) => {
        global.client.handleReply.push({
            ...handleReply,
            messageID: info.messageID,
            step: "answering"
        });
    });
}

module.exports.run = async function ({ api, event }) {
    const message = `
─────────────────────────
[ 🏆 ] AI LÀ TRIỆU PHÚ [ 🏆 ]
─────────────────────────

[ 📚 ] Luật chơi:
- 15 câu hỏi, tiền thưởng tăng dần
- 4 trợ giúp (mỗi loại dùng 1 lần)

[ 💰 ] CƠ CẤU TIỀN THƯỞNG VÀ MỐC AN TOÀN:

• Mốc Câu Hỏi: Câu 1-4
- Tiền Thưởng: 10,000 - 50,000 VND
- Mốc An Toàn: 0 VND
- Nếu Sai Sẽ Nhận: 0 VND

• Mốc Câu Hỏi: Câu 5
- Tiền Thưởng: 100,000 VND
- Mốc An Toàn: 100,000 VND
- Nếu Sai Sẽ Nhận: 100,000 VND

• Mốc Câu Hỏi: Câu 6-15
- Tiền Thưởng: 200,000 - 12,000,000 VND
- Mốc An Toàn: 100,000 VND
- Nếu Sai Sẽ Nhận: 100,000 VND

- (Mốc An Toàn là số tiền tối thiểu bạn nhận khi vượt mốc đó, kể cả khi sai ở câu tiếp theo.)

─────────────────────────

[ 🎮 ] Chọn:
- 1. Bắt đầu chơi
- (Gõ "dừng" để giữ tiền) `;

    api.sendMessage(message, event.threadID, (error, info) => {
        global.client.handleReply.push({
            name: this.config.name,
            messageID: info.messageID,
            author: event.senderID,
            step: "choosing",
            questionNum: 0,
            totalMoney: 0,
            helps: {
                used1: false,
                used2: false,
                used3: false,
                used4: false
            },
            askedQuestions: [] // Mảng để lưu các khóa câu hỏi đã hỏi
        });
    });
}

module.exports.handleReply = async function ({ handleReply, event, api, Currencies }) {
    const { body, threadID, messageID, senderID } = event;
    const { step, question, questionNum, totalMoney, helps, askedQuestions } = handleReply;

    // Kiểm tra người chơi
    if (senderID !== handleReply.author) {
        return api.sendMessage("⛔ Không phải lượt của bạn!", threadID);
    }

    api.unsendMessage(handleReply.messageID);

    // Helper function để tạo khóa duy nhất cho một câu hỏi (không cần ID trong JSON)
    const generateQuestionKey = (q) => {
        // Kết hợp câu hỏi và đáp án đúng để tạo một khóa duy nhất.
        // Đây là cách nhận diện câu hỏi mà không cần chỉnh sửa file JSON.
        return `${q.cauhoi.trim()}|||${q.dapan.trim()}`;
    };

    // Lấy câu hỏi ngẫu nhiên (đã được sửa đổi để không lặp)
    const getQuestion = (difficulty, currentAskedQuestions) => {
        const file = path.join(__dirname, "Game", "altp.json");
        let data;
        try {
            data = JSON.parse(fs.readFileSync(file, "utf8"));
        } catch (e) {
            console.error(`[ALTP] Lỗi đọc hoặc parse file altp.json: ${e.message}`);
            api.sendMessage("Đã xảy ra lỗi khi đọc dữ liệu câu hỏi. Vui lòng kiểm tra file altp.json hoặc liên hệ admin.", threadID);
            return null;
        }

        const allQuestionsForDifficulty = data[difficulty] || [];

        // Lọc ra các câu hỏi CHƯA được hỏi bằng cách so sánh key
        const availableQuestions = allQuestionsForDifficulty.filter(q => {
            const qKey = generateQuestionKey(q);
            return !currentAskedQuestions.includes(qKey);
        });

        if (availableQuestions.length === 0) {
            console.warn(`[ALTP] Hết câu hỏi cho độ khó: ${difficulty} hoặc tất cả đã được hỏi.`);
            return null; // Không còn câu hỏi nào để hỏi
        }

        const selectedQuestion = availableQuestions[Math.floor(Math.random() * availableQuestions.length)];
        return selectedQuestion;
    };

    // Xử lý lệnh dừng
    if (body.toLowerCase().includes("dừng")) {
        const finalPrize = questionNum >= 5 ? PRIZE_MONEY[4] : 0;
        // Lấy số tiền của câu hỏi vừa hoàn thành (nếu có) hoặc 0 nếu chưa hoàn thành câu nào
        const wonAmount = (questionNum > 0 && questionNum <= PRIZE_MONEY.length) ? PRIZE_MONEY[questionNum - 1] : 0;
        const actualWon = Math.max(wonAmount, finalPrize); // Nhận tiền của câu đang đứng, hoặc mốc an toàn

        if (actualWon > 0) await Currencies.increaseMoney(senderID, actualWon);
        return api.sendMessage(
            `🎉 Bạn dừng cuộc chơi tại câu ${questionNum} và nhận ${actualWon.toLocaleString()} VND!`,
            threadID
        );
    }

    // Chọn chế độ
    if (step === "choosing" && body === "1") {
        const firstQuestion = getQuestion("de", askedQuestions); // Truyền mảng các khóa câu hỏi đã hỏi
        if (!firstQuestion) {
            return api.sendMessage("Xin lỗi, không thể bắt đầu game. Không có câu hỏi nào sẵn sàng.", threadID);
        }

        // LƯU KHÓA CỦA CÂU HỎI ĐÃ HỎI VÀO MẢNG
        askedQuestions.push(generateQuestionKey(firstQuestion));

        showQuestion(firstQuestion, 1, 0, helps, api, event, {
            ...handleReply,
            question: firstQuestion,
            step: "answering",
            questionNum: 1,
            askedQuestions: askedQuestions // CẬP NHẬT TRẠNG THÁI askedQuestions
        });
        return;
    }

    // Xử lý trợ giúp (1-4)
    if (step === "answering" && /^[1-4]$/.test(body)) {
        const helpNum = parseInt(body);
        const helpKey = `used${helpNum}`;

        if (helps[helpKey]) {
            return api.sendMessage("⚠️ Bạn đã dùng trợ giúp này rồi!", threadID);
        }

        helps[helpKey] = true;
        let result = "";

        switch(helpNum) {
            case 1: // 50/50 (100% chính xác)
                const correct = question.dapan.toUpperCase();
                const wrong = ['A','B','C','D'].filter(a => a !== correct);
                const removed = wrong.sort(() => 0.5 - Math.random()).slice(0, 2);
                result = `50/50: Loại ${removed.join(", ")}\nCòn lại: ${correct} và ${['A','B','C','D'].find(a => a !== correct && !removed.includes(a))}`;
                break;

            case 2: // TRƯỜNG QUAY (ĐÃ SỬA ĐỔI ĐỂ HIỆN 2 ĐÁP ÁN VÀ %)
                const allOptions = ['A', 'B', 'C', 'D'];
                const correctAnsStudio = question.dapan.toUpperCase();
                const isStudioCorrect = Math.random() < 0.7; // 70% khả năng gợi ý chính là đáp án đúng

                let studioSuggestions = [];
                let mainAnswerPercent;
                let otherAnswerPercent;
                let otherAnswer;

                if (isStudioCorrect) {
                    // Gợi ý chính là đáp án đúng
                    mainAnswerPercent = Math.floor(Math.random() * 21) + 60; // Đáp án đúng chiếm 60-80%
                    otherAnswerPercent = 100 - mainAnswerPercent;

                    // Chọn một đáp án sai ngẫu nhiên làm gợi ý phụ
                    const incorrectOptions = allOptions.filter(o => o !== correctAnsStudio);
                    otherAnswer = incorrectOptions[Math.floor(Math.random() * incorrectOptions.length)];

                    studioSuggestions.push({ ans: correctAnsStudio, percent: mainAnswerPercent });
                    studioSuggestions.push({ ans: otherAnswer, percent: otherAnswerPercent });

                } else {
                    // Gợi ý chính là một đáp án sai
                    const incorrectOptions = allOptions.filter(o => o !== correctAnsStudio);
                    const mainIncorrectAns = incorrectOptions[Math.floor(Math.random() * incorrectOptions.length)];

                    mainAnswerPercent = Math.floor(Math.random() * 21) + 50; // Đáp án sai chính chiếm 50-70%
                    otherAnswerPercent = 100 - mainAnswerPercent;

                    // Đáp án còn lại là đáp án đúng
                    otherAnswer = correctAnsStudio;

                    studioSuggestions.push({ ans: mainIncorrectAns, percent: mainAnswerPercent });
                    studioSuggestions.push({ ans: otherAnswer, percent: otherAnswerPercent });
                }

                // Sắp xếp gợi ý theo phần trăm giảm dần để dễ đọc
                studioSuggestions.sort((a, b) => b.percent - a.percent);

                result = `🎤 Trường quay:\n` + studioSuggestions.map(s => `${s.ans}: ${s.percent}%`).join('\n');
                break;

            case 3: // Khán giả (70% đúng) - Giữ nguyên như cũ
                const correctPercent = Math.floor(Math.random() * 31) + 40; // 40-70%
                const remainingPercent = 100 - correctPercent;
                let otherAnswers = ['A','B','C','D'].filter(a => a !== question.dapan.toUpperCase());
                let distribution = [0, 0, 0];
                let currentSum = 0;

                for (let i = 0; i < 2; i++) {
                    distribution[i] = Math.floor(Math.random() * (remainingPercent - currentSum) / (3 - i));
                    currentSum += distribution[i];
                }
                distribution[2] = remainingPercent - currentSum;
                distribution.sort(() => 0.5 - Math.random()); // Xáo trộn để không theo thứ tự A,B,C,D cố định

                result = "📊 Khán giả bình chọn:\n" +
                    `${question.dapan.toUpperCase()}: ${correctPercent}%\n` +
                    `${otherAnswers[0]}: ${distribution[0]}%\n` +
                    `${otherAnswers[1]}: ${distribution[1]}%\n` +
                    `${otherAnswers[2]}: ${distribution[2]}%`;
                break;

            case 4: // Người nhà (70% đúng) - Giữ nguyên như cũ
                const isRight = Math.random() < 0.7;
                const answer = isRight
                    ? question.dapan.toUpperCase()
                    : ['A','B','C','D'].filter(a => a !== question.dapan.toUpperCase())[Math.floor(Math.random() * 3)];
                result = `📞 Người nhà: "${isRight ? 'Chắc chắn' : 'Nghiêng về'} ${answer}"`;
                break;
        }

        await api.sendMessage(result, threadID);
        showQuestion(question, questionNum, totalMoney, helps, api, event, handleReply);
        return;
    }

    // Xử lý trả lời
    if (step === "answering" && /^[a-dA-D]$/.test(body)) {
        const userAnswer = body.toUpperCase();
        const correctAnswer = question.dapan.toUpperCase();

        if (userAnswer === correctAnswer) {
            const newTotal = PRIZE_MONEY[questionNum - 1];

            if (questionNum === 15) {
                await Currencies.increaseMoney(senderID, newTotal);
                return api.sendMessage(
                    `🏆 CHÚC MỪNG! Bạn đã chiến thắng với 12,000,000 VND!\n` +
                    `Đáp án: ${correctAnswer}\nGiải thích: ${question.giaithich}`,
                    threadID
                );
            }

            const nextQuestion = getQuestion(
                questionNum < 5 ? "de" :
                questionNum < 10 ? "binhthuong" :
                questionNum < 13 ? "kho" : "sieukho",
                askedQuestions
            );

            if (!nextQuestion) {
                await Currencies.increaseMoney(senderID, newTotal);
                return api.sendMessage(
                    `🏆 CHÚC MỪNG! Bạn đã trả lời đúng ${questionNum} câu và không còn câu hỏi nào để tiếp tục. Bạn nhận được ${newTotal.toLocaleString()} VND!`,
                    threadID
                );
            }

            askedQuestions.push(generateQuestionKey(nextQuestion)); // Lưu khóa của câu hỏi tiếp theo

            await api.sendMessage(
                `✅ ĐÚNG! (+${newTotal.toLocaleString()} VND)\nGiải thích: ${question.giaithich}`,
                threadID
            );

            showQuestion(nextQuestion, questionNum + 1, newTotal, helps, api, event, {
                ...handleReply,
                question: nextQuestion,
                questionNum: questionNum + 1,
                totalMoney: newTotal,
                askedQuestions: askedQuestions // Cập nhật trạng thái
            });
        } else {
            const finalPrize = questionNum >= 5 ? PRIZE_MONEY[4] : 0;
            await api.sendMessage(
                `❌ SAI! Đáp án: ${correctAnswer}\nGiải thích: ${question.giaithich}\n` +
                `Bạn nhận được ${finalPrize.toLocaleString()} VND!`,
                threadID
            );
            if (finalPrize > 0) await Currencies.increaseMoney(senderID, finalPrize);
        }
    }
};