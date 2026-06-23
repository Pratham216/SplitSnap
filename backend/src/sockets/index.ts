import { Server } from "socket.io";
import { setIo } from "./io";
import { corsOptions } from "../config/cors";

export function initSocket(httpServer: import("http").Server): Server {
  const io = new Server(httpServer, {
    cors: corsOptions,
  });

  setIo(io);

  io.on("connection", (socket) => {
    socket.on("room:join", (code: string) => {
      if (typeof code === "string" && code.length <= 10) {
        socket.join(code.toUpperCase());
      }
    });

    socket.on("room:leave", (code: string) => {
      if (typeof code === "string") {
        socket.leave(code.toUpperCase());
      }
    });
  });

  return io;
}
