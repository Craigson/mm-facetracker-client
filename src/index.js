import React from "react";
import ReactDOM from "react-dom";
import { AppProvider } from "./context/app-context";
import App from "./App";
// import * as serviceWorker from './serviceWorker';

ReactDOM.render(
  <React.StrictMode>
    <AppProvider>
      <App />
    </AppProvider>
  </React.StrictMode>,
  document.getElementById("root")
);
// serviceWorker.unregister();
