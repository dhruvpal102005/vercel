"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv").config();
const redis_1 = require("redis");
const aws_1 = require("./aws");
const utils_1 = require("./utils");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const subscriber = (0, redis_1.createClient)();
subscriber.connect();
const publisher = (0, redis_1.createClient)();
publisher.connect();
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        while (1) {
            const res = yield subscriber.brPop('build-queue', 0);
            if (!res)
                continue;
            const id = res.element;
            try {
                yield (0, aws_1.downloadS3Folder)(`output/${id}`);
                yield (0, utils_1.buildProject)(id);
                (0, aws_1.copyFinalDist)(id);
                publisher.hSet("status", id, "deployed");
            }
            catch (e) {
                console.error(e);
                publisher.hSet("status", id, "failed");
            }
            finally {
                // Cleanup
                const cleanupPath = path_1.default.join(__dirname, `output/${id}`);
                if (fs_1.default.existsSync(cleanupPath)) {
                    fs_1.default.rmSync(cleanupPath, { recursive: true, force: true });
                }
            }
        }
    });
}
main();
