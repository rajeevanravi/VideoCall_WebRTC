var client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });

var localTracks = {
  videoTrack: null,
  audioTrack: null
};
var remoteUsers = {};

var options = {
  appid: null,
  channel: null,
  uid: null,
  token: null
};

// the demo can auto join channel with params in url
$(() => {
  var urlParams = new URL(location.href).searchParams;
  options.appid = urlParams.get("appid");
  options.channel = urlParams.get("channel");
  options.token = urlParams.get("token");
  if (options.appid && options.channel) {
    $("#appid").val(options.appid);
    $("#token").val(options.token);
    $("#channel").val(options.channel);
    $("#join-form").submit();
  }
})

$("#join-form").submit(async function (e) {
  e.preventDefault();
  $("#join").attr("disabled", true);
  try {
    options.appid = $("#appid").val();
    options.token = $("#token").val();
    options.channel = $("#channel").val();
    await join();
    if(options.token) {
      $("#success-alert-with-token").css("display", "block");
    } else {
      $("#success-alert a").attr("href", `index.html?appid=${options.appid}&channel=${options.channel}&token=${options.token}`);
      $("#success-alert").css("display", "block");
    }
  } catch (error) {
    console.error(error);
  } finally {
    $("#leave").attr("disabled", false);
  }
})

$("#leave").click(function (e) {
  leave();
})

async function join() {

  
  client.on("user-published", handleUserPublished);
  client.on("user-unpublished", handleUserUnpublished);

  
  [ options.uid, localTracks.audioTrack, localTracks.videoTrack ] = await Promise.all([
    
    client.join(options.appid, options.channel, options.token || null),
    
    AgoraRTC.createMicrophoneAudioTrack(),
    AgoraRTC.createCameraVideoTrack()
  ]);
  
  
  localTracks.videoTrack.play("local-player");
  $("#local-player-name").text(`localVideo(${options.uid})`);

  
  await client.publish(Object.values(localTracks));
  console.log("publish success");
}

async function leave() {
  for (trackName in localTracks) {
    var track = localTracks[trackName];
    if(track) {
      track.stop();
      track.close();
      localTracks[trackName] = undefined;
    }
  }

  
  remoteUsers = {};
  $("#remote-playerlist").html("");

  
  await client.leave();

  $("#local-player-name").text("");
  $("#join").attr("disabled", false);
  $("#leave").attr("disabled", true);
  console.log("client leaves channel success");
}


async function subscribe(user, mediaType) {
  const uid = user.uid;
  await client.subscribe(user, mediaType);
  console.log("subscribe success");

  if (mediaType === 'video') {
    // Remove previous remote video if any
    $("#remote-playerlist .remote-video-container").remove();
    // Add a new container for the remote video
    $("#remote-playerlist").prepend(`
      <div id="remote-player-${uid}" class="remote-video-container" style="width:100%;height:100%;position:absolute;top:0;left:0;"></div>
    `);
    user.videoTrack.play(`remote-player-${uid}`);
  }
  if (mediaType === 'audio') {
    user.audioTrack.play();
  }
}


function handleUserPublished(user, mediaType) {
  const id = user.uid;
  remoteUsers[id] = user;
  subscribe(user, mediaType);
}

function handleUserUnpublished(user) {
  const id = user.uid;
  delete remoteUsers[id];
  $(`#player-wrapper-${id}`).remove();
}


const localPlayer = document.getElementById("local-player");
const remoteContainer = document.getElementById("remote-playerlist");

let isDragging = false;
let offsetX, offsetY;

localPlayer.addEventListener("mousedown", (e) => {
  isDragging = true;
  offsetX = e.clientX - localPlayer.offsetLeft;
  offsetY = e.clientY - localPlayer.offsetTop;
  localPlayer.classList.add("dragging");
});

document.addEventListener("mousemove", (e) => {
  if (!isDragging) return;

  
  let x = e.clientX - offsetX;
  let y = e.clientY - offsetY;

  
  const maxX = remoteContainer.clientWidth - localPlayer.clientWidth;
  const maxY = remoteContainer.clientHeight - localPlayer.clientHeight;
  if (x < 0) x = 0;
  if (y < 0) y = 0;
  if (x > maxX) x = maxX;
  if (y > maxY) y = maxY;

  localPlayer.style.left = `${x}px`;
  localPlayer.style.top = `${y}px`;
});

document.addEventListener("mouseup", () => {
  if (isDragging) {
    isDragging = false;
    localPlayer.classList.remove("dragging");
  }
});


const micBtn = document.getElementById("btn-mic");
const camBtn = document.getElementById("btn-camera");
const localViewBtn = document.getElementById("btn-localview");

let micMuted = false;
let camMuted = false;
let localViewHidden = false;

async function join() {
  client.on("user-published", handleUserPublished);
  client.on("user-unpublished", handleUserUnpublished);

  [ options.uid, localTracks.audioTrack, localTracks.videoTrack ] = await Promise.all([
    client.join(options.appid, options.channel, options.token || null),
    AgoraRTC.createMicrophoneAudioTrack(),
    AgoraRTC.createCameraVideoTrack()
  ]);

  localTracks.videoTrack.play("local-player");
  $("#local-player-name").text(`localVideo(${options.uid})`);

  await client.publish(Object.values(localTracks));
  console.log("publish success");

  
  micBtn.disabled = false;
  camBtn.disabled = false;
  localViewBtn.disabled = false;
}


micBtn.addEventListener("click", async () => {
  if (!localTracks.audioTrack) return;
  micMuted = !micMuted;
  await localTracks.audioTrack.setEnabled(!micMuted);
  micBtn.textContent = micMuted ? "Unmute Mic" : "Mute Mic";
});


camBtn.addEventListener("click", async () => {
  if (!localTracks.videoTrack) return;
  camMuted = !camMuted;
  await localTracks.videoTrack.setEnabled(!camMuted);
  camBtn.textContent = camMuted ? "Turn On Camera" : "Turn Off Camera";
});

localViewBtn.addEventListener("click", () => {
  const localPlayer = document.getElementById("local-player");

  if (!localPlayer) return;

  localViewHidden = !localViewHidden;

  if (localViewHidden) {
    localPlayer.style.display = "none";  
    localViewBtn.textContent = "Show Self View";
  } else {
    localPlayer.style.display = "block"; 
    localViewBtn.textContent = "Hide Self View";
  }
});


async function leave() {
  for (trackName in localTracks) {
    var track = localTracks[trackName];
    if(track) {
      track.stop();
      track.close();
      localTracks[trackName] = undefined;
    }
  }
  remoteUsers = {};
  $("#remote-playerlist").html("");
  await client.leave();

  $("#local-player-name").text("");
  $("#join").attr("disabled", false);
  $("#leave").attr("disabled", true);

  micBtn.disabled = true;
  camBtn.disabled = true;
  micBtn.textContent = "Mute Mic";
  camBtn.textContent = "Turn Off Camera";

  localViewBtn.disabled = true;
  localViewBtn.textContent = "Hide Self View";
  localViewHidden = false;

  micMuted = false;
  camMuted = false;

  console.log("client leaves channel success");
}


async function leave() {
  for (trackName in localTracks) {
    var track = localTracks[trackName];
    if(track) {
      track.stop();
      track.close();
      localTracks[trackName] = undefined;
    }
  }
  remoteUsers = {};
  $("#remote-playerlist").html(`
    <div id="local-player"></div>
    <div id="controls-bar">
      <button id="btn-mic" class="control-btn">Mute Mic</button>
      <button id="btn-camera" class="control-btn">Turn Off Camera</button>
      <button id="leave" class="control-btn end-btn">End Call</button>
    </div>
  `); 

  await client.leave();
  console.log("client leaves channel success");
}
