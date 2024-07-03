const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { google } = require('googleapis');
const keys = require('./scheduler-api-396222-73eef3420e87.json'); 

const app = express();
const port = 5001;

app.use(cors());
app.use(bodyParser.json());

const auth = new google.auth.GoogleAuth({
  credentials: keys,
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });

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
