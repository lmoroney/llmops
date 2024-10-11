const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

const API_URL = 'http://localhost:8000';

async function createCollection(metadata) {
  try {
    const name = uuidv4();
    console.log('Sending request to create collection:', { name, metadata });
    const response = await axios.post(`${API_URL}/api/v1/collections`, {
      name,
      metadata
    });
    console.log('Collection created successfully:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error creating collection:', error.message);
    if (error.response) {
      console.error('Server responded with:', error.response.status, error.response.data);
    }
    throw error;
  }
}

async function addDocuments(collectionId, documents) {
  try {
    console.log('Sending request to add documents to collection:', collectionId);
    const payload = {
      ids: documents.map(doc => doc.id),
      embeddings: documents.map(doc => doc.embedding),
      metadatas: documents.map(doc => doc.metadata),
      documents: documents.map(doc => doc.document)
    };
    console.log('Request payload:', JSON.stringify(payload, null, 2));

    const response = await axios.post(`${API_URL}/api/v1/collections/${collectionId}/add`, payload);

    console.log('Documents added successfully:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error adding documents:', error.message);
    if (error.response) {
      console.error('Server responded with:', error.response.status, error.response.data);
    }
    throw error;
  }
}

async function queryCollection(collectionId, queryEmbeddings, nResults) {
  try {
    const response = await axios.post(`${API_URL}/api/v1/collections/${collectionId}/query`, {
      query_embeddings: queryEmbeddings,
      n_results: nResults
    });
    return response.data;
  } catch (error) {
    console.error('Error querying collection:', error.message);
    if (error.response) {
      console.error('Server responded with:', error.response.status, error.response.data);
    }
    throw error;
  }
}

async function listCollections() {
  try {
    const response = await axios.get(`${API_URL}/api/v1/collections`);
    console.log('Collections:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error listing collections:', error.message);
    if (error.response) {
      console.error('Server responded with:', error.response.status, error.response.data);
    }
    throw error;
  }
}

async function main() {
  try {
    await listCollections();

    const collectionMetadata = { description: 'My first collection' };
    const createdCollection = await createCollection(collectionMetadata);
    const collectionId = createdCollection.id;

    console.log('Created collection with ID:', collectionId);

    const documents = [
      { id: 'id1', embedding: [1.1, 2.3, 3.2], metadata: { source: 'my_source' }, document: 'This is a document' },
      { id: 'id2', embedding: [4.5, 6.9, 4.4], metadata: { source: 'my_source' }, document: 'This is another document' },
      { id: 'id3', embedding: [1.1, 2.3, 3.2], metadata: { source: 'my_source' }, document: 'This is a third document' }
    ];
    await addDocuments(collectionId, documents);

    const queryEmbeddings = [[1.1, 2.1, 3.2]];
    const nResults = 2;
    const results = await queryCollection(collectionId, queryEmbeddings, nResults);
    console.log('Query results:', results);

  } catch (error) {
    console.error('An error occurred:', error.message);
  }
}

main();