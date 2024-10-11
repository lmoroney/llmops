from fastapi import FastAPI
import chromadb
from chromadb.server.fastapi import FastAPIChromaServer
from chromadb.config import Settings

app = FastAPI()

# Set up ChromaDB server
settings = Settings(
    chroma_api_impl="chromadb.server.fastapi.FastAPIChromaServer"
)

chroma_server = FastAPIChromaServer(settings=settings)
chroma_server.bind(app)

# Start the FastAPI server
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
