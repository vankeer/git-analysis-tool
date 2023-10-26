import dotenv from 'dotenv';
import { toGraphQLTypeDefs } from '@neo4j/introspector';
import neo4j from 'neo4j-driver';
import fs from 'fs';
import { join } from 'path';

dotenv.config();

const uri = process.env.NEO4J_URI || 'neo4j://localhost:7687';
const user = process.env.NEO4J_USER || 'neo4j';
const password = process.env.NEO4J_PASSWORD || 'changeme';
const driver = neo4j.driver(uri, neo4j.auth.basic(user, password));

const sessionFactory = () =>
  driver.session({ defaultAccessMode: neo4j.session.READ });

// We create a async function here until "top level await" has landed
// so we can use async/await
async function main() {
  const typeDefs = await toGraphQLTypeDefs(sessionFactory);
  fs.writeFileSync(join('./src', 'assets', 'schema.graphql'), typeDefs);
  await driver.close();
}

main();
