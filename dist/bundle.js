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

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   addToNumber: () => (/* binding */ addToNumber),\n/* harmony export */   number: () => (/* binding */ number)\n/* harmony export */ });\n/* harmony import */ var _videoControls__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./videoControls */ \"./src/videoControls.ts\");\n\r\nlet number = 1;\r\nfunction addToNumber(value) {\r\n    number += value;\r\n}\r\ndocument.addEventListener('DOMContentLoaded', () => {\r\n    const videoPlayer = document.getElementById('videoPlayer');\r\n    const videoPlayer2 = document.getElementById('videoPlayer2');\r\n    // Set initial video source and play it\r\n    videoPlayer.src = '/video/' + number.toString() + '.mp4';\r\n    number += 1;\r\n    videoPlayer2.src = '/video/' + number.toString() + '.mp4';\r\n    // Event listener for when the video ends\r\n    videoPlayer.addEventListener('ended', () => (0,_videoControls__WEBPACK_IMPORTED_MODULE_0__.handleVideoEnded)(videoPlayer, videoPlayer2));\r\n    videoPlayer2.addEventListener('ended', () => handleVideoEnded2(videoPlayer, videoPlayer2));\r\n});\r\n\n\n//# sourceURL=webpack://video-player/./src/index.ts?");

/***/ }),

/***/ "./src/videoControls.ts":
/*!******************************!*\
  !*** ./src/videoControls.ts ***!
  \******************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   handleVideoEnded: () => (/* binding */ handleVideoEnded),\n/* harmony export */   handleVideoEnded2: () => (/* binding */ handleVideoEnded2),\n/* harmony export */   playVideoWithLoad: () => (/* binding */ playVideoWithLoad)\n/* harmony export */ });\n/* harmony import */ var _index__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./index */ \"./src/index.ts\");\n\r\nfunction playVideoWithLoad(videoPlayer, videoPlayer2) {\r\n    return new Promise((resolve, reject) => {\r\n        function onLoadedMetadata() {\r\n            videoPlayer.removeEventListener('loadedmetadata', onLoadedMetadata); // Remove listener once loaded\r\n            resolve();\r\n        }\r\n        function onError(event) {\r\n            reject(event.error || new Error('Unknown video loading error'));\r\n        }\r\n        videoPlayer.addEventListener('loadedmetadata', onLoadedMetadata);\r\n        videoPlayer.addEventListener('error', onError);\r\n        videoPlayer.src = \"/video/\" + _index__WEBPACK_IMPORTED_MODULE_0__.number.toString() + \".mp4\";\r\n        (0,_index__WEBPACK_IMPORTED_MODULE_0__.addToNumber)(1);\r\n        videoPlayer2.src = \"/video/\" + _index__WEBPACK_IMPORTED_MODULE_0__.number.toString() + \".mp4\";\r\n        videoPlayer.load(); // Reload the video source\r\n        videoPlayer2.load(); // Reload the video source\r\n    });\r\n}\r\nasync function handleVideoEnded(videoPlayer, videoPlayer2) {\r\n    console.log('Video ended');\r\n    try {\r\n        videoPlayer2.classList.remove('hidden');\r\n        videoPlayer.classList.add('hidden');\r\n        await playVideoWithLoad(videoPlayer2, videoPlayer);\r\n        await videoPlayer2.play();\r\n        console.log('New video started playing');\r\n    }\r\n    catch (error) {\r\n        console.error('Error loading or playing new video:', error);\r\n    }\r\n}\r\nasync function handleVideoEnded2(videoPlayer, videoPlayer2) {\r\n    console.log('Video ended');\r\n    try {\r\n        videoPlayer.classList.remove('hidden');\r\n        videoPlayer2.classList.add('hidden');\r\n        await playVideoWithLoad(videoPlayer, videoPlayer2);\r\n        await videoPlayer.play();\r\n        console.log('New video started playing');\r\n    }\r\n    catch (error) {\r\n        console.error('Error loading or playing new video:', error);\r\n    }\r\n}\r\n\n\n//# sourceURL=webpack://video-player/./src/videoControls.ts?");

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