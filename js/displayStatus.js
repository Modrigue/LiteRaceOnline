"use strict";
// game display status during play
var DisplayStatus;
(function (DisplayStatus) {
    DisplayStatus[DisplayStatus["NONE"] = 0] = "NONE";
    DisplayStatus[DisplayStatus["PREPARE"] = 1] = "PREPARE";
    DisplayStatus[DisplayStatus["POS_INIT"] = 2] = "POS_INIT";
    DisplayStatus[DisplayStatus["PLAYING"] = 3] = "PLAYING";
    DisplayStatus[DisplayStatus["SCORES"] = 4] = "SCORES";
    DisplayStatus[DisplayStatus["GAME_OVER"] = 5] = "GAME_OVER";
})(DisplayStatus || (DisplayStatus = {}));
//# sourceMappingURL=displayStatus.js.map