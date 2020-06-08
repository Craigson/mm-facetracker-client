import React, { Component, useEffect } from "react";
import FaceTracker from "./FaceTracker";
import _get from "lodash/get";

function VideoFeed({ stream, videoFeeds, peer, myName, peerName }) {
  useEffect(() => {
    console.log("VideoFeed useEffect");
  }, [stream, peer]);
  return (
    <div
      style={{
        display: "flex",
        flex: 1,
        flexDirection: "row",
        width: "100%",
        maxWidth: 1440,
        minHeight: 480,
        // border: "1px solid red",
        // border: "1px solid blue",
      }}
    >
      <FaceTracker
        stream={stream}
        userId="me"
        position="left"
        connected={true}
        muted={true}
        name={myName}
      />
      <FaceTracker
        stream={_get(peer, "stream", null)}
        userId="peer"
        connected={_get(peer, "connected", false)}
        muted={false}
        name={peerName}
      />
    </div>
  );
}

export default VideoFeed;
