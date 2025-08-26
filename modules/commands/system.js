const si = require("systeminformation");
const pidusage = require("pidusage");
const os = require("os");

module.exports.config = {
  name: "system",
  version: "4.2",
  hasPermssion: 2,
  credits: "ĐÉO CÓ",
  description: "Hiển thị thông tin hệ thống gọn gàng và nhanh",
  commandCategory: "Admin",
  usages: "",
  cooldowns: 5,
  dependencies: {
    "systeminformation": "",
    "pidusage": ""
  }
};

function formatBytes(bytes) {
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  if (bytes === 0) return '0 B';
  const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
  return (bytes / Math.pow(1024, i)).toFixed(1) + ' ' + sizes[i];
}

function formatUptime(seconds) {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  return `${hrs}h ${mins}m ${secs}s`;
}

module.exports.run = async ({ api, event }) => {
  const { threadID, messageID } = event;
  const startTime = Date.now();

  // Gửi thông báo đang lấy thông tin
  api.sendMessage("⏳ Đang lấy thông tin cấu hình hệ thống, vui lòng chờ...", threadID, messageID);

  try {
    const [
      cpu, mem, osInfo, disks, usage, gpuData,
      battery, ping, baseboard, graphics, memLayout, system
    ] = await Promise.all([
      si.cpu(),
      si.mem(),
      si.osInfo(),
      si.diskLayout(),
      pidusage(process.pid),
      si.graphics(),
      si.battery(),
      si.inetLatency(),
      si.baseboard(),
      si.graphics(),
      si.memLayout(),
      si.system()
    ]);

    const gpuList = gpuData.controllers.map((gpu, index) => {
      return `• GPU ${index + 1}:
  - Tên: ${gpu.vendor || "Không rõ"} ${gpu.model || "Không rõ"}
  - VRAM: ${gpu.vram ? gpu.vram + " MB" : "Không rõ"}`;
    }).join("\n");

    const displayList = graphics.displays.map((d, i) => {
      return `• Màn hình ${i + 1}:
  - Model: ${d.model || "Không rõ"}
  - Chính: ${d.main ? "✅" : "❌"}`;
    }).join("\n");

    const ramInfo = memLayout.map((m, i) =>
      `• Thanh ${i + 1}: ${(m.size / 1024 / 1024 / 1024).toFixed(1)} GB - ${m.type || "?"}, ${m.clockSpeed || "?"} MHz, Hãng: ${m.manufacturer || "?"}`
    ).join("\n");

    // Kiểm tra xem có pin hay không để xác định là PC hay laptop
    const deviceInfo = battery.hasBattery
      ? `🖥️ 𝗧𝗛𝗜𝗘̂́𝗧 𝗕𝗜̣:
• Hãng: ${system.manufacturer || "Không rõ"}
• Model: ${system.model || "Không rõ"}

`
      : "";

    const msg =
` === 𝗧𝗛𝗢̂𝗡𝗚 𝗧𝗜𝗡 𝗛𝗘̣̂ 𝗧𝗛𝗢̂́𝗡𝗚 ===

${deviceInfo}🔹 𝗕𝗢 𝗠𝗔̣𝗖𝗛 𝗖𝗛𝗨̉
• Tên: ${baseboard.manufacturer} ${baseboard.model || "Không rõ"}

🔹 𝗖𝗣𝗨
• Tên: ${cpu.manufacturer} ${cpu.brand}
• Nhân: ${cpu.cores}, Luồng: ${cpu.physicalCores}
• Tốc độ: ${cpu.speed} GHz
• Mức sử dụng: ${usage.cpu.toFixed(1)}%

🔹 𝗥𝗔𝗠
• Tổng: ${(mem.total / 1024 / 1024 / 1024).toFixed(1)} GB
• Trống: ${(mem.available / 1024 / 1024 / 1024).toFixed(1)} GB
• Bot đang dùng: ${formatBytes(usage.memory)}

🔹 𝗖𝗛𝗜 𝗧𝗜𝗘̂́𝗧 𝗥𝗔𝗠
${ramInfo}

🔹 𝗢̛̉ Đ𝗜̃𝗔
${disks.map((d, i) =>
  `• Ổ ${i + 1}: ${d.name || "N/A"} - ${d.interfaceType || "?"}, ${(d.size / 1024 / 1024 / 1024).toFixed(0)} GB`
).join("\n")}

🔹 𝗚𝗣𝗨
${gpuList}


🔹 𝗠𝗔̀𝗡 𝗛𝗜̀𝗡𝗛
${displayList}

${battery.hasBattery ? `🔹 𝗣𝗜𝗡
• Dung lượng: ${battery.percent !== null && battery.percent !== undefined ? battery.percent + "%" : "Không rõ"}
• Trạng thái: ${battery.isCharging ? "Đang sạc" : "Không sạc"}` : "🔌 𝗣𝗜𝗡:X"}

🔹 𝗠𝗔̣𝗡𝗚
• Ping mạng hiện tại: ${ping !== null && ping !== undefined ? ping + " ms" : "Không rõ"}

🔹 𝗛𝗘̣̂ Đ𝗜𝗘̂̀𝗨 𝗛𝗔̀𝗡𝗛
• Nền tảng: ${osInfo.platform}
• Phiên bản: ${osInfo.build || osInfo.release}
• Kiến trúc: ${osInfo.arch}
• Uptime máy: ${formatUptime(os.uptime())}
• Uptime bot: ${formatUptime(process.uptime())}

🔹 𝗧𝗢̂́𝗖 Đ𝗢̣̂ 𝗕𝗢𝗧
• Phản hồi: ${(Date.now() - startTime)} ms`;

    return api.sendMessage(msg, threadID, messageID);
  } catch (err) {
    return api.sendMessage(`⚠️ Lỗi khi lấy thông tin hệ thống:\n${err.message}`, threadID, messageID);
  }
};