import 'dotenv/config';
import { fgaClient } from '../utils/openfga';

async function main() {
    try {
        console.log("Fetching all relationship tuples from OpenFGA...\n");
        const response = await fgaClient.read();
        
        if (!response.tuples || response.tuples.length === 0) {
            console.log("OpenFGA is currently empty. No tuples found.");
            return;
        }

        console.log(`Found ${response.tuples.length} tuples:\n`);
        
        response.tuples.forEach((t, index) => {
            console.log(`[${index + 1}] User: ${t.key.user}  |  Relation: ${t.key.relation}  |  Object: ${t.key.object}`);
        });

    } catch (error) {
        console.error("Failed to read from OpenFGA:", error);
    }
}

main();
