import os
import sys
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_openai import OpenAIEmbeddings
import chromadb
from chromadb.utils import embedding_functions

api_key = os.environ['OPENAI_API_KEY']

# Function to read text file
def read_text_file(file_path):
    with open(file_path, 'r', encoding='utf-8') as file:
        return file.read()

# Function to split text into chunks
def split_text(text):
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=1500,
        chunk_overlap=300,
        length_function=len
    )
    chunks = text_splitter.split_text(text)
    print(f"The text is split into {len(chunks)} chunks")
    return chunks

# Function to generate embeddings
def generate_embeddings(chunks):
    embeddings = OpenAIEmbeddings(openai_api_key=api_key)
    return [embeddings.embed_query(chunk) for chunk in chunks]

def update_chroma_db(chunks, embeddings):
    persist_directory = os.path.abspath("data")
    print(f"Using directory: {persist_directory}")
    client = chromadb.PersistentClient(path=persist_directory)
    
    openai_ef = embedding_functions.OpenAIEmbeddingFunction(
                api_key=api_key,
                model_name="text-embedding-ada-002"
            )
    
    collection = client.get_or_create_collection(
        name="pdf_embeddings",
        embedding_function=openai_ef
    )
    
    existing_count = collection.count()
    print(f"Existing items in collection: {existing_count}")
    
    for i, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
        print(f"Storing Chunk {i}")
        collection.add(
            embeddings=[embedding],
            documents=[chunk],
            ids=[f"chunk_{existing_count + i}"]
        )
    
    print(f"Total items in collection after update: {collection.count()}")
    
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
def process_text_file(file_path):
    # Read text file
    text = read_text_file(file_path)
    
    # Split text into chunks
    print("Getting Chunks")
    chunks = split_text(text)
    
    print("Generating Embeddings")
    # Generate embeddings
    embeddings = generate_embeddings(chunks)
    
    print("Updating Chroma DB with chunks and embeddings")
    # Update ChromaDB
    update_chroma_db(chunks, embeddings)

# Usage
if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python script.py <path_to_text_file>")
        sys.exit(1)
    
    file_path = sys.argv[1]
    process_text_file(file_path)