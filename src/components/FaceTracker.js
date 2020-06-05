import React, { useEffect, useState } from "react";
import * as facemesh from "@tensorflow-models/facemesh";
import _isNil from "lodash/isNil";

import { TRIANGULATION } from "./triangulation";

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

const FaceTracker = ({ userId, stream }) => {
  const [count, setCount] = React.useState(0);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [uuid, setUuid] = useState(null);

  let faces = [];
  let model = null;
  let ctx, videoWidth, videoHeight, video, canvas;

  useEffect(() => {
    console.log("wolfy");
    console.log({ stream });
    if (stream === null) return;
    _init();
  }, [stream]);

  async function _init() {
    model = await facemesh.load({ maxFaces: 1 });

    // Pass in a video stream to the model to obtain
    // an array of detected faces from the MediaPipe graph.
    // video = document.querySelector("video");
    console.log({ userId });
    video = document.getElementById(`video-${userId}`);
    console.log({ stream });
    video.srcObject = stream;
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
      canvas.width = videoWidth;
      canvas.height = videoHeight;
      const canvasContainer = document.querySelector(".canvas-wrapper");
      canvasContainer.style = `width: ${videoWidth}px; height: ${videoHeight}px`;

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
      videoWidth,
      videoHeight,
      Math.floor(parseInt(userId) * canvas.width),
      Math.floor(parseInt(userId) * canvas.height),
      canvas.width,
      canvas.height
    );

    // ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (predictions.length > 0) {
      predictions.forEach((prediction) => {
        const keypoints = prediction.scaledMesh;

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
    requestAnimationFrame(renderPrediction);
  }

  //   useAnimationFrame(async (deltaTime) => {
  //     // Pass on a function to the setter of the state
  //     // to make sure we always have the latest state
  //     console.log("animate");
  //     if (model !== null) faces = await model.estimateFaces(video);
  //     // faces.forEach((face) => console.log(face.scaledMesh));
  //     console.log(faces.length);
  //   });

  return (
    <div className="canvas-wrapper">
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
          width: "auto",
          height: "auto",
        }}
      />
      <canvas id={`output-${userId}`}></canvas>
    </div>
  );
};

export default FaceTracker;
