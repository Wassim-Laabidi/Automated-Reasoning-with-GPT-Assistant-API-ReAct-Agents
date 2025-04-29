import { Thread } from 'openai/resources/beta/threads/threads'
import {openai} from './index'
import { sleep } from "modern-async";
import axios from 'axios';


export const createAssistant = async () => {
    const assistant = await openai.beta.assistants.create({
        name: 'WassimBot',
        description: 'A bot that follows our specific company logic and use case',
        instructions: 'You are Wassim and you can only answer questions about Typescript or LLMS/Generative AI.' +
            'You can also answer questions about the policies within Company X, and you can use the uploaded file as reference for those.' +
            'Your answers must be a paragraph at most, and cannot contain any actual code. YOU CANNOT ANSWER QUESTIONS ABOUT ANYTHING ELSE.'+
            'When it comes to generating email addresses. simply return the email following the document. Do not offer anything else',
        tools: [
            {type: 'file_search'}
        ],
        model: "gpt-3.5-turbo-0125",
    })
    console.log(assistant.id)
}

export const getEmailByName = {
    name: 'getEmailByName',
    description: 'Returns the email of a company x employee given their name',
    parameters: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'The name of the employee to get the email of',
        }
      },
      required: ['name']
    }
  };


  export const getStockPrice = {
    name: 'getStockPrice',
    description: 'Returns the price of a stock given its ticker',
    parameters: {
        type: 'object', 
        properties: {
             ticker: {
                type: 'string',
                description: 'The ticker of the stock'
             }
        },
        required: ['ticker']
    }
}
  
// This function adds user messages to a given thread object (needs thread object and message body)
export const addMessageToThread = async (thread: Thread, body: string) => {

    const message = await openai.beta.threads.messages.create(thread.id, {
        role: 'user',
        content: body
    })
    return message.id
}

// This is the crux of the tool-calling logic.
// Essentially, this model handles a "run" - or single execution of the the model. It retrieves the status of the run, given the latest user message
// and then has different logic depending on that status of the run. If the run requires functions to be parsed, it parses those functions and returns the output
// to the thread. At the end, it returns the latest message to the user once it decides that the run is completed.
export const getModelResponse = async (latestMessageID: string, runID: string, threadID: string) => {

    while (true) {

        const run = await openai.beta.threads.runs.retrieve(threadID, runID)


        switch (run.status) {
        
        case "failed":
            console.log('Run failed')
            return
        case "cancelled":
            console.log('Run cancelled')
            return
        case "completed":
            const responseMessages = await openai.beta.threads.messages.list(threadID, {after: latestMessageID, order: 'asc'})

            for (const message of responseMessages.data) {
                console.log(message.content[0].type === 'text' ? message.content[0].text.value : 'No text')
            
            }
            return
        case "requires_action":
            if(run.required_action) {

                let toolsToCall = run.required_action.submit_tool_outputs.tool_calls
                const toolOutputArray = []

                for (const tool of toolsToCall) {

                    let toolCallID = tool.id
                    let functionName = tool.function.name
                    let functionArgs = tool.function.arguments
                    let output

                    if(functionName === 'getEmailByName') {
                        output = {'email': JSON.parse(functionArgs).name + '99@companyx.com'}
                    }
                    else if(functionName === 'getStockPrice') {
                        const ticker = JSON.parse(functionArgs).ticker
                        const url = `https://api.polygon.io/v1/open-close/${ticker}/2023-01-09?adjusted=true&apiKey=${process.env.POLYGON_API_KEY}`
                        const response = await axios.get(url)
                        output = {'price': response.data.close}
                    }   
                toolOutputArray.push({tool_call_id: toolCallID, output: JSON.stringify(output)})
                await openai.beta.threads.runs.submitToolOutputs(threadID, runID, { tool_outputs: toolOutputArray})
                }

            await sleep(1000)
            }
        }
    }
}