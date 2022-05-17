require("dotenv").config();
const express = require("express");
const bp = require("body-parser");

const cors = require("cors");

// import this
const http = require("http");
const { Server } = require("socket.io");

// Get routes to the variabel
const router = require("./src/routes");

const app = express();

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL, // define client origin if both client and server have different origin
  },
});

require("./src/socket")(io);

const port = process.env.PORT || 5000;

app.use(express.json());
app.use(bp.json());

app.use(bp.urlencoded({ extended: true }));

// Add endpoint grouping and router
app.use("/api/v1/", router);
app.use("/uploads", express.static("uploads"));
app.use(cors());

app.get('/', function (req, res) {
  res.send({
    message: 'Hello World',
  });
});

server.listen(port, () => console.log(`Listening on port ${port}!`));
