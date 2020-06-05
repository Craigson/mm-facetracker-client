import React, { useState, useEffect } from "react";
import { w3cwebsocket as W3CWebSocket } from "websocket";
import { uuid } from "uuidv4";
import "./App.css";
import VideoFeed from "./components/VideoFeed";

const constraints = {
  video: {
    width: { max: 320 },
    height: { max: 240 },
    frameRate: { max: 24 },
  },
  audio: true,
};

const client = new W3CWebSocket("wss://10.0.1.12:8443");
function App() {
  const [state, setState] = useState({
    roomId: null,
    me: {
      uuid: "",
      username: "",
      roomId: "",
      host: false,
    },
    stream: null,
    login: true,
    peerConnections: [],
    videoFeeds: [],
  });

  let localStream = "";
  let peerConnections = [];
  let roomId;
  const peerConnectionConfig = {
    iceServers: [
      { urls: "stun:stun.stunprotocol.org:3478" },
      { urls: "stun:stun.l.google.com:19302" },
    ],
  };

  let hasStream = [];

  useEffect(() => {
    let hash = window.location.hash.replace("#", "");
    const newMe = { ...state.me, roomId: hash.split("=")[1] };
    setState({ ...state, me: newMe });
    roomId = hash.split("=")[1];
    _init();
  }, []);

  const addUser = (player) => {
    console.log("adding new user");
    if (state.players < 2)
      setState({ ...state, players: [...state.players, player] });
    else console.log("max 2 people per room");
  };

  const addVideoFeed = (videoFeed) => {
    console.log("adding video feed");
    setState({ ...state, videoFeeds: [...state.videoFeeds, videoFeed] });
  };

  function _init() {
    console.log("init websocket");
    // client = new W3CWebSocket("wss://10.0.1.12:8443");

    client.onopen = () => {
      console.log("WebSocket Client Connected");
    };
    client.onmessage = (message) => {
      let obj = JSON.parse(message.data);
      console.log(obj);
      switch (obj.eventName) {
        case "selfSetup":
          console.log({ meBefore: state.me });
          const updatedMe = {
            uuid: obj.data.user.uuid,
            username: obj.data.user.username,
            roomId: obj.data.user.room,
            host: obj.data.user.role === "HOST" ? true : false,
          };
          console.log({ updatedMe });
          setState({
            ...state,
            me: updatedMe,
          });
          console.log(`https://10.0.1.12:3000/#roomId=${obj.data.user.room}`);
          break;
        case "p2pAction":
          console.log("received p2pAction");
          var peerUuid = obj.data.uuid;
          console.log({ peerUuid });
          if (
            peerUuid === state.me.uuid ||
            (obj.data.dest !== state.me.uuid && obj.data.dest !== "all")
          ) {
            break;
          }

          if (obj.data.displayName && obj.data.dest === "all") {
            // set up peer connection object for a newcomer peer
            setUpPeer(peerUuid, obj.data.displayName);
            console.log("sending p2pAction");
            client.send(
              JSON.stringify({
                eventName: "p2pAction",
                data: {
                  displayName: state.me.username,
                  uuid: state.me.uuid,
                  dest: peerUuid,
                },
              })
            );
          } else if (obj.data.displayName && obj.data.dest === state.me.uuid) {
            // initiate call if we are the newcomer peer
            setUpPeer(peerUuid, obj.data.displayName, true);
          } else if (obj.data.sdp) {
            peerConnections[peerUuid].pc
              .setRemoteDescription(new RTCSessionDescription(obj.data.sdp))
              .then(() => {
                // Only create answers in response to offers
                if (obj.data.sdp.type === "offer") {
                  peerConnections[peerUuid].pc
                    .createAnswer()
                    .then((description) =>
                      createdDescription(description, peerUuid)
                    )
                    .catch(errorHandler);
                }
              })
              .catch(errorHandler);
          } else if (obj.data.ice) {
            peerConnections[peerUuid].pc
              .addIceCandidate(new RTCIceCandidate(obj.data.ice))
              .catch(errorHandler);
          }
          break;
        default:
          break;
      }
    };
  }

  const gotIceCandidate = (event, peerUuid) => {
    console.log("got ICE candidate");
    if (event.candidate != null) {
      client.send(
        JSON.stringify({
          eventName: "p2pAction",
          data: {
            ice: event.candidate,
            uuid: state.me.uuid,
            dest: peerUuid,
          },
        })
      );
    }
  };

  const setUpPeer = (peerUuid, displayName, initCall = false) => {
    console.log(
      `setting up webRTC peer: uuid - ${peerUuid}, displayName: ${displayName}`
    );
    peerConnections[peerUuid] = {
      displayName: displayName,
      pc: new RTCPeerConnection(peerConnectionConfig),
    };
    peerConnections[peerUuid].pc.onicecandidate = (event) =>
      gotIceCandidate(event, peerUuid);
    peerConnections[peerUuid].pc.ontrack = (event) =>
      gotRemoteStream(event, peerUuid);
    peerConnections[peerUuid].pc.oniceconnectionstatechange = (event) =>
      checkPeerDisconnect(event, peerUuid);
    peerConnections[peerUuid].pc.addStream(localStream);

    if (initCall) {
      peerConnections[peerUuid].pc
        .createOffer()
        .then((description) => createdDescription(description, peerUuid))
        .catch(errorHandler);
    }
  };

  const errorHandler = (err) => {
    console.log(err);
  };

  const checkPeerDisconnect = (event, peerUuid) => {
    var states = peerConnections[peerUuid].pc.iceConnectionState;
    console.log(`connection with peer ${peerUuid} ${states}`);
    if (
      states === "failed" ||
      states === "closed" ||
      states === "disconnected"
    ) {
      delete peerConnections[peerUuid];
      let videoFeeds = state.videoFeeds;
      videoFeeds = videoFeeds.filter((ele) => {
        return ele.peerUUID !== peerUuid;
      });
      setState({ ...state, videoFeeds: videoFeeds });
    }
  };

  const connectToSocket = () => {
    console.log("connect to socket, roomid: ", state.me.roomId);
    const { me } = state;
    let data = {
      eventName: "selfSetup",
      data: {
        roomId: me.roomId,
        displayName: me.username,
      },
    };
    console.log("sending selfSetup");
    client.send(JSON.stringify(data));
  };

  const gotRemoteStream = (event, peerUuid) => {
    console.log("got remote stream");
    console.log(event);
    if (event.track.kind === "video") {
      console.log(`got remote stream, peer ${peerUuid}`);
      let streamRef = React.createRef();
      let videoFeed = {
        ref: streamRef,
        stream: event.streams[0],
        peerUUID: peerUuid,
      };
      addVideoFeed(videoFeed);
    }
  };

  const onLogin = (e) => {
    console.log("login");
    if (state.me.username !== "") {
      console.log("setting login to false");
      // setState({ ...state, login: false });
      connectToSocket();

      client.send(
        JSON.stringify({
          eventName: "p2pAction",
          data: {
            uuid: state.me.uuid,
            roomId: roomId,
            displayName: state.me.username,
            dest: "all",
          },
        })
      );

      navigator.mediaDevices
        .getUserMedia(constraints)
        .then((stream) => {
          console.log({ stream });
          localStream = stream; // sets it up for the peer
          setState({ ...state, ...{ stream, login: false } });
          //  sendPrediction = true;
        })
        .catch(errorHandler);
    }
  };
  const onUsernameUpdate = (e) => {
    console.log({ state });
    console.log("should set state:", e.target.value);
    const newMe = { ...state.me, username: e.target.value };
    setState({ ...state, me: newMe });
  };

  const createdDescription = (description, peerUuid) => {
    console.log(`got description, peer ${peerUuid}`);
    peerConnections[peerUuid].pc
      .setLocalDescription(description)
      .then(() => {
        client.send(
          JSON.stringify({
            eventName: "p2pAction",
            data: {
              sdp: peerConnections[peerUuid].pc.localDescription,
              uuid: state.me.uuid,
              dest: peerUuid,
            },
          })
        );
      })
      .catch(errorHandler);
  };

  if (state.login)
    return (
      <div className="App" style={{ marginTop: "15%" }}>
        <div style={{ width: "725px", margin: "0 auto" }}>webRTC</div>
        <input
          style={{ marginTop: "44px" }}
          type="text"
          placeholder="username"
          name="username"
          onChange={onUsernameUpdate}
        />
        <input type="submit" value="connect" onClick={onLogin} />
      </div>
    );
  else
    return (
      <div className="App">
        <VideoFeed stream={state.stream} videoFeeds={state.videoFeeds} />
      </div>
    );
}

export default App;
