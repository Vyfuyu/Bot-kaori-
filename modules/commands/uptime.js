const os = require('os');
const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');
const moment = require('moment-timezone');
const pidusage = require('pidusage');

const formatBytes = (bytes) => {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  if (bytes === 0) return '0 B';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return (bytes / 1024 ** i).toFixed(1) + ' ' + units[i];
};

const makeBar = (percent, total = 13) => {
  const full = Math.round(percent * total);
  return '█'.repeat(full) + '░'.repeat(total - full);
};

const getFolderSize = async (dir) => {
  let size = 0;
  const stack = [dir];
  const ignore = ['node_modules', '.git'];
  while (stack.length) {
    const cur = stack.pop();
    try {
      const stat = await fs.stat(cur);
      if (stat.isFile()) size += stat.size;
      else if (stat.isDirectory() && !ignore.includes(path.basename(cur))) {
        const items = await fs.readdir(cur);
        for (const i of items) stack.push(path.join(cur, i));
      }
    } catch {}
  }
  return size;
};

const getDiskInfo = () => {
  try {
    const platform = os.platform();
    if (platform === 'win32') {
      const output = execSync('wmic logicaldisk get size,freespace,caption').toString().split('\n');
      const line = output.find(l => l.trim().startsWith('C:'));
      if (!line) return null;
      const parts = line.trim().split(/\s+/);
      const free = parseInt(parts[1]);
      const total = parseInt(parts[2]);
      const used = total - free;
      return {
        total: formatBytes(total),
        used: formatBytes(used),
        free: formatBytes(free),
        usage: `${makeBar(used / total)} ${Math.round((used / total) * 100)}%`
      };
    } else {
      const out = execSync('df -k --output=size,used,avail,target -x tmpfs -x devtmpfs').toString().split('\n')[1];
      const [size, used, avail] = out.trim().split(/\s+/).map(v => parseInt(v));
      return {
        total: formatBytes(size * 1024),
        used: formatBytes(used * 1024),
        free: formatBytes(avail * 1024),
        usage: `${makeBar(used / size)} ${Math.round((used / size) * 100)}%`
      };
    }
  } catch {
    return null;
  }
};

module.exports = {
  config: {
    name: "uptime",
    version: "2.0",
    hasPermission: 1,
    credits: "vutuan + gpt",
    description: "Giám sát toàn bộ hệ thống bot",
    commandCategory: "Admin",
    usages: "",
    cooldowns: 5
  },

  run: async ({ api, event, Users }) => {
    const name = await Users?.getNameUser(event.senderID) || 'Admin';
    const now = moment().tz('Asia/Ho_Chi_Minh');
    const nodeVer = process.version;
    const pid = process.pid;

    const mem = process.memoryUsage();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;

    const cpus = os.cpus();
    const load = os.loadavg();
    const uptime = process.uptime();
    const sysUp = os.uptime();

    const [d, h, m, s] = [
      Math.floor(uptime / 86400),
      Math.floor(uptime / 3600) % 24,
      Math.floor(uptime / 60) % 60,
      Math.floor(uptime) % 60
    ];

    const folderSize = await getFolderSize('./');
    const pkgCount = (() => {
      try {
        const json = require(path.resolve('package.json'));
        return Object.keys(json.dependencies || {}).length;
      } catch {
        return 0;
      }
    })();

    const disk = getDiskInfo();
    const start = Date.now();
    await new Promise(r => setTimeout(r, 5));
    const ping = Date.now() - start;

    const cpuUsage = await pidusage(pid);

    const netInterfaces = os.networkInterfaces();
    const netCount = Object.keys(netInterfaces).length;

    const msg = [
      `=== GIÁM SÁT HỆ THỐNG ===`,
      `🕒 Thời gian     : ${now.format("DD/MM/YYYY HH:mm:ss")}`,
      `👤 Người gọi     : ${name}`,
      ``,
      `--- Thời gian ---`,
      `• Uptime bot    : ${d}d ${h}h ${m}m ${s}s`,
      `• Uptime máy    : ${Math.floor(sysUp / 3600)}h`,
      ``,
      `--- Phiên bản ---`,
      `• Node.js       : ${nodeVer}`,
      `• PID           : ${pid}`,
      `• Packages      : ${pkgCount}`,
      `• Dung lượng bot: ${formatBytes(folderSize)}`,
      `• Thư mục chạy  : ${process.cwd()}`,
      ``,
      `--- RAM ---`,
      `• Tổng RAM      : ${formatBytes(totalMem)}`,
      `• Đã dùng       : ${formatBytes(usedMem)} (${makeBar(usedMem / totalMem)} ${Math.round((usedMem / totalMem) * 100)}%)`,
      `• RSS           : ${formatBytes(mem.rss)}`,
      `• Heap          : ${formatBytes(mem.heapUsed)} / ${formatBytes(mem.heapTotal)}`,
      `• External      : ${formatBytes(mem.external)}`,
      `• ArrayBuffers  : ${formatBytes(mem.arrayBuffers)}`,
      ``,
      `--- CPU ---`,
      `• Model         : ${cpus[0].model}`,
      `• Số lõi        : ${cpus.length}`,
      `• Tốc độ        : ${cpus[0].speed} MHz`,
      `• Load avg      : ${load.map(x => x.toFixed(2)).join(' | ')}`,
      `• CPU Bot       : ${cpuUsage.cpu.toFixed(1)}%`,
      ``,
      `--- Ổ ĐĨA ---`,
      disk ? [
        `• Tổng          : ${disk.total}`,
        `• Đã dùng       : ${disk.used}`,
        `• Còn trống     : ${disk.free}`,
        `• Sử dụng       : ${disk.usage}`
      ].join('\n') : 'Không lấy được thông tin ổ đĩa',
      ``,
      `--- Hệ điều hành ---`,
      `• Tên HĐH       : ${os.type()} ${os.release()} (${os.arch()})`,
      `• Nền tảng      : ${os.platform()}`,
      `• Người dùng    : ${process.env.USER || process.env.USERNAME}`,
      `• Network       : ${netCount} adapter(s)`,
      ``,
      `--- Ping ---`,
      `• Độ trễ        : ${ping}ms`
    ].join('\n');

    api.sendMessage(msg, event.threadID, event.messageID);
  }
};
