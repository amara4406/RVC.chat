/* =========================================================
   RVC.CHAT — MAIN JAVASCRIPT
   Friends Page + Homepage Compatible
   Slideshow + Responsive Controls
   ========================================================= */


/* =========================================================
   1. FRIEND DATA
   ========================================================= */

const friends = [
    {
        id: 1,
        name: "StarPlayer",
        initials: "SP",
        game: "Blox Fruits",
        online: true
    },
    {
        id: 2,
        name: "SpeedKing",
        initials: "SK",
        game: "Brookhaven RP",
        online: true
    },
    {
        id: 3,
        name: "WebMaster",
        initials: "WM",
        game: "Arsenal",
        online: true
    },
    {
        id: 4,
        name: "GakuFan",
        initials: "GF",
        game: "Adopt Me!",
        online: false
    },
    {
        id: 5,
        name: "ShadowRoblox",
        initials: "SR",
        game: "Blade Ball",
        online: true
    },
    {
        id: 6,
        name: "DragonLord",
        initials: "DL",
        game: "Tower of Hell",
        online: false
    },
    {
        id: 7,
        name: "RacerX",
        initials: "RX",
        game: "Jailbreak",
        online: true
    },
    {
        id: 8,
        name: "SpiderAce",
        initials: "SA",
        game: "DOORS",
        online: false
    }
];


/* =========================================================
   2. GLOBAL VARIABLES
   ========================================================= */

let selectedFriend = null;

let roomStartTime = null;
let roomTimerInterval = null;

let microphoneStream = null;
let microphoneMuted = false;

let activeFriendFilter = "all";

/* Slideshow */
let slideshowIndex = 0;
let slideshowTimer = null;
let slideshowSlides = [];
let slideshowDots = [];

let slideshowPaused = false;

let slideshowTouchStartX = 0;
let slideshowTouchStartY = 0;

let slideshowInitialized = false;

const SLIDESHOW_INTERVAL = 5000;


/* =========================================================
   3. PAGE INITIALIZATION
   ========================================================= */

function initializeRVCApp() {

    initializeHomePage();
    initializeFriendsPage();

}


/*
 * Handles both normal page loading and cases where
 * this JavaScript is loaded after DOMContentLoaded.
 */

if (document.readyState === "loading") {

    document.addEventListener(
        "DOMContentLoaded",
        initializeRVCApp
    );

} else {

    initializeRVCApp();

}


/* =========================================================
   4. HOMEPAGE MICROPHONE
   ========================================================= */

function initializeHomePage() {

    const microphoneButton =
        document.getElementById("microphoneButton");

    const microphoneStatus =
        document.getElementById("microphoneStatus");


    if (!microphoneButton) {
        return;
    }


    /*
     * Prevent duplicate listeners if the function
     * somehow gets called more than once.
     */

    if (microphoneButton.dataset.rvcInitialized === "true") {
        return;
    }

    microphoneButton.dataset.rvcInitialized = "true";


    microphoneButton.addEventListener(
        "click",
        testMicrophone
    );


    async function testMicrophone() {

        if (
            !navigator.mediaDevices ||
            !navigator.mediaDevices.getUserMedia
        ) {

            if (microphoneStatus) {

                microphoneStatus.textContent =
                    "Your browser does not support microphone access.";

            }

            return;
        }


        if (microphoneStatus) {

            microphoneStatus.textContent =
                "Requesting microphone permission...";

        }


        microphoneButton.disabled = true;


        try {

            microphoneStream =
                await navigator.mediaDevices.getUserMedia({
                    audio: true
                });


            if (microphoneStatus) {

                microphoneStatus.textContent =
                    "✓ Microphone connected successfully.";

            }


            microphoneButton.textContent =
                "✓ Microphone Ready";


            microphoneButton.style.borderColor =
                "rgba(50,232,117,.45)";


            microphoneStream
                .getTracks()
                .forEach(track => track.stop());


            microphoneStream = null;


        } catch (error) {

            console.error(
                "Microphone error:",
                error
            );


            if (microphoneStatus) {

                microphoneStatus.textContent =
                    "Microphone permission was denied or is unavailable.";

            }


            microphoneButton.textContent =
                "🎙 Test Microphone";


            microphoneButton.style.borderColor = "";


        } finally {

            microphoneButton.disabled = false;

        }

    }

}


/* =========================================================
   5. FRIENDS PAGE INITIALIZATION
   ========================================================= */

function initializeFriendsPage() {

    const friendList =
        document.getElementById("friendList");


    /*
     * If this isn't the Friends page,
     * don't run Friends functionality.
     */

    if (!friendList) {
        return;
    }


    renderFriends(
        getVisibleFriends()
    );


    updateOnlineCount();

    updateNavigationCounters();

    initializeFriendSearch();

    initializeFriendFilters();

    initializeVoiceControls();

    initializeSlideshow();

    initializeFindSomeoneButton();

    initializeSearchClear();

}


/* =========================================================
   6. GET VISIBLE FRIENDS
   ========================================================= */

function getVisibleFriends() {

    const searchInput =
        document.getElementById("friendSearch");


    const searchTerm =
        searchInput
            ? searchInput.value.trim().toLowerCase()
            : "";


    return friends.filter(friend => {

        const matchesSearch =
            friend.name
                .toLowerCase()
                .includes(searchTerm);


        const matchesFilter =
            activeFriendFilter === "all" ||

            (
                activeFriendFilter === "online" &&
                friend.online
            ) ||

            (
                activeFriendFilter === "offline" &&
                !friend.online
            );


        return (
            matchesSearch &&
            matchesFilter
        );

    });

}


/* =========================================================
   7. RENDER FRIENDS
   ========================================================= */

function renderFriends(friendArray) {

    const friendList =
        document.getElementById("friendList");

    const noFriends =
        document.getElementById("noFriends");


    if (!friendList) {
        return;
    }


    friendList.innerHTML = "";


    if (friendArray.length === 0) {

        friendList.style.display = "none";


        if (noFriends) {

            noFriends.style.display = "block";

        }


        updateSearchResultCount();

        return;
    }


    friendList.style.display = "grid";


    if (noFriends) {

        noFriends.style.display = "none";

    }


    friendArray.forEach(friend => {

        const friendElement =
            document.createElement("div");


        friendElement.className =
            "friend-card " +
            (friend.online ? "online" : "offline");


        friendElement.dataset.friendId =
            friend.id;


        friendElement.innerHTML = `

            <div class="friend-avatar">
                ${escapeHtml(friend.initials)}
            </div>

            <div class="friend-info">

                <div class="friend-name">
                    ${escapeHtml(friend.name)}
                </div>

                <div class="friend-username">
                    @${escapeHtml(friend.name.toLowerCase())}
                </div>

                <div class="friend-game">
                    ${escapeHtml(friend.game)}
                </div>

                <div class="friend-status">
                    ${friend.online ? "ONLINE" : "OFFLINE"}
                </div>

            </div>

            <div class="friend-actions">

                <button
                    type="button"
                    class="voice-button"
                    data-action="voice"
                    data-id="${friend.id}"
                    title="${
                        friend.online
                            ? "Start voice chat"
                            : "Friend is offline"
                    }"
                    ${friend.online ? "" : "disabled"}
                >
                    <i class="fas fa-microphone"></i>
                </button>

                <button
                    type="button"
                    class="profile-action"
                    data-action="profile"
                    data-id="${friend.id}"
                    title="View profile"
                >
                    <i class="fas fa-user"></i>
                </button>

            </div>

        `;


        friendElement.addEventListener(
            "click",
            function(event) {

                if (
                    event.target.closest("button")
                ) {
                    return;
                }


                if (!friend.online) {

                    showOfflineMessage(friend);

                    return;
                }


                openVoiceRoom(friend);

            }
        );


        const voiceButton =
            friendElement.querySelector(
                '[data-action="voice"]'
            );


        if (voiceButton) {

            voiceButton.addEventListener(
                "click",
                function(event) {

                    event.stopPropagation();


                    if (friend.online) {

                        openVoiceRoom(friend);

                    }

                }
            );

        }


        const profileButton =
            friendElement.querySelector(
                '[data-action="profile"]'
            );


        if (profileButton) {

            profileButton.addEventListener(
                "click",
                function(event) {

                    event.stopPropagation();

                    showFriendProfile(friend);

                }
            );

        }


        friendList.appendChild(
            friendElement
        );

    });


    updateSearchResultCount();

}


/* =========================================================
   8. ONLINE COUNT
   ========================================================= */

function updateOnlineCount() {

    const count =
        friends.filter(
            friend => friend.online
        ).length;


    const onlineCount =
        document.getElementById("onlineCount");


    const badge =
        document.getElementById("onlineCountBadge");


    const navCount =
        document.getElementById("navOnlineCount");


    if (onlineCount) {

        onlineCount.textContent =
            count;

    }


    if (badge) {

        badge.textContent =
            count + " online";

    }


    if (navCount) {

        navCount.textContent =
            count;

    }

}


/* =========================================================
   9. NAVIGATION COUNTERS
   ========================================================= */

function updateNavigationCounters() {

    updateOnlineCount();

}


/* =========================================================
   10. FRIEND SEARCH
   ========================================================= */

function initializeFriendSearch() {

    const searchInput =
        document.getElementById("friendSearch");


    if (!searchInput) {
        return;
    }


    if (
        searchInput.dataset.rvcInitialized === "true"
    ) {
        return;
    }


    searchInput.dataset.rvcInitialized = "true";


    searchInput.addEventListener(
        "input",
        function() {

            const box =
                document.querySelector(
                    ".friend-search-box"
                );


            if (box) {

                box.classList.toggle(
                    "has-value",
                    searchInput.value.trim() !== ""
                );

            }


            renderFriends(
                getVisibleFriends()
            );

        }
    );


    searchInput.addEventListener(
        "keydown",
        function(event) {

            if (event.key === "Escape") {

                clearFriendSearch();

            }

        }
    );


    updateSearchResultCount();

}


/* =========================================================
   11. SEARCH RESULT COUNT
   ========================================================= */

function updateSearchResultCount() {

    const countElement =
        document.getElementById(
            "searchResultCount"
        );


    if (!countElement) {
        return;
    }


    const visibleFriends =
        getVisibleFriends();


    const total =
        friends.length;


    if (visibleFriends.length === total) {

        countElement.textContent =
            total +
            (total === 1
                ? " friend"
                : " friends");

        return;
    }


    countElement.textContent =
        visibleFriends.length +
        " found";

}


/* =========================================================
   12. SEARCH CLEAR
   ========================================================= */

function initializeSearchClear() {

    const clearButton =
        document.getElementById(
            "clearFriendSearch"
        );


    const emptyButton =
        document.getElementById(
            "clearSearchEmpty"
        );


    if (clearButton) {

        clearButton.addEventListener(
            "click",
            clearFriendSearch
        );

    }


    if (emptyButton) {

        emptyButton.addEventListener(
            "click",
            clearFriendSearch
        );

    }

}


function clearFriendSearch() {

    const searchInput =
        document.getElementById(
            "friendSearch"
        );


    if (!searchInput) {
        return;
    }


    searchInput.value = "";


    const box =
        document.querySelector(
            ".friend-search-box"
        );


    if (box) {

        box.classList.remove(
            "has-value"
        );

    }


    activeFriendFilter = "all";


    document
        .querySelectorAll(".friend-filter")
        .forEach(button => {

            button.classList.remove(
                "active"
            );

        });


    const allButton =
        document.querySelector(
            '.friend-filter[data-filter="all"]'
        );


    if (allButton) {

        allButton.classList.add(
            "active"
        );

    }


    renderFriends(friends);


    searchInput.focus();

}


/* =========================================================
   13. FRIEND FILTERS
   ========================================================= */

function initializeFriendFilters() {

    const filterButtons =
        document.querySelectorAll(
            ".friend-filter"
        );


    filterButtons.forEach(button => {

        button.addEventListener(
            "click",
            function() {

                activeFriendFilter =
                    button.dataset.filter ||
                    "all";


                filterButtons.forEach(item => {

                    item.classList.remove(
                        "active"
                    );

                });


                button.classList.add(
                    "active"
                );


                renderFriends(
                    getVisibleFriends()
                );

            }
        );

    });

}


/* =========================================================
   14. OPEN VOICE ROOM
   ========================================================= */

function openVoiceRoom(friend) {

    if (
        !friend ||
        !friend.online
    ) {
        return;
    }


    selectedFriend = friend;


    const voiceEmpty =
        document.getElementById(
            "voiceEmpty"
        );


    const voiceRoom =
        document.getElementById(
            "voiceRoom"
        );


    const selectedAvatar =
        document.getElementById(
            "selectedAvatar"
        );


    const selectedName =
        document.getElementById(
            "selectedName"
        );


    const selectedGame =
        document.getElementById(
            "selectedGame"
        );


    if (!voiceRoom) {
        return;
    }


    if (voiceEmpty) {

        voiceEmpty.classList.add(
            "hidden"
        );

        voiceEmpty.style.display =
            "none";

    }


    voiceRoom.classList.remove(
        "hidden"
    );


    voiceRoom.style.display =
        "flex";


    if (selectedAvatar) {

        selectedAvatar.textContent =
            friend.initials;

    }


    if (selectedName) {

        selectedName.textContent =
            friend.name;

    }


    if (selectedGame) {

        selectedGame.textContent =
            "Playing " +
            friend.game;

    }


    document
        .querySelectorAll(".friend-card")
        .forEach(item => {

            item.classList.remove(
                "selected"
            );

        });


    const selectedElement =
        document.querySelector(
            `[data-friend-id="${friend.id}"]`
        );


    if (selectedElement) {

        selectedElement.classList.add(
            "selected"
        );

    }


    startRoomTimer();


    if (window.innerWidth <= 700) {

        setTimeout(function() {

            voiceRoom.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });

        }, 100);

    }

}


/* =========================================================
   15. VOICE CONTROLS
   ========================================================= */

function initializeVoiceControls() {

    const muteButton =
        document.getElementById(
            "muteButton"
        );


    const endVoiceButton =
        document.getElementById(
            "endVoiceButton"
        );


    if (muteButton) {

        muteButton.addEventListener(
            "click",
            toggleMute
        );

    }


    if (endVoiceButton) {

        endVoiceButton.addEventListener(
            "click",
            endVoiceRoom
        );

    }


    const privateRoomButton =
        document.querySelector(
            ".private-room-button"
        );


    if (privateRoomButton) {

        privateRoomButton.addEventListener(
            "click",
            createPrivateRoom
        );

    }

}


/* =========================================================
   16. MUTE / UNMUTE
   ========================================================= */

function toggleMute() {

    const muteButton =
        document.getElementById(
            "muteButton"
        );


    microphoneMuted =
        !microphoneMuted;


    if (microphoneStream) {

        microphoneStream
            .getAudioTracks()
            .forEach(track => {

                track.enabled =
                    !microphoneMuted;

            });

    }


    if (microphoneMuted) {

        if (muteButton) {

            muteButton.innerHTML =
                '<i class="fas fa-microphone-slash"></i>';

            muteButton.setAttribute(
                "aria-pressed",
                "true"
            );

            muteButton.classList.add(
                "active"
            );

            muteButton.title =
                "Unmute microphone";

        }

    } else {

        if (muteButton) {

            muteButton.innerHTML =
                '<i class="fas fa-microphone"></i>';

            muteButton.setAttribute(
                "aria-pressed",
                "false"
            );

            muteButton.classList.remove(
                "active"
            );

            muteButton.title =
                "Mute microphone";

        }

    }

}


/* =========================================================
   17. END VOICE ROOM
   ========================================================= */

function endVoiceRoom() {

    const voiceEmpty =
        document.getElementById(
            "voiceEmpty"
        );


    const voiceRoom =
        document.getElementById(
            "voiceRoom"
        );


    stopRoomTimer();


    selectedFriend = null;

    microphoneMuted = false;


    if (voiceRoom) {

        voiceRoom.classList.add(
            "hidden"
        );

        voiceRoom.style.display =
            "none";

    }


    if (voiceEmpty) {

        voiceEmpty.classList.remove(
            "hidden"
        );

        voiceEmpty.style.display =
            "flex";

    }


    document
        .querySelectorAll(".friend-card")
        .forEach(item => {

            item.classList.remove(
                "selected"
            );

        });


    const muteButton =
        document.getElementById(
            "muteButton"
        );


    if (muteButton) {

        muteButton.innerHTML =
            '<i class="fas fa-microphone"></i>';

        muteButton.setAttribute(
            "aria-pressed",
            "false"
        );

        muteButton.classList.remove(
            "active"
        );

        muteButton.title =
            "Mute microphone";

    }

}


/* =========================================================
   18. ROOM TIMER
   ========================================================= */

function startRoomTimer() {

    const timer =
        document.getElementById(
            "roomTimer"
        );


    if (!timer) {
        return;
    }


    stopRoomTimer();


    roomStartTime =
        Date.now();


    updateRoomTimer();


    roomTimerInterval =
        setInterval(
            updateRoomTimer,
            1000
        );

}


function updateRoomTimer() {

    const timer =
        document.getElementById(
            "roomTimer"
        );


    if (
        !timer ||
        !roomStartTime
    ) {
        return;
    }


    const elapsed =
        Math.floor(
            (Date.now() - roomStartTime) /
            1000
        );


    const minutes =
        Math.floor(
            elapsed / 60
        );


    const seconds =
        elapsed % 60;


    timer.textContent =
        formatTime(minutes) +
        ":" +
        formatTime(seconds);

}


function stopRoomTimer() {

    if (roomTimerInterval) {

        clearInterval(
            roomTimerInterval
        );

        roomTimerInterval = null;

    }


    roomStartTime = null;


    const timer =
        document.getElementById(
            "roomTimer"
        );


    if (timer) {

        timer.textContent =
            "00:00";

    }

}


function formatTime(value) {

    return value
        .toString()
        .padStart(2, "0");

}


/* =========================================================
   19. OFFLINE MESSAGE
   ========================================================= */

function showOfflineMessage(friend) {

    if (!friend) {
        return;
    }


    showNotification(
        friend.name +
        " is currently offline."
    );

}


/* =========================================================
   20. FRIEND PROFILE
   ========================================================= */

function showFriendProfile(friend) {

    if (!friend) {
        return;
    }


    showNotification(
        friend.name +
        " • " +
        (
            friend.online
                ? "Online"
                : "Offline"
        ) +
        " • " +
        friend.game
    );

}


/* =========================================================
   21. FIND SOMEONE BUTTON
   ========================================================= */

function initializeFindSomeoneButton() {

    const button =
        document.getElementById(
            "findSomeoneButton"
        );


    if (!button) {
        return;
    }


    button.addEventListener(
        "click",
        function() {

            const onlineFriends =
                friends.filter(
                    friend => friend.online
                );


            if (
                onlineFriends.length === 0
            ) {

                showNotification(
                    "No friends are currently online."
                );

                return;
            }


            const friend =
                onlineFriends[
                    Math.floor(
                        Math.random() *
                        onlineFriends.length
                    )
                ];


            openVoiceRoom(friend);

        }
    );

}


/* =========================================================
   22. PRIVATE ROOM
   ========================================================= */

function createPrivateRoom() {

    const roomId =
        "RVC-" +
        Math.random()
            .toString(36)
            .substring(2, 8)
            .toUpperCase();


    const roomButton =
        document.querySelector(
            ".private-room-button"
        );


    if (roomButton) {

        roomButton.textContent =
            "Room " +
            roomId;

    }


    if (
        navigator.clipboard &&
        navigator.clipboard.writeText
    ) {

        navigator.clipboard
            .writeText(roomId)
            .then(function() {

                showNotification(
                    "Private room ID copied."
                );

            })
            .catch(function() {

                showNotification(
                    "Private room created: " +
                    roomId
                );

            });

    } else {

        showNotification(
            "Private room created: " +
            roomId
        );

    }

}


/* =========================================================
   23. SLIDESHOW
   ========================================================= */

function initializeSlideshow() {

    const slideshow =
        document.getElementById(
            "gamesSlideshow"
        );


    if (!slideshow) {

        console.log(
            "RVC slideshow: container not found."
        );

        return;
    }


    /*
     * Prevent duplicate slideshow initialization.
     */

    if (slideshowInitialized) {

        return;

    }


    slideshowInitialized = true;


    slideshowSlides =
        Array.from(
            slideshow.querySelectorAll(
                ".slideshow-slide"
            )
        );


    slideshowDots =
        Array.from(
            slideshow.querySelectorAll(
                "#slideshowDots button"
            )
        );


    /*
     * Some HTML structures place the dots outside
     * gamesSlideshow, so fall back to document search.
     */

    if (slideshowDots.length === 0) {

        slideshowDots =
            Array.from(
                document.querySelectorAll(
                    "#slideshowDots button"
                )
            );

    }


    const previousButton =
        document.getElementById(
            "slideshowPrev"
        );


    const nextButton =
        document.getElementById(
            "slideshowNext"
        );


    if (
        slideshowSlides.length === 0
    ) {

        console.log(
            "RVC slideshow: no slides found."
        );

        return;
    }


    /*
     * Make sure every slide contains an image
     * that behaves properly on every screen size.
     */

    slideshowSlides.forEach(
        function(slide) {

            const image =
                slide.querySelector("img");


            if (image) {

                image.loading = "lazy";

                image.decoding = "async";

                image.draggable = false;

                image.style.width =
                    "100%";

                image.style.height =
                    "100%";

                image.style.objectFit =
                    "cover";

                image.style.display =
                    "block";

            }

        }
    );


    slideshowIndex = 0;


    showSlide(
        slideshowIndex
    );


    /*
     * Previous button
     */

    if (previousButton) {

        previousButton.addEventListener(
            "click",
            function(event) {

                event.preventDefault();

                event.stopPropagation();


                goToPreviousSlide();

            }
        );

    }


    /*
     * Next button
     */

    if (nextButton) {

        nextButton.addEventListener(
            "click",
            function(event) {

                event.preventDefault();

                event.stopPropagation();


                goToNextSlide();

            }
        );

    }


    /*
     * Dots
     */

    slideshowDots.forEach(
        function(dot, index) {

            dot.addEventListener(
                "click",
                function(event) {

                    event.preventDefault();

                    event.stopPropagation();


                    let targetIndex =
                        index;


                    const dataSlide =
                        Number(
                            dot.dataset.slide
                        );


                    if (
                        Number.isFinite(
                            dataSlide
                        )
                    ) {

                        /*
                         * Your existing HTML uses
                         * 1-based slide numbers.
                         */

                        if (
                            dataSlide >= 1 &&
                            dataSlide <=
                                slideshowSlides.length
                        ) {

                            targetIndex =
                                dataSlide - 1;

                        }

                    }


                    showSlide(
                        targetIndex
                    );


                    restartSlideshow();

                }
            );

        }
    );


    /*
     * Touch / swipe support
     */

    slideshow.addEventListener(
        "touchstart",
        function(event) {

            if (
                !event.touches ||
                !event.touches.length
            ) {
                return;
            }


            slideshowTouchStartX =
                event.touches[0].clientX;


            slideshowTouchStartY =
                event.touches[0].clientY;


            pauseSlideshow();

        },
        {
            passive: true
        }
    );


    slideshow.addEventListener(
        "touchend",
        function(event) {

            if (
                !event.changedTouches ||
                !event.changedTouches.length
            ) {

                resumeSlideshow();

                return;
            }


            const endX =
                event.changedTouches[0].clientX;


            const endY =
                event.changedTouches[0].clientY;


            const deltaX =
                endX -
                slideshowTouchStartX;


            const deltaY =
                endY -
                slideshowTouchStartY;


            /*
             * Only count horizontal swipes.
             */

            if (
                Math.abs(deltaX) >
                    45 &&
                Math.abs(deltaX) >
                    Math.abs(deltaY)
            ) {

                if (deltaX < 0) {

                    goToNextSlide();

                } else {

                    goToPreviousSlide();

                }

            }


            resumeSlideshow();

        },
        {
            passive: true
        }
    );


    /*
     * Pause while the user is holding keyboard focus
     * on slideshow controls.
     */

    slideshow.addEventListener(
        "focusin",
        pauseSlideshow
    );


    slideshow.addEventListener(
        "focusout",
        function() {

            /*
             * Small delay prevents the timer from
             * immediately restarting while moving
             * between slideshow controls.
             */

            setTimeout(
                function() {

                    if (
                        !slideshow.contains(
                            document.activeElement
                        )
                    ) {

                        resumeSlideshow();

                    }

                },
                80
            );

        }
    );


    /*
     * Start automatic slideshow.
     */

    startSlideshow();


    /*
     * If the browser tab becomes hidden,
     * stop the timer to prevent weird timing.
     */

    document.addEventListener(
        "visibilitychange",
        handleSlideshowVisibility
    );


    console.log(
        "RVC slideshow initialized successfully:",
        slideshowSlides.length,
        "slides"
    );

}


/* =========================================================
   24. SHOW SLIDE
   ========================================================= */

function showSlide(index) {

    if (
        !slideshowSlides ||
        slideshowSlides.length === 0
    ) {

        return;
    }


    /*
     * Keep index inside valid range.
     */

    if (
        index < 0
    ) {

        index =
            slideshowSlides.length - 1;

    }


    if (
        index >=
        slideshowSlides.length
    ) {

        index = 0;

    }


    slideshowIndex =
        index;


    slideshowSlides.forEach(
        function(slide, slideIndex) {

            const active =
                slideIndex === index;


            slide.classList.toggle(
                "active",
                active
            );


            /*
             * Important:
             * these inline styles override any
             * conflicting rules in the giant CSS file.
             */

            slide.style.setProperty(
                "display",
                active
                    ? "block"
                    : "none",
                "important"
            );


            slide.style.setProperty(
                "opacity",
                active
                    ? "1"
                    : "0",
                "important"
            );


            slide.style.setProperty(
                "visibility",
                active
                    ? "visible"
                    : "hidden",
                "important"
            );


            slide.style.setProperty(
                "pointer-events",
                active
                    ? "auto"
                    : "none",
                "important"
            );


            slide.style.setProperty(
                "z-index",
                active
                    ? "2"
                    : "1",
                "important"
            );


            const image =
                slide.querySelector("img");


            if (image) {

                image.style.setProperty(
                    "width",
                    "100%",
                    "important"
                );


                image.style.setProperty(
                    "height",
                    "100%",
                    "important"
                );


                image.style.setProperty(
                    "object-fit",
                    "cover",
                    "important"
                );


                image.style.setProperty(
                    "display",
                    "block",
                    "important"
                );

            }

        }
    );


    /*
     * Update dots.
     */

    slideshowDots.forEach(
        function(dot, dotIndex) {

            const active =
                dotIndex === index;


            dot.classList.toggle(
                "active",
                active
            );


            dot.setAttribute(
                "aria-current",
                active
                    ? "true"
                    : "false"
            );

        }
    );


    /*
     * Update counter.
     */

    const current =
        document.getElementById(
            "slideCurrent"
        );


    if (current) {

        current.textContent =
            String(
                index + 1
            ).padStart(
                2,
                "0"
            );

    }


    /*
     * Reset progress bar.
     */

    animateSlideshowProgress();

}


/* =========================================================
   25. NEXT SLIDE
   ========================================================= */

function goToNextSlide() {

    if (
        slideshowSlides.length <= 1
    ) {
        return;
    }


    slideshowIndex =
        (
            slideshowIndex + 1
        ) %
        slideshowSlides.length;


    showSlide(
        slideshowIndex
    );


    restartSlideshow();

}


/* =========================================================
   26. PREVIOUS SLIDE
   ========================================================= */

function goToPreviousSlide() {

    if (
        slideshowSlides.length <= 1
    ) {
        return;
    }


    slideshowIndex =
        (
            slideshowIndex -
            1 +
            slideshowSlides.length
        ) %
        slideshowSlides.length;


    showSlide(
        slideshowIndex
    );


    restartSlideshow();

}


/* =========================================================
   27. START SLIDESHOW
   ========================================================= */

function startSlideshow() {

    stopSlideshow();


    if (
        slideshowSlides.length <= 1
    ) {

        return;

    }


    slideshowPaused = false;


    slideshowTimer =
        setInterval(
            function() {

                if (
                    slideshowPaused
                ) {

                    return;

                }


                slideshowIndex =
                    (
                        slideshowIndex +
                        1
                    ) %
                    slideshowSlides.length;


                showSlide(
                    slideshowIndex
                );

            },
            SLIDESHOW_INTERVAL
        );


    animateSlideshowProgress();

}


/* =========================================================
   28. RESTART SLIDESHOW
   ========================================================= */

function restartSlideshow() {

    startSlideshow();

}


/* =========================================================
   29. STOP SLIDESHOW
   ========================================================= */

function stopSlideshow() {

    if (slideshowTimer) {

        clearInterval(
            slideshowTimer
        );

        slideshowTimer = null;

    }

}


/* =========================================================
   30. PAUSE SLIDESHOW
   ========================================================= */

function pauseSlideshow() {

    slideshowPaused = true;

}


/* =========================================================
   31. RESUME SLIDESHOW
   ========================================================= */

function resumeSlideshow() {

    if (
        document.hidden
    ) {

        return;

    }


    slideshowPaused = false;

}


/* =========================================================
   32. PAGE VISIBILITY
   ========================================================= */

function handleSlideshowVisibility() {

    if (
        document.hidden
    ) {

        stopSlideshow();

        slideshowPaused = true;

    } else {

        slideshowPaused = false;

        startSlideshow();

    }

}


/* =========================================================
   33. SLIDESHOW PROGRESS
   ========================================================= */

function animateSlideshowProgress() {

    const progress =
        document.getElementById(
            "slideshowProgress"
        );


    if (!progress) {
        return;
    }


    /*
     * Reset immediately.
     */

    progress.style.transition =
        "none";


    progress.style.width =
        "0%";


    /*
     * Start the animation on the next frame.
     */

    requestAnimationFrame(
        function() {

            requestAnimationFrame(
                function() {

                    if (
                        !slideshowPaused &&
                        !document.hidden
                    ) {

                        progress.style.transition =
                            "width " +
                            SLIDESHOW_INTERVAL +
                            "ms linear";


                        progress.style.width =
                            "100%";

                    }

                }
            );

        }
    );

}


/* =========================================================
   34. NOTIFICATION
   ========================================================= */

function showNotification(message) {

    const oldNotification =
        document.querySelector(
            ".rvc-notification"
        );


    if (oldNotification) {

        oldNotification.remove();

    }


    const notification =
        document.createElement(
            "div"
        );


    notification.className =
        "rvc-notification";


    notification.textContent =
        message;


    notification.style.position =
        "fixed";


    notification.style.left =
        "50%";


    notification.style.bottom =
        "25px";


    notification.style.transform =
        "translateX(-50%)";


    notification.style.zIndex =
        "9999";


    notification.style.padding =
        "12px 18px";


    notification.style.border =
        "1px solid rgba(255,255,255,.14)";


    notification.style.borderRadius =
        "13px";


    notification.style.color =
        "#ffffff";


    notification.style.background =
        "linear-gradient(135deg,#171d28,#111722)";


    notification.style.fontSize =
        "12px";


    notification.style.fontWeight =
        "750";


    notification.style.boxShadow =
        "0 18px 45px rgba(0,0,0,.42)";


    document.body.appendChild(
        notification
    );


    setTimeout(
        function() {

            if (
                notification &&
                notification.parentNode
            ) {

                notification.remove();

            }

        },
        2600
    );

}


/* =========================================================
   35. DEVELOPMENT STATUS SIMULATION
   ========================================================= */

function simulateFriendStatus() {

    const randomIndex =
        Math.floor(
            Math.random() *
            friends.length
        );


    friends[randomIndex].online =
        !friends[randomIndex].online;


    updateOnlineCount();


    renderFriends(
        getVisibleFriends()
    );


    if (
        selectedFriend &&
        !selectedFriend.online
    ) {

        const wentOfflineName =
            selectedFriend.name;


        endVoiceRoom();


        showNotification(
            wentOfflineName +
            " went offline."
        );

    }

}


/* =========================================================
   36. ESCAPE HTML
   ========================================================= */

function escapeHtml(value) {

    const div =
        document.createElement(
            "div"
        );


    div.textContent =
        value;


    return div.innerHTML;

}


/* =========================================================
   37. CLEANUP
   ========================================================= */

window.addEventListener(
    "beforeunload",
    function() {

        stopRoomTimer();

        stopSlideshow();


        if (microphoneStream) {

            microphoneStream
                .getTracks()
                .forEach(
                    track =>
                        track.stop()
                );


            microphoneStream = null;

        }

    }
);