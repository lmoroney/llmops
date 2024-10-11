const { ChromaClient, OpenAIEmbeddingFunction } = require('chromadb');

async function queryChromaDB() {
  const embedder = new OpenAIEmbeddingFunction({
    openai_api_key: "PUT_YOUR_OPENAI_API_KEY_HERE",
    model_name: "text-embedding-ada-002"
  });

  const client = new ChromaClient({
    path: "http://127.0.0.1:8000"
  });

  try {
    const collections = await client.listCollections();
    console.log(collections)
    const collectionName = collections[0].name;
    console.log(`Using collection: ${collectionName}`);

    const collection = await client.getCollection({
      name: collectionName,
      embeddingFunction: embedder
    });

    // Generate embedding for our query
    txtQuery = "Tell me about Aisha Parks"
    const queryEmbedding = await embedder.generate([txtQuery]);
    console.log("Query embedding generated:", queryEmbedding[0].slice(0, 5) + "...");

    console.log("Querying collection...");
    const results = await collection.query({
      queryEmbeddings: queryEmbedding,
      nResults: 15
    });

    console.log("Top 5 results for:" + txtQuery);
    if (results.documents && results.documents[0]) {
      results.documents[0].forEach((doc, index) => {
        console.log(`\n${index + 1}. ${doc}`);
      });
    } else {
      console.log("No results found.");
    }
    console.log("Distances")
    console.log(results.distances)

    // Let's also try a different query to compare
    txtQuery = "Tell me about Soo-Kyung Kim, where she lives, what she likes, her background and hobbies"
    const differentQueryEmbedding = await embedder.generate([txtQuery]);
    console.log("\nQuerying with a different topic...");
    const differentResults = await collection.query({
      queryEmbeddings: differentQueryEmbedding,
      nResults: 10
    });

    console.log("Top 5 results for:" + txtQuery);
    if (differentResults.documents && differentResults.documents[0]) {
      differentResults.documents[0].forEach((doc, index) => {
        console.log(`\n${index + 1}. ${doc}`);
      });
    } else {
      console.log("No results found.");
    }
    console.log("Distances")
    console.log(differentResults.distances)

  } catch (error) {
    console.error('Error querying ChromaDB:', error);
  }
}

queryChromaDB();