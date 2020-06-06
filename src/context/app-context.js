import React, { createContext, useReducer, useContext } from "react";
import { produce } from "immer";
import _remove from "lodash/remove";
import _isNil from "lodash/isNil";
import _get from "lodash/get";

export const AppStateContext = createContext();
export const AppDispatchContext = createContext();

const initialState = {
  initialized: false,
};

function AppReducer(state, action) {
  // logger("App Reducer: ", action.type, action.data);
  // console.log(action.type, action.data);

  switch (action.type) {
    case "init":
      return produce(state, (draftState) => {
        draftState.initialized = action.data;
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
  // console.log({ context });
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
