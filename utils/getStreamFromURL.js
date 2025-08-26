/*
 * Mirai Bot Core Utility
 * Function: getStreamFromURL
 * ---------------------------------------------------------------------------
 * Mục đích:
 *   - Trả về ReadStream của một resource (ảnh/gif/video/zip…)
 *   - Tự động lưu file tạm trong thư mục cache rồi xoá sau 60 giây
 *   - Tương thích mọi module sử dụng `global.utils.getStreamFromURL`
 *
 * 2025‑07‑15 – Fix cho môi trường VPS/host:
 *   • Ép DNS ưu tiên IPv4 (một số DC chặn route IPv6 tới Facebook/CDN)
 *   • Tuỳ chọn FORCE_IPV4=true => axios family:4
 *   • Thêm timeout, retry = 1
 */

// ──────────────────────────────────────────────────────────────────────────────
const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const dns = require("dns");

// Ưu tiên IPv4 khi resolve DNS (Node >=14.17)
try {
  dns.setDefaultResultOrder("ipv4first");
} catch (_) {}

/**
 * @param {string} url      – URL file cần tải
 * @param {string} ext      – Phần mở rộng cho file tạm (jpg, png, mp4…)
 * @param {number} timeout  – Thời gian chờ tối đa (ms)
 * @returns {Promise<fs.ReadStream>} – Stream đọc file tạm
 */
async function getStreamFromURL(url, ext = "jpg", timeout = 15000) {
  const cacheDir = path.join(__dirname, "..", "cache");
  await fs.ensureDir(cacheDir);
  const filePath = path.join(cacheDir, `${Date.now()}.${ext}`);

  // Options axios chung
  const axiosOpts = {
    responseType: "arraybuffer",
    timeout,
    maxRedirects: 3,
    family: process.env.FORCE_IPV4 ? 4 : undefined, // ép IPv4 nếu set env
  };

  let response;
  try {
    response = await axios.get(url, axiosOpts);
  } catch (err) {
    // Thử lại 1 lần cuối cùng nếu timeout / network error
    if (err.code === "ECONNABORTED" || err.code === "ENOTFOUND") {
      response = await axios.get(url, axiosOpts);
    } else {
      throw err;
    }
  }

  await fs.writeFile(filePath, response.data);

  // Tự xoá sau 60s để tránh đầy ổ
  setTimeout(() => fs.remove(filePath).catch(() => {}), 60000);

  return fs.createReadStream(filePath);
}

module.exports = getStreamFromURL;
