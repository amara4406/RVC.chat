// =========================================================
// RVC.CHAT — WEBRTC SIGNALING SERVER
// 2-USER VOICE CHAT
// =========================================================

const WebSocket = require("ws");

const PORT = 3000;

const wss = new WebSocket.Server({
    port: PORT
});

const rooms = new Map();

console.log("========================================");
console.log("🎙️  RVC.CHAT VOICE SERVER");
console.log("========================================");
console.log(`🔊 WebSocket server running on port ${PORT}`);
console.log(`🌐 ws://localhost:${PORT}`);
console.log("========================================");

wss.on("connection", function (ws) {

    console.log("🔗 New browser connected");

    let roomId = null;

    ws.on("message", function (message) {

        let data;

        try {
            data = JSON.parse(message.toString());
        } catch (error) {
            console.log("❌ Invalid message received");
            return;
        }

        // ================================================
        // JOIN ROOM
        // ================================================

        if (data.type === "join") {

            roomId = data.room;

            if (!rooms.has(roomId)) {
                rooms.set(roomId, new Set());
            }

            const room = rooms.get(roomId);

            // Only allow 2 people in one voice room
            if (room.size >= 2) {

                ws.send(JSON.stringify({
                    type: "full"
                }));

                console.log(`🚫 Room ${roomId} is full`);

                return;
            }

            room.add(ws);

            console.log(
                `👤 User joined room ${roomId} (${room.size}/2)`
            );

            // First user waits
            if (room.size === 1) {

                ws.send(JSON.stringify({
                    type: "waiting"
                }));

                console.log("⏳ Waiting for second user...");

            }

            // Second user joins
            else if (room.size === 2) {

                ws.send(JSON.stringify({
                    type: "ready",
                    initiator: false
                }));

                // Tell first user to create the offer
                for (const peer of room) {

                    if (
                        peer !== ws &&
                        peer.readyState === WebSocket.OPEN
                    ) {

                        peer.send(JSON.stringify({
                            type: "ready",
                            initiator: true
                        }));

                    }

                }

                console.log("🎉 Two users connected!");
            }

            return;
        }

        // ================================================
        // RELAY WEBRTC SIGNALING DATA
        // ================================================

        if (!roomId || !rooms.has(roomId)) {
            return;
        }

        const room = rooms.get(roomId);

        for (const peer of room) {

            if (
                peer !== ws &&
                peer.readyState === WebSocket.OPEN
            ) {

                peer.send(JSON.stringify(data));

            }

        }

    });

    // ================================================
    // USER DISCONNECTED
    // ================================================

    ws.on("close", function () {

        console.log("🔌 Browser disconnected");

        if (!roomId || !rooms.has(roomId)) {
            return;
        }

        const room = rooms.get(roomId);

        room.delete(ws);

        // Tell remaining user
        for (const peer of room) {

            if (peer.readyState === WebSocket.OPEN) {

                peer.send(JSON.stringify({
                    type: "peer-left"
                }));

            }

        }

        // Delete empty room
        if (room.size === 0) {

            rooms.delete(roomId);

            console.log(`🗑️ Room ${roomId} deleted`);

        }

    });

});