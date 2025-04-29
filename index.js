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
exports.polygonAPIKey = exports.openai = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const openai_1 = __importDefault(require("openai"));
const structure_1 = require("./structure");
dotenv_1.default.config();
const inquirer = require('inquirer');
exports.openai = new openai_1.default({
    apiKey: process.env.OPENAI_API_KEY
});
const assistantID = process.env.ASSISTANT_ID || '';
exports.polygonAPIKey = process.env.POLYGON_API_KEY;
// This function updates the assistant model we established in Task3.
// We can now change the prompt/tools through our code rather than the playground
const updateAssistant = () => __awaiter(void 0, void 0, void 0, function* () {
    if (assistantID) {
        yield exports.openai.beta.assistants.update(assistantID, {
            // instructions: '',
            tools: [
                { type: 'file_search' },
                { type: 'function', function: structure_1.getEmailByName }
            ],
        });
    }
});
// This is function creates a new thread (conversation session) which we can add to our assistant
const createThread = () => __awaiter(void 0, void 0, void 0, function* () {
    const thread = yield exports.openai.beta.threads.create();
    return thread;
});
// This is the main function that polls the user for input and returns the response of the assistant to the user and adds both user and ai messages to the thread
const main = (thread) => __awaiter(void 0, void 0, void 0, function* () {
    if (assistantID) {
        while (true) {
            const answer = yield inquirer.prompt([
                {
                    type: 'input',
                    name: 'user_query',
                    message: 'What would you like to ask?'
                }
            ]);
            if (answer.user_query === 'exit') {
                break;
            }
            console.log('\n');
            const msgID = yield (0, structure_1.addMessageToThread)(thread, answer.user_query);
            const run = yield exports.openai.beta.threads.runs.create(thread.id, {
                assistant_id: assistantID
            });
            yield (0, structure_1.getModelResponse)(msgID, run.id, thread.id);
            console.log('\n');
        }
    }
});
// Here we update the assistant based on our new defined parameters (above) and start the conversation with the assistant if a thread is created successfully
updateAssistant();
const thread = createThread().then((thread) => {
    try {
        main(thread);
    }
    catch (error) {
        console.log('Error: Could not initialize conversation loop as thread was not created due to below error.\n');
        console.log(error);
    }
});
