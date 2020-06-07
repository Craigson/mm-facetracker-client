import React, { Component, useEffect } from "react";
import FaceTracker from "./FaceTracker";
import _get from "lodash/get";

function VideoFeed({ stream, videoFeeds, peer }) {
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
        border: "1px solid black",
        minHeight: 480,
        // border: "1px solid red",
      }}
    >
      <FaceTracker
        stream={stream}
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

export default VideoFeed;
