require('dotenv').config();
const fetch = require('node-fetch');

// Environment variables
const airtableApiKey = process.env.AIRTABLE_API_KEY;
const airtableBaseId = process.env.AIRTABLE_BASE_ID;
const airtableClassTableName = 'Biaw Classes';
const airtableInstructorTableName = 'Instructors';
const airtablePaymentTableName = 'Payment Records';
const airtableMulticlassTableName = 'Multiple Class Registration';
const webflowApiKey = process.env.WEBFLOW_API_KEY;
const webflowCollectionId = process.env.WEBFLOW_COLLECTION_ID;

// Helper function to fetch data from Airtable
async function getAirtableRecords(tableName) {
    const url = `https://api.airtable.com/v0/${airtableBaseId}/${encodeURIComponent(tableName)}`;
    console.log('Fetching records from:', url);

    try {
        const response = await fetch(url, {
            headers: {
                Authorization: `Bearer ${airtableApiKey}`,
                'accept-version': '1.0.0', // Verify the correct version
            },
        });

        if (!response.ok) {
            const error = await response.json();
            console.error(`Failed to fetch ${tableName} records:`, response.status, response.statusText, error);
            return [];
        }

        const data = await response.json();
        console.log(`Received ${tableName} records:`, data.records);
        return data.records;
    } catch (error) {
        console.error(`Error fetching ${tableName} records:`, error);
        return [];
    }
}

// Fetch records from Webflow
async function getWebflowRecords() {
  const url = `https://api.webflow.com/collections/${webflowCollectionId}/items`;
  console.log('Fetching Webflow records from:', url);

  try {
      const response = await fetch(url, {
          headers: {
              Authorization: `Bearer ${webflowApiKey}`,
              'accept-version': '1.0.0',
          },
      });

      if (!response.ok) {
          // Log the status code and reason for better debugging
          console.error('Failed to fetch Webflow records:', response.status, response.statusText);

          // Log response body to find detailed error message
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
              const errorJson = await response.json();
              console.error('Error details (JSON):', errorJson);
          } else {
              const errorText = await response.text();
              console.error('Error details (Text):', errorText);
          }

          return [];
      }

      const data = await response.json();
      console.log('Received Webflow records:', data.items);
      return data.items;
  } catch (error) {
      // Log any network or unexpected errors
      console.error('Error fetching Webflow records:', error);
      return [];
  }
}

// Call functions as needed, for example:
(async () => {
    await getAirtableRecords(airtableClassTableName);
    await getWebflowRecords();
})();
