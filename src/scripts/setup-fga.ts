import 'dotenv/config';
import { OpenFgaClient } from '@openfga/sdk';

async function setupOpenFGA() {
  let storeId = null;
  
  // Connect without a store ID first
  const fgaClient = new OpenFgaClient({
    apiUrl: 'http://localhost:8080',
  });

  if (!storeId) {
    console.log("Creating OpenFGA Store...");
    const store = await fgaClient.createStore({ name: 'NexusAPI' });
    storeId = store.id;
    console.log(`Store created! Add this to your server/.env file right now:`);
    console.log(`FGA_STORE_ID="${storeId}"\n`);
  } else {
    console.log(`Using existing Store ID from .env: ${storeId}`);
  }

  // Connect with the Store ID so we can write the model
  const clientWithStore = new OpenFgaClient({
    apiUrl: 'http://localhost:8080',
    storeId: storeId,
  });

  console.log("Writing Strict Authorization Model (v1.1)...");
  
  const model = await clientWithStore.writeAuthorizationModel({
    schema_version: "1.1",
    type_definitions: [
      { type: "user" },
      {
        type: "tenant",
        relations: {
          admin: { this: {} },
          member: {
            union: {
              child: [
                { this: {} },
                { computedUserset: { relation: "admin" } }
              ]
            }
          }
        },
        metadata: {
          relations: {
            admin: { directly_related_user_types: [{ type: "user" }] },
            member: { directly_related_user_types: [{ type: "user" }] }
          }
        }
      },
      {
        type: "board",
        relations: {
          parent_tenant: { this: {} },
          admin: {
            tupleToUserset: {
              tupleset: { relation: "parent_tenant" },
              computedUserset: { relation: "admin" }
            }
          },
          viewer: {
            tupleToUserset: {
              tupleset: { relation: "parent_tenant" },
              computedUserset: { relation: "member" }
            }
          }
        },
        metadata: {
          relations: {
            // A parent_tenant must strictly be of type 'tenant'
            parent_tenant: { directly_related_user_types: [{ type: "tenant" }] },
            admin: { directly_related_user_types: [] },
            viewer: { directly_related_user_types: [] }
          }
        }
      }
    ]
  });

  console.log(`Authorization Model successfully written! ID: ${model.authorization_model_id}`);
}

setupOpenFGA().catch(console.error);
