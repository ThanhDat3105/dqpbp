const { Client } = require("@elastic/elasticsearch");
require("dotenv").config();

const node =
  process.env.ELASTICSEARCH_URL ||
  `http://${process.env.ELASTICSEARCH_HOST || "localhost"}:${process.env.ELASTICSEARCH_PORT || "9200"}`;

const clientOptions = { node };

if (process.env.ELASTICSEARCH_USERNAME && process.env.ELASTICSEARCH_PASSWORD) {
  clientOptions.auth = {
    username: process.env.ELASTICSEARCH_USERNAME,
    password: process.env.ELASTICSEARCH_PASSWORD,
  };
}

if (process.env.ELASTICSEARCH_API_KEY) {
  clientOptions.auth = { apiKey: process.env.ELASTICSEARCH_API_KEY };
}

const client = new Client(clientOptions);

async function pingElasticsearch() {
  const response = await client.ping();
  return response;
}

module.exports = client;
module.exports.pingElasticsearch = pingElasticsearch;
