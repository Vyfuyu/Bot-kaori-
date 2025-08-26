const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs-extra");
const path = require("path");

module.exports.config = {
 name: "xnxx",
 version: "1.0.0",
 hasPermssion: 2,
 credits: "Dgk fix nvh",
 description: "Tìm và tải video học tập (xnxx)",
 commandCategory: "NSFW",
 usages: "[từ khóa hoặc link xnxx]",
 cooldowns: 5
};

module.exports.handleReply = async function({ api, event, handleReply }) {
 const { threadID, messageID, senderID, body } = event;
 if (senderID !== handleReply.author) return;
 
 const input = parseInt(body.trim());
 if (isNaN(input) || input < 1 || input > handleReply.videos.length) {
 return api.sendMessage(`⚠️ Vui lòng nhập số từ 1 đến ${handleReply.videos.length}`, threadID, messageID);
 }
 
 const video = handleReply.videos[input - 1];
 api.unsendMessage(handleReply.messageID);
 
 try {
 await downloadVideo(video.url, api, threadID);
 } catch (error) {
 api.sendMessage(`❌ Lỗi tải video: ${error.message}`, threadID, messageID);
 }
};

module.exports.run = async function({ api, event, args }) {
 const { threadID, messageID, senderID } = event;

 try {
 const threadInfo = await api.getThreadInfo(threadID);
 const adminIDs = threadInfo.adminIDs.map(admin => admin.id);
 if (!adminIDs.includes(senderID) && !global.config.ADMINBOT.includes(senderID)) {
 return api.sendMessage("⚠️ Chỉ quản trị viên nhóm mới có thể sử dụng lệnh này!", threadID, messageID);
 }
 } catch (e) {}

 if (!args[0]) {
 return api.sendMessage(`⚠️ Nhập từ khóa hoặc dán link video xnxx!`, threadID, messageID);
 }

 const input = args.join(" ");
 if (input.startsWith("http") && input.includes("xnxx.com")) {
 try {
 await downloadVideo(input, api, threadID);
 } catch (error) {
 api.sendMessage(`❌ Không tải được video: ${error.message}`, threadID, messageID);
 }
 return;
 }

 try {
 const videos = await searchVideos(input);
 if (!videos || videos.length === 0) {
 return api.sendMessage(`❌ Không tìm thấy kết quả cho "${input}"!`, threadID, messageID);
 }

 let msg = `🔍 Kết quả cho "${input}":\n\n`;
 videos.forEach((video, index) => {
 msg += `${index + 1}. ${video.title}\n`;
 if (video.duration) msg += `⏱️ ${video.duration}`;
 if (video.quality) msg += ` | 📺 ${video.quality}`;
 if (video.views) msg += ` | 👁️ ${video.views}`;
 if (video.uploader) msg += `\n👤 ${video.uploader}`;
 msg += `\n\n`;
 });
 msg += `👉 Reply số thứ tự để tải video.`;

 api.sendMessage(msg, threadID, (err, info) => {
 if (err) return;
 global.client.handleReply.push({
 name: this.config.name,
 author: senderID,
 messageID: info.messageID,
 videos: videos,
 type: "search"
 });
 }, messageID);
 } catch (error) {
 api.sendMessage(`❌ Lỗi tìm kiếm: ${error.message}`, threadID, messageID);
 }
};

async function searchVideos(query) {
 const searchQuery = query.includes("viet") ? query : `${query} vietnam`;
 const url = `https://www.xnxx.com/search/${encodeURIComponent(searchQuery)}`;

 const response = await axios.get(url, {
 headers: {
 'User-Agent': 'Mozilla/5.0',
 'Accept-Language': 'vi-VN,vi;q=0.9'
 }
 });

 return parseVideos(response.data);
}

function parseVideos(html) {
 const $ = cheerio.load(html);
 const results = [];

 $('.mozaique .thumb-block').each((i, el) => {
 if (i >= 10) return;
 const element = $(el);
 const titleEl = element.find('.thumb-under a');
 const title = titleEl.attr('title') || titleEl.text().trim();
 const href = titleEl.attr('href');
 const url = href ? `https://www.xnxx.com${href}` : null;
 if (!url) return;

 const metadata = element.find('.metadata').text().trim();
 const duration = metadata.match(/[0-9]+min[0-9]*sec?|[0-9]+min|[0-9]+sec/)?.[0] || "";
 const quality = metadata.match(/[0-9]+p/i)?.[0] || "";
 const views = element.find('.views').text().trim();
 const uploader = element.find('.uploader').text().trim();

 results.push({ title, url, duration, quality, views, uploader });
 });

 return results;
}

async function downloadVideo(pageUrl, api, threadID) {
 const res = await axios.get(pageUrl, {
 headers: {
 'User-Agent': 'Mozilla/5.0'
 }
 });

 const $ = cheerio.load(res.data);
 const script = $('script').filter((i, el) => $(el).html().includes('html5player.setVideoUrlHigh')).html();
 if (!script) throw new Error("Không tìm thấy link video");

 const match = script.match(/html5player\.setVideoUrlHigh\('(.+?)'\)/);
 const videoUrl = match ? match[1] : null;
 if (!videoUrl) throw new Error("Không thể lấy link tải");

 const fileName = path.basename(videoUrl.split('?')[0]);
 const filePath = path.join(__dirname, "cache", fileName);
 const writer = fs.createWriteStream(filePath);

 const videoRes = await axios({
 method: "GET",
 url: videoUrl,
 responseType: "stream"
 });

 videoRes.data.pipe(writer);

 await new Promise((resolve, reject) => {
 writer.on("finish", resolve);
 writer.on("error", reject);
 });

 await api.sendMessage({
 body: `📥 Tải thành công:\n🔗 ${pageUrl}`,
 attachment: fs.createReadStream(filePath)
 }, threadID, () => fs.unlinkSync(filePath));
}