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
      />
      <FaceTracker stream={_get(peer, "stream", null)} userId="other" />
    </div>
  );
}

export default VideoFeed;
