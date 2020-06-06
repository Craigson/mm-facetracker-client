import React, { Component, useEffect } from "react";
import { useAppState } from "../context/app-context";
import FaceTracker from "../components/FaceTracker";
import _get from "lodash/get";

function Room() {
  const { stream, peer } = useAppState();
  useEffect(() => {
    console.log("VideoFeed useEffect");
  }, [stream, peer]);
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        width: "100%",
        border: "1px solid black",
        height: 480,
      }}
    >
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
    </div>
  );
}

export default Room;
