# Chat with your text or PDF files.

Doc_QA_LangChain is a front-end only implementation of a website that allows users to upload a PDF or text-based file (txt, markdown, JSON, HTML, etc) and ask questions related to the document with GPT. The project uses Vue3 for interactivity, Tailwind CSS for styling, and LangChain for parsing documents/creating vector stores/querying LLM.

## What it does

1. Parse a PDF or text-based file
2. Split the document into 1000-token chunks
3. Create embeddings of the document chunks with GPT API
4. Store the embeddings into an ephemeral document store
5. Create an embedding of the question to query relevant chunks from the document
6. Get a response from GPT API and display it in the text area


## Installation

To run the project:

1. Clone the project
2. Run npm install
3. Run npm run dev

To use it with a hosted frontend:

Visit https://doc-qa-langchain.vercel.app/

## Usage
Once the project is running, go to your web browser and navigate to the URL provided by Vite. You can then upload a PDF or text-based file and ask questions related to the document.

## Technologies Used

- Vue3
- Tailwind CSS
- LangChain

## License
This project is licensed under the MIT License. See the LICENSE file for details.

## Contact
If you have any questions about the project, please feel free to reach out to me at gzhao1997@gmail.com
