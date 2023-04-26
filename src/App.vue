<script>
import { OpenAI } from "langchain/llms/openai";
import { ConversationalRetrievalQAChain } from "langchain/chains";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { getDocument } from 'pdfjs-dist/build/pdf';
import { GlobalWorkerOptions } from 'pdfjs-dist/build/pdf';

export default {
  data() {
    return {
      // For initialization
      openAIKey: "",
      showApiKeyDialog: true,
      model: null,
      file: null,
      fileName: null,
      fileContent: null,
      docs: [],
      vectorStore: null,
      chain: null,

      // For user interaction
      question: "What is this document about?",
      answer: "",
      formattedChatHistory: [],
    };
  },

  computed: {
    chatHistory() {
      return this.formattedChatHistory.map((chat) => chat.message);
    },

    chatHistoryString() {
      let chatString = '';
      this.formattedChatHistory.forEach((message) => {
        if (message.sender === 'human') {
          chatString += '👤: ';
        } else if (message.sender === 'bot') {
          chatString += '🤖: ';
        }
        chatString += `${message.message}\n`;
      });
      return chatString;
    },
  },

  methods: {
    saveKey() {
      // Save the API key to local storage
      this.showApiKeyDialog = false;
      this.initializeLLM();
    },

    clearFile() {
      // Clear the file
      console.log("Clearing file...");
      this.file = null;
      this.fileName = null;
      this.fileContent = null;
      this.docs = [];
      this.vectorStore = null;
      this.chain = null;
      this.question = "What is this document about?";
      this.formattedChatHistory = [];
    },

    async initializeLLM() {
      // Initialize LLM
      console.log("Initializing LLM");
      this.model = new OpenAI({
        openAIApiKey: this.openAIKey,
        temperature: 0.7,
      });
    },

    async processFile(event) {
      console.log("File chosen. Processing...");
      this.file = event.target.files[0];

      this.fileName = this.file.name;

      if (this.file.type.startsWith("text/")) {
        const reader = new FileReader();
        reader.onload = () => {
          // Once the file has been read, set the file content and process it
          this.fileContent = reader.result;
          this.processFileContent();
        };

        // Start reading the file as text
        console.log("Loading text file...");
        reader.readAsText(this.file);
      } else if (this.file.type === "application/pdf") {
        console.log("Loading PDF file...");
        const reader = new FileReader();
        reader.onload = async () => {
          // Parse the PDF file
          const pdfData = reader.result;
          GlobalWorkerOptions.workerSrc = '/pdf.worker.js';
          const pdfDoc = await getDocument({ data: pdfData }).promise;
          let fileContent = "";

          // Loop through all the pages and extract the content
          for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
            const page = await pdfDoc.getPage(pageNum);
            const content = await page.getTextContent();
            const text = content.items.map(item => item.str).join(" ");
            fileContent += text + "\n";
          }

          // Set the file content and process it
          this.fileContent = fileContent;
          this.processFileContent();
        };

        // Start reading the file as an ArrayBuffer to be consumed by pdfjsLib
        console.log("Loading PDF file...");
        reader.readAsArrayBuffer(this.file);
      } else {
        this.clearFile();
        alert(
          "File type not supported. Please choose a text-based file: plain text, markdown, HTML, JSON, XML, etc. or a PDF file."
        );
        return;
      }
    },

    async processFileContent() {
      console.log("Splitting file content into chunks...");
      const textSplitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
      });
      console.log(this.fileContent);
      this.docs = await textSplitter.createDocuments([this.fileContent]);
      try {
        console.log("Creating embeddings...");
        this.vectorStore = await MemoryVectorStore.fromDocuments(
          this.docs,
          new OpenAIEmbeddings({ openAIApiKey: this.openAIKey })
        );
      } catch (error) {
        // If there is an error, clear the file and show the error message
        alert(
          "An error occurred while embedding the document with OpenAI API:" +
          error
        );
        this.clearFile();
        throw error;
      }

      console.log("Creating chain...");
      this.chain = ConversationalRetrievalQAChain.fromLLM(
        this.model,
        this.vectorStore.asRetriever(),
        { returnSourceDocuments: true }
      );
    },

    async askNewQuestion() {
      console.log("Sending Question...")
      const current_question = this.question.trim()
      this.question = "";
      this.formattedChatHistory.push({ 'sender': 'human', 'message': current_question })
      const answer = await this.chain.call({
        question: current_question,
        chat_history: this.chatHistory,
      });
      console.log(answer)
      this.formattedChatHistory.push({ 'sender': 'bot', 'message': answer.text.trim() })
    },
  },
};
</script>

<template>
  <!--Modal-->
  <div class="fixed z-10 inset-0 overflow-y-auto" v-if="showApiKeyDialog">
    <div class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
      <!-- Background overlay -->
      <div class="fixed inset-0 transition-opacity" aria-hidden="true">
        <div class="absolute inset-0 bg-gray-500 opacity-75"></div>
      </div>

      <div
        class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
        <form class="px-4 py-6">
          <div class="mb-4">
            <label class="block text-gray-700 font-bold mb-2" for="api-key">
              OpenAI API Key (Saved Locally)
            </label>
            <input
              class="appearance-none border rounded w-full py-2 px-3 text-gray-700 bg-white dark:bg-white leading-tight focus:outline-none focus:shadow-outline"
              id="api-key" type="password" placeholder="Enter your OpenAI API key" v-model="openAIKey" />
          </div>
          <div class="mt-6">
            <button
              class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
              v-on:click="saveKey">
              Submit
            </button>
          </div>
          <div class="mt-6 text-sm text-gray-500">
            API key is saved locally. You can clone the original repo and
            examine the code if you're unsure about entering your API key.
            <a href="https://github.com/Troyanovsky/document_qa_langchain" class="underline">Original Repo</a>
          </div>
        </form>
      </div>
    </div>
  </div>

  <!-- Main Content -->
  <header class="fixed top-0 left-0 w-full bg-white shadow-md px-4 py-3 flex items-center justify-center h-1/12">
    <img src="./assets/logo.ico" alt="logo" class="w-10 h-10 mr-2" />
    <div class="flex items-center justify-center flex-col">
      <h1 class="text-lg font-bold text-gray-800">Ask Your Documents</h1>
      <span class="text-sm text-gray-500 mx-2">Document QA with LLM</span>
    </div>
  </header>
  <main class="flex flex-col items-center align-center w-full h-full mt-12 mb-12 bg-white">
    <div v-if="!file">
      <button
        class="px-8 py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-md shadow-md transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none"
        @click="$refs.fileInput.click()">
        Upload Your Doc
      </button>
      <input type="file" ref="fileInput" style="display: none" @change="processFile" />
    </div>

    <div class="lex flex-col items-center w-full h-full bg-white" v-if="file">
      <div class="text-gray-400" v-if="fileName && chain">
        {{ fileName }} loaded. You can ask questions now.
        <span class="clear-file underline cursor-pointer" @click="clearFile()">[Clear File]</span>
      </div>
      <div class="text-gray-400" v-else-if="fileName && !chain">
        Loading {{ fileName }}... Please wait...
      </div>
      <textarea class="h-3/4 w-full pointer-events-none bg-white rounded-lg border-2 border-teal-500 text-gray-600 px-2"
        v-model="chatHistoryString" style="overflow-y: scroll;"></textarea>
      <div class="flex w-full h-1/4 bg-white">
        <!-- Textbox for Entering Text -->
        <textarea class="h-full w-10/12 bg-white rounded-lg border-2 border-blue-500 text-gray-600 px-2"
          v-model="question" @keydown.enter.prevent="askNewQuestion"></textarea>
        <!-- Sending Text Button -->
        <div class="h-full w-2/12 bg-white flex items-center justify-center">
          <button class="bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white rounded-lg px-4 py-2 sm:px-2 sm:py-1"
            @click="askNewQuestion">
            Send Question
          </button>
        </div>
      </div>
    </div>
  </main>
  <footer class="fixed bottom-0 left-0 w-full bg-white shadow-md px-4 py-3 h-1/12">
    <h2 class="text-sm font-regular text-center text-gray-400">
      Made with ❤️ &amp; ☕ by
      <a href="https://www.linkedin.com/in/guodongzhao/" class="underline text-blue-500">Troy Zhao</a>.
      <a href="https://github.com/Troyanovsky/document_qa_langchain" class="underline text-blue-500">GitHub Repo</a>
    </h2>
  </footer>
</template>
