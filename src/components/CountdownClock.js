import React from "react";
import Countdown from "react-countdown";

// Renderer callback with condition
const renderer = ({ hours, minutes, seconds, completed }) => {
  return (
    <div style={{ fontSize: "2rem" }}>
      {minutes}:{seconds}
    </div>
  );
};

const CountdownClock = (props) => {
  return <Countdown date={Date.now() + 3 * 60 * 1000} renderer={renderer} />;
};

export default CountdownClock;
