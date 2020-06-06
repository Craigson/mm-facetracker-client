import React, { useEffect, useState } from "react";
import styled from "styled-components";
import { useHistory } from "react-router-dom";
import { useAppState, useAppDispatch } from "../context/app-context";

const Container = styled.div``;

const constraints = {
  video: {
    width: { max: 320 },
    height: { max: 240 },
    frameRate: { max: 24 },
  },
  audio: true,
};

function Home() {
  const { wsClient, roomId } = useAppState();
  const appDispatch = useAppDispatch();
  const [user, setUser] = useState("");
  const history = useHistory();

  useEffect(() => {
    console.log("useEffect home");
    console.log({ wsClient });
    _setStream();
  }, [wsClient]);

  function _setStream() {
    console.log("seeting up media devices");
    navigator.mediaDevices
      .getUserMedia(constraints)
      .then((stream) => {
        appDispatch({
          type: "setStream",
          data: stream,
        });
      })
      .catch((e) => console.error(e));
  }

  function _handleChange(e) {
    setUser(e.target.value);
  }

  function _connectToSocket() {
    let data = {
      eventName: "selfSetup",
      data: {
        roomId: roomId,
        displayName: user,
      },
    };
    wsClient.send(JSON.stringify(data));
  }

  function _login() {
    console.log("login");
    appDispatch({
      type: "setUsername",
      data: user,
    });

    _connectToSocket();

    history.push("/room");

    // wsClient.send(
    //   JSON.stringify({
    //     eventName: "p2pAction",
    //     data: {
    //       uuid: "",
    //       roomId: roomId,
    //       displayName: user,
    //       dest: "all",
    //     },
    //   })
    // );
  }
  return (
    <Container className="dark-container" style={{ flexDirection: "column" }}>
      <div>Welcome home</div>
      <input type="text" onChange={_handleChange} value={user} />
      <button onClick={_login}>Join Room</button>
    </Container>
  );
}

export default Home;
