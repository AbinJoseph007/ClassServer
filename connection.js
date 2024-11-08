require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

const airtableApiKey = process.env.AIRTABLE_API_KEY;
const airtableBaseId = process.env.AIRTABLE_BASE_ID;
const webflowApiKey = process.env.WEBFLOW_API_KEY;
const webflowCollectionId = process.env.WEBFLOW_COLLECTION_ID;

app.use(cors());
app.use(express.json());

/** Helper Functions **/

const fetchAirtableRecords = async (tableName) => {
  const url = `https://api.airtable.com/v0/${airtableBaseId}/${tableName}`;
  const headers = { Authorization: `Bearer ${airtableApiKey}` };
  const response = await axios.get(url, { headers });
  return response.data.records;
};

const slugify = (text) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

const fetchWebflowRecords = async () => {
  const url = `https://api.webflow.com/collections/${webflowCollectionId}/items`;
  const headers = {
    Authorization: `Bearer ${webflowApiKey}`,
    'accept-version': '1.0.0',
  };
  const response = await axios.get(url, { headers });
  return response.data.items;
};

/** Routes **/

// Fetch Airtable records
app.get('/airtable/:table', async (req, res) => {
  const { table } = req.params;
  try {
    const records = await fetchAirtableRecords(table);
    res.json(records);
  } catch (error) {
    console.error(`Error fetching Airtable records from ${table}:`, error);
    res.status(500).json({ error: `Failed to fetch records from ${table}` });
  }
});

// Fetch Webflow records
app.get('/webflow/records', async (req, res) => {
  try {
    const records = await fetchWebflowRecords();
    res.json(records);
  } catch (error) {
    console.error('Error fetching Webflow records:', error);
    res.status(500).json({ error: 'Failed to fetch Webflow records' });
  }
});

// Sync Airtable to Webflow
app.post('/sync', async (req, res) => {
  try {
    const classRecords = await fetchAirtableRecords('Biaw Classes');
    const instructorRecords = await fetchAirtableRecords('Instructors');
    const webflowRecords = await fetchWebflowRecords();

    const webflowItemMap = webflowRecords.reduce((map, item) => {
      if (item.fieldData.airtablerecordid) {
        map[item.fieldData.airtablerecordid] = item;
      }
      return map;
    }, {});

    const airtableRecordIds = new Set(classRecords.map((record) => record.id));
    
    for (const webflowItem of webflowRecords) {
      const airtablerecordid = webflowItem.fieldData?.airtablerecordid;
      if (airtablerecordid && !airtableRecordIds.has(airtablerecordid)) {
        console.log(`Deleting Webflow item with ID ${webflowItem.id}`);
        await deleteWebflowItem(webflowItem.id);
      }
    }

    for (const classRecord of classRecords) {
      const airtableFields = {
        Name: classRecord.fields.Name || '',
        Description: classRecord.fields.Description || '',
        Date: classRecord.fields.Date || '',
        'end-time': classRecord.fields['End Time'] || '',
        'number-of-seats': String(classRecord.fields['Number of seats'] || '0'),
        'price-member': String(classRecord.fields['Price - Member'] || '0'),
        AirtableRecordId: classRecord.id || '',
        slug: slugify(classRecord.fields.Name || ''),
      };

      const existingWebflowItem = webflowItemMap[airtableFields.AirtableRecordId];

      if (existingWebflowItem) {
        const webflowId = existingWebflowItem.id;
        console.log(`Updating existing Webflow item: ${airtableFields.Name}`);
        await updateWebflowItem(webflowCollectionId, webflowId, airtableFields);
      } else {
        console.log(`Adding new Webflow item: ${airtableFields.Name}`);
        await addWebflowItem(airtableFields);
      }
    }

    res.json({ message: 'Sync completed successfully' });
  } catch (error) {
    console.error('Error during sync:', error);
    res.status(500).json({ error: 'Sync failed' });
  }
});

/** Update, Delete, and Add Functions **/

const updateWebflowItem = async (collectionId, webflowId, fieldsToUpdate) => {
  const url = `https://api.webflow.com/collections/${collectionId}/items/${webflowId}`;
  try {
    const response = await axios.patch(url, { fields: fieldsToUpdate }, {
      headers: {
        Authorization: `Bearer ${webflowApiKey}`,
        'Content-Type': 'application/json',
        'accept-version': '1.0.0',
      },
    });
    console.log(`Updated Webflow item ${webflowId}`);
    return response.data;
  } catch (error) {
    console.error('Error updating Webflow item:', error.message);
  }
};

const deleteWebflowItem = async (webflowId) => {
  const url = `https://api.webflow.com/collections/${webflowCollectionId}/items/${webflowId}`;
  try {
    await axios.delete(url, {
      headers: {
        Authorization: `Bearer ${webflowApiKey}`,
        'accept-version': '1.0.0',
      },
    });
    console.log(`Deleted Webflow item ${webflowId}`);
  } catch (error) {
    console.error('Error deleting Webflow item:', error.message);
  }
};

const addWebflowItem = async (fields) => {
  const url = `https://api.webflow.com/collections/${webflowCollectionId}/items`;
  try {
    const payload = {
      fields: fields,
      'slug': fields.slug || slugify(fields.Name),
    };
    const response = await axios.post(url, payload, {
      headers: {
        Authorization: `Bearer ${webflowApiKey}`,
        'Content-Type': 'application/json',
        'accept-version': '1.0.0',
      },
    });
    console.log(`Added new Webflow item: ${fields.Name}`);
    return response.data;
  } catch (error) {
    console.error('Error adding Webflow item:', error.message);
  }
};

/** Start Server **/
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
