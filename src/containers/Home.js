import React, { useEffect, useState } from "react";
import styled from "styled-components";

const Container = styled.div``;

function Home({ wsClient }) {
  const [user, setUser] = useState("");
  useEffect(() => {
    console.log("useEffect home");
    console.log({ wsClient });
  }, []);

  function _handleChange(e) {
    setUser(e.target.value);
  }
  return (
    <Container className="dark-container" style={{ flexDirection: "column" }}>
      <div>Welcome home</div>
      <input type="text" onChange={_handleChange} value={user} />
      <button>Join Room</button>
    </Container>
  );
}

export default Home;
