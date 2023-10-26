# git-analysis-tool

## Description

Tool for Git organization analysis. Currently only supports GitLab.

## Prerequisites

Docker is necessary to run Redis and Neo4j easily.

Install Apoc 4.1 by downloading [apoc-4.1.0.0-all.jar](https://github.com/neo4j-contrib/neo4j-apoc-procedures/releases/4.1.0.0) and copying it to the `neo4j/plugins/` folder. (Useful for complex Cypher queries.)

**Important**: Node v18 is necessary! Otherwise you will get this error:

> ReferenceError: Request is not defined

## Installation

```bash
$ npm install
```

## Running the app

Run Redis and Neo4j first:

```bash
docker-compose up -d
```

Then run the API:

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Test

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```
