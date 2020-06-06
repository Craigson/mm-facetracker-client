import React, { Component, useEffect } from "react";
import { useAppState } from "../context/app-context";
import { useHistory } from "react-router-dom";
import styled from "styled-components";
import FaceTracker from "../components/FaceTracker";
import _get from "lodash/get";

const HeaderContainer = styled.div`
  display: flex;
  flex: 1;
  width: 100%;
  border: 1px solid green;
  color: white;
  font-size: 3rem;
  justify-content: center;
  align-items: center;
`;
const VideoContainer = styled.div`
  display: flex;
  flex: 1;
  flex-direction: row;
  width: 100%;
  min-height: 480px;
`;

const UserContainer = styled.div`
  display: flex;
  flex-direction: row;
  flex: 1;
  width: 100%;
  min-height: 100px;
  border: 1px solid blue;
`;

const UserDetails = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  justify-content: flex-start;
`;

function Room() {
  const { stream, peer, initialized, username } = useAppState();
  const history = useHistory();
  useEffect(() => {
    console.log("Room useEffect");
    console.log({ initialized });
    // if (!initialized) history.push("/");
  }, [stream, peer]);
  return (
    <div
      className="dark-container"
      style={{ flexDirection: "column", justifyContent: "center" }}
    >
      <HeaderContainer>MediaMonks AR</HeaderContainer>
      <VideoContainer>
        <FaceTracker
          stream={stream}
          // videoRef={videoRef}
          userId="me"
          position="left"
          connected={true}
        />
        <FaceTracker
          stream={_get(peer, "stream", null)}
          userId="peer"
          connected={_get(peer, "connected", false)}
        />
      </VideoContainer>
      <UserContainer>
        <UserDetails>{username}</UserDetails>
        <UserDetails></UserDetails>
      </UserContainer>
    </div>
  );
}

export default Room;
