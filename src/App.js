import React, { useState, useEffect } from "react";
import { w3cwebsocket as W3CWebSocket } from "websocket";
import _isNil from "lodash/isNil";
import { BrowserRouter as Router, Switch, Route } from "react-router-dom";
import {
  AppProvider,
  useAppDispatch,
  useAppState,
} from "./context/app-context";
import { Home, Room } from "./containers";

import "./App.css";

// const constraints = {
//   video: {
//     width: { max: 320 },
//     height: { max: 240 },
//     frameRate: { max: 24 },
//   },
//   audio: true,
// };

const peerConnectionConfig = {
  iceServers: [
    { urls: "stun:stun.stunprotocol.org:3478" },
    { urls: "stun:stun.l.google.com:19302" },
  ],
};

function App() {
  const appDispatch = useAppDispatch();
  const { stream } = useAppState();
  const [me, setMe] = useState({
    uuid: "",
    username: "",
    roomId: "",
    host: false,
  });
  const [login, setLogin] = useState(true);
  const [videoFeeds, setVideoFeeds] = useState([]);
  // const [stream, setStream] = useState(null);
  const [peer, setPeer] = useState(null);

  // let localStream = "";
  let peerConnections = [];

  let client = new W3CWebSocket("wss://10.0.1.12:8443");
  // let client = new W3CWebSocket("wss://taskbit.net:8443");

  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    console.log({ hash });
    if (hash.split("=")[0] === "roomId") {
      setMe({ ...me, roomId: hash.split("=")[1] });
      appDispatch({
        type: "setRoomId",
        data: hash.split("=")[1], // TODO: replace this with URL
      });
    }
    initWebsocket();
    appDispatch({
      type: "setWs",
      data: client,
    });
  }, []);
  // state = {

  //   login: true,
  //   peerConnections: [],
  //   videoFeeds: [],
  //   stream: null,
  //   peer: null,
  // };

  const addVideoFeed = (videoFeed) => {
    console.log("adding video feed");
    setVideoFeeds([...videoFeeds, videoFeed]);
    setPeer(videoFeed);
  };

  function initWebsocket() {
    console.log("setting websocket");
    client.onopen = () => {
      console.log("WebSocket Client Connected");
    };
    client.onmessage = (message) => {
      let obj = JSON.parse(message.data);
      console.log("received a message of type: ", obj.eventName);
      console.log(obj);
      switch (obj.eventName) {
        case "selfSetup":
          appDispatch({
            type: "setup",
            data: obj.data.user,
          });
          // setMe({
          //   uuid: obj.data.user.uuid,
          //   username: obj.data.user.username,
          //   roomId: obj.data.user.room,
          //   host: obj.data.user.role === "HOST" ? true : false,
          // });
          appDispatch({
            type: "setRoomUrl",
            data: `https://10.0.1.12:3000/#roomId=${obj.data.user.room}`,
          });
          console.log(`https://10.0.1.12:3000/#roomId=${obj.data.user.room}`);
          break;
        case "p2pAction":
          var peerUuid = obj.data.uuid;
          if (
            peerUuid === me.uuid ||
            (obj.data.dest !== me.uuid && obj.data.dest !== "all")
          ) {
            break;
          }

          if (obj.data.displayName && obj.data.dest === "all") {
            // set up peer connection object for a newcomer peer
            setUpPeer(peerUuid, obj.data.displayName);
            client.send(
              JSON.stringify({
                eventName: "p2pAction",
                data: {
                  displayName: me.username,
                  uuid: me.uuid,
                  dest: peerUuid,
                },
              })
            );
          } else if (obj.data.displayName && obj.data.dest === me.uuid) {
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
    if (event.candidate != null) {
      client.send(
        JSON.stringify({
          eventName: "p2pAction",
          data: {
            ice: event.candidate,
            uuid: me.uuid,
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
    peerConnections[peerUuid].pc.addStream(stream); // TODO: should come from global state

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
      let videoFeeds = videoFeeds;
      videoFeeds = videoFeeds.filter((ele) => {
        return ele.peerUUID !== peerUuid;
      });
      setPeer(null);
      setVideoFeeds(videoFeeds);
    }
  };

  // const connectToSocket = () => {
  //   let data = {
  //     eventName: "selfSetup",
  //     data: {
  //       roomId: me.roomId,
  //       displayName: me.username,
  //     },
  //   };
  //   client.send(JSON.stringify(data));
  // };

  const gotRemoteStream = (event, peerUuid) => {
    console.log(event);
    if (event.track.kind === "video") {
      console.log(`got remote stream, peer ${peerUuid}`);
      let streamRef = React.createRef();
      let videoFeed = {
        ref: streamRef,
        stream: event.streams[0],
        peerUUID: peerUuid,
        connected: true,
      };
      if (_isNil(peer)) addVideoFeed(videoFeed);
      else console.log("already got a peer, doing nothing");
    }
  };

  const onLogin = (e) => {
    console.log("onLogin");
    // if (me.username !== "") {
    //   setLogin(false);
    //   connectToSocket();
    //   console.log("seeting up media devices");
    //   navigator.mediaDevices
    //     .getUserMedia(constraints)
    //     .then((stream) => {
    //       localStream = stream;
    //       console.log({ localStream: localStream });
    //       // localVideoRef.current.srcObject = localStream;

    //       console.log("should set state of stream");
    //       setStream(stream);
    //     })
    //     .catch(errorHandler)
    //     .then(() => {
    //       client.send(
    //         JSON.stringify({
    //           eventName: "p2pAction",
    //           data: {
    //             uuid: me.uuid,
    //             roomId: me.roomId,
    //             displayName: me.username,
    //             dest: "all",
    //           },
    //         })
    //       );
    //     });
    // }
  };
  const onUsernameUpdate = (e) => {
    setMe({ ...me, username: e.target.value });
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
              uuid: me.uuid,
              dest: peerUuid,
            },
          })
        );
      })
      .catch(errorHandler);
  };

  return (
    <Router>
      <Switch>
        <Route exact path="/" component={Home} />
        <Route exact path="/room" component={Room} />
      </Switch>
    </Router>
  );

  {
    /* </div>)

  if (login)
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
      <div
        style={{
          display: "flex",
          width: "100vw",
          height: "100vh",
          justifyContent: "flex-start",
          alignItems: "center",
        }}
      >
        <VideoFeed stream={stream} peer={peer} videoFeeds={videoFeeds} />
      </div>
    ); */
  }
}

export default App;
