const express = require("express");
const app = express();

// moment(js에서 dates를 다루기 위한 library)
const moment = require("moment");
// h:mm A 하면 09:16 PM 이런 형식으로 나옴
// YYYY-MM-DD 하면
console.log(moment(new Date()).format("h:mm a"));
console.log(moment(new Date()).format("YYYY-MM-DD"));
console.log(moment(new Date()).format("MMMM D"));

// file upload
const multer = require("multer");
const path = require("path");
const upload = multer({
  storage: multer.diskStorage({
    destination(req, file, done) {
      done(null, "uploads/");
    },
    filename(req, file, done) {
      const ext = path.extname(file.originalname);
      done(null, myId + ext);
      // ? 질문 저거를 socket.id라고 해서 했을 때는 브라우저를 새로고침 여러 창에서 할 때 마지막으로 새로고침한 socket.id로 저장됨 이유가 뭘까?
      // done(nul, req.body.name + ext);
      // done(null, path.basename(file.originalname, ext) + Date.now() + ext);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
});
const port = 8000;

let http = require("http").Server(app);
let io = require("socket.io")(http);

app.set("view engine", "ejs");

app.use("/static", express.static("static"));
app.use("/static", express.static("public"));
app.use("/uploads", express.static("uploads"));

app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// mini-project start
app.get("/chat", (req, res) => {
  res.render("chat");
});

// file upload
app.post("/dynamicFile", upload.single("photo"), (req, res) => {
  console.log(req.file);
  res.send("업로드");
});

// client가 ejs파일에서 let socket = io.connect() 처럼 연결하려고 할 때 io.on이벤트 발생
// server와 client는 1:1 독대가 아님.
// client마다 socket id가 하나씩 부여되고 socket의 정보도 다름
// 각 client의 socket 정보가 function(socket)의 socket에 담긴다.
// 본인(client)의 socket정보를 걸어두는 것
let myId;
let client_list = {};
// socket관련
io.on("connection", function (socket) {
  socket.on("setNickname", (nickname) => {
    // 본인이 보내고 싶은 client의 id를 to 앞에 쓰면 해당하는 client
    if (Object.values(client_list).indexOf(nickname) > -1) {
      socket.emit("err", "중복되는 닉네임입니다.");
    } else {
      client_list[socket.id] = nickname;
      myId = socket.id;
      console.log(client_list);
      console.log(client_list[socket.id]);
      console.log(myId);
      io.emit("chat-notice", `${nickname}님이 입장했습니다.`);
      socket.emit("entrySuccess", client_list[socket.id], socket.id);

      io.emit("clientUpdate", client_list);
    }
  });

  socket.on("sendMsg", (data) => {
    console.log(socket.id);
    let chatData = {
      userId: socket.id,
      msg: data.chatMsg,
      nickname: client_list[socket.id],
      time: moment(new Date()).format("h:mm A"),
      date: moment(new Date()).format("MMMM D"),
    };
    if (data.dm == "all") {
      io.emit("sendAll", chatData, "all");
    } else {
      io.to(data.dm).emit("sendAll", chatData, "dm");
      socket.emit("sendAll", chatData, "dm");
    }
    // io.emit("sendAll", chatMsg, client_list[socket.id]);
  });

  socket.on("disconnect", () => {
    io.emit("chat-notice", `${client_list[socket.id]}님이 퇴장했습니다.`);
    delete client_list[socket.id];
    io.emit("clientUpdate", client_list);
  });
});

http.listen(port, () => {
  console.log("Server Port : ", port);
});
