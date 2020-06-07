import React, { Component } from "react";
import { w3cwebsocket as W3CWebSocket } from "websocket";
import _isNil from "lodash/isNil";
import styled from "styled-components";
import "./App.css";
import VideoFeed from "./components/VideoFeed";

const Header = styled.div`
  display: flex;
  flex: 1;
  width: 100%;
  border: 2px solid green;
  justify-content: center;
  align-items: center;
  font-size: 3rem;
`;

const UserDetailsContainer = styled.div`
  display: flex;
  flex: 1;
  width: 100%;
  border: 2px solid blue;
`;

const UserDetails = styled.div`
  display: flex;
  flex: 1;
  border: 1px solid orange;
  flex-direction: column;
  justify-content: flex-start;
  align-items: center;
`;

class App extends Component {
  constructor(props) {
    super(props);
    this.localVideoRef = React.createRef();
    this.canvasRef = React.createRef();
    this.localStream = "";
    this.peerConnections = [];
    this.peerConnectionConfig = {
      iceServers: [
        { urls: "stun:stun.stunprotocol.org:3478" },
        { urls: "stun:stun.l.google.com:19302" },
      ],
    };

    this.client = new W3CWebSocket("wss://10.0.1.12:8443");
    // this.client = new W3CWebSocket("wss://taskbit.net:8443");

    this.sendPrediction = false;
    this.hasStream = [];
  }

  componentWillMount() {
    let hash = window.location.hash.replace("#", "");
    if (hash.split("=")[0] === "roomId") {
      let me = this.state.me;
      me.roomId = hash.split("=")[1];
      this.setState({ me: me });
    }
    (async () => {
      this.setState({ loading_model: false });
    })();
  }

  state = {
    me: {
      uuid: "",
      username: "",
      roomId: "",
      host: false,
    },

    login: true,
    peerConnections: [],
    videoFeeds: [],
    stream: null,
    peer: null,
    route: "login",
    peerUsername: null,
  };

  constraints = {
    video: {
      width: { max: 320 },
      height: { max: 240 },
      frameRate: { max: 24 },
    },
    audio: true,
  };

  addUser = (player) => {
    console.log("adding new user");
    if (this.state.players < 2)
      this.setState({ players: [...this.state.players, player] });
    else console.log("max 2 people per room");
  };

  addVideoFeed = (videoFeed) => {
    console.log("adding video feed");
    this.setState({ videoFeeds: [...this.state.videoFeeds, videoFeed] });
    this.setState({ peer: videoFeed });
  };

  componentDidMount() {
    this.client.onopen = () => {
      console.log("WebSocket Client Connected");
    };
    this.client.onmessage = (message) => {
      let obj = JSON.parse(message.data);
      console.log(obj);
      switch (obj.eventName) {
        case "userConnected":
          this.setState({ peerUsername: obj.data.user.username });
          break;

        case "selfSetup":
          this.setState({
            me: {
              uuid: obj.data.user.uuid,
              username: obj.data.user.username,
              roomId: obj.data.user.room,
              host: obj.data.user.role === "HOST" ? true : false,
            },
          });
          console.log(`https://10.0.1.12:3000/#roomId=${obj.data.user.room}`);
          break;
        case "p2pAction":
          var peerUuid = obj.data.uuid;
          if (
            peerUuid === this.state.me.uuid ||
            (obj.data.dest !== this.state.me.uuid && obj.data.dest !== "all")
          ) {
            break;
          }

          if (obj.data.displayName && obj.data.dest === "all") {
            // set up peer connection object for a newcomer peer
            this.setUpPeer(peerUuid, obj.data.displayName);
            this.client.send(
              JSON.stringify({
                eventName: "p2pAction",
                data: {
                  displayName: this.state.me.username,
                  uuid: this.state.me.uuid,
                  dest: peerUuid,
                },
              })
            );
          } else if (
            obj.data.displayName &&
            obj.data.dest === this.state.me.uuid
          ) {
            // initiate call if we are the newcomer peer
            this.setUpPeer(peerUuid, obj.data.displayName, true);
          } else if (obj.data.sdp) {
            this.peerConnections[peerUuid].pc
              .setRemoteDescription(new RTCSessionDescription(obj.data.sdp))
              .then(() => {
                // Only create answers in response to offers
                if (obj.data.sdp.type === "offer") {
                  this.peerConnections[peerUuid].pc
                    .createAnswer()
                    .then((description) =>
                      this.createdDescription(description, peerUuid)
                    )
                    .catch(this.errorHandler);
                }
              })
              .catch(this.errorHandler);
          } else if (obj.data.ice) {
            this.peerConnections[peerUuid].pc
              .addIceCandidate(new RTCIceCandidate(obj.data.ice))
              .catch(this.errorHandler);
          }
          break;
        default:
          break;
      }
    };
  }

  gotIceCandidate = (event, peerUuid) => {
    if (event.candidate != null) {
      this.client.send(
        JSON.stringify({
          eventName: "p2pAction",
          data: {
            ice: event.candidate,
            uuid: this.state.me.uuid,
            dest: peerUuid,
          },
        })
      );
    }
  };

  setUpPeer = (peerUuid, displayName, initCall = false) => {
    console.log(
      `setting up webRTC peer: uuid - ${peerUuid}, displayName: ${displayName}`
    );
    this.peerConnections[peerUuid] = {
      displayName: displayName,
      pc: new RTCPeerConnection(this.peerConnectionConfig),
    };
    this.peerConnections[peerUuid].pc.onicecandidate = (event) =>
      this.gotIceCandidate(event, peerUuid);
    this.peerConnections[peerUuid].pc.ontrack = (event) =>
      this.gotRemoteStream(event, peerUuid);
    this.peerConnections[peerUuid].pc.oniceconnectionstatechange = (event) =>
      this.checkPeerDisconnect(event, peerUuid);
    this.peerConnections[peerUuid].pc.addStream(this.localStream);

    if (initCall) {
      this.peerConnections[peerUuid].pc
        .createOffer()
        .then((description) => this.createdDescription(description, peerUuid))
        .catch(this.errorHandler);
    }

    this.setState({ peerUsername: displayName });
  };

  errorHandler = (err) => {
    console.log(err);
  };

  checkPeerDisconnect = (event, peerUuid) => {
    var states = this.peerConnections[peerUuid].pc.iceConnectionState;
    console.log(`connection with peer ${peerUuid} ${states}`);
    if (
      states === "failed" ||
      states === "closed" ||
      states === "disconnected"
    ) {
      delete this.peerConnections[peerUuid];
      let videoFeeds = this.state.videoFeeds;
      videoFeeds = videoFeeds.filter((ele) => {
        return ele.peerUUID !== peerUuid;
      });
      this.setState({ peer: null });
      this.setState({ videoFeeds: videoFeeds });
    }
  };

  connectToSocket = () => {
    const { me } = this.state;
    let data = {
      eventName: "selfSetup",
      data: {
        roomId: me.roomId,
        displayName: me.username,
      },
    };
    this.client.send(JSON.stringify(data));
  };

  gotRemoteStream = (event, peerUuid) => {
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
      if (_isNil(this.state.peer)) this.addVideoFeed(videoFeed);
      else console.log("already got a peer, doing nothing");
    }
  };

  onLogin = (e) => {
    console.log("onLogin");
    const { me } = this.state;
    if (me.username !== "") {
      this.setState({ login: false });
      this.setState({ route: "chat" });
      this.connectToSocket();
      console.log("seeting up media devices");
      navigator.mediaDevices
        .getUserMedia(this.constraints)
        .then((stream) => {
          this.localStream = stream;
          console.log({ localStream: this.localStream });
          // this.localVideoRef.current.srcObject = this.localStream;
          this.sendPrediction = true;
          console.log("should set state of stream");
          this.setState({ stream: stream }, () =>
            console.log({ state: this.state })
          );
        })
        .catch(this.errorHandler)
        .then(() => {
          this.client.send(
            JSON.stringify({
              eventName: "p2pAction",
              data: {
                uuid: this.state.me.uuid,
                roomId: this.state.me.roomId,
                displayName: this.state.me.username,
                dest: "all",
              },
            })
          );
        });
    }
  };
  onUsernameUpdate = (e) => {
    let me = this.state.me;
    me.username = e.target.value;
    this.setState({ me: me });
  };

  createdDescription = (description, peerUuid) => {
    console.log(`got description, peer ${peerUuid}`);
    this.peerConnections[peerUuid].pc
      .setLocalDescription(description)
      .then(() => {
        this.client.send(
          JSON.stringify({
            eventName: "p2pAction",
            data: {
              sdp: this.peerConnections[peerUuid].pc.localDescription,
              uuid: this.state.me.uuid,
              dest: peerUuid,
            },
          })
        );
      })
      .catch(this.errorHandler);
  };

  render() {
    const { loading_model, login } = this.state;
    let page;

    switch (this.state.route) {
      case "login":
        return (
          <div className="dark-container" style={{ justifyContent: "center" }}>
            <div style={{ width: "725px", margin: "0 auto" }}>webRTC</div>
            <input
              style={{ marginTop: "44px" }}
              type="text"
              placeholder="username"
              name="username"
              onChange={this.onUsernameUpdate}
            />
            <input type="submit" value="connect" onClick={this.onLogin} />
          </div>
        );

      case "chat":
        return (
          <div className="dark-container">
            <Header>MediaMonks AR Chat</Header>
            <VideoFeed stream={this.state.stream} peer={this.state.peer} />
            <UserDetailsContainer>
              <UserDetails>{this.state.me.username}</UserDetails>
              <UserDetails>{this.state.peerUsername}</UserDetails>
            </UserDetailsContainer>
          </div>
        );

      default:
        return null;
    }
  }
}

export default App;
