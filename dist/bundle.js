/*
 * ATTENTION: The "eval" devtool has been used (maybe by default in mode: "development").
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./src/index.ts":
/*!**********************!*\
  !*** ./src/index.ts ***!
  \**********************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   modifyNumber: () => (/* binding */ modifyNumber),\n/* harmony export */   number: () => (/* binding */ number),\n/* harmony export */   total: () => (/* binding */ total)\n/* harmony export */ });\n/* harmony import */ var _videoControls__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./videoControls */ \"./src/videoControls.ts\");\n\r\nlet number = 1;\r\nfunction modifyNumber(value, setRandom = false) {\r\n    if (setRandom) {\r\n        // Set the number to a random value within the specified range.\r\n        number = value;\r\n    }\r\n    else {\r\n        // Add the specified value to the current number.\r\n        number += value;\r\n    }\r\n}\r\nlet total = 1681;\r\ndocument.addEventListener('DOMContentLoaded', () => {\r\n    const videoPlayer = document.getElementById('videoPlayer');\r\n    const videoPlayer2 = document.getElementById('videoPlayer2');\r\n    const startButton = document.getElementById('startButton');\r\n    const playButton = document.getElementById('playButton');\r\n    const fullscreenButton = document.getElementById('fullscreenButton');\r\n    startButton.addEventListener('click', async () => {\r\n        try {\r\n            // Set initial video source and play it\r\n            videoPlayer.play();\r\n        }\r\n        catch (error) {\r\n            console.error('Error loading or playing video:', error);\r\n        }\r\n    });\r\n    videoPlayer.src = '/video/' + (Math.floor(Math.random() * total) + 1).toString() + '.mp4';\r\n    videoPlayer2.src = '/video/' + (Math.floor(Math.random() * total) + 1).toString() + '.mp4';\r\n    // Event listener for when the video ends\r\n    videoPlayer.addEventListener('ended', () => (0,_videoControls__WEBPACK_IMPORTED_MODULE_0__.handleVideoEnded)(videoPlayer, videoPlayer2));\r\n    videoPlayer2.addEventListener('ended', () => (0,_videoControls__WEBPACK_IMPORTED_MODULE_0__.handleVideoEnded2)(videoPlayer, videoPlayer2));\r\n    // Function to toggle full-screen mode\r\n    function toggleFullScreen() {\r\n        const doc = document; // Use 'any' type to avoid TypeScript errors for vendor-prefixed APIs\r\n        if (!document.fullscreenElement) {\r\n            // Enter full-screen mode\r\n            if (doc.documentElement.requestFullscreen) {\r\n                doc.documentElement.requestFullscreen();\r\n            }\r\n            else if (doc.documentElement.mozRequestFullScreen) { // Firefox\r\n                doc.documentElement.mozRequestFullScreen();\r\n            }\r\n            else if (doc.documentElement.webkitRequestFullscreen) { // Chrome, Safari, Opera\r\n                doc.documentElement.webkitRequestFullscreen();\r\n            }\r\n            else if (doc.documentElement.msRequestFullscreen) { // IE/Edge\r\n                doc.documentElement.msRequestFullscreen();\r\n            }\r\n        }\r\n        else {\r\n            // Exit full-screen mode\r\n            if (document.exitFullscreen) {\r\n                document.exitFullscreen();\r\n            }\r\n            else if (doc.mozCancelFullScreen) { // Firefox\r\n                doc.mozCancelFullScreen();\r\n            }\r\n            else if (doc.webkitExitFullscreen) { // Chrome, Safari, Opera\r\n                doc.webkitExitFullscreen();\r\n            }\r\n            else if (doc.msExitFullscreen) { // IE/Edge\r\n                doc.msExitFullscreen();\r\n            }\r\n        }\r\n    }\r\n    // Function to toggle play/pause\r\n    function togglePlayButton() {\r\n        videoPlayer.pause();\r\n        videoPlayer2.pause();\r\n    }\r\n    // Add event listener to the button\r\n    fullscreenButton.addEventListener('click', toggleFullScreen);\r\n    playButton.addEventListener('click', togglePlayButton);\r\n});\r\n\n\n//# sourceURL=webpack://video-player/./src/index.ts?");

/***/ }),

/***/ "./src/videoControls.ts":
/*!******************************!*\
  !*** ./src/videoControls.ts ***!
  \******************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   handleVideoEnded: () => (/* binding */ handleVideoEnded),\n/* harmony export */   handleVideoEnded2: () => (/* binding */ handleVideoEnded2)\n/* harmony export */ });\n/* harmony import */ var _index__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./index */ \"./src/index.ts\");\n\r\nasync function handleVideoEnded(videoPlayer, videoPlayer2) {\r\n    console.log('Video ended');\r\n    try {\r\n        await videoPlayer2.play();\r\n        videoPlayer2.classList.remove('hidden');\r\n        videoPlayer.classList.add('hidden');\r\n        const shouldSetRandom = Math.random() < 0.20; // 50% chance to either add or set to random.\r\n        if (shouldSetRandom) {\r\n            // If true, set 'number' to a random value.\r\n            const random = Math.floor(Math.random() * _index__WEBPACK_IMPORTED_MODULE_0__.total) + 1;\r\n            (0,_index__WEBPACK_IMPORTED_MODULE_0__.modifyNumber)(random, true); // Assuming modifyNumber is the new function name that can either add or set.\r\n        }\r\n        else {\r\n            // If false, simply add 1 to 'number'.\r\n            (0,_index__WEBPACK_IMPORTED_MODULE_0__.modifyNumber)(1, false);\r\n            console.log(\"next video number: \", _index__WEBPACK_IMPORTED_MODULE_0__.number);\r\n        }\r\n        videoPlayer.src = \"/video/\" + _index__WEBPACK_IMPORTED_MODULE_0__.number.toString() + \".mp4\";\r\n        console.log('New video started playing');\r\n    }\r\n    catch (error) {\r\n        console.error('Error loading or playing new video:', error);\r\n    }\r\n}\r\nasync function handleVideoEnded2(videoPlayer, videoPlayer2) {\r\n    console.log('Video ended');\r\n    try {\r\n        await videoPlayer.play();\r\n        videoPlayer.classList.remove('hidden');\r\n        videoPlayer2.classList.add('hidden');\r\n        const shouldSetRandom = Math.random() < 0.20; // 50% chance to either add or set to random.\r\n        if (shouldSetRandom) {\r\n            // If true, set 'number' to a random value.\r\n            const random = Math.floor(Math.random() * _index__WEBPACK_IMPORTED_MODULE_0__.total) + 1;\r\n            (0,_index__WEBPACK_IMPORTED_MODULE_0__.modifyNumber)(random, true); // Assuming modifyNumber is the new function name that can either add or set.\r\n        }\r\n        else {\r\n            // If false, simply add 1 to 'number'.\r\n            (0,_index__WEBPACK_IMPORTED_MODULE_0__.modifyNumber)(1, false);\r\n            console.log(\"next video number: \", _index__WEBPACK_IMPORTED_MODULE_0__.number);\r\n        }\r\n        videoPlayer2.src = \"/video/\" + _index__WEBPACK_IMPORTED_MODULE_0__.number.toString() + \".mp4\";\r\n        console.log('New video started playing');\r\n    }\r\n    catch (error) {\r\n        console.error('Error loading or playing new video:', error);\r\n    }\r\n}\r\n\n\n//# sourceURL=webpack://video-player/./src/videoControls.ts?");

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module is referenced by other modules so it can't be inlined
/******/ 	var __webpack_exports__ = __webpack_require__("./src/index.ts");
/******/ 	
/******/ })()
;