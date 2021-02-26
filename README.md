# openapi-to-md

## description

OpenAPI(v2,v3) => Markdown

- It supports 'v2' and 'v3' formats of OpenAPI.
- You can use 'json' and 'yaml' as input files.
- The output data structure is in TypeScript format.
- The reference does not resolve the second reference because it avoids recursion.

## usage

openapi-to-md src-file [dist-file]  

openapi-to-md openapi.yaml README.md  
openapi-to-md openapi.json > README.md  
