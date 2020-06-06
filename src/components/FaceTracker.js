import React, { useEffect, useState, Fragment } from "react";
import * as facemesh from "@tensorflow-models/facemesh";
import _isNil from "lodash/isNil";

import { TRIANGULATION } from "./triangulation";
import { findByLabelText } from "@testing-library/react";

// const useAnimationFrame = (callback) => {
//   // Use useRef for mutable variables that we want to persist
//   // without triggering a re-render on their change
//   const requestRef = React.useRef();
//   const previousTimeRef = React.useRef();

//   const animate = (time) => {
//     if (previousTimeRef.current != undefined) {
//       const deltaTime = time - previousTimeRef.current;
//       callback(deltaTime);
//     }
//     previousTimeRef.current = time;
//     requestRef.current = requestAnimationFrame(animate);
//   };

//   React.useEffect(() => {
//     requestRef.current = requestAnimationFrame(animate);
//     return () => cancelAnimationFrame(requestRef.current);
//   }, []); // Make sure the effect runs only once
// };

const triangulateMesh = true;

function drawPath(ctx, points, closePath) {
  const region = new Path2D();
  region.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) {
    const point = points[i];
    region.lineTo(point[0], point[1]);
  }

  if (closePath) {
    region.closePath();
  }
  ctx.stroke(region);
}

const FaceTracker = ({ videoRef, userId, stream, connected }) => {
  const [count, setCount] = React.useState(0);
  const [trackingEnabled, setTrackingEnabled] = useState(true);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [uuid, setUuid] = useState(null);
  const [loaded, setLoaded] = useState(false);

  let faces = [];
  let model = null;
  let ctx, videoWidth, videoHeight, video, canvas;

  useEffect(() => {
    console.log("useEffect FaceTracker");
    console.log({ stream });
    if (_isNil(stream)) return;
    _init();
  }, [stream]);

  async function _init() {
    model = await facemesh.load({ maxFaces: 1 });

    // Pass in a video stream to the model to obtain
    // an array of detected faces from the MediaPipe graph.
    // video = document.querySelector("video");
    video = document.getElementById(`video-${userId}`);
    video.srcObject = stream;
    video.addEventListener("playing", function () {
      console.log("playing");
      setLoaded(true);
    });

    video.addEventListener("loadeddata", async (event) => {
      console.log(
        "Yay! The readyState just increased to  " +
          "HAVE_CURRENT_DATA or greater for the first time."
      );
      videoWidth = video.videoWidth;
      videoHeight = video.videoHeight;
      video.width = videoWidth;
      video.height = videoHeight;

      canvas = document.getElementById(`output-${userId}`);
      canvas.width = videoWidth * 2;
      canvas.height = videoHeight * 2;
      // const canvasContainer = document.querySelector(".canvas-wrapper");
      // canvasContainer.style = `width: ${videoWidth}px; height: ${videoHeight}px`;

      ctx = canvas.getContext("2d");
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.fillStyle = "#32EEDB";
      ctx.strokeStyle = "#32EEDB";
      ctx.lineWidth = 0.5;
      setVideoLoaded(true);
      renderPrediction();
    });
  }

  async function renderPrediction() {
    const predictions = await model.estimateFaces(video);
    ctx.drawImage(
      video,
      0,
      0,
      videoWidth * 2,
      videoHeight * 2,
      0,
      0,
      canvas.width * 2,
      canvas.height * 2
    );

    if (trackingEnabled) {
      if (predictions.length > 0) {
        predictions.forEach((prediction) => {
          // const keypoints = prediction.scaledMesh;
          const keypoints = prediction.scaledMesh.map((set) =>
            set.map((c) => c * 2)
          );
          if (triangulateMesh) {
            for (let i = 0; i < TRIANGULATION.length / 3; i++) {
              const points = [
                TRIANGULATION[i * 3],
                TRIANGULATION[i * 3 + 1],
                TRIANGULATION[i * 3 + 2],
              ].map((index) => keypoints[index]);

              drawPath(ctx, points, true);
            }
          } else {
            for (let i = 0; i < keypoints.length; i++) {
              const x = keypoints[i][0];
              const y = keypoints[i][1];

              ctx.beginPath();
              ctx.arc(x, y, 1 /* radius */, 0, 2 * Math.PI);
              ctx.fill();
            }
          }
        });
      }
    }

    requestAnimationFrame(renderPrediction);
  }

  return (
    <div
      style={{
        display: "flex",
        flex: 1,
        border: "2px solid red",
        position: "relative",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <video
        id={`video-${userId}`}
        autoPlay
        muted
        // ref={videoRef}
        playsInline
        style={{
          WebkitTransform: "scaleX(-1)",
          transform: "scaleX(-1)",
          visibility: "hidden",
          // display: "none",
          width: "2px",
          height: "2px",
          border: "3px solid green",
        }}
      />
      {connected ? (
        <>
          <canvas
            id={`output-${userId}`}
            // style={{ position: "absolute", top: 0, left: 0, zIndex: 1000 }}
          />
          {!loaded && <div style={{ position: "absolute" }}>loading...</div>}
        </>
      ) : (
        <div>Waiting for connection...</div>
      )}
    </div>
  );
};

export default FaceTracker;
