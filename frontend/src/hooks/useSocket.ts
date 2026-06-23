import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

function getSocket(): Socket {
  if (!socket) {
    socket = io({ path: "/socket.io", transports: ["websocket", "polling"] });
  }
  return socket;
}

export function useSocket(
  roomCode: string | undefined,
  handlers: {
    onParticipantJoined?: (participant: unknown) => void;
    onParticipantLeft?: (data: { id: string; guestId: string }) => void;
    onItemSelectionChanged?: (data: {
      itemId: string;
      guestId: string;
      participantName: string;
      quantity: number;
    }) => void;
    onPaymentMarked?: (data: {
      guestId: string;
      participantName: string;
    }) => void;
    onUpiUpdated?: (data: { hostUpiId: string }) => void;
  }
) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    if (!roomCode) return;

    const s = getSocket();
    const code = roomCode.toUpperCase();
    s.emit("room:join", code);

    const onJoin = (p: unknown) => handlersRef.current.onParticipantJoined?.(p);
    const onLeave = (d: { id: string; guestId: string }) =>
      handlersRef.current.onParticipantLeft?.(d);
    const onSelection = (d: {
      itemId: string;
      guestId: string;
      participantName: string;
      quantity: number;
    }) => handlersRef.current.onItemSelectionChanged?.(d);
    const onPayment = (d: { guestId: string; participantName: string }) =>
      handlersRef.current.onPaymentMarked?.(d);
    const onUpi = (d: { hostUpiId: string }) =>
      handlersRef.current.onUpiUpdated?.(d);

    s.on("participant:joined", onJoin);
    s.on("participant:left", onLeave);
    s.on("item:selection-changed", onSelection);
    s.on("payment:marked", onPayment);
    s.on("room:upi-updated", onUpi);

    return () => {
      s.off("participant:joined", onJoin);
      s.off("participant:left", onLeave);
      s.off("item:selection-changed", onSelection);
      s.off("payment:marked", onPayment);
      s.off("room:upi-updated", onUpi);
      s.emit("room:leave", code);
    };
  }, [roomCode]);
}
