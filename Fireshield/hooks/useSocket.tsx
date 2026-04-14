import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { SERVER_URL } from "@/constants/server";

export type SensorReading = {
  device: string;
  temperature: number | null;
  humidity: number | null;
  flame: number;
  gasDigital: number;
  gasAnalog: number;
  receivedAt: string;
};

export type AlertPayload = {
  type: "flame" | "gas";
  title: string;
  message: string;
  triggeredAt: string;
};

type SocketCtx = {
  connected: boolean;
  reading: SensorReading | null;
  alert: AlertPayload | null;
  dismissAlert: () => void;
};

const Ctx = createContext<SocketCtx>({
  connected: false, reading: null, alert: null, dismissAlert: () => {},
});

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [reading,   setReading]   = useState<SensorReading | null>(null);
  const [alert,     setAlert]     = useState<AlertPayload | null>(null);

  useEffect(() => {
    const socket = io(SERVER_URL, { transports: ["websocket"], reconnectionAttempts: 20 });
    socketRef.current = socket;

    socket.on("connect",     () => { setConnected(true);  console.log("🔌 Socket connected"); });
    socket.on("disconnect",  () =>   setConnected(false));
    socket.on("sensor_data", (d: SensorReading) => setReading(d));
    socket.on("alert",       (d: AlertPayload)  => {
      setAlert((prev) => {
        if (prev) return prev; // Keep the ongoing first one, ignore new ones
        return d;
      });
    });
    return () => { socket.disconnect(); };
  }, []);

  return (
    <Ctx.Provider value={{ connected, reading, alert, dismissAlert: () => setAlert(null) }}>
      {children}
    </Ctx.Provider>
  );
}

export function useSocket() {
  return useContext(Ctx);
}
