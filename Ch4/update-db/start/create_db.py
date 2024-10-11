import os
from PyPDF2 import PdfReader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_openai import OpenAIEmbeddings
import chromadb
from chromadb.config import Settings
from chromadb.utils import embedding_functions

# Function to read PDF and extract text
def extract_text_from_pdf(pdf_path):
    with open(pdf_path, 'rb') as file:
        pdf_reader = PdfReader(file)
        text = ''
        for page in pdf_reader.pages:
            text += page.extract_text()
    return text

# Function to split text into chunks
def split_text(text):
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=1500,
        chunk_overlap=300,
        length_function=len
    )
    chunks = text_splitter.split_text(text)
    print("The text is split into " + str(len(chunks)) + " chunks")
    return chunks

# Function to generate embeddings
def generate_embeddings(chunks):
    embeddings = OpenAIEmbeddings(openai_api_key="PUT_YOUR_OPENAI_API_KEY_HERE")
    return [embeddings.embed_query(chunk) for chunk in chunks]

def store_in_chroma(chunks, embeddings):
    persist_directory = os.path.abspath("data")
    print(f"Using directory: {persist_directory}")

    client = chromadb.PersistentClient(path=persist_directory)
    
    openai_ef = embedding_functions.OpenAIEmbeddingFunction(
                api_key="PUT_YOUR_OPENAI_API_KEY_HERE",
                model_name="text-embedding-ada-002"
            )
    
    collection = client.get_or_create_collection(
        name="pdf_embeddings",
        embedding_function=openai_ef
    )
    
    for i, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
        print(f"Storing Chunk {i}")
        collection.add(
            embeddings=[embedding],
            documents=[chunk],
            ids=[f"chunk_{i}"]
        )
    
    print(f"Total items in collection: {collection.count()}")
    
    # Check directory contents
    print("Directory contents:")
    for root, dirs, files in os.walk(persist_directory):
        level = root.replace(persist_directory, '').count(os.sep)
        indent = ' ' * 4 * (level)
        print(f"{indent}{os.path.basename(root)}/")
        subindent = ' ' * 4 * (level + 1)
        for f in files:
            print(f"{subindent}{f}")


# Main function
def process_pdf(pdf_path):
    # Extract text from PDF
    text = extract_text_from_pdf(pdf_path)
    
    # Split text into chunks
    print("Getting Chunks")
    chunks = split_text(text)
    
    print("Generating Embeddings")
    # Generate embeddings
    embeddings = generate_embeddings(chunks)
    
    print("Storing chunks and embeddings")
    # Store in ChromaDB
    store_in_chroma(chunks, embeddings)

# Usage
pdf_path = "space-cadets-2020-master.pdf"
process_pdf(pdf_path)
