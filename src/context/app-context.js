import React, { createContext, useReducer, useContext } from "react";
import { produce } from "immer";
import _remove from "lodash/remove";
import _isNil from "lodash/isNil";
import _get from "lodash/get";

export const AppStateContext = createContext();
export const AppDispatchContext = createContext();

const initialState = {
  initialized: false,
  wsClient: null,
  username: null,
  roomId: "",
  stream: null,
  uuid: null,
  roomUrl: null,
};

function AppReducer(state, action) {
  console.log("App Reducer: ", action.type, action.data);
  // console.log(action.type, action.data);

  switch (action.type) {
    case "init":
      return produce(state, (draftState) => {
        draftState.initialized = action.data;
      });

    case "setWs":
      return produce(state, (draftState) => {
        draftState.wsClient = action.data;
      });

    case "setUsername":
      return produce(state, (draftState) => {
        draftState.username = action.data;
      });

    case "setRoomId":
      return produce(state, (draftState) => {
        draftState.roomId = action.data;
      });

    case "setStream":
      return produce(state, (draftState) => {
        draftState.stream = action.data;
      });

    case "setRoomUrl":
      return produce(state, (draftState) => {
        draftState.roomUrl = action.data;
      });

    case "setup":
      return produce(state, (draftState) => {
        draftState.uuid = action.data.uuid;
        draftState.username = action.data.username;
        draftState.roomId = action.data.room;
        draftState.host = action.data.role === "HOST" ? true : false;
        draftState.initialized = true;
      });

    default:
      throw new Error(`Unhandled action type: ${action.type}`);
  }
}

function AppProvider({ children }) {
  const [state, dispatch] = useReducer(AppReducer, initialState);

  return (
    <AppStateContext.Provider value={state}>
      <AppDispatchContext.Provider value={dispatch}>
        {children}
      </AppDispatchContext.Provider>
    </AppStateContext.Provider>
  );
}

function useAppState() {
  const context = useContext(AppStateContext);
  if (context === undefined) {
    throw new Error("useAppState must be used within a NavProvider");
  }
  console.log({ context });
  return context;
}

function useAppDispatch() {
  const context = useContext(AppDispatchContext);
  if (context === undefined) {
    throw new Error("useAppDispatch must be used within a NavProvider");
  }
  return context;
}

export { AppProvider, useAppState, useAppDispatch };
