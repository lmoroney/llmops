import os
from PyPDF2 import PdfReader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_openai import OpenAIEmbeddings
import chromadb
from chromadb.config import Settings
from chromadb.utils import embedding_functions

api_key = os.environ['OPENAI_API_KEY']

# Function to read PDF and extract text
def extract_text_from_pdf(pdf_path):
    # Put Code here to Extract Text from PDF

# Function to split text into chunks
def split_text(text):
    # Put Code here to split text into chunks. Suggested Chunk size is 1500, 
    # overlap is 300, and length_function is len

# Function to generate embeddings
def generate_embeddings(chunks):
    # Use the Open API Embeddings function from langchain_openai here

def store_in_chroma(chunks, embeddings):
    persist_directory = os.path.abspath("data")
    print(f"Using directory: {persist_directory}")

    client = chromadb.PersistentClient(path=persist_directory)
    
    openai_ef = # Specify the Embedding function to use here
    
    collection = # User get_or_create_collection here. Call it 'pdf_embeddings' and use the openai_ef defined above
    
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
