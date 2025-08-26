Skip to content
Sign in
Sign up
Instantly share code, notes, and snippets.

Chickennnnnn19/adc.js
Created 13 hours ago
Clone this repository at &lt;script src=&quot;https://gist.github.com/Chickennnnnn19/ae3509c20792e088c3c3035702a85ef6.js&quot;&gt;&lt;/script&gt;
<script src="https://gist.github.com/Chickennnnnn19/ae3509c20792e088c3c3035702a85ef6.js"></script>
Code
Revisions
1
Code from adc.js - Created by ADC Bot
adc.js
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const https = require("https");
const moment = require("moment-timezone");

module.exports.config = {
  name: "adc",
  version: "7.0.1",
  hasPermssion: 3,
  credits: "ĐÉO CÓ - Modified for GitHub Gist",
  description: "Tải code từ link raw bất kỳ và xuất ra GitHub Gist",
  commandCategory: "Admin",
  usages: "[tên file] (reply link raw)",
  cooldowns: 0,
  usePrefix: false
};

async function checkRateLimit(token, threadID, messageID, api) {
  try {
    const response = await axios.get('https://api.github.com/rate_limit', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'ADC-Bot'
      },
      httpsAgent: new https.Agent({ rejectUnauthorized: false }),
      timeout: 15000
    });
    const { remaining, limit, reset } = response.data.rate;
    if (remaining < 10) {
      const resetTime = moment.unix(reset).tz("Asia/Ho_Chi_Minh").format("HH:mm:ss | DD/MM/YYYY");
      throw new Error(`Rate limit low: ${remaining}/${limit}. Resets at ${resetTime}`);
    }
    return true;
  } catch (error) {
    const reset = error.response?.headers['x-ratelimit-reset'];
    const resetTime = reset ? moment.unix(reset).tz("Asia/Ho_Chi_Minh").format("HH:mm:ss | DD/MM/YYYY") : 'Unknown';
    const errorMsg = `❎ Rate limit check failed:\n${error.message}\nReset time: ${resetTime}`;
    api.sendMessage(errorMsg, threadID, messageID);
    return false;
  }
}

async function createGistWithRetry(gistData, headers, threadID, messageID, api, maxRetries = 2) {
  let attempts = 0;
  while (attempts < maxRetries) {
    try {
      if (!(await checkRateLimit(headers['Authorization'].split(' ')[1], threadID, messageID, api))) {
        const resetTimeUnix = (await axios.get('https://api.github.com/rate_limit', { headers })).data.rate.reset;
        const waitTime = moment.unix(resetTimeUnix).diff(moment(), 'milliseconds');
        if (waitTime > 0) {
          await new Promise(resolve => setTimeout(resolve, waitTime + 1000));
        }
        attempts++;
        continue;
      }
      const response = await axios.post('https://api.github.com/gists', gistData, {
        headers: headers,
        httpsAgent: new https.Agent({ rejectUnauthorized: false }),
        timeout: 15000
      });
      return response;
    } catch (error) {
      if (error.response?.status !== 403 || attempts >= maxRetries - 1) throw error;
      attempts++;
    }
  }
  throw new Error('Max retries reached for Gist creation');
}

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID, senderID, messageReply, type } = event;
  const isAdmin = global.config.NDH.includes(senderID);
  const filename = args[0];
  const filepath = path.join(__dirname, `${filename}.js`);
  const replyText = type === "message_reply" ? messageReply.body : null;

  // GitHub Personal Access Token
  const GITHUB_TOKEN = global.config.GITHUB_TOKEN || null;

  // ❌ Không phải admin
  if (!isAdmin) {
    const name = global.data.userName.get(senderID);
    const thread = await api.getThreadInfo(threadID);
    const time = moment.tz("Asia/Ho_Chi_Minh").format("HH:mm:ss | DD/MM/YYYY");
    return api.sendMessage(
      `📌 Box: ${thread.threadName}\n👤 ${name}\n📎 Dùng lệnh: adc\n🕒 ${time}\n🔗 https://facebook.com/${senderID}`,
      global.config.NDH
    );
  }

  // ✅ Nếu không reply link → xuất GitHub Gist từ file
  if (fs.existsSync(filepath) && !replyText) {
    const content = fs.readFileSync(filepath, "utf8");
    if (!content || content.trim().length < 3)
      return api.sendMessage(`⚠️ File "${filename}.js" không có nội dung.`, threadID, messageID);

    try {
      // Kiểm tra token trước
      if (!GITHUB_TOKEN) {
        return api.sendMessage(
          `❌ Thiếu GitHub Token!\n\n` +
          `Vui lòng thêm GITHUB_TOKEN vào config:\n` +
          `global.config.GITHUB_TOKEN = "your_token_here"`,
          threadID, messageID
        );
      }

      const gistData = {
        description: `Code from ${filename}.js - Created by ADC Bot`,
        public: true,
        files: {
          [`${filename}.js`]: {
            content: content
          }
        }
      };

      const headers = {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'ADC-Bot',
        'X-GitHub-Api-Version': '2022-11-28'
      };

      const response = await createGistWithRetry(gistData, headers, threadID, messageID, api);

      const gistUrl = response.data.html_url;
      const rawUrl = response.data.files[`${filename}.js`].raw_url;

      return api.sendMessage(
        `✅ Đã tạo GitHub Gist thành công!\n\n` +
        `🔗 Gist URL: ${gistUrl}\n` +
        `📄 Raw URL: ${rawUrl}`,
        threadID, messageID
      );
    } catch (e) {
      const detail = e.response?.data || e.message;
      let errorMsg = `❎ Lỗi tạo GitHub Gist:\n`;

      if (e.response?.status === 401) {
        errorMsg += `❌ Token không hợp lệ hoặc hết hạn\n`;
        errorMsg += `Vui lòng tạo token mới với scope 'gist'`;
      } else if (e.response?.status === 403) {
        const remaining = e.response?.headers['x-ratelimit-remaining'] || 'Unknown';
        const limit = e.response?.headers['x-ratelimit-limit'] || 'Unknown';
        const reset = e.response?.headers['x-ratelimit-reset'];
        const resetTime = reset ? moment.unix(reset).tz("Asia/Ho_Chi_Minh").format("HH:mm:ss | DD/MM/YYYY") : 'Unknown';
        errorMsg += `❌ Vượt quá giới hạn API hoặc không có quyền\n`;
        errorMsg += `Rate limit: ${remaining}/${limit}\n`;
        errorMsg += `Reset time: ${resetTime}\n`;
        errorMsg += `Vui lòng thử lại sau thời gian reset.`;
      } else if (e.response?.status === 422) {
        errorMsg += `❌ Dữ liệu gist không hợp lệ\n`;
        errorMsg += `Chi tiết: ${JSON.stringify(e.response.data?.errors || e.response.data, null, 2)}`;
      } else if (e.code === 'ECONNABORTED') {
        errorMsg += `❌ Timeout khi kết nối GitHub API`;
      } else {
        errorMsg += `Details: ${typeof detail === "object" ? JSON.stringify(detail, null, 2) : detail}`;
      }

      return api.sendMessage(errorMsg, threadID, messageID);
    }
  }

  // ❎ Không có tên và không có reply → báo sai cú pháp
  if (!filename && !replyText)
    return api.sendMessage(`❎ Vui lòng nhập tên file và reply link raw code`, threadID, messageID);

  // ✅ Nếu có reply link → lưu file
  const urlMatch = replyText?.match(/https?:\/\/[^\s]+/g);
  if (!urlMatch || !urlMatch[0].startsWith("http"))
    return api.sendMessage("❎ Không tìm thấy link hợp lệ.", threadID, messageID);

  let url = urlMatch[0];

  // Hỗ trợ các định dạng GitHub
  if (url.includes('github.com') && !url.includes('raw.githubusercontent.com')) {
    url = url.replace('github.com', 'raw.githubusercontent.com').replace('/blob/', '/');
  }

  // Hỗ trợ GitHub Gist
  if (url.includes('gist.github.com')) {
    const gistId = url.split('/').pop();
    try {
      const gistResponse = await axios.get(`https://api.github.com/gists/${gistId}`, {
        httpsAgent: new https.Agent({ rejectUnauthorized: false })
      });

      const files = Object.keys(gistResponse.data.files);
      if (files.length > 0) {
        url = gistResponse.data.files[files[0]].raw_url;
      }
    } catch (e) {
      return api.sendMessage("❎ Lỗi lấy thông tin từ GitHub Gist:\n" + e.message, threadID, messageID);
    }
  }

  // Hỗ trợ dpaste (backward compatibility)
  if (/^https:\/\/dpaste\.com\/[a-zA-Z0-9]+$/.test(url)) url += ".txt";

  try {
    const { data } = await axios.get(url, {
      httpsAgent: new https.Agent({ rejectUnauthorized: false }),
      timeout: 30000
    });

    fs.writeFileSync(filepath, data, "utf8");
    delete require.cache[require.resolve(filepath)];
    require(filepath);

    return api.sendMessage(`✅ Đã lưu code vào ${filename}.js`, threadID, messageID);
  } catch (e) {
    let errorMsg = "❎ Lỗi tải code từ link:\n";

    if (e.code === 'ENOTFOUND') {
      errorMsg += "❌ Không thể kết nối đến server";
    } else if (e.code === 'ECONNABORTED') {
      errorMsg += "❌ Timeout khi tải file";
    } else if (e.response?.status === 404) {
      errorMsg += "❌ File không tồn tại hoặc đã bị xóa";
    } else if (e.response?.status === 403) {
      errorMsg += "❌ Không có quyền truy cập file";
    } else {
      errorMsg += e.message;
    }

    return api.sendMessage(errorMsg, threadID, messageID);
  }
};
 to join this conversation on GitHub. Already have an account? Sign in to comment
Footer
© 2025 GitHub, Inc.
Footer navigation
Terms
Privacy
Security
Status
Docs
Contact
Manage cookies
Do not share my personal information
