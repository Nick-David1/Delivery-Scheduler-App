const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { google } = require('googleapis');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const port = 5001;

app.use(cors());
app.use(bodyParser.json());

const auth = new google.auth.GoogleAuth({
  credentials: {
    type: "service_account",
    project_id: process.env.GOOGLE_PROJECT_ID,
    private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
    private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    client_id: process.env.GOOGLE_CLIENT_ID,
    auth_uri: "https://accounts.google.com/o/oauth2/auth",
    token_uri: "https://oauth2.googleapis.com/token",
    auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
    client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${process.env.GOOGLE_CLIENT_EMAIL}`
  },
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });

app.get('/api/deliveries', async (req, res) => {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: '1SKXKQw6QH1YBhD63foEPKyn_k12EHssNI-9bJZLc4SI',
      range: 'Sheet1!A:F',
    });
    const rows = response.data.values;
    if (rows.length) {
      const headers = rows[0];
      const deliveryDateIndex = headers.indexOf('Delivery Date');
      const deliveries = rows.slice(1).map(row => ({
        deliveryDate: row[deliveryDateIndex],
      }));
      res.json(deliveries);
    } else {
      res.json([]);
    }
  } catch (error) {
    console.error('Error fetching deliveries:', error);
    res.status(500).json({ message: 'Error fetching deliveries' });
  }
});

app.post('/api/submit', async (req, res) => {
  const { orderNumber, name, phoneNumber, deliveryAddress, deliveryDate } = req.body;
  const submissionDate = new Date().toISOString().split('T')[0]; // Get the current date

  console.log('Received request:', req.body);

  try {
    const response = await sheets.spreadsheets.values.append({
      spreadsheetId: '1SKXKQw6QH1YBhD63foEPKyn_k12EHssNI-9bJZLc4SI',
      range: 'Sheet1!A1:F1',
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [
          [submissionDate, orderNumber, name, phoneNumber, deliveryAddress, deliveryDate]
        ],
      },
    });
    console.log('Response from Sheets API:', response.data); 
    res.json({ message: 'Order details submitted successfully' });
  } catch (error) {
    console.error('Error submitting order details:', error);
    res.status(500).json({ message: 'Error submitting order details' });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
