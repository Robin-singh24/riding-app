const { createDefaultPreset } = require("ts-jest");

/** @type {import("jest").Config} **/
module.exports = {
  testEnvironment: "node",
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      { diagnostics: false },
    ],
  },
  moduleFileExtensions: ["ts", "tsx", "js", "json"],
};