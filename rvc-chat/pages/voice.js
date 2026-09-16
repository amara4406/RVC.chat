/* =========================================================
   RVC.CHAT — VOICE CHAT SYSTEM
   =========================================================

   ECHO-REDUCED VERSION

   Main audio protections:
   - Browser echo cancellation
   - Noise suppression
   - Automatic gain control
   - Mono microphone
   - No local microphone playback
   - Remote audio isolated from local microphone
   - Remote audio volume controlled safely
   ========================================================= */


/* =========================================================
   GLOBAL STATE
   ========================================================= */

let localStream = null;
let peerConnection = null;
let socket = null;

let voiceStarted = false;
let microphoneEnabled = false;
let voiceRoomActive = false;

let selectedVoiceFriend = null;

let remoteStream = null;

let voiceTimerInterval = null;
let voiceRoomStartTime = null;

let isSpeakerEnabled = true;

let iceCandidateQueue = [];
let remoteDescriptionSet = false;

let voiceConnectionReady = false;


/* =========================================================
   CONFIGURATION
   ========================================================= */

const ROOM_ID = "rvc-test-room";

const SIGNALING_SERVER = "ws://localhost:3000";


/* =========================================================
   AUDIO CONFIGURATION
   ========================================================= */

const MICROPHONE_CONSTRAINTS = {

    audio: {

        echoCancellation: {
            ideal: true
        },

        noiseSuppression: {
            ideal: true
        },

        autoGainControl: {
            ideal: true
        },

        channelCount: {
            ideal: 1
        },

        sampleRate: {
            ideal: 48000
        },

        sampleSize: {
            ideal: 16
        }

    },

    video: false

};


/* =========================================================
   DOM READY
   ========================================================= */

document.addEventListener("DOMContentLoaded", function () {

    console.log(
        "🎙️ RVC.CHAT voice system loaded."
    );

    initializeVoiceSystem();

});


/* =========================================================
   INITIALIZE VOICE SYSTEM
   ========================================================= */

function initializeVoiceSystem() {

    console.log(
        "🎙️ Initializing RVC.CHAT voice system..."
    );


    /* ---------------------------------------------------------
       MICROPHONE BUTTON
       --------------------------------------------------------- */

    const microphoneButton =
        document.getElementById(
            "voiceMicButton"
        );


    if (microphoneButton) {

        microphoneButton.addEventListener(
            "click",
            function (event) {

                event.preventDefault();
                event.stopPropagation();

                console.log(
                    "🎙️ Microphone button clicked."
                );

                toggleMicrophone();

            }
        );

    }

    else {

        console.warn(
            "⚠️ #voiceMicButton was not found."
        );

    }


    /* ---------------------------------------------------------
       SPEAKER BUTTON
       --------------------------------------------------------- */

    const speakerButton =
        document.getElementById(
            "speakerButton"
        );


    if (speakerButton) {

        speakerButton.addEventListener(
            "click",
            function (event) {

                event.preventDefault();
                event.stopPropagation();

                toggleSpeaker();

            }
        );

    }


    /* ---------------------------------------------------------
       END VOICE BUTTON
       --------------------------------------------------------- */

    const endButton =
        document.getElementById(
            "endVoiceButton"
        );


    if (endButton) {

        endButton.addEventListener(
            "click",
            function (event) {

                event.preventDefault();
                event.stopPropagation();

                endVoiceChat();

            }
        );

    }


    /* ---------------------------------------------------------
       INITIAL MICROPHONE UI
       --------------------------------------------------------- */

    setMicrophoneUI(false);


    /* ---------------------------------------------------------
       WATCH VOICE ROOM
       --------------------------------------------------------- */

    observeVoiceRoom();


    /* ---------------------------------------------------------
       INITIAL STATUS
       --------------------------------------------------------- */

    updateVoiceRoomStatus(
        "Ready",
        "Voice room ready"
    );


    console.log(
        "✅ Voice system initialized."
    );

}


/* =========================================================
   WATCH FOR VOICE ROOM
   ========================================================= */

function observeVoiceRoom() {

    const voiceRoom =
        document.getElementById(
            "voiceRoom"
        );


    if (!voiceRoom) {

        console.warn(
            "⚠️ #voiceRoom was not found."
        );

        return;

    }


    /*
     * Watch for the room being shown/hidden.
     */

    const observer =
        new MutationObserver(
            function () {

                const isHidden =
                    voiceRoom.classList.contains(
                        "hidden"
                    );


                /* -------------------------------------------------
                   ROOM OPENED
                   ------------------------------------------------- */

                if (
                    !isHidden &&
                    !voiceRoomActive
                ) {

                    console.log(
                        "🎧 Voice room opened."
                    );


                    voiceRoomActive = true;


                    startVoiceRoom();

                }


                /* -------------------------------------------------
                   ROOM CLOSED
                   ------------------------------------------------- */

                if (
                    isHidden &&
                    voiceRoomActive
                ) {

                    console.log(
                        "🚪 Voice room closed."
                    );


                    cleanupVoiceRoom();

                    voiceRoomActive = false;

                }

            }
        );


    observer.observe(
        voiceRoom,
        {
            attributes: true,
            attributeFilter: ["class"]
        }
    );


    /*
     * IMPORTANT:
     *
     * The current friends.html has the voice room visible
     * immediately when the page loads.
     *
     * Therefore we must check the initial state manually.
     */

    const isInitiallyHidden =
        voiceRoom.classList.contains(
            "hidden"
        );


    if (
        !isInitiallyHidden &&
        !voiceRoomActive
    ) {

        console.log(
            "🎧 Voice room already visible on page load."
        );


        voiceRoomActive = true;


        startVoiceRoom();

    }

}


/* =========================================================
   START VOICE ROOM
   ========================================================= */

async function startVoiceRoom() {

    console.log(
        "🎧 Starting voice room..."
    );


    voiceStarted = false;
    microphoneEnabled = false;

    remoteDescriptionSet = false;

    iceCandidateQueue = [];

    voiceConnectionReady = false;


    startVoiceTimer();


    updateVoiceRoomStatus(
        "Connecting",
        "Preparing voice room..."
    );


    /*
     * Prepare remote audio before connection starts.
     */

    prepareRemoteAudio();


    /*
     * Connect to signaling server.
     *
     * IMPORTANT:
     *
     * The microphone must still work even if the
     * signaling server is unavailable.
     */

    try {

        await connectToSignalingServer();

        console.log(
            "✅ Voice signaling ready."
        );

    }

    catch (error) {

        console.warn(
            "⚠️ Voice signaling server unavailable.",
            error
        );


        /*
         * Do NOT stop the microphone system.
         *
         * The user can still turn their microphone on.
         */

        updateVoiceRoomStatus(
            "Ready",
            "Microphone ready"
        );

    }

}


/* =========================================================
   PREPARE REMOTE AUDIO
   ========================================================= */

function prepareRemoteAudio() {

    const remoteAudio =
        document.getElementById(
            "remoteAudio"
        );


    if (!remoteAudio) {

        console.warn(
            "⚠️ #remoteAudio was not found."
        );

        return;

    }


    /*
     * Remote audio is ONLY for audio received
     * from another user.
     */

    remoteAudio.autoplay = true;

    remoteAudio.playsInline = true;

    remoteAudio.loop = false;

    remoteAudio.volume =
        isSpeakerEnabled
            ? 1
            : 0;

    remoteAudio.muted = false;


    /*
     * NEVER assign localStream here.
     */

}


/* =========================================================
   MICROPHONE TOGGLE
   ========================================================= */

async function toggleMicrophone() {

    console.log(
        "🎙️ toggleMicrophone() called."
    );


    /*
     * Existing microphone stream.
     */

    if (localStream) {

        console.log(
            "🎙️ Existing microphone stream found."
        );


        if (microphoneEnabled) {

            console.log(
                "🔇 Turning microphone OFF."
            );

            muteMicrophone();

        }

        else {

            console.log(
                "🟢 Turning microphone ON."
            );

            unmuteMicrophone();

        }


        return;

    }


    /*
     * First microphone activation.
     */

    console.log(
        "🎙️ Starting microphone for the first time..."
    );


    await startMicrophone();

}


/* =========================================================
   START MICROPHONE
   ========================================================= */

async function startMicrophone() {

    if (microphoneEnabled) {

        console.log(
            "🎙️ Microphone is already active."
        );

        return;

    }


    /*
     * Browser support check.
     */

    if (
        !navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia
    ) {

        console.error(
            "❌ getUserMedia is not supported by this browser."
        );


        updateVoiceRoomStatus(
            "Microphone",
            "Microphone not supported"
        );


        alert(
            "🎙️ Your browser does not support microphone access."
        );


        return;

    }


    try {

        updateVoiceRoomStatus(
            "Microphone",
            "Requesting microphone..."
        );


        console.log(
            "🎙️ Requesting microphone with echo cancellation..."
        );


        /*
         * Request microphone.
         */

        localStream =
            await navigator.mediaDevices.getUserMedia(
                MICROPHONE_CONSTRAINTS
            );


        console.log(
            "🎙️ Microphone permission granted."
        );


        /*
         * Inspect microphone tracks.
         */

        const audioTracks =
            localStream.getAudioTracks();


        if (
            !audioTracks ||
            audioTracks.length === 0
        ) {

            throw new Error(
                "No microphone audio track was returned."
            );

        }


        audioTracks.forEach(
            function (track) {

                track.enabled = true;


                console.log(
                    "🎤 Microphone track:",
                    track.label
                );


                if (track.getSettings) {

                    console.log(
                        "🎛️ Microphone settings:",
                        track.getSettings()
                    );

                }

            }
        );


        /*
         * Microphone is now active.
         */

        microphoneEnabled = true;

        voiceStarted = true;


        /*
         * IMPORTANT:
         *
         * Never put localStream into remoteAudio.
         *
         * This prevents the user from hearing their
         * own microphone through the speakers.
         */

        const remoteAudio =
            document.getElementById(
                "remoteAudio"
            );


        if (remoteAudio) {

            if (
                remoteAudio.srcObject ===
                localStream
            ) {

                remoteAudio.pause();

                remoteAudio.srcObject = null;

            }

        }


        /*
         * If WebRTC already exists, add the microphone.
         */

        if (peerConnection) {

            addLocalTracksToPeerConnection();

        }


        /*
         * Update interface.
         */

        setMicrophoneUI(true);


        updateVoiceRoomStatus(
            "Live",
            "Microphone is live"
        );


        startVoiceVisualizer();


        console.log(
            "🟢 MICROPHONE LIVE — echo cancellation enabled."
        );


        /*
         * If a voice connection is already ready,
         * renegotiate so the remote user receives
         * the newly-added microphone track.
         */

        if (
            peerConnection &&
            voiceConnectionReady
        ) {

            await renegotiateConnection();

        }

    }

    catch (error) {

        console.error(
            "❌ Microphone error:",
            error
        );


        /*
         * Clean up failed stream.
         */

        if (localStream) {

            localStream
                .getTracks()
                .forEach(
                    function (track) {

                        track.stop();

                    }
                );

        }


        localStream = null;

        microphoneEnabled = false;

        voiceStarted = false;


        setMicrophoneUI(false);


        updateVoiceRoomStatus(
            "Microphone",
            "Microphone unavailable"
        );


        handleMicrophoneError(error);

    }

}


/* =========================================================
   MUTE MICROPHONE
   ========================================================= */

function muteMicrophone() {

    if (!localStream) {

        return;

    }


    const tracks =
        localStream.getAudioTracks();


    tracks.forEach(
        function (track) {

            track.enabled = false;

        }
    );


    microphoneEnabled = false;


    setMicrophoneUI(false);


    updateVoiceRoomStatus(
        "Muted",
        "Microphone muted"
    );


    stopVoiceVisualizer();


    console.log(
        "🔇 Microphone muted."
    );

}


/* =========================================================
   UNMUTE MICROPHONE
   ========================================================= */

function unmuteMicrophone() {

    if (!localStream) {

        return;

    }


    const tracks =
        localStream.getAudioTracks();


    tracks.forEach(
        function (track) {

            track.enabled = true;

        }
    );


    microphoneEnabled = true;


    voiceStarted = true;


    setMicrophoneUI(true);


    updateVoiceRoomStatus(
        "Live",
        "Microphone is live"
    );


    startVoiceVisualizer();


    console.log(
        "🟢 Microphone unmuted."
    );

}


/* =========================================================
   MICROPHONE UI
   ========================================================= */

function setMicrophoneUI(isLive) {

    const button =
        document.getElementById(
            "voiceMicButton"
        );


    const icon =
        document.getElementById(
            "voiceMicIcon"
        );


    const statusText =
        document.getElementById(
            "voiceMicStatusText"
        );


    const statusDot =
        document.getElementById(
            "voiceMicStatusDot"
        );


    if (!button) {

        console.warn(
            "⚠️ #voiceMicButton not found while updating UI."
        );

        return;

    }


    if (isLive) {

        button.classList.remove(
            "is-muted"
        );


        button.classList.add(
            "is-live"
        );


        button.setAttribute(
            "aria-pressed",
            "true"
        );


        button.setAttribute(
            "aria-label",
            "Mute microphone"
        );


        button.setAttribute(
            "title",
            "Mute microphone"
        );


        if (icon) {

            icon.className =
                "fa-solid fa-microphone";

        }


        if (statusText) {

            statusText.textContent =
                "Microphone live";

        }


        if (statusDot) {

            statusDot.classList.add(
                "is-live"
            );

        }

    }

    else {

        button.classList.remove(
            "is-live"
        );


        button.classList.add(
            "is-muted"
        );


        button.setAttribute(
            "aria-pressed",
            "false"
        );


        button.setAttribute(
            "aria-label",
            "Turn microphone on"
        );


        button.setAttribute(
            "title",
            "Turn microphone on"
        );


        if (icon) {

            icon.className =
                "fa-solid fa-microphone-slash";

        }


        if (statusText) {

            statusText.textContent =
                "Microphone off";

        }


        if (statusDot) {

            statusDot.classList.remove(
                "is-live"
            );

        }

    }

}


/* =========================================================
   CONNECT TO SIGNALING SERVER
   ========================================================= */

function connectToSignalingServer() {

    return new Promise(
        function (resolve, reject) {

            try {

                /*
                 * Already connected.
                 */

                if (
                    socket &&
                    socket.readyState ===
                        WebSocket.OPEN
                ) {

                    resolve();

                    return;

                }


                console.log(
                    "🌐 Connecting to:",
                    SIGNALING_SERVER
                );


                socket =
                    new WebSocket(
                        SIGNALING_SERVER
                    );


                socket.onopen =
                    function () {

                        console.log(
                            "🌐 Connected to RVC.CHAT signaling server."
                        );


                        socket.send(
                            JSON.stringify({

                                type: "join",

                                room: ROOM_ID

                            })
                        );


                        console.log(
                            "🚪 Joined room:",
                            ROOM_ID
                        );


                        resolve();

                    };


                socket.onerror =
                    function (error) {

                        console.error(
                            "❌ WebSocket error:",
                            error
                        );


                        updateVoiceRoomStatus(
                            "Offline",
                            "Voice server unavailable"
                        );


                        reject(error);

                    };


                socket.onclose =
                    function () {

                        console.log(
                            "🔌 Voice signaling connection closed."
                        );


                        voiceConnectionReady =
                            false;


                        /*
                         * Do not destroy the microphone
                         * just because signaling closed.
                         */

                        if (microphoneEnabled) {

                            updateVoiceRoomStatus(
                                "Live",
                                "Microphone is live"
                            );

                        }

                        else {

                            updateVoiceRoomStatus(
                                "Disconnected",
                                "Voice connection closed"
                            );

                        }

                    };


                socket.onmessage =
                    handleSignalingMessage;

            }

            catch (error) {

                reject(error);

            }

        }
    );

}


/* =========================================================
   SIGNALING MESSAGE
   ========================================================= */

async function handleSignalingMessage(event) {

    let data;


    try {

        data =
            JSON.parse(
                event.data
            );

    }

    catch (error) {

        console.error(
            "❌ Invalid signaling message:",
            error
        );

        return;

    }


    console.log(
        "📨 Signal:",
        data.type
    );


    /* =====================================================
       READY
       ===================================================== */

    if (
        data.type ===
        "ready"
    ) {

        console.log(
            "👥 Another user is ready."
        );


        voiceConnectionReady =
            true;


        updateVoiceRoomStatus(
            "Connected",
            "Voice room connected"
        );


        if (data.initiator) {

            await createOffer();

        }


        return;

    }


    /* =====================================================
       OFFER
       ===================================================== */

    if (
        data.type ===
        "offer"
    ) {

        console.log(
            "📥 WebRTC offer received."
        );


        try {

            await ensurePeerConnection();


            await peerConnection.setRemoteDescription(
                new RTCSessionDescription(
                    data.offer
                )
            );


            remoteDescriptionSet =
                true;


            await flushIceCandidates();


            const answer =
                await peerConnection.createAnswer();


            await peerConnection.setLocalDescription(
                answer
            );


            sendSignal({

                type: "answer",

                answer: answer

            });


            console.log(
                "📤 WebRTC answer sent."
            );

        }

        catch (error) {

            console.error(
                "❌ Offer handling failed:",
                error
            );

        }


        return;

    }


    /* =====================================================
       ANSWER
       ===================================================== */

    if (
        data.type ===
        "answer"
    ) {

        console.log(
            "📥 WebRTC answer received."
        );


        try {

            if (!peerConnection) {

                return;

            }


            await peerConnection.setRemoteDescription(
                new RTCSessionDescription(
                    data.answer
                )
            );


            remoteDescriptionSet =
                true;


            await flushIceCandidates();


            console.log(
                "✅ WebRTC connection established."
            );


            updateVoiceRoomStatus(
                "Connected",
                "Voice connection active"
            );

        }

        catch (error) {

            console.error(
                "❌ Answer handling failed:",
                error
            );

        }


        return;

    }


    /* =====================================================
       ICE CANDIDATE
       ===================================================== */

    if (
        data.type ===
        "ice-candidate"
    ) {

        if (!peerConnection) {

            return;

        }


        try {

            const candidate =
                new RTCIceCandidate(
                    data.candidate
                );


            if (!remoteDescriptionSet) {

                iceCandidateQueue.push(
                    candidate
                );


                console.log(
                    "🧊 ICE candidate queued."
                );


                return;

            }


            await peerConnection.addIceCandidate(
                candidate
            );


            console.log(
                "🧊 ICE candidate added."
            );

        }

        catch (error) {

            console.error(
                "❌ ICE candidate error:",
                error
            );

        }


        return;

    }

}


/* =========================================================
   CREATE WEBRTC OFFER
   ========================================================= */

async function createOffer() {

    try {

        await ensurePeerConnection();


        addLocalTracksToPeerConnection();


        const offer =
            await peerConnection.createOffer();


        await peerConnection.setLocalDescription(
            offer
        );


        sendSignal({

            type: "offer",

            offer: offer

        });


        console.log(
            "📤 WebRTC offer sent."
        );

    }

    catch (error) {

        console.error(
            "❌ Could not create offer:",
            error
        );

    }

}


/* =========================================================
   CREATE PEER CONNECTION
   ========================================================= */

async function ensurePeerConnection() {

    if (peerConnection) {

        return peerConnection;

    }


    peerConnection =
        new RTCPeerConnection({

            iceServers: [

                {
                    urls:
                        "stun:stun.l.google.com:19302"
                }

            ]

        });


    console.log(
        "🔗 RTCPeerConnection created."
    );


    /* =====================================================
       LOCAL ICE
       ===================================================== */

    peerConnection.onicecandidate =
        function (event) {

            if (
                event.candidate &&
                socket &&
                socket.readyState ===
                    WebSocket.OPEN
            ) {

                sendSignal({

                    type: "ice-candidate",

                    candidate:
                        event.candidate

                });


                console.log(
                    "🧊 ICE candidate sent."
                );

            }

        };


    /* =====================================================
       REMOTE TRACK
       ===================================================== */

    peerConnection.ontrack =
        function (event) {

            console.log(
                "🔊 Remote audio received."
            );


            if (
                event.streams &&
                event.streams[0]
            ) {

                remoteStream =
                    event.streams[0];


                const remoteAudio =
                    document.getElementById(
                        "remoteAudio"
                    );


                if (remoteAudio) {

                    /*
                     * ONLY remote stream goes here.
                     */

                    remoteAudio.srcObject =
                        remoteStream;


                    remoteAudio.muted =
                        false;


                    remoteAudio.volume =
                        isSpeakerEnabled
                            ? 1
                            : 0;


                    remoteAudio.play()
                        .then(
                            function () {

                                console.log(
                                    "🔊 Remote audio playing."
                                );

                            }
                        )
                        .catch(
                            function (error) {

                                console.warn(
                                    "⚠️ Browser blocked remote audio:",
                                    error
                                );

                            }
                        );

                }

            }

        };


    /* =====================================================
       CONNECTION STATE
       ===================================================== */

    peerConnection.onconnectionstatechange =
        function () {

            if (!peerConnection) {

                return;

            }


            const state =
                peerConnection.connectionState;


            console.log(
                "🔗 WebRTC state:",
                state
            );


            if (
                state ===
                "connected"
            ) {

                updateVoiceRoomStatus(
                    "Connected",
                    "Voice connection active"
                );

            }


            if (
                state ===
                "connecting"
            ) {

                updateVoiceRoomStatus(
                    "Connecting",
                    "Connecting..."
                );

            }


            if (
                state ===
                    "disconnected" ||
                state ===
                    "failed"
            ) {

                if (microphoneEnabled) {

                    updateVoiceRoomStatus(
                        "Live",
                        "Microphone is live"
                    );

                }

                else {

                    updateVoiceRoomStatus(
                        "Disconnected",
                        "Voice connection interrupted"
                    );

                }

            }

        };


    /* =====================================================
       ICE CONNECTION STATE
       ===================================================== */

    peerConnection.oniceconnectionstatechange =
        function () {

            if (!peerConnection) {

                return;

            }


            console.log(
                "🧊 ICE state:",
                peerConnection.iceConnectionState
            );

        };


    /*
     * If microphone already exists,
     * attach it immediately.
     */

    addLocalTracksToPeerConnection();


    return peerConnection;

}


/* =========================================================
   ADD LOCAL TRACKS
   ========================================================= */

function addLocalTracksToPeerConnection() {

    if (
        !peerConnection ||
        !localStream
    ) {

        return;

    }


    const existingSenders =
        peerConnection.getSenders();


    localStream
        .getTracks()
        .forEach(
            function (track) {

                const alreadyAdded =
                    existingSenders.some(
                        function (sender) {

                            return (
                                sender.track ===
                                track
                            );

                        }
                    );


                if (!alreadyAdded) {

                    peerConnection.addTrack(
                        track,
                        localStream
                    );


                    console.log(
                        "🎧 Local audio track added."
                    );

                }

            }
        );

}


/* =========================================================
   RENEGOTIATE
   ========================================================= */

async function renegotiateConnection() {

    if (
        !peerConnection ||
        !voiceConnectionReady
    ) {

        return;

    }


    try {

        const offer =
            await peerConnection.createOffer();


        await peerConnection.setLocalDescription(
            offer
        );


        sendSignal({

            type: "offer",

            offer: offer

        });


        console.log(
            "📤 Connection renegotiated."
        );

    }

    catch (error) {

        console.error(
            "❌ Renegotiation failed:",
            error
        );

    }

}


/* =========================================================
   SEND SIGNAL
   ========================================================= */

function sendSignal(data) {

    if (
        !socket ||
        socket.readyState !==
            WebSocket.OPEN
    ) {

        console.warn(
            "⚠️ Cannot send signal. Socket not open."
        );


        return false;

    }


    socket.send(
        JSON.stringify(data)
    );


    return true;

}


/* =========================================================
   FLUSH ICE QUEUE
   ========================================================= */

async function flushIceCandidates() {

    if (!peerConnection) {

        return;

    }


    if (!remoteDescriptionSet) {

        return;

    }


    while (
        iceCandidateQueue.length > 0
    ) {

        const candidate =
            iceCandidateQueue.shift();


        try {

            await peerConnection.addIceCandidate(
                candidate
            );


            console.log(
                "🧊 Queued ICE candidate added."
            );

        }

        catch (error) {

            console.error(
                "❌ Queued ICE candidate failed:",
                error
            );

        }

    }

}


/* =========================================================
   SPEAKER TOGGLE
   ========================================================= */

function toggleSpeaker() {

    const remoteAudio =
        document.getElementById(
            "remoteAudio"
        );


    const speakerButton =
        document.getElementById(
            "speakerButton"
        );


    isSpeakerEnabled =
        !isSpeakerEnabled;


    if (remoteAudio) {

        remoteAudio.volume =
            isSpeakerEnabled
                ? 1
                : 0;

    }


    if (speakerButton) {

        speakerButton.classList.toggle(
            "is-muted",
            !isSpeakerEnabled
        );


        speakerButton.setAttribute(
            "aria-label",
            isSpeakerEnabled
                ? "Mute speaker"
                : "Turn speaker on"
        );

    }


    console.log(
        isSpeakerEnabled
            ? "🔊 Speaker on."
            : "🔇 Speaker muted."
    );

}


/* =========================================================
   MICROPHONE ERROR HANDLING
   ========================================================= */

function handleMicrophoneError(error) {

    console.error(
        "🎙️ Microphone error name:",
        error ? error.name : "unknown"
    );


    if (
        error &&
        (
            error.name ===
                "NotAllowedError" ||

            error.name ===
                "PermissionDeniedError"
        )
    ) {

        alert(
            "🎙️ RVC.chat needs microphone permission.\n\n" +
            "Please click Allow in your browser's microphone permission prompt, then press the microphone button again."
        );


        return;

    }


    if (
        error &&
        error.name ===
            "NotFoundError"
    ) {

        alert(
            "🎙️ No microphone was found.\n\n" +
            "Connect a microphone and try again."
        );


        return;

    }


    if (
        error &&
        error.name ===
            "NotReadableError"
    ) {

        alert(
            "🎙️ Your microphone could not be accessed.\n\n" +
            "Another application may already be using it."
        );


        return;

    }


    if (
        error &&
        error.name ===
            "SecurityError"
    ) {

        alert(
            "🔒 Your browser blocked microphone access.\n\n" +
            "Check the browser microphone permission for RVC.chat."
        );


        return;

    }


    alert(
        "❌ RVC.chat could not access your microphone.\n\n" +
        "Please check your microphone and browser permissions."
    );

}


/* =========================================================
   VOICE ROOM STATUS
   ========================================================= */

function updateVoiceRoomStatus(
    status,
    connectionText
) {

    const statusElement =
        document.getElementById(
            "voiceRoomStatus"
        );


    const connectionElement =
        document.getElementById(
            "voiceConnectionText"
        );


    const activityElement =
        document.getElementById(
            "voiceActivityLabel"
        );


    if (statusElement) {

        statusElement.textContent =
            status;

    }


    if (connectionElement) {

        connectionElement.textContent =
            connectionText;

    }


    if (activityElement) {

        if (
            status ===
            "Live"
        ) {

            activityElement.textContent =
                "LIVE";

        }

        else if (
            status ===
            "Muted"
        ) {

            activityElement.textContent =
                "MUTED";

        }

        else if (
            status ===
            "Connected"
        ) {

            activityElement.textContent =
                "CONNECTED";

        }

        else {

            activityElement.textContent =
                "WAITING";

        }

    }

}


/* =========================================================
   VOICE TIMER
   ========================================================= */

function startVoiceTimer() {

    stopVoiceTimer();


    voiceRoomStartTime =
        Date.now();


    const timer =
        document.getElementById(
            "roomTimer"
        );


    if (!timer) {

        return;

    }


    timer.textContent =
        "00:00";


    voiceTimerInterval =
        setInterval(
            function () {

                const elapsed =
                    Date.now() -
                    voiceRoomStartTime;


                const seconds =
                    Math.floor(
                        elapsed / 1000
                    );


                const minutes =
                    Math.floor(
                        seconds / 60
                    );


                const remainingSeconds =
                    seconds % 60;


                timer.textContent =
                    String(
                        minutes
                    ).padStart(
                        2,
                        "0"
                    )
                    +
                    ":"
                    +
                    String(
                        remainingSeconds
                    ).padStart(
                        2,
                        "0"
                    );

            },
            1000
        );

}


/* =========================================================
   STOP TIMER
   ========================================================= */

function stopVoiceTimer() {

    if (voiceTimerInterval) {

        clearInterval(
            voiceTimerInterval
        );


        voiceTimerInterval =
            null;

    }

}


/* =========================================================
   VISUALIZER ON
   ========================================================= */

function startVoiceVisualizer() {

    const wave =
        document.getElementById(
            "voiceWave"
        );


    if (wave) {

        wave.classList.add(
            "voice-active"
        );

    }

}


/* =========================================================
   VISUALIZER OFF
   ========================================================= */

function stopVoiceVisualizer() {

    const wave =
        document.getElementById(
            "voiceWave"
        );


    if (wave) {

        wave.classList.remove(
            "voice-active"
        );

    }

}


/* =========================================================
   END VOICE CHAT
   ========================================================= */

function endVoiceChat() {

    console.log(
        "📞 Ending voice chat."
    );


    cleanupVoiceRoom();


    const voiceRoom =
        document.getElementById(
            "voiceRoom"
        );


    const voiceEmpty =
        document.getElementById(
            "voiceEmpty"
        );


    if (voiceRoom) {

        voiceRoom.classList.add(
            "hidden"
        );

    }


    if (voiceEmpty) {

        voiceEmpty.classList.remove(
            "hidden"
        );

    }


    voiceRoomActive =
        false;


    setMicrophoneUI(false);

}


/* =========================================================
   CLEANUP
   ========================================================= */

function cleanupVoiceRoom() {

    console.log(
        "🧹 Cleaning up voice room."
    );


    stopVoiceTimer();


    stopVoiceVisualizer();


    /*
     * Stop microphone hardware.
     */

    if (localStream) {

        localStream
            .getTracks()
            .forEach(
                function (track) {

                    track.stop();

                }
            );


        localStream =
            null;

    }


    /*
     * Remove remote audio.
     */

    const remoteAudio =
        document.getElementById(
            "remoteAudio"
        );


    if (remoteAudio) {

        remoteAudio.pause();

        remoteAudio.srcObject =
            null;

    }


    /*
     * Close WebRTC.
     */

    if (peerConnection) {

        try {

            peerConnection.close();

        }

        catch (error) {

            console.warn(
                "Peer connection close error:",
                error
            );

        }


        peerConnection =
            null;

    }


    /*
     * Close signaling socket.
     */

    if (socket) {

        try {

            socket.close();

        }

        catch (error) {

            console.warn(
                "Socket close error:",
                error
            );

        }


        socket =
            null;

    }


    remoteStream =
        null;


    voiceStarted =
        false;


    microphoneEnabled =
        false;


    voiceConnectionReady =
        false;


    remoteDescriptionSet =
        false;


    iceCandidateQueue =
        [];


    setMicrophoneUI(false);


    updateVoiceRoomStatus(
        "Ready",
        "Voice room ready"
    );


    console.log(
        "✅ Voice room cleaned up."
    );

}


/* =========================================================
   SAFETY CLEANUP
   ========================================================= */

window.addEventListener(
    "beforeunload",
    function () {

        cleanupVoiceRoom();

    }
);