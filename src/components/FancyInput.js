import React from "react";
import styled from "styled-components";

const InputContainter = styled.div`
  display: flex;
  margin: 20px;
  flex-direction: column;
  border: 1px solid lightgray;
  justify-content: space-between;
  border-radius: 5px;
  height: 80px;
  min-width: 300px;
  box-sizing: border-box;
  padding: 8px;
  &:hover {
    box-shadow: 0px 0px 3px 3px rgba(33, 33, 33, 0.05);
  }
`;
const Input = styled.input`
  height: 30px;
  font-size: 1.5rem;
  border: none;
  outline: none;
  color: gray;
  background-color: #262626;
  color: white;
`;
const InputArea = styled.textarea`
  border: none;
  outline: none;
  color: gray;
`;

const FancyInput = ({ onChange, value, label, name }) => {
  return (
    <InputContainter>
      <div
        style={{
          display: "flex",
          fontSize: "0.9rem",
          justifyContent: "space-between",
          color: "gray",
        }}
      >
        {label.toUpperCase()}
      </div>
      <Input onChange={onChange} value={value} name={name} autoFocus />
    </InputContainter>
  );
};

export default FancyInput;
