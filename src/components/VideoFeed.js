import React, { Component, useEffect } from "react";
import FaceTracker from "./FaceTracker";

function VideoFeed({ stream, videoFeeds }) {
  useEffect(() => {
    console.log("VideoFeed useEffect");
    videoFeeds.forEach((element) => {
      element.ref.current.srcObject = element.stream;
    });
    var rowHeight = "98vh";
    var colWidth = "98vw";

    var numVideos = videoFeeds.length + 1; // add one to include local video
    console.log(videoFeeds.length);
    if (numVideos > 1 && numVideos <= 4) {
      // 2x2 grid
      rowHeight = "48vh";
      colWidth = "48vw";
    } else if (numVideos > 4) {
      // 3x3 grid
      rowHeight = "32vh";
      colWidth = "32vw";
    }

    document.documentElement.style.setProperty(`--rowHeight`, rowHeight);
    document.documentElement.style.setProperty(`--colWidth`, colWidth);
  }, [stream]);

  function renderAdditionalFeeds() {
    return (
      <div>
        {videoFeeds.map((feed, index) => (
          <div key={index} className="videoContainer">
            <FaceTracker videoRef={feed.ref} userId={index + 1} />
            {/* <video ref={feed.ref} autoPlay /> */}
          </div>
        ))}
      </div>
    );
  }

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
        userId="0"
      />
    </div>
  );
}

export default VideoFeed;
