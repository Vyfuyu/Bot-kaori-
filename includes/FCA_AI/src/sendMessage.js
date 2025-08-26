"use strict";

/**
 * Được Fix Hay Làm Màu Bởi: @Satoru
 * 02/06/2025
 * Kết hợp sendMessage.js và sendTypMqtt.js
 * Tích hợp trạng thái "đang soạn tin nhắn" trong thời gian delay
 */

var utils = require("../utils");
var log = require("npmlog");
var bluebird = require("bluebird");
var fs = require('fs-extra');

var allowedProperties = {
  attachment: true,
  url: true,
  sticker: true,
  emoji: true,
  emojiSize: true,
  body: true,
  mentions: true,
  location: true,
};

var AntiText = "Your criminal activity was detected while attempting to send an Appstate file";
var Location_Stack;

module.exports = function (defaultFuncs, api, ctx) {
  let count_req = 0;

  // Hàm gửi trạng thái "đang soạn tin nhắn" qua MQTT
  function makeTypingIndicator(typ, threadID, callback) {
    if (!ctx.mqttClient || !ctx.mqttClient.connected) {
      if (typeof callback === "function") {
        callback(new Error("MQTT client not connected"));
      }
      return;
    }
    threadID = utils.formatID(threadID.toString());

    try {
      var wsContent = {
        app_id: 2220391788200892,
        payload: JSON.stringify({
          label: 3,
          payload: JSON.stringify({
            thread_key: threadID,
            is_group_thread: +(threadID.length >= 16),
            is_typing: +typ,
            attribution: 0,
          }),
          version: 5849951561777440,
        }),
        request_id: ++count_req,
        type: 4,
      };

      ctx.mqttClient.publish('/ls_req', JSON.stringify(wsContent), {}, (err, _packet) => {
        if (typeof callback === "function") {
          if (err) {
            callback(err);
          } else {
            callback();
          }
        }
      });
    } catch (err) {
      if (typeof callback === "function") {
        callback(err);
      }
    }
  }

  // Hàm upload file đính kèm
  function uploadAttachment(attachments, callback) {
    var uploads = [];

    for (var i = 0; i < attachments.length; i++) {
      if (!utils.isReadableStream(attachments[i])) {
        throw { error: "Attachment should be a readable stream and not " + utils.getType(attachments[i]) + "." };
      }

      var form = {
        upload_1024: attachments[i],
        voice_clip: "true",
      };

      uploads.push(
        defaultFuncs
          .postFormData("https://upload.facebook.com/ajax/mercury/upload.php", ctx.jar, form, {})
          .then(utils.parseAndCheckLogin(ctx, defaultFuncs))
          .then(function (resData) {
            if (resData.error) throw resData;
            return resData.payload.metadata[0];
          })
      );
    }

    bluebird
      .all(uploads)
      .then(resData => callback(null, resData))
      .catch(function (err) {
        log.error("uploadAttachment", err);
        return callback(err);
      });
  }

  // Hàm lấy thông tin URL
  function getUrl(url, callback) {
    var form = {
      image_height: 960,
      image_width: 960,
      uri: url,
    };

    defaultFuncs
      .post("https://www.facebook.com/message_share_attachment/fromURI/", ctx.jar, form)
      .then(utils.parseAndCheckLogin(ctx, defaultFuncs))
      .then(function (resData) {
        if (resData.error) return callback(resData);
        if (!resData.payload) return callback({ error: "Invalid url" });
        callback(null, resData.payload.share_data.share_params);
      })
      .catch(function (err) {
        log.error("getUrl", err);
        return callback(err);
      });
  }

  // Hàm gửi nội dung tin nhắn
  function sendContent(form, threadID, isSingleUser, messageAndOTID, callback) {
    if (utils.getType(threadID) === "Array") {
      for (var i = 0; i < threadID.length; i++) {
        form["specific_to_list[" + i + "]"] = "fbid:" + threadID[i];
      }
      form["specific_to_list[" + threadID.length + "]"] = "fbid:" + ctx.userID;
      form["client_thread_id"] = "root:" + messageAndOTID;
      log.info("sendMessage", "Sending message to multiple users: " + threadID);
    } else {
      if (isSingleUser) {
        form["specific_to_list[0]"] = "fbid:" + threadID;
        form["specific_to_list[1]"] = "fbid:" + ctx.userID;
        form["other_user_fbid"] = threadID;
      } else {
        form["thread_fbid"] = threadID;
      }
    }

    if (ctx.globalOptions.pageID) {
      form["author"] = "fbid:" + ctx.globalOptions.pageID;
      form["specific_to_list[1]"] = "fbid:" + ctx.globalOptions.pageID;
      form["creator_info[creatorID]"] = ctx.userID;
      form["creator_info[creatorType]"] = "direct_admin";
      form["creator_info[labelType]"] = "sent_message";
      form["creator_info[pageID]"] = ctx.globalOptions.pageID;
      form["request_user_id"] = ctx.globalOptions.pageID;
      form["creator_info[profileURI]"] = "https://www.facebook.com/profile.php?id=" + ctx.userID;
    }

    if (global.Fca.Require.FastConfig.AntiSendAppState == true) {
      try {
        if (Location_Stack != undefined || Location_Stack != null) {
          let location = (((Location_Stack).replace("Error", '')).split('\n')[7]).split(' ');
          let format = {
            Source: (location[6]).split('s:')[0].replace("(", '') + 's',
            Line: (location[6]).split('s:')[1].replace(")", ''),
          };
          form.body = AntiText + "\n- Source: " + format.Source + "\n- Line: " + format.Line;
        }
      } catch (e) {}
    }

    defaultFuncs
      .post("https://www.facebook.com/messaging/send/", ctx.jar, form)
      .then(utils.parseAndCheckLogin(ctx, defaultFuncs))
      .then(function (resData) {
        Location_Stack = undefined;
        if (!resData) return callback({ error: "Send message failed." });
        if (resData.error) {
          if (resData.error === 1545012) {
            log.warn("sendMessage", "Got error 1545012. This might mean that you're not part of the conversation " + threadID);
          }
          return callback(resData);
        }

        var messageInfo = resData.payload.actions.reduce(function (p, v) {
          return ({
            threadID: v.thread_fbid,
            messageID: v.message_id,
            timestamp: v.timestamp,
          } || p);
        }, null);
        return callback(null, messageInfo);
      })
      .catch(function (err) {
        log.error("sendMessage", err);
        if (utils.getType(err) == "Object" && err.error === "Not logged in.") {
          ctx.loggedIn = false;
        }
        return callback(err, null);
      });
  }

  // Hàm xử lý gửi tin nhắn
  function send(form, threadID, messageAndOTID, callback, isGroup) {
    if (utils.getType(threadID) === "Array") {
      sendContent(form, threadID, false, messageAndOTID, callback);
      return;
    }

    var THREADFIX = "ThreadID".replace("ThreadID", threadID);
    var threadLength = THREADFIX.length;

    if (global.Fca.isUser.includes(threadID)) {
      sendContent(form, threadID, true, messageAndOTID, callback);
      return;
    }

    if (global.Fca.isThread.includes(threadID)) {
      sendContent(form, threadID, false, messageAndOTID, callback);
      return;
    }

    var isSingleUser = false;

    if (threadLength <= 14) {
      isSingleUser = true;
    } else if (threadLength >= 15 && threadLength <= 17) {
      if (isGroup !== null) {
        isSingleUser = !isGroup;
      } else if (global.Fca.Data.event && typeof global.Fca.Data.event.isGroup !== 'undefined') {
        isSingleUser = !global.Fca.Data.event.isGroup;
      } else {
        var startsWithOne = THREADFIX.indexOf('1') === 0;

        if (threadLength === 15) {
          isSingleUser = startsWithOne;
        } else if (threadLength === 16) {
          isSingleUser = startsWithOne && Math.random() > 0.7;
        } else if (threadLength === 17) {
          isSingleUser = false;
        }
      }
    } else {
      isSingleUser = false;
    }

    sendContent(form, threadID, isSingleUser, messageAndOTID, callback);

    if (isSingleUser && !global.Fca.isUser.includes(threadID)) {
      global.Fca.isUser.push(threadID);
    } else if (!isSingleUser && !global.Fca.isThread.includes(threadID)) {
      global.Fca.isThread.push(threadID);
    }
  }

  // Hàm xử lý URL
  function handleUrl(msg, form, callback, cb) {
    if (msg.url) {
      form["shareable_attachment[share_type]"] = "100";
      getUrl(msg.url, function (err, params) {
        if (err) return callback(err);
        form["shareable_attachment[share_params]"] = params;
        cb();
      });
    } else {
      cb();
    }
  }

  // Hàm xử lý vị trí
  function handleLocation(msg, form, callback, cb) {
    if (msg.location) {
      if (msg.location.latitude == null || msg.location.longitude == null) {
        return callback({ error: "location property needs both latitude and longitude" });
      }
      form["location_attachment[coordinates][latitude]"] = msg.location.latitude;
      form["location_attachment[coordinates][longitude]"] = msg.location.longitude;
      form["location_attachment[is_current_location]"] = !!msg.location.current;
    }
    cb();
  }

  // Hàm xử lý sticker
  function handleSticker(msg, form, callback, cb) {
    if (msg.sticker) {
      form["sticker_id"] = msg.sticker;
    }
    cb();
  }

  // Hàm xử lý emoji
  function handleEmoji(msg, form, callback, cb) {
    if (msg.emojiSize != null && msg.emoji == null) {
      return callback({ error: "emoji property is empty" });
    }

    if (msg.emoji) {
      if (msg.emojiSize == null) msg.emojiSize = "medium";
      if (msg.emojiSize != "small" && msg.emojiSize != "medium" && msg.emojiSize != "large") {
        return callback({ error: "emojiSize property is invalid" });
      }
      if (form["body"] != null && form["body"] != "") {
        return callback({ error: "body is not empty" });
      }
      form["body"] = msg.emoji;
      form["tags[0]"] = "hot_emoji_size:" + msg.emojiSize;
    }
    cb();
  }

  // Hàm xử lý file đính kèm
  function handleAttachment(msg, form, callback, cb) {
    if (!msg.attachment) {
      cb();
      return;
    }

    form["image_ids"] = [];
    form["gif_ids"] = [];
    form["file_ids"] = [];
    form["video_ids"] = [];
    form["audio_ids"] = [];

    if (utils.getType(msg.attachment) !== "Array") {
      msg.attachment = [msg.attachment];
    }

    const isValidAttachment = attachment => /_id$/.test(attachment[0]);

    if (msg.attachment.every(isValidAttachment)) {
      msg.attachment.forEach(attachment => form[`${attachment[0]}s`].push(attachment[1]));
      return cb();
    }

    if (global.Fca.Require.FastConfig.AntiSendAppState) {
      try {
        const AllowList = [".png", ".mp3", ".mp4", ".wav", ".gif", ".jpg", ".tff"];
        const CheckList = [".json", ".js", ".txt", ".docx", '.php'];
        var Has;

        for (let i = 0; i < msg.attachment.length; i++) {
          if (utils.isReadableStream(msg.attachment[i])) {
            var path = msg.attachment[i].path != undefined ? msg.attachment[i].path : "nonpath";

            if (AllowList.some(ext => path.includes(ext))) {
              continue;
            } else if (CheckList.some(ext => path.includes(ext))) {
              let data = fs.readFileSync(path, 'utf-8');
              if (data.includes("datr")) {
                Has = true;
                var err = new Error();
                Location_Stack = err.stack;
              } else {
                continue;
              }
            }
          }
        }

        if (Has == true) {
          msg.attachment = [fs.createReadStream(__dirname + "/../Extra/Src/Image/checkmate.jpg")];
        }
      } catch (e) {}
    }

    uploadAttachment(msg.attachment, function (err, files) {
      if (err) return callback(err);
      files.forEach(function (file) {
        var key = Object.keys(file);
        var type = key[0];
        form["" + type + "s"].push(file[type]);
      });
      cb();
    });
  }

  // Hàm xử lý mention
  function handleMention(msg, form, callback, cb) {
    if (msg.mentions) {
      for (let i = 0; i < msg.mentions.length; i++) {
        const mention = msg.mentions[i];
        const tag = mention.tag;

        if (typeof tag !== "string") {
          return callback({ error: "Mention tags must be strings." });
        }

        const offset = msg.body.indexOf(tag, mention.fromIndex || 0);
        if (offset < 0) {
          log.warn("handleMention", 'Mention for "' + tag + '" not found in message string.');
        }
        if (mention.id == null) {
          log.warn("handleMention", "Mention id should be non-null.");
        }

        const id = mention.id || 0;
        const emptyChar = '\u200E';
        form["body"] = emptyChar + msg.body;
        form["profile_xmd[" + i + "][offset]"] = offset + 1;
        form["profile_xmd[" + i + "][length]"] = tag.length;
        form["profile_xmd[" + i + "][id]"] = id;
        form["profile_xmd[" + i + "][type]"] = "p";
      }
    }
    cb();
  }

  // Hàm chính gửi tin nhắn với tích hợp trạng thái "đang soạn"
  return function sendMessage(msg, threadID, callback, replyToMessage, isGroup, delay = 0) {
    typeof isGroup == "undefined" ? (isGroup = null) : "";
    if (!callback && (utils.getType(threadID) === "Function" || utils.getType(threadID) === "AsyncFunction")) {
      return threadID({ error: "Pass a threadID as a second argument." });
    }

    if (!replyToMessage && utils.getType(callback) === "String") {
      replyToMessage = callback;
      callback = function () {};
    }

    var resolveFunc = function () {};
    var rejectFunc = function () {};
    var returnPromise = new Promise(function (resolve, reject) {
      resolveFunc = resolve;
      rejectFunc = reject;
    });

    if (!callback) {
      callback = function (err, data) {
        if (err) return rejectFunc(err);
        resolveFunc(data);
      };
    }

    var msgType = utils.getType(msg);
    var threadIDType = utils.getType(threadID);
    var messageIDType = utils.getType(replyToMessage);

    if (msgType !== "String" && msgType !== "Object") {
      return callback({ error: "Message should be of type string or object and not " + msgType + "." });
    }

    if (threadIDType !== "Array" && threadIDType !== "Number" && threadIDType !== "String") {
      return callback({ error: "ThreadID should be of type number, string, or array and not " + threadIDType + "." });
    }

    if (replyToMessage && messageIDType !== 'String') {
      return callback({ error: "MessageID should be of type string and not " + threadIDType + "." });
    }

    if (msgType === "String") msg = { body: msg };

    var disallowedProperties = Object.keys(msg).filter(prop => !allowedProperties[prop]);
    if (disallowedProperties.length > 0) {
      return callback({ error: "Disallowed props: `" + disallowedProperties.join(", ") + "`" });
    }

    var messageAndOTID = utils.generateOfflineThreadingID();

    var form = {
      client: "mercury",
      action_type: "ma-type:user-generated-message",
      author: "fbid:" + ctx.userID,
      timestamp: Date.now(),
      timestamp_absolute: "Today",
      timestamp_relative: utils.generateTimestampRelative(),
      timestamp_time_passed: "0",
      is_unread: false,
      is_cleared: false,
      is_forward: false,
      is_filtered_content: false,
      is_filtered_content_bh: false,
      is_filtered_content_account: false,
      is_filtered_content_quasar: false,
      is_filtered_content_invalid_app: false,
      is_spoof_warning: false,
      source: "source:chat:web",
      "source_tags[0]": "source:chat",
      body: msg.body ? msg.body.toString().replace("\ufe0f".repeat(40), '   ') : "",
      html_body: false,
      ui_push_phase: "V3",
      status: "0",
      offline_threading_id: messageAndOTID,
      message_id: messageAndOTID,
      threading_id: utils.generateThreadingID(ctx.clientID),
      "ephemeral_ttl_mode:": "0",
      manual_retry_cnt: "0",
      signatureID: utils.getSignatureID(),
    };

    if (replyToMessage) {
      form["replied_to_message_id"] = replyToMessage;
    }

    // Xử lý chuỗi các hàm xử lý tin nhắn
    const processMessage = () => {
      handleLocation(msg, form, callback, function () {
        handleSticker(msg, form, callback, function () {
          handleAttachment(msg, form, callback, function () {
            handleUrl(msg, form, callback, function () {
              handleEmoji(msg, form, callback, function () {
                handleMention(msg, form, callback, function () {
                  send(form, threadID, messageAndOTID, callback, isGroup);
                });
              });
            });
          });
        });
      });
    };

    // Xử lý delay và trạng thái "đang soạn tin nhắn"
    if (delay > 0) {
      // Ngưỡng tối thiểu để hiển thị trạng thái "đang soạn" (500ms)
      const MINIMUM_TYPING_DELAY = 500;

      if (delay >= MINIMUM_TYPING_DELAY) {
        // Gửi trạng thái "đang soạn"
        makeTypingIndicator(true, threadID, (err) => {
          if (err) log.warn("sendTypMqtt", "Failed to send typing indicator: " + err.message);
        });

        // Đợi thời gian delay, sau đó gửi tin nhắn và tắt trạng thái "đang soạn"
        setTimeout(() => {
          processMessage();
          // Tắt trạng thái "đang soạn"
          makeTypingIndicator(false, threadID, (err) => {
            if (err) log.warn("sendTypMqtt", "Failed to stop typing indicator: " + err.message);
          });
        }, delay);
      } else {
        // Nếu delay quá ngắn, chỉ đợi và gửi tin nhắn mà không hiển thị trạng thái "đang soạn"
        setTimeout(processMessage, delay);
      }
    } else {
      // Không có delay, gửi tin nhắn ngay lập tức
      processMessage();
    }

    return returnPromise;
  };
};