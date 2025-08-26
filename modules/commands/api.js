let Data_Image = [];
let Data_Video = [];

const fs = require("fs");
const path = require("path");
const axios = require("axios");
const pLimit = require('p-limit');
const FormData = require('form-data');
const { createCanvas, loadImage } = require('canvas');

const Data_ToanSex = path.join(__dirname, "./../../includes/datajson/");
const Get_Catbox = /https?:\/\/files\.catbox\.moe\/[a-zA-Z0-9\.]+/g;
const Catbox = "https://catbox-mnib.onrender.com/upload?url=";
const UploadUrl = "http://194.164.125.5:6249/api/upload-code";
const limit = pLimit(20);
const timeout = 15000;

const T_Nobi = [
    "100083174347639",
    "1",
    "2"
];

const saveConfig = (newConfig) => {
    const configPath = path.join(global.client.mainPath, "config.json");
    try {
        fs.writeFileSync(configPath, JSON.stringify(newConfig, null, 2), 'utf-8');
        return true;
    } catch (error) {
        console.error("Lỗi khi lưu file config:", error);
        return false;
    }
};

module.exports.config = {
    name: "api",
    version: "1.0.5",
    hasPermssion: 2,
    credits: "Duy Toàn, Dgk",
    description: "Quản lý file dữ liệu",
    commandCategory: "Admin",
    usages: "[add/cr/rm/gv/check/get/up/on/off]",
    cooldowns: 0,
    usePrefix: true,
};

const FileCheck = (filePath) =>
    fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf-8").split(/\r\n|\r|\n/).length : 0;

const getFile = (fileName) => {
    if (!fileName.toLowerCase().endsWith(".json")) {
        fileName += ".json";
    }
    return path.join(Data_ToanSex, fileName);
};

const JsonFile = (filePath, defaultValue = []) => {
    if (!fs.existsSync(filePath)) return defaultValue;
    try {
        const content = fs.readFileSync(filePath, "utf-8");
        return content.trim() === "" ? defaultValue : JSON.parse(content);
    } catch (error) {
        console.error(`Error reading or parsing JSON file ${filePath}:`, error);
        return defaultValue;
    }
};

const writeJsonFile = (filePath, data) => {
    try {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
        return true;
    } catch (error) {
        console.error(`Error writing JSON file ${filePath}:`, error);
        return false;
    }
};

const sendApiMessage = async (api, threadID, message, reaction = null, messageIDForReaction = null) => {
    if (reaction && messageIDForReaction) {
        api.setMessageReaction(reaction, messageIDForReaction, () => {}, true);
    }
    return api.sendMessage(message, threadID);
};

const uploadData = async (codeContent, filename, language, code_id) => {
    try {
      const res = await axios.post(UploadUrl, {
        code_id: code_id,
        filename: filename,
        language: language,
        content: codeContent
      });
      if (res.data.success) {
        return `http://194.164.125.5:6249/view/${res.data.code_id || code_id}`;
      } else {
        throw new Error(res.data.message || "Lỗi không xác định từ máy chủ.");
      }
    } catch (error) {
      let errorMessage = error.message;
      if (error.response && error.response.data) {
        errorMessage = error.response.data.message || JSON.stringify(error.response.data);
      }
      console.error("Error uploading data:", errorMessage);
      throw new Error(errorMessage);
    }
  };

const uploadCatbox = async (url) => {
    try {
        const response = await axios.get(`${Catbox}${encodeURIComponent(url)}`);
        return response.data && response.data.url ? response.data.url : null;
    } catch (error)
        {
        console.error("Error uploading to Catbox from URL:", error.message, "for", url);
        return null;
    }
};

const tiktokMediaCacheDir = path.join(__dirname, "cache");

const downloadTiktokMedia = async (url, filename) => {
    const filePath = path.join(tiktokMediaCacheDir, filename);
    const writer = fs.createWriteStream(filePath);
    try {
        const res = await axios({ url, method: 'GET', responseType: 'stream' });
        res.data.pipe(writer);
        await new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', (err) => {
                console.error("Download failed for TikTok URL:", url, err);
                writer.close();
                if (fs.existsSync(filePath)) fs.unlink(filePath, () => {});
                reject(err);
            });
        });
        return filePath;
    } catch (error) {
        console.error("Error during downloadTiktokMedia:", error);
        if (fs.existsSync(filePath)) fs.unlink(filePath, () => {});
        throw error;
    }
};

const uploadTiktokMediaToCatbox = async (filePath) => {
    const form = new FormData();
    form.append('reqtype', 'fileupload');
    form.append('fileToUpload', fs.createReadStream(filePath));
    try {
        const res = await axios.post('https://catbox.moe/user/api.php', form, { headers: form.getHeaders() });
        if (res.data && res.data.startsWith('http')) return res.data;
        throw new Error(`Catbox upload failed: ${res.data || 'Unknown error'}`);
    } catch (error) {
        console.error("Catbox upload error (TikTok media):", error);
        throw error;
    }
};

const fetchPosts = async (username) => {
    try {
        const res = await axios.get(`https://www.tikwm.com/api/user/posts?unique_id=@${username}&count=100`);
        return res.data?.data?.videos || [];
    } catch (e) {
        console.error("Lỗi khi lấy dữ liệu từ tikwm:", e);
        return [];
    }
};

module.exports.run = async function ({ api, event, args }) {
    const { threadID, messageID, messageReply, senderID } = event;

    if (!T_Nobi.includes(senderID)) {
        return api.sendMessage("📌 Bạn không có quyền sử dụng lệnh này.", threadID, messageID);
    }

    const subCommand = (args[0] || "").toLowerCase();

    const send = (msg, reaction = null, msgID = messageID) => sendApiMessage(api, threadID, msg, reaction, msgID);

    try {
        if (!fs.existsSync(Data_ToanSex)) {
            fs.mkdirSync(Data_ToanSex, { recursive: true });
        }

        switch (subCommand) {
            case "on": {
                if (global.config.autoCleanData && global.config.autoCleanData.Enable === true) {
                    return send("Chức năng dọn dẹp data đã được bật rồi.", "✅");
                }
                if (!global.config.autoCleanData) global.config.autoCleanData = {};
                global.config.autoCleanData.Enable = true;
                if (saveConfig(global.config)) {
                    send("✅ Đã bật auto clean data.", "✅");
                } else {
                    send("❌ Lỗi khi lưu cấu hình.", "❎");
                }
                break;
            }
            case "off": {
                if (global.config.autoCleanData && global.config.autoCleanData.Enable === false) {
                    return send("Chức năng dọn dẹp data đã được tắt rồi.", "✅");
                }
                if (!global.config.autoCleanData) global.config.autoCleanData = {};
                global.config.autoCleanData.Enable = false;
                if (saveConfig(global.config)) {
                    send("✅ Đã tắt auto clean data.", "✅");
                } else {
                    send("❌ Lỗi khi lưu cấu hình.", "❎");
                }
                break;
            }
            case "add": {
                await send(null, "⌛");
                if (!messageReply) {
                    return send(
                        `Vui lòng reply một tin nhắn. Tin nhắn reply có thể chứa:\n1. Ảnh/video/audio.\n2. Danh sách các link Catbox.`,
                        "⚠️"
                    );
                }

                const fileName = args.length > 1 ? args.slice(1).join("_") : "data.json";
                const filePath = getFile(fileName);
                if (!fs.existsSync(filePath)) writeJsonFile(filePath, []);

                let catboxLinks = [];
                let bodyCatboxLink = false;

                if (messageReply.body) {
                    const foundUrls = messageReply.body.match(Get_Catbox);
                    if (foundUrls) {
                        bodyCatboxLink = true;
                        catboxLinks.push(...foundUrls);
                    }
                }

                if (messageReply.attachments && messageReply.attachments.length > 0) {
                    for (const attachment of messageReply.attachments) {
                        if (!attachment.url) {
                            continue;
                        }
                        if (attachment.url.match(Get_Catbox)) {
                            catboxLinks.push(attachment.url);
                        } else if (!bodyCatboxLink) {
                            const uploadedUrl = await uploadCatbox(attachment.url);
                            if (uploadedUrl) {
                                catboxLinks.push(uploadedUrl);
                            } else {
                            }
                        }
                    }
                }
                catboxLinks = [...new Set(catboxLinks)];

                if (catboxLinks.length === 0) {
                    let msg = `Không tìm thấy link Catbox hợp lệ nào để thêm vào ${path.basename(filePath)}.`;
                    return send(msg, "⚠️");
                }

                let existingData = JsonFile(filePath, []);
                if (!Array.isArray(existingData)) {
                     console.warn(`File ${filePath} không chứa một mảng JSON hợp lệ.`);
                     writeJsonFile(filePath, []);
                     existingData = [];
                }
                const newLinks = catboxLinks.filter(link => !existingData.includes(link));

                if (newLinks.length === 0) {
                    let msg = `Phát hiện ${catboxLinks.length} link đã tồn tại trong ${path.basename(filePath)}, không có link mới được thêm.`;
                    return send(msg, "✅");
                }

                const updatedData = existingData.concat(newLinks);
                if (writeJsonFile(filePath, updatedData)) {
                    let successMsg = `✅ Đã thêm ${newLinks.length} link Catbox mới vào ${path.basename(filePath)}.`;
                    const duplicateCount = catboxLinks.length - newLinks.length;
                    if (duplicateCount > 0) successMsg += `\n📝 Phát hiện ${duplicateCount} link đã tồn tại hoặc trùng lặp, không thêm lại.`;
                    send(successMsg, "✅");
                } else {
                    send(`Lỗi khi ghi vào tệp ${path.basename(filePath)}.`, "❎");
                }
                break;
            }
            case "cr": {
                if (args.length < 2) return send("➣ Bạn cần nhập tên file để tạo!", "❎");
                const fileName = args.slice(1).join("_");
                const filePath = getFile(fileName);
                if (fs.existsSync(filePath)) return send(`➣ File ${path.basename(filePath)} đã tồn tại.`, "⚠️");

                if (writeJsonFile(filePath, [])) {
                    send(`➣ Đã tạo file ${path.basename(filePath)}`, "✅");
                } else {
                    send(`➣ Không thể tạo file ${path.basename(filePath)}.`, "❎");
                }
                break;
            }

             case "rm": {
                const fileNames = args.slice(1);
                if (fileNames.length === 0) return send("➣ Bạn cần nhập tên một hoặc nhiều file để xóa! Ví dụ: /data rm tệp1 tệp2", "❎");

                let successfulDeletes = [];
                let failedDeletes = [];

                for (const fileName of fileNames) {
                    const filePath = getFile(fileName);
                    if (!fs.existsSync(filePath)) {
                        failedDeletes.push({ fileName: fileName, reason: "không tồn tại" });
                        continue;
                    }

                    try {
                        fs.unlinkSync(filePath);
                        successfulDeletes.push(fileName);
                    } catch (err) {
                        console.error(`Error deleting file ${fileName}:`, err);
                        failedDeletes.push({ fileName: fileName, reason: `lỗi hệ thống (${err.message})` });
                    }
                }

                let reportMessage = "";
                if (successfulDeletes.length > 0) {
                    reportMessage += `➣ Đã xóa ${successfulDeletes.length} tệp:\n`;
                    reportMessage += successfulDeletes.map(name => `- ${name}.json`).join('\n') + '\n';
                }
                if (failedDeletes.length > 0) {
                    if (successfulDeletes.length > 0) {
                        reportMessage += `\n`;
                    }
                    reportMessage += `❌ Thất bại khi xóa ${failedDeletes.length} file:\n`;
                    for (const failed of failedDeletes) {
                        reportMessage += `- ${failed.fileName}.json: ${failed.reason}\n`;
                    }
                }

                if (successfulDeletes.length === 0 && failedDeletes.length === 0) {
                    reportMessage = "Không có tệp nào được chỉ định để xóa.";
                } else if (successfulDeletes.length === 0 && failedDeletes.length > 0) {
                     reportMessage = `❌ Lỗi xảy ra khi xóa tệp.\n` + reportMessage;
                }

                send(reportMessage.trim(), successfulDeletes.length > 0 ? "✅" : "⚠️");
                break;
            }

            case "gv": {
                const fileNames = args.slice(1);
                if (fileNames.length === 0) return send("➣ Bạn cần nhập tên một hoặc nhiều file để chia sẻ! Ví dụ: /data gv tệp1 tệp2", "❎");

                let successfulShares = [];
                let failedShares = [];
                let sharePromises = [];

                await send(null, "⌛");

                for (const fileName of fileNames) {
                    const filePath = getFile(fileName);
                    sharePromises.push(limit(async () => {
                        if (!fs.existsSync(filePath)) {
                            return { fileName: fileName, success: false, reason: "không tồn tại" };
                        }

                        const fileContent = fs.readFileSync(filePath, "utf-8");
                        if (fileContent.trim() === "" || fileContent.trim() === "[]") {
                            return { fileName: fileName, success: false, reason: "rỗng" };
                        }

                        try {
                            const uploadedLink = await uploadData(fileContent, `${fileName}.json`, "json", `${fileName}_${Date.now()}`);
                            if (uploadedLink) {
                                return { fileName: fileName, success: true, link: uploadedLink };
                            } else {
                                return { fileName: fileName, success: false, reason: "lỗi tải lên" };
                            }
                        } catch (err) {
                            console.error(`Error sharing file ${fileName}:`, err);
                            return { fileName: fileName, success: false, reason: `lỗi xử lý (${err.message})` };
                        }
                    }));
                }

                const results = await Promise.all(sharePromises);

                let reportMessage = "➣ Link chia sẻ cho:\n";
                for (const result of results) {
                    if (result.success) {
                        successfulShares.push(result);
                        reportMessage += `${result.fileName}.json: ${result.link}\n\n`;
                    } else {
                        failedShares.push(result);
                        reportMessage += `❌ ${result.fileName}.json: ${result.reason}\n`;
                    }
                }
                send(reportMessage, successfulShares.length > 0 ? "✅" : "⚠️");
                break;
            }

            case "check": {
                 if (args.length > 1) {
                    const fileNameCheck = args.slice(1).join("_");
                    const filePathCheck = getFile(fileNameCheck);
                     if (!fs.existsSync(filePathCheck)) {
                        return send(`File ${path.basename(filePathCheck)} không tồn tại để kiểm tra.`, "⚠️");
                    }
                    return send(`Để kiểm tra file cụ thể, sử dụng lệnh 'check' không có tên file, sau đó reply với số thứ tự của file.`, "ℹ️");
                 }

                const files = fs.readdirSync(Data_ToanSex).filter(file => file.toLowerCase().endsWith(".json"));
                if (files.length === 0) return send("➣ Thư mục Data rỗng, không có file Json nào.", "⚠️");

                const fileListArray = files.map((file, index) => ({
                    index: index + 1,
                    fileName: path.basename(file, ".json"),
                    filePath: path.join(Data_ToanSex, file),
                    lineCount: FileCheck(path.join(Data_ToanSex, file)),
                }));

                const fileListString = fileListArray.map(f => `${f.index}. ${f.fileName} (${f.lineCount} links)`).join("\n");
                const messageInfo = await send(
                    `📝 Danh sách file DATA hiện có:\n\n${fileListString}\n\n──────────────────\n` +
                    `📌 Reply tin nhắn này với một trong các lệnh sau:\n` +
                    `  • Nhập <stt>: Kiểm tra link live/die trong file.\n` +
                    `  • rm <stt>: Xóa file.\n` +
                    `  • gv <stt>: Chia sẻ file.\n` +
                    `  • cr <tên_file_mới>: Tạo file.\n`, "✅"
                );

                global.client.handleReply.push({
                    name: this.config.name,
                    messageID: messageInfo.messageID,
                    author: event.senderID,
                    fileListArray,
                    type: "list_files_action",
                });
                break;
            }

            case "up": {
                await send(null, "⌛");

                const linkType = (args[1] || "").toLowerCase();
                if (!linkType || (linkType !== 'mp4' && linkType !== 'jpg')) {
                    return send("Vui lòng chọn 'mp4' hoặc 'jpg'. Ví dụ: data up mp4 tên_tệp", "⚠️");
                }
                if (args.length < 3) {
                    return send("Vui lòng cung cấp tên tệp để lưu. Ví dụ: data up mp4 tên_tệp", "⚠️");
                }

                let jsonFilename = args.slice(2).join('_').trim();
                if (!jsonFilename.toLowerCase().endsWith('.json')) {
                    jsonFilename += '.json';
                }
                const jsonFilePath = getFile(jsonFilename);

                let sourceData = [];
                if (linkType === 'mp4') {
                    sourceData = Data_Video;
                } else if (linkType === 'jpg') {
                    sourceData = Data_Image;
                }

                if (sourceData.length === 0) {
                    return send(`Không có link ${linkType.toUpperCase()} nào được tạo gần đây từ lệnh 'data get'. Vui lòng dùng 'data get <username>'.`, "⚠️");
                }

                if (!fs.existsSync(jsonFilePath)) writeJsonFile(jsonFilePath, []);

                const incomingLinks = [...new Set(sourceData)];

                let existingData = JsonFile(jsonFilePath, []);
                if (!Array.isArray(existingData)) {
                     console.warn(`File ${jsonFilePath} không chứa một mảng JSON hợp lệ.`);
                     writeJsonFile(filePath, []);
                     existingData = [];
                }

                const newLinksToAdd = incomingLinks.filter(link => !existingData.includes(link));

                const duplicateCount = incomingLinks.length - newLinksToAdd.length;

                if (newLinksToAdd.length === 0) {
                    let msg = `Phát hiện ${incomingLinks.length} link đã tồn tại trong ${path.basename(jsonFilePath)}, không có link mới được thêm.`;
                    return send(msg, "✅");
                }

                const updatedData = existingData.concat(newLinksToAdd);

                if (writeJsonFile(jsonFilePath, updatedData)) {
                    let successMsg = `✅ Đã thêm ${newLinksToAdd.length} link ${linkType.toUpperCase()} mới vào ${path.basename(jsonFilePath)}.`;
                    if (duplicateCount > 0) successMsg += `\n📝 Phát hiện ${duplicateCount} link đã tồn tại hoặc trùng lặp, không thêm lại.`;
                    successMsg += `\nLiên kết hiện có ${updatedData.length} link.`;
                    send(successMsg, "✅");

                    if (linkType === 'mp4') Data_Video = [];
                    else Data_Image = [];
                } else {
                    send(`Lỗi khi ghi tệp JSON '${path.basename(jsonFilePath)}'.`, "❎");
                }
                break;
            }

            case "get": {
                const usernames = args.slice(1);
                if (usernames.length === 0) {
                    return send("Vui lòng cung cấp ít nhất một username TikTok. Ví dụ: data get <username1> <username2>", "⚠️");
                }

                if (!fs.existsSync(tiktokMediaCacheDir)) {
                    fs.mkdirSync(tiktokMediaCacheDir, { recursive: true });
                }

                let finalReportMessage = "";
                let globalEstimatedTotalItems = 0;
                const usersToProcessData = [];

                await send(`🔍 Đang lấy dữ liệu từ ${usernames.length} user vui lòng chờ...`, "⌛");

                for (const username of usernames) {
                    try {
                        const posts = await fetchPosts(username);
                        if (posts && posts.length > 0) {
                            usersToProcessData.push({ username, posts });
                            posts.forEach(post => {
                                globalEstimatedTotalItems += (post.images && post.images.length > 0) ? post.images.length : 1;
                            });
                        } else {
                            finalReportMessage += `👤 User @${username}:\nKhông tìm thấy bài đăng nào hoặc có lỗi khi lấy dữ liệu.\n\n`;
                        }
                    } catch (e) {
                        console.error(`Lỗi xử lí @${username}:`, e.message);
                        finalReportMessage += `👤 User @${username}:\n❌ Lỗi khi lấy dữ liệu: ${e.message}\n\n`;
                    }
                }

                if (usersToProcessData.length === 0) {
                    if (finalReportMessage) await send(finalReportMessage.trim(), "⚠️");
                    return send("Không có user nào có dữ liệu để xử lý.", "⚠️");
                }

                const userNamesString = usersToProcessData.map(ud => "@" + ud.username).join(", ");
                await send(`🔄 Đang xử lý ${globalEstimatedTotalItems} media từ ${userNamesString}...`, "⌛");

                const allItemProcessingTasks = [];

                for (const userData of usersToProcessData) {
                    const { username, posts } = userData;
                    for (const post of posts) {
                        const postId = post.video_id;
                        if (post.images && post.images.length > 0) {
                            post.images.forEach((imageUrl, i) => {
                                const filename = `${username}_${postId}_${i}.jpg`;
                                allItemProcessingTasks.push(limit(async () => {
                                    let filePath = null;
                                    try {
                                        filePath = await downloadTiktokMedia(imageUrl, filename);
                                        const catboxUrl = await uploadTiktokMediaToCatbox(filePath);
                                        return { type: 'image', url: catboxUrl, success: true, username: username };
                                    } catch (error) {
                                        console.error(`Lỗi xử lý ảnh ${filename}: ${error.message}`);
                                        return { success: false, error: error.message, username: username };
                                    } finally {
                                        if (filePath && fs.existsSync(filePath)) {
                                            try { fs.unlinkSync(filePath); } catch (e) { console.error(`Failed to delete temp file ${filePath}: ${e.message}`); }
                                        }
                                    }
                                }));
                            });
                        } else if (post.play) {
                            const videoUrl = post.play;
                            const filename = `${username}_${postId}.mp4`;
                            allItemProcessingTasks.push(limit(async () => {
                                let filePath = null;
                                try {
                                    filePath = await downloadTiktokMedia(videoUrl, filename);
                                    const catboxUrl = await uploadTiktokMediaToCatbox(filePath);
                                    return { type: 'video', url: catboxUrl, success: true, username: username };
                                } catch (error) {
                                    console.error(`Lỗi xử lý video ${filename}: ${error.message}`);
                                    return { success: false, error: error.message, username: username };
                                } finally {
                                    if (filePath && fs.existsSync(filePath)) {
                                        try { fs.unlinkSync(filePath); } catch (e) { console.error(`Failed to delete temp file ${filePath}: ${e.message}`); }
                                    }
                                }
                            }));
                        }
                    }
                }

                const allTaskResults = await Promise.all(allItemProcessingTasks);

                const successfulTasks = allTaskResults.filter(r => r && r.success);
                const successfullyProcessedUsernamesList = [...new Set(successfulTasks.map(task => task.username))];

                usersToProcessData.forEach(userData => {
                    if (!successfullyProcessedUsernamesList.includes(userData.username)) {
                        finalReportMessage += `👤 User @${userData.username}:\nKhông có item nào được xử lý thành công.\n\n`;
                    }
                });
                
                Data_Image = [...new Set(successfulTasks.filter(r => r.type === 'image').map(r => r.url))];
                Data_Video = [...new Set(successfulTasks.filter(r => r.type === 'video').map(r => r.url))];
                
                let successSummary = "";
                if (successfullyProcessedUsernamesList.length > 0) {
                    successSummary += `✅ Xử lí thành công: ${successfulTasks.length}.\n`;
                    successSummary += `Dùng /data up mp4/jpg <tệp>\n(lưu data đã get vào json)\n\n`;

                    if (Data_Image.length > 0) {
                        try {
                            const uploadedLink = await uploadData(JSON.stringify({ usernames: successfullyProcessedUsernamesList, imageCatboxLinks: Data_Image }), "image_data.json", "json", `image_data_${Date.now()}`);
                            successSummary += `🖼️ Liên kết image (${Data_Image.length}):\n${uploadedLink}\n\n`;
                        } catch (e) { successSummary += `❌ Lỗi tải lên link cho ảnh: ${e.message}\n\n`; }
                    }

                    if (Data_Video.length > 0) {
                        try {
                            const uploadedLink = await uploadData(JSON.stringify({ usernames: successfullyProcessedUsernamesList, videoCatboxLinks: Data_Video }), "video_data.json", "json", `video_data_${Date.now()}`);
                            successSummary += `🎬 Liên kết video (${Data_Video.length}):\n${uploadedLink}\n\n`;
                        } catch (e) { successSummary += `❌ Lỗi tải lên link cho video: ${e.message}\n\n`; }
                    }
                }

                finalReportMessage += successSummary;
                
                if (finalReportMessage.trim()) {
                    await send(finalReportMessage.trim(), "✅");
                } else {
                    await send("Hoàn tất xử lý nhưng không có media nào được tải lên thành công.", "⚠️");
                }
                break;
            }


            default: {
                const files = fs.existsSync(Data_ToanSex) ? fs.readdirSync(Data_ToanSex).filter(f => f.toLowerCase().endsWith(".json")) : [];
                const totalFiles = files.length;
                const totalLinks = files.reduce((sum, file) => sum + FileCheck(path.join(Data_ToanSex, file)), 0);

                const commandList = [
                    "♦ data cr [tên_tệp]: Tạo tệp Json.",
                    "♦ data rm [tên_tệp]: Xóa tệp Json.",
                    "♦ data gv [tên_tệp]: Chia sẻ tệp Json.",
                    "♦ data add [tên_tệp]: Thêm data vào Json.",
                    "♦ data check: Kiểm tra danh sách các tệp Json.",
                    "♦ data get <UserName>: Tải video/ảnh từ user TikTok.",
                    "♦ data up mp4/jpg <tên_tệp>: Lưu data đã get vào Json.",
                    "♦ data on/off: Bật/tắt auto clean data."
                ];
                
                const backgroundUrl = "https://files.catbox.moe/a9a13c.jpg";
                const image = await loadImage(backgroundUrl);
                const canvas = createCanvas(image.width, image.height);
                const ctx = canvas.getContext('2d');

                ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

                ctx.textBaseline = 'top'; 
                const textColor = "#A6D8FF";
                const statsColor = "#FFFFFF";
                
                let y = 100;
                const x = 80;
                const commandLineHeight = 32;

                ctx.font = "20px 'Arial', 'sans-serif'";
                ctx.fillStyle = textColor;
                for (const cmd of commandList) {
                    ctx.fillText(cmd, x, y);
                    y += commandLineHeight;
                }
                
                y += 20;
                ctx.font = "bold 20px 'Arial', 'sans-serif'";
                ctx.fillStyle = statsColor;
                ctx.fillText("📊 Thống kê hiện tại:", x, y);
                y += 28;
                
                ctx.font = "18px 'Arial', 'sans-serif'";
                ctx.fillStyle = textColor;
                ctx.fillText(`   ➣ Tổng số tệp: ${totalFiles}`, x, y);
                y += 26;
                ctx.fillText(`   ➣ Tổng số link: ${totalLinks}`, x, y);

                const cacheDir = path.join(__dirname, 'cache');
                if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });
                const imagePath = path.join(cacheDir, `data_help_${Date.now()}.png`);
                const buffer = canvas.toBuffer('image/png');
                fs.writeFileSync(imagePath, buffer);
                
                const info = await api.sendMessage({
                    attachment: fs.createReadStream(imagePath)
                }, threadID, (err) => {
                    if (err) return console.error(err);
                    fs.unlinkSync(imagePath);
                }, messageID);
                
                global.client.handleReply.push({
                    name: this.config.name,
                    messageID: info.messageID,
                    author: event.senderID,
                    type: "main_help_reply",
                });
            }
        }
    } catch (error) {
        console.error("Error in Data command 'run':", error);
        send("Đã xảy ra lỗi khi xử lý lệnh!", "❎");
    }
};

module.exports.handleReply = async ({ api, event, handleReply }) => {
    const { threadID, messageID, body, senderID } = event;
    const { author, fileListArray, type } = handleReply;

    if (!T_Nobi.includes(senderID)) {
        return api.sendMessage("Cút chổ khác chơi ?", threadID, messageID);
    }

    if (senderID !== author) return;

    const send = (msg, reaction = null) => sendApiMessage(api, threadID, msg, reaction, messageID);
    
    try {
        if (type === "list_files_action") {
            const args = body.trim().split(/\s+/);
            const firstArg = args[0].toLowerCase();
            let command;
            let targetIndexStr;

            if (args.length === 1 && !isNaN(parseInt(firstArg))) {
                command = "check";
                targetIndexStr = firstArg;
            } else if (args.length > 1 && ["rm", "gv", "check"].includes(firstArg) && !isNaN(parseInt(args[1]))) {
                command = firstArg;
                targetIndexStr = args[1];
            } else if (firstArg === "cr" && args.length > 1) {
                command = "cr";
            } else {
                return send("Lệnh không hợp lệ hoặc thiếu thông tin. Vui lòng xem hướng dẫn.", "⚠️");
            }

            let selectedFile = null;
            if (command !== "cr") {
                const fileIndex = parseInt(targetIndexStr);
                if (isNaN(fileIndex) || fileIndex < 1 || fileIndex > fileListArray.length) {
                    return send(`Số thứ tự '${targetIndexStr}' không hợp lệ.`, "⚠️");
                }
                selectedFile = fileListArray[fileIndex - 1];
            }

            switch (command) {
                case "cr": {
                    const newFileName = args.slice(1).join("_");
                    if (!newFileName) return send("➣ Vui lòng nhập tên file để tạo (ví dụ: cr ten_moi).", "❎");
                    const newFilePath = getFile(newFileName);
                    if (fs.existsSync(newFilePath)) return send(`➣ File ${path.basename(newFilePath)} đã tồn tại.`, "⚠️");
                    if (writeJsonFile(newFilePath, [])) {
                        send(`➣ Đã tạo file mới: ${path.basename(newFilePath)}`, "✅");
                    } else {
                        send(`➣ Không thể tạo file ${path.basename(newFilePath)}.`, "❎");
                    }
                    break;
                }
                case "rm": {
                    if (!selectedFile) return;
                    try {
                        fs.unlinkSync(selectedFile.filePath);
                        send(`➣ Đã xóa file ${selectedFile.fileName}.json`, "✅");
                    } catch (err) {
                        send(`➣ Lỗi khi xóa file ${selectedFile.fileName}.json.`, "❎");
                    }
                    break;
                }
                case "gv": {
                    if (!selectedFile) return;
                    const fileContent = fs.readFileSync(selectedFile.filePath, "utf-8");
                     if (fileContent.trim() === "" || fileContent.trim() === "[]") {
                        return send(`➣ File ${selectedFile.fileName}.json rỗng.`, "⚠️");
                    }
                    await send(null, "⌛");
                    const uploadedLink = await uploadData(fileContent, `${selectedFile.fileName}.json`, "json", `${selectedFile.fileName}_${Date.now()}`);
                    if (uploadedLink) {
                        send(`➣ Link chia sẻ cho ${selectedFile.fileName}.json: ${uploadedLink}`, "✅");
                    } else {
                        send(`➣ Lỗi tải lên cho ${selectedFile.fileName}.json.`, "❎");
                    }
                    break;
                }
                case "check": {
                    if (!selectedFile) return;
                    await send(null, "⌛");
                    const links = JsonFile(selectedFile.filePath, []);
                    if (!Array.isArray(links) || links.length === 0) {
                        return send(`File ${selectedFile.fileName}.json rỗng hoặc không chứa danh sách link.`, "⚠️");
                    }

                    let deadLinks = [];

                    const checkLinkPromises = links.map(link => limit(async () => {
                        try {
                            await axios.head(link, { timeout });
                            return null;
                        } catch (error) {
                            return link;
                        }
                    }));
                    
                    const results = await Promise.all(checkLinkPromises);
                    deadLinks = results.filter(Boolean);

                    let reportMsg = `[ Kết quả kiểm tra ${selectedFile.fileName}.json ]\n` +
                                    `Tổng số link: ${links.length}\n` +
                                    `Số link live: ${links.length - deadLinks.length}\n` +
                                    `Số link die: ${deadLinks.length}\n`;

                    if (deadLinks.length > 0) {
                        const uploadedDeadLinks = await uploadData(JSON.stringify(deadLinks), `dead_links_${selectedFile.fileName}.json`, "json", `dead_links_${selectedFile.fileName}_${Date.now()}`);
                        if (uploadedDeadLinks) {
                            reportMsg += `Danh sách link die: ${uploadedDeadLinks}\n`;
                        } else {
                            reportMsg += `Không thể tải danh sách link die lên.\n`;
                        }
                        reportMsg += `\n📌 Thả cảm xúc vào tin nhắn này để xóa các link die khỏi file.`;
                    } else {
                        reportMsg += `\n✅ Không phát hiện liên kết die.`;
                    }
                    
                    const reportInfo = await send(reportMsg, "✅");
                    if (deadLinks.length > 0) {
                        global.client.handleReaction.push({
                            name: this.config.name,
                            messageID: reportInfo.messageID,
                            author: senderID,
                            type: "delete_dead_links",
                            deadLinks,
                            filePath: selectedFile.filePath,
                        });
                    }
                    break;
                }
            }
        } else if (type === "main_help_reply") {
            const args = body.trim().split(/\s+/);
            const command = args[0].toLowerCase();
            if (command === "cr") {
                 if (args.length < 2) return send("➣ Vui lòng nhập tên file để tạo (ví dụ: cr ten_moi).", "❎");
                 const newFileName = args.slice(1).join("_");
                 const newFilePath = getFile(newFileName);
                 if (fs.existsSync(newFilePath)) return send(`➣ File ${path.basename(newFilePath)} đã tồn tại.`, "⚠️");
                 if (writeJsonFile(newFilePath, [])) {
                     send(`➣ Đã tạo file mới: ${path.basename(newFilePath)}`, "✅");
                 } else {
                     send(`➣ Không thể tạo file ${path.basename(newFilePath)}.`, "❎");
                 }
            } else {
                send("Lệnh không hợp lệ cho phản hồi này.", "⚠️");
            }
        }
    } catch (error) {
        console.error("Error in Data command 'handleReply':", error);
        send("Đã xảy ra lỗi trong quá trình xử lý phản hồi.", "❎");
    }
};

module.exports.handleReaction = async ({ api, event, handleReaction }) => {
    const { userID, threadID, messageID: reactionMessageID } = event;
    const { author, type, deadLinks, filePath } = handleReaction;

    if (!T_Nobi.includes(userID)) {
        return;
    }

    if (userID !== author) return;

    const send = (msg, reaction = null) => sendApiMessage(api, threadID, msg, reaction, reactionMessageID);

    try {
        if (type === "delete_dead_links") {
            if (!deadLinks || deadLinks.length === 0) {
                return send("Không có link die nào được ghi nhận để xóa.", "⚠️");
            }
            
            let existingLinks = JsonFile(filePath, []);
            if (!Array.isArray(existingLinks)) {
                 return send("File gốc không hợp lệ hoặc đã bị thay đổi.", "❎");
            }
            
            const initialLength = existingLinks.length;
            const updatedLinks = existingLinks.filter(link => !deadLinks.includes(link));
            const deletedCount = initialLength - updatedLinks.length;

            if (writeJsonFile(filePath, updatedLinks)) {
                send(
                    `[ Xóa Link die Thành Công ]\n` +
                    `➣ Đã xóa ${deletedCount} link die khỏi ${path.basename(filePath)}.\n` +
                    `➣ Số link còn lại: ${updatedLinks.length}`,
                    "✅"
                );
                global.client.handleReaction = global.client.handleReaction.filter(
                    item => item.messageID !== handleReaction.messageID
                );
            } else {
                send("Lỗi khi cập nhật file sau khi xóa link die.", "❎");
            }
        }
    } catch (error) {
        console.error("Error in Data command 'handleReaction':", error);
        send("Đã xảy ra lỗi khi xử lý phản ứng.", "❎");
    }
};
