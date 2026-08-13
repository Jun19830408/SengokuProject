// ブラウザで開いたときの入口。画面に本体を据えるだけ。
import React from "react";
import { createRoot } from "react-dom/client";
import App from "../src/index.jsx";

const 土台 = document.getElementById("root");
createRoot(土台).render(React.createElement(App));
